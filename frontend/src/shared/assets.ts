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
