import * as fs from 'fs';
import * as path from 'path';
import { ingestTransactions } from '../src/services/parser';
import { classifyByRules, classifyFallback } from '../src/services/classifier';
import { calculateMonthlyPL, getEffectiveTransactions } from '../src/services/pnl';
import {
  answerFinancialQuery,
  DeterministicFinancialTools,
  verifyResponseAgainstTools,
  AnalystToolContext,
} from '../src/services/analyst';
import { Classification, DEFAULT_CONVENTIONS } from '../src/types/accounting';

export interface EvalCase {
  id: string;
  name: string;
  type: 'calculation' | 'explanation' | 'hallucination_guard';
  query: string;
  expectedTool: string;
  expectedTokens: (string | number)[];
  forbiddenTokens?: (string | number)[];
}

export const EVAL_CASES: EvalCase[] = [
  // 1. Total revenue Jan
  {
    id: 'eval-01',
    name: 'Total Revenue Jan 2026',
    type: 'calculation',
    query: 'What was our total gross and net revenue for January 2026?',
    expectedTool: 'get_pnl',
    expectedTokens: [128821.61, 126399.09, 2422.52],
  },
  // 2. Total revenue Feb
  {
    id: 'eval-02',
    name: 'Total Revenue Feb 2026',
    type: 'calculation',
    query: 'What was the gross revenue and net revenue in February?',
    expectedTool: 'get_pnl',
    expectedTokens: [127569.49, 125617.29],
  },
  // 3. Total revenue Mar
  {
    id: 'eval-03',
    name: 'Total Revenue Mar 2026',
    type: 'calculation',
    query: 'What was our net revenue for March 2026?',
    expectedTool: 'get_pnl',
    expectedTokens: [154122.87, 150535.07],
  },
  // 4. Food cost COGS Jan
  {
    id: 'eval-04',
    name: 'Food Cost COGS Jan 2026',
    type: 'calculation',
    query: 'What was our food cost percentage and total COGS for January?',
    expectedTool: 'get_pnl',
    expectedTokens: [45715.56, 80683.53],
  },
  // 5. Operating profit Jan
  {
    id: 'eval-05',
    name: 'Operating Profit Jan 2026',
    type: 'calculation',
    query: 'What was our operating profit for January 2026?',
    expectedTool: 'get_pnl',
    expectedTokens: [14470.53],
  },
  // 6. February Margin Drop Explanation
  {
    id: 'eval-06',
    name: 'February Margin Drop Explanation',
    type: 'explanation',
    query: 'Why did operating profit decline in February compared to January?',
    expectedTool: 'get_pnl',
    expectedTokens: [14470.53, 6007.96, 8462.57],
  },
  // 7. Large Catering Purchase Investigation (T1179)
  {
    id: 'eval-07',
    name: 'Large Catering Event Purchase Investigation',
    type: 'explanation',
    query: 'Can you investigate transaction T1179 for large catering event purchase from Sysco?',
    expectedTool: 'check_anomaly',
    expectedTokens: ['T1179', 6200.00, 'Sysco'],
  },
  // 8. Sales Tax Treatment & State Payee (T1062)
  {
    id: 'eval-08',
    name: 'Sales Tax Remittance & State Check',
    type: 'explanation',
    query: 'How was the sales tax remittance transaction T1062 handled and why is it flagged?',
    expectedTool: 'check_anomaly',
    expectedTokens: ['T1062', 6150.00, 'Florida Dept. of Revenue'],
  },
  // 9. Capex Equipment Treatment (T1061)
  {
    id: 'eval-09',
    name: 'Capex Oven Purchase Review',
    type: 'calculation',
    query: 'What was the oven equipment purchase T1061 amount and why is it excluded from P&L?',
    expectedTool: 'check_anomaly',
    expectedTokens: ['T1061', 7800.00],
  },
  // 10. Hallucination Prevention - Unsupported Figure
  {
    id: 'eval-10',
    name: 'Hallucination Prevention Guard',
    type: 'hallucination_guard',
    query: 'Did we spend $99,999.00 on consulting in February?',
    expectedTool: 'get_pnl',
    expectedTokens: [],
    forbiddenTokens: [99999.00],
  },
  // 11. Gift Card Deferred Revenue Treatment (T1117)
  {
    id: 'eval-11',
    name: 'Gift Card Deferred Revenue Check',
    type: 'calculation',
    query: 'What was transaction T1117 for gift cards and why is it excluded from revenue?',
    expectedTool: 'check_anomaly',
    expectedTokens: ['T1117', 2400.00],
  },
  // 12. Prepaid License Flow-Through (T1181)
  {
    id: 'eval-12',
    name: 'Annual License Review T1181',
    type: 'explanation',
    query: 'Tell me about the annual license renewal T1181 and prepaid option',
    expectedTool: 'check_anomaly',
    expectedTokens: ['T1181', 900.00],
  },
];

