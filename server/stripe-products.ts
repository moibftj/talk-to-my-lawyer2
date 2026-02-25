/**
 * Stripe Products & Pricing Configuration
 * Talk-to-My-Lawyer — Legal Letter Generation Platform
 *
 * Plans:
 *  per_letter  — $200 one-time per letter (pay-as-you-go)
 *  monthly     — $79/month unlimited letters
 *  annual      — $599/year (50 letters/year, ~$12/letter)
 *
 * First letter is FREE — no payment required for the first attorney review.
 */

export interface PlanConfig {
  id: "per_letter" | "monthly" | "annual";
  name: string;
  description: string;
  price: number; // in cents
  interval: "one_time" | "month" | "year";
  lettersAllowed: number; // -1 = unlimited
  badge?: string;
  features: string[];
}

/** Price in cents for a single letter unlock (attorney review) */
export const LETTER_UNLOCK_PRICE_CENTS = 20000; // $200

export const PLANS: Record<string, PlanConfig> = {
  per_letter: {
    id: "per_letter",
    name: "Pay Per Letter",
    description: "One professional legal letter, no commitment",
    price: LETTER_UNLOCK_PRICE_CENTS, // $200
    interval: "one_time",
    lettersAllowed: 1,
    features: [
      "1 professional legal letter",
      "AI-powered research (Perplexity)",
      "Attorney review & approval",
      "Final approved PDF",
      "Email delivery",
    ],
  },
  monthly: {
    id: "monthly",
    name: "Monthly Plan",
    description: "Unlimited letters for active legal needs",
    price: 7900, // $79/month
    interval: "month",
    lettersAllowed: -1, // unlimited
    badge: "Most Popular",
    features: [
      "Unlimited legal letters",
      "Priority attorney review",
      "AI-powered research (Perplexity)",
      "All letter types supported",
      "Email delivery",
      "Cancel anytime",
    ],
  },
  annual: {
    id: "annual",
    name: "Annual Plan",
    description: "Best value for ongoing legal protection",
    price: 59900, // $599/year
    interval: "year",
    lettersAllowed: 50,
    badge: "Best Value",
    features: [
      "50 legal letters per year",
      "Priority attorney review",
      "AI-powered research (Perplexity)",
      "All letter types supported",
      "Email delivery",
      "Dedicated support",
      "Save 37% vs monthly",
    ],
  },
};

export const PLAN_LIST = Object.values(PLANS);

export function getPlanConfig(planId: string): PlanConfig | undefined {
  return PLANS[planId];
}

export function canSubmitLetter(
  plan: string,
  lettersAllowed: number,
  lettersUsed: number,
  status: string
): { allowed: boolean; reason?: string } {
  if (status !== "active") {
    return { allowed: false, reason: "No active subscription. Please subscribe to submit a letter." };
  }
  if (lettersAllowed === -1) {
    return { allowed: true }; // unlimited
  }
  if (lettersUsed >= lettersAllowed) {
    return {
      allowed: false,
      reason: `You have used all ${lettersAllowed} letter(s) in your ${plan} plan. Please upgrade to continue.`,
    };
  }
  return { allowed: true };
}
