// ============================================================================
// yDance Events - Refactored Architecture
// ============================================================================
// 
// 🚨 ARCHITECTURAL RULES - READ BEFORE MAKING CHANGES 🚨
// 
// 1. NEVER add functions outside the designated modules below
// 2. NEVER duplicate code - use existing patterns
// 3. NEVER create new Supabase clients - use state.supabaseClient
// 4. ALWAYS follow the module structure: CONFIG → STATE → API → VIEWS → ROUTER → INIT
// 5. NEW FEATURES: Add to existing modules, don't create new ones
// 
// 📁 MODULE STRUCTURE:
//   CONFIG    - All settings and constants
//   STATE     - Single source of truth for all data
//   API       - All database/network calls
//   VIEWS     - All HTML rendering and DOM manipulation
//   ROUTER    - Navigation, event handlers, view switching
//   INIT      - Application startup (DO NOT MODIFY)
//
// ============================================================================

// ============================================================================
// 1. CONFIGURATION LAYER
// ============================================================================
// 🎯 PURPOSE: All app settings, API keys, constants
// ✅ ADD HERE: New configuration values, API endpoints, app constants
// ❌ DON'T ADD: Functions, logic, or anything that changes at runtime
// ============================================================================
const CONFIG = {
    supabaseUrl: 'https://rymcfymmigomaytblqml.supabase.co',
    supabaseKey: 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ'
};

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================
// 🎯 PURPOSE: Single source of truth for all app data
// ✅ ADD HERE: New state properties for tracking app data
// ❌ DON'T ADD: Functions, computed values, or DOM references
// ============================================================================
const state = {
    supabaseClient: null,
    currentView: 'events',
    currentTab: 'events',
    eventsData: [],
    djProfilesData: [],
    selectedDJ: null,
    currentDJProfile: null,
    venuesData: [],
    soundSystemsData: [],
    friendsData: []
};

