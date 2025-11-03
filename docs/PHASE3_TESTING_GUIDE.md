# Phase 3 Testing Guide

**Date:** 2024-11-03  
**Purpose:** Manual and automated testing validation for nostr isolation

## Testing Overview

Phase 3 validates that:
1. **Backward Compatibility**: App works exactly as before with `nostrIsolated = false`
2. **New Isolation**: App works correctly with `nostrIsolated = true`
3. **Migration**: State migration works for existing users

## Automated Tests

### Test 1: Structure Validation
Run: `node scripts/test_nostr_isolation.js`

**What it checks:**
- Feature flags exist with safe defaults
- State namespace structure correct
- Migration helper exists
- Safe accessor functions implemented
- Nostr module structure complete
- SOCIAL layer refactoring done
- Backward compatibility preserved

**Expected Result:** All structural checks pass

---

## Manual Browser Testing

### Scenario 1: Backward Compatibility (nostrIsolated = false)

**Setup:**
1. Open browser console
2. Verify `CONFIG.flags.nostrIsolated === false`
3. Load the app

**Tests:**

#### 1.1 App Initialization
- [ ] App loads without errors
- [ ] Console shows "Social layer initialized" (not "Nostr module initialized")
- [ ] No errors related to nostr module
- [ ] All tabs functional (Events, DJs, Operators, Users)

#### 1.2 Legacy State Access
- [ ] `state.nostrClient` exists (can be null)
- [ ] `state.userKeys` accessible (can be null)
- [ ] `state.socialFeed` works
- [ ] No references to `state.nostr` namespace

#### 1.3 Social Layer Functionality
- [ ] USERS tab loads (may show placeholder if nostr disabled)
- [ ] Message sending works (if implemented)
- [ ] Feed fetching works (may return placeholders)

#### 1.4 Auth Flow
- [ ] Sign up works (creates Supabase user + nostr keys via legacy path)
- [ ] Sign in works (recovers keys via legacy path)
- [ ] Keys stored correctly (check localStorage or database)

**Expected:** Everything works exactly as before Phase 2

---

### Scenario 2: Isolated Mode (nostrIsolated = true)

**Setup:**
1. Open browser console
2. Set `CONFIG.flags.nostrIsolated = true`
3. Reload the app

**Tests:**

#### 2.1 App Initialization
- [ ] App loads without errors
- [ ] Console shows "Initializing isolated Nostr module..."
- [ ] Console shows "Social layer initialized with isolated Nostr module"
- [ ] Migration helper runs (check console for "Nostr state migrated")
- [ ] All tabs functional

#### 2.2 Isolated State Access
- [ ] `state.nostr` namespace exists
- [ ] `state.nostr.client` accessible
- [ ] `state.nostr.keys` accessible
- [ ] `state.nostr.feed` accessible
- [ ] Legacy `state.nostrClient` still readable (for migration)

#### 2.3 Nostr Module Functionality
- [ ] `window.nostr` object exists (dev hook)
- [ ] `nostr.getStatus()` returns status object
- [ ] `nostr.testKeyGeneration()` works
- [ ] `nostr.testConnection()` works (if relay available)

#### 2.4 Social Layer Delegation
- [ ] USERS tab loads (feeds from nostr module)
- [ ] `social.fetchSocialFeed()` delegates to `nostr.fetchFeed()`
- [ ] Feed synced to both `state.nostr.feed` and `state.socialFeed`

#### 2.5 Auth Flow (Isolated)
- [ ] Sign up works (Supabase auth + nostr keys via nostr module)
- [ ] Keys stored in `state.nostr.keys`
- [ ] Sign in works (recovers keys via nostr module)
- [ ] Keys accessible via `getNostrKeys()` helper

