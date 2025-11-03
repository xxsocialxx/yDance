# Quick Testing Checklist

**Goal:** Verify nostr isolation works without breaking existing functionality

## ✅ Quick Test (5 minutes)

### Test 1: Backward Compatibility (nostrIsolated = false)

1. **Open browser, open console (F12)**
2. **Load the app** - Should work normally
3. **Check console** - Should see "Social layer initialized" (NOT "Nostr module initialized")
4. **Test basic functionality:**
   - [ ] Events tab loads
   - [ ] DJs tab loads  
   - [ ] Operators tab loads
   - [ ] USERS tab loads (may be empty/placeholder)
   - [ ] No errors in console

**Expected:** Everything works exactly as before. ✅

---

## ✅ Quick Test (5 minutes)

### Test 2: Isolated Mode (nostrIsolated = true)

1. **Open browser console**
2. **Run this command:**
   ```javascript
   CONFIG.flags.nostrIsolated = true
   ```
3. **Reload the page (F5)**
4. **Check console** - Should see:
   - "Initializing isolated Nostr module..."
   - "Social layer initialized with isolated Nostr module"
   - "Nostr state migrated to isolated namespace"
5. **Test functionality:**
   - [ ] Events tab still works
   - [ ] DJs tab still works
   - [ ] Operators tab still works
   - [ ] USERS tab still works
   - [ ] No errors in console

6. **Verify isolation (in console):**
   ```javascript
   // Check new namespace exists
   state.nostr  // Should return object (not null)
   
   // Check dev hook exists
   window.nostr  // Should return nostr module object
   
   // Test nostr module
   nostr.getStatus()  // Should return status object
   ```

**Expected:** App works, new nostr namespace exists, module accessible. ✅

---

## ✅ Quick Test (5 minutes)

### Test 3: Toggle Between Modes

1. **Start with `nostrIsolated = false`**
   - Reload page
   - [ ] App works

2. **Toggle to `nostrIsolated = true`**
   ```javascript
   CONFIG.flags.nostrIsolated = true
   ```
   - Reload page
   - [ ] App still works
   - [ ] Console shows migration messages

3. **Toggle back to `nostrIsolated = false`**
   ```javascript
   CONFIG.flags.nostrIsolated = false
   ```
   - Reload page
   - [ ] App still works
   - [ ] No errors

**Expected:** Can toggle between modes without breaking. ✅

---

## 🎯 That's It!

If all 3 quick tests pass, **Phase 3 is complete** and you're ready for Phase 4.

---

## 🔍 Optional: Deeper Testing

### If you want to test more thoroughly:

#### Test Auth (Optional)
1. **Sign up a new user** with `nostrIsolated = false`
   - [ ] User created in Supabase
   - [ ] Nostr keys generated (check localStorage or state.userKeys)

2. **Toggle to `nostrIsolated = true`**
   - Reload page
   - [ ] Sign in with same user
   - [ ] Keys should be accessible via `getNostrKeys()` or `state.nostr.keys`

#### Test Migration (Optional)
1. **Create user with `nostrIsolated = false`**
   - Sign up, get keys in `state.userKeys`

2. **Toggle to `nostrIsolated = true`**
   - Reload
   - Check: `state.nostr.keys` should have migrated keys
   - Check: `state.userKeys` still readable (backward compat)

---

## ⚠️ What to Look For

### Red Flags (Should NOT happen):
- ❌ App crashes on load
- ❌ Tabs don't work
- ❌ Console errors (except expected warnings)
- ❌ State not accessible
- ❌ Can't toggle between modes

### Green Flags (Good signs):
- ✅ App loads normally
- ✅ All tabs functional
- ✅ Console shows expected messages
- ✅ Can toggle flag without issues
- ✅ State accessible in both modes

---

## 📝 Report Results

After testing, note:
- [ ] All quick tests passed
- [ ] Any errors found? (List them)
- [ ] Any unexpected behavior? (Describe it)
- [ ] Ready for Phase 4? Yes / No

---

**Time Required:** 15 minutes total (5 min per test)

