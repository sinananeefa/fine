import * as fs from 'fs';
import * as path from 'path';
import { ingestTransactions } from '../src/services/parser';
import { classifyByRules, classifyFallback, BASE_RULES } from '../src/services/classifier';
import { calculateMonthlyPL, getEffectiveTransactions } from '../src/services/pnl';
import { generateReviewItems } from '../src/services/review';
import { Classification } from '../src/types/accounting';

async function seed() {
  console.log('Seeding FinReview database and cache with standard dataset...');
  const csvPath = path.resolve(process.cwd(), 'data/NYC_Restaurant_Co__-_Raw_Transactions.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const { transactions, validation } = ingestTransactions(csvContent);
  console.log(`Ingested ${transactions.length} transactions across dates ${validation.dateSpan}.`);

  const classifications = new Map<string, Classification>();
  for (const t of transactions) {
    const cls = classifyByRules(t, BASE_RULES) || classifyFallback(t);
    classifications.set(t.id, cls);
  }

  const effective = getEffectiveTransactions(transactions, classifications);
  const jan = calculateMonthlyPL('2026-01', effective);
  const feb = calculateMonthlyPL('2026-02', effective);
  const mar = calculateMonthlyPL('2026-03', effective);

  console.log(`P&L Jan Net Revenue: $${jan.netRevenue.toLocaleString()}, Operating Profit: $${jan.operatingProfit.toLocaleString()}`);
  console.log(`P&L Feb Net Revenue: $${feb.netRevenue.toLocaleString()}, Operating Profit: $${feb.operatingProfit.toLocaleString()}`);
  console.log(`P&L Mar Net Revenue: $${mar.netRevenue.toLocaleString()}, Operating Profit: $${mar.operatingProfit.toLocaleString()}`);

  const reviewItems = generateReviewItems(transactions, classifications);
  console.log(`Pre-seeded ${reviewItems.length} review triage items.`);

  console.log('✅ Seeding complete.');
}

seed().catch(console.error);
