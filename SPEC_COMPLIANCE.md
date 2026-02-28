# Talk-to-My-Lawyer — Spec Compliance Feedback Loop

> **Purpose:** This document is the living feedback loop between the master architecture spec (`pasted_content_8.txt`) and the actual implementation. It is updated at the end of every significant work session. Use it to know exactly what is done, what is remaining, and what the risks are before starting any new phase.
>
> **Last audited:** 2026-02-23 | **Tests:** 38/38 passing | **TypeScript:** 0 errors

---

## Overall Compliance Summary

| Phase | Spec Section | Status |
|---|---|---|
| Phase 0 | Repo Audit | ✅ Complete |
| Phase 1 | Foundation — Schema / Tables / Indexes / RLS | ⚠️ Mostly done, 3 gaps |
| Phase 2 | Canonical Intake + Normalization | ⚠️ Mostly done, 4 gaps |
| Phase 3 | Backend Services / Actions | ✅ Complete |
| Phase 4 | AI Pipeline (Two-Stage, Grounded, Validated) | ⚠️ Mostly done, 1 deviation |
| Phase 5 | Frontend Portals | ⚠️ Mostly done, 3 gaps |
| Phase 6 | Frontend ↔ Backend Integration | ✅ Complete |
| Phase 7 | Verification (Success / Failure / Security) | ⚠️ Partially verified |

---

## Phase 1 — Foundation (Schema / Tables / Indexes / RLS)

### Tables — Status

| Table | Spec Requirement | Implementation | Status |
|---|---|---|---|
| `users` (profiles) | id, email, full_name, role, is_active, created_at, updated_at | `users` table: id, openId, name, email, loginMethod, role, isActive, createdAt, updatedAt, lastSignedIn | ✅ All required fields present |
| `letter_requests` | All 16 required fields including matterCategory, lastStatusChangedAt | All 16 fields present: letterType, matterCategory (in intakeJson), subject, issueSummary, jurisdictionCountry/State/City, intakeJson, status, assignedReviewerId, currentAiDraftVersionId, currentFinalVersionId, priority, lastStatusChangedAt | ✅ Complete |
| `letter_versions` | id, letterRequestId, versionType, content, createdByType, createdByUserId, metadataJson, createdAt | Exact match | ✅ Complete |
| `review_actions` | id, letterRequestId, reviewerId, actorType, action, noteText, noteVisibility, fromStatus, toStatus, createdAt | Exact match | ✅ Complete |
| `attachments` | id, letterRequestId, uploadedByUserId, storagePath/bucketPath, fileName, mimeType, sizeBytes, metadataJson, createdAt | All fields present plus storageUrl | ✅ Complete |
| `notifications` | id, userId, type, title, body, link, readAt, metadataJson, createdAt | Exact match | ✅ Complete |
| `workflow_jobs` | All 12 required fields | All 12 fields present | ✅ Complete |
| `research_runs` | All 10 required fields | All 10 fields present | ✅ Complete |
| `research_sources` | Recommended (optional for MVP if embedded in resultJson) | **Not a separate table.** Sources embedded in `research_runs.resultJson` as `applicableRules[].sourceUrl + sourceTitle`. Spec explicitly marks this as optional for MVP. | ⚠️ Deferred (acceptable per spec) |

### Indexes — Status

The spec requires 7 minimum indexes:

| Index | Status |
|---|---|
| `letter_requests(status)` | ✅ `idx_letter_requests_status` |
| `letter_requests(user_id)` | ✅ `idx_letter_requests_userId` |
| `letter_requests(assigned_reviewer_id)` | ✅ `idx_letter_requests_assignedReviewerId` |
| `letter_versions(letter_request_id)` | ✅ `idx_letter_versions_letterRequestId` |
| `review_actions(letter_request_id)` | ✅ `idx_review_actions_letterRequestId` |
| `workflow_jobs(letter_request_id, status)` | ✅ `idx_workflow_jobs_letterRequestId_status` |
| `research_runs(letter_request_id, status)` | ✅ `idx_research_runs_letterRequestId_status` |

**All 7 required indexes are present in the database.** Applied via migration `0004_previous_titania.sql` on 2026-02-23.

### Role Enum — Status

