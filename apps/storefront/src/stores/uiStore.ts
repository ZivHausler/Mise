import { create } from 'zustand';

interface UIState {
  /** Number of currently open sheets */
  openSheetCount: number;
  sheetOpened: () => void;
  sheetClosed: () => void;
  isSheetOpen: () => boolean;
}

export const useUIStore = create<UIState>()((set, get) => ({
  openSheetCount: 0,
  sheetOpened: () => set((s) => ({ openSheetCount: s.openSheetCount + 1 })),
  sheetClosed: () => set((s) => ({ openSheetCount: Math.max(0, s.openSheetCount - 1) })),
  isSheetOpen: () => get().openSheetCount > 0,
}));
