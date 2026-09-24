# AI and Determinism in FinReview

## Architectural Thesis
Financial software demands absolute numerical precision, auditability, and regulatory reproducibility. Large Language Models (LLMs) are probabilistic token-prediction engines; they cannot guarantee arithmetic accuracy or invariant preservation. Conversely, pure deterministic code excels at arithmetic, relational consistency, and constraint enforcement, but lacks context awareness and conversational fluency.

FinReview unifies both paradigms with a strict separation of concerns:
- **Deterministic Engine**: Responsible for 100% of arithmetic, accounting rules, variances, reconciliations, database transactions, and data integrity.
- **AI Agent & Reasoning Layer**: Responsible for semantic categorization of ambiguous descriptions, narrative synthesis of pre-computed driver JSON, contextual anomaly explanation, and interactive natural-language querying via tool calling.

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Ingestion["1. Ingestion Layer (Deterministic)"]
        Raw[Raw Bank Statements / CSV / PDF Text] --> Tokenizer[Anchor Tokenizer: T\\d{4}]
        Tokenizer --> Validator[Contiguity & Net Cash Invariant Validator]
        Validator --> DB_Txn[(Raw Transactions Table)]
    end

    subgraph Categorization["2. Hybrid Classification Layer"]
        DB_Txn --> RulesEngine{Deterministic Rule Match?}
        RulesEngine -- "Match (Confidence >= 0.95)" --> EffectiveClass[Effective Classification]
        RulesEngine -- "Unmatched / Judgment Required" --> AIClassifier[LLM Classifier via Zod Schema]
        AIClassifier --> SchemaGuard[Strict Chart of Accounts Validation]
        SchemaGuard --> EffectiveClass
        EffectiveClass --> AnomalyDetector[Deterministic Anomaly Detector]
        AnomalyDetector --> ReviewQueue[Review Items Queue]
        UserEdit[User Correction / Override] --> AuditLog[(Audit Log)]
        AuditLog --> RulesGen[Auto Rule Generator]
        RulesGen --> RulesEngine
        AuditLog --> EffectiveClass
    end

    subgraph Calculation["3. Financial Engine (100% Deterministic TypeScript)"]
        EffectiveClass --> PNLEngine[Pure P&L Calculation Functions]
        PNLEngine --> MonthlyPNL[Monthly P&L Rows & Excluded Sections]
        MonthlyPNL --> InvariantCheck{P&L + Excluded == Net Cash?}
        InvariantCheck -- Pass --> VarianceEngine[Variance & Driver Decomposition Engine]
        VarianceEngine --> DriverJSON[Structured Driver JSON]
    end

    subgraph AIAnalyst["4. AI Financial Analyst & Guardrails"]
        UserQuery[User Question in Chat] --> LLMAgent[AI Financial Analyst]
        LLMAgent --> ToolExecution[Deterministic Tools Execution]
        ToolExecution --> DB_Txn
        ToolExecution --> MonthlyPNL
        ToolExecution --> DriverJSON
        ToolExecution --> ToolResults[Raw Tool Results Snapshot]
        ToolResults --> LLMSynthesis[LLM Natural Language Response]
        LLMSynthesis --> HallucinationGuard[Post-Processing Hallucination Guard]
        ToolResults -.-> HallucinationGuard
        HallucinationGuard -- "All Numbers & IDs Verified" --> VerifiedResponse[Verified Chat Response with Sources]
        HallucinationGuard -- "Discrepancy Detected" --> GuardAlert[Auto-Correction / Unverified Warning]
    end
```

---

## 1. Where and Why AI is Used
- **Semantic Classification of Unclear Transactions**: When vendor names or descriptions are novel, truncated, or ambiguous (e.g. specialized software, unusual repairs, or licensing fees), the LLM interprets the business context and selects the most appropriate category within the closed Chart of Accounts.
- **Natural Language Variance Summarization**: Rather than overwhelming the CFO with a raw table of 50 variance delta percentages, the LLM consumes a pre-computed JSON driver object (e.g., Sysco catering spike of $6,200) and formats an executive summary.
- **Interactive Conversational Exploration**: Users can ask exploratory questions ("Why did operating profit decline in February?"), and the LLM translates the query into precise deterministic tool calls (`compare_months('2026-01', '2026-02')`, `get_variance_drivers(...)`).

## 2. Where and Why Deterministic Logic is Used
- **All Numerical Math**: Every addition, subtraction, margin percentage, variance dollar change, and period aggregation is executed by pure TypeScript functions. The LLM is never prompted to compute `A + B` or `(A - B) / B`.
- **Accounting Invariant Enforcement**:
  1. *Completeness*: $\sum \text{P\&L amounts} + \sum \text{Excluded non-PNL amounts} \equiv \sum \text{Raw Cash Inflows/Outflows}$.
  2. *Single Treatment*: Every transaction has exactly one effective classification and treatment.
  3. *Immutable Ledger*: Raw transaction records are strictly read-only; user corrections exist as overlay records in an audit log.
- **Anomaly Detection**: Statistical outliers (Z-scores $> 2.0$ or $>2\times$ category median), counterparty/description discrepancies, state jurisdiction mismatches (Florida tax on NY company), and partial week stubs are flagged deterministically.

## 3. How Incorrect or Unsupported Financial Answers Are Prevented
- **Tool-Constrained LLM**: The AI Analyst system prompt strictly prohibits speculation, extrapolation, and arithmetic calculation. The model is forced to call typed tools to obtain data.
- **Strict Zod Schemas**: Tool parameters and LLM classification outputs are validated against Zod schemas. If the model attempts to emit an unauthorized category, the schema rejects it.
- **Deterministic Hallucination Guardrail**:
  Before an AI response is rendered to the user:
  1. A regex scanner extracts all monetary numbers, percentages, and transaction IDs from the candidate text.
  2. Every extracted token is cross-referenced against the JSON outputs returned by the deterministic tools executed in that turn.
  3. If a number deviates by more than \$0.01 from any tool result, the guardrail triggers an automated correction prompt. If unverified, the UI visibly flags the answer as unverified and highlights the discrepancy.
- **Traceable Footnotes & Drill-downs**: Every metric and transaction ID mentioned in chat or in the P&L table is rendered as an interactive link or chip that opens the underlying immutable bank transaction.
