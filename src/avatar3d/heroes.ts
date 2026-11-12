import * as THREE from 'three';
import { add, HEAD_R, legs, limb, mat, pelvis, shoePair, sphere, torso, UP, type V3 } from './primitives';

/**
 * Hero avatars: complete characters a student unlocks with coins. They are built from
 * primitives like the student's own avatar, so they render on the leaderboard, lobby
 * and profile with no image assets.
 *
 * Every hero is an original design. Mythology figures (Thor, Hercules, Athena, Anubis)
 * are public domain and are drawn from the myths, not from any film or comic. The rest
 * use familiar power archetypes with their own names, costumes and emblems; none copies
 * a franchise character, which would need a licence from its owner.
 */

export interface HeroKit {
  /** The student's own skin tone, for heroes whose face shows. */
  skin: THREE.Material;
}

export interface HeroDef {
  /** Everything below the neck. */
  body: (root: THREE.Group, kit: HeroKit) => void;
  /** Head and neck colour; omitted keeps the student's skin tone. */
  headColor?: string;
  /** Eye style override, such as 'anime'. Omitted keeps the student's own. */
  eyes?: string;
  irisColor?: string;
  /** Mouth style override; false hides it (helmets, masks). */
  mouth?: string | false;
  /** A hair style id; 'own' keeps the student's hair; omitted means none. */
  hair?: string;
  /** Hair colour override; omitted keeps the student's own. */
  hairColor?: string;
  /** Human ears; default true. */
  ears?: boolean;
  /** Overall size, for giants. */
  scale?: number;
  /** Masks, helmets, horns and hats, in head space (face towards +z). */
  head?: (head: THREE.Group, kit: HeroKit) => void;
}

/* ---------- Idle animation ---------- */

type Anim =
  | { kind: 'spin'; speed: number }
  | { kind: 'bob'; speed: number; amount: number }
  | { kind: 'pulse'; speed: number }
  | { kind: 'orbit'; speed: number; radius: number; phase: number };

function animate<T extends THREE.Object3D>(object: T, anim: Anim): T {
  object.userData.anim = anim;
  return object;
}

/** Moves tagged parts: glowing powers pulse, moons orbit, hovering heroes bob. Called every frame by the live viewer. */
export function animateAvatar(root: THREE.Object3D, seconds: number): void {
  root.traverse((node) => {
    const anim = node.userData.anim as Anim | undefined;
    if (!anim) return;
    node.userData.base ??= { y: node.position.y, ry: node.rotation.y, scale: node.scale.clone() };
    const base = node.userData.base as { y: number; ry: number; scale: THREE.Vector3 };
    const t = seconds * anim.speed;
    if (anim.kind === 'spin') node.rotation.y = base.ry + t;
    if (anim.kind === 'bob') node.position.y = base.y + Math.sin(t) * anim.amount;
    if (anim.kind === 'pulse') node.scale.copy(base.scale).multiplyScalar(1 + Math.sin(t) * 0.12);
    if (anim.kind === 'orbit') {
      node.position.x = Math.cos(t + anim.phase) * anim.radius;
      node.position.z = Math.sin(t + anim.phase) * anim.radius;
      node.position.y = base.y + Math.sin(t * 1.7 + anim.phase) * 0.08;
    }
  });
}

/* ---------- Shared pieces ---------- */

const glow = (color: string, intensity = 0.9, extra: THREE.MeshStandardMaterialParameters = {}) =>
  mat(color, { emissive: color, emissiveIntensity: intensity, ...extra });
const metal = (color: string, roughness = 0.3) => mat(color, { metalness: 0.65, roughness });
const crystal = (color: string) => mat(color, { flatShading: true, metalness: 0.2, roughness: 0.15 });

/** Arm joints, so extra pairs of arms can be placed. */
const ARM = { shoulder: [0.42, 1.54, 0] as V3, elbow: [0.56, 1.25, 0.04] as V3, wrist: [0.6, 0.98, 0.1] as V3 };
const flipX = ([x, y, z]: V3): V3 => [-x, y, z];

function armPair(root: THREE.Object3D, upper: THREE.Material, lower: THREE.Material, hand: THREE.Material, radius: number, j = ARM, handSize = 1) {
  for (const f of [(p: V3) => p, flipX]) {
    limb(root, f(j.shoulder), f(j.elbow), radius, upper);
    limb(root, f(j.elbow), f(j.wrist), radius * 0.92, lower);
    add(root, sphere(0.115 * handSize), hand, f(j.wrist));
  }
}

/** A heroic V-shaped build: a broad chest and shoulders tapering to a narrower waist. */
function muscleTorso(root: THREE.Object3D, chest: THREE.Material, bulk = 1) {
  add(root, sphere(0.42), chest, [0, 1.52, 0], [0, 0, 0], [1.24 * bulk, 0.6, 0.76 * bulk]);
  add(root, new THREE.CylinderGeometry(0.44 * bulk, 0.31 * bulk, 0.52, 28), chest, [0, 1.25, 0], [0, 0, 0], [1, 1, 0.74]);
  add(root, sphere(0.31 * bulk), chest, [0, 1.0, 0], [0, 0, 0], [1, 0.45, 0.78]);
  for (const s of [-1, 1]) {
    add(root, sphere(0.19), chest, [s * 0.18 * bulk, 1.5, 0.22 * bulk], [0, 0, 0], [1.15, 0.7, 0.5]);
    add(root, sphere(0.19), chest, [s * 0.5 * bulk, 1.62, 0], [0, 0, 0], [1, 0.85, 0.95]);
  }
}

interface BuildOptions {
  chest: string | THREE.Material;
  arms?: string | THREE.Material;
  forearms?: string | THREE.Material;
  hands?: string | THREE.Material;
  legs?: string | THREE.Material;
  boots?: string;
  soles?: string;
  bootHeight?: number;
  muscle?: number;
  armRadius?: number;
}

const toMat = (m: string | THREE.Material) => (typeof m === 'string' ? mat(m) : m);

/** Torso, arms, legs and boots in one go. */
function figure(root: THREE.Object3D, o: BuildOptions) {
  const chest = toMat(o.chest);
  const arm = o.arms ? toMat(o.arms) : chest;
  const fore = o.forearms ? toMat(o.forearms) : arm;
  const leg = o.legs ? toMat(o.legs) : chest;
  if (o.muscle) muscleTorso(root, chest, o.muscle);
  else torso(root, chest);
  pelvis(root, leg);
  const radius = o.armRadius ?? (o.muscle ? 0.16 * o.muscle : 0.13);
  const j = o.muscle ? { shoulder: [0.5 * o.muscle, 1.56, 0] as V3, elbow: [0.66 * o.muscle, 1.25, 0.04] as V3, wrist: [0.7 * o.muscle, 0.98, 0.12] as V3 } : ARM;
  armPair(root, arm, fore, toMat(o.hands ?? fore), radius, j, o.muscle ? 1.25 : 1);
  legs(root, leg, leg, o.muscle ? 0.17 : 0.15);
  shoePair(root, mat(o.boots ?? '#2a2f3a'), mat(o.soles ?? '#15171d'), o.bootHeight ?? 0);
}

function belt(root: THREE.Object3D, color: string, buckle?: string, wide = 1) {
  add(root, new THREE.TorusGeometry(0.386, 0.05, 10, 40), mat(color), [0, 1.02, 0], [Math.PI / 2, 0, 0], [1.03 * wide, 0.75 * wide, 1]);
  if (buckle) add(root, new THREE.BoxGeometry(0.16, 0.12, 0.05), metal(buckle), [0, 1.02, 0.3 * wide]);
}

