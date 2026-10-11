/**
 * Checkout pricing: the course price, an optional flat platform fee, and (optionally) Paystack's own
 * processing fee passed on to the student so the merchant receives the full course price plus the platform fee.
 *
 * Pure functions with no database or network access, so the server, the checkout screen and the tests all
 * agree on the numbers.
 */

/**
 * Paystack's local (Nigeria) charge, in kobo: 1.5%, plus N100 flat once the amount is above N2,500,
 * capped at N2,000.
 */
export function computePaystackChargeKobo(amountKobo: number): number {
  const FLAT_FEE_THRESHOLD = 250000; // N2,500 in kobo
  const FLAT_FEE = 10000; // N100 in kobo
  const CAP = 200000; // N2,000 in kobo
  const RATE = 0.015;

  let charge = Math.round(amountKobo * RATE);
  if (amountKobo > FLAT_FEE_THRESHOLD) charge += FLAT_FEE;
  if (charge > CAP) charge = CAP;
  return charge;
}

export interface FeeConfig {
  /** Flat platform fee in Naira, added to every paid course. 0 turns it off. */
  platformFeeNgn: number;
  /** When true the student also pays Paystack's processing fee. */
  passProcessingFee: boolean;
  /** Wording shown to the student next to the platform fee. */
  platformFeeLabel: string;
}

export function getFeeConfig(): FeeConfig {
  const raw = Number(process.env.PLATFORM_FEE_NGN);
  return {
    platformFeeNgn: Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0,
    passProcessingFee: (process.env.PASS_PAYSTACK_FEE || "").trim().toLowerCase() === "true",
    platformFeeLabel: process.env.PLATFORM_FEE_LABEL?.trim() || "Platform service fee",
  };
}

export interface CheckoutBreakdown {
  coursePriceNgn: number;
  platformFeeNgn: number;
  /** Paystack's fee, paid by the student only when passProcessingFee is on */
  processingFeeNgn: number;
  /** Exactly what the student is charged, in whole Naira */
  totalNgn: number;
  platformFeeLabel: string;
}

/** The smallest whole-Naira charge from which, after Paystack's fee, at least `netNgn` remains. */
function grossUpForPaystack(netNgn: number): number {
  const netKobo = netNgn * 100;
  const remainsFor = (totalNgn: number) => totalNgn * 100 - computePaystackChargeKobo(totalNgn * 100);
  const FLAT_FEE_THRESHOLD_NGN = 2500;

  // Up to N2,500 Paystack charges no flat fee, so the charge is a smooth 1.5%: walk up from the target
  if (netNgn < FLAT_FEE_THRESHOLD_NGN) {
    for (let total = netNgn; total <= FLAT_FEE_THRESHOLD_NGN; total += 1) {
      if (remainsFor(total) >= netKobo) return total;
    }
  }

  // Above it the fee is 1.5% + N100 (capped at N2,000). Closed-form first guess, then fine-tune.
  let total = Math.min(Math.ceil((netNgn + 100) / 0.985), netNgn + 2000);
  total = Math.max(total, FLAT_FEE_THRESHOLD_NGN + 1, netNgn);
  while (remainsFor(total) < netKobo) total += 1;
  while (total - 1 > FLAT_FEE_THRESHOLD_NGN && total > netNgn && remainsFor(total - 1) >= netKobo) total -= 1;
  return total;
}

export function calculateCheckout(priceNgn: number, config: FeeConfig = getFeeConfig()): CheckoutBreakdown {
  const price = Math.max(0, Math.round(priceNgn));

  // Free courses never carry fees: there is nothing to charge
  if (price === 0) {
    return { coursePriceNgn: 0, platformFeeNgn: 0, processingFeeNgn: 0, totalNgn: 0, platformFeeLabel: config.platformFeeLabel };
  }

  const platformFee = Math.max(0, Math.round(config.platformFeeNgn));
  const subtotal = price + platformFee;
  const total = config.passProcessingFee ? grossUpForPaystack(subtotal) : subtotal;

  return {
    coursePriceNgn: price,
    platformFeeNgn: platformFee,
    processingFeeNgn: total - subtotal,
    totalNgn: total,
    platformFeeLabel: config.platformFeeLabel,
  };
}
