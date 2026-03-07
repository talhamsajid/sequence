import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  onValue,
  onChildAdded,
  onChildRemoved,
  remove,
  push,
  off,
  type Database,
  type Unsubscribe,
} from "firebase/database";

// ── Firebase init (same pattern as chat.ts) ──────────────────────────

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

function getDb(): Database {
  return getDatabase(getApp());
}

// ── Types ────────────────────────────────────────────────────────────

interface SignalData {
  sdp: string;
  type: RTCSdpType;
}

interface IceCandidateData {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface PeerAudioState {
  peerId: string;
  speaking: boolean;
  volume: number; // 0-1
  muted: boolean;
}

export interface VoiceManager {
  /** Join signaling channel only (no mic, receive-only). Safe to call without user gesture. */
  join(roomId: string, peerId: string): Promise<void>;
  /** Acquire mic and add local tracks to all peers. Requires user gesture on first call. */
  acquireMic(): Promise<void>;
  leave(): void;
  toggleMute(): Promise<boolean>;
  isMuted(): boolean;
  hasMic(): boolean;
  setPeerVolume(peerId: string, volume: number): void;
  setPeerMuted(peerId: string, muted: boolean): void;
  getPeerAudioStates(): Map<string, PeerAudioState>;
  isLocalSpeaking(): boolean;
  onPeerConnected: (callback: (peerId: string) => void) => void;
  onPeerDisconnected: (callback: (peerId: string) => void) => void;
  onSpeakingChange: (callback: (states: Map<string, PeerAudioState>, localSpeaking: boolean) => void) => void;
}

// ── Constants ────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
];

const SPEAKING_THRESHOLD = 15;
const SPEAKING_POLL_MS = 100;

// ── Audio node bundle per peer ───────────────────────────────────────

interface PeerAudioNodes {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  analyser: AnalyserNode;
  audioElement: HTMLAudioElement;
}

// ── Factory ──────────────────────────────────────────────────────────