function cape(root: THREE.Object3D, color: string | THREE.Material, width = 0.66, length = 1.45, collar = true) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.36, 0);
  shape.lineTo(0.36, 0);
  shape.quadraticCurveTo(width + 0.1, -length * 0.6, width, -length);
  shape.lineTo(-width, -length);
  shape.quadraticCurveTo(-width - 0.1, -length * 0.6, -0.36, 0);
  const cloth = typeof color === 'string' ? mat(color, { side: THREE.DoubleSide }) : color;
  add(root, new THREE.ShapeGeometry(shape, 16), cloth, [0, 1.74, -0.32], [-0.16, 0, 0]);
  if (collar) add(root, new THREE.TorusGeometry(0.21, 0.05, 10, 24), cloth, [0, 1.74, 0], [Math.PI / 2, 0, 0]);
}

/** A cone pointing along `dir` from `pos`. */
function spike(parent: THREE.Object3D, material: THREE.Material, pos: V3, dir: V3, radius: number, height: number, sides = 12) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(radius, height, sides), material);
  c.position.set(...pos);
  c.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize());
  parent.add(c);
  return c;
}

/** A band of a sphere across the face, such as a visor or a lower-face mask. */
function faceBand(head: THREE.Object3D, material: THREE.Material, r: number, thetaStart: number, thetaLength: number, width = 1.9) {
  return add(head, new THREE.SphereGeometry(r, 40, 12, Math.PI / 2 - width / 2, width, thetaStart, thetaLength), material);
}

/** A hood or cowl over the top and back of the head. */
function hood(head: THREE.Object3D, material: THREE.Material, thetaEnd = 1.75, r = HEAD_R * 1.07) {
  add(head, new THREE.SphereGeometry(r, 40, 24, 0, Math.PI * 2, 0, thetaEnd), material, [0, 0.02, -0.04], [-0.32, 0, 0], [1, 1, 0.96]);
}

function gown(root: THREE.Object3D, material: THREE.Material, hem = 0.62, top = 1.74) {
  const k = top / 1.74;
  const profile = [[0.01, 0.05], [hem, 0.05], [hem * 0.86, 0.5], [0.42, 0.98 * k], [0.36, 1.16 * k], [0.4, 1.38 * k], [0.37, 1.6 * k], [0.22, 1.72 * k], [0.01, top]].map(
    ([x, y]) => new THREE.Vector2(x, y),
  );
  add(root, new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40), 40), material, [0, 0, 0], [0, 0, 0], [1.06, 1, 0.8]);
}

function skirt(root: THREE.Object3D, material: THREE.Material, top = 1.06, bottom = 0.62, flare = 0.5) {
  add(root, new THREE.CylinderGeometry(0.38, flare, top - bottom, 20, 1, true), material, [0, (top + bottom) / 2, 0], [0, 0, 0], [1, 1, 0.82]);
}

function sandals(root: THREE.Object3D, color: string) {
  shoePair(root, mat(color), mat('#3f2a17'), 0);
  const strap = mat(color);
  for (const s of [-1, 1]) for (const y of [0.3, 0.42]) add(root, new THREE.TorusGeometry(0.15, 0.018, 6, 20), strap, [s * 0.18, y, 0], [Math.PI / 2, 0, 0]);
}

function emblemDisc(root: THREE.Object3D, material: THREE.Material, pos: V3, r = 0.16) {
  return add(root, new THREE.CylinderGeometry(r, r, 0.03, 32), material, pos, [Math.PI / 2, 0, 0]);
}

/** Glowing speed or power streaks. */
function streak(root: THREE.Object3D, material: THREE.Material, from: V3, to: V3, r = 0.03) {
  return limb(root, from, to, r, material);
}

/* ---------- Mythic Gods ---------- */

const thor: HeroDef = {
  hair: 'long-hair',
  hairColor: '#c2782f',
  mouth: 'grin',
  body: (b, { skin }) => {
    const mail = metal('#8b939e', 0.5);
    figure(b, { chest: mail, arms: skin, forearms: mat('#5b3b23'), hands: skin, legs: '#4a3726', boots: '#5b3b23', bootHeight: 0.3, muscle: 1.08 });
    for (let y = 1.0; y < 1.75; y += 0.12) add(b, new THREE.TorusGeometry(0.44, 0.012, 6, 40), metal('#6b7280'), [0, y, 0], [Math.PI / 2, 0, 0], [1.18, 0.82, 1]);
    belt(b, '#5b3b23', '#c9a24a');
    const fur = mat('#5b3b23', { side: THREE.DoubleSide });
    cape(b, fur, 0.72, 1.5);
    add(b, new THREE.TorusGeometry(0.42, 0.11, 10, 28), mat('#8a6a48', { flatShading: true }), [0, 1.74, -0.04], [Math.PI / 2, 0, 0], [1.2, 0.9, 1]);
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.06, 0.06, 0.02), metal('#c9a24a'), [s * 0.36, 1.66, 0.3]);
    // A short-handled war hammer, crackling with lightning.
    const hammer = new THREE.Group();
    hammer.position.set(0.78, 0.98, 0.14);
    limb(hammer, [0, 0, 0], [0, -0.5, 0.04], 0.04, mat('#3f2a17'));
    add(hammer, new THREE.BoxGeometry(0.42, 0.24, 0.26), metal('#9ca3af', 0.35), [0, -0.6, 0.05]);
    for (const s of [-1, 1]) add(hammer, new THREE.BoxGeometry(0.02, 0.26, 0.28), metal('#6b7280'), [s * 0.2, -0.6, 0.05]);
    const bolt = animate(new THREE.Group(), { kind: 'pulse', speed: 7 });
    bolt.position.set(0, -0.6, 0.05);
    for (const [x, y, rz] of [[0.3, 0.12, 0.6], [-0.3, -0.1, -0.7], [0.25, -0.18, -0.4]] as V3[]) add(bolt, new THREE.BoxGeometry(0.22, 0.025, 0.025), glow('#7dd3fc', 1.6), [x, y, 0.1], [0, 0, rz]);
    hammer.add(bolt);
    b.add(hammer);
  },
  head: (h) => {
    const iron = metal('#7c8591', 0.4);
    add(h, new THREE.SphereGeometry(HEAD_R * 1.09, 32, 16, 0, Math.PI * 2, 0, 1.05), iron, [0, 0.06, -0.02], [-0.1, 0, 0]);
    add(h, new THREE.TorusGeometry(HEAD_R * 0.98, 0.04, 8, 40), metal('#c9a24a'), [0, 0.38, 0], [Math.PI / 2 - 0.1, 0, 0]);
    add(h, new THREE.BoxGeometry(0.07, 0.3, 0.06), iron, [0, 0.2, 0.64]);
    const beard = mat('#c2782f');
    add(h, sphere(0.34), beard, [0, -0.38, 0.32], [0, 0, 0], [1.1, 0.9, 0.7]);
    add(h, new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), mat('#7c2d22'), [0, -0.2, 0.6], [0, 0, Math.PI]);
  },
};

