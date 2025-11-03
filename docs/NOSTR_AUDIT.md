# Nostr Code Audit Results

**Date:** 2024-11-03  
**Purpose:** Complete audit of all Nostr-related code before isolation

## State References

### Current State Properties
- `state.nostrClient` (line 90) - Nostr WebSocket client connection
- `state.userKeys` (line 97) - Nostr keys (private/public/npub/nsec)
- `state.userAuth` (line 91) - Potentially mixed auth state
- `state.socialFeed` (line 92) - Messages fetched from Nostr

### Usage Count
- `state.nostrClient`: 6 direct references
- `state.userKeys`: 12 direct references
- `state.userAuth`: 1 reference (needs verification)
- `state.socialFeed`: 20+ references (but can be sourced from nostr)

## CONFIG References

### Current CONFIG Properties
- `CONFIG.nostrRelayUrl` (line 52) - Default relay endpoint
- `CONFIG.flags.nostrRealClient` (line 54) - Enable/disable nostr client
- `CONFIG.flags.nostrHealthCheck` (line 58) - Health check flag

### New Flags Needed
- `CONFIG.flags.nostrIsolated` - NEW: Enable isolated nostr module
- `CONFIG.flags.nostrDevTab` - NEW: Show NOSTR dev tab

## SOCIAL Layer Methods (Nostr-Dependent)

### Core Initialization
- `social.init()` (line 379) - Initializes nostr client
- `social.initNostrDataFetching()` (line 418) - Sets up nostr data fetching

### Authentication Methods (NOSTR-SPECIFIC)
- `social.signIn()` - Uses nostr keys for auth
- `social.signUp()` - Generates nostr keys
- `social.signUpLight()` - Light mode signup (Supabase only?)
- `social.recoverKeysWithRecoveryPhrase()` - Nostr key recovery

### Key Management (NOSTR-SPECIFIC)
- `social.generateNostrKeys()` - Generates nostr key pairs
- `social.encryptKeys()` - Encrypts nostr keys
- `social.decryptKeys()` - Decrypts nostr keys (if exists)

### Data Operations (NOSTR-DEPENDENT)
- `social.fetchSocialFeed()` (line 571) - Queries nostr for events
- `social.sendNostrMessage()` (line 548) - Publishes to nostr
- `social.queryNostrEvents()` (line 597) - Direct nostr event queries
- `social.queryNostrProfiles()` (line 700) - Direct nostr profile queries
- `social.fetchProfilesFromNostr()` (line 675) - Fetches profiles from nostr

### Message Processing (Can work without nostr)
- `social.processMessage()` - Parses messages (nostr-independent)
- `social.parseEventMessage()` - Message parsing (nostr-independent)
- `social.linkAttributes()` - Links to database (nostr-independent)

### External Module Dependencies
- `nostrClient` (global) - WebSocket client
- `nostrKeys` (global) - Key generation/encoding
- `keyEncryption` (global) - Encryption utilities
- `nostrEventParser` (global) - Event parsing

## Router Integration Points

### Auth Flows (CRITICAL - Needs Separation)
- `router.handleLogin()` (line 4804) - Calls `social.signIn()`
- `router.handleSignup()` (line 4835) - Calls `social.signUp()` or `social.signUpLight()`
- `router.handleAuthSubmit()` (line 4776) - Routes to login/signup

### USERS Tab (Nostr-Dependent)
- `router.switchTab('users')` (line 4286) - Calls `social.fetchSocialFeed()`
- `router.handleSendMessage()` (line 4373) - Uses `social.processMessage()` + nostr

### Refresh Button
- `router.refreshNostrData()` (line 4580) - Refreshes nostr feed

## API Layer References

### Health Check (Nostr-Specific)
- `api.healthCheck()` (line 141) - Tests nostr connection (should move to nostr module)

## VIEWS Layer References

### Social Feed Rendering
- `views.renderSocialFeed()` - Renders nostr messages
- `views.createSocialMessageCard()` - Creates message UI

### DJ Profile Integration
- `views.renderDJProfile()` - Can show social mentions from nostr
- Uses `social.getSocialMentionsForDJ()` - Queries nostr feed

## External Files Dependencies

### HTML
- `nostr-refresh-button` - Refresh nostr data button (line 42 index.html)

### Global Modules (External)
- Must check if these exist as separate files or inline:
  - `nostrClient` module
  - `nostrKeys` module
  - `keyEncryption` module
  - `nostrEventParser` module

## Migration Priorities

### HIGH PRIORITY (Core Functionality)
1. Auth separation (router.handleLogin/signup)
2. State migration (userKeys → nostr.keys)
3. Connection management (nostrClient → nostr.client)

### MEDIUM PRIORITY (Features)
1. Social feed (can have fallback)
2. Message sending (optional feature)

### LOW PRIORITY (Nice-to-Have)
1. Health checks
2. Dev tools
3. Testing utilities

## Risk Areas

### Critical Paths (Must Not Break)
- User authentication flows
- USERS tab display (needs graceful fallback)
- Message sending (should fail gracefully if nostr disabled)

### Breaking Change Risks
- State.userKeys access (12 references - needs careful migration)
- Auth flow changes (affects all users)
- Social feed dependency (USERS tab visibility)

## Next Steps

1. ✅ Complete audit (this document)
2. Add feature flags to CONFIG
3. Create state migration mapping
4. Begin Phase 2: Create nostr module skeleton

