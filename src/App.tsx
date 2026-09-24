import React, { useState, useMemo } from 'react';
import { SAMPLE_CSV_DATA } from './data/sampleCsv';
import { ingestTransactions, IngestResult } from './services/parser';
import { BASE_RULES, classifyByRules, classifyFallback } from './services/classifier';
import { calculateMonthlyPL, getEffectiveTransactions, MonthlyPL } from './services/pnl';
import { generateReviewItems } from './services/review';
import {
  Classification,
  ClassificationRule,
  AccountingConventions,
  DEFAULT_CONVENTIONS,
  AuditCorrection,
  EffectiveTransaction,
  Treatment,
  ReviewItem,
} from './types/accounting';
import { Header, ActiveTab } from './components/Header';
import { PNLView } from './components/PNLView';
import { VarianceView } from './components/VarianceView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { LedgerView } from './components/LedgerView';
import { AnalystChatView, Message } from './components/AnalystChatView';
import { IngestView } from './components/IngestView';
import { TransactionDrawer } from './components/TransactionDrawer';
import { CorrectionModal } from './components/CorrectionModal';
import { AuditGuideModal } from './components/AuditGuideModal';

export default function App() {
  const [csvContent, setCsvContent] = useState<string>(SAMPLE_CSV_DATA);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pnl');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [conventions, setConventions] = useState<AccountingConventions>(DEFAULT_CONVENTIONS);
  const [rules, setRules] = useState<ClassificationRule[]>(BASE_RULES);
  const [auditLog, setAuditLog] = useState<AuditCorrection[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Lifted analyst chat messages so history persists across page navigation
  const [analystMessages, setAnalystMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'analyst',
      text: "Hello! I am your AI Financial Analyst. I have verified access to your restaurant's Q1 2026 general ledger, automated classification rules, and audit trail.\n\nAsk me about revenue trends, margin contraction, specific bank transactions, calendar normalization, or balance sheet reclassifications. All figures in my answers are deterministically verified against the ledger.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Parse transactions from CSV
  const ingestResult: IngestResult = useMemo(() => {
    return ingestTransactions(csvContent);
  }, [csvContent]);

  // Maintain classifications map
  const [classifications, setClassifications] = useState<Map<string, Classification>>(() => {
    const map = new Map<string, Classification>();
    for (const t of ingestResult.transactions) {
      const cls = classifyByRules(t, BASE_RULES) || classifyFallback(t);
      map.set(t.id, cls);
    }
    return map;
  });

  // Recompute classifications when transactions change
  React.useEffect(() => {
    const map = new Map<string, Classification>();
    for (const t of ingestResult.transactions) {
      const existing = classifications.get(t.id);
      if (existing && existing.source === 'user') {
        map.set(t.id, existing);
      } else {
        const cls = classifyByRules(t, rules) || classifyFallback(t);
        map.set(t.id, cls);
      }
    }
    setClassifications(map);
  }, [ingestResult, rules]);

  // Derived effective transactions
  const effectiveTransactions = useMemo(() => {
    return getEffectiveTransactions(ingestResult.transactions, classifications);
  }, [ingestResult.transactions, classifications]);

  // Maintain Review Items
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>(() => {
    return generateReviewItems(ingestResult.transactions, classifications);
  });

  // Re-generate review items if classifications or txns change
  React.useEffect(() => {
    const newItems = generateReviewItems(ingestResult.transactions, classifications);
    setReviewItems((prev) => {
      // Preserve resolved and dismissed statuses
      const statusMap = new Map(prev.map((i) => [i.id, i]));
      return newItems.map((item) => {
        const existing = statusMap.get(item.id);
        if (existing && (existing.status === 'resolved' || existing.status === 'dismissed')) {
          return existing;
        }
        return item;
      });
    });
  }, [ingestResult.transactions, classifications]);

  // Monthly P&L statements
  const monthlyPLs = useMemo<{ [month: string]: MonthlyPL }>(() => {
    const monthsSet = new Set<string>();
    effectiveTransactions.forEach((t) => {
      const match = t.date.match(/^(\d{4}-\d{2})/);
      if (match) monthsSet.add(match[1]);
    });
    if (monthsSet.size === 0) {
      monthsSet.add('2026-01');
      monthsSet.add('2026-02');
      monthsSet.add('2026-03');
    }
    const result: { [month: string]: MonthlyPL } = {};
    Array.from(monthsSet).sort().forEach((m) => {
      result[m] = calculateMonthlyPL(m, effectiveTransactions, conventions);
    });
    return result;
  }, [effectiveTransactions, conventions]);

  // Modal & Drawer State
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    title: string;
    transactions: EffectiveTransaction[];
  }>({
    isOpen: false,
    title: '',
    transactions: [],
  });

  const [correctionTarget, setCorrectionTarget] = useState<EffectiveTransaction | null>(null);

  // Handlers
  const handleOpenDrillDown = (title: string, txns: EffectiveTransaction[]) => {
    setDrawerState({
      isOpen: true,
      title,
      transactions: txns,
    });
  };

  const handleEditTransaction = (txn: EffectiveTransaction) => {
    setCorrectionTarget(txn);
  };

  const handleSaveCorrection = (params: {
    txnId: string;
    newCategoryId: string;
    newTreatment: Treatment;
    userNote: string;
    applyToSimilar: boolean;
  }) => {
    const targetTxn = effectiveTransactions.find((t) => t.id === params.txnId);
    if (!targetTxn) return;

    const oldCategory = targetTxn.category.id;
    const oldTreatment = targetTxn.treatment;

    // Record audit correction
    const auditItem: AuditCorrection = {
      id: `audit-${Date.now()}-${params.txnId}`,
      txn_id: params.txnId,
      old_category: oldCategory,
      new_category: params.newCategoryId,
      old_treatment: oldTreatment,
      new_treatment: params.newTreatment,
      user_note: params.userNote,
      at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };
    setAuditLog((prev) => [auditItem, ...prev]);

    // Update classification for this transaction
    const newClassifications = new Map(classifications);
    newClassifications.set(params.txnId, {
      txn_id: params.txnId,
      category_id: params.newCategoryId,
      treatment: params.newTreatment,
      confidence: 1.0,
      source: 'user',
      rationale: `User correction: ${params.userNote}`,
      needs_review: false,
      review_reason: undefined,
      updated_at: new Date().toISOString(),
    });

    // If apply to similar, create a new rule and reclassify matching counterparties
    if (params.applyToSimilar) {
      const newRule: ClassificationRule = {
        id: `rule-${Date.now()}`,
        pattern: targetTxn.counterparty,
        field: 'counterparty',
        categoryId: params.newCategoryId,
        treatment: params.newTreatment,
        confidence: 0.95,
        rationale: `Learned from user correction on ${params.txnId}`,
        createdFromUserCorrection: true,
      };
      setRules((prev) => [newRule, ...prev]);

      // Apply to all transactions with matching counterparty
      for (const t of ingestResult.transactions) {
        if (t.counterparty === targetTxn.counterparty && t.id !== params.txnId) {
          newClassifications.set(t.id, {
            txn_id: t.id,
            category_id: params.newCategoryId,
            treatment: params.newTreatment,
            confidence: 0.95,
            source: 'rule',
            rationale: `Applied learned rule from ${targetTxn.counterparty}`,
            needs_review: false,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    setClassifications(newClassifications);

    // Resolve any associated review items
    setReviewItems((prev) =>
      prev.map((item) => {
        if (item.txn_id === params.txnId) {
          return {
            ...item,
            status: 'resolved',
            resolution_note: `Reclassified to ${params.newCategoryId} (${params.newTreatment}) - ${params.userNote}`,
          };
        }
        return item;
      })
    );
  };

  const handleApproveReviewItem = (item: ReviewItem) => {
    setReviewItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'resolved', resolution_note: 'Approved by reviewer' } : i))
    );

    const existingCls = classifications.get(item.txn_id);
    if (existingCls) {
      const newMap = new Map(classifications);
      newMap.set(item.txn_id, {
        ...existingCls,
        needs_review: false,
        source: 'user',
        updated_at: new Date().toISOString(),
      });
      setClassifications(newMap);
    }
  };

  const handleDismissReviewItem = (item: ReviewItem) => {
    setReviewItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'dismissed', resolution_note: 'Dismissed without changes' } : i))
    );
  };

  const handleUploadNewCSV = (newCsv: string) => {
    setCsvContent(newCsv);
  };

  const handleResetToSample = () => {
    setCsvContent(SAMPLE_CSV_DATA);
    setRules(BASE_RULES);
    setAuditLog([]);
  };

  const openReviewCount = reviewItems.filter((i) => i.status === 'open').length;

  const availableMonths = useMemo(() => {
    return Array.from(new Set(effectiveTransactions.map((t) => t.date.substring(0, 7)))).sort();
  }, [effectiveTransactions]);

  const isAllReconciled = useMemo(() => {
    const plList = Object.values(monthlyPLs);
    return plList.length > 0 ? plList.every((pl) => pl.isReconciled) : true;
  }, [monthlyPLs]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-150">
      {/* Header with Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        availableMonths={availableMonths}
        openReviewCount={openReviewCount}
        totalTransactions={effectiveTransactions.length}
        isReconciled={isAllReconciled}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'pnl' && (
          <PNLView
            monthlyPLs={monthlyPLs}
            selectedMonth={selectedMonth}
            conventions={conventions}
            setConventions={setConventions}
            effectiveTransactions={effectiveTransactions}
            onOpenDrillDown={handleOpenDrillDown}
          />
        )}

        {activeTab === 'variance' && (
          <VarianceView
            monthlyPLs={monthlyPLs}
            effectiveTransactions={effectiveTransactions}
            onOpenDrillDown={handleOpenDrillDown}
          />
        )}

        {activeTab === 'review' && (
          <ReviewQueueView
            reviewItems={reviewItems}
            effectiveTransactions={effectiveTransactions}
            onApproveItem={handleApproveReviewItem}
            onDismissItem={handleDismissReviewItem}
            onOpenEditModal={handleEditTransaction}
            auditLog={auditLog}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            transactions={effectiveTransactions}
            onEditTransaction={handleEditTransaction}
            rules={rules}
            selectedMonthProp={selectedMonth}
          />
        )}

        {activeTab === 'analyst' && (
          <AnalystChatView
            transactions={effectiveTransactions}
            classifications={classifications}
            conventions={conventions}
            auditHistory={auditLog}
            messages={analystMessages}
            setMessages={setAnalystMessages}
          />
        )}

        {activeTab === 'ingest' && (
          <IngestView
            ingestResult={ingestResult}
            onUploadNewCSV={handleUploadNewCSV}
            onResetToSample={handleResetToSample}
          />
        )}
      </main>

      {/* Transaction Drill-down Slide-over Drawer */}
      <TransactionDrawer
        isOpen={drawerState.isOpen}
        title={drawerState.title}
        transactions={drawerState.transactions}
        onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
        onEditTransaction={(txn) => {
          setDrawerState((prev) => ({ ...prev, isOpen: false }));
          setCorrectionTarget(txn);
        }}
      />

      {/* Reclassification & Audit Correction Modal */}
      <CorrectionModal
        isOpen={correctionTarget !== null}
        transaction={correctionTarget}
        onClose={() => setCorrectionTarget(null)}
        onSaveCorrection={handleSaveCorrection}
      />

      {/* Audit & Invariant Guide Modal */}
      <AuditGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
