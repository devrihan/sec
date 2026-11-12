import * as THREE from 'three';
import type { AvatarConfig } from '../types';
import { HEROES, type HeroKit } from './heroes';
import { add, arms, HEAD_R, legs, limb, mat, pelvis, shoePair, sphere, star, torso, UP, type V3 } from './primitives';

/**
 * Builds the whole character from primitives, so every item is a real, swappable
 * 3D mesh with no image assets. The character stands on y = 0 and faces +z.
 */

/* ---------------- Tops ---------------- */

function plainTop(body: THREE.Object3D, skin: THREE.Material, color: string, long: boolean) {
  const cloth = mat(color);
  torso(body, cloth);
  arms(body, cloth, long ? cloth : skin, skin);
  return cloth;
}

function hood(body: THREE.Object3D, cloth: THREE.Material, dark: THREE.Material) {
  add(body, new THREE.TorusGeometry(0.2, 0.09, 12, 28), cloth, [0, 1.76, -0.08], [1.25, 0, 0], [1.2, 1, 1]);
  add(body, new THREE.BoxGeometry(0.42, 0.2, 0.04), dark, [0, 1.09, 0.32], [0.05, 0, 0]);
  for (const x of [-0.06, 0.06]) add(body, new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8), mat('#ffffff'), [x, 1.58, 0.31]);
}

