# Talk-to-My-Lawyer TODO

## Phase 1: Foundation
- [x] Database schema (users roles, letter_requests, letter_versions, review_actions, workflow_jobs, research_runs, attachments, notifications)
- [x] Status machine enum and transition validation (submitted → researching → drafting → pending_review → under_review → approved/rejected/needs_changes, NO draft state)
- [x] Global design system (color palette, typography, theme)

## Phase 2: Auth & Navigation
- [x] Role-based user system (subscriber, employee, admin)
- [x] Role-based routing and navigation
- [x] DashboardLayout with sidebar for each role (AppLayout component)
- [x] Login/auth flow with role detection and auto-redirect

## Phase 3: Subscriber Portal
- [x] Multi-step letter intake form (jurisdiction, matter type, parties, facts, desired outcome)
- [x] File upload for attachments (S3 integration)
- [x] My Letters list page with status badges
- [x] Letter detail page (status timeline, intake summary, final approved letter only)
- [x] Secure data isolation — subscribers never see AI drafts or research

## Phase 4: Employee/Attorney Review Center
- [x] Review queue with filtering (pending_review, under_review, needs_changes)
- [x] Review detail page with intake panel, AI draft editor, research panel
- [x] Claim/assign letter for review
- [x] Save attorney edit version
- [x] Approve/reject/request changes actions
- [x] Review actions audit trail

## Phase 5: Admin Dashboard
- [x] Failed jobs monitor
- [x] Retry failed pipeline jobs
- [x] System health overview (queue counts, status distribution)
- [x] User management (role assignment)

## Phase 6: AI Pipeline
- [x] Stage 1: Perplexity API research (jurisdiction rules, statutes, case law)
- [x] Research packet validation gate
- [x] Stage 2: OpenAI drafting from validated research
- [x] Draft parser/validator
- [x] Pipeline orchestration (status transitions, job logging)
- [x] Failure handling and retry logic

## Phase 6b: High-Priority Additions
- [x] Deterministic research packet validator (validateResearchPacket)
- [x] Deterministic draft JSON parser/validator (parseAndValidateDraftLlmOutput)
- [x] Subscriber-safe detail endpoint (never returns ai_draft/attorney edits/internal research)
- [x] Notification system via Resend email (subscriber: needs_changes/approved/rejected; attorney/admin: pending_review/failed jobs)
- [x] Transactional email templates: status change, approval, rejection, needs_changes, new_review_needed
- [x] Resend API key configuration (via webdev_request_secrets)
- [x] Claim/assignment locking in attorney review queue
- [x] Retry failed job controls for admins
- [x] Idempotency protections for duplicate submissions/retries
- [x] Note visibility (internal vs user_visible) in review actions
- [x] Final approved version generation on approval (freeze version + current_final_version_id)
- [ ] PDF export / downloadable output for final letters (future enhancement)

## Phase 7: Testing & Delivery
- [x] Vitest unit tests for critical paths (29 tests passing)
- [x] End-to-end verification (TypeScript clean, server healthy)
- [ ] Save checkpoint and deliver

## Future Enhancements
- [ ] PDF export for final approved letters
- [ ] n8n workflow integration for letter generation
- [ ] Stripe payment integration for subscriptions
- [ ] Mobile PWA optimization

## Phase 8: E2E Workflow Audit & Fix
- [x] Audit intake form fields → pipeline input mapping
- [x] Add 3rd AI stage: Claude/Anthropic final letter assembly (combines research + draft into professional letter)
- [x] Ensure pipeline status transitions fire correctly: submitted → researching → drafting → pending_review
- [x] Ensure review center claim/approve/reject correctly updates status and creates final version
- [x] Ensure approved letter appears in subscriber My Letters with full content
- [x] Ensure subscriber detail page shows final approved letter (not AI drafts/research)

