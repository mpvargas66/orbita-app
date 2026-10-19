import { create } from "zustand";

// Session-only: entering the PIN once opens every private chat until the app goes to
// the background (see the AppState listener in app/_layout.tsx) or the user logs out.
interface PrivateChatsState {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
}

export const usePrivateChatsStore = create<PrivateChatsState>((set) => ({
  unlocked: false,
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}));
