import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'

/** A search that matched nothing in a list that does have rows. */
export function NoSearchResults({
  query,
  onClear,
  className,
}: { query: string; onClear?: () => void; className?: string }) {
  return (
    <EmptyState
      variant="page"
      illustration="/illustrations/no-search-results.svg"
      title={`No results for “${query.trim()}”`}
      description="Check the spelling or try a different word."
      action={
        onClear && (
          <Button variant="outline" onClick={onClear} className="h-auto px-3.5 py-2 rounded-lg shadow-none text-[14px]">
            Clear search
          </Button>
        )
      }
      className={className}
    />
  )
}
