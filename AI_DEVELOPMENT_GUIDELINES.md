# yDance Events - AI Development Guidelines

## 🚨 CRITICAL: READ THIS BEFORE MAKING ANY CHANGES

This project uses a **strict modular architecture** to prevent code duplication and maintainability issues. **DO NOT** add code outside the designated modules.

## 📋 Architecture Overview

The codebase follows a **7-layer architecture** with clear boundaries:

```
CONFIG → STATE → API → SOCIAL → VIEWS → ROUTER → INIT
```

### 1. CONFIG Layer
- **Purpose**: All app settings, API keys, constants
- **Add here**: New configuration values, API endpoints
- **Don't add**: Functions, logic, runtime values

### 2. STATE Layer  
- **Purpose**: Single source of truth for all app data
- **Add here**: New state properties for tracking data
- **Don't add**: Functions, computed values, DOM references

### 3. API Layer
- **Purpose**: All database/network calls and data fetching
- **Add here**: New API methods, database queries, external API calls
- **Don't add**: DOM manipulation, rendering, UI logic

### 4. SOCIAL Layer
- **Purpose**: Social content processing, nostr integration, community intelligence
- **Add here**: Message parsing, nostr communication, social algorithms, moderation
- **Don't add**: Direct DOM manipulation, API calls, or navigation logic

### 5. VIEWS Layer
- **Purpose**: All HTML rendering, DOM manipulation, UI updates
- **Add here**: New rendering functions, DOM updates, UI components
- **Don't add**: API calls, business logic, navigation

### 6. ROUTER Layer
- **Purpose**: Navigation, event handlers, view switching, user interactions
- **Add here**: New routes, event listeners, navigation logic
- **Don't add**: API calls, rendering, business logic

### 7. INIT Layer
- **Purpose**: Application startup orchestration
- **DO NOT MODIFY**: This section is off-limits

## 🛡️ Architectural Rules
## Contracts and invariants (do not break)

- Canonical schema: All event data must validate against `schema/event.schema.json`.
- Write path: UI never writes events. All writes go to `raw_events`.
- Versioning: `normalized_events` is append-only by version; never mutate past versions.
- Latest view: UI reads only from `normalized_events_latest`.
- Idempotency: Jobs must be safe to retry; use `content_hash` guards.
- Dedupe: Use `dedupe_key = title + time_window + venue_radius + organizer_pubkey`.
- Review: Uncertain items must go to `review_queue` with a human decision.


### ✅ DO:
1. **Follow the module structure** - Add code to the appropriate layer
2. **Use existing patterns** - Copy the template functions provided
3. **Reuse the Supabase client** - Always use `state.supabaseClient`
4. **Add to existing modules** - Don't create new modules
5. **Read the section comments** - Each section has clear guidelines

### ❌ DON'T:
1. Write directly to normalized tables or views
2. Bypass schema validation or insert non-conformant data
3. Create alternate clients for Supabase or the relay
4. Change module boundaries (mix API/SOCIAL/VIEWS responsibilities)
5. Modify INIT or ROUTER to perform database writes

## 📋 Template Functions

### For New API Methods:
```javascript
async fetchNewData() {
    try {
        const { data, error } = await state.supabaseClient
            .from('table_name')
            .select('*');
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching new data:', error);
        throw error;
    }
}
```

### For New SOCIAL Methods:
```javascript
async processNewContent(contentData) {
    try {
        // Process content
        // Apply social intelligence
        // Return processed data
    } catch (error) {
        console.error('Error processing content:', error);
        throw error;
    }
}
```

### For New Rendering Functions:
```javascript
renderNewComponent(data) {
    const container = document.getElementById('container-id');
    if (!container) {
        console.error('Container not found!');
        return;
    }
    container.innerHTML = data.map(item => this.createItemCard(item)).join('');
}

createItemCard(item) {
    return `<div class="item-card">${item.name}</div>`;
}
```

