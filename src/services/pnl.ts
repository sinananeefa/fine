import {
  Transaction,
  Classification,
  Treatment,
  AccountingConventions,
  DEFAULT_CONVENTIONS,
  CATEGORY_MAP,
  CategoryDef,
  EffectiveTransaction,
} from '../types/accounting';

export interface PLLineItem {
  id: string;
  name: string;
  amount: number;
  transactionIds: string[];
  percentageOfNetRevenue?: number;
}

export interface PLSectionSummary {
  name: string;
  total: number;
  items: PLLineItem[];
  percentageOfNetRevenue?: number;
}

export interface ExcludedItem {
  id: string;
  name: string;
  treatment: Treatment;
  amount: number;
  transactionIds: string[];
  rationale: string;
}

export interface MonthlyPL {
  month: string; // '2026-01', '2026-02', '2026-03'
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  revenueSection: PLSectionSummary;
  cogsSection: PLSectionSummary;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  payrollSection: PLSectionSummary;
  totalPayroll: number;
  opexSection: PLSectionSummary;
  totalOpex: number;
  operatingProfit: number;
  operatingMarginPct: number;

  // Non-PNL Excluded
  excludedSection: {
    total: number;
    items: ExcludedItem[];
  };

  // Cash Reconciliation & Integrity Check
  totalClassifiedCash: number;
  totalRawCash: number;
  reconciliationDiff: number;
  isReconciled: boolean;

  // Metadata
  transactionCount: number;
  posWeeks: number; // 4 for Feb, 5 for Jan/Mar (including stub)
}

/**
 * Builds the effective transaction combining immutable raw transaction with classification and corrections.
 */
