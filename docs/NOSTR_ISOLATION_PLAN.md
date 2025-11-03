# Nostr Isolation Implementation Plan

## Executive Summary

This document outlines the phased approach to isolate Nostr functionality from the main application, enabling independent testing and easier future integration.

**Goals:**
- Isolate all Nostr-related code into dedicated module
- Separate Nostr auth from main app auth
- Enable testing Nostr independently
- Maintain easy merger path for future integration
- Zero breaking changes for existing users (via feature flags)

---

## Phase 1: Preparation & Audit

### 1.1 Code Audit

**Task: Identify all Nostr references**

**State References:**
- `state.nostrClient` - Nostr connection client
- `state.userKeys` - Nostr keys (private/public/npub/nsec)
- `state.userAuth` - Potentially mixed auth
- `state.socialFeed` - Messages from Nostr

**CONFIG References:**
- `CONFIG.nostrRelayUrl` - Relay endpoint
- `CONFIG.flags.nostrRealClient` - Enable/disable flag

**SOCIAL Layer Methods (Nostr-dependent):**
- `social.init()` - Initializes nostr client
- `social.signIn()` - Uses nostr keys
- `social.signUp()` / `social.signUpLight()` - Generates nostr keys
- `social.recoverKeysWithRecoveryPhrase()` - Nostr key recovery
- `social.fetchSocialFeed()` - Queries nostr
- `social.sendNostrMessage()` - Publishes to nostr
- `social.queryNostrEvents()` - Direct nostr queries
- `social.fetchProfilesFromNostr()` - Nostr profile queries
- `social.generateNostrKeys()` - Key generation
- `social.encryptKeys()` - Key encryption

**External Dependencies:**
- `nostrClient` module (global)
- `nostrKeys` module (global)
- `keyEncryption` module (global)
- `nostrEventParser` module (global)

**Integration Points:**
- Router auth handlers: `router.handleLogin()`, `router.handleSignup()`
- USERS tab: `router.switchTab('users')` → calls `social.fetchSocialFeed()`
- Message handling: `router.handleSendMessage()` → uses `social.processMessage()`

### 1.2 Feature Flag Setup

**Add to CONFIG:**
```javascript
flags: {
    nostrIsolated: false,  // NEW: Enable isolated nostr module
    nostrRealClient: false, // Existing
    // ... other flags
}
```

### 1.3 Migration Planning

**Existing User Data:**
- Users with `state.userKeys` stored → migrate to `state.nostr.keys`
- Users with encrypted keys in Supabase → read/write via new path
- No data loss - preserve all existing keys

**State Migration Map:**
```
OLD → NEW (when nostrIsolated = true)
state.nostrClient → state.nostr.client
state.userKeys → state.nostr.keys
state.userAuth → state.nostr.auth (if nostr-specific)
state.socialFeed → state.socialFeed (stays, but sourced from state.nostr.feed)
```

---

## Phase 2: Isolation Implementation

### 2.1 Create NOSTR Module Structure

**New Module: `nostr`**
```javascript
const nostr = {
    // Connection Management
    async init(),
    async connect(relayUrl),
    async disconnect(),
    async healthCheck(),
    
    // Key Management (ISOLATED - no main app dependency)
    generateKeys(),
    encryptKeys(keys, password),
    decryptKeys(encrypted, password),
    validateKeyFormat(key),
    generateRecoveryPhrase(),
    validateRecoveryPhrase(phrase),
    
    // Authentication (Nostr-only, separate from main auth)
    async signIn(email, password),
    async signUp(email, password, recoveryPhrase),
    async signUpLight(email, password),
    async recoverKeysWithRecoveryPhrase(email, phrase, password),
    
    // Data Operations
    async fetchFeed(filter),
    async sendMessage(content, keys),
    async queryEvents(filter),
    async queryProfiles(filter),
    async fetchProfiles(),
    
    // Event Parsing
    parseEvent(nostrEvent),
    parseProfile(nostrEvent),
    
    // Dev Tools
    testConnection(),
    testKeyGeneration(),
    testEncryption(),
}
```

