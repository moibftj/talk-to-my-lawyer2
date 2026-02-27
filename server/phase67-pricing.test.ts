/**
 * Phase 67 — Pricing Model Tests
 * Verifies the new pricing structure:
 *  - free_trial_review: $50 one-time (first letter attorney review)
 *  - per_letter: $200 one-time (pay-per-letter)
 *  - starter: $499/month (4 letters, attorney review included)
 *  - professional: $799/month (8 letters, attorney review included)
 */

import { describe, it, expect } from "vitest";
import {
  PLANS,
  PLAN_LIST,
  getPlanConfig,
  TRIAL_REVIEW_PRICE_CENTS,
  LETTER_UNLOCK_PRICE_CENTS,
} from "./stripe-products";

describe("Pricing constants", () => {
  it("TRIAL_REVIEW_PRICE_CENTS is $50 (5000 cents)", () => {
    expect(TRIAL_REVIEW_PRICE_CENTS).toBe(5000);
  });

  it("LETTER_UNLOCK_PRICE_CENTS is $200 (20000 cents)", () => {
    expect(LETTER_UNLOCK_PRICE_CENTS).toBe(20000);
  });
});

describe("PLANS configuration", () => {
  it("has exactly 4 plans", () => {
    expect(Object.keys(PLANS)).toHaveLength(4);
    expect(Object.keys(PLANS)).toEqual(
      expect.arrayContaining(["free_trial_review", "per_letter", "starter", "professional"])
    );
  });

  describe("free_trial_review plan", () => {
    const plan = PLANS.free_trial_review;

    it("exists", () => expect(plan).toBeDefined());
    it("is $50 (5000 cents)", () => expect(plan.price).toBe(5000));
    it("is one_time interval", () => expect(plan.interval).toBe("one_time"));
    it("is marked as trial", () => expect(plan.isTrial).toBe(true));
    it("allows 0 letters (review only, not a new letter allowance)", () => {
      expect(plan.lettersAllowed).toBe(0);
    });
  });

  describe("per_letter plan", () => {
    const plan = PLANS.per_letter;

    it("exists", () => expect(plan).toBeDefined());
    it("is $200 (20000 cents)", () => expect(plan.price).toBe(20000));
    it("is one_time interval", () => expect(plan.interval).toBe("one_time"));
    it("allows 1 letter", () => expect(plan.lettersAllowed).toBe(1));
    it("is not a trial", () => expect(plan.isTrial).toBeFalsy());
  });

  describe("starter plan", () => {
    const plan = PLANS.starter;

    it("exists", () => expect(plan).toBeDefined());
    it("is $499/month (49900 cents)", () => expect(plan.price).toBe(49900));
    it("is monthly interval", () => expect(plan.interval).toBe("month"));
    it("allows 4 letters per month", () => expect(plan.lettersAllowed).toBe(4));
    it("has Most Popular badge", () => expect(plan.badge).toBe("Most Popular"));
  });

  describe("professional plan", () => {
    const plan = PLANS.professional;

    it("exists", () => expect(plan).toBeDefined());
    it("is $799/month (79900 cents)", () => expect(plan.price).toBe(79900));
    it("is monthly interval", () => expect(plan.interval).toBe("month"));
    it("allows 8 letters per month", () => expect(plan.lettersAllowed).toBe(8));
    it("has Best Value badge", () => expect(plan.badge).toBe("Best Value"));
  });
});

describe("getPlanConfig", () => {
  it("returns correct plan for free_trial_review", () => {
    const plan = getPlanConfig("free_trial_review");
    expect(plan?.price).toBe(5000);
  });

  it("returns correct plan for per_letter", () => {
    const plan = getPlanConfig("per_letter");
    expect(plan?.price).toBe(20000);
  });

  it("returns correct plan for starter", () => {
    const plan = getPlanConfig("starter");
    expect(plan?.price).toBe(49900);
    expect(plan?.lettersAllowed).toBe(4);
  });

  it("returns correct plan for professional", () => {
    const plan = getPlanConfig("professional");
    expect(plan?.price).toBe(79900);
    expect(plan?.lettersAllowed).toBe(8);
  });

  it("returns undefined for unknown plan", () => {
    expect(getPlanConfig("monthly")).toBeUndefined();
    expect(getPlanConfig("annual")).toBeUndefined();
    expect(getPlanConfig("invalid_plan")).toBeUndefined();
  });
});

describe("PLAN_LIST", () => {
  it("has 4 plans", () => expect(PLAN_LIST).toHaveLength(4));

  it("plans are sorted by price ascending", () => {
    const prices = PLAN_LIST.map((p) => p.price);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });
});

describe("Subscription plan recurring check", () => {
  it("starter and professional are recurring (monthly)", () => {
    expect(PLANS.starter.interval).toBe("month");
    expect(PLANS.professional.interval).toBe("month");
  });

  it("free_trial_review and per_letter are one-time payments", () => {
    expect(PLANS.free_trial_review.interval).toBe("one_time");
    expect(PLANS.per_letter.interval).toBe("one_time");
  });
});

describe("Email template pricing copy", () => {
  it("sendLetterReadyEmail is exported from email.ts (Draft Ready — $200 CTA)", async () => {
    // Verify the email.ts module exports the function (lazy-init Resend won't crash)
    const { sendLetterReadyEmail } = await import("./email");
    expect(typeof sendLetterReadyEmail).toBe("function");
  });
});
