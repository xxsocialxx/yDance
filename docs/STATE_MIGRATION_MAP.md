# State Migration Map: Nostr Isolation

## Purpose

This document maps the migration of Nostr-related state properties from the main state namespace to the isolated `state.nostr` namespace.

## Migration Rules

**When `CONFIG.flags.nostrIsolated = false` (Current/Backward Compatible):**
- Keep using old state properties
- No migration needed
- All existing code paths work

**When `CONFIG.flags.nostrIsolated = true` (New/Isolated):**
- Migrate to new namespace
- Update all references
- Old properties become deprecated but readable for migration

## State Property Mapping

### Direct Migrations

| Old Property | New Property (when isolated) | Type | Notes |
|--------------|------------------------------|------|-------|
| `state.nostrClient` | `state.nostr.client` | Object | Nostr WebSocket client |
| `state.userKeys` | `state.nostr.keys` | Object | {privateKey, publicKey, npub, nsec} |
| `state.userAuth` | `state.nostr.auth` | Object | Nostr-specific auth state |

### Conditional Migrations

| Property | Behavior | Notes |
|----------|----------|-------|
| `state.socialFeed` | Stays in main state | Populated from `state.nostr.feed` when using nostr |
| `state.currentUser` | Stays in main state | Supabase user, independent of nostr |
| `state.isAuthenticated` | Stays in main state | Can be true for Supabase OR nostr OR both |

### New Nostr Namespace Structure

```javascript
state.nostr = {
    client: null,           // Migrated from state.nostrClient
    keys: null,             // Migrated from state.userKeys
    auth: null,             // Migrated from state.userAuth (if nostr-specific)
    feed: [],              // NEW: Internal nostr feed (synced to state.socialFeed)
    connected: false,       // NEW: Connection status
    relay: null,           // NEW: Current relay URL
    lastSync: null         // NEW: Last sync timestamp
}
```

## Migration Strategy

### Automatic Migration on Init

```javascript
function migrateNostrState() {
    if (!CONFIG.flags.nostrIsolated) {
        return; // No migration needed
    }
    
    // Initialize nostr namespace if not exists
    if (!state.nostr) {
        state.nostr = {
            client: null,
            keys: null,
            auth: null,
            feed: [],
            connected: false,
            relay: null,
            lastSync: null
        };
    }
    
    // Migrate existing data
    if (state.nostrClient && !state.nostr.client) {
        state.nostr.client = state.nostrClient;
        state.nostrClient = null; // Clear after migration
    }
    
    if (state.userKeys && !state.nostr.keys) {
        state.nostr.keys = state.userKeys;
        // Keep old reference for backward compat during transition
        // state.userKeys = null; // Only after validation
    }
    
    if (state.userAuth && !state.nostr.auth) {
        // Only migrate if it's nostr-specific auth
        // (Need to verify what userAuth contains)
        state.nostr.auth = state.userAuth;
        // state.userAuth = null; // Only after validation
    }
}
```

### Accessor Functions (Safe Access Pattern)

```javascript
// Helper functions for safe access (works in both modes)
function getNostrClient() {
    if (CONFIG.flags.nostrIsolated) {
        return state.nostr?.client;
    }
    return state.nostrClient;
}

function getNostrKeys() {
    if (CONFIG.flags.nostrIsolated) {
        return state.nostr?.keys;
    }
    return state.userKeys;
}

function setNostrClient(client) {
    if (CONFIG.flags.nostrIsolated) {
        state.nostr.client = client;
    } else {
        state.nostrClient = client;
    }
}

function setNostrKeys(keys) {
    if (CONFIG.flags.nostrIsolated) {
        state.nostr.keys = keys;
    } else {
        state.userKeys = keys;
    }
}
```

## Migration Checklist

### Phase 2 (Implementation)
- [ ] Create `state.nostr` namespace structure
- [ ] Implement migration function
- [ ] Create accessor helper functions
- [ ] Update all direct state access to use helpers (or direct nostr namespace)

### Phase 3 (Testing)
- [ ] Test migration with existing user data
- [ ] Verify no data loss
- [ ] Test backward compatibility (flag = false)
- [ ] Test forward compatibility (flag = true)

### Phase 5 (Cleanup - After Validation)
- [ ] Remove `state.nostrClient` (after all references migrated)
- [ ] Remove `state.userKeys` (after all references migrated)
- [ ] Remove `state.userAuth` if nostr-specific (verify first)
- [ ] Remove accessor helpers if not needed
- [ ] Make `nostrIsolated = true` the default

## Reference Counts

From audit:
- `state.nostrClient`: 6 references
- `state.userKeys`: 12 references
- `state.userAuth`: 1 reference (verify if nostr-specific)

All references need to be updated to use new namespace or accessor functions when flag is enabled.

