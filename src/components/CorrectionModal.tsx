import React, { useState } from 'react';
import { X, Check, ShieldAlert, Sparkles, Layers, AlertCircle } from 'lucide-react';
import {
  EffectiveTransaction,
  CHART_OF_ACCOUNTS,
  Treatment,
  TreatmentEnum,
} from '../types/accounting';

interface CorrectionModalProps {
  transaction: EffectiveTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveCorrection: (params: {
    txnId: string;
    newCategoryId: string;
    newTreatment: Treatment;
    userNote: string;
    applyToSimilar: boolean;
  }) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSaveCorrection,
}) => {
  if (!isOpen || !transaction) return null;

  const [categoryId, setCategoryId] = useState(transaction.category.id);
  const [treatment, setTreatment] = useState<Treatment>(transaction.treatment);
  const [userNote, setUserNote] = useState('');
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form fields when opened with a new transaction
  React.useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.category.id);
      setTreatment(transaction.treatment);
      setUserNote('');
      setApplyToSimilar(false);
      setErrorMessage('');
    }
  }, [transaction?.id, isOpen]);

  const selectedCategoryDef = CHART_OF_ACCOUNTS.find((c) => c.id === categoryId);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCatId = e.target.value;
    setCategoryId(newCatId);
    const cat = CHART_OF_ACCOUNTS.find((c) => c.id === newCatId);
    if (cat) {
      setTreatment(cat.defaultTreatment);
    }
  };

  const handleSave = () => {
    if (!userNote.trim()) {
      setErrorMessage('Please enter a brief audit note explaining this classification change.');
      return;
    }
    setErrorMessage('');
    onSaveCorrection({
      txnId: transaction.id,
      newCategoryId: categoryId,
      newTreatment: treatment,
      userNote,
      applyToSimilar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Reclassify Transaction</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Transaction Summary Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40 mr-2">
                  {transaction.id}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{transaction.date}</span>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{transaction.description}</h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{transaction.counterparty} • {transaction.method}</div>
              </div>
              <div className={`font-mono text-base font-bold ${transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {transaction.amount < 0 ? '-' : ''}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chart of Accounts Category
              </label>
              <select
                value={categoryId}
                onChange={handleCategoryChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {CHART_OF_ACCOUNTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.section}] {c.name}
                  </option>
                ))}
              </select>
              {selectedCategoryDef && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedCategoryDef.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Accounting Treatment
              </label>
              <select
                value={treatment}
                onChange={(e) => setTreatment(e.target.value as Treatment)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="PNL">PNL (Included in Operating Profit)</option>
                <option value="BALANCE_SHEET_ASSET">BALANCE_SHEET_ASSET (Capex / Asset, Excluded from P&L)</option>
                <option value="LIABILITY">LIABILITY (Sales Tax / Gift Cards, Excluded from P&L)</option>
                <option value="FINANCING">FINANCING (Debt Principal, Excluded from P&L)</option>
                <option value="EQUITY">EQUITY (Owner Distribution, Excluded from P&L)</option>
                <option value="UNCLEAR">UNCLEAR (Suspense Account)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Audit Reason & Reason Note <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={userNote}
                onChange={(e) => {
                  setUserNote(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="E.g., Capex equipment addition subject to depreciation schedule, or prepaid annual amortization"
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="applySimilar"
                checked={applyToSimilar}
                onChange={(e) => setApplyToSimilar(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="applySimilar" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                Create recurring rule for vendor &apos;{transaction.counterparty}&apos;
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save & Recompute P&L</span>
          </button>
        </div>
      </div>
    </div>
  );
};
