import {
  Transaction,
  Classification,
  Treatment,
  CATEGORY_MAP,
  AuditCorrection,
  CHART_OF_ACCOUNTS,
} from '../types/accounting';

export interface ClassificationRule {
  id: string;
  pattern: RegExp | string;
  field: 'description' | 'counterparty';
  categoryId: string;
  treatment: Treatment;
  confidence: number;
  rationale: string;
  needsReview?: boolean;
  reviewReason?: string;
  createdFromUserCorrection?: boolean;
}

export const BASE_RULES: ClassificationRule[] = [
  // Specific non-PNL and judgment cases first
  {
    id: 'rule-oven-capex',
    pattern: /oven|equipment purchase/i,
    field: 'description',
    categoryId: 'bs_equipment',
    treatment: 'BALANCE_SHEET_ASSET',
    confidence: 0.98,
    rationale: 'Capital expenditure for commercial kitchen asset; excluded from P&L, subject to balance sheet capitalization and depreciation.',
    needsReview: true,
    reviewReason: 'Capex item: verify useful life and depreciation schedule.',
  },
  {
    id: 'rule-sales-tax',
    pattern: /sales tax/i,
    field: 'description',
    categoryId: 'liab_sales_tax',
    treatment: 'LIABILITY',
    confidence: 0.98,
    rationale: 'Fulfillment of fiduciary sales tax liability collected from customers; excluded from P&L.',
    needsReview: true,
    reviewReason: 'Payee is Florida Dept of Revenue for NYC business; verify POS sales tax collection treatment.',
  },
  {
    id: 'rule-gift-card',
    pattern: /gift card/i,
    field: 'description',
    categoryId: 'liab_gift_cards',
    treatment: 'LIABILITY',
    confidence: 0.95,
    rationale: 'Customer gift card deposit represents unearned deferred revenue liability until redeemed.',
    needsReview: true,
    reviewReason: 'Deferred revenue liability: do not recognize as revenue until gift cards are redeemed.',
  },
  {
    id: 'rule-loan-principal',
    pattern: /loan principal/i,
    field: 'description',
    categoryId: 'fin_loan_principal',
    treatment: 'FINANCING',
    confidence: 0.99,
    rationale: 'Repayment of commercial borrowing principal is a financing cash outflow, excluded from P&L.',
    needsReview: true,
    reviewReason: 'Financing debt reduction: verify whether interest component was separately charged.',
  },
  {
    id: 'rule-owner-distribution',
    pattern: /owner distribution/i,
    field: 'description',
    categoryId: 'eq_owner_distribution',
    treatment: 'EQUITY',
    confidence: 0.99,
    rationale: 'Equity distribution to owners/shareholders; excluded from P&L expense calculations.',
    needsReview: true,
    reviewReason: 'Equity draw: confirm partner tax distribution vs operating expense.',
  },
  {
    id: 'rule-license-annual',
    pattern: /annual license renewal/i,
    field: 'description',
    categoryId: 'opex_licenses',
    treatment: 'PNL',
    confidence: 0.88,
    rationale: 'Municipal operating permit; expensed to Opex by default, but flagged for potential 12-month amortization.',
    needsReview: true,
    reviewReason: 'Annual license fee ($900): could be treated as prepaid asset and amortized over 12 months ($75/mo).',
  },
  {
    id: 'rule-catering-large-sysco',
    pattern: /large catering event food purchase/i,
    field: 'description',
    categoryId: 'cogs_food',
    treatment: 'PNL',
    confidence: 0.90,
    rationale: 'Sysco bulk food purchase for catering event; assigned to COGS-Food.',
    needsReview: true,
    reviewReason: 'Large one-off food purchase ($6,200) without an apparent matching catering revenue spike in March.',
  },

  // Revenue streams
  {
    id: 'rule-rev-food',
    pattern: /pos batch deposit - food sales/i,
    field: 'description',
    categoryId: 'rev_food',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Toast POS batch deposit for food sales.',
  },
  {
    id: 'rule-rev-beverage',
    pattern: /pos batch deposit - beverage sales/i,
    field: 'description',
    categoryId: 'rev_beverage',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Toast POS batch deposit for bar and beverage sales.',
  },
  {
    id: 'rule-rev-catering',
    pattern: /catering invoice payment/i,
    field: 'description',
    categoryId: 'rev_catering',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Client catering contract payment.',
  },
  {
    id: 'rule-rev-delivery',
    pattern: /delivery marketplace payout/i,
    field: 'description',
    categoryId: 'rev_delivery',
    treatment: 'PNL',
    confidence: 0.96,
    rationale: 'DoorDash/Uber Eats marketplace payout treated as gross marketplace sales.',
    needsReview: false,
  },
  {
    id: 'rule-rev-refunds',
    pattern: /refunds and discounts/i,
    field: 'description',
    categoryId: 'rev_refunds',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Toast POS customer refunds and promotional deductions (contra-revenue).',
  },

  // COGS
  {
    id: 'rule-cogs-packaging',
    pattern: /packaging and disposables|restaurant depot/i,
    field: 'description',
    categoryId: 'cogs_packaging',
    treatment: 'PNL',
    confidence: 0.98,
    rationale: 'To-go takeout packaging and customer disposables.',
  },
  {
    id: 'rule-cogs-beverage-sg',
    pattern: /southern glazer/i,
    field: 'counterparty',
    categoryId: 'cogs_beverage',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Southern Glazer wine & spirits beverage inventory.',
  },
  {
    id: 'rule-cogs-beverage-dist',
    pattern: /craft beer distributor|beverage depot/i,
    field: 'counterparty',
    categoryId: 'cogs_beverage',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Beverage & alcohol wholesale inventory purchase.',
  },
  {
    id: 'rule-cogs-food-vendors',
    pattern: /sysco|us foods|local produce co\.|butcher & sons|bakery supply/i,
    field: 'counterparty',
    categoryId: 'cogs_food',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Wholesale restaurant food and ingredient inventory purchase.',
  },

  // Payroll
  {
    id: 'rule-payroll-hourly',
    pattern: /hourly kitchen and foh wages/i,
    field: 'description',
    categoryId: 'payroll_hourly',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Gusto bi-weekly staff hourly payroll.',
  },
  {
    id: 'rule-payroll-taxes',
    pattern: /payroll taxes and benefits/i,
    field: 'description',
    categoryId: 'payroll_taxes',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Employer payroll tax contributions and worker benefits.',
  },
  {
    id: 'rule-payroll-mgr',
    pattern: /manager salary/i,
    field: 'description',
    categoryId: 'payroll_manager',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Monthly restaurant general manager payroll.',
  },

  // Opex
  {
    id: 'rule-opex-rent',
    pattern: /rent/i,
    field: 'description',
    categoryId: 'opex_rent',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Monthly restaurant premises base lease.',
  },
  {
    id: 'rule-opex-utilities',
    pattern: /utilities|city utilities/i,
    field: 'description',
    categoryId: 'opex_utilities',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Facility electric, natural gas, and water utilities.',
  },
  {
    id: 'rule-opex-insurance',
    pattern: /insurance premium|next insurance/i,
    field: 'description',
    categoryId: 'opex_insurance',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Monthly commercial restaurant insurance policy premium.',
  },
  {
    id: 'rule-opex-marketing',
    pattern: /marketing|meta\/google\/yelp/i,
    field: 'description',
    categoryId: 'opex_marketing',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Digital guest acquisition advertising campaigns.',
  },
  {
    id: 'rule-opex-repairs',
    pattern: /repairs and maintenance|kitchen repair co\./i,
    field: 'description',
    categoryId: 'opex_repairs',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Kitchen equipment repair and maintenance servicing.',
  },
  {
    id: 'rule-opex-cleaning',
    pattern: /cleaning and linen|linenpro/i,
    field: 'description',
    categoryId: 'opex_cleaning',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Tablecloth linen service and sanitation supplies.',
  },
  {
    id: 'rule-opex-software',
    pattern: /pos\/software subscription|toast/i,
    field: 'description',
    categoryId: 'opex_software',
    treatment: 'PNL',
    confidence: 0.98,
    rationale: 'Toast POS software and cloud SaaS terminal subscription.',
  },
  {
    id: 'rule-opex-internet',
    pattern: /internet and phone|comcast business/i,
    field: 'description',
    categoryId: 'opex_internet',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Comcast commercial high-speed broadband and telephony.',
  },
  {
    id: 'rule-opex-accounting',
    pattern: /accounting\/bookkeeping|ledgerpro/i,
    field: 'description',
    categoryId: 'opex_accounting',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Monthly external CPA and bookkeeping service fees.',
  },
  {
    id: 'rule-opex-office',
    pattern: /office\/admin supplies|staples\/amazon/i,
    field: 'description',
    categoryId: 'opex_office',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Printer paper, receipts, till rolls, administrative stationery.',
  },
  {
    id: 'rule-opex-delivery-comm',
    pattern: /delivery platform commission/i,
    field: 'description',
    categoryId: 'opex_delivery_comm',
    treatment: 'PNL',
    confidence: 0.99,
    rationale: 'Third-party marketplace commission fees deducted by DoorDash/Uber Eats.',
  },
];

