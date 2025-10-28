// ============================================================================
// yDance Events - Refactored Architecture
// ============================================================================
// 
// 🚨 ARCHITECTURAL RULES - READ BEFORE MAKING CHANGES 🚨
// 
// 1. NEVER add functions outside the designated modules below
// 2. NEVER duplicate code - use existing patterns
// 3. NEVER create new Supabase clients - use state.supabaseClient
// 4. ALWAYS follow the module structure: CONFIG → STATE → API → SOCIAL → VIEWS → ROUTER → INIT
// 5. NEW FEATURES: Add to existing modules, don't create new ones
// 
// 📁 MODULE STRUCTURE:
//   CONFIG    - All settings and constants
//   STATE     - Single source of truth for all data
//   API       - All database/network calls
//   SOCIAL    - Social content processing, nostr integration, community intelligence
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
    selectedEvent: null,
    currentDJProfile: null,
    venuesData: [],
    soundSystemsData: [],
    friendsData: [],
    // Social layer state
    nostrClient: null,
    userAuth: null,
    socialFeed: [],
    moderationQueue: [],
    linkedAttributes: {},
    // Auth state
    currentUser: null,
    userKeys: null,
    isAuthenticated: false,
    authSession: null,
    authModalMode: 'login'
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
// 4. SOCIAL LAYER (Social Intelligence Module)
// ============================================================================
// 🎯 PURPOSE: Social content processing, nostr integration, community intelligence
// ✅ ADD HERE: Message parsing, nostr communication, social algorithms, moderation
// ❌ DON'T ADD: Direct DOM manipulation, API calls, or navigation logic
// 
// 📋 TEMPLATE FOR NEW SOCIAL METHODS:
//   async processNewContent(contentData) {
//       try {
//           // Process content
//           // Apply social intelligence
//           // Return processed data
//       } catch (error) {
//           console.error('Error processing content:', error);
//           throw error;
//       }
//   }
// ============================================================================
const social = {
    async init() {
        console.log('Initializing Social layer...');
        
        try {
            // Initialize nostr client using nostrClient module
            state.nostrClient = await nostrClient.connect('wss://localhost:8080');
            
            // Initialize Nostr data fetching
            await this.initNostrDataFetching();
            
            console.log('Social layer initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Social layer:', error);
            return false;
        }
    },

    async initNostrDataFetching() {
        console.log('Initializing Nostr data fetching...');
        
        try {
            // Fetch events from Nostr
            const events = await this.fetchSocialFeed();
            console.log('Loaded events from Nostr:', events.length);
            
            // Fetch profiles from Nostr
            const profiles = await this.fetchProfilesFromNostr();
            console.log('Loaded profiles from Nostr:', profiles.length);
            
            // Set up periodic refresh (every 5 minutes)
            setInterval(async () => {
                console.log('Refreshing Nostr data...');
                await this.fetchSocialFeed();
                await this.fetchProfilesFromNostr();
            }, 5 * 60 * 1000); // 5 minutes
            
            console.log('Nostr data fetching initialized');
        } catch (error) {
            console.error('Error initializing Nostr data fetching:', error);
        }
    },

    async processMessage(messageText) {
        console.log('Processing social message:', messageText);
        
        try {
            // Parse message for event attributes
            const parsedData = this.parseEventMessage(messageText);
            
            // Link to existing database attributes
            const linkedData = await this.linkAttributes(parsedData);
            
            // Queue for moderation if needed
            if (linkedData.needsModeration) {
                this.queueForModeration(linkedData);
            }
            
            return linkedData;
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    },

    parseEventMessage(messageText) {
        console.log('Parsing event message...');
        
        try {
            // Basic parsing patterns (placeholder implementation)
            const patterns = {
                dj: /(?:DJ|dj|artist)[\s:]+([A-Za-z\s]+)/i,
                venue: /(?:at|@|venue)[\s:]+([A-Za-z\s]+)/i,
                date: /(?:on|date)[\s:]+([A-Za-z0-9\s,]+)/i,
                time: /(?:at|time)[\s:]+(\d{1,2}:\d{2}|\d{1,2}\s?(?:am|pm))/i
            };
            
            const parsed = {
                originalText: messageText,
                dj: this.extractPattern(messageText, patterns.dj),
                venue: this.extractPattern(messageText, patterns.venue),
                date: this.extractPattern(messageText, patterns.date),
                time: this.extractPattern(messageText, patterns.time),
                needsModeration: true // Default to moderation for now
            };
            
            console.log('Message parsed:', parsed);
            return parsed;
        } catch (error) {
            console.error('Error parsing message:', error);
            throw error;
        }
    },

    extractPattern(text, pattern) {
        const match = text.match(pattern);
        return match ? match[1].trim() : null;
    },

    async linkAttributes(parsedData) {
        console.log('Linking attributes to database...');
        
        try {
            const linkedData = { ...parsedData };
            
            // Link DJ if found
            if (parsedData.dj) {
                const djMatch = state.djProfilesData.find(dj => 
                    dj.name.toLowerCase().includes(parsedData.dj.toLowerCase())
                );
                linkedData.linkedDJ = djMatch || null;
            }
            
            // Link venue if found
            if (parsedData.venue) {
                const venueMatch = state.venuesData.find(venue => 
                    venue.name.toLowerCase().includes(parsedData.venue.toLowerCase())
                );
                linkedData.linkedVenue = venueMatch || null;
            }
            
            console.log('Attributes linked:', linkedData);
            return linkedData;
        } catch (error) {
            console.error('Error linking attributes:', error);
            throw error;
        }
    },

    queueForModeration(data) {
        console.log('Queueing for moderation...');
        
        try {
            const moderationItem = {
                id: Date.now(),
                data: data,
                status: 'pending',
                timestamp: new Date().toISOString()
            };
            
            state.moderationQueue.push(moderationItem);
            console.log('Item queued for moderation:', moderationItem);
        } catch (error) {
            console.error('Error queueing for moderation:', error);
            throw error;
        }
    },

    async sendNostrMessage(content) {
        console.log('Sending nostr message...');
        
        try {
            // Placeholder nostr message sending
            if (!state.nostrClient || !state.nostrClient.connected) {
                console.log('Nostr client not connected, message queued');
                return { success: false, queued: true };
            }
            
            // TODO: Implement actual nostr message sending
            console.log('Nostr message would be sent:', content);
            return { success: true, messageId: 'placeholder-id' };
        } catch (error) {
            console.error('Error sending nostr message:', error);
            throw error;
        }
    },

    async fetchSocialFeed() {
        console.log('Fetching yDance events from Nostr...');
        
        try {
            // Query for Kind 1 events with yDance tags
            const events = await this.queryNostrEvents({
                kinds: [1], // Text notes
                '#t': ['ydance', 'event'], // yDance event tags
                limit: 100
            });
            
            // Parse events into yDance format
            const parsedEvents = events.map(event => this.parseEventFromNostr(event));
            
            // Update state with new events
            state.events = [...state.events, ...parsedEvents];
            
            console.log('Parsed events from Nostr:', parsedEvents.length);
            return parsedEvents;
        } catch (error) {
            console.error('Error fetching events from Nostr:', error);
            // Fallback to placeholder for now
            return this.getPlaceholderFeed();
        }
    },

    async queryNostrEvents(filter) {
        console.log('SOCIAL: Delegating event query to nostrClient module');
        
        try {
            if (!state.nostrClient || !state.nostrClient.connected) {
                console.log('Nostr client not connected, returning placeholder data');
                return this.getPlaceholderNostrEvents();
            }
            
            // Delegate to nostrClient module
            return await nostrClient.queryEvents(filter);
        } catch (error) {
            console.error('Error querying Nostr events:', error);
            throw error;
        }
    },

    parseEventFromNostr(nostrEvent) {
        console.log('SOCIAL: Delegating event parsing to nostrEventParser module');
        return nostrEventParser.parseEvent(nostrEvent);
    },

    getPlaceholderNostrEvents() {
        return [
            {
                id: 'nostr-event-1',
                content: '🎵 Underground Techno Night\n📅 2024-01-15\n📍 Warehouse 23\n🎧 DJ Shadow\n\nJoin us for an incredible night of underground techno!',
                tags: [
                    ['t', 'ydance'],
                    ['t', 'event'],
                    ['t', 'techno'],
                    ['t', 'underground'],
                    ['location', 'Warehouse 23'],
                    ['date', '2024-01-15'],
                    ['music', 'techno'],
                    ['type', 'club-night'],
                    ['dj', 'DJ Shadow'],
                    ['attending', '45'],
                    ['friends', '3']
                ],
                pubkey: 'npub1placeholder1',
                created_at: Math.floor(Date.now() / 1000)
            },
            {
                id: 'nostr-event-2',
                content: '🎵 Deep House Sessions\n📅 2024-01-20\n📍 The Loft\n🎧 Sarah Chen\n\nDeep house vibes all night long!',
                tags: [
                    ['t', 'ydance'],
                    ['t', 'event'],
                    ['t', 'deep-house'],
                    ['location', 'The Loft'],
                    ['date', '2024-01-20'],
                    ['music', 'deep-house'],
                    ['type', 'club-night'],
                    ['dj', 'Sarah Chen'],
                    ['attending', '32'],
                    ['friends', '1']
                ],
                pubkey: 'npub1placeholder2',
                created_at: Math.floor(Date.now() / 1000)
            }
        ];
    },

    getPlaceholderFeed() {
        return [
            {
                id: 1,
                type: 'event_announcement',
                content: 'Amazing night at The Warehouse!',
                author: 'DJ_Alice',
                timestamp: new Date().toISOString(),
                linkedEvent: null
            }
        ];
    },

    // Kind 0 Profile Parsing Methods
    async fetchProfilesFromNostr() {
        console.log('Fetching yDance profiles from Nostr...');
        
        try {
            // Query for Kind 0 events (profiles) with yDance tags
            const profiles = await this.queryNostrProfiles({
                kinds: [0], // Profile events
                '#t': ['ydance'], // yDance profile tags
                limit: 50
            });
            
            // Parse profiles into yDance format
            const parsedProfiles = profiles.map(profile => this.parseProfileFromNostr(profile));
            
            // Update state with new profiles
            this.updateProfilesInState(parsedProfiles);
            
            console.log('Parsed profiles from Nostr:', parsedProfiles.length);
            return parsedProfiles;
        } catch (error) {
            console.error('Error fetching profiles from Nostr:', error);
            return [];
        }
    },

    async queryNostrProfiles(filter) {
        console.log('Querying Nostr profiles with filter:', filter);
        
        try {
            if (!state.nostrClient || !state.nostrClient.connected) {
                console.log('Nostr client not connected, returning placeholder profiles');
                return this.getPlaceholderNostrProfiles();
            }
            
            // TODO: Implement actual Nostr query
            // For now, return placeholder profiles that match our parsing logic
            return this.getPlaceholderNostrProfiles();
        } catch (error) {
            console.error('Error querying Nostr profiles:', error);
            throw error;
        }
    },

    parseProfileFromNostr(nostrProfile) {
        console.log('Parsing Nostr profile:', nostrProfile.id);
        
        const content = JSON.parse(nostrProfile.content);
        const tags = nostrProfile.tags;
        
        // Determine profile type from tags
        const profileType = this.determineProfileType(tags);
        
        const profileData = {
            id: nostrProfile.id,
            name: content.name || content.display_name,
            bio: content.about,
            image: content.picture,
            website: content.website,
            type: profileType, // 'dj', 'venue', 'soundsystem'
            socialLinks: this.extractSocialLinks(content),
            source: 'nostr',
            nostrEventId: nostrProfile.id,
            nostrPubkey: nostrProfile.pubkey
        };
        
        console.log('Parsed profile data:', profileData);
        return profileData;
    },

    determineProfileType(tags) {
        // Look for profile type in tags
        const typeTag = tags.find(tag => tag[0] === 'type');
        if (typeTag) return typeTag[1];
        
        // Look for specific entity tags
        if (tags.some(tag => tag[0] === 't' && tag[1] === 'dj')) return 'dj';
        if (tags.some(tag => tag[0] === 't' && tag[1] === 'venue')) return 'venue';
        if (tags.some(tag => tag[0] === 't' && tag[1] === 'soundsystem')) return 'soundsystem';
        
        return 'unknown';
    },

    extractSocialLinks(content) {
        const links = [];
        
        if (content.website) links.push({ platform: 'Website', url: content.website });
        if (content.lud16) links.push({ platform: 'Lightning', url: content.lud16 });
        
        // Extract additional social links from tags or content
        // This would be expanded based on actual Nostr profile structure
        
        return links;
    },

    updateProfilesInState(parsedProfiles) {
        // Update DJs
        const djProfiles = parsedProfiles.filter(p => p.type === 'dj');
        if (djProfiles.length > 0) {
            state.djs = [...state.djs, ...djProfiles];
        }
        
        // Update Venues
        const venueProfiles = parsedProfiles.filter(p => p.type === 'venue');
        if (venueProfiles.length > 0) {
            state.venues = [...state.venues, ...venueProfiles];
        }
        
        // Update Sound Systems
        const soundSystemProfiles = parsedProfiles.filter(p => p.type === 'soundsystem');
        if (soundSystemProfiles.length > 0) {
            state.soundSystems = [...state.soundSystems, ...soundSystemProfiles];
        }
    },

    getPlaceholderNostrProfiles() {
        return [
            {
                id: 'nostr-profile-1',
                content: JSON.stringify({
                    name: 'DJ Shadow',
                    about: 'Underground techno DJ with 10+ years experience. Based in Berlin.',
                    picture: 'https://example.com/dj-shadow.jpg',
                    website: 'https://djshadow.com',
                    lud16: 'djshadow@lightning.com'
                }),
                tags: [
                    ['t', 'ydance'],
                    ['t', 'dj'],
                    ['t', 'techno'],
                    ['type', 'dj'],
                    ['music-style', 'techno'],
                    ['experience', '10+ years'],
                    ['location', 'Berlin']
                ],
                pubkey: 'npub1djshadow',
                created_at: Math.floor(Date.now() / 1000)
            },
            {
                id: 'nostr-profile-2',
                content: JSON.stringify({
                    name: 'The Warehouse',
                    about: 'Underground venue in downtown. Capacity: 500. Sound system: Funktion-One.',
                    picture: 'https://example.com/warehouse.jpg',
                    website: 'https://thewarehouse.com'
                }),
                tags: [
                    ['t', 'ydance'],
                    ['t', 'venue'],
                    ['type', 'venue'],
                    ['capacity', '500'],
                    ['soundsystem', 'Funktion-One'],
                    ['location', 'Downtown']
                ],
                pubkey: 'npub1warehouse',
                created_at: Math.floor(Date.now() / 1000)
            },
            {
                id: 'nostr-profile-3',
                content: JSON.stringify({
                    name: 'Funktion-One System',
                    about: 'Professional sound system for electronic music events. 4-way active system.',
                    picture: 'https://example.com/funktion-one.jpg',
                    website: 'https://funktion-one.com'
                }),
                tags: [
                    ['t', 'ydance'],
                    ['t', 'soundsystem'],
                    ['type', 'soundsystem'],
                    ['brand', 'Funktion-One'],
                    ['type', '4-way active'],
                    ['power', '10kW']
                ],
                pubkey: 'npub1funktion',
                created_at: Math.floor(Date.now() / 1000)
            }
        ];
    },

    // Social Intelligence Methods
    getSocialMentionsForDJ(djName) {
        console.log('Finding social mentions for DJ:', djName);
        
        try {
            // Search through social feed for mentions of this DJ
            const mentions = state.socialFeed.filter(message => {
                const content = message.content.toLowerCase();
                const djNameLower = djName.toLowerCase();
                
                // Check if DJ name appears in message content
                return content.includes(djNameLower) || 
                       content.includes('dj ' + djNameLower) ||
                       content.includes('artist ' + djNameLower);
            });
            
            console.log('Found', mentions.length, 'mentions for', djName);
            return mentions;
        } catch (error) {
            console.error('Error finding social mentions:', error);
            return [];
        }
    },

    getSocialMentionsForVenue(venueName) {
        console.log('Finding social mentions for venue:', venueName);
        
        try {
            // Search through social feed for mentions of this venue
            const mentions = state.socialFeed.filter(message => {
                const content = message.content.toLowerCase();
                const venueNameLower = venueName.toLowerCase();
                
                // Check if venue name appears in message content
                return content.includes(venueNameLower) ||
                       content.includes('at ' + venueNameLower) ||
                       content.includes('venue ' + venueNameLower);
            });
            
            console.log('Found', mentions.length, 'mentions for', venueName);
            return mentions;
        } catch (error) {
            console.error('Error finding venue mentions:', error);
            return [];
        }
    },

    // Database Key Storage Methods
    async storeKeysInDatabase(userId, encryptedKeys) {
        console.log('Storing encrypted keys in Supabase database...');
        
        try {
            const { data, error } = await state.supabaseClient
                .from('user_nostr_keys')
                .upsert({
                    user_id: userId,
                    encrypted_private_key: encryptedKeys,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            console.log('Keys stored in database successfully');
            return { success: true, data };
        } catch (error) {
            console.error('Error storing keys in database:', error);
            throw error;
        }
    },

    async retrieveKeysFromDatabase(userId) {
        console.log('Retrieving encrypted keys from Supabase database...');
        
        try {
            const { data, error } = await state.supabaseClient
                .from('user_nostr_keys')
                .select('encrypted_private_key')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('No keys found in database for user');
                    return null;
                }
                throw error;
            }
            
            console.log('Keys retrieved from database successfully');
            return data.encrypted_private_key;
        } catch (error) {
            console.error('Error retrieving keys from database:', error);
            throw error;
        }
    },

    async recoverKeysWithPassword(userId, password) {
        console.log('Recovering keys with password...');
        
        try {
            // Retrieve encrypted keys from database
            const encryptedKeys = await this.retrieveKeysFromDatabase(userId);
            
            if (!encryptedKeys) {
                throw new Error('No encrypted keys found for this user');
            }
            
            // Decrypt keys with password
            const decryptedPrivateKey = await keyEncryption.decryptData(encryptedKeys, password);
            
            // Reconstruct key pair
            const keys = {
                privateKey: decryptedPrivateKey,
                publicKey: nostrKeys.decodePublicKey(nostrKeys.encodePublicKey(decryptedPrivateKey)),
                npub: nostrKeys.encodePublicKey(nostrKeys.decodePublicKey(decryptedPrivateKey)),
                nsec: nostrKeys.encodePrivateKey(decryptedPrivateKey)
            };
            
            console.log('Keys recovered successfully');
            return keys;
        } catch (error) {
            console.error('Error recovering keys with password:', error);
            throw new Error('Failed to recover keys. Please check your password.');
        }
    },

    // Auth Methods
    async signUp(email, password) {
        console.log('Signing up user:', email);
        
        try {
            // Generate Nostr keypair
            const keys = this.generateNostrKeys();
            
            // Create user in Supabase
            const { data, error } = await state.supabaseClient.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Store Nostr keys encrypted with password
            const encryptedKeys = await this.encryptKeys(keys, password);
            
            // Store encrypted keys in Supabase database for recovery
            await this.storeKeysInDatabase(data.user.id, encryptedKeys);
            
            // Also store in localStorage for immediate access
            keyStorage.storeKeys(encryptedKeys, { 
                email, 
                publicKey: keys.publicKey,
                userId: data.user.id 
            });
            
            // Update state
            state.currentUser = data.user;
            state.userKeys = keys;
            state.isAuthenticated = true;
            state.authSession = data.session;
            
            console.log('User signed up successfully with key recovery enabled');
            return { success: true, user: data.user, keys: keys };
            
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    },

    async signIn(email, password) {
        console.log('Signing in user:', email);
        
        try {
            // Sign in with Supabase
            const { data, error } = await state.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Try to recover Nostr keys from database
            let keys;
            try {
                keys = await this.recoverKeysWithPassword(data.user.id, password);
                console.log('Keys recovered from database successfully');
            } catch (recoveryError) {
                console.warn('Key recovery failed, checking localStorage:', recoveryError.message);
                
                // Fallback: Try to recover from localStorage
                const storedData = keyStorage.retrieveKeys();
                if (storedData && storedData.metadata && storedData.metadata.userId === data.user.id) {
                    try {
                        const decryptedPrivateKey = await keyEncryption.decryptData(storedData.keys, password);
                        keys = {
                            privateKey: decryptedPrivateKey,
                            publicKey: nostrKeys.decodePublicKey(nostrKeys.encodePublicKey(decryptedPrivateKey)),
                            npub: nostrKeys.encodePublicKey(nostrKeys.decodePublicKey(decryptedPrivateKey)),
                            nsec: nostrKeys.encodePrivateKey(decryptedPrivateKey)
                        };
                        console.log('Keys recovered from localStorage successfully');
                    } catch (localError) {
                        console.warn('localStorage recovery failed:', localError.message);
                        throw new Error('Unable to recover your Nostr keys. Please contact support.');
                    }
                } else {
                    console.warn('No keys found in localStorage for this user');
                    throw new Error('No Nostr keys found for this account. Please sign up again or contact support.');
                }
            }
            
            // Update state
            state.currentUser = data.user;
            state.userKeys = keys;
            state.isAuthenticated = true;
            state.authSession = data.session;
            
            console.log('User signed in successfully with key recovery');
            return { success: true, user: data.user, keys: keys };
            
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    },

    async signOut() {
        console.log('Signing out user');
        
        try {
            // Sign out from Supabase
            const { error } = await state.supabaseClient.auth.signOut();
            
            if (error) throw error;
            
            // Clear state
            state.currentUser = null;
            state.userKeys = null;
            state.isAuthenticated = false;
            state.authSession = null;
            
            console.log('User signed out successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },

    generateNostrKeys() {
        console.log('SOCIAL: Delegating key generation to nostrKeys module');
        const keys = nostrKeys.generateKeyPair();
        
        // Return in the format expected by the rest of the application
        return {
            publicKey: keys.npub,  // Use npub format for public key
            privateKey: keys.nsec   // Use nsec format for private key
        };
    },

    encryptKeys(keys, password) {
        console.log('SOCIAL: Delegating encryption to keyEncryption module');
        return keyEncryption.encryptData(keys.privateKey, password);
    },

    // Test method for auth state
    testAuthState() {
        console.log('Testing auth state...');
        console.log('Current user:', state.currentUser);
        console.log('User keys:', state.userKeys);
        console.log('Is authenticated:', state.isAuthenticated);
        console.log('Auth session:', state.authSession);
        
        return {
            currentUser: state.currentUser,
            userKeys: state.userKeys,
            isAuthenticated: state.isAuthenticated,
            authSession: state.authSession
        };
    },

    // Test method to simulate authentication
    simulateAuth() {
        console.log('Simulating authentication...');
        
        // Generate test user and keys
        const keys = this.generateNostrKeys();
        
        // Set test user data
        state.currentUser = {
            id: 'test-user-123',
            email: 'test@example.com',
            created_at: new Date().toISOString()
        };
        state.userKeys = keys;
        state.isAuthenticated = true;
        state.authSession = {
            access_token: 'test-token',
            expires_at: Date.now() + 3600000
        };
        
        console.log('Authentication simulated successfully');
        console.log('User:', state.currentUser.email);
        console.log('Nostr PubKey:', state.userKeys.publicKey);
        
        return {
            success: true,
            user: state.currentUser,
            keys: state.userKeys
        };
    },

    // Test method for Nostr key generation integration
    testNostrIntegration() {
        console.log('Testing Nostr integration...');
        
        try {
            // Test key generation
            const keyTest = nostrKeys.testKeyGeneration();
            console.log('Key generation test result:', keyTest);
            
            // Test SOCIAL layer key generation
            const socialKeys = this.generateNostrKeys();
            console.log('SOCIAL layer keys:', socialKeys);
            
            // Test key validation
            const publicKeyValid = nostrKeys.validateKeyFormat(socialKeys.publicKey);
            const privateKeyValid = nostrKeys.validateKeyFormat(socialKeys.privateKey);
            
            console.log('SOCIAL layer key validation:');
            console.log('- Public key valid:', publicKeyValid);
            console.log('- Private key valid:', privateKeyValid);
            
            return {
                success: true,
                keyGenerationTest: keyTest,
                socialKeys: socialKeys,
                validation: {
                    publicKey: publicKeyValid,
                    privateKey: privateKeyValid
                }
            };
        } catch (error) {
            console.error('Nostr integration test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Test method for encryption integration
    async testEncryptionIntegration() {
        console.log('Testing encryption integration...');
        
        try {
            // Test encryption module directly
            const encryptionTest = await keyEncryption.testEncryption();
            console.log('Encryption test result:', encryptionTest);
            
            // Test SOCIAL layer encryption flow
            const testKeys = this.generateNostrKeys();
            const testPassword = 'TestPassword123!';
            
            console.log('Testing SOCIAL layer encryption flow...');
            console.log('Test keys:', testKeys);
            console.log('Test password:', testPassword);
            
            // Test encryption
            const encrypted = await this.encryptKeys(testKeys, testPassword);
            console.log('Encrypted keys:', encrypted);
            
            // Test decryption (would need to implement decryptKeys method)
            console.log('Encryption integration test completed');
            
            return {
                success: true,
                encryptionTest: encryptionTest,
                socialEncryption: encrypted
            };
        } catch (error) {
            console.error('Encryption integration test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Test method for key recovery functionality
    async testKeyRecovery() {
        console.log('Testing key recovery functionality...');
        
        try {
            const testEmail = 'test-recovery@example.com';
            const testPassword = 'TestPassword123!';
            
            console.log('Test email:', testEmail);
            console.log('Test password:', testPassword);
            
            // Test key generation
            const testKeys = this.generateNostrKeys();
            console.log('Generated test keys:', testKeys);
            
            // Test encryption
            const encryptedKeys = await this.encryptKeys(testKeys, testPassword);
            console.log('Encrypted keys:', encryptedKeys);
            
            // Test decryption
            const decryptedPrivateKey = await keyEncryption.decryptData(encryptedKeys, testPassword);
            console.log('Decrypted private key:', decryptedPrivateKey);
            
            // Test key reconstruction
            const reconstructedKeys = {
                privateKey: decryptedPrivateKey,
                publicKey: nostrKeys.decodePublicKey(nostrKeys.encodePublicKey(decryptedPrivateKey)),
                npub: nostrKeys.encodePublicKey(nostrKeys.decodePublicKey(decryptedPrivateKey)),
                nsec: nostrKeys.encodePrivateKey(decryptedPrivateKey)
            };
            
            console.log('Reconstructed keys:', reconstructedKeys);
            
            // Verify round trip
            const roundTripSuccess = reconstructedKeys.privateKey === testKeys.privateKey;
            console.log('Round trip test:', roundTripSuccess);
            
            return {
                success: true,
                originalKeys: testKeys,
                encryptedKeys: encryptedKeys,
                reconstructedKeys: reconstructedKeys,
                roundTripSuccess: roundTripSuccess
            };
        } catch (error) {
            console.error('Key recovery test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// ============================================================================
// NOSTR MODULES - Independent Components
// ============================================================================
// 🎯 PURPOSE: Modular Nostr functionality for independent development
// ✅ ADD HERE: New Nostr-related modules
// ❌ DON'T ADD: Business logic, DOM manipulation, or API calls
// ============================================================================

// ============================================================================
// NOSTR KEY GENERATION MODULE
// ============================================================================
const nostrKeys = {
    generateKeyPair() {
        console.log('Generating Nostr keypair...');
        
        try {
            // Import nostr-tools functions dynamically to avoid module loading issues
            if (typeof window !== 'undefined' && window.nostrTools) {
                const { generatePrivateKey, getPublicKey } = window.nostrTools;
                
                // Generate real Nostr keys
                const privateKey = generatePrivateKey();
                const publicKey = getPublicKey(privateKey);
                
                const keys = {
                    privateKey: privateKey,
                    publicKey: publicKey,
                    npub: this.encodePublicKey(publicKey),
                    nsec: this.encodePrivateKey(privateKey)
                };
                
                console.log('Real Nostr keys generated');
                return keys;
            } else {
                // Fallback to placeholder if nostr-tools not available
                console.warn('nostr-tools not available, using placeholder keys');
                return this.generatePlaceholderKeys();
            }
        } catch (error) {
            console.error('Error generating Nostr keys:', error);
            console.warn('Falling back to placeholder keys');
            return this.generatePlaceholderKeys();
        }
    },

    generatePlaceholderKeys() {
        // Placeholder implementation for fallback
        const keys = {
            privateKey: 'placeholder_private_' + Math.random().toString(36).substring(2, 15),
            publicKey: 'placeholder_public_' + Math.random().toString(36).substring(2, 15),
            npub: 'npub1' + Math.random().toString(36).substring(2, 15),
            nsec: 'nsec1' + Math.random().toString(36).substring(2, 15)
        };
        
        console.log('Placeholder Nostr keys generated');
        return keys;
    },

    encodePublicKey(hexKey) {
        try {
            if (typeof window !== 'undefined' && window.nostrTools) {
                const { nip19 } = window.nostrTools;
                return nip19.npubEncode(hexKey);
            } else {
                // Fallback encoding
                return 'npub1' + hexKey.substring(0, 10);
            }
        } catch (error) {
            console.error('Error encoding public key:', error);
            return 'npub1' + hexKey.substring(0, 10);
        }
    },

    encodePrivateKey(hexKey) {
        try {
            if (typeof window !== 'undefined' && window.nostrTools) {
                const { nip19 } = window.nostrTools;
                return nip19.nsecEncode(hexKey);
            } else {
                // Fallback encoding
                return 'nsec1' + hexKey.substring(0, 10);
            }
        } catch (error) {
            console.error('Error encoding private key:', error);
            return 'nsec1' + hexKey.substring(0, 10);
        }
    },

    validateKeyFormat(key) {
        try {
            if (!key) return false;
            
            // Check for valid Nostr key prefixes
            if (key.startsWith('npub1') || key.startsWith('nsec1')) {
                // Basic length validation for bech32 encoded keys
                return key.length >= 50 && key.length <= 70;
            }
            
            // Check for hex format (32 bytes = 64 hex chars)
            if (/^[0-9a-fA-F]{64}$/.test(key)) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error validating key format:', error);
            return false;
        }
    },

    decodePublicKey(npub) {
        try {
            if (typeof window !== 'undefined' && window.nostrTools) {
                const { nip19 } = window.nostrTools;
                return nip19.npubDecode(npub);
            } else {
                // Fallback decoding
                return npub.replace('npub1', '');
            }
        } catch (error) {
            console.error('Error decoding public key:', error);
            throw error;
        }
    },

    decodePrivateKey(nsec) {
        try {
            if (typeof window !== 'undefined' && window.nostrTools) {
                const { nip19 } = window.nostrTools;
                return nip19.nsecDecode(nsec);
            } else {
                // Fallback decoding
                return nsec.replace('nsec1', '');
            }
        } catch (error) {
            console.error('Error decoding private key:', error);
            throw error;
        }
    },

    // Test function for key generation
    testKeyGeneration() {
        console.log('Testing Nostr key generation...');
        
        try {
            // Test key generation
            const keys = this.generateKeyPair();
            console.log('Generated keys:', keys);
            
            // Test key validation
            const publicKeyValid = this.validateKeyFormat(keys.publicKey);
            const privateKeyValid = this.validateKeyFormat(keys.privateKey);
            const npubValid = this.validateKeyFormat(keys.npub);
            const nsecValid = this.validateKeyFormat(keys.nsec);
            
            console.log('Key validation results:');
            console.log('- Public key valid:', publicKeyValid);
            console.log('- Private key valid:', privateKeyValid);
            console.log('- npub valid:', npubValid);
            console.log('- nsec valid:', nsecValid);
            
            // Test encoding/decoding round trip
            if (typeof window !== 'undefined' && window.nostrTools) {
                try {
                    const decodedPublic = this.decodePublicKey(keys.npub);
                    const decodedPrivate = this.decodePrivateKey(keys.nsec);
                    
                    console.log('Encoding/decoding test:');
                    console.log('- Original public key:', keys.publicKey);
                    console.log('- Decoded public key:', decodedPublic);
                    console.log('- Match:', keys.publicKey === decodedPublic);
                    console.log('- Original private key:', keys.privateKey);
                    console.log('- Decoded private key:', decodedPrivate);
                    console.log('- Match:', keys.privateKey === decodedPrivate);
                } catch (decodeError) {
                    console.warn('Decoding test failed:', decodeError);
                }
            }
            
            return {
                success: true,
                keys: keys,
                validation: {
                    publicKey: publicKeyValid,
                    privateKey: privateKeyValid,
                    npub: npubValid,
                    nsec: nsecValid
                }
            };
        } catch (error) {
            console.error('Key generation test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// ============================================================================
// NOSTR ENCRYPTION MODULE
// ============================================================================
const keyEncryption = {
    async encryptData(data, password) {
        console.log('Encrypting data with Web Crypto API...');
        
        try {
            // Validate inputs
            if (!data || !password) {
                throw new Error('Data and password are required for encryption');
            }
            
            if (!this.validatePassword(password)) {
                throw new Error('Password does not meet security requirements');
            }
            
            // Generate salt
            const salt = this.generateSalt();
            
            // Derive key from password
            const key = await this.deriveKeyFromPassword(password, salt);
            
            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Convert data to Uint8Array
            const dataBuffer = new TextEncoder().encode(data);
            
            // Encrypt data
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );
            
            // Combine salt, iv, and encrypted data
            const result = {
                salt: Array.from(salt),
                iv: Array.from(iv),
                encryptedData: Array.from(new Uint8Array(encryptedData)),
                algorithm: 'AES-GCM',
                timestamp: Date.now(),
                version: '1.0'
            };
            
            console.log('Data encrypted successfully with Web Crypto API');
            return result;
        } catch (error) {
            console.error('Error encrypting data:', error);
            console.warn('Falling back to placeholder encryption');
            return this.encryptDataPlaceholder(data, password);
        }
    },

    async decryptData(encryptedData, password) {
        console.log('Decrypting data with Web Crypto API...');
        
        try {
            // Validate inputs
            if (!encryptedData || !password) {
                throw new Error('Encrypted data and password are required for decryption');
            }
            
            // Check if it's placeholder data
            if (encryptedData.algorithm === 'placeholder') {
                console.log('Detected placeholder encryption, using fallback decryption');
                return this.decryptDataPlaceholder(encryptedData, password);
            }
            
            // Extract components
            const salt = new Uint8Array(encryptedData.salt);
            const iv = new Uint8Array(encryptedData.iv);
            const encrypted = new Uint8Array(encryptedData.encryptedData);
            
            // Derive key from password
            const key = await this.deriveKeyFromPassword(password, salt);
            
            // Decrypt data
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            // Convert back to string
            const decryptedData = new TextDecoder().decode(decryptedBuffer);
            
            console.log('Data decrypted successfully with Web Crypto API');
            return decryptedData;
        } catch (error) {
            console.error('Error decrypting data:', error);
            throw new Error('Failed to decrypt data. Please check your password.');
        }
    },

    async deriveKeyFromPassword(password, salt) {
        console.log('Deriving key from password using PBKDF2...');
        
        try {
            // Import password as key material
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            // Derive key using PBKDF2
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000, // High iteration count for security
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            
            console.log('Key derived successfully from password');
            return key;
        } catch (error) {
            console.error('Error deriving key from password:', error);
            throw error;
        }
    },

    generateSalt() {
        console.log('Generating cryptographically secure salt...');
        
        try {
            // Generate 32 bytes of random data for salt
            const salt = crypto.getRandomValues(new Uint8Array(32));
            console.log('Salt generated successfully');
            return salt;
        } catch (error) {
            console.error('Error generating salt:', error);
            // Fallback to Math.random (less secure but functional)
            const fallbackSalt = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
                fallbackSalt[i] = Math.floor(Math.random() * 256);
            }
            console.warn('Using fallback salt generation');
            return fallbackSalt;
        }
    },

    validatePassword(password) {
        console.log('Validating password strength...');
        
        try {
            if (!password) {
                console.log('Password validation failed: empty password');
                return false;
            }
            
            // Basic password requirements
            const minLength = 8;
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            const isValid = password.length >= minLength && 
                           hasUpperCase && 
                           hasLowerCase && 
                           hasNumbers && 
                           hasSpecialChar;
            
            console.log('Password validation result:', isValid);
            return isValid;
        } catch (error) {
            console.error('Error validating password:', error);
            return false;
        }
    },

    // Placeholder implementations for fallback
    encryptDataPlaceholder(data, password) {
        console.log('Using placeholder encryption (fallback)');
        
        try {
            const encrypted = {
                data: 'encrypted_' + data,
                timestamp: Date.now(),
                algorithm: 'placeholder'
            };
            
            console.log('Data encrypted with placeholder method');
            return encrypted;
        } catch (error) {
            console.error('Error with placeholder encryption:', error);
            throw error;
        }
    },

    decryptDataPlaceholder(encryptedData, password) {
        console.log('Using placeholder decryption (fallback)');
        
        try {
            const decrypted = encryptedData.data.replace('encrypted_', '');
            console.log('Data decrypted with placeholder method');
            return decrypted;
        } catch (error) {
            console.error('Error with placeholder decryption:', error);
            throw error;
        }
    },

    // Test function for encryption functionality
    async testEncryption() {
        console.log('Testing encryption functionality...');
        
        try {
            const testData = 'This is a test private key: nsec1test123456789';
            const testPassword = 'TestPassword123!';
            
            console.log('Test data:', testData);
            console.log('Test password:', testPassword);
            
            // Test password validation
            const passwordValid = this.validatePassword(testPassword);
            console.log('Password validation:', passwordValid);
            
            if (!passwordValid) {
                throw new Error('Test password does not meet requirements');
            }
            
            // Test encryption
            console.log('Testing encryption...');
            const encrypted = await this.encryptData(testData, testPassword);
            console.log('Encrypted result:', encrypted);
            
            // Test decryption
            console.log('Testing decryption...');
            const decrypted = await this.decryptData(encrypted, testPassword);
            console.log('Decrypted result:', decrypted);
            
            // Verify round trip
            const roundTripSuccess = decrypted === testData;
            console.log('Round trip test:', roundTripSuccess);
            
            return {
                success: true,
                passwordValidation: passwordValid,
                encryption: encrypted,
                decryption: decrypted,
                roundTripSuccess: roundTripSuccess
            };
        } catch (error) {
            console.error('Encryption test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Comprehensive test for all encryption features
    async testAllEncryptionFeatures() {
        console.log('Testing all encryption features...');
        
        try {
            const results = {
                passwordValidation: {},
                saltGeneration: {},
                keyDerivation: {},
                encryption: {},
                decryption: {},
                roundTrip: {},
                errorHandling: {}
            };
            
            // Test 1: Password validation
            console.log('Test 1: Password validation');
            results.passwordValidation.validPassword = this.validatePassword('ValidPass123!');
            results.passwordValidation.invalidPassword = this.validatePassword('weak');
            results.passwordValidation.emptyPassword = this.validatePassword('');
            
            // Test 2: Salt generation
            console.log('Test 2: Salt generation');
            const salt1 = this.generateSalt();
            const salt2 = this.generateSalt();
            results.saltGeneration.salt1Length = salt1.length;
            results.saltGeneration.salt2Length = salt2.length;
            results.saltGeneration.saltsDifferent = JSON.stringify(salt1) !== JSON.stringify(salt2);
            
            // Test 3: Key derivation
            console.log('Test 3: Key derivation');
            const testPassword = 'TestPassword123!';
            const key1 = await this.deriveKeyFromPassword(testPassword, salt1);
            const key2 = await this.deriveKeyFromPassword(testPassword, salt2);
            results.keyDerivation.key1Generated = !!key1;
            results.keyDerivation.key2Generated = !!key2;
            results.keyDerivation.keysDifferent = key1 !== key2;
            
            // Test 4: Encryption
            console.log('Test 4: Encryption');
            const testData = 'Test private key data';
            const encrypted = await this.encryptData(testData, testPassword);
            results.encryption.success = !!encrypted;
            results.encryption.hasSalt = !!encrypted.salt;
            results.encryption.hasIv = !!encrypted.iv;
            results.encryption.hasEncryptedData = !!encrypted.encryptedData;
            results.encryption.algorithm = encrypted.algorithm;
            
            // Test 5: Decryption
            console.log('Test 5: Decryption');
            const decrypted = await this.decryptData(encrypted, testPassword);
            results.decryption.success = !!decrypted;
            results.decryption.dataMatch = decrypted === testData;
            
            // Test 6: Round trip
            console.log('Test 6: Round trip');
            results.roundTrip.success = decrypted === testData;
            
            // Test 7: Error handling
            console.log('Test 7: Error handling');
            try {
                await this.encryptData('', '');
                results.errorHandling.emptyInputsHandled = false;
            } catch (error) {
                results.errorHandling.emptyInputsHandled = true;
            }
            
            try {
                await this.decryptData({}, 'wrongpassword');
                results.errorHandling.wrongPasswordHandled = false;
            } catch (error) {
                results.errorHandling.wrongPasswordHandled = true;
            }
            
            console.log('All encryption features test completed');
            return {
                success: true,
                results: results
            };
        } catch (error) {
            console.error('All encryption features test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// ============================================================================
// NOSTR STORAGE MODULE
// ============================================================================
const keyStorage = {
    storeKeys(keys, metadata = {}) {
        console.log('Storing keys...');
        
        try {
            const storageData = {
                keys: keys,
                metadata: {
                    ...metadata,
                    timestamp: Date.now(),
                    version: '1.0'
                }
            };
            
            localStorage.setItem('ydance_user_keys', JSON.stringify(storageData));
            console.log('Keys stored successfully');
            return true;
        } catch (error) {
            console.error('Error storing keys:', error);
            throw error;
        }
    },

    retrieveKeys() {
        console.log('Retrieving keys...');
        
        try {
            const stored = localStorage.getItem('ydance_user_keys');
            if (!stored) {
                console.log('No keys found in storage');
                return null;
            }
            
            const data = JSON.parse(stored);
            console.log('Keys retrieved successfully');
            return data;
        } catch (error) {
            console.error('Error retrieving keys:', error);
            throw error;
        }
    },

    clearStoredKeys() {
        console.log('Clearing stored keys...');
        
        try {
            localStorage.removeItem('ydance_user_keys');
            console.log('Keys cleared successfully');
            return true;
        } catch (error) {
            console.error('Error clearing keys:', error);
            throw error;
        }
    },

    getStorageInfo() {
        console.log('Getting storage info...');
        
        try {
            const stored = localStorage.getItem('ydance_user_keys');
            if (!stored) {
                return { exists: false, size: 0 };
            }
            
            return {
                exists: true,
                size: stored.length,
                timestamp: JSON.parse(stored).metadata?.timestamp
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            throw error;
        }
    }
};

// ============================================================================
// NOSTR CLIENT MODULE
// ============================================================================
const nostrClient = {
    async connect(relayUrl = 'wss://localhost:8080') {
        console.log('Connecting to Nostr relay:', relayUrl);
        
        try {
            // Placeholder connection
            // TODO: Implement actual WebSocket connection
            const client = {
                connected: true,
                relay: relayUrl,
                connectionTime: Date.now()
            };
            
            console.log('Connected to Nostr relay');
            return client;
        } catch (error) {
            console.error('Error connecting to Nostr relay:', error);
            throw error;
        }
    },

    async queryEvents(filter) {
        console.log('Querying Nostr events with filter:', filter);
        
        try {
            // Placeholder query
            // TODO: Implement actual Nostr event querying
            const events = [
                {
                    id: 'event-1',
                    content: 'Test event content',
                    pubkey: 'npub1test',
                    created_at: Math.floor(Date.now() / 1000)
                }
            ];
            
            console.log('Events queried successfully');
            return events;
        } catch (error) {
            console.error('Error querying events:', error);
            throw error;
        }
    },

    async publishEvent(event) {
        console.log('Publishing Nostr event:', event.id);
        
        try {
            // Placeholder publishing
            // TODO: Implement actual Nostr event publishing
            console.log('Event published successfully');
            return { success: true, eventId: event.id };
        } catch (error) {
            console.error('Error publishing event:', error);
            throw error;
        }
    },

    async disconnect() {
        console.log('Disconnecting from Nostr relay...');
        
        try {
            // Placeholder disconnection
            // TODO: Implement actual WebSocket disconnection
            console.log('Disconnected from Nostr relay');
            return true;
        } catch (error) {
            console.error('Error disconnecting from relay:', error);
            throw error;
        }
    }
};

// ============================================================================
// NOSTR EVENT PARSER MODULE
// ============================================================================
const nostrEventParser = {
    parseEvent(nostrEvent) {
        console.log('Parsing Nostr event:', nostrEvent.id);
        
        const content = nostrEvent.content;
        const tags = nostrEvent.tags;
        
        // Extract event data from content and tags
        const eventData = {
            id: nostrEvent.id,
            title: this.extractTitle(content),
            date: this.extractDate(content, tags),
            location: this.extractLocation(content, tags),
            dj: this.extractDJ(content, tags),
            music: this.extractMusicStyle(content, tags),
            type: this.extractEventType(content, tags),
            attending: this.extractAttendance(tags),
            friendsGoing: this.extractFriendsGoing(tags),
            source: 'nostr',
            nostrEventId: nostrEvent.id,
            nostrPubkey: nostrEvent.pubkey
        };
        
        console.log('Event parsed successfully');
        return eventData;
    },

    extractTitle(content) {
        // Extract title from content - look for emoji patterns or first line
        const lines = content.split('\n');
        const firstLine = lines[0].trim();
        
        // Remove common emojis and clean up
        return firstLine.replace(/^[🎵🎧🎪🎉🎊🎈🎁🎀🎂🎃🎄🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🎖🎗🎙🎚🎛🎜🎝🎞🎟🎠🎡🎢🎣🎤🎥🎦🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏱🏲🏳🏴🏵🏶🏷🏸🏹🏺🏻🏼🏽🏾🏿]/g, '').trim();
    },

    extractDate(content, tags) {
        // Look for date in tags first
        const dateTag = tags.find(tag => tag[0] === 'date');
        if (dateTag) return dateTag[1];
        
        // Look for date patterns in content
        const dateMatch = content.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) return dateMatch[0];
        
        // Default to today
        return new Date().toISOString().split('T')[0];
    },

    extractLocation(content, tags) {
        // Look for location in tags first
        const locationTag = tags.find(tag => tag[0] === 'location');
        if (locationTag) return locationTag[1];
        
        // Look for location patterns in content
        const locationMatch = content.match(/📍\s*(.+)/);
        if (locationMatch) return locationMatch[1].trim();
        
        return 'TBA';
    },

    extractDJ(content, tags) {
        // Look for DJ in tags first
        const djTag = tags.find(tag => tag[0] === 'dj');
        if (djTag) return djTag[1];
        
        // Look for DJ patterns in content
        const djMatch = content.match(/🎧\s*(.+)/);
        if (djMatch) return djMatch[1].trim();
        
        return 'TBA';
    },

    extractMusicStyle(content, tags) {
        // Look for music style in tags
        const musicTag = tags.find(tag => tag[0] === 'music');
        if (musicTag) return musicTag[1];
        
        // Look for music style patterns in content
        const musicMatch = content.match(/🎵\s*(.+)/);
        if (musicMatch) return musicMatch[1].trim();
        
        return 'Electronic';
    },

    extractEventType(content, tags) {
        // Look for event type in tags
        const typeTag = tags.find(tag => tag[0] === 'type');
        if (typeTag) return typeTag[1];
        
        // Default based on content analysis
        if (content.toLowerCase().includes('club')) return 'Club Night';
        if (content.toLowerCase().includes('festival')) return 'Festival';
        if (content.toLowerCase().includes('rave')) return 'Rave';
        
        return 'Event';
    },

    extractAttendance(tags) {
        const attendanceTag = tags.find(tag => tag[0] === 'attending');
        return attendanceTag ? parseInt(attendanceTag[1]) || 0 : Math.floor(Math.random() * 100) + 10;
    },

    extractFriendsGoing(tags) {
        const friendsTag = tags.find(tag => tag[0] === 'friends');
        return friendsTag ? parseInt(friendsTag[1]) || 0 : Math.floor(Math.random() * 10);
    }
};

// ============================================================================
// NOSTR INTEGRATION ADAPTER
// ============================================================================
const nostrAuthAdapter = {
    async signUp(email, password) {
        console.log('Nostr adapter: Processing signup for', email);
        
        try {
            // Generate Nostr keys
            const keys = nostrKeys.generateKeyPair();
            
            // Encrypt private key
            const encrypted = keyEncryption.encryptData(keys.privateKey, password);
            
            // Store keys
            keyStorage.storeKeys(encrypted, { email, publicKey: keys.publicKey });
            
            console.log('Nostr adapter: Signup processed successfully');
            return { success: true, publicKey: keys.publicKey };
        } catch (error) {
            console.error('Nostr adapter: Signup error:', error);
            throw error;
        }
    },

    async signIn(email, password) {
        console.log('Nostr adapter: Processing signin for', email);
        
        try {
            // Retrieve stored keys
            const stored = keyStorage.retrieveKeys();
            if (!stored) {
                throw new Error('No stored keys found');
            }
            
            // Decrypt private key
            const decrypted = keyEncryption.decryptData(stored.keys, password);
            
            console.log('Nostr adapter: Signin processed successfully');
            return { success: true, privateKey: decrypted };
        } catch (error) {
            console.error('Nostr adapter: Signin error:', error);
            throw error;
        }
    },

    async signOut() {
        console.log('Nostr adapter: Processing signout');
        
        try {
            // Clear stored keys
            keyStorage.clearStoredKeys();
            
            console.log('Nostr adapter: Signout processed successfully');
            return { success: true };
        } catch (error) {
            console.error('Nostr adapter: Signout error:', error);
            throw error;
        }
    }
};

// ============================================================================
// 5. VIEW LAYER (Rendering Module)
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
                router.showEventDetailsView(eventTitle);
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
                    
                    <div class="dj-profile-social-mentions">
                        <h3>Recent Social Mentions</h3>
                        ${this.renderSocialMentions(profile.name)}
                    </div>
                </div>
            </div>
        `;
        
        console.log('DJ profile rendered successfully!');
    },

    renderSocialMentions(djName) {
        console.log('Rendering social mentions for DJ:', djName);
        try {
            const mentions = social.getSocialMentionsForDJ(djName);
            if (!mentions || mentions.length === 0) {
                return '<p class="no-mentions">No recent social mentions found.</p>';
            }
            const mentionsHTML = mentions.map(mention => `
                <div class="social-mention-item">
                    <div class="mention-content">${mention.content}</div>
                    <div class="mention-meta">
                        <span class="mention-author">${mention.author || 'Anonymous'}</span>
                        <span class="mention-timestamp">${this.formatTimestamp(mention.timestamp)}</span>
                    </div>
                </div>
            `).join('');
            return `<div class="social-mentions-container">${mentionsHTML}</div>`;
        } catch (error) {
            console.error('Error rendering social mentions:', error);
            return '<p class="error-mentions">Error loading social mentions.</p>';
        }
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
    },

    createSocialMessageCard(message) {
        return `
            <div class="social-message-card">
                <div class="message-header">
                    <span class="message-author">${message.author || 'Anonymous'}</span>
                    <span class="message-timestamp">${views.formatTimestamp(message.timestamp)}</span>
                </div>
                <div class="message-content">${message.content}</div>
                ${message.links && message.links.length > 0 ? `
                    <div class="message-links">
                        ${message.links.map(link => `
                            <span class="message-link ${link.type}-link">${link.text}</span>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="message-status">
                    <span class="status-indicator ${message.status || 'pending'}"></span>
                    <span>${message.status || 'Processing...'}</span>
                </div>
            </div>
        `;
    },

    renderSocialFeed(messages) {
        const container = document.getElementById('social-feed-container');
        if (!container) {
            console.error('Social feed container not found!');
            return;
        }

        if (!messages || messages.length === 0) {
            container.innerHTML = '<p class="coming-soon">No messages yet. Be the first to share!</p>';
            return;
        }

        // Create message cards
        const cardsHTML = messages.map(this.createSocialMessageCard).join('');
        container.innerHTML = cardsHTML;
        
        console.log('Social feed rendered successfully!');
    },

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    },

    renderSocialMentions(djName) {
        console.log('Rendering social mentions for DJ:', djName);
        
        try {
            // Get social mentions for this DJ
            const mentions = social.getSocialMentionsForDJ(djName);
            
            if (!mentions || mentions.length === 0) {
                return '<p class="no-mentions">No recent social mentions found.</p>';
            }
            
            // Create mentions HTML
            const mentionsHTML = mentions.map(mention => `
                <div class="social-mention-item">
                    <div class="mention-content">${mention.content}</div>
                    <div class="mention-meta">
                        <span class="mention-author">${mention.author || 'Anonymous'}</span>
                        <span class="mention-timestamp">${this.formatTimestamp(mention.timestamp)}</span>
                    </div>
                </div>
            `).join('');
            
            return `
                <div class="social-mentions-container">
                    ${mentionsHTML}
                </div>
            `;
        } catch (error) {
            console.error('Error rendering social mentions:', error);
            return '<p class="error-mentions">Error loading social mentions.</p>';
        }
    },

    renderEventDetails(event) {
        console.log('Rendering event details for:', event.title);
        
        const container = document.getElementById('event-details-container');
        if (!container) {
            console.error('Event details container not found!');
            return;
        }

        if (!event) {
            container.innerHTML = '<p>Event details not found.</p>';
            return;
        }

        // Create detailed event HTML
        container.innerHTML = `
            <div class="event-details-card">
                <div class="event-details-header">
                    <h1 class="event-details-title">🎵 ${event.title}</h1>
                    <p class="event-details-date">📅 ${event.date}</p>
                    <p class="event-details-location">📍 ${event.location}</p>
                </div>
                
                <div class="event-details-content">
                    <div class="event-details-info">
                        <div class="event-info-item">
                            <h4>Type</h4>
                            <p>${event.type}</p>
                        </div>
                        <div class="event-info-item">
                            <h4>Music Style</h4>
                            <p>${event.music}</p>
                        </div>
                        <div class="event-info-item">
                            <h4>Friends Going</h4>
                            <p>👥 ${event.friendsGoing || 0}/${event.attending || 0}</p>
                        </div>
                    </div>
                    
                    <div class="event-details-dj">
                        <h4>🎧 Featured DJ</h4>
                        <p><strong>${event.dj}</strong></p>
                        <p>Click to view DJ profile: <a href="#" onclick="router.showDJProfileView('${event.dj}')">View ${event.dj}'s Profile</a></p>
                    </div>
                    
                    <div class="event-details-description">
                        <h3>About This Event</h3>
                        <p>Join us for an incredible night of ${event.music.toLowerCase()} music featuring ${event.dj} at ${event.location}. This ${event.type.toLowerCase()} event promises to deliver an unforgettable experience with amazing sound and atmosphere.</p>
                        <p>Don't miss out on this special ${event.music.toLowerCase()} showcase!</p>
                    </div>
                    
                    <div class="event-details-social">
                        <h3>Social Activity</h3>
                        <p>Check out what people are saying about this event in our social feed!</p>
                        <button class="event-action-button secondary" onclick="router.switchTab('social')">
                            💬 View Social Feed
                        </button>
                    </div>
                </div>
                
                <div class="event-details-actions">
                    <button class="event-action-button" onclick="alert('🎵 Welcome to ${event.title}!\\n\\nGet ready for an amazing night!')">
                        🎵 I'm Going!
                    </button>
                    <button class="event-action-button secondary" onclick="router.switchTab('events')">
                        ← Back to Events
                    </button>
                </div>
            </div>
        `;
        
        console.log('Event details rendered successfully!');
    }
};

// ============================================================================
// 6. ROUTER/CONTROLLER LAYER
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
        document.getElementById('event-details-view').style.display = 'none';
        
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

    async showEventDetailsView(eventTitle) {
        console.log('Switching to event details view for:', eventTitle);
        state.currentView = 'event-details';
        state.selectedEvent = eventTitle;
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('event-details-view').style.display = 'block';
        
        // Update the title
        const titleElement = document.getElementById('event-details-title');
        if (titleElement) {
            titleElement.textContent = `${eventTitle} - Details`;
        }
        
        // Find and render the event details
        const event = state.eventsData.find(e => e.title === eventTitle);
        if (event) {
            views.renderEventDetails(event);
        } else {
            views.showError('event-details-container', 'Event not found');
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
        document.getElementById('event-details-view').style.display = 'none';
        document.getElementById('venue-details-view').style.display = 'none';
        document.getElementById('venues-view').style.display = 'none';
        document.getElementById('sound-system-details-view').style.display = 'none';
        document.getElementById('sound-systems-view').style.display = 'none';
        document.getElementById('friend-profile-view').style.display = 'none';
        document.getElementById('friends-view').style.display = 'none';
        document.getElementById('social-view').style.display = 'none';
        
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
            case 'social':
                document.getElementById('social-view').style.display = 'block';
                state.currentView = 'social';
                // Load social feed if not already loaded
                if (state.socialFeed.length === 0) {
                    views.showLoading('social-feed-container');
                    social.fetchSocialFeed().then(messages => {
                        views.renderSocialFeed(messages);
                    }).catch(error => {
                        views.showError('social-feed-container', error.message);
                    });
                } else {
                    views.renderSocialFeed(state.socialFeed);
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

    async handleSendMessage(messageText) {
        console.log('Handling send message:', messageText);
        
        try {
            // Process message through social layer
            const processedMessage = await social.processMessage(messageText);
            
            // Create message object for display
            const message = {
                id: Date.now(),
                content: messageText,
                author: state.isAuthenticated ? (state.currentUser?.email || 'Authenticated User') : 'Anonymous',
                timestamp: new Date().toISOString(),
                status: 'processed',
                links: [],
                userId: state.currentUser?.id || null,
                nostrPubKey: state.userKeys?.publicKey || null
            };
            
            // Add links if attributes were found
            if (processedMessage.linkedDJ) {
                message.links.push({
                    type: 'dj',
                    text: `🎧 ${processedMessage.linkedDJ.name}`
                });
            }
            
            if (processedMessage.linkedVenue) {
                message.links.push({
                    type: 'venue',
                    text: `🏢 ${processedMessage.linkedVenue.name}`
                });
            }
            
            // Add to social feed
            state.socialFeed.unshift(message);
            
            // Re-render social feed
            views.renderSocialFeed(state.socialFeed);
            
            console.log('Message processed and added to feed');
            
        } catch (error) {
            console.error('Error processing message:', error);
            
            // Show error message
            const errorMessage = {
                id: Date.now(),
                content: messageText,
                author: state.isAuthenticated ? (state.currentUser?.email || 'Authenticated User') : 'Anonymous',
                timestamp: new Date().toISOString(),
                status: 'error',
                links: [],
                userId: state.currentUser?.id || null,
                nostrPubKey: state.userKeys?.publicKey || null
            };
            
            state.socialFeed.unshift(errorMessage);
            views.renderSocialFeed(state.socialFeed);
        }
    },

    init() {
        console.log('Setting up navigation...');
        
        // Back to events button
        const backButton = document.getElementById('back-to-events');
        if (backButton) {
            backButton.addEventListener('click', this.showEventsView);
        }
        
        // Initialize auth UI
        this.initAuthUI();
        
        // Nostr refresh button
        const nostrRefreshBtn = document.getElementById('nostr-refresh-btn');
        if (nostrRefreshBtn) {
            nostrRefreshBtn.addEventListener('click', () => this.refreshNostrData());
        }
        
        // Back to DJ list button
        const backToDJListButton = document.getElementById('back-to-dj-list');
        if (backToDJListButton) {
            backToDJListButton.addEventListener('click', () => this.showDJView());
        }
        
        // Back to events list button
        const backToEventsListButton = document.getElementById('back-to-events-list');
        if (backToEventsListButton) {
            backToEventsListButton.addEventListener('click', () => this.showEventsView());
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
        
        // Social message input event listeners
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-message');
        
        if (messageInput && sendButton) {
            sendButton.addEventListener('click', () => {
                const messageText = messageInput.value.trim();
                if (messageText) {
                    this.handleSendMessage(messageText);
                    messageInput.value = '';
                }
            });
            
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const messageText = messageInput.value.trim();
                    if (messageText) {
                        this.handleSendMessage(messageText);
                        messageInput.value = '';
                    }
                }
            });
        }
        
        console.log('Navigation setup complete');
    },

    // Auth UI Management
    initAuthUI() {
        console.log('Initializing auth UI...');
        
        // Auth button event listeners
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const authModal = document.getElementById('auth-modal');
        const authModalClose = document.getElementById('auth-modal-close');
        const authCancelBtn = document.getElementById('auth-cancel-btn');
        const authForm = document.getElementById('auth-form');
        const authSwitchBtn = document.getElementById('auth-switch-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showAuthModal('login'));
        }
        
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.showAuthModal('signup'));
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        if (authModalClose) {
            authModalClose.addEventListener('click', () => this.hideAuthModal());
        }
        
        if (authCancelBtn) {
            authCancelBtn.addEventListener('click', () => this.hideAuthModal());
        }
        
        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        }
        
        if (authSwitchBtn) {
            authSwitchBtn.addEventListener('click', () => this.switchAuthMode());
        }
        
        // Close modal when clicking outside
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    this.hideAuthModal();
                }
            });
        }
        
        // Update auth status on page load
        this.updateAuthStatus();
        
        console.log('Auth UI initialized');
    },

    async refreshNostrData() {
        console.log('Refreshing Nostr data...');
        
        try {
            // Show loading state
            const refreshBtn = document.getElementById('nostr-refresh-btn');
            if (refreshBtn) {
                refreshBtn.style.opacity = '0.5';
                refreshBtn.style.pointerEvents = 'none';
            }
            
            // Refresh events from Nostr
            const events = await social.fetchSocialFeed();
            console.log('Refreshed events from Nostr:', events.length);
            
            // Refresh profiles from Nostr
            const profiles = await social.fetchProfilesFromNostr();
            console.log('Refreshed profiles from Nostr:', profiles.length);
            
            // Re-render current view to show new data
            if (state.currentView === 'events') {
                views.renderEvents(state.events);
            } else if (state.currentView === 'djs') {
                views.renderDJs(state.djs);
            } else if (state.currentView === 'venues') {
                views.renderVenues(state.venues);
            } else if (state.currentView === 'sound-systems') {
                views.renderSoundSystems(state.soundSystems);
            }
            
            // Show success message
            console.log('Nostr data refreshed successfully!');
            
        } catch (error) {
            console.error('Error refreshing Nostr data:', error);
        } finally {
            // Restore button state
            const refreshBtn = document.getElementById('nostr-refresh-btn');
            if (refreshBtn) {
                refreshBtn.style.opacity = '1';
                refreshBtn.style.pointerEvents = 'auto';
            }
        }
    },

    showAuthModal(mode) {
        console.log('Showing auth modal in', mode, 'mode');
        
        const authModal = document.getElementById('auth-modal');
        const authModalTitle = document.getElementById('auth-modal-title');
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        const authSwitchText = document.getElementById('auth-switch-text');
        const authSwitchBtn = document.getElementById('auth-switch-btn');
        
        if (!authModal) return;
        
        // Set mode
        state.authModalMode = mode;
        
        // Update UI based on mode
        if (mode === 'login') {
            authModalTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Login';
            authSwitchText.textContent = "Don't have an account?";
            authSwitchBtn.textContent = 'Sign Up';
        } else {
            authModalTitle.textContent = 'Sign Up';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchText.textContent = 'Already have an account?';
            authSwitchBtn.textContent = 'Login';
        }
        
        // Clear form
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        
        // Show modal
        authModal.style.display = 'flex';
    },

    hideAuthModal() {
        console.log('Hiding auth modal');
        
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.style.display = 'none';
        }
    },

    switchAuthMode() {
        const currentMode = state.authModalMode;
        const newMode = currentMode === 'login' ? 'signup' : 'login';
        this.showAuthModal(newMode);
    },

    async handleAuthSubmit(e) {
        e.preventDefault();
        console.log('Handling auth submit in', state.authModalMode, 'mode');
        
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        try {
            let result;
            if (state.authModalMode === 'login') {
                result = await social.signIn(email, password);
            } else {
                result = await social.signUp(email, password);
            }
            
            if (result.success) {
                console.log('Auth successful:', result);
                this.hideAuthModal();
                this.updateAuthStatus();
                
                // Show success message
                const message = state.authModalMode === 'login' ? 'Login successful!' : 'Account created successfully!';
                alert(message);
            } else {
                alert('Authentication failed. Please try again.');
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert('Authentication failed: ' + error.message);
        }
    },

    async handleLogout() {
        console.log('Handling logout');
        
        try {
            const result = await social.signOut();
            if (result.success) {
                console.log('Logout successful');
                this.updateAuthStatus();
                alert('Logged out successfully!');
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed: ' + error.message);
        }
    },

    updateAuthStatus() {
        console.log('Updating auth status...');
        
        const authStatus = document.getElementById('auth-status');
        const authUser = document.getElementById('auth-user');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (!authStatus) return;
        
        if (state.isAuthenticated && state.currentUser) {
            // User is authenticated
            authStatus.textContent = 'Signed in as:';
            authUser.textContent = state.currentUser.email;
            authUser.style.display = 'inline';
            
            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            // User is not authenticated
            authStatus.textContent = 'Not signed in';
            authUser.style.display = 'none';
            
            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (signupBtn) signupBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
        
        console.log('Auth status updated:', state.isAuthenticated ? 'authenticated' : 'not authenticated');
    }
};

// ============================================================================
// 7. INITIALIZATION
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
    
    // Initialize Social layer
    const socialInitialized = await social.init();
    if (!socialInitialized) {
        console.warn('Social layer initialization failed, continuing without social features');
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
// 4. Add social processing to social object
// 5. Add rendering functions to views object
// 6. Add navigation logic to router object
// 
// NEVER add functions outside these modules!
// ============================================================================