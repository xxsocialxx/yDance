# yDance Events

Electronic music event discovery platform with equal-value tabs for Events, DJs, Venues, Sound Systems, and Friends - a Progressive Web App built with vanilla JavaScript and Supabase.

## 🚨 For AI Agents

**BEFORE MAKING ANY CHANGES**, please read: [`AI_DEVELOPMENT_GUIDELINES.md`](./AI_DEVELOPMENT_GUIDELINES.md)

This project uses a strict modular architecture to prevent code duplication and maintainability issues.

## 🏗️ Architecture

The codebase follows a **7-layer modular architecture** designed for safe, incremental updates:

```
CONFIG → STATE → API → SOCIAL → VIEWS → ROUTER → INIT
```

- **CONFIG**: App settings and constants (safe to add new config)
- **STATE**: Single source of truth for all data (safe to add new properties)
- **API**: Database/network calls (safe to add new methods following templates)
- **SOCIAL**: Social content processing, nostr integration, community intelligence (safe to add new social methods)
- **VIEWS**: HTML rendering and DOM manipulation (safe to add new rendering functions)
- **ROUTER**: Navigation and event handling (safe to add new routes)
- **INIT**: Application startup (protected - do not modify)

### 🛡️ Safe Update Strategy

The architecture is designed for **zero-breaking-changes** development:

- ✅ **Add new properties** to existing objects
- ✅ **Add new methods** following established templates
- ✅ **Add new views** using existing patterns
- ✅ **Add new CSS classes** without modifying existing ones
- ✅ **Add new HTML elements** without touching existing structure

**Never modify existing method signatures, CSS class names, HTML IDs, or state property names.**

## 🚀 Getting Started

1. **Install dependencies** (optional, for linting):
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run serve
   # or
   python3 -m http.server 8000
   ```

3. **Open in browser**:
   ```
   http://localhost:8000
   ```

## 🛠️ Development

### **Adding New Features Safely**

1. **Follow the Module Structure**:
   ```javascript
   // 1. Add to CONFIG (if needed)
   const CONFIG = { newSetting: 'value' };
   
   // 2. Add to STATE (if needed)
   const state = { newData: [] };
   
   // 3. Add to API (following template)
   const api = { fetchNewData() { /* template pattern */ } };
   
   // 4. Add to SOCIAL (following template)
   const social = { processNewContent() { /* template pattern */ } };
   
   // 5. Add to VIEWS (following template)
   const views = { renderNewData() { /* template pattern */ } };
   
   // 6. Add to ROUTER (following template)
   const router = { showNewView() { /* template pattern */ } };
   ```

2. **Use Existing Templates**:
   - Copy patterns from existing methods
   - Follow the same error handling
   - Use the same naming conventions
   - Maintain the same structure

3. **Test Incrementally**:
   - Test each addition before moving to the next
   - Verify existing functionality still works
   - Check for linter errors

### **Development Commands**
- **Lint code**: `npm run lint`
- **Fix linting**: `npm run lint:fix`
- **Serve locally**: `npm run serve`

### **Git Workflow for AI Agents**

🚨 **CRITICAL: NEVER FORGET TO COMMIT CHANGES** 🚨

**MANDATORY RULE: Every single change must be committed immediately after completion. No exceptions.**

1. **After completing ANY feature, fix, or change**:
   ```bash
   git add .
   git commit -m "Descriptive commit message"
   git push origin main
   ```

2. **Commit Message Format**:
   ```
   Brief description of changes

   - Specific change 1
   - Specific change 2
   - Any architectural notes
   ```

3. **Before starting ANY work**:
   ```bash
   git pull origin main
   ```

4. **Check status regularly**:
   ```bash
   git status
   ```

5. **Emergency reminder**: If you forget to commit, stop everything and commit immediately. Uncommitted changes are a project risk.

**Live Site**: [https://xxsocialxx.github.io/yDance/](https://xxsocialxx.github.io/yDance/)

**Repository**: All changes are automatically deployed to GitHub Pages

## 📁 Project Structure

```
yDance/
├── index.html              # Main HTML structure
├── style.css              # Styling and responsive design
├── script.js              # Application logic (modular architecture)
├── manifest.json          # PWA configuration
├── AI_DEVELOPMENT_GUIDELINES.md  # Rules for AI agents
├── .eslintrc.json         # Linting configuration
└── package.json           # Project dependencies
```

## 🎯 Features

### **Tab-Based Discovery System**
- **Events Tab**: Browse upcoming electronic music events (cluster hub with shortcuts to all elements)
- **DJs Tab**: Discover DJs with detailed profiles and social links
- **Venues Tab**: Explore venues with capacity, sound systems, and details
- **Sound Systems Tab**: Coming soon - discover events by sound quality
- **Friends Tab**: Coming soon - social discovery and friend-based recommendations

### **Event Cards (Cluster Hub)**
- **Clickable Elements**: DJ names, venue names, sound systems all link to detailed views
- **Social Integration**: Shows friend attendance ratios (e.g., "3/24 friends going")
- **Complete Information**: Date, location, type, music style, DJ, venue, sound system

### **Detailed Views**
- **DJ Profile Pages**: Individual DJ details with social links and badges
- **Venue Detail Pages**: Complete venue information with sound system details
- **Future**: Sound system details, friend profiles, event details

### **Technical Features**
- **PWA Support**: Installable on mobile devices
- **Responsive Design**: Works on mobile and desktop
- **Real-time Data**: Powered by Supabase
- **Modular Architecture**: Safe, incremental updates

## 🔧 Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL)
- **Social Protocol**: Nostr (decentralized social networking)
- **PWA**: Service Worker ready
- **Styling**: CSS Grid, Flexbox, Mobile-first

## 📱 PWA Features

- Installable on mobile devices
- Offline-ready architecture
- App-like experience
- Responsive design

## 📊 Implementation Status

### **Completed Features**
- ✅ **Tab Navigation System**: Equal-value tabs with smooth switching
- ✅ **Events Tab**: Full event discovery with clickable elements
- ✅ **DJs Tab**: DJ profiles with detailed views and social links
- ✅ **Venues Tab**: Venue discovery with detailed venue pages
- ✅ **Modular Architecture**: Clean, maintainable 7-layer code structure
- ✅ **Responsive Design**: Mobile-first approach
- ✅ **PWA Foundation**: Ready for offline functionality
- ✅ **SOCIAL Layer**: Social content processing, nostr integration, community intelligence

### **In Development**
- 🚧 **Sound Systems Tab**: Placeholder ready for implementation
- 🚧 **Friends Tab**: Placeholder ready for social features
- 🚧 **Event Card Integration**: Clickable venue/sound system names in events
- 🚧 **Social Features**: Friend attendance ratios in event cards

### **Future Enhancements**
- 🔮 **User Authentication**: Login system for personalized experience
- 🔮 **Real-time Updates**: Live event updates and notifications
- 🔮 **Advanced Filtering**: Filter events by multiple criteria
- 🔮 **Event Creation**: Allow users to create and manage events

---

*Built with ❤️ for the electronic music community*