**State Structure (when `nostrIsolated = true`):**
```javascript
state = {
    // ... existing main app state ...
    
    nostr: {
        client: null,
        keys: null,
        auth: null,
        feed: [],
        connected: false,
        relay: null
    },
    
    // Social abstraction layer (can source from nostr OR other)
    socialFeed: [] // Populated from state.nostr.feed when using nostr
}
```

### 2.2 Refactor SOCIAL Layer

**SOCIAL becomes abstraction layer:**

```javascript
const social = {
    async init() {
        if (CONFIG.flags.nostrIsolated) {
            // NEW: Use isolated nostr module
            await nostr.init();
            // Populate socialFeed from nostr.feed
            state.socialFeed = state.nostr.feed;
        } else {
            // OLD: Direct nostr integration (backward compatible)
            // ... existing code ...
        }
    },
    
    async fetchSocialFeed() {
        if (CONFIG.flags.nostrIsolated) {
            const feed = await nostr.fetchFeed();
            state.socialFeed = feed;
            state.nostr.feed = feed; // Sync
            return feed;
        } else {
            // OLD: Direct nostr query
            // ... existing code ...
        }
    },
    
    // Similar pattern for other methods
}
```

### 2.3 Separate Auth Completely

**Create/maintain separate auth:**
- Main app auth: Supabase only (independent)
- Nostr auth: Isolated in `nostr` module
- No coupling between them

**Router changes:**
```javascript
// Auth can use either (or both)
async handleLogin(email, password) {
    // Main app auth (always available)
    const supabaseAuth = await supabase.auth.signIn(...);
    
    // Nostr auth (optional, only if nostrIsolated && user has nostr keys)
    if (CONFIG.flags.nostrIsolated && userHasNostrKeys) {
        const nostrAuth = await nostr.signIn(email, password);
    }
}
```

---

## Phase 3: Testing & Validation

### 3.1 Test Matrix

**Scenario 1: nostrIsolated = false (Current Behavior)**
- ✅ All existing functionality works
- ✅ No breaking changes
- ✅ Users with existing keys continue to work

**Scenario 2: nostrIsolated = true (New Behavior)**
- ✅ Nostr module works independently
- ✅ Social layer sources from nostr
- ✅ USERS tab works (can show placeholder if nostr disabled)
- ✅ Auth flows separate

**Scenario 3: Nostr Disabled (nostrRealClient = false)**
- ✅ App works without nostr
- ✅ USERS tab shows placeholder/empty state
- ✅ No errors or broken references

### 3.2 Migration Script

**For existing users with nostr keys:**
```javascript
async function migrateUserToIsolatedNostr() {
    if (state.userKeys && CONFIG.flags.nostrIsolated) {
        // Migrate keys to new location
        state.nostr.keys = state.userKeys;
        // Clear old location after migration
        state.userKeys = null;
        // Update any stored keys in Supabase user metadata
        await updateUserMetadata(state.nostr.keys);
    }
}
```

---

## Phase 4: NOSTR Dev Tab

### 4.1 Tab Structure

**HTML:**
```html
<button class="tab-button" data-tab="nostr" id="tab-nostr">
    <span class="tab-label">NOSTR</span>
</button>

<div class="nostr-view" id="nostr-view" style="display: none;">
    <div class="view-header">
        <h2>NOSTR Development Tools</h2>
    </div>
    
    <!-- Connection Status -->
    <div class="nostr-status">
        <div>Status: <span id="nostr-connection-status">Disconnected</span></div>
        <div>Relay: <span id="nostr-relay-url">-</span></div>
    </div>
    
    <!-- Key Management -->
    <div class="nostr-keys-section">
        <h3>Key Management</h3>
        <button onclick="nostr.generateKeys()">Generate New Keys</button>
        <button onclick="nostr.testKeyGeneration()">Test Key Gen</button>
        <div id="nostr-keys-display"></div>
    </div>
    
    <!-- Connection Tools -->
    <div class="nostr-connection-section">
        <h3>Connection</h3>
        <input type="text" id="nostr-relay-input" placeholder="wss://relay.example.com">
        <button onclick="nostr.connect()">Connect</button>
        <button onclick="nostr.disconnect()">Disconnect</button>
        <button onclick="nostr.healthCheck()">Health Check</button>
    </div>
    
    <!-- Query Tools -->
    <div class="nostr-query-section">
        <h3>Query Tools</h3>
        <button onclick="nostr.testQueryEvents()">Query Events</button>
        <button onclick="nostr.testQueryProfiles()">Query Profiles</button>
        <div id="nostr-query-results"></div>
    </div>
    
    <!-- Admin Features (future) -->
    <div class="nostr-admin-section">
        <h3>Admin Tools</h3>
        <p>Future: Event moderation, user management, etc.</p>
    </div>
</div>
```