| Spec Requirement | Implementation | Status |
|---|---|---|
| `subscriber` | `subscriber` | ✅ |
| `employee` | `employee` | ✅ |
| `attorney_admin` | **Mapped to `employee`** — attorney review center uses `employeeProcedure` which allows role `employee` or `admin` | ⚠️ Functional but not spec-exact |
| `super_admin` | **Mapped to `admin`** | ⚠️ Functional but not spec-exact |

The spec defines 4 roles (`subscriber`, `employee`, `attorney_admin`, `super_admin`). The implementation uses 3 roles (`subscriber`, `employee`, `admin`). Attorneys use the `employee` role and access the review center. This is a deliberate simplification that works functionally but diverges from the spec's role naming.

### RLS / Security — Status

The application uses Supabase (PostgreSQL). Security is enforced at the tRPC procedure level via `subscriberProcedure`, `employeeProcedure`, and `adminProcedure` middleware guards, in addition to Supabase Row Level Security policies on the database.

| Security Requirement | Status |
|---|---|
| Subscribers can only access their own requests | ✅ `getLetterRequestSafeForSubscriber(id, userId)` enforces ownership |
| Subscribers cannot read ai_draft / attorney_edit / research internals | ✅ `getLetterVersionsByRequestId(id, false)` returns only `final_approved` |
| Subscribers cannot read internal review_actions | ✅ `getReviewActions(id, false)` filters to `user_visible` only |
| Attorney/admin roles can read queue, drafts, research | ✅ `employeeProcedure` / `adminProcedure` gates |
| Sensitive inserts/updates through secure server-side code | ✅ All mutations are tRPC procedures, no direct DB access from client |

---

## Phase 2 — Canonical Intake + Normalization

### Intake Schema Fields — Status

| Spec Field | `intake-normalizer.ts` | Status |
|---|---|---|
| `schemaVersion` | ✅ Present | ✅ |
| `language` | ❌ Missing | ❌ **Gap** |
| `letterType` | ✅ Present | ✅ |
| `matterCategory` | ✅ Present | ✅ |
| `sender` (name, address, email, phone) | ✅ Present | ✅ |
| `recipient` (name, address, email, phone) | ✅ Present | ✅ |
| `jurisdiction` (country, state, city) | ✅ Present | ✅ |
| `matter` (description) | ✅ Present (as `description`) | ✅ |
| `timeline[]` | ✅ Present | ✅ |
| `financials` (amountOwed, currency) | ✅ Present | ✅ |
| `desiredOutcome` | ✅ Present | ✅ |
| `deadlines` | ❌ Missing | ❌ **Gap** |
| `evidenceSummary` | ✅ Present | ✅ |
| `attachments[]` | ✅ Present (as attachmentIds) | ✅ |
| `communications` | ❌ Missing | ❌ **Gap** |
| `toneAndDelivery` | ⚠️ Partial — `tonePreference` captured but not normalized as `toneAndDelivery` object | ⚠️ **Gap** |
| `userStatements` | ✅ Present | ✅ |
| `additionalContext` | ✅ Present | ✅ |

### `buildNormalizedPromptInput` — Status

✅ Implemented in `server/intake-normalizer.ts`. Trims strings, uses safe defaults for arrays/booleans, preserves null numeric values, filters empty rows, falls back to DB fields for subject/summary/jurisdiction.

### SubmitLetter Form — Intake Coverage

The multi-step form (5 steps) captures: letterType, tonePreference, jurisdictionState/Country/City, senderName/Address/Email/Phone, recipientName/Address/Email/Phone, description, amountOwed, desiredOutcome, additionalContext.

**Missing from form:** `timeline[]` (key events), `evidenceSummary`, `deadlines`, `communications` (prior contact history), `matterCategory` (explicit field). These are important for high-quality AI research and drafting.

---

## Phase 3 — Backend Services / Actions

### Required Backend Functions — Status