## Phase 9: Stripe Payment Integration
- [ ] Add Stripe feature via webdev_add_feature
- [ ] Subscription plans: per-letter ($299), monthly ($200/mo unlimited), annual ($2000/yr 48 letters)
- [ ] Checkout session creation with metadata
- [ ] Webhook handler for checkout.session.completed
- [ ] Atomic subscription activation (prevent race conditions)
- [ ] Commission tracking (5% employee referral)
- [ ] Employee coupon system (20% discount on per-letter)
- [ ] Pricing page UI
- [ ] Credit/letter allowance enforcement before letter submission

## Phase 10: Spec Compliance Patches (from pasted_content_4)
- [ ] Add buildNormalizedPromptInput helper (trim strings, safe defaults, filter empty rows)
- [ ] Strengthen validateResearchPacket: require sourceUrl+sourceTitle per rule, prefer >= 3 rules
- [ ] Add subscriber updateForChanges mutation (re-submit after needs_changes)
- [ ] Add admin forceStatusTransition mutation (audited)
- [ ] Add frontend polling/revalidation for researching/drafting/pending_review statuses
- [ ] Add status timeline component in subscriber LetterDetail
- [ ] Add subscriber update form when status is needs_changes
- [ ] Verify success path E2E (submit → research → draft → assembly → pending_review → claim → approve → subscriber sees final)
- [ ] Verify failure path (invalid research stops pipeline, invalid draft stops pipeline)
- [ ] Verify security (subscriber cannot access ai_draft/research/internal notes)

## Phase 12: Stripe Payment Integration
- [x] Fix TypeScript error in AdminLetterDetail page
- [x] Add Stripe scaffold via webdev_add_feature
- [x] Configure STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY
- [x] Create subscriptions and payments tables in database
- [x] Create Stripe products/prices: per-letter ($29), monthly ($79/mo), annual ($599/yr)
- [x] Build checkout session endpoint (tRPC)
- [x] Build Stripe webhook handler (subscription events, payment events)
- [x] Build subscription status checker middleware
- [x] Build billing portal redirect endpoint
- [x] Build Pricing page with 3 plans
- [x] Build Subscription status component in subscriber dashboard
- [x] Gate letter submission behind active subscription or available credits
- [x] Show upgrade prompt when subscriber has no active plan
- [x] Admin: view subscriber subscription status
- [x] Run tests and save checkpoint (29/29 passing, 0 TS errors)

## Phase 11: n8n Workflow Integration & Frontend Polish
- [ ] Get n8n workflow webhook URL for the best legal letter workflow
- [ ] Activate the n8n workflow so webhook is live
- [ ] Update pipeline.ts to call n8n webhook as primary, with in-app AI fallback
- [ ] Add N8N_WEBHOOK_URL as environment variable
- [ ] Build admin letter detail page with force status transition dialog
- [ ] Add polling/revalidation to employee ReviewDetail for in-progress statuses
- [ ] Verify TypeScript compiles cleanly
- [ ] Run all tests

## Phase 13: Dashboard Enhancement — Letters History & Payment Receipts
- [ ] Audit current subscriber dashboard, MyLetters, and Billing pages
- [ ] Add backend: letters list with search/filter/sort/pagination (tRPC)
- [ ] Add backend: payment receipts list from Stripe invoices (tRPC)
- [ ] Rebuild MyLetters page as full Letters History with search, filter by status/type/date, sort, pagination
- [ ] Build Payment Receipts page with Stripe invoice history, amounts, dates, downloadable receipt links
- [ ] Enhance subscriber Dashboard with summary stats (total letters, active subscription, credits used, pending reviews)
- [ ] Add recent activity feed on dashboard (last 5 letters with status)
- [ ] Add quick action cards on dashboard (Submit Letter, View Letters, Billing)
- [ ] Run tests, verify, save checkpoint

