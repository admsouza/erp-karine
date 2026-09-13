import { useEffect, type ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/** Janela modal padrão (fecha com Esc e clique no fundo). */
export function Modal({ open, title, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full rounded-xl bg-white shadow-xl ${size === 'lg' ? 'max-w-3xl' : 'max-w-xl'}`}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
