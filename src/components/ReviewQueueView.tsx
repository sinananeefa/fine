import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  Check,
  Filter,
  ShieldAlert,
  ArrowRight,
  Split,
  Tag,
  Info,
} from 'lucide-react';
import {
  ReviewItem,
  EffectiveTransaction,
  AuditCorrection,
} from '../types/accounting';

interface ReviewQueueViewProps {
  reviewItems: ReviewItem[];
  effectiveTransactions: EffectiveTransaction[];
  onApproveItem: (item: ReviewItem) => void;
  onDismissItem: (item: ReviewItem) => void;
  onOpenEditModal: (txn: EffectiveTransaction) => void;
  auditLog: AuditCorrection[];
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  reviewItems,
  effectiveTransactions,
  onApproveItem,
  onDismissItem,
  onOpenEditModal,
  auditLog,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const availableMonths = React.useMemo(() => {
    return Array.from(new Set(effectiveTransactions.map((t) => t.date.substring(0, 7)))).sort();
  }, [effectiveTransactions]);

  const formatMonthName = (m: string) => {
    const parts = m.split('-');
    if (parts.length === 2) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const idx = parseInt(parts[1], 10) - 1;
      if (idx >= 0 && idx < 12) return `${monthNames[idx]} ${parts[0]}`;
    }
    return m;
  };

  const txnMap = new Map(effectiveTransactions.map((t) => [t.id, t]));

  const openCount = reviewItems.filter((i) => i.status === 'open').length;
  const resolvedCount = reviewItems.filter((i) => i.status === 'resolved').length;
  const dismissedCount = reviewItems.filter((i) => i.status === 'dismissed').length;

  const filteredItems = reviewItems.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (selectedMonth !== 'all') {
      const txn = txnMap.get(item.txn_id);
      if (!txn || !txn.date.startsWith(selectedMonth)) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Audit Triage & Review Queue
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Resolve classification flags, balance sheet exclusions, state tax nexus risks, and period boundary items.
          </p>
        </div>

        {/* Counters / Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs ${
              statusFilter === 'open'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Open ({openCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs ${
              statusFilter === 'resolved'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Resolved ({resolvedCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('dismissed')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs ${
              statusFilter === 'dismissed'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Dismissed ({dismissedCount})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filters:</span>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
          Showing {filteredItems.length} review item(s)
        </div>
      </div>

      {/* Review Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-slate-800 dark:text-slate-200">No items match this filter</div>
            <div className="text-xs text-slate-400 mt-1">All flagged items for this view have been resolved.</div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const txn = txnMap.get(item.txn_id);
            if (!txn) return null;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-xl border transition-all ${
                  item.status === 'open'
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-85'
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getSeverityBadge(item.severity)}
                    <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40">
                      {txn.id}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{txn.date}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{txn.counterparty}</span>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div className={`text-base font-mono font-bold ${txn.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {txn.amount < 0 ? '-' : ''}${Math.abs(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {item.status !== 'open' && (
                      <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description & Current Classification */}
                <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div className="text-slate-700 dark:text-slate-300 font-medium">{txn.description}</div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span>Current:</span>
                    <span className="px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200 font-medium">
                      {txn.category.name}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 font-mono text-amber-800 dark:text-amber-300 font-semibold">
                      {txn.treatment}
                    </span>
                  </div>
                </div>

                {/* Rationale Callout */}
                <div className="mt-3.5 p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 dark:text-slate-200">Audit Anomaly Analysis: </span>
                    <span className="leading-relaxed">{item.rationale}</span>
                    {item.resolution_note && (
                      <div className="text-emerald-700 dark:text-emerald-400 pt-1 font-mono text-[11px] font-semibold">
                        Resolution: {item.resolution_note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {item.status === 'open' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      onClick={() => onDismissItem(item)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>

                    <button
                      onClick={() => onOpenEditModal(txn)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Change Category / Treatment
                    </button>

                    <button
                      onClick={() => onApproveItem(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Current Treatment
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Audit Log Table */}
      {auditLog.length > 0 && (
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Classification Audit Trail ({auditLog.length} events)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Immutable ledger of human overrides</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 font-semibold">
                  <th className="py-2.5 px-3">Txn</th>
                  <th className="py-2.5 px-3">Prior Category</th>
                  <th className="py-2.5 px-3">New Category</th>
                  <th className="py-2.5 px-3">Treatment</th>
                  <th className="py-2.5 px-3 font-sans">Audit Note</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {auditLog.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">{log.txn_id}</td>
                    <td className="py-2.5 px-3 text-slate-400 line-through">{log.old_category}</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">{log.new_category}</td>
                    <td className="py-2.5 px-3 text-amber-700 dark:text-amber-300">{log.new_treatment}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">{log.user_note}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{(log.timestamp || log.at || '').slice(11, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