const hercules: HeroDef = {
  hair: 'curly',
  hairColor: '#3b2417',
  ears: false,
  mouth: 'smile',
  body: (b, { skin }) => {
    const linen = mat('#f5f0e6');
    muscleTorso(b, skin, 1.12);
    add(b, new THREE.CylinderGeometry(0.5, 0.37, 0.5, 28), linen, [0, 1.22, 0], [0, 0, 0], [1, 1, 0.78]);
    limb(b, [-0.42, 1.0, 0.3], [0.38, 1.7, 0.26], 0.07, linen);
    armPair(b, skin, skin, skin, 0.18, { shoulder: [0.56, 1.56, 0], elbow: [0.74, 1.25, 0.04], wrist: [0.78, 0.98, 0.12] }, 1.25);
    for (const s of [-1, 1]) add(b, new THREE.TorusGeometry(0.15, 0.04, 8, 20), metal('#c9a24a'), [s * 0.77, 1.06, 0.1], [Math.PI / 2, 0, 0]);
    skirt(b, linen, 1.06, 0.6, 0.52);
    legs(b, skin, skin, 0.17);
    sandals(b, '#7a4a2a');
    belt(b, '#7a4a2a', '#c9a24a');
    // A lion-skin cloak tied at the chest, and a heavy olive-wood club.
    const pelt = mat('#c8913a');
    cape(b, mat('#c8913a', { side: THREE.DoubleSide }), 0.6, 1.25, false);
    for (const s of [-1, 1]) limb(b, [s * 0.3, 1.74, 0.1], [s * 0.08, 1.58, 0.36], 0.07, pelt);
    const club = new THREE.Group();
    club.position.set(0.8, 0.98, 0.16);
    add(club, new THREE.CylinderGeometry(0.06, 0.15, 0.95, 12), mat('#7a4a2a', { flatShading: true }), [0, -0.42, 0.06], [0.12, 0, 0]);
    for (const [y, a] of [[-0.6, 0], [-0.4, 2], [-0.75, 4]] as [number, number][]) add(club, sphere(0.05, 8, 6), mat('#5b3920'), [Math.cos(a) * 0.12, y, Math.sin(a) * 0.12 + 0.06]);
    b.add(club);
  },
  head: (h) => {
    const pelt = mat('#c8913a');
    hood(h, pelt, 1.5, HEAD_R * 1.12);
    add(h, new THREE.TorusGeometry(HEAD_R * 0.98, 0.13, 10, 32), mat('#8a5a2b', { flatShading: true }), [0, 0.02, 0.02], [0, 0, 0], [1, 1.05, 0.6]);
    for (const s of [-1, 1]) add(h, sphere(0.1), pelt, [s * 0.42, 0.62, 0.05]);
    add(h, sphere(0.2), pelt, [0, 0.62, 0.34], [0, 0, 0], [1.1, 0.6, 0.9]);
    for (const s of [-1, 1]) add(h, sphere(0.035, 10, 8), mat('#1f1612'), [s * 0.1, 0.7, 0.5]);
  },
};

const athena: HeroDef = {
  hair: 'long-hair',
  mouth: 'smile',
  body: (b, { skin }) => {
    const robe = mat('#f8fafc', { side: THREE.DoubleSide });
    gown(b, robe, 0.6);
    armPair(b, skin, skin, skin, 0.115);
    const bronze = metal('#b7843c');
    add(b, sphere(0.42), bronze, [0, 1.42, 0.02], [0, 0, 0], [0.95, 0.75, 0.72]);
    add(b, new THREE.TorusGeometry(0.39, 0.035, 8, 40), metal('#d4a85a'), [0, 1.12, 0], [Math.PI / 2, 0, 0], [1.03, 0.78, 1]);
    for (const s of [-1, 1]) add(b, new THREE.TorusGeometry(0.13, 0.04, 8, 20), bronze, [s * 0.58, 1.08, 0.08], [Math.PI / 2, 0, 0]);
    cape(b, '#1e40af', 0.6, 1.5);
    // Spear in the right hand, round shield on the left.
    limb(b, [0.62, 0.05, 0.14], [0.6, 2.75, 0.12], 0.03, mat('#7a4a2a'));
    spike(b, bronze, [0.6, 2.9, 0.12], [0, 1, 0], 0.07, 0.3, 4);
    const shield = new THREE.Group();
    shield.position.set(-0.7, 1.1, 0.3);
    shield.rotation.set(Math.PI / 2, 0, 0.5);
    add(shield, new THREE.CylinderGeometry(0.46, 0.46, 0.06, 40), bronze);
    add(shield, new THREE.TorusGeometry(0.46, 0.04, 8, 40), metal('#d4a85a'), [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(shield, new THREE.TorusGeometry(0.26, 0.03, 8, 40), metal('#d4a85a'), [0, -0.04, 0], [Math.PI / 2, 0, 0]);
    add(shield, sphere(0.09), metal('#d4a85a'), [0, -0.04, 0]);
    b.add(shield);
    // Her owl companion, perched and gently bobbing.
    const owl = animate(new THREE.Group(), { kind: 'bob', speed: 2, amount: 0.04 });
    owl.position.set(-0.5, 1.86, -0.02);
    add(owl, sphere(0.15), mat('#8b6b4a'), [0, 0, 0], [0, 0, 0], [1, 1.2, 0.9]);
    add(owl, sphere(0.1), mat('#a8865f'), [0, 0.15, 0.02]);
    for (const s of [-1, 1]) {
      add(owl, sphere(0.04, 12, 8), mat('#ffffff'), [s * 0.04, 0.17, 0.1]);
      add(owl, sphere(0.022, 8, 6), mat('#f59e0b'), [s * 0.04, 0.17, 0.13]);
      spike(owl, mat('#8b6b4a'), [s * 0.06, 0.26, 0.02], [s * 0.3, 1, 0], 0.025, 0.08);
    }
    b.add(owl);
  },
  head: (h) => {
    const bronze = metal('#b7843c');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.08, 32, 16, 0, Math.PI * 2, 0, 1.2), bronze, [0, 0.08, -0.04], [-0.35, 0, 0]);
    for (const s of [-1, 1]) add(h, new THREE.BoxGeometry(0.06, 0.32, 0.22), bronze, [s * 0.6, -0.02, 0.18], [0, 0, s * 0.08]);
    const crest = mat('#1e40af');
    add(h, new THREE.BoxGeometry(0.06, 0.08, 0.7), metal('#d4a85a'), [0, 0.7, -0.02], [-0.1, 0, 0]);
    for (let i = 0; i < 7; i += 1) {
      const a = 0.9 - i * 0.32;
      add(h, sphere(0.11, 12, 8), crest, [0, 0.62 + Math.cos(a) * 0.2, Math.sin(a) * 0.38 - 0.05], [0, 0, 0], [0.55, 1.3, 1]);
    }
  },
};

