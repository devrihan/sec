import { badgeById } from '../services/catalog';
import { BadgeMedal } from './BadgeMedal';

export function BadgePill({ badgeId }: { badgeId: string | null }) {
  const badge = badgeId ? badgeById(badgeId) : null;
  if (!badge) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">
      <BadgeMedal badge={badge} size={28} />
      {badge.name}
    </span>
  );
}
