# Area Code Discovery Status

**Date:** October 31, 2025  
**Target:** Washington DC Area Code  
**Status:** ⚠️ Not Found Yet

---

## ✅ What We Know

### Confirmed Area Codes
- **Area 308** = California (tested ✅)
- **Area 2** = UK (tested ✅)  
- **Area 13** = London, UK (tested ✅)

### Washington DC Status
- ❌ **Not found in tested range (1-315, plus selected higher numbers)**
- ⚠️ May be outside tested range or use different system

---

## 🔍 Methods Attempted

### 1. Network Request Monitoring
- ❌ No GraphQL requests captured during page load
- **Finding:** RA.co appears to use SSR (Server-Side Rendering)
- GraphQL calls may happen server-side, not exposed to client

### 2. Page Source Analysis
- ❌ `__NEXT_DATA__` script tag not found
- **Finding:** Page structure may have changed or uses different architecture

### 3. Systematic Area Code Testing
- ✅ Tested codes: 1-20, 50-52, 100-102, 150-151, 200-201, 250-251, 300-315
- ❌ None returned Washington DC events
- **Finding:** DC area code is likely outside this range or uses different identifier

---

## 💡 Alternative Approaches

### Option 1: Query by Location Slug
Instead of area codes, maybe RA.co supports:
```graphql
filters: {
  location: { eq: "washington-dc" }
}
```
**Status:** ❓ Not tested yet

### Option 2: Event-Based Discovery
- Query events and filter by venue/city in results
- Use broader area codes that include DC (e.g., "US East Coast")
- **Status:** ❓ Not tested yet

### Option 3: Different API Endpoint
- Look for area/location lookup endpoint
- Query area metadata endpoint
- **Status:** ❓ Not tested yet

### Option 4: Reverse from Known DC Event
- Inspect event 2292678 (El Techo Halloween in DC)
- Check if event response contains area code
- **Status:** ❓ Not tested yet

### Option 5: Broader Testing Range
- Test area codes: 316-500, 501-1000, etc.
- May require many API calls
- **Status:** ⚠️ Time-consuming but viable

---

## 📋 Next Steps

1. **Test location slug query** - Try querying by location name instead of area code
2. **Inspect known DC event API response** - Check if area code is in event details
3. **Query broader geographic areas** - Test if DC is part of a larger area (e.g., "US East")
4. **Manual lookup** - Check RA.co's location pages/sitemap for area codes
5. **Community sources** - Check if other scrapers/projects have DC area code

---

## 🔧 Tools Created

1. `area-code-discovery.js` - Initial discovery script
2. `area-code-discovery-v2.js` - Enhanced with deep search
3. `find-dc-area-code.js` - Systematic testing script

All tools are ready to use once we find the correct approach or range.

---

## 💭 Hypothesis

**Washington DC area code might be:**
- Higher number (> 315)
- Different query structure (location-based, not area-based)
- Part of a parent area (need to query parent then filter)
- Requires authentication or special headers

---

**Recommendation:** Try querying by location slug/name next, as this may bypass the need for numeric area codes entirely.

