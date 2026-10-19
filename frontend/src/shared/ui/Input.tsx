import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: ReactNode;
}

const fieldClass =
  'w-full rounded-xl border border-ink-600 bg-ink-950/60 px-3.5 text-[15px] text-slate-100 placeholder:text-slate-500 ' +
  'transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/25';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wide text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(fieldClass, 'h-11', error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/25', className)}
        {...rest}
      />
      {error ? <p className="text-xs text-rose-300">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  function Textarea({ label, error, className, id, ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wide text-slate-300">
            {label}
          </label>
        )}
        <textarea ref={ref} id={inputId} className={cn(fieldClass, 'py-2.5', className)} {...rest} />
        {error && <p className="text-xs text-rose-300">{error}</p>}
      </div>
    );
  },
);
