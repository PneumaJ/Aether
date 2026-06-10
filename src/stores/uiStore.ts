import { create } from "zustand";

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function today(): string {
  const d = new Date();
  return fmtDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function shiftDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const d2 = new Date(y, m - 1, d);
  d2.setDate(d2.getDate() + delta);
  return fmtDate(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
}

const HEADER_KEY = "aether-header-text";

function loadHeaderText(): string {
  try {
    return localStorage.getItem(HEADER_KEY) ?? "";
  } catch {
    return "";
  }
}

interface UIState {
  selectedDate: string;
  isInitialized: boolean;
  isLoading: boolean;
  isWindowFocused: boolean;
  headerText: string;

  setSelectedDate: (date: string) => void;
  goToToday: () => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;
  setInitialized: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  setWindowFocused: (val: boolean) => void;
  setHeaderText: (text: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDate: today(),
  isInitialized: false,
  isLoading: false,
  isWindowFocused: true,
  headerText: loadHeaderText(),

  setSelectedDate: (date) => set({ selectedDate: date }),
  goToToday: () => set({ selectedDate: today() }),
  goToPrevDay: () =>
    set((state) => ({ selectedDate: shiftDate(state.selectedDate, -1) })),
  goToNextDay: () =>
    set((state) => ({ selectedDate: shiftDate(state.selectedDate, 1) })),
  setInitialized: (val) => set({ isInitialized: val }),
  setLoading: (val) => set({ isLoading: val }),
  setWindowFocused: (val) => set({ isWindowFocused: val }),
  setHeaderText: (text) => {
    set({ headerText: text });
    try {
      localStorage.setItem(HEADER_KEY, text);
    } catch {}
  },
}));
