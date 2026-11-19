/**
 * Danh mục ảnh tải từ Internet (xem CREDITS.md):
 *  - Icon 3D: Microsoft Fluent Emoji (MIT License)
 *  - Avatar : DiceBear "Lorelei" & "Notionists" (CC0 1.0)
 */
const img3d = (name: string) => `/images/3d/${name}.png`;

export const art = {
  robot: img3d('robot'),
  headphone: img3d('headphone'),
  microphone: img3d('microphone'),
  rocket: img3d('rocket'),
  speechBalloon: img3d('speech-balloon'),
  megaphone: img3d('megaphone'),
  videoGame: img3d('video-game'),
  sparkles: img3d('sparkles'),
  planet: img3d('planet'),
  brain: img3d('brain'),
  shield: img3d('shield'),
  bell: img3d('bell'),
  paperclip: img3d('paperclip'),
  comet: img3d('comet'),
  locked: img3d('locked'),
  crystalBall: img3d('crystal-ball'),
};

/** Icon có thể chọn khi tạo server. */
export const serverIcons: string[] = [
  'rocket', 'video-game', 'books', 'music', 'headphone', 'robot', 'planet', 'brain',
  'fire', 'palette', 'laptop', 'soccer', 'cat', 'coffee', 'graduation', 'crystal-ball',
].map(img3d);

export const avatars: string[] = Array.from({ length: 16 }, (_, i) => `/avatars/av-${String(i + 1).padStart(2, '0')}.svg`);

/** Chọn ổn định một phần tử theo id (cùng id luôn ra cùng kết quả) — dùng khi backend chưa có ảnh đại diện. */
function pickStable<T>(items: readonly T[], id: string): T {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return items[h % items.length];
}

/** Ảnh đại diện dự phòng cho người dùng chưa đặt ảnh. */
export const fallbackAvatar = (id: string) => pickStable(avatars, id);

/** Biểu tượng dự phòng cho server chưa đặt biểu tượng. */
export const fallbackServerIcon = (id: string) => pickStable(serverIcons, id);
