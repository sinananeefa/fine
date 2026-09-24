# FinReview Implementation Plan & Architecture

FinReview is an AI-native financial review system built for FINZ's SWE internship challenge. It adheres strictly to the non-negotiable core tenet: **Deterministic code computes every number; AI reasons, interprets, and explains.**

## Core Principles
1. **Zero Hallucinated Numbers**: No financial calculation (sum, margin, variance, aggregation) is ever performed by an LLM. Pure TypeScript functions compute all metrics directly over the verified transaction ledger.
2. **Audit & Traceability**: Raw transactions are immutable. Every classification has a source (`rule`, `llm`, `user`), confidence score, and rationale. User corrections live in an audit log and recompute the P&L immediately.
3. **Double Verification**: LLM outputs undergo a deterministic regex + tolerance guardrail: every number and transaction ID mentioned in an AI explanation must match a tool execution result from the current turn.

## Phased Roadmap
- **Phase 0: Architecture & Foundation**
  - Data structures, Chart of Accounts, Treatment enums, Plan & Invariants.
- **Phase 1: Ingestion & Storage Engine**
  - Parsing traps (`T\d{4}` tokenization for concatenated lines, currency cleaning, out-of-order handling).
  - Validation engine (181 contiguous rows T1001-T1181, net cash reconciliation).
  - Raw text preservation and database storage.
- **Phase 2: Hybrid Categorization Engine & Corrections**
  - Deterministic rules first (high confidence 0.95+).
  - AI Classifier (Zod-structured output, restricted strictly to Chart of Accounts).
  - Anomaly detection (Z-score outliers, counterparty mismatches, week-5 stubs, duplicate windows).
  - User correction flow with rule creation and audit log.
- **Phase 3: Deterministic P&L Engine & Interactive UI**
  - Pure monthly calculation functions (Gross Revenue, Contra-revenue, Net Revenue, COGS, Gross Profit, Payroll, Opex, Operating Profit).
  - Non-PNL Excluded Items section (Capex, Liabilities, Financing, Equity).
  - Full drill-down on every figure with underlying transaction drawer.
  - Golden test verification for Jan, Feb, Mar.
- **Phase 4: Variance Engine & Explanations**
  - Month-over-month (Jan->Feb, Feb->Mar) and quarter comparisons.
  - Materiality thresholds ($1,000 & 10%, or 1% net revenue).
  - Driver decomposition (top categories, counterparties, individual transactions, POS-week normalizations).
  - AI narrative generator consuming driver JSON.
- **Phase 5: Review Queue**
  - Triage console for uncertain classifications (<0.80), non-PNL treatments, and anomaly flags.
  - Specific mandated cases: T1061 (oven capex), T1062 (FL sales tax on NYC business), T1117 (gift card liability), T1118 (loan repayment), T1180 (owner distribution), T1181 (license renewal prepayment option), T1179 (Sysco catering spike without revenue match), delivery payouts vs commissions.
- **Phase 6: AI Financial Analyst & Hallucination Guardrails**
  - Deterministic toolset (`get_pnl`, `get_category_total`, `list_transactions`, `get_variance_drivers`, etc.).
  - Post-processing validator extracting numbers and comparing to tool outputs.
  - Eval test suite (`npm run eval`) with >= 10 verifiable Q&A cases.
- **Phase 7: Production Polish, Docs & Walkthrough**
  - Step-by-step deployment guide (Vercel + Neon).
  - `docs/AI_AND_DETERMINISM.md` with Mermaid diagrams.
  - 5-minute walkthrough script `DEMO.md`.
