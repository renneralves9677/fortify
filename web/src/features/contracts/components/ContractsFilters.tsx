import { Button } from '@shared/components/ui/Button';
import { Input, Select } from '@shared/components/ui/Input';
import { statusLabels } from '@shared/lib/format';
import {
  contractStatusOptions,
  contractTypeLabels,
  type ContractStatus,
  type ContractType,
  type ContractsFilterValues,
} from '@features/contracts/api/contracts';

type ContractsFiltersProps = {
  values: ContractsFilterValues;
  onChange: (values: ContractsFilterValues) => void;
};

const CONTRACT_TYPES = Object.keys(contractTypeLabels) as ContractType[];

function hasActiveFilters(values: ContractsFilterValues) {
  return Boolean(
    values.status ||
      values.type ||
      values.title?.trim() ||
      values.partyName?.trim() ||
      values.periodFrom ||
      values.periodTo,
  );
}

export function ContractsFilters({ values, onChange }: ContractsFiltersProps) {
  function update(patch: Partial<ContractsFilterValues>) {
    onChange({ ...values, ...patch });
  }

  function clear() {
    onChange({});
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Select
        label="Status"
        value={values.status ?? ''}
        onChange={(e) =>
          update({ status: (e.target.value || undefined) as ContractStatus | undefined })
        }
      >
        <option value="">Todos</option>
        {contractStatusOptions.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </Select>

      <Select
        label="Tipo"
        value={values.type ?? ''}
        onChange={(e) => update({ type: (e.target.value || undefined) as ContractType | undefined })}
      >
        <option value="">Todos</option>
        {CONTRACT_TYPES.map((t) => (
          <option key={t} value={t}>
            {contractTypeLabels[t]}
          </option>
        ))}
      </Select>

      <Input
        label="Título"
        type="search"
        placeholder="Filtrar por título…"
        value={values.title ?? ''}
        onChange={(e) => update({ title: e.target.value || undefined })}
      />

      <Input
        label="Nome / Parte"
        type="search"
        placeholder="Filtrar por parte…"
        value={values.partyName ?? ''}
        onChange={(e) => update({ partyName: e.target.value || undefined })}
      />

      <Input
        label="Vigência de"
        type="date"
        value={values.periodFrom ?? ''}
        onChange={(e) => update({ periodFrom: e.target.value || undefined })}
      />

      <Input
        label="Vigência até"
        type="date"
        value={values.periodTo ?? ''}
        onChange={(e) => update({ periodTo: e.target.value || undefined })}
      />

      {hasActiveFilters(values) && (
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <Button type="button" variant="secondary" size="sm" onClick={clear}>
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
