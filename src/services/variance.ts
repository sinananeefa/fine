import { MonthlyPL, PLLineItem } from './pnl';
import { EffectiveTransaction } from '../types/accounting';

export interface VarianceDriver {
  counterparty: string;
  dollarChange: number;
  priorAmount: number;
  currentAmount: number;
}

export interface VarianceLine {
  id: string;
  name: string;
  section: string;
  priorAmount: number;
  currentAmount: number;
  dollarChange: number;
  percentChange: number;
  isMaterial: boolean;
  materialityReason?: string;

  // Normalized for POS calendar weeks
  priorPerWeek: number;
  currentPerWeek: number;
  perWeekDollarChange: number;
  perWeekPercentChange: number;

  // Driver breakdown
  topDrivers: VarianceDriver[];
  largestSingleTxn?: {
    id: string;
    description: string;
    counterparty: string;
    amount: number;
    date: string;
  };

  // Structured narrative context
  executiveSummary?: string;
}

export interface MonthVarianceReport {
  priorMonth: string;
  currentMonth: string;
  priorWeeks: number;
  currentWeeks: number;
  lines: VarianceLine[];
  netRevenueVariance: {
    prior: number;
    current: number;
    dollarChange: number;
    percentChange: number;
  };
  operatingProfitVariance: {
    prior: number;
    current: number;
    dollarChange: number;
    percentChange: number;
  };
}

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Checks whether a variance is material:
 * dollar change > $1,000 AND percent change > 10%, OR dollar change > 1% of net revenue.
 */
export function checkMateriality(
  dollarChange: number,
  percentChange: number,
  currentNetRevenue: number
): { isMaterial: boolean; reason?: string } {
  const absDollar = Math.abs(dollarChange);
  const absPct = Math.abs(percentChange);
  const onePctNetRevenue = Math.abs(currentNetRevenue * 0.01);

  if (absDollar > 1000 && absPct > 10) {
    return {
      isMaterial: true,
      reason: `Exceeds $1,000 threshold ($${absDollar.toLocaleString()}) and 10% change (${absPct.toFixed(1)}%)`,
    };
  }
  if (absDollar > onePctNetRevenue && onePctNetRevenue > 0) {
    return {
      isMaterial: true,
      reason: `Exceeds 1% of net revenue ($${absDollar.toLocaleString()} vs threshold $${round2(onePctNetRevenue).toLocaleString()})`,
    };
  }

  return { isMaterial: false };
}

/**
 * Computes top contributing counterparties and the largest single transaction for a given line item.
 */
export function decomposeDrivers(
  lineId: string,
  priorMonth: string,
  currentMonth: string,
  transactions: EffectiveTransaction[]
): {
  topDrivers: VarianceDriver[];
  largestSingleTxn?: {
    id: string;
    description: string;
    counterparty: string;
    amount: number;
    date: string;
  };
} {
  const priorTxns = transactions.filter((t) => t.date.startsWith(priorMonth) && t.category.id === lineId);
  const currentTxns = transactions.filter((t) => t.date.startsWith(currentMonth) && t.category.id === lineId);

  // Group by counterparty
  const priorByVendor = new Map<string, number>();
  for (const t of priorTxns) {
    priorByVendor.set(t.counterparty, round2((priorByVendor.get(t.counterparty) || 0) + Math.abs(t.amount)));
  }

  const currentByVendor = new Map<string, number>();
  let largestTxn: EffectiveTransaction | null = null;
  let maxTxnAbs = -1;

  for (const t of currentTxns) {
    currentByVendor.set(t.counterparty, round2((currentByVendor.get(t.counterparty) || 0) + Math.abs(t.amount)));
    const absVal = Math.abs(t.amount);
    if (absVal > maxTxnAbs) {
      maxTxnAbs = absVal;
      largestTxn = t;
    }
  }

  const allVendors = new Set([...priorByVendor.keys(), ...currentByVendor.keys()]);
  const drivers: VarianceDriver[] = [];

  for (const vendor of allVendors) {
    const priorAmt = priorByVendor.get(vendor) || 0;
    const currAmt = currentByVendor.get(vendor) || 0;
    const diff = round2(currAmt - priorAmt);
    drivers.push({
      counterparty: vendor,
      dollarChange: diff,
      priorAmount: priorAmt,
      currentAmount: currAmt,
    });
  }

  // Sort by absolute dollar change descending, take top 3
  drivers.sort((a, b) => Math.abs(b.dollarChange) - Math.abs(a.dollarChange));
  const topDrivers = drivers.slice(0, 3);

  const largestSingleTxn = largestTxn
    ? {
        id: largestTxn.id,
        description: largestTxn.description,
        counterparty: largestTxn.counterparty,
        amount: largestTxn.amount,
        date: largestTxn.date,
      }
    : undefined;

  return {
    topDrivers,
    largestSingleTxn,
  };
}

/**
 * Computes complete month-over-month variance report.
 */