### For New Routes:
```javascript
async showNewView(parameter = null) {
    console.log('Switching to new view', parameter ? `with ${parameter}` : '');
    state.currentView = 'new-view';
    document.getElementById('old-view').style.display = 'none';
    document.getElementById('new-view').style.display = 'block';
    
    if (parameter) {
        state.selectedParameter = parameter;
        // Load data if needed
        if (state.newData.length === 0) {
            views.showLoading('new-container');
            try {
                const data = await api.fetchNewData();
                views.renderNewComponent(data);
            } catch (error) {
                views.showError('new-container', error.message);
            }
        }
    }
}
```

## 🎯 Common Tasks

### Adding a New Feature:
1. **Configuration**: Add any constants to `CONFIG`
2. **State**: Add data tracking to `state` object
3. **API**: Add data fetching methods to `api` object
4. **Social**: Add social processing methods to `social` object
5. **Views**: Add rendering functions to `views` object
6. **Router**: Add navigation logic to `router` object

### Adding a New View:
1. Add HTML structure to `index.html`
2. Add CSS styles to `style.css`
3. Add state properties for the new view
4. Add API methods to fetch data for the view
5. Add rendering functions to display the view
6. Add router methods to navigate to the view

### Adding a New Database Table:
1. Add API methods to `api` object using the template
2. Add state properties to track the data
3. Add rendering functions to `views` object
4. Add navigation logic to `router` if needed

## Protected files

- schema/event.schema.json
- supabase/migrations/**
- contract.md

Edits require explicit approval. Changes must include updated fixtures and pass schema validation.

## Feature flags

- Add new flags under `CONFIG.flags`.
- Default new flags to false.
- Wrap new behavior with a clear guard (`if (!CONFIG.flags.someFlag) return;`).
- Include a brief note in the PR: which flag, default state, rollback plan.

## Review queue expectations

- Uncertain parsing or low-confidence mapping routes to `review_queue`.
- SOCIAL may parse and score, but only API/pipeline write to DB.
- VIEWS can display a badge ("updated", "verified", "needs review") but cannot change state.

See `contract.md` for product non‑negotiables and acceptance criteria. If a proposed change conflicts with the contract, the change must be dropped or the contract revised first.

## Agent checklist (must pass)

Before submitting any changes, verify:

- [ ] Change stays within the correct module (CONFIG/STATE/API/SOCIAL/VIEWS/ROUTER)
- [ ] No UI writes: all event writes enter via `raw_events`
- [ ] If schema touched: fixtures updated and validator passes
- [ ] Idempotency: content_hash guard present on new jobs
- [ ] Dedupe_key logic unchanged or updated with tests
- [ ] Feature flags wrap any new risky logic; defaults remain OFF
- [ ] No edits to INIT; ROUTER only handles navigation and handlers

## 🚨 Emergency Fixes

If you accidentally break the architecture:

1. **Stop immediately** - Don't add more code
2. **Identify the violation** - Which rule was broken?
3. **Move code to correct module** - Use the templates above
4. **Test functionality** - Make sure everything still works
5. **Update this guide** - If you found a new pattern

## 🔄 Git Workflow

### **CRITICAL: Always commit your changes**

After completing any feature or fix:

```bash
git add .
git commit -m "Brief description of changes

- Specific change 1
- Specific change 2
- Any architectural notes"
git push origin main
```

### **Before Starting Work**
```bash
git pull origin main
```

### **Check Status**
```bash
git status
```

**Live Site**: [https://xxsocialxx.github.io/yDance/](https://xxsocialxx.github.io/yDance/)

## 📞 Need Help?

If you're unsure where code should go:

1. **Read the section comments** in `script.js` - they're very detailed
2. **Look at existing patterns** - copy what's already there
3. **Ask the user** - they understand the architecture best

Remember: **It's better to ask than to break the architecture!**

---

*This guide exists because architectural drift is a real problem. Following these rules prevents the codebase from becoming unmaintainable.*
