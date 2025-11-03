# Nostr Module API Reference

**Module:** `nostr` (isolated)  
**Available:** When `CONFIG.flags.nostrIsolated = true`

## Overview

The `nostr` module provides isolated Nostr functionality, completely separated from the main application. It can be tested and developed independently.

## Access

```javascript
// Global access (dev hook)
window.nostr

// Or use directly if module is loaded
nostr.init()
```

## Initialization

### `async init()`
Initialize the nostr module. Called automatically by SOCIAL layer when `nostrIsolated = true`.

```javascript
await nostr.init();
```

**Returns:** `boolean` - Success status

## Connection Management

### `async connect(relayUrl = CONFIG.nostrRelayUrl)`
Connect to a Nostr relay.

```javascript
const client = await nostr.connect('wss://relay.example.com');
```

**Returns:** Client object

### `async disconnect()`
Disconnect from the current relay.

```javascript
await nostr.disconnect();
```

### `async healthCheck(relayUrl = CONFIG.nostrRelayUrl)`
Test relay connectivity.

```javascript
const result = await nostr.healthCheck();
// { ok: true, relay: 'wss://...', reused: false }
```

**Returns:** Status object with `ok`, `relay`, `error`

## Key Management

### `async generateKeys()`
Generate a new Nostr key pair.

```javascript
const keys = await nostr.generateKeys();
// {
//   publicKey: '...',
//   privateKey: '...',
//   npub: 'npub1...',
//   nsec: 'nsec1...'
// }
```

**Returns:** Key object

### `async encryptKeys(keys, password)`
Encrypt keys with password.

```javascript
const encrypted = await nostr.encryptKeys(keys, 'mypassword');
```

**Returns:** Encrypted string

### `async decryptKeys(encrypted, password)`
Decrypt keys with password.

```javascript
const keys = await nostr.decryptKeys(encrypted, 'mypassword');
```

**Returns:** Key object

### `validateKeyFormat(key)`
Validate key format.

```javascript
const isValid = nostr.validateKeyFormat(publicKey);
```

**Returns:** `boolean`

### `generateRecoveryPhrase()`
Generate recovery phrase for key backup.

```javascript
const phrase = nostr.generateRecoveryPhrase();
```

**Returns:** Recovery phrase string

### `validateRecoveryPhrase(phrase)`
Validate recovery phrase format.

```javascript
const isValid = nostr.validateRecoveryPhrase(phrase);
```

**Returns:** `boolean`

## Authentication

**Note:** Nostr auth is separate from main app auth (Supabase).

### `async signUp(email, password)`
Sign up with Nostr keys (Nostr-specific, not main app).

```javascript
const result = await nostr.signUp('user@example.com', 'password');
```

**Returns:** `{ success: true, keys: {...}, recoveryPhrase: '...' }`

### `async signUpLight(email, password)`
Light mode signup (minimal setup).

### `async signIn(email, password)`
Sign in (Nostr-specific).

**Status:** Not yet implemented (TODO)

### `async recoverKeysWithRecoveryPhrase(email, phrase, password)`
Recover keys using recovery phrase.

**Status:** Not yet implemented (TODO)

## Data Operations

### `async fetchFeed(filter = {...})`
Fetch social feed from Nostr.

```javascript
const feed = await nostr.fetchFeed({
    kinds: [1],
    '#t': ['ydance', 'event'],
    limit: 100
});
```

**Returns:** Array of parsed events

### `async sendMessage(content, keys = null)`
Send a message to Nostr.

```javascript
const result = await nostr.sendMessage('Hello from yDance!');
// { success: true, messageId: '...' }
```

**Returns:** Result object

### `async queryEvents(filter)`
Query Nostr events directly.

```javascript
const events = await nostr.queryEvents({
    kinds: [1],
    limit: 10
});
```

**Returns:** Array of raw Nostr events

### `async queryProfiles(filter = {...})`
Query Nostr profiles.

```javascript
const profiles = await nostr.queryProfiles({
    kinds: [0],
    '#t': ['ydance'],
    limit: 50
});
```

**Returns:** Array of profile events

### `async fetchProfiles()`
Fetch and parse profiles.

```javascript
const profiles = await nostr.fetchProfiles();
```

**Returns:** Array of parsed profiles

## Event Parsing

### `parseEvent(nostrEvent)`
Parse a Nostr event.

```javascript
const parsed = nostr.parseEvent(nostrEvent);
```

**Returns:** Parsed event object

### `parseProfile(nostrProfile)`
Parse a Nostr profile event.

```javascript
const profile = nostr.parseProfile(nostrProfile);
```

**Returns:** Profile object

## Dev Tools

### `async testConnection()`
Test relay connection.

```javascript
const result = await nostr.testConnection();
```

### `async testKeyGeneration()`
Test key generation.

```javascript
const result = await nostr.testKeyGeneration();
// {
//   success: true,
//   keys: {...},
//   validation: { publicKey: true, privateKey: true }
// }
```

### `async testEncryption()`
Test encryption/decryption round-trip.

```javascript
const result = await nostr.testEncryption();
// { success: true, keys: {...}, encrypted: '...', decrypted: {...} }
```

### `getStatus()`
Get current nostr module status.

```javascript
const status = nostr.getStatus();
// {
//   connected: false,
//   relay: 'wss://...',
//   hasKeys: true,
//   feedCount: 5,
//   lastSync: '2024-11-03T...'
// }
```

**Returns:** Status object

## State Access

When `nostrIsolated = true`, use these accessor functions:

```javascript
// Get client
const client = getNostrClient();  // Returns state.nostr.client

// Get keys
const keys = getNostrKeys();  // Returns state.nostr.keys

// Set client
setNostrClient(client);

// Set keys
setNostrKeys(keys);
```

## Placeholder Data

### `getPlaceholderFeed()`
Returns placeholder feed data for testing.

### `getPlaceholderNostrEvents()`
Returns placeholder Nostr events.

### `getPlaceholderNostrProfiles()`
Returns placeholder Nostr profiles.

## Error Handling

All async methods throw errors on failure. Wrap in try/catch:

```javascript
try {
    const keys = await nostr.generateKeys();
} catch (error) {
    console.error('Failed to generate keys:', error);
}
```

## Status Indicators

Check module availability:

```javascript
if (window.nostr && CONFIG.flags.nostrIsolated) {
    // Nostr module available
    const status = nostr.getStatus();
}
```

---

**See Also:**
- `docs/NOSTR_ISOLATION_PLAN.md` - Implementation plan
- `docs/STATE_MIGRATION_MAP.md` - State migration guide