// ============================================================================
// 3. DATA LAYER (API Module)
// ============================================================================
// 🎯 PURPOSE: All database/network calls and data fetching
// ✅ ADD HERE: New API methods, database queries, external API calls
// ❌ DON'T ADD: DOM manipulation, rendering, or UI logic
// 
// 📋 TEMPLATE FOR NEW API METHODS:
//   async fetchNewData() {
//       try {
//           const { data, error } = await state.supabaseClient
//               .from('table_name')
//               .select('*');
//           if (error) throw error;
//           return data;
//       } catch (error) {
//           console.error('Error fetching new data:', error);
//           throw error;
//       }
//   }
// ============================================================================
const api = {
    async init() {
        console.log('Initializing Supabase client...');
        console.log('URL:', CONFIG.supabaseUrl);
        console.log('Key:', CONFIG.supabaseKey.substring(0, 20) + '...');
        
        try {
            state.supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
            console.log('Supabase client created successfully');
            return true;
        } catch (error) {
            console.error('Error creating Supabase client:', error);
            return false;
        }
    },

    async fetchEvents() {
        console.log('Loading events from database...');
        
        try {
            // Try different table names
            let events = null;
            let error = null;
            
            // First try 'Events' (capital E)
            console.log('Trying Events table...');
            const result1 = await state.supabaseClient.from('Events').select('*').order('date', { ascending: true });
            
            if (result1.error) {
                console.log('Events table failed:', result1.error.message);
                
                // Try 'events' (lowercase)
                console.log('Trying events table...');
                const result2 = await state.supabaseClient.from('events').select('*').order('date', { ascending: true });
                
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
            
            if (error) {
                console.error('Error loading events:', error);
                throw error;
            }
            
            state.eventsData = events || [];
            console.log('Events loaded successfully:', state.eventsData.length);
            return state.eventsData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchDJProfiles() {
        console.log('Loading DJ profiles from database...');
        
        try {
            const { data: profiles, error } = await state.supabaseClient
                .from('dj_profiles')
                .select('*')
                .order('name', { ascending: true });
            
            console.log('DJ profiles query result:', { profiles, error });
            
            if (error) {
                console.error('Error loading DJ profiles:', error);
                throw error;
            }
            
            state.djProfilesData = profiles || [];
            console.log('DJ profiles loaded successfully:', state.djProfilesData.length);
            return state.djProfilesData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchDJProfile(djName) {
        console.log('Loading individual DJ profile for:', djName);
        
        try {
            const { data: profile, error } = await state.supabaseClient
                .from('dj_profiles')
                .select('*')
                .eq('name', djName)
                .single();
            
            console.log('DJ profile query result:', { profile, error });
            
            if (error) {
                console.error('Error loading DJ profile:', error);
                throw error;
            }
            
            state.currentDJProfile = profile;
            console.log('DJ profile loaded successfully:', profile);
            return profile;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchVenues() {
        console.log('Loading venues from database...');
        
        try {
            // For now, return placeholder data until venues table is created
            const placeholderVenues = [
                {
                    id: 1,
                    name: "The Warehouse",
                    location: "Industrial District",
                    capacity: 500,
                    soundSystem: "BassBoom Pro",
                    about: "Iconic warehouse venue known for underground electronic music",
                    address: "123 Industrial Way",
                    website: "warehouse-venue.com"
                },
                {
                    id: 2,
                    name: "Skyline Rooftop",
                    location: "Downtown",
                    capacity: 200,
                    soundSystem: "Crystal Clear Audio",
                    about: "Rooftop venue with stunning city views and premium sound",
                    address: "456 Skyline Blvd",
                    website: "skyline-rooftop.com"
                },
                {
                    id: 3,
                    name: "Underground Club",
                    location: "Arts Quarter",
                    capacity: 150,
                    soundSystem: "Deep Bass Systems",
                    about: "Intimate underground space for experimental electronic music",
                    address: "789 Arts Street",
                    website: "underground-club.com"
                }
            ];
            
            state.venuesData = placeholderVenues;
            console.log('Venues loaded successfully:', state.venuesData.length);
            return state.venuesData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchSoundSystems() {
        console.log('Loading sound systems from database...');
        
        try {
            // For now, return placeholder data until sound systems table is created
            const placeholderSoundSystems = [
                {
                    id: 1,
                    name: "BassBoom Pro",
                    brand: "AudioTech",
                    power: "5000W",
                    type: "Full Range System",
                    about: "Professional-grade sound system known for deep bass and crystal clear highs",
                    features: ["Subwoofers", "Tweeters", "Amplifiers", "Mixer"],
                    venues: ["The Warehouse", "Underground Club"]
                },
                {
                    id: 2,
                    name: "Crystal Clear Audio",
                    brand: "SoundMaster",
                    power: "3000W",
                    type: "High-End System",
                    about: "Premium sound system delivering pristine audio quality for intimate venues",
                    features: ["Active Speakers", "Digital Processing", "Wireless Control"],
                    venues: ["Skyline Rooftop"]
                },
                {
                    id: 3,
                    name: "Deep Bass Systems",
                    brand: "BassTech",
                    power: "8000W",
                    type: "Heavy Bass System",
                    about: "Powerful bass-focused system designed for underground electronic music",
                    features: ["Massive Subwoofers", "Bass Amplifiers", "EQ Processing"],
                    venues: ["Underground Club", "The Warehouse"]
                }
            ];
            
            state.soundSystemsData = placeholderSoundSystems;
            console.log('Sound systems loaded successfully:', state.soundSystemsData.length);
            return state.soundSystemsData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchFriends() {
        console.log('Loading friends data from database...');
        
        try {
            // For now, return placeholder data until friends table is created
            const placeholderFriends = [
                {
                    id: 1,
                    name: "Alice Johnson",
                    username: "@alice_music",
                    avatar: "👩‍🎤",
                    eventsAttending: 3,
                    favoriteGenres: ["Techno", "House"],
                    about: "Electronic music enthusiast and event organizer",
                    mutualFriends: 12,
                    lastActive: "2 hours ago"
                },
                {
                    id: 2,
                    name: "Bob Chen",
                    username: "@bob_bass",
                    avatar: "👨‍🎧",
                    eventsAttending: 5,
                    favoriteGenres: ["Dubstep", "Drum & Bass"],
                    about: "Bass music lover and sound engineer",
                    mutualFriends: 8,
                    lastActive: "1 day ago"
                },
                {
                    id: 3,
                    name: "Charlie Rodriguez",
                    username: "@charlie_beat",
                    avatar: "👨‍🎵",
                    eventsAttending: 2,
                    favoriteGenres: ["Progressive House", "Trance"],
                    about: "Melodic electronic music fan",
                    mutualFriends: 15,
                    lastActive: "3 hours ago"
                }
            ];
            
            state.friendsData = placeholderFriends;
            console.log('Friends data loaded successfully:', state.friendsData.length);
            return state.friendsData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
};

// ============================================================================
// 4. VIEW LAYER (Rendering Module)
// ============================================================================
// 🎯 PURPOSE: All HTML rendering, DOM manipulation, and UI updates
// ✅ ADD HERE: New rendering functions, DOM updates, UI components
// ❌ DON'T ADD: API calls, business logic, or navigation
// 
// 📋 TEMPLATE FOR NEW RENDERING FUNCTIONS:
//   renderNewComponent(data) {
//       const container = document.getElementById('container-id');
//       if (!container) {
//           console.error('Container not found!');
//           return;
//       }
//       container.innerHTML = data.map(item => this.createItemCard(item)).join('');
//   }
// 
//   createItemCard(item) {
//       return `<div class="item-card">${item.name}</div>`;
//   }
// ============================================================================
const views = {
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div class="loading">Loading...</div>';
        }
    },

    showError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<p class="error">Error: ${message}</p>`;
        }
    },

    createEventCard(event) {
        return `
            <div class="event-card">
                <h2>${event.title}</h2>
                <p class="date">${event.date}</p>
                <p class="location">${event.location}</p>
                <p class="type">${event.type}</p>
                <p class="music">${event.music}</p>
                <p class="dj">DJ: <span class="dj-name" onclick="router.showDJProfileView('${event.dj}')" style="color: #007bff; cursor: pointer; text-decoration: underline;">${event.dj}</span></p>
                <p class="friends-attending">👥 ${event.friendsGoing || 0}/${event.attending || 0} friends going</p>
                <button class="learn-more">Learn More</button>
            </div>
        `;
    },

    createDJCard(profile) {
        return `
            <div class="dj-card" onclick="router.showDJProfileView('${profile.name}')" style="cursor: pointer;">
                <h3 class="dj-name">🎧 ${profile.name}</h3>
                <p class="dj-pubkey">🔑 ${profile.pubkey}</p>
                <p class="dj-about">${profile.about || 'Electronic music artist'}</p>
                <div class="dj-social">
                    ${profile.soundcloud ? `<p>🎵 SoundCloud: <a href="https://soundcloud.com/${profile.soundcloud}" target="_blank" onclick="event.stopPropagation()">${profile.soundcloud}</a></p>` : ''}
                    ${profile.instagram ? `<p>📸 Instagram: <a href="https://instagram.com/${profile.instagram.replace('@', '')}" target="_blank" onclick="event.stopPropagation()">${profile.instagram}</a></p>` : ''}
                </div>
                <p class="click-hint">Click to view full profile</p>
            </div>
        `;
    },

    renderEvents(events) {
        const container = document.getElementById('events-container');
        if (!container) {
            console.error('Events container not found!');
            return;
        }

        if (!events || events.length === 0) {
            container.innerHTML = '<p>No events found in database.</p>';
            return;
        }

        // Clear container and add events
        container.innerHTML = events.map(this.createEventCard).join('');
        
        // Add event listeners to all buttons
        document.querySelectorAll('.learn-more').forEach(button => {
            button.addEventListener('click', function() {
                const eventTitle = this.parentElement.querySelector('h2').textContent;
                alert(`Welcome to ${eventTitle}! 🎵\n\nGet ready for an amazing night!`);
            });
        });
        
        console.log('Events rendered successfully!');
    },

    renderDJProfiles(profiles, highlightName = null) {
        const container = document.getElementById('dj-profiles-container');
        if (!container) {
            console.error('DJ profiles container not found!');
            return;
        }

        if (!profiles || profiles.length === 0) {
            container.innerHTML = '<p>No DJ profiles found.</p>';
            return;
        }

        // Create DJ cards
        const cardsHTML = profiles.map(this.createDJCard).join('');
        container.innerHTML = cardsHTML;
        
        console.log('DJ profiles rendered successfully!');
        
        // Highlight specific DJ if requested
        if (highlightName) {
            setTimeout(() => this.highlightDJ(highlightName), 100);
        }
    },

    highlightDJ(djName) {
        const cards = document.querySelectorAll('#dj-profiles-container .dj-card');
        cards.forEach(card => {
            const nameElement = card.querySelector('.dj-name');
            if (nameElement && nameElement.textContent.includes(djName)) {
                card.style.backgroundColor = '#e3f2fd';
                card.style.border = '2px solid #007bff';
                setTimeout(() => {
                    card.style.backgroundColor = '';
                    card.style.border = '';
                }, 3000);
            }
        });
    },

    renderDJProfile(profile) {
        const container = document.getElementById('dj-profile-container');
        if (!container) {
            console.error('DJ profile container not found!');
            return;
        }

        if (!profile) {
            container.innerHTML = '<p>DJ profile not found.</p>';
            return;
        }

        // Create detailed DJ profile HTML
        container.innerHTML = `
            <div class="dj-profile-card">
                <div class="dj-profile-header">
                    <h1 class="dj-profile-name">🎧 ${profile.name}</h1>
                    <p class="dj-profile-pubkey">🔑 ${profile.pubkey}</p>
                </div>
                
                <div class="dj-profile-content">
                    <div class="dj-profile-about">
                        <h3>About</h3>
                        <p>${profile.about || 'Electronic music artist'}</p>
                    </div>
                    
                    <div class="dj-profile-social">
                        <h3>Connect</h3>
                        <div class="social-links">
                            ${profile.soundcloud ? `
                                <a href="https://soundcloud.com/${profile.soundcloud}" target="_blank" class="social-link soundcloud">
                                    🎵 SoundCloud: ${profile.soundcloud}
                                </a>
                            ` : ''}
                            ${profile.instagram ? `
                                <a href="https://instagram.com/${profile.instagram.replace('@', '')}" target="_blank" class="social-link instagram">
                                    📸 Instagram: ${profile.instagram}
                                </a>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="dj-profile-badges">
                        <h3>Badges</h3>
                        <div class="badges-container">
                            <span class="badge nostr-ready">Nostr Ready</span>
                            <!-- Future badge system will add more badges here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('DJ profile rendered successfully!');
    },

    createVenueCard(venue) {
        return `
            <div class="venue-card" onclick="router.showVenueDetails('${venue.name}')" style="cursor: pointer;">
                <h3 class="venue-name">🏢 ${venue.name}</h3>
                <p class="venue-location">📍 ${venue.location}</p>
                <p class="venue-capacity">👥 Capacity: ${venue.capacity}</p>
                <p class="venue-sound">🔊 Sound: ${venue.soundSystem}</p>
                <p class="venue-about">${venue.about}</p>
                <p class="click-hint">Click to view venue details</p>
            </div>
        `;
    },

    renderVenues(venues) {
        const container = document.getElementById('venues-container');
        if (!container) {
            console.error('Venues container not found!');
            return;
        }

        if (!venues || venues.length === 0) {
            container.innerHTML = '<p>No venues found.</p>';
            return;
        }

        // Create venue cards
        const cardsHTML = venues.map(this.createVenueCard).join('');
        container.innerHTML = cardsHTML;
        
        console.log('Venues rendered successfully!');
    },

    renderVenueDetails(venue) {
        const container = document.getElementById('venue-details-container');
        if (!container) {
            console.error('Venue details container not found!');
            return;
        }

        if (!venue) {
            container.innerHTML = '<p>Venue details not found.</p>';
            return;
        }

        // Create detailed venue HTML
        container.innerHTML = `
            <div class="venue-details-card">
                <div class="venue-details-header">
                    <h1 class="venue-details-name">🏢 ${venue.name}</h1>
                    <p class="venue-details-location">📍 ${venue.location}</p>
                </div>
                
                <div class="venue-details-content">
                    <div class="venue-details-info">
                        <h3>Venue Information</h3>
                        <p><strong>Capacity:</strong> ${venue.capacity} people</p>
                        <p><strong>Address:</strong> ${venue.address}</p>
                        <p><strong>About:</strong> ${venue.about}</p>
                    </div>
                    
                    <div class="venue-details-sound">
                        <h3>Sound System</h3>
                        <p><strong>System:</strong> ${venue.soundSystem}</p>
                        <p>This venue is known for its premium sound quality.</p>
                    </div>
                    
                    <div class="venue-details-links">
                        <h3>Links</h3>
                        <a href="https://${venue.website}" target="_blank" class="venue-website-link">
                            🌐 Visit Venue Website
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Venue details rendered successfully!');
    },

    createSoundSystemCard(soundSystem) {
        return `
            <div class="sound-system-card" onclick="router.showSoundSystemDetails('${soundSystem.name}')" style="cursor: pointer;">
                <h3 class="sound-system-name">🔊 ${soundSystem.name}</h3>
                <p class="sound-system-brand">🏷️ ${soundSystem.brand}</p>
                <p class="sound-system-power">⚡ Power: ${soundSystem.power}</p>
                <p class="sound-system-type">🎵 Type: ${soundSystem.type}</p>
                <p class="sound-system-about">${soundSystem.about}</p>
                <div class="sound-system-features">
                    <strong>Features:</strong> ${soundSystem.features.join(', ')}
                </div>
                <p class="click-hint">Click to view sound system details</p>
            </div>
        `;
    },

    renderSoundSystems(soundSystems) {
        const container = document.getElementById('sound-systems-container');
        if (!container) {
            console.error('Sound systems container not found!');
            return;
        }

        if (!soundSystems || soundSystems.length === 0) {
            container.innerHTML = '<p>No sound systems found.</p>';
            return;
        }

        // Create sound system cards
        const cardsHTML = soundSystems.map(this.createSoundSystemCard).join('');
        container.innerHTML = cardsHTML;
        
        console.log('Sound systems rendered successfully!');
    },

    renderSoundSystemDetails(soundSystem) {
        const container = document.getElementById('sound-system-details-container');
        if (!container) {
            console.error('Sound system details container not found!');
            return;
        }

        if (!soundSystem) {
            container.innerHTML = '<p>Sound system details not found.</p>';
            return;
        }

        // Create detailed sound system HTML
        container.innerHTML = `
            <div class="sound-system-details-card">
                <div class="sound-system-details-header">
                    <h1 class="sound-system-details-name">🔊 ${soundSystem.name}</h1>
                    <p class="sound-system-details-brand">🏷️ ${soundSystem.brand}</p>
                </div>
                
                <div class="sound-system-details-content">
                    <div class="sound-system-details-specs">
                        <h3>Specifications</h3>
                        <p><strong>Power:</strong> ${soundSystem.power}</p>
                        <p><strong>Type:</strong> ${soundSystem.type}</p>
                        <p><strong>About:</strong> ${soundSystem.about}</p>
                    </div>
                    
                    <div class="sound-system-details-features">
                        <h3>Features</h3>
                        <ul class="features-list">
                            ${soundSystem.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="sound-system-details-venues">
                        <h3>Used At Venues</h3>
                        <div class="venues-list">
                            ${soundSystem.venues.map(venue => `<span class="venue-tag">${venue}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Sound system details rendered successfully!');
    },

    createFriendCard(friend) {
        return `
            <div class="friend-card" onclick="router.showFriendProfile('${friend.name}')" style="cursor: pointer;">
                <div class="friend-avatar">${friend.avatar}</div>
                <h3 class="friend-name">${friend.name}</h3>
                <p class="friend-username">${friend.username}</p>
                <p class="friend-events">🎵 ${friend.eventsAttending} events attending</p>
                <p class="friend-genres">🎧 ${friend.favoriteGenres.join(', ')}</p>
                <p class="friend-mutual">👥 ${friend.mutualFriends} mutual friends</p>
                <p class="friend-active">🟢 ${friend.lastActive}</p>
                <p class="click-hint">Click to view friend profile</p>
            </div>
        `;
    },

    renderFriends(friends) {
        const container = document.getElementById('friends-container');
        if (!container) {
            console.error('Friends container not found!');
            return;
        }

        if (!friends || friends.length === 0) {
            container.innerHTML = '<p>No friends found.</p>';
            return;
        }

        // Create friend cards
        const cardsHTML = friends.map(this.createFriendCard).join('');
        container.innerHTML = cardsHTML;
        
        console.log('Friends rendered successfully!');
    },

    renderFriendProfile(friend) {
        const container = document.getElementById('friend-profile-container');
        if (!container) {
            console.error('Friend profile container not found!');
            return;
        }

        if (!friend) {
            container.innerHTML = '<p>Friend profile not found.</p>';
            return;
        }

        // Create detailed friend HTML
        container.innerHTML = `
            <div class="friend-profile-card">
                <div class="friend-profile-header">
                    <div class="friend-profile-avatar">${friend.avatar}</div>
                    <h1 class="friend-profile-name">${friend.name}</h1>
                    <p class="friend-profile-username">${friend.username}</p>
                </div>
                
                <div class="friend-profile-content">
                    <div class="friend-profile-about">
                        <h3>About</h3>
                        <p>${friend.about}</p>
                    </div>
                    
                    <div class="friend-profile-stats">
                        <h3>Activity</h3>
                        <p><strong>Events Attending:</strong> ${friend.eventsAttending}</p>
                        <p><strong>Mutual Friends:</strong> ${friend.mutualFriends}</p>
                        <p><strong>Last Active:</strong> ${friend.lastActive}</p>
                    </div>
                    
                    <div class="friend-profile-genres">
                        <h3>Favorite Genres</h3>
                        <div class="genres-list">
                            ${friend.favoriteGenres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Friend profile rendered successfully!');
    }
};

// ============================================================================
// 5. ROUTER/CONTROLLER LAYER
// ============================================================================
// 🎯 PURPOSE: Navigation, event handlers, view switching, user interactions
// ✅ ADD HERE: New routes, event listeners, navigation logic
// ❌ DON'T ADD: API calls, rendering, or business logic
// 
// 📋 TEMPLATE FOR NEW ROUTES:
//   async showNewView(parameter = null) {
//       console.log('Switching to new view', parameter ? `with ${parameter}` : '');
//       state.currentView = 'new-view';
//       document.getElementById('old-view').style.display = 'none';
//       document.getElementById('new-view').style.display = 'block';
//       
//       if (parameter) {
//           state.selectedParameter = parameter;
//           // Load data if needed
//           if (state.newData.length === 0) {
//               views.showLoading('new-container');
//               try {
//                   const data = await api.fetchNewData();
//                   views.renderNewComponent(data);
//               } catch (error) {
//                   views.showError('new-container', error.message);
//               }
//           }
//       }
//   }
// ============================================================================
const router = {
    showEventsView() {
        console.log('Switching to events view');
        this.switchTab('events');
    },

    async showDJView(djName = null) {
        console.log('Switching to DJ view', djName ? `for ${djName}` : '');
        this.switchTab('djs');
        
        // Highlight specific DJ if requested
        if (djName) {
            state.selectedDJ = djName;
            setTimeout(() => views.highlightDJ(djName), 100);
        }
    },

    async showDJProfileView(djName) {
        console.log('Switching to DJ profile view for:', djName);
        state.currentView = 'dj-profile';
        state.selectedDJ = djName;
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'block';
        
        // Update the title
        const titleElement = document.getElementById('dj-profile-title');
        if (titleElement) {
            titleElement.textContent = `${djName} - Profile`;
        }
        
        // Load and render the DJ profile
        views.showLoading('dj-profile-container');
        try {
            const profile = await api.fetchDJProfile(djName);
            views.renderDJProfile(profile);
        } catch (error) {
            views.showError('dj-profile-container', error.message);
        }
    },

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        state.currentTab = tabName;
        
        // Update tab button states
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Hide all views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('venue-details-view').style.display = 'none';
        document.getElementById('venues-view').style.display = 'none';
        document.getElementById('sound-system-details-view').style.display = 'none';
        document.getElementById('sound-systems-view').style.display = 'none';
        document.getElementById('friend-profile-view').style.display = 'none';
        document.getElementById('friends-view').style.display = 'none';
        
        // Show the selected tab's view
        switch(tabName) {
            case 'events':
                document.getElementById('events-view').style.display = 'block';
                state.currentView = 'events';
                break;
            case 'djs':
                document.getElementById('dj-view').style.display = 'block';
                state.currentView = 'dj';
                // Load DJ profiles if not already loaded
                if (state.djProfilesData.length === 0) {
                    views.showLoading('dj-profiles-container');
                    api.fetchDJProfiles().then(profiles => {
                        views.renderDJProfiles(profiles);
                    }).catch(error => {
                        views.showError('dj-profiles-container', error.message);
                    });
                } else {
                    views.renderDJProfiles(state.djProfilesData);
                }
                break;
            case 'venues':
                document.getElementById('venues-view').style.display = 'block';
                state.currentView = 'venues';
                // Load venues if not already loaded
                if (state.venuesData.length === 0) {
                    views.showLoading('venues-container');
                    api.fetchVenues().then(venues => {
                        views.renderVenues(venues);
                    }).catch(error => {
                        views.showError('venues-container', error.message);
                    });
                } else {
                    views.renderVenues(state.venuesData);
                }
                break;
            case 'sound-systems':
                document.getElementById('sound-systems-view').style.display = 'block';
                state.currentView = 'sound-systems';
                // Load sound systems if not already loaded
                if (state.soundSystemsData.length === 0) {
                    views.showLoading('sound-systems-container');
                    api.fetchSoundSystems().then(soundSystems => {
                        views.renderSoundSystems(soundSystems);
                    }).catch(error => {
                        views.showError('sound-systems-container', error.message);
                    });
                } else {
                    views.renderSoundSystems(state.soundSystemsData);
                }
                break;
            case 'friends':
                document.getElementById('friends-view').style.display = 'block';
                state.currentView = 'friends';
                // Load friends if not already loaded
                if (state.friendsData.length === 0) {
                    views.showLoading('friends-container');
                    api.fetchFriends().then(friends => {
                        views.renderFriends(friends);
                    }).catch(error => {
                        views.showError('friends-container', error.message);
                    });
                } else {
                    views.renderFriends(state.friendsData);
                }
                break;
        }
    },

    async showVenueDetails(venueName) {
        console.log('Switching to venue details view for:', venueName);
        state.currentView = 'venue-details';
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('venue-details-view').style.display = 'block';
        document.getElementById('venues-view').style.display = 'none';
        document.getElementById('sound-systems-view').style.display = 'none';
        document.getElementById('friends-view').style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('venue-details-title');
        if (titleElement) {
            titleElement.textContent = `${venueName} - Details`;
        }
        
        // Find and render the venue details
        const venue = state.venuesData.find(v => v.name === venueName);
        if (venue) {
            views.renderVenueDetails(venue);
        } else {
            views.showError('venue-details-container', 'Venue not found');
        }
    },

    async showSoundSystemDetails(soundSystemName) {
        console.log('Switching to sound system details view for:', soundSystemName);
        state.currentView = 'sound-system-details';
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('venue-details-view').style.display = 'none';
        document.getElementById('venues-view').style.display = 'none';
        document.getElementById('sound-system-details-view').style.display = 'block';
        document.getElementById('sound-systems-view').style.display = 'none';
        document.getElementById('friends-view').style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('sound-system-details-title');
        if (titleElement) {
            titleElement.textContent = `${soundSystemName} - Details`;
        }
        
        // Find and render the sound system details
        const soundSystem = state.soundSystemsData.find(s => s.name === soundSystemName);
        if (soundSystem) {
            views.renderSoundSystemDetails(soundSystem);
        } else {
            views.showError('sound-system-details-container', 'Sound system not found');
        }
    },

    async showFriendProfile(friendName) {
        console.log('Switching to friend profile view for:', friendName);
        state.currentView = 'friend-profile';
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('venue-details-view').style.display = 'none';
        document.getElementById('venues-view').style.display = 'none';
        document.getElementById('sound-system-details-view').style.display = 'none';
        document.getElementById('sound-systems-view').style.display = 'none';
        document.getElementById('friend-profile-view').style.display = 'block';
        document.getElementById('friends-view').style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('friend-profile-title');
        if (titleElement) {
            titleElement.textContent = `${friendName} - Profile`;
        }
        
        // Find and render the friend profile
        const friend = state.friendsData.find(f => f.name === friendName);
        if (friend) {
            views.renderFriendProfile(friend);
        } else {
            views.showError('friend-profile-container', 'Friend not found');
        }
    },

    init() {
        console.log('Setting up navigation...');
        
        // Back to events button
        const backButton = document.getElementById('back-to-events');
        if (backButton) {
            backButton.addEventListener('click', this.showEventsView);
        }
        
        // Back to DJ list button
        const backToDJListButton = document.getElementById('back-to-dj-list');
        if (backToDJListButton) {
            backToDJListButton.addEventListener('click', () => this.showDJView());
        }
        
        // Back to venues button
        const backToVenuesButton = document.getElementById('back-to-venues');
        if (backToVenuesButton) {
            backToVenuesButton.addEventListener('click', () => this.switchTab('venues'));
        }
        
        // Back to sound systems button
        const backToSoundSystemsButton = document.getElementById('back-to-sound-systems');
        if (backToSoundSystemsButton) {
            backToSoundSystemsButton.addEventListener('click', () => this.switchTab('sound-systems'));
        }
        
        // Back to friends button
        const backToFriendsButton = document.getElementById('back-to-friends');
        if (backToFriendsButton) {
            backToFriendsButton.addEventListener('click', () => this.switchTab('friends'));
        }
        
        // Tab button event listeners
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        console.log('Navigation setup complete');
    }
};

// ============================================================================
// 6. INITIALIZATION
// ============================================================================
// 🚨 DO NOT MODIFY THIS SECTION 🚨
// This orchestrates the entire app startup sequence
// If you need to add startup logic, add it to the appropriate module above
// ============================================================================
async function init() {
    console.log('Initializing yDance Events app...');
    
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded');
        views.showError('events-container', 'Supabase library failed to load');
        return;
    }
    
    // Initialize API
    const apiInitialized = await api.init();
    if (!apiInitialized) {
        views.showError('events-container', 'Failed to connect to database');
        return;
    }
    
    // Set up navigation
    router.init();
    
    // Load initial events
    views.showLoading('events-container');
    try {
        const events = await api.fetchEvents();
        views.renderEvents(events);
    } catch (error) {
        views.showError('events-container', error.message);
    }
    
    console.log('yDance Events app initialized successfully!');
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ============================================================================
// 🚨 END OF ARCHITECTURE - DO NOT ADD CODE BELOW THIS LINE 🚨
// ============================================================================
// 
// If you need to add new functionality:
// 1. Add configuration to CONFIG object
// 2. Add state properties to state object  
// 3. Add API methods to api object
// 4. Add rendering functions to views object
// 5. Add navigation logic to router object
// 
// NEVER add functions outside these modules!
// ============================================================================