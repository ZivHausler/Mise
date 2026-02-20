import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
  onClick?: () => void;
}

interface ToastState {
  toasts: Toast[];
  addToast: (variant: ToastVariant, message: string, duration?: number, onClick?: () => void) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (variant, message, duration = 5000, onClick?) => {
    const id = String(++toastId);
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, variant, message, duration, onClick }] }));
    if (variant !== 'error' && !onClick) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
