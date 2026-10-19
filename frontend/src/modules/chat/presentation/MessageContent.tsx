import { Fragment, type ReactNode } from 'react';

const TOKEN_RE = /(https?:\/\/[^\s]+)|(\*\*[^*]+\*\*)|(`[^`]+`)/g;

/** Hiển thị nội dung: tự nhận link, **in đậm**, `code`, xuống dòng. Không dùng innerHTML (tránh XSS). */
export function MessageContent({ text, highlight }: { text: string; highlight?: string }) {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {renderLine(line, highlight)}
        </Fragment>
      ))}
    </>
  );
}

function renderLine(line: string, highlight?: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(...mark(line.slice(last, idx), highlight, `t${idx}`));
    const [token, url, bold, code] = m;
    if (url) {
      out.push(
        <a key={`u${idx}`} href={url} target="_blank" rel="noreferrer noopener" className="text-brand-300 hover:underline">
          {url}
        </a>,
      );
    } else if (bold) {
      out.push(<strong key={`b${idx}`}>{bold.slice(2, -2)}</strong>);
    } else if (code) {
      out.push(
        <code key={`c${idx}`} className="rounded bg-ink-950 px-1.5 py-0.5 font-mono text-[0.85em] text-brand-200">
          {code.slice(1, -1)}
        </code>,
      );
    }
    last = idx + token.length;
  }
  if (last < line.length) out.push(...mark(line.slice(last), highlight, `t${last}`));
  return out;
}

function mark(text: string, highlight: string | undefined, key: string): ReactNode[] {
  if (!highlight) return [text];
  const lower = text.toLowerCase();
  const q = highlight.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let found = lower.indexOf(q);
  while (found >= 0 && q) {
    if (found > i) parts.push(text.slice(i, found));
    parts.push(
      <mark key={`${key}-${found}`} className="rounded bg-amber-300/30 px-0.5 text-amber-100">
        {text.slice(found, found + q.length)}
      </mark>,
    );
    i = found + q.length;
    found = lower.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}