const TOPS: Record<string, (b: THREE.Object3D, skin: THREE.Material) => void> = {
  'plain-tee': (b, skin) => {
    plainTop(b, skin, '#e8604c', false);
  },
  'striped-tee': (b, skin) => {
    plainTop(b, skin, '#f4f5f7', false);
    const navy = mat('#1e3a6e');
    for (const y of [1.08, 1.22, 1.36, 1.5]) add(b, new THREE.TorusGeometry(0.386, 0.024, 8, 40), navy, [0, y, 0], [Math.PI / 2, 0, 0], [1.02, 0.74, 1]);
  },
  'white-shirt': (b, skin) => {
    plainTop(b, skin, '#f7f8fa', true);
    const collar = mat('#e6e9ef');
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.17, 0.06, 0.1), collar, [s * 0.09, 1.71, 0.21], [0.5, 0, s * 0.45]);
    const tie = mat('#b4232a');
    add(b, new THREE.ConeGeometry(0.06, 0.09, 4), tie, [0, 1.67, 0.27], [Math.PI, 0.78, 0]);
    add(b, new THREE.CylinderGeometry(0.035, 0.075, 0.42, 4), tie, [0, 1.42, 0.29], [0.03, 0.78, 0]);
  },
  'denim-jacket': (b, skin) => {
    const denim = plainTop(b, skin, '#4a76a8', true);
    add(b, new THREE.BoxGeometry(0.26, 0.76, 0.06), mat('#f7f8fa'), [0, 1.32, 0.27]);
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.1, 0.34, 0.07), denim, [s * 0.17, 1.6, 0.26], [0.25, 0, s * 0.3]);
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.17, 0.1, 0.04), mat('#3a5f8a'), [s * 0.24, 1.36, 0.29]);
  },
  'blue-hoodie': (b, skin) => hood(b, plainTop(b, skin, '#2f6be0', true), mat('#2153b5')),
  'purple-hoodie': (b, skin) => hood(b, plainTop(b, skin, '#8247d6', true), mat('#6432aa')),
  'glasses-scholar': (b, skin) => {
    const wool = plainTop(b, skin, '#a8592f', true);
    add(b, new THREE.TorusGeometry(0.386, 0.05, 10, 40), mat('#7f4220'), [0, 0.98, 0], [Math.PI / 2, 0, 0], [1.03, 0.75, 1]);
    const collar = mat('#f7f8fa');
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.17, 0.06, 0.1), collar, [s * 0.09, 1.71, 0.21], [0.5, 0, s * 0.45]);
    void wool;
  },
  scientist: (b, skin) => {
    const coat = plainTop(b, skin, '#fbfcfd', true);
    add(b, new THREE.CylinderGeometry(0.4, 0.46, 0.46, 24, 1, true), mat('#fbfcfd', { side: THREE.DoubleSide }), [0, 0.86, 0], [0, 0, 0], [1, 1, 0.78]);
    add(b, new THREE.BoxGeometry(0.2, 0.72, 0.06), mat('#3f7fd1'), [0, 1.34, 0.27]);
    add(b, new THREE.BoxGeometry(0.17, 0.13, 0.03), mat('#dfe4ec'), [0.22, 1.32, 0.3]);
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.11, 0.34, 0.07), coat, [s * 0.15, 1.6, 0.26], [0.25, 0, s * 0.3]);
    const flask = new THREE.Group();
    flask.position.set(0.62, 0.86, 0.14);
    add(flask, new THREE.ConeGeometry(0.1, 0.17, 20), mat('#55d6a8', { transparent: true, opacity: 0.85, roughness: 0.15 }));
    add(flask, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 12), mat('#d7e6ee', { roughness: 0.15 }), [0, 0.12, 0]);
    b.add(flask);
  },
  gamer: (b, skin) => {
    plainTop(b, skin, '#1d2638', true);
    const neon = mat('#ff4d7d', { emissive: '#ff2d6d', emissiveIntensity: 0.5 });
    for (const s of [-1, 1]) add(b, new THREE.BoxGeometry(0.05, 0.74, 0.03), neon, [s * 0.09, 1.32, 0.29]);
    add(b, new THREE.TorusGeometry(0.17, 0.05, 10, 24), neon, [0, 1.74, -0.02], [1.35, 0, 0], [1.25, 1, 1]);
  },
  'space-explorer': (b, skin) => {
    const suit = mat('#eef1f6');
    torso(b, suit);
    arms(b, suit, suit, mat('#cdd5e2'), 0.145);
    add(b, new THREE.BoxGeometry(0.36, 0.22, 0.06), mat('#2b4fb8'), [0, 1.34, 0.29], [0, 0, 0]);
    add(b, sphere(0.03), mat('#f2c14a', { emissive: '#f2c14a', emissiveIntensity: 0.5 }), [-0.09, 1.34, 0.33]);
    add(b, sphere(0.03), mat('#e24a6a', { emissive: '#e24a6a', emissiveIntensity: 0.5 }), [0.05, 1.34, 0.33]);
    add(b, new THREE.BoxGeometry(0.62, 0.7, 0.24), mat('#c3cbd8'), [0, 1.32, -0.36]);
    add(b, new THREE.TorusGeometry(0.2, 0.05, 12, 28), mat('#c3cbd8'), [0, 1.78, 0], [Math.PI / 2, 0, 0]);
    void skin;
  },
  'robot-master': (b, skin) => {
    const steel = mat('#9fb0cf', { metalness: 0.65, roughness: 0.32 });
    const dark = mat('#5d6e8f', { metalness: 0.5, roughness: 0.4 });
    add(b, new THREE.BoxGeometry(0.82, 0.86, 0.56), steel, [0, 1.3, 0]);
    add(b, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 28), mat('#57d6e6', { emissive: '#2fd0e6', emissiveIntensity: 1 }), [0, 1.34, 0.29], [Math.PI / 2, 0, 0]);
    for (const x of [-0.27, 0.27]) add(b, new THREE.BoxGeometry(0.1, 0.05, 0.03), dark, [x, 1.56, 0.29]);
    arms(b, dark, steel, steel, 0.13);
    for (const s of [-1, 1]) add(b, sphere(0.16), steel, [s * 0.46, 1.6, 0]);
    void skin;
  },
  'super-learner': (b, skin) => {
    const suit = plainTop(b, skin, '#2b45c9', true);
    const gold = mat('#f2c14a', { metalness: 0.3, roughness: 0.35 });
    star(b, gold, [0, 1.36, 0.28], 0.19);
    add(b, new THREE.TorusGeometry(0.386, 0.04, 10, 40), gold, [0, 1.02, 0], [Math.PI / 2, 0, 0], [1.03, 0.75, 1]);
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.34, 0);
    capeShape.lineTo(0.34, 0);
    capeShape.lineTo(0.62, -1.38);
    capeShape.lineTo(-0.62, -1.38);
    capeShape.closePath();
    add(b, new THREE.ShapeGeometry(capeShape), mat('#c8322b', { side: THREE.DoubleSide }), [0, 1.72, -0.3], [-0.14, 0, 0]);
    add(b, new THREE.TorusGeometry(0.2, 0.045, 10, 24), mat('#c8322b'), [0, 1.73, 0], [Math.PI / 2, 0, 0]);
    void suit;
  },
};