**Visibility Control:**
- Show tab only if `CONFIG.flags.nostrDevTab === true` (new flag)
- Or show in dev mode: `CONFIG.flags.debug === true`
- Default: hidden in production

---

## Phase 5: Cleanup (Post-Validation)

### 5.1 Remove Deprecated Code

**After validation period:**
- Remove `state.userKeys` (migrated to `state.nostr.keys`)
- Remove direct nostr calls from SOCIAL layer
- Remove feature flag `nostrIsolated` (new behavior becomes default)

### 5.2 Documentation Updates

**Update:**
- README.md - Document new architecture
- AI_DEVELOPMENT_GUIDELINES.md - New module structure
- Create NOSTR_MODULE.md - Nostr module documentation

---

## Implementation Checklist

### Phase 1: Preparation
- [ ] Complete code audit (all nostr references documented)
- [ ] Add `CONFIG.flags.nostrIsolated = false`
- [ ] Add `CONFIG.flags.nostrDevTab = true` (dev only)
- [ ] Document state migration plan
- [ ] Create migration script skeleton

### Phase 2: Isolation
- [ ] Create `nostr` module with all isolated functions
- [ ] Create `state.nostr` namespace
- [ ] Refactor SOCIAL to use nostr module (behind flag)
- [ ] Separate auth flows completely
- [ ] Update router to handle both auth types
- [ ] Test backward compatibility (`nostrIsolated = false`)

### Phase 3: Testing
- [ ] Test with `nostrIsolated = false` (current behavior)
- [ ] Test with `nostrIsolated = true` (new behavior)
- [ ] Test USERS tab without nostr (fallback)
- [ ] Test auth separation (Supabase independent of nostr)
- [ ] Migration script for existing users
- [ ] Verify no data loss

### Phase 4: Dev Tab
- [ ] Create NOSTR tab HTML
- [ ] Implement nostr dev tools UI
- [ ] Add router case for 'nostr' tab
- [ ] Wire up all nostr module functions
- [ ] Test dev tab functionality
- [ ] Control visibility via flags

### Phase 5: Validation & Cleanup
- [ ] Run in production with flag off (backward compat)
- [ ] Enable flag for testing group
- [ ] Monitor for issues
- [ ] Remove deprecated code after validation period
- [ ] Update all documentation
- [ ] Remove feature flag (new behavior default)

---

## Risk Mitigation

**Reversibility:**
- Feature flag allows instant rollback
- Old code path preserved until validation complete
- State migration reversible

**Breaking Changes:**
- None - all changes behind feature flag
- Existing users continue working
- Gradual migration possible

**Testing:**
- Comprehensive test matrix
- Both paths tested before merge
- Migration script tested with sample data

---

## Success Criteria

✅ Nostr code completely isolated in `nostr` module  
✅ Main app works without nostr (graceful degradation)  
✅ USERS tab works without nostr (placeholder/empty state)  
✅ Auth completely separated  
✅ NOSTR dev tab functional  
✅ No breaking changes for existing users  
✅ Easy merger path preserved  
✅ Documentation updated  

---

## Timeline Estimate

- **Phase 1:** 1-2 hours (audit + planning)
- **Phase 2:** 4-6 hours (implementation)
- **Phase 3:** 2-3 hours (testing)
- **Phase 4:** 2-3 hours (dev tab)
- **Phase 5:** 1 hour (cleanup, after validation)

**Total:** ~10-15 hours of focused work

---

## Notes

- Keep feature flags active until full validation
- Maintain backward compatibility throughout
- Test thoroughly before enabling flag in production
- Document all changes for future reference

