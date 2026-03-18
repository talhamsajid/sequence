# Sequence Mobile App — Implementation Plan

> **Status:** PLANNED — Not started
> **Created:** 2026-03-18
> **Scope:** Native Android + iOS app with online + offline P2P multiplayer

---

## 1. Tech Stack Decision

**React Native + Expo with Shared Core Package**

- Reuses 1,126 lines of pure TypeScript game logic verbatim (game.ts, board.ts, teams.ts, avatars.ts)
- Same React/TypeScript stack — no new language
- Reanimated 3 for 60fps animations
- EAS Build for App Store / Play Store pipeline
- `react-native-ble-plx` for Bluetooth, Multipeer (iOS) + WiFi Direct (Android) for local P2P

### Why not alternatives:
- **Flutter:** Full rewrite in Dart, zero team experience, double maintenance
- **Capacitor:** WebView wrapper = web feel, no real BLE, Apple rejects these

---

## 2. Architecture

### Monorepo Structure

```
sequence/
  packages/
    game-logic/              # Pure TS: game.ts, board.ts, teams.ts (shared web+mobile)
    transport-firebase/      # ITransport via Firebase RTDB (online)
    transport-local/         # ITransport via BLE/WiFi (offline P2P)
  apps/
    web/                     # Existing Next.js app (imports packages)
    mobile/                  # New Expo app (imports packages)
```

### Transport Interface (enables online + offline with same game logic)

```typescript
interface ITransport {
  createRoom(roomId: string, initialState: GameState): Promise<void>;
  subscribeToRoom(roomId: string, callback: (state: GameState | null) => void): () => void;
  setRoom(roomId: string, state: GameState): Promise<void>;
  getRoom(roomId: string): Promise<GameState | null>;
  registerPresence(roomId: string, playerId: string): () => void;
  subscribeToPresence(roomId: string, callback: (connected: Set<string>) => void): () => void;
  deleteRoom(roomId: string): Promise<void>;
}
```

`transport-firebase` = Firebase RTDB calls. `transport-local` = local state + BLE/WiFi broadcast.
Game page component does not know which transport is active.

### Offline P2P Model

```
Host Device:
  - Holds authoritative GameState
  - Runs @sequence/core game logic
  - Validates all moves (prevents cheating)
  - Broadcasts state to all clients

Client Device:
  - Sends actions (play card, join, leave) to host
  - Receives complete GameState after each update
  - Renders UI from received state
  - Cannot modify state directly

Discovery: BLE GATT service → Multipeer (iOS) / WiFi Direct (Android) fallback
Protocol: JSON messages over BLE L2CAP / WiFi TCP socket
Reconnection: 30-second window, full state resync on reconnect
```

---

## 3. Code Reuse Analysis

### Transfers Directly (zero changes)

| File | Lines | Content |
|------|-------|---------|
| game.ts | 803 | Core engine: createGame, addPlayer, playCard, sequence detection, win conditions |
| board.ts | 85 | Board layout, deck, shuffle, card positions, Jack detection |
| teams.ts | 198 | Team assignment, turn order, scoring |
| avatars.ts | 40 | Deterministic avatar assignment |

### Needs Adaptation (SDK swap, same logic)

| File | Lines | Change |
|------|-------|--------|
| firebase.ts | 219 | Web SDK → @react-native-firebase/database. hydrateGameState transfers verbatim |
| cards.ts | 62 | URL paths → require() asset references |
| utils.ts | 42 | localStorage → AsyncStorage |
| chat.ts | 94 | Same Firebase SDK swap |

### Full Rewrite (native UI)

| File | Lines | Why |
|------|-------|-----|
| All components | ~4,200 | React DOM → React Native (Views, Pressables, Reanimated) |
| sounds.ts | 156 | Web Audio API → expo-av (pre-rendered audio files) |
| voice.ts | 639 | Browser WebRTC → react-native-webrtc |

---

## 4. Implementation Phases

### Phase 0: Project Setup (S — 2-3 days)

