import { targetOf, type AppNotification } from '@/modules/notifications';

/** Những gì cần biết để đổi một thông báo thành đường dẫn. */
export interface NavigationContext {
  /** Id các cuộc trò chuyện 1-1 đã biết. */
  directIds: ReadonlySet<string>;
  /** Kênh này thuộc server nào (null nếu chưa biết — danh sách kênh của server đó chưa được tải). */
  serverOfChannel: (channelId: string) => string | null;
}

/**
 * Đường dẫn để mở khi bấm vào một thông báo. Trả về null khi chưa đủ thông tin để biết kênh thuộc server nào
 * (người gọi nên tải kênh của các server rồi thử lại).
 */
export function pathForNotification(n: AppNotification, ctx: NavigationContext): string | null {
  const t = targetOf(n);
  switch (t.kind) {
    case 'conversation': {
      if (ctx.directIds.has(t.id)) return `/app/dm/${t.id}`;
      const server = ctx.serverOfChannel(t.id);
      return server ? `/app/${server}/${t.id}` : null;
    }
    case 'server':
      return `/app/${t.id}`;
    case 'invitations':
      return '/app'; // lời mời vào server hiện ở Trang chủ
    case 'friends':
      return '/app/friends';
    default:
      return '/app/notifications';
  }
}
