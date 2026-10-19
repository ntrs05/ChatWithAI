import type { Channel, Member, Server } from './domain/models';

/** Sự kiện của module Server. */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    /** Danh sách server của người dùng đã tải xong. */
    'server.listLoaded': { serverIds: string[] };
    /** Người dùng hiện tại vừa tạo / tham gia một server. */
    'server.joined': { server: Server };
    /** Người dùng chọn một kênh (text hoặc voice). */
    'channel.selected': { serverId: string; channel: Channel };
    /** (Realtime) Admin vừa tạo kênh mới. */
    'channel.created': { channel: Channel };
    /** (Realtime) Có thành viên mới tham gia server. */
    'member.joined': { member: Member };
  }
}

export {};