/**
 * Executes deterministic categorization rules against a transaction.
 */
export function classifyByRules(
  txn: Transaction,
  customRules: ClassificationRule[] = []
): Classification | null {
  const allRules = [...customRules, ...BASE_RULES];

  for (const rule of allRules) {
    const textToMatch = rule.field === 'counterparty' ? txn.counterparty : txn.description;
    let matched = false;
    if (rule.pattern instanceof RegExp) {
      matched = rule.pattern.test(textToMatch);
    } else {
      matched = textToMatch.toLowerCase().includes(rule.pattern.toLowerCase());
    }

    if (matched) {
      const needsReview =
        rule.needsReview ?? (rule.confidence < 0.8 || rule.treatment !== 'PNL');
      return {
        txn_id: txn.id,
        category_id: rule.categoryId,
        treatment: rule.treatment,
        confidence: rule.confidence,
        source: rule.createdFromUserCorrection ? 'user' : 'rule',
        rationale: rule.rationale,
        needs_review: needsReview,
        review_reason: rule.reviewReason ?? (needsReview ? 'Requires accounting review' : null),
        updated_at: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Fallback classification for completely unrecognized items.
 */
export function classifyFallback(txn: Transaction): Classification {
  return {
    txn_id: txn.id,
    category_id: 'unclear',
    treatment: 'UNCLEAR',
    confidence: 0.1,
    source: 'rule',
    rationale: 'No deterministic rule matched; flagged for accountant review.',
    needs_review: true,
    review_reason: 'Unmatched description or counterparty.',
    updated_at: new Date().toISOString(),
  };
}
