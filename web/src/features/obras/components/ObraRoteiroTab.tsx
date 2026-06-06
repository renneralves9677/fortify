import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { Input, Textarea } from '@shared/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { useConfirm } from '@shared/components/ConfirmProvider';
import { ListLoadingOverlay } from '@shared/components/ui/ListLoadingOverlay';
import type { ObraStep } from '@features/obras/types';

type Props = {
  obraId: string;
  steps: ObraStep[];
  canEdit: boolean;
  loading?: boolean;
};

function SortableStepRow({
  step,
  canEdit,
  onComplete,
  onDelete,
  completing,
}: {
  step: ObraStep;
  canEdit: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  completing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-control bg-surface-sunken px-3 py-2"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {canEdit && (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab text-ink-muted hover:text-ink active:cursor-grabbing"
            aria-label="Reordenar etapa"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        )}
        <div className="min-w-0">
          <p className={step.done ? 'line-through text-ink-muted' : 'font-medium'}>{step.title}</p>
          {step.description && (
            <p className={`mt-0.5 text-sm ${step.done ? 'line-through text-ink-muted' : 'text-ink-muted'}`}>
              {step.description}
            </p>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-2">
          {!step.done && (
            <Button size="sm" loading={completing} onClick={() => onComplete(step.id)}>
              Concluir
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            aria-label="Remover etapa"
            onClick={() => onDelete(step.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </li>
  );
}

export function ObraRoteiroTab({ obraId, steps, canEdit, loading = false }: Props) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [localSteps, setLocalSteps] = useState(steps);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  const sortedSteps = [...localSteps].sort((a, b) => a.sortOrder - b.sortOrder);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['obra', obraId] });
    qc.invalidateQueries({ queryKey: ['obra-audit', obraId] });
  };

  const createStep = useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      api.post(`/obras/${obraId}/steps`, body),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
    },
    meta: { successMessage: 'Etapa criada' },
  });

  const updateStep = useMutation({
    mutationFn: ({ stepId, done }: { stepId: string; done: boolean }) =>
      api.patch(`/obras/${obraId}/steps/${stepId}`, { done }),
    onSuccess: invalidate,
    meta: { successMessage: 'Etapa atualizada' },
  });

  const reorderSteps = useMutation({
    mutationFn: (stepIds: string[]) =>
      api.put(`/obras/${obraId}/steps/reorder`, { stepIds }),
    onSuccess: invalidate,
  });

  const deleteStep = useMutation({
    mutationFn: (stepId: string) => api.delete(`/obras/${obraId}/steps/${stepId}`),
    onSuccess: invalidate,
    meta: { successMessage: 'Etapa removida' },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedSteps.findIndex((s) => s.id === active.id);
    const newIndex = sortedSteps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sortedSteps, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sortOrder: i + 1,
    }));

    setLocalSteps(reordered);
    reorderSteps.mutate(reordered.map((s) => s.id));
  }

  async function handleDelete(stepId: string) {
    const step = sortedSteps.find((s) => s.id === stepId);
    const ok = await confirm({
      title: 'Remover etapa?',
      description: `A etapa "${step?.title}" será removida permanentemente.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    });
    if (ok) {
      setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
      deleteStep.mutate(stepId);
    }
  }

  return (
    <ListLoadingOverlay loading={loading}>
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Etapas do roteiro de obra</p>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Nova etapa
          </Button>
        )}
      </div>

      {!sortedSteps.length ? (
        <p className="text-sm text-ink-muted">Nenhuma etapa cadastrada.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {sortedSteps.map((step) => (
                <SortableStepRow
                  key={step.id}
                  step={step}
                  canEdit={canEdit}
                  completing={updateStep.isPending}
                  onComplete={(id) => updateStep.mutate({ stepId: id, done: true })}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova etapa</DialogTitle>
            <DialogDescription>Adicione uma etapa ao roteiro da obra.</DialogDescription>
          </DialogHeader>
          <form
            id="step-form"
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createStep.mutate({
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
              });
            }}
          >
            <Input
              label="Título"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex.: Instalação elétrica"
            />
            <Textarea
              label="Descrição (opcional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Detalhes ou observações sobre a etapa"
            />
          </form>
          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="step-form" loading={createStep.isPending}>
              Criar etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </ListLoadingOverlay>
  );
}