/* ---------------- Bottoms ---------------- */

const BOTTOMS: Record<string, (b: THREE.Object3D, skin: THREE.Material) => void> = {
  'blue-jeans': (b) => {
    const denim = mat('#3f5f8e');
    pelvis(b, denim);
    legs(b, denim, denim);
  },
  'school-trousers': (b) => {
    const grey = mat('#5b6472');
    pelvis(b, grey);
    legs(b, grey, grey);
  },
  'track-pants': (b) => {
    const navy = mat('#1f2f57');
    pelvis(b, navy);
    legs(b, navy, navy);
    const stripe = mat('#ffffff');
    for (const s of [-1, 1]) {
      limb(b, [s * 0.32, 0.92, 0.02], [s * 0.325, 0.56, 0.02], 0.016, stripe);
      limb(b, [s * 0.325, 0.56, 0.02], [s * 0.3, 0.22, 0.02], 0.016, stripe);
    }
  },
  'khaki-shorts': (b, skin) => {
    const khaki = mat('#b59a6a');
    pelvis(b, khaki);
    legs(b, khaki, skin);
  },
  'pleated-skirt': (b, skin) => {
    legs(b, skin, skin, 0.125);
    add(b, new THREE.CylinderGeometry(0.34, 0.54, 0.46, 16), mat('#22335f', { flatShading: true }), [0, 0.82, 0], [0, 0, 0], [1, 1, 0.84]);
  },
  'summer-dress': (b, skin) => {
    legs(b, skin, skin, 0.125);
    const fabric = mat('#e8609a', { side: THREE.DoubleSide });
    const profile = [[0.01, 0.46], [0.56, 0.46], [0.46, 0.72], [0.35, 0.98], [0.33, 1.14], [0.39, 1.36], [0.37, 1.58], [0.22, 1.72], [0.01, 1.74]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    add(b, new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40), 40), fabric, [0, 0, 0], [0, 0, 0], [1.08, 1, 0.78]);
    arms(b, fabric, skin, skin);
  },
};

/* ---------------- Shoes ---------------- */

const SHOES: Record<string, (b: THREE.Object3D) => void> = {
  'white-sneakers': (b) => shoePair(b, mat('#f4f6f9'), mat('#c9d0db'), 0),
  'red-hightops': (b) => shoePair(b, mat('#d4372f'), mat('#f4f6f9'), 0.14),
  'black-formals': (b) => shoePair(b, mat('#17191f', { roughness: 0.25 }), mat('#0b0c10'), 0),
  'brown-boots': (b) => shoePair(b, mat('#6e4526'), mat('#3e2613'), 0.22),
};

/* ---------------- Head ---------------- */

function hairCap(head: THREE.Object3D, hair: THREE.Material, thetaEnd: number, r = HEAD_R * 1.035) {
  return add(head, new THREE.SphereGeometry(r, 40, 24, 0, Math.PI * 2, 0, thetaEnd), hair, [0, 0.01, -0.05], [-0.42, 0, 0], [1, 1, 0.95]);
}

