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

export interface VoiceManager {
  join(roomId: string, peerId: string): Promise<void>;
  leave(): void;
  toggleMute(): boolean;
  isMuted(): boolean;
  onPeerConnected: (callback: (peerId: string) => void) => void;
  onPeerDisconnected: (callback: (peerId: string) => void) => void;
}

// ── Constants ────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
];

// ── Factory ──────────────────────────────────────────────────────────

export function createVoiceManager(): VoiceManager {
  let localStream: MediaStream | null = null;
  let muted = false;
  let currentRoomId: string | null = null;
  let currentPeerId: string | null = null;

  // Peer connections keyed by remote peerId
  const connections = new Map<string, RTCPeerConnection>();
  // Firebase unsubscribes to clean up on leave
  const unsubscribes: Unsubscribe[] = [];
  // Refs to clean up via off()
  const firebaseRefs: ReturnType<typeof ref>[] = [];

  let peerConnectedCb: ((peerId: string) => void) | null = null;
  let peerDisconnectedCb: ((peerId: string) => void) | null = null;

  // ── Helpers ──────────────────────────────────────────────────────

  function voiceRef(roomId: string) {
    return ref(getDb(), `games/${roomId}/voice`);
  }

  function peerRef(roomId: string, peerId: string) {
    return ref(getDb(), `games/${roomId}/voice/${peerId}`);
  }

  function createPeerConnection(
    roomId: string,
    localId: string,
    remoteId: string,
    stream: MediaStream,
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    // ICE candidate handling — write to Firebase
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const iceRef = ref(
          getDb(),
          `games/${roomId}/voice/${localId}/ice/${remoteId}`,
        );
        const candidateData: IceCandidateData = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        };
        push(iceRef, candidateData);
      }
    };

    // Play remote audio
    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      // Store reference for cleanup
      (pc as unknown as Record<string, HTMLAudioElement>).__audio = audio;
    };

    // Connection state monitoring
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        peerConnectedCb?.(remoteId);
      } else if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
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
      const audio = (pc as unknown as Record<string, HTMLAudioElement>)
        .__audio;
      if (audio) {
        audio.srcObject = null;
        audio.pause();
      }
      pc.close();
      connections.delete(remoteId);
    }
  }

  // Listen for ICE candidates from a remote peer
  function listenForIceCandidates(
    roomId: string,
    localId: string,
    remoteId: string,
    pc: RTCPeerConnection,
  ) {
    const iceRef = ref(
      getDb(),
      `games/${roomId}/voice/${remoteId}/ice/${localId}`,
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
        ).catch(() => {
          /* ICE candidate may arrive after connection closed */
        });
      }
    });
    unsubscribes.push(unsub);
  }

  // ── Public API ───────────────────────────────────────────────────

  async function join(roomId: string, peerId: string): Promise<void> {
    if (currentRoomId) {
      leave();
    }

    currentRoomId = roomId;
    currentPeerId = peerId;

    // Get microphone
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Apply current mute state
    for (const track of localStream.getAudioTracks()) {
      track.enabled = !muted;
    }

    // Announce ourselves
    await set(peerRef(roomId, peerId), { joined: true });

    // Listen for offers FROM other peers TO us
    const offersRef = ref(
      getDb(),
      `games/${roomId}/voice/${peerId}/offers`,
    );
    firebaseRefs.push(offersRef);

    const offersUnsub = onChildAdded(offersRef, async (snapshot) => {
      const remotePeerId = snapshot.key;
      if (!remotePeerId || !localStream) return;

      const offerData = snapshot.val() as SignalData;
      if (!offerData?.sdp) return;

      // Don't create duplicate connections
      if (connections.has(remotePeerId)) return;

      const pc = createPeerConnection(roomId, peerId, remotePeerId, localStream);

      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription({ sdp: offerData.sdp, type: offerData.type }),
        );

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Write answer
        const answerRef = ref(
          getDb(),
          `games/${roomId}/voice/${peerId}/answers/${remotePeerId}`,
        );
        const answerData: SignalData = {
          sdp: answer.sdp ?? "",
          type: answer.type,
        };
        await set(answerRef, answerData);

        // Listen for ICE from this peer
        listenForIceCandidates(roomId, peerId, remotePeerId, pc);
      } catch {
        cleanupPeer(remotePeerId);
      }
    });
    unsubscribes.push(offersUnsub);

    // Watch for new peers joining — if we see them, we create offers TO them
    const voiceRootRef = voiceRef(roomId);
    firebaseRefs.push(voiceRootRef);

    const peerJoinUnsub = onChildAdded(voiceRootRef, async (snapshot) => {
      const remotePeerId = snapshot.key;
      if (!remotePeerId || remotePeerId === peerId || !localStream) return;

      // Only the peer with the "smaller" ID creates the offer to avoid duplicates
      if (peerId >= remotePeerId) return;

      // Don't create duplicate connections
      if (connections.has(remotePeerId)) return;

      const pc = createPeerConnection(roomId, peerId, remotePeerId, localStream);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Write offer to the REMOTE peer's offers path
        const offerRef = ref(
          getDb(),
          `games/${roomId}/voice/${remotePeerId}/offers/${peerId}`,
        );
        const offerData: SignalData = {
          sdp: offer.sdp ?? "",
          type: offer.type,
        };
        await set(offerRef, offerData);

        // Listen for answer from remote peer
        const answerRef = ref(
          getDb(),
          `games/${roomId}/voice/${remotePeerId}/answers/${peerId}`,
        );
        firebaseRefs.push(answerRef);

        const answerUnsub = onValue(answerRef, async (ansSnap) => {
          const answerData = ansSnap.val() as SignalData | null;
          if (!answerData?.sdp) return;
          if (pc.signalingState !== "have-local-offer") return;

          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription({
                sdp: answerData.sdp,
                type: answerData.type,
              }),
            );
          } catch {
            /* Remote description may already be set */
          }
        });
        unsubscribes.push(answerUnsub);

        // Listen for ICE from this peer
        listenForIceCandidates(roomId, peerId, remotePeerId, pc);
      } catch {
        cleanupPeer(remotePeerId);
      }
    });
    unsubscribes.push(peerJoinUnsub);

    // Watch for peers leaving
    const peerLeaveUnsub = onChildRemoved(voiceRootRef, (snapshot) => {
      const remotePeerId = snapshot.key;
      if (remotePeerId && remotePeerId !== peerId) {
        peerDisconnectedCb?.(remotePeerId);
        cleanupPeer(remotePeerId);
      }
    });
    unsubscribes.push(peerLeaveUnsub);
  }

  function leave(): void {
    // Unsubscribe all Firebase listeners
    for (const unsub of unsubscribes) {
      unsub();
    }
    unsubscribes.length = 0;

    // Detach any remaining off() refs
    for (const r of firebaseRefs) {
      off(r);
    }
    firebaseRefs.length = 0;

    // Close all peer connections
    for (const [remoteId] of connections) {
      cleanupPeer(remoteId);
    }
    connections.clear();

    // Stop local stream
    if (localStream) {
      for (const track of localStream.getTracks()) {
        track.stop();
      }
      localStream = null;
    }

    // Remove our presence from Firebase
    if (currentRoomId && currentPeerId) {
      remove(peerRef(currentRoomId, currentPeerId)).catch(() => {
        /* best-effort cleanup */
      });
    }

    currentRoomId = null;
    currentPeerId = null;
  }

  function toggleMute(): boolean {
    muted = !muted;
    if (localStream) {
      for (const track of localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
    return muted;
  }

  function isMutedFn(): boolean {
    return muted;
  }

  return {
    join,
    leave,
    toggleMute,
    isMuted: isMutedFn,
    onPeerConnected: (cb) => {
      peerConnectedCb = cb;
    },
    onPeerDisconnected: (cb) => {
      peerDisconnectedCb = cb;
    },
  };
}
