import { ChevronDown, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface PdfChoice {
  label: string;
  hint?: string;
  run: () => Promise<void>;
}

/** A Download PDF button. With several choices it opens a small menu. Shows progress and a retry note on failure. */
export function DownloadPdfButton({ choices, disabled }: { choices: PdfChoice[]; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = async (choice: PdfChoice) => {
    setBusy(true);
    setFailed(false);
    try {
      await choice.run();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const icon = busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />;
  const label = busy ? 'Preparing PDF…' : 'Download PDF';

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {choices.length === 1 ? (
        <Button variant="outline" disabled={disabled || busy} onClick={() => go(choices[0])} data-testid="download-pdf">
          {icon}{label}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={disabled || busy} data-testid="download-pdf">
              {icon}{label}<ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            {choices.map((c) => (
              <DropdownMenuItem key={c.label} onSelect={() => go(c)} className="flex flex-col items-start gap-0">
                <span className="font-medium">{c.label}</span>
                {c.hint && <span className="text-[12px] leading-4 text-muted-foreground">{c.hint}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {failed && <span role="alert" className="text-[12px] leading-4 text-destructive">Couldn't make the PDF. Check your connection and try again.</span>}
    </span>
  );
}
