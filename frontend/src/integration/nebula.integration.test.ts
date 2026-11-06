/**
 * Kiểm thử TÍCH HỢP: chạy đúng code hạ tầng HTTP + SignalR của frontend với backend Nebula thật.
 * Mặc định bị bỏ qua (cần backend + MySQL đang chạy). Cách chạy:
 *
 *   VITE_NEBULA_TEST_URL=http://localhost:5000 VITE_API_BASE_URL=http://localhost:5000/api VITE_API_MODE=http npx vitest run src/integration
 *
 * (PowerShell:  $env:VITE_NEBULA_TEST_URL="http://localhost:5000"; $env:VITE_API_BASE_URL="http://localhost:5000/api"; $env:VITE_API_MODE="http"; npx vitest run src/integration)
 */
import { beforeAll, describe, expect, it } from 'vitest';

const BASE = import.meta.env.VITE_NEBULA_TEST_URL;

// tokenStore dùng localStorage (trình duyệt) → giả lập tối thiểu trong Node. Mỗi "người dùng" đổi token trước khi gọi.
const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

// uploadWithProgress dùng XMLHttpRequest (để có tiến độ) → Node không có, giả lập tối thiểu bằng fetch.
class FetchXhr {
  upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  status = 0;
  responseText = '';
  onload: () => void = () => {};
  onerror: () => void = () => {};
  private url = '';
  private headers: Record<string, string> = {};
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send(body: FormData) {
    fetch(this.url, { method: 'POST', headers: this.headers, body }).then(
      async (res) => {
        this.status = res.status;
        this.responseText = await res.text();
        this.onload();
      },
      () => this.onerror(),
    );
  }
}
Object.assign(globalThis, { XMLHttpRequest: FetchXhr });

interface Collected {
  type: string;
  payload: any;
}