## Phase 14: Paywall Flow Revision + Dashboard Enhancements
- [x] Add generated_locked status to schema enum and status machine
- [x] Update DB migration to include generated_locked status
- [x] Add payToUnlock mutation: create per-letter checkout, on success advance to pending_review
- [x] Build LetterPaywall component: blurred AI draft preview + Pay Now button
- [x] Update LetterDetail to show LetterPaywall when status = generated_locked
- [x] Update pipeline to set status = generated_locked after AI assembly (instead of pending_review)
- [x] Update Stripe webhook to handle letter unlock (generated_locked → pending_review)
- [x] Update MyLetters list: generated_locked highlighted amber with "Unlock for $29" badge
- [x] Update StatusTimeline: generated_locked step with amber lock icon
- [x] Update StatusBadge: generated_locked shows "Ready to Unlock" in yellow
- [x] Tests: 31/31 passing, 0 TypeScript errors
- [ ] Build Payment Receipts page with invoice history, amounts, dates, receipt links (future)
- [ ] Enhance subscriber Dashboard: subscription status widget, activity feed, quick action cards (future)
- [ ] Add date range filter to Letters History (future)

## Phase 15: Post-Submission Email Notifications
- [x] Add sendLetterSubmissionEmail: branded confirmation email sent immediately after letter submission
- [x] Add sendLetterReadyEmail: "your draft is ready" email sent when AI pipeline sets generated_locked
- [x] Add sendLetterUnlockedEmail: payment confirmation email sent after Stripe unlock webhook
- [x] Wire sendLetterSubmissionEmail into letters.submit mutation (routers.ts)
- [x] Wire sendLetterReadyEmail into pipeline.ts Stage 3 completion (in-app pipeline path)
- [x] Wire sendLetterReadyEmail into n8nCallback.ts completion (n8n pipeline path)
- [x] Wire sendLetterUnlockedEmail into stripeWebhook.ts letter unlock handler
- [x] Tests: 35/35 passing, 0 TypeScript errors

## Phase 16: Dev Email Preview Endpoint
- [ ] Build server/emailPreview.ts: dev-only Express route at GET /api/dev/email-preview
- [ ] Index page: lists all available templates with links
- [ ] Per-template rendering: ?type=submission|letter_ready|unlocked|approved|rejected|needs_changes|new_review|job_failed
- [ ] Query param support: ?name=&subject=&letterId= for realistic preview data
- [ ] Guard: only active in NODE_ENV !== production
- [ ] Register route in server/_core/index.ts or server/index.ts
- [ ] Verify all templates render correctly in browser
- [ ] Add vitest test for route existence and guard

## Phase 16: Dev Email Preview Endpoint
- [x] Build server/emailPreview.ts: dev-only Express route at GET /api/dev/email-preview
- [x] Index page: lists all 9 templates with HTML and plain-text preview links
- [x] Per-template rendering: ?type=submission|letter_ready|unlocked|approved|rejected|needs_changes|new_review|job_failed|status_update
- [x] Query param support: ?name=&subject=&letterId=&state=&letterType=&mode= for realistic preview data
- [x] Guard: only active in NODE_ENV !== production (verified in tests)
- [x] Dev toolbar overlay showing template name and subject line in browser
- [x] Register route in server/_core/index.ts
- [x] Vitest tests: route export, dev registration, production guard (3 new tests)
- [x] Tests: 38/38 passing, 0 TypeScript errors

## Phase 17: Spec Compliance Audit (pasted_content_7)
- [x] Status machine: all required transitions implemented (submitted→researching→drafting→generated_locked→pending_review→under_review→approved/rejected/needs_changes, needs_changes→researching/drafting)
- [x] forceStatusTransition admin mutation: implemented and wired to admin UI
- [x] buildNormalizedPromptInput: implemented in server/intake-normalizer.ts
- [x] validateResearchPacket: implemented in server/pipeline.ts with sourceUrl/sourceTitle enforcement
- [x] updateForChanges subscriber mutation: implemented and re-triggers pipeline
- [x] research_sources table: spec marks as optional for MVP — sources embedded in research_runs.resultJson (sourceUrl + sourceTitle per rule)
- [x] All 8 required tables present: users, letter_requests, letter_versions, review_actions, attachments, notifications, workflow_jobs, research_runs
- [x] Subscriber-safe detail endpoint: ai_draft/research/internal notes never returned to subscribers
- [x] Role-based access: subscriberProcedure, employeeProcedure, adminProcedure guards in place