const anubis: HeroDef = {
  headColor: '#16181f',
  ears: false,
  mouth: false,
  eyes: 'wide',
  irisColor: '#eab308',
  body: (b) => {
    const bronze = mat('#7a5230');
    const gold = metal('#e0b341');
    figure(b, { chest: bronze, legs: bronze, boots: '#c9a24a', muscle: 1.04 });
    add(b, new THREE.TorusGeometry(0.3, 0.11, 10, 32), gold, [0, 1.68, 0.02], [Math.PI / 2 - 0.15, 0, 0], [1.3, 1, 1]);
    add(b, new THREE.TorusGeometry(0.3, 0.035, 8, 32), mat('#1d4ed8'), [0, 1.66, 0.08], [Math.PI / 2 - 0.15, 0, 0], [1.32, 1, 1]);
    skirt(b, mat('#f8fafc'), 1.06, 0.6, 0.48);
    add(b, new THREE.BoxGeometry(0.2, 0.42, 0.04), gold, [0, 0.82, 0.33]);
    belt(b, '#e0b341', '#1d4ed8');
    for (const s of [-1, 1]) for (const y of [1.06, 1.36]) add(b, new THREE.TorusGeometry(0.17, 0.04, 8, 20), gold, [s * (y > 1.2 ? 0.62 : 0.69), y, 0.08], [Math.PI / 2, 0, 0]);
    // A tall sceptre with a forked foot and a glowing tip.
    const wood = mat('#2a2f3a');
    limb(b, [0.72, 0.05, 0.16], [0.7, 2.6, 0.14], 0.03, gold);
    for (const s of [-1, 1]) limb(b, [0.72, 0.05, 0.16], [0.72 + s * 0.08, -0.05, 0.16], 0.025, wood);
    add(b, new THREE.BoxGeometry(0.22, 0.08, 0.08), gold, [0.76, 2.64, 0.14], [0, 0, -0.4]);
    animate(add(b, sphere(0.06), glow('#22d3ee', 1.4), [0.86, 2.7, 0.14]), { kind: 'pulse', speed: 3 });
  },
  head: (h) => {
    const black = mat('#16181f');
    const gold = metal('#e0b341');
    add(h, new THREE.CapsuleGeometry(0.17, 0.36, 8, 16), black, [0, -0.18, 0.58], [Math.PI / 2 - 0.15, 0, 0], [1, 1, 0.85]);
    add(h, sphere(0.06), mat('#0a0a0a'), [0, -0.12, 0.9]);
    for (const s of [-1, 1]) {
      spike(h, black, [s * 0.3, 0.72, -0.05], [s * 0.15, 1, 0], 0.15, 0.6);
      spike(h, gold, [s * 0.3, 0.7, 0.02], [s * 0.15, 1, 0.05], 0.07, 0.42);
    }
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 5; k += 1) {
        add(h, new THREE.BoxGeometry(0.2, 0.12, 0.16), k % 2 ? gold : mat('#1d4ed8'), [sx * 0.5, -0.12 - k * 0.12, 0.08], [0, 0, sx * 0.08]);
      }
    }
    void gold;
  },
};

/* ---------- Power Titans ---------- */

const gammaTitan: HeroDef = {
  headColor: '#2f8f6a',
  ears: false,
  eyes: 'wide',
  irisColor: '#5df2c2',
  mouth: 'grin',
  hair: 'buzz-cut',
  hairColor: '#14231c',
  scale: 1.12,
  body: (b) => {
    const skin = mat('#2f8f6a');
    figure(b, { chest: skin, legs: '#1f2937', boots: '#4b5563', bootHeight: 0.26, muscle: 1.3 });
    const vein = glow('#5df2c2', 1.1);
    for (const [from, to] of [[[0.12, 1.75, 0.28], [0.28, 1.25, 0.3]], [[-0.18, 1.62, 0.3], [-0.06, 1.18, 0.3]], [[0.6, 1.5, 0.1], [0.82, 1.1, 0.2]], [[-0.62, 1.5, 0.1], [-0.84, 1.1, 0.2]]] as [V3, V3][]) {
      streak(b, vein, from, to, 0.018);
    }
    const strap = mat('#374151');
    limb(b, [-0.52, 1.82, 0.18], [0.4, 1.02, 0.36], 0.06, strap);
    limb(b, [0.52, 1.82, 0.18], [-0.4, 1.02, 0.36], 0.06, strap);
    emblemDisc(b, metal('#9ca3af'), [0, 1.44, 0.4], 0.12);
    belt(b, '#374151', '#9ca3af', 1.2);
    for (const s of [-1, 1]) animate(add(b, sphere(0.2), glow('#5df2c2', 0.7, { transparent: true, opacity: 0.35 }), [s * 0.91, 0.98, 0.16]), { kind: 'pulse', speed: 4 });
  },
  head: (h) => {
    add(h, new THREE.BoxGeometry(0.62, 0.1, 0.14), mat('#256f53'), [0, 0.2, 0.52], [-0.15, 0, 0]);
    add(h, sphere(0.3), mat('#2f8f6a'), [0, -0.36, 0.3], [0, 0, 0], [1.3, 0.8, 0.8]);
  },
};

const webRunner: HeroDef = {
  headColor: '#111827',
  ears: false,
  mouth: false,
  body: (b) => {
    const suit = mat('#111827');
    const teal = mat('#0d9488');
    figure(b, { chest: suit, arms: teal, forearms: suit, legs: suit, boots: '#0d9488', bootHeight: 0.18 });
    add(b, new THREE.TorusGeometry(0.22, 0.09, 12, 28), teal, [0, 1.76, -0.08], [1.25, 0, 0], [1.2, 1, 1]);
    for (const s of [-1, 1]) limb(b, [s * 0.36, 1.62, 0.18], [s * 0.3, 1.0, 0.3], 0.05, teal);
    // An eight-legged emblem that glows.
    const em = glow('#2dd4bf', 1.2);
    add(b, sphere(0.06), em, [0, 1.42, 0.3]);
    add(b, sphere(0.04), em, [0, 1.52, 0.29]);
    for (const s of [-1, 1]) for (const [dy, a] of [[0.06, 0.5], [0.02, 0.15], [-0.02, -0.15], [-0.06, -0.5]] as [number, number][]) {
      streak(b, em, [s * 0.03, 1.42 + dy, 0.31], [s * 0.18, 1.42 + dy + Math.sin(a) * 0.12, 0.29], 0.008);
    }
    for (const s of [-1, 1]) {
      add(b, new THREE.CylinderGeometry(0.11, 0.11, 0.12, 16), metal('#9ca3af'), [s * 0.58, 1.06, 0.08]);
      add(b, sphere(0.035), glow('#2dd4bf', 1.4), [s * 0.6, 1.0, 0.18]);
    }
    animate(streak(b, glow('#ccfbf1', 1, { transparent: true, opacity: 0.8 }), [0.62, 1.0, 0.14], [1.1, 3.2, 0.1], 0.012), { kind: 'pulse', speed: 2 });
    belt(b, '#0d9488', '#111827');
  },
  head: (h) => {
    hood(h, mat('#0d9488'), 1.6);
    const lens = glow('#5eead4', 1.2);
    for (const s of [-1, 1]) {
      add(h, new THREE.TorusGeometry(0.14, 0.03, 10, 24), metal('#374151'), [s * 0.22, 0.05, 0.6], [0, s * 0.3, 0]);
      add(h, sphere(0.13, 24, 12), lens, [s * 0.22, 0.05, 0.57], [0, s * 0.3, 0], [1, 1, 0.35]);
    }
  },
};

