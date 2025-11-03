# Nostr Client Implementation - AI Agent Guide

**Last Updated**: October 29, 2025  
**Status**: Production Ready - Private Relay Active

## Overview

This document provides AI agents with complete information about the Nostr client implementation in the yDance event classified site. The system includes a private Nostr relay, frontend integration, and modular architecture for event processing.

## Current Architecture

### 1. Private Relay Infrastructure
- **Domain**: `relay.beginnersurfer.com`
- **WebSocket URL**: `wss://relay.beginnersurfer.com`
- **Local Port**: 8080 (Docker container)
- **Tunnel**: Cloudflare Tunnel (`nostr-relay`) - ACTIVE
- **Relay Software**: `nostr-rs-relay` (Rust-based) via Docker

### 2. Access Control
- **Whitelist Mode**: Only authorized pubkeys can write
- **Authorized Keys**:
  - `7234ba2fc6a0bdc00f962240d8b5f4d55b6b50cbd6a5130affa2e166887a86c4`
  - `21c2bfff0f63a4a6ea63f40b3c332abbc883e9f2237dcd6627307e34c40b33b3`
- **Permissions**: Read=true, Write=true (whitelist-restricted)

### 3. Configuration Files

#### `.env` (Production)
```
RELAY_DOMAIN=relay.beginnersurfer.com
RELAY_TUNNEL_NAME=nostr-relay
RELAY_PORT=8080
RELAY_WHITELIST_HEX=7234ba2fc6a0bdc00f962240d8b5f4d55b6b50cbd6a5130affa2e166887a86c4,21c2bfff0f63a4a6ea63f40b3c332abbc883e9f2237dcd6627307e34c40b33b3
```

#### `script.js` Configuration
```javascript
CONFIG = {
    nostrRelayUrl: 'wss://relay.beginnersurfer.com',
    flags: {
        nostrRealClient: true,  // ENABLED
        writeToRawEvents: false,
        enableReviewQueue: false,
        allowClientSensitiveWrites: false
    }
}
```

## Frontend Integration

### 1. Social Layer (`script.js`)
- **Location**: Lines 371-1576
- **Purpose**: Social content processing, Nostr integration, community intelligence
- **Key Methods**:
  - `init()`: Initialize Nostr client connection
  - `sendNostrMessage()`: Send messages to relay
  - `fetchEventsFromNostr()`: Query events from relay
  - `fetchProfilesFromNostr()`: Query profiles from relay

### 2. Nostr Modules (Lines 1572-2000+)

#### `nostrKeys` Module
- **Purpose**: Key generation and validation
- **Methods**:
  - `generateKeyPair()`: Generate Nostr keypairs
  - `encodePublicKey()`: Convert to npub format
  - `encodePrivateKey()`: Convert to nsec format
  - `validateKeyFormat()`: Validate key formats

#### `nostrClient` Module
- **Purpose**: WebSocket connection management
- **Methods**:
  - `connect(relayUrl)`: Connect to relay
  - `queryEvents(filter)`: Query events with filters
  - `queryProfiles(filter)`: Query profiles with filters

#### `nostrEventParser` Module
- **Purpose**: Parse Nostr events into site format
- **Methods**:
  - `parseEvent(nostrEvent)`: Convert Nostr event to site event
  - `parseProfile(nostrProfile)`: Convert Nostr profile to site profile

## Data Flow

### 1. Event Processing Pipeline
```
Nostr Event (Kind 1) → nostrClient.queryEvents() → nostrEventParser.parseEvent() → Site Event Format
```

### 2. Profile Processing Pipeline
```
Nostr Profile (Kind 0) → nostrClient.queryProfiles() → nostrEventParser.parseProfile() → Site Profile Format
```

### 3. Message Sending
```
User Input → social.sendNostrMessage() → nostrClient.publish() → Relay
```

## Current Status

### ✅ Active Components
- **Docker Container**: `nrr` running on port 8080
- **Cloudflare Tunnel**: `nostr-relay` tunnel active
- **DNS**: CNAME record pointing to tunnel
- **Website**: Serving from `/Users/601ere/yDance` on port 8000
- **Frontend Integration**: Connected to relay

### 🔧 Configuration Status
- **Feature Flags**: All set to safe defaults
- **Whitelist**: Two authorized pubkeys configured
- **Relay**: Private mode with access control
- **Tunnel**: Publicly accessible via domain

## Usage Patterns

### 1. Website Integration
- **URL**: `http://localhost:8000/?relay=wss://relay.beginnersurfer.com`
- **Social Tab**: Displays events and profiles from Nostr
- **Real-time**: Events stream in as they're posted

### 2. Direct Relay Access
- **WebSocket**: `wss://relay.beginnersurfer.com`
- **Clients**: Damus, Amethyst, Snort can connect
- **Restrictions**: Write access limited to whitelist

### 3. Development Mode
- **Local Relay**: `ws://localhost:8080`
- **Testing**: Use `CONFIG.flags.nostrRealClient = false` to disable

## Key Implementation Details

### 1. Event Types
- **Kind 1**: Text notes (event announcements)
- **Kind 0**: Profiles (DJs, venues, entities)
- **Parsing**: Custom parsers for event data extraction

### 2. Security Model
- **Private Relay**: No public write access
- **Whitelist**: Only authorized pubkeys can post
- **Encryption**: User keys encrypted in database
- **Feature Flags**: Safe rollout of functionality

### 3. Error Handling
- **Connection Failures**: Graceful fallback to placeholder data
- **Parse Errors**: Logged but don't break functionality
- **Network Issues**: Automatic retry mechanisms

## Maintenance Commands

### 1. Start Relay
```bash
./ops/run-relay.sh
```

### 2. Start Tunnel
```bash
./ops/run-tunnel.sh
```

### 3. Check Status
```bash
docker ps | grep nrr
ps aux | grep cloudflared
```

### 4. View Logs
```bash
docker logs nrr
```

## Troubleshooting

### 1. Connection Issues
- Check Docker container: `docker ps | grep nrr`
- Check tunnel: `ps aux | grep cloudflared`
- Verify DNS: `dig +short relay.beginnersurfer.com`

### 2. Frontend Issues
- Check feature flags in `CONFIG.flags`
- Verify relay URL in `CONFIG.nostrRelayUrl`
- Check browser console for errors

### 3. Relay Issues
- Check whitelist configuration
- Verify Docker container logs
- Test with Nostr client directly

## Future Enhancements

### 1. Planned Features
- Event deduplication
- Profile verification
- Content moderation
- Analytics dashboard

### 2. Integration Points
- Supabase event normalization
- Review queue for uncertain events
- Automated event parsing
- Community moderation tools

## AI Agent Guidelines

### 1. Safe Modifications
- ✅ Update feature flags
- ✅ Modify event parsing logic
- ✅ Add new query filters
- ✅ Enhance error handling

### 2. Protected Areas
- ❌ Don't modify whitelist without approval
- ❌ Don't change relay domain without DNS update
- ❌ Don't modify Docker configuration without testing
- ❌ Don't change tunnel settings without verification

### 3. Testing Requirements
- Always test with `CONFIG.flags.nostrRealClient = false` first
- Verify connection before enabling real client
- Check both local and tunnel access
- Validate event parsing with sample data

## Contact Information

- **Relay Domain**: relay.beginnersurfer.com
- **Local Development**: localhost:8080
- **Website**: localhost:8000
- **Configuration**: `.env` file
- **Documentation**: This file and `AI_DEVELOPMENT_GUIDELINES.md`

---

**Note**: This implementation is production-ready and actively serving the yDance event classified site. All components are operational and integrated.









