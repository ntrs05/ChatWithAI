/** Sự kiện của module Direct (chat 1-1). */
declare module '@/shared/event-bus/events' {
  interface AppEvents {
    /** Người dùng đang xem / vừa đọc một cuộc trò chuyện 1-1 — module Chat tải lịch sử và lưu mốc đã đọc lên server. */
    'direct.read': { conversationId: string };
  }
}

export {};