export function createVoiceManager(): VoiceManager {
  let localStream: MediaStream | null = null;
  let muted = true; // always start muted
  let micAcquired = false;
  let currentRoomId: string | null = null;
  let currentPeerId: string | null = null;

  let audioCtx: AudioContext | null = null;
  let localAnalyser: AnalyserNode | null = null;
  let localSpeaking = false;

  const connections = new Map<string, RTCPeerConnection>();
  const peerAudio = new Map<string, PeerAudioNodes>();
  const peerStates = new Map<string, PeerAudioState>();

  const unsubscribes: Unsubscribe[] = [];
  const firebaseRefs: ReturnType<typeof ref>[] = [];

  let peerConnectedCb: ((peerId: string) => void) | null = null;
  let peerDisconnectedCb: ((peerId: string) => void) | null = null;
  let speakingChangeCb: ((states: Map<string, PeerAudioState>, localSpeaking: boolean) => void) | null = null;

  let speakingInterval: ReturnType<typeof setInterval> | null = null;

  // ── Audio helpers ──────────────────────────────────────────────────

  function getAudioContext(): AudioContext {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setupLocalAnalyser(stream: MediaStream) {
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    localAnalyser = ctx.createAnalyser();
    localAnalyser.fftSize = 256;
    source.connect(localAnalyser);
  }

  function setupPeerAudio(peerId: string, stream: MediaStream) {
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    source.connect(analyser);
    source.connect(gain);
    gain.connect(ctx.destination);

    const audioElement = new Audio();
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    audioElement.volume = 0; // routed through Web Audio API

    const existing = peerStates.get(peerId);
    const vol = existing?.volume ?? 1;
    const mut = existing?.muted ?? false;
    gain.gain.value = mut ? 0 : vol;

    peerAudio.set(peerId, { source, gain, analyser, audioElement });

    if (!peerStates.has(peerId)) {
      peerStates.set(peerId, { peerId, speaking: false, volume: 1, muted: false });
    }
  }

  function cleanupPeerAudio(peerId: string) {
    const nodes = peerAudio.get(peerId);
    if (nodes) {
      nodes.audioElement.srcObject = null;
      nodes.audioElement.pause();
      nodes.source.disconnect();
      nodes.gain.disconnect();
      peerAudio.delete(peerId);
    }
    peerStates.delete(peerId);
  }

  function getRMS(analyser: AnalyserNode): number {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length) * 100;
  }

  function startSpeakingDetection() {
    if (speakingInterval) return;

    speakingInterval = setInterval(() => {
      let changed = false;

      if (localAnalyser && !muted) {
        const rms = getRMS(localAnalyser);
        const wasSpeaking = localSpeaking;
        localSpeaking = rms > SPEAKING_THRESHOLD;
        if (wasSpeaking !== localSpeaking) changed = true;
      } else if (localSpeaking) {
        localSpeaking = false;
        changed = true;
      }

      for (const [peerId, nodes] of peerAudio) {
        const state = peerStates.get(peerId);
        if (!state) continue;

        const rms = getRMS(nodes.analyser);
        const wasSpeaking = state.speaking;
        const nowSpeaking = rms > SPEAKING_THRESHOLD && !state.muted;

        if (wasSpeaking !== nowSpeaking) {
          peerStates.set(peerId, { ...state, speaking: nowSpeaking });
          changed = true;
        }
      }

      if (changed) {
        speakingChangeCb?.(new Map(peerStates), localSpeaking);
      }
    }, SPEAKING_POLL_MS);
  }

  function stopSpeakingDetection() {
    if (speakingInterval) {
      clearInterval(speakingInterval);
      speakingInterval = null;
    }
  }

  // ── Signaling helpers ──────────────────────────────────────────────

  function voiceRef(roomId: string) {
    return ref(getDb(), `voice/${roomId}`);
  }

  function peerRef(roomId: string, peerId: string) {
    return ref(getDb(), `voice/${roomId}/${peerId}`);
  }

  function createPeerConnection(
    roomId: string,
    localId: string,
    remoteId: string,
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks if we have them
    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const iceRef = ref(
          getDb(),
          `voice/${roomId}/${localId}/ice/${remoteId}`,
        );
        push(iceRef, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        } as IceCandidateData);
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        setupPeerAudio(remoteId, remoteStream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "connected" || s === "completed") {
        peerConnectedCb?.(remoteId);
      } else if (s === "disconnected" || s === "failed" || s === "closed") {
        peerDisconnectedCb?.(remoteId);
        cleanupPeer(remoteId);
      }
    };

    connections.set(remoteId, pc);
    return pc;
  }

  function cleanupPeer(remoteId: string) {
    const pc = connections.get(remoteId);
    if (pc) {
      pc.close();
      connections.delete(remoteId);
    }
    cleanupPeerAudio(remoteId);
  }

  function listenForIceCandidates(
    roomId: string,
    localId: string,
    remoteId: string,
    pc: RTCPeerConnection,
  ) {
    const iceRef = ref(
      getDb(),
      `voice/${roomId}/${remoteId}/ice/${localId}`,
    );
    firebaseRefs.push(iceRef);

    const unsub = onChildAdded(iceRef, (snapshot) => {
      const data = snapshot.val() as IceCandidateData | null;
      if (data && pc.remoteDescription) {
        pc.addIceCandidate(
          new RTCIceCandidate({
            candidate: data.candidate,
            sdpMid: data.sdpMid ?? undefined,
            sdpMLineIndex: data.sdpMLineIndex ?? undefined,
          }),
        ).catch(() => {});
      }
    });
    unsubscribes.push(unsub);
  }

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Join the voice signaling channel. Does NOT request mic.
   * Can receive audio from peers but won't send anything yet.
   */
  async function join(roomId: string, peerId: string): Promise<void> {
    if (currentRoomId) leave();

    currentRoomId = roomId;
    currentPeerId = peerId;

    // Start speaking detection (for remote peers)
    startSpeakingDetection();

    // Announce presence
    await set(peerRef(roomId, peerId), { joined: true });

    // Listen for offers FROM other peers TO us
    const offersRef = ref(getDb(), `voice/${roomId}/${peerId}/offers`);
    firebaseRefs.push(offersRef);

    const offersUnsub = onChildAdded(offersRef, async (snapshot) => {
      const remotePeerId = snapshot.key;
      if (!remotePeerId) return;

      const offerData = snapshot.val() as SignalData;
      if (!offerData?.sdp) return;
      if (connections.has(remotePeerId)) return;

      const pc = createPeerConnection(roomId, peerId, remotePeerId);

      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ sdp: offerData.sdp, type: offerData.type }),
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answerRef = ref(
          getDb(),
          `voice/${roomId}/${peerId}/answers/${remotePeerId}`,
        );
        await set(answerRef, { sdp: answer.sdp ?? "", type: answer.type });

        listenForIceCandidates(roomId, peerId, remotePeerId, pc);
      } catch {
        cleanupPeer(remotePeerId);
      }
    });
    unsubscribes.push(offersUnsub);

    // Watch for new peers — create offers TO them
    const voiceRootRef = voiceRef(roomId);
    firebaseRefs.push(voiceRootRef);

    const peerJoinUnsub = onChildAdded(voiceRootRef, async (snapshot) => {
      const remotePeerId = snapshot.key;
      if (!remotePeerId || remotePeerId === peerId) return;
      if (peerId >= remotePeerId) return;
      if (connections.has(remotePeerId)) return;

      const pc = createPeerConnection(roomId, peerId, remotePeerId);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const offerRef = ref(
          getDb(),
          `voice/${roomId}/${remotePeerId}/offers/${peerId}`,
        );
        await set(offerRef, { sdp: offer.sdp ?? "", type: offer.type });

        const answerRef = ref(
          getDb(),
          `voice/${roomId}/${remotePeerId}/answers/${peerId}`,
        );
        firebaseRefs.push(answerRef);

        const answerUnsub = onValue(answerRef, async (ansSnap) => {
          const answerData = ansSnap.val() as SignalData | null;
          if (!answerData?.sdp) return;
          if (pc.signalingState !== "have-local-offer") return;

          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ sdp: answerData.sdp, type: answerData.type }),
            );
          } catch {}
        });
        unsubscribes.push(answerUnsub);

        listenForIceCandidates(roomId, peerId, remotePeerId, pc);
      } catch {
        cleanupPeer(remotePeerId);
      }
    });
    unsubscribes.push(peerJoinUnsub);

    const peerLeaveUnsub = onChildRemoved(voiceRootRef, (snapshot) => {
      const remotePeerId = snapshot.key;
      if (remotePeerId && remotePeerId !== peerId) {
        peerDisconnectedCb?.(remotePeerId);
        cleanupPeer(remotePeerId);
      }
    });
    unsubscribes.push(peerLeaveUnsub);
  }

  /**
   * Acquire microphone and add tracks to all existing peer connections.
   * Must be called from a user gesture (click/tap handler).
   */
  async function acquireMic(): Promise<void> {
    if (micAcquired && localStream) return;

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micAcquired = true;

    // Start muted — disable tracks
    for (const track of localStream.getAudioTracks()) {
      track.enabled = !muted;
    }

    // Setup local analyser
    setupLocalAnalyser(localStream);

    // Add tracks to all existing peer connections
    for (const [, pc] of connections) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }
  }

  function leave(): void {
    stopSpeakingDetection();

    for (const unsub of unsubscribes) unsub();
    unsubscribes.length = 0;

    for (const r of firebaseRefs) off(r);
    firebaseRefs.length = 0;

    for (const [remoteId] of connections) cleanupPeer(remoteId);
    connections.clear();
    peerAudio.clear();
    peerStates.clear();

    if (localStream) {
      for (const track of localStream.getTracks()) track.stop();
      localStream = null;
    }

    localAnalyser = null;
    localSpeaking = false;
    micAcquired = false;
    muted = true;

    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }

    if (currentRoomId && currentPeerId) {
      remove(peerRef(currentRoomId, currentPeerId)).catch(() => {});
    }

    currentRoomId = null;
    currentPeerId = null;
  }

  /**
   * Toggle mute. On first unmute, acquires mic (requires user gesture).
   * Returns the new muted state.
   */
  async function toggleMute(): Promise<boolean> {
    if (muted && !micAcquired) {
      // First unmute — need to acquire mic (user gesture context)
      await acquireMic();
    }

    muted = !muted;
    if (localStream) {
      for (const track of localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    if (muted) {
      localSpeaking = false;
      speakingChangeCb?.(new Map(peerStates), false);
    }
    return muted;
  }

  function isMutedFn(): boolean {
    return muted;
  }

  function hasMicFn(): boolean {
    return micAcquired;
  }

  function setPeerVolume(peerId: string, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    const nodes = peerAudio.get(peerId);
    const state = peerStates.get(peerId);

    if (state) {
      peerStates.set(peerId, { ...state, volume: clamped });
    }
    if (nodes && state && !state.muted) {
      nodes.gain.gain.value = clamped;
    }
  }

  function setPeerMuted(peerId: string, isMuted: boolean): void {
    const nodes = peerAudio.get(peerId);
    const state = peerStates.get(peerId);

    if (state) {
      peerStates.set(peerId, { ...state, muted: isMuted, speaking: false });
    }
    if (nodes) {
      nodes.gain.gain.value = isMuted ? 0 : (state?.volume ?? 1);
    }
    speakingChangeCb?.(new Map(peerStates), localSpeaking);
  }

  return {
    join,
    acquireMic,
    leave,
    toggleMute,
    isMuted: isMutedFn,
    hasMic: hasMicFn,
    setPeerVolume,
    setPeerMuted,
    getPeerAudioStates: () => new Map(peerStates),
    isLocalSpeaking: () => localSpeaking,
    onPeerConnected: (cb) => { peerConnectedCb = cb; },
    onPeerDisconnected: (cb) => { peerDisconnectedCb = cb; },
    onSpeakingChange: (cb) => { speakingChangeCb = cb; },
  };
}
