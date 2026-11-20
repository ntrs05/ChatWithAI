import type { Friend, FriendRequest } from '../domain/models';

export interface FriendRepository {
  listFriends(): Promise<Friend[]>;
  listRequests(): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>;
  /**
   * Gửi lời mời bằng TÊN hiển thị + ID (0–9999) của người kia (phải đúng cả hai, không có "tìm kiếm" để dò người dùng).
   * autoAccepted = người kia đã mời mình trước nên hai bên thành bạn luôn.
   */
  sendRequestByTag(displayName: string, userCode: string): Promise<{ id: string; autoAccepted: boolean; displayName: string }>;
  accept(requestId: string): Promise<void>;
  /** Người nhận từ chối hoặc người gửi hủy một lời mời đang chờ. */
  declineOrCancel(requestId: string): Promise<void>;
  /** Hủy kết bạn. */
  remove(userId: string): Promise<void>;
}
