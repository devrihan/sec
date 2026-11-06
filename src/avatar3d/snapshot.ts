import { avatarKey, type AvatarCrop } from './options';
import type { AvatarConfig } from '../types';

/** Thumbnails are real renders of the 3D model, cached by look. Three.js loads on first use. */
const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();
let renderer: Promise<{ render: (c: AvatarConfig, crop: AvatarCrop) => string }> | null = null;

const keyOf = (config: AvatarConfig, crop: AvatarCrop) => `${crop}:${avatarKey(config)}`;

export const cachedSnapshot = (config: AvatarConfig, crop: AvatarCrop) => cache.get(keyOf(config, crop));

export function renderSnapshot(config: AvatarConfig, crop: AvatarCrop): Promise<string> {
  const key = keyOf(config, crop);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  renderer ??= import('./scene').then((m) => new m.SnapshotRenderer());
  const job = queue.then(async () => {
    const done = cache.get(key);
    if (done) return done;
    const url = (await renderer!).render(config, crop);
    cache.set(key, url);
    return url;
  });
  queue = job.catch(() => undefined);
  return job;
}
