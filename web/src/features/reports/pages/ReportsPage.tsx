import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@shared/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { DatePeriodFilter, type DatePeriodValue } from '@shared/components/reports/DatePeriodFilter';
import { ReportsContractsTab } from '@features/reports/components/ReportsContractsTab';
import { ReportsObrasTab } from '@features/reports/components/ReportsObrasTab';

const TABS = ['contratos', 'obras'] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'contratos';
  const [period, setPeriod] = useState<DatePeriodValue>({ from: '', to: '' });

  function setTab(next: Tab) {
    setParams(next === 'contratos' ? {} : { tab: next }, { replace: true });
  }

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Visualize contratos e obras por período e exporte em CSV, Excel ou PDF."
      />

      <div className="mb-4">
        <DatePeriodFilter value={period} onChange={setPeriod} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="obras">Obras</TabsTrigger>
        </TabsList>
        <TabsContent value="contratos" className="mt-4">
          <ReportsContractsTab period={period} />
        </TabsContent>
        <TabsContent value="obras" className="mt-4">
          <ReportsObrasTab period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
