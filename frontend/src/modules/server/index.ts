/**
 * PUBLIC API của module Server
 * (UC02 — Tạo / Tham gia Server, UC03 — Tạo Kênh Text / Voice).
 */
import './events';

export { initServerModule, serverService } from './module';
export {
  useServerStore,
  selectActiveServer,
  selectActiveChannel,
  selectMyRole,
} from './application/serverStore';
export type { Server, Channel, ChannelType, Member, Role } from './domain/models';
export { permissions } from './domain/rules';
export { ServerRail } from './presentation/ServerRail';
export { ChannelSidebar } from './presentation/ChannelSidebar';
export { MemberList } from './presentation/MemberList';
export { DiscoverPage } from './presentation/DiscoverPage';
export { HomeView } from './presentation/HomeView';
