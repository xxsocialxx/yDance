# Normalize Edge Function

Purpose: Read new `raw_events`, normalize to canonical schema, compute `dedupe_key`, and write a new version into `normalized_events`. Idempotent and safe to retry.

## Deploy
```
# From repository root
supabase functions deploy normalize --project-ref <your-project-ref>
```

## Invoke
```
# Dry run
supabase functions invoke normalize --query dry_run=true

# Live
supabase functions invoke normalize
```

## Behavior
- Skips raws that already have a `normalized_events.source_raw_id` row.
- Minimal adapter parses kind-1 style content with `{ "type": "dance_event", ... }`.
- Computes `event_uid` (stable) and `dedupe_key` from title/date/venue/pubkey.
- Increments `version` per `event_uid`.

## Next
- Replace `tryParseRaw` with full schema validation against `schema/event.schema.json`.
- Add review queue integration for low-confidence cases.
- Extend adapters to handle form/import sources.









