import { Button, type Button as ButtonType } from './Button';

export function LoadingButton({
  loading,
  loadingText,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <Button loading={loading} {...props}>
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}

export type { ButtonType };
