import { describe, it, expect } from "vitest";
import { PASS_MARK_PERCENT, gradeLetter, isPass, scorePercent, summarizeScores } from "@/lib/grading";

describe("pass mark", () => {
  it("is 70%, defined in exactly one place", () => {
    expect(PASS_MARK_PERCENT).toBe(70);
  });

  it("isPass is inclusive at the pass mark", () => {
    expect(isPass(69.99)).toBe(false);
    expect(isPass(70)).toBe(true);
    expect(isPass(100)).toBe(true);
    expect(isPass(0)).toBe(false);
  });
});

describe("gradeLetter", () => {
  it.each([
    [100, "A"], [93, "A"], [92, "A-"], [90, "A-"], [89, "B+"], [87, "B+"], [86, "B"], [83, "B"],
    [82, "B-"], [80, "B-"], [79, "C"], [70, "C"], [69, "D"], [0, "D"],
  ])("%s%% is %s", (percent, letter) => {
    expect(gradeLetter(percent)).toBe(letter);
  });

  it("anything below the pass mark is a D, never a pass letter", () => {
    for (let p = 0; p < PASS_MARK_PERCENT; p++) expect(gradeLetter(p)).toBe("D");
  });
});

describe("scorePercent", () => {
  it("scales by the assignment's own maximum", () => {
    expect(scorePercent(45, 50)).toBe(90);
    expect(scorePercent(7, 10)).toBe(70);
    expect(scorePercent(100, 100)).toBe(100);
  });

  it("treats a missing or invalid maximum as 100 instead of dividing by zero", () => {
    expect(scorePercent(80, undefined)).toBe(80);
    expect(scorePercent(80, null)).toBe(80);
    expect(scorePercent(80, 0)).toBe(80);
  });
});

describe("summarizeScores", () => {
  it("returns no figures at all when nothing is graded (never invented ones)", () => {
    expect(summarizeScores([])).toEqual({ count: 0, average: null, letter: null, passRate: null, distribution: null });
  });

  it("ignores non-numbers", () => {
    expect(summarizeScores([NaN, Infinity]).average).toBeNull();
    expect(summarizeScores([80, NaN]).count).toBe(1);
  });

  it("averages, grades and counts passes from real scores", () => {
    const s = summarizeScores([95, 85, 75, 55]);
    expect(s.count).toBe(4);
    expect(s.average).toBe(78);
    expect(s.letter).toBe("C");
    expect(s.passRate).toBe(75); // 95, 85 and 75 pass; 55 does not
  });

  it("counts a 70-79% score as PASSING (the old dashboard wrongly called only 80%+ passing)", () => {
    expect(summarizeScores([75]).passRate).toBe(100);
    expect(summarizeScores([69]).passRate).toBe(0);
  });

  it("splits grades into A (90+), B (80-89) and everything else, always summing to 100", () => {
    const s = summarizeScores([95, 91, 85, 82, 60, 40]);
    expect(s.distribution).toEqual({ pctA: 33, pctB: 33, pctBelow80: 34 });
    for (const set of [[100], [10], [95, 85, 75], [91, 92, 93, 81, 82, 50, 51]]) {
      const d = summarizeScores(set).distribution!;
      expect(d.pctA + d.pctB + d.pctBelow80).toBe(100);
    }
  });

  it("a single perfect score is 100% A", () => {
    expect(summarizeScores([100]).distribution).toEqual({ pctA: 100, pctB: 0, pctBelow80: 0 });
  });
});
