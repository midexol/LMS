import { describe, it, expect, vi } from "vitest";
import { calculateCheckout, computePaystackChargeKobo, getFeeConfig, FeeConfig } from "@/lib/fees";
import { computePaystackChargeKobo as fromPaymentModule } from "@/lib/payment";

const OFF: FeeConfig = { platformFeeNgn: 0, passProcessingFee: false, platformFeeLabel: "Platform service fee" };
const YOUR_SETUP: FeeConfig = { platformFeeNgn: 400, passProcessingFee: true, platformFeeLabel: "Platform service fee" };

/** What is left after Paystack takes its cut from a charge of `totalNgn`, in kobo. */
const netKobo = (totalNgn: number) => totalNgn * 100 - computePaystackChargeKobo(totalNgn * 100);

describe("Paystack fee formula", () => {
  it("is 1.5%, plus N100 above N2,500, capped at N2,000", () => {
    expect(computePaystackChargeKobo(100_000)).toBe(1_500); // N1,000
    expect(computePaystackChargeKobo(250_000)).toBe(3_750); // exactly N2,500: no flat fee yet
    expect(computePaystackChargeKobo(250_100)).toBe(3_752 + 10_000); // just above: flat fee applies
    expect(computePaystackChargeKobo(2_000_000)).toBe(30_000 + 10_000); // N20,000 -> N400
    expect(computePaystackChargeKobo(100_000_000)).toBe(200_000); // capped
  });

  it("is the same function the payment module exposes", () => {
    expect(fromPaymentModule).toBe(computePaystackChargeKobo);
  });
});

describe("getFeeConfig", () => {
  it("defaults to no fees at all (nothing changes until you opt in)", () => {
    expect(getFeeConfig()).toEqual({ platformFeeNgn: 0, passProcessingFee: false, platformFeeLabel: "Platform service fee" });
  });

  it("reads the platform fee, pass-through switch and label from the environment", () => {
    vi.stubEnv("PLATFORM_FEE_NGN", "400");
    vi.stubEnv("PASS_PAYSTACK_FEE", "true");
    vi.stubEnv("PLATFORM_FEE_LABEL", "  Learning platform fee ");
    expect(getFeeConfig()).toEqual({ platformFeeNgn: 400, passProcessingFee: true, platformFeeLabel: "Learning platform fee" });
  });

  it("only treats the exact word 'true' as on (case-insensitive)", () => {
    for (const v of ["TRUE", " True "]) {
      vi.stubEnv("PASS_PAYSTACK_FEE", v);
      expect(getFeeConfig().passProcessingFee).toBe(true);
    }
    for (const v of ["yes", "1", "false", ""]) {
      vi.stubEnv("PASS_PAYSTACK_FEE", v);
      expect(getFeeConfig().passProcessingFee).toBe(false);
    }
  });

  it("ignores nonsense and negative fees instead of charging them", () => {
    for (const v of ["abc", "-100", "", "NaN"]) {
      vi.stubEnv("PLATFORM_FEE_NGN", v);
      expect(getFeeConfig().platformFeeNgn).toBe(0);
    }
    vi.stubEnv("PLATFORM_FEE_NGN", "399.6");
    expect(getFeeConfig().platformFeeNgn).toBe(400); // whole Naira
  });
});

