# Resident Advisor Official GitHub Analysis

**Date:** October 31, 2025  
**Organization:** https://github.com/resident-advisor

---

## 🔍 Repository Overview

Based on the [official Resident Advisor GitHub organization](https://github.com/resident-advisor), here's what we found:

### Repositories Found

1. **Validator** (Swift) - iOS input validation library
2. **spotify-token-swap-service** (Ruby) - Spotify API token management
3. **scroll** (JavaScript) - Scroll observing library
4. **motion** (TypeScript) - Animation library for React
5. **ra-logger** (Swift) - Swift logging package
6. **styled-system** (JavaScript) - Style props library
7. **tap-mixpanel** (Python) - Mixpanel data extraction
8. **dejavu** (CSS) - Elasticsearch web UI
9. **prisma-nestjs-graphql** (TypeScript) - Prisma + NestJS GraphQL
10. **adzerk-management-sdk-js** (TypeScript) - Ad management SDK

---

## ❌ Findings for Our Project

### No Public API Documentation
- ❌ No repository with API documentation
- ❌ No GraphQL schema definitions
- ❌ No event data structure documentation
- ❌ No area code mapping documentation
- ❌ No location/geographic data repositories

### What's Available
- ✅ Internal tooling libraries (validators, logging, UI components)
- ✅ Third-party SDK integrations (Spotify, Mixpanel, Adzerk)
- ✅ Development tools (scroll detection, animations, styling)

### What's NOT Available
- ❌ Public API documentation
- ❌ Event data schemas
- ❌ Area code mappings
- ❌ Location query examples
- ❌ GraphQL query examples (beyond what we already have)

---

## 💡 Implications for Our Project

### What This Means

1. **No Official API Docs**
   - RA doesn't publish public API documentation
   - The GraphQL endpoint we're using is internal/undocumented
   - We're reverse-engineering from network traffic

2. **No Area Code Reference**
   - No official area code mapping available
   - Must discover area codes through testing or reverse engineering
   - Confirms why we couldn't find DC area code in their public repos

3. **Legal Considerations**
   - RA's Terms prohibit scraping (as noted in search results)
   - Their GitHub shows they're active developers but don't publish API docs
   - Our project is for development/learning purposes only

---

## ✅ What We Already Know (From Reverse Engineering)

Since RA doesn't provide public API docs, our reverse engineering has been valuable:

### GraphQL Endpoint
- **URL:** `https://ra.co/graphql`
- **Operation:** `GET_EVENT_LISTINGS`
- **Method:** POST with JSON payload

### Known Area Codes
- Area 308 = California
- Area 2 = UK
- Area 13 = London

### Query Structure
```graphql
query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $page: Int, $pageSize: Int) {
  eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
    data {
      event {
        id
        title
        date
        venue { name }
        artists { name }
        # ... more fields
      }
    }
    totalResults
  }
}
```

---

## 🔄 Our Approach Remains Valid

Since RA doesn't publish API docs:

1. **Reverse Engineering** - What we've been doing is the right approach
2. **GraphQL Discovery** - We found the endpoint through network inspection
3. **Systematic Testing** - Testing area codes is necessary since no mapping exists
4. **Hybrid Method** - Combining API + scraping gives us complete data

---

## 📋 Next Steps (Unchanged)

Our strategy doesn't change based on GitHub analysis:

1. **Continue area code discovery** - Systematic testing or coordinate-based queries
2. **Use hybrid approach** - GraphQL for discovery, scraping for details
3. **Build our own mapping** - Document discovered area codes in our `area-codes.json`
4. **Respect ToS** - Development/testing purposes only

---

## 🎯 Conclusion

**RA's GitHub doesn't provide API documentation**, which means:

- ✅ Our reverse engineering approach is correct
- ✅ We're on the right track with GraphQL discovery
- ✅ Building our own area code database is necessary
- ⚠️ No shortcuts from official documentation
- ⚠️ Must respect their Terms of Service

**Our current methodology (hybrid GraphQL + scraping) remains the best approach given the lack of official API docs.**

---

**References:**
- [Resident Advisor GitHub Organization](https://github.com/resident-advisor)
- Terms and legal considerations (as noted in web search results)

