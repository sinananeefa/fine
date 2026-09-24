import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ingestTransactions } from '../src/services/parser';
import { classifyByRules, classifyFallback } from '../src/services/classifier';
import { calculateMonthlyPL, getEffectiveTransactions } from '../src/services/pnl';
import { calculateVariance, checkMateriality } from '../src/services/variance';
import { Classification } from '../src/types/accounting';

describe('Variance Engine & Materiality Drivers', () => {
  const csvPath = path.resolve(__dirname, '../data/NYC_Restaurant_Co__-_Raw_Transactions.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const { transactions } = ingestTransactions(csvContent);

  const classifications = new Map<string, Classification>();
  for (const t of transactions) {
    const cls = classifyByRules(t) || classifyFallback(t);
    classifications.set(t.id, cls);
  }

  const effectiveTxns = getEffectiveTransactions(transactions, classifications);

  const jan = calculateMonthlyPL('2026-01', effectiveTxns);
  const feb = calculateMonthlyPL('2026-02', effectiveTxns);
  const mar = calculateMonthlyPL('2026-03', effectiveTxns);

  it('computes Jan -> Feb variance accurately', () => {
    const reportJanFeb = calculateVariance(jan, feb, effectiveTxns);

    expect(reportJanFeb.priorMonth).toBe('2026-01');
    expect(reportJanFeb.currentMonth).toBe('2026-02');
    expect(reportJanFeb.priorWeeks).toBe(5);
    expect(reportJanFeb.currentWeeks).toBe(4);

    // Net revenue variance
    expect(reportJanFeb.netRevenueVariance.dollarChange).toBe(-781.80);

    // Operating profit dropped in Feb
    expect(reportJanFeb.operatingProfitVariance.dollarChange).toBe(-8462.57);
  });

  it('computes Feb -> Mar variance accurately and flags material lines', () => {
    const reportFebMar = calculateVariance(feb, mar, effectiveTxns);

    expect(reportFebMar.priorMonth).toBe('2026-02');
    expect(reportFebMar.currentMonth).toBe('2026-03');

    // Find material lines
    const materialLines = reportFebMar.lines.filter((l) => l.isMaterial);
    expect(materialLines.length).toBeGreaterThan(0);

    // Check food sales
    const foodSales = reportFebMar.lines.find((l) => l.id === 'rev_food');
    expect(foodSales).toBeDefined();
    expect(foodSales?.isMaterial).toBe(true);

    // Check hourly wages
    const hourlyWages = reportFebMar.lines.find((l) => l.id === 'payroll_hourly');
    expect(hourlyWages).toBeDefined();
    expect(hourlyWages?.isMaterial).toBe(true);

    // Check COGS food
    const cogsFood = reportFebMar.lines.find((l) => l.id === 'cogs_food');
    expect(cogsFood).toBeDefined();
    expect(cogsFood?.isMaterial).toBe(true);
  });

  it('verifies materiality logic thresholds', () => {
    // $1,200 change with 15% on $100k net rev -> material
    expect(checkMateriality(1200, 15, 100000).isMaterial).toBe(true);
    // $500 change with 50% on $100k net rev -> not material (under $1000 and under 1% of 100k = 1000)
    expect(checkMateriality(500, 50, 100000).isMaterial).toBe(false);
    // $1,500 change with 2% on $100k net rev -> material by 1% net rev rule
    expect(checkMateriality(1500, 2, 100000).isMaterial).toBe(true);
  });
});