const FLAT_HAIR = new Set(['spiky', 'curly', 'top-bun']);

const HAIR: Record<string, (h: THREE.Object3D, m: THREE.Material) => void> = {
  'short-crop': (h, m) => {
    hairCap(h, m, 1.5);
    add(h, sphere(0.34), m, [0.08, 0.42, 0.34], [0, 0, -0.3], [1.35, 0.5, 0.65]);
  },
  'buzz-cut': (h, m) => {
    hairCap(h, m, 1.42, HEAD_R * 1.012);
  },
  'soft-bob': (h, m) => {
    hairCap(h, m, 1.75, HEAD_R * 1.06);
    add(h, sphere(0.36), m, [0, 0.4, 0.33], [0, 0, 0], [1.4, 0.48, 0.65]);
    for (const s of [-1, 1]) add(h, sphere(0.25), m, [s * 0.52, -0.2, -0.06], [0, 0, 0], [0.7, 1.45, 1.05]);
    add(h, sphere(0.5), m, [0, -0.12, -0.3], [0, 0, 0], [1.2, 1.08, 0.7]);
  },
  spiky: (h, m) => {
    hairCap(h, m, 1.5);
    const spikes: V3[] = [[0, 0.68, 0.1], [0.27, 0.62, 0.14], [-0.27, 0.62, 0.14], [0.46, 0.43, 0.08], [-0.46, 0.43, 0.08], [0.15, 0.63, -0.2], [-0.15, 0.63, -0.2], [0.05, 0.5, 0.42], [-0.22, 0.46, 0.4], [0.28, 0.46, 0.38]];
    for (const p of spikes) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.36, 12), m);
      c.position.set(...p);
      c.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...p).normalize());
      h.add(c);
    }
  },
  curly: (h, m) => {
    hairCap(h, m, 1.5);
    const n = 46;
    for (let i = 0; i < n; i += 1) {
      const y = 1 - (i / (n - 1)) * 1.08;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = i * 2.399963;
      const z = Math.sin(t) * r;
      if (y < 0.28 && z > 0.45) continue;
      add(h, sphere(0.15, 14, 10), m, [Math.cos(t) * r * 0.66, y * 0.66 + 0.02, z * 0.64 - 0.03]);
    }
  },
  'long-hair': (h, m) => {
    hairCap(h, m, 1.72, HEAD_R * 1.05);
    add(h, sphere(0.36), m, [0, 0.42, 0.32], [0, 0, 0], [1.42, 0.46, 0.66]);
    add(h, new THREE.CapsuleGeometry(0.42, 0.72, 10, 24), m, [0, -0.52, -0.3], [0, 0, 0], [1.12, 1, 0.5]);
    for (const s of [-1, 1]) add(h, new THREE.CapsuleGeometry(0.12, 0.56, 8, 16), m, [s * 0.58, -0.36, 0.04]);
  },
  'top-bun': (h, m) => {
    hairCap(h, m, 1.55);
    add(h, sphere(0.34), m, [0, 0.42, 0.32], [0, 0, 0], [1.38, 0.42, 0.65]);
    add(h, sphere(0.25), m, [0, 0.78, -0.08]);
  },
  ponytail: (h, m) => {
    hairCap(h, m, 1.6);
    add(h, sphere(0.34), m, [0, 0.42, 0.32], [0, 0, 0], [1.38, 0.42, 0.65]);
    add(h, new THREE.TorusGeometry(0.07, 0.03, 8, 16), mat('#e8609a'), [0, 0.3, -0.62], [0.3, 0, 0]);
    add(h, new THREE.CapsuleGeometry(0.16, 0.56, 10, 16), m, [0, -0.06, -0.72], [0.22, 0, 0]);
  },
};

