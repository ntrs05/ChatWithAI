import { useEffect, useState, type DragEvent, type ReactNode } from 'react';
import { Hash, Menu, TriangleAlert, Upload, Users } from 'lucide-react';
import { config } from '@/shared/config';
import { toast } from '@/shared/event-bus';
import { formatBytes } from '@/shared/lib';
import { Avatar, IconButton } from '@/shared/ui';
import type { PendingFile } from '../domain/models';
import { MAX_FILES_PER_MESSAGE, type MessagePermissions } from '../domain/rules';
import { Composer, toPendingFiles } from './Composer';
import { MessageList } from './MessageList';
import { PinnedButton } from './PinnedPanel';
import { SearchBox } from './SearchBox';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  channel: { id: string; serverId: string; name: string; topic: string };
  /** Slot cho module khác gắn nút vào thanh tiêu đề (vd: nút Tóm tắt AI) */
  headerActions?: ReactNode;
  /** Bắt lệnh gõ trong ô chat (vd: @nebula). Trả true = đã xử lý. */
  membersOpen: boolean;
  onToggleMembers: () => void;
  onOpenSidebar?: () => void;
  /** 'direct' = chat 1-1: tiêu đề hiện ảnh + tên người kia, không có nút thành viên. */
  variant?: 'channel' | 'direct';
  /** Ảnh đại diện của người kia (chat 1-1). */
  peerAvatarUrl?: string;
  /** Quyền ghim / xóa tin người khác. Mặc định không có (tin của chính mình thì luôn sửa/xóa được). */
  permissions?: MessagePermissions;
  /** Có giá trị → không cho nhắn tin và hiện lý do thay cho ô soạn tin (vd: đã hủy kết bạn). */
  disabledReason?: string;
}

export function ChatView({ channel, headerActions, membersOpen, onToggleMembers, onOpenSidebar, variant = 'channel', peerAvatarUrl, disabledReason, permissions }: Props) {
  const direct = variant === 'direct';
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setFiles((old) => {
      old.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      return [];
    });
  }, [channel.id]);

  const addFiles = (incoming: File[]) => {
    const tooBig = incoming.filter((f) => f.size > config.maxUploadBytes);
    tooBig.forEach((f) => toast.error(`"${f.name}" vượt quá ${formatBytes(config.maxUploadBytes)}`));
    const ok = incoming.filter((f) => f.size <= config.maxUploadBytes);
    setFiles((cur) => {
      const room = MAX_FILES_PER_MESSAGE - cur.length;
      if (ok.length > room) toast.info(`Mỗi tin nhắn tối đa ${MAX_FILES_PER_MESSAGE} tệp`);
      return [...cur, ...toPendingFiles(ok.slice(0, Math.max(0, room)))];
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <section
      className="relative flex min-w-0 flex-1 flex-col bg-ink-800"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/20 px-3 shadow-sm">
        {onOpenSidebar && (
          <IconButton label="Mở danh sách kênh" onClick={onOpenSidebar} className="md:hidden">
            <Menu size={20} />
          </IconButton>
        )}
        {direct ? (
          <Avatar src={peerAvatarUrl} name={channel.name} size={28} />
        ) : (
          <Hash size={22} className="shrink-0 text-muted" />
        )}
        <h1 className="truncate font-semibold text-white">{channel.name}</h1>
        {channel.topic && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-white/10 lg:block" />
            <p className="hidden truncate text-sm text-muted lg:block">{channel.topic}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {headerActions}
          <PinnedButton channelId={channel.id} canUnpin={permissions?.canPin ?? false} />
          {!direct && (
            <IconButton label={membersOpen ? 'Ẩn thành viên' : 'Hiện thành viên'} active={membersOpen} onClick={onToggleMembers} className="hidden xl:inline-flex">
              <Users size={19} />
            </IconButton>
          )}
          <div className="hidden sm:block">
            <SearchBox channelId={channel.id} />
          </div>
        </div>
      </header>

      <MessageList channelId={channel.id} channelName={channel.name} direct={direct} permissions={permissions} />
      <TypingIndicator channelId={channel.id} />
      {disabledReason ? (
        <div role="status" className="mx-4 mb-4 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-300" />
          {disabledReason}
        </div>
      ) : (
        <Composer
          channelId={channel.id}
          serverId={channel.serverId}
          channelName={channel.name}
          direct={direct}
          files={files}
          onFilesChange={setFiles}
          onAddFiles={addFiles}
        />
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-brand-400 bg-ink-950/85">
          <Upload size={42} className="text-brand-300" />
          <p className="mt-3 font-display text-xl font-bold text-white">Thả tệp để tải lên</p>
          <p className="text-sm text-muted">vào {direct ? '' : '#'}{channel.name} · tối đa {formatBytes(config.maxUploadBytes)} mỗi tệp</p>
        </div>
      )}
    </section>
  );
}

