import { Link } from 'react-router-dom';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  termsVersion: string;
  privacyVersion: string;
}

export function ConsentCheckbox({
  checked,
  onChange,
  termsVersion,
  privacyVersion,
}: ConsentCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-ink-muted">
        Li e concordo com os{' '}
        <Link to="/termos" target="_blank" className="text-brand underline">
          Termos de Uso
        </Link>{' '}
        (v{termsVersion}) e a{' '}
        <Link to="/privacidade" target="_blank" className="text-brand underline">
          Política de Privacidade
        </Link>{' '}
        (v{privacyVersion}).
      </span>
    </label>
  );
}
