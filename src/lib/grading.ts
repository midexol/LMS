/**
 * The one place that defines the pass mark and how scores are summarised.
 * Everything that decides or displays "passed" (course completion, dashboards, emails, the FAQ)
 * must use PASS_MARK_PERCENT so the rule can never disagree with itself.
 */
export const PASS_MARK_PERCENT = 70;

export function isPass(percent: number): boolean {
  return percent >= PASS_MARK_PERCENT;
}

/** Letter grade for a percentage. The cut-offs below the pass mark are deliberately coarse. */
export function gradeLetter(percent: number): string {
  if (percent >= 93) return "A";
  if (percent >= 90) return "A-";
  if (percent >= 87) return "B+";
  if (percent >= 83) return "B";
  if (percent >= 80) return "B-";
  if (percent >= PASS_MARK_PERCENT) return "C";
  return "D";
}

export interface ScoreSummary {
  /** Number of graded submissions the figures are based on */
  count: number;
  /** Mean percentage, or null when nothing has been graded (never an invented number) */
  average: number | null;
  letter: string | null;
  /** Share of graded submissions at or above the pass mark, 0-100 */
  passRate: number | null;
  /** Share of graded submissions: A is 90+, B is 80-89, below80 is everything else. Sums to 100. */
  distribution: { pctA: number; pctB: number; pctBelow80: number } | null;
}

/**
 * Summarises submission percentages (each already score / maxScore * 100).
 * With no data every figure is null, so screens can say "no graded work yet" instead of showing made-up values.
 */
export function summarizeScores(percents: number[]): ScoreSummary {
  const valid = percents.filter((p) => Number.isFinite(p));
  if (valid.length === 0) {
    return { count: 0, average: null, letter: null, passRate: null, distribution: null };
  }

  const average = Math.round(valid.reduce((sum, p) => sum + p, 0) / valid.length);
  const share = (n: number) => Math.round((n / valid.length) * 100);
  const pctA = share(valid.filter((p) => p >= 90).length);
  const pctB = share(valid.filter((p) => p >= 80 && p < 90).length);

  return {
    count: valid.length,
    average,
    letter: gradeLetter(average),
    passRate: share(valid.filter(isPass).length),
    distribution: { pctA, pctB, pctBelow80: Math.max(0, 100 - pctA - pctB) },
  };
}

/** A submission's score as a percentage of its assignment's maximum. */
export function scorePercent(score: number, maxScore: number | null | undefined): number {
  const max = maxScore && maxScore > 0 ? maxScore : 100;
  return (score / max) * 100;
}
