# yDance Event Listing Website

## Project Overview
A vanilla HTML/CSS/JavaScript event listing website with Supabase database backend. Built for learning web development fundamentals with ADHD-friendly incremental achievements.

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
- **Deployment**: Local files (no GitHub needed for learning)

## Project Status: ✅ WORKING
- Database connection established
- Events load dynamically from Supabase
- Real-time updates possible
- Professional foundation ready for expansion

## File Structure
```
yDance/
├── index.html          # Main website (488 bytes)
├── script.js          # JavaScript with Supabase connection (4,417 bytes)
├── style.css          # CSS styling (928 bytes)
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
- ✅ Responsive card layout
- ✅ Interactive "Learn More" buttons
- ✅ Real-time database connection
- ✅ Error handling and debugging

## How to Run
1. Navigate to project folder: `cd /Users/601ere/yDance`
2. Open in browser: `open index.html`
3. Events load automatically from Supabase database

## Learning Achievements Completed
1. **HTML Structure** - Clean, semantic markup
2. **CSS Styling** - Modern card layout with hover effects
3. **JavaScript Logic** - Database connection and dynamic content
4. **Database Integration** - Real Supabase connection
5. **Error Handling** - Robust connection troubleshooting
6. **Project Organization** - Clean file structure

## Next Development Opportunities
- **User Authentication** - Login/register functionality
- **Event Management** - Add/edit/delete events from website
- **Real-time Updates** - Live event updates without refresh
- **Event Filtering** - Search and filter by date, location, type
- **Event Variety** - Different DJs, locations, music types
- **Mobile Optimization** - Enhanced responsive design

## Technical Notes
- **VPN Issues**: Supabase connections can be blocked by VPNs
- **Table Names**: Case-sensitive (Events vs events)
- **API Keys**: Use legacy key for compatibility
- **Timing**: Wait for DOM load before creating Supabase client
- **Error Handling**: Comprehensive logging for debugging

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

---
*Last updated: October 25, 2024*
*Project status: Fully functional and ready for expansion*
