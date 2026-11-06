import { UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AvatarCrop } from '../avatar3d/options';
import { avatarKey } from '../avatar3d/options';
import { cachedSnapshot, renderSnapshot } from '../avatar3d/snapshot';
import type { AvatarConfig } from '../types';

/** A small render of a student's 3D avatar, for lists where a live canvas per row is too heavy. */
export function AvatarImage({
  config,
  crop = 'head',
  className,
  alt = '',
  testId,
}: {
  config: AvatarConfig;
  crop?: AvatarCrop;
  className?: string;
  alt?: string;
  testId?: string;
}) {
  const key = `${crop}:${avatarKey(config)}`;
  const [state, setState] = useState<{ key: string; url: string | null; failed: boolean }>({ key, url: cachedSnapshot(config, crop) ?? null, failed: false });
  const current = state.key === key ? state : { key, url: cachedSnapshot(config, crop) ?? null, failed: false };

  useEffect(() => {
    if (current.url) return undefined;
    let live = true;
    renderSnapshot(config, crop)
      .then((url) => { if (live) setState({ key, url, failed: false }); })
      .catch(() => { if (live) setState({ key, url: null, failed: true }); });
    return () => { live = false; };
    // The key already captures every field of the config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, current.url]);

  const shared = cn('rounded-full bg-muted', className);
  if (current.failed) {
    return <span className={cn(shared, 'flex items-center justify-center text-muted-foreground')}><UserRound className="size-1/2" /></span>;
  }
  if (!current.url) return <Skeleton className={shared} />;
  return <img src={current.url} alt={alt} className={shared} data-avatar={config.top} data-testid={testId} />;
}
