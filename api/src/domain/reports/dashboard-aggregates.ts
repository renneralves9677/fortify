export type MonthlyCountValue = {
  month: string;
  label: string;
  count: number;
  value: number;
};

export type MonthlyObraSpend = {
  month: string;
  label: string;
  custos: number;
  obras: number;
};

export type CategoryShare = {
  label: string;
  amount: number;
  sharePct: number;
};

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthSeries(monthKeys: string[]): string[] {
  return [...monthKeys].sort();
}

export function lastNMonthKeys(count: number, anchor = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    keys.push(monthKeyFromDate(d));
  }
  return keys;
}

export function monthKeysFromRange(range: { from?: string; to?: string }, fallbackMonths: number): string[] {
  if (!range.from || !range.to) return lastNMonthKeys(fallbackMonths);
  const from = new Date(`${range.from}T12:00:00`);
  const to = new Date(`${range.to}T12:00:00`);
  const keys: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    keys.push(monthKeyFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys.length ? keys : lastNMonthKeys(fallbackMonths);
}

export type ContractDashboardPeriodRow = {
  createdAt: Date;
  signedAt?: Date | null;
  startDate?: Date | null;
  value: { toString(): string };
};

export function contractDashboardReferenceDate(row: {
  createdAt: Date;
  signedAt?: Date | null;
  startDate?: Date | null;
}): Date {
  return new Date(row.signedAt ?? row.startDate ?? row.createdAt);
}

export function dateKeyFromLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isDateWithinDashboardRange(
  date: Date,
  range: { from?: string | null; to?: string | null },
): boolean {
  if (!range.from && !range.to) return true;
  const key = dateKeyFromLocalDate(date);
  if (range.from && key < range.from) return false;
  if (range.to && key > range.to) return false;
  return true;
}

export function filterContractsInDashboardPeriod<T extends ContractDashboardPeriodRow>(
  rows: T[],
  range: { from?: string | null; to?: string | null },
): T[] {
  return rows.filter((row) =>
    isDateWithinDashboardRange(contractDashboardReferenceDate(row), range),
  );
}

export function aggregateContractsMonthly(
  rows: ContractDashboardPeriodRow[],
  monthKeys: string[],
): MonthlyCountValue[] {
  const countMap = new Map<string, number>();
  const valueMap = new Map<string, number>();
  for (const key of monthKeys) {
    countMap.set(key, 0);
    valueMap.set(key, 0);
  }
  for (const row of rows) {
    const key = monthKeyFromDate(contractDashboardReferenceDate(row));
    if (!countMap.has(key)) continue;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
    valueMap.set(key, (valueMap.get(key) ?? 0) + Number(row.value));
  }
  return monthKeys.map((month) => ({
    month,
    label: formatMonthLabel(month),
    count: countMap.get(month) ?? 0,
    value: valueMap.get(month) ?? 0,
  }));
}

export function aggregateObrasMonthly(
  custos: { date: Date; amount: { toString(): string } }[],
  obras: { createdAt: Date }[],
  monthKeys: string[],
): MonthlyObraSpend[] {
  const custoMap = new Map<string, number>();
  const obraMap = new Map<string, number>();
  for (const key of monthKeys) {
    custoMap.set(key, 0);
    obraMap.set(key, 0);
  }
  for (const row of custos) {
    const key = monthKeyFromDate(new Date(row.date));
    if (!custoMap.has(key)) continue;
    custoMap.set(key, (custoMap.get(key) ?? 0) + Number(row.amount));
  }
  for (const row of obras) {
    const key = monthKeyFromDate(new Date(row.createdAt));
    if (!obraMap.has(key)) continue;
    obraMap.set(key, (obraMap.get(key) ?? 0) + 1);
  }
  return monthKeys.map((month) => ({
    month,
    label: formatMonthLabel(month),
    custos: custoMap.get(month) ?? 0,
    obras: obraMap.get(month) ?? 0,
  }));
}

export function aggregateCategoryShares(
  rows: { category: string; amount: { toString(): string } }[],
  categoryLabels: Record<string, string>,
): CategoryShare[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = categoryLabels[row.category] ?? row.category;
    map.set(label, (map.get(label) ?? 0) + Number(row.amount));
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([label, amount]) => ({
      label,
      amount,
      sharePct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