describe("calculateCheckout", () => {
  it("with no fees configured the student pays exactly the course price", () => {
    expect(calculateCheckout(20000, OFF)).toEqual({ coursePriceNgn: 20000, platformFeeNgn: 0, processingFeeNgn: 0, totalNgn: 20000, platformFeeLabel: "Platform service fee" });
  });

  it("YOUR SETUP: a N20,000 course with a N400 fee and Paystack's cut passed on costs N20,813", () => {
    const b = calculateCheckout(20000, YOUR_SETUP);
    expect(b).toMatchObject({ coursePriceNgn: 20000, platformFeeNgn: 400, processingFeeNgn: 413, totalNgn: 20813 });
    // after Paystack takes its cut you still hold the course price plus your fee
    expect(netKobo(b.totalNgn)).toBeGreaterThanOrEqual(20400 * 100);
    expect(netKobo(b.totalNgn)).toBeLessThan(20401 * 100 + 100); // and not meaningfully more: the student is not over-charged
  });

  it("the three lines always add up to the total", () => {
    for (const price of [1, 500, 2000, 2100, 2500, 2600, 5000, 15000, 20000, 99999, 250000, 1_000_000]) {
      const b = calculateCheckout(price, YOUR_SETUP);
      expect(b.coursePriceNgn + b.platformFeeNgn + b.processingFeeNgn).toBe(b.totalNgn);
    }
  });

  it("platform fee only (student does not cover Paystack) adds exactly the fee", () => {
    const b = calculateCheckout(20000, { ...OFF, platformFeeNgn: 400 });
    expect(b).toMatchObject({ platformFeeNgn: 400, processingFeeNgn: 0, totalNgn: 20400 });
  });

  it("pass-through only (no platform fee) lets you receive the full course price", () => {
    const b = calculateCheckout(20000, { ...OFF, passProcessingFee: true });
    expect(b.platformFeeNgn).toBe(0);
    expect(netKobo(b.totalNgn)).toBeGreaterThanOrEqual(20000 * 100);
    expect(b.totalNgn).toBeGreaterThan(20000);
  });

  it("free courses never carry fees", () => {
    expect(calculateCheckout(0, YOUR_SETUP)).toMatchObject({ coursePriceNgn: 0, platformFeeNgn: 0, processingFeeNgn: 0, totalNgn: 0 });
    expect(calculateCheckout(-50, YOUR_SETUP).totalNgn).toBe(0);
  });

  it("rounds fractional prices to whole Naira", () => {
    expect(calculateCheckout(19999.6, OFF).totalNgn).toBe(20000);
  });

  it("carries the label through", () => {
    expect(calculateCheckout(5000, { ...YOUR_SETUP, platformFeeLabel: "Service fee" }).platformFeeLabel).toBe("Service fee");
  });

  describe("the pass-through maths is exact across the whole price range", () => {
    const prices = [
      ...Array.from({ length: 400 }, (_, i) => 1 + i * 7), // N1 .. N2,800, across the N2,500 jump
      ...Array.from({ length: 500 }, (_, i) => 2400 + i * 997), // up to about N500,000, across the N2,000 cap
    ];

    it("never leaves you short: after Paystack's cut you always hold course price + your fee", () => {
      const short = prices.filter((p) => netKobo(calculateCheckout(p, YOUR_SETUP).totalNgn) < (p + 400) * 100);
      expect(short).toEqual([]);
    });

    it("never over-charges: one Naira less would leave you short (except across Paystack's N100 jump)", () => {
      const overcharged = prices.filter((p) => {
        const total = calculateCheckout(p, YOUR_SETUP).totalNgn;
        const lessIsEnough = netKobo(total - 1) >= (p + 400) * 100;
        const acrossJump = total - 1 <= 2500; // at or below N2,500 the N100 flat fee does not apply
        return lessIsEnough && !acrossJump && total - 1 >= p + 400;
      });
      expect(overcharged).toEqual([]);
    });

    it("the processing line never exceeds Paystack's N2,000 cap (plus rounding)", () => {
      for (const p of [200000, 500000, 2_000_000]) {
        expect(calculateCheckout(p, YOUR_SETUP).processingFeeNgn).toBeLessThanOrEqual(2000);
      }
    });

    it("small courses near the N2,500 jump are not charged an extra N100 needlessly", () => {
      const b = calculateCheckout(2000, YOUR_SETUP); // 2,400 net target
      expect(b.totalNgn).toBeLessThanOrEqual(2500);
    });
  });
});
