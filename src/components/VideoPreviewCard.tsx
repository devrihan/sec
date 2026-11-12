import { Check, ExternalLink, ListVideo, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppState } from '../services/store';
import { toggleVideoCompleted } from '../services/studentService';
import type { VideoConcept, VideoResource } from '../types';

const EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

export function clock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** The concept playing at a given second: the last one that has started. */
export function conceptAt(timeline: VideoConcept[], sec: number | null): number {
  if (sec === null) return -1;
  let found = -1;
  timeline.forEach((c, i) => {
    if (c.time <= sec + 0.5) found = i;
  });
  return found;
}

/**
 * Talks to the YouTube embed through its postMessage interface (the one the official IFrame API uses),
 * so seeking needs no extra script and the iframe never reloads.
 */
function useEmbedControl() {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const heard = useRef(false);
  const retry = useRef<number | undefined>(undefined);

  const send = useCallback((payload: object) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify(payload), EMBED_ORIGIN);
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data !== 'string') return;
      try {
        const data = JSON.parse(e.data) as { event?: string; info?: { currentTime?: number } };
        if (data.event === 'infoDelivery' && typeof data.info?.currentTime === 'number') {
          heard.current = true;
          setTime(data.info.currentTime);
        }
      } catch {
        /* Not a player message. */
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(retry.current);
    };
  }, []);

  /** Asks the player to start reporting its time, repeating until it is ready to answer. */
  const listen = useCallback(() => {
    heard.current = false;
    let tries = 0;
    window.clearInterval(retry.current);
    const ask = () => {
      if (heard.current || tries++ > 30) window.clearInterval(retry.current);
      else send({ event: 'listening', id: 'slp', channel: 'widget' });
    };
    ask();
    retry.current = window.setInterval(ask, 500);
  }, [send]);
  const seek = useCallback(
    (sec: number) => {
      send({ event: 'command', func: 'seekTo', args: [sec, true] });
      send({ event: 'command', func: 'playVideo', args: [] });
      setTime(sec);
    },
    [send],
  );

  return { frame, time, listen, seek };
}

function ConceptTimeline({
  timeline,
  length,
  active,
  current,
  onJump,
}: {
  timeline: VideoConcept[];
  length: number | undefined;
  active: number;
  current: number | null;
  onJump: (sec: number) => void;
}) {
  const end = length ?? timeline[timeline.length - 1].time + 60;
  const pct = (sec: number) => `${Math.min(100, (sec / end) * 100)}%`;
  return (
    <div className="border-t border-border p-4" data-testid="concept-timeline">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[16px] leading-6 font-semibold text-foreground">
          <ListVideo className="size-4" aria-hidden="true" />Concept timeline
        </h3>
        <p className="text-[12px] leading-4 text-muted-foreground">{timeline.length} concepts · tap one to jump there</p>
      </div>

      {/* The whole video as a rail, with a tick where each concept starts. */}
      <div className="relative mb-4 h-2 rounded-full bg-muted" aria-hidden="true">
        {current !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--inferentics-brand-primary)]/40" style={{ width: pct(current) }} />}
        {timeline.map((c, i) => (
          <span
            key={c.time}
            className={cn('absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background', i === active ? 'bg-[var(--inferentics-brand-primary)]' : 'bg-foreground/40')}
            style={{ left: pct(c.time) }}
          />
        ))}
      </div>

      {/* Two columns on wider screens, read top to bottom so the times stay in order. */}
      <ol className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-flow-col md:grid-cols-2 md:[grid-template-rows:repeat(var(--rows),auto)]" style={{ '--rows': Math.ceil(timeline.length / 2) } as CSSProperties}>
        {timeline.map((c, i) => {
          const on = i === active;
          return (
            <li key={c.time}>
              <button
                type="button"
                onClick={() => onJump(c.time)}
                aria-current={on ? 'true' : undefined}
                aria-label={`Jump to ${clock(c.time)}, ${c.label}`}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                  on ? 'bg-good-soft ring-1 ring-good-edge' : 'hover:bg-muted',
                )}
                data-testid="concept"
              >
                <span className={cn('w-[62px] shrink-0 rounded-md px-1.5 py-0.5 text-center font-mono text-[12px] leading-5 tabular-nums', on ? 'bg-[var(--inferentics-brand-primary)] text-white' : 'bg-muted text-muted-foreground')}>
                  {clock(c.time)}
                </span>
                <span className={cn('min-w-0 flex-1 text-[14px] leading-5', on ? 'font-semibold text-foreground' : 'text-foreground')}>{c.label}</span>
                {on && <span className="shrink-0 text-[11px] leading-4 font-semibold text-good-strong">Now</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[12px] leading-4 text-muted-foreground">Timestamps come from the chapter list in the video's YouTube description.</p>
    </div>
  );
}

/** `startAt` opens the video already playing from that second, e.g. from a "re-learn this concept" link. */
export function VideoPreviewCard({ video, startAt = null }: { video: VideoResource; startAt?: number | null }) {
  const [start, setStart] = useState<number | null>(video.videoId ? startAt : null);
  const [imageFailed, setImageFailed] = useState(false);
  const done = useAppState((s) => s.completedVideoIds.includes(video.id));
  const { frame, time, listen, seek } = useEmbedControl();
  const box = useRef<HTMLElement | null>(null);
  const playing = start !== null;
  const canEmbed = video.videoId !== null;
  const timeline = canEmbed ? (video.timeline ?? []) : [];
  const active = conceptAt(timeline, playing ? (time ?? start) : null);

  const jump = (sec: number) => {
    if (playing) seek(sec);
    else setStart(sec);
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const thumbnail = (
    <img
      src={imageFailed ? '/thumbnails/fallback.svg' : video.thumbnailUrl}
      alt={`Thumbnail for ${video.title}`}
      onError={() => setImageFailed(true)}
      className="size-full object-cover"
    />
  );
  const pill = 'absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md bg-background px-4 py-2 text-[14px] leading-5 font-medium tracking-[-0.084px] whitespace-nowrap text-foreground shadow-md';
  const frameClass = 'relative block aspect-[16/7] w-full cursor-pointer overflow-hidden bg-primary';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <section ref={box} aria-label="One-shot video" className="scroll-mt-4 overflow-hidden rounded-xl border bg-card shadow-sm">
      {playing && canEmbed ? (
        <div className="aspect-video">
          <iframe
            ref={frame}
            src={`${EMBED_ORIGIN}/embed/${video.videoId}?autoplay=1&enablejsapi=1&start=${Math.floor(start)}&origin=${encodeURIComponent(origin)}`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            onLoad={listen}
            className="block size-full border-0"
          />
        </div>
      ) : canEmbed ? (
        <button type="button" className={frameClass} onClick={() => setStart(0)}>
          {thumbnail}
          <span className={pill}><Play className="size-4" />Play</span>
        </button>
      ) : (
        <a className={frameClass} href={video.videoUrl} target="_blank" rel="noreferrer">
          {thumbnail}
          <span className={pill}><ExternalLink className="size-4" />Find on YouTube</span>
        </a>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground">{video.title}</p>
          <p className="text-[14px] leading-5 text-muted-foreground">
            {video.provider}{video.duration ? ` · ${video.duration}` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" aria-pressed={done} onClick={() => toggleVideoCompleted(video.id)}>
          {done && <Check className="size-4" />}
          {done ? 'Completed' : 'Mark as completed'}
        </Button>
      </div>
      {timeline.length > 0 && <ConceptTimeline timeline={timeline} length={video.lengthSeconds} active={active} current={playing ? (time ?? start) : null} onJump={jump} />}
    </section>
  );
}