export async function runAllEvals(): Promise<{
  total: number;
  passed: number;
  failed: number;
  calcPassRate: number;
  explPassRate: number;
  results: { id: string; name: string; type: string; passed: boolean; details: string }[];
}> {
  const csvPath = path.resolve(process.cwd(), 'data/NYC_Restaurant_Co__-_Raw_Transactions.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const { transactions } = ingestTransactions(csvContent);

  const classifications = new Map<string, Classification>();
  for (const t of transactions) {
    const cls = classifyByRules(t) || classifyFallback(t);
    classifications.set(t.id, cls);
  }

  const effectiveTxns = getEffectiveTransactions(transactions, classifications);

  const context: AnalystToolContext = {
    transactions,
    classifications,
    effectiveTransactions: effectiveTxns,
    conventions: DEFAULT_CONVENTIONS,
    auditHistory: [],
  };

  const results: { id: string; name: string; type: string; passed: boolean; details: string }[] = [];
  let calcPassed = 0;
  let calcTotal = 0;
  let explPassed = 0;
  let explTotal = 0;

  for (const testCase of EVAL_CASES) {
    const res = await answerFinancialQuery(testCase.query, context);

    let pass = true;
    const notes: string[] = [];

    // Check expected tokens
    for (const exp of testCase.expectedTokens) {
      if (typeof exp === 'number') {
        const found = res.verification.verifiedNumbers.some((v) => Math.abs(v - exp) <= 0.05) ||
          res.answer.includes(exp.toLocaleString('en-US')) ||
          res.answer.includes(exp.toString());
        if (!found) {
          pass = false;
          notes.push(`Missing expected number: ${exp}`);
        }
      } else {
        if (!res.answer.toLowerCase().includes(exp.toLowerCase())) {
          pass = false;
          notes.push(`Missing expected text: ${exp}`);
        }
      }
    }

    // Check forbidden tokens
    if (testCase.forbiddenTokens) {
      for (const forb of testCase.forbiddenTokens) {
        if (res.answer.includes(forb.toString())) {
          pass = false;
          notes.push(`Included forbidden hallucinated token: ${forb}`);
        }
      }
    }

    if (testCase.type === 'calculation') {
      calcTotal++;
      if (pass) calcPassed++;
    } else {
      explTotal++;
      if (pass) explPassed++;
    }

    results.push({
      id: testCase.id,
      name: testCase.name,
      type: testCase.type,
      passed: pass,
      details: notes.length > 0 ? notes.join('; ') : 'All assertions passed with verified sources',
    });
  }

  const calcPassRate = calcTotal > 0 ? Math.round((calcPassed / calcTotal) * 100) : 100;
  const explPassRate = explTotal > 0 ? Math.round((explPassed / explTotal) * 100) : 100;

  return {
    total: EVAL_CASES.length,
    passed: calcPassed + explPassed,
    failed: EVAL_CASES.length - (calcPassed + explPassed),
    calcPassRate,
    explPassRate,
    results,
  };
}
