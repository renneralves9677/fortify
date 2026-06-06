export type DashboardPeriodPreset = '6m' | '3m' | 'this-month' | 'last-month';

export type DashboardPeriod = {
  preset: DashboardPeriodPreset;
  from: string;
  to: string;
  months: number;
};

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildDashboardPeriod(preset: DashboardPeriodPreset): DashboardPeriod {
  const now = new Date();
  if (preset === 'this-month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { preset, from: fmt(from), to: fmt(to), months: 1 };
  }
  if (preset === 'last-month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { preset, from: fmt(from), to: fmt(to), months: 1 };
  }
  const months = preset === '3m' ? 3 : 6;
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return { preset, from: fmt(from), to: fmt(now), months };
}

export const PERIOD_PRESET_LABELS: Record<DashboardPeriodPreset, string> = {
  '6m': 'Últimos 6 meses',
  '3m': 'Últimos 3 meses',
  'this-month': 'Este mês',
  'last-month': 'Mês anterior',
};
