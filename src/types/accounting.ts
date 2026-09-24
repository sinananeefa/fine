import { z } from 'zod';

export const TreatmentEnum = z.enum([
  'PNL',
  'BALANCE_SHEET_ASSET',
  'LIABILITY',
  'FINANCING',
  'EQUITY',
  'UNCLEAR',
]);
export type Treatment = z.infer<typeof TreatmentEnum>;

export const PLSectionEnum = z.enum([
  'REVENUE',
  'COGS',
  'PAYROLL',
  'OPEX',
  'NON_PNL',
]);
export type PLSection = z.infer<typeof PLSectionEnum>;

export interface CategoryDef {
  id: string;
  name: string;
  section: PLSection;
  defaultTreatment: Treatment;
  isContra?: boolean;
  description: string;
}

export const CHART_OF_ACCOUNTS: CategoryDef[] = [
  // Revenue
  { id: 'rev_food', name: 'Food Sales', section: 'REVENUE', defaultTreatment: 'PNL', description: 'POS batch deposits for restaurant food sales' },
  { id: 'rev_beverage', name: 'Beverage Sales', section: 'REVENUE', defaultTreatment: 'PNL', description: 'POS batch deposits for bar and beverage sales' },
  { id: 'rev_catering', name: 'Catering Sales', section: 'REVENUE', defaultTreatment: 'PNL', description: 'Corporate catering invoice payments' },
  { id: 'rev_delivery', name: 'Delivery Marketplace Sales', section: 'REVENUE', defaultTreatment: 'PNL', description: 'Third-party delivery gross marketplace payouts' },
  { id: 'rev_refunds', name: 'Refunds & Discounts', section: 'REVENUE', defaultTreatment: 'PNL', isContra: true, description: 'POS customer refunds and promotional adjustments' },

  // COGS
  { id: 'cogs_food', name: 'Food Inventory', section: 'COGS', defaultTreatment: 'PNL', description: 'Food and kitchen ingredient purchases' },
  { id: 'cogs_beverage', name: 'Beverage Inventory', section: 'COGS', defaultTreatment: 'PNL', description: 'Beer, wine, liquor and beverage purchases' },
  { id: 'cogs_packaging', name: 'Packaging & Disposables', section: 'COGS', defaultTreatment: 'PNL', description: 'Takeout boxes, cups, bags, and cutlery' },

  // Payroll
  { id: 'payroll_hourly', name: 'Hourly Wages (Kitchen & FOH)', section: 'PAYROLL', defaultTreatment: 'PNL', description: 'Bi-weekly payroll for front and back of house staff' },
  { id: 'payroll_taxes', name: 'Payroll Taxes & Benefits', section: 'PAYROLL', defaultTreatment: 'PNL', description: 'Employer payroll taxes, workers comp, and staff benefits' },
  { id: 'payroll_manager', name: 'Manager Salary', section: 'PAYROLL', defaultTreatment: 'PNL', description: 'Monthly salaried restaurant management payroll' },

  // Operating Expenses
  { id: 'opex_rent', name: 'Rent', section: 'OPEX', defaultTreatment: 'PNL', description: 'Monthly facility base lease payments' },
  { id: 'opex_utilities', name: 'Utilities', section: 'OPEX', defaultTreatment: 'PNL', description: 'Electric, natural gas, water, and trash' },
  { id: 'opex_insurance', name: 'Insurance', section: 'OPEX', defaultTreatment: 'PNL', description: 'Commercial liability and property insurance' },
  { id: 'opex_marketing', name: 'Marketing & Advertising', section: 'OPEX', defaultTreatment: 'PNL', description: 'Local digital ads, Meta, Google, and Yelp campaigns' },
  { id: 'opex_repairs', name: 'Repairs & Maintenance', section: 'OPEX', defaultTreatment: 'PNL', description: 'Kitchen and facility equipment repairs' },
  { id: 'opex_cleaning', name: 'Cleaning & Linen Service', section: 'OPEX', defaultTreatment: 'PNL', description: 'Linen rentals, uniform laundering, and sanitation supplies' },
  { id: 'opex_software', name: 'Software & POS Subscriptions', section: 'OPEX', defaultTreatment: 'PNL', description: 'Point-of-sale software, restaurant tech SaaS' },
  { id: 'opex_internet', name: 'Internet & Phone', section: 'OPEX', defaultTreatment: 'PNL', description: 'Telecommunications and merchant broadband' },
  { id: 'opex_accounting', name: 'Accounting & Bookkeeping', section: 'OPEX', defaultTreatment: 'PNL', description: 'Professional accounting and bookkeeping fees' },
  { id: 'opex_office', name: 'Office & Admin Supplies', section: 'OPEX', defaultTreatment: 'PNL', description: 'Admin stationery, till paper, office supplies' },
  { id: 'opex_licenses', name: 'Licenses & Permits', section: 'OPEX', defaultTreatment: 'PNL', description: 'Municipal business, liquor, health operating permits' },
  { id: 'opex_delivery_comm', name: 'Delivery Platform Commissions', section: 'OPEX', defaultTreatment: 'PNL', description: 'Marketplace deductions and commissions from DoorDash/Uber Eats' },

  // Non-PNL Balance Sheet & Financing
  { id: 'bs_equipment', name: 'Equipment Purchase (Capex)', section: 'NON_PNL', defaultTreatment: 'BALANCE_SHEET_ASSET', description: 'Fixed capital asset additions subject to depreciation' },
  { id: 'liab_sales_tax', name: 'Sales Tax Remittance', section: 'NON_PNL', defaultTreatment: 'LIABILITY', description: 'Fulfillment of trust liability collected on behalf of state tax authority' },
  { id: 'liab_gift_cards', name: 'Gift Card Sales (Deferred Rev)', section: 'NON_PNL', defaultTreatment: 'LIABILITY', description: 'Unearned customer deposits held until redemption' },
  { id: 'fin_loan_principal', name: 'Loan Principal Repayment', section: 'NON_PNL', defaultTreatment: 'FINANCING', description: 'Reduction of commercial debt principal' },
  { id: 'eq_owner_distribution', name: 'Owner Distribution', section: 'NON_PNL', defaultTreatment: 'EQUITY', description: 'Equity draw/dividend paid out to restaurant ownership' },
  { id: 'unclear', name: 'Unclear / Suspense', section: 'NON_PNL', defaultTreatment: 'UNCLEAR', description: 'Unclassified transactions requiring accountant investigation' },
];

