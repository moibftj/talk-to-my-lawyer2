import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { InsertUser } from "../drizzle/schema";
import {
  attachments,
  letterRequests,
  letterVersions,
  notifications,
  researchRuns,
  reviewActions,
  users,
  workflowJobs,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  // SUPABASE_DATABASE_URL takes priority over the platform-injected TiDB DATABASE_URL
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && dbUrl) {
    try {
      const isSupabase = dbUrl.includes('supabase');
      const client = postgres(dbUrl, {
        ssl: 'require',
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(client);
      console.log(`[Database] Connected to ${isSupabase ? 'Supabase (PostgreSQL)' : 'TiDB'}`);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ═══════════════════════════════════════════════════════
// USER HELPERS
// ═══════════════════════════════════════════════════════

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers(role?: "subscriber" | "employee" | "admin") {
  const db = await getDb();
  if (!db) return [];
  if (role) return db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "subscriber" | "employee" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getEmployees() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(inArray(users.role, ["employee", "admin"])).orderBy(users.name);
}

// ═══════════════════════════════════════════════════════
// LETTER REQUEST HELPERS
// ═══════════════════════════════════════════════════════

export async function createLetterRequest(data: {
  userId: number;
  letterType: string;
  subject: string;
  issueSummary?: string;
  jurisdictionCountry?: string;
  jurisdictionState?: string;
  jurisdictionCity?: string;
  intakeJson?: unknown;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(letterRequests).values({
    userId: data.userId,
    letterType: data.letterType as any,
    subject: data.subject,
    issueSummary: data.issueSummary,
    jurisdictionCountry: data.jurisdictionCountry ?? "US",
    jurisdictionState: data.jurisdictionState,
    jurisdictionCity: data.jurisdictionCity,
    intakeJson: data.intakeJson as any,
    status: "submitted",
    priority: data.priority ?? "normal",
    lastStatusChangedAt: new Date(),
  });
  return result[0];
}

export async function getLetterRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(letterRequests).where(eq(letterRequests.id, id)).limit(1);
  return result[0];
}

export async function getLetterRequestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(letterRequests).where(eq(letterRequests.userId, userId)).orderBy(desc(letterRequests.createdAt));
}

/** Subscriber-safe: never returns AI draft, attorney edits, or internal research data */
export async function getLetterRequestSafeForSubscriber(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: letterRequests.id,
    letterType: letterRequests.letterType,
    subject: letterRequests.subject,
    issueSummary: letterRequests.issueSummary,
    jurisdictionCountry: letterRequests.jurisdictionCountry,
    jurisdictionState: letterRequests.jurisdictionState,
    jurisdictionCity: letterRequests.jurisdictionCity,
    intakeJson: letterRequests.intakeJson,
    status: letterRequests.status,
    priority: letterRequests.priority,
    currentFinalVersionId: letterRequests.currentFinalVersionId,
    pdfUrl: letterRequests.pdfUrl,
    lastStatusChangedAt: letterRequests.lastStatusChangedAt,
    createdAt: letterRequests.createdAt,
    updatedAt: letterRequests.updatedAt,
  }).from(letterRequests).where(and(eq(letterRequests.id, id), eq(letterRequests.userId, userId))).limit(1);
  return result[0];
}

export async function getAllLetterRequests(filters?: {
  status?: string;
  assignedReviewerId?: number | null;
  unassigned?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(letterRequests.status, filters.status as any));
  if (filters?.unassigned) conditions.push(isNull(letterRequests.assignedReviewerId));
  else if (filters?.assignedReviewerId !== undefined && filters.assignedReviewerId !== null)
    conditions.push(eq(letterRequests.assignedReviewerId, filters.assignedReviewerId));
  const query = db.select().from(letterRequests).orderBy(desc(letterRequests.createdAt));
  if (conditions.length > 0) return query.where(and(...conditions));
  return query;
}

export async function updateLetterStatus(
  id: number,
  status: string,
  options?: { assignedReviewerId?: number | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {
    status,
    lastStatusChangedAt: new Date(),
    updatedAt: new Date(),
  };
  if (options?.assignedReviewerId !== undefined) updateData.assignedReviewerId = options.assignedReviewerId;
  await db.update(letterRequests).set(updateData as any).where(eq(letterRequests.id, id));
}

export async function updateLetterVersionPointers(
  id: number,
  pointers: { currentAiDraftVersionId?: number; currentFinalVersionId?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(letterRequests).set({ ...pointers, updatedAt: new Date() } as any).where(eq(letterRequests.id, id));
}

export async function claimLetterForReview(letterId: number, reviewerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Idempotency: only claim if unassigned or already claimed by same reviewer
  const letter = await getLetterRequestById(letterId);
  if (!letter) throw new Error("Letter not found");
  if (letter.assignedReviewerId && letter.assignedReviewerId !== reviewerId) {
    throw new Error("Letter is already claimed by another reviewer");
  }
  await db.update(letterRequests).set({
    assignedReviewerId: reviewerId,
    status: "under_review",
    lastStatusChangedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(letterRequests.id, letterId));
}

export async function updateLetterPdfUrl(id: number, pdfUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(letterRequests).set({ pdfUrl, updatedAt: new Date() } as any).where(eq(letterRequests.id, id));
}

// ═══════════════════════════════════════════════════════
// LETTER VERSION HELPERS
// ═══════════════════════════════════════════════════════

export async function createLetterVersion(data: {
  letterRequestId: number;
  versionType: "ai_draft" | "attorney_edit" | "final_approved";
  content: string;
  createdByType: "system" | "subscriber" | "employee" | "admin";
  createdByUserId?: number;
  metadataJson?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(letterVersions).values({
    letterRequestId: data.letterRequestId,
    versionType: data.versionType,
    content: data.content,
    createdByType: data.createdByType,
    createdByUserId: data.createdByUserId,
    metadataJson: data.metadataJson as any,
  });
  return result[0];
}

export async function getLetterVersionsByRequestId(letterRequestId: number, includeInternal = false) {
  const db = await getDb();
  if (!db) return [];
  if (includeInternal) {
    return db.select().from(letterVersions).where(eq(letterVersions.letterRequestId, letterRequestId)).orderBy(desc(letterVersions.createdAt));
  }
  // Subscriber-safe: return final_approved + ai_draft (for generated_locked preview)
  return db.select().from(letterVersions).where(
    and(
      eq(letterVersions.letterRequestId, letterRequestId),
      inArray(letterVersions.versionType, ["final_approved", "ai_draft"])
    )
  ).orderBy(desc(letterVersions.createdAt));
}

export async function getLetterVersionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(letterVersions).where(eq(letterVersions.id, id)).limit(1);
  return result[0];
}

// ═══════════════════════════════════════════════════════
// REVIEW ACTION HELPERS (AUDIT TRAIL)
// ═══════════════════════════════════════════════════════

export async function logReviewAction(data: {
  letterRequestId: number;
  reviewerId?: number;
  actorType: "system" | "subscriber" | "employee" | "admin";
  action: string;
  noteText?: string;
  noteVisibility?: "internal" | "user_visible";
  fromStatus?: string;
  toStatus?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reviewActions).values({
    letterRequestId: data.letterRequestId,
    reviewerId: data.reviewerId,
    actorType: data.actorType,
    action: data.action,
    noteText: data.noteText,
    noteVisibility: data.noteVisibility ?? "internal",
    fromStatus: data.fromStatus,
    toStatus: data.toStatus,
  });
}

export async function getReviewActions(letterRequestId: number, includeInternal = false) {
  const db = await getDb();
  if (!db) return [];
  if (includeInternal) {
    return db.select().from(reviewActions).where(eq(reviewActions.letterRequestId, letterRequestId)).orderBy(desc(reviewActions.createdAt));
  }
  // Subscriber-safe: only return user_visible notes
  return db.select().from(reviewActions).where(
    and(eq(reviewActions.letterRequestId, letterRequestId), eq(reviewActions.noteVisibility, "user_visible"))
  ).orderBy(desc(reviewActions.createdAt));
}

// ═══════════════════════════════════════════════════════
// WORKFLOW JOB HELPERS
// ═══════════════════════════════════════════════════════

export async function createWorkflowJob(data: {
  letterRequestId: number;
  jobType: "research" | "draft_generation" | "generation_pipeline" | "retry";
  provider?: string;
  requestPayloadJson?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workflowJobs).values({
    letterRequestId: data.letterRequestId,
    jobType: data.jobType,
    provider: data.provider,
    status: "queued",
    attemptCount: 0,
    requestPayloadJson: data.requestPayloadJson as any,
  });
  return result[0];
}

export async function updateWorkflowJob(
  id: number,
  data: {
    status?: "queued" | "running" | "completed" | "failed";
    errorMessage?: string;
    responsePayloadJson?: unknown;
    startedAt?: Date;
    completedAt?: Date;
    attemptCount?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workflowJobs).set({ ...data, responsePayloadJson: data.responsePayloadJson as any, updatedAt: new Date() } as any).where(eq(workflowJobs.id, id));
}

export async function getWorkflowJobsByLetterId(letterRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowJobs).where(eq(workflowJobs.letterRequestId, letterRequestId)).orderBy(desc(workflowJobs.createdAt));
}

export async function getFailedJobs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflowJobs).where(eq(workflowJobs.status, "failed")).orderBy(desc(workflowJobs.createdAt)).limit(limit);
}

export async function getWorkflowJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workflowJobs).where(eq(workflowJobs.id, id)).limit(1);
  return result[0];
}

