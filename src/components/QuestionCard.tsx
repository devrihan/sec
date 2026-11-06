import { cn } from '@/lib/utils';
import type { Question, QuestionOption } from '../types';

const LETTERS = ['A', 'B', 'C', 'D'];

interface OptionsProps {
  question: Question;
  options?: QuestionOption[];
  selectedId: string | null;
  /** Shows the answer key and locks the options. */
  revealed?: boolean;
  disabled?: boolean;
  onSelect?: (optionId: string) => void;
  name: string;
}

const ROW: Record<string, string> = {
  idle: 'border-border bg-background hover:bg-muted/30',
  selected: 'border-primary bg-secondary',
  correct: 'border-good-edge bg-good-soft text-good',
  incorrect: 'border-bad/30 bg-bad-soft text-bad',
  locked: 'border-border bg-background text-muted-foreground',
};

const LETTER: Record<string, string> = {
  idle: 'border-border text-muted-foreground',
  selected: 'border-primary bg-primary text-primary-foreground',
  correct: 'border-[#008a2e] bg-[#008a2e] text-white',
  incorrect: 'border-[#e60000] bg-[#e60000] text-white',
  locked: 'border-border text-muted-foreground',
};

export function OptionList({ question, options, selectedId, revealed, disabled, onSelect, name }: OptionsProps) {
  const list = options ?? question.options;
  return (
    <fieldset className="grid min-w-0 gap-2" disabled={disabled || revealed}>
      <legend className="sr-only">Choose one answer</legend>
      {list.map((o, i) => {
        const selected = selectedId === o.id;
        const isCorrect = o.id === question.correctOptionId;
        let state = selected ? 'selected' : 'idle';
        if (revealed) state = isCorrect ? 'correct' : selected ? 'incorrect' : 'locked';
        return (
          <label
            key={o.id}
            data-testid="option"
            data-state={state}
            className={cn(
              'grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 has-[input:disabled]:cursor-default',
              ROW[state],
            )}
          >
            <input type="radio" name={name} checked={selected} onChange={() => onSelect?.(o.id)} className="sr-only" />
            <span aria-hidden="true" className={cn('flex size-6 items-center justify-center rounded-full border text-[12px] leading-4 font-medium', LETTER[state])}>
              {LETTERS[i]}
            </span>
            <span className="option-text min-w-0 text-[16px] leading-6">{o.text}</span>
            {revealed && isCorrect && <span className="text-[12px] leading-4 font-medium tracking-[-0.072px]">Correct answer</span>}
            {revealed && selected && !isCorrect && <span className="text-[12px] leading-4 font-medium tracking-[-0.072px]">Your answer</span>}
          </label>
        );
      })}
    </fieldset>
  );
}
