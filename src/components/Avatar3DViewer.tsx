import { RotateCcw, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { avatarKey } from '../avatar3d/options';
import type { AvatarConfig } from '../types';

type SceneModule = typeof import('../avatar3d/scene');

interface Live {
  module: SceneModule;
  renderer: import('three').WebGLRenderer;
  scene: import('three').Scene;
  camera: import('three').PerspectiveCamera;
  avatar: import('three').Group | null;
  spin: number;
}

/** A live, rotatable WebGL view of the avatar. Drag, use the buttons, or press the arrow keys. */
/** 'close' frames the whole figure, head to feet, filling most of the canvas. */
const FRAMING = {
  default: { y: 1.9, distance: 9.1, look: 1.48 },
  close: { y: 1.58, distance: 6.1, look: 1.5 },
};

export function Avatar3DViewer({
  config,
  framing = 'default',
  heightClass = 'h-[440px]',
  label = 'Your 3D avatar. Drag or use the arrow keys to rotate it.',
  bare = false,
}: {
  config: AvatarConfig;
  framing?: keyof typeof FRAMING;
  heightClass?: string;
  label?: string;
  /** No background, floor or buttons: the character floats on the page. */
  bare?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const latest = useRef(config);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  latest.current = config;

  const rebuild = () => {
    const l = live.current;
    if (!l) return;
    if (l.avatar) {
      l.scene.remove(l.avatar);
      l.module.disposeAvatar(l.avatar);
    }
    l.avatar = l.module.buildAvatar(latest.current);
    l.avatar.rotation.y = l.spin;
    l.scene.add(l.avatar);
  };

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    const host = hostRef.current;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('../avatar3d/scene').then((module) => {
      if (cancelled || !host) return;
      try {
        const { THREE } = module;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        host.appendChild(renderer.domElement);
        renderer.domElement.style.display = 'block';
        renderer.domElement.setAttribute('data-testid', 'avatar-canvas');

        const scene = module.createScene();
        const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.09 }));
        floor.rotation.x = -Math.PI / 2;
        if (!bare) scene.add(floor);
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        const view = FRAMING[framing];
        camera.position.set(0, view.y, view.distance);
        camera.lookAt(0, view.look, 0);
        live.current = { module, renderer, scene, camera, avatar: null, spin: -0.3 };
        rebuild();

        const resize = () => {
          const { clientWidth: w, clientHeight: h } = host;
          if (w === 0 || h === 0) return;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          if (framing === 'close') {
            // Back the camera off until the whole figure fits both the height and the width.
            const half = Math.tan((camera.fov * Math.PI) / 360);
            const distance = Math.max(3.3 / (2 * half), 1.8 / (2 * half * camera.aspect));
            camera.position.set(0, view.y, distance);
            camera.lookAt(0, view.look, 0);
          }
          camera.updateProjectionMatrix();
        };
        resize();
        observer = new ResizeObserver(resize);
        observer.observe(host);

        const start = performance.now();
        const draw = (t: number) => {
          const l = live.current;
          if (!l) return;
          if (l.avatar) {
            const sway = still ? 0 : Math.sin((t - start) / 1500) * 0.04;
            l.avatar.rotation.y = l.spin + sway;
            // Hero powers glow, orbit and hover. Still for reduced motion.
            if (!still) l.module.animateAvatar(l.avatar, (t - start) / 1000);
          }
          renderer.render(scene, camera);
          frame = requestAnimationFrame(draw);
        };
        frame = requestAnimationFrame(draw);
        setStatus('ready');
      } catch {
        setStatus('failed');
      }
    }).catch(() => setStatus('failed'));

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      const l = live.current;
      if (l) {
        if (l.avatar) l.module.disposeAvatar(l.avatar);
        l.renderer.dispose();
        l.renderer.domElement.remove();
        live.current = null;
      }
    };
    // Runs once: rebuild reads the latest config through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = avatarKey(config);
  useEffect(rebuild, [key]);

  const spinBy = (delta: number) => {
    if (live.current) live.current.spin += delta;
  };

  const drag = useRef<number | null>(null);

  return (
    <div className="relative h-full">
      <div
        ref={hostRef}
        role="img"
        aria-label={label}
        tabIndex={0}
        data-testid="avatar-3d"
        data-status={status}
        data-config={key}
        className={`${heightClass} w-full cursor-grab touch-none rounded-xl ${bare ? '' : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900'} outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing`}
        onPointerDown={(e) => {
          drag.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current === null) return;
          spinBy((e.clientX - drag.current) * 0.012);
          drag.current = e.clientX;
        }}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') spinBy(-0.3);
          if (e.key === 'ArrowRight') spinBy(0.3);
        }}
      />
      {status === 'failed' && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[14px] leading-5 text-muted-foreground">
          3D isn't available in this browser. Turn on hardware acceleration, then reload.
        </p>
      )}
      <div className={bare ? 'hidden' : 'absolute right-2 bottom-2 flex gap-1'}>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Rotate left" onClick={() => spinBy(-0.5)}><RotateCcw className="size-4" /></Button>
        <Button type="button" variant="outline" size="icon-sm" aria-label="Rotate right" onClick={() => spinBy(0.5)}><RotateCw className="size-4" /></Button>
      </div>
    </div>
  );
}
