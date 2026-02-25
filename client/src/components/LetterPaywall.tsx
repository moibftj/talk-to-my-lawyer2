/**
 * LetterPaywall — shown when a letter is in `generated_locked` status.
 *
 * Shows the actual AI-generated draft (partially blurred for preview),
 * with a prominent "Submit for Attorney Review" CTA.
 *
 * - First letter is FREE — auto-transitions to pending_review
 * - Subsequent letters cost $200 via Stripe Checkout
 */
import { useState } from "react";
import {
  Lock, Sparkles, CheckCircle, ArrowRight, Shield, Clock,
  FileText, Eye, EyeOff, Gavel, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // Check if user qualifies for free first letter
  const { data: freeCheck, isLoading: freeCheckLoading } = trpc.billing.checkFirstLetterFree.useQuery();
  const isFirstLetterFree = freeCheck?.eligible ?? false;

  const payToUnlock = trpc.billing.payToUnlock.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        setIsRedirecting(true);
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error("Payment setup failed", { description: err.message });
      setIsRedirecting(false);
    },
  });

  const freeUnlock = trpc.billing.freeUnlock.useMutation({
    onSuccess: () => {
      toast.success("Your letter has been submitted for attorney review — free of charge!", {
        description: "You'll receive an email when it's approved.",
        duration: 6000,
      });
      // Reload to show updated status
      window.location.reload();
    },
    onError: (err) => {
      toast.error("Could not submit for review", { description: err.message });
    },
  });

  const handleSubmitForReview = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    if (isFirstLetterFree) {
      freeUnlock.mutate({ letterId });
    } else {
      payToUnlock.mutate({ letterId });
    }
  };

  const isPending = payToUnlock.isPending || freeUnlock.isPending || isRedirecting;

  // Truncate draft for blurred preview (show first ~40% clearly, blur the rest)
  const previewLines = draftContent?.split("\n") ?? [];
  const visibleLineCount = Math.max(8, Math.floor(previewLines.length * 0.35));
  const visibleText = previewLines.slice(0, visibleLineCount).join("\n");
  const blurredText = previewLines.slice(visibleLineCount).join("\n");

  return (
    <div className="space-y-5">
      {/* ── SUBMIT FOR ATTORNEY REVIEW — Top CTA ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Gavel className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold">Submit for Attorney Review</h2>
            <p className="text-sm text-white/80 mt-1">
              Your AI-drafted letter is ready. A licensed attorney will review, edit if needed, and approve it.
            </p>
            {isFirstLetterFree && !freeCheckLoading && (
              <div className="flex items-center gap-2 mt-2">
                <Gift className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold text-yellow-200">
                  Your first letter review is FREE!
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleSubmitForReview}
            disabled={isPending || freeCheckLoading}
            size="lg"
            className="bg-white text-emerald-700 hover:bg-white/90 font-bold shadow-md flex-1 sm:flex-none"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
                Processing...
              </span>
            ) : isFirstLetterFree ? (
              <span className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Submit for Free Review
                <ArrowRight className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Gavel className="w-4 h-4" />
                Submit for Review — $200
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
          {!isFirstLetterFree && (
            <span className="text-xs text-white/60 hidden sm:block">Secure payment via Stripe</span>
          )}
        </div>
      </div>

      {/* ── Status Banner ── */}
      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">AI Research & Drafting Complete</p>
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
        <CardContent>
          {draftContent ? (
            <div className="relative">
              {/* Visible portion */}
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {showFullPreview ? draftContent : visibleText}
              </pre>

              {/* Blurred portion (when collapsed) */}
              {!showFullPreview && blurredText && (
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
                desc: "Access and download your attorney-approved professional legal letter.",
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
              {isFirstLetterFree ? "Submit for Free Attorney Review" : "Submit for Attorney Review"}
            </DialogTitle>
            <DialogDescription>
              {isFirstLetterFree ? (
                <>
                  Your first letter review is <strong>free</strong>. A licensed attorney will review and approve your letter within 24–48 hours.
                </>
              ) : (
                <>
                  You will be redirected to Stripe to complete a <strong>$200</strong> one-time payment.
                  After payment, a licensed attorney will review and approve your letter within 24–48 hours.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Letter type</span>
              <span className="font-medium text-foreground capitalize">{letterType.replace(/-/g, " ")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium text-foreground truncate max-w-[200px]">{subject}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border/50 pt-1.5 mt-1.5">
              <span className="text-muted-foreground font-semibold">Total</span>
              <span className="font-bold text-foreground">
                {isFirstLetterFree ? (
                  <span className="text-emerald-600">FREE</span>
                ) : (
                  "$200.00"
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
              className={isFirstLetterFree
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-primary hover:bg-primary/90"
              }
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isFirstLetterFree ? (
                "Submit for Free"
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
