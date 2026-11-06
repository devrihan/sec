import { cn } from '@/lib/utils';

export type SectionAverageVariant = 'good' | 'warning' | 'danger';

const VARIANT = {
  good: { bg: 'bg-[#EAF4EE]', valueColor: 'text-[#008138]' },
  warning: { bg: 'bg-[#fffcf0]', valueColor: 'text-[#dc7609]' },
  danger: { bg: 'bg-[#fff0f0]', valueColor: 'text-[#e76e4f]' },
} as const;

/** Loam's tinted hero metric. Its trend row is left out because nothing here compares exams. */
export function SectionAverageCard({
  label,
  value,
  suffix = '%',
  variant = 'good',
  className,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  variant?: SectionAverageVariant;
  className?: string;
}) {
  const { bg, valueColor } = VARIANT[variant];
  return (
    <div className={cn('flex flex-col rounded-xl px-6 py-4 outline outline-1 outline-offset-[-1px] outline-gray-200', bg, className)}>
      <div className="flex flex-1 flex-col items-start gap-2">
        <p className="text-base leading-6 font-normal text-foreground">{label}</p>
        <p className={cn('text-5xl leading-[48px] font-bold tabular-nums', valueColor)}>{value}{suffix}</p>
      </div>
    </div>
  );
}
