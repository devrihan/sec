import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setTheme, useTheme } from '../services/themeService';

/** An on/off switch for dark mode, available on every page from the header. */
export function ThemeToggle() {
  const theme = useTheme();
  const on = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Dark mode"
      data-testid="theme-toggle"
      onClick={() => setTheme(on ? 'light' : 'dark')}
      className={cn(
        'flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border p-0.5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        on ? 'bg-[#6366f1]' : 'bg-muted',
      )}
    >
      <span className={cn('flex size-[22px] items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform', on && 'translate-x-5')}>
        {on ? <Moon className="size-3.5" aria-hidden="true" /> : <Sun className="size-3.5" aria-hidden="true" />}
      </span>
    </button>
  );
}
