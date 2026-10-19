/**
 * Shared Kernel — những kiểu dữ liệu tối thiểu mà mọi module đều cần biết.
 * Không chứa logic nghiệp vụ.
 */
export type ID = string;

export interface UserProfile {
  id: ID;
  displayName: string;
  username: string;
  avatarUrl: string;
}
