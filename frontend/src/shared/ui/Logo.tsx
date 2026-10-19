import { cn } from '../lib';
import { config } from '../config';

/** Logo tự thiết kế: bong bóng chat + sóng âm (chat & voice). */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="nebula-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M32 6c14.4 0 26 10.3 26 23s-11.6 23-26 23c-2.6 0-5.1-.3-7.4-1L12 57l2.6-10.9C9.3 41.9 6 35.8 6 29 6 16.3 17.6 6 32 6z"
        fill="url(#nebula-g)"
      />
      <rect x="21" y="23" width="4.5" height="12" rx="2.25" fill="#fff" />
      <rect x="29.75" y="17" width="4.5" height="24" rx="2.25" fill="#fff" />
      <rect x="38.5" y="21" width="4.5" height="16" rx="2.25" fill="#fff" />
      <circle cx="51" cy="12" r="5" fill="#F472B6" stroke="#0B1120" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="font-display text-xl font-extrabold tracking-tight">{config.appName}</span>
    </span>
  );
}