function eyes(head: THREE.Object3D, style: string, skin: THREE.Material, irisColor = '#2a1a12') {
  const white = mat('#ffffff', { roughness: 0.3 });
  const iris = mat(irisColor, { roughness: 0.25 });
  const shine = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1 });
  for (const s of [-1, 1]) {
    const x = s * 0.235;
    if (style === 'happy') {
      add(head, new THREE.TorusGeometry(0.075, 0.019, 8, 20, Math.PI), iris, [x, 0.02, 0.57], [-0.05, s * 0.34, 0]);
      continue;
    }
    if (style === 'anime') {
      // Tall, glossy eyes with a coloured iris and two highlights.
      add(head, sphere(0.13), white, [x, 0.0, 0.52], [0, s * 0.3, 0], [0.85, 1.25, 0.45]);
      add(head, sphere(0.092), iris, [x - s * 0.006, -0.015, 0.565], [0, 0, 0], [0.9, 1.3, 0.45]);
      add(head, sphere(0.05), mat('#0b0b10'), [x - s * 0.006, -0.02, 0.59], [0, 0, 0], [0.9, 1.2, 0.4]);
      add(head, sphere(0.03, 12, 8), shine, [x + 0.03, 0.05, 0.615]);
      add(head, sphere(0.014, 8, 6), shine, [x - 0.025, -0.07, 0.612]);
      continue;
    }
    const r = style === 'wide' ? 0.115 : 0.095;
    add(head, sphere(r), white, [x, 0.02, 0.53], [0, s * 0.3, 0], [0.92, 1.08, 0.5]);
    add(head, sphere(r * 0.62), iris, [x - s * 0.006, 0.01, 0.58], [0, 0, 0], [1, 1, 0.5]);
    add(head, sphere(r * 0.2, 12, 8), shine, [x + 0.022, 0.044, 0.615]);
    if (style === 'sleepy') add(head, new THREE.SphereGeometry(r * 1.13, 20, 12, 0, Math.PI * 2, 0, 1.45), skin, [x, 0.02, 0.53], [0.25, s * 0.3, 0], [0.98, 1.08, 0.56]);
  }
}

function mouth(head: THREE.Object3D, style: string) {
  const lip = mat('#7c2d22', { roughness: 0.4 });
  if (style === 'grin') {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.125, Math.PI, 0, false);
    shape.closePath();
    const m = add(head, new THREE.ShapeGeometry(shape), mat('#5e1f1a', { side: THREE.DoubleSide }), [0, -0.2, 0.587], [-0.28, 0, 0]);
    m.scale.set(1, 0.9, 1);
    add(head, new THREE.BoxGeometry(0.2, 0.035, 0.012), mat('#ffffff'), [0, -0.214, 0.588], [-0.28, 0, 0]);
    return;
  }
  const tilt = style === 'smirk' ? 0.28 : 0;
  add(head, new THREE.TorusGeometry(0.115, 0.017, 10, 24, Math.PI * 0.9), lip, [style === 'smirk' ? 0.05 : 0, -0.18, 0.58], [0, 0, Math.PI + 0.16 + tilt]);
}

/* ---------------- Hats, glasses, bags ---------------- */