export async function purgeFailedJobs(): Promise<{ deletedCount: number }> {
  const db = await getDb();
  if (!db) return { deletedCount: 0 };
  // Get count before deleting
  const failed = await db.select({ id: workflowJobs.id }).from(workflowJobs).where(eq(workflowJobs.status, "failed"));
  if (failed.length === 0) return { deletedCount: 0 };
  await db.delete(workflowJobs).where(eq(workflowJobs.status, "failed"));
  return { deletedCount: failed.length };
}

// ═══════════════════════════════════════════════════════
// RESEARCH RUN HELPERS
// ═══════════════════════════════════════════════════════

export async function createResearchRun(data: {
  letterRequestId: number;
  workflowJobId?: number;
  provider?: string;
  queryPlanJson?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(researchRuns).values({
    letterRequestId: data.letterRequestId,
    workflowJobId: data.workflowJobId,
    provider: data.provider ?? "perplexity",
    status: "queued",
    queryPlanJson: data.queryPlanJson as any,
  });
  return result[0];
}

export async function updateResearchRun(
  id: number,
  data: {
    status?: "queued" | "running" | "completed" | "failed" | "invalid";
    resultJson?: unknown;
    validationResultJson?: unknown;
    errorMessage?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(researchRuns).set({
    ...data,
    resultJson: data.resultJson as any,
    validationResultJson: data.validationResultJson as any,
    updatedAt: new Date(),
  } as any).where(eq(researchRuns.id, id));
}

export async function getResearchRunsByLetterId(letterRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(researchRuns).where(eq(researchRuns.letterRequestId, letterRequestId)).orderBy(desc(researchRuns.createdAt));
}

export async function getLatestResearchRun(letterRequestId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(researchRuns).where(
    and(eq(researchRuns.letterRequestId, letterRequestId), eq(researchRuns.status, "completed"))
  ).orderBy(desc(researchRuns.createdAt)).limit(1);
  return result[0];
}

// ═══════════════════════════════════════════════════════
// ATTACHMENT HELPERS
// ═══════════════════════════════════════════════════════

export async function createAttachment(data: {
  letterRequestId: number;
  uploadedByUserId: number;
  storagePath: string;
  storageUrl?: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(attachments).values(data);
  return result[0];
}

export async function getAttachmentsByLetterId(letterRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments).where(eq(attachments.letterRequestId, letterRequestId)).orderBy(attachments.createdAt);
}

// ═══════════════════════════════════════════════════════
// NOTIFICATION HELPERS
// ═══════════════════════════════════════════════════════

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadataJson?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    link: data.link,
    metadataJson: data.metadataJson as any,
  });
}

