import * as THREE from 'three';
import { buildAvatar, disposeAvatar } from './buildAvatar';
import { animateAvatar } from './heroes';
import type { AvatarCrop } from './options';
import type { AvatarConfig } from '../types';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb9cc, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(2.5, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.8);
  rim.position.set(-4, 3, -4);
  scene.add(rim);
  return scene;
}

const CAMERA: Record<AvatarCrop, { y: number; distance: number }> = {
  head: { y: 2.26, distance: 3.9 },
  torso: { y: 1.34, distance: 5.4 },
  legs: { y: 0.62, distance: 4.5 },
  feet: { y: 0.22, distance: 3 },
  full: { y: 1.5, distance: 9.4 },
};

export function placeCamera(camera: THREE.PerspectiveCamera, crop: AvatarCrop): void {
  const { y, distance } = CAMERA[crop];
  camera.position.set(0, y + 0.1, distance);
  camera.lookAt(0, y, 0);
}

/** One hidden renderer draws every thumbnail, because browsers cap WebGL contexts. */
export class SnapshotRenderer {
  private renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  private scene = createScene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  constructor() {
    this.renderer.setSize(192, 192);
    this.renderer.setClearColor(0x000000, 0);
  }

  render(config: AvatarConfig, crop: AvatarCrop): string {
    const avatar = buildAvatar(config);
    avatar.rotation.y = crop === 'head' ? -0.14 : -0.22;
    this.scene.add(avatar);
    placeCamera(this.camera, crop);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(avatar);
    disposeAvatar(avatar);
    return url;
  }
}

export { THREE, animateAvatar, buildAvatar, disposeAvatar };
