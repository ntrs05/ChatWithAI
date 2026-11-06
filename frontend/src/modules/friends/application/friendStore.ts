import { create } from 'zustand';
import type { Friend, FriendRequest } from '../domain/models';

interface FriendState {
  meId: string | null;
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  loaded: boolean;
}

const initial: FriendState = { meId: null, friends: [], incoming: [], outgoing: [], loaded: false };

export const useFriendStore = create<FriendState>(() => ({ ...initial }));
export const resetFriendStore = () => useFriendStore.setState({ ...initial });

/** Số lời mời kết bạn đang chờ mình trả lời (hiện trên thanh bên). */
export const selectIncomingCount = (s: FriendState) => s.incoming.length;
