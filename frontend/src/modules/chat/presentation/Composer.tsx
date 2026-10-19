import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { FileText, Paperclip, SendHorizontal, Smile, X } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { cn, formatBytes } from '@/shared/lib';
import { IconButton } from '@/shared/ui';
import type { PendingFile } from '../domain/models';
import { MAX_FILES_PER_MESSAGE, MAX_MESSAGE_LENGTH, isImage } from '../domain/rules';
import { chatService } from '../module';

const EMOJIS = ['😀', '😂', '🥹', '😍', '😎', '🤔', '😴', '😭', '👍', '👏', '🙏', '🔥', '🎉', '❤️', '💯', '✅', '🚀', '🎮', '🎧', '📚', '☕', '✨', '👀', '🤝'];

interface Props {
  channelId: string;
  serverId: string;
  channelName: string;
  files: PendingFile[];
  onFilesChange: (updater: (files: PendingFile[]) => PendingFile[]) => void;
  onAddFiles: (files: File[]) => void;
}

/** UC04 (gửi tin nhắn) + UC06 (đính kèm file / hình ảnh). */
export function Composer({ channelId, serverId, channelName, files, onFilesChange, onAddFiles }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText('');
    textareaRef.current?.focus();
  }, [channelId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  async function submit() {
    if (sending) return;
    const content = text;
    const toSend = files;
    if (!content.trim() && toSend.length === 0) return;
    setSending(true);
    setText('');
    try {
      await chatService().send({ channelId, serverId }, content, toSend.map((f) => f.file), (index, ratio) =>
        onFilesChange((list) => list.map((f, i) => (i === index ? { ...f, progress: ratio } : f))),
      );
      toSend.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      onFilesChange(() => []);
    } catch (err) {
      setText(content);
      onFilesChange((list) => list.map((f) => ({ ...f, progress: 0 })));
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: đang gõ dấu bằng bộ gõ (Unikey/Telex) → không gửi
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (e.target.value) chatService().notifyTyping(channelId, serverId);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = Array.from(e.clipboardData.files);
    if (pasted.length) {
      e.preventDefault();
      onAddFiles(pasted);
    }
  };

  const remove = (id: string) =>
    onFilesChange((list) => {
      const f = list.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return list.filter((x) => x.id !== id);
    });

  const remaining = MAX_MESSAGE_LENGTH - text.length;

  return (
    <div className="px-4 pb-5">
      <div className="rounded-2xl border border-white/5 bg-ink-700 focus-within:border-brand-400/50">
        {files.length > 0 && (
          <div className="flex gap-3 overflow-x-auto border-b border-white/5 p-3">
            {files.map((f) => (
              <div key={f.id} className="relative w-36 shrink-0 rounded-xl bg-ink-850 p-2">
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg bg-ink-900 text-aurora-300">
                    <FileText size={34} />
                  </div>
                )}
                <div className="mt-1.5 truncate text-xs text-slate-200">{f.file.name}</div>
                <div className="text-[10px] text-muted">{formatBytes(f.file.size)}</div>
                {sending && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-600">
                    <div className="h-full bg-brand-400 transition-all" style={{ width: `${Math.round(f.progress * 100)}%` }} />
                  </div>
                )}
                {!sending && (
                  <button
                    onClick={() => remove(f.id)}
                    aria-label={`Bỏ ${f.file.name}`}
                    className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white shadow hover:bg-rose-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1 px-2 py-1.5">
          <IconButton
            label="Đính kèm file / hình ảnh"
            className="mb-1 h-9 w-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || files.length >= MAX_FILES_PER_MESSAGE}
          >
            <Paperclip size={20} />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              onAddFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={`Nhắn tin tới #${channelName}`}
            aria-label="Nội dung tin nhắn"
            className="max-h-[220px] min-h-[24px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          {remaining < 200 && <span className={cn('mb-3 text-xs', remaining < 20 ? 'text-rose-300' : 'text-muted')}>{remaining}</span>}
          <div className="relative mb-1">
            <IconButton label="Biểu tượng cảm xúc" className="h-9 w-9" onClick={() => setEmojiOpen((v) => !v)} active={emojiOpen}>
              <Smile size={20} />
            </IconButton>
            {emojiOpen && (
              <div className="absolute bottom-11 right-0 z-20 grid w-64 animate-fade-in grid-cols-8 gap-1 rounded-xl border border-white/10 bg-ink-950 p-2 shadow-2xl">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      setText((t) => t + e);
                      setEmojiOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-lg p-1 text-xl hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => void submit()}
            disabled={sending || (!text.trim() && files.length === 0)}
            aria-label="Gửi"
            className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-400 text-ink-950 transition hover:bg-brand-300 disabled:bg-ink-600 disabled:text-muted"
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function toPendingFiles(files: File[]): PendingFile[] {
  return files.map((file) => ({
    id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: isImage(file.type) ? URL.createObjectURL(file) : undefined,
    progress: 0,
  }));
}
