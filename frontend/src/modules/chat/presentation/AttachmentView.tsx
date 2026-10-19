import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, ImageOff, X } from 'lucide-react';
import { formatBytes } from '@/shared/lib';
import type { Attachment } from '../domain/models';
import { chatService } from '../module';

function useAttachmentUrl(attachment: Attachment) {
  const [url, setUrl] = useState<string | null>(attachment.url ?? null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    chatService()
      .resolveAttachmentUrl(attachment)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [attachment]);
  return { url, error };
}

export function AttachmentView({ attachment }: { attachment: Attachment }) {
  const { url, error } = useAttachmentUrl(attachment);
  const [zoom, setZoom] = useState(false);

  if (attachment.kind === 'image') {
    if (error) {
      return (
        <div className="flex h-24 w-48 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs text-muted">
          <ImageOff size={16} /> Ảnh không khả dụng
        </div>
      );
    }
    return (
      <>
        <button onClick={() => setZoom(true)} className="block overflow-hidden rounded-xl border border-white/10 bg-ink-900" aria-label={`Xem ảnh ${attachment.name}`}>
          {url ? (
            <img src={url} alt={attachment.name} className="max-h-72 max-w-[min(100%,380px)] object-contain" />
          ) : (
            <div className="h-40 w-64 animate-pulse bg-white/5" />
          )}
        </button>
        {zoom &&
          url &&
          createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/90 p-6" onClick={() => setZoom(false)}>
              <button className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Đóng">
                <X size={20} />
              </button>
              <img src={url} alt={attachment.name} className="max-h-full max-w-full rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
              <a
                href={url}
                download={attachment.name}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                <Download size={16} /> Tải xuống {attachment.name}
              </a>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-white/10 bg-ink-900/70 p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-aurora-500/20 text-aurora-300">
        <FileText size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-brand-200">{attachment.name}</span>
        <span className="block text-xs text-muted">{formatBytes(attachment.size)}</span>
      </span>
      {url && (
        <a href={url} download={attachment.name} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white" aria-label="Tải xuống">
          <Download size={18} />
        </a>
      )}
    </div>
  );
}
