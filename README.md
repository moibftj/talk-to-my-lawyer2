# Talk-to-My-Lawyer

AI-powered legal letter drafting with mandatory attorney review.

## Canonical Validation Reference

> **Before implementing any feature, fix, or change — validate it against:**
> [`docs/TTML_REMAINING_FEATURES_PROMPT.md`](docs/TTML_REMAINING_FEATURES_PROMPT.md)

This document defines the exact remaining feature gaps, required schema changes, tRPC procedure names, route paths, and UI requirements that must be implemented to reach production parity. It is the single source of truth for what is missing and how each gap must be built.

## Documentation Index

| Document | Purpose |
|----------|---------|
| [`docs/TTML_REMAINING_FEATURES_PROMPT.md`](docs/TTML_REMAINING_FEATURES_PROMPT.md) | **Master validation reference** — 4 remaining feature gaps with exact implementation specs |
| [`docs/PIPELINE_ARCHITECTURE.md`](docs/PIPELINE_ARCHITECTURE.md) | AI pipeline routing decision (Perplexity → Anthropic × 2 active, n8n dormant) |
| [`docs/GAP_ANALYSIS.md`](docs/GAP_ANALYSIS.md) | Historical gap analysis from spec audit |
| [`docs/SUPABASE_MCP_CAPABILITIES.md`](docs/SUPABASE_MCP_CAPABILITIES.md) | Supabase MCP connector usage guide |
| [`SPEC_COMPLIANCE.md`](SPEC_COMPLIANCE.md) | Spec compliance tracking |
| [`AUDIT_REPORT.md`](AUDIT_REPORT.md) | Architecture audit report |
| [`todo.md`](todo.md) | Full feature and bug tracking (all phases) |

## Remaining Feature Gaps (from validation reference)

| Gap | Description | Priority |
|-----|-------------|----------|
| Gap 1 | Freemium `generated_unlocked` status — first letter shows full AI draft, attorney review costs $200 | Highest complexity |
| Gap 2 | Payment Receipts page at `/subscriber/receipts` — Stripe invoice history in-app | Isolated, low risk |
| Gap 3 | Intake form missing fields: `language`, `communications`, `toneAndDelivery` | Lowest risk, additive |
| Gap 4 | Mobile responsiveness fixes for Dashboard, MyLetters, Login, ReviewModal | Pure UI |

**Implementation order:** Gap 3 → Gap 2 → Gap 4 → Gap 1

## Tech Stack

- **Frontend:** Vite · React 19 · Wouter · Tailwind CSS · shadcn/ui
- **Backend:** Express · tRPC · Drizzle ORM
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth (JWT)
- **Payments:** Stripe (subscriptions + per-letter checkout)
- **Email:** Resend (transactional, 9 templates)
- **AI Pipeline:** Perplexity API (research) → Anthropic Claude (draft + assembly)

## Development

```bash
pnpm install        # install dependencies
pnpm dev            # start dev server (http://localhost:3000)
pnpm test           # run Vitest suite
pnpm tsc --noEmit   # TypeScript check
```

## Validation Gate

After every implementation:
1. `pnpm test` — all tests must pass
2. `pnpm tsc --noEmit` — 0 TypeScript errors
3. Verify no `ALLOWED_TRANSITIONS` regression in `shared/types.ts`
