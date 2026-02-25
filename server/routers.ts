import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  claimLetterForReview,
  createAttachment,
  createLetterRequest,
  createLetterVersion,
  createNotification,
  getAllLetterRequests,
  getAllUsers,
  getAttachmentsByLetterId,
  getEmployees,
  getFailedJobs,
  getLetterRequestById,
  getLetterRequestSafeForSubscriber,
  getLetterRequestsByUserId,
  getLetterVersionById,
  getLetterVersionsByRequestId,
  getNotificationsByUserId,
  getResearchRunsByLetterId,
  getReviewActions,
  getSystemStats,
  getWorkflowJobsByLetterId,
  logReviewAction,
  markAllNotificationsRead,
  markNotificationRead,
  updateLetterStatus,
  updateLetterVersionPointers,
  updateUserRole,
  getUserById,
  purgeFailedJobs,
  updateLetterPdfUrl,
} from "./db";
import {
  sendJobFailedAlertEmail,
  sendLetterApprovedEmail,
  sendLetterRejectedEmail,
  sendNeedsChangesEmail,
  sendNewReviewNeededEmail,
  sendLetterSubmissionEmail,
  sendLetterReadyEmail,
  sendLetterUnlockedEmail,
  sendStatusUpdateEmail,
} from "./email";
import { runFullPipeline, retryPipelineFromStage } from "./pipeline";
import { generateAndUploadApprovedPdf } from "./pdfGenerator";
import { storagePut } from "./storage";
import {
  createCheckoutSession,
  createBillingPortalSession,
  createLetterUnlockCheckout,
  getUserSubscription,
  checkLetterSubmissionAllowed,
} from "./stripe";

// ─── Role Guards ──────────────────────────────────────────────────────────────

const employeeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "employee" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Employee or Admin access required" });
  }
  return next({ ctx });
});

const subscriberProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "subscriber") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Subscriber access required" });
  }
  return next({ ctx });
});

