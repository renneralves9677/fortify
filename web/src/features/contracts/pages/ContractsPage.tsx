import { Link } from 'react-router-dom';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Button } from '@shared/components/ui/Button';
import { useIsAdmin } from '@/stores/auth-store';
import { ContractsList } from '@features/contracts/components/ContractsList';

export default function ContractsPage() {
  const isAdmin = useIsAdmin();

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Listagem e gestão de contratos"
        actions={
          isAdmin ? (
            <Link to="/contratos/novo">
              <Button>Novo contrato</Button>
            </Link>
          ) : undefined
        }
      />
      <ContractsList />
    </div>
  );
}
