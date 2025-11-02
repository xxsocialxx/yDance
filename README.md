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

## Data pipeline (boring by design)

We use a deterministic, append-only pipeline to keep data clean and trustable:

- raw_events (append-only): Stores the exact incoming payloads from the private relay or form, plus source, pubkey, signature, and a content_hash.
- normalized_events (versioned): Stores normalized, validated events with a version counter and a computed dedupe_key.
- normalized_events_latest (view): A read-only view of the latest version per event_uid. The UI reads only from this view.

Rules:
- All writes go raw → normalize → normalized (no UI direct writes).
- No destructive updates. New info creates new versions.
- Idempotent jobs keyed by content_hash (safe to retry).

## 🚀 Getting Started

1. **Install dependencies** (optional, for linting):
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   python3 -m http.server 8000
   # Open: http://localhost:8000
   ```

3. **Test the application**:
   - Navigate through all tabs (Events, DJs, Venues, Sound Systems, Friends, Social)
   - Test authentication (login/signup/logout)
   - Try posting messages in Social tab
   - View DJ profiles and event details

## 📊 Implementation Status

### **Completed Features**
- ✅ **Tab Navigation System**: Equal-value tabs with smooth switching
- ✅ **Events Tab**: Full event discovery with detailed event pages and clickable elements
- ✅ **DJs Tab**: DJ profiles with detailed views, social links, and social mentions
- ✅ **Venues Tab**: Venue discovery with detailed venue pages
- ✅ **Sound Systems Tab**: Sound system discovery with detailed pages
- ✅ **Friends Tab**: Friend discovery with detailed profiles
- ✅ **Social Tab**: Complete social feed with message posting and display
- ✅ **Authentication System**: Complete Supabase auth with login/signup/logout UI
- ✅ **Modular Architecture**: Clean, maintainable 7-layer code structure
- ✅ **Responsive Design**: Mobile-first approach with touch-optimized interfaces
- ✅ **PWA Foundation**: Ready for offline functionality
- ✅ **SOCIAL Layer**: Social content processing, nostr integration foundation, community intelligence
- ✅ **Event Detail Pages**: Full-page event details matching DJ profile experience
- ✅ **Social Mentions**: DJ and venue mention detection and display
- ✅ **Auth Integration**: User authentication affects social message authorship
- ✅ **Terminal-Style Interface**: Complete redesign with greyscale dark mode, flat list layout, minimal aesthetic
- ✅ **Location Selection**: City selection modal on first visit (saved to localStorage)

### **Design Overhaul - Terminal Interface**
- **Visual Style**: Greyscale dark mode (black/white/gray only), IBM Plex Mono monospace font throughout
- **Layout**: Flat terminal-style list view replacing card-based layouts
- **Content**: Removed all emojis, simplified to protocol-style labels ([DETAILS], [PROFILE])
- **Navigation**: Clean tab navigation with terminal borders, no gradients or shadows
- **Event Display**: Terminal list format showing TIME [TYPE] Location [DETAILS]
- **User Experience**: Minimal, efficient, LLM-like interaction model

### **Future Enhancements Needed**

#### **City-Based Filtering** ✅ IMPLEMENTED
City selection now filters events by the selected city. Filtering checks both `event.city` and `event.venue.city` fields for flexible matching.

**Implementation details:**
- `filterEventsByCity()` function filters events based on `state.userCity`
- Filtering is applied when events are loaded and when city selection changes
- Handles city name variations (e.g., "New York" vs "New York City") via case-insensitive contains matching
- Shows city context in empty state messages when no events found for selected city
- Falls back to showing all events if no city is selected

**Future optimization:** Consider filtering at database level for better performance with large datasets.

#### **Light Mode Implementation**
- Terminal-style light mode with subtle color accents (separate from dark mode)
- Toggle mechanism for mode switching
- Ensure readability and contrast in light mode

#### **Logo Integration**
- Incorporate animated x.dance logo from prototype (`Logo : Marketing Concepts/Generated Image November 02, 2025 - 5_16PM.png`)
- Implement grayscale fight-back animation if desired

### Nostr integration

- Private relay first: We ingest only from your private relay (`wss://localhost:8080` in development).
- Schema-first: Incoming notes must conform to our minimal event schema (see `schema/event.schema.json`) or land in the review queue.
- Idempotent: We hash payloads to avoid duplicates and make retries safe.
- Later: When ready, we can publish normalized summaries to public relays and retro-sign historical data.

