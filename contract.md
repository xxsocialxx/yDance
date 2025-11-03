# yDance Product Contract (Non‑Negotiables)

This document defines the core principles and acceptance criteria that protect yDance’s minimal, trustworthy experience. Changes that conflict with this contract must be rejected or the contract must be revised first.

## Principles
- Scope: Show this week/weekend only, text-first. No images in the listing view.
- Focus: Fast scanning, zero clutter, minimal clicks to decide.
- Trust: Accurate, deduped, and clearly updated; provenance is preserved.
- Open path: Private relay today, portable and signable tomorrow.

## Data pipeline (must)
- All event writes flow: relay/form → raw_events (append-only) → normalize+dedupe → normalized_events (versioned) → normalized_events_latest (view).
- UI is read-only from `normalized_events_latest`. No direct writes from the browser to normalized tables or views.
- Idempotent processing keyed by `content_hash`. Retries are always safe.
- Dedupe uses `title + time_window + venue_radius + organizer_pubkey`.
- Uncertain or low-confidence items go to `review_queue` for human approval.

## Schema & validation
- Canonical schema lives at `schema/event.schema.json` and is the single source of truth.
- Any incoming data must validate against the schema before normalization.
- Versioning is append-only; past normalized versions are never mutated.

## Security & privacy
- Never store service-role keys client-side. The browser may use only publishable keys.
- Sensitive writes (keys, recovery phrases) go through server/edge functions with RLS.
- Rate limits and basic reputation per pubkey; sort with reputation, do not hard-gate access without cause.

## Feature flags
- New or risky behavior is gated behind `CONFIG.flags` and defaults OFF.
- Roll forward only; flags are flipped deliberately with a brief note (what, default, rollback plan).

## Acceptance criteria for changes
A change is acceptable only if all apply:
1. It keeps module boundaries (CONFIG/STATE/API/SOCIAL/VIEWS/ROUTER/INIT).
2. It preserves the write path (UI → none, writes → raw_events only).
3. It passes schema validation (fixtures updated if schema changes).
4. It is idempotent (content_hash guard) and keeps dedupe stable or explicitly improved.
5. It is behind a feature flag if user-facing risk exists.
6. It does not introduce images into the listing view or expand scope beyond this week/weekend.

## Governance
- Protected files: `schema/event.schema.json`, `supabase/migrations/**`, `contract.md`.
- PRs touching protected files require explicit approval and updated fixtures.

---
Built to stay small, clear, and trustworthy.









