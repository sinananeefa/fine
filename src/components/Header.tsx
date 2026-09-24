import React from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Receipt,
  Bot,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Building2,
  Sun,
  Moon,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type ActiveTab = 'pnl' | 'variance' | 'review' | 'ledger' | 'analyst' | 'ingest';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMonth: string; // '2026-01' | '2026-02' | '2026-03' | 'ALL'
  setSelectedMonth: (m: string) => void;
  availableMonths?: string[];
  openReviewCount: number;
  totalTransactions: number;
  isReconciled: boolean;
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  availableMonths = ['2026-01', '2026-02', '2026-03'],
  openReviewCount,
  totalTransactions,
  isReconciled,
  onOpenHelp,
}) => {
  const { theme, toggleTheme } = useTheme();

  // Helper to format month strings
  const formatMonthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length === 2) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return monthNames[monthIdx];
      }
    }
    return m;
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-md shadow-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg tracking-tight">F</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">R</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                FinReview
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                  Audit-Grade Review
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">NYC Restaurant Co.</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>Q1 2026 (Jan–Mar)</span>
            </div>
          </div>
        </div>

        {/* Status Indicators, Period Filter & Theme Toggle */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Integrity Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{totalTransactions} Txns</span>
            <span className="text-emerald-300 dark:text-emerald-700">|</span>
            <span className="font-medium text-[11px]">
              {isReconciled ? '100% Contiguous & Balanced ($0.00 Var)' : 'Reconciliation Pending'}
            </span>
          </div>

          {/* Period Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-1.5 mr-1" />
            {availableMonths.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedMonth === m
                    ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {formatMonthLabel(m)}
              </button>
            ))}
            <button
              onClick={() => setSelectedMonth('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedMonth === 'ALL'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {availableMonths.length > 1 ? 'All Period' : 'Total'}
            </button>
          </div>

          {/* Audit Guide Button */}
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              title="Open Audit & Invariant Guide"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Audit Guide</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-medium">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium">Light</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-slate-200 dark:border-slate-800 pt-0.5">
        {[
          { id: 'pnl', label: 'Executive P&L', icon: BarChart3 },
          { id: 'variance', label: 'Variance & Drivers', icon: TrendingUp },
          { id: 'review', label: 'Review Queue', icon: AlertCircle, count: openReviewCount },
          { id: 'ledger', label: 'Transaction Ledger', icon: Receipt },
          { id: 'analyst', label: 'AI Analyst', icon: Bot, isAi: true },
          { id: 'ingest', label: 'Data Ingestion', icon: UploadCloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.isAi ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