const arachnix: HeroDef = {
  ears: false,
  mouth: 'grin',
  hair: 'spiky',
  hairColor: '#1f1612',
  body: (b) => {
    const suit = mat('#4c1d95');
    const lime = mat('#84cc16');
    figure(b, { chest: suit, legs: suit, hands: '#1a1625', boots: '#1a1625', bootHeight: 0.22 });
    // Hexagon panels on the chest and thighs.
    for (const [x, y, z] of [[-0.16, 1.5, 0.29], [0.16, 1.5, 0.29], [0, 1.3, 0.3], [-0.16, 1.12, 0.29], [0.16, 1.12, 0.29], [0.18, 0.72, 0.13], [-0.18, 0.72, 0.13]] as V3[]) {
      add(b, new THREE.CylinderGeometry(0.08, 0.08, 0.02, 6), lime, [x, y, z], [Math.PI / 2, 0, 0]);
    }
    for (const s of [-1, 1]) limb(b, [s * 0.39, 1.62, 0.02], [s * 0.39, 1.05, 0.02], 0.022, lime);
    // An eight-legged emblem that glows.
    const em = glow('#bef264', 1.3);
    add(b, sphere(0.05), em, [0, 1.31, 0.33]);
    for (const s of [-1, 1]) for (const [dy, len] of [[0.05, 0.13], [0.015, 0.15], [-0.015, 0.15], [-0.05, 0.13]] as [number, number][]) {
      streak(b, em, [s * 0.03, 1.31 + dy, 0.34], [s * len, 1.31 + dy * 2.6, 0.33], 0.007);
    }
    for (const s of [-1, 1]) {
      add(b, new THREE.CylinderGeometry(0.1, 0.11, 0.14, 6), metal('#a3e635', 0.35), [s * 0.58, 1.06, 0.08]);
      add(b, sphere(0.03), glow('#d9f99d', 1.5), [s * 0.6, 0.99, 0.18]);
    }
    animate(streak(b, glow('#d9f99d', 1, { transparent: true, opacity: 0.75 }), [-0.62, 1.0, 0.14], [-1.0, 3.2, 0.2], 0.012), { kind: 'pulse', speed: 2.5 });
    belt(b, '#1a1625', '#84cc16');
  },
  head: (h) => {
    // An amber goggle half-mask over the eyes; the lower face stays visible.
    faceBand(h, mat('#4c1d95'), HEAD_R * 1.0, 0.85, 0.85, 2.4);
    const lens = glow('#fbbf24', 1.2);
    for (const s of [-1, 1]) {
      add(h, new THREE.TorusGeometry(0.13, 0.025, 8, 6), metal('#84cc16', 0.35), [s * 0.22, 0.05, 0.62], [0, s * 0.3, Math.PI / 6]);
      add(h, sphere(0.12, 6, 4), lens, [s * 0.22, 0.05, 0.6], [0, s * 0.3, Math.PI / 6], [1, 1, 0.3]);
    }
  },
};

const ironVanguard: HeroDef = {
  ears: false,
  mouth: false,
  body: (b) => {
    const plate = metal('#4b5563', 0.28);
    const dark = metal('#1f2937', 0.35);
    figure(b, { chest: plate, arms: plate, forearms: dark, hands: plate, legs: plate, boots: '#1f2937', bootHeight: 0.28, muscle: 1.05 });
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.34, 0.12, 0.42), dark, [s * 0.55, 1.74, 0], [0, 0, s * -0.3]);
    add(b, new THREE.BoxGeometry(0.66, 0.46, 0.08), plate, [0, 1.46, 0.28]);
    animate(add(b, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 6), glow('#22d3ee', 1.6), [0, 1.44, 0.33], [Math.PI / 2, 0, 0]), { kind: 'pulse', speed: 3 });
    for (const y of [1.22, 1.1]) add(b, new THREE.BoxGeometry(0.4, 0.04, 0.03), glow('#22d3ee', 0.8), [0, y, 0.32]);
    belt(b, '#1f2937', '#22d3ee');
    // Jet pack with glowing thrusters.
    add(b, new THREE.BoxGeometry(0.56, 0.62, 0.22), dark, [0, 1.36, -0.42]);
    for (const s of [-1, 1]) {
      add(b, new THREE.CylinderGeometry(0.1, 0.12, 0.3, 16), plate, [s * 0.18, 1.0, -0.44]);
      animate(spike(b, glow('#67e8f9', 1.4, { transparent: true, opacity: 0.85 }), [s * 0.18, 0.74, -0.44], [0, -1, 0], 0.09, 0.3), { kind: 'pulse', speed: 9 });
    }
  },
  head: (h) => {
    const plate = metal('#4b5563', 0.28);
    add(h, sphere(0.7, 40, 28), plate, [0, 0.03, 0], [0, 0, 0], [1, 1.04, 1]);
    faceBand(h, glow('#22d3ee', 1.1), 0.715, 1.38, 0.2, 2);
    add(h, new THREE.BoxGeometry(0.1, 0.34, 0.6), metal('#1f2937'), [0, 0.62, -0.06]);
    for (const s of [-1, 1]) add(h, new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), metal('#1f2937'), [s * 0.7, 0, 0], [0, 0, Math.PI / 2]);
  },
};

/* ---------- Alien Morphs ---------- */

const quadFist: HeroDef = {
  headColor: '#5b5bd6',
  ears: false,
  eyes: 'wide',
  irisColor: '#facc15',
  mouth: 'grin',
  body: (b) => {
    const skin = mat('#5b5bd6');
    const gold = metal('#e0b341');
    figure(b, { chest: skin, legs: '#1f2937', boots: '#374151', bootHeight: 0.2, muscle: 1.22 });
    // The second pair of arms, lower on the body.
    armPair(b, skin, skin, skin, 0.15, { shoulder: [0.44, 1.26, 0.04], elbow: [0.7, 1.02, 0.22], wrist: [0.72, 0.8, 0.36] }, 1.2);
    for (const s of [-1, 1]) {
      add(b, new THREE.TorusGeometry(0.17, 0.05, 8, 20), gold, [s * 0.83, 1.06, 0.14], [Math.PI / 2, 0, 0]);
      add(b, new THREE.TorusGeometry(0.15, 0.045, 8, 20), gold, [s * 0.71, 0.88, 0.32], [Math.PI / 2.4, 0, 0]);
    }
    const vest = mat('#374151');
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.22, 0.66, 0.1), vest, [s * 0.32, 1.38, 0.3], [0, 0, s * 0.12]);
    belt(b, '#e0b341', '#facc15', 1.15);
  },
  head: (h) => {
    const ridge = mat('#4338ca');
    for (let i = 0; i < 3; i += 1) spike(h, ridge, [0, 0.62 - i * 0.06, 0.2 - i * 0.24], [0, 1, -0.2 * i], 0.08, 0.24 - i * 0.04);
    add(h, new THREE.BoxGeometry(0.6, 0.09, 0.12), ridge, [0, 0.2, 0.53], [-0.15, 0, 0]);
  },
};

