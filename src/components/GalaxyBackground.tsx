import { useEffect, useRef } from 'react';
import { useTheme, type Theme } from '../services/themeService';

/**
 * A live galaxy behind the page: drifting stars at three depths, slowly breathing
 * nebula clouds and the odd shooting star. It fills the main content area only (not
 * the sidebar or header), stays put while the page scrolls, and draws a single still
 * frame when the user prefers reduced motion.
 */

interface Palette {
  sky: [string, string, string];
  nebulae: string[];
  star: string[];
  starAlpha: number;
  shooting: string;
}

const PALETTES: Record<Theme, Palette> = {
  dark: {
    sky: ['#050816', '#0b1033', '#140a2e'],
    nebulae: ['124,58,237', '37,99,235', '219,39,119', '13,148,136'],
    star: ['#ffffff', '#c7d2fe', '#fde68a', '#a5f3fc'],
    starAlpha: 1,
    shooting: '255,255,255',
  },
  // A soft dawn sky, so dark text and cards stay easy to read.
  light: {
    sky: ['#eef2ff', '#f5f3ff', '#ecfeff'],
    nebulae: ['167,139,250', '96,165,250', '244,114,182', '45,212,191'],
    star: ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b'],
    starAlpha: 0.55,
    shooting: '99,102,241',
  },
};

interface Star {
  x: number;
  y: number;
  r: number;
  depth: number;
  color: string;
  phase: number;
  speed: number;
}

interface Nebula {
  x: number;
  y: number;
  r: number;
  color: string;
  phase: number;
}

interface Shooting {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const main = document.getElementById('main');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !main || !ctx) return undefined;

    const palette = PALETTES[theme];
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const random = seeded(7);
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let nebulae: Nebula[] = [];
    let shooting: Shooting | null = null;
    let nextShootingAt = 3000;
    let frame = 0;

    const layout = () => {
      const rect = main.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      Object.assign(canvas.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${width}px`, height: `${height}px` });
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(650, Math.round((width * height) / 2600));
      stars = Array.from({ length: count }, () => {
        const depth = random() < 0.6 ? 0 : random() < 0.7 ? 1 : 2;
        return {
          x: random() * width,
          y: random() * height,
          r: [0.6, 1.1, 1.7][depth] * (0.7 + random() * 0.6),
          depth,
          color: palette.star[Math.floor(random() * palette.star.length)],
          phase: random() * Math.PI * 2,
          speed: 0.6 + random() * 1.8,
        };
      });
      nebulae = palette.nebulae.map((color, i) => ({
        x: width * (0.15 + 0.25 * i + (random() - 0.5) * 0.1),
        y: height * (0.2 + 0.55 * random()),
        r: Math.max(width, height) * (0.28 + random() * 0.18),
        color,
        phase: random() * Math.PI * 2,
      }));
      if (still) draw(0);
    };

    const draw = (t: number) => {
      const sky = ctx.createLinearGradient(0, 0, width, height);
      sky.addColorStop(0, palette.sky[0]);
      sky.addColorStop(0.55, palette.sky[1]);
      sky.addColorStop(1, palette.sky[2]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Nebula clouds breathe and drift very slowly.
      ctx.globalCompositeOperation = theme === 'dark' ? 'lighter' : 'source-over';
      for (const n of nebulae) {
        const pulse = 1 + Math.sin(t / 6000 + n.phase) * 0.08;
        const x = n.x + Math.sin(t / 14000 + n.phase) * 30;
        const y = n.y + Math.cos(t / 17000 + n.phase) * 20;
        const g = ctx.createRadialGradient(x, y, 0, x, y, n.r * pulse);
        const alpha = theme === 'dark' ? 0.22 : 0.28;
        g.addColorStop(0, `rgba(${n.color},${alpha})`);
        g.addColorStop(0.5, `rgba(${n.color},${alpha * 0.35})`);
        g.addColorStop(1, `rgba(${n.color},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = 'source-over';

      // Stars drift sideways, nearer ones faster, and twinkle.
      for (const s of stars) {
        const drift = [4, 9, 16][s.depth];
        const x = (((s.x + (t / 1000) * drift) % width) + width) % width;
        const twinkle = 0.55 + 0.45 * Math.sin(t / 1000 * s.speed + s.phase);
        ctx.globalAlpha = palette.starAlpha * twinkle;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.depth === 2 && theme === 'dark') {
          ctx.globalAlpha = 0.25 * twinkle;
          ctx.fillRect(x - s.r * 3, s.y - 0.4, s.r * 6, 0.8);
          ctx.fillRect(x - 0.4, s.y - s.r * 3, 0.8, s.r * 6);
        }
      }
      ctx.globalAlpha = 1;

      // A shooting star every few seconds.
      if (!still) {
        if (!shooting && t > nextShootingAt) {
          shooting = { x: random() * width * 0.7, y: random() * height * 0.4, vx: 0.9 + random() * 0.5, vy: 0.35 + random() * 0.2, life: 0 };
        }
        if (shooting) {
          shooting.life += 16;
          const sx = shooting.x + shooting.vx * shooting.life;
          const sy = shooting.y + shooting.vy * shooting.life;
          const fade = Math.max(0, 1 - shooting.life / 900);
          const tail = ctx.createLinearGradient(sx, sy, sx - shooting.vx * 140, sy - shooting.vy * 140);
          tail.addColorStop(0, `rgba(${palette.shooting},${0.9 * fade})`);
          tail.addColorStop(1, `rgba(${palette.shooting},0)`);
          ctx.strokeStyle = tail;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - shooting.vx * 140, sy - shooting.vy * 140);
          ctx.stroke();
          if (fade === 0) {
            shooting = null;
            nextShootingAt = t + 4000 + random() * 6000;
          }
        }
      }
    };

    const loop = (t: number) => {
      draw(t);
      frame = requestAnimationFrame(loop);
    };

    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(main);
    window.addEventListener('resize', layout);
    if (!still) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', layout);
    };
  }, [theme]);

  return <canvas ref={canvasRef} aria-hidden="true" data-testid="galaxy-bg" className="pointer-events-none fixed -z-10" />;
}
