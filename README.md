# yDance Event Listing Website

## Project Overview
A mobile-first Progressive Web App (PWA) for electronic music event listings, featuring DJ profiles and social connectivity. Built with vanilla HTML/CSS/JavaScript and Supabase backend, designed for ADHD-friendly learning with incremental achievements.

## User Profile & Learning Approach
- **User has ADHD** - needs small, achievable milestones
- **Learning focused** - wants to understand the code being generated
- **Prefers minimal complexity** - "can we achieve a little less but with much less complexity?"
- **Needs encouragement** - small wins and positive reinforcement
- **Progressive learning** - build understanding step by step

## Technical Stack
- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Backend**: Supabase (handles database, APIs, auth)
- **Database**: MongoDB via Supabase
- **Deployment**: GitHub Pages (live at https://xxsocialxx.github.io/yDance)
- **Mobile**: PWA with responsive design and touch-friendly interface

## Project Status: ✅ LIVE & MOBILE-OPTIMIZED
- ✅ Database connection established
- ✅ Events load dynamically from Supabase
- ✅ Mobile-first responsive design
- ✅ Touch-friendly interface (44px minimum touch targets)
- ✅ PWA capabilities (installable from browser)
- ✅ Live deployment on GitHub Pages
- ✅ Professional foundation ready for DJ profiles

## File Structure
```
yDance/
├── index.html          # Main website with PWA features
├── script.js          # JavaScript with Supabase connection
├── style.css          # Mobile-first responsive CSS
├── manifest.json      # PWA manifest for app-like experience
├── mobile-test.html   # Offline testing version with sample events
├── debug-test.html    # Connection debugging tool
├── simple-test.html   # Network testing tool
└── test.html          # Basic Supabase test
```

## Database Configuration
- **Project**: yDance1
- **URL**: https://rymcfymmigomaytblqml.supabase.co
- **API Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bWNmeW1taWdvbWF5dGJscW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjcxNzEsImV4cCI6MjA3NzAwMzE3MX0.gjjBPhgNap7VsjZ-SFInVLGzPbPcZC-UEF5F7pQ8-tg
- **Table**: Events (case-sensitive)
- **RLS**: Disabled (for learning purposes)

## Current Features
- ✅ Dynamic event loading from database
- ✅ Mobile-first responsive design (single column on mobile)
- ✅ Touch-friendly buttons (44px minimum touch targets)
- ✅ PWA capabilities (installable, works offline)
- ✅ Interactive "Learn More" buttons
- ✅ Real-time database connection
- ✅ Error handling and debugging
- ✅ Live deployment on GitHub Pages

## How to Access
**Live Site:** https://xxsocialxx.github.io/yDance

**Local Development:**
1. Navigate to project folder: `cd /Users/601ere/yDance`
2. Start local server: `python3 -m http.server 8000`
3. Open in browser: `http://localhost:8000`

**Mobile Testing:**
- Use the live GitHub Pages URL on your phone
- Add to Home Screen for app-like experience
- Test touch interactions and responsive design

## Learning Achievements Completed
1. **HTML Structure** - Clean, semantic markup with PWA meta tags
2. **CSS Styling** - Mobile-first responsive design with touch-friendly interface
3. **JavaScript Logic** - Database connection and dynamic content
4. **Database Integration** - Real Supabase connection with error handling
5. **Mobile Optimization** - Touch targets, responsive grid, PWA features
6. **Deployment** - GitHub Pages setup and live hosting
7. **PWA Development** - Progressive Web App with manifest and installability
8. **Project Organization** - Clean file structure and version control

## Next Development Opportunities
- **DJ Profiles** - Clickable DJ names leading to biography pages
- **Audio Clips** - Short 30-60 second previews for each DJ
- **Social Links** - Instagram, SoundCloud, Spotify integration
- **Event Filtering** - Search and filter by DJ, date, location, music type
- **User Authentication** - Login/register functionality
- **Event Management** - Add/edit/delete events from website
- **Real-time Updates** - Live event updates without refresh
- **Enhanced Mobile Features** - Push notifications, offline caching

## Technical Notes
- **Mobile-First Design**: Single column layout on mobile, responsive grid on desktop
- **Touch Targets**: All interactive elements meet 44px minimum size requirement
- **PWA Features**: Installable from browser, works offline, app-like experience
- **GitHub Pages**: Free hosting with automatic deployments on git push
- **VPN Compatibility**: Live site works regardless of VPN settings
- **Database**: Supabase handles backend, case-sensitive table names
- **Performance**: Optimized for mobile data usage and fast loading

## Code Architecture
- **Single Page Application** approach
- **Component-based structure** (each card is a component)
- **Async/await** for database operations
- **Event delegation** for dynamic button handling
- **Progressive enhancement** (works without JavaScript)

## Learning Philosophy
- Start simple, add complexity gradually
- Focus on understanding over features
- Celebrate small wins
- Build on solid foundations
- Real-world patterns and practices

## Support Information
- User prefers step-by-step explanations
- Needs to understand "why" not just "how"
- Benefits from visual progress indicators
- Appreciates encouragement and positive reinforcement
- Learns best through hands-on building

## Project Vision
**"DJs are the heart and soul of electronic music events"** - This project focuses on making DJs the central element, with clickable profiles, audio previews, and social connectivity. The target audience consists of quality die-hard electronic music fans who make their event choices first and foremost based on the DJ.

## Key Insights from Development
- **Mobile-first approach** was essential - most users discover events on their phones
- **Touch-friendly interface** dramatically improves user experience
- **PWA capabilities** provide native app-like experience without app store complexity
- **Simple, focused features** work better than complex feature sets
- **Incremental development** keeps motivation high and learning manageable

---
*Last updated: October 27, 2024*
*Project status: Live, mobile-optimized, and ready for DJ profile development*
*Live site: https://xxsocialxx.github.io/yDance*
