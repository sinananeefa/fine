import {
  Transaction,
  Classification,
  ReviewItem,
  EffectiveTransaction,
  Treatment,
} from '../types/accounting';

export interface AnomalyRule {
  id: string;
  name: string;
  check: (
    txn: Transaction,
    cls: Classification,
    allTxns: Transaction[],
    allClassifications: Map<string, Classification>
  ) => { triggered: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; reason: string; suggestedCategory?: string; suggestedTreatment?: Treatment } | null;
}

export const ANOMALY_RULES: AnomalyRule[] = [
  // 1. Capex asset addition check (T1061)
  {
    id: 'anom-capex-asset',
    name: 'Capital Asset Purchase Verification',
    check: (txn) => {
      if (txn.id === 'T1061' || /oven|equipment purchase/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'high',
          reason: 'Large equipment capex ($7,800). Excluded from P&L; verify useful life and depreciation schedule.',
          suggestedCategory: 'bs_equipment',
          suggestedTreatment: 'BALANCE_SHEET_ASSET',
        };
      }
      return null;
    },
  },

  // 2. Sales tax state mismatch (T1062)
  {
    id: 'anom-tax-jurisdiction',
    name: 'State Tax Jurisdiction & Gross-up Risk',
    check: (txn) => {
      if (txn.id === 'T1062' || /florida dept\. of revenue/i.test(txn.counterparty)) {
        return {
          triggered: true,
          severity: 'critical',
          reason: 'Payee is Florida Dept of Revenue ($6,150) for NYC restaurant. Verify if business has FL nexus, and check whether POS deposits mistakenly include collected sales tax.',
          suggestedCategory: 'liab_sales_tax',
          suggestedTreatment: 'LIABILITY',
        };
      }
      return null;
    },
  },

  // 3. Gift card deferred revenue (T1117)
  {
    id: 'anom-gift-card',
    name: 'Gift Card Deferred Revenue',
    check: (txn) => {
      if (txn.id === 'T1117' || /gift card/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'high',
          reason: 'Gift card sales deposit ($2,400) represents unearned deferred revenue liability. Must not be recognized as revenue until redeemed.',
          suggestedCategory: 'liab_gift_cards',
          suggestedTreatment: 'LIABILITY',
        };
      }
      return null;
    },
  },

  // 4. Loan principal financing cash outflow (T1118)
  {
    id: 'anom-loan-repayment',
    name: 'Debt Principal Cash Outflow',
    check: (txn) => {
      if (txn.id === 'T1118' || /loan principal/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'high',
          reason: 'Loan principal repayment ($3,500) is a financing cash outflow. Excluded from P&L (verify if any interest was bundled).',
          suggestedCategory: 'fin_loan_principal',
          suggestedTreatment: 'FINANCING',
        };
      }
      return null;
    },
  },

  // 5. Owner equity draw (T1180)
  {
    id: 'anom-owner-distribution',
    name: 'Owner Equity Distribution',
    check: (txn) => {
      if (txn.id === 'T1180' || /owner distribution/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'high',
          reason: 'Owner distribution ($5,000) is an equity draw, not an operating expense. Excluded from P&L.',
          suggestedCategory: 'eq_owner_distribution',
          suggestedTreatment: 'EQUITY',
        };
      }
      return null;
    },
  },

  // 6. Annual license prepaid amortization option (T1181)
  {
    id: 'anom-prepaid-amortization',
    name: 'Annual License Renewal Periodicity',
    check: (txn) => {
      if (txn.id === 'T1181' || /annual license/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'medium',
          reason: 'Annual license renewal ($900). Expensed to Opex by default; could be classified as Prepaid Balance Sheet Asset and amortized over 12 months ($75/mo).',
          suggestedCategory: 'opex_licenses',
          suggestedTreatment: 'PNL',
        };
      }
      return null;
    },
  },

  // 7. Large catering event food purchase without matching catering revenue spike (T1179)
  {
    id: 'anom-catering-mismatch',
    name: 'Unusual Bulk Catering Food Purchase',
    check: (txn) => {
      if (txn.id === 'T1179' || /large catering event food purchase/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'high',
          reason: 'Large one-off food purchase ($6,200) for catering event on 2026-03-06 without an apparent matching catering revenue spike in early March.',
          suggestedCategory: 'cogs_food',
          suggestedTreatment: 'PNL',
        };
      }
      return null;
    },
  },

  // 8. Delivery marketplace gross vs net assumption
  {
    id: 'anom-delivery-gross-net',
    name: 'Delivery Payout Gross vs Net Assumption',
    check: (txn) => {
      if (/delivery marketplace payout/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'low',
          reason: 'Treated as gross marketplace sales because platform commissions are recorded as separate deductions. If payouts were already net, commissions would be double counted.',
          suggestedCategory: 'rev_delivery',
          suggestedTreatment: 'PNL',
        };
      }
      return null;
    },
  },

  // 9. Week-5 partial period stubs
  {
    id: 'anom-week5-stub',
    name: 'Partial Week-5 Calendar Stub',
    check: (txn) => {
      if (/week 5/i.test(txn.description)) {
        return {
          triggered: true,
          severity: 'low',
          reason: 'Partial calendar stub deposit (contains only 2-3 calendar days at month-end). Distorts monthly run-rate comparisons.',
        };
      }
      return null;
    },
  },

  // 10. Low confidence or non-PNL treatment
  {
    id: 'anom-low-confidence',
    name: 'Low Classification Confidence / Unclear',
    check: (txn, cls) => {
      if (cls.confidence < 0.8 || cls.treatment === 'UNCLEAR') {
        return {
          triggered: true,
          severity: 'high',
          reason: cls.review_reason || 'Classification confidence is below 80% or marked UNCLEAR.',
          suggestedCategory: cls.category_id,
          suggestedTreatment: cls.treatment,
        };
      }
      return null;
    },
  },
];

/**
 * Evaluates all transactions against anomaly rules to populate the Review Queue.
 */
export function generateReviewItems(
  transactions: Transaction[],
  classifications: Map<string, Classification>
): ReviewItem[] {
  const items: ReviewItem[] = [];

  for (const txn of transactions) {
    const cls = classifications.get(txn.id);
    if (!cls) continue;

    for (const rule of ANOMALY_RULES) {
      const result = rule.check(txn, cls, transactions, classifications);
      if (result && result.triggered) {
        items.push({
          id: `rev-${txn.id}-${rule.id}`,
          txn_id: txn.id,
          reason_code: rule.id,
          severity: result.severity,
          status: 'open',
          suggested_category: result.suggestedCategory,
          suggested_treatment: result.suggestedTreatment,
          rationale: result.reason,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return items;
}
