// Wait for Supabase to fully load
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded');
        document.getElementById('events-container').innerHTML = '<p>Supabase library failed to load</p>';
        return;
    }
    
    // Supabase configuration
    const supabaseUrl = 'https://rymcfymmigomaytblqml.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bWNmeW1taWdvbWF5dGJscW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjcxNzEsImV4cCI6MjA3NzAwMzE3MX0.gjjBPhgNap7VsjZ-SFInVLGzPbPcZC-UEF5F7pQ8-tg';
    
    console.log('Creating Supabase client...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey.substring(0, 20) + '...');
    
    try {
        // Create Supabase client
        const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        console.log('Supabase client created successfully');
        
        // Load events
        loadEvents(supabaseClient);
        
        // Create DJ profiles from existing events
        createDJProfilesFromEvents(supabaseClient);
        
        // Test DJ profiles loading
        loadDJProfiles(supabaseClient);
        
    } catch (error) {
        console.error('Error creating Supabase client:', error);
        document.getElementById('events-container').innerHTML = '<p>Error connecting to database</p>';
    }
});

// Function to create an event card
function createEventCard(event) {
    return `
        <div class="event-card">
            <h2>${event.title}</h2>
            <p class="date">${event.date}</p>
            <p class="location">${event.location}</p>
            <p class="type">${event.type}</p>
            <p class="music">${event.music}</p>
            <p class="dj">${event.dj}</p>
            <button class="learn-more">Learn More</button>
        </div>
    `
}

// Function to load events from database
async function loadEvents(supabaseClient) {
    console.log('Loading events from database...');
    
    try {
        // Try different table names
        let events = null;
        let error = null;
        
        // First try 'Events' (capital E)
        console.log('Trying Events table...');
        const result1 = await supabaseClient.from('Events').select('*').order('date', { ascending: true });
        
        if (result1.error) {
            console.log('Events table failed:', result1.error.message);
            
            // Try 'events' (lowercase)
            console.log('Trying events table...');
            const result2 = await supabaseClient.from('events').select('*').order('date', { ascending: true });
            
            if (result2.error) {
                console.log('events table failed:', result2.error.message);
                error = result2.error;
            } else {
                events = result2.data;
                console.log('Found events in lowercase table:', events.length);
            }
        } else {
            events = result1.data;
            console.log('Found events in capital table:', events.length);
        }
        
        console.log('Final events:', events);
        console.log('Final error:', error);
        
        if (error) {
            console.error('Error loading events:', error);
            document.getElementById('events-container').innerHTML = '<p>Error: ' + error.message + '</p>';
            return;
        }
        
        if (!events || events.length === 0) {
            console.log('No events found');
            document.getElementById('events-container').innerHTML = '<p>No events found in database.</p>';
            return;
        }
        
        // Clear container and add events
        const container = document.getElementById('events-container');
        container.innerHTML = events.map(createEventCard).join('');
        
        // Add event listeners to all buttons
        document.querySelectorAll('.learn-more').forEach(button => {
            button.addEventListener('click', function() {
                const eventTitle = this.parentElement.querySelector('h2').textContent;
                alert(`Welcome to ${eventTitle}! 🎵\n\nGet ready for an amazing night!`);
            });
        });
        
        console.log('Events loaded successfully!');
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('events-container').innerHTML = '<p>Error loading events. Check console for details.</p>';
    }
}

// Function to load DJ profiles (for testing)
async function loadDJProfiles(supabaseClient) {
    console.log('Loading DJ profiles...');
    
    try {
        const { data: profiles, error } = await supabaseClient
            .from('dj_profiles')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) {
            console.error('Error loading DJ profiles:', error);
            return;
        }
        
        console.log('DJ Profiles loaded:', profiles);
        return profiles;
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function to extract unique DJ names from events and create profiles
async function createDJProfilesFromEvents(supabaseClient) {
    console.log('Extracting DJ names from events...');
    
    try {
        // Get all events
        const { data: events, error: eventsError } = await supabaseClient
            .from('Events')
            .select('dj')
            .not('dj', 'is', null);
        
        if (eventsError) {
            console.error('Error loading events:', eventsError);
            return;
        }
        
        // Extract unique DJ names
        const uniqueDJNames = [...new Set(events.map(event => event.dj))];
        console.log('Unique DJ names found:', uniqueDJNames);
        
        // Check which DJs already exist in profiles
        const { data: existingProfiles, error: profilesError } = await supabaseClient
            .from('dj_profiles')
            .select('name');
        
        if (profilesError) {
            console.error('Error loading existing profiles:', profilesError);
            return;
        }
        
        const existingNames = existingProfiles.map(profile => profile.name);
        const newDJNames = uniqueDJNames.filter(name => !existingNames.includes(name));
        
        console.log('New DJ names to create:', newDJNames);
        
        // Create profiles for new DJs
        if (newDJNames.length > 0) {
            const newProfiles = newDJNames.map((name, index) => ({
                pubkey: `npub1${name.toLowerCase().replace(/\s+/g, '')}${index + 100}`,
                name: name,
                about: `${name} - Electronic music artist`,
                picture: `${name.toLowerCase().replace(/\s+/g, '')}.jpg`,
                soundcloud: `${name.toLowerCase().replace(/\s+/g, '')}-official`,
                instagram: `@${name.toLowerCase().replace(/\s+/g, '')}`
            }));
            
            const { data: insertedProfiles, error: insertError } = await supabaseClient
                .from('dj_profiles')
                .insert(newProfiles)
                .select();
            
            if (insertError) {
                console.error('Error inserting new profiles:', insertError);
            } else {
                console.log('New DJ profiles created:', insertedProfiles);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}
