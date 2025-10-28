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

### ✅ DO:
1. **Follow the module structure** - Add code to the appropriate layer
2. **Use existing patterns** - Copy the template functions provided
3. **Reuse the Supabase client** - Always use `state.supabaseClient`
4. **Add to existing modules** - Don't create new modules
5. **Read the section comments** - Each section has clear guidelines

### ❌ DON'T:
1. **Add functions outside modules** - Everything must go in CONFIG/STATE/API/VIEWS/ROUTER
2. **Duplicate code** - Use existing patterns instead
3. **Create new Supabase clients** - Use the existing one in state
4. **Mix concerns** - Keep API calls in API, rendering in VIEWS, etc.
5. **Modify the INIT section** - It's protected for a reason

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

## 🔍 Code Review Checklist

Before submitting any changes, verify:

- [ ] Code is in the correct module (CONFIG/STATE/API/SOCIAL/VIEWS/ROUTER)
- [ ] No functions are added outside the designated modules
- [ ] No code duplication exists
- [ ] Supabase client is reused (not recreated)
- [ ] Error handling follows existing patterns
- [ ] Console logging is consistent with existing code
- [ ] DOM manipulation is only in VIEWS module
- [ ] API calls are only in API module
- [ ] Social processing is only in SOCIAL module
- [ ] Navigation logic is only in ROUTER module

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
