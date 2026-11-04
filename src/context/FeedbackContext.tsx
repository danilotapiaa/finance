import { createContext, useContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface FeedbackContextValue {
  toast: (options: ToastOptions | string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const FeedbackContext = createContext<FeedbackContextValue>({
  toast: () => {},
  confirm: async () => false,
});

export const useFeedback = (): FeedbackContextValue => useContext(FeedbackContext);
