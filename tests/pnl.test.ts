import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ingestTransactions } from '../src/services/parser';
import { classifyByRules, classifyFallback } from '../src/services/classifier';
import { calculateMonthlyPL, getEffectiveTransactions } from '../src/services/pnl';
import { Classification, ClassificationRule } from '../src/types/accounting';

describe('P&L Engine & Golden Values Verification', () => {
  const csvPath = path.resolve(__dirname, '../data/NYC_Restaurant_Co__-_Raw_Transactions.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const { transactions } = ingestTransactions(csvContent);

  // Classify all 181 transactions by rules
  const classifications = new Map<string, Classification>();
  for (const t of transactions) {
    const cls = classifyByRules(t) || classifyFallback(t);
    classifications.set(t.id, cls);
  }

  const effectiveTxns = getEffectiveTransactions(transactions, classifications);

  it('Jan 2026 matches golden P&L values exactly', () => {
    const pnl = calculateMonthlyPL('2026-01', effectiveTxns);

    expect(pnl.grossRevenue).toBe(128821.61);
    expect(pnl.refunds).toBe(-2422.52);
    expect(pnl.netRevenue).toBe(126399.09);
    expect(pnl.totalCogs).toBe(45715.56);
    expect(pnl.grossProfit).toBe(80683.53);
    expect(pnl.totalPayroll).toBe(41757.07);
    expect(pnl.totalOpex).toBe(24455.93);
    expect(pnl.operatingProfit).toBe(14470.53);

    // Excluded section: oven 7800 + sales tax 6150 = -13950
    expect(pnl.excludedSection.total).toBe(-13950.00);

    // Reconciliation invariant
    expect(pnl.isReconciled).toBe(true);
    expect(pnl.reconciliationDiff).toBe(0);
  });

  it('Feb 2026 matches golden P&L values exactly', () => {
    const pnl = calculateMonthlyPL('2026-02', effectiveTxns);

    expect(pnl.grossRevenue).toBe(127569.49);
    expect(pnl.refunds).toBe(-1952.20);
    expect(pnl.netRevenue).toBe(125617.29);
    expect(pnl.totalCogs).toBe(48779.35);
    expect(pnl.grossProfit).toBe(76837.94);
    expect(pnl.totalPayroll).toBe(44870.99);
    expect(pnl.totalOpex).toBe(25958.99);
    expect(pnl.operatingProfit).toBe(6007.96);

    // Excluded section: gift card +2400 and loan -3500 = -1100
    expect(pnl.excludedSection.total).toBe(-1100.00);
    const giftCardItem = pnl.excludedSection.items.find((i) => i.id.startsWith('liab_gift_cards'));
    expect(giftCardItem?.amount).toBe(2400.00);
    const loanItem = pnl.excludedSection.items.find((i) => i.id.startsWith('fin_loan_principal'));
    expect(loanItem?.amount).toBe(-3500.00);

    // Reconciliation invariant
    expect(pnl.isReconciled).toBe(true);
    expect(pnl.reconciliationDiff).toBe(0);
  });

  it('Mar 2026 matches golden P&L values exactly', () => {
    const pnl = calculateMonthlyPL('2026-03', effectiveTxns);

    expect(pnl.grossRevenue).toBe(154122.87);
    expect(pnl.refunds).toBe(-3587.80);
    expect(pnl.netRevenue).toBe(150535.07);
    expect(pnl.totalCogs).toBe(54176.44);
    expect(pnl.grossProfit).toBe(96358.63);
    expect(pnl.totalPayroll).toBe(50729.81);
    expect(pnl.totalOpex).toBe(26776.68);
    expect(pnl.operatingProfit).toBe(18852.14);

    // Excluded section: owner distribution -5000
    expect(pnl.excludedSection.total).toBe(-5000.00);

    // Reconciliation invariant
    expect(pnl.isReconciled).toBe(true);
    expect(pnl.reconciliationDiff).toBe(0);
  });

  it('Flow-through test: reclassifying T1181 as prepaid raises March operating profit by exactly 900.00', () => {
    // Initial March P&L
    const initialMarch = calculateMonthlyPL('2026-03', effectiveTxns);
    expect(initialMarch.operatingProfit).toBe(18852.14);

    // Create modified classifications where T1181 is BALANCE_SHEET_ASSET (prepaid asset)
    const modifiedClassifications = new Map(classifications);
    const existing = modifiedClassifications.get('T1181')!;
    modifiedClassifications.set('T1181', {
      ...existing,
      category_id: 'bs_equipment', // or any non-PNL asset
      treatment: 'BALANCE_SHEET_ASSET',
      rationale: 'User reclassified annual license to prepaid balance sheet asset',
      source: 'user',
      updated_at: new Date().toISOString(),
    });

    const updatedTxns = getEffectiveTransactions(transactions, modifiedClassifications);
    const updatedMarch = calculateMonthlyPL('2026-03', updatedTxns);

    // March operating profit must be exactly 18852.14 + 900.00 = 19752.14
    expect(updatedMarch.operatingProfit).toBe(19752.14);
    expect(Math.round((updatedMarch.operatingProfit - initialMarch.operatingProfit) * 100) / 100).toBe(900.00);

    // March excluded section now includes the -900
    expect(updatedMarch.excludedSection.total).toBe(-5900.00);

    // Still perfectly reconciled to cash
    expect(updatedMarch.isReconciled).toBe(true);
  });
});