describe.skipIf(!BASE)('frontend ⇄ backend Nebula', () => {
  // Import trễ để biến môi trường VITE_* và localStorage đã sẵn sàng.
  let mods: Awaited<ReturnType<typeof load>>;

  async function load() {
    const [auth, server, chat, voice, ai, rt, http, friends, direct, notifs] = await Promise.all([
      import('@/modules/auth/infrastructure/HttpAuthRepository'),
      import('@/modules/server/infrastructure/HttpServerRepository'),
      import('@/modules/chat/infrastructure/HttpChatInfrastructure'),
      import('@/modules/voice/infrastructure/VoicePresenceRepositories'),
      import('@/modules/ai/infrastructure/gateways'),
      import('@/shared/realtime'),
      import('@/shared/http'),
      import('@/modules/friends/infrastructure/HttpFriendRepository'),
      import('@/modules/direct/infrastructure/HttpDirectRepository'),
      import('@/modules/notifications/infrastructure/HttpNotificationRepository'),
    ]);
    server.registerServerWire();
    chat.registerChatWire();
    voice.registerVoiceWire();
    friends.registerFriendsWire();
    notifs.registerNotificationsWire();
    auth.registerAuthWire();
    const { HttpAuthRepository } = auth;
    const { HttpServerRepository, HttpServerSettingsRepository } = server;
    return { HttpAuthRepository, HttpServerRepository, HttpServerSettingsRepository, chat, voice, ai, rt, http, friends, direct, notifs };
  }

  beforeAll(async () => {
    mods = await load();
  });

  const as = (token: string) => mods.http.tokenStore.set(token);
  const wait = async (cond: () => boolean, ms = 4000) => {
    const end = Date.now() + ms;
    while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
  };

  it('đăng ký → nhóm → kênh → tin nhắn → realtime → voice → AI', async () => {
    const tag = Math.random().toString(36).slice(2, 8);
    const auth = new mods.HttpAuthRepository();
    const servers = new mods.HttpServerRepository();
    const msgs = new mods.chat.HttpMessageRepository();
    const voice = new mods.voice.HttpVoicePresenceRepository();

    // ---- đăng ký 2 người ----
    const a = await auth.register({ email: `a${tag}@t.vn`, displayName: 'An Nguyễn', password: '123456', avatarUrl: '/avatars/av-01.svg' });
    const b = await auth.register({ email: `b${tag}@t.vn`, displayName: 'Bình Trần', password: '123456', avatarUrl: '' });
    expect(a.user.username).toBe(`a${tag}`);
    expect(b.user.avatarUrl).toMatch(/^\/avatars\//); // dự phòng khi chưa có ảnh
    as(a.token);
    expect((await auth.me()).email).toBe(`a${tag}@t.vn`);

    // ---- realtime: mỗi người một kết nối SignalR ----
    const hubUrl = `${BASE}/hubs/chat`;
    const eventsA: Collected[] = [];
    const eventsB: Collected[] = [];
    const tA = new mods.rt.SignalRTransport(hubUrl);
    const tB = new mods.rt.SignalRTransport(hubUrl);
    tA.onEvent((e) => eventsA.push({ type: e.type, payload: e.payload }));
    tB.onEvent((e) => eventsB.push({ type: e.type, payload: e.payload }));
    await tA.connect(a.token);
    await tB.connect(b.token);
    const got = (list: Collected[], type: string) => list.filter((e) => e.type === type);

    try {
      // ---- server (nhóm) ----
      as(a.token);
      const server = await servers.create({ name: `Nhóm ${tag}`, description: 'thử nghiệm', iconUrl: '/images/3d/rocket.png', isPublic: true });
      expect(server.isPublic).toBe(true);
      expect(server.inviteCode).toHaveLength(8);
      expect(server.iconUrl).toBe('/images/3d/rocket.png');
      expect((await servers.listMine()).some((s) => s.id === server.id)).toBe(true);

      as(b.token);
      expect((await servers.listPublic()).some((s) => s.id === server.id)).toBe(true);
      await servers.joinByInvite(server.inviteCode.toLowerCase());
      await wait(() => got(eventsA, 'member.joined').length > 0);
      expect(got(eventsA, 'member.joined')[0].payload.member.user.displayName).toBe('Bình Trần');

      // ---- kênh ----
      as(a.token);
      let channels = await servers.listChannels(server.id);
      const general = channels.find((c) => c.type === 'text')!;
      const voiceCh = channels.find((c) => c.type === 'voice')!;
      expect(general.name).toBe('general');
      const created = await servers.createChannel(server.id, { name: 'thao-luan', type: 'text', topic: 'chủ đề' });
      expect(created.topic).toBe('chủ đề');
      await wait(() => got(eventsB, 'channel.created').length > 0);
      expect(got(eventsB, 'channel.created')[0].payload.channel.name).toBe('thao-luan');
      channels = await servers.listChannels(server.id);
      expect(channels.map((c) => c.type)).toEqual(['text', 'text', 'voice']); // kênh mới nằm trong category "Kênh chat"

      const members = await servers.listMembers(server.id);
      expect(members.map((m) => m.role).sort()).toEqual(['admin', 'member']);

      // ---- tin nhắn ----
      as(a.token);
      const sent = await msgs.send(general.id, { content: 'Xin chào cả nhóm, mai họp lúc 9h nhé?', attachmentIds: [], nonce: 'n1' });
      expect(sent.author.displayName).toBe('An Nguyễn');
      expect(sent.serverId).toBe(server.id);
      await wait(() => got(eventsB, 'chat.message.created').length > 0);
      const pushed = got(eventsB, 'chat.message.created')[0].payload.message;
      expect(pushed.id).toBe(sent.id);
      expect(pushed.author.displayName).toBe('An Nguyễn');
      expect(new Date(pushed.createdAt).getTime()).toBeGreaterThan(Date.now() - 60_000); // có "Z" nên không lệch múi giờ

      as(b.token);
      for (let i = 0; i < 4; i++) await msgs.send(general.id, { content: `tin số ${i}`, attachmentIds: [], nonce: `n${i}` });
      const page1 = await msgs.list(general.id, { limit: 3 });
      expect(page1.messages).toHaveLength(3);
      expect(page1.hasMore).toBe(true);
      expect(page1.messages[2].content).toBe('tin số 3'); // cũ → mới
      const page2 = await msgs.list(general.id, { before: page1.messages[0].id, limit: 10 });
      expect(page2.hasMore).toBe(false);
      expect(page2.messages.map((m) => m.content)).toContain('Xin chào cả nhóm, mai họp lúc 9h nhé?');
      expect((await msgs.search(general.id, 'họp')).length).toBeGreaterThan(0);

      // ---- đang gõ ----
      tB.publish({ topic: '', type: 'chat.typing', payload: { channelId: general.id } });
      await wait(() => got(eventsA, 'chat.typing').length > 0);
      expect(got(eventsA, 'chat.typing')[0].payload).toMatchObject({ channelId: general.id, displayName: 'Bình Trần' });

      // ---- upload + tải về ----
      as(a.token);
      const files = new mods.chat.HttpFileStorage();
      const att = await files.upload(new File([new Uint8Array([137, 80, 78, 71])], 'a.png', { type: 'image/png' }), () => {});
      expect(att.kind).toBe('image');
      const withFile = await msgs.send(general.id, { content: '', attachmentIds: [att.id], nonce: 'nf' });
      expect(withFile.attachments[0]).toMatchObject({ id: att.id, name: 'a.png', kind: 'image' });

      // ---- voice ----
      as(a.token);
      const pa = await voice.join(voiceCh.id, { clientId: `ca_${tag}`, muted: false, deafened: false });
      expect(pa.user.displayName).toBe('An Nguyễn');
      await wait(() => got(eventsB, 'voice.participant.joined').length > 0);
      as(b.token);
      await voice.join(voiceCh.id, { clientId: `cb_${tag}`, muted: true, deafened: false });
      expect((await voice.listByServer(server.id)).length).toBe(2);
      await voice.update(voiceCh.id, `cb_${tag}`, { muted: false, deafened: false });
      await wait(() => got(eventsA, 'voice.participant.updated').length > 0);
      // tín hiệu WebRTC: B → A (có `to`)
      tB.publish({
        topic: '',
        type: 'voice.signal',
        payload: { channelId: voiceCh.id, from: `cb_${tag}`, to: `ca_${tag}`, data: { kind: 'offer', sdp: { type: 'offer', sdp: 'v=0' } } },
      });
      await wait(() => got(eventsA, 'voice.signal').length > 0);
      expect(got(eventsA, 'voice.signal')[0].payload).toMatchObject({ from: `cb_${tag}`, data: { kind: 'offer' } });
      await voice.leave(voiceCh.id, `cb_${tag}`);
      await wait(() => got(eventsA, 'voice.participant.left').length > 0);

      // ---- AI ----
      as(a.token);
      const summary = await new mods.ai.HttpAiGateway().summarize({ channelId: general.id, scope: { mode: 'count', limit: 50 } });   // cần GEMINI_API_KEY ở backend
      expect(summary.messageCount).toBeGreaterThan(3);
      expect(summary.overview.length).toBeGreaterThan(0);

      // ---- bị xóa khỏi nhóm → B được báo ----
      await mods.http.http(`/servers/${server.id}/members/${b.user.id}`, { method: 'DELETE' });
      await wait(() => got(eventsB, 'server.removed').length > 0);
      expect(got(eventsB, 'server.removed')[0].payload).toMatchObject({ serverId: server.id, reason: 'Kicked' });
      await wait(() => got(eventsA, 'member.left').length > 0);
    } finally {
      tA.disconnect();
      tB.disconnect();
    }
  }, 60_000);

  it('bạn bè → mời vào server → lời mời → cài đặt thông báo → đánh dấu đã đọc → rời server', async () => {
    const tag = Math.random().toString(36).slice(2, 8);
    const auth = new mods.HttpAuthRepository();
    const servers = new mods.HttpServerRepository();
    const settings = new mods.HttpServerSettingsRepository();
    const friends = new mods.friends.HttpFriendRepository();
    const msgs = new mods.chat.HttpMessageRepository();

    const a = await auth.register({ email: `fa${tag}@t.vn`, displayName: `Lan ${tag}`, password: '123456', avatarUrl: '' });
    const b = await auth.register({ email: `fb${tag}@t.vn`, displayName: `Minh ${tag}`, password: '123456', avatarUrl: '' });

    const hubUrl = `${BASE}/hubs/chat`;
    const eventsA: Collected[] = [];
    const eventsB: Collected[] = [];
    const tA = new mods.rt.SignalRTransport(hubUrl);
    const tB = new mods.rt.SignalRTransport(hubUrl);
    tA.onEvent((e) => eventsA.push({ type: e.type, payload: e.payload }));
    tB.onEvent((e) => eventsB.push({ type: e.type, payload: e.payload }));
    await tA.connect(a.token);
    await tB.connect(b.token);
    const got = (list: Collected[], type: string) => list.filter((e) => e.type === type);

    try {
      // ---- kết bạn ----
      as(a.token);
      // Phải biết cả TÊN lẫn ID: sai một trong hai đều bị từ chối bằng cùng một lỗi
      expect(b.user.userCode).toMatch(/^\d{4}$/); // 0000–9999
      await expect(friends.sendRequestByTag(`Minh ${tag}`, String((Number(b.user.userCode) + 1) % 10_000).padStart(4, '0'))).rejects.toThrow(/khớp cả tên và ID/);
      await expect(friends.sendRequestByTag('Người lạ', b.user.userCode)).rejects.toThrow(/khớp cả tên và ID/);
      const sent = await friends.sendRequestByTag(`  minh ${tag}  `, `#${Number(b.user.userCode)}`); // gõ '#42' thay vì '0042' vẫn nhận
      expect(sent.autoAccepted).toBe(false);
      await wait(() => got(eventsB, 'friend.request.received').length > 0);
      expect(got(eventsB, 'friend.request.received')[0].payload.request.user.displayName).toBe(`Lan ${tag}`);
      await wait(() => got(eventsA, 'friend.request.sent').length > 0);
      expect((await friends.listRequests()).outgoing).toHaveLength(1);
      await expect(friends.sendRequestByTag(`Minh ${tag}`, b.user.userCode)).rejects.toThrow(/đã gửi/i); // lỗi đọc từ ProblemDetails.detail

      as(b.token);
      const incoming = (await friends.listRequests()).incoming;
      expect(incoming).toHaveLength(1);
      await friends.accept(incoming[0].id);
      await wait(() => got(eventsA, 'friend.added').length > 0 && got(eventsB, 'friend.added').length > 0);
      expect(got(eventsA, 'friend.added')[0].payload.friend.user.id).toBe(b.user.id);
      expect((await friends.listFriends()).map((f) => f.user.id)).toEqual([a.user.id]);
      await wait(() => got(eventsB, 'notification.received').length > 0);

      // ---- mời bạn vào server ----
      as(a.token);
      const server = await servers.create({ name: `Nhóm bạn ${tag}`, description: '', iconUrl: '', isPublic: false });
      const general = (await servers.listChannels(server.id)).find((c) => c.type === 'text')!;
      await servers.invite(server.id, b.user.id);
      await wait(() => got(eventsB, 'notification.received').some((e) => e.payload.notification.refType === 'JoinRequest'));
      as(b.token);
      const invitations = await servers.listInvitations();
      expect(invitations).toHaveLength(1);
      expect(invitations[0]).toMatchObject({ serverId: server.id, serverName: `Nhóm bạn ${tag}` });
      expect(invitations[0].invitedBy.displayName).toBe(`Lan ${tag}`);
      await servers.respondInvitation(invitations[0].id, true);
      expect(await servers.listInvitations()).toHaveLength(0);
      expect((await servers.listMine()).some((s) => s.id === server.id)).toBe(true);
      await wait(() => got(eventsA, 'member.joined').length > 0);

      // ---- cài đặt thông báo / tắt âm theo server ----
      expect(await settings.list()).toEqual({});
      const until = new Date(Date.now() + 3_600_000).toISOString();
      await settings.save(server.id, { level: 'mentions', mutedUntil: until });
      const saved = (await settings.list())[server.id];
      expect(saved.level).toBe('mentions');
      expect(new Date(saved.mutedUntil!).getTime()).toBeCloseTo(new Date(until).getTime(), -3);
      await settings.reset(server.id);
      expect(await settings.list()).toEqual({});

      // ---- đánh dấu đã đọc ----
      await msgs.markRead(general.id);

      // ---- rời server: chủ server bị chặn, thành viên rời được ----
      await mods.http.http(`/servers/${server.id}/leave`, { method: 'POST' });
      await wait(() => got(eventsA, 'member.left').length > 0);
      expect(got(eventsA, 'member.left')[0].payload).toMatchObject({ serverId: server.id, userId: b.user.id });
      expect((await servers.listMine()).some((s) => s.id === server.id)).toBe(false);
      as(a.token);
      await expect(servers.leave(server.id)).rejects.toThrow(/chủ server/i);

      // ---- hủy kết bạn ----
      await friends.remove(b.user.id);
      await wait(() => got(eventsB, 'friend.removed').length > 0);
      expect(got(eventsB, 'friend.removed')[0].payload.userId).toBe(a.user.id);
      expect(await friends.listFriends()).toHaveLength(0);
    } finally {
      tA.disconnect();
      tB.disconnect();
    }
  }, 60_000);

  it('chat 1-1 chỉ giữa bạn bè + trang Cài đặt (tên, ID, mật khẩu, avatar)', async () => {
    const tag = Math.random().toString(36).slice(2, 8);
    const auth = new mods.HttpAuthRepository();
    const friends = new mods.friends.HttpFriendRepository();
    const direct = new mods.direct.HttpDirectRepository();
    const msgs = new mods.chat.HttpMessageRepository();

    const a = await auth.register({ email: `da${tag}@t.vn`, displayName: `Hà ${tag}`, password: '123456', avatarUrl: '' });
    const b = await auth.register({ email: `db${tag}@t.vn`, displayName: `Khôi ${tag}`, password: '123456', avatarUrl: '' });

    const hubUrl = `${BASE}/hubs/chat`;
    const eventsB: Collected[] = [];
    const tA = new mods.rt.SignalRTransport(hubUrl);
    const tB = new mods.rt.SignalRTransport(hubUrl);
    tB.onEvent((e) => eventsB.push({ type: e.type, payload: e.payload }));
    await tA.connect(a.token);
    await tB.connect(b.token);
    const got = (type: string) => eventsB.filter((e) => e.type === type);

    try {
      // ---- chưa là bạn → không nhắn riêng được ----
      as(a.token);
      await expect(direct.open(b.user.id)).rejects.toThrow(/bạn bè/);

      // ---- kết bạn rồi mở chat ----
      await friends.sendRequestByTag(`Khôi ${tag}`, b.user.userCode);
      as(b.token);
      await friends.accept((await friends.listRequests()).incoming[0].id);
      as(a.token);
      const chat = await direct.open(b.user.id);
      expect(chat).toMatchObject({ isFriend: true, user: { id: b.user.id, displayName: `Khôi ${tag}` } });
      expect((await direct.open(b.user.id)).id).toBe(chat.id); // mở lại vẫn cùng một cuộc trò chuyện

      const sent = await msgs.send(chat.id, { content: 'Chào Khôi, mình là Hà', attachmentIds: [], nonce: 'x' });
      expect(sent.serverId).toBe(''); // tin 1-1 không thuộc server nào
      await wait(() => got('chat.message.created').length > 0);
      expect(got('chat.message.created')[0].payload.message).toMatchObject({ channelId: chat.id, serverId: '' });

      as(b.token);
      const list = await direct.list();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ id: chat.id, hasUnread: true, user: { displayName: `Hà ${tag}` } });
      const history = await msgs.list(chat.id, { limit: 30 });
      expect(history.messages.map((m) => m.content)).toEqual(['Chào Khôi, mình là Hà']);
      await msgs.markRead(chat.id);
      expect((await direct.list())[0].hasUnread).toBe(false);

      // ---- hủy kết bạn: đọc được, không nhắn thêm được ----
      await friends.remove(a.user.id);
      await expect(msgs.send(chat.id, { content: 'còn đó không', attachmentIds: [], nonce: 'y' })).rejects.toThrow(/không còn là bạn bè/);
      expect((await direct.list())[0].isFriend).toBe(false);
      expect((await msgs.list(chat.id, { limit: 30 })).messages).toHaveLength(1);

      // ---- Cài đặt: hồ sơ, ID, mật khẩu, avatar ----
      as(a.token);
      expect((await auth.me()).userCode).toBe(a.user.userCode);
      const updated = await auth.updateProfile({ displayName: `Hà Mới ${tag}`, avatarUrl: '/avatars/av-05.svg', bio: 'xin chào' });
      expect(updated).toMatchObject({ displayName: `Hà Mới ${tag}`, avatarUrl: '/avatars/av-05.svg', bio: 'xin chào', userCode: a.user.userCode });

      await expect(auth.changePassword({ currentPassword: 'sai-rồi', newPassword: 'matkhaumoi1' })).rejects.toThrow(/không đúng/);
      await expect(auth.changePassword({ currentPassword: '123456', newPassword: '123456' })).rejects.toThrow(/khác/);
      await auth.changePassword({ currentPassword: '123456', newPassword: 'matkhaumoi1' });
      await expect(auth.login({ email: `da${tag}@t.vn`, password: '123456' })).rejects.toThrow(/không đúng/);
      expect((await auth.login({ email: `da${tag}@t.vn`, password: 'matkhaumoi1' })).user.displayName).toBe(`Hà Mới ${tag}`);

      // PNG 1x1 thật → upload avatar → ai cũng xem được (không cần token)
      const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
      const url = await auth.uploadAvatar(new File([png], 'me.png', { type: 'image/png' }));
      expect(url).toMatch(/^\/api\/avatars\/[0-9a-f-]{36}$/);
      const anonymous = await fetch(`${BASE}${url}`); // KHÔNG gửi token
      expect(anonymous.status).toBe(200);
      expect(anonymous.headers.get('content-type')).toBe('image/png');
      expect((await anonymous.arrayBuffer()).byteLength).toBe(png.length);
      // file giả danh ảnh (đuôi .png nhưng nội dung là chữ) bị từ chối
      await expect(auth.uploadAvatar(new File(['<script>alert(1)</script>'], 'x.png', { type: 'image/png' }))).rejects.toThrow(/không phải ảnh/i);
      // file chat riêng tư KHÔNG xem được qua đường avatar công khai
      const priv = await new mods.chat.HttpFileStorage().upload(new File([png], 'private.png', { type: 'image/png' }), () => {});
      expect((await fetch(`${BASE}/api/avatars/${priv.id}`)).status).toBe(404);
      expect((await fetch(`${BASE}/api/files/${priv.id}`)).status).toBe(401);

      // người dùng thường không dò được danh sách người dùng
      await expect(mods.http.http('/users/search', { query: { q: 'Khôi' } })).rejects.toThrow();
    } finally {
      tA.disconnect();
      tB.disconnect();
    }
  }, 60_000);

  it('sửa · xóa · ghim · cảm xúc · thông báo · đổi hồ sơ realtime', async () => {
    const tag = Math.random().toString(36).slice(2, 8);
    const auth = new mods.HttpAuthRepository();
    const servers = new mods.HttpServerRepository();
    const msgs = new mods.chat.HttpMessageRepository();
    const notifs = new mods.notifs.HttpNotificationRepository();

    const a = await auth.register({ email: `ma${tag}@t.vn`, displayName: `Lam ${tag}`, password: '123456', avatarUrl: '' });
    const b = await auth.register({ email: `mb${tag}@t.vn`, displayName: `Mai ${tag}`, password: '123456', avatarUrl: '' });

    const hubUrl = `${BASE}/hubs/chat`;
    const eventsA: Collected[] = [];
    const eventsB: Collected[] = [];
    const tB = new mods.rt.SignalRTransport(hubUrl);
    const tA = new mods.rt.SignalRTransport(hubUrl);
    tA.onEvent((e) => eventsA.push({ type: e.type, payload: e.payload }));
    tB.onEvent((e) => eventsB.push({ type: e.type, payload: e.payload }));
    await tB.connect(b.token); // B vào trước để thấy A online
    await tA.connect(a.token);
    const got = (list: Collected[], type: string) => list.filter((e) => e.type === type);
    const lastChanged = (list: Collected[]) => {
      const all = got(list, 'chat.message.changed');
      return all[all.length - 1]?.payload.message;
    };

    try {
      // ---- trạng thái online realtime ----
      await wait(() => got(eventsB, 'user.statusChanged').some((e) => e.payload.userId === a.user.id && e.payload.status === 'Online'));
      expect(got(eventsB, 'user.statusChanged').some((e) => e.payload.userId === a.user.id && e.payload.status === 'Online')).toBe(true);

      // ---- nhóm công khai, B vào ----
      as(a.token);
      const server = await servers.create({ name: `Nhóm TN ${tag}`, description: '', iconUrl: '', isPublic: true });
      as(b.token);
      await servers.join(server.id);
      as(a.token);
      const general = (await servers.listChannels(server.id)).find((c) => c.type === 'text')!;

      // ---- nhắc tên → thông báo realtime có người gây ra ----
      const sent = await msgs.send(general.id, { content: `Chào <@${b.user.id}> nhé`, attachmentIds: [], nonce: 'm1' });
      await wait(() => got(eventsB, 'notification.received').length > 0);
      const notif = got(eventsB, 'notification.received')[0].payload.notification;
      expect(notif).toMatchObject({ type: 'Mention', refType: 'Conversation', refId: general.id, isRead: false });
      expect(notif.actor).toMatchObject({ id: a.user.id, displayName: `Lam ${tag}` });

      as(b.token);
      expect(await notifs.unreadCount()).toBe(1);
      const list = await notifs.list({ skip: 0, take: 30 });
      expect(list[0]).toMatchObject({ id: notif.id, actor: { displayName: `Lam ${tag}` } });
      await notifs.markRead(notif.id);
      expect(await notifs.unreadCount()).toBe(0);
      await msgs.send(general.id, { content: `Mai ơi <@${a.user.id}>`, attachmentIds: [], nonce: 'm2' });
      as(a.token);
      // thông báo được tạo bất đồng bộ bởi event → chờ tới khi xuất hiện
      for (let i = 0; i < 40 && (await notifs.unreadCount()) === 0; i++) await new Promise((r) => setTimeout(r, 100));
      expect(await notifs.unreadCount()).toBeGreaterThan(0);
      await notifs.markAllRead();
      expect(await notifs.unreadCount()).toBe(0);

      // ---- sửa ----
      await msgs.edit(sent.id, 'Chào cả nhóm (đã sửa)');
      await wait(() => got(eventsB, 'chat.message.changed').length > 0);
      expect(lastChanged(eventsB)).toMatchObject({ id: sent.id, content: 'Chào cả nhóm (đã sửa)', deleted: false });
      expect(lastChanged(eventsB).editedAt).toBeTruthy();
      as(b.token);
      await expect(msgs.edit(sent.id, 'sửa của người khác')).rejects.toThrow(/người gửi/); // chỉ chủ tin mới sửa được

      // ---- cảm xúc: B thả 👍, A thấy; B bấm lại thì gỡ ----
      const before = got(eventsA, 'chat.message.changed').length;
      await msgs.react(sent.id, '👍');
      await wait(() => got(eventsA, 'chat.message.changed').length > before);
      expect(lastChanged(eventsA).reactions).toEqual([{ emoji: '👍', count: 1, userIds: [b.user.id] }]);
      const before2 = got(eventsA, 'chat.message.changed').length;
      await msgs.react(sent.id, '👍');
      await wait(() => got(eventsA, 'chat.message.changed').length > before2);
      expect(lastChanged(eventsA).reactions).toEqual([]);

      // ---- ghim: thành viên thường không ghim được, chủ server ghim được ----
      await expect(msgs.setPinned(sent.id, true)).rejects.toThrow(/chủ server\/quản trị viên/);
      as(a.token);
      await msgs.setPinned(sent.id, true);
      await wait(() => got(eventsB, 'chat.message.changed').some((e) => e.payload.message.pinned));
      as(b.token);
      expect((await msgs.listPins(general.id)).map((m) => m.id)).toEqual([sent.id]);
      expect((await msgs.list(general.id, { limit: 30 })).messages.find((m) => m.id === sent.id)!.pinned).toBe(true);
      as(a.token);
      await msgs.setPinned(sent.id, false);
      expect(await msgs.listPins(general.id)).toEqual([]);

      // ---- xóa: chủ tin xóa tin mình; chủ server xóa được tin người khác; thành viên không xóa tin người khác ----
      as(b.token);
      const bMsg = await msgs.send(general.id, { content: 'tin của Mai', attachmentIds: [], nonce: 'm3' });
      await expect(msgs.remove(sent.id)).rejects.toThrow(/quyền/);
      as(a.token);
      await msgs.remove(bMsg.id); // chủ server kiểm duyệt
      await wait(() => got(eventsB, 'chat.message.changed').some((e) => e.payload.message.id === bMsg.id && e.payload.message.deleted));
      const deleted = got(eventsB, 'chat.message.changed').find((e) => e.payload.message.id === bMsg.id && e.payload.message.deleted)!.payload.message;
      expect(deleted).toMatchObject({ content: '', attachments: [], deleted: true });
      await msgs.remove(sent.id); // chủ tin xóa tin mình
      await expect(msgs.edit(sent.id, 'sửa tin đã xóa')).rejects.toThrow(/đã bị xóa/);

      // ---- đổi tên / ảnh → người khác thấy ngay, không cần tải lại ----
      await auth.updateProfile({ displayName: `Lam Mới ${tag}`, avatarUrl: '/avatars/av-07.svg', bio: '' });
      await wait(() => got(eventsB, 'user.profileChanged').some((e) => e.payload.user.id === a.user.id));
      expect(got(eventsB, 'user.profileChanged').find((e) => e.payload.user.id === a.user.id)!.payload.user).toMatchObject({
        displayName: `Lam Mới ${tag}`,
        avatarUrl: '/avatars/av-07.svg',
      });
      // và tin nhắn mới của A mang ngay tên mới (cache hồ sơ 15 giây đã được xóa)
      const after = await msgs.send(general.id, { content: 'tên mới nè', attachmentIds: [], nonce: 'm4' });
      expect(after.author.displayName).toBe(`Lam Mới ${tag}`);
    } finally {
      tA.disconnect();
      tB.disconnect();
    }
  }, 60_000);

  it('ID 0–9999: người trùng tên vẫn có ID khác nhau, kết bạn đúng người nhờ tên + ID', async () => {
    const tag = Math.random().toString(36).slice(2, 8);
    const auth = new mods.HttpAuthRepository();
    const friends = new mods.friends.HttpFriendRepository();

    const shared = `Trùng Tên ${tag}`;
    const x = await auth.register({ email: `x1${tag}@t.vn`, displayName: shared, password: '123456', avatarUrl: '' });
    const y = await auth.register({ email: `x2${tag}@t.vn`, displayName: shared.toUpperCase(), password: '123456', avatarUrl: '' }); // khác hoa/thường vẫn là "cùng tên"
    const z = await auth.register({ email: `x3${tag}@t.vn`, displayName: `Người Thứ Ba ${tag}`, password: '123456', avatarUrl: '' });
    for (const u of [x, y, z]) expect(u.user.userCode).toMatch(/^\d{4}$/);
    expect(x.user.userCode).not.toBe(y.user.userCode); // cùng tên → bắt buộc khác ID

    // z kết bạn với đúng x (không nhầm sang y) nhờ tên + ID
    as(z.token);
    await friends.sendRequestByTag(shared, x.user.userCode);
    as(x.token);
    expect((await friends.listRequests()).incoming.map((r) => r.user.id)).toEqual([z.user.id]);
    as(y.token);
    expect((await friends.listRequests()).incoming).toHaveLength(0);

    // ID đúng của x nhưng tên của người khác → không khớp
    as(z.token);
    await expect(friends.sendRequestByTag(`Người Thứ Ba ${tag}`, x.user.userCode)).rejects.toThrow(/khớp cả tên và ID/);

    // đổi tên: ID được giữ nếu tên mới chưa ai dùng ID đó; /users/me luôn trả ID hợp lệ
    as(x.token);
    const renamed = await auth.updateProfile({ displayName: `Tên Mới ${tag}`, avatarUrl: '/avatars/av-03.svg', bio: '' });
    expect(renamed.userCode).toBe(x.user.userCode);
    expect((await auth.me()).userCode).toMatch(/^\d{4}$/);
    // tìm lại được bằng tên mới + ID cũ
    as(y.token);
    await friends.sendRequestByTag(`Tên Mới ${tag}`, x.user.userCode);
  }, 60_000);
});