export const CATEGORY_MAP = new Map<string, CategoryDef>(
  CHART_OF_ACCOUNTS.map((c) => [c.id, c])
);

export const TransactionSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  description: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : 'General Transaction')),
  counterparty: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : 'Vendor')),
  amount: z.number(), // positive for inflow, negative for outflow
  method: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v : 'Bank')),
  raw_text: z.string().default(''),
  source_file_id: z.string().optional(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const ClassificationSourceEnum = z.enum(['rule', 'llm', 'user']);
export type ClassificationSource = z.infer<typeof ClassificationSourceEnum>;

export const ClassificationSchema = z.object({
  txn_id: z.string().optional(),
  category_id: z.string(),
  treatment: TreatmentEnum,
  confidence: z.number().min(0).max(1),
  source: ClassificationSourceEnum,
  rationale: z.string(),
  needs_review: z.boolean(),
  review_reason: z.string().nullable().optional(),
  updated_at: z.string(),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export const AuditCorrectionSchema = z.object({
  id: z.string(),
  txn_id: z.string(),
  old_category: z.string(),
  new_category: z.string(),
  old_treatment: TreatmentEnum,
  new_treatment: TreatmentEnum,
  user_note: z.string(),
  at: z.string(),
  timestamp: z.string().optional(),
});
export type AuditCorrection = z.infer<typeof AuditCorrectionSchema>;

export type { ClassificationRule } from '../services/classifier';

export const ReviewItemSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type ReviewItemSeverity = z.infer<typeof ReviewItemSeverityEnum>;

export const ReviewItemStatusEnum = z.enum(['open', 'resolved', 'dismissed']);
export type ReviewItemStatus = z.infer<typeof ReviewItemStatusEnum>;

export const ReviewItemSchema = z.object({
  id: z.string(),
  txn_id: z.string(),
  reason_code: z.string(),
  severity: ReviewItemSeverityEnum,
  status: ReviewItemStatusEnum,
  suggested_category: z.string().optional(),
  suggested_treatment: TreatmentEnum.optional(),
  rationale: z.string(),
  resolution_note: z.string().nullable().optional(),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

export interface EffectiveTransaction extends Transaction {
  category: CategoryDef;
  treatment: Treatment;
  confidence: number;
  source: ClassificationSource;
  rationale: string;
  needs_review: boolean;
  review_reason?: string | null;
  audit_history?: AuditCorrection[];
}

export interface AccountingConventions {
  deliveryCommissionsInOpex: boolean; // default true
  packagingInCOGS: boolean; // default true
  refundsInContraRevenue: boolean; // default true
}

export const DEFAULT_CONVENTIONS: AccountingConventions = {
  deliveryCommissionsInOpex: true,
  packagingInCOGS: true,
  refundsInContraRevenue: true,
};
