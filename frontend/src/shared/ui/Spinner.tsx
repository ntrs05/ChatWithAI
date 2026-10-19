import { Loader2 } from 'lucide-react';
import { cn } from '../lib';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} aria-label="Đang tải" />;
}

export function FullScreenLoader({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-3 bg-ink-900 text-muted">
      <Spinner size={28} className="text-brand-400" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
