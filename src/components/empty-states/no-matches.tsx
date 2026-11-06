import { EmptyState } from './empty-state'

/** A search inside a table or dropdown that matched nothing: text only, no
 * illustration — the inline counterpart of NoSearchResults. `noun` is the
 * plural of what was searched ("questions", "subjects"). Pass `filtered` when
 * filters are narrowing the list, so the message points at them rather than
 * suggesting the item doesn't exist at all. */
export function NoMatches({
  query,
  noun,
  hint,
  filtered = false,
  className,
}: { query: string; noun: string; hint?: string; filtered?: boolean; className?: string }) {
  const title = `No ${noun} match “${query.trim()}”`
  return (
    <EmptyState
      title={filtered ? `${title} in the selected filters` : title}
      description={hint ?? (filtered ? 'Try changing or clearing the filters.' : 'Try another name.')}
      className={className}
    />
  )
}
