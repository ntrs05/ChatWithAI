import { useChatStore } from '../application/chatStore';

export function TypingIndicator({ channelId }: { channelId: string }) {
  const typing = useChatStore((s) => s.typing[channelId]);
  const names = Object.values(typing ?? {}).map((t) => t.name);
  const text =
    names.length === 0
      ? ''
      : names.length === 1
        ? `${names[0]} đang soạn tin…`
        : names.length === 2
          ? `${names[0]} và ${names[1]} đang soạn tin…`
          : 'Nhiều người đang soạn tin…';

  return (
    <div className="flex h-6 items-center gap-2 px-5 text-xs text-slate-400" aria-live="polite">
      {text && (
        <>
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </span>
          <span>
            <b className="text-slate-200">{text.split(' đang')[0]}</b>
            {text.includes(' đang') ? ` đang${text.split(' đang')[1]}` : ''}
          </span>
        </>
      )}
    </div>
  );
}
