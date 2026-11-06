import { Check, ExternalLink, Play } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppState } from '../services/store';
import { toggleVideoCompleted } from '../services/studentService';
import type { VideoResource } from '../types';

export function VideoPreviewCard({ video }: { video: VideoResource }) {
  const [playing, setPlaying] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const done = useAppState((s) => s.completedVideoIds.includes(video.id));
  const canEmbed = video.videoId !== null;
  const thumbnail = (
    <img
      src={imageFailed ? '/thumbnails/fallback.svg' : video.thumbnailUrl}
      alt={`Thumbnail for ${video.title}`}
      onError={() => setImageFailed(true)}
      className="size-full object-cover"
    />
  );
  const pill = 'absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md bg-background px-4 py-2 text-[14px] leading-5 font-medium tracking-[-0.084px] whitespace-nowrap text-foreground shadow-md';
  const frame = 'relative block aspect-[16/7] w-full cursor-pointer overflow-hidden bg-primary';

  return (
    <section aria-label="One-shot video" className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {playing && canEmbed ? (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="block size-full border-0"
          />
        </div>
      ) : canEmbed ? (
        <button type="button" className={frame} onClick={() => setPlaying(true)}>
          {thumbnail}
          <span className={pill}><Play className="size-4" />Play</span>
        </button>
      ) : (
        <a className={frame} href={video.videoUrl} target="_blank" rel="noreferrer">
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
    </section>
  );
}