- Initialize monorepo (pnpm workspaces)
- Extract `@sequence/game-logic` from existing lib files
- Initialize Expo app (`npx create-expo-app`)
- Configure Metro to resolve shared package
- Install core deps: react-native-svg, reanimated, gesture-handler, expo-haptics, expo-av
- Configure EAS Build (dev/preview/production profiles)
- Card asset pipeline: copy 53 SVGs, create require()-based mapping

### Phase 1: Core Game — Single Device (L — 2-3 weeks)

**Goal: Playable hot-seat game on one phone. No networking. This is MVP.**

- Storage adapter (AsyncStorage wrapper)
- CardCell component (Pressable + SVG card + chip overlay)
- Chip component (layered circles with radial gradient)
- GameBoard component (10x10 Flexbox grid + SVG sequence lines) — **BOTTLENECK**
- PlayerHand component (horizontal ScrollView with spring selection)
- GameStatus component (floating pill with avatars + timer ring)
- WinOverlay component (bottom half-sheet with phased reveal)
- Local game state hook (useLocalGame — pure functions, no Firebase)
- Home screen, local game setup screen, local play screen
- Chip placement animation (drop + bounce via Reanimated)
- Sequence line animation (stroke-dashoffset draw)

### Phase 2: Online Multiplayer (M — 1-2 weeks)

**Goal: Feature parity with web. Cross-platform play (web + mobile in same room).**

