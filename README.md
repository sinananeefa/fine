# FinReview: AI-Native Financial Review Web App

An AI-native financial review web application built for FINZ's SWE challenge. FinReview turns raw bank transactions into an explainable, audit-grade monthly financial review.

---

## Core Non-Negotiable Principle
**AI is used for reasoning, interpretation, and natural language. Deterministic code is used for every number.**
- The LLM **never** calculates, sums, or invents financial figures.
- All P&L totals, variances, gross margins, and aggregates come from pure TypeScript functions over the database.
- LLM output about money is passed through a **Strict Hallucination Guardrail**: every monetary figure, percentage, or transaction ID must trace directly to a verified tool call result or it is flagged.

---

## Architecture & Workflow

```
Raw Bank Statement (PDF/CSV) 
       │
       ▼ [Tokenization by `T\d{4}` anchor + Independent Cash Recomputation]
Ingestion Engine (181 Txns, 100% Contiguous T1001-T1181)
       │
       ▼ [Deterministic Rules Engine + LLM Semantic Fallback]
Dual-Attribute Classification (Category + Treatment Enum)
       │
       ▼ [Audit Overrides Layer & Anomaly Detector]
Effective Ledger (Never Mutates Raw Transactions)
       │
       ├──► Executive P&L Engine (Deterministic Math, GAAP & Restaurant Conventions)
       ├──► Variance & Drivers Engine (Calendar Normalization: 5w vs 4w, Top Counterparty Attribution)
       ├──► Anomaly & Review Queue (10 Pre-Seeded Checks: Capex, Nexus, Deferred Rev, Loans)
       └──► AI Financial Analyst (Tool-Grounded Inquiries + Zero-Hallucination Guardrail)
```

---

## Key Features & Deliverables

1. **Executive Statement of Operations (P&L)**
   - Monthly columns: January (5 wks), February (4 wks), March (5 wks), and Q1 Aggregate.
   - Distinct sections: Net Revenue (with contra-revenue refunds), Cost of Goods Sold (Food, Beverage, Packaging), Payroll (Hourly, Taxes, Manager Salary), Operating Expenses (Rent, Utilities, Insurance, Marketing, Repairs, etc.), and Operating Profit (EBIT).
   - **Excluded Cash Reconciliation Bar**: Displays Capex ($7,800 oven), Liabilities (Sales tax, Gift cards), Financing ($3,500 loan principal), and Equity ($5,000 owner distribution). Mathematically proves `Operating Profit + Excluded Cash == Net Bank Cash Movement`.
   - **Interactive Drill-Down**: Click any number or line item to inspect contributing immutable transactions in the slide-over drawer.
   - **Configurable Accounting Conventions**: Real-time toggles for delivery commissions (Opex vs Contra-Rev), packaging (COGS vs Opex), and refunds (Contra-Rev vs Opex).

2. **Variance & Driver Decomposition Engine**
   - MoM analysis with dollar and percentage shifts.
   - Materiality threshold badge: flagged if `|Δ$| > $1,000 AND |Δ%| > 10%`, or `|Δ$| > 1% Net Revenue`.
   - **POS-Calendar Normalization**: Separates calendar effects (Jan 5 weeks vs Feb 4 weeks) from operational trends using per-week run rates.
   - Identifies top 3 counterparties driving the shift and the single largest transaction.
   - Generates deterministic 2-sentence executive briefs.

3. **Anomaly & Review Queue**
   - 10 deterministic anomaly rules:
     - Capex equipment ($7,800 convection oven) mapped to `BALANCE_SHEET_ASSET`.
     - State tax nexus alert on Florida Dept. of Revenue ($6,150) for a New York entity.
     - Deferred revenue alert on gift card sales ($2,400 deposit).
     - Financing exclusion on loan principal repayment ($3,500).
     - Equity exclusion on owner partner distribution ($5,000).
     - Period boundary stub detection on Week-5 transactions.
     - Annual license renewal prepayment recognition option ($900).
   - Triage console: Approve, Dismiss, or Reclassify with reason notes.
   - Learning rule engine: "Apply to similar future transactions" automatically generates reusable classification rules.

4. **AI Financial Analyst with Zero-Hallucination Guardrail**
   - Connected directly to deterministic tools: `get_pnl`, `get_variance`, `inspect_transaction`, `list_transactions`, `check_anomaly`, and `get_audit_trail`.
   - Hallucination detector parses all numbers in generated text, removes date years, and asserts inclusion in tool execution returns.
   - Full tool execution trace drawer visible in chat UI.

5. **Data Ingestion & Integrity Auditor**
   - Tokenizes by `T\d{4}` regex anchor to handle merged multi-line rows.
   - Verifies 6 integrity checks: 181 exact rows, T1001-T1181 contiguity, valid date span, parsed amounts, zero drift cash recomputation, and audit-ready status.

---

## Verification & Golden Values

All numbers verified against deterministic pure TypeScript tests:
- **Jan Net Revenue**: `$126,399.09` | **Jan Operating Profit**: `$14,470.53`
- **Feb Net Revenue**: `$125,617.29` | **Feb Operating Profit**: `$6,007.96`
- **Mar Net Revenue**: `$150,535.07` | **Mar Operating Profit**: `$18,852.14`
- **Q1 Net Revenue**: `$402,551.45` | **Q1 Operating Profit**: `$39,330.63`
- **12 CFO Evaluation Benchmarks**: **100% Pass Rate**

### Running Tests & Evaluations
```bash
# Run Vitest test suite (Unit & Evals)
npm test

# Run Autonomous CFO Evaluation Suite
npm run eval

# Run Seeding script
npm run seed

# Run Typecheck / Linter
npm run lint

# Build production bundle
npm run build
```
