# yDance Events

Electronic music event discovery platform with equal-value tabs for Events, DJs, Venues, Sound Systems, and Friends - a Progressive Web App built with vanilla JavaScript and Supabase.

## 🚨 For AI Agents

**BEFORE MAKING ANY CHANGES**, read: [`AI_DEVELOPMENT_GUIDELINES.md`](./AI_DEVELOPMENT_GUIDELINES.md)

**CRITICAL RULE**: Every change must be committed immediately after completion.

## 🏗️ Architecture

**7-layer modular architecture** for safe incremental updates:

```
CONFIG → STATE → API → SOCIAL → VIEWS → ROUTER → INIT
```

**Layer Responsibilities:**
- **CONFIG**: App settings, constants (add new config only)
- **STATE**: Single source of truth (add new properties only)
- **API**: Database/network calls (add methods following templates)
- **SOCIAL**: Social processing, nostr integration (add social methods only)
- **VIEWS**: HTML rendering, DOM manipulation (add rendering functions only)
- **ROUTER**: Navigation, event handling (add routes only)
- **INIT**: Application startup (DO NOT MODIFY)

**Safe Operations:**
- ✅ Add new properties to existing objects
- ✅ Add new methods following established templates
- ✅ Add new views using existing patterns
- ✅ Add new CSS classes without modifying existing ones
- ✅ Add new HTML elements without touching existing structure

**Forbidden Operations:**
- ❌ Modify existing method signatures
- ❌ Change CSS class names or HTML IDs
- ❌ Alter state property names
- ❌ Add functions outside designated modules

## 🚀 Quick Start

```bash
npm install                    # Optional: linting dependencies
python3 -m http.server 8000   # Start dev server
# Open: http://localhost:8000
```

## 📊 Current Status

### ✅ Completed Features
- **All 6 Tabs**: Events, DJs, Venues, Sound Systems, Friends, Social
- **Authentication**: Complete Supabase auth with login/signup/logout UI
- **Event Details**: Full-page event details matching DJ profile experience
- **Social Features**: Message posting, DJ/venue mentions, social feed
- **Architecture**: 7-layer modular structure with architectural compliance
- **Mobile UI**: Touch-optimized responsive design

### 🔧 Nostr Integration Status
- **Foundation**: SOCIAL layer ready for Nostr integration
- **Auth System**: Nostr key generation placeholders implemented
- **Message Processing**: Social feed infrastructure ready for Nostr messages
- **UI Components**: Social tab and auth UI ready for real Nostr data
- **Current State**: Placeholder implementation ready for real Nostr client

## 🎯 Next Priority: Nostr Integration

### Phase 1: Core Nostr Client (CRITICAL - 1-2 days)

**Add Nostr Library:**
```bash
npm install nostr-tools
```

**Replace Placeholders:**

1. **Nostr Client** (`script.js` line ~377):
```javascript
// Replace placeholder:
state.nostrClient = { connected: false, relay: 'wss://localhost:8080' };

// With real client:
import { Relay } from 'nostr-tools'
state.nostrClient = new Relay('wss://relay.damus.io')
await state.nostrClient.connect()
```

2. **Key Generation** (`script.js` line ~676):
```javascript
// Replace placeholder:
const keys = { publicKey: 'npub1' + Math.random()..., privateKey: 'nsec1' + Math.random()... };

// With real generation:
import { generatePrivateKey, getPublicKey } from 'nostr-tools'
const privateKey = generatePrivateKey()
const publicKey = getPublicKey(privateKey)
```

3. **Message Publishing** (`script.js` line ~496):
```javascript
// Replace placeholder:
console.log('Nostr message would be sent:', content);

// With real publishing:
const event = { kind: 1, content: content, tags: [], created_at: Math.floor(Date.now() / 1000) }
await state.nostrClient.publish(event)
```

### Phase 2: Social Feed Integration (2-3 days)
- Implement real feed fetching from Nostr relays
- Replace placeholder social feed with actual Nostr events
- Add event filtering for yDance-specific content

### Phase 3: yDance Event Types (3-4 days)
- Define custom event kinds for DJ profiles, venue info, event announcements
- Implement event schemas for structured data
- Add verification system for DJ/venue identities

## 🔧 Key Implementation Files

**Critical Files to Modify:**
- `script.js` lines ~377, ~496, ~676: Replace Nostr placeholders
- `package.json`: Add Nostr library dependency
- `social.init()`: Implement real Nostr client connection
- `social.sendNostrMessage()`: Implement real event publishing
- `social.fetchSocialFeed()`: Implement real feed fetching

**Relay Strategy:**
- Start with: `wss://relay.damus.io`, `wss://nostr.wine`
- Consider private relay for yDance community
- Implement relay rotation for reliability

## 🎯 Success Metrics

- ✅ Real Nostr messages appear in social feed
- ✅ Users can publish messages to Nostr network
- ✅ DJ/venue mentions work with real Nostr data
- ✅ Authentication generates real Nostr keys
- ✅ Social features work offline/online seamlessly

## 📁 Project Structure

```
yDance/
├── index.html              # Main HTML structure
├── style.css              # Styling and responsive design
├── script.js              # Application logic (7-layer architecture)
├── manifest.json          # PWA configuration
├── AI_DEVELOPMENT_GUIDELINES.md  # Architectural rules
└── package.json           # Project dependencies
```

## 🔄 Git Workflow

**MANDATORY: Commit every change immediately**

```bash
git add .
git commit -m "Descriptive commit message"
git push origin main
```

**Live Site**: [https://xxsocialxx.github.io/yDance/](https://xxsocialxx.github.io/yDance/)

---

*Built with ❤️ for the electronic music community*