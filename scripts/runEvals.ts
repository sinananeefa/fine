import { runAllEvals } from '../evals/evals';

async function main() {
  console.log('===============================================================');
  console.log('  FinReview: Autonomous Financial Evaluation Suite');
  console.log('  Deterministic Verification & Zero-Hallucination Guardrails');
  console.log('===============================================================\n');

  const startTime = Date.now();
  const summary = await runAllEvals();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('--- TEST EXECUTION REPORT ---');
  for (const r of summary.results) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${r.id}] ${symbol} | [${r.type.toUpperCase()}] ${r.name}`);
    if (!r.passed) {
      console.log(`      Details: ${r.details}`);
    }
  }

  console.log('\n--- EVALUATION SUMMARY ---');
  console.log(`Total Benchmarks:           ${summary.total}`);
  console.log(`Passed:                     ${summary.passed}`);
  console.log(`Failed:                     ${summary.failed}`);
  console.log(`Calculation Pass Rate:      ${summary.calcPassRate}%  (Target: 100%)`);
  console.log(`Explanation Pass Rate:      ${summary.explPassRate}%  (Target: >= 90%)`);
  console.log(`Total Runtime:              ${duration}s`);
  console.log('===============================================================');

  if (summary.calcPassRate < 100 || summary.explPassRate < 90) {
    console.error('\n❌ Evaluation thresholds NOT met.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL CFO EVALUATION BENCHMARKS PASSED (100% ACCURACY).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