| Spec Function | Implementation | Status |
|---|---|---|
| `submitLetterRequest` | `trpc.letters.submit` | ✅ |
| `updateLetterRequestForChanges` | `trpc.letters.updateForChanges` | ✅ |
| `listMyLetterRequests` | `trpc.letters.myLetters` | ✅ |
| `getSubscriberLetterDetailSafe` | `trpc.letters.detail` → `getLetterRequestSafeForSubscriber` | ✅ |
| `enqueueGenerationPipeline` | `triggerLetterGeneration` in submit mutation | ✅ |
| `generateResearchPacketForRequest` | `runResearchStage` in `pipeline.ts` | ✅ |
| `validateResearchPacket` | `validateResearchPacket` in `pipeline.ts` | ✅ |
| `generateAIDraftFromResearch` | `runDraftingStage` in `pipeline.ts` | ✅ |
| `parseAndValidateDraftLlmOutput` | `parseAndValidateDraftLlmOutput` in `pipeline.ts` | ✅ |
| `saveAIDraftAndQueueReview` | `runAssemblyStage` in `pipeline.ts` | ✅ |
| `retryFailedJob` | `retryPipelineFromStage` + `trpc.admin.retryJob` | ✅ |
| `listAttorneyReviewQueue` | `trpc.review.queue` | ✅ |
| `getAttorneyReviewDetail` | `trpc.review.letterDetail` | ✅ |
| `claimLetterForReview` | `trpc.review.claim` | ✅ |
| `saveAttorneyEditVersion` | `trpc.review.saveEdit` | ✅ |
| `requestUserChanges` | `trpc.review.requestChanges` | ✅ |
| `approveLetterRequest` | `trpc.review.approve` | ✅ |
| `rejectLetterRequest` | `trpc.review.reject` | ✅ |
| `adminViewFailedJobs` | `trpc.admin.failedJobs` | ✅ |
| `adminRetryFailedJob` | `trpc.admin.retryJob` | ✅ |
| `adminForceStatusTransition` | `trpc.admin.forceStatusTransition` | ✅ |

**All 21 required backend functions are implemented.**

---

## Phase 4 — AI Pipeline

### Two-Stage Pipeline — Status

| Requirement | Status |
|---|---|
| Stage 1: Perplexity research with jurisdiction-aware, source-backed output | ✅ `runResearchStage` uses Perplexity sonar model |
| Stage 2: OpenAI drafting using intake + validated research packet only | ✅ `runDraftingStage` uses GPT-4o via Forge proxy |
| Strict JSON research packet with all required fields | ✅ Validated by `validateResearchPacket` |
| Deterministic research validation gate before drafting | ✅ Pipeline stops on invalid research |
| Draft parser: strip code fences, extract first JSON, validate exact keys | ✅ `parseAndValidateDraftLlmOutput` |
| On success: save ai_draft, update currentAiDraftVersionId, write audit rows | ✅ `runAssemblyStage` |
| On failure: mark jobs failed, log error, STOP pipeline, no incorrect status advance | ✅ Error handling in all three stages |

### Status Machine Deviation

The spec defines: `drafting → pending_review` as the success transition.

The implementation uses: `drafting → generated_locked → pending_review` (paywall step added).

This is an **intentional product decision** (paywall monetization) that diverges from the spec's pure status machine. The `forceStatusTransition` admin tool can bypass this if needed. This deviation is documented and acceptable.

---

## Phase 5 — Frontend Portals

### Subscriber Portal — Status

| Page | Status |
|---|---|
| New Letter Request (multi-step form) | ✅ 5-step form at `/submit` |
| Attachment upload in form | ❌ **Missing** — `uploadAttachment` mutation exists but no UI in SubmitLetter |
| My Letters (real data, status badges) | ✅ `/my-letters` with status filters |
| Letter Detail (status timeline, intake summary, user-visible notes) | ✅ `/letters/:id` |
| Letter Detail — final approved letter only when `approved` | ✅ Enforced in both frontend and backend |
| Letter Detail — NEVER show ai_draft or internal research | ✅ Backend enforces, frontend only renders `final_approved` |
| Paywall (generated_locked → pay to unlock) | ✅ `LetterPaywall` component |
| Status polling for in-progress statuses | ✅ `refetchInterval` on researching/drafting/pending_review/under_review |

### Attorney Review Center — Status

