import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from './ConfirmProvider';

function TestHarness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: 'Confirmar?',
          description: 'Descrição teste',
          confirmLabel: 'Sim',
        });
        onResult(ok);
      }}
    >
      Abrir
    </button>
  );
}

describe('ConfirmProvider', () => {
  it('resolves true when user confirms', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <TestHarness onResult={onResult} />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByText('Confirmar?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves false when user cancels', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <TestHarness onResult={onResult} />
      </ConfirmProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
