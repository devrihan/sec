import { beforeEach, describe, expect, it } from 'vitest';
import { HERO_SERIES, withItem } from '../avatar3d/options';
import { buildAvatar, HERO_IDS } from '../avatar3d/buildAvatar';
import { avatarById, avatars } from './catalog';
import { purchaseAvatar, setDemoCoins } from './pointsService';
import { getState, resetDemo } from './store';
import { coinsOf, earnedPointsOf, equipAvatar, removeFromSlot } from './studentService';

const ME = () => getState().demoStudentId;
const heroes = avatars.filter((a) => a.slot === 'hero');

beforeEach(() => resetDemo());

describe('hero avatars', () => {
  it('sells every hero that has a 3D build, each in a known series and priced in coins', () => {
    expect(heroes.map((h) => h.id).sort()).toEqual([...HERO_IDS].sort());
    const series = HERO_SERIES.map((s) => s.id as string);
    for (const h of heroes) {
      expect(series, h.id).toContain(h.series);
      expect(h.price, h.id).toBeGreaterThan(0);
    }
  });

  it('builds each hero as a full character, different from the student build', () => {
    const base = getState().avatarConfigs[ME()];
    const meshes = (c: typeof base) => {
      let n = 0;
      buildAvatar(c).traverse((o) => { if ((o as { isMesh?: boolean }).isMesh) n += 1; });
      return n;
    };
    for (const h of heroes) expect(meshes(withItem(base, h)), h.id).toBeGreaterThan(20);
  });

  it('unlocks with coins only: points and rank are untouched', () => {
    const points = earnedPointsOf(getState(), ME());
    const outcome = purchaseAvatar('ninja-leaf');
    expect(outcome.ok).toBe(true);
    expect(coinsOf(getState(), ME())).toBe(1000 - (avatarById('ninja-leaf')?.price ?? 0));
    expect(earnedPointsOf(getState(), ME())).toBe(points);
  });

  it("can't be unlocked without enough coins or worn before it's unlocked", () => {
    setDemoCoins(500);
    expect(purchaseAvatar('alien-cosmic-ascendant')).toEqual({ ok: false, reason: 'insufficient' });
    expect(equipAvatar('alien-cosmic-ascendant')).toBe(false);
    expect(getState().avatarConfigs[ME()].hero ?? null).toBeNull();
  });

  it('is worn over the outfit, comes off, and an outfit change shows the student again', () => {
    purchaseAvatar('ninja-leaf');
    const outfit = { ...getState().avatarConfigs[ME()] };
    expect(equipAvatar('ninja-leaf')).toBe(true);
    expect(getState().avatarConfigs[ME()]).toMatchObject({ hero: 'ninja-leaf', top: outfit.top });
    removeFromSlot('hero');
    expect(getState().avatarConfigs[ME()].hero).toBeNull();
    equipAvatar('ninja-leaf');
    equipAvatar('plain-tee');
    expect(getState().avatarConfigs[ME()]).toMatchObject({ hero: null, top: 'plain-tee' });
  });
});