function getAppUrl(req: { protocol: string; headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
  return `${proto}://${host}`;
}

// ═══════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Clear both Supabase session and legacy Manus session cookies
      ctx.res.clearCookie("sb_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Subscriber: Letter Requests ───────────────────────────────────────────
  letters: router({
    submit: subscriberProcedure
      .input(z.object({
        letterType: z.enum(["demand-letter", "cease-and-desist", "contract-breach", "eviction-notice", "employment-dispute", "consumer-complaint", "general-legal"]),
        subject: z.string().min(5).max(500),
        issueSummary: z.string().optional(),
        jurisdictionCountry: z.string().default("US"),
        jurisdictionState: z.string().min(2),
        jurisdictionCity: z.string().optional(),
        intakeJson: z.object({
          schemaVersion: z.string().default("1.0"),
          letterType: z.string(),
          sender: z.object({ name: z.string(), address: z.string(), email: z.string().optional(), phone: z.string().optional() }),
          recipient: z.object({ name: z.string(), address: z.string(), email: z.string().optional(), phone: z.string().optional() }),
          jurisdiction: z.object({ country: z.string(), state: z.string(), city: z.string().optional() }),
          matter: z.object({ category: z.string(), subject: z.string(), description: z.string(), incidentDate: z.string().optional() }),
          financials: z.object({ amountOwed: z.number().optional(), currency: z.string().optional() }).optional(),
          desiredOutcome: z.string(),
          deadlineDate: z.string().optional(),
          additionalContext: z.string().optional(),
          tonePreference: z.enum(["firm", "moderate", "aggressive"]).optional(),
        }),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createLetterRequest({
          userId: ctx.user.id,
          letterType: input.letterType,
          subject: input.subject,
          issueSummary: input.issueSummary,
          jurisdictionCountry: input.jurisdictionCountry,
          jurisdictionState: input.jurisdictionState,
          jurisdictionCity: input.jurisdictionCity,
          intakeJson: input.intakeJson,
          priority: input.priority,
        });
        const letterId = (result as any)?.insertId;

        await logReviewAction({
          letterRequestId: letterId,
          reviewerId: ctx.user.id,
          actorType: "subscriber",
          action: "letter_submitted",
          fromStatus: undefined,
          toStatus: "submitted",
        });

        // Send submission confirmation email (non-blocking)
        const appUrl = getAppUrl(ctx.req);
        if (ctx.user.email) sendLetterSubmissionEmail({
          to: ctx.user.email,
          name: ctx.user.name ?? "Subscriber",
          subject: input.subject,
          letterId,
          letterType: input.letterType,
          jurisdictionState: input.jurisdictionState,
          appUrl,
        }).catch((err) => console.error("[Email] Submission confirmation failed:", err));

        // Trigger AI pipeline in background (non-blocking)
        runFullPipeline(letterId, input.intakeJson as any).catch(async (err) => {
          console.error("[Pipeline] Failed:", err);
          try {
            const admins = await getAllUsers("admin");
            const appUrl = getAppUrl(ctx.req);
            for (const admin of admins) {
              if (admin.email) {
                await sendJobFailedAlertEmail({
                  to: admin.email,
                  name: admin.name ?? "Admin",
                  letterId,
                  jobType: "generation_pipeline",
                  errorMessage: err instanceof Error ? err.message : String(err),
                  appUrl,
                });
              }
              await createNotification({
                userId: admin.id,
                type: "job_failed",
                title: `Pipeline failed for letter #${letterId}`,
                body: err instanceof Error ? err.message : String(err),
                link: `/admin/jobs`,
              });
            }
          } catch (notifyErr) { console.error("[Pipeline] Failed to notify admins:", notifyErr); }
        });

        return { letterId, status: "submitted" };
      }),

    myLetters: subscriberProcedure.query(async ({ ctx }) => {
      return getLetterRequestsByUserId(ctx.user.id);
    }),

    detail: subscriberProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const letter = await getLetterRequestSafeForSubscriber(input.id, ctx.user.id);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND", message: "Letter not found" });
        const actions = await getReviewActions(input.id, false);
        const versions = await getLetterVersionsByRequestId(input.id, false);
        const attachmentList = await getAttachmentsByLetterId(input.id);
        return { letter, actions, versions, attachments: attachmentList };
      }),

    updateForChanges: subscriberProcedure
      .input(z.object({
        letterId: z.number(),
        additionalContext: z.string().min(10),
        updatedIntakeJson: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter || letter.userId !== ctx.user.id)
          throw new TRPCError({ code: "NOT_FOUND" });
        if (letter.status !== "needs_changes")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Letter must be in needs_changes status" });

        // Log the subscriber's response
        await logReviewAction({
          letterRequestId: input.letterId,
          reviewerId: ctx.user.id,
          actorType: "subscriber",
          action: "subscriber_updated",
          noteText: input.additionalContext,
          noteVisibility: "user_visible",
          fromStatus: "needs_changes",
          toStatus: "submitted",
        });

        // If updated intake provided, update the letter request
        if (input.updatedIntakeJson) {
          const db = await (await import("./db")).getDb();
          if (db) {
            const { letterRequests } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            await db.update(letterRequests).set({
              intakeJson: input.updatedIntakeJson,
              updatedAt: new Date(),
            } as any).where(eq(letterRequests.id, input.letterId));
          }
        }

        // Transition status back to submitted before re-triggering pipeline
        // This allows the pipeline to properly set researching → drafting → generated_locked
        await updateLetterStatus(input.letterId, "submitted");

        // Re-trigger full pipeline (not just from drafting — subscriber changes may affect research)
        const intake = input.updatedIntakeJson ?? letter.intakeJson;
        if (intake) {
          const appUrl = getAppUrl(ctx.req);
          runFullPipeline(input.letterId, intake as any).catch(async (err) => {
            console.error("[Pipeline] Retry after subscriber update failed:", err);
            try {
              const admins = await getAllUsers("admin");
              for (const admin of admins) {
                if (admin.email) {
                  await sendJobFailedAlertEmail({
                    to: admin.email,
                    name: admin.name ?? "Admin",
                    letterId: input.letterId,
                    jobType: "generation_pipeline",
                    errorMessage: err instanceof Error ? err.message : String(err),
                    appUrl,
                  });
                }
              }
            } catch (notifyErr) { console.error("[Pipeline] Failed to notify admins:", notifyErr); }
          });
        }

        return { success: true };
      }),

    uploadAttachment: subscriberProcedure
      .input(z.object({
        letterId: z.number(),
        fileName: z.string(),
        mimeType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter || letter.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const buffer = Buffer.from(input.base64Data, "base64");
        const key = `attachments/${ctx.user.id}/${input.letterId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await createAttachment({
          letterRequestId: input.letterId,
          uploadedByUserId: ctx.user.id,
          storagePath: key,
          storageUrl: url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: buffer.length,
        });
        return { url, key };
      }),
  }),

  // ─── Employee/Attorney: Review Center ─────────────────────────────────────
  review: router({
    queue: employeeProcedure
      .input(z.object({
        status: z.string().optional(),
        unassigned: z.boolean().optional(),
        myAssigned: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (input?.myAssigned) return getAllLetterRequests({ assignedReviewerId: ctx.user.id });
        return getAllLetterRequests({ status: input?.status, unassigned: input?.unassigned });
      }),

    letterDetail: employeeProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.id);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        const versions = await getLetterVersionsByRequestId(input.id, true);
        const actions = await getReviewActions(input.id, true);
        const jobs = await getWorkflowJobsByLetterId(input.id);
        const research = await getResearchRunsByLetterId(input.id);
        const attachmentList = await getAttachmentsByLetterId(input.id);
        return { letter, versions, actions, jobs, research, attachments: attachmentList };
      }),

    claim: employeeProcedure
      .input(z.object({ letterId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        if (!["pending_review", "under_review"].includes(letter.status))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Letter is not in a reviewable state" });
        await claimLetterForReview(input.letterId, ctx.user.id);
        await logReviewAction({
          letterRequestId: input.letterId,
          reviewerId: ctx.user.id,
          actorType: ctx.user.role as any,
          action: "claimed_for_review",
          fromStatus: letter.status,
          toStatus: "under_review",
        });
        // ── Notify subscriber: letter is now under attorney review ──
        try {
          const subscriber = await getUserById(letter.userId);
          const appUrl = getAppUrl(ctx.req);
          if (subscriber?.email) {
            await sendStatusUpdateEmail({
              to: subscriber.email,
              name: subscriber.name ?? "Subscriber",
              subject: letter.subject,
              letterId: input.letterId,
              newStatus: "under_review",
              appUrl,
            });
          }
          await createNotification({
            userId: letter.userId,
            type: "letter_under_review",
            title: "Your letter is being reviewed",
            body: `An attorney has claimed your letter "${letter.subject}" and is currently reviewing it.`,
            link: `/letters/${input.letterId}`,
          });
        } catch (err) { console.error("[Notify] Claim notification failed:", err); }
        return { success: true };
      }),

    approve: employeeProcedure
      .input(z.object({
        letterId: z.number(),
        finalContent: z.string().min(50),
        internalNote: z.string().optional(),
        userVisibleNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        if (letter.status !== "under_review") throw new TRPCError({ code: "BAD_REQUEST", message: "Letter must be under_review to approve" });
        const version = await createLetterVersion({
          letterRequestId: input.letterId,
          versionType: "final_approved",
          content: input.finalContent,
          createdByType: ctx.user.role as any,
          createdByUserId: ctx.user.id,
          metadataJson: { approvedBy: ctx.user.name, approvedAt: new Date().toISOString() },
        });
        const versionId = (version as any)?.insertId;
        await updateLetterVersionPointers(input.letterId, { currentFinalVersionId: versionId });
        await updateLetterStatus(input.letterId, "approved");
        await logReviewAction({
          letterRequestId: input.letterId, reviewerId: ctx.user.id,
          actorType: ctx.user.role as any, action: "approved",
          noteText: input.internalNote, noteVisibility: "internal",
          fromStatus: "under_review", toStatus: "approved",
        });
        if (input.userVisibleNote) {
          await logReviewAction({
            letterRequestId: input.letterId, reviewerId: ctx.user.id,
            actorType: ctx.user.role as any, action: "attorney_note",
            noteText: input.userVisibleNote, noteVisibility: "user_visible",
          });
        }
        // ── Generate PDF, upload to S3, store URL ──
        let pdfUrl: string | undefined;
        try {
          const pdfResult = await generateAndUploadApprovedPdf({
            letterId: input.letterId,
            letterType: letter.letterType,
            subject: letter.subject,
            content: input.finalContent,
            approvedBy: ctx.user.name ?? undefined,
            approvedAt: new Date().toISOString(),
            jurisdictionState: letter.jurisdictionState,
            jurisdictionCountry: letter.jurisdictionCountry,
          });
          pdfUrl = pdfResult.pdfUrl;
          await updateLetterPdfUrl(input.letterId, pdfUrl);
          console.log(`[Approve] PDF generated for letter #${input.letterId}: ${pdfUrl}`);
        } catch (pdfErr) {
          console.error(`[Approve] PDF generation failed for letter #${input.letterId}:`, pdfErr);
          // Non-blocking: approval still succeeds even if PDF fails
        }
        // ── Notify subscriber with PDF link ──
        try {
          const appUrl = getAppUrl(ctx.req);
          const subscriber = await getUserById(letter.userId);
          if (subscriber?.email) {
            await sendLetterApprovedEmail({ to: subscriber.email, name: subscriber.name ?? "Subscriber", subject: letter.subject, letterId: input.letterId, appUrl, pdfUrl });
          }
          await createNotification({
            userId: letter.userId,
            type: "letter_approved",
            title: "Your letter has been approved!",
            body: `Your letter "${letter.subject}" is ready to download.${pdfUrl ? " A PDF copy is available." : ""}`,
            link: `/letters/${input.letterId}`,
          });
        } catch (err) { console.error("[Notify] Failed:", err); }
        return { success: true, versionId, pdfUrl };
      }),

    reject: employeeProcedure
      .input(z.object({
        letterId: z.number(),
        reason: z.string().min(10),
        userVisibleReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        if (letter.status !== "under_review") throw new TRPCError({ code: "BAD_REQUEST", message: "Letter must be under_review to reject" });
        await updateLetterStatus(input.letterId, "rejected");
        await logReviewAction({ letterRequestId: input.letterId, reviewerId: ctx.user.id, actorType: ctx.user.role as any, action: "rejected", noteText: input.reason, noteVisibility: "internal", fromStatus: "under_review", toStatus: "rejected" });
        const visibleReason = input.userVisibleReason ?? input.reason;
        await logReviewAction({ letterRequestId: input.letterId, reviewerId: ctx.user.id, actorType: ctx.user.role as any, action: "rejection_notice", noteText: visibleReason, noteVisibility: "user_visible" });
        try {
          const appUrl = getAppUrl(ctx.req);
          const subscriber = await getUserById(letter.userId);
          if (subscriber?.email) {
            await sendLetterRejectedEmail({ to: subscriber.email, name: subscriber.name ?? "Subscriber", subject: letter.subject, letterId: input.letterId, reason: visibleReason, appUrl });
          }
          await createNotification({ userId: letter.userId, type: "letter_rejected", title: "Update on your letter request", body: visibleReason, link: `/letters/${input.letterId}` });
        } catch (err) { console.error("[Notify] Failed:", err); }
        return { success: true };
      }),

    requestChanges: employeeProcedure
      .input(z.object({
        letterId: z.number(),
        internalNote: z.string().optional(),
        userVisibleNote: z.string().min(10),
        retriggerPipeline: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        if (letter.status !== "under_review") throw new TRPCError({ code: "BAD_REQUEST", message: "Letter must be under_review" });
        await updateLetterStatus(input.letterId, "needs_changes");
        await logReviewAction({ letterRequestId: input.letterId, reviewerId: ctx.user.id, actorType: ctx.user.role as any, action: "requested_changes", noteText: input.internalNote, noteVisibility: "internal", fromStatus: "under_review", toStatus: "needs_changes" });
        await logReviewAction({ letterRequestId: input.letterId, reviewerId: ctx.user.id, actorType: ctx.user.role as any, action: "changes_requested", noteText: input.userVisibleNote, noteVisibility: "user_visible" });
        try {
          const appUrl = getAppUrl(ctx.req);
          const subscriber = await getUserById(letter.userId);
          if (subscriber?.email) {
            await sendNeedsChangesEmail({ to: subscriber.email, name: subscriber.name ?? "Subscriber", subject: letter.subject, letterId: input.letterId, attorneyNote: input.userVisibleNote, appUrl });
          }
          await createNotification({ userId: letter.userId, type: "needs_changes", title: "Changes requested for your letter", body: input.userVisibleNote, link: `/letters/${input.letterId}` });
        } catch (err) { console.error("[Notify] Failed:", err); }
        if (input.retriggerPipeline && letter.intakeJson) {
          retryPipelineFromStage(input.letterId, letter.intakeJson as any, "drafting").catch(console.error);
        }
        return { success: true };
      }),

    saveEdit: employeeProcedure
      .input(z.object({ letterId: z.number(), content: z.string().min(50), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        const version = await createLetterVersion({
          letterRequestId: input.letterId, versionType: "attorney_edit",
          content: input.content, createdByType: ctx.user.role as any,
          createdByUserId: ctx.user.id, metadataJson: { note: input.note },
        });
        await logReviewAction({ letterRequestId: input.letterId, reviewerId: ctx.user.id, actorType: ctx.user.role as any, action: "attorney_edit_saved", noteText: input.note, noteVisibility: "internal" });
        return { versionId: (version as any)?.insertId };
      }),
  }),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    stats: adminProcedure.query(async () => getSystemStats()),

    users: adminProcedure
      .input(z.object({ role: z.enum(["subscriber", "employee", "admin"]).optional() }).optional())
      .query(async ({ input }) => getAllUsers(input?.role)),

    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["subscriber", "employee", "admin"]) }))
      .mutation(async ({ input }) => { await updateUserRole(input.userId, input.role); return { success: true }; }),

    allLetters: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => getAllLetterRequests({ status: input?.status })),

    failedJobs: adminProcedure.query(async () => getFailedJobs(100)),

    retryJob: adminProcedure
      .input(z.object({ letterId: z.number(), stage: z.enum(["research", "drafting"]) }))
      .mutation(async ({ input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        if (!letter.intakeJson) throw new TRPCError({ code: "BAD_REQUEST", message: "No intake data found" });
        retryPipelineFromStage(input.letterId, letter.intakeJson as any, input.stage).catch(console.error);
        return { success: true, message: `Retry started for stage: ${input.stage}` };
      }),

    purgeFailedJobs: adminProcedure
      .mutation(async () => {
        const result = await purgeFailedJobs();
        return { success: true, deletedCount: result.deletedCount };
      }),

    letterJobs: adminProcedure
      .input(z.object({ letterId: z.number() }))
      .query(async ({ input }) => getWorkflowJobsByLetterId(input.letterId)),

    employees: adminProcedure.query(async () => getEmployees()),

    getLetterDetail: adminProcedure
      .input(z.object({ letterId: z.number() }))
      .query(async ({ input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        const [versions, actions, jobs] = await Promise.all([
          getLetterVersionsByRequestId(input.letterId, true), // include internal
          getReviewActions(input.letterId, true), // include internal
          getWorkflowJobsByLetterId(input.letterId),
        ]);
        const aiDraftVersion = versions.find(v => v.versionType === "ai_draft");
        return {
          ...letter,
          aiDraftContent: aiDraftVersion?.content ?? null,
          letterVersions: versions,
          reviewActions: actions,
          workflowJobs: jobs,
        };
      }),

    forceStatusTransition: adminProcedure
      .input(z.object({
        letterId: z.number(),
        newStatus: z.enum(["submitted", "researching", "drafting", "generated_locked", "pending_review", "under_review", "needs_changes", "approved", "rejected"]),
        reason: z.string().min(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        await updateLetterStatus(input.letterId, input.newStatus);
        await logReviewAction({
          letterRequestId: input.letterId,
          reviewerId: ctx.user.id,
          actorType: "admin",
          action: "admin_force_status_transition",
          noteText: `Admin forced status from ${letter.status} to ${input.newStatus}. Reason: ${input.reason}`,
          noteVisibility: "internal",
          fromStatus: letter.status,
          toStatus: input.newStatus,
        });
        return { success: true };
      }),

    assignLetter: adminProcedure
      .input(z.object({ letterId: z.number(), employeeId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestById(input.letterId);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
        await updateLetterStatus(input.letterId, letter.status, { assignedReviewerId: input.employeeId });
        await logReviewAction({ letterRequestId: input.letterId, reviewerId: ctx.user.id, actorType: "admin", action: "assigned_reviewer", noteText: `Assigned to employee ID ${input.employeeId}`, noteVisibility: "internal" });
        try {
          const appUrl = getAppUrl(ctx.req);
          const employee = await getUserById(input.employeeId);
          if (employee?.email) {
            await sendNewReviewNeededEmail({ to: employee.email, name: employee.name ?? "Attorney", letterSubject: letter.subject, letterId: input.letterId, letterType: letter.letterType, jurisdiction: `${letter.jurisdictionState ?? ""}, ${letter.jurisdictionCountry ?? "US"}`, appUrl });
          }
        } catch (err) { console.error("[Notify] Failed:", err); }
        return { success: true };
      }),
  }),

  // ─── Notifications ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ unreadOnly: z.boolean().default(false) }).optional())
      .query(async ({ ctx, input }) => getNotificationsByUserId(ctx.user.id, input?.unreadOnly ?? false)),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => { await markNotificationRead(input.id, ctx.user.id); return { success: true }; }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => { await markAllNotificationsRead(ctx.user.id); return { success: true }; }),
  }),

  // ─── Shared: Letter Version Access ─────────────────────────────────────────
  versions: router({
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const version = await getLetterVersionById(input.id);
        if (!version) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role === "subscriber") {
          // Subscribers can view final_approved versions always
          // They can also view ai_draft when the letter is generated_locked (paywall preview)
          if (version.versionType === "final_approved") return version;
          if (version.versionType === "ai_draft") {
            // Verify the letter belongs to this subscriber and is in generated_locked
            const letter = await getLetterRequestById(version.letterRequestId);
            if (letter && letter.userId === ctx.user.id && letter.status === "generated_locked") {
              return version;
            }
          }
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return version;
      }),
  }),
  // ─── Stripe / Billing ────────────────────────────────────────────────────
  billing: router({
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubscription(ctx.user.id);
    }),
    checkCanSubmit: protectedProcedure.query(async ({ ctx }) => {
      return checkLetterSubmissionAllowed(ctx.user.id);
    }),
    createCheckout: protectedProcedure
      .input(z.object({ planId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await createCheckoutSession({
          userId: ctx.user.id,
          email: ctx.user.email ?? "",
          name: ctx.user.name,
          planId: input.planId,
          origin: ctx.req.headers.origin as string ?? "https://localhost:3000",
        });
        return result;
      }),
    createBillingPortal: protectedProcedure.mutation(async ({ ctx }) => {
      const url = await createBillingPortalSession({
        userId: ctx.user.id,
        email: ctx.user.email ?? "",
        origin: ctx.req.headers.origin as string ?? "https://localhost:3000",
      });
      return { url };
    }),
    // ─── Check if user qualifies for free first letter ───
    checkFirstLetterFree: subscriberProcedure.query(async ({ ctx }) => {
      // Count how many letters this user has that went past generated_locked (i.e., were paid/unlocked)
      const db = await (await import("./db")).getDb();
      if (!db) return { eligible: false };
      const { letterRequests } = await import("../drizzle/schema");
      const { eq, and, notInArray } = await import("drizzle-orm");
      const paidLetters = await db.select({ id: letterRequests.id })
        .from(letterRequests)
        .where(and(
          eq(letterRequests.userId, ctx.user.id),
          notInArray(letterRequests.status, ["submitted", "researching", "drafting", "generated_locked"])
        ));
      return { eligible: paidLetters.length === 0 };
    }),

    // ─── Free unlock: first letter goes directly to pending_review ───
    freeUnlock: subscriberProcedure
      .input(z.object({ letterId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const letter = await getLetterRequestSafeForSubscriber(input.letterId, ctx.user.id);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND", message: "Letter not found" });
        if (letter.status !== "generated_locked")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Letter is not in generated_locked status" });

        // Verify they actually qualify for free first letter
        const db = await (await import("./db")).getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { letterRequests } = await import("../drizzle/schema");
        const { eq: eqOp, and: andOp, notInArray: notInOp } = await import("drizzle-orm");
        const paidLetters = await db.select({ id: letterRequests.id })
          .from(letterRequests)
          .where(andOp(
            eqOp(letterRequests.userId, ctx.user.id),
            notInOp(letterRequests.status, ["submitted", "researching", "drafting", "generated_locked"])
          ));
        if (paidLetters.length > 0)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Free first letter has already been used." });

        // Transition to pending_review
        await updateLetterStatus(input.letterId, "pending_review");
        await logReviewAction({
          letterRequestId: input.letterId,
          reviewerId: ctx.user.id,
          actorType: "subscriber",
          action: "free_unlock",
          noteText: "First letter — free attorney review (promotional)",
          noteVisibility: "internal",
          fromStatus: "generated_locked",
          toStatus: "pending_review",
        });

        // Send notification emails
        try {
          await sendLetterUnlockedEmail({
            to: ctx.user.email ?? "",
            name: ctx.user.name ?? "Subscriber",
            subject: letter.subject,
            letterId: input.letterId,
            appUrl: getAppUrl(ctx.req),
          });
          await sendNewReviewNeededEmail({
            to: "", // Will use admin email from config
            name: "Attorney Team",
            letterSubject: letter.subject,
            letterId: input.letterId,
            letterType: letter.letterType,
            jurisdiction: letter.jurisdictionState ?? "Unknown",
            appUrl: getAppUrl(ctx.req),
          });
        } catch (e) { console.error("[freeUnlock] Email error:", e); }

        return { success: true, free: true };
      }),

    // ─── Pay-to-unlock: one-time $200 checkout for a specific locked letter ───
    payToUnlock: subscriberProcedure
      .input(z.object({ letterId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify the letter belongs to this subscriber and is in generated_locked status
        const letter = await getLetterRequestSafeForSubscriber(input.letterId, ctx.user.id);
        if (!letter) throw new TRPCError({ code: "NOT_FOUND", message: "Letter not found" });
        if (letter.status !== "generated_locked")
          throw new TRPCError({ code: "BAD_REQUEST", message: "Letter is not in generated_locked status" });
        const origin = getAppUrl(ctx.req);
        const result = await createLetterUnlockCheckout({
          userId: ctx.user.id,
          email: ctx.user.email ?? "",
          name: ctx.user.name,
          letterId: input.letterId,
          origin,
        });
        return result;
      }),
  }),
});
export type AppRouter = typeof appRouter;
