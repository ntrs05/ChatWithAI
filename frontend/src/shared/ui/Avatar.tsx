import { useState } from 'react';
import { cn, initials } from '../lib';

interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
  speaking?: boolean;
  status?: 'online' | 'offline';
  className?: string;
}

export function Avatar({ src, name, size = 40, speaking, status, className }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn('relative inline-flex shrink-0 rounded-full', speaking && 'ring-2 ring-brand-400 ring-offset-2 ring-offset-ink-800', className)}
      style={{ width: size, height: size }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt={name}
          onError={() => setBroken(true)}
          className="h-full w-full rounded-full bg-ink-600 object-cover"
          draggable={false}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-aurora-500 font-semibold text-white"
          style={{ fontSize: size * 0.38 }}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-[3px] border-ink-800',
            status === 'online' ? 'bg-emerald-400' : 'bg-slate-500',
          )}
          style={{ width: size * 0.36, height: size * 0.36 }}
        />
      )}
    </span>
  );
}
