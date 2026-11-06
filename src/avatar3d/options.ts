/** Pure data about avatars. Imports no Three.js, so it stays out of the main bundle's 3D chunk. */
import type { Avatar, AvatarConfig, AvatarSlot, StudentSeed } from '../types';

export const SKIN_TONES = ['#f6d3b3', '#e8b98f', '#d29a6c', '#b57a4e', '#8a5a3a', '#5f3c28'];
export const HAIR_COLORS = ['#1f1612', '#3b2417', '#6b4226', '#a56b34', '#c7a06a', '#7d3c98'];
export const EYE_STYLES = [
  { id: 'round', name: 'Round' },
  { id: 'wide', name: 'Wide' },
  { id: 'sleepy', name: 'Sleepy' },
  { id: 'happy', name: 'Happy' },
];
export const MOUTH_STYLES = [
  { id: 'smile', name: 'Smile' },
  { id: 'grin', name: 'Grin' },
  { id: 'smirk', name: 'Smirk' },
];

/** Hats, glasses and bags can be taken off. Everything else always has something on. */
export const OPTIONAL_SLOTS: AvatarSlot[] = ['hat', 'glasses', 'bag'];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: SKIN_TONES[2],
  hairColor: HAIR_COLORS[0],
  eyes: 'round',
  mouth: 'smile',
  hair: 'short-crop',
  hat: null,
  top: 'blue-hoodie',
  bottom: 'blue-jeans',
  shoes: 'white-sneakers',
  glasses: null,
  bag: null,
};

function hash(text: string): number {
  let h = 2166136261;
  for (const c of text) {
    h ^= c.codePointAt(0) as number;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pickFrom = <T,>(list: T[], seed: string): T => list[hash(seed) % list.length];

const HAIR = ['short-crop', 'soft-bob', 'buzz-cut', 'spiky', 'curly', 'long-hair', 'top-bun', 'ponytail'];
const BOTTOMS = ['blue-jeans', 'school-trousers', 'track-pants', 'pleated-skirt'];
const SHOES = ['white-sneakers', 'red-hightops', 'black-formals', 'brown-boots'];

/** Classmates get a stable look from their id, keeping the outfit their old avatar implied. */
export function avatarForSeed(seed: StudentSeed): AvatarConfig {
  if (seed.isDemoStudent) return { ...DEFAULT_AVATAR, top: seed.activeAvatarId };
  const top = seed.activeAvatarId;
  return {
    skin: pickFrom(SKIN_TONES, `${seed.id}skin`),
    hairColor: pickFrom(HAIR_COLORS.slice(0, 5), `${seed.id}hair-colour`),
    eyes: pickFrom(EYE_STYLES, `${seed.id}eyes`).id,
    mouth: pickFrom(MOUTH_STYLES, `${seed.id}mouth`).id,
    hair: pickFrom(HAIR, `${seed.id}hair`),
    hat: top === 'space-explorer' ? 'space-helmet' : top === 'gamer' ? 'headphones' : null,
    top,
    bottom: pickFrom(BOTTOMS, `${seed.id}bottom`),
    shoes: pickFrom(SHOES, `${seed.id}shoes`),
    glasses: top === 'glasses-scholar' ? 'round-glasses' : null,
    bag: null,
  };
}

/** A dress replaces the top, so choosing a top has to take the dress off. */
export function withItem(config: AvatarConfig, item: Pick<Avatar, 'id' | 'slot'>): AvatarConfig {
  const next = { ...config, [item.slot]: item.id };
  return item.slot === 'top' && config.bottom === 'summer-dress' ? { ...next, bottom: 'blue-jeans' } : next;
}

export type AvatarCrop = 'head' | 'torso' | 'legs' | 'feet' | 'full';

export const SLOT_CROP: Record<AvatarSlot, AvatarCrop> = {
  hair: 'head',
  hat: 'head',
  glasses: 'head',
  top: 'torso',
  bag: 'torso',
  bottom: 'legs',
  shoes: 'feet',
};

export const avatarKey = (c: AvatarConfig) =>
  [c.skin, c.hairColor, c.eyes, c.mouth, c.hair, c.hat, c.top, c.bottom, c.shoes, c.glasses, c.bag].join('|');
