import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Percent,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  MousePointerClick,
  HelpCircle,
} from 'lucide-react';
import { MonthlyPL } from '../services/pnl';
import {
  AccountingConventions,
  EffectiveTransaction,
} from '../types/accounting';

interface PNLViewProps {
  monthlyPLs: { [month: string]: MonthlyPL };
  selectedMonth: string;
  conventions: AccountingConventions;
  setConventions: React.Dispatch<React.SetStateAction<AccountingConventions>>;
  effectiveTransactions: EffectiveTransaction[];
  onOpenDrillDown: (title: string, txns: EffectiveTransaction[]) => void;
}

export const PNLView: React.FC<PNLViewProps> = ({
  monthlyPLs,
  selectedMonth,
  conventions,
  setConventions,
  effectiveTransactions,
  onOpenDrillDown,
}) => {
  const [showConventions, setShowConventions] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    rev: true,
    cogs: true,
    payroll: true,
    opex: true,
    excluded: true,
  });

  const toggleSection = (s: string) => {
    setExpandedSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const months = React.useMemo(() => {
    const keys = Object.keys(monthlyPLs).sort();
    return keys.length > 0 ? keys : ['2026-01', '2026-02', '2026-03'];
  }, [monthlyPLs]);

  // Current active data for KPI cards
  const activePL =
    selectedMonth === 'ALL'
      ? monthlyPLs[months[months.length - 1]] || monthlyPLs[months[0]]
      : monthlyPLs[selectedMonth] || monthlyPLs[months[0]];

  // Calculate Q1 Aggregate
  const q1Totals = React.useMemo(() => {
    let grossRev = 0;
    let refunds = 0;
    let netRev = 0;
    let cogs = 0;
    let grossProfit = 0;
    let payroll = 0;
    let opex = 0;
    let operatingProfit = 0;
    let excluded = 0;
    let rawCash = 0;

    months.forEach((m) => {
      const pl = monthlyPLs[m];
      if (pl) {
        grossRev += pl.grossRevenue;
        refunds += pl.refunds;
        netRev += pl.netRevenue;
        cogs += pl.totalCogs;
        grossProfit += pl.grossProfit;
        payroll += pl.totalPayroll;
        opex += pl.totalOpex;
        operatingProfit += pl.operatingProfit;
        excluded += pl.excludedSection.total;
        rawCash += pl.totalRawCash;
      }
    });

    return {
      grossRev,
      refunds,
      netRev,
      cogs,
      grossProfit,
      payroll,
      opex,
      operatingProfit,
      grossMarginPct: netRev > 0 ? (grossProfit / netRev) * 100 : 0,
      operatingMarginPct: netRev > 0 ? (operatingProfit / netRev) * 100 : 0,
      payrollPct: netRev > 0 ? (payroll / netRev) * 100 : 0,
      excluded,
      rawCash,
    };
  }, [months, monthlyPLs]);

  // Helper to drill down on line item
  const handleLineClick = (title: string, lineId: string, monthKey?: string) => {
    const filtered = effectiveTransactions.filter((t) => {
      if (monthKey && !t.date.startsWith(monthKey)) return false;
      if (lineId === 'rev_refunds') return t.category.id === 'rev_refunds';
      if (lineId === 'excluded_all') return t.treatment !== 'PNL';
      // Match composite excluded key like bs_equipment_BALANCE_SHEET_ASSET
      if (lineId.includes('_') && (lineId.endsWith('ASSET') || lineId.endsWith('LIABILITY') || lineId.endsWith('FINANCING') || lineId.endsWith('EQUITY'))) {
        return `${t.category.id}_${t.treatment}` === lineId;
      }
      return t.category.id === lineId;
    });
    onOpenDrillDown(title, filtered);
  };

  const fmt = (num: number) =>
    num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & KPI Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Statement of Operations (P&L)
            </h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Audit-Grade
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Click any number or line to inspect the original bank transaction receipts.</span>
          </p>
        </div>

        {/* Convention Toggle Button */}
        <button
          onClick={() => setShowConventions(!showConventions)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold shadow-xs transition-all ${
            showConventions
              ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Accounting Conventions</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConventions ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Conventions Card (if open) */}
      {showConventions && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-950 shadow-sm space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Configurable Accounting Policies
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Changes re-calculate the entire financial statement deterministically in real time
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <input
                type="checkbox"
                checked={conventions.deliveryCommissionsInOpex}
                onChange={(e) =>
                  setConventions((prev) => ({
                    ...prev,
                    deliveryCommissionsInOpex: e.target.checked,
                  }))
                }
                className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Delivery Commissions in Opex</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Default ON. When unchecked, commissions reduce revenue (contra-rev).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <input
                type="checkbox"
                checked={conventions.packagingInCOGS}
                onChange={(e) =>
                  setConventions((prev) => ({
                    ...prev,
                    packagingInCOGS: e.target.checked,
                  }))
                }
                className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Packaging in COGS</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Default ON. When unchecked, disposables are classified in Operating Expenses.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <input
                type="checkbox"
                checked={conventions.refundsInContraRevenue}
                onChange={(e) =>
                  setConventions((prev) => ({
                    ...prev,
                    refundsInContraRevenue: e.target.checked,
                  }))
                }
                className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Refunds as Contra-Revenue</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Default ON. Discounts & refunds netted directly against gross revenue.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Net Revenue</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ${fmt(selectedMonth === 'ALL' ? q1Totals.netRev : activePL.netRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <span>Gross: ${fmt(selectedMonth === 'ALL' ? q1Totals.grossRev : activePL.grossRevenue)}</span>
            <span className="text-rose-600 dark:text-rose-400 font-medium">Refunds: ${fmt(Math.abs(selectedMonth === 'ALL' ? q1Totals.refunds : activePL.refunds))}</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Gross Profit</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ${fmt(selectedMonth === 'ALL' ? q1Totals.grossProfit : activePL.grossProfit)}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1.5 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800/60">
            Gross Margin: {(selectedMonth === 'ALL' ? q1Totals.grossMarginPct : activePL.grossMarginPct).toFixed(1)}%
          </div>
        </div>

        {/* Total Payroll */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Total Staff Compensation</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
            ${fmt(selectedMonth === 'ALL' ? q1Totals.payroll : activePL.totalPayroll)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium pt-1 border-t border-slate-100 dark:border-slate-800/60">
            {selectedMonth === 'ALL'
              ? `${q1Totals.payrollPct.toFixed(1)}% of Net Revenue`
              : activePL.netRevenue > 0
              ? `${((activePL.totalPayroll / activePL.netRevenue) * 100).toFixed(1)}% of Net Revenue`
              : 'Wages & Taxes'}
          </div>
        </div>

        {/* Operating Profit */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Operating Profit (EBIT)</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${(selectedMonth === 'ALL' ? q1Totals.operatingProfit : activePL.operatingProfit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            ${fmt(selectedMonth === 'ALL' ? q1Totals.operatingProfit : activePL.operatingProfit)}
          </div>
          <div className={`text-[11px] font-semibold mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 ${(selectedMonth === 'ALL' ? q1Totals.operatingMarginPct : activePL.operatingMarginPct) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            Operating Margin: {(selectedMonth === 'ALL' ? q1Totals.operatingMarginPct : activePL.operatingMarginPct).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Main P&L Multi-Month Comparison Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Comprehensive Financial Statement
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Currency in USD ($)</span>
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Click any row to view supporting transactions</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 font-semibold text-slate-600 dark:text-slate-400">
                <th className="py-3 px-4 w-80">Line Item</th>
                <th className="py-3 px-3 text-right">Jan 2026 (5 wks)</th>
                <th className="py-3 px-3 text-right">Feb 2026 (4 wks)</th>
                <th className="py-3 px-3 text-right">Mar 2026 (5 wks)</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">Q1 Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {/* --- SECTION: REVENUE --- */}
              <tr
                onClick={() => toggleSection('rev')}
                className="bg-slate-100/80 dark:bg-slate-950/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-850 font-sans transition-colors"
              >
                <td colSpan={5} className="py-2.5 px-4 font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  {expandedSections.rev ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Revenue Streams
                </td>
              </tr>
              {expandedSections.rev && (
                <>
                  {[
                    { id: 'rev_food', label: 'Food Sales (POS Batch Deposits)' },
                    { id: 'rev_beverage', label: 'Beverage Sales (POS Batch Deposits)' },
                    { id: 'rev_catering', label: 'Catering Contract Sales' },
                    { id: 'rev_delivery', label: 'Delivery Marketplace Gross Sales' },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleLineClick(row.label, row.id)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer group transition-colors"
                    >
                      <td className="py-2 px-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{row.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                      </td>
                      {months.map((m) => {
                        const item = monthlyPLs[m]?.revenueSection.items.find((i) => i.id === row.id);
                        return (
                          <td key={m} className="py-2 px-3 text-right text-slate-800 dark:text-slate-200">
                            ${fmt(item?.amount || 0)}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        ${fmt(
                          months.reduce((acc, m) => {
                            const item = monthlyPLs[m]?.revenueSection.items.find((i) => i.id === row.id);
                            return acc + (item?.amount || 0);
                          }, 0)
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Gross Revenue Total */}
                  <tr className="bg-slate-50 dark:bg-slate-850/60 font-bold border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 px-4 font-sans text-slate-900 dark:text-white">Total Gross Revenue</td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                        ${fmt(monthlyPLs[m]?.grossRevenue || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-extrabold">
                      ${fmt(q1Totals.grossRev)}
                    </td>
                  </tr>

                  {/* Refunds & Discounts (Contra-Revenue) */}
                  <tr
                    onClick={() => handleLineClick('Refunds & Discounts', 'rev_refunds')}
                    className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 cursor-pointer group text-rose-700 dark:text-rose-300"
                  >
                    <td className="py-2 px-6 font-sans flex items-center justify-between">
                      <span>Refunds & Promotional Discounts (Contra-Rev)</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-rose-500 transition-opacity" />
                    </td>
                    {months.map((m) => (
                      <td key={m} className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">
                        -${fmt(Math.abs(monthlyPLs[m]?.refunds || 0))}
                      </td>
                    ))}
                    <td className="py-2 px-4 text-right text-rose-600 dark:text-rose-400 font-bold">
                      -${fmt(Math.abs(q1Totals.refunds))}
                    </td>
                  </tr>

                  {/* Net Revenue */}
                  <tr className="bg-indigo-50/70 dark:bg-indigo-950/40 font-bold border-t border-indigo-200 dark:border-indigo-900/50">
                    <td className="py-2.5 px-4 font-sans text-indigo-900 dark:text-indigo-200 font-extrabold">Net Revenue</td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-indigo-950 dark:text-indigo-200 font-bold">
                        ${fmt(monthlyPLs[m]?.netRevenue || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-indigo-950 dark:text-indigo-100 font-black">
                      ${fmt(q1Totals.netRev)}
                    </td>
                  </tr>
                </>
              )}

              {/* --- SECTION: COGS --- */}
              <tr
                onClick={() => toggleSection('cogs')}
                className="bg-slate-100/80 dark:bg-slate-950/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-850 font-sans transition-colors"
              >
                <td colSpan={5} className="py-2.5 px-4 font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  {expandedSections.cogs ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Cost of Goods Sold (COGS)
                </td>
              </tr>
              {expandedSections.cogs && (
                <>
                  {[
                    { id: 'cogs_food', label: 'Food Inventory Purchases' },
                    { id: 'cogs_beverage', label: 'Beverage Inventory Purchases' },
                    { id: 'cogs_packaging', label: 'Packaging & Disposables' },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleLineClick(row.label, row.id)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer group transition-colors"
                    >
                      <td className="py-2 px-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{row.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500" />
                      </td>
                      {months.map((m) => {
                        const item = monthlyPLs[m]?.cogsSection.items.find((i) => i.id === row.id);
                        return (
                          <td key={m} className="py-2 px-3 text-right text-slate-800 dark:text-slate-200">
                            ${fmt(item?.amount || 0)}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        ${fmt(
                          months.reduce((acc, m) => {
                            const item = monthlyPLs[m]?.cogsSection.items.find((i) => i.id === row.id);
                            return acc + (item?.amount || 0);
                          }, 0)
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Total COGS */}
                  <tr className="bg-slate-50 dark:bg-slate-850/60 font-bold border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 px-4 font-sans text-slate-900 dark:text-white">Total Cost of Goods Sold</td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                        ${fmt(monthlyPLs[m]?.totalCogs || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-extrabold">
                      ${fmt(q1Totals.cogs)}
                    </td>
                  </tr>

                  {/* Gross Profit */}
                  <tr className="bg-emerald-50/80 dark:bg-emerald-950/30 font-bold border-t border-emerald-200 dark:border-emerald-900/40">
                    <td className="py-2.5 px-4 font-sans text-emerald-800 dark:text-emerald-300 font-extrabold">Gross Profit</td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-emerald-800 dark:text-emerald-300 font-bold">
                        ${fmt(monthlyPLs[m]?.grossProfit || 0)}
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 font-normal">
                          ({monthlyPLs[m]?.grossMarginPct.toFixed(1)}%)
                        </span>
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-emerald-900 dark:text-emerald-200 font-black">
                      ${fmt(q1Totals.grossProfit)}
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-1 font-normal">
                        ({q1Totals.grossMarginPct.toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                </>
              )}

              {/* --- SECTION: PAYROLL --- */}
              <tr
                onClick={() => toggleSection('payroll')}
                className="bg-slate-100/80 dark:bg-slate-950/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-850 font-sans transition-colors"
              >
                <td colSpan={5} className="py-2.5 px-4 font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  {expandedSections.payroll ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Payroll & Staff Compensation
                </td>
              </tr>
              {expandedSections.payroll && (
                <>
                  {[
                    { id: 'payroll_hourly', label: 'Hourly Wages (Kitchen & FOH)' },
                    { id: 'payroll_taxes', label: 'Payroll Taxes & Employee Benefits' },
                    { id: 'payroll_manager', label: 'Manager Salary' },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleLineClick(row.label, row.id)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer group transition-colors"
                    >
                      <td className="py-2 px-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{row.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500" />
                      </td>
                      {months.map((m) => {
                        const item = monthlyPLs[m]?.payrollSection.items.find((i) => i.id === row.id);
                        return (
                          <td key={m} className="py-2 px-3 text-right text-slate-800 dark:text-slate-200">
                            ${fmt(item?.amount || 0)}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        ${fmt(
                          months.reduce((acc, m) => {
                            const item = monthlyPLs[m]?.payrollSection.items.find((i) => i.id === row.id);
                            return acc + (item?.amount || 0);
                          }, 0)
                        )}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-50 dark:bg-slate-850/60 font-bold border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 px-4 font-sans text-slate-900 dark:text-white">Total Staff Compensation</td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                        ${fmt(monthlyPLs[m]?.totalPayroll || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-extrabold">
                      ${fmt(q1Totals.payroll)}
                    </td>
                  </tr>
                </>
              )}

              {/* --- SECTION: OPEX --- */}
              <tr
                onClick={() => toggleSection('opex')}
                className="bg-slate-100/80 dark:bg-slate-950/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-850 font-sans transition-colors"
              >
                <td colSpan={5} className="py-2.5 px-4 font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  {expandedSections.opex ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Operating Expenses (Opex)
                </td>
              </tr>
              {expandedSections.opex && (
                <>
                  {[
                    { id: 'opex_rent', label: 'Premises Rent' },
                    { id: 'opex_utilities', label: 'Utilities (Electric, Gas, Water)' },
                    { id: 'opex_insurance', label: 'Commercial Insurance Premium' },
                    { id: 'opex_marketing', label: 'Marketing & Local Advertising' },
                    { id: 'opex_repairs', label: 'Repairs & Maintenance' },
                    { id: 'opex_cleaning', label: 'Cleaning & Linen Service' },
                    { id: 'opex_software', label: 'POS & Software Subscriptions' },
                    { id: 'opex_internet', label: 'Internet & Broadband Phone' },
                    { id: 'opex_accounting', label: 'Accounting & Bookkeeping Services' },
                    { id: 'opex_office', label: 'Office & Administrative Supplies' },
                    { id: 'opex_licenses', label: 'Licenses & Municipal Permits' },
                    { id: 'opex_delivery_comm', label: 'Delivery Platform Commissions' },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleLineClick(row.label, row.id)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 cursor-pointer group transition-colors"
                    >
                      <td className="py-1.5 px-6 font-sans text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>{row.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-500" />
                      </td>
                      {months.map((m) => {
                        const item = monthlyPLs[m]?.opexSection.items.find((i) => i.id === row.id);
                        return (
                          <td key={m} className="py-1.5 px-3 text-right text-slate-800 dark:text-slate-200">
                            ${fmt(item?.amount || 0)}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        ${fmt(
                          months.reduce((acc, m) => {
                            const item = monthlyPLs[m]?.opexSection.items.find((i) => i.id === row.id);
                            return acc + (item?.amount || 0);
                          }, 0)
                        )}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-50 dark:bg-slate-850/60 font-bold border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2.5 px-4 font-sans text-slate-900 dark:text-white">Total Operating Expenses</td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-slate-900 dark:text-white">
                        ${fmt(monthlyPLs[m]?.totalOpex || 0)}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-extrabold">
                      ${fmt(q1Totals.opex)}
                    </td>
                  </tr>
                </>
              )}

              {/* --- OPERATING PROFIT --- */}
              <tr className="bg-emerald-100/70 dark:bg-emerald-950/50 font-bold border-t-2 border-emerald-500 text-sm">
                <td className="py-3.5 px-4 font-sans text-emerald-900 dark:text-emerald-300 font-extrabold">Operating Profit (EBIT)</td>
                {months.map((m) => (
                  <td key={m} className="py-3.5 px-3 text-right text-emerald-900 dark:text-emerald-300 font-black">
                    ${fmt(monthlyPLs[m]?.operatingProfit || 0)}
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                      Margin: {monthlyPLs[m]?.operatingMarginPct.toFixed(1)}%
                    </div>
                  </td>
                ))}
                <td className="py-3.5 px-4 text-right text-emerald-950 dark:text-emerald-200 font-black">
                  ${fmt(q1Totals.operatingProfit)}
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                    Margin: {q1Totals.operatingMarginPct.toFixed(1)}%
                  </div>
                </td>
              </tr>

              {/* --- EXCLUDED FROM P&L SECTION --- */}
              <tr
                onClick={() => toggleSection('excluded')}
                className="bg-amber-50/80 dark:bg-slate-950/90 cursor-pointer hover:bg-amber-100/60 dark:hover:bg-slate-850 font-sans border-t-2 border-slate-200 dark:border-slate-800 transition-colors"
              >
                <td colSpan={5} className="py-3 px-4 font-bold text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {expandedSections.excluded ? <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    <span>Non-P&L Excluded Cash Movements (Balance Sheet, Financing, Equity)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Mandatory reconciliation to net bank cash
                  </span>
                </td>
              </tr>
              {expandedSections.excluded && (
                <>
                  {[
                    { label: 'Capex / Convection Oven Purchase (BALANCE_SHEET_ASSET)', id: 'bs_equipment_BALANCE_SHEET_ASSET' },
                    { label: 'Sales Tax Remittance (LIABILITY)', id: 'liab_sales_tax_LIABILITY' },
                    { label: 'Gift Card Sales Deposit (LIABILITY - Deferred Revenue)', id: 'liab_gift_cards_LIABILITY' },
                    { label: 'Loan Principal Repayment (FINANCING)', id: 'fin_loan_principal_FINANCING' },
                    { label: 'Owner Partner Distribution (EQUITY)', id: 'eq_owner_distribution_EQUITY' },
                  ].map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleLineClick(row.label, row.id)}
                      className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 cursor-pointer group text-xs text-slate-600 dark:text-slate-400 transition-colors"
                    >
                      <td className="py-2 px-6 font-sans text-slate-800 dark:text-slate-300 flex items-center justify-between">
                        <span>{row.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-600" />
                      </td>
                      {months.map((m) => {
                        const item = monthlyPLs[m]?.excludedSection.items.find((i) => i.id === row.id);
                        const val = item ? item.amount : 0;
                        return (
                          <td key={m} className={`py-2 px-3 text-right font-mono ${val !== 0 ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-400 dark:text-slate-600'}`}>
                            {val < 0 ? '-' : ''}${fmt(Math.abs(val))}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 text-right font-mono font-bold text-amber-800 dark:text-amber-200">
                        {(() => {
                          const total = months.reduce((acc, m) => {
                            const item = monthlyPLs[m]?.excludedSection.items.find((i) => i.id === row.id);
                            return acc + (item?.amount || 0);
                          }, 0);
                          return `${total < 0 ? '-' : ''}$${fmt(Math.abs(total))}`;
                        })()}
                      </td>
                    </tr>
                  ))}

                  <tr
                    onClick={() => handleLineClick('All Non-P&L Excluded Cash Movements', 'excluded_all')}
                    className="bg-amber-100/50 dark:bg-slate-900 font-bold border-t border-amber-200 dark:border-slate-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-slate-850 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-sans text-amber-900 dark:text-slate-300 flex items-center justify-between">
                      <span>Total Excluded Cash Movement</span>
                      <ExternalLink className="w-3 h-3 text-amber-600" />
                    </td>
                    {months.map((m) => (
                      <td key={m} className="py-2.5 px-3 text-right text-amber-800 dark:text-amber-300">
                        {monthlyPLs[m]?.excludedSection.total < 0 ? '-' : ''}${fmt(Math.abs(monthlyPLs[m]?.excludedSection.total || 0))}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right text-amber-900 dark:text-amber-200 font-extrabold">
                      {q1Totals.excluded < 0 ? '-' : ''}${fmt(Math.abs(q1Totals.excluded))}
                    </td>
                  </tr>

                  {/* Cash Flow Reconciliation Invariant */}
                  <tr className="bg-emerald-50 dark:bg-slate-950 font-bold border-t-2 border-emerald-300 dark:border-slate-700 text-emerald-900 dark:text-emerald-400">
                    <td className="py-3 px-4 font-sans flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Net Bank Cash Movement (Operating Profit + Excluded Cash)</span>
                    </td>
                    {months.map((m) => (
                      <td key={m} className="py-3 px-3 text-right font-bold text-emerald-800 dark:text-emerald-400">
                        {monthlyPLs[m]?.totalRawCash < 0 ? '-' : ''}${fmt(Math.abs(monthlyPLs[m]?.totalRawCash || 0))}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-black text-emerald-900 dark:text-emerald-300">
                      {q1Totals.rawCash < 0 ? '-' : ''}${fmt(Math.abs(q1Totals.rawCash))}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
