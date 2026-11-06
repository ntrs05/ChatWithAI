import { memo, useEffect, useRef, useState } from 'react';
import { AlertCircle, Pencil, Pin, PinOff, RotateCw, SmilePlus, Trash2 } from 'lucide-react';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { cn, formatDateTime, formatTime } from '@/shared/lib';
import { Avatar, Button, IconButton, Modal } from '@/shared/ui';
import type { Message } from '../domain/models';
import { QUICK_EMOJIS, hasReacted, messageActions, stripMentions, validateEdit, type MessagePermissions } from '../domain/rules';
import { chatService } from '../module';
import { AttachmentView } from './AttachmentView';
import { MessageContent } from './MessageContent';

interface Props {
  message: Message;
  showHeader: boolean;
  isMine: boolean;
  meId?: string;
  /** Quyền ghim / xóa tin người khác trong hội thoại này (do nơi nhúng ChatView cấp). */
  permissions?: MessagePermissions;
}

const NO_PERMISSIONS: MessagePermissions = { canPin: false, canDeleteOthers: false };

/** Bảng chọn cảm xúc nhanh. */
function EmojiPicker({ onPick, onClose, align = 'right' }: { onPick: (emoji: string) => void; onClose: () => void; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Chọn cảm xúc"
      className={cn('absolute top-full z-30 mt-1 flex animate-fade-in gap-0.5 rounded-xl border border-white/10 bg-ink-950 p-1.5 shadow-2xl', align === 'right' ? 'right-0' : 'left-0')}
    >
      {QUICK_EMOJIS.map((e) => (
        <button key={e} type="button" aria-label={`Thả ${e}`} onClick={() => onPick(e)} className="h-8 w-8 rounded-lg text-lg transition hover:scale-125 hover:bg-white/10">
          {e}
        </button>
      ))}
    </div>
  );
}

/** Ô sửa tin tại chỗ: Enter lưu, Shift+Enter xuống dòng, Esc hủy. */
function Editor({ message, onDone }: { message: Message; onDone: () => void }) {
  const [text, setText] = useState(message.content);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (text.trim() === message.content.trim()) return onDone();
    const invalid = validateEdit(text);
    if (invalid) return setError(invalid);
    setSaving(true);
    try {
      await chatService().edit(message, text);
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Không sửa được tin nhắn'));
      setSaving(false);
    }
  };

  return (
    <div className="mt-1">
      <textarea
        autoFocus
        aria-label="Nội dung đang sửa"
        value={text}
        rows={Math.min(8, Math.max(2, text.split('\n').length))}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone();
          else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void save();
          }
        }}
        className="w-full resize-none rounded-xl border border-brand-400/50 bg-ink-950/70 px-3 py-2 text-[15px] text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400/25"
      />
      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
        <span>
          Esc để <button onClick={onDone} className="font-semibold text-brand-300 hover:underline">hủy</button> · Enter để{' '}
          <button onClick={() => void save()} disabled={saving} className="font-semibold text-brand-300 hover:underline">lưu</button>
        </span>
      </div>
    </div>
  );
}

