// Supabase Edge Function: normalize
// Purpose: Read new raw_events, normalize to canonical schema, compute dedupe_key, and write versioned rows to normalized_events.
// Idempotent: skips raws that already have a normalized row.
// Trigger: HTTP (manual or cron). Supports ?dry_run=true.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Types kept lightweight to avoid tight coupling. Use schema/event.schema.json as the source of truth.
interface NormalizedEvent {
  event_uid: string;
  version?: number;
  title: string;
  description?: string;
  styles: string[];
  vibe_tags?: string[];
  start: string; // ISO8601
  end: string;   // ISO8601
  timezone: string;
  city: string;
  venue: { name: string; address?: string; lat?: number; lon?: number };
  price?: { currency?: string; min?: number; max?: number };
  organizer?: { name?: string; pubkey?: string; contact?: string };
  links?: Array<{ type?: string; url: string }>;
  sources?: Array<{ type?: string; event_id?: string; relay?: string; received_at?: string }>;
  last_update?: string; // ISO8601
  quality_score?: number;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function requireEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

function computeDedupeKey(evt: NormalizedEvent): string {
  // title + date (day) + venue radius bucket + organizer pubkey
  const dateKey = evt.start.substring(0, 10);
  const venueKey = evt.venue?.name?.toLowerCase()?.trim() ?? "";
  const orgKey = evt.organizer?.pubkey ?? "";
  return [evt.title.toLowerCase().trim(), dateKey, venueKey, orgKey].join("|");
}

function ensureEventUid(evt: NormalizedEvent): string {
  // Default event_uid to a hash of the dedupe key for stability
  const key = computeDedupeKey(evt);
  const data = new TextEncoder().encode(key);
  const digest = crypto.subtle.digestSync?.("SHA-256", data) as ArrayBuffer | undefined;
  if (digest) {
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
    return `evt_${hex.substring(0, 24)}`;
  }
  // Fallback simple uid
  return `evt_${key.replace(/[^a-z0-9]+/gi, "_").slice(0, 32)}`;
}

function tryParseRaw(raw_json: any): Partial<NormalizedEvent> | null {
  // Minimal adapter: expect kind-1 content JSON with type "dance_event"
  try {
    if (typeof raw_json === "string") {
      // raw_json is already a stringified JSON body in some pipelines; try parse once
      raw_json = JSON.parse(raw_json);
    }
    let content: any = raw_json;
    if (raw_json?.content && typeof raw_json.content === "string") {
      content = JSON.parse(raw_json.content);
    }
    if (content?.type !== "dance_event") return null;
    const title = String(content.title || "").trim();
    const start = String(content.start || "").trim();
    const end = String(content.end || "").trim();
    const city = String(content.city || "").trim();
    const venueName = String(content.venue || "").trim();
    if (!title || !start || !end || !city || !venueName) return null;
    const venue = {
      name: venueName,
      lat: Array.isArray(content.coords) ? Number(content.coords[0]) : undefined,
      lon: Array.isArray(content.coords) ? Number(content.coords[1]) : undefined,
    };
    const styles = Array.isArray(content.styles) ? content.styles.map((s: any) => String(s)) : [];
    const links = Array.isArray(content.links) ? content.links.map((u: any) => ({ url: String(u) })) : [];
    const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const normalized: NormalizedEvent = {
      event_uid: "", // fill later
      title,
      styles: styles.length ? styles : ["unknown"],
      start,
      end,
      timezone: tz,
      city,
      venue,
      links,
      sources: [{ type: "nostr" }],
      last_update: new Date().toISOString(),
    };
    normalized.event_uid = ensureEventUid(normalized);
    return normalized;
  } catch (_) {
    return null;
  }
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Find raw_events without a normalized row (by left join on source_raw_id)
    const { data: raws, error: rawErr } = await supabase
      .from("raw_events")
      .select("id, raw_json, content_hash, pubkey, event_id, relay, received_at")
      .limit(50);

    if (rawErr) throw rawErr;

    const results: Array<{ raw_id: string; status: string; reason?: string }> = [];

    for (const raw of raws ?? []) {
      // Check if already processed
      const { data: existing, error: exErr } = await supabase
        .from("normalized_events")
        .select("id")
        .eq("source_raw_id", raw.id)
        .limit(1);
      if (exErr) throw exErr;
      if (existing && existing.length > 0) {
        results.push({ raw_id: raw.id, status: "skipped_already_normalized" });
        continue;
      }

      const normalized = tryParseRaw(raw.raw_json);
      if (!normalized) {
        results.push({ raw_id: raw.id, status: "skipped_unparseable", reason: "adapter returned null" });
        continue;
      }

      // Compute dedupe key
      const dedupe_key = computeDedupeKey(normalized as NormalizedEvent);

      if (dryRun) {
        results.push({ raw_id: raw.id, status: "dry_run_ok" });
        continue;
      }

      // Determine next version number for this event_uid
      const { data: versions, error: verErr } = await supabase
        .from("normalized_events")
        .select("version")
        .eq("event_uid", normalized.event_uid)
        .order("version", { ascending: false })
        .limit(1);
      if (verErr) throw verErr;
      const nextVersion = (versions?.[0]?.version || 0) + 1;

      const row = {
        event_uid: normalized.event_uid,
        version: nextVersion,
        normalized_json: normalized as Record<string, unknown>,
        dedupe_key,
        source_raw_id: raw.id,
      };

      const { error: insErr } = await supabase.from("normalized_events").insert(row);
      if (insErr) {
        results.push({ raw_id: raw.id, status: "error", reason: insErr.message });
        continue;
      }
      results.push({ raw_id: raw.id, status: "normalized" });
    }

    return jsonResponse({ ok: true, dryRun, processed: results.length, results });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
});









