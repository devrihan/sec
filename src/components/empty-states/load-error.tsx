import { Button } from '@/components/ui/button'
import { EmptyState } from './empty-state'

const DESCRIPTIONS = {
  network: 'Check your internet connection and try again.',
  // The request reached the server and it failed — "check your connection"
  // would send the reader after the wrong thing.
  server: 'Something went wrong on our side. Try again in a moment.',
} as const

/** A page whose data failed to load. `reason` picks the help line: 'network'
 * when the request never reached the server (ApiError status 0), 'server'
 * when it answered with an error. */
export function LoadError({
  onRetry,
  reason = 'network',
  className,
}: { onRetry: () => void; reason?: keyof typeof DESCRIPTIONS; className?: string }) {
  return (
    <EmptyState
      variant="page"
      illustration="/illustrations/load-error.svg"
      title="Couldn’t load this page"
      description={DESCRIPTIONS[reason]}
      action={
        <Button onClick={onRetry} className="h-auto px-3.5 py-2 rounded-lg text-[14px]">
          Try again
        </Button>
      }
      className={className}
    />
  )
}