export function calculateVariance(
  prior: MonthlyPL,
  current: MonthlyPL,
  transactions: EffectiveTransaction[]
): MonthVarianceReport {
  const priorWeeks = prior.posWeeks;
  const currentWeeks = current.posWeeks;

  // Flatten all line items
  const collectLines = (pl: MonthlyPL) => {
    const map = new Map<string, { item: PLLineItem; section: string }>();
    for (const item of pl.revenueSection.items) map.set(item.id, { item, section: 'Revenue' });
    if (pl.refunds !== 0) {
      map.set('rev_refunds', {
        item: { id: 'rev_refunds', name: 'Refunds & Discounts', amount: Math.abs(pl.refunds), transactionIds: [] },
        section: 'Revenue',
      });
    }
    for (const item of pl.cogsSection.items) map.set(item.id, { item, section: 'COGS' });
    for (const item of pl.payrollSection.items) map.set(item.id, { item, section: 'Payroll' });
    for (const item of pl.opexSection.items) map.set(item.id, { item, section: 'Operating Expenses' });
    return map;
  };

  const priorMap = collectLines(prior);
  const currentMap = collectLines(current);

  const allLineIds = new Set([...priorMap.keys(), ...currentMap.keys()]);
  const lines: VarianceLine[] = [];

  for (const id of allLineIds) {
    const pEntry = priorMap.get(id);
    const cEntry = currentMap.get(id);

    const name = cEntry?.item.name || pEntry?.item.name || id;
    const section = cEntry?.section || pEntry?.section || 'Other';
    const priorAmount = pEntry ? pEntry.item.amount : 0;
    const currentAmount = cEntry ? cEntry.item.amount : 0;

    const dollarChange = round2(currentAmount - priorAmount);
    const percentChange = priorAmount !== 0 ? round2((dollarChange / priorAmount) * 100) : (currentAmount !== 0 ? 100 : 0);

    const priorPerWeek = round2(priorAmount / priorWeeks);
    const currentPerWeek = round2(currentAmount / currentWeeks);
    const perWeekDollarChange = round2(currentPerWeek - priorPerWeek);
    const perWeekPercentChange = priorPerWeek !== 0 ? round2((perWeekDollarChange / priorPerWeek) * 100) : 0;

    const { isMaterial, reason } = checkMateriality(dollarChange, percentChange, current.netRevenue);

    const { topDrivers, largestSingleTxn } = decomposeDrivers(id, prior.month, current.month, transactions);

    lines.push({
      id,
      name,
      section,
      priorAmount,
      currentAmount,
      dollarChange,
      percentChange,
      isMaterial,
      materialityReason: reason,
      priorPerWeek,
      currentPerWeek,
      perWeekDollarChange,
      perWeekPercentChange,
      topDrivers,
      largestSingleTxn,
      executiveSummary: generateDeterministicExplanation(name, dollarChange, percentChange, topDrivers, largestSingleTxn, currentWeeks - priorWeeks),
    });
  }

  // Sort by absolute dollar change descending
  lines.sort((a, b) => Math.abs(b.dollarChange) - Math.abs(a.dollarChange));

  const netRevDollarChange = round2(current.netRevenue - prior.netRevenue);
  const netRevPercentChange = prior.netRevenue !== 0 ? round2((netRevDollarChange / prior.netRevenue) * 100) : 0;

  const opProfitDollarChange = round2(current.operatingProfit - prior.operatingProfit);
  const opProfitPercentChange = prior.operatingProfit !== 0 ? round2((opProfitDollarChange / prior.operatingProfit) * 100) : 0;

  return {
    priorMonth: prior.month,
    currentMonth: current.month,
    priorWeeks,
    currentWeeks,
    lines,
    netRevenueVariance: {
      prior: prior.netRevenue,
      current: current.netRevenue,
      dollarChange: netRevDollarChange,
      percentChange: netRevPercentChange,
    },
    operatingProfitVariance: {
      prior: prior.operatingProfit,
      current: current.operatingProfit,
      dollarChange: opProfitDollarChange,
      percentChange: opProfitPercentChange,
    },
  };
}

/**
 * Deterministically constructs an executive explanation strictly from driver JSON.
 * Guarantees zero invented figures.
 */
export function generateDeterministicExplanation(
  name: string,
  dollarChange: number,
  percentChange: number,
  topDrivers: VarianceDriver[],
  largestSingleTxn?: { id: string; counterparty: string; amount: number; description: string },
  weekDelta: number = 0
): string {
  const dir = dollarChange >= 0 ? 'increased' : 'decreased';
  const absDollar = Math.abs(dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const absPct = Math.abs(percentChange).toFixed(1);

  let text = `${name} ${dir} by $${absDollar} (${absPct}% MoM).`;

  if (weekDelta !== 0) {
    text += ` Calendar shift: period length differed by ${weekDelta > 0 ? `+${weekDelta}` : weekDelta} POS deposit week(s).`;
  }

  if (topDrivers.length > 0) {
    const mainDriver = topDrivers[0];
    const driverDir = mainDriver.dollarChange >= 0 ? '+$' : '-$';
    const driverAmt = Math.abs(mainDriver.dollarChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    text += ` Primary driver was ${mainDriver.counterparty} (${driverDir}${driverAmt}).`;
  }

  if (largestSingleTxn && Math.abs(largestSingleTxn.amount) > 1000) {
    text += ` Largest single transaction: ${largestSingleTxn.id} (${largestSingleTxn.counterparty}, $${Math.abs(largestSingleTxn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`;
  }

  return text;
}
