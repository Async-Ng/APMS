import { create } from "zustand";

interface ToastState {
  message: string | null;
  variant: "error" | "success";
  show: (message: string, variant?: "error" | "success") => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  variant: "error",
  show: (message, variant = "error") => set({ message, variant }),
  hide: () => set({ message: null }),
}));
