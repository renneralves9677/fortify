import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { DataTable } from '@shared/components/ui/DataTable';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { Select } from '@shared/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { useConfirm } from '@shared/components/ConfirmProvider';
import { useIsAdmin, useIsSuperAdmin, useUser } from '@/stores/auth-store';
import { roleLabels, type UserRole } from '@shared/lib/roles';
import { isValidEmail } from '@shared/lib/br-format';
import { createUser, deleteUser, listUsers, updateUser, type UserRow } from '@features/users/api/users';

function roleBadgeLabel(user: UserRow) {
  if (user.isOwner) return `${roleLabels[user.role]} · Owner`;
  return roleLabels[user.role] ?? user.role;
}

export default function UsersPage() {
  const currentUser = useUser();
  const isSuperAdmin = useIsSuperAdmin();
  const isAdmin = useIsAdmin();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [search]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'VIEWER' as UserRole,
  });
  const [formError, setFormError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const { data } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => listUsers({ page, pageSize: PAGE_SIZE, search }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', confirmPassword: '', role: 'VIEWER' });
      setFormError('');
      setConfirmPasswordError('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Não foi possível criar o usuário';
      setFormError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { active?: boolean } }) =>
      updateUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const items = data?.items ?? [];

  const roleOptions: { value: UserRole; label: string }[] = isSuperAdmin
    ? [
        { value: 'SUPER_ADMIN', label: 'Super Admin' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'VIEWER', label: 'Usuário' },
      ]
    : [{ value: 'VIEWER', label: 'Usuário' }];

  function canManageTarget(target: UserRow) {
    if (!isAdmin || target.isOwner || target.id === currentUser?.id) return false;
    if (isSuperAdmin) return true;
    return target.role === 'VIEWER' || target.role === 'OPERATOR';
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setConfirmPasswordError('');
    if (!form.name.trim() || !isValidEmail(form.email) || form.password.length < 8) {
      setFormError('Preencha nome, e-mail válido e senha com ao menos 8 caracteres');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem');
      return;
    }
    const { name, email, password, role } = form;
    createMutation.mutate({ name, email, password, role });
  }

  return (
    <div>
      <PageHeader
        title="Gestão de usuários"
        description="Multi-tenant por empresa"
        actions={
          isAdmin ? (
            <Button onClick={() => setModalOpen(true)}>Novo usuário</Button>
          ) : undefined
        }
      />
      <DataTable
        title="Usuários"
        count={data?.total ?? 0}
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar usuário…' }}
        pagination={
          data
            ? {
                page: data.page,
                totalPages: data.totalPages,
                total: data.total,
                pageSize: data.pageSize,
                onPageChange: setPage,
              }
            : undefined
        }
        columns={[
          { key: 'name', label: 'Nome' },
          { key: 'email', label: 'E-mail' },
          { key: 'role', label: 'Perfil' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Ações', className: 'text-right' },
        ]}
        rows={items.map((u) => ({
          name: <span className="font-medium text-ink">{u.name}</span>,
          email: u.email,
          role: <Badge variant="muted" label={roleBadgeLabel(u)} />,
          status: (
            <Badge
              variant={u.active ? 'success' : 'muted'}
              label={u.active ? 'Ativo' : 'Inativo'}
            />
          ),
          actions: canManageTarget(u) ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({ id: u.id, payload: { active: !u.active } })
                }
              >
                {u.active ? 'Inativar' : 'Reativar'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir usuário?',
                    description: `O usuário ${u.name} será removido da lista (histórico preservado).`,
                    confirmLabel: 'Excluir',
                    variant: 'destructive',
                  });
                  if (ok) deleteMutation.mutate(u.id);
                }}
              >
                Excluir
              </Button>
            </div>
          ) : (
            <span className="text-xs text-ink-muted">—</span>
          ),
        }))}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Crie um acesso para a sua empresa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="Senha"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              error={confirmPasswordError}
              required
            />
            <Select
              label="Perfil"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Criar usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
