import { avatars, serverIcons } from '@/shared/assets';
import { uid } from '@/shared/lib';
import { isSeeded, markSeeded, sha256, writeTable } from './db';
import type { ChannelRow, MemberRow, MessageRow, ServerRow, UserRow } from './schema';


const icon = (name: string) => serverIcons.find((p) => p.includes(`/${name}.png`))!;

export async function ensureSeeded(): Promise<void> {
  if (isSeeded()) return;
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  const people = [
    { key: 'minhanh', email: 'admin@nebula.vn', displayName: 'Minh Anh', avatar: avatars[0] },
    { key: 'quocbao', email: 'user@nebula.vn', displayName: 'Quốc Bảo', avatar: avatars[1] },
    { key: 'thuha', email: 'thuha@nebula.vn', displayName: 'Thu Hà', avatar: avatars[2] },
    { key: 'giahuy', email: 'giahuy@nebula.vn', displayName: 'Gia Huy', avatar: avatars[3] },
    { key: 'lanchi', email: 'lanchi@nebula.vn', displayName: 'Lan Chi', avatar: avatars[4] },
  ];
  const users: Record<string, UserRow> = {};
  for (const p of people) {
    users[p.key] = {
      id: uid('u'),
      email: p.email,
      username: p.email.split('@')[0],
      displayName: p.displayName,
      avatarUrl: p.avatar,
      passwordHash: await sha256(`${p.email}:123456`),
      createdAt: iso(60 * 24 * 30),
    };
  }
  const U = (k: string) => users[k].id;

  const mkServer = (name: string, iconName: string, owner: string, invite: string, description: string): ServerRow => ({
    id: uid('s'),
    name,
    iconUrl: icon(iconName),
    description,
    ownerId: U(owner),
    inviteCode: invite,
    isPublic: true,
    createdAt: iso(60 * 24 * 20),
  });
  const ktpm = mkServer('Lớp Kiến trúc Phần mềm', 'graduation', 'minhanh', 'KTPM2026', 'Trao đổi bài tập, đồ án và lịch học môn Kiến trúc Phần mềm.');
  const game = mkServer('Hội Game Thủ', 'video-game', 'minhanh', 'GAMER', 'Tìm đồng đội, chia sẻ khoảnh khắc và leo rank cùng nhau.');
  const music = mkServer('CLB Âm nhạc', 'music', 'thuha', 'MUSIC', 'Chia sẻ playlist, cover và lịch jam session hằng tuần.');

  let pos = 0;
  const ch = (server: ServerRow, name: string, type: 'text' | 'voice', topic = ''): ChannelRow => ({
    id: uid('ch'),
    serverId: server.id,
    name,
    type,
    topic,
    position: pos++,
    createdAt: server.createdAt,
  });
  const ktpmNotice = ch(ktpm, 'thông-báo', 'text', 'Thông báo chính thức của lớp');
  const ktpmTalk = ch(ktpm, 'thảo-luận', 'text', 'Thảo luận đồ án Chat & Voice');
  const ktpmDocs = ch(ktpm, 'tài-liệu', 'text', 'Chia sẻ slide, tài liệu tham khảo');
  const gameGeneral = ch(game, 'chung', 'text', 'Nói chuyện phiếm');
  const gameLfg = ch(game, 'tìm-đồng-đội', 'text', 'Tìm người chơi cùng');
  const musicGeneral = ch(music, 'chung', 'text', 'Mọi thứ về âm nhạc');
  const channels = [
    ktpmNotice, ktpmTalk, ktpmDocs,
    ch(ktpm, 'Phòng học nhóm', 'voice'), ch(ktpm, 'Góc chill', 'voice'),
    gameGeneral, gameLfg, ch(game, 'Sảnh chờ', 'voice'),
    musicGeneral, ch(music, 'Phòng jam', 'voice'),
  ];

  const mem = (server: ServerRow, key: string, role: 'admin' | 'member' = 'member'): MemberRow => ({
    serverId: server.id,
    userId: U(key),
    role,
    joinedAt: server.createdAt,
  });
  const members = [
    mem(ktpm, 'minhanh', 'admin'), mem(ktpm, 'quocbao'), mem(ktpm, 'thuha'), mem(ktpm, 'giahuy'), mem(ktpm, 'lanchi'),
    mem(game, 'minhanh', 'admin'), mem(game, 'giahuy'),
    mem(music, 'thuha', 'admin'), mem(music, 'lanchi'),
  ];

  const messages: MessageRow[] = [];
  const say = (channel: ChannelRow, author: string, minutesAgo: number, content: string) =>
    messages.push({
      id: uid('m'),
      channelId: channel.id,
      serverId: channel.serverId,
      authorId: U(author),
      content,
      attachments: [],
      createdAt: iso(minutesAgo),
    });

  say(ktpmNotice, 'minhanh', 60 * 26, '📌 Chào mừng các bạn đến với server lớp Kiến trúc Phần mềm! Hãy đọc kênh này trước khi thảo luận nhé.');
  say(ktpmNotice, 'minhanh', 60 * 25, 'Lịch thuyết trình đồ án: tuần 12, mỗi nhóm 15 phút. Nhớ nộp slide trước 1 ngày.');

  const talk: Array<[string, number, string]> = [
    ['minhanh', 60 * 20, 'Chào cả nhóm! Tuần này mình cần chốt kiến trúc cho đồ án Chat & Voice nhé 👋'],
    ['quocbao', 60 * 20 - 3, 'Mình đề xuất dùng Layered Architecture trong từng module: presentation, application, domain, infrastructure.'],
    ['thuha', 60 * 20 - 6, 'Đồng ý. Còn toàn hệ thống nên là Modular Monolith, tách module auth, server, chat, voice và ai.'],
    ['giahuy', 60 * 20 - 9, 'Phần realtime thì sao? Mình nghĩ nên dùng Pub-Sub qua Socket.IO để đẩy tin nhắn tới mọi người.'],
    ['minhanh', 60 * 20 - 11, 'Chuẩn rồi, Pub-Sub giúp các module không phụ thuộc trực tiếp vào nhau, dễ mở rộng sau này.'],
    ['lanchi', 60 * 20 - 15, 'Voice call dùng WebRTC peer-to-peer, server chỉ làm signaling thôi đúng không?'],
    ['giahuy', 60 * 20 - 16, 'Đúng vậy, server chỉ chuyển offer/answer và ICE candidate, âm thanh đi trực tiếp giữa các máy.'],
    ['quocbao', 60 * 3, 'Nhắc lại: deadline nộp báo cáo giữa kỳ là thứ Sáu tuần này nha mọi người.'],
    ['thuha', 60 * 3 - 2, 'Ai phụ trách phần tóm tắt tin nhắn bằng AI vậy?'],
    ['minhanh', 60 * 3 - 4, 'Mình nhận phần AI, sẽ gọi mô hình ngôn ngữ ở backend để giữ bí mật API key.'],
    ['lanchi', 60 * 3 - 6, 'Mình làm giao diện voice và chức năng bật/tắt micro.'],
    ['quocbao', 60 * 3 - 7, 'Mình làm đăng ký/đăng nhập và tạo/tham gia server.'],
    ['giahuy', 60 * 3 - 9, 'Vậy mình nhận chat realtime, lịch sử tin nhắn và tải lên file/hình ảnh.'],
    ['thuha', 45, 'Tối thứ Tư họp nhóm lúc 20h ở kênh Phòng học nhóm được không mọi người?'],
    ['minhanh', 40, 'Ok, nhớ chuẩn bị use case diagram và sơ đồ kiến trúc trước buổi họp nhé.'],
    ['giahuy', 12, 'Mình đã đẩy bản demo chat realtime lên nhánh dev, mọi người test giúp mình với!'],
  ];
  talk.forEach(([a, m, c]) => say(ktpmTalk, a, m, c));

  say(ktpmDocs, 'thuha', 60 * 30, 'Bài viết hay về Modular Monolith: https://martinfowler.com/bliki/MonolithFirst.html');
  say(ktpmDocs, 'lanchi', 60 * 29, 'Tài liệu WebRTC cơ bản: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API');

  say(gameGeneral, 'giahuy', 60 * 8, 'Tối nay ai rảnh leo rank không? 🎮');
  say(gameGeneral, 'minhanh', 60 * 8 - 5, 'Mình online lúc 21h nhé, vào kênh Sảnh chờ.');
  say(gameLfg, 'giahuy', 60 * 30, 'Cần tìm 2 bạn chơi support, ưu tiên có mic.');
  say(musicGeneral, 'thuha', 60 * 5, 'Playlist lofi cho mùa thi đây mọi người 🎧');
  say(musicGeneral, 'lanchi', 60 * 4, 'Cuối tuần này jam session ở Phòng jam nha!');

  writeTable('users', Object.values(users));
  writeTable('sessions', []);
  writeTable('servers', [ktpm, game, music]);
  writeTable('channels', channels);
  writeTable('members', members);
  writeTable('messages', messages);
  writeTable('voiceStates', []);
  markSeeded();
}
