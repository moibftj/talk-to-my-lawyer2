import AppLayout from "@/components/shared/AppLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import OnboardingModal from "@/components/OnboardingModal";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Search,
  Pen,
  Lock,
  Eye,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Download,
  CreditCard,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { LETTER_TYPE_CONFIG } from "../../../../shared/types";
import { useLetterListRealtime } from "@/hooks/useLetterRealtime";
import { useAuth } from "@/_core/hooks/useAuth";

// Statuses where the dashboard should auto-refresh
const ACTIVE_STATUSES = ["submitted", "researching", "drafting", "pending_review", "under_review"];

// Pipeline stages in order for the progress stepper
const PIPELINE_STAGES = [
  { key: "submitted", label: "Submitted", icon: FileText },
  { key: "researching", label: "Research", icon: Search },
  { key: "drafting", label: "Drafting", icon: Pen },
  { key: "generated_locked", label: "Unlock", icon: Lock },
  { key: "pending_review", label: "Review", icon: Eye },
  { key: "under_review", label: "Attorney", icon: ShieldCheck },
  { key: "approved", label: "Approved", icon: CheckCircle },
] as const;

// Map status to pipeline stage index
function getStageIndex(status: string): number {
  const idx = PIPELINE_STAGES.findIndex((s) => s.key === status);
  if (status === "needs_changes") return 5; // same level as under_review
  if (status === "rejected") return 6; // terminal
  return idx >= 0 ? idx : 0;
}

// CTA config per status
function getStatusCTA(status: string, letterId: number) {
  switch (status) {
    case "submitted":
    case "researching":
    case "drafting":
      return { label: "Processing...", icon: Loader2, variant: "outline" as const, href: `/letters/${letterId}`, animate: true };
    case "generated_locked":
      return { label: "Pay to Unlock — $200", icon: CreditCard, variant: "default" as const, href: `/letters/${letterId}`, animate: false };
    case "pending_review":
      return { label: "Awaiting Attorney", icon: Clock, variant: "outline" as const, href: `/letters/${letterId}`, animate: true };
    case "under_review":
      return { label: "Attorney Reviewing", icon: Eye, variant: "outline" as const, href: `/letters/${letterId}`, animate: true };
    case "needs_changes":
      return { label: "Respond to Changes", icon: MessageSquare, variant: "destructive" as const, href: `/letters/${letterId}`, animate: false };
    case "approved":
      return { label: "Download Letter", icon: Download, variant: "default" as const, href: `/letters/${letterId}`, animate: false };
    case "rejected":
      return { label: "View Details", icon: XCircle, variant: "outline" as const, href: `/letters/${letterId}`, animate: false };
    default:
      return { label: "View", icon: ArrowRight, variant: "outline" as const, href: `/letters/${letterId}`, animate: false };
  }
}

