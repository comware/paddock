/**
 * useToastStore - Lightweight toast notification system
 *
 * Queue-based toast messages with auto-dismiss support.
 * Provides add() and dismiss() actions for showing user feedback
 * on async operations like exports, saves, and deletions.
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onAction: () => void | Promise<void>;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  /**
   * Optional action, used for undo.
   *
   * Several actions in Paddock are a single tap and irreversible - sowing a planned
   * tray, moving one to light, approving a plan. Rather than guard each with a
   * confirmation dialog, which slows down the common case where the tap was correct,
   * the result is announced with a way back.
   */
  action?: ToastAction;
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  /** Announce a result with a way to undo it. Held longer than a plain toast. */
  addWithUndo: (message: string, onUndo: () => void | Promise<void>, duration?: number) => void;
  dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addWithUndo: (message, onUndo, duration = 8000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;

    const toast: Toast = {
      id,
      message,
      type: 'success',
      duration,
      action: {
        label: 'Undo',
        onAction: async () => {
          await onUndo();
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        },
      },
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Longer than a plain toast by default: three seconds is not enough to notice a
    // mistake, read the message, and reach for the button.
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  add: (message, type = 'info', duration = 3000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const toast: Toast = { id, message, type, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