const HATS: Record<string, (h: THREE.Object3D) => void> = {
  'baseball-cap': (h) => {
    const cloth = mat('#c8322b');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.07, 32, 20, 0, Math.PI * 2, 0, 1.45), cloth, [0, 0.1, -0.02], [-0.15, 0, 0]);
    add(h, new THREE.CylinderGeometry(0.46, 0.5, 0.03, 32, 1, false, -1.4, 2.8), cloth, [0, 0.27, 0.42], [0.2, 0, 0], [1, 1, 1.2]);
    add(h, sphere(0.03), mat('#8f1f1a'), [0, 0.76, 0]);
  },
  beanie: (h) => {
    const knit = mat('#2e8a7e');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.08, 32, 20, 0, Math.PI * 2, 0, 1.5), knit, [0, 0.1, -0.02], [-0.15, 0, 0]);
    add(h, new THREE.TorusGeometry(HEAD_R * 1.03, 0.08, 12, 40), mat('#236c63'), [0, 0.16, 0], [Math.PI / 2 - 0.16, 0, 0], [1, 1, 0.8]);
    add(h, sphere(0.15), mat('#f4f6f9'), [0, 0.8, -0.08]);
  },
  'sun-hat': (h) => {
    const straw = mat('#e6c98a');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.04, 32, 20, 0, Math.PI * 2, 0, 1.45), straw, [0, 0.2, 0], [-0.1, 0, 0]);
    add(h, new THREE.CylinderGeometry(1.02, 1.08, 0.03, 40), straw, [0, 0.26, 0], [0.08, 0, 0]);
    add(h, new THREE.TorusGeometry(HEAD_R * 1.02, 0.05, 10, 40), mat('#c8322b'), [0, 0.33, 0], [Math.PI / 2 + 0.08, 0, 0]);
  },
  headphones: (h) => {
    const band = mat('#20242e', { roughness: 0.35 });
    const accent = mat('#ff4d7d');
    add(h, new THREE.TorusGeometry(HEAD_R * 1.1, 0.035, 12, 40, Math.PI), band, [0, 0.03, 0]);
    for (const s of [-1, 1]) {
      add(h, new THREE.CylinderGeometry(0.18, 0.18, 0.11, 24), band, [s * 0.65, 0, 0], [0, 0, Math.PI / 2]);
      add(h, new THREE.CylinderGeometry(0.11, 0.11, 0.02, 24), accent, [s * 0.715, 0, 0], [0, 0, Math.PI / 2]);
    }
  },
  'grad-cap': (h) => {
    const black = mat('#1a1d26');
    add(h, new THREE.SphereGeometry(HEAD_R * 1.05, 32, 20, 0, Math.PI * 2, 0, 1.3), black, [0, 0.14, 0], [-0.12, 0, 0]);
    add(h, new THREE.BoxGeometry(1.32, 0.05, 1.32), black, [0, 0.69, -0.04], [-0.12, Math.PI / 4, 0]);
    const gold = mat('#f2c14a', { metalness: 0.3, roughness: 0.35 });
    add(h, sphere(0.04), gold, [0, 0.74, -0.04]);
    limb(h, [0, 0.74, -0.04], [0.62, 0.66, 0.2], 0.012, gold);
    limb(h, [0.62, 0.66, 0.2], [0.63, 0.34, 0.2], 0.012, gold);
    add(h, new THREE.CylinderGeometry(0.03, 0.05, 0.13, 10), gold, [0.63, 0.29, 0.2]);
  },
  'gold-crown': (h) => {
    const gold = mat('#f2c14a', { metalness: 0.7, roughness: 0.25 });
    add(h, new THREE.CylinderGeometry(0.46, 0.44, 0.17, 32, 1, true), mat('#f2c14a', { metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide }), [0, 0.62, -0.02]);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      add(h, new THREE.ConeGeometry(0.08, 0.2, 10), gold, [Math.sin(a) * 0.45, 0.8, Math.cos(a) * 0.45 - 0.02]);
      add(h, sphere(0.032, 12, 8), mat(i % 2 ? '#d7263d' : '#2b45c9', { roughness: 0.2 }), [Math.sin(a) * 0.465, 0.64, Math.cos(a) * 0.465 - 0.02]);
    }
  },
  'space-helmet': (h) => {
    add(h, sphere(0.86, 40, 28), mat('#cfe6ff', { transparent: true, opacity: 0.22, roughness: 0.08, metalness: 0.1, depthWrite: false }), [0, 0, 0]);
    add(h, new THREE.TorusGeometry(0.72, 0.09, 14, 40), mat('#d7dde8', { metalness: 0.3, roughness: 0.3 }), [0, -0.5, 0], [Math.PI / 2, 0, 0]);
  },
};

