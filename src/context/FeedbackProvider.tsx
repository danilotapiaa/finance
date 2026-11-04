import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FeedbackContext,
  type ConfirmOptions,
  type FeedbackContextValue,
  type ToastOptions,
  type ToastVariant,
} from './FeedbackContext';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-ink text-canvas',
};

let nextToastId = 1;

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timersRef = useRef<number[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastOptions | string) => {
      const options = typeof input === 'string' ? { message: input } : input;
      const id = nextToastId++;
      const variant = options.variant ?? 'info';

      setToasts((previous) => [
        ...previous.slice(-2),
        { id, message: options.message, variant },
      ]);

      const timer = window.setTimeout(() => dismissToast(id), options.duration ?? 3500);
      timersRef.current.push(timer);
    },
    [dismissToast]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState((previous) => {
        previous?.resolve(false);
        return { options, resolve };
      });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState((previous) => {
      previous?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!confirmState) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    confirmButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeConfirm(false);
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [confirmState, closeConfirm]);

  const value = useMemo<FeedbackContextValue>(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center space-y-2 px-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center space-x-2 rounded-xl px-4 py-3 shadow-lg ${TOAST_STYLES[item.variant]}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {TOAST_ICONS[item.variant]}
            </span>
            <span className="flex-1 text-[13px] font-medium">{item.message}</span>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => dismissToast(item.id)}
              className="rounded-full p-0.5 opacity-70 transition hover:opacity-100 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm"
          onClick={() => closeConfirm(false)}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            aria-describedby={
              confirmState.options.message ? 'feedback-dialog-message' : undefined
            }
            className="w-full max-w-sm rounded-2xl border border-ink/[0.06] bg-surface p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="feedback-dialog-title" className="text-[15px] font-semibold text-ink">
              {confirmState.options.title}
            </h2>

            {confirmState.options.message && (
              <p
                id="feedback-dialog-message"
                className="mt-2 text-[13px] leading-relaxed text-muted"
              >
                {confirmState.options.message}
              </p>
            )}

            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-xl bg-surface-muted px-4 py-2 text-[13px] font-medium text-muted transition active:scale-95"
              >
                {confirmState.options.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition active:scale-95 ${
                  confirmState.options.danger
                    ? 'bg-red-600 text-white'
                    : 'bg-ink text-canvas'
                }`}
              >
                {confirmState.options.confirmLabel ?? 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};
