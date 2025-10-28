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

### **Nostr Integration Status**
- ✅ **Foundation Ready**: SOCIAL layer designed for Nostr integration
- ✅ **Auth System**: Nostr key generation placeholders implemented
- ✅ **Message Processing**: Social feed infrastructure ready for Nostr messages
- ✅ **UI Components**: Social tab and auth UI ready for real Nostr data
- 🔧 **Placeholder Implementation**: Current implementation uses placeholder Nostr client
- 🔧 **Ready for Real Integration**: All infrastructure in place for actual Nostr protocol

### **Future Enhancements**
- 🔮 **Real Nostr Integration**: Replace placeholders with actual Nostr client
- 🔮 **Event Announcements**: Publish events to Nostr network
- 🔮 **DJ Profile Verification**: Link DJ profiles to Nostr identities

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