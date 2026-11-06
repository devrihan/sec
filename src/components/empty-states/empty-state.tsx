import type { ReactNode } from 'react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

// One illustration, a short title, one line of help and at most one action —
// the rule the Figma "Empty states" page sets for every empty, no-result and
// error state. Built on ui/empty so every state shares the same structure;
// named states (NoAnswerImage, …) are thin wrappers that fix the wording.
export interface EmptyStateProps {
  /** Path to an illustration under /public/illustrations. */
  illustration?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  /** 'inline' sits inside a table, chart, image slot or dropdown; 'page'
   * fills a card or a whole page. */
  variant?: 'inline' | 'page'
  className?: string
}

export function EmptyState({ illustration, title, description, action, variant = 'inline', className }: EmptyStateProps) {
  const inline = variant === 'inline'
  return (
    <Empty
      className={cn(
        inline
          ? 'min-h-0 gap-2 p-0 rounded-none'
          : 'min-h-[340px] gap-4 px-10 border border-border rounded-xl bg-white',
        className,
      )}
    >
      <EmptyHeader className={inline ? 'gap-2 max-w-[260px]' : 'gap-3 max-w-[320px]'}>
        {illustration && (
          // Natural size: each illustration's SVG carries its own width/height.
          <EmptyMedia variant="icon" className="size-auto">
            <img src={illustration} alt="" />
          </EmptyMedia>
        )}
        <EmptyTitle className={inline ? 'text-[14px] font-medium leading-5 text-foreground' : 'text-[18px] font-medium leading-7 text-foreground'}>
          {title}
        </EmptyTitle>
        {description && (
          <EmptyDescription className={inline ? 'text-[12px] leading-4' : 'text-[14px] leading-5'}>
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
