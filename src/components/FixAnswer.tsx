import { Check, X } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { partResults } from '../services/fixCheckService';
import type { FixResponse, NumericPart } from '../types';

/** Written answers need a real attempt before the marking points are shown. */
export const MIN_WRITTEN = 12;

/** One box per number. After marking, each box shows right or wrong and the expected value. */
export function NumericAnswer({
  parts,
  response,
  onChange,
  locked = false,
  showResult = false,
}: {
  parts: NumericPart[];
  response: FixResponse | undefined;
  onChange?: (r: FixResponse) => void;
  locked?: boolean;
  showResult?: boolean;
}) {
  const id = useId();
  const values = response?.values ?? parts.map(() => '');
  const results = showResult ? partResults(parts, values) : null;
  return (
    <div className={cn('grid gap-3', parts.length > 1 && 'sm:grid-cols-2')}>
      {parts.map((p, i) => (
        <div key={p.label} className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-${i}`} className="text-[14px] leading-5 font-medium text-foreground">{p.label}</label>
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-${i}`}
              inputMode="decimal"
              autoComplete="off"
              value={values[i] ?? ''}
              disabled={locked}
              placeholder="Type a number"
              onChange={(e) => onChange?.({ values: values.map((v, k) => (k === i ? e.target.value : v)) })}
              className={cn('max-w-[220px] bg-background tabular-nums', results && (results[i] ? 'border-good' : 'border-bad'))}
              data-testid="numeric-input"
            />
            {results && (results[i] ? <Check className="size-5 text-good" aria-label="Correct" /> : <X className="size-5 text-bad" aria-label="Not correct" />)}
          </div>
          {results && !results[i] && (
            <p className="text-[13px] leading-5 text-muted-foreground">Expected {p.answer.toLocaleString('en-IN', { maximumFractionDigits: 6 })}{p.unit ? ` ${p.unit}` : ''}</p>
          )}
        </div>
      ))}
      {!locked && parts.length === 1 && (
        <p className="text-[12px] leading-4 text-muted-foreground sm:col-span-2">Numbers like 0.6, −212.3, 1.8e-4 or 1.8 × 10^-4 all work. Keep the sign.</p>
      )}
    </div>
  );
}

/**
 * Write first, then compare with the marking points and tick the ones covered.
 * The marking points stay hidden until something real has been written.
 */
export function WrittenAnswer({
  keyPoints,
  response,
  onChange,
  locked = false,
}: {
  keyPoints: string[];
  response: FixResponse | undefined;
  onChange: (r: FixResponse) => void;
  locked?: boolean;
}) {
  const id = useId();
  const text = response?.text ?? '';
  const ticked = response?.ticked ?? [];
  const marked = Boolean(response?.marked);
  const toggle = (i: number) =>
    onChange({ ...response, text, marked: true, ticked: ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i].sort() });

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-[14px] leading-5 font-medium text-foreground">Your answer</label>
      <textarea
        id={id}
        value={text}
        disabled={marked || locked}
        onChange={(e) => onChange({ ...response, text: e.target.value })}
        rows={4}
        placeholder="Write it the way you would in the exam: the key steps, terms and reason."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-[15px] leading-6 text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-80"
        data-testid="written-input"
      />
      {!marked ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={text.trim().length < MIN_WRITTEN || locked}
          onClick={() => onChange({ ...response, text, marked: true, ticked: [] })}
          data-testid="mark-written"
        >
          Compare with the marking points
        </Button>
      ) : (
        <fieldset className="rounded-lg border border-border bg-muted/40 p-3" data-testid="marking-points">
          <legend className="px-1 text-[13px] leading-5 font-semibold text-foreground">Tick each point your answer covers</legend>
          <ul className="flex flex-col gap-2">
            {keyPoints.map((p, i) => (
              <li key={p}>
                <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-5 text-foreground">
                  <input
                    type="checkbox"
                    checked={ticked.includes(i)}
                    disabled={locked}
                    onChange={() => toggle(i)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--inferentics-brand-primary)]"
                    data-testid="marking-point"
                  />
                  {p}
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-4 text-muted-foreground">Be honest: this check only helps if it matches what you'd get in the exam.</p>
        </fieldset>
      )}
    </div>
  );
}