export function getEffectiveTransactions(
  transactions: Transaction[],
  classifications: Map<string, Classification>
): EffectiveTransaction[] {
  return transactions.map((txn) => {
    const cls = classifications.get(txn.id);
    const category = cls
      ? CATEGORY_MAP.get(cls.category_id) || CATEGORY_MAP.get('unclear')!
      : CATEGORY_MAP.get('unclear')!;

    const treatment = cls ? cls.treatment : 'UNCLEAR';
    const confidence = cls ? cls.confidence : 0;
    const source = cls ? cls.source : 'rule';
    const rationale = cls ? cls.rationale : 'Unclassified';
    const needs_review = cls ? cls.needs_review : true;
    const review_reason = cls ? cls.review_reason : 'Requires categorization';

    return {
      ...txn,
      category,
      treatment,
      confidence,
      source,
      rationale,
      needs_review,
      review_reason,
    };
  });
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Pure deterministic monthly P&L calculation.
 */
export function calculateMonthlyPL(
  month: string, // YYYY-MM
  effectiveTransactions: EffectiveTransaction[],
  conventions: AccountingConventions = DEFAULT_CONVENTIONS
): MonthlyPL {
  const monthTxns = effectiveTransactions.filter((t) => t.date.startsWith(month));

  let totalRawCash = 0;
  for (const t of monthTxns) {
    totalRawCash = round2(totalRawCash + t.amount);
  }

  // Buckets
  const revenueLines = new Map<string, { name: string; amount: number; ids: string[] }>();
  let refundsAmount = 0;
  const refundIds: string[] = [];

  const cogsLines = new Map<string, { name: string; amount: number; ids: string[] }>();
  const payrollLines = new Map<string, { name: string; amount: number; ids: string[] }>();
  const opexLines = new Map<string, { name: string; amount: number; ids: string[] }>();
  const excludedItemsMap = new Map<string, ExcludedItem>();

  for (const t of monthTxns) {
    const cat = t.category;

    if (t.treatment !== 'PNL') {
      // Excluded from P&L
      const key = `${cat.id}_${t.treatment}`;
      const existing = excludedItemsMap.get(key);
      if (existing) {
        existing.amount = round2(existing.amount + t.amount);
        existing.transactionIds.push(t.id);
      } else {
        excludedItemsMap.set(key, {
          id: key,
          name: cat.name,
          treatment: t.treatment,
          amount: t.amount,
          transactionIds: [t.id],
          rationale: t.rationale,
        });
      }
      continue;
    }

    // P&L item:
    // Determine section accounting for conventions
    let section = cat.section;

    if (cat.id === 'opex_delivery_comm' && !conventions.deliveryCommissionsInOpex) {
      // If configured as contra-revenue
      section = 'REVENUE';
    } else if (cat.id === 'cogs_packaging' && !conventions.packagingInCOGS) {
      // If configured as Opex
      section = 'OPEX';
    }

    if (section === 'REVENUE') {
      if (cat.id === 'rev_refunds' && conventions.refundsInContraRevenue) {
        refundsAmount = round2(refundsAmount + t.amount);
        refundIds.push(t.id);
      } else {
        const item = revenueLines.get(cat.id) || { name: cat.name, amount: 0, ids: [] };
        item.amount = round2(item.amount + t.amount);
        item.ids.push(t.id);
        revenueLines.set(cat.id, item);
      }
    } else if (section === 'COGS') {
      const item = cogsLines.get(cat.id) || { name: cat.name, amount: 0, ids: [] };
      // In bank transactions, COGS are negative outflows. We represent expenses as positive costs on P&L
      item.amount = round2(item.amount + Math.abs(t.amount));
      item.ids.push(t.id);
      cogsLines.set(cat.id, item);
    } else if (section === 'PAYROLL') {
      const item = payrollLines.get(cat.id) || { name: cat.name, amount: 0, ids: [] };
      item.amount = round2(item.amount + Math.abs(t.amount));
      item.ids.push(t.id);
      payrollLines.set(cat.id, item);
    } else if (section === 'OPEX') {
      const item = opexLines.get(cat.id) || { name: cat.name, amount: 0, ids: [] };
      item.amount = round2(item.amount + Math.abs(t.amount));
      item.ids.push(t.id);
      opexLines.set(cat.id, item);
    }
  }

  // Compute Revenue Totals
  let grossRevenue = 0;
  const revItems: PLLineItem[] = [];
  for (const [id, item] of revenueLines.entries()) {
    grossRevenue = round2(grossRevenue + item.amount);
    revItems.push({
      id,
      name: item.name,
      amount: item.amount,
      transactionIds: item.ids,
    });
  }

  // Net Revenue = Gross Revenue + Refunds (refunds is negative)
  const netRevenue = round2(grossRevenue + refundsAmount);

  // COGS Totals
  let totalCogs = 0;
  const cogsItems: PLLineItem[] = [];
  for (const [id, item] of cogsLines.entries()) {
    totalCogs = round2(totalCogs + item.amount);
    cogsItems.push({
      id,
      name: item.name,
      amount: item.amount,
      transactionIds: item.ids,
      percentageOfNetRevenue: netRevenue > 0 ? round2((item.amount / netRevenue) * 100) : 0,
    });
  }

  // Gross Profit
  const grossProfit = round2(netRevenue - totalCogs);
  const grossMarginPct = netRevenue > 0 ? round2((grossProfit / netRevenue) * 100) : 0;

  // Payroll Totals
  let totalPayroll = 0;
  const payrollItems: PLLineItem[] = [];
  for (const [id, item] of payrollLines.entries()) {
    totalPayroll = round2(totalPayroll + item.amount);
    payrollItems.push({
      id,
      name: item.name,
      amount: item.amount,
      transactionIds: item.ids,
      percentageOfNetRevenue: netRevenue > 0 ? round2((item.amount / netRevenue) * 100) : 0,
    });
  }

  // Opex Totals
  let totalOpex = 0;
  const opexItems: PLLineItem[] = [];
  for (const [id, item] of opexLines.entries()) {
    totalOpex = round2(totalOpex + item.amount);
    opexItems.push({
      id,
      name: item.name,
      amount: item.amount,
      transactionIds: item.ids,
      percentageOfNetRevenue: netRevenue > 0 ? round2((item.amount / netRevenue) * 100) : 0,
    });
  }

  // Operating Profit
  const operatingProfit = round2(grossProfit - totalPayroll - totalOpex);
  const operatingMarginPct = netRevenue > 0 ? round2((operatingProfit / netRevenue) * 100) : 0;

  // Excluded Section
  const excludedItems = Array.from(excludedItemsMap.values());
  let totalExcluded = 0;
  for (const item of excludedItems) {
    totalExcluded = round2(totalExcluded + item.amount);
  }

  // Total Classified Cash = Net Revenue (Gross Rev + Refunds) - Total COGS - Total Payroll - Total Opex + Total Excluded
  // Notice that in raw cash, expenses are negative.
  // So PNL cash = Net Revenue - Total COGS - Total Payroll - Total Opex = Operating Profit.
  // And Excluded cash = Total Excluded.
  // Therefore: Operating Profit + Total Excluded === Total Raw Cash Movement!
  const totalClassifiedCash = round2(operatingProfit + totalExcluded);
  const reconciliationDiff = round2(Math.abs(totalClassifiedCash - totalRawCash));
  const isReconciled = reconciliationDiff < 0.001;

  // POS weeks: Feb has 4 weeks, Jan & Mar have 5 weeks (including week 5 stub)
  const posWeeks = month === '2026-02' ? 4 : 5;

  return {
    month,
    grossRevenue,
    refunds: refundsAmount,
    netRevenue,
    revenueSection: {
      name: 'Revenue',
      total: grossRevenue,
      items: revItems,
    },
    cogsSection: {
      name: 'Cost of Goods Sold (COGS)',
      total: totalCogs,
      items: cogsItems,
      percentageOfNetRevenue: netRevenue > 0 ? round2((totalCogs / netRevenue) * 100) : 0,
    },
    totalCogs,
    grossProfit,
    grossMarginPct,
    payrollSection: {
      name: 'Payroll',
      total: totalPayroll,
      items: payrollItems,
      percentageOfNetRevenue: netRevenue > 0 ? round2((totalPayroll / netRevenue) * 100) : 0,
    },
    totalPayroll,
    opexSection: {
      name: 'Operating Expenses',
      total: totalOpex,
      items: opexItems,
      percentageOfNetRevenue: netRevenue > 0 ? round2((totalOpex / netRevenue) * 100) : 0,
    },
    totalOpex,
    operatingProfit,
    operatingMarginPct,
    excludedSection: {
      total: totalExcluded,
      items: excludedItems,
    },
    totalClassifiedCash,
    totalRawCash,
    reconciliationDiff,
    isReconciled,
    transactionCount: monthTxns.length,
    posWeeks,
  };
}

/**
 * Calculates quarterly or multi-month P&L.
 */
export function calculateRangePL(
  months: string[],
  effectiveTransactions: EffectiveTransaction[],
  conventions: AccountingConventions = DEFAULT_CONVENTIONS
): MonthlyPL[] {
  return months.map((m) => calculateMonthlyPL(m, effectiveTransactions, conventions));
}