export const MessageItem = memo(function MessageItem({ message, showHeader, isMine, meId, permissions = NO_PERMISSIONS }: Props) {
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const can = messageActions(message, meId, permissions);
  const anyAction = can.react || can.edit || can.pin || can.remove;

  const run = async (action: () => Promise<void>, fallback: string) => {
    try {
      await action();
    } catch (err) {
      toast.error(errorMessage(err, fallback));
    }
  };

  const reactions = (message.reactions ?? []).filter((r) => r.count > 0);

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group relative flex gap-3 px-4 py-0.5 transition-colors hover:bg-white/[0.025]',
        showHeader && 'mt-3.5',
        message.status === 'sending' && 'opacity-60',
        message.pinned && 'bg-amber-300/[0.04]',
      )}
    >
      <div className="w-10 shrink-0">
        {showHeader ? (
          <Avatar src={message.author.avatarUrl} name={message.author.displayName} size={40} />
        ) : (
          <span className="invisible block pt-1 text-right text-[10px] text-muted group-hover:visible">{formatTime(message.createdAt)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className={cn('font-semibold', isMine ? 'text-brand-300' : 'text-white')}>{message.author.displayName}</span>
            <time className="text-xs text-muted" dateTime={message.createdAt} title={formatDateTime(message.createdAt)}>
              {formatDateTime(message.createdAt)}
            </time>
            {message.pinned && (
              <span title="Tin đã ghim" className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                <Pin size={12} /> Đã ghim
              </span>
            )}
          </div>
        )}

        {message.deleted ? (
          <p className="text-[15px] italic text-muted">Tin nhắn đã bị xóa</p>
        ) : editing ? (
          <Editor message={message} onDone={() => setEditing(false)} />
        ) : (
          <>
            {message.content && (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-200">
                <MessageContent text={message.content} />
                {message.editedAt && (
                  <span className="ml-1.5 select-none text-[11px] text-muted" title={`Đã chỉnh sửa ${formatDateTime(message.editedAt)}`}>
                    (đã chỉnh sửa)
                  </span>
                )}
              </div>
            )}
            {message.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-start gap-2">
                {message.attachments.map((a) => (
                  <AttachmentView key={a.id} attachment={a} />
                ))}
              </div>
            )}
            {reactions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="Cảm xúc">
                {reactions.map((r) => {
                  const mine = hasReacted(r, meId);
                  return (
                    <button
                      key={r.emoji}
                      type="button"
                      disabled={!can.react}
                      aria-pressed={mine}
                      aria-label={`${r.emoji} ${r.count}${mine ? ', bạn đã thả' : ''}`}
                      onClick={() => void run(() => chatService().react(message, r.emoji), 'Không thả được cảm xúc')}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition',
                        mine ? 'border-brand-400/60 bg-brand-400/15 text-brand-100' : 'border-white/10 bg-ink-750 text-slate-300 hover:border-white/25',
                      )}
                    >
                      <span>{r.emoji}</span>
                      <span className="text-xs font-semibold">{r.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {message.status === 'failed' && (
          <div className="mt-1 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle size={14} /> Gửi thất bại.
            <button onClick={() => void chatService().retry(message)} className="inline-flex items-center gap-1 font-semibold hover:underline">
              <RotateCw size={12} /> Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Thanh thao tác khi rê chuột (hoặc đang mở bảng cảm xúc) */}
      {anyAction && !editing && (
        <div
          role="toolbar"
          aria-label="Thao tác với tin nhắn"
          className={cn(
            'absolute -top-3.5 right-4 z-10 items-center gap-0.5 rounded-lg border border-white/10 bg-ink-850 p-0.5 shadow-lg',
            pickerOpen ? 'flex' : 'hidden group-hover:flex group-focus-within:flex',
          )}
        >
          {can.react && (
            <div className="relative">
              <IconButton label="Thả cảm xúc" active={pickerOpen} onClick={() => setPickerOpen((v) => !v)}>
                <SmilePlus size={17} />
              </IconButton>
              {pickerOpen && (
                <EmojiPicker
                  onClose={() => setPickerOpen(false)}
                  onPick={(emoji) => {
                    setPickerOpen(false);
                    void run(() => chatService().react(message, emoji), 'Không thả được cảm xúc');
                  }}
                />
              )}
            </div>
          )}
          {can.edit && (
            <IconButton label="Sửa tin nhắn" onClick={() => setEditing(true)}>
              <Pencil size={16} />
            </IconButton>
          )}
          {can.pin && (
            <IconButton
              label={message.pinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
              active={message.pinned}
              onClick={() => void run(() => chatService().setPinned(message, !message.pinned), message.pinned ? 'Không bỏ ghim được' : 'Không ghim được')}
            >
              {message.pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </IconButton>
          )}
          {can.remove && (
            <IconButton label="Xóa tin nhắn" danger onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Xóa tin nhắn?"
        description="Tin nhắn sẽ bị xóa với mọi người. Hành động này không hoàn tác được."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={async () => {
                setDeleting(true);
                await run(() => chatService().remove(message), 'Không xóa được tin nhắn');
                setDeleting(false);
                setConfirmDelete(false);
              }}
            >
              Xóa
            </Button>
          </>
        }
      >
        <div className="max-h-32 overflow-y-auto rounded-xl border border-white/5 bg-ink-950/60 px-3 py-2 text-sm text-slate-300">
          <b className="text-white">{message.author.displayName}</b>
          <p className="mt-0.5 whitespace-pre-wrap break-words">{stripMentions(message.content) || '(tệp đính kèm)'}</p>
        </div>
      </Modal>
    </div>
  );
});
