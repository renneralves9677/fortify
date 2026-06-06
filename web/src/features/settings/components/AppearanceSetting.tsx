import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import type { ColorSchemePreference } from '@shared/lib/color-scheme';
import { useColorScheme } from '@shared/providers/ColorSchemeProvider';

const options: { value: ColorSchemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

export function AppearanceSetting() {
  const { preference, setPreference } = useColorScheme();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">Aparência</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o tema claro, escuro ou siga as preferências do sistema.
        </p>
      </div>

      <div
        className="inline-flex shrink-0 rounded-lg border border-border bg-muted p-1"
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
                'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
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
    </div>
  );
}