#### Dev health check
Flip `CONFIG.flags.nostrHealthCheck` to true to run a quick Nostr connect→disconnect sanity check during social init. You can also call `window.social.healthCheck()` from the console.

## 🎨 Interface Design Notes

### Terminal-Style Redesign Implementation

**Design Philosophy:**
- Maximum efficiency and clarity
- Minimal visual noise (no emojis, no unnecessary wording)
- Terminal/CLI aesthetic for efficient information consumption
- Greyscale dark mode for clean, retro feel

**Key Changes:**
1. **Removed card layouts** → Flat list with dotted dividers
2. **Removed all emojis** → Text-only labels and protocol-style actions
3. **Simplified language** → "Learn More" → "[DETAILS]", protocol-style brackets
4. **Greyscale color palette** → Pure black/white/grays (no color accents in dark mode)
5. **IBM Plex Mono font** → Monospace throughout for terminal feel
6. **No shadows/gradients** → Flat design with minimal borders
7. **Location selection** → First-visit modal, saved to localStorage, not persistent in UI

**Files Modified:**
- `style.css` - Complete terminal-style redesign (~600 lines, down from ~2175)
- `index.html` - Removed emojis from tabs, added location modal
- `script.js` - Updated rendering to flat list format, added location management

**CSS Structure:**
- CSS variables for greyscale theme
- Terminal-style borders and dividers
- Flat, minimal hover states
- Mobile-first responsive design maintained

## 🎯 Next Priority: Nostr Integration

## Feature flags

We gate new or risky logic behind flags so you can roll forward safely:

- CONFIG.flags.nostrRealClient (default: false)
- CONFIG.flags.writeToRawEvents (default: false)
- CONFIG.flags.enableReviewQueue (default: true)

Turn features on deliberately, one at a time.

### Phase 1: Core Nostr Client (CRITICAL - 1-2 days)

**Add Nostr Library:**
```bash
npm install nostr-tools
```

## Supabase tables (MVP)

We expect these tables/views:

- raw_events: append-only log of incoming posts
- normalized_events: versioned normalized records
- normalized_events_latest (view): latest-per-event_uid for UI reads
- review_queue: human-in-the-loop approvals for uncertain items

You can start with just raw_events + normalized_events_latest and grow from there.

## Security/Keys

We use the Supabase anon (publishable) key in the client by design. This is safe and recommended for frontend apps per Supabase docs; Row Level Security (RLS) and policies protect data access.

## Dev flags

These flags live under `CONFIG.flags` in `script.js` and are safe to flip during development:

- `debug` (default: false): Enables verbose console logs for queries and renders.
- `nostrHealthCheck` (default: false): Runs a quick Nostr connect→disconnect sanity check at social init. You can also run it manually via `window.social.healthCheck()`.

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

## 🛠️ Development Guidelines

**Architecture Compliance:**
- All new code must follow the 7-layer structure
- Never modify existing method signatures
- Always add new methods following established templates
- Test all changes in browser before committing

**Code Quality:**
- Use consistent naming conventions
- Add error handling for all new methods
- Follow existing patterns for UI components
- Maintain mobile-first responsive design

**Testing Checklist:**
- ✅ All tabs load without errors
- ✅ Authentication flow works (login/signup/logout)
- ✅ Social features function correctly
- ✅ DJ profiles and event details display properly
- ✅ Mobile responsiveness maintained

## Product non‑negotiables

- This week/weekend scope, text-first. No images in the listing view.
- UI is read-only from normalized_events_latest; no direct DB writes.
- All event writes go via relay/form → raw_events → pipeline.
- Keep changes reversible: append-only logs, versioned normalized rows.

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