const GLASSES: Record<string, (h: THREE.Object3D) => void> = {
  'round-glasses': (h) => {
    const frame = mat('#2a2f3a', { roughness: 0.3 });
    for (const s of [-1, 1]) add(h, new THREE.TorusGeometry(0.145, 0.018, 10, 32), frame, [s * 0.235, 0.02, 0.6], [0, s * 0.3, 0]);
    add(h, new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8), frame, [0, 0.03, 0.635], [0, 0, Math.PI / 2]);
  },
  'square-glasses': (h) => {
    const frame = mat('#1c4fa8', { roughness: 0.3 });
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.235, 0.02, 0.6);
      g.rotation.y = s * 0.3;
      add(g, new THREE.BoxGeometry(0.31, 0.03, 0.03), frame, [0, 0.115, 0]);
      add(g, new THREE.BoxGeometry(0.31, 0.03, 0.03), frame, [0, -0.115, 0]);
      add(g, new THREE.BoxGeometry(0.03, 0.26, 0.03), frame, [0.14, 0, 0]);
      add(g, new THREE.BoxGeometry(0.03, 0.26, 0.03), frame, [-0.14, 0, 0]);
      h.add(g);
    }
    add(h, new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), frame, [0, 0.03, 0.635], [0, 0, Math.PI / 2]);
  },
  sunglasses: (h) => {
    const frame = mat('#111319', { roughness: 0.2 });
    for (const s of [-1, 1]) add(h, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 28), frame, [s * 0.235, 0.02, 0.6], [Math.PI / 2, 0, s * 0.3], [1.08, 1, 0.92]);
    add(h, new THREE.CylinderGeometry(0.016, 0.016, 0.2, 8), frame, [0, 0.05, 0.635], [0, 0, Math.PI / 2]);
  },
};

const BAGS: Record<string, (b: THREE.Object3D) => void> = {
  backpack: (b) => {
    const cloth = mat('#2e8a7e');
    add(b, new THREE.CapsuleGeometry(0.34, 0.3, 10, 20), cloth, [0, 1.3, -0.4], [0, 0, 0], [1, 1, 0.6]);
    add(b, new THREE.BoxGeometry(0.42, 0.24, 0.1), mat('#236c63'), [0, 1.14, -0.59]);
    for (const s of [-1, 1]) {
      limb(b, [s * 0.24, 1.66, -0.1], [s * 0.26, 1.66, 0.27], 0.035, cloth);
      limb(b, [s * 0.26, 1.66, 0.27], [s * 0.27, 1.05, 0.28], 0.035, cloth);
    }
  },
  'sling-bag': (b) => {
    const strap = mat('#7a4a2a');
    limb(b, [0.26, 1.66, 0.25], [-0.34, 1.02, 0.28], 0.026, strap);
    limb(b, [0.26, 1.66, -0.25], [-0.34, 1.02, -0.2], 0.026, strap);
    add(b, new THREE.CapsuleGeometry(0.15, 0.14, 8, 16), mat('#a8652f'), [-0.42, 0.98, 0.08], [0, 0, Math.PI / 2], [1, 1, 0.6]);
  },
};

/** Every buildable item id, so a data test can prove avatars.json matches this file. */
export const BUILDABLE = {
  hair: Object.keys(HAIR),
  hat: Object.keys(HATS),
  top: Object.keys(TOPS),
  bottom: Object.keys(BOTTOMS),
  shoes: Object.keys(SHOES),
  glasses: Object.keys(GLASSES),
  bag: Object.keys(BAGS),
  hero: Object.keys(HEROES),
};

