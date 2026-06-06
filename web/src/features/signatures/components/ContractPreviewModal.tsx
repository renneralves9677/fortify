import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/Button';
import { DocumentViewer } from './DocumentViewer';

interface ContractPreviewModalProps {
  open: boolean;
  title: string;
  html: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  loading?: boolean;
  description?: string;
}

export function ContractPreviewModal({
  open,
  title,
  html,
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar e continuar',
  loading,
  description = 'Revise o documento antes de continuar.',
}: ContractPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          <DocumentViewer html={html} />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {onConfirm ? 'Voltar' : 'Fechar'}
          </Button>
          {onConfirm && (
            <Button onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
