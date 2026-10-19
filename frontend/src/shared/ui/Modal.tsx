import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full animate-fade-in overflow-hidden rounded-2xl border border-ink-600 bg-ink-800 shadow-2xl',
          widths[size],
        )}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>
        {(title || description) && (
          <div className="px-6 pb-2 pt-6">
            {title && <h2 className="font-display text-xl font-bold text-white">{title}</h2>}
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 bg-ink-900/60 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