const prismShard: HeroDef = {
  headColor: '#d8b4fe',
  ears: false,
  eyes: 'wide',
  irisColor: '#a21caf',
  mouth: 'smirk',
  body: (b) => {
    const gem = crystal('#c084fc');
    figure(b, { chest: gem, legs: gem, boots: '#7e22ce', hands: crystal('#e9d5ff'), muscle: 1.05 });
    animate(add(b, new THREE.OctahedronGeometry(0.14), glow('#f0abfc', 1.5), [0, 1.42, 0.32]), { kind: 'spin', speed: 1.5 });
    for (const s of [-1, 1]) {
      for (const [dx, dy, len] of [[0, 0.1, 0.42], [0.1, 0, 0.32], [-0.08, 0.02, 0.28]] as V3[]) {
        spike(b, crystal('#e879f9'), [s * (0.55 + dx), 1.72 + dy, 0], [s * 0.6, 1, -0.1], 0.08, len, 5);
      }
      spike(b, crystal('#f5d0fe'), [s * 0.74, 1.12, 0.12], [s * 0.3, -0.2, 1], 0.06, 0.34, 4);
    }
    for (const [x, y] of [[0.2, 1.2], [-0.24, 1.55], [0.1, 0.7], [-0.15, 0.4]] as [number, number][]) add(b, new THREE.OctahedronGeometry(0.06), crystal('#f5d0fe'), [x, y, 0.28]);
  },
  head: (h) => {
    for (const [x, z, len, tilt] of [[0, 0, 0.6, 0], [0.2, -0.1, 0.42, 0.4], [-0.2, -0.1, 0.42, -0.4], [0.1, 0.2, 0.3, 0.2], [-0.1, 0.2, 0.3, -0.2]] as [number, number, number, number][]) {
      spike(h, crystal('#e879f9'), [x, 0.6 + len / 2 - 0.1, z], [tilt, 1, 0], 0.09, len, 5);
    }
  },
};

const cosmicAscendant: HeroDef = {
  headColor: '#0b1033',
  ears: false,
  eyes: 'wide',
  irisColor: '#e0f2fe',
  mouth: false,
  body: (b) => {
    const space = mat('#0b1033', { roughness: 0.4 });
    figure(b, { chest: space, legs: space, boots: '#0b1033', soles: '#312e81', muscle: 1.04 });
    const stars = glow('#ffffff', 1.5);
    for (let i = 0; i < 34; i += 1) {
      const a = i * 2.399;
      const y = 0.25 + (((i * 37) % 100) / 100) * 1.5;
      const r = y > 0.95 ? 0.42 : 0.24;
      add(b, sphere(0.016, 6, 4), stars, [Math.sin(a) * r * 1.1, y, Math.cos(a) * r * 0.8 + 0.03]);
    }
    for (const [x, y, c] of [[0.15, 1.35, '#7c3aed'], [-0.2, 1.1, '#2563eb'], [0.12, 0.6, '#db2777']] as [number, number, string][]) {
      add(b, sphere(0.16, 16, 12), glow(c, 0.5, { transparent: true, opacity: 0.45 }), [x, y, 0.22], [0, 0, 0], [1.3, 0.8, 0.4]);
    }
    // Two moons in orbit, and a slowly turning halo.
    for (const [c, r, speed, phase, y] of [['#fde68a', 1.05, 0.9, 0, 1.4], ['#93c5fd', 1.2, 0.6, 2.5, 0.9]] as [string, number, number, number, number][]) {
      const moon = animate(add(b, sphere(0.1), glow(c, 0.8), [r, y, 0]), { kind: 'orbit', speed, radius: r, phase });
      moon.position.y = y;
    }
    const halo = animate(new THREE.Group(), { kind: 'spin', speed: 0.6 });
    halo.position.set(0, 1.3, 0);
    halo.rotation.x = 0.2;
    add(halo, new THREE.TorusGeometry(1.0, 0.012, 8, 80), glow('#a5b4fc', 1, { transparent: true, opacity: 0.6 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
    b.add(halo);
  },
  head: (h) => {
    const crown = animate(new THREE.Group(), { kind: 'spin', speed: 0.8 });
    crown.position.set(0, 0.78, 0);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      add(crown, new THREE.OctahedronGeometry(0.07), glow('#c7d2fe', 1.3), [Math.cos(a) * 0.4, Math.sin(i) * 0.04, Math.sin(a) * 0.4], [0, 0, 0], [0.7, 1.5, 0.7]);
    }
    h.add(crown);
    for (let i = 0; i < 6; i += 1) add(h, sphere(0.014, 6, 4), glow('#ffffff', 1.5), [Math.sin(i * 2.4) * 0.45, Math.cos(i * 1.7) * 0.35 + 0.1, 0.45]);
  },
};

/* ---------- Ninja Academy ---------- */

const leafNinja: HeroDef = {
  eyes: 'anime',
  irisColor: '#16a34a',
  mouth: 'grin',
  hair: 'ponytail',
  hairColor: '#5b3a1e',
  body: (b, { skin }) => {
    figure(b, { chest: '#2f6f3a', arms: '#2f6f3a', forearms: '#f1f5f9', hands: skin, legs: '#5b4632', boots: '#1f2937', bootHeight: 0.14 });
    const trim = mat('#14532d');
    add(b, new THREE.BoxGeometry(0.08, 0.76, 0.04), trim, [0.08, 1.32, 0.29], [0, 0, 0.14]);
    add(b, new THREE.TorusGeometry(0.21, 0.07, 10, 28), trim, [0, 1.74, 0.02], [Math.PI / 2, 0, 0]);
    belt(b, '#a16207');
    // A leaf brooch and a pouch on the thigh.
    add(b, sphere(0.09, 16, 12), glow('#4ade80', 0.6), [-0.18, 1.52, 0.3], [0, 0, 0.6], [0.5, 1, 0.25]);
    add(b, new THREE.BoxGeometry(0.16, 0.18, 0.1), mat('#3f2a17'), [0.3, 0.78, 0.08]);
    for (const s of [-1, 1]) for (const y of [0.32, 0.42]) add(b, new THREE.TorusGeometry(0.15, 0.02, 6, 20), mat('#f1f5f9'), [s * 0.18, y, 0], [Math.PI / 2, 0, 0]);
    const leaf = animate(new THREE.Group(), { kind: 'orbit', speed: 1.4, radius: 0.85, phase: 1 });
    leaf.position.y = 1.9;
    add(leaf, sphere(0.06, 12, 8), glow('#86efac', 0.7), [0, 0, 0], [0, 0, 0.5], [0.5, 1, 0.2]);
    b.add(leaf);
  },
  head: (h) => {
    const band = mat('#15803d');
    add(h, new THREE.TorusGeometry(HEAD_R * 1.02, 0.06, 10, 40), band, [0, 0.3, -0.02], [Math.PI / 2 - 0.25, 0, 0], [1, 1, 0.92]);
    for (const s of [-1, 1]) add(h, new THREE.CapsuleGeometry(0.04, 0.4, 6, 10), band, [s * 0.12, 0.06, -0.72], [0.9, 0, s * 0.4]);
  },
};

const shadowNinja: HeroDef = {
  eyes: 'anime',
  irisColor: '#a855f7',
  mouth: false,
  body: (b) => {
    figure(b, { chest: '#1a1625', legs: '#1a1625', hands: '#2e1065', boots: '#1a1625', bootHeight: 0.18 });
    const purple = mat('#4c1d95');
    add(b, new THREE.TorusGeometry(0.39, 0.06, 10, 40), purple, [0, 1.05, 0], [Math.PI / 2, 0, 0], [1.03, 0.78, 1]);
    add(b, new THREE.BoxGeometry(0.14, 0.42, 0.04), purple, [0.18, 0.8, 0.32], [0.05, 0, -0.15]);
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.05, 0.05, 0.02), purple, [s * 0.2, 1.5, 0.3]);
    // Twin short blades crossed on the back.
    for (const s of [-1, 1]) {
      const blade = new THREE.Group();
      blade.position.set(0, 1.45, -0.36);
      blade.rotation.z = s * 0.7;
      add(blade, new THREE.BoxGeometry(0.05, 0.8, 0.02), metal('#cbd5e1', 0.2), [0, 0.15, 0]);
      add(blade, new THREE.BoxGeometry(0.06, 0.24, 0.05), mat('#2e1065'), [0, -0.36, 0]);
      add(blade, new THREE.BoxGeometry(0.18, 0.04, 0.06), metal('#6b7280'), [0, -0.24, 0]);
      b.add(blade);
    }
    for (let i = 0; i < 5; i += 1) {
      animate(add(b, sphere(0.16 + (i % 2) * 0.05, 12, 8), mat('#6b7280', { transparent: true, opacity: 0.25, depthWrite: false }), [Math.cos(i * 1.3) * 0.5, 0.1, Math.sin(i * 1.3) * 0.4]), { kind: 'bob', speed: 1.5 + i * 0.3, amount: 0.06 });
    }
  },
  head: (h) => {
    hood(h, mat('#2e1065'), 1.7);
    faceBand(h, mat('#1a1625'), HEAD_R * 1.0, 1.72, 0.7, 2.6);
  },
};