#### 2.6 Accessor Functions
- [ ] `getNostrClient()` returns `state.nostr.client` (not `state.nostrClient`)
- [ ] `getNostrKeys()` returns `state.nostr.keys` (not `state.userKeys`)
- [ ] `setNostrClient()` updates `state.nostr.client`
- [ ] `setNostrKeys()` updates `state.nostr.keys`

**Expected:** App works with isolated nostr module, all state in new namespace

---

### Scenario 3: Migration Testing

**Setup:**
1. Start with `nostrIsolated = false`
2. Create a test user (with nostr keys)
3. Set `nostrIsolated = true`
4. Reload app

**Tests:**

#### 3.1 State Migration
- [ ] Migration helper runs on init
- [ ] `state.userKeys` copied to `state.nostr.keys`
- [ ] `state.nostrClient` copied to `state.nostr.client`
- [ ] Legacy state still readable (for backward compat)
- [ ] No data loss

#### 3.2 Accessor Functions During Migration
- [ ] `getNostrKeys()` returns migrated keys from `state.nostr.keys`
- [ ] `getNostrClient()` returns migrated client from `state.nostr.client`
- [ ] App continues to work with migrated state

**Expected:** Seamless migration, no data loss, app functional

---

### Scenario 4: Feature Flag Toggle

**Test:** Toggle flag and verify behavior changes

1. Start with `nostrIsolated = false`, test app
2. Set `nostrIsolated = true`, reload, test app
3. Set `nostrIsolated = false`, reload, test app

**Expected:** App works correctly in both modes, no errors when toggling

---

## Edge Cases

### E1: Nostr Disabled (nostrRealClient = false)
- [ ] App works without nostr client
- [ ] Placeholder data shown
- [ ] No errors thrown

### E2: No Nostr Keys
- [ ] App works without nostr keys
- [ ] Auth still works (Supabase only)
- [ ] Social features degrade gracefully

### E3: Migration with Empty State
- [ ] Migration handles null/undefined gracefully
- [ ] No errors when migrating empty state
- [ ] State initialized correctly

---

## Test Checklist Summary

### Phase 3.1: Backward Compatibility
- [ ] All Scenario 1 tests pass
- [ ] No regressions from Phase 2
- [ ] Legacy code paths work

### Phase 3.2: Isolated Mode
- [ ] All Scenario 2 tests pass
- [ ] Nostr module functional
- [ ] SOCIAL layer delegates correctly

### Phase 3.3: Migration
- [ ] All Scenario 3 tests pass
- [ ] State migration seamless
- [ ] No data loss

---

## Known Issues / Limitations

### Current Limitations
- Full nostr auth separation deferred to Phase 3 validation
- Some nostr module methods marked as TODO (future work)
- Migration keeps legacy state for backward compat (cleanup in Phase 5)

### Expected Behaviors
- `nostr.signIn()` throws error (not yet implemented - expected)
- `nostr.recoverKeysWithRecoveryPhrase()` throws error (not yet implemented - expected)
- These are nostr-specific auth flows (separate from main app auth)

---

## Success Criteria

✅ **Phase 3 Complete When:**
1. All automated structure tests pass
2. All manual browser tests pass (Scenarios 1-3)
3. No breaking changes introduced
4. Migration works for existing users
5. Feature flag toggle works correctly

---

## Next Steps After Phase 3

- **Phase 4:** Create NOSTR dev tab
- **Phase 5:** Remove deprecated code, make isolation default

---

## Testing Log Template

```
Date: YYYY-MM-DD
Tester: [Name]
Browser: [Chrome/Firefox/etc]
Version: [Version]

Phase 3.1 (Backward Compat):
- [ ] Pass / [ ] Fail - [Notes]

Phase 3.2 (Isolated Mode):
- [ ] Pass / [ ] Fail - [Notes]

Phase 3.3 (Migration):
- [ ] Pass / [ ] Fail - [Notes]

Issues Found:
- [List any issues]

Overall Status: [ ] Ready for Phase 4 / [ ] Needs Fixes
```