- Firebase native adapter (@react-native-firebase/database)
- Online game hook (useOnlineGame — port page.tsx orchestration logic)
- Create/Join game screens
- Lobby component
- Chat adapter + component
- Reconnect overlay
- Player toast system
- Deep linking (sequence:// + Universal Links)

### Phase 3: Offline P2P Multiplayer (XL — 2-3 weeks)

**Goal: Play without internet via Bluetooth/WiFi. The differentiator.**

- P2P Transport interface definition
- BLE transport (react-native-ble-plx): discovery, connection, L2CAP data channel
- WiFi transport: Multipeer Connectivity (iOS) + WiFi Direct (Android)
- State serialization + delta sync (full state ~3KB, deltas <500 bytes)
- Host state machine (useP2PHost hook)
- Client state machine (useP2PClient hook)
- Connection mode picker screen
- Peer discovery UI (scanning animation, device list)
- P2P game screen
- P2P reconnection handling (30s window, full state resync)

### Phase 4: Polish (L — 1-2 weeks)

- Sound effects (pre-render oscillator sounds to audio files, expo-av playback)
- Haptic feedback mapping (chip=medium, sequence=success, jack=heavy, turn=light)
- Jack card animations (port phase machine to Reanimated)
- Pinch-to-zoom on board (PinchGestureHandler, 1.0x–2.5x)
- Card selection gesture (long-press preview, spring lift)
- Settings screen (sound, haptics, name, color blind mode)
- Voice chat (react-native-webrtc with Firebase signaling)

### Phase 5: App Store (S — 1 week)

- App icon + splash screen design
- App Store / Play Store metadata + screenshots
- TestFlight / Internal Testing distribution
- Production build + submission
- OTA update pipeline (EAS Update)

---

## 5. Design Direction: "Deep Table"

Dark luxury card room aesthetic — aged walnut, brass gold, wine red.

### Color Palette

```
SURFACES
Background:          #0D0B0E  (near-black, warm)
Board surface:       #1C1209  (aged walnut)
Card felt:           #1A2E1A  (deep hunter green)
Status bar:          #110F13  (purple-black)

ACCENTS
Primary gold:        #C9943A  (aged brass)
Bright gold:         #E8C06A  (candlelight)
Copper:              #A0522D  (warm secondary)

CHIPS
Sequence red:        #C0392B  (wine red)
Sequence blue:       #1A6B9A  (deep ocean)
Sequence green:      #2D7A4A  (forest green)
Free cell gold:      #8B6914  (old gold)

TEXT
Headings:            #F2E8D5  (aged parchment)
Body:                #C8B89A  (warm gray-beige)
Muted:               #6B5B4A  (warm dark gray)
```

### Typography
- **Headings:** Cinzel (serif, noble, strategic feel)
- **UI labels:** Inter (legibility at small sizes)
- **Numbers/timer:** Roboto Mono (tabular, clinical)

### Key Design Decisions
- Board: pinch-to-zoom (1.0x–2.5x), double-tap to zoom cell
- Hand: walnut shelf dock, cards lift with spring physics on select
- Win screen: half-sheet from bottom (board visible underneath), chip confetti burst
- Status bar: floating pill over board, not a docked strip
- Avatars: color-initial circles (not emoji)
- No white cards/modals on dark backgrounds
- Color blind mode: shapes on chips (dot=red, hollow=blue, square=green)

### The "Wow" Moment
On sequence completion: chips animate along the sequence line path, merge into the glow, then settle. Chip-burst confetti on win. Only possible on mobile.

### Animation Specs
- Chip place: drop from 8px above, bounce [−8, 2, 0], shadow impact ring 150ms
- Card select: spring lift (stiffness 180, damping 14), 12px translateY
- Sequence complete: cells flash white 80ms → line draws 400ms → chips ripple scale [1, 1.3, 1.1] staggered 80ms
- Jack animation: port existing phase machine (enter 520ms → hold 750ms → exit 380ms)
- Turn change: current pill deflates 0.9x, next pill inflates 1.0x with color pulse

### Haptic Mapping
```
Chip place:           ImpactFeedbackStyle.Medium
Sequence complete:    NotificationFeedbackType.Success
Win:                  NotificationFeedbackType.Success (x2, 300ms gap)
Jack REMOVE:          ImpactFeedbackStyle.Heavy
Jack WILD:            ImpactFeedbackStyle.Medium
Card select:          ImpactFeedbackStyle.Light
Your turn:            ImpactFeedbackStyle.Light
Timer < 10s:          SelectionFeedbackType (per second)
```

---

## 6. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| 10x10 board on phone (34px/cell) | High | Pinch-to-zoom + React.memo on every cell |
| BLE throughput (~20KB/s) | High | Delta sync (<500B per move), L2CAP channels |
| WiFi Direct disrupts Android WiFi | Medium | BLE as default, WiFi Direct opt-in with warning |
| WebRTC voice on iOS audio conflicts | Medium | AVAudioSession playAndRecord + mixWithOthers |
| SVG rendering perf on low-end Android | Medium | Pre-rasterize to PNG at build time if needed |
| App Store rejection | Low | Native features (P2P, haptics) differentiate from web wrapper |

---

## 7. Testing Matrix

### Devices
- iPhone SE (smallest screen — board viability)
- iPhone 15 Pro Max (largest iPhone)
- iPad Air (tablet landscape)
- Android low-end (Pixel 3a — performance)
- Android high-end (Pixel 8)

### Test Types
- Unit: shared game-logic package (Jest, 90%+ coverage)
- Integration: Firebase/P2P adapters with mocks
- E2E: Maestro — create → lobby → play → win flow
- Cross-platform: web player vs mobile player in same room

---

## 8. Dependencies

```json
{
  "core": [
    "expo", "expo-router", "react-native",
    "react-native-svg", "react-native-reanimated",
    "react-native-gesture-handler", "react-native-safe-area-context"
  ],
  "firebase": [
    "@react-native-firebase/app",
    "@react-native-firebase/database"
  ],
  "p2p": [
    "react-native-ble-plx",
    "react-native-wifi-p2p (Android)",
    "react-native-multipeer (iOS, custom native module)"
  ],
  "media": [
    "expo-av", "expo-haptics",
    "react-native-webrtc"
  ],
  "storage": [
    "@react-native-async-storage/async-storage"
  ],
  "build": [
    "eas-cli", "turborepo (monorepo)"
  ]
}
```

---

## 9. Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Setup | 2-3 days | ~3 days |
| Phase 1: Core Game | 2-3 weeks | ~3.5 weeks |
| Phase 2: Online | 1-2 weeks | ~5 weeks |
| Phase 3: P2P | 2-3 weeks | ~8 weeks |
| Phase 4: Polish | 1-2 weeks | ~10 weeks |
| Phase 5: App Store | 1 week | ~11 weeks |

**MVP (playable on device):** ~3.5 weeks
**Full product (online + P2P):** ~8 weeks
**Store-ready:** ~11 weeks
