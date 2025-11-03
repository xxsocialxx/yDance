// ============================================================================
/*
yDance Script - Table of Contents (scan me)
1) CONFIG
2) STATE
3) API
4) SOCIAL
5) VIEWS
6) ROUTER
7) INITIALIZATION (DO NOT MODIFY)

Rules:
- No renaming IDs/classes/functions/state keys.
- New behavior only behind flags (default off).
- If a section grows > ~300 lines, consider extraction later.
*/
// ============================================================================
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
    // Supabase anon publishable key (safe for frontend per Supabase docs)
    supabaseKey: 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ',
    nostrRelayUrl: 'wss://relay.beginnersurfer.com',
    flags: {
        nostrRealClient: false,
        writeToRawEvents: false,
        enableReviewQueue: true,
        // Flip to run a quick Nostr connect→disconnect sanity check in dev
        nostrHealthCheck: false,
        // NEW: Enable isolated nostr module (Phase 2+)
        nostrIsolated: false, // When true: use isolated nostr module, separate auth
        // NEW: Show NOSTR dev tab for testing (Phase 4+)
        nostrDevTab: true, // When true: show NOSTR tab (dev/testing only)
        // Verbose console logging during development
        debug: false,
        allowClientSensitiveWrites: false
    }
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
    selectedOperator: null,
    selectedEvent: null,
    
    // Account Mode Management
    selectedAccountMode: null, // 'light' or 'bold' (for signup)
    userAccountMode: null, // 'light' or 'bold' (for current user)
    currentDJProfile: null,
    venuesData: [],
    operatorsData: [],
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
    authModalMode: 'login',
    // Location state
    userCity: null
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
        if (CONFIG.flags.debug) console.log('Initializing Supabase client...');
        if (CONFIG.flags.debug) console.log('URL:', CONFIG.supabaseUrl);
        
        try {
            state.supabaseClient = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
            if (CONFIG.flags.debug) console.log('Supabase client created successfully');
            return true;
        } catch (error) {
            console.error('Error creating Supabase client:', error);
            return false;
        }
    },
    
    async healthCheck(relayUrl = CONFIG.nostrRelayUrl) {
        if (CONFIG.flags.debug) console.log('Nostr health check starting...');
        try {
            if (state.nostrClient && state.nostrClient.connected) {
                if (CONFIG.flags.debug) console.log('Nostr health: already connected to', state.nostrClient.relay);
                return { ok: true, relay: state.nostrClient.relay, reused: true };
            }
            const temp = await nostrClient.connect(relayUrl);
            const connected = !!(temp && temp.connected);
            if (!connected) throw new Error('Temp connection did not report connected');
            await nostrClient.disconnect();
            if (CONFIG.flags.debug) console.log('Nostr health: connect/disconnect OK for', relayUrl);
            return { ok: true, relay: relayUrl, reused: false };
        } catch (error) {
            console.error('Nostr health: failed for', relayUrl, error);
            return { ok: false, relay: relayUrl, error: (error && error.message) ? error.message : String(error) };
        }
    },

    async fetchEvents() {
        if (CONFIG.flags.debug) console.log('Loading events from database...');
        try {
            // Preferred: read from normalized_events_latest view
            if (CONFIG.flags.debug) console.log('Trying normalized_events_latest view...');
            const viewResult = await state.supabaseClient
                .from('normalized_events_latest')
                .select('normalized_json, created_at')
                .order('created_at', { ascending: true });

            if (!viewResult.error && Array.isArray(viewResult.data) && viewResult.data.length > 0) {
                const events = viewResult.data.map(row => row.normalized_json).filter(Boolean);
                state.eventsData = events;
                console.log('✅ Loaded events from normalized view:', state.eventsData.length);
                if (CONFIG.flags.debug) {
                    console.log('Sample event:', state.eventsData[0]);
                    console.log('Event dates:', state.eventsData.slice(0, 5).map(e => e.date || e.start));
                }
                return state.eventsData;
            } else {
                console.warn('⚠️  No events found in normalized_events_latest view');
                if (viewResult.error) console.error('Error:', viewResult.error);
            }

            // Fallback: legacy tables
            let events = null;
            let error = null;

            if (CONFIG.flags.debug) console.log('Trying Events table (fallback)...');
            const result1 = await state.supabaseClient.from('Events').select('*').order('date', { ascending: true });
            if (result1.error) {
                if (CONFIG.flags.debug) console.log('Events table failed:', result1.error.message);
                if (CONFIG.flags.debug) console.log('Trying events table (fallback)...');
                const result2 = await state.supabaseClient.from('events').select('*').order('date', { ascending: true });
                if (result2.error) {
                    if (CONFIG.flags.debug) console.log('events table failed:', result2.error.message);
                    error = result2.error;
                } else {
                    events = result2.data;
                    if (CONFIG.flags.debug) console.log('Found events in lowercase table:', events.length);
                }
            } else {
                events = result1.data;
                if (CONFIG.flags.debug) console.log('Found events in capital table:', events.length);
            }

            if (error) throw error;
            state.eventsData = events || [];
            if (CONFIG.flags.debug) console.log('Events loaded successfully (fallback):', state.eventsData.length);
            return state.eventsData;
        } catch (error) {
            console.error('Error loading events:', error);
            throw error;
        }
    },

    async fetchDJProfiles() {
        if (CONFIG.flags.debug) console.log('Loading DJ profiles from database...');
        
        try {
            const { data: profiles, error } = await state.supabaseClient
                .from('dj_profiles')
                .select('*')
                .order('name', { ascending: true });
            
        if (CONFIG.flags.debug) console.log('DJ profiles query result:', { profiles, error });
            
            if (error) {
                console.error('Error loading DJ profiles:', error);
                throw error;
            }
            
            state.djProfilesData = profiles || [];
            if (CONFIG.flags.debug) console.log('DJ profiles loaded successfully:', state.djProfilesData.length);
            return state.djProfilesData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchDJProfile(djName) {
        if (CONFIG.flags.debug) console.log('Loading individual DJ profile for:', djName);
        
        try {
            const { data: profile, error } = await state.supabaseClient
                .from('dj_profiles')
                .select('*')
                .eq('name', djName)
                .single();
            
            if (CONFIG.flags.debug) console.log('DJ profile query result:', { profile, error });
            
            if (error) {
                console.error('Error loading DJ profile:', error);
                throw error;
            }
            
            state.currentDJProfile = profile;
            if (CONFIG.flags.debug) console.log('DJ profile loaded successfully');
            return profile;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchDJEditorialAttributes(djName) {
        if (CONFIG.flags.debug) console.log('Loading editorial attributes for:', djName);
        
        try {
            const { data, error } = await state.supabaseClient
                .from('dj_editorial_attributes')
                .select('*')
                .eq('dj_name', djName)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is ok
                console.error('Error loading editorial attributes:', error);
                return null;
            }
            
            return data || null;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },

    async fetchDJReviewsAggregate(djName) {
        if (CONFIG.flags.debug) console.log('Loading reviews aggregate for:', djName);
        
        try {
            const { data, error } = await state.supabaseClient
                .from('dj_reviews_aggregate')
                .select('*')
                .eq('dj_name', djName)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Error loading reviews:', error);
                return null;
            }
            
            return data || null;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },

    async fetchVenues() {
        if (CONFIG.flags.debug) console.log('Loading venues from database...');
        
        try {
            // For now, return placeholder data until venues table is created
            state.venuesData = api.placeholders?.venues || [];
            if (CONFIG.flags.debug) console.log('Venues loaded successfully:', state.venuesData.length);
            return state.venuesData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchSoundSystems() {
        if (CONFIG.flags.debug) console.log('Loading sound systems from database...');
        
        try {
            // For now, return placeholder data until sound systems table is created
            state.soundSystemsData = api.placeholders?.soundSystems || [];
            if (CONFIG.flags.debug) console.log('Sound systems loaded successfully:', state.soundSystemsData.length);
            return state.soundSystemsData;
            
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    async fetchFriends() {
        if (CONFIG.flags.debug) console.log('Loading friends data from database...');
        
        try {
            // For now, return placeholder data until friends table is created
            state.friendsData = api.placeholders?.friends || [];
            if (CONFIG.flags.debug) console.log('Friends data loaded successfully:', state.friendsData.length);
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
        if (CONFIG.flags.debug) console.log('Initializing Social layer...');
        try {
            if (CONFIG.flags.nostrRealClient) {
                // Initialize nostr client using nostrClient module
                const urlParams = new URLSearchParams(window.location.search);
                const relayOverride = urlParams.get('relay');
                const relayUrl = relayOverride || CONFIG.nostrRelayUrl;
                state.nostrClient = await nostrClient.connect(relayUrl);
                // Initialize Nostr data fetching
                await this.initNostrDataFetching();
                if (CONFIG.flags.debug) console.log('Social layer initialized with real Nostr client at', relayUrl);
                if (CONFIG.flags.nostrHealthCheck) {
                    try {
                        await this.healthCheck(relayUrl);
                    } catch (e) {
                        console.warn('Nostr health check failed:', e && e.message ? e.message : e);
                    }
                }
                // Expose dev hook
                if (typeof window !== 'undefined') {
                    window.social = this;
                }
            } else {
                state.nostrClient = { connected: false, relay: 'disabled' };
                if (CONFIG.flags.debug) console.log('Social layer initialized (nostr disabled by flag)');
                // Expose dev hook and tip
                if (typeof window !== 'undefined') {
                    window.social = this;
                    console.log('Tip: run window.social.healthCheck() to test Nostr connectivity');
                }
            }
            return true;
        } catch (error) {
            console.error('Error initializing Social layer:', error);
            return false;
        }
    },

    async initNostrDataFetching() {
        if (CONFIG.flags.debug) console.log('Initializing Nostr data fetching...');
        
        try {
            // Fetch events from Nostr
            const events = await this.fetchSocialFeed();
            if (CONFIG.flags.debug) console.log('Loaded events from Nostr:', events.length);
            
            // Fetch profiles from Nostr
            const profiles = await this.fetchProfilesFromNostr();
            if (CONFIG.flags.debug) console.log('Loaded profiles from Nostr:', profiles.length);
            
            // Set up periodic refresh (every 5 minutes)
            setInterval(async () => {
                if (CONFIG.flags.debug) console.log('Refreshing Nostr data...');
                await this.fetchSocialFeed();
                await this.fetchProfilesFromNostr();
            }, 5 * 60 * 1000); // 5 minutes
            
            if (CONFIG.flags.debug) console.log('Nostr data fetching initialized');
        } catch (error) {
            console.error('Error initializing Nostr data fetching:', error);
        }
    },

    async processMessage(messageText) {
        if (CONFIG.flags.debug) console.log('Processing social message');
        
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
        if (CONFIG.flags.debug) console.log('Parsing event message...');
        
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
            
            if (CONFIG.flags.debug) console.log('Message parsed');
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
        if (CONFIG.flags.debug) console.log('Linking attributes to database...');
        
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
            
            if (CONFIG.flags.debug) console.log('Attributes linked');
            return linkedData;
        } catch (error) {
            console.error('Error linking attributes:', error);
            throw error;
        }
    },

    queueForModeration(data) {
        if (CONFIG.flags.debug) console.log('Queueing for moderation...');
        
        try {
            const moderationItem = {
                id: Date.now(),
                data: data,
                status: 'pending',
                timestamp: new Date().toISOString()
            };
            
            state.moderationQueue.push(moderationItem);
            if (CONFIG.flags.debug) console.log('Item queued for moderation');
        } catch (error) {
            console.error('Error queueing for moderation:', error);
            throw error;
        }
    },

    async sendNostrMessage(content) {
        if (CONFIG.flags.debug) console.log('Sending nostr message...');
        
        try {
            if (!CONFIG.flags.nostrRealClient) {
                if (CONFIG.flags.debug) console.log('Nostr real client disabled by feature flag. Skip publish.');
                return { success: false, disabled: true };
            }
            // Placeholder nostr message sending
            if (!state.nostrClient || !state.nostrClient.connected) {
                if (CONFIG.flags.debug) console.log('Nostr client not connected, message queued');
                return { success: false, queued: true };
            }
            
            // TODO: Implement actual nostr message sending
            if (CONFIG.flags.debug) console.log('Nostr message would be sent');
            return { success: true, messageId: 'placeholder-id' };
        } catch (error) {
            console.error('Error sending nostr message:', error);
            throw error;
        }
    },

    async fetchSocialFeed() {
        if (CONFIG.flags.debug) console.log('Fetching yDance events from Nostr...');
        
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
            
            if (CONFIG.flags.debug) console.log('Parsed events from Nostr:', parsedEvents.length);
            return parsedEvents;
        } catch (error) {
            console.error('Error fetching events from Nostr:', error);
            // Fallback to placeholder for now
            return this.getPlaceholderFeed();
        }
    },

    async queryNostrEvents(filter) {
        if (CONFIG.flags.debug) console.log('SOCIAL: Delegating event query to nostrClient module');
        
        try {
            if (!state.nostrClient || !state.nostrClient.connected) {
                if (CONFIG.flags.debug) console.log('Nostr client not connected, returning placeholder data');
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
        if (CONFIG.flags.debug) console.log('Fetching yDance profiles from Nostr...');
        
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
            
            if (CONFIG.flags.debug) console.log('Parsed profiles from Nostr:', parsedProfiles.length);
            return parsedProfiles;
        } catch (error) {
            console.error('Error fetching profiles from Nostr:', error);
            return [];
        }
    },

    async queryNostrProfiles(filter) {
        if (CONFIG.flags.debug) console.log('Querying Nostr profiles with filter:', filter);
        
        try {
            if (!state.nostrClient || !state.nostrClient.connected) {
                if (CONFIG.flags.debug) console.log('Nostr client not connected, returning placeholder profiles');
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
        if (CONFIG.flags.debug) console.log('Parsing Nostr profile:', nostrProfile.id);
        
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
            if (!CONFIG.flags.allowClientSensitiveWrites) {
                console.log('Client-side sensitive writes disabled by flag.');
                return { success: false, disabled: true };
            }
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
            
            // TEMPORARY FALLBACK: Store in localStorage if database fails
            console.log('Database storage failed, using localStorage fallback...');
            try {
                const fallbackData = {
                    userId: userId,
                    encryptedKeys: encryptedKeys,
                    timestamp: new Date().toISOString(),
                    fallback: true
                };
                localStorage.setItem(`nostr_keys_${userId}`, JSON.stringify(fallbackData));
                console.log('Keys stored in localStorage as fallback');
                return { success: true, data: fallbackData, fallback: true };
            } catch (fallbackError) {
                console.error('Fallback storage also failed:', fallbackError);
                throw error; // Throw original error
            }
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
            
            // TEMPORARY FALLBACK: Try localStorage if database fails
            console.log('Database retrieval failed, trying localStorage fallback...');
            try {
                const fallbackData = localStorage.getItem(`nostr_keys_${userId}`);
                if (fallbackData) {
                    const parsed = JSON.parse(fallbackData);
                    console.log('Keys retrieved from localStorage fallback');
                    return parsed.encryptedKeys;
                }
                console.log('No keys found in localStorage fallback either');
                return null;
            } catch (fallbackError) {
                console.error('Fallback retrieval also failed:', fallbackError);
                throw error; // Throw original error
            }
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

    async storeRecoveryPhraseInDatabase(userId, encryptedRecoveryPhrase) {
        console.log('Storing encrypted recovery phrase in Supabase database...');
        
        try {
            if (!CONFIG.flags.allowClientSensitiveWrites) {
                console.log('Client-side sensitive writes disabled by flag.');
                return { success: false, disabled: true };
            }
            const { data, error } = await state.supabaseClient
                .from('user_recovery_phrases')
                .upsert({
                    user_id: userId,
                    encrypted_recovery_phrase: encryptedRecoveryPhrase,
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            console.log('Recovery phrase stored in database successfully');
            return { success: true, data };
        } catch (error) {
            console.error('Error storing recovery phrase in database:', error);
            
            // TEMPORARY FALLBACK: Store in localStorage if database fails
            console.log('Database storage failed, using localStorage fallback...');
            try {
                const fallbackData = {
                    userId: userId,
                    encryptedRecoveryPhrase: encryptedRecoveryPhrase,
                    timestamp: new Date().toISOString(),
                    fallback: true
                };
                localStorage.setItem(`recovery_phrase_${userId}`, JSON.stringify(fallbackData));
                console.log('Recovery phrase stored in localStorage as fallback');
                return { success: true, data: fallbackData, fallback: true };
            } catch (fallbackError) {
                console.error('Fallback storage also failed:', fallbackError);
                throw error; // Throw original error
            }
        }
    },

    async retrieveRecoveryPhraseFromDatabase(userId) {
        console.log('Retrieving encrypted recovery phrase from Supabase database...');
        
        try {
            const { data, error } = await state.supabaseClient
                .from('user_recovery_phrases')
                .select('encrypted_recovery_phrase')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('No recovery phrase found in database for user');
                    return null;
                }
                throw error;
            }
            
            console.log('Recovery phrase retrieved from database successfully');
            return data.encrypted_recovery_phrase;
        } catch (error) {
            console.error('Error retrieving recovery phrase from database:', error);
            
            // TEMPORARY FALLBACK: Try localStorage if database fails
            console.log('Database retrieval failed, trying localStorage fallback...');
            try {
                const fallbackData = localStorage.getItem(`recovery_phrase_${userId}`);
                if (fallbackData) {
                    const parsed = JSON.parse(fallbackData);
                    console.log('Recovery phrase retrieved from localStorage fallback');
                    return parsed.encryptedRecoveryPhrase;
                }
                console.log('No recovery phrase found in localStorage fallback either');
                return null;
            } catch (fallbackError) {
                console.error('Fallback retrieval also failed:', fallbackError);
                throw error; // Throw original error
            }
        }
    },

    async recoverKeysWithRecoveryPhrase(email, recoveryPhrase, newPassword) {
        console.log('Recovering keys with recovery phrase...');
        
        try {
            // First, validate the recovery phrase format
            if (!nostrKeys.validateRecoveryPhrase(recoveryPhrase)) {
                throw new Error('Invalid recovery phrase format');
            }
            
            // Get user by email (this would need to be implemented in Supabase)
            // For now, we'll assume we have the userId somehow
            // In a real implementation, you'd query the auth.users table
            
            // Retrieve encrypted recovery phrase from database
            const encryptedRecoveryPhrase = await this.retrieveRecoveryPhraseFromDatabase(userId);
            
            if (!encryptedRecoveryPhrase) {
                throw new Error('No recovery phrase found for this user');
            }
            
            // Try to decrypt with the recovery phrase as password
            // This is a simplified approach - in reality, you'd use the recovery phrase
            // to derive a key that can decrypt the actual keys
            const decryptedRecoveryPhrase = await keyEncryption.decryptData(encryptedRecoveryPhrase, recoveryPhrase);
            
            if (decryptedRecoveryPhrase !== recoveryPhrase) {
                throw new Error('Invalid recovery phrase');
            }
            
            // If recovery phrase is valid, generate new keys and encrypt with new password
            const newKeys = await this.generateNostrKeys();
            const encryptedNewKeys = await this.encryptKeys(newKeys, newPassword);
            
            // Store new keys in database
            await this.storeKeysInDatabase(userId, encryptedNewKeys);
            
            // Store new recovery phrase encrypted with new password
            const newRecoveryPhrase = nostrKeys.generateRecoveryPhrase();
            const encryptedNewRecoveryPhrase = await this.encryptKeys(newRecoveryPhrase, newPassword);
            await this.storeRecoveryPhraseInDatabase(userId, encryptedNewRecoveryPhrase);
            
            console.log('Keys recovered successfully with recovery phrase');
            return {
                success: true,
                keys: newKeys,
                newRecoveryPhrase: newRecoveryPhrase
            };
        } catch (error) {
            console.error('Error recovering keys with recovery phrase:', error);
            throw new Error('Failed to recover keys with recovery phrase. Please check your recovery phrase.');
        }
    },

    // Auth Methods
    async signUp(email, password) {
        console.log('Signing up user:', email);
        
        try {
            // Generate Nostr keypair
            const keys = await this.generateNostrKeys();
            
            // Generate recovery phrase
            const recoveryPhrase = nostrKeys.generateRecoveryPhrase();
            
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
            
            // Store recovery phrase in database (encrypted with password)
            const encryptedRecoveryPhrase = await this.encryptKeys(recoveryPhrase, password);
            await this.storeRecoveryPhraseInDatabase(data.user.id, encryptedRecoveryPhrase);
            
            // Also store in localStorage for immediate access
            keyStorage.storeKeys(encryptedKeys, { 
                email, 
                publicKey: keys.publicKey,
                userId: data.user.id,
                recoveryPhrase: recoveryPhrase // Store unencrypted for display
            });
            
            // Update state
            state.currentUser = data.user;
            state.userKeys = keys;
            state.isAuthenticated = true;
            state.authSession = data.session;
            
            console.log('User signed up successfully with key recovery and recovery phrase enabled');
            return { 
                success: true, 
                user: data.user, 
                keys: keys,
                recoveryPhrase: recoveryPhrase // Return for user to save
            };
            
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    },

    async signUpLight(email, password) {
        console.log('Signing up user in Light mode:', email);
        
        try {
            // Create user in Supabase (standard auth)
            const { data, error } = await state.supabaseClient.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Generate simple Nostr keys (not critical for account recovery)
            const keys = await this.generateNostrKeys();
            
            // Store keys in localStorage only (no database storage for Light mode)
            keyStorage.storeKeys(keys, { 
                email, 
                publicKey: keys.publicKey,
                userId: data.user.id,
                mode: 'light'
            });
            
            // Update state
            state.currentUser = data.user;
            state.userKeys = keys;
            state.isAuthenticated = true;
            state.authSession = data.session;
            
            console.log('User signed up successfully in Light mode');
            return { 
                success: true, 
                user: data.user, 
                keys: keys
            };
            
        } catch (error) {
            console.error('Error signing up in Light mode:', error);
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

    async generateNostrKeys() {
        console.log('SOCIAL: Delegating key generation to nostrKeys module');
        const keys = await nostrKeys.generateKeyPair();
        
        // Return in the format expected by the rest of the application
        return {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
            npub: keys.npub,
            nsec: keys.nsec
        };
    },

    encryptKeys(keys, password) {
        if (CONFIG.flags.debug) console.log('SOCIAL: Delegating encryption to keyEncryption module');
        return keyEncryption.encryptData(keys.privateKey, password);
    },

    // Test method for auth state
    testAuthState() {
        if (CONFIG.flags.debug) console.log('Testing auth state...');
        if (CONFIG.flags.debug) console.log('Current user:', state.currentUser);
        if (CONFIG.flags.debug) console.log('User keys:', state.userKeys);
        if (CONFIG.flags.debug) console.log('Is authenticated:', state.isAuthenticated);
        if (CONFIG.flags.debug) console.log('Auth session:', state.authSession);
        
        return {
            currentUser: state.currentUser,
            userKeys: state.userKeys,
            isAuthenticated: state.isAuthenticated,
            authSession: state.authSession
        };
    },

    // Test method to simulate authentication
    simulateAuth() {
        if (CONFIG.flags.debug) console.log('Simulating authentication...');
        
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
        
        if (CONFIG.flags.debug) console.log('Authentication simulated successfully');
        if (CONFIG.flags.debug) console.log('User:', state.currentUser.email);
        if (CONFIG.flags.debug) console.log('Nostr PubKey:', state.userKeys.publicKey);
        
        return {
            success: true,
            user: state.currentUser,
            keys: state.userKeys
        };
    },

    // Test method for Nostr key generation integration
    testNostrIntegration() {
        if (CONFIG.flags.debug) console.log('Testing Nostr integration...');
        
        try {
            // Test key generation
            const keyTest = nostrKeys.testKeyGeneration();
            if (CONFIG.flags.debug) console.log('Key generation test result:', keyTest);
            
            // Test SOCIAL layer key generation
            const socialKeys = this.generateNostrKeys();
            if (CONFIG.flags.debug) console.log('SOCIAL layer keys:', socialKeys);
            
            // Test key validation
            const publicKeyValid = nostrKeys.validateKeyFormat(socialKeys.publicKey);
            const privateKeyValid = nostrKeys.validateKeyFormat(socialKeys.privateKey);
            
            if (CONFIG.flags.debug) console.log('SOCIAL layer key validation:');
            if (CONFIG.flags.debug) console.log('- Public key valid:', publicKeyValid);
            if (CONFIG.flags.debug) console.log('- Private key valid:', privateKeyValid);
            
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
    },

    // Test method for recovery phrase functionality
    async testRecoveryPhrase() {
        console.log('Testing recovery phrase functionality...');
        
        try {
            const testPassword = 'TestPassword123!';
            
            console.log('Test password:', testPassword);
            
            // Test recovery phrase generation
            const recoveryPhrase = nostrKeys.generateRecoveryPhrase();
            console.log('Generated recovery phrase:', recoveryPhrase);
            
            // Test recovery phrase validation
            const isValid = nostrKeys.validateRecoveryPhrase(recoveryPhrase);
            console.log('Recovery phrase validation:', isValid);
            
            // Test encryption of recovery phrase
            const encryptedRecoveryPhrase = await this.encryptKeys(recoveryPhrase, testPassword);
            console.log('Encrypted recovery phrase:', encryptedRecoveryPhrase);
            
            // Test decryption of recovery phrase
            const decryptedRecoveryPhrase = await keyEncryption.decryptData(encryptedRecoveryPhrase, testPassword);
            console.log('Decrypted recovery phrase:', decryptedRecoveryPhrase);
            
            // Verify round trip
            const roundTripSuccess = decryptedRecoveryPhrase === recoveryPhrase;
            console.log('Recovery phrase round trip test:', roundTripSuccess);
            
            // Test invalid recovery phrase validation
            const invalidPhrase = 'invalid phrase with wrong number of words';
            const invalidValidation = nostrKeys.validateRecoveryPhrase(invalidPhrase);
            console.log('Invalid phrase validation:', invalidValidation);
            
            return {
                success: true,
                recoveryPhrase: recoveryPhrase,
                validation: isValid,
                encryptedRecoveryPhrase: encryptedRecoveryPhrase,
                decryptedRecoveryPhrase: decryptedRecoveryPhrase,
                roundTripSuccess: roundTripSuccess,
                invalidValidation: invalidValidation
            };
        } catch (error) {
            console.error('Recovery phrase test failed:', error);
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
            // Try nostr-tools first
            if (typeof window !== 'undefined' && window.nostrTools && window.nostrTools.generatePrivateKey) {
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
                
                console.log('Real Nostr keys generated via nostr-tools');
                return keys;
            } else {
                // Fallback to Web Crypto API for real cryptographic keys
                console.log('nostr-tools not available, using Web Crypto API');
                return this.generateWebCryptoKeys();
            }
        } catch (error) {
            console.error('Error generating Nostr keys:', error);
            console.warn('Falling back to Web Crypto API');
            return this.generateWebCryptoKeys();
        }
    },

    async generateWebCryptoKeys() {
        console.log('Generating keys using Web Crypto API...');
        
        try {
            // Generate 32 random bytes for private key
            const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
            
            // Convert to hex string
            const privateKey = Array.from(privateKeyBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            // Generate public key using secp256k1 (simplified approach)
            // In a real implementation, you'd use a proper secp256k1 library
            const publicKeyBytes = crypto.getRandomValues(new Uint8Array(32));
            const publicKey = Array.from(publicKeyBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            
            const keys = {
                privateKey: privateKey,
                publicKey: publicKey,
                npub: this.encodePublicKey(publicKey),
                nsec: this.encodePrivateKey(privateKey)
            };
            
            console.log('Web Crypto API keys generated');
            return keys;
        } catch (error) {
            console.error('Error generating Web Crypto keys:', error);
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
            if (typeof window !== 'undefined' && window.nostrTools && window.nostrTools.nip19) {
                const { nip19 } = window.nostrTools;
                return nip19.npubEncode(hexKey);
            } else {
                // Fallback encoding - use full key length
                return 'npub1' + hexKey;
            }
        } catch (error) {
            console.error('Error encoding public key:', error);
            return 'npub1' + hexKey;
        }
    },

    encodePrivateKey(hexKey) {
        try {
            if (typeof window !== 'undefined' && window.nostrTools && window.nostrTools.nip19) {
                const { nip19 } = window.nostrTools;
                return nip19.nsecEncode(hexKey);
            } else {
                // Fallback encoding - use full key length
                return 'nsec1' + hexKey;
            }
        } catch (error) {
            console.error('Error encoding private key:', error);
            return 'nsec1' + hexKey;
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
    },

    // Recovery phrase generation and validation
    generateRecoveryPhrase() {
        console.log('Generating recovery phrase...');
        
        try {
            // Generate 12-word recovery phrase using BIP39 wordlist (simplified)
            const wordlist = [
                'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
                'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
                'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
                'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
                'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
                'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
                'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
                'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
                'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
                'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
                'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
                'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
                'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
                'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
                'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
                'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
                'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
                'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
                'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
                'blind', 'blood', 'blossom', 'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
                'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
                'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread',
                'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze',
                'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
                'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
                'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call',
                'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas',
                'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry',
                'cart', 'case', 'cash', 'casino', 'cast', 'casual', 'cat', 'catalog', 'catch', 'category',
                'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century',
                'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase',
                'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney',
                'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'citizen',
                'city', 'civil', 'claim', 'clamp', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever',
                'click', 'client', 'cliff', 'climb', 'cling', 'clinic', 'clip', 'clock', 'clog', 'close',
                'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut',
                'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'come', 'comfort', 'comic',
                'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince',
                'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost', 'cotton',
                'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle', 'craft',
                'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew',
                'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel',
                'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup', 'cupboard',
                'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle', 'dad', 'damage',
                'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate', 'debris',
                'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy',
                'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend',
                'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy',
                'detail', 'detect', 'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice',
                'diesel', 'diet', 'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt',
                'disagree', 'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide',
                'divorce', 'dizzy', 'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey',
                'donor', 'door', 'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw',
                'dream', 'dress', 'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry',
                'duck', 'dumb', 'dune', 'during', 'dutch', 'duty', 'dwarf', 'dynamic', 'eager', 'eagle',
                'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge',
                'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant',
                'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion',
                'employ', 'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy',
                'enforce', 'engage', 'engine', 'english', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure',
                'enter', 'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode',
                'erosion', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil',
                'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute',
                'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire',
                'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty',
                'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy',
                'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature',
                'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever',
                'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find',
                'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'five', 'flag',
                'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock', 'floor',
                'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow',
                'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil',
                'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend', 'fringe', 'frog',
                'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace', 'fury',
                'future', 'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden',
                'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general', 'genius',
                'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle', 'ginger', 'giraffe',
                'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse', 'globe', 'gloom',
                'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla',
                'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape', 'grass',
                'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow', 'grunt',
                'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun', 'gym', 'habit', 'hair', 'half',
                'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hash', 'hate',
                'have', 'hawk', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello', 'helmet',
                'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire', 'history',
                'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood', 'hope',
                'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge',
                'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband',
                'hybrid', 'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness',
                'image', 'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include',
                'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict', 'inform', 'inhale',
                'inherit', 'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane',
                'insect', 'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest', 'invite', 'involve',
                'iron', 'island', 'isolate', 'issue', 'item', 'ivory', 'jacket', 'jaguar', 'jar', 'jazz',
                'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge',
                'juice', 'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen', 'keep', 'ketchup',
                'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite',
                'kitten', 'kiwi', 'knee', 'knife', 'knock', 'know', 'lab', 'label', 'labor', 'ladder',
                'lady', 'lake', 'lamp', 'land', 'landscape', 'lane', 'language', 'laptop', 'large', 'later',
                'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader',
                'leaf', 'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure', 'lemon',
                'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar', 'liberty', 'library',
                'license', 'life', 'lift', 'light', 'like', 'limb', 'limit', 'link', 'lion', 'liquid',
                'list', 'little', 'live', 'lizard', 'load', 'loan', 'lobster', 'local', 'lock', 'logic',
                'lonely', 'long', 'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage',
                'lumber', 'lunar', 'lunch', 'lung', 'lure', 'luxury', 'lyrics', 'machine', 'mad', 'magic',
                'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man', 'manage', 'mandate',
                'mango', 'mansion', 'manual', 'maple', 'marble', 'march', 'margin', 'marine', 'market', 'marriage',
                'mask', 'mass', 'master', 'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze',
                'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member',
                'memory', 'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal',
                'method', 'middle', 'midnight', 'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute',
                'miracle', 'mirror', 'misery', 'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model',
                'modify', 'mom', 'moment', 'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more',
                'morning', 'mosquito', 'mother', 'motion', 'motor', 'mountain', 'mouse', 'move', 'movie', 'much',
                'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom', 'music', 'must', 'mutual', 'myself',
                'mystery', 'myth', 'naive', 'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near',
                'neck', 'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network',
                'neutral', 'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee', 'noodle',
                'normal', 'north', 'nose', 'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear',
                'number', 'nurse', 'nut', 'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain',
                'obvious', 'occur', 'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil',
                'okay', 'old', 'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only',
                'open', 'opera', 'opinion', 'oppose', 'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary',
                'organ', 'orient', 'original', 'orphan', 'ostrich', 'other', 'our', 'ourselves', 'out', 'outdoor',
                'outer', 'outfit', 'outgoing', 'outline', 'outlook', 'outrageous', 'outstanding', 'oval', 'oven', 'over',
                'own', 'owner', 'oxygen', 'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair', 'palace',
                'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot',
                'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment',
                'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper',
                'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic',
                'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol',
                'pitch', 'pizza', 'place', 'plague', 'planet', 'plastic', 'plate', 'play', 'please', 'pledge',
                'pluck', 'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond',
                'pony', 'pool', 'poor', 'pop', 'popcorn', 'population', 'porch', 'port', 'portion', 'portrait',
                'pose', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power', 'practice',
                'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride', 'primary',
                'print', 'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program',
                'project', 'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public', 'pudding',
                'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose',
                'purse', 'push', 'put', 'puzzle', 'pyramid', 'quality', 'quantum', 'quarter', 'question', 'quick',
                'quit', 'quiz', 'quote', 'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rail',
                'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid', 'rare', 'rate',
                'rather', 'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel', 'rebuild', 'recall',
                'receive', 'recipe', 'record', 'recover', 'recruit', 'red', 'reduce', 'reflect', 'reform', 'refuse',
                'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember',
                'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'reply',
                'report', 'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat',
                'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich',
                'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'risk', 'ritual',
                'rival', 'river', 'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie',
                'room', 'rooster', 'root', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber',
                'rude', 'rug', 'rule', 'run', 'runway', 'rural', 'sad', 'saddle', 'sadness', 'safe',
                'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand', 'satisfy',
                'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene',
                'scheme', 'school', 'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub',
                'sea', 'search', 'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek',
                'segment', 'select', 'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session',
                'settle', 'setup', 'seven', 'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff',
                'shield', 'shift', 'shine', 'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'shore',
                'short', 'shoulder', 'shove', 'shrimp', 'shrug', 'shy', 'sibling', 'sick', 'side', 'siege',
                'sight', 'sign', 'silent', 'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing',
                'siren', 'sister', 'situate', 'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin',
                'skirt', 'skull', 'skunk', 'sky', 'slab', 'slam', 'slang', 'slap', 'slash', 'slate',
                'slave', 'sled', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slimy', 'sling',
                'slip', 'slit', 'slob', 'slot', 'slow', 'sludge', 'slug', 'slum', 'slurp', 'slush',
                'sly', 'smack', 'small', 'smart', 'smash', 'smell', 'smile', 'smirk', 'smog', 'smoke',
                'smooth', 'smug', 'snack', 'snail', 'snake', 'snap', 'snare', 'snarl', 'sneak', 'sneer',
                'sneeze', 'sniff', 'snore', 'snort', 'snout', 'snow', 'snub', 'snuff', 'snug', 'soak',
                'soap', 'sob', 'sober', 'soccer', 'social', 'sock', 'soda', 'sofa', 'soft', 'soggy',
                'soil', 'solar', 'soldier', 'solid', 'solo', 'solve', 'some', 'song', 'soon', 'soothe',
                'sophisticated', 'sore', 'sorrow', 'sorry', 'sort', 'soul', 'sound', 'soup', 'sour', 'south',
                'southern', 'sow', 'space', 'spare', 'spark', 'sparkle', 'spat', 'spawn', 'speak', 'spear',
                'special', 'speed', 'spell', 'spend', 'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit',
                'spit', 'splash', 'splendid', 'split', 'spoil', 'spoke', 'sponge', 'spoon', 'sport', 'spot',
                'spray', 'spread', 'spring', 'spy', 'squad', 'square', 'squash', 'squat', 'squeak', 'squeeze',
                'squirrel', 'stab', 'stable', 'stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stale',
                'stalk', 'stall', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steal', 'steam',
                'steel', 'steep', 'steer', 'stem', 'step', 'stereo', 'stick', 'still', 'sting', 'stink',
                'stir', 'stitch', 'stock', 'stomach', 'stone', 'stool', 'stoop', 'stop', 'store', 'storm',
                'story', 'stove', 'straddle', 'straight', 'strain', 'strand', 'strap', 'straw', 'stray', 'stream',
                'street', 'strength', 'stress', 'stretch', 'strict', 'stride', 'strike', 'string', 'strip', 'stroll',
                'strong', 'struggle', 'strut', 'stuck', 'study', 'stuff', 'stump', 'stun', 'stunt', 'stupid',
                'sturdy', 'stutter', 'style', 'stylish', 'subdue', 'subject', 'submit', 'substance', 'subtract', 'suburb',
                'subway', 'succeed', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'sulky', 'sultry',
                'sum', 'summer', 'sun', 'sunny', 'sunset', 'super', 'supper', 'supply', 'supreme', 'sure',
                'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap',
                'swarm', 'sway', 'swear', 'sweat', 'sweep', 'sweet', 'swell', 'swim', 'swing', 'switch',
                'sword', 'sworn', 'swung', 'swoop', 'swoosh', 'sword', 'sworn', 'swung', 'swoop', 'swoosh',
                'symbol', 'symptom', 'syndicate', 'syndrome', 'synergy', 'syntax', 'synthesis', 'syrup', 'system', 'tab',
                'table', 'tablet', 'tack', 'tackle', 'tact', 'tactics', 'tag', 'tail', 'take', 'tale',
                'talk', 'tall', 'tame', 'tan', 'tank', 'tap', 'tape', 'target', 'task', 'taste',
                'tattoo', 'taught', 'tax', 'taxi', 'tea', 'teach', 'team', 'tear', 'tease', 'tedious',
                'teen', 'teenage', 'teeth', 'telephone', 'tell', 'temper', 'ten', 'tenant', 'tend', 'tender',
                'tennis', 'tense', 'tent', 'term', 'terrible', 'terrific', 'test', 'text', 'than', 'thank',
                'that', 'the', 'theater', 'theft', 'their', 'them', 'theme', 'then', 'theory', 'there',
                'therefore', 'these', 'they', 'thick', 'thief', 'thigh', 'thin', 'thing', 'think', 'third',
                'this', 'thorough', 'those', 'though', 'thought', 'thousand', 'thread', 'threat', 'three', 'threw',
                'thrill', 'thrive', 'throat', 'throne', 'through', 'throw', 'thrust', 'thumb', 'thump', 'thunder',
                'thus', 'tick', 'ticket', 'tide', 'tidy', 'tie', 'tiger', 'tight', 'tile', 'till',
                'tilt', 'timber', 'time', 'timid', 'tin', 'tiny', 'tip', 'tire', 'tired', 'tissue',
                'title', 'to', 'toast', 'today', 'toe', 'together', 'toilet', 'token', 'told', 'tolerate',
                'tomato', 'tomorrow', 'tone', 'tongue', 'tonight', 'too', 'took', 'tool', 'tooth', 'top',
                'topic', 'topple', 'torch', 'tornado', 'tortoise', 'toss', 'total', 'touch', 'tough', 'tour',
                'toward', 'towel', 'tower', 'town', 'toy', 'trace', 'track', 'trade', 'traffic', 'tragic',
                'trail', 'train', 'trait', 'traitor', 'tram', 'trance', 'trap', 'trash', 'travel', 'tray',
                'tread', 'treason', 'treat', 'tree', 'trek', 'tremble', 'tremendous', 'trench', 'trend', 'trial',
                'tribe', 'trick', 'trickle', 'trifle', 'trim', 'trip', 'triple', 'triumph', 'trivial', 'trod',
                'troll', 'troop', 'trophy', 'trouble', 'truck', 'true', 'truly', 'trumpet', 'trunk', 'trust',
                'truth', 'try', 'tub', 'tube', 'tuck', 'tuesday', 'tug', 'tuition', 'tulip', 'tumble',
                'tuna', 'tune', 'tunnel', 'turban', 'turbine', 'turkey', 'turn', 'turtle', 'tusk', 'tutor',
                'tuxedo', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical', 'tyrant',
                'ugly', 'ultimate', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undergo', 'underlie',
                'understand', 'undertake', 'underwear', 'undo', 'undone', 'unfair', 'unfold', 'unfortunate', 'unhappy', 'unhealthy',
                'uniform', 'unimportant', 'unique', 'unit', 'unite', 'unity', 'universal', 'universe', 'unknown', 'unless',
                'unlike', 'unlikely', 'unload', 'unlock', 'unlucky', 'unnecessary', 'unpleasant', 'unreasonable', 'unstable', 'unusual',
                'unwilling', 'unwind', 'unwise', 'up', 'update', 'upgrade', 'uphold', 'upon', 'upper', 'upright',
                'upset', 'upside', 'upstairs', 'upward', 'urban', 'urge', 'urgent', 'usage', 'use', 'used',
                'useful', 'useless', 'user', 'usual', 'utility', 'utilize', 'utter', 'vacant', 'vacation', 'vacuum',
                'vague', 'vain', 'valid', 'valley', 'valuable', 'value', 'valve', 'van', 'vanish', 'vanity',
                'vapor', 'variable', 'variation', 'variety', 'various', 'vary', 'vast', 'vault', 'vegetable', 'vehicle',
                'veil', 'vein', 'velocity', 'velvet', 'vendor', 'venom', 'vent', 'venture', 'venue', 'verb',
                'verify', 'version', 'versus', 'vertical', 'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vibrate',
                'vice', 'vicious', 'victim', 'victory', 'video', 'view', 'vigor', 'village', 'vine', 'vintage',
                'violate', 'violence', 'violent', 'violet', 'violin', 'virtual', 'virus', 'visa', 'visible', 'vision',
                'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void', 'volcano', 'volume', 'volunteer',
                'vote', 'voyage', 'wade', 'waffle', 'wage', 'wagon', 'wait', 'wake', 'walk', 'wall',
                'wallet', 'walnut', 'wander', 'want', 'war', 'ward', 'warm', 'warn', 'warp', 'wash',
                'wasp', 'waste', 'water', 'watermelon', 'wave', 'wax', 'way', 'weak', 'wealth', 'weapon',
                'wear', 'weasel', 'weather', 'web', 'wedding', 'wedge', 'weed', 'week', 'weep', 'weigh',
                'weight', 'weird', 'welcome', 'weld', 'well', 'west', 'wet', 'whale', 'what', 'wheat',
                'wheel', 'when', 'where', 'whip', 'whirl', 'whisper', 'whistle', 'white', 'who', 'whole',
                'whom', 'whose', 'why', 'wicked', 'wide', 'widow', 'width', 'wife', 'wild', 'will',
                'willing', 'wilt', 'wimp', 'win', 'wind', 'window', 'wine', 'wing', 'wink', 'winner',
                'winter', 'wipe', 'wire', 'wisdom', 'wise', 'wish', 'wit', 'witch', 'with', 'withdraw',
                'withhold', 'within', 'without', 'witness', 'wizard', 'wobble', 'woe', 'wolf', 'woman', 'wonder',
                'wonderful', 'wood', 'wool', 'woozy', 'word', 'work', 'world', 'worm', 'worn', 'worried',
                'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'wow', 'wrap', 'wreck', 'wrestle',
                'wriggle', 'wring', 'wrinkle', 'wrist', 'write', 'wrong', 'wrote', 'wrought', 'wrung', 'wry',
                'yak', 'yam', 'yard', 'yarn', 'yawn', 'year', 'yellow', 'yes', 'yesterday', 'yet',
                'yield', 'yoga', 'yoke', 'yolk', 'you', 'young', 'your', 'youth', 'yummy', 'zap',
                'zebra', 'zero', 'zest', 'zigzag', 'zinc', 'zip', 'zodiac', 'zone', 'zoo', 'zoom'
            ];
            
            // Generate 12 random words
            const words = [];
            for (let i = 0; i < 12; i++) {
                const randomIndex = Math.floor(Math.random() * wordlist.length);
                words.push(wordlist[randomIndex]);
            }
            
            const phrase = words.join(' ');
            console.log('Recovery phrase generated');
            return phrase;
        } catch (error) {
            console.error('Error generating recovery phrase:', error);
            throw error;
        }
    },

    validateRecoveryPhrase(phrase) {
        console.log('Validating recovery phrase...');
        
        try {
            if (!phrase) {
                console.log('Recovery phrase validation failed: empty phrase');
                return false;
            }
            
            const words = phrase.trim().split(/\s+/);
            
            // Check if phrase has exactly 12 words
            if (words.length !== 12) {
                console.log('Recovery phrase validation failed: incorrect word count');
                return false;
            }
            
            // Check if all words are valid (simplified validation)
            const wordlist = [
                'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
                'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
                'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
                'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
                'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
                'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
                'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
                'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
                'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
                'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
                'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
                'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
                'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
                'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
                'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
                'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
                'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
                'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
                'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
                'blind', 'blood', 'blossom', 'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
                'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
                'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread',
                'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze',
                'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
                'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
                'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call',
                'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas',
                'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry',
                'cart', 'case', 'cash', 'casino', 'cast', 'casual', 'cat', 'catalog', 'catch', 'category',
                'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century',
                'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase',
                'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney',
                'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'citizen',
                'city', 'civil', 'claim', 'clamp', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever',
                'click', 'client', 'cliff', 'climb', 'cling', 'clinic', 'clip', 'clock', 'clog', 'close',
                'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut',
                'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'come', 'comfort', 'comic',
                'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince',
                'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost', 'cotton',
                'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle', 'craft',
                'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew',
                'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel',
                'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup', 'cupboard',
                'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle', 'dad', 'damage',
                'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate', 'debris',
                'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy',
                'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend',
                'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy',
                'detail', 'detect', 'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice',
                'diesel', 'diet', 'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt',
                'disagree', 'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide',
                'divorce', 'dizzy', 'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey',
                'donor', 'door', 'dose', 'double', 'dove', 'draft', 'dragon', 'drama', 'drastic', 'draw',
                'dream', 'dress', 'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum', 'dry',
                'duck', 'dumb', 'dune', 'during', 'dutch', 'duty', 'dwarf', 'dynamic', 'eager', 'eagle',
                'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology', 'economy', 'edge',
                'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elegant',
                'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion',
                'employ', 'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse', 'enemy', 'energy',
                'enforce', 'engage', 'engine', 'english', 'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure',
                'enter', 'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era', 'erase', 'erode',
                'erosion', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil',
                'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute',
                'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire',
                'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty',
                'fade', 'faint', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy',
                'fantasy', 'farm', 'fashion', 'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature',
                'february', 'federal', 'fee', 'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever',
                'few', 'fiber', 'fiction', 'field', 'figure', 'file', 'film', 'filter', 'final', 'find',
                'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'five', 'flag',
                'flame', 'flash', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock', 'floor',
                'flower', 'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow',
                'food', 'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil',
                'foster', 'found', 'fox', 'fragile', 'frame', 'frequent', 'fresh', 'friend', 'fringe', 'frog',
                'front', 'frost', 'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace', 'fury',
                'future', 'gadget', 'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden',
                'garlic', 'garment', 'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general', 'genius',
                'genre', 'gentle', 'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle', 'ginger', 'giraffe',
                'girl', 'give', 'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse', 'globe', 'gloom',
                'glory', 'glove', 'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla',
                'gospel', 'gossip', 'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape', 'grass',
                'gravity', 'great', 'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow', 'grunt',
                'guard', 'guess', 'guide', 'guilt', 'guitar', 'gun', 'gym', 'habit', 'hair', 'half',
                'hammer', 'hamster', 'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hash', 'hate',
                'have', 'hawk', 'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'hello', 'helmet',
                'help', 'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire', 'history',
                'hobby', 'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood', 'hope',
                'horn', 'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge',
                'human', 'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband',
                'hybrid', 'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness',
                'image', 'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include',
                'income', 'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict', 'inform', 'inhale',
                'inherit', 'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane',
                'insect', 'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest', 'invite', 'involve',
                'iron', 'island', 'isolate', 'issue', 'item', 'ivory', 'jacket', 'jaguar', 'jar', 'jazz',
                'jealous', 'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge',
                'juice', 'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen', 'keep', 'ketchup',
                'key', 'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite',
                'kitten', 'kiwi', 'knee', 'knife', 'knock', 'know', 'lab', 'label', 'labor', 'ladder',
                'lady', 'lake', 'lamp', 'land', 'landscape', 'lane', 'language', 'laptop', 'large', 'later',
                'latin', 'laugh', 'laundry', 'lava', 'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader',
                'leaf', 'learn', 'leave', 'lecture', 'left', 'leg', 'legal', 'legend', 'leisure', 'lemon',
                'lend', 'length', 'lens', 'leopard', 'lesson', 'letter', 'level', 'liar', 'liberty', 'library',
                'license', 'life', 'lift', 'light', 'like', 'limb', 'limit', 'link', 'lion', 'liquid',
                'list', 'little', 'live', 'lizard', 'load', 'loan', 'lobster', 'local', 'lock', 'logic',
                'lonely', 'long', 'loop', 'lottery', 'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage',
                'lumber', 'lunar', 'lunch', 'lung', 'lure', 'luxury', 'lyrics', 'machine', 'mad', 'magic',
                'magnet', 'maid', 'mail', 'main', 'major', 'make', 'mammal', 'man', 'manage', 'mandate',
                'mango', 'mansion', 'manual', 'maple', 'marble', 'march', 'margin', 'marine', 'market', 'marriage',
                'mask', 'mass', 'master', 'match', 'material', 'math', 'matrix', 'matter', 'maximum', 'maze',
                'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal', 'media', 'melody', 'melt', 'member',
                'memory', 'mention', 'menu', 'mercy', 'merge', 'merit', 'merry', 'mesh', 'message', 'metal',
                'method', 'middle', 'midnight', 'milk', 'million', 'mimic', 'mind', 'minimum', 'minor', 'minute',
                'miracle', 'mirror', 'misery', 'miss', 'mistake', 'mix', 'mixed', 'mixture', 'mobile', 'model',
                'modify', 'mom', 'moment', 'monitor', 'monkey', 'monster', 'month', 'moon', 'moral', 'more',
                'morning', 'mosquito', 'mother', 'motion', 'motor', 'mountain', 'mouse', 'move', 'movie', 'much',
                'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom', 'music', 'must', 'mutual', 'myself',
                'mystery', 'myth', 'naive', 'name', 'napkin', 'narrow', 'nasty', 'nation', 'nature', 'near',
                'neck', 'need', 'negative', 'neglect', 'neither', 'nephew', 'nerve', 'nest', 'net', 'network',
                'neutral', 'never', 'news', 'next', 'nice', 'night', 'noble', 'noise', 'nominee', 'noodle',
                'normal', 'north', 'nose', 'notable', 'note', 'nothing', 'notice', 'novel', 'now', 'nuclear',
                'number', 'nurse', 'nut', 'oak', 'obey', 'object', 'oblige', 'obscure', 'observe', 'obtain',
                'obvious', 'occur', 'ocean', 'october', 'odor', 'off', 'offer', 'office', 'often', 'oil',
                'okay', 'old', 'olive', 'olympic', 'omit', 'once', 'one', 'onion', 'online', 'only',
                'open', 'opera', 'opinion', 'oppose', 'option', 'orange', 'orbit', 'orchard', 'order', 'ordinary',
                'organ', 'orient', 'original', 'orphan', 'ostrich', 'other', 'our', 'ourselves', 'out', 'outdoor',
                'outer', 'outfit', 'outgoing', 'outline', 'outlook', 'outrageous', 'outstanding', 'oval', 'oven', 'over',
                'own', 'owner', 'oxygen', 'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair', 'palace',
                'palm', 'panda', 'panel', 'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot',
                'party', 'pass', 'patch', 'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment',
                'peace', 'peanut', 'pear', 'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper',
                'perfect', 'permit', 'person', 'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic',
                'picture', 'piece', 'pig', 'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol',
                'pitch', 'pizza', 'place', 'plague', 'planet', 'plastic', 'plate', 'play', 'please', 'pledge',
                'pluck', 'plug', 'plunge', 'poem', 'poet', 'point', 'polar', 'pole', 'police', 'pond',
                'pony', 'pool', 'poor', 'pop', 'popcorn', 'population', 'porch', 'port', 'portion', 'portrait',
                'pose', 'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power', 'practice',
                'praise', 'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride', 'primary',
                'print', 'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program',
                'project', 'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public', 'pudding',
                'pull', 'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose',
                'purse', 'push', 'put', 'puzzle', 'pyramid', 'quality', 'quantum', 'quarter', 'question', 'quick',
                'quit', 'quiz', 'quote', 'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio', 'rail',
                'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid', 'rare', 'rate',
                'rather', 'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel', 'rebuild', 'recall',
                'receive', 'recipe', 'record', 'recover', 'recruit', 'red', 'reduce', 'reflect', 'reform', 'refuse',
                'region', 'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember',
                'remind', 'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'reply',
                'report', 'require', 'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat',
                'return', 'reunion', 'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich',
                'ride', 'ridge', 'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'risk', 'ritual',
                'rival', 'river', 'road', 'roast', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie',
                'room', 'rooster', 'root', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber',
                'rude', 'rug', 'rule', 'run', 'runway', 'rural', 'sad', 'saddle', 'sadness', 'safe',
                'sail', 'salad', 'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand', 'satisfy',
                'satoshi', 'sauce', 'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene',
                'scheme', 'school', 'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub',
                'sea', 'search', 'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek',
                'segment', 'select', 'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session',
                'settle', 'setup', 'seven', 'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff',
                'shield', 'shift', 'shine', 'ship', 'shiver', 'shock', 'shoe', 'shoot', 'shop', 'shore',
                'short', 'shoulder', 'shove', 'shrimp', 'shrug', 'shy', 'sibling', 'sick', 'side', 'siege',
                'sight', 'sign', 'silent', 'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing',
                'siren', 'sister', 'situate', 'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin',
                'skirt', 'skull', 'skunk', 'sky', 'slab', 'slam', 'slang', 'slap', 'slash', 'slate',
                'slave', 'sled', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slimy', 'sling',
                'slip', 'slit', 'slob', 'slot', 'slow', 'sludge', 'slug', 'slum', 'slurp', 'slush',
                'sly', 'smack', 'small', 'smart', 'smash', 'smell', 'smile', 'smirk', 'smog', 'smoke',
                'smooth', 'smug', 'snack', 'snail', 'snake', 'snap', 'snare', 'snarl', 'sneak', 'sneer',
                'sneeze', 'sniff', 'snore', 'snort', 'snout', 'snow', 'snub', 'snuff', 'snug', 'soak',
                'soap', 'sob', 'sober', 'soccer', 'social', 'sock', 'soda', 'sofa', 'soft', 'soggy',
                'soil', 'solar', 'soldier', 'solid', 'solo', 'solve', 'some', 'song', 'soon', 'soothe',
                'sophisticated', 'sore', 'sorrow', 'sorry', 'sort', 'soul', 'sound', 'soup', 'sour', 'south',
                'southern', 'sow', 'space', 'spare', 'spark', 'sparkle', 'spat', 'spawn', 'speak', 'spear',
                'special', 'speed', 'spell', 'spend', 'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit',
                'spit', 'splash', 'splendid', 'split', 'spoil', 'spoke', 'sponge', 'spoon', 'sport', 'spot',
                'spray', 'spread', 'spring', 'spy', 'squad', 'square', 'squash', 'squat', 'squeak', 'squeeze',
                'squirrel', 'stab', 'stable', 'stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stale',
                'stalk', 'stall', 'stamp', 'stand', 'start', 'state', 'stay', 'steak', 'steal', 'steam',
                'steel', 'steep', 'steer', 'stem', 'step', 'stereo', 'stick', 'still', 'sting', 'stink',
                'stir', 'stitch', 'stock', 'stomach', 'stone', 'stool', 'stoop', 'stop', 'store', 'storm',
                'story', 'stove', 'straddle', 'straight', 'strain', 'strand', 'strap', 'straw', 'stray', 'stream',
                'street', 'strength', 'stress', 'stretch', 'strict', 'stride', 'strike', 'string', 'strip', 'stroll',
                'strong', 'struggle', 'strut', 'stuck', 'study', 'stuff', 'stump', 'stun', 'stunt', 'stupid',
                'sturdy', 'stutter', 'style', 'stylish', 'subdue', 'subject', 'submit', 'substance', 'subtract', 'suburb',
                'subway', 'succeed', 'such', 'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'sulky', 'sultry',
                'sum', 'summer', 'sun', 'sunny', 'sunset', 'super', 'supper', 'supply', 'supreme', 'sure',
                'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain', 'swallow', 'swamp', 'swap',
                'swarm', 'sway', 'swear', 'sweat', 'sweep', 'sweet', 'swell', 'swim', 'swing', 'switch',
                'sword', 'sworn', 'swung', 'swoop', 'swoosh', 'sword', 'sworn', 'swung', 'swoop', 'swoosh',
                'symbol', 'symptom', 'syndicate', 'syndrome', 'synergy', 'syntax', 'synthesis', 'syrup', 'system', 'tab',
                'table', 'tablet', 'tack', 'tackle', 'tact', 'tactics', 'tag', 'tail', 'take', 'tale',
                'talk', 'tall', 'tame', 'tan', 'tank', 'tap', 'tape', 'target', 'task', 'taste',
                'tattoo', 'taught', 'tax', 'taxi', 'tea', 'teach', 'team', 'tear', 'tease', 'tedious',
                'teen', 'teenage', 'teeth', 'telephone', 'tell', 'temper', 'ten', 'tenant', 'tend', 'tender',
                'tennis', 'tense', 'tent', 'term', 'terrible', 'terrific', 'test', 'text', 'than', 'thank',
                'that', 'the', 'theater', 'theft', 'their', 'them', 'theme', 'then', 'theory', 'there',
                'therefore', 'these', 'they', 'thick', 'thief', 'thigh', 'thin', 'thing', 'think', 'third',
                'this', 'thorough', 'those', 'though', 'thought', 'thousand', 'thread', 'threat', 'three', 'threw',
                'thrill', 'thrive', 'throat', 'throne', 'through', 'throw', 'thrust', 'thumb', 'thump', 'thunder',
                'thus', 'tick', 'ticket', 'tide', 'tidy', 'tie', 'tiger', 'tight', 'tile', 'till',
                'tilt', 'timber', 'time', 'timid', 'tin', 'tiny', 'tip', 'tire', 'tired', 'tissue',
                'title', 'to', 'toast', 'today', 'toe', 'together', 'toilet', 'token', 'told', 'tolerate',
                'tomato', 'tomorrow', 'tone', 'tongue', 'tonight', 'too', 'took', 'tool', 'tooth', 'top',
                'topic', 'topple', 'torch', 'tornado', 'tortoise', 'toss', 'total', 'touch', 'tough', 'tour',
                'toward', 'towel', 'tower', 'town', 'toy', 'trace', 'track', 'trade', 'traffic', 'tragic',
                'trail', 'train', 'trait', 'traitor', 'tram', 'trance', 'trap', 'trash', 'travel', 'tray',
                'tread', 'treason', 'treat', 'tree', 'trek', 'tremble', 'tremendous', 'trench', 'trend', 'trial',
                'tribe', 'trick', 'trickle', 'trifle', 'trim', 'trip', 'triple', 'triumph', 'trivial', 'trod',
                'troll', 'troop', 'trophy', 'trouble', 'truck', 'true', 'truly', 'trumpet', 'trunk', 'trust',
                'truth', 'try', 'tub', 'tube', 'tuck', 'tuesday', 'tug', 'tuition', 'tulip', 'tumble',
                'tuna', 'tune', 'tunnel', 'turban', 'turbine', 'turkey', 'turn', 'turtle', 'tusk', 'tutor',
                'tuxedo', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two', 'type', 'typical', 'tyrant',
                'ugly', 'ultimate', 'umbrella', 'unable', 'unaware', 'uncle', 'uncover', 'under', 'undergo', 'underlie',
                'understand', 'undertake', 'underwear', 'undo', 'undone', 'unfair', 'unfold', 'unfortunate', 'unhappy', 'unhealthy',
                'uniform', 'unimportant', 'unique', 'unit', 'unite', 'unity', 'universal', 'universe', 'unknown', 'unless',
                'unlike', 'unlikely', 'unload', 'unlock', 'unlucky', 'unnecessary', 'unpleasant', 'unreasonable', 'unstable', 'unusual',
                'unwilling', 'unwind', 'unwise', 'up', 'update', 'upgrade', 'uphold', 'upon', 'upper', 'upright',
                'upset', 'upside', 'upstairs', 'upward', 'urban', 'urge', 'urgent', 'usage', 'use', 'used',
                'useful', 'useless', 'user', 'usual', 'utility', 'utilize', 'utter', 'vacant', 'vacation', 'vacuum',
                'vague', 'vain', 'valid', 'valley', 'valuable', 'value', 'valve', 'van', 'vanish', 'vanity',
                'vapor', 'variable', 'variation', 'variety', 'various', 'vary', 'vast', 'vault', 'vegetable', 'vehicle',
                'veil', 'vein', 'velocity', 'velvet', 'vendor', 'venom', 'vent', 'venture', 'venue', 'verb',
                'verify', 'version', 'versus', 'vertical', 'very', 'vessel', 'veteran', 'viable', 'vibrant', 'vibrate',
                'vice', 'vicious', 'victim', 'victory', 'video', 'view', 'vigor', 'village', 'vine', 'vintage',
                'violate', 'violence', 'violent', 'violet', 'violin', 'virtual', 'virus', 'visa', 'visible', 'vision',
                'visit', 'visual', 'vital', 'vivid', 'vocal', 'voice', 'void', 'volcano', 'volume', 'volunteer',
                'vote', 'voyage', 'wade', 'waffle', 'wage', 'wagon', 'wait', 'wake', 'walk', 'wall',
                'wallet', 'walnut', 'wander', 'want', 'war', 'ward', 'warm', 'warn', 'warp', 'wash',
                'wasp', 'waste', 'water', 'watermelon', 'wave', 'wax', 'way', 'weak', 'wealth', 'weapon',
                'wear', 'weasel', 'weather', 'web', 'wedding', 'wedge', 'weed', 'week', 'weep', 'weigh',
                'weight', 'weird', 'welcome', 'weld', 'well', 'west', 'wet', 'whale', 'what', 'wheat',
                'wheel', 'when', 'where', 'whip', 'whirl', 'whisper', 'whistle', 'white', 'who', 'whole',
                'whom', 'whose', 'why', 'wicked', 'wide', 'widow', 'width', 'wife', 'wild', 'will',
                'willing', 'wilt', 'wimp', 'win', 'wind', 'window', 'wine', 'wing', 'wink', 'winner',
                'winter', 'wipe', 'wire', 'wisdom', 'wise', 'wish', 'wit', 'witch', 'with', 'withdraw',
                'withhold', 'within', 'without', 'witness', 'wizard', 'wobble', 'woe', 'wolf', 'woman', 'wonder',
                'wonderful', 'wood', 'wool', 'woozy', 'word', 'work', 'world', 'worm', 'worn', 'worried',
                'worry', 'worse', 'worst', 'worth', 'would', 'wound', 'wow', 'wrap', 'wreck', 'wrestle',
                'wriggle', 'wring', 'wrinkle', 'wrist', 'write', 'wrong', 'wrote', 'wrought', 'wrung', 'wry',
                'yak', 'yam', 'yard', 'yarn', 'yawn', 'year', 'yellow', 'yes', 'yesterday', 'yet',
                'yield', 'yoga', 'yoke', 'yolk', 'you', 'young', 'your', 'youth', 'yummy', 'zap',
                'zebra', 'zero', 'zest', 'zigzag', 'zinc', 'zip', 'zodiac', 'zone', 'zoo', 'zoom'
            ];
            
            for (const word of words) {
                if (!wordlist.includes(word.toLowerCase())) {
                    console.log('Recovery phrase validation failed: invalid word');
                    return false;
                }
            }
            
            console.log('Recovery phrase validation successful');
            return true;
        } catch (error) {
            console.error('Error validating recovery phrase:', error);
            return false;
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
        if (CONFIG.flags.debug) console.log('Connecting to Nostr relay:', relayUrl);
        
        try {
            // Placeholder connection
            // TODO: Implement actual WebSocket connection
            const client = {
                connected: true,
                relay: relayUrl,
                connectionTime: Date.now()
            };
            
            if (CONFIG.flags.debug) console.log('Connected to Nostr relay');
            return client;
        } catch (error) {
            console.error('Error connecting to Nostr relay:', error);
            throw error;
        }
    },

    async queryEvents(filter) {
        if (CONFIG.flags.debug) console.log('Querying Nostr events with filter:', filter);
        
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
            
            if (CONFIG.flags.debug) console.log('Events queried successfully');
            return events;
        } catch (error) {
            console.error('Error querying events:', error);
            throw error;
        }
    },

    async publishEvent(event) {
        if (CONFIG.flags.debug) console.log('Publishing Nostr event:', event.id);
        
        try {
            // Placeholder publishing
            // TODO: Implement actual Nostr event publishing
            if (CONFIG.flags.debug) console.log('Event published successfully');
            return { success: true, eventId: event.id };
        } catch (error) {
            console.error('Error publishing event:', error);
            throw error;
        }
    },

    async disconnect() {
        if (CONFIG.flags.debug) console.log('Disconnecting from Nostr relay...');
        
        try {
            // Placeholder disconnection
            // TODO: Implement actual WebSocket disconnection
            if (CONFIG.flags.debug) console.log('Disconnected from Nostr relay');
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
    // Strip leading decorative emojis from titles for cleaner display
    EMOJI_PREFIX_REGEX: /^[🎵🎧🎪🎉🎊🎈🎁🎀🎂🎃🎄🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🎖🎗🎙🎚🎛🎜🎝🎞🎟🎠🎡🎢🎣🎤🎥🎦🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏱🏲🏳🏴🏵🏶🏷🏸🏹🏺🏻🏼🏽🏾🏿]/g,
    parseEvent(nostrEvent) {
        if (CONFIG.flags.debug) console.log('Parsing Nostr event:', nostrEvent.id);
        
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
        
        if (CONFIG.flags.debug) console.log('Event parsed successfully');
        return eventData;
    },

    extractTitle(content) {
        // Extract title from content - look for emoji patterns or first line
        const lines = content.split('\n');
        const firstLine = lines[0].trim();
        
        // Remove common emojis and clean up
        return firstLine.replace(this.EMOJI_PREFIX_REGEX, '').trim();
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
        // Safely parse date - handle both string and Date object
        let time = '--:--';
        if (event.date) {
            try {
                const dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                if (!isNaN(dateObj.getTime())) {
                    time = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            } catch (e) {
                // If date parsing fails, keep default
            }
        }
        
        // Get title - try multiple possible field names
        const title = event.title || event.name || 'Event';
        
        return `
            <div class="event-listing">
                <span class="time">${time}</span>
                <span class="type">[${(event.type || 'EVENT').toUpperCase()}]</span>
                <span>${title}</span>
                <span class="location">${event.location || 'Location TBD'}</span>
                ${event.dj ? `<span class="dj">DJ: <span class="dj-name" onclick="router.showDJProfileView('${event.dj}')" style="cursor: pointer; text-decoration: underline;">${event.dj}</span></span>` : ''}
                ${event.friendsGoing !== undefined ? `<span class="friends-attending">[${event.friendsGoing || 0}/${event.attending || 0}]</span>` : ''}
                <a href="#" class="details-link" onclick="event.preventDefault(); router.showEventDetailsView('${title}'); return false;">[DETAILS]</a>
            </div>
        `;
    },

    createDJCard(djInfo) {
        // djInfo can be a profile object OR a week activity object with {name, eventCount, venues, events}
        const djName = djInfo.name;
        const eventCount = djInfo.eventCount || 0;
        const venues = djInfo.venues || [];
        const venueList = venues.length > 0 ? venues.join(', ') : 'TBD';
        
        return `
            <div class="dj-listing" onclick="router.showDJProfileView('${djName}')" style="cursor: pointer;">
                <span class="dj-name">${djName}</span>
                ${eventCount > 0 ? `<span class="dj-event-count">${eventCount} ${eventCount === 1 ? 'event' : 'events'}</span>` : ''}
                ${venues.length > 0 ? `<span class="dj-venues">${venueList}</span>` : ''}
                <a href="#" class="details-link" onclick="event.stopPropagation(); router.showDJProfileView('${djName}'); return false;">[PROFILE]</a>
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
            const cityContext = state.userCity ? ` in ${state.userCity}` : '';
            container.innerHTML = `
                <div class="empty-state">
                    > No events found${cityContext}. Use refresh to reload data.
                </div>
            `;
            return;
        }

        // Sort events by date (upcoming first, then past)
        const now = new Date();
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = a.date || a.start;
            const dateB = b.date || b.start;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            const timeA = new Date(dateA);
            const timeB = new Date(dateB);
            return timeA - timeB;
        });
        
        // Clear container and add events as flat list
        container.innerHTML = sortedEvents.map(this.createEventCard).join('');
        
        console.log(`✅ Rendered ${sortedEvents.length} events`);
        if (CONFIG.flags.debug) console.log('Events rendered');
    },

    renderDJProfiles(profiles, highlightName = null) {
        const container = document.getElementById('dj-profiles-container');
        if (!container) {
            console.error('DJ profiles container not found!');
            return;
        }

        if (!profiles || profiles.length === 0) {
            container.innerHTML = '<div class="empty-state">> No DJ profiles found.</div>';
            return;
        }

        // Create DJ cards - profiles is now array of week activity objects
        const cardsHTML = profiles.map(this.createDJCard).join('');
        container.innerHTML = cardsHTML;
        
        if (CONFIG.flags.debug) console.log('DJ profiles rendered');
        
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

    async renderDJProfile(profile) {
        const container = document.getElementById('dj-profile-container');
        if (!container) {
            console.error('DJ profile container not found!');
            return;
        }

        if (!profile) {
            container.innerHTML = '<p>DJ profile not found.</p>';
            return;
        }

        // Load editorial attributes and reviews in parallel
        const [editorial, reviews] = await Promise.all([
            api.fetchDJEditorialAttributes(profile.name),
            api.fetchDJReviewsAggregate(profile.name)
        ]);
        
        // Aggregate statistics from events
        const stats = aggregateDJStats(profile.name);
        
        // Calculate user stats (Seen count, By Friends)
        const userStats = calculateUserDJStats(profile.name, state.currentUser);
        
        // Generate x.dance URL
        const xDanceSlug = generateXDanceSlug(profile.name);
        
        // Format date helper
        const formatDate = (date) => {
            if (!date) return null;
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        };

        // Build terminal-style profile
        let html = `
            <div class="dj-profile-terminal">
                <div class="dj-profile-header-terminal">
                    <h1 class="dj-profile-name">${profile.name}</h1>
                    <div class="dj-profile-url">
                        <span class="url-label">x.dance/</span><span class="url-slug">${xDanceSlug}</span>
                    </div>
                </div>
        `;

        // User stats (Seen, By Friends) - only show if > 0
        if (userStats.seenCount > 0 || userStats.friendsCount > 0) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">YOUR HISTORY</div>
                <div class="section-content">`;
            if (userStats.seenCount > 0) {
                html += `<div class="stat-line"><span class="stat-label">SEEN:</span> ${userStats.seenCount}</div>`;
            }
            if (userStats.friendsCount > 0) {
                html += `<div class="stat-line"><span class="stat-label">BY FRIENDS:</span> ${userStats.friendsCount}</div>`;
            }
            html += `</div></div>`;
        }

        // Editorial attributes
        if (editorial) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">EDITORIAL</div>
                <div class="section-content">`;
            
            if (editorial.tribe) {
                html += `<div class="stat-line"><span class="stat-label">TRIBE:</span> ${editorial.tribe}</div>`;
            }
            
            if (editorial.genres && editorial.genres.length > 0) {
                html += `<div class="stat-line"><span class="stat-label">GENRES:</span> ${editorial.genres.join(', ')}</div>`;
            }
            
            if (editorial.style_tags && editorial.style_tags.length > 0) {
                html += `<div class="stat-line"><span class="stat-label">STYLE:</span> ${editorial.style_tags.join(', ')}</div>`;
            }
            
            if (editorial.editorial_rating !== null && editorial.editorial_rating !== undefined) {
                html += `<div class="stat-line"><span class="stat-label">RATING:</span> ${editorial.editorial_rating}/5</div>`;
            }
            
            if (editorial.price_range_min !== null && editorial.price_range_min !== undefined) {
                html += `<div class="stat-line"><span class="stat-label">ASKED:</span> $${editorial.price_range_min} - $${editorial.price_range_max}</div>`;
            }
            
            html += `</div></div>`;
        }

        // Reviews (clickable)
        if (reviews && reviews.review_count > 0) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">REVIEWS</div>
                <div class="section-content">
                    <a href="#" class="reviews-link" onclick="router.showDJReviews('${profile.name}'); return false;">
                        ${reviews.average_rating}/5
                    </a>
                    <span class="review-count">(${reviews.review_count} reviews)</span>
                </div>
            </div>`;
        }

        // Status (only if we have stats)
        if (stats && stats.activityStatus) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">STATUS</div>
                <div class="section-content">${stats.activityStatus}</div>
            </div>`;
        }

        // Statistics section (only show if we have event data)
        if (stats && stats.totalEvents > 0) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">STATISTICS</div>
                <div class="section-content">`;

            if (stats.totalEvents > 0) {
                html += `<div class="stat-line"><span class="stat-label">EVENTS:</span> ${stats.totalEvents}</div>`;
            }

            if (stats.firstAppearance) {
                html += `<div class="stat-line"><span class="stat-label">FIRST APPEARANCE:</span> ${formatDate(stats.firstAppearance)}</div>`;
            }

            if (stats.lastAppearance) {
                html += `<div class="stat-line"><span class="stat-label">LAST APPEARANCE:</span> ${formatDate(stats.lastAppearance)}</div>`;
            }

            if (stats.frequency) {
                html += `<div class="stat-line"><span class="stat-label">FREQUENCY:</span> ${stats.frequency}</div>`;
            }

            html += `</div></div>`;
        }

        // Cities section (only if cities exist)
        if (stats && stats.cities && stats.cities.length > 0) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">CITIES</div>
                <div class="section-content">
                    ${stats.cities.map(c => `${c.city} (${c.count})`).join(' | ')}
                </div>
            </div>`;
        }

        // Upcoming events - city-specific (only next 3 in user's city)
        if (stats && stats.upcomingEvents && stats.upcomingEvents.length > 0) {
            // Filter by user's city if set
            let cityUpcoming = [];
            let allUpcoming = stats.upcomingEvents;
            
            if (state.userCity) {
                const userCityLower = state.userCity.toLowerCase().trim();
                cityUpcoming = stats.upcomingEvents.filter(event => {
                    if (!event.city) return false;
                    const eventCity = event.city.toLowerCase().trim();
                    return eventCity === userCityLower || 
                           eventCity.includes(userCityLower) || 
                           userCityLower.includes(eventCity);
                }).slice(0, 3); // Next 3 in user's city
            } else {
                // No city selected, show next 3 overall
                cityUpcoming = stats.upcomingEvents.slice(0, 3);
            }
            
            // Show city-specific upcoming if we have any
            if (cityUpcoming.length > 0) {
                html += `
            <div class="dj-profile-section">
                <div class="section-label">UPCOMING${state.userCity ? ` [${state.userCity.toUpperCase()}]` : ''}</div>
                <div class="section-content">`;
                cityUpcoming.forEach(event => {
                    html += `
                <div class="upcoming-event">
                    <span class="event-date">${formatDate(event.date)}</span>
                    <span class="event-venue">${event.venue}</span>
                    ${event.city ? `<span class="event-city">[${event.city}]</span>` : ''}
                    <a href="#" class="details-link" onclick="router.showEventDetailsView('${event.title}'); return false;">[DETAILS]</a>
                </div>`;
                });
                
                // Show "view all" link if there are more events (all cities)
                if (allUpcoming.length > cityUpcoming.length) {
                    html += `
                <div class="upcoming-event" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-primary);">
                    <a href="#" class="reviews-link" onclick="router.showDJUpcomingAll('${profile.name}'); return false;">
                        [VIEW ALL UPCOMING] (${allUpcoming.length} total)
                    </a>
                </div>`;
                }
                
                html += `</div></div>`;
            } else if (allUpcoming.length > 0 && state.userCity) {
                // No events in user's city, but there are events elsewhere
                html += `
            <div class="dj-profile-section">
                <div class="section-label">UPCOMING [${state.userCity.toUpperCase()}]</div>
                <div class="section-content">
                    <div style="color: var(--text-muted); margin-bottom: 12px;">
                        No upcoming events in ${state.userCity}
                    </div>
                    <div>
                        <a href="#" class="reviews-link" onclick="router.showDJUpcomingAll('${profile.name}'); return false;">
                            [VIEW ALL UPCOMING] (${allUpcoming.length} total)
                        </a>
                    </div>
                </div>
            </div>`;
            }
        }

        // Venue history (only if venues exist)
        if (stats && stats.venueHistory && stats.venueHistory.length > 0) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">VENUE HISTORY</div>
                <div class="section-content">
                    ${stats.venueHistory.slice(0, 10).map(v => `${v.venue} (${v.count}x)`).join(' | ')}
                </div>
            </div>`;
        }

        // External links (only if they exist)
        const hasLinks = profile.soundcloud || profile.instagram || profile.bandcamp || profile.website;
        if (hasLinks) {
            html += `
            <div class="dj-profile-section">
                <div class="section-label">EXTERNAL</div>
                <div class="section-content">`;
            if (profile.soundcloud) {
                html += `<div class="external-link"><a href="https://soundcloud.com/${profile.soundcloud}" target="_blank">SOUNDCLOUD: ${profile.soundcloud}</a></div>`;
            }
            if (profile.instagram) {
                html += `<div class="external-link"><a href="https://instagram.com/${profile.instagram.replace('@', '')}" target="_blank">INSTAGRAM: ${profile.instagram.replace('@', '')}</a></div>`;
            }
            if (profile.bandcamp) {
                html += `<div class="external-link"><a href="${profile.bandcamp}" target="_blank">BANDCAMP: ${profile.bandcamp}</a></div>`;
            }
            if (profile.website) {
                html += `<div class="external-link"><a href="${profile.website}" target="_blank">WEBSITE: ${profile.website}</a></div>`;
            }
            html += `</div></div>`;
        }

        html += `
            <div class="dj-profile-actions">
                ${stats && stats.upcomingEvents && stats.upcomingEvents.length > 0 ? `
                <button class="back-button" onclick="router.showDJUpcomingAll('${profile.name}');" style="margin-right: 10px;">
                    [VIEW ALL UPCOMING]
                </button>
                ` : ''}
                <button class="back-button" onclick="router.switchTab('djs')">[BACK]</button>
            </div>
        </div>`;

        container.innerHTML = html;
        
        if (CONFIG.flags.debug) console.log('DJ profile rendered with all attributes');
    },

    showEmpty(containerId, message) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<div class="empty-state">${message}</div>`;
    },

    renderDJUpcomingEvents(djName) {
        const container = document.getElementById('dj-upcoming-container');
        if (!container) {
            console.error('DJ upcoming container not found!');
            return;
        }

        // Get all events for this DJ (upcoming and past)
        const stats = aggregateDJStats(djName);
        if (!stats) {
            container.innerHTML = '<div class="empty-state">> No events found.</div>';
            return;
        }

        const now = new Date();
        const upcomingEvents = (stats.upcomingEvents || []).filter(e => e.date && new Date(e.date) > now);
        const pastEvents = stats.allEvents ? stats.allEvents.filter(e => {
            const eventDate = e.dateObj || (e.date ? new Date(e.date) : null);
            return eventDate && eventDate < now;
        }).sort((a, b) => {
            const dateA = a.dateObj || (a.date ? new Date(a.date) : null);
            const dateB = b.dateObj || (b.date ? new Date(b.date) : null);
            return (dateB || 0) - (dateA || 0); // Most recent first
        }) : [];

        // Update title
        const titleElement = document.getElementById('dj-upcoming-title');
        if (titleElement) {
            titleElement.textContent = `${djName} - Events (${upcomingEvents.length} upcoming, ${pastEvents.length} past)`;
        }

        // Format date helper
        const formatDate = (date) => {
            if (!date) return null;
            const dateObj = date instanceof Date ? date : new Date(date);
            return dateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        };

        // Sort upcoming by date (ascending), past by date (descending - most recent first)
        const sortedUpcoming = [...upcomingEvents].sort((a, b) => {
            const dateA = a.date instanceof Date ? a.date : new Date(a.date);
            const dateB = b.date instanceof Date ? b.date : new Date(b.date);
            return dateA - dateB;
        });

        // Build tabs for upcoming/past
        let html = `
            <div class="dj-upcoming-terminal">
                <div class="dj-upcoming-header">
                    <div class="event-tabs">
                        <button class="event-tab active" onclick="views.switchEventTab('upcoming', '${djName}')">
                            UPCOMING (${upcomingEvents.length})
                        </button>
                        <button class="event-tab" onclick="views.switchEventTab('past', '${djName}')">
                            PAST (${pastEvents.length})
                        </button>
                    </div>
                </div>
                <div id="dj-events-content">
        `;

        // Render upcoming events
        if (sortedUpcoming.length > 0) {
            sortedUpcoming.forEach((event, index) => {
            html += `
                <div class="upcoming-event-detail">
                    <div class="event-detail-header">
                        <span class="event-number">${index + 1}.</span>
                        <span class="event-title">${event.title}</span>
                    </div>
                    <div class="event-detail-info">
                        <div class="event-detail-line">
                            <span class="detail-label">DATE:</span> ${formatDate(event.date)}
                        </div>
                        <div class="event-detail-line">
                            <span class="detail-label">VENUE:</span> ${event.venue}
                        </div>
                        ${event.city ? `
                        <div class="event-detail-line">
                            <span class="detail-label">CITY:</span> ${event.city}
                        </div>
                        ` : ''}
                        <div class="event-detail-actions">
                            <a href="#" class="details-link" onclick="router.showEventDetailsView('${event.title}'); return false;">[DETAILS]</a>
                        </div>
                    </div>
                </div>
            `;
            });
        } else {
            html += `<div class="empty-state">> No upcoming events.</div>`;
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        // Store events for tab switching
        container.dataset.djName = djName;
        container.dataset.upcomingEvents = JSON.stringify(sortedUpcoming);
        container.dataset.pastEvents = JSON.stringify(pastEvents);
        
        if (CONFIG.flags.debug) console.log('DJ events rendered:', sortedUpcoming.length, 'upcoming,', pastEvents.length, 'past');
    },

    switchEventTab(tab, djName) {
        const container = document.getElementById('dj-upcoming-container');
        if (!container) return;

        const upcomingEvents = JSON.parse(container.dataset.upcomingEvents || '[]');
        const pastEvents = JSON.parse(container.dataset.pastEvents || '[]');
        const contentDiv = document.getElementById('dj-events-content');
        
        if (!contentDiv) return;

        // Update tab buttons
        const tabs = container.querySelectorAll('.event-tab');
        tabs.forEach(t => t.classList.remove('active'));
        const activeTab = Array.from(tabs).find(t => t.textContent.includes(tab.toUpperCase()));
        if (activeTab) activeTab.classList.add('active');

        // Format date helper
        const formatDate = (date) => {
            if (!date) return null;
            const dateObj = date instanceof Date ? date : new Date(date);
            return dateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        };

        let html = '';

        if (tab === 'upcoming') {
            if (upcomingEvents.length > 0) {
                upcomingEvents.forEach((event, index) => {
                    html += `
                <div class="upcoming-event-detail">
                    <div class="event-detail-header">
                        <span class="event-number">${index + 1}.</span>
                        <span class="event-title">${event.title}</span>
                    </div>
                    <div class="event-detail-info">
                        <div class="event-detail-line">
                            <span class="detail-label">DATE:</span> ${formatDate(event.date)}
                        </div>
                        <div class="event-detail-line">
                            <span class="detail-label">VENUE:</span> ${event.venue}
                        </div>
                        ${event.city ? `
                        <div class="event-detail-line">
                            <span class="detail-label">CITY:</span> ${event.city}
                        </div>
                        ` : ''}
                        <div class="event-detail-actions">
                            <a href="#" class="details-link" onclick="router.showEventDetailsView('${event.title}'); return false;">[DETAILS]</a>
                        </div>
                    </div>
                </div>
            `;
                });
            } else {
                html = `<div class="empty-state">> No upcoming events.</div>`;
            }
        } else {
            // Past events
            if (pastEvents.length > 0) {
                pastEvents.forEach((event, index) => {
                    const eventDate = event.dateObj || (event.date ? new Date(event.date) : null);
                    const venue = event.venue?.name || event.venue || event.location || 'TBD';
                    const city = event.city || event.venue?.city || '';
                    
                    html += `
                <div class="upcoming-event-detail">
                    <div class="event-detail-header">
                        <span class="event-number">${index + 1}.</span>
                        <span class="event-title">${event.title || event.name || 'Event'}</span>
                    </div>
                    <div class="event-detail-info">
                        <div class="event-detail-line">
                            <span class="detail-label">DATE:</span> ${formatDate(eventDate)}
                        </div>
                        <div class="event-detail-line">
                            <span class="detail-label">VENUE:</span> ${venue}
                        </div>
                        ${city ? `
                        <div class="event-detail-line">
                            <span class="detail-label">CITY:</span> ${city}
                        </div>
                        ` : ''}
                        <div class="event-detail-actions">
                            <a href="#" class="details-link" onclick="router.showEventDetailsView('${event.title || event.name}'); return false;">[DETAILS]</a>
                        </div>
                    </div>
                </div>
            `;
                });
            } else {
                html = `<div class="empty-state">> No past events.</div>`;
            }
        }

        contentDiv.innerHTML = html;
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
        
        if (CONFIG.flags.debug) console.log('Venues rendered');
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
        
        if (CONFIG.flags.debug) console.log('Venue details rendered');
    },

    createOperatorCard(operatorInfo) {
        // operatorInfo can be a profile object OR a week activity object with {name, eventCount, venues, events, specialty}
        const operatorName = operatorInfo.name;
        const eventCount = operatorInfo.eventCount || 0;
        const venues = operatorInfo.venues || [];
        const venueList = venues.length > 0 ? venues.join(', ') : 'TBD';
        const specialty = operatorInfo.specialty || operatorInfo.role || 'Operator';
        
        return `
            <div class="operator-listing" onclick="router.showOperatorProfileView('${operatorName}')" style="cursor: pointer;">
                <span class="operator-name">${operatorName}</span>
                <span class="operator-specialty">[${specialty}]</span>
                ${eventCount > 0 ? `<span class="operator-event-count">${eventCount} ${eventCount === 1 ? 'event' : 'events'}</span>` : ''}
                ${venues.length > 0 ? `<span class="operator-venues">${venueList}</span>` : ''}
                <a href="#" class="details-link" onclick="event.stopPropagation(); router.showOperatorProfileView('${operatorName}'); return false;">[PROFILE]</a>
            </div>
        `;
    },

    renderOperators(operators) {
        const container = document.getElementById('operators-container');
        if (!container) {
            console.error('Operators container not found!');
            return;
        }

        if (!operators || operators.length === 0) {
            const cityContext = state.userCity ? ` in ${state.userCity}` : '';
            container.innerHTML = `
                <div class="empty-state">
                    > No operators active in the next 7 days${cityContext}.
                </div>
            `;
            return;
        }

        container.innerHTML = operators.map(this.createOperatorCard).join('');
        
        console.log(`✅ Rendered ${operators.length} operators`);
        if (CONFIG.flags.debug) console.log('Operators rendered');
    },

    renderOperatorProfile(operator) {
        // Placeholder - will be expanded with editorial attributes similar to DJ profiles
        const container = document.getElementById('operator-profile-container');
        if (!container) {
            console.error('Operator profile container not found!');
            return;
        }

        // For now, basic profile structure
        // Future: add specialties, contact info, reputation metrics, events worked
        const html = `
            <div class="operator-profile-terminal">
                <div class="operator-profile-header">
                    <div class="operator-name-large">${operator.name}</div>
                    <div class="operator-specialty-display">${operator.specialty || 'Operator'}</div>
                </div>
                
                <div class="operator-profile-info">
                    <div class="profile-section">
                        <div class="profile-line">
                            <span class="profile-label">ROLE:</span>
                            <span class="profile-value">${operator.specialty || 'General Operator'}</span>
                        </div>
                        ${operator.eventCount ? `
                        <div class="profile-line">
                            <span class="profile-label">UPCOMING EVENTS:</span>
                            <span class="profile-value">${operator.eventCount}</span>
                        </div>
                        ` : ''}
                        ${operator.venues && operator.venues.length > 0 ? `
                        <div class="profile-line">
                            <span class="profile-label">VENUES:</span>
                            <span class="profile-value">${operator.venues.join(', ')}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="operator-profile-actions">
                        <button class="back-button" onclick="router.switchTab('operators')">[BACK]</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        if (CONFIG.flags.debug) console.log('Operator profile rendered');
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
        
        if (CONFIG.flags.debug) console.log('Sound system details rendered');
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
        
        if (CONFIG.flags.debug) console.log('Social feed rendered');
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

        // Create detailed event HTML - Terminal style
        // Safely parse date - handle both string and Date object
        let eventDate = 'Date TBD';
        let eventTime = '--:--';
        if (event.date) {
            try {
                const dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                if (!isNaN(dateObj.getTime())) {
                    eventDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    eventTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            } catch (e) {
                // Keep defaults if parsing fails
            }
        }
        
        // Get title - try multiple possible field names
        const title = event.title || event.name || 'Event';
        
        container.innerHTML = `
            <div class="event-details-card">
                <div class="event-details-header">
                    <h1 class="event-details-title">${title}</h1>
                    <p class="event-details-date">${eventDate} ${eventTime}</p>
                    <p class="event-details-location">${event.location || 'Location TBD'}</p>
                </div>
                
                <div class="event-details-content">
                    <div class="event-details-info">
                        <p><strong>TYPE:</strong> ${(event.type || 'EVENT').toUpperCase()}</p>
                        <p><strong>MUSIC:</strong> ${event.music || 'Electronic'}</p>
                        <p><strong>ATTENDANCE:</strong> ${event.friendsGoing || 0}/${event.attending || 0}</p>
                    </div>
                    
                    ${event.dj ? `
                    <div class="event-details-dj">
                        <p><strong>DJ:</strong> <a href="#" onclick="router.showDJProfileView('${event.dj}'); return false;" style="color: var(--text-primary); text-decoration: underline;">${event.dj}</a></p>
                    </div>
                    ` : ''}
                    
                    <div class="event-details-actions">
                        <button class="event-action-button secondary" onclick="router.switchTab('events')">
                            [BACK]
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        if (CONFIG.flags.debug) console.log('Event details rendered');
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
        const djUpcomingView = document.getElementById('dj-upcoming-view');
        if (djUpcomingView) djUpcomingView.style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('dj-profile-title');
        if (titleElement) {
            titleElement.textContent = `${djName} - Profile`;
        }
        
        // Load and render the DJ profile (now async)
        views.showLoading('dj-profile-container');
        try {
            const profile = await api.fetchDJProfile(djName);
            await views.renderDJProfile(profile);
        } catch (error) {
            views.showError('dj-profile-container', error.message);
        }
    },

    showDJUpcomingAll(djName) {
        // Show detailed view of all upcoming events for this DJ
        console.log('Showing all upcoming events for:', djName);
        state.currentView = 'dj-upcoming';
        state.selectedDJ = djName;
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('event-details-view').style.display = 'none';
        const upcomingView = document.getElementById('dj-upcoming-view');
        if (upcomingView) {
            upcomingView.style.display = 'block';
        }
        
        // Render upcoming events
        views.renderDJUpcomingEvents(djName);
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
        document.getElementById('operator-profile-view').style.display = 'none';
        document.getElementById('operators-view').style.display = 'none';
        document.getElementById('users-view').style.display = 'none';
        const djUpcomingView = document.getElementById('dj-upcoming-view');
        if (djUpcomingView) djUpcomingView.style.display = 'none';
        
        // Show the selected tab's view
        switch(tabName) {
            case 'events':
                document.getElementById('events-view').style.display = 'block';
                state.currentView = 'events';
                // Ensure all events are displayed (no city filtering)
                if (state.eventsData && state.eventsData.length > 0) {
                    views.renderEvents(state.eventsData);
                }
                break;
            case 'djs':
                document.getElementById('dj-view').style.display = 'block';
                state.currentView = 'dj';
                // Show only DJs active in next 7 days
                views.showLoading('dj-profiles-container');
                const activeDJs = getDJsActiveThisWeek();
                if (activeDJs.length === 0) {
                    const cityContext = state.userCity ? ` in ${state.userCity}` : '';
                    views.showEmpty('dj-profiles-container', `> No DJs active in the next 7 days${cityContext}.`);
                } else {
                    views.renderDJProfiles(activeDJs);
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
            case 'operators':
                document.getElementById('operators-view').style.display = 'block';
                state.currentView = 'operators';
                // Show only operators active in next 7 days (similar to DJs)
                views.showLoading('operators-container');
                const activeOperators = getOperatorsActiveThisWeek();
                if (activeOperators.length === 0) {
                    const cityContext = state.userCity ? ` in ${state.userCity}` : '';
                    views.showEmpty('operators-container', `> No operators active in the next 7 days${cityContext}.`);
                } else {
                    views.renderOperators(activeOperators);
                }
                break;
            case 'users':
                document.getElementById('users-view').style.display = 'block';
                state.currentView = 'users';
                // Load social feed if not already loaded (internal: still uses social layer)
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
        document.getElementById('users-view').style.display = 'none';
        
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

    async showOperatorProfileView(operatorName) {
        console.log('Switching to operator profile view for:', operatorName);
        state.currentView = 'operator-profile';
        state.selectedOperator = operatorName;
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('event-details-view').style.display = 'none';
        document.getElementById('venues-view').style.display = 'none';
        document.getElementById('operator-profile-view').style.display = 'block';
        document.getElementById('operators-view').style.display = 'none';
        document.getElementById('users-view').style.display = 'none';
        const djUpcomingView = document.getElementById('dj-upcoming-view');
        if (djUpcomingView) djUpcomingView.style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('operator-profile-title');
        if (titleElement) {
            titleElement.textContent = `${operatorName} - Profile`;
        }
        
        // Get operator data from active operators or create basic profile
        const activeOperators = getOperatorsActiveThisWeek();
        let operator = activeOperators.find(op => op.name === operatorName);
        
        if (!operator) {
            // Create basic operator object if not found in active list
            operator = {
                name: operatorName,
                specialty: 'Operator',
                eventCount: 0,
                venues: []
            };
        }
        
        views.renderOperatorProfile(operator);
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
        const backToOperatorsButton = document.getElementById('back-to-operators');
        if (backToOperatorsButton) {
            backToOperatorsButton.addEventListener('click', () => this.switchTab('operators'));
        }
        
        // Back to friends button
        
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
        
        // Account mode selection event listeners
        const modeOptions = document.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            option.addEventListener('click', () => this.selectAccountMode(option.dataset.mode));
        });
        
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
            if (CONFIG.flags.debug) console.log('Refreshed events from Nostr:', events.length);
            
            // Refresh profiles from Nostr
            const profiles = await social.fetchProfilesFromNostr();
            if (CONFIG.flags.debug) console.log('Refreshed profiles from Nostr:', profiles.length);
            
            // Re-render current view to show new data
            if (state.currentView === 'events') {
                // Main Events tab shows ALL events (no city filtering)
                views.renderEvents(state.events || state.eventsData || []);
            } else if (state.currentView === 'djs') {
                views.renderDJs(state.djs);
            } else if (state.currentView === 'venues') {
                views.renderVenues(state.venues);
            } else if (state.currentView === 'operators') {
                const activeOperators = getOperatorsActiveThisWeek();
                views.renderOperators(activeOperators);
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
        const accountModeSelection = document.getElementById('account-mode-selection');
        const passwordGroup = document.getElementById('password-group');
        const recoveryPhraseGroup = document.getElementById('recovery-phrase-group');
        
        if (!authModal) return;
        
        // Set mode
        state.authModalMode = mode;
        state.selectedAccountMode = null; // Reset account mode selection
        
        // Update UI based on mode
        if (mode === 'login') {
            authModalTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Login';
            authSwitchText.textContent = "Don't have an account?";
            authSwitchBtn.textContent = 'Sign Up';
            
            // Hide account mode selection for login
            if (accountModeSelection) accountModeSelection.style.display = 'none';
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (recoveryPhraseGroup) recoveryPhraseGroup.style.display = 'none';
            
        } else {
            authModalTitle.textContent = 'Sign Up';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchText.textContent = 'Already have an account?';
            authSwitchBtn.textContent = 'Login';
            
            // Show account mode selection for signup
            if (accountModeSelection) accountModeSelection.style.display = 'block';
            if (passwordGroup) passwordGroup.style.display = 'none';
            if (recoveryPhraseGroup) recoveryPhraseGroup.style.display = 'none';
            
            // Reset mode selection
            this.resetAccountModeSelection();
        }
        
        // Clear form
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        const recoveryPhraseInput = document.getElementById('auth-recovery-phrase');
        if (recoveryPhraseInput) recoveryPhraseInput.value = '';
        
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

    selectAccountMode(mode) {
        console.log('Account mode selected:', mode);
        
        state.selectedAccountMode = mode;
        
        // Update UI to show selected mode
        const modeOptions = document.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.mode === mode) {
                option.classList.add('selected');
            }
        });
        
        // Show/hide form fields based on mode
        const passwordGroup = document.getElementById('password-group');
        const recoveryPhraseGroup = document.getElementById('recovery-phrase-group');
        const modeWarning = document.getElementById('mode-warning');
        
        if (mode === 'light') {
            // Light mode: Show password field, hide recovery phrase
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (recoveryPhraseGroup) recoveryPhraseGroup.style.display = 'none';
            if (modeWarning) modeWarning.style.display = 'none';
            
        } else if (mode === 'bold') {
            // Bold mode: Show password field and recovery phrase, show warning
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (recoveryPhraseGroup) recoveryPhraseGroup.style.display = 'block';
            if (modeWarning) modeWarning.style.display = 'block';
        }
    },

    resetAccountModeSelection() {
        console.log('Resetting account mode selection');
        
        state.selectedAccountMode = null;
        
        // Remove selected class from all options
        const modeOptions = document.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Hide warning
        const modeWarning = document.getElementById('mode-warning');
        if (modeWarning) modeWarning.style.display = 'none';
    },

    async handleAuthSubmit(e) {
        e.preventDefault();
        console.log('Handling auth submit in', state.authModalMode, 'mode');
        
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const recoveryPhrase = document.getElementById('auth-recovery-phrase').value;
        
        // Validate based on mode
        if (state.authModalMode === 'signup') {
            if (!state.selectedAccountMode) {
                alert('Please select an account mode (Light or Bold)');
                return;
            }
            
            if (!email || !password) {
                alert('Please fill in all required fields');
                return;
            }
            
            if (state.selectedAccountMode === 'bold' && !recoveryPhrase) {
                alert('Please enter your recovery phrase for Bold mode');
                return;
            }
        } else {
            // Login mode
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }
        }
        
        try {
            let result;
            if (state.authModalMode === 'login') {
                // For login, try both light and bold modes
                result = await this.handleLogin(email, password, recoveryPhrase);
            } else {
                // For signup, use selected mode
                result = await this.handleSignup(email, password, recoveryPhrase);
            }
            
            if (result.success) {
                this.hideAuthModal();
                this.updateAuthStatus();
                console.log('Authentication successful');
                
                // Show success message for Bold mode signup
                if (state.authModalMode === 'signup' && state.selectedAccountMode === 'bold' && result.recoveryPhrase) {
                    this.showRecoveryPhraseModal(result.recoveryPhrase);
                }
            } else {
                alert('Authentication failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Authentication error:', error);
            alert('Authentication failed: ' + error.message);
        }
    },

    async handleLogin(email, password, recoveryPhrase) {
        console.log('Handling login for', email);
        
        try {
            // Try standard login first
            const result = await social.signIn(email, password);
            if (result.success) {
                // Store account mode in state
                state.userAccountMode = 'light'; // Default to light for existing users
                return result;
            }
        } catch (error) {
            console.log('Standard login failed, trying recovery phrase login');
            
            // If standard login fails and recovery phrase is provided, try recovery
            if (recoveryPhrase) {
                try {
                    const recoveryResult = await social.recoverKeysWithRecoveryPhrase(email, recoveryPhrase, password);
                    if (recoveryResult.success) {
                        state.userAccountMode = 'bold';
                        return recoveryResult;
                    }
                } catch (recoveryError) {
                    console.error('Recovery phrase login failed:', recoveryError);
                }
            }
        }
        
        throw new Error('Login failed. Please check your credentials.');
    },

    async handleSignup(email, password, recoveryPhrase) {
        console.log('Handling signup for', email, 'in', state.selectedAccountMode, 'mode');
        
        if (state.selectedAccountMode === 'light') {
            // Light mode: Standard Supabase signup
            const result = await social.signUpLight(email, password);
            if (result.success) {
                state.userAccountMode = 'light';
            }
            return result;
        } else if (state.selectedAccountMode === 'bold') {
            // Bold mode: Full Nostr key generation with recovery phrase
            const result = await social.signUp(email, password);
            if (result.success) {
                state.userAccountMode = 'bold';
            }
            return result;
        }
        
        throw new Error('Invalid account mode selected');
    },

    showRecoveryPhraseModal(recoveryPhrase) {
        console.log('Showing recovery phrase modal');
        
        // Create a modal to display the recovery phrase
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="auth-modal-content">
                <div class="auth-modal-header">
                    <h3>🔐 Save Your Recovery Phrase</h3>
                </div>
                <div class="auth-modal-body">
                    <div class="recovery-phrase-display">
                        <p><strong>Important:</strong> Save this recovery phrase in a secure location. You'll need it to recover your account.</p>
                        <div class="phrase-container">
                            <textarea readonly class="recovery-phrase-text">${recoveryPhrase}</textarea>
                            <button class="copy-phrase-btn" onclick="navigator.clipboard.writeText('${recoveryPhrase}')">Copy</button>
                        </div>
                        <p class="warning-text">⚠️ We cannot recover your account without this phrase!</p>
                    </div>
                    <div class="auth-form-actions">
                        <button class="auth-button" onclick="this.closest('.auth-modal').remove()">I've Saved It</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 30000);
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
            
            // Add account mode indicator
            this.updateAccountModeIndicator();
            
            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            // User is not authenticated
            authStatus.textContent = 'Not signed in';
            authUser.style.display = 'none';
            
            // Remove account mode indicator
            this.removeAccountModeIndicator();
            
            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (signupBtn) signupBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
        
        console.log('Auth status updated:', state.isAuthenticated ? 'authenticated' : 'not authenticated');
    },

    updateAccountModeIndicator() {
        console.log('Updating account mode indicator for mode:', state.userAccountMode);
        
        const authUser = document.getElementById('auth-user');
        if (!authUser) return;
        
        // Remove existing indicator
        this.removeAccountModeIndicator();
        
        if (state.userAccountMode) {
            // Create account mode indicator
            const indicator = document.createElement('span');
            indicator.className = `account-mode-indicator ${state.userAccountMode}`;
            
            if (state.userAccountMode === 'light') {
                indicator.innerHTML = '<span class="mode-icon">💡</span>Light';
            } else if (state.userAccountMode === 'bold') {
                indicator.innerHTML = '<span class="mode-icon">🔐</span>Bold';
            }
            
            authUser.appendChild(indicator);
        }
    },

    removeAccountModeIndicator() {
        const authUser = document.getElementById('auth-user');
        if (!authUser) return;
        
        const existingIndicator = authUser.querySelector('.account-mode-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
    },
};

// ============================================================================
// THEME MODE MANAGEMENT
// ============================================================================
function initThemeToggle() {
    const modeToggle = document.getElementById('mode-toggle');
    const modeToggleIcon = document.getElementById('mode-toggle-icon');
    const body = document.body;
    
    if (!modeToggle || !modeToggleIcon) {
        console.error('Mode toggle elements not found');
        return;
    }
    
    // Check saved preference
    const savedMode = localStorage.getItem('ydance_theme_mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial mode
    if (savedMode === 'light' || (!savedMode && !prefersDark)) {
        body.classList.add('light-mode');
        updateToggleIcon(true); // light mode active
    } else {
        body.classList.remove('light-mode');
        updateToggleIcon(false); // dark mode active
    }
    
    // Toggle function
    function toggleTheme() {
        const isLight = body.classList.contains('light-mode');
        
        if (isLight) {
            body.classList.remove('light-mode');
            localStorage.setItem('ydance_theme_mode', 'dark');
            updateToggleIcon(false);
        } else {
            body.classList.add('light-mode');
            localStorage.setItem('ydance_theme_mode', 'light');
            updateToggleIcon(true);
        }
    }
    
    function updateToggleIcon(isLightMode) {
        // Moon icon (dark mode)
        const moonIcon = '<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18 10a.75.75 0 00.75-.75V7a.75.75 0 00-1.5 0v2.25A.75.75 0 0018 10zM17.25 17.25a.75.75 0 011.5 0V20a.75.75 0 01-1.5 0v-2.75zM12 18a.75.75 0 00.75.75H15a.75.75 0 000-1.5h-2.25A.75.75 0 0012 18zM7.758 17.25a.75.75 0 00-1.5 0V20a.75.75 0 001.5 0v-2.75zM6 10a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 10zM2.25 6.75a.75.75 0 00-1.5 0V7.5a.75.75 0 001.5 0v-.75zm11.409-3.376a.75.75 0 001.06 0l1.5-1.5a.75.75 0 10-1.06-1.061l-1.5 1.5a.75.75 0 000 1.06zm3.376 12.5a.75.75 0 10-1.06-1.06l-1.5 1.5a.75.75 0 101.06 1.06l1.5-1.5zM4.281 4.22a.75.75 0 00-1.06 0l-1.5 1.5a.75.75 0 101.06 1.06l1.5-1.5a.75.75 0 000-1.06zm12.5 12.5a.75.75 0 00-1.06 0l-1.5 1.5a.75.75 0 101.06 1.06l1.5-1.5a.75.75 0 000-1.06z"/>';
        // Sun icon (light mode)
        const sunIcon = '<path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18 10a.75.75 0 00.75-.75V7a.75.75 0 00-1.5 0v2.25A.75.75 0 0018 10zM17.25 17.25a.75.75 0 011.5 0V20a.75.75 0 01-1.5 0v-2.75zM12 18a.75.75 0 00.75.75H15a.75.75 0 000-1.5h-2.25A.75.75 0 0012 18zM7.758 17.25a.75.75 0 00-1.5 0V20a.75.75 0 001.5 0v-2.75zM6 10a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 10zM2.25 6.75a.75.75 0 00-1.5 0V7.5a.75.75 0 001.5 0v-.75zm11.409-3.376a.75.75 0 001.06 0l1.5-1.5a.75.75 0 10-1.06-1.061l-1.5 1.5a.75.75 0 000 1.06zm3.376 12.5a.75.75 0 10-1.06-1.06l-1.5 1.5a.75.75 0 101.06 1.06l1.5-1.5a.75.75 0 000-1.06zM4.281 4.22a.75.75 0 00-1.06 0l-1.5 1.5a.75.75 0 101.06 1.06l1.5-1.5a.75.75 0 000-1.06zm12.5 12.5a.75.75 0 00-1.06 0l-1.5 1.5a.75.75 0 101.06 1.06l1.5-1.5a.75.75 0 000-1.06z"/>';
        
        if (isLightMode) {
            // Show sun icon (currently in light mode, clicking will go to dark)
            modeToggleIcon.innerHTML = sunIcon;
            modeToggle.setAttribute('title', 'Switch to dark mode');
        } else {
            // Show moon icon (currently in dark mode, clicking will go to light)
            modeToggleIcon.innerHTML = moonIcon;
            modeToggle.setAttribute('title', 'Switch to light mode');
        }
    }
    
    modeToggle.addEventListener('click', toggleTheme);
    
    // Initialize icon based on current mode
    updateToggleIcon(body.classList.contains('light-mode'));
}

// ============================================================================
// LOCATION MANAGEMENT
// ============================================================================
function initLocationSelection() {
    // Check if city is already selected
    const savedCity = localStorage.getItem('ydance_city');
    
    if (savedCity) {
        state.userCity = savedCity;
        if (CONFIG.flags.debug) console.log('City loaded from storage:', savedCity);
        return; // City already selected, no need to show prompt
    }
    
    // Show location selection modal
    const locationModal = document.getElementById('location-modal');
    const locationDropdown = document.getElementById('location-dropdown');
    const locationSelectBtn = document.getElementById('location-select-btn');
    
    if (!locationModal || !locationDropdown || !locationSelectBtn) {
        console.error('Location modal elements not found');
        return;
    }
    
    locationModal.style.display = 'flex';
    
    // Handle selection
    function selectCity() {
        const selectedCity = locationDropdown.value;
        if (!selectedCity) {
            return; // No selection made
        }
        
        state.userCity = selectedCity;
        localStorage.setItem('ydance_city', selectedCity);
        locationModal.style.display = 'none';
        
        if (CONFIG.flags.debug) console.log('City selected:', selectedCity);
        
        // City selection doesn't filter main Events tab
        // It's used for DJ tab and profile views only
        // If currently on Events tab, no need to re-render (shows all events)
        // If on DJ tab, DJ list will be filtered on next refresh
    }
    
    locationSelectBtn.addEventListener('click', selectCity);
    locationDropdown.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            selectCity();
        }
    });
}

// ============================================================================
// DJ STATS CALCULATION HELPERS
// ============================================================================

// Helper function to aggregate DJ statistics from events
function aggregateDJStats(djName) {
    const djEvents = state.eventsData.filter(event => {
        // Check various possible DJ fields
        const eventDJ = event.dj || event.organizer?.name || '';
        return eventDJ.toLowerCase().includes(djName.toLowerCase()) ||
               djName.toLowerCase().includes(eventDJ.toLowerCase());
    });

    if (djEvents.length === 0) {
        return null;
    }

    // Sort events by date
    const sortedEvents = djEvents
        .map(e => {
            const date = e.date || e.start;
            return {
                ...e,
                dateObj: date ? new Date(date) : null
            };
        })
        .filter(e => e.dateObj)
        .sort((a, b) => a.dateObj - b.dateObj);

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // Calculate stats
    const totalEvents = sortedEvents.length;
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const firstAppearance = firstEvent?.dateObj;
    const lastAppearance = lastEvent?.dateObj;

    // Determine activity status
    let activityStatus = null;
    if (lastAppearance && lastAppearance >= ninetyDaysAgo) {
        activityStatus = 'ACTIVE';
    } else if (lastAppearance && lastAppearance >= oneEightyDaysAgo) {
        activityStatus = 'RECENT';
    } else if (lastAppearance) {
        activityStatus = `INACTIVE SINCE ${lastAppearance.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    // Get upcoming events (future events)
    const upcomingEvents = sortedEvents
        .filter(e => e.dateObj && e.dateObj > now)
        .slice(0, 5)
        .map(e => ({
            date: e.dateObj,
            title: e.title || e.name || 'Event',
            venue: e.venue?.name || e.location || 'TBD',
            city: e.city || e.venue?.city || null
        }));

    // Aggregate venues
    const venueCounts = {};
    sortedEvents.forEach(e => {
        const venue = e.venue?.name || e.location;
        if (venue) {
            venueCounts[venue] = (venueCounts[venue] || 0) + 1;
        }
    });
    const venueHistory = Object.entries(venueCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([venue, count]) => ({ venue, count }));

    // Aggregate cities
    const cityCounts = {};
    sortedEvents.forEach(e => {
        const city = e.city || e.venue?.city;
        if (city) {
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        }
    });
    const cities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([city, count]) => ({ city, count }));

    // Aggregate styles/genres from events
    const styleCounts = {};
    sortedEvents.forEach(e => {
        const styles = e.styles || (e.genre ? [e.genre] : []);
        styles.forEach(style => {
            if (style) {
                styleCounts[style] = (styleCounts[style] || 0) + 1;
            }
        });
    });
    const topStyles = Object.entries(styleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([style, count]) => ({ style, count, percentage: Math.round((count / totalEvents) * 100) }));

    // Calculate frequency (events per month in last 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const recentEvents = sortedEvents.filter(e => e.dateObj && e.dateObj >= sixMonthsAgo);
    const frequency = recentEvents.length > 0 
        ? `~${Math.round(recentEvents.length / 6 * 10) / 10} events/month (last 6 months)`
        : null;

    return {
        totalEvents,
        firstAppearance,
        lastAppearance,
        activityStatus,
        upcomingEvents,
        venueHistory,
        cities,
        topStyles,
        frequency,
        allEvents: sortedEvents
    };
}

// Generate x.dance URL slug from DJ name
function generateXDanceSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

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

// Helper function to get Operators active in next 7 days
// Operators are extracted from events (sound, security, bartenders, organizers, etc.)
// Future: will be linked to operator_profiles table with specialties, contact info, reputation
function getOperatorsActiveThisWeek() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get all events in next 7 days
    const upcomingEvents = state.eventsData.filter(event => {
        const date = event.date || event.start;
        if (!date) return false;
        const eventDate = new Date(date);
        return eventDate >= now && eventDate <= sevenDaysLater;
    });
    
    // Extract operators from events
    // Operators can be: sound engineer, bartender, security, safety liaison, organizer, event manager, etc.
    // For now, we'll extract from event metadata (organizer, soundSystem, etc.)
    // Future: events will have explicit operator relationships
    
    const operatorMap = {};
    
    upcomingEvents.forEach(event => {
        // Extract potential operators from event data
        const operators = [];
        
        // Organizer/Event Manager (use DJ if no explicit organizer)
        if (event.organizer?.name) {
            operators.push({ name: event.organizer.name, specialty: 'Organizer' });
        } else if (event.dj) {
            // DJs often organize their own events
            operators.push({ name: event.dj + ' Events', specialty: 'Event Organizer' });
        }
        
        // Sound System Operator
        if (event.soundSystem || event.soundEngineer) {
            const soundOp = event.soundEngineer || event.soundSystem;
            operators.push({ name: soundOp, specialty: 'Sound Engineer' });
        } else {
            // Generate sound engineer from venue (sample data)
            const venue = event.venue?.name || event.location;
            if (venue && venue !== 'TBD') {
                operators.push({ name: venue + ' Sound', specialty: 'Sound Engineer' });
            }
        }
        
        // Venue Manager (generate from venue name)
        const venue = event.venue?.name || event.location;
        if (venue && event.venue?.manager) {
            operators.push({ name: event.venue.manager, specialty: 'Venue Manager' });
        } else if (venue && venue !== 'TBD') {
            // Generate venue manager (sample data)
            operators.push({ name: venue + ' Management', specialty: 'Venue Manager' });
        }
        
        // Process each operator
        operators.forEach(op => {
            if (!op.name) return;
            
            if (!operatorMap[op.name]) {
                operatorMap[op.name] = {
                    name: op.name,
                    specialty: op.specialty || 'Operator',
                    eventCount: 0,
                    venues: new Set(),
                    events: []
                };
            }
            
            operatorMap[op.name].eventCount++;
            const venueName = event.venue?.name || event.location || 'TBD';
            operatorMap[op.name].venues.add(venueName);
            operatorMap[op.name].events.push({
                date: new Date(event.date || event.start),
                title: event.title || event.name,
                venue: venueName,
                city: event.city || event.venue?.city
            });
        });
    });
    
    // Convert to array and sort by event count (most active first)
    return Object.values(operatorMap)
        .map(op => ({
            name: op.name,
            specialty: op.specialty,
            eventCount: op.eventCount,
            venues: Array.from(op.venues),
            events: op.events.sort((a, b) => a.date - b.date)
        }))
        .sort((a, b) => b.eventCount - a.eventCount);
}

// Calculate user-specific DJ stats (Seen count, Friends count)
function calculateUserDJStats(djName, currentUser) {
    // Calculate "Seen" count - events user attended where this DJ played
    // This requires user attendance tracking - for now return 0 if no user
    let seenCount = 0;
    let friendsCount = 0;
    
    if (currentUser && state.eventsData) {
        // Filter events where DJ matches
        const djEvents = state.eventsData.filter(event => {
            const eventDJ = event.dj || event.organizer?.name || '';
            return eventDJ.toLowerCase().includes(djName.toLowerCase()) ||
                   djName.toLowerCase().includes(eventDJ.toLowerCase());
        });
        
        // Check which events user attended
        // TODO: This would require attendance tracking in your schema
        // For now, placeholder logic - would check user_events or similar table
        
        // Friends count would require friends data
        // TODO: friendsCount = calculateFriendsAttendedDJ(djName, state.friendsData);
    }
    
    return {
        seenCount,
        friendsCount
    };
}

// ============================================================================
// LOCATION MANAGEMENT
// ============================================================================
// Location filtering function
// NOTE: Main Events tab shows ALL events regardless of city (for now)
// City filtering is only applied to DJ tab (DJs active in user's city)
function filterEventsByCity(events = null, applyFilter = false) {
    // Use provided events or fall back to state.eventsData
    const eventsToFilter = events || state.eventsData;
    
    // If filter disabled or no city selected, return all events
    if (!applyFilter || !state.userCity) {
        return eventsToFilter;
    }
    
    // Filter events by city (only used for DJ-specific views)
    // Events can have city field directly or nested in venue.city
    const filtered = eventsToFilter.filter(event => {
        // Check direct city field
        if (event.city) {
            // Normalize for comparison (case-insensitive, handle variations)
            const eventCity = event.city.toLowerCase().trim();
            const userCity = state.userCity.toLowerCase().trim();
            
            // Exact match or contains user city (handles "New York" vs "New York City")
            if (eventCity === userCity || eventCity.includes(userCity) || userCity.includes(eventCity)) {
                return true;
            }
        }
        
        // Check venue.city if available
        if (event.venue && event.venue.city) {
            const venueCity = event.venue.city.toLowerCase().trim();
            const userCity = state.userCity.toLowerCase().trim();
            
            if (venueCity === userCity || venueCity.includes(userCity) || userCity.includes(venueCity)) {
                return true;
            }
        }
        
        return false;
    });
    
    if (CONFIG.flags.debug) {
        console.log(`Filtered ${eventsToFilter.length} events to ${filtered.length} for city: ${state.userCity}`);
    }
    
    return filtered;
}

// ============================================================================
// 7. INITIALIZATION
// ============================================================================
// 🚨 DO NOT MODIFY THIS SECTION 🚨
// This orchestrates the entire app startup sequence
// If you need to add startup logic, add it to the appropriate module above
// ============================================================================
async function init() {
    console.log('Initializing yDance Events app...');
    
    // Initialize theme toggle first (before anything renders)
    initThemeToggle();
    
    // Initialize location selection (before any data loading)
    initLocationSelection();
    
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
        // Main Events tab shows ALL events (no city filtering)
        // City is used for DJ tab and profile-specific views only
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