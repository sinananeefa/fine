import React from 'react';
import { X, CheckCircle2, ShieldCheck, Scale, Calendar, Sparkles, BookOpen, Layers } from 'lucide-react';

interface AuditGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditGuideModal: React.FC<AuditGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                FinReview Audit & Invariant Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Understanding audit-grade reconciliation, POS calendars, and reactive statements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Section 1: Invariant */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300 text-sm">
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>The Cash Flow Reconciliation Invariant</span>
            </div>
            <p className="text-emerald-800 dark:text-emerald-300">
              Every single dollar that moves through the bank account is accounted for.
            </p>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-300 dark:border-emerald-800 font-mono text-center font-bold text-slate-900 dark:text-white text-xs">
              Net Bank Cash Movement = Operating Profit (EBIT) + Excluded Non-P&amp;L Cash
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Transactions like kitchen equipment Capex (T1061), sales tax remittances (T1062), loan principal payments (T1119/T1176), and owner distributions (T1180) are excluded from the operating P&amp;L but fully reconciled against raw cash.
            </p>
          </div>

          {/* Section 2: POS Weeks */}
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/40 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 text-sm">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>POS Calendar-Week Normalization</span>
            </div>
            <p>
              Restaurant revenue is cyclic, driven by weekly Friday–Sunday peak dining cycles. Monthly comparisons that ignore week counts create deceptive variance:
            </p>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="font-bold text-slate-900 dark:text-white">January</div>
                <div className="text-indigo-600 dark:text-indigo-400">5 POS Weeks</div>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="font-bold text-slate-900 dark:text-white">February</div>
                <div className="text-amber-600 dark:text-amber-400">4 POS Weeks</div>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="font-bold text-slate-900 dark:text-white">March</div>
                <div className="text-indigo-600 dark:text-indigo-400">5 POS Weeks</div>
              </div>
            </div>
            <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
              Our Variance Engine displays both calendar total dollar changes and per-week normalized metrics to isolate genuine operational changes from calendar artifacts.
            </p>
          </div>

          {/* Section 3: Navigation & Page Sync */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Page Navigation &amp; Real-Time Reactivity</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>
                <strong>Executive P&amp;L:</strong> Click any line item to inspect its underlying bank transaction memos in the audit slide-over drawer.
              </li>
              <li>
                <strong>Variance &amp; Drivers:</strong> Filter by materiality (over $1,000 and 10% shift or 1% net revenue) with automated vendor driver attribution.
              </li>
              <li>
                <strong>Review Queue:</strong> Resolve classification flags. Approving or correcting an item immediately updates the P&amp;L, Variance, Ledger, and AI Analyst without reloading.
              </li>
              <li>
                <strong>AI Analyst:</strong> Converse with your financial copilot. Every number quoted is grounded in deterministic tool executions with zero hallucinations.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Got it, return to review
          </button>
        </div>
      </div>
    </div>
  );
};