/** The head sphere, ears, nose, brows, blush, eyes and mouth. */
function face(head: THREE.Object3D, skin: THREE.Material, brow: THREE.Material, eyeStyle: string, mouthStyle: string | false, ears: boolean, irisColor?: string) {
  add(head, sphere(HEAD_R, 48, 36), skin, [0, 0, 0], [0, 0, 0], [1, 0.97, 0.94]);
  if (ears) for (const s of [-1, 1]) add(head, sphere(0.1), skin, [s * 0.61, -0.02, 0], [0, 0, 0], [0.6, 1, 0.8]);
  add(head, sphere(0.062), skin, [0, -0.07, 0.6], [0, 0, 0], [1, 0.8, 0.8]);
  for (const s of [-1, 1]) {
    add(head, new THREE.CapsuleGeometry(0.018, 0.13, 6, 10), brow, [s * 0.235, 0.17, 0.55], [0, 0, Math.PI / 2 + s * 0.09]);
    add(head, sphere(0.085, 16, 12), mat('#ff8a7a', { transparent: true, opacity: 0.22 }), [s * 0.34, -0.14, 0.495], [0, 0, 0], [1, 0.62, 0.3]);
  }
  eyes(head, eyeStyle, skin, irisColor);
  if (mouthStyle) mouth(head, mouthStyle);
}

function headGroup(root: THREE.Object3D, skin: THREE.Material): THREE.Group {
  add(root, new THREE.CylinderGeometry(0.12, 0.14, 0.24, 20), skin, [0, 1.74, 0]);
  const head = new THREE.Group();
  head.position.set(0, 2.3, 0.02);
  root.add(head);
  return head;
}

/** Every hero id, so a data test can prove avatars.json sells exactly these. */
export const HERO_IDS = Object.keys(HEROES);

function buildHero(config: AvatarConfig, hero: (typeof HEROES)[string]): THREE.Group {
  const root = new THREE.Group();
  const skin = mat(config.skin, { roughness: 0.55 });
  const kit: HeroKit = { skin };
  hero.body(root, kit);
  const headSkin = hero.headColor ? mat(hero.headColor, { roughness: 0.5 }) : skin;
  const hairMat = mat(hero.hairColor ?? config.hairColor, { roughness: 0.5 });
  const head = headGroup(root, headSkin);
  face(head, headSkin, hero.hair ? hairMat : mat('#1f1612'), hero.eyes ?? config.eyes, hero.mouth === undefined ? config.mouth : hero.mouth, hero.ears !== false, hero.irisColor);
  const style = hero.hair === 'own' ? config.hair : hero.hair;
  if (style) (HAIR[style] ?? HAIR['short-crop'])(head, hairMat);
  hero.head?.(head, kit);
  if (hero.scale) root.scale.setScalar(hero.scale);
  return root;
}

export function buildAvatar(config: AvatarConfig): THREE.Group {
  const hero = config.hero ? HEROES[config.hero] : undefined;
  if (hero) return buildHero(config, hero);

  const root = new THREE.Group();
  const skin = mat(config.skin, { roughness: 0.55 });
  const hairMat = mat(config.hairColor, { roughness: 0.5 });

  const isDress = config.bottom === 'summer-dress';
  (BOTTOMS[config.bottom] ?? BOTTOMS['blue-jeans'])(root, skin);
  (SHOES[config.shoes] ?? SHOES['white-sneakers'])(root);
  if (!isDress) (TOPS[config.top] ?? TOPS['plain-tee'])(root, skin);
  if (config.bag) BAGS[config.bag]?.(root);

  const head = headGroup(root, skin);
  face(head, skin, hairMat, config.eyes, config.mouth, true);

  const hairStyle = config.hat && FLAT_HAIR.has(config.hair) ? 'short-crop' : config.hair;
  if (config.hat !== 'gold-crown' || hairStyle) (HAIR[hairStyle] ?? HAIR['short-crop'])(head, hairMat);
  if (config.glasses) GLASSES[config.glasses]?.(head);
  if (config.hat) HATS[config.hat]?.(head);

  return root;
}

export function disposeAvatar(object: THREE.Object3D): void {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    }
  });
}
