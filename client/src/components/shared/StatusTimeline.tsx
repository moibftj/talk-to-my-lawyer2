import { CheckCircle2, Circle, Clock, AlertTriangle, XCircle, Loader2, FileCheck, Gavel } from "lucide-react";

/**
 * Status timeline for the flow:
 *   submitted → researching → drafting → generated_locked | generated_unlocked → pending_review → under_review → approved/rejected/needs_changes
 *
 * generated_locked: repeat users must pay to submit for review
 * generated_unlocked: first-letter free — AI draft visible, subscriber can send for attorney review at no extra cost
 */
const STATUS_STEPS = [
  { key: "submitted",           label: "Submitted",         description: "Intake received" },
  { key: "researching",         label: "Researching",       description: "Legal research in progress" },
  { key: "drafting",            label: "Drafting",          description: "Letter being drafted" },
  { key: "generated_locked",    label: "Draft Ready",       description: "Pay to submit for review" },
  { key: "generated_unlocked",  label: "AI Draft Ready",    description: "Send for attorney review — included free" },
  { key: "pending_review",      label: "Awaiting Review",   description: "In the attorney queue" },
  { key: "under_review",        label: "Under Review",      description: "Attorney reviewing" },
] as const;

const TERMINAL_STATUSES: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  approved:      { label: "Approved",          icon: CheckCircle2,  color: "text-emerald-500" },
  rejected:      { label: "Rejected",          icon: XCircle,       color: "text-red-500" },
  needs_changes: { label: "Changes Requested", icon: AlertTriangle, color: "text-amber-500" },
};

interface StatusTimelineProps {
  currentStatus: string;
  className?: string;
}

export default function StatusTimeline({ currentStatus, className }: StatusTimelineProps) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  const isTerminal = currentStatus in TERMINAL_STATUSES;

  // When on generated_locked path, skip generated_unlocked step (and vice versa)
  const isLockedPath = currentStatus === "generated_locked" ||
    (currentIdx !== -1 && currentIdx < STATUS_STEPS.findIndex((s) => s.key === "generated_unlocked"));
  const isUnlockedPath = currentStatus === "generated_unlocked" ||
    (currentIdx !== -1 && currentIdx >= STATUS_STEPS.findIndex((s) => s.key === "generated_unlocked") && currentStatus !== "generated_locked");

  const visibleSteps = STATUS_STEPS.filter((step) => {
    if (step.key === "generated_locked" && isUnlockedPath) return false;
    if (step.key === "generated_unlocked" && isLockedPath) return false;
    return true;
  });

  const visibleIdx = visibleSteps.findIndex((s) => s.key === currentStatus);

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3">Progress</h4>
      <div className="relative">
        {visibleSteps.map((step, idx) => {
          const isComplete = visibleIdx > idx || isTerminal;
          const isCurrent = visibleIdx === idx && !isTerminal;
          const isInProgress = isCurrent && (step.key === "researching" || step.key === "drafting");
          const isDraftLocked = isCurrent && step.key === "generated_locked";
          const isDraftUnlocked = isCurrent && step.key === "generated_unlocked";
          const isWaiting = isCurrent && (step.key === "pending_review" || step.key === "under_review");

          return (
            <div key={step.key} className="flex items-start gap-3 relative">
              {/* Vertical connector line */}
              {idx < visibleSteps.length - 1 && (
                <div
                  className={`absolute left-[11px] top-[24px] w-0.5 h-6 ${
                    isComplete ? "bg-emerald-500" : "bg-border"
                  }`}
                />
              )}
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isComplete ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : isCurrent ? (
                  isInProgress ? (
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  ) : isDraftLocked ? (
                    <FileCheck className="w-6 h-6 text-yellow-500" />
                  ) : isDraftUnlocked ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : isWaiting ? (
                    <Gavel className="w-6 h-6 text-amber-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-blue-500" />
                  )
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground/30" />
                )}
              </div>
              {/* Label */}
              <div className="pb-4">
                <span
                  className={`text-sm block ${
                    isComplete
                      ? "text-emerald-600 font-medium"
                      : isDraftLocked
                      ? "text-yellow-700 font-semibold"
                      : isDraftUnlocked
                      ? "text-green-700 font-semibold"
                      : isWaiting
                      ? "text-amber-600 font-semibold"
                      : isCurrent
                      ? "text-blue-600 font-semibold"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {step.label}
                  {isInProgress && <span className="ml-2 text-xs text-blue-400">(in progress...)</span>}
                  {isDraftLocked && <span className="ml-2 text-xs text-yellow-500">(payment required)</span>}
                  {isDraftUnlocked && <span className="ml-2 text-xs text-green-500">(free)</span>}
                </span>
                {isCurrent && (
                  <span className="text-xs text-muted-foreground">{step.description}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Terminal status */}
        {isTerminal && (
          <div className="flex items-start gap-3 relative">
            <div className="flex-shrink-0 mt-0.5">
              {(() => {
                const terminal = TERMINAL_STATUSES[currentStatus];
                if (!terminal) return null;
                const TIcon = terminal.icon;
                return <TIcon className={`w-6 h-6 ${terminal.color}`} />;
              })()}
            </div>
            <span className={`text-sm font-semibold ${TERMINAL_STATUSES[currentStatus]?.color ?? ""}`}>
              {TERMINAL_STATUSES[currentStatus]?.label ?? currentStatus}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