const silverSensei: HeroDef = {
  eyes: 'sleepy',
  mouth: 'smile',
  hair: 'top-bun',
  hairColor: '#d1d5db',
  body: (b, { skin }) => {
    const gi = mat('#f8fafc');
    const navy = mat('#1e3a8a');
    torso(b, gi);
    armPair(b, gi, gi, skin, 0.15);
    for (const s of [-1, 1]) add(b, new THREE.TorusGeometry(0.15, 0.04, 8, 20), navy, [s * 0.58, 1.06, 0.08], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) limb(b, [s * 0.18, 1.74, 0.16], [s * -0.06, 1.15, 0.33], 0.04, navy);
    // Wide pleated trousers to the ankle.
    add(b, new THREE.CylinderGeometry(0.4, 0.6, 0.9, 24, 1, true), mat('#1e3a8a', { side: THREE.DoubleSide, flatShading: true }), [0, 0.6, 0], [0, 0, 0], [1, 1, 0.8]);
    pelvis(b, navy);
    shoePair(b, mat('#f8fafc'), mat('#3f2a17'), 0);
    belt(b, '#0f172a');
    const sword = new THREE.Group();
    sword.position.set(0.66, 0.98, 0.14);
    sword.rotation.x = 0.3;
    add(sword, new THREE.CylinderGeometry(0.035, 0.03, 1.2, 10), mat('#a16207'), [0, -0.5, 0]);
    add(sword, new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16), mat('#1f2937'), [0, 0.06, 0]);
    b.add(sword);
  },
  head: (h) => {
    const brow = mat('#d1d5db');
    for (const s of [-1, 1]) add(h, new THREE.CapsuleGeometry(0.022, 0.16, 6, 10), brow, [s * 0.235, 0.2, 0.56], [0, 0, Math.PI / 2 + s * 0.2]);
    add(h, sphere(0.12, 16, 12), mat('#d1d5db'), [0, -0.4, 0.42], [0, 0, 0], [1, 1.4, 0.7]);
  },
};

const stretchPirate: HeroDef = {
  eyes: 'anime',
  irisColor: '#0ea5e9',
  mouth: 'grin',
  hair: 'own',
  body: (b, { skin }) => {
    const shirt = mat('#f8fafc');
    torso(b, shirt);
    for (const y of [1.08, 1.22, 1.36, 1.5]) add(b, new THREE.TorusGeometry(0.386, 0.024, 8, 40), mat('#1e3a8a'), [0, y, 0], [Math.PI / 2, 0, 0], [1.02, 0.74, 1]);
    const coat = mat('#0f766e', { side: THREE.DoubleSide });
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.2, 0.82, 0.08), coat, [s * 0.3, 1.32, 0.26], [0, 0, s * 0.05]);
    add(b, new THREE.CylinderGeometry(0.42, 0.52, 0.5, 24, 1, true, Math.PI * 0.2, Math.PI * 1.6), coat, [0, 0.82, 0], [0, 0, 0], [1, 1, 0.82]);
    add(b, new THREE.TorusGeometry(0.39, 0.06, 10, 40), mat('#f97316'), [0, 1.04, 0], [Math.PI / 2, 0, 0], [1.03, 0.78, 1]);
    pelvis(b, mat('#78350f'));
    legs(b, mat('#78350f'), skin);
    shoePair(b, mat('#4a2c17'), mat('#22140a'), 0.22);
    // Left arm normal; the right one stretches out like rubber, with coils and a big fist.
    limb(b, [-0.42, 1.54, 0], [-0.56, 1.25, 0.04], 0.13, coat);
    limb(b, [-0.56, 1.25, 0.04], [-0.6, 0.98, 0.1], 0.12, skin);
    add(b, sphere(0.12), skin, [-0.6, 0.98, 0.1]);
    limb(b, [0.42, 1.54, 0], [0.62, 1.58, 0.1], 0.13, coat);
    limb(b, [0.62, 1.58, 0.1], [1.7, 1.75, 0.5], 0.08, skin);
    for (let i = 0; i < 4; i += 1) add(b, new THREE.TorusGeometry(0.1, 0.02, 6, 16), mat('#e2a77c'), [0.8 + i * 0.22, 1.61 + i * 0.033, 0.17 + i * 0.07], [0, Math.PI / 2 - 0.3, 0]);
    animate(add(b, sphere(0.2), skin, [1.78, 1.76, 0.53]), { kind: 'pulse', speed: 5 });
    for (const [x, y, z] of [[1.95, 1.9, 0.5], [2.0, 1.72, 0.62], [1.92, 1.6, 0.4]] as V3[]) streak(b, glow('#fde68a', 1, { transparent: true, opacity: 0.8 }), [x, y, z], [x + 0.15, y + (y - 1.76) * 0.6, z], 0.012);
  },
  head: (h) => {
    const felt = mat('#15803d');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.05, 32, 16, 0, Math.PI * 2, 0, 1.3), felt, [0, 0.16, -0.02], [-0.1, 0, 0]);
    add(h, new THREE.CylinderGeometry(1.0, 1.04, 0.035, 40), felt, [0, 0.32, 0], [0.12, 0, 0.06]);
    add(h, new THREE.TorusGeometry(HEAD_R * 1.0, 0.04, 8, 40), mat('#f97316'), [0, 0.38, 0], [Math.PI / 2 + 0.12, 0, 0]);
    add(h, new THREE.CapsuleGeometry(0.05, 0.5, 6, 12), mat('#facc15'), [0.42, 0.62, -0.25], [-0.5, 0, -0.7]);
  },
};

/* ---------- Justice Guard ---------- */