export async function getNotificationsByUserId(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (unreadOnly) {
    return db.select().from(notifications).where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt))
    ).orderBy(desc(notifications.createdAt)).limit(50);
  }
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ readAt: new Date() }).where(
    and(eq(notifications.id, id), eq(notifications.userId, userId))
  );
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ readAt: new Date() }).where(
    and(eq(notifications.userId, userId), isNull(notifications.readAt))
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN STATS HELPERS
// ═══════════════════════════════════════════════════════

export async function getSystemStats() {
  const db = await getDb();
  if (!db) return null;
  const [totalLetters] = await db.select({ count: sql<number>`count(*)` }).from(letterRequests);
  const [pendingReview] = await db.select({ count: sql<number>`count(*)` }).from(letterRequests).where(
    inArray(letterRequests.status, ["pending_review", "under_review"] as any)
  );
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(letterRequests).where(eq(letterRequests.status, "approved" as any));
  const [failedJobs] = await db.select({ count: sql<number>`count(*)` }).from(workflowJobs).where(eq(workflowJobs.status, "failed"));
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [subscribers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "subscriber"));
  return {
    totalLetters: Number(totalLetters?.count ?? 0),
    pendingReview: Number(pendingReview?.count ?? 0),
    approved: Number(approved?.count ?? 0),
    failedJobs: Number(failedJobs?.count ?? 0),
    totalUsers: Number(totalUsers?.count ?? 0),
    subscribers: Number(subscribers?.count ?? 0),
  };
}