## Phase 18: Spec Compliance Gaps (from SPEC_COMPLIANCE.md audit)
- [ ] P1: Add 7 missing database indexes (letter_requests.status, user_id, assigned_reviewer_id; letter_versions.letter_request_id; review_actions.letter_request_id; workflow_jobs.letter_request_id+status; research_runs.letter_request_id+status)
- [ ] P1: Add attachment upload UI to SubmitLetter form (step 6 — file upload with size validation)
- [ ] P2: Add `language` field to intake normalizer and SubmitLetter form
- [ ] P2: Add `deadlines` field to intake normalizer and SubmitLetter form
- [ ] P2: Add `communications` field to intake normalizer and SubmitLetter form
- [ ] P2: Normalize `toneAndDelivery` as proper intake object (not just tonePreference string)
- [ ] P3: Add research_sources as a separate table (optional — sources currently embedded in resultJson)
- [ ] P3: Consider role rename: employee→attorney_admin, admin→super_admin (requires migration)
- [ ] P3: Build Payment Receipts page at /subscriber/receipts
- [ ] P3: Add subscriber Dashboard stats widget (total letters, locked, in review)

## Phase 19: Database Indexes Migration
- [x] Add 7 spec-required indexes to drizzle/schema.ts using Drizzle index() API
- [x] Generate migration SQL via pnpm drizzle-kit generate (0004_previous_titania.sql)
- [x] Apply migration via webdev_execute_sql
- [x] Verify all 7 indexes exist in the database (confirmed via information_schema query)
- [x] Update SPEC_COMPLIANCE.md to mark indexes as complete

## Phase 20: Attachment Upload UI (SubmitLetter Step 6)
- [x] Audit uploadAttachment mutation and storage contract
- [x] Build Step 6 Evidence file-picker with drag-drop, file list, remove button, size/type validation
- [x] Upload attachments after submit (parallel, non-blocking failures)
- [x] LetterDetail subscriber attachments panel already complete (storageUrl + fileName download links)
- [x] 38/38 tests passing, 0 TypeScript errors

## Phase 21: Pipeline Routing Inversion
- [x] Read pipeline.ts routing logic
- [x] Make direct 3-stage pipeline (Perplexity + OpenAI + Claude) the primary path
- [x] Make n8n an optional fallback (only if N8N_WEBHOOK_URL is set AND N8N_PRIMARY=true env flag)
- [x] Update log messages to reflect new routing
- [x] 38/38 tests passing, 0 TypeScript errors

## Phase 22: Freemium Model (First Letter Free, Attorney Review Paid)
- [ ] Add `generated_unlocked` status to schema enum and status machine
- [ ] Add DB migration for new status value
- [ ] Update pipeline: check if first letter → set generated_unlocked (free), else generated_locked (paywall)
- [ ] Add sendForReview mutation: generated_unlocked → pending_review (free, no payment)
- [ ] Update LetterDetail: show full AI draft when status = generated_unlocked, CTA = "Send for Attorney Review ($29)"
- [ ] Update LetterPaywall copy: rename to "Get Attorney Review" gate
- [ ] Update MyLetters: show "AI Draft Ready - Free" badge for generated_unlocked
- [ ] Update StatusTimeline: add generated_unlocked step with green checkmark
- [ ] Update StatusBadge: generated_unlocked = "AI Draft Ready" in green
- [ ] Update Pricing page to reflect freemium model (first letter free)
- [ ] Update email: sendLetterReadyEmail copy for free vs paid path
- [ ] Run tests, update SPEC_COMPLIANCE.md, save checkpoint