| Page | Status |
|---|---|
| Review Queue (pending_review / under_review / needs_changes) | ✅ `/employee/queue` |
| Review Detail — intake panel | ✅ |
| Review Detail — attachments panel | ✅ |
| Review Detail — AI draft panel + editor | ✅ |
| Review Detail — research panel (researchSummary, rules, riskFlags, openQuestions) | ✅ |
| Actions: claim, save edit, request changes, approve, reject | ✅ All 5 actions implemented |

### Admin/Ops Portal — Status

| Page | Status |
|---|---|
| Failed jobs monitor | ✅ `/admin/jobs` |
| Queue overview | ✅ `/admin/letters` |
| Retry failed jobs | ✅ |
| Force status transition | ✅ `/admin/letters/:id` |
| User role management | ✅ `/admin/users` |
| System stats dashboard | ✅ `/admin` |

---

## Phase 6 — Frontend ↔ Backend Integration

All UI is wired to real backend tRPC procedures. No mock data in production paths. Status changes reflected with polling/revalidation. ✅ Complete.

---

## Phase 7 — Verification

### Success Path

| Step | Status |
|---|---|
| 1. Submit request | ✅ |
| 2. Status → researching | ✅ |
| 3. Perplexity research runs | ✅ (confirmed via n8n workflow + in-app pipeline) |
| 4. Research packet stored + validated | ✅ |
| 5. Status → drafting | ✅ |
| 6. ChatGPT drafting using intake + research packet | ✅ |
| 7. ai_draft saved | ✅ |
| 8. currentAiDraftVersionId updated | ✅ |
| 9. Status → generated_locked (paywall) | ✅ (deviation from spec's pending_review) |
| 10. Subscriber pays → pending_review | ✅ (via Stripe webhook) |
| 11. Attorney claims → under_review | ✅ |
| 12. Attorney approves → approved + final_approved version saved | ✅ |
| 13. Subscriber sees final approved letter only | ✅ |

### Failure Path

| Test | Status |
|---|---|
| Invalid research packet → pipeline stops | ✅ Tested in ttml.test.ts |
| Invalid draft JSON → pipeline stops | ✅ Tested in ttml.test.ts |
| workflow_jobs marked failed | ✅ |
| Request does not advance to pending_review | ✅ |

### Security Validation

| Test | Status |
|---|---|
| Subscriber cannot access ai_draft/internal research | ✅ Backend enforced |
| Subscriber cannot call attorney endpoints | ✅ `employeeProcedure` guard |
| Internal notes remain internal | ✅ `getReviewActions(id, false)` |
| Final approved letter visible only when approved | ✅ Both frontend + backend |

---

## Remaining Gaps (Priority Order)

The following items are confirmed missing and should be implemented in the next sessions:

| Priority | Gap | Impact | Effort |
|---|---|---|---|
| ~~**P1 — High**~~ | ~~7 missing database indexes~~ | ~~Performance at scale~~ | ✅ Done — migration 0004 |
| **P1 — High** | Attachment upload UI in SubmitLetter form | Subscribers cannot attach evidence | Medium |
| **P2 — Medium** | `language` field in intake normalizer + form | Multi-language support | Low |
| **P2 — Medium** | `deadlines` field in intake normalizer + form | Attorney needs deadline context | Low |
| **P2 — Medium** | `communications` field in intake normalizer + form | Prior contact history for demand letters | Low |
| **P2 — Medium** | `toneAndDelivery` as proper intake object (not just `tonePreference`) | Richer drafting context | Low |
| **P3 — Low** | `research_sources` as a separate table | Better source querying/display | Medium |
| **P3 — Low** | Role names: `attorney_admin` / `super_admin` vs `employee` / `admin` | Spec alignment | Medium — requires migration + RBAC update |
| **P3 — Low** | Payment Receipts page (`/subscriber/receipts`) | Subscriber billing history | Medium |
| **P3 — Low** | Subscriber Dashboard stats widget | UX improvement | Low |

---

## How to Use This Document

Before starting any new work session on this project:

1. Read this file to understand the current compliance state.
2. Pick the highest-priority gap from the table above.
3. Implement it, run `pnpm test`, confirm 0 TypeScript errors.
4. Update the relevant section in this document (change ❌ to ✅ or ⚠️ to ✅).
5. Update `todo.md` to mark the item complete.
6. Save a checkpoint.

This document should always reflect the **current** state of the codebase, not aspirational goals.