const voltDash: HeroDef = {
  mouth: 'grin',
  ears: false,
  body: (b) => {
    const blue = mat('#1d4ed8');
    figure(b, { chest: blue, hands: '#f8fafc', legs: blue, boots: '#facc15', bootHeight: 0.24 });
    const white = mat('#f8fafc');
    for (const s of [-1, 1]) {
      limb(b, [s * 0.39, 1.62, 0.02], [s * 0.39, 1.05, 0.02], 0.025, white);
      limb(b, [s * 0.32, 0.92, 0.02], [s * 0.31, 0.22, 0.02], 0.02, white);
    }
    const chevron = glow('#facc15', 0.9);
    for (const y of [1.5, 1.36, 1.22]) for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.2, 0.05, 0.03), chevron, [s * 0.08, y, 0.3], [0, 0, s * 0.55]);
    belt(b, '#facc15', '#f8fafc');
    // Speed streaks trailing behind.
    const trail = glow('#fde047', 1.2, { transparent: true, opacity: 0.7 });
    for (const [y, x, len] of [[1.7, 0.3, 0.9], [1.4, -0.25, 1.2], [1.1, 0.15, 0.8], [0.7, -0.1, 1.0], [0.4, 0.2, 0.7]] as V3[]) {
      animate(streak(b, trail, [x, y, -0.45], [x, y + 0.05, -0.45 - len], 0.02), { kind: 'pulse', speed: 8 + y * 3 });
    }
  },
  head: (h) => {
    const blue = mat('#1d4ed8');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.05, 40, 24, 0, Math.PI * 2, 0, 1.68), blue, [0, 0, -0.02], [-0.28, 0, 0]);
    faceBand(h, glow('#fde047', 0.6, { transparent: true, opacity: 0.9, roughness: 0.1 }), 0.67, 1.32, 0.3, 2.1);
    add(h, new THREE.BoxGeometry(0.08, 0.14, 0.8), mat('#facc15'), [0, 0.66, -0.06]);
    for (const s of [-1, 1]) spike(h, mat('#facc15'), [s * 0.64, 0.12, -0.1], [s * 0.4, 0.2, -1], 0.06, 0.34, 3);
  },
};

const nightWarden: HeroDef = {
  mouth: 'smirk',
  ears: false,
  body: (b) => {
    const armour = mat('#1e293b', { roughness: 0.45 });
    figure(b, { chest: armour, hands: '#0f172a', legs: armour, boots: '#0f172a', bootHeight: 0.3, muscle: 1.04 });
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.26, 0.3, 0.06), mat('#334155'), [s * 0.17, 1.42, 0.28]);
    // A silver crescent moon emblem.
    add(b, new THREE.TorusGeometry(0.12, 0.03, 8, 24, Math.PI * 1.3), metal('#e2e8f0', 0.2), [0, 1.42, 0.33], [0, 0, 0.9]);
    belt(b, '#64748b', '#e2e8f0');
    for (const s of [-1, 1]) for (const x of [0.18, 0.3]) add(b, new THREE.BoxGeometry(0.08, 0.1, 0.06), mat('#475569'), [s * x, 1.0, 0.27]);
    cape(b, '#374151', 0.8, 1.65);
  },
  head: (h) => {
    hood(h, mat('#374151'), 1.85, HEAD_R * 1.1);
    faceBand(h, mat('#0f172a'), HEAD_R * 1.0, 0.95, 0.75, 2.2);
    for (const s of [-1, 1]) add(h, sphere(0.1, 16, 10), glow('#f8fafc', 1.6), [s * 0.22, 0.06, 0.66], [0, s * 0.3, s * -0.2], [1.5, 0.6, 0.3]);
  },
};

const skySentinel: HeroDef = {
  hair: 'own',
  scale: 1.02,
  body: (b) => {
    const white = mat('#f8fafc');
    const gold = metal('#eab308', 0.3);
    figure(b, { chest: white, hands: gold, legs: white, boots: '#eab308', bootHeight: 0.3, muscle: 1.08 });
    // A sun emblem: a disc with eight rays.
    emblemDisc(b, gold, [0, 1.44, 0.32], 0.11);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const c = spike(b, gold, [Math.cos(a) * 0.17, 1.44 + Math.sin(a) * 0.17, 0.32], [Math.cos(a), Math.sin(a), 0], 0.03, 0.1, 4);
      c.scale.z = 0.4;
    }
    belt(b, '#eab308', '#f8fafc');
    cape(b, '#0d9488', 0.74, 1.55);
    // Hovering just off the ground.
    b.userData.anim = { kind: 'bob', speed: 1.6, amount: 0.06 } satisfies Anim;
  },
  head: (h) => {
    add(h, new THREE.TorusGeometry(HEAD_R * 1.0, 0.025, 8, 40, Math.PI), metal('#eab308'), [0, 0.3, 0], [Math.PI / 2 - 0.2, 0, Math.PI]);
  },
};

const amazonWarrior: HeroDef = {
  hair: 'ponytail',
  mouth: 'smile',
  body: (b, { skin }) => {
    const leather = mat('#3f6212');
    const bronze = metal('#b7843c');
    torso(b, leather);
    armPair(b, skin, skin, skin, 0.125);
    for (const s of [-1, 1]) add(b, new THREE.CylinderGeometry(0.13, 0.14, 0.22, 16), bronze, [s * 0.58, 1.08, 0.08]);
    for (const y of [1.56, 1.34]) add(b, new THREE.TorusGeometry(0.386, 0.025, 8, 40), bronze, [0, y, 0], [Math.PI / 2, 0, 0], [1.02, 0.74, 1]);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      add(b, new THREE.BoxGeometry(0.16, 0.4, 0.04), i % 2 ? leather : mat('#4d7c0f'), [Math.sin(a) * 0.38, 0.86, Math.cos(a) * 0.3], [0, a, 0]);
    }
    pelvis(b, leather);
    legs(b, skin, skin, 0.14);
    sandals(b, '#7a4a2a');
    belt(b, '#b7843c', '#3f6212');
    // Bow in the left hand, quiver of arrows on the back.
    const bow = new THREE.Group();
    bow.position.set(-0.66, 1.0, 0.2);
    add(bow, new THREE.TorusGeometry(0.62, 0.025, 8, 40, Math.PI * 0.85), mat('#7a4a2a'), [0, 0, 0], [0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.075]);
    limb(bow, [0, 0.58, -0.17], [0, -0.58, -0.17], 0.006, mat('#f5f5f4'));
    b.add(bow);
    add(b, new THREE.CylinderGeometry(0.1, 0.09, 0.62, 16), mat('#5b3b23'), [0.2, 1.42, -0.38], [0, 0, -0.4]);
    for (const dx of [-0.04, 0.02, 0.07]) add(b, new THREE.ConeGeometry(0.04, 0.12, 4), mat('#dc2626'), [0.36 + dx, 1.8, -0.38], [0, 0, -0.4]);
  },
  head: (h) => {
    add(h, new THREE.TorusGeometry(HEAD_R * 1.02, 0.045, 8, 40), mat('#3f6212'), [0, 0.28, -0.02], [Math.PI / 2 - 0.25, 0, 0], [1, 1, 0.92]);
    for (const s of [-1, 1]) add(h, new THREE.BoxGeometry(0.12, 0.03, 0.01), mat('#b7843c'), [s * 0.36, -0.08, 0.5], [0, s * 0.5, 0]);
  },
};

/* ---------- The roster ---------- */

export const HEROES: Record<string, HeroDef> = {
  'myth-thor': thor,
  'myth-hercules': hercules,
  'myth-athena': athena,
  'myth-anubis': anubis,
  'titan-gamma': gammaTitan,
  'titan-web-runner': webRunner,
  'titan-arachnix': arachnix,
  'titan-iron-vanguard': ironVanguard,
  'alien-quad-fist': quadFist,
  'alien-prism-shard': prismShard,
  'alien-cosmic-ascendant': cosmicAscendant,
  'ninja-leaf': leafNinja,
  'ninja-shadow': shadowNinja,
  'ninja-silver-sensei': silverSensei,
  'ninja-stretch-pirate': stretchPirate,
  'justice-volt-dash': voltDash,
  'justice-night-warden': nightWarden,
  'justice-sky-sentinel': skySentinel,
  'justice-amazon': amazonWarrior,
};

