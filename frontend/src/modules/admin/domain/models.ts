export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
  isLocked: boolean;
  lockedReason: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface Quota {
  usedBytes: number;
  limitBytes: number;
}

export interface AdminServer {
  id: string;
  name: string;
  memberCount: number;
  ownerId: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
}
