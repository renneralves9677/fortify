import { useEffect, useState } from 'react';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { Input, Select } from '@shared/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { roleLabels, type UserRole } from '@shared/lib/roles';
import { formatDateTime } from '@shared/lib/format';
import type { UpdateUserPayload, UserRow } from '@features/users/api/users';

type UserEditModalProps = {
  user: UserRow | null;
  open: boolean;
  canEdit: boolean;
  roleOptions: { value: UserRole; label: string }[];
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (id: string, payload: UpdateUserPayload) => void;
};

function roleBadgeLabel(user: UserRow) {
  if (user.isOwner) return `${roleLabels[user.role]} · Owner`;
  return roleLabels[user.role] ?? user.role;
}

export function UserEditModal({
  user,
  open,
  canEdit,
  roleOptions,
  saving = false,
  error: externalError,
  onClose,
  onSave,
}: UserEditModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [active, setActive] = useState(true);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!user || !open) return;
    setName(user.name);
    setRole(user.role);
    setActive(user.active);
    setLocalError('');
  }, [user, open]);

  if (!user) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) {
      onClose();
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      setLocalError('Informe um nome com ao menos 2 caracteres');
      return;
    }
    const payload: UpdateUserPayload = {};
    if (name.trim() !== user.name) payload.name = name.trim();
    if (role !== user.role) payload.role = role;
    if (active !== user.active) payload.active = active;
    if (!Object.keys(payload).length) {
      onClose();
      return;
    }
    onSave(user.id, payload);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canEdit ? 'Editar usuário' : 'Detalhes do usuário'}</DialogTitle>
          <DialogDescription>
            {canEdit
              ? 'Atualize nome, perfil ou status do acesso.'
              : 'Visualização somente leitura deste usuário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={user.active ? 'success' : 'muted'} label={user.active ? 'Ativo' : 'Inativo'} />
            <Badge variant="muted" label={roleBadgeLabel(user)} />
          </div>

          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            required
          />
          <Input label="E-mail" type="email" value={user.email} disabled readOnly />
          <Select
            label="Perfil"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={!canEdit}
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={active ? 'active' : 'inactive'}
            onChange={(e) => setActive(e.target.value === 'active')}
            disabled={!canEdit}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>

          <p className="text-xs text-ink-muted">
            Cadastrado em {formatDateTime(user.createdAt)}
            {user.isOwner && ' · Conta dona da empresa'}
          </p>

          {(localError || externalError) && (
            <p className="text-sm text-danger">{localError || externalError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              {canEdit ? 'Cancelar' : 'Fechar'}
            </Button>
            {canEdit && (
              <Button type="submit" loading={saving}>
                Salvar alterações
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
