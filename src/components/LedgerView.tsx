import React, { useState } from 'react';
import {
  Search,
  Filter,
  Sliders,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Code,
  Tag,
  Download,
  BookOpen,
  X,
} from 'lucide-react';
import {
  EffectiveTransaction,
  CHART_OF_ACCOUNTS,
  ClassificationRule,
} from '../types/accounting';

interface LedgerViewProps {
  transactions: EffectiveTransaction[];
  onEditTransaction: (txn: EffectiveTransaction) => void;
  rules: ClassificationRule[];
  selectedMonthProp?: string;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  onEditTransaction,
  rules,
  selectedMonthProp,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTreatment, setSelectedTreatment] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(selectedMonthProp || 'ALL');
  const [showRaw, setShowRaw] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Sync if selectedMonthProp changes
  React.useEffect(() => {
    if (selectedMonthProp) {
      setSelectedMonth(selectedMonthProp);
    }
  }, [selectedMonthProp]);

  const availableMonths = React.useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.date.substring(0, 7)))).sort();
  }, [transactions]);

  const formatMonthName = (m: string) => {
    const parts = m.split('-');
    if (parts.length === 2) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const idx = parseInt(parts[1], 10) - 1;
      if (idx >= 0 && idx < 12) return `${monthNames[idx]} ${parts[0]}`;
    }
    return m;
  };

  const filtered = transactions.filter((t) => {
    if (selectedCategory !== 'ALL' && t.category.id !== selectedCategory) return false;
    if (selectedTreatment !== 'ALL' && t.treatment !== selectedTreatment) return false;
    if (selectedMonth !== 'ALL' && !t.date.startsWith(selectedMonth)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        t.id.toLowerCase().includes(q) ||
        t.counterparty.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.raw_text.toLowerCase().includes(q) ||
        t.category.name.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Counterparty', 'Description', 'Amount', 'Method', 'Category', 'Treatment', 'Source'];
    const rows = filtered.map((t) => [
      t.id,
      t.date,
      `"${t.counterparty.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.method,
      `"${t.category.name}"`,
      t.treatment,
      t.source,
    ]);
    const csvStr = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finreview_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Transaction Ledger & Rule Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {transactions.length} immutable bank transactions with automated classification layers and audit history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Rules ({rules.length})</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID (e.g. T1061), vendor, description, or keyword..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium max-w-[200px] focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {CHART_OF_ACCOUNTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Treatment Filter */}
          <select
            value={selectedTreatment}
            onChange={(e) => setSelectedTreatment(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Treatments</option>
            <option value="PNL">PNL</option>
            <option value="BALANCE_SHEET_ASSET">BALANCE_SHEET_ASSET</option>
            <option value="LIABILITY">LIABILITY</option>
            <option value="FINANCING">FINANCING</option>
            <option value="EQUITY">EQUITY</option>
          </select>

          {/* Show Raw Text Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={showRaw}
              onChange={(e) => setShowRaw(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Raw Memo</span>
          </label>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>Showing <strong>{filtered.length}</strong> of {transactions.length} transactions</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">Click the edit pencil on any row to reclassify</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 font-semibold font-sans">
                <th className="py-3 px-3 font-mono">ID</th>
                <th className="py-3 px-3 font-mono">Date</th>
                <th className="py-3 px-3">Counterparty</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right font-mono">Amount</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Treatment</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3 text-center">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400 font-mono">{t.id}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{t.date}</td>
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-200">{t.counterparty}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300 max-w-xs truncate">
                    {t.description}
                    {showRaw && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">
                        {t.raw_text}
                      </div>
                    )}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {t.amount < 0 ? '-' : ''}${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-medium">
                      {t.category.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${
                      t.treatment === 'PNL'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 font-semibold'
                    }`}>
                      {t.treatment}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] font-sans">
                    {t.source}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onEditTransaction(t)}
                      className="p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Reclassify transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Classification Rules ({rules.length})</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Rule: {rule.pattern.toString()}</span>
                    <span className="text-[11px] font-mono text-slate-500">{rule.field}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-sans">
                    Maps to: <strong className="text-slate-900 dark:text-white">{rule.categoryId}</strong> ({rule.treatment})
                  </div>
                  {rule.createdFromUserCorrection && (
                    <span className="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      User Learned Override
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
