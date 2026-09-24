import { describe, it, expect } from 'vitest';
import { runAllEvals } from './evals';

describe('FinReview Financial AI & Hallucination Guard Evals', () => {
  it('runs all 12 benchmarks and satisfies >= 90% threshold', async () => {
    const summary = await runAllEvals();
    expect(summary.calcPassRate).toBe(100);
    expect(summary.explPassRate).toBeGreaterThanOrEqual(90);
    expect(summary.passed).toBe(12);
  });
});