// Relative time helper
function timeAgo(dateStr: string | number): string {
  const now = Date.now();
  const then = typeof dateStr === "string" ? new Date(dateStr).getTime() : dateStr;
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// Progress stepper component
function PipelineStepper({ status }: { status: string }) {
  const currentIdx = getStageIndex(status);
  const isTerminalBad = status === "rejected";
  const isNeedsChanges = status === "needs_changes";

  return (
    <div className="flex items-center w-full gap-0">
      {PIPELINE_STAGES.map((stage, idx) => {
        const isComplete = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isActive = isCurrent && ["researching", "drafting", "pending_review", "under_review"].includes(status);
        const isPaywall = isCurrent && status === "generated_locked";
        const isApproved = isCurrent && status === "approved";
        const Icon = stage.icon;

        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete
                    ? "bg-emerald-500 text-white"
                    : isApproved
                    ? "bg-emerald-500 text-white ring-2 ring-emerald-200"
                    : isTerminalBad && isCurrent
                    ? "bg-red-500 text-white ring-2 ring-red-200"
                    : isNeedsChanges && isCurrent
                    ? "bg-amber-500 text-white ring-2 ring-amber-200"
                    : isPaywall
                    ? "bg-amber-500 text-white ring-2 ring-amber-200 animate-pulse"
                    : isActive
                    ? "bg-blue-500 text-white ring-2 ring-blue-200"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                    : "bg-muted text-muted-foreground/40"
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              {/* Label - hidden on mobile, shown on sm+ */}
              <span
                className={`hidden sm:block text-[10px] mt-1 text-center leading-tight ${
                  isComplete
                    ? "text-emerald-600 font-medium"
                    : isCurrent
                    ? isPaywall
                      ? "text-amber-600 font-semibold"
                      : isActive
                      ? "text-blue-600 font-semibold"
                      : isApproved
                      ? "text-emerald-600 font-semibold"
                      : isTerminalBad
                      ? "text-red-600 font-semibold"
                      : isNeedsChanges
                      ? "text-amber-600 font-semibold"
                      : "text-foreground font-medium"
                    : "text-muted-foreground/40"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < PIPELINE_STAGES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 rounded transition-all duration-300 ${
                  idx < currentIdx ? "bg-emerald-500" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SubscriberDashboard() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: letters, isLoading } = trpc.letters.myLetters.useQuery(undefined, {
    refetchInterval: (query) => {
      const list = query.state.data;
      if (list?.some((l: any) => ACTIVE_STATUSES.includes(l.status))) return 8000;
      return false;
    },
  });

  // Supabase Realtime — instant updates when any letter changes for this user
  useLetterListRealtime({
    userId: user?.id ?? null,
    onAnyChange: () => utils.letters.myLetters.invalidate(),
    enabled: !!user?.id,
  });

  const stats = {
    total: letters?.length ?? 0,
    active: letters?.filter((l) => !["approved", "rejected"].includes(l.status)).length ?? 0,
    approved: letters?.filter((l) => l.status === "approved").length ?? 0,
    needsAttention: letters?.filter((l) =>
      ["needs_changes", "generated_locked"].includes(l.status)
    ).length ?? 0,
  };

  const recentLetters = letters?.slice(0, 5) ?? [];

  return (
    <AppLayout breadcrumb={[{ label: "Dashboard" }]}>
      {/* Onboarding modal — shown once for new subscribers */}
      <OnboardingModal />
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
          <h1 className="text-xl font-bold mb-1">Welcome to Talk to My Lawyer</h1>
          <p className="text-primary-foreground/80 text-sm mb-4">
            Submit a legal matter and get a professionally drafted, attorney-approved letter.
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/submit">
              <PlusCircle className="w-4 h-4 mr-2" />
              Submit New Letter
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Letters",
              value: stats.total,
              icon: <FileText className="w-5 h-5" />,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "In Progress",
              value: stats.active,
              icon: <Clock className="w-5 h-5" />,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Approved",
              value: stats.approved,
              icon: <CheckCircle className="w-5 h-5" />,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "Needs Attention",
              value: stats.needsAttention,
              icon: <AlertCircle className="w-5 h-5" />,
              color: "text-red-600",
              bg: "bg-red-50",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div
                  className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3 ${stat.color}`}
                >
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Letter Pipeline Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Letters</h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/letters">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : recentLetters.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-base font-medium text-foreground mb-2">No letters yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Submit your first legal matter and our AI will research and draft a professional
                  letter for attorney review.
                </p>
                <Button asChild>
                  <Link href="/submit">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Submit Your First Letter
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recentLetters.map((letter) => {
                const cta = getStatusCTA(letter.status, letter.id);
                const CTAIcon = cta.icon;
                const isActionRequired = ["generated_locked", "needs_changes"].includes(
                  letter.status
                );

                return (
                  <Card
                    key={letter.id}
                    className={`overflow-hidden transition-all hover:shadow-md ${
                      isActionRequired ? "ring-1 ring-amber-300 bg-amber-50/30" : ""
                    }`}
                  >
                    <CardContent className="p-0">
                      {/* Top section: letter info + status badge */}
                      <div className="flex items-start justify-between p-4 pb-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground truncate">
                                {letter.subject}
                              </h3>
                              {isActionRequired && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Action Required
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>
                                {LETTER_TYPE_CONFIG[letter.letterType]?.label ?? letter.letterType}
                              </span>
                              <span className="text-muted-foreground/30">·</span>
                              <span>{timeAgo(typeof letter.createdAt === 'object' ? (letter.createdAt as Date).getTime() : letter.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={letter.status} size="sm" />
                      </div>

                      {/* Pipeline stepper */}
                      <div className="px-4 py-3">
                        <PipelineStepper status={letter.status} />
                      </div>

                      {/* Bottom: CTA button */}
                      <div className="px-4 pb-4 pt-1">
                        <Button
                          asChild
                          variant={cta.variant}
                          size="sm"
                          className={`w-full sm:w-auto ${
                            letter.status === "generated_locked"
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
                              : ""
                          }`}
                        >
                          <Link href={cta.href}>
                            <CTAIcon
                              className={`w-4 h-4 mr-2 ${cta.animate ? "animate-spin" : ""}`}
                            />
                            {cta.label}
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Guide — collapsible */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline Status Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  status: "submitted",
                  desc: "Your request has been received and queued for AI processing.",
                },
                {
                  status: "researching",
                  desc: "AI is researching applicable laws, statutes, and jurisdiction rules.",
                },
                {
                  status: "drafting",
                  desc: "AI is drafting your professional legal letter using research findings.",
                },
                {
                  status: "generated_locked",
                  desc: "Your letter is ready! Pay $200 to submit it for licensed attorney review.",
                },
                {
                  status: "pending_review",
                  desc: "Letter is queued for a licensed attorney to review and approve.",
                },
                {
                  status: "under_review",
                  desc: "An attorney is actively reviewing and editing your letter.",
                },
                {
                  status: "needs_changes",
                  desc: "The attorney has requested additional information or changes from you.",
                },
                {
                  status: "approved",
                  desc: "Your letter has been approved by an attorney and is ready to download.",
                },
              ].map((item) => (
                <div
                  key={item.status}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <StatusBadge status={item.status} size="sm" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
