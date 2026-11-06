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
    /** (Realtime) Mình không còn thấy một kênh (bị bỏ khỏi kênh riêng tư). */
    'channel.removed': { channelId: string; serverId: string };
    /** (Realtime) Có thành viên mới tham gia server. */
    'member.joined': { member: Member };
    /** (Realtime) Có thành viên rời / bị xóa khỏi server. */
    'member.left': { serverId: string; userId: string };
    /** Người dùng bấm "Đánh dấu đã đọc" cho cả server (module Chat lưu mốc đã đọc lên server). */
    'server.markedRead': { serverId: string; channelIds: string[] };
    /** (Realtime) Người dùng được thêm vào một server (bởi người khác) → cần tải lại danh sách. */
    'server.added': { serverId: string };
    /** (Realtime) Người dùng không còn ở trong server (bị xóa, bị cấm, hoặc server bị xóa). */
    'server.removed': { serverId: string; reason: string };
  }
}

export {};
