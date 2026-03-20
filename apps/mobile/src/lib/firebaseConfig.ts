/**
 * Single source of truth for Firebase configuration.
 *
 * Values are hardcoded as fallbacks for now. To switch to env vars later,
 * populate EXPO_PUBLIC_FIREBASE_* in your Expo config and the
 * Constants.expoConfig?.extra lookup will take precedence.
 */

// Expo Constants is optional — gracefully degrade if unavailable
let extra: Record<string, string> | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Constants = require("expo-constants").default;
  extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
} catch {
  // expo-constants not available — use hardcoded fallbacks
}

export const firebaseConfig = {
  apiKey: extra?.EXPO_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDnb6NWw0eAsatYE8HF11RcZ2LltyvbHXU",
  authDomain: extra?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "sequence-game-online.firebaseapp.com",
  databaseURL: extra?.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "https://sequence-game-online-default-rtdb.firebaseio.com",
  projectId: extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "sequence-game-online",
  storageBucket: extra?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "sequence-game-online.firebasestorage.app",
  messagingSenderId: extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "884344372722",
  appId: extra?.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:884344372722:web:e5017d48ca6f38a4e2bf6b",
} as const;
