import * as THREE from 'three';

/** Shared building blocks for the student avatar and the hero avatars. */
export type V3 = [number, number, number];

export const mat = (color: string | number, options: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...options });

export function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

export const sphere = (r: number, w = 32, h = 24) => new THREE.SphereGeometry(r, w, h);
export const UP = new THREE.Vector3(0, 1, 0);

/** A rounded limb between two points. */
export function limb(parent: THREE.Object3D, from: V3, to: V3, radius: number, material: THREE.Material) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, dir.length(), 8, 16), material);
  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(mesh);
  return mesh;
}

export const SHOULDER: V3 = [0.42, 1.54, 0];
export const ELBOW: V3 = [0.54, 1.26, 0.02];
export const WRIST: V3 = [0.58, 0.98, 0.07];
export const HIP: V3 = [0.17, 0.96, 0];
export const KNEE: V3 = [0.18, 0.56, 0.01];
export const ANKLE: V3 = [0.18, 0.19, 0];
export const mirror = ([x, y, z]: V3): V3 => [-x, y, z];

export function arms(body: THREE.Object3D, upper: THREE.Material, lower: THREE.Material, skin: THREE.Material, radius = 0.13) {
  for (const flip of [(p: V3) => p, mirror]) {
    limb(body, flip(SHOULDER), flip(ELBOW), radius, upper);
    limb(body, flip(ELBOW), flip(WRIST), radius * 0.92, lower);
    add(body, sphere(0.115), skin, flip(WRIST));
  }
}

export function legs(body: THREE.Object3D, upper: THREE.Material, lower: THREE.Material, radius = 0.15) {
  for (const flip of [(p: V3) => p, mirror]) {
    limb(body, flip(HIP), flip(KNEE), radius, upper);
    limb(body, flip(KNEE), flip(ANKLE), radius * 0.9, lower);
  }
}

export function torso(body: THREE.Object3D, material: THREE.Material) {
  return add(body, new THREE.CapsuleGeometry(0.36, 0.44, 10, 24), material, [0, 1.3, 0], [0, 0, 0], [1.08, 1, 0.76]);
}

export function pelvis(body: THREE.Object3D, material: THREE.Material) {
  add(body, sphere(0.36), material, [0, 0.98, 0], [0, 0, 0], [1.02, 0.56, 0.76]);
}

export function shoePair(body: THREE.Object3D, upper: THREE.Material, sole: THREE.Material, high: number) {
  for (const s of [-1, 1]) {
    add(body, sphere(0.18), upper, [s * 0.18, 0.13, 0.08], [0, 0, 0], [0.96, 0.62, 1.42]);
    add(body, new THREE.CylinderGeometry(0.175, 0.175, 0.05, 28), sole, [s * 0.18, 0.03, 0.08], [0, 0, 0], [0.96, 1, 1.48]);
    if (high > 0) add(body, new THREE.CylinderGeometry(0.15, 0.16, high, 20), upper, [s * 0.18, 0.15 + high / 2, 0]);
  }
}

export function star(body: THREE.Object3D, material: THREE.Material, pos: V3, size: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? size * 0.45 : size;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  add(body, new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), material, pos);
}

export const HEAD_R = 0.62;
