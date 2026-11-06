import { badgeById } from '../services/catalog';

export function BadgePill({ badgeId }: { badgeId: string | null }) {
  const badge = badgeId ? badgeById(badgeId) : null;
  if (!badge) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground">
      <img src={badge.imageUrl} alt="" width={20} height={20} />
      {badge.name}
    </span>
  );
}
