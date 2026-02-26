/**
 * LetterPaywall — shown when a letter is in `generated_locked` status.
 *
 * Pricing model:
 *   - "free_trial_review" → first letter draft is ready, pay $50 for attorney review
 *   - "subscribed"        → active starter/professional plan (bypass paywall, graceful fallback)
 *   - "pay_per_letter"    → free trial already used, no active subscription
 *                           → shows SUBSCRIPTION UPSELL prominently + $200 as secondary option
 */
import { useState } from "react";
import {
  Lock, Sparkles, CheckCircle, ArrowRight, Shield, Clock,
  FileText, Eye, EyeOff, Gavel, Star, Zap, CreditCard, Tag, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LetterPaywallProps {
  letterId: number;
  letterType: string;
  subject: string;
  /** The actual AI draft content from letter_versions (ai_draft) */
  draftContent?: string;
}

export function LetterPaywall({ letterId, letterType, subject, draftContent }: LetterPaywallProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"trial" | "pay_per_letter">("trial");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Unified paywall status query
  const { data: paywallStatus, isLoading: paywallLoading } = trpc.billing.checkPaywallStatus.useQuery();
  const state = paywallStatus?.state ?? "pay_per_letter";
  const isTrialReview = state === "free"; // first letter — pay $50 for review
  const isSubscribed = state === "subscribed";
  const isPayPerLetter = state === "pay_per_letter";

  // Promo code validation
  const validateCodeQuery = trpc.affiliate.validateCode.useQuery(
    { code: promoInput.trim().toUpperCase() },
    { enabled: false }
  );

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await validateCodeQuery.refetch();
      if (result.data?.valid) {
        setAppliedCode(code);
        setAppliedDiscount(result.data.discountPercent);
        toast.success(`Promo code applied — ${result.data.discountPercent}% off!`);
      } else {
        setPromoError("Invalid or expired promo code.");
        setAppliedCode(null);
        setAppliedDiscount(0);
      }
    } catch {
      setPromoError("Could not validate code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedCode(null);
    setAppliedDiscount(0);
    setPromoInput("");
    setPromoError(null);
  };

  // Subscription checkout (for upsell CTA)
  const subscribeCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.info("Opening secure checkout", { description: "You'll be redirected to Stripe to complete your payment." });
      window.open(data.url, "_blank");
    },
    onError: (err) => {
      toast.error("Unable to start checkout", { description: err.message || "Please try again or contact support." });
    },
  });

  // $200 pay-per-letter checkout (generated_locked letters)
  const payToUnlock = trpc.billing.payToUnlock.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error("Payment could not be initiated", { description: err.message || "Please try again in a moment." });
      setIsRedirecting(false);
    },
  });

  // Graceful fallback for subscribed users
  const freeUnlock = trpc.billing.freeUnlock.useMutation({
    onSuccess: () => {
      toast.success("Letter submitted for attorney review", {
        description: "You'll receive an email when it's approved.",
        duration: 6000,
      });
      window.location.reload();
    },
    onError: (err) => {
      toast.error("Submission failed", { description: err.message || "Please try again or contact support." });
    },
  });

  const handleTrialReviewSubmit = () => {
    setConfirmMode("trial");
    setShowConfirmDialog(true);
  };

  const handlePayPerLetterSubmit = () => {
    setConfirmMode("pay_per_letter");
    setShowConfirmDialog(true);
  };

  const handleSubscribe = (planId: string) => {
    subscribeCheckout.mutate({ planId, discountCode: appliedCode ?? undefined });
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    payToUnlock.mutate({ letterId, discountCode: appliedCode ?? undefined });
  };

  const isPending = payToUnlock.isPending || freeUnlock.isPending || isRedirecting || subscribeCheckout.isPending;

  // Truncate draft for blurred preview (show first ~40% clearly, blur the rest)
  const previewLines = draftContent?.split("\n") ?? [];
  const visibleLineCount = Math.max(8, Math.floor(previewLines.length * 0.35));
  const visibleText = previewLines.slice(0, visibleLineCount).join("\n");
  const blurredText = previewLines.slice(visibleLineCount).join("\n");

  // Promo code input block (shared across all payment paths)
  const PromoCodeBlock = () => (
    <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" />
        Have a promo code?
      </p>
      {appliedCode ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-emerald-800 flex-1">
            {appliedCode} — {appliedDiscount}% off applied
          </span>
          <button
            onClick={handleRemovePromo}
            className="text-emerald-600 hover:text-emerald-800 transition-colors"
            aria-label="Remove promo code"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value.toUpperCase());
              setPromoError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
            placeholder="Enter code (e.g. SAVE20)"
            className="h-9 text-sm font-mono uppercase tracking-wider"
            maxLength={32}
          />
          <Button
            onClick={handleApplyPromo}
            disabled={!promoInput.trim() || promoLoading}
            variant="outline"
            size="sm"
            className="h-9 px-4 bg-background whitespace-nowrap"
          >
            {promoLoading ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>
      )}
      {promoError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="w-3 h-3" />
          {promoError}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── TRIAL REVIEW: $50 attorney review for first-letter users ── */}
      {isTrialReview && !paywallLoading && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Submit for Attorney Review — $50</h2>
              <p className="text-sm text-white/80 mt-1">
                Your first draft is ready. A licensed attorney will review, edit if needed, and approve your letter.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleTrialReviewSubmit}
              disabled={isPending}
              size="lg"
              className="bg-white text-emerald-700 hover:bg-white/90 font-bold shadow-md w-full sm:w-auto"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Gavel className="w-4 h-4" />
                  Pay $50 for Attorney Review
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
            <p className="text-xs text-white/60 self-center">Or subscribe for ongoing access below</p>
          </div>
        </div>
      )}

      {/* ── PAY PER LETTER: SUBSCRIPTION UPSELL (PRIMARY) + $200 (SECONDARY) ── */}
      {isPayPerLetter && !paywallLoading && (
        <div className="space-y-4">
          {/* Subscription upsell — PROMINENT */}
          <div className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] rounded-2xl p-5 text-white shadow-lg border border-blue-400/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-yellow-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold">Subscribe &amp; Save</h2>
                  <Badge className="bg-yellow-400 text-yellow-900 text-xs font-bold border-0">BEST VALUE</Badge>
                </div>
                <p className="text-sm text-white/80">
                  You've used your free trial. Subscribe to get attorney-reviewed letters every month — no per-letter fees.
                </p>
              </div>
            </div>
            {/* Plan comparison */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Starter plan */}
              <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">Starter</span>
                  <Badge className="bg-blue-300 text-blue-900 text-xs border-0">Popular</Badge>
                </div>
                <p className="text-2xl font-black">$499<span className="text-sm font-normal text-white/70">/mo</span></p>
                <p className="text-xs text-white/70 mt-0.5">4 letters/month</p>
                <Button
                  onClick={() => handleSubscribe("starter")}
                  disabled={isPending}
                  size="sm"
                  className="w-full mt-3 bg-white text-blue-700 hover:bg-white/90 font-bold text-xs"
                >
                  {subscribeCheckout.isPending && subscribeCheckout.variables?.planId === "starter" ? (
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Subscribe Starter
                    </span>
                  )}
                </Button>
              </div>
              {/* Professional plan */}
              <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold">Professional</span>
                  <Badge className="bg-yellow-400 text-yellow-900 text-xs border-0">Best Value</Badge>
                </div>
                <p className="text-2xl font-black">$799<span className="text-sm font-normal text-white/70">/mo</span></p>
                <p className="text-xs text-white/70 mt-0.5">8 letters/month</p>
                <Button
                  onClick={() => handleSubscribe("professional")}
                  disabled={isPending}
                  size="sm"
                  className="w-full mt-3 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 font-bold text-xs"
                >
                  {subscribeCheckout.isPending && subscribeCheckout.variables?.planId === "professional" ? (
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-yellow-600 border-t-yellow-900 rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Subscribe Professional
                    </span>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-white/50 mt-3 text-center">
              All plans include attorney review · Cancel anytime
            </p>
          </div>
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or pay per letter</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {/* Per-letter $200 option — SECONDARY */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Pay Per Letter — $200</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    One-time payment. Attorney review for this letter only.
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePayPerLetterSubmit}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="bg-background flex-shrink-0"
              >
                {isPending && confirmMode === "pay_per_letter" ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gavel className="w-3.5 h-3.5" />
                    Pay $200
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIBED: graceful fallback (pipeline should bypass this UI) ── */}
      {isSubscribed && !paywallLoading && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Submit for Attorney Review</h2>
              <p className="text-sm text-white/80 mt-1">
                Your active subscription covers this letter. A licensed attorney will review and approve it.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={() => freeUnlock.mutate({ letterId })}
              disabled={isPending}
              size="lg"
              className="bg-white text-emerald-700 hover:bg-white/90 font-bold shadow-md w-full sm:w-auto"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Submit for Review (Included)
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── PROMO CODE BLOCK (shown for all non-subscribed users) ── */}
      {!isSubscribed && !paywallLoading && <PromoCodeBlock />}

      {/* Loading state */}
      {paywallLoading && (
        <div className="bg-muted/30 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Checking your account status...</p>
        </div>
      )}

      {/* ── Status Banner ── */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">AI Research &amp; Drafting Complete</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Our AI completed a 3-stage legal research and drafting process. Review the draft below, then submit for attorney review.
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs whitespace-nowrap">
          Ready
        </Badge>
      </div>

      {/* ── Draft Preview (actual AI content) ── */}
      <Card className="border-2 border-border/60 overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              AI-Generated Letter Draft
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Unreviewed Draft
              </Badge>
              {draftContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullPreview(!showFullPreview)}
                  className="text-xs h-7 px-2"
                >
                  {showFullPreview ? (
                    <><EyeOff className="w-3 h-3 mr-1" />Collapse</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" />Expand</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {draftContent ? (
            <div>
              {/* Always-visible portion */}
              <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                {visibleText}
              </pre>
              {/* Blurred / expanded portion */}
              {blurredText && !showFullPreview && (
                <div className="relative mt-0">
                  <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed blur-[4px] select-none pointer-events-none max-h-48 overflow-hidden">
                    {blurredText}
                  </pre>
                  {/* Gradient fade */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background rounded" />
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullPreview(true)}
                      className="bg-background text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Show Full Draft
                    </Button>
                  </div>
                </div>
              )}
              {blurredText && showFullPreview && (
                <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                  {blurredText}
                </pre>
              )}
              {/* Disclaimer */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> This is an AI-generated draft that has not been reviewed by an attorney.
                  A licensed attorney will review, edit if necessary, and approve the final version before delivery.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Draft content is being prepared...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── What Happens Next ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-foreground">What happens after you submit?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                icon: ArrowRight,
                color: "text-blue-600",
                bg: "bg-blue-50",
                title: "Sent to Attorney Queue",
                desc: "Your letter enters our licensed attorney review queue immediately.",
              },
              {
                icon: Shield,
                color: "text-purple-600",
                bg: "bg-purple-50",
                title: "Attorney Reviews & Edits",
                desc: "A licensed attorney reviews, edits if needed, and approves your letter.",
              },
              {
                icon: Clock,
                color: "text-green-600",
                bg: "bg-green-50",
                title: "Typically within 24–48 hours",
                desc: "You'll receive email notification when your letter is approved.",
              },
              {
                icon: CheckCircle,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                title: "Download Your Final Letter",
                desc: "Access and download your attorney-approved professional legal letter as a PDF.",
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full ${step.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <step.icon className={`w-3.5 h-3.5 ${step.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Trust Signals ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Shield, label: "Secure Payment", sub: "256-bit SSL" },
          { icon: CheckCircle, label: "Licensed Attorneys", sub: "Bar-certified" },
          { icon: Clock, label: "Fast Turnaround", sub: "24–48 hours" },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-3 bg-muted/30 rounded-lg text-center">
            <item.icon className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-emerald-600" />
              {confirmMode === "trial" ? "Submit for Attorney Review — $50" : "Submit for Attorney Review — $200"}
            </DialogTitle>
            <DialogDescription>
              {confirmMode === "trial" ? (
                <>
                  You will be redirected to Stripe to complete a <strong>$50</strong> one-time payment.
                  A licensed attorney will review and approve your letter within 24–48 hours.
                </>
              ) : (
                <>
                  You will be redirected to Stripe to complete a <strong>$200</strong> one-time payment.
                  After payment, a licensed attorney will review and approve your letter within 24–48 hours.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 border border-border/50 rounded-lg p-3 text-sm bg-muted/20">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Letter type</span>
              <span className="font-medium text-foreground capitalize">{letterType.replace(/-/g, " ")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{subject}</span>
            </div>
            {appliedCode && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span className="flex items-center gap-1"><Tag className="w-3 h-3" />Promo code</span>
                <span className="font-semibold">{appliedCode} ({appliedDiscount}% off)</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-border/50 pt-1.5 mt-1.5">
              <span className="text-muted-foreground font-semibold">Total</span>
              <span className="font-bold text-foreground">
                {confirmMode === "trial" ? "$50.00" : "$200.00"}
                {appliedDiscount > 0 && (
                  <span className="text-xs text-emerald-600 ml-1">(discount applied at checkout)</span>
                )}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="bg-background">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
