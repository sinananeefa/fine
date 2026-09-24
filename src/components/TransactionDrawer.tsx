import React from 'react';
import { X, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Tag, ExternalLink } from 'lucide-react';
import { EffectiveTransaction, CHART_OF_ACCOUNTS, Treatment, TreatmentEnum } from '../types/accounting';

interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: EffectiveTransaction[];
  onEditTransaction: (txn: EffectiveTransaction) => void;
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  isOpen,
  onClose,
  title,
  transactions,
  onEditTransaction,
}) => {
  if (!isOpen) return null;

  const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Audit Drill-down
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {transactions.length} contributing transactions
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Net Amount</div>
              <div className={`text-base font-mono font-bold ${totalAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {totalAmount < 0 ? '-' : ''}${Math.abs(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/50">
          {transactions.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Transactions Found</div>
              <p className="text-xs mt-1">No bank records match the current period or classification filter.</p>
            </div>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="pt-3 first:pt-0 group hover:bg-slate-50 dark:hover:bg-slate-800/40 p-3.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 transition-all"
              >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/30">
                      {t.id}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{t.date}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.counterparty}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.description}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                    <span>Method: <strong className="text-slate-700 dark:text-slate-300 font-medium">{t.method}</strong></span>
                    <span>Source: <strong className="text-slate-700 dark:text-slate-300 font-medium">{t.source}</strong></span>
                    <span>Category: <strong className="text-indigo-600 dark:text-indigo-400 font-medium">{t.category.name}</strong></span>
                  </div>
                </div>

                <div className="text-right space-y-2 shrink-0">
                  <div className={`font-mono text-sm font-bold ${t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {t.amount < 0 ? '-' : ''}${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <button
                    onClick={() => onEditTransaction(t)}
                    className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-semibold transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    Reclassify
                  </button>
                </div>
              </div>

              {/* Raw row preservation */}
              <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 truncate">
                Raw Memo: {t.raw_text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);
};
