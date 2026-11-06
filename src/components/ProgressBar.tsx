import { Progress } from '@/components/ui/progress';

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <Progress
      value={value}
      aria-label={label}
      className="h-2 bg-secondary [&_[data-slot=progress-indicator]]:bg-[var(--inferentics-brand-primary)]"
    />
  );
}
