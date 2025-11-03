// Helper function to get DJs active in next 7 days with event details
function getDJsActiveThisWeek() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get all events in next 7 days
    const upcomingEvents = state.eventsData.filter(event => {
        const date = event.date || event.start;
        if (!date) return false;
        const eventDate = new Date(date);
        return eventDate >= now && eventDate <= sevenDaysLater;
    });
    
    // Group by DJ
    const djMap = {};
    
    upcomingEvents.forEach(event => {
        const djName = event.dj || event.organizer?.name || '';
        if (!djName) return;
        
        if (!djMap[djName]) {
            djMap[djName] = {
                name: djName,
                eventCount: 0,
                venues: new Set(),
                events: []
            };
        }
        
        djMap[djName].eventCount++;
        const venue = event.venue?.name || event.location || 'TBD';
        djMap[djName].venues.add(venue);
        djMap[djName].events.push({
            date: new Date(event.date || event.start),
            title: event.title || event.name,
            venue: venue,
            city: event.city || event.venue?.city
        });
    });
    
    // Convert to array and sort by event count (most active first)
    return Object.values(djMap)
        .map(dj => ({
            name: dj.name,
            eventCount: dj.eventCount,
            venues: Array.from(dj.venues),
            events: dj.events.sort((a, b) => a.date - b.date)
        }))
        .sort((a, b) => b.eventCount - a.eventCount);
}
