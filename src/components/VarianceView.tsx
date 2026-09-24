import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Sparkles,
  ExternalLink,
  Filter,
  CheckCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { MonthlyPL } from '../services/pnl';
import { calculateVariance, MonthVarianceReport } from '../services/variance';
import { EffectiveTransaction } from '../types/accounting';

interface VarianceViewProps {
  monthlyPLs: { [month: string]: MonthlyPL };
  effectiveTransactions: EffectiveTransaction[];
  onOpenDrillDown: (title: string, txns: EffectiveTransaction[]) => void;
}

export const VarianceView: React.FC<VarianceViewProps> = ({
  monthlyPLs,
  effectiveTransactions,
  onOpenDrillDown,
}) => {
  const monthKeys = React.useMemo(() => Object.keys(monthlyPLs).sort(), [monthlyPLs]);

  const periods = React.useMemo(() => {
    const list: { id: string; priorMonth: string; currMonth: string; label: string }[] = [];
    const formatName = (m: string) => {
      const parts = m.split('-');
      if (parts.length === 2) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const idx = parseInt(parts[1], 10) - 1;
        if (idx >= 0 && idx < 12) return monthNames[idx];
      }
      return m;
    };

    for (let i = 0; i < monthKeys.length - 1; i++) {
      const p = monthKeys[i];
      const c = monthKeys[i + 1];
      const pWeeks = monthlyPLs[p]?.posWeeks || 4;
      const cWeeks = monthlyPLs[c]?.posWeeks || 4;
      list.push({
        id: `${p}-${c}`,
        priorMonth: p,
        currMonth: c,
        label: `${formatName(p)} → ${formatName(c)} (${pWeeks}w vs ${cWeeks}w)`,
      });
    }
    return list;
  }, [monthKeys, monthlyPLs]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    return periods.length > 1 ? periods[1].id : periods[0]?.id || '';
  });
  const [filterMaterialOnly, setFilterMaterialOnly] = useState(true);

  // Sync selectedPeriodId if periods change
  React.useEffect(() => {
    if (!periods.some((p) => p.id === selectedPeriodId) && periods.length > 0) {
      setSelectedPeriodId(periods[periods.length - 1].id);
    }
  }, [periods, selectedPeriodId]);

  const activePeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];
  const priorMonth = activePeriod?.priorMonth || '2026-01';
  const currMonth = activePeriod?.currMonth || '2026-02';

  const report: MonthVarianceReport | null = React.useMemo(() => {
    if (!activePeriod) return null;
    const p = monthlyPLs[priorMonth];
    const c = monthlyPLs[currMonth];
    if (!p || !c) return null;
    return calculateVariance(p, c, effectiveTransactions);
  }, [monthlyPLs, priorMonth, currMonth, effectiveTransactions, activePeriod]);

  if (periods.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Multi-Period Data Required</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Month-over-month variance and driver analysis requires at least two monthly periods. Please load the Q1 NYC Restaurant benchmark or upload a ledger with multiple months.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        Calculating variance reports...
      </div>
    );
  }

  const displayedLines = filterMaterialOnly
    ? report.lines.filter((l) => l.isMaterial)
    : report.lines;

  const fmt = (num: number) =>
    Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Month-over-Month Variance & Drivers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Identifies material shifts with POS calendar-week normalization and counterparty attribution.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Period Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodId(p.id)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedPeriodId === p.id
                    ? 'bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Materiality Filter */}
          <button
            onClick={() => setFilterMaterialOnly(!filterMaterialOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs transition-all ${
              filterMaterialOnly
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{filterMaterialOnly ? 'Material Shifts Only' : 'All Line Items'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Net Revenue Variance */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Net Revenue Shift</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {priorMonth} → {currMonth}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                report.netRevenueVariance.dollarChange >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {report.netRevenueVariance.dollarChange >= 0 ? '+' : '-'}${fmt(report.netRevenueVariance.dollarChange)}
            </span>
            <span
              className={`text-sm font-mono font-semibold px-2 py-0.5 rounded-full ${
                report.netRevenueVariance.percentChange >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}
            >
              {report.netRevenueVariance.percentChange >= 0 ? '+' : ''}
              {report.netRevenueVariance.percentChange.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Prior: ${fmt(report.netRevenueVariance.prior)}</span>
            <span>Current: ${fmt(report.netRevenueVariance.current)}</span>
          </div>
        </div>

        {/* Operating Profit Variance */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Operating Profit (EBIT) Shift</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {priorMonth} → {currMonth}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                report.operatingProfitVariance.dollarChange >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {report.operatingProfitVariance.dollarChange >= 0 ? '+' : '-'}${fmt(report.operatingProfitVariance.dollarChange)}
            </span>
            <span
              className={`text-sm font-mono font-semibold px-2 py-0.5 rounded-full ${
                report.operatingProfitVariance.percentChange >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}
            >
              {report.operatingProfitVariance.percentChange >= 0 ? '+' : ''}
              {report.operatingProfitVariance.percentChange.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Prior: ${fmt(report.operatingProfitVariance.prior)}</span>
            <span>Current: ${fmt(report.operatingProfitVariance.current)}</span>
          </div>
        </div>
      </div>

      {/* Calendar Normalization Callout */}
      <div className="p-4 bg-indigo-50/70 dark:bg-slate-900/90 rounded-xl border border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-slate-900 dark:text-white">POS Calendar Effect: </span>
            <span className="text-slate-700 dark:text-slate-300">
              {priorMonth} contains <strong>{report.priorWeeks} deposit weeks</strong>; {currMonth} contains{' '}
              <strong>{report.currentWeeks} deposit weeks</strong>.
            </span>
            <span className="text-slate-500 dark:text-slate-400 block sm:inline sm:ml-1">
              Run-rate per week normalizes calendar distortion to reveal true sales trajectory.
            </span>
          </div>
        </div>
        <div className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-xs">
          Δ {report.currentWeeks - report.priorWeeks > 0 ? `+${report.currentWeeks - report.priorWeeks}` : report.currentWeeks - report.priorWeeks} Deposit Week(s)
        </div>
      </div>

      {/* Detailed Variance Cards & Decomposition */}
      <div className="space-y-4">
        {displayedLines.map((line) => {
          const isUp = line.dollarChange >= 0;
          return (
            <div
              key={line.id}
              className={`p-5 rounded-xl border transition-all ${
                line.isMaterial
                  ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-slate-700/80 shadow-xs'
                  : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {line.section}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{line.name}</h3>

                  {line.isMaterial && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Material Shift
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    const txns = effectiveTransactions.filter(
                      (t) => (t.date.startsWith(priorMonth) || t.date.startsWith(currMonth)) && t.category.id === line.id
                    );
                    onOpenDrillDown(`${line.name} (${priorMonth} & ${currMonth})`, txns);
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <span>Inspect Transactions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Numbers Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono text-xs">
                <div>
                  <div className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-sans">Prior ({priorMonth})</div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">${fmt(line.priorAmount)}</div>
                  <div className="text-[11px] text-slate-400">${fmt(line.priorPerWeek)}/wk</div>
                </div>

                <div>
                  <div className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-sans">Current ({currMonth})</div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">${fmt(line.currentAmount)}</div>
                  <div className="text-[11px] text-slate-400">${fmt(line.currentPerWeek)}/wk</div>
                </div>

                <div>
                  <div className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-sans">Dollar Shift</div>
                  <div className={`text-sm font-bold mt-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isUp ? '+' : '-'}${fmt(line.dollarChange)}
                  </div>
                  <div className={`text-[11px] font-medium ${line.perWeekDollarChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {line.perWeekDollarChange >= 0 ? '+' : '-'}${fmt(line.perWeekDollarChange)}/wk
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 dark:text-slate-500 uppercase text-[10px] font-sans">Percent Shift</div>
                  <div className={`text-sm font-bold mt-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isUp ? '+' : ''}{line.percentChange.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                    Run-rate: {line.perWeekPercentChange >= 0 ? '+' : ''}{line.perWeekPercentChange.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Materiality Reason */}
              {line.materialityReason && (
                <div className="mt-3 text-xs text-amber-800 dark:text-amber-300 font-medium bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                  {line.materialityReason}
                </div>
              )}

              {/* Top Drivers & Decomposition */}
              {line.topDrivers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Top Contributing Counterparties
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {line.topDrivers.map((driver, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{driver.counterparty}</div>
                        <div className="flex items-center justify-between mt-1 font-mono text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">${fmt(driver.currentAmount)}</span>
                          <span className={driver.dollarChange >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                            {driver.dollarChange >= 0 ? '+' : '-'}${fmt(driver.dollarChange)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Largest Transaction */}
                  {line.largestSingleTxn && (
                    <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                      <span>
                        Largest single transaction: <strong className="text-slate-800 dark:text-slate-200">{line.largestSingleTxn.counterparty}</strong> ({line.largestSingleTxn.description})
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">${fmt(line.largestSingleTxn.amount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Executive Summary */}
              {line.executiveSummary && (
                <div className="mt-3 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-900 dark:text-indigo-300">Executive Brief: </span>
                    {line.executiveSummary}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
