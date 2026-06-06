import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { ShadcnButton, type ShadcnButtonProps } from './shadcn-button';

type LegacyVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantMap: Record<LegacyVariant, ShadcnButtonProps['variant']> = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LegacyVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const shadcnSize = size === 'md' ? 'default' : size;
  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size={shadcnSize}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </ShadcnButton>
  );
}

export { buttonVariants } from './shadcn-button';
