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

export const serverIcons: string[] = [
  'rocket', 'video-game', 'books', 'music', 'headphone', 'robot', 'planet', 'brain',
  'fire', 'palette', 'laptop', 'soccer', 'cat', 'coffee', 'graduation', 'crystal-ball',
].map(img3d);

export const avatars: string[] = Array.from({ length: 16 }, (_, i) => `/avatars/av-${String(i + 1).padStart(2, '0')}.svg`);

function pickStable<T>(items: readonly T[], id: string): T {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return items[h % items.length];
}

export const fallbackAvatar = (id: string) => pickStable(avatars, id);

export const fallbackServerIcon = (id: string) => pickStable(serverIcons, id);
