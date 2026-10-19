import { useEffect, useState, type DragEvent, type ReactNode } from 'react';
import { Hash, Menu, Upload, Users } from 'lucide-react';
import { config } from '@/shared/config';
import { toast } from '@/shared/event-bus';
import { formatBytes } from '@/shared/lib';
import { IconButton } from '@/shared/ui';
import type { PendingFile } from '../domain/models';
import { MAX_FILES_PER_MESSAGE } from '../domain/rules';
import { Composer, toPendingFiles } from './Composer';
import { MessageList } from './MessageList';
import { SearchBox } from './SearchBox';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  channel: { id: string; serverId: string; name: string; topic: string };
  /** Slot cho module khác gắn nút vào thanh tiêu đề (vd: nút Tóm tắt AI) */
  headerActions?: ReactNode;
  membersOpen: boolean;
  onToggleMembers: () => void;
  onOpenSidebar?: () => void;
}

export function ChatView({ channel, headerActions, membersOpen, onToggleMembers, onOpenSidebar }: Props) {
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
        <Hash size={22} className="shrink-0 text-muted" />
        <h1 className="truncate font-semibold text-white">{channel.name}</h1>
        {channel.topic && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-white/10 lg:block" />
            <p className="hidden truncate text-sm text-muted lg:block">{channel.topic}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {headerActions}
          <IconButton label={membersOpen ? 'Ẩn thành viên' : 'Hiện thành viên'} active={membersOpen} onClick={onToggleMembers} className="hidden xl:inline-flex">
            <Users size={19} />
          </IconButton>
          <div className="hidden sm:block">
            <SearchBox channelId={channel.id} />
          </div>
        </div>
      </header>

      <MessageList channelId={channel.id} channelName={channel.name} />
      <TypingIndicator channelId={channel.id} />
      <Composer
        channelId={channel.id}
        serverId={channel.serverId}
        channelName={channel.name}
        files={files}
        onFilesChange={setFiles}
        onAddFiles={addFiles}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-brand-400 bg-ink-950/85">
          <Upload size={42} className="text-brand-300" />
          <p className="mt-3 font-display text-xl font-bold text-white">Thả tệp để tải lên</p>
          <p className="text-sm text-muted">vào #{channel.name} · tối đa {formatBytes(config.maxUploadBytes)} mỗi tệp</p>
        </div>
      )}
    </section>
  );
}

