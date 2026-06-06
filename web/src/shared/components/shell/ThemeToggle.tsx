import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import type { ColorSchemePreference } from '@shared/lib/color-scheme';
import { useColorScheme } from '@shared/providers/ColorSchemeProvider';

const options: { value: ColorSchemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useColorScheme();

  return (
    <div
      className={cn('inline-flex shrink-0 rounded-control border border-border bg-muted p-0.5', className)}
      role="radiogroup"
      aria-label="Aparência"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
