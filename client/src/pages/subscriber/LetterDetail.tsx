import AppLayout from "@/components/shared/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import StatusTimeline from "@/components/shared/StatusTimeline";
import { LetterPaywall } from "@/components/LetterPaywall";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, MessageSquare, ArrowLeft, CheckCircle, AlertCircle, Send, Clock } from "lucide-react";
import { Link, useParams, useSearch } from "wouter";
import { LETTER_TYPE_CONFIG } from "../../../../shared/types";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Statuses that require active polling (AI pipeline in progress or awaiting action)
const POLLING_STATUSES = ["submitted", "researching", "drafting", "pending_review", "under_review"];

export default function LetterDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const letterId = parseInt(params.id ?? "0");
  const [updateText, setUpdateText] = useState("");

  // Show success toast after Stripe redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    if (searchParams.get("unlocked") === "true") {
      toast.success("Payment confirmed! Your letter has been sent for attorney review.", {
        description: "You'll receive an email when it's approved.",
        duration: 6000,
      });
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Payment canceled. Your letter is still ready to unlock whenever you're ready.");
    }
  }, [search]);

  // Poll every 5s for in-progress statuses
  const { data, isLoading, error } = trpc.letters.detail.useQuery(
    { id: letterId },
    {
      enabled: !!letterId,
      refetchInterval: (query) => {
        const status = query.state.data?.letter?.status;
        return status && POLLING_STATUSES.includes(status) ? 5000 : false;
      },
    }
  );

  const updateMutation = trpc.letters.updateForChanges.useMutation({
    onSuccess: () => {
      toast.success("Your response has been submitted. The AI pipeline will re-process your letter.");
      setUpdateText("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmitUpdate = () => {
    if (updateText.trim().length < 10) {
      toast.error("Please provide at least 10 characters of additional context.");
      return;
    }
    updateMutation.mutate({ letterId, additionalContext: updateText });
  };

  const handleDownload = () => {
    if (!data?.versions) return;
    const finalVersion = data.versions.find((v) => v.versionType === "final_approved");
    if (!finalVersion) return;

    // Generate a print-ready HTML page and trigger browser PDF save
    const letterContent = finalVersion.content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Legal Letter #${letterId}</title>
  <style>
    @page { margin: 1in; size: letter; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; background: #fff; }
    .header { border-bottom: 2px solid #1E3A5F; padding-bottom: 12px; margin-bottom: 24px; }
    .brand { font-family: Arial, sans-serif; font-size: 10pt; color: #1E3A5F; font-weight: bold; }
    .meta { font-family: Arial, sans-serif; font-size: 9pt; color: #666; margin-top: 4px; }
    .letter-body { white-space: pre-wrap; font-size: 12pt; }
    .footer { border-top: 1px solid #ccc; margin-top: 32px; padding-top: 12px; font-family: Arial, sans-serif; font-size: 9pt; color: #888; text-align: center; }
    @media print { body { print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">⚖️ Talk to My Lawyer — Attorney-Approved Legal Letter</div>
    <div class="meta">Letter #${letterId} &bull; ${data.letter.letterType.replace(/-/g, " ")} &bull; ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <div class="letter-body">${letterContent}</div>
  <div class="footer">This letter was reviewed and approved by a licensed attorney via Talk to My Lawyer. &copy; ${new Date().getFullYear()} Talk to My Lawyer</div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      // Fallback: download as HTML file
      const blob = new Blob([printHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legal-letter-${letterId}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      // printWindow.close() is intentionally omitted — user may want to keep the preview
    }, 500);
  };

  if (isLoading) {
    return (
      <AppLayout breadcrumb={[{ label: "My Letters", href: "/letters" }, { label: "Loading..." }]}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout breadcrumb={[{ label: "My Letters", href: "/letters" }, { label: "Not Found" }]}>
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Letter not found</h3>
          <Button asChild variant="outline" size="sm" className="bg-background">
            <Link href="/letters"><ArrowLeft className="w-4 h-4 mr-2" />Back to Letters</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const { letter, actions, versions, attachments } = data;
  const finalVersion = versions?.find((v) => v.versionType === "final_approved");
  const aiDraftVersion = versions?.find((v) => v.versionType === "ai_draft");
  const userVisibleActions = actions?.filter((a) => a.noteVisibility === "user_visible" && a.noteText);
  const isPolling = POLLING_STATUSES.includes(letter.status);
  const isGeneratedLocked = letter.status === "generated_locked";

  return (
    <AppLayout breadcrumb={[{ label: "My Letters", href: "/letters" }, { label: letter.subject }]}>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">{letter.subject}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {LETTER_TYPE_CONFIG[letter.letterType]?.label ?? letter.letterType}
                  {letter.jurisdictionState && ` · ${letter.jurisdictionState}`}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={letter.status} />
                  <span className="text-xs text-muted-foreground">
                    Submitted {new Date(letter.createdAt).toLocaleDateString()}
                  </span>
                  {isPolling && (
                    <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Auto-refreshing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            {letter.status === "approved" && finalVersion && (
              <Button onClick={handleDownload} size="sm" className="flex-shrink-0">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardContent className="p-5">
            <StatusTimeline currentStatus={letter.status} />
          </CardContent>
        </Card>

        {/* ── PAYWALL: generated_locked ── */}
        {isGeneratedLocked && (
          <LetterPaywall
            letterId={letterId}
            letterType={letter.letterType}
            subject={letter.subject}
            draftContent={aiDraftVersion?.content ?? undefined}
          />
        )}

        {/* Attorney Notes (user-visible only) — shown for all non-locked statuses */}
        {!isGeneratedLocked && userVisibleActions && userVisibleActions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Attorney Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userVisibleActions.map((action) => (
                <div key={action.id} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-foreground">{action.noteText}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(action.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Needs Changes — Subscriber Update Form */}
        {letter.status === "needs_changes" && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4" />
                Changes Requested — Your Response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-700">
                The reviewing attorney has requested changes. Please review the attorney notes above and provide additional context or corrections below. The AI pipeline will re-process your letter with this new information.
              </p>
              <Textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Provide additional context, corrections, or clarifications here..."
                rows={4}
                className="bg-white border-amber-200"
              />
              <Button
                onClick={handleSubmitUpdate}
                disabled={updateMutation.isPending || updateText.trim().length < 10}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {updateMutation.isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Response & Re-Process
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Final Approved Letter */}
        {letter.status === "approved" && finalVersion && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Final Approved Letter
                </CardTitle>
                <Button onClick={handleDownload} size="sm" variant="outline" className="bg-background border-green-300 text-green-700 hover:bg-green-50">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-white border border-green-200 rounded-lg p-5">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {finalVersion.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected Notice */}
        {letter.status === "rejected" && (
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Letter Request Rejected</p>
                  <p className="text-sm text-red-700 mt-1">
                    Unfortunately, the reviewing attorney has rejected this letter request. Please review the attorney notes above for details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attachments ({attachments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.storageUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{att.fileName ?? "Attachment"}</span>
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
