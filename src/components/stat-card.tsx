import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Loam's StatCard, with router links and test ids in place of analytics. */
interface StatCardProps {
  name: string;
  subtitle?: string;
  label: string;
  /** null renders "—". */
  avg: number | null;
  suffix?: string;
  valueDisplay?: string;
  trend?: string | null;
  trendDown?: boolean;
  href?: string;
  testId?: string;
}

export function StatCard({ name, subtitle, label, avg, suffix = '', valueDisplay, trend, trendDown = false, href, testId }: StatCardProps) {
  const card = (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 transition-shadow hover:shadow-md" data-testid={href ? undefined : testId}>
      <CardContent className="p-0">
        <div className="p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="cursor-default overflow-hidden text-[18px] leading-[28px] font-medium tracking-[-0.108px] text-ellipsis whitespace-nowrap text-foreground">
                {name}
              </p>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-wrap">{name}</TooltipContent>
          </Tooltip>
          {subtitle && <p className="truncate text-[16px] leading-[24px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-end justify-between px-4 pt-0 pb-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-[14px] leading-[20px] text-muted-foreground">{label}</p>
            <div className="flex items-center gap-1">
              <span className="text-[30px] leading-[36px] font-semibold tracking-[-0.225px] text-foreground tabular-nums">
                {valueDisplay ?? (avg === null ? '—' : `${avg}${suffix}`)}
              </span>
              {trend && (
                <span className={`flex items-center gap-1 text-[12px] leading-4 tracking-[-0.072px] ${trendDown ? 'text-red-700' : 'text-green-700'}`}>
                  {trendDown ? <ArrowDownRight className="size-5 shrink-0" /> : <ArrowUpRight className="size-5 shrink-0" />}
                  {trend}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 py-1 text-muted-foreground">
            <ArrowRight className="size-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link to={href} className="block rounded-xl" data-testid={testId}>{card}</Link>;
  return card;
}
