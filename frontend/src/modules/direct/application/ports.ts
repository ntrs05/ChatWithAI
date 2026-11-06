import type { DirectChat } from '../domain/models';

export interface DirectRepository {
  list(): Promise<DirectChat[]>;
  /** Mở (hoặc tạo nếu chưa có) cuộc trò chuyện với một người bạn. Server từ chối nếu chưa là bạn bè. */
  open(userId: string): Promise<DirectChat>;
}
