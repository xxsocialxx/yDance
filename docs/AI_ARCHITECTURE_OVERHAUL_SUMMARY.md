# yDance Architecture Overhaul – AI Agent Brief

Purpose: Make the system robust against AI mistakes, ensure forward-only progress, and preserve product principles.

## What changed (high-level)
- Added an append-only, versioned data pipeline with a canonical schema.
- Locked down write paths: UI is read-only; all event writes enter `raw_events`.
- Introduced feature flags to gate risky functionality.
- Added guardrails (contract, CODEOWNERS, stricter guidelines) to prevent architectural drift.
- Scaffolded a normalize+dedupe edge function to process raw posts safely and idempotently.

## Files added/updated
- README.md: Data pipeline, non‑negotiables, Nostr strategy, feature flags, Supabase table expectations.
- AI_DEVELOPMENT_GUIDELINES.md: Contracts & invariants, protected files, agent checklist, feature flags, review queue rules.
- contract.md: Product principles, acceptance criteria, governance.
- .github/CODEOWNERS: Protect schema, migrations, and contract changes.
- schema/event.schema.json: Canonical normalized event schema (strict, no additional props).
- fixtures/events/normalized_example.json: Valid normalized example.
- fixtures/events/raw_example.json: Raw kind‑1 style example.
- supabase/migrations/20251029_000001_core_tables.sql: Creates `raw_events`, `normalized_events`, `review_queue`, view `normalized_events_latest`, RLS + grants.
- supabase/README.md: How to apply migrations; read/write guidance.
- supabase/functions/normalize/index.ts: Edge function skeleton (normalize + dedupe, idempotent).
- supabase/functions/normalize/README.md: Deploy/invoke notes.
- script.js: Feature flags added; UI reads from `normalized_events_latest`; Nostr and sensitive writes gated.

## New invariants (do not break)
- Schema-first: All normalized events conform to `schema/event.schema.json`.
- Write path: relay/form → `raw_events` → normalize+dedupe → `normalized_events` → `normalized_events_latest`.
- Read-only UI: No direct writes to normalized tables or views.
- Idempotency: Jobs must be retry-safe (use `content_hash` guards).
- Dedupe key: `title + time_window + venue_radius + organizer_pubkey`.
- Review queue: Uncertain items require human decision before publishing.

## Feature flags (default OFF unless noted)
- `CONFIG.flags.nostrRealClient` (false): Use real Nostr client.
- `CONFIG.flags.writeToRawEvents` (false): Allow client to write raw events (keep off; server writes only).
- `CONFIG.flags.enableReviewQueue` (true): Show review indicators; route uncertain items.
- `CONFIG.flags.allowClientSensitiveWrites` (false): Prevent client from storing secrets.

## How to operate safely
1) Add ingestion sources only into `raw_events`.
2) Extend the normalize function adapters; keep them deterministic and schema-compliant.
3) Never mutate old normalized versions; write a new version instead.
4) Use flags to roll out risky changes gradually.
5) If touching schema/migrations/contract, update fixtures and get owner approval.

## Why these changes
- Prevents corruption and regressions from mixed agent edits.
- Enables transparent provenance, easy rollback, and future retro-signing.
- Keeps product focused: weekly scope, text-first, fast scanning.
