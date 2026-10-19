import { memo } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { cn, formatDateTime, formatTime } from '@/shared/lib';
import { Avatar } from '@/shared/ui';
import type { Message } from '../domain/models';
import { chatService } from '../module';
import { AttachmentView } from './AttachmentView';
import { MessageContent } from './MessageContent';

interface Props {
  message: Message;
  showHeader: boolean;
  isMine: boolean;
}

export const MessageItem = memo(function MessageItem({ message, showHeader, isMine }: Props) {
  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        'group relative flex gap-3 px-4 py-0.5 transition-colors hover:bg-white/[0.025]',
        showHeader && 'mt-3.5',
        message.status === 'sending' && 'opacity-60',
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
          </div>
        )}
        {message.content && (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-200">
            <MessageContent text={message.content} />
          </div>
        )}
        {message.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-start gap-2">
            {message.attachments.map((a) => (
              <AttachmentView key={a.id} attachment={a} />
            ))}
          </div>
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
    </div>
  );
});
