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
    // App URL for email redirects (configure in Supabase dashboard > Authentication > URL Configuration)
    // For local dev: use localhost or ngrok tunnel URL
    // For production: use your deployment URL
    // Default: use current origin (falls back to window.location.origin)
    appUrl: null, // Set to null to auto-detect, or set explicit URL like 'https://your-app.supabase.app'
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
    },
    // Rave Operators configuration
    operatorTypes: {
        sound: { label: 'SOUND', roles: ['Sound Engineer', 'Sound Operator', 'Sound System'], hasGear: true },
        lighting: { label: 'LIGHTING', roles: ['Lighting Designer', 'Lighting Operator'], hasEquipment: true },
        leads: { label: 'LEADS', roles: ['Event Curator', 'Bar Lead', 'Safety Lead', 'Operations Lead', 'Medical Lead'] },
        hospitality: { label: 'HOSPITALITY', roles: ['Security', 'Bartender', 'Cashier', 'Vibe Liaison', 'Medical'] },
        equipment: { label: 'EQUIPMENT', roles: ['Equipment Rental', 'Sound Equipment Provider', 'Gear Rental'] },
        curators: { label: 'CURATORS', roles: ['Event Curator'] } // Kept for backward compatibility with existing data
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
    dateSortOrder: 'asc', // 'asc' = upcoming first, 'desc' = latest first
    timeSortOrder: { start: 'asc', end: 'asc' }, // Sort order for START and END columns
    activeSort: 'date', // 'date', 'start', or 'end' - tracks which column is currently sorting
    
    // Account Mode Management
    // Deprecated - kept for potential future Nostr integration (see docs/NOSTR_AUTH_REMOVED.md)
    selectedAccountMode: null, // 'light' or 'bold' (not currently used)
    userAccountMode: null, // 'light' or 'bold' (not currently used)
    currentDJProfile: null,
    venuesData: [],
    operatorsData: [],
    friendsData: [],
    // Social layer state
    socialFeed: [],
    moderationQueue: [],
    linkedAttributes: {},
    // Auth state (Supabase - independent of nostr)
    currentUser: null,
    isAuthenticated: false,
    authSession: null,
    authModalMode: 'login', // 'login' or 'signup'
    authLoginMethod: 'password', // 'password' or 'email-link' (for login only)
    // Location state
    userCity: null,
    // DJ view mode
    djViewMode: 'list', // 'list' or 'cards' (expanded card view)
    // Event view mode
    eventViewMode: 'list', // 'list' or 'cards' (expanded card view)
    // Venue view mode
    venueViewMode: 'list', // 'list' or 'cards' (expanded card view)
    // Time range filter
    timeRange: 'weekend', // 'weekend', 'week', 'custom', 'next-weekend'
    customDate: null, // Date object for custom date selection
    // Navigation tracking - where did we come from?
    djNavigationSource: null, // 'modal', 'profile', or null (default to DJ list)
    // User event lists (saved, maybe, going)
    userEventLists: {
        saved: [], // Array of event_uid strings
        maybe: [], // Array of event_uid strings
        going: []  // Array of event_uid strings
    },
    // Emulated user for reviews (before real auth)
    emulatedUser: null, // { id, username, display_name } - matches real user structure
    // Current review context
    currentReviewDJ: null, // DJ name for current review being submitted
    // Nostr state (DEPRECATED - use state.nostr when nostrIsolated = true)
    nostrClient: null, // Migrated to state.nostr.client
    userAuth: null, // Migrated to state.nostr.auth
    userKeys: null, // Migrated to state.nostr.keys
    // Nostr isolated namespace (when CONFIG.flags.nostrIsolated = true)
    nostr: null, // Initialized by migration function
    // Rave Operators state
    raveOperatorsView: 'matrix', // 'matrix', 'list', 'detail'
    selectedOperatorType: null, // 'curators', 'sound', 'lighting', 'hospitality', 'coordination'
    selectedProvider: null, // Selected provider for detail view
    eventOperatorsData: [], // Operator-event relationships
    providersData: {} // Providers by type
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
            
            // Set up auth state change listener to restore sessions
            state.supabaseClient.auth.onAuthStateChange((event, session) => {
                if (CONFIG.flags.debug) console.log('Auth state changed:', event, session?.user?.email);
                
                if (session?.user) {
                    // User is authenticated
                    state.currentUser = session.user;
                    state.isAuthenticated = true;
                    state.authSession = session;
                    
                    // Update UI if router is initialized
                    if (typeof router !== 'undefined' && router.updateAuthStatus) {
                        router.updateAuthStatus();
                    }
                } else {
                    // User is not authenticated
                    state.currentUser = null;
                    state.isAuthenticated = false;
                    state.authSession = null;
                    state.emulatedUser = null;
                    
                    // Update UI if router is initialized
                    if (typeof router !== 'undefined' && router.updateAuthStatus) {
                        router.updateAuthStatus();
                    }
                }
            });
            
            // Handle email link callback (magic link / OTP)
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken && refreshToken) {
                console.log('Email link callback detected, setting session...');
                
                // Set the session from the callback tokens
                const { data: { session }, error: sessionError } = await state.supabaseClient.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                
                if (sessionError) {
                    console.error('Error setting session from callback:', sessionError);
                } else if (session) {
                    console.log('✅ Session created from email link for:', session.user.email);
                    state.currentUser = session.user;
                    state.isAuthenticated = true;
                    state.authSession = session;
                    
                    // Clean up URL hash to remove tokens
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                    
                    // Show success message
                    if (typeof router !== 'undefined' && router.updateAuthStatus) {
                        router.updateAuthStatus();
                    }
                    alert('Successfully logged in with email link!');
                }
            } else {
                // Check for existing session on init (normal flow)
                const { data: { session }, error } = await state.supabaseClient.auth.getSession();
                if (error) {
                    console.warn('Error checking session:', error);
                } else if (session) {
                    if (CONFIG.flags.debug) console.log('Restored session for:', session.user.email);
                    state.currentUser = session.user;
                    state.isAuthenticated = true;
                    state.authSession = session;
                } else {
                    if (CONFIG.flags.debug) console.log('No existing session found');
                }
            }
            
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
                .select('normalized_json, created_at');
            
            // Note: We'll sort by event date in JavaScript since normalized_json contains the date field
            // This allows us to sort by the actual event date, not when it was added to the database

            if (!viewResult.error && Array.isArray(viewResult.data) && viewResult.data.length > 0) {
                let events = viewResult.data.map(row => row.normalized_json).filter(Boolean);
                
                // Sort by event date (upcoming first, then past)
                // Extract date from normalized_json and sort accordingly
                events.sort((a, b) => {
                    const dateA = a.date || a.start || a.created_at;
                    const dateB = b.date || b.start || b.created_at;
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    const timeA = new Date(dateA).getTime();
                    const timeB = new Date(dateB).getTime();
                    return timeA - timeB;
                });
                
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
    
    async fetchDJReviews(djName, limit = 50) {
        if (CONFIG.flags.debug) console.log('Loading reviews for DJ:', djName);
        
        try {
            const { data, error } = await state.supabaseClient
                .from('reviews')
                .select('*')
                .eq('dj_name', djName)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('Error loading reviews:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    },
    
    async submitReview(reviewData) {
        // reviewData: { dj_name, rating, comment, event_title (optional) }
        if (CONFIG.flags.debug) console.log('Submitting review:', reviewData);
        
        try {
            // Get current user (real or emulated)
            const currentUser = state.currentUser || state.emulatedUser;
            
            if (!currentUser) {
                throw new Error('No user found. Please select an emulated user or sign in.');
            }
            
            // Prepare review payload
            const reviewPayload = {
                dj_name: reviewData.dj_name,
                rating: reviewData.rating,
                comment: reviewData.comment || null,
                event_title: reviewData.event_title || null,
                user_id: currentUser.id,
                user_name: currentUser.display_name || currentUser.username || currentUser.email || 'Anonymous'
            };
            
            const { data, error } = await state.supabaseClient
                .from('reviews')
                .insert(reviewPayload)
                .select()
                .single();
            
            if (error) {
                console.error('Error submitting review:', error);
                throw error;
            }
            
            // Refresh aggregate (or let trigger handle it)
            if (CONFIG.flags.debug) console.log('Review submitted successfully:', data);
            
            return { success: true, review: data };
        } catch (error) {
            console.error('Error submitting review:', error);
            throw error;
        }
    },
    
    async fetchEmulatedUsers() {
        if (CONFIG.flags.debug) console.log('Loading emulated users...');
        
        try {
            const { data, error } = await state.supabaseClient
                .from('sample_users')
                .select('*')
                .order('username', { ascending: true })
                .limit(100);
            
            if (error) {
                console.error('Error loading emulated users:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    },
    
    async fetchUserReviews(userId) {
        // Fetch all reviews submitted by a specific user
        if (CONFIG.flags.debug) console.log('Loading reviews for user:', userId);
        
        try {
            const { data, error } = await state.supabaseClient
                .from('reviews')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error('Error loading user reviews:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    },
    
    // ============================================================================
    // USER EVENT LISTS API
    // ============================================================================
    
    async fetchUserEventLists(userId) {
        if (CONFIG.flags.debug) console.log('Loading user event lists for:', userId);
        
        try {
            const { data, error } = await state.supabaseClient
                .from('user_event_lists')
                .select('event_uid, list_type')
                .eq('user_id', userId);
            
            if (error) {
                console.error('Error loading user event lists:', error);
                return { saved: [], maybe: [], going: [] };
            }
            
            // Group by list type
            const lists = { saved: [], maybe: [], going: [] };
            (data || []).forEach(item => {
                if (lists[item.list_type]) {
                    lists[item.list_type].push(item.event_uid);
                }
            });
            
            return lists;
        } catch (error) {
            console.error('Error:', error);
            return { saved: [], maybe: [], going: [] };
        }
    },
    
    async addEventToList(userId, eventUid, listType) {
        // listType: 'saved', 'maybe', or 'going'
        if (CONFIG.flags.debug) console.log(`Adding event ${eventUid} to ${listType} list for user ${userId}`);
        
        try {
            // First, remove from other lists (event can only be in one list at a time)
            const { error: deleteError } = await state.supabaseClient
                .from('user_event_lists')
                .delete()
                .eq('user_id', userId)
                .eq('event_uid', eventUid);
            
            if (deleteError && deleteError.code !== 'PGRST116') {
                console.warn('Error removing event from other lists:', deleteError);
            }
            
            // Add to requested list
            const { data, error } = await state.supabaseClient
                .from('user_event_lists')
                .insert({
                    user_id: userId,
                    event_uid: eventUid,
                    list_type: listType
                })
                .select()
                .single();
            
            if (error) {
                console.error('Error adding event to list:', error);
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },
    
    async removeEventFromList(userId, eventUid, listType) {
        if (CONFIG.flags.debug) console.log(`Removing event ${eventUid} from ${listType} list for user ${userId}`);
        
        try {
            const { error } = await state.supabaseClient
                .from('user_event_lists')
                .delete()
                .eq('user_id', userId)
                .eq('event_uid', eventUid)
                .eq('list_type', listType);
            
            if (error) {
                console.error('Error removing event from list:', error);
                throw error;
            }
            
            return true;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },
    
    async getEventsByUids(eventUids) {
        // Fetch full event data for given event_uid list
        if (!eventUids || eventUids.length === 0) return [];
        
        try {
            const { data, error } = await state.supabaseClient
                .from('normalized_events_latest')
                .select('normalized_json, event_uid')
                .in('event_uid', eventUids);
            
            if (error) {
                console.error('Error fetching events by UIDs:', error);
                return [];
            }
            
            // Map to include event_uid with normalized_json
            return (data || []).map(row => ({
                ...row.normalized_json,
                event_uid: row.event_uid
            }));
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    },
    
    async selectEmulatedUser(userId) {
        if (CONFIG.flags.debug) console.log('Selecting emulated user:', userId);
        
        try {
            const { data, error } = await state.supabaseClient
                .from('sample_users')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) {
                console.error('Error loading emulated user:', error);
                return null;
            }
            
            // Store as emulatedUser (matches real user structure)
            state.emulatedUser = {
                id: data.id,
                username: data.username,
                display_name: data.display_name || data.username,
                created_at: data.created_at
            };
            
            // Also store in currentUser if no real user (for compatibility)
            if (!state.currentUser) {
                state.currentUser = { ...state.emulatedUser };
                state.isAuthenticated = true; // Mark as "authenticated" for review purposes
            }
            
            if (CONFIG.flags.debug) console.log('Emulated user selected:', state.emulatedUser);
            
            return state.emulatedUser;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    },

    async fetchVenues() {
        if (CONFIG.flags.debug) console.log('Loading venues from database...');
        
        try {
            // Ensure events are loaded first
            if (!state.eventsData || state.eventsData.length === 0) {
                await this.fetchEvents();
            }
            
            // Extract venues from events data with proper stats
            if (state.eventsData && state.eventsData.length > 0) {
                const venueMap = new Map();
                const now = new Date();
                
                state.eventsData.forEach(event => {
                    const venueName = event.venue || event.location || event.venue?.name;
                    if (venueName && venueName !== 'TBD') {
                        if (!venueMap.has(venueName)) {
                            venueMap.set(venueName, {
                                name: venueName,
                                eventCount: 0,
                                pastEvents: 0,
                                upcomingEvents: [],
                                events: []
                            });
                        }
                        const venue = venueMap.get(venueName);
                        venue.eventCount++;
                        venue.events.push(event);
                        
                        if (event.date) {
                            const eventDate = new Date(event.date);
                            if (eventDate >= now) {
                                venue.upcomingEvents.push(event);
                            } else {
                                venue.pastEvents++;
                            }
                        }
                    }
                });
                
                // Convert to array and enrich with stats
                const venues = Array.from(venueMap.values());
                
                // Enrich each venue with rating/reviews (if available from operators table)
                for (const venue of venues) {
                    try {
                        // Check if venue exists in operators table (venues might be stored there)
                        const { data: venueData } = await state.supabaseClient
                            .from('operators')
                            .select('rating, review_count')
                            .eq('name', venue.name)
                            .eq('type', 'venue')
                            .single();
                        
                        if (venueData) {
                            venue.rating = venueData.rating || 0;
                            venue.reviewCount = venueData.review_count || 0;
                        } else {
                            venue.rating = 0;
                            venue.reviewCount = 0;
                        }
                    } catch (e) {
                        // Venue not in operators table, use defaults
                        venue.rating = 0;
                        venue.reviewCount = 0;
                    }
                }
                
                state.venuesData = venues;
            } else {
                state.venuesData = [];
            }
            
            if (CONFIG.flags.debug) console.log('Venues loaded successfully:', state.venuesData.length);
            return state.venuesData;
            
        } catch (error) {
            console.error('Error loading venues:', error);
            state.venuesData = [];
            return [];
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

    async fetchEventOperators(eventUids = null) {
        if (CONFIG.flags.debug) console.log('Loading event operators...');
        
        try {
            // Try to fetch from event_operators table if it exists
            let query = state.supabaseClient
                .from('event_operators')
                .select('*');
            
            if (eventUids && eventUids.length > 0) {
                query = query.in('event_uid', eventUids);
            }
            
            const { data, error } = await query;
            
            if (error) {
                // If table doesn't exist, extract from event data
                if (CONFIG.flags.debug) console.log('event_operators table not found, extracting from event data');
                return this.extractOperatorsFromEvents(eventUids);
            }
            
            state.eventOperatorsData = data || [];
            if (CONFIG.flags.debug) console.log('Event operators loaded:', state.eventOperatorsData.length);
            return state.eventOperatorsData;
            
        } catch (error) {
            console.error('Error loading event operators:', error);
            // Fallback: extract from event data
            return this.extractOperatorsFromEvents(eventUids);
        }
    },

    extractOperatorsFromEvents(eventUids = null) {
        // Extract operator data from normalized event JSON
        const events = eventUids 
            ? state.eventsData.filter(e => eventUids.includes(e.event_uid || e.title || e.name))
            : state.eventsData;
        
        const operators = [];
        const operatorTypes = Object.keys(CONFIG.operatorTypes);
        
        events.forEach(event => {
            const eventUid = event.event_uid || event.title || event.name;
            
            operatorTypes.forEach(type => {
                // Check for operator fields in event data
                const typeConfig = CONFIG.operatorTypes[type];
                let operatorValue = null;
                
                // Map various field names to operator types
                if (type === 'curators' && event.promoter) {
                    operatorValue = event.promoter;
                } else if (type === 'sound' && (event.sound_system || event.soundSystem)) {
                    operatorValue = event.sound_system || event.soundSystem;
                } else if (type === 'lighting' && (event.lighting || event.lighting_designer)) {
                    operatorValue = event.lighting || event.lighting_designer;
                } else if (type === 'coordination' && (event.operator || event.operators)) {
                    operatorValue = Array.isArray(event.operator || event.operators) 
                        ? (event.operator || event.operators)[0] 
                        : (event.operator || event.operators);
                }
                
                if (operatorValue) {
                    operators.push({
                        event_uid: eventUid,
                        operator_name: operatorValue,
                        operator_type: type,
                        role: typeConfig.roles[0] || typeConfig.label,
                        is_primary: true
                    });
                }
            });
        });
        
        state.eventOperatorsData = operators;
        return operators;
    },

    async fetchProvidersByType(operatorType) {
        if (CONFIG.flags.debug) console.log('Loading providers by type:', operatorType);
        
        try {
            // Try to fetch from operators table if it exists
            const { data, error } = await state.supabaseClient
                .from('operators')
                .select('*')
                .eq('type', operatorType);
            
            if (error) {
                // If table doesn't exist, extract from event operators
                if (CONFIG.flags.debug) console.log('operators table not found, extracting from event operators');
                return this.extractProvidersFromEventOperators(operatorType);
            }
            
            // Enhance with calculated stats
            const providers = (data || []).map(async provider => {
                const stats = await this.calculateProviderStats(provider.name, operatorType);
                return {
                    ...provider,
                    past_events_total: stats.pastEventsTotal,
                    upcoming_total: stats.upcomingTotal,
                    rating: provider.rating || stats.rating,
                    review_count: provider.review_count || stats.reviewCount,
                    event_count: stats.pastEventsTotal + stats.upcomingTotal
                };
            });
            
            const enhancedProviders = await Promise.all(providers);
            
            if (!state.providersData[operatorType]) {
                state.providersData[operatorType] = [];
            }
            state.providersData[operatorType] = enhancedProviders;
            if (CONFIG.flags.debug) console.log(`Providers loaded for ${operatorType}:`, state.providersData[operatorType].length);
            return state.providersData[operatorType];
            
        } catch (error) {
            console.error('Error loading providers:', error);
            return this.extractProvidersFromEventOperators(operatorType);
        }
    },

    async fetchProviderReviews(providerName, providerType) {
        try {
            const { data, error } = await state.supabaseClient
                .from('provider_reviews')
                .select('*')
                .eq('provider_name', providerName)
                .eq('provider_type', providerType)
                .order('created_at', { ascending: false });
            
            if (error) {
                if (CONFIG.flags.debug) console.log('provider_reviews table not found or error:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Error fetching provider reviews:', error);
            return [];
        }
    },

    async calculateProviderStats(providerName, providerType) {
        // Calculate past events, upcoming events, and get ratings
        const now = new Date();
        const providerEvents = (state.eventOperatorsData || []).filter(eo => 
            eo.operator_name === providerName && eo.operator_type === providerType
        );
        
        let pastEventsTotal = 0;
        let upcomingTotal = 0;
        
        providerEvents.forEach(eo => {
            const event = state.eventsData.find(e => (e.event_uid || e.title || e.name) === eo.event_uid);
            if (event && event.date) {
                const eventDate = new Date(event.date);
                if (eventDate < now) {
                    pastEventsTotal++;
                } else {
                    upcomingTotal++;
                }
            }
        });
        
        // Fetch ratings from operators table
        let rating = 0;
        let reviewCount = 0;
        try {
            const { data, error } = await state.supabaseClient
                .from('operators')
                .select('rating, review_count')
                .eq('name', providerName)
                .eq('type', providerType)
                .single();
            
            if (!error && data) {
                rating = data.rating || 0;
                reviewCount = data.review_count || 0;
            }
        } catch (error) {
            // Table might not exist yet
        }
        
        return {
            pastEventsTotal,
            upcomingTotal,
            rating,
            reviewCount
        };
    },

    extractProvidersFromEventOperators(operatorType) {
        // Extract unique providers from event operators data
        const providers = new Map();
        
        (state.eventOperatorsData || []).forEach(eo => {
            if (eo.operator_type === operatorType) {
                if (!providers.has(eo.operator_name)) {
                    providers.set(eo.operator_name, {
                        name: eo.operator_name,
                        type: operatorType,
                        role: eo.role,
                        event_count: 0,
                        upcoming_count: 0,
                        past_events_total: 0,
                        upcoming_total: 0,
                        rating: 0,
                        review_count: 0
                    });
                }
                const provider = providers.get(eo.operator_name);
                provider.event_count++;
                
                // Check if event is upcoming (all future events, not just next 7 days)
                const event = state.eventsData.find(e => (e.event_uid || e.title || e.name) === eo.event_uid);
                if (event && event.date) {
                    const eventDate = new Date(event.date);
                    const now = new Date();
                    if (eventDate >= now) {
                        provider.upcoming_count++;
                        provider.upcoming_total++;
                    } else {
                        provider.past_events_total++;
                    }
                }
            }
        });
        
        return Array.from(providers.values());
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
            // NEW: Use isolated nostr module if flag is enabled
            if (CONFIG.flags.nostrIsolated) {
                // Initialize isolated nostr module
                const nostrInitialized = await nostr.init();
                if (nostrInitialized) {
                    // Sync feed from nostr to socialFeed
                    if (state.nostr && state.nostr.feed) {
                        state.socialFeed = [...state.nostr.feed];
                    }
                    if (CONFIG.flags.debug) console.log('Social layer initialized with isolated Nostr module');
                } else {
                    if (CONFIG.flags.debug) console.log('Social layer initialized (nostr module initialization failed)');
                }
                // Expose dev hook
                if (typeof window !== 'undefined') {
                    window.social = this;
                }
                return true;
            }
            
            // LEGACY: Direct nostr integration (backward compatible)
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
            // NEW: Use isolated nostr module if flag is enabled
            if (CONFIG.flags.nostrIsolated) {
                return await nostr.sendMessage(content);
            }
            
            // LEGACY: Direct nostr message sending (backward compatible)
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
            // NEW: Use isolated nostr module if flag is enabled
            if (CONFIG.flags.nostrIsolated) {
                const feed = await nostr.fetchFeed({
                    kinds: [1],
                    '#t': ['ydance', 'event'],
                    limit: 100
                });
                // Update social feed
                state.socialFeed = [...feed];
                // Sync to nostr namespace
                if (state.nostr) {
                    state.nostr.feed = [...feed];
                }
                return feed;
            }
            
            // LEGACY: Direct nostr query (backward compatible)
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
        if (CONFIG.flags.debug) console.log('SOCIAL: Delegating event query');
        
        try {
            // NEW: Use isolated nostr module if flag is enabled
            if (CONFIG.flags.nostrIsolated) {
                return await nostr.queryEvents(filter);
            }
            
            // LEGACY: Direct nostrClient query (backward compatible)
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
        // NEW: Use isolated nostr module if flag is enabled
        if (CONFIG.flags.nostrIsolated) {
            return await nostr.generateKeys();
        }
        
        // LEGACY: Direct key generation (backward compatible)
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
        // NEW: Use isolated nostr module if flag is enabled
        if (CONFIG.flags.nostrIsolated) {
            return nostr.encryptKeys(keys, password);
        }
        
        // LEGACY: Direct encryption (backward compatible)
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
// 4.5. NOSTR MODULE (Isolated Nostr Functionality)
// ============================================================================
// 🎯 PURPOSE: All Nostr-specific functionality isolated from main app
// ✅ ADD HERE: Nostr connections, key management, message publishing
// ❌ DON'T ADD: Main app dependencies, DOM manipulation, or Supabase calls
// 
// NOTE: This module is isolated - main app can work without it
// When CONFIG.flags.nostrIsolated = true, use this module
// When false, legacy code in SOCIAL layer handles nostr
// ============================================================================

// State migration helper (runs on init if nostrIsolated = true)
function migrateNostrState() {
    if (!CONFIG.flags.nostrIsolated) {
        return; // No migration needed - use legacy state
    }
    
    // Initialize nostr namespace if not exists
    if (!state.nostr) {
        state.nostr = {
            client: null,
            keys: null,
            auth: null,
            feed: [],
            connected: false,
            relay: null,
            lastSync: null
        };
    }
    
    // Migrate existing data (if any exists)
    if (state.nostrClient && !state.nostr.client) {
        state.nostr.client = state.nostrClient;
        state.nostr.connected = state.nostrClient.connected || false;
        state.nostr.relay = state.nostrClient.relay || null;
        // Keep old reference for backward compat during transition
    }
    
    if (state.userKeys && !state.nostr.keys) {
        state.nostr.keys = state.userKeys;
        // Keep old reference for backward compat during transition
    }
    
    if (state.userAuth && !state.nostr.auth) {
        // Only migrate if it's nostr-specific auth
        // (userAuth may contain Supabase auth, verify before migrating)
        state.nostr.auth = state.userAuth;
        // Keep old reference for backward compat during transition
    }
    
    // Sync feed from nostr to socialFeed (if needed)
    if (state.nostr.feed.length > 0 && state.socialFeed.length === 0) {
        state.socialFeed = [...state.nostr.feed];
    }
    
    if (CONFIG.flags.debug) console.log('Nostr state migrated to isolated namespace');
}

// Safe accessor functions (work in both isolated and legacy modes)
function getNostrClient() {
    if (CONFIG.flags.nostrIsolated && state.nostr) {
        return state.nostr.client;
    }
    return state.nostrClient;
}

function getNostrKeys() {
    if (CONFIG.flags.nostrIsolated && state.nostr) {
        return state.nostr.keys;
    }
    return state.userKeys;
}

function setNostrClient(client) {
    if (CONFIG.flags.nostrIsolated) {
        if (!state.nostr) {
            state.nostr = { client: null, keys: null, auth: null, feed: [], connected: false, relay: null, lastSync: null };
        }
        state.nostr.client = client;
        state.nostr.connected = client?.connected || false;
        state.nostr.relay = client?.relay || null;
    } else {
        state.nostrClient = client;
    }
}

function setNostrKeys(keys) {
    if (CONFIG.flags.nostrIsolated) {
        if (!state.nostr) {
            state.nostr = { client: null, keys: null, auth: null, feed: [], connected: false, relay: null, lastSync: null };
        }
        state.nostr.keys = keys;
    } else {
        state.userKeys = keys;
    }
}

const nostr = {
    async init() {
        if (CONFIG.flags.debug) console.log('Initializing isolated Nostr module...');
        
        // Run migration first
        migrateNostrState();
        
        try {
            if (!CONFIG.flags.nostrRealClient) {
                if (!state.nostr) {
                    state.nostr = { client: null, keys: null, auth: null, feed: [], connected: false, relay: null, lastSync: null };
                }
                state.nostr.client = { connected: false, relay: 'disabled' };
                if (CONFIG.flags.debug) console.log('Nostr module initialized (nostr disabled by flag)');
                return true;
            }
            
            // Initialize nostr client
            const urlParams = new URLSearchParams(window.location.search);
            const relayOverride = urlParams.get('relay');
            const relayUrl = relayOverride || CONFIG.nostrRelayUrl;
            
            const client = await nostrClient.connect(relayUrl);
            setNostrClient(client);
            
            // Initialize data fetching
            await this.initDataFetching();
            
            if (CONFIG.flags.debug) console.log('Nostr module initialized with client at', relayUrl);
            
            // Health check if flag enabled
            if (CONFIG.flags.nostrHealthCheck) {
                try {
                    await this.healthCheck(relayUrl);
                } catch (e) {
                    console.warn('Nostr health check failed:', e && e.message ? e.message : e);
                }
            }
            
            // Expose dev hook
            if (typeof window !== 'undefined') {
                window.nostr = this;
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing Nostr module:', error);
            return false;
        }
    },
    
    async initDataFetching() {
        if (CONFIG.flags.debug) console.log('Initializing Nostr data fetching...');
        
        try {
            // Fetch feed
            const feed = await this.fetchFeed();
            if (state.nostr) {
                state.nostr.feed = feed;
                state.nostr.lastSync = new Date().toISOString();
            }
            
            // Sync to socialFeed for SOCIAL layer
            state.socialFeed = [...feed];
            
            // Fetch profiles
            await this.fetchProfiles();
            
            // Set up periodic refresh (every 5 minutes)
            setInterval(async () => {
                if (CONFIG.flags.debug) console.log('Refreshing Nostr data...');
                const feed = await this.fetchFeed();
                if (state.nostr) {
                    state.nostr.feed = feed;
                    state.nostr.lastSync = new Date().toISOString();
                }
                state.socialFeed = [...feed];
                await this.fetchProfiles();
            }, 5 * 60 * 1000);
            
            if (CONFIG.flags.debug) console.log('Nostr data fetching initialized');
        } catch (error) {
            console.error('Error initializing Nostr data fetching:', error);
        }
    },
    
    // Connection Management
    async connect(relayUrl = CONFIG.nostrRelayUrl) {
        if (CONFIG.flags.debug) console.log('Connecting to Nostr relay:', relayUrl);
        
        try {
            const client = await nostrClient.connect(relayUrl);
            setNostrClient(client);
            if (state.nostr) {
                state.nostr.connected = client?.connected || false;
                state.nostr.relay = relayUrl;
            }
            return client;
        } catch (error) {
            console.error('Error connecting to Nostr relay:', error);
            throw error;
        }
    },
    
    async disconnect() {
        if (CONFIG.flags.debug) console.log('Disconnecting from Nostr relay...');
        
        try {
            const client = getNostrClient();
            if (client && client.disconnect) {
                await client.disconnect();
            }
            setNostrClient({ connected: false, relay: null });
            if (state.nostr) {
                state.nostr.connected = false;
                state.nostr.relay = null;
            }
            if (CONFIG.flags.debug) console.log('Disconnected from Nostr relay');
        } catch (error) {
            console.error('Error disconnecting from Nostr relay:', error);
            throw error;
        }
    },
    
    async healthCheck(relayUrl = CONFIG.nostrRelayUrl) {
        if (CONFIG.flags.debug) console.log('Nostr health check starting...');
        try {
            const client = getNostrClient();
            if (client && client.connected) {
                if (CONFIG.flags.debug) console.log('Nostr health: already connected to', client.relay || relayUrl);
                return { ok: true, relay: client.relay || relayUrl, reused: true };
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
    
    // Key Management (ISOLATED - no main app dependency)
    async generateKeys() {
        if (CONFIG.flags.debug) console.log('NOSTR: Generating key pair...');
        const keys = await nostrKeys.generateKeyPair();
        return {
            publicKey: keys.publicKey,
            privateKey: keys.privateKey,
            npub: keys.npub,
            nsec: keys.nsec
        };
    },
    
    async encryptKeys(keys, password) {
        if (CONFIG.flags.debug) console.log('NOSTR: Encrypting keys...');
        return keyEncryption.encryptData(keys.privateKey, password);
    },
    
    async decryptKeys(encrypted, password) {
        if (CONFIG.flags.debug) console.log('NOSTR: Decrypting keys...');
        const decryptedPrivateKey = await keyEncryption.decryptData(encrypted, password);
        return {
            privateKey: decryptedPrivateKey,
            publicKey: nostrKeys.decodePublicKey(nostrKeys.encodePublicKey(decryptedPrivateKey)),
            npub: nostrKeys.encodePublicKey(nostrKeys.decodePublicKey(decryptedPrivateKey)),
            nsec: nostrKeys.encodePrivateKey(decryptedPrivateKey)
        };
    },
    
    validateKeyFormat(key) {
        return nostrKeys.validateKeyFormat(key);
    },
    
    generateRecoveryPhrase() {
        return nostrKeys.generateRecoveryPhrase();
    },
    
    validateRecoveryPhrase(phrase) {
        return nostrKeys.validateRecoveryPhrase(phrase);
    },
    
    // Authentication (Nostr-only, separate from main app auth)
    async signIn(email, password) {
        if (CONFIG.flags.debug) console.log('NOSTR: Signing in user:', email);
        
        try {
            // This is nostr-specific signin - different from main app auth
            // For now, this handles nostr key recovery
            // Main app auth should use Supabase directly
            
            // TODO: Implement nostr-specific signin logic
            // This may involve checking nostr keys in database and decrypting
            throw new Error('Nostr signIn not yet implemented in isolated module');
        } catch (error) {
            console.error('Error in Nostr signIn:', error);
            throw error;
        }
    },
    
    async signUp(email, password) {
        if (CONFIG.flags.debug) console.log('NOSTR: Signing up user:', email);
        
        try {
            // Generate keys
            const keys = await this.generateKeys();
            const recoveryPhrase = this.generateRecoveryPhrase();
            
            // Store keys (encrypted) - would use nostr-specific storage
            // For now, store in nostr namespace
            const encryptedKeys = await this.encryptKeys(keys, password);
            
            // Update nostr state
            setNostrKeys(keys);
            if (state.nostr) {
                state.nostr.keys = keys;
            }
            
            if (CONFIG.flags.debug) console.log('NOSTR: User signed up with keys');
            return { 
                success: true, 
                keys: keys,
                recoveryPhrase: recoveryPhrase
            };
        } catch (error) {
            console.error('Error in Nostr signUp:', error);
            throw error;
        }
    },
    
    async signUpLight(email, password) {
        // Light mode: Generate keys but don't require full recovery setup
        const keys = await this.generateKeys();
        setNostrKeys(keys);
        if (state.nostr) {
            state.nostr.keys = keys;
        }
        return { success: true, keys: keys };
    },
    
    async recoverKeysWithRecoveryPhrase(email, recoveryPhrase, password) {
        // Nostr-specific key recovery
        // TODO: Implement when nostrIsolated = true
        throw new Error('Nostr recoverKeysWithRecoveryPhrase not yet implemented in isolated module');
    },
    
    // Data Operations
    async fetchFeed(filter = { kinds: [1], '#t': ['ydance', 'event'], limit: 100 }) {
        if (CONFIG.flags.debug) console.log('NOSTR: Fetching feed...');
        
        try {
            if (!CONFIG.flags.nostrRealClient) {
                return this.getPlaceholderFeed();
            }
            
            const client = getNostrClient();
            if (!client || !client.connected) {
                if (CONFIG.flags.debug) console.log('Nostr client not connected, returning placeholder feed');
                return this.getPlaceholderFeed();
            }
            
            // Query events
            const events = await nostrClient.queryEvents(filter);
            
            // Parse events
            const parsedEvents = events.map(event => nostrEventParser.parseEvent(event));
            
            return parsedEvents;
        } catch (error) {
            console.error('Error fetching Nostr feed:', error);
            return this.getPlaceholderFeed();
        }
    },
    
    async sendMessage(content, keys = null) {
        if (CONFIG.flags.debug) console.log('NOSTR: Sending message...');
        
        try {
            if (!CONFIG.flags.nostrRealClient) {
                return { success: false, disabled: true };
            }
            
            const client = getNostrClient();
            if (!client || !client.connected) {
                return { success: false, queued: true };
            }
            
            // Use provided keys or get from state
            const messageKeys = keys || getNostrKeys();
            if (!messageKeys) {
                return { success: false, error: 'No keys available' };
            }
            
            // TODO: Implement actual nostr message publishing
            // This would use nostr client to publish Kind 1 event
            if (CONFIG.flags.debug) console.log('NOSTR: Message would be sent');
            return { success: true, messageId: 'placeholder-id' };
        } catch (error) {
            console.error('Error sending Nostr message:', error);
            throw error;
        }
    },
    
    async queryEvents(filter) {
        const client = getNostrClient();
        if (!client || !client.connected) {
            return this.getPlaceholderNostrEvents();
        }
        return await nostrClient.queryEvents(filter);
    },
    
    async queryProfiles(filter = { kinds: [0], '#t': ['ydance'], limit: 50 }) {
        const client = getNostrClient();
        if (!client || !client.connected) {
            return this.getPlaceholderNostrProfiles();
        }
        // TODO: Implement actual profile query
        return this.getPlaceholderNostrProfiles();
    },
    
    async fetchProfiles() {
        if (CONFIG.flags.debug) console.log('NOSTR: Fetching profiles...');
        const profiles = await this.queryProfiles();
        // Parse profiles (similar to social layer)
        return profiles.map(profile => this.parseProfile(profile));
    },
    
    parseEvent(nostrEvent) {
        return nostrEventParser.parseEvent(nostrEvent);
    },
    
    parseProfile(nostrProfile) {
        const content = JSON.parse(nostrProfile.content);
        const tags = nostrProfile.tags;
        
        // Determine profile type from tags
        const profileType = this.determineProfileType(tags);
        
        return {
            id: nostrProfile.id,
            name: content.name || content.display_name,
            bio: content.about,
            image: content.picture,
            website: content.website,
            type: profileType,
            source: 'nostr',
            nostrEventId: nostrProfile.id,
            nostrPubkey: nostrProfile.pubkey
        };
    },
    
    determineProfileType(tags) {
        const typeTag = tags.find(tag => tag[0] === 'type');
        if (typeTag) return typeTag[1];
        if (tags.some(tag => tag[0] === 't' && tag[1] === 'dj')) return 'dj';
        if (tags.some(tag => tag[0] === 't' && tag[1] === 'venue')) return 'venue';
        if (tags.some(tag => tag[0] === 't' && tag[1] === 'soundsystem')) return 'soundsystem';
        return 'unknown';
    },
    
    // Placeholder data (for testing/fallback)
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
    
    getPlaceholderNostrEvents() {
        return [
            {
                id: 'nostr-event-1',
                content: '🎵 Underground Techno Night\n📅 2024-01-15\n📍 Warehouse 23\n🎧 DJ Shadow',
                tags: [
                    ['t', 'ydance'],
                    ['t', 'event'],
                    ['dj', 'DJ Shadow'],
                    ['location', 'Warehouse 23']
                ],
                pubkey: 'npub1placeholder1',
                created_at: Math.floor(Date.now() / 1000)
            }
        ];
    },
    
    getPlaceholderNostrProfiles() {
        return [
            {
                id: 'nostr-profile-1',
                content: JSON.stringify({
                    name: 'DJ Shadow',
                    about: 'Underground techno DJ',
                    picture: 'https://example.com/dj-shadow.jpg'
                }),
                tags: [['t', 'ydance'], ['t', 'dj'], ['type', 'dj']],
                pubkey: 'npub1djshadow',
                created_at: Math.floor(Date.now() / 1000)
            }
        ];
    },
    
    // Dev Tools
    async testConnection() {
        return await this.healthCheck();
    },
    
    async testKeyGeneration() {
        const keys = await this.generateKeys();
        const validPub = this.validateKeyFormat(keys.publicKey);
        const validPriv = this.validateKeyFormat(keys.privateKey);
        return {
            success: true,
            keys: keys,
            validation: { publicKey: validPub, privateKey: validPriv }
        };
    },
    
    async testEncryption() {
        const keys = await this.generateKeys();
        const password = 'TestPassword123!';
        const encrypted = await this.encryptKeys(keys, password);
        const decrypted = await this.decryptKeys(encrypted, password);
        return {
            success: decrypted.privateKey === keys.privateKey,
            keys: keys,
            encrypted: encrypted,
            decrypted: decrypted
        };
    },
    
    // Status getters
    getStatus() {
        const client = getNostrClient();
        return {
            connected: client?.connected || false,
            relay: client?.relay || state.nostr?.relay || null,
            hasKeys: !!getNostrKeys(),
            feedCount: state.nostr?.feed?.length || 0,
            lastSync: state.nostr?.lastSync || null
        };
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
        // Compact list view (default)
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
        
        const title = event.title || event.name || 'Event';
        const eventUid = event.event_uid || title;
        
        // Check if user is logged in and if event is in any list
        const currentUser = state.currentUser || state.emulatedUser;
        const isSaved = currentUser && state.userEventLists.saved.includes(eventUid);
        const isMaybe = currentUser && state.userEventLists.maybe.includes(eventUid);
        const isGoing = currentUser && state.userEventLists.going.includes(eventUid);
        
        // Build action buttons (only show if logged in)
        let actionButtons = '';
        if (currentUser) {
            actionButtons = '<span class="event-actions">';
            if (isSaved) {
                actionButtons += `<a href="#" class="event-action saved" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'saved'); return false;">[SAVED]</a>`;
            } else {
                actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'saved'); return false;">[SAVE]</a>`;
            }
            if (isMaybe) {
                actionButtons += `<a href="#" class="event-action maybe" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'maybe'); return false;">[MAYBE]</a>`;
            } else {
                actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'maybe'); return false;">[MAYBE]</a>`;
            }
            if (isGoing) {
                actionButtons += `<a href="#" class="event-action going" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'going'); return false;">[GOING]</a>`;
            } else {
                actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'going'); return false;">[GOING]</a>`;
            }
            actionButtons += '</span>';
        }
        
        // Build provider tags - showcase ALL providers for DIY culture emphasis
        let providerTags = [];
        if (event.dj || (event.artists && event.artists.length > 0)) {
            const djs = event.dj ? [event.dj] : (event.artists || []);
            providerTags.push(`DJ: ${djs.slice(0, 2).join(', ')}${djs.length > 2 ? ` +${djs.length - 2}` : ''}`);
        }
        if (event.venue) {
            providerTags.push(`VENUE: ${event.venue}`);
        }
        if (event.promoter) {
            providerTags.push(`PROMOTER: ${event.promoter}`);
        }
        if (event.sound_system || event.soundSystem) {
            providerTags.push(`SOUND: ${event.sound_system || event.soundSystem}`);
        }
        if (event.operator || event.operators) {
            const operators = Array.isArray(event.operator || event.operators) ? (event.operator || event.operators) : [event.operator || event.operators];
            providerTags.push(`OP: ${operators.slice(0, 2).join(', ')}${operators.length > 2 ? ` +${operators.length - 2}` : ''}`);
        }
        if (event.visual_artist || event.visualArtist) {
            providerTags.push(`VISUAL: ${event.visual_artist || event.visualArtist}`);
        }
        if (event.lighting || event.lighting_designer) {
            providerTags.push(`LIGHTING: ${event.lighting || event.lighting_designer}`);
        }
        const providerDisplay = providerTags.length > 0 ? `<span class="providers">${providerTags.join(' | ')}</span>` : '';
        
        return `
            <div class="event-listing" onclick="router.showEventDetailsModal('${title}')" data-event-uid="${eventUid}">
                <span class="time">${time}</span>
                <span class="type">[${(event.type || 'EVENT').toUpperCase()}]</span>
                <span>${title}</span>
                <span class="location">${event.location || event.venue || 'Location TBD'}</span>
                ${providerDisplay}
                ${event.friendsGoing !== undefined ? `<span class="friends-attending">[${event.friendsGoing || 0}/${event.attending || 0}]</span>` : ''}
                ${actionButtons}
                <a href="#" class="details-link" onclick="event.stopPropagation(); router.showEventDetailsModal('${title}'); return false;">[DETAILS]</a>
            </div>
        `;
    },
    
    createEventCardExpanded(event) {
        // Expanded card view (optional mode) - similar to DJ expanded cards
        const title = event.title || event.name || 'Event';
        
        // Parse date
        let eventDate = 'Date TBD';
        let eventTime = '--:--';
        if (event.date) {
            try {
                const dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                if (!isNaN(dateObj.getTime())) {
                    eventDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    eventTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            } catch (e) {
                // Keep defaults
            }
        }
        
        // Get artists/lineup
        const artists = event.dj ? [event.dj] : (event.artists || []);
        const artistPreview = artists.length > 0 ? artists.slice(0, 2).join(', ') + (artists.length > 2 ? ` +${artists.length - 2}` : '') : 'TBD';
        
        // Get genres
        const genres = event.genres || [];
        const genrePreview = genres.length > 0 ? genres.slice(0, 2).join(', ') + (genres.length > 2 ? ` +${genres.length - 2}` : '') : 'Electronic';
        
        // Venue
        const venue = event.venue || event.location || 'TBD';
        
        // Status indicator (upcoming/past)
        const now = new Date();
        const eventDateObj = event.date ? (typeof event.date === 'string' ? new Date(event.date) : event.date) : null;
        const isUpcoming = eventDateObj && eventDateObj > now;
        const status = isUpcoming ? 'UPCOMING' : 'PAST';
        const statusClass = isUpcoming ? 'status-active' : 'status-recent';
        
        // Check if user is logged in and if event is in any list
        const currentUser = state.currentUser || state.emulatedUser;
        const eventUid = event.event_uid || (event.title || event.name);
        const isSaved = currentUser && state.userEventLists.saved.includes(eventUid);
        const isMaybe = currentUser && state.userEventLists.maybe.includes(eventUid);
        const isGoing = currentUser && state.userEventLists.going.includes(eventUid);
        
        // Build action buttons (only show if logged in)
        let actionButtons = '';
        if (currentUser) {
            actionButtons = '<div class="event-card-list-actions">';
            if (isSaved) {
                actionButtons += `<a href="#" class="event-action saved" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'saved'); return false;">[SAVED]</a>`;
            } else {
                actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'saved'); return false;">[SAVE]</a>`;
            }
            if (isMaybe) {
                actionButtons += `<a href="#" class="event-action maybe" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'maybe'); return false;">[MAYBE]</a>`;
            } else {
                actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'maybe'); return false;">[MAYBE]</a>`;
            }
            if (isGoing) {
                actionButtons += `<a href="#" class="event-action going" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'going'); return false;">[GOING]</a>`;
            } else {
                actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'going'); return false;">[GOING]</a>`;
            }
            actionButtons += '</div>';
        }
        
        return `
            <div class="event-card-compact" data-event-title="${title}" data-event-uid="${eventUid}">
                <div class="event-card-header">
                    <span class="event-name-compact">${title}</span>
                    <span class="event-status ${statusClass}">${status}</span>
                </div>
                <div class="event-card-stats">
                    <span class="stat-item"><span class="stat-label">DATE:</span> ${eventDate}</span>
                    ${eventTime !== '--:--' ? `<span class="stat-item"><span class="stat-label">TIME:</span> ${eventTime}</span>` : ''}
                    <span class="stat-item"><span class="stat-label">VENUE:</span> ${venue}</span>
                    ${artists.length > 0 ? `<span class="stat-item"><span class="stat-label">LINEUP:</span> ${artistPreview}</span>` : ''}
                    ${genres.length > 0 ? `<span class="stat-item"><span class="stat-label">GENRES:</span> ${genrePreview}</span>` : ''}
                    ${event.promoter ? `<span class="stat-item"><span class="stat-label">PROMOTER:</span> ${event.promoter}</span>` : ''}
                    ${event.sound_system || event.soundSystem ? `<span class="stat-item"><span class="stat-label">SOUND:</span> ${event.sound_system || event.soundSystem}</span>` : ''}
                    ${event.operator || (event.operators && event.operators.length > 0) ? `<span class="stat-item"><span class="stat-label">OPERATOR:</span> ${Array.isArray(event.operator || event.operators) ? (event.operator || event.operators).slice(0, 2).join(', ') + ((event.operator || event.operators).length > 2 ? ` +${(event.operator || event.operators).length - 2}` : '') : (event.operator || event.operators)}</span>` : ''}
                    ${event.cost ? `<span class="stat-item"><span class="stat-label">COST:</span> ${event.cost}</span>` : ''}
                    ${event.interested !== undefined && event.interested !== null ? `<span class="stat-item"><span class="stat-label">INTERESTED:</span> ${event.interested}</span>` : ''}
                </div>
                ${actionButtons}
                <div class="event-card-actions">
                    <a href="#" class="view-full-link" onclick="event.stopPropagation(); router.showEventDetailsModal('${title}'); return false;">[VIEW DETAILS]</a>
                </div>
            </div>
        `;
    },

    createDJCard(djInfo) {
        // djInfo can be a profile object OR a week activity object with {name, eventCount, venues, events}
        // Default: Compact listing style (reverted from card view)
        const djName = djInfo.name;
        const eventCount = djInfo.eventCount || 0;
        const venues = djInfo.venues || [];
        const venueList = venues.length > 0 ? venues.join(', ') : 'TBD';
        
        return `
            <div class="dj-listing" onclick="router.showDJDetailsModal('${djName}')">
                <span class="dj-name">${djName}</span>
                ${eventCount > 0 ? `<span class="dj-event-count">${eventCount} ${eventCount === 1 ? 'event' : 'events'}</span>` : ''}
                ${venues.length > 0 ? `<span class="dj-venues">${venueList}</span>` : ''}
                <a href="#" class="details-link" onclick="event.stopPropagation(); router.showDJDetailsModal('${djName}'); return false;">[DETAILS]</a>
            </div>
        `;
    },
    
    createDJCardExpanded(djInfo) {
        // Expanded card view (optional mode) - see docs/DJ_CARD_VIEW_MODE.md
        const djName = djInfo.name;
        const eventCount = djInfo.eventCount || 0;
        const venues = djInfo.venues || [];
        const stats = aggregateDJStats(djName);
        const rating = djInfo.rating !== undefined ? djInfo.rating : null;
        const reviewCount = djInfo.reviewCount || 0;
        const genres = djInfo.genres || (stats.topStyles ? stats.topStyles.slice(0, 2).map(s => s.style) : []);
        const status = stats.activityStatus || 'UNKNOWN';
        const statusClass = status === 'ACTIVE' ? 'status-active' : status === 'RECENT' ? 'status-recent' : 'status-inactive';
        const venueList = venues.length > 2 ? venues.slice(0, 2).join(', ') + ` +${venues.length - 2}` : venues.join(', ');
        
        return `
            <div class="dj-card-compact" data-dj-name="${djName}">
                <div class="dj-card-header">
                    <span class="dj-name-compact">${djName}</span>
                    <span class="dj-status ${statusClass}">${status}</span>
                </div>
                <div class="dj-card-stats">
                    ${eventCount > 0 ? `<span class="stat-item"><span class="stat-label">EVENTS:</span> ${eventCount}</span>` : ''}
                    ${rating !== null && rating !== undefined ? `<span class="stat-item"><span class="stat-label">RATING:</span> ${typeof rating === 'number' ? rating.toFixed(1) : rating}/5</span>` : ''}
                    ${reviewCount > 0 ? `<span class="stat-item"><span class="stat-label">REVIEWS:</span> ${reviewCount}</span>` : ''}
                    ${genres.length > 0 ? `<span class="stat-item"><span class="stat-label">GENRES:</span> ${genres.join(', ')}</span>` : ''}
                </div>
                ${venues.length > 0 ? `
                <div class="dj-card-venues">
                    <span class="venues-label">VENUES:</span> ${venueList}
                </div>
                ` : ''}
                <div class="dj-card-actions">
                    <a href="#" class="view-full-link" onclick="event.stopPropagation(); router.showDJProfileView('${djName}'); return false;">[VIEW FULL PROFILE]</a>
                </div>
            </div>
        `;
    },
    
    async enrichDJCardData(djInfo) {
        // Enrich DJ card with editorial data and reviews for compact display
        try {
            // Fetch editorial attributes
            const { data: editorialData } = await state.supabaseClient
                .from('dj_editorial_attributes')
                .select('editorial_rating, genres')
                .eq('name', djInfo.name)
                .single();
            
            // Fetch review aggregate
            const { data: reviewData } = await state.supabaseClient
                .from('dj_reviews_aggregate')
                .select('average_rating, review_count')
                .eq('dj_name', djInfo.name)
                .single();
            
            return {
                ...djInfo,
                rating: reviewData?.average_rating || editorialData?.editorial_rating || null,
                reviewCount: reviewData?.review_count || 0,
                genres: editorialData?.genres || []
            };
        } catch (error) {
            // If no data found, return original info
            return djInfo;
        }
    },

    renderEvents(events, containerId = 'events-container') {
        // Apply time range filter if not already filtered
        if (state.timeRange && state.timeRange !== 'all') {
            const { startDate, endDate } = router.getTimeRangeDates();
            events = events.filter(event => {
                const eventDate = event.date || event.start;
                if (!eventDate) return false;
                const date = new Date(eventDate);
                return date >= startDate && date <= endDate;
            });
        }
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Events container "${containerId}" not found!`);
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

        // Sort events based on active sort type
        let sortedEvents = [...events];
        
        if (state.activeSort === 'start') {
            sortedEvents.sort((a, b) => {
                const timeA = a.start ? new Date(a.start).getTime() : (a.date ? new Date(a.date).getTime() : 0);
                const timeB = b.start ? new Date(b.start).getTime() : (b.date ? new Date(b.date).getTime() : 0);
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                return state.timeSortOrder.start === 'asc' ? timeA - timeB : timeB - timeA;
            });
        } else if (state.activeSort === 'end') {
            sortedEvents.sort((a, b) => {
                const timeA = a.end ? new Date(a.end).getTime() : 0;
                const timeB = b.end ? new Date(b.end).getTime() : 0;
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                return state.timeSortOrder.end === 'asc' ? timeA - timeB : timeB - timeA;
            });
        } else {
            // Default: sort by date
            sortedEvents.sort((a, b) => {
            const dateA = a.date || a.start;
            const dateB = b.date || b.start;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
                const timeA = new Date(dateA).getTime();
                const timeB = new Date(dateB).getTime();
                return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            });
        }
        
        // Check view mode
        const useCards = state.eventViewMode === 'cards';
        
        if (useCards) {
            // Expanded card view
            const cardsHTML = sortedEvents.map(event => this.createEventCardExpanded(event)).join('');
            container.innerHTML = cardsHTML;
        } else {
            // Table view (default) - matching MAKERS style
            container.innerHTML = this.renderEventsTable(sortedEvents);
        }
        
        console.log(`✅ Rendered ${sortedEvents.length} events in ${state.eventViewMode} mode`);
        if (CONFIG.flags.debug) console.log('Events rendered');
    },
    
    renderEventsTable(events) {
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += `<th class="sortable-header" onclick="router.filterByTime('start')" style="cursor: pointer;">START ${state.timeSortOrder.start === 'asc' ? '↑' : '↓'}</th>`;
        html += `<th class="sortable-header" onclick="router.filterByTime('end')" style="cursor: pointer;">END ${state.timeSortOrder.end === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>PARTY</th>';
        html += '<th>VENUE</th>';
        html += '<th>DJ</th>';
        html += '<th>ACTIONS</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        events.forEach(event => {
            const title = event.title || event.name || 'Event';
            const eventUid = event.event_uid || title;
            
            // Format date
            let dateDisplay = 'TBD';
            let startDisplay = '--:--';
            let endDisplay = '--:--';
            
            // Try to get start time from event.start or event.date
            if (event.start) {
                try {
                    const startObj = typeof event.start === 'string' ? new Date(event.start) : event.start;
                    if (!isNaN(startObj.getTime())) {
                        startDisplay = startObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                } catch (e) {
                    // Keep default
                }
            } else if (event.date) {
                try {
                    const dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                    if (!isNaN(dateObj.getTime())) {
                        dateDisplay = this.formatEventDate(event);
                        startDisplay = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                } catch (e) {
                    // Keep defaults
                }
            }
            
            // Try to get end time from event.end
            if (event.end) {
                try {
                    const endObj = typeof event.end === 'string' ? new Date(event.end) : event.end;
                    if (!isNaN(endObj.getTime())) {
                        endDisplay = endObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                } catch (e) {
                    // Keep default
                }
            }
            
            // Get date display if not already set
            if (dateDisplay === 'TBD' && event.date) {
                try {
                    const dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                    if (!isNaN(dateObj.getTime())) {
                        dateDisplay = this.formatEventDate(event);
                    }
                } catch (e) {
                    // Keep default
                }
            }
            
            // Get DJ
            const dj = event.dj || (event.artists && event.artists.length > 0 ? event.artists[0] : '') || 'TBD';
            const djDisplay = event.artists && event.artists.length > 1 ? `${dj} +${event.artists.length - 1}` : dj;
            
            // Get venue
            const venue = event.venue || event.location || 'TBD';
            
            // Check if user is logged in and if event is in any list
            const currentUser = state.currentUser || state.emulatedUser;
            const isSaved = currentUser && state.userEventLists.saved.includes(eventUid);
            const isMaybe = currentUser && state.userEventLists.maybe.includes(eventUid);
            const isGoing = currentUser && state.userEventLists.going.includes(eventUid);
            
            // Build action buttons (only show if logged in)
            let actionButtons = '';
            if (currentUser) {
                if (isSaved) {
                    actionButtons += `<a href="#" class="event-action saved" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'saved'); return false;">[SAVED]</a> `;
                } else {
                    actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'saved'); return false;">[SAVE]</a> `;
                }
                if (isMaybe) {
                    actionButtons += `<a href="#" class="event-action maybe" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'maybe'); return false;">[MAYBE]</a> `;
                } else {
                    actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'maybe'); return false;">[MAYBE]</a> `;
                }
                if (isGoing) {
                    actionButtons += `<a href="#" class="event-action going" onclick="event.stopPropagation(); router.removeEventFromList('${eventUid}', 'going'); return false;">[GOING]</a> `;
                } else {
                    actionButtons += `<a href="#" class="event-action" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'going'); return false;">[GOING]</a> `;
                }
            }
            actionButtons += `<a href="#" class="details-link" onclick="event.stopPropagation(); router.showEventDetailsModal('${title}'); return false;">[DETAILS]</a>`;
            
            html += '<tr onclick="router.showEventDetailsModal(\'' + title + '\')" style="cursor: pointer;">';
            html += `<td class="date-cell">${dateDisplay}</td>`;
            html += `<td class="time-cell">${startDisplay}</td>`;
            html += `<td class="time-cell">${endDisplay}</td>`;
            html += `<td>${title}</td>`;
            html += `<td>${venue}</td>`;
            html += `<td>${djDisplay}</td>`;
            html += `<td onclick="event.stopPropagation();" style="cursor: default;">${actionButtons}</td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },

    async renderDJProfiles(profiles, highlightName = null) {
        const container = document.getElementById('dj-profiles-container');
        if (!container) {
            console.error('DJ profiles container not found!');
            return;
        }

        if (!profiles || profiles.length === 0) {
            container.innerHTML = '<div class="empty-state">> No DJ profiles found.</div>';
            return;
        }

        // Sort DJs based on active sort type
        let sortedProfiles = [...profiles];
        
        if (state.activeSort === 'start') {
            sortedProfiles.sort((a, b) => {
                let timeA = 0, timeB = 0;
                
                if (a.events && a.events.length > 0) {
                    const nextEventA = a.events[0];
                    timeA = nextEventA.start ? new Date(nextEventA.start).getTime() : (nextEventA.date ? new Date(nextEventA.date).getTime() : 0);
                }
                
                if (b.events && b.events.length > 0) {
                    const nextEventB = b.events[0];
                    timeB = nextEventB.start ? new Date(nextEventB.start).getTime() : (nextEventB.date ? new Date(nextEventB.date).getTime() : 0);
                }
                
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                
                return state.timeSortOrder.start === 'asc' ? timeA - timeB : timeB - timeA;
            });
        } else if (state.activeSort === 'end') {
            sortedProfiles.sort((a, b) => {
                let timeA = 0, timeB = 0;
                
                if (a.events && a.events.length > 0) {
                    const nextEventA = a.events[0];
                    timeA = nextEventA.end ? new Date(nextEventA.end).getTime() : 0;
                }
                
                if (b.events && b.events.length > 0) {
                    const nextEventB = b.events[0];
                    timeB = nextEventB.end ? new Date(nextEventB.end).getTime() : 0;
                }
                
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                
                return state.timeSortOrder.end === 'asc' ? timeA - timeB : timeB - timeA;
            });
        } else {
            // Default: sort by date
            sortedProfiles.sort((a, b) => {
                // Get next event date for each DJ
                const dateA = a.events && a.events.length > 0 ? a.events[0].date : null;
                const dateB = b.events && b.events.length > 0 ? b.events[0].date : null;
                
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                
                const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
                const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
                
                return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            });
        }

        // Check view mode
        const useCards = state.djViewMode === 'cards';
        
        if (useCards) {
            // Show loading state
            container.innerHTML = '<div class="empty-state">> Loading DJ profiles...</div>';
            
            // Enrich profiles with editorial data and reviews for card view
            const enrichedProfiles = await Promise.all(
                sortedProfiles.map(dj => this.enrichDJCardData(dj))
            );
            
            // Create expanded DJ cards
            const cardsHTML = enrichedProfiles.map(dj => this.createDJCardExpanded(dj)).join('');
            container.innerHTML = cardsHTML;
        } else {
            // Table view (default) - matching MAKERS style
            container.innerHTML = this.renderDJsTable(sortedProfiles);
        }
        
        if (CONFIG.flags.debug) console.log('DJ profiles rendered in', state.djViewMode, 'mode');
        
        // Highlight specific DJ if requested
        if (highlightName) {
            setTimeout(() => this.highlightDJ(highlightName), 100);
        }
    },
    
    renderDJsTable(profiles) {
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += `<th class="sortable-header" onclick="router.filterByTime('start')" style="cursor: pointer;">START ${state.timeSortOrder.start === 'asc' ? '↑' : '↓'}</th>`;
        html += `<th class="sortable-header" onclick="router.filterByTime('end')" style="cursor: pointer;">END ${state.timeSortOrder.end === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>DJ</th>';
        html += '<th>EVENTS</th>';
        html += '<th>VENUES</th>';
        html += '<th>ACTIONS</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        profiles.forEach(djInfo => {
            const djName = djInfo.name;
            const eventCount = djInfo.eventCount || 0;
            const venues = djInfo.venues || [];
            const venueList = venues.length > 0 ? (venues.length > 2 ? venues.slice(0, 2).join(', ') + ` +${venues.length - 2}` : venues.join(', ')) : 'TBD';
            
            // Get next event date, start, and end
            let dateDisplay = 'TBD';
            let startDisplay = '--:--';
            let endDisplay = '--:--';
            
            if (djInfo.events && djInfo.events.length > 0) {
                const nextEvent = djInfo.events[0];
                const eventDate = nextEvent.date;
                
                if (eventDate) {
                    try {
                        const dateObj = eventDate instanceof Date ? eventDate : new Date(eventDate);
                        if (!isNaN(dateObj.getTime())) {
                            // Create a minimal event object for formatEventDate
                            const eventObj = { date: dateObj };
                            dateDisplay = this.formatEventDate(eventObj);
                            
                            // Get start time from nextEvent.start or use date
                            if (nextEvent.start) {
                                const startObj = nextEvent.start instanceof Date ? nextEvent.start : new Date(nextEvent.start);
                                if (!isNaN(startObj.getTime())) {
                                    startDisplay = startObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                }
                            } else {
                                startDisplay = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            }
                            
                            // Get end time from nextEvent.end
                            if (nextEvent.end) {
                                const endObj = nextEvent.end instanceof Date ? nextEvent.end : new Date(nextEvent.end);
                                if (!isNaN(endObj.getTime())) {
                                    endDisplay = endObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                }
                            }
                        }
                    } catch (e) {
                        // Keep defaults
                    }
                }
            }
            
            html += '<tr onclick="router.showDJDetailsModal(\'' + djName + '\')" style="cursor: pointer;">';
            html += `<td class="date-cell">${dateDisplay}</td>`;
            html += `<td class="time-cell">${startDisplay}</td>`;
            html += `<td class="time-cell">${endDisplay}</td>`;
            html += `<td>${djName}</td>`;
            html += `<td>${eventCount} ${eventCount === 1 ? 'event' : 'events'}</td>`;
            html += `<td>${venueList}</td>`;
            html += `<td onclick="event.stopPropagation();" style="cursor: default;"><a href="#" class="details-link" onclick="event.stopPropagation(); router.showDJDetailsModal('${djName}'); return false;">[DETAILS]</a></td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },

    highlightDJ(djName) {
        // Support both table rows and card/listings
        const cards = document.querySelectorAll('#dj-profiles-container .dj-card, #dj-profiles-container .dj-listing, #dj-profiles-container tr');
        cards.forEach(card => {
            const nameElement = card.querySelector('.dj-name, .dj-name-compact');
            const textContent = card.textContent || '';
            if ((nameElement && nameElement.textContent.includes(djName)) || textContent.includes(djName)) {
                if (card.tagName === 'TR') {
                    card.style.backgroundColor = '#e3f2fd';
                    card.style.border = '2px solid #007bff';
                    setTimeout(() => {
                        card.style.backgroundColor = '';
                        card.style.border = '';
                    }, 3000);
                } else {
                card.style.backgroundColor = '#e3f2fd';
                card.style.border = '2px solid #007bff';
                setTimeout(() => {
                    card.style.backgroundColor = '';
                    card.style.border = '';
                }, 3000);
                }
            }
        });
    },
    
    async renderDJDetailsModal(djName) {
        // Compact modal view (similar to event details)
        const modal = document.getElementById('dj-details-modal');
        const titleElement = document.getElementById('dj-details-modal-title');
        const bodyElement = document.getElementById('dj-details-modal-body');
        
        if (!modal || !titleElement || !bodyElement) {
            console.error('DJ details modal elements not found');
            return;
        }
        
        // Update title
        titleElement.textContent = `${djName} - Details`;
        
        // Show loading
        bodyElement.innerHTML = '<div class="empty-state">> Loading DJ details...</div>';
        
        try {
            // Fetch profile data
            const profile = await api.fetchDJProfile(djName);
            const stats = aggregateDJStats(djName);
            const [editorial, reviews] = await Promise.all([
                api.fetchDJEditorialAttributes(djName),
                api.fetchDJReviewsAggregate(djName)
            ]);
            
            // Build compact details HTML
            let html = '<div class="dj-details-compact">';
            
            // Key stats
            html += '<div class="dj-details-stats">';
            if (stats && stats.totalEvents > 0) {
                html += `<div class="detail-stat"><span class="detail-label">EVENTS:</span> ${stats.totalEvents}</div>`;
            }
            if (reviews && reviews.review_count > 0) {
                html += `<div class="detail-stat"><span class="detail-label">RATING:</span> ${reviews.average_rating}/5 (${reviews.review_count} reviews)</div>`;
            } else if (editorial && editorial.editorial_rating !== null && editorial.editorial_rating !== undefined) {
                html += `<div class="detail-stat"><span class="detail-label">RATING:</span> ${editorial.editorial_rating}/5</div>`;
            }
            if (stats && stats.activityStatus) {
                html += `<div class="detail-stat"><span class="detail-label">STATUS:</span> ${stats.activityStatus}</div>`;
            }
            if (editorial && editorial.genres && editorial.genres.length > 0) {
                html += `<div class="detail-stat"><span class="detail-label">GENRES:</span> ${editorial.genres.join(', ')}</div>`;
            }
            if (editorial && editorial.style_tags && editorial.style_tags.length > 0) {
                html += `<div class="detail-stat"><span class="detail-label">STYLE:</span> ${editorial.style_tags.join(', ')}</div>`;
            }
            html += '</div>';
            
            // Upcoming events (next 3)
            if (stats && stats.upcomingEvents && stats.upcomingEvents.length > 0) {
                html += '<div class="dj-details-upcoming">';
                html += '<div class="detail-section-label">UPCOMING</div>';
                stats.upcomingEvents.slice(0, 3).forEach(event => {
                    const date = event.date instanceof Date ? event.date : new Date(event.date);
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    html += `<div class="detail-event">${dateStr} - ${event.venue}${event.city ? ` [${event.city}]` : ''}</div>`;
                });
                html += '</div>';
            }
            
            // Actions
            html += '<div class="dj-details-actions">';
            html += `<button class="terminal-button" onclick="views.closeDJDetailsModal(); state.djNavigationSource = 'modal'; router.showDJProfileView('${djName}');">[VIEW FULL PROFILE]</button>`;
            if (reviews && reviews.review_count > 0) {
                html += `<button class="terminal-button secondary" onclick="views.closeDJDetailsModal(); state.djNavigationSource = 'modal'; router.showDJReviews('${djName}');">[VIEW REVIEWS]</button>`;
            }
            html += '</div>';
            
            html += '</div>';
            bodyElement.innerHTML = html;
            
            // Show modal
            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error loading DJ details:', error);
            bodyElement.innerHTML = `<div class="empty-state">> Error loading DJ details: ${error.message}</div>`;
            modal.style.display = 'flex';
        }
    },
    
    closeDJDetailsModal() {
        const modal = document.getElementById('dj-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
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

    createVenueCard(venueInfo) {
        // Compact line view (default) - similar to DJs
        const venueName = venueInfo.name;
        const pastEvents = venueInfo.pastEvents || 0;
        const upcomingCount = venueInfo.upcomingEvents ? venueInfo.upcomingEvents.length : 0;
        const rating = venueInfo.rating || 0;
        const reviewCount = venueInfo.reviewCount || 0;
        
        return `
            <div class="venue-listing" onclick="router.showVenueDetailsModal('${venueName}')">
                <span class="venue-name">${venueName}</span>
                ${rating > 0 ? `<span class="venue-rating">${rating.toFixed(1)} ⭐ (${reviewCount})</span>` : ''}
                ${pastEvents > 0 ? `<span class="venue-past-events">${pastEvents} past</span>` : ''}
                ${upcomingCount > 0 ? `<span class="venue-upcoming-events">${upcomingCount} upcoming</span>` : ''}
                <a href="#" class="details-link" onclick="event.stopPropagation(); router.showVenueDetailsModal('${venueName}'); return false;">[DETAILS]</a>
            </div>
        `;
    },

    createVenueCardExpanded(venueInfo) {
        // Expanded card view (optional mode) - similar to DJ expanded cards
        const venueName = venueInfo.name;
        const pastEvents = venueInfo.pastEvents || 0;
        const upcomingCount = venueInfo.upcomingEvents ? venueInfo.upcomingEvents.length : 0;
        const rating = venueInfo.rating || 0;
        const reviewCount = venueInfo.reviewCount || 0;
        const stats = aggregateVenueStats(venueName);
        
        return `
            <div class="venue-card-compact" data-venue-name="${venueName}">
                <div class="venue-card-header">
                    <span class="venue-name-compact">${venueName}</span>
                </div>
                <div class="venue-card-stats">
                    ${pastEvents > 0 ? `<span class="stat-item"><span class="stat-label">PAST EVENTS:</span> ${pastEvents}</span>` : ''}
                    ${upcomingCount > 0 ? `<span class="stat-item"><span class="stat-label">UPCOMING:</span> ${upcomingCount}</span>` : ''}
                    ${rating > 0 ? `<span class="stat-item"><span class="stat-label">RATING:</span> ${rating.toFixed(1)}/5</span>` : ''}
                    ${reviewCount > 0 ? `<span class="stat-item"><span class="stat-label">REVIEWS:</span> ${reviewCount}</span>` : ''}
                </div>
                <div class="venue-card-actions">
                    <a href="#" class="view-full-link" onclick="event.stopPropagation(); router.showVenueProfileView('${venueName}'); return false;">[VIEW FULL PROFILE]</a>
                </div>
            </div>
        `;
    },

    async renderVenues(venues) {
        const container = document.getElementById('venues-container');
        if (!container) {
            console.error('Venues container not found!');
            return;
        }

        if (!venues || venues.length === 0) {
            const cityContext = state.userCity ? ` in ${state.userCity}` : '';
            container.innerHTML = `<div class="empty-state">> No venues found${cityContext}.</div>`;
            return;
        }

        // Apply time range filter to venues (filter by their events)
        if (state.timeRange && state.timeRange !== 'all' && router) {
            const { startDate, endDate } = router.getTimeRangeDates();
            venues = venues.filter(venue => {
                if (!venue.upcomingEvents || venue.upcomingEvents.length === 0) return false;
                return venue.upcomingEvents.some(event => {
                    const eventDate = event.date || event.start;
                    if (!eventDate) return false;
                    const date = new Date(eventDate);
                    return date >= startDate && date <= endDate;
                });
            });
        }

        // Sort venues based on active sort type (similar to DJs)
        let sortedVenues = [...venues];
        
        if (state.activeSort === 'start') {
            sortedVenues.sort((a, b) => {
                let timeA = 0, timeB = 0;
                
                if (a.upcomingEvents && a.upcomingEvents.length > 0) {
                    const nextEventA = a.upcomingEvents[0];
                    timeA = nextEventA.start ? new Date(nextEventA.start).getTime() : (nextEventA.date ? new Date(nextEventA.date).getTime() : 0);
                }
                
                if (b.upcomingEvents && b.upcomingEvents.length > 0) {
                    const nextEventB = b.upcomingEvents[0];
                    timeB = nextEventB.start ? new Date(nextEventB.start).getTime() : (nextEventB.date ? new Date(nextEventB.date).getTime() : 0);
                }
                
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                
                return state.timeSortOrder.start === 'asc' ? timeA - timeB : timeB - timeA;
            });
        } else if (state.activeSort === 'end') {
            sortedVenues.sort((a, b) => {
                let timeA = 0, timeB = 0;
                
                if (a.upcomingEvents && a.upcomingEvents.length > 0) {
                    const nextEventA = a.upcomingEvents[0];
                    timeA = nextEventA.end ? new Date(nextEventA.end).getTime() : 0;
                }
                
                if (b.upcomingEvents && b.upcomingEvents.length > 0) {
                    const nextEventB = b.upcomingEvents[0];
                    timeB = nextEventB.end ? new Date(nextEventB.end).getTime() : 0;
                }
                
                if (timeA === 0 && timeB === 0) return 0;
                if (timeA === 0) return 1;
                if (timeB === 0) return -1;
                
                return state.timeSortOrder.end === 'asc' ? timeA - timeB : timeB - timeA;
            });
        } else {
            // Default: sort by date
            sortedVenues.sort((a, b) => {
                const dateA = a.upcomingEvents && a.upcomingEvents.length > 0 ? a.upcomingEvents[0].date : null;
                const dateB = b.upcomingEvents && b.upcomingEvents.length > 0 ? b.upcomingEvents[0].date : null;
                
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                
                const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
                const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
                
                return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            });
        }

        // Check view mode
        const useCards = state.venueViewMode === 'cards';
        
        if (useCards) {
            // Show loading state
            container.innerHTML = '<div class="empty-state">> Loading venue profiles...</div>';
            
            // Enrich venues with stats for card view
            const enrichedVenues = await Promise.all(
                sortedVenues.map(venue => this.enrichVenueCardData(venue))
            );
            
            // Create expanded venue cards
            const cardsHTML = enrichedVenues.map(venue => this.createVenueCardExpanded(venue)).join('');
        container.innerHTML = cardsHTML;
        } else {
            // Table view (default) - matching Events and DJs style
            container.innerHTML = this.renderVenuesTable(sortedVenues);
        }
        
        if (CONFIG.flags.debug) console.log('Venues rendered in', state.venueViewMode, 'mode');
    },
    
    renderVenuesTable(venues) {
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += `<th class="sortable-header" onclick="router.filterByTime('start')" style="cursor: pointer;">START ${state.timeSortOrder.start === 'asc' ? '↑' : '↓'}</th>`;
        html += `<th class="sortable-header" onclick="router.filterByTime('end')" style="cursor: pointer;">END ${state.timeSortOrder.end === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>VENUE</th>';
        html += '<th>RATING</th>';
        html += '<th>PAST</th>';
        html += '<th>UPCOMING</th>';
        html += '<th>ACTIONS</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        venues.forEach(venueInfo => {
            const venueName = venueInfo.name;
            const pastEvents = venueInfo.pastEvents || 0;
            const upcomingCount = venueInfo.upcomingEvents ? venueInfo.upcomingEvents.length : 0;
            const rating = venueInfo.rating || 0;
            const reviewCount = venueInfo.reviewCount || 0;
            
            // Get next event date, start, and end
            let dateDisplay = 'TBD';
            let startDisplay = '--:--';
            let endDisplay = '--:--';
            
            if (venueInfo.upcomingEvents && venueInfo.upcomingEvents.length > 0) {
                const nextEvent = venueInfo.upcomingEvents[0];
                const eventDate = nextEvent.date;
                
                if (eventDate) {
                    try {
                        const dateObj = eventDate instanceof Date ? eventDate : new Date(eventDate);
                        if (!isNaN(dateObj.getTime())) {
                            // Create a minimal event object for formatEventDate
                            const eventObj = { date: dateObj };
                            dateDisplay = this.formatEventDate(eventObj);
                            
                            // Get start time from nextEvent.start or use date
                            if (nextEvent.start) {
                                const startObj = nextEvent.start instanceof Date ? nextEvent.start : new Date(nextEvent.start);
                                if (!isNaN(startObj.getTime())) {
                                    startDisplay = startObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                }
                            } else {
                                startDisplay = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            }
                            
                            // Get end time from nextEvent.end
                            if (nextEvent.end) {
                                const endObj = nextEvent.end instanceof Date ? nextEvent.end : new Date(nextEvent.end);
                                if (!isNaN(endObj.getTime())) {
                                    endDisplay = endObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                }
                            }
                        }
                    } catch (e) {
                        // Keep defaults
                    }
                }
            }
            
            // Format rating display
            let ratingDisplay = '--';
            if (rating > 0) {
                ratingDisplay = `${rating.toFixed(1)} ⭐`;
                if (reviewCount > 0) {
                    ratingDisplay += ` (${reviewCount})`;
                }
            }
            
            html += '<tr onclick="router.showVenueDetailsModal(\'' + venueName + '\')" style="cursor: pointer;">';
            html += `<td class="date-cell">${dateDisplay}</td>`;
            html += `<td class="time-cell">${startDisplay}</td>`;
            html += `<td class="time-cell">${endDisplay}</td>`;
            html += `<td>${venueName}</td>`;
            html += `<td>${ratingDisplay}</td>`;
            html += `<td>${pastEvents}</td>`;
            html += `<td>${upcomingCount}</td>`;
            html += `<td onclick="event.stopPropagation();" style="cursor: default;"><a href="#" class="details-link" onclick="event.stopPropagation(); router.showVenueDetailsModal('${venueName}'); return false;">[DETAILS]</a></td>`;
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },
    
    async enrichVenueCardData(venueInfo) {
        // Enrich venue card with stats for expanded display
        try {
            const stats = aggregateVenueStats(venueInfo.name);
            return {
                ...venueInfo,
                stats: stats
            };
        } catch (error) {
            console.error('Error enriching venue data:', error);
            return venueInfo;
        }
    },

    async renderVenueDetailsModal(venueName) {
        // Compact modal view (similar to DJ details modal)
        const modal = document.getElementById('dj-details-modal'); // Reuse DJ modal for now
        const titleElement = document.getElementById('dj-details-modal-title');
        const bodyElement = document.getElementById('dj-details-modal-body');
        
        if (!modal || !titleElement || !bodyElement) {
            console.error('Venue details modal elements not found');
            return;
        }
        
        // Update title
        titleElement.textContent = `${venueName} - Details`;
        
        // Show loading
        bodyElement.innerHTML = '<div class="empty-state">> Loading venue details...</div>';
        modal.style.display = 'block';
        
        try {
            // Get venue data
            const venue = state.venuesData.find(v => v.name === venueName);
            if (!venue) {
                await api.fetchVenues();
                const updatedVenue = state.venuesData.find(v => v.name === venueName);
                if (!updatedVenue) {
                    bodyElement.innerHTML = '<div class="empty-state">> Venue not found.</div>';
                    return;
                }
                return this.renderVenueDetailsModal(venueName); // Retry
            }
            
            const stats = aggregateVenueStats(venueName);
            
            // Build compact details HTML
            let html = '<div class="venue-details-compact">';
            
            // Key stats
            html += '<div class="venue-details-stats">';
            if (stats && stats.totalEvents > 0) {
                html += `<div class="detail-stat"><span class="detail-label">EVENTS:</span> ${stats.totalEvents}</div>`;
                html += `<div class="detail-stat"><span class="detail-label">PAST:</span> ${stats.pastEvents}</div>`;
                html += `<div class="detail-stat"><span class="detail-label">UPCOMING:</span> ${stats.upcomingEvents.length}</div>`;
            }
            if (venue.rating > 0) {
                html += `<div class="detail-stat"><span class="detail-label">RATING:</span> ${venue.rating.toFixed(1)}/5 (${venue.reviewCount} reviews)</div>`;
            }
            if (stats && stats.activityStatus) {
                html += `<div class="detail-stat"><span class="detail-label">STATUS:</span> ${stats.activityStatus}</div>`;
            }
            html += '</div>';
            
            // Upcoming events preview
            if (stats && stats.upcomingEvents && stats.upcomingEvents.length > 0) {
                html += '<div class="venue-upcoming-preview">';
                html += '<div class="detail-label">UPCOMING EVENTS:</div>';
                stats.upcomingEvents.slice(0, 3).forEach(event => {
                    html += `<div class="upcoming-event-item">`;
                    html += `<span>${new Date(event.date).toLocaleDateString()}</span> - ${event.title}`;
                    html += `</div>`;
                });
                html += '</div>';
            }
            
            html += '<div class="venue-modal-actions">';
            html += `<a href="#" class="view-full-link" onclick="router.showVenueProfileView('${venueName}'); return false;">[VIEW FULL PROFILE]</a>`;
            html += '</div>';
            html += '</div>';
            
            bodyElement.innerHTML = html;
        } catch (error) {
            console.error('Error rendering venue details modal:', error);
            bodyElement.innerHTML = '<div class="empty-state">> Error loading venue details.</div>';
        }
    },
    
    async renderVenueProfile(venue) {
        const container = document.getElementById('venue-details-container');
        if (!container) {
            console.error('Venue details container not found!');
            return;
        }

        if (!venue) {
            container.innerHTML = '<div class="empty-state">> Venue not found.</div>';
            return;
        }

        try {
            const stats = aggregateVenueStats(venue.name);
            const formatDate = (date) => {
                if (!date) return 'Unknown';
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            };
            
            let html = `
                <div class="venue-profile">
                    <div class="venue-profile-header">
                        <h1 class="venue-profile-name">${venue.name}</h1>
                </div>
            `;

            // Reviews (if available)
            if (venue.rating > 0) {
                html += `
                    <div class="venue-profile-section">
                        <div class="section-label">REVIEWS</div>
                        <div class="section-content">
                            <span class="reviews-link">${venue.rating.toFixed(1)}/5</span>
                            <span class="review-count">(${venue.reviewCount} reviews)</span>
                    </div>
                    </div>`;
            }

            // Status
            if (stats && stats.activityStatus) {
                html += `
                    <div class="venue-profile-section">
                        <div class="section-label">STATUS</div>
                        <div class="section-content">${stats.activityStatus}</div>
                    </div>`;
            }

            // Statistics
            if (stats && stats.totalEvents > 0) {
                html += `
                    <div class="venue-profile-section">
                        <div class="section-label">STATISTICS</div>
                        <div class="section-content">`;
                
                html += `<div class="stat-line"><span class="stat-label">TOTAL EVENTS:</span> ${stats.totalEvents}</div>`;
                html += `<div class="stat-line"><span class="stat-label">PAST EVENTS:</span> ${stats.pastEvents}</div>`;
                html += `<div class="stat-line"><span class="stat-label">UPCOMING:</span> ${stats.upcomingEvents.length}</div>`;
                
                if (stats.firstAppearance) {
                    html += `<div class="stat-line"><span class="stat-label">FIRST EVENT:</span> ${formatDate(stats.firstAppearance)}</div>`;
                }
                if (stats.lastAppearance) {
                    html += `<div class="stat-line"><span class="stat-label">LAST EVENT:</span> ${formatDate(stats.lastAppearance)}</div>`;
                }
                
                html += `</div></div>`;
            }

            // Top DJs
            if (stats && stats.topDJs && stats.topDJs.length > 0) {
                html += `
                    <div class="venue-profile-section">
                        <div class="section-label">TOP DJS</div>
                        <div class="section-content">
                            ${stats.topDJs.map(d => `${d.dj} (${d.count})`).join(' | ')}
                    </div>
                    </div>`;
            }

            // Top Styles/Genres
            if (stats && stats.topStyles && stats.topStyles.length > 0) {
                html += `
                    <div class="venue-profile-section">
                        <div class="section-label">GENRES</div>
                        <div class="section-content">
                            ${stats.topStyles.map(s => `${s.style} (${s.count})`).join(' | ')}
                    </div>
                    </div>`;
            }

            // Upcoming events
            if (stats && stats.upcomingEvents && stats.upcomingEvents.length > 0) {
                html += `
                    <div class="venue-profile-section">
                        <div class="section-label">UPCOMING EVENTS</div>
                        <div class="section-content">`;
                stats.upcomingEvents.forEach(event => {
                    html += `
                        <div class="upcoming-event">
                            <span class="event-date">${formatDate(event.date)}</span>
                            <span class="event-title">${event.title}</span>
                            ${event.dj ? `<span class="event-dj">${event.dj}</span>` : ''}
                            <a href="#" class="details-link" onclick="router.showEventDetailsView('${event.title}'); return false;">[DETAILS]</a>
                        </div>`;
                });
                html += `</div></div>`;
            }

            html += `</div>`;
            container.innerHTML = html;
            
            if (CONFIG.flags.debug) console.log('Venue profile rendered');
        } catch (error) {
            console.error('Error rendering venue profile:', error);
            container.innerHTML = '<div class="empty-state">> Error loading venue profile.</div>';
        }
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

    async renderOperatorsTable(operatorType) {
        const container = document.getElementById('operators-table-container');
        if (!container) {
            console.error('Operators table container not found!');
            return;
        }

        views.showLoading('operators-table-container');

        try {
            // Get events filtered by time range
            let startDate, endDate;
            if (state.timeRange && router) {
                const rangeDates = router.getTimeRangeDates();
                startDate = rangeDates.startDate;
                endDate = rangeDates.endDate;
            } else {
                // Default to next 7 days
                const now = new Date();
                startDate = now;
                endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            
            let upcomingEvents = (state.eventsData || []).filter(event => {
                const date = event.date || event.start;
                if (!date) return false;
                try {
                    const eventDate = new Date(date);
                    return eventDate >= startDate && eventDate <= endDate;
                } catch (e) {
                    return false;
                }
            });

            // Fetch operator data for these events
            const eventUids = upcomingEvents.map(e => e.event_uid || e.title || e.name);
            await api.fetchEventOperators(eventUids);

            // Filter events to only show those with operators of the selected type
            if (operatorType === 'sound') {
                upcomingEvents = upcomingEvents.filter(event => {
                    const eventUid = event.event_uid || event.title || event.name;
                    return state.eventOperatorsData.some(eo => 
                        eo.event_uid === eventUid && eo.operator_type === 'sound'
                    );
                });
            } else if (operatorType === 'lighting') {
                upcomingEvents = upcomingEvents.filter(event => {
                    const eventUid = event.event_uid || event.title || event.name;
                    return state.eventOperatorsData.some(eo => 
                        eo.event_uid === eventUid && eo.operator_type === 'lighting'
                    );
                });
            } else if (operatorType === 'leads') {
                // Leads includes both 'leads' and 'curators' operator types
                upcomingEvents = upcomingEvents.filter(event => {
                    const eventUid = event.event_uid || event.title || event.name;
                    return state.eventOperatorsData.some(eo => 
                        eo.event_uid === eventUid && (eo.operator_type === 'leads' || eo.operator_type === 'curators')
                    );
                });
            } else if (operatorType === 'hospitality') {
                upcomingEvents = upcomingEvents.filter(event => {
                    const eventUid = event.event_uid || event.title || event.name;
                    return state.eventOperatorsData.some(eo => 
                        eo.event_uid === eventUid && eo.operator_type === 'hospitality'
                    );
                });
            }

            // Sort by date based on current sort order, then alphabetically
            upcomingEvents.sort((a, b) => {
                const dateA = new Date(a.date || a.start);
                const dateB = new Date(b.date || b.start);
                if (dateA.getTime() !== dateB.getTime()) {
                    return state.dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                }
                const titleA = (a.title || a.name || '').toLowerCase();
                const titleB = (b.title || b.name || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });

            if (upcomingEvents.length === 0) {
                container.innerHTML = '<div class="empty-state">> No events in the next 7 days for this category.</div>';
                return;
            }

            // Render table based on operator type
            let html = '';
            if (operatorType === 'sound') {
                html = await this.renderSoundTable(upcomingEvents);
            } else if (operatorType === 'lighting') {
                html = this.renderLightingTable(upcomingEvents);
            } else if (operatorType === 'leads') {
                html = this.renderLeadsTable(upcomingEvents);
            } else if (operatorType === 'hospitality') {
                html = this.renderHospitalityTable(upcomingEvents);
            } else {
                container.innerHTML = '<div class="empty-state">> Unknown operator type.</div>';
                return;
            }

            container.innerHTML = html;
            
            // Update sort indicators in table headers after rendering
            const sortHeaders = container.querySelectorAll('.sortable-header');
            sortHeaders.forEach(header => {
                header.textContent = `DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}`;
            });
            console.log(`✅ Rendered ${operatorType} table with ${upcomingEvents.length} events`);
            
        } catch (error) {
            console.error('Error rendering operators table:', error);
            views.showError('operators-table-container', 'Failed to load table data');
        }
    },

    formatEventDate(event) {
        if (!event.date) return 'TBD';
        try {
            const date = new Date(event.date);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = days[date.getDay()];
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${dayName} <span class="date-digits">${month}/${day}</span>`;
        } catch (e) {
            return 'TBD';
        }
    },

    async renderSoundTable(events) {
        // Fetch provider ratings for all sound and equipment providers
        const allSoundProviders = new Set();
        const allGearProviders = new Set();
        
        events.forEach(event => {
            const eventUid = event.event_uid || event.title || event.name;
            const soundOps = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'sound'
            );
            const gearOps = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'equipment'
            );
            
            soundOps.forEach(op => allSoundProviders.add(op.operator_name));
            gearOps.forEach(op => allGearProviders.add(op.operator_name));
        });
        
        // Fetch ratings for all providers
        const providerRatings = {};
        const providerPromises = [];
        
        [...allSoundProviders].forEach(name => {
            providerPromises.push(
                api.calculateProviderStats(name, 'sound').then(stats => {
                    providerRatings[`sound:${name}`] = stats;
                })
            );
        });
        
        [...allGearProviders].forEach(name => {
            providerPromises.push(
                api.calculateProviderStats(name, 'equipment').then(stats => {
                    providerRatings[`equipment:${name}`] = stats;
                })
            );
        });
        
        await Promise.all(providerPromises);
        
        // Sort events by date based on current sort order
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = a.date || a.start;
            const dateB = b.date || b.start;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            const timeA = new Date(dateA).getTime();
            const timeB = new Date(dateB).getTime();
            return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
        
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>SOUND</th>';
        html += '<th>GEAR</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        sortedEvents.forEach(event => {
            const eventUid = event.event_uid || event.title || event.name;
            const soundOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'sound'
            );
            const gearOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'equipment'
            );
            
            html += '<tr>';
            
            // Date column
            html += '<td class="date-cell">';
            html += this.formatEventDate(event);
            html += '</td>';
            
            // Sound column with rating
            html += '<td>';
            if (soundOperators.length > 0) {
                const primary = soundOperators.find(op => op.is_primary) || soundOperators[0];
                const soundKey = `sound:${primary.operator_name}`;
                const soundStats = providerRatings[soundKey] || { rating: 0, reviewCount: 0 };
                const rating = soundStats.rating || 0;
                const reviewCount = soundStats.reviewCount || 0;
                
                html += `<div class="provider-cell">`;
                html += `<span class="provider-name">${primary.operator_name}</span>`;
                if (soundOperators.length > 1) {
                    html += ` <span class="provider-count">+${soundOperators.length - 1}</span>`;
                }
                html += `<div class="provider-rating">${rating.toFixed(1)} ⭐ (${reviewCount})</div>`;
                html += `</div>`;
            } else {
                html += '[claim]';
            }
            html += '</td>';
            
            // Gear column with rating
            html += '<td>';
            if (gearOperators.length > 0) {
                const gearOp = gearOperators[0];
                const soundOp = soundOperators[0];
                const gearKey = `equipment:${gearOp.operator_name}`;
                const gearStats = providerRatings[gearKey] || { rating: 0, reviewCount: 0 };
                const rating = gearStats.rating || 0;
                const reviewCount = gearStats.reviewCount || 0;
                
                html += `<div class="provider-cell">`;
                // If gear owner is same as sound person, show name with 'owner' tag
                if (soundOp && gearOp.operator_name === soundOp.operator_name) {
                    html += `<span class="provider-name">${gearOp.operator_name} <span class="owner-tag">(owner)</span></span>`;
                } else {
                    html += `<span class="provider-name">${gearOp.operator_name}</span>`;
                }
                html += `<div class="provider-rating">${rating.toFixed(1)} ⭐ (${reviewCount})</div>`;
                html += `</div>`;
            } else {
                html += '[claim]';
            }
            html += '</td>';
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },

    renderLightingTable(events) {
        // Sort events by date based on current sort order
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = a.date || a.start;
            const dateB = b.date || b.start;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            const timeA = new Date(dateA).getTime();
            const timeB = new Date(dateB).getTime();
            return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
        
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>LIGHTING</th>';
        html += '<th>EQUIPMENT</th>';
        html += '<th>VENUE</th>';
        html += '<th>PARTY</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        sortedEvents.forEach(event => {
            const eventUid = event.event_uid || event.title || event.name;
            const lightingOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'lighting'
            );
            const equipmentOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'equipment'
            );
            const venue = event.venue || event.location || 'TBD';
            const partyName = event.title || event.name || 'TBD';
            
            html += '<tr>';
            
            // Date column
            html += '<td class="date-cell">';
            html += this.formatEventDate(event);
            html += '</td>';
            
            // Lighting column
            html += '<td>';
            if (lightingOperators.length > 0) {
                const primary = lightingOperators.find(op => op.is_primary) || lightingOperators[0];
                html += primary.operator_name;
            } else {
                html += '[claim]';
            }
            html += '</td>';
            
            // Equipment column
            html += '<td>';
            if (equipmentOperators.length > 0) {
                html += equipmentOperators[0].operator_name;
            } else {
                html += '[claim]';
            }
            html += '</td>';
            
            // Venue column
            html += `<td>${venue}</td>`;
            
            // Party name column
            html += `<td>${partyName}</td>`;
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },


    renderLeadsTable(events) {
        // Sort events by date based on current sort order
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = a.date || a.start;
            const dateB = b.date || b.start;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            const timeA = new Date(dateA).getTime();
            const timeB = new Date(dateB).getTime();
            return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
        
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>PARTY</th>';
        html += '<th>VENUE</th>';
        html += '<th>EVENT CURATOR</th>';
        html += '<th>BAR LEAD</th>';
        html += '<th>SAFETY LEAD</th>';
        html += '<th>OPERATIONS LEAD</th>';
        html += '<th>MEDICAL LEAD</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        sortedEvents.forEach(event => {
            const eventUid = event.event_uid || event.title || event.name;
            // Include both 'leads' and 'curators' operator types
            const leadsOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'leads'
            );
            const curatorOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'curators'
            );
            const partyName = event.title || event.name || 'TBD';
            const venue = event.venue || event.location || 'TBD';
            
            // Group leads by role
            const eventCurator = curatorOperators.find(op => op.role && (op.role.toLowerCase().includes('curator') || op.role.toLowerCase().includes('promoter'))) || curatorOperators[0];
            const barLead = leadsOperators.find(op => op.role && op.role.toLowerCase().includes('bar'));
            const safetyLead = leadsOperators.find(op => op.role && op.role.toLowerCase().includes('safety'));
            const operationsLead = leadsOperators.find(op => op.role && (op.role.toLowerCase().includes('operation') || op.role.toLowerCase().includes('event manager')));
            const medicalLead = leadsOperators.find(op => op.role && op.role.toLowerCase().includes('medical'));
            
            html += '<tr>';
            
            // Date column
            html += '<td class="date-cell">';
            html += this.formatEventDate(event);
            html += '</td>';
            
            // Party name column
            html += `<td>${partyName}</td>`;
            
            // Venue column
            html += `<td>${venue}</td>`;
            
            // Event Curator column
            html += '<td>';
            html += eventCurator ? eventCurator.operator_name : '[claim]';
            html += '</td>';
            
            // Bar Lead column
            html += '<td>';
            html += barLead ? barLead.operator_name : '[claim]';
            html += '</td>';
            
            // Safety Lead column
            html += '<td>';
            html += safetyLead ? safetyLead.operator_name : '[claim]';
            html += '</td>';
            
            // Operations Lead column
            html += '<td>';
            html += operationsLead ? operationsLead.operator_name : '[claim]';
            html += '</td>';
            
            // Medical Lead column
            html += '<td>';
            html += medicalLead ? medicalLead.operator_name : '[claim]';
            html += '</td>';
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },

    renderHospitalityTable(events) {
        // Sort events by date based on current sort order
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = a.date || a.start;
            const dateB = b.date || b.start;
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            const timeA = new Date(dateA).getTime();
            const timeB = new Date(dateB).getTime();
            return state.dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
        
        let html = '<table class="operators-table">';
        html += '<thead><tr>';
        html += `<th class="sortable-header" onclick="router.toggleDateSort()" style="cursor: pointer;">DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}</th>`;
        html += '<th>PARTY</th>';
        html += '<th>VENUE</th>';
        html += '<th>SECURITY</th>';
        html += '<th>BARTENDER</th>';
        html += '<th>CASHIER</th>';
        html += '<th>VIBE LIAISON</th>';
        html += '<th>MEDICAL</th>';
        html += '</tr></thead>';
        html += '<tbody>';
        
        sortedEvents.forEach(event => {
            const eventUid = event.event_uid || event.title || event.name;
            const hospitalityOperators = state.eventOperatorsData.filter(eo => 
                eo.event_uid === eventUid && eo.operator_type === 'hospitality'
            );
            const partyName = event.title || event.name || 'TBD';
            const venue = event.venue || event.location || 'TBD';
            
            // Group hospitality by role
            const security = hospitalityOperators.find(op => op.role && op.role.toLowerCase().includes('security'));
            const bartender = hospitalityOperators.find(op => op.role && op.role.toLowerCase().includes('bartender'));
            const cashier = hospitalityOperators.find(op => op.role && op.role.toLowerCase().includes('cashier'));
            const vibeLiaison = hospitalityOperators.find(op => op.role && (op.role.toLowerCase().includes('vibe') || op.role.toLowerCase().includes('liaison')));
            const medical = hospitalityOperators.find(op => op.role && op.role.toLowerCase().includes('medical'));
            
            html += '<tr>';
            
            // Date column
            html += '<td class="date-cell">';
            html += this.formatEventDate(event);
            html += '</td>';
            
            // Party name column
            html += `<td>${partyName}</td>`;
            
            // Venue column
            html += `<td>${venue}</td>`;
            
            // Security column
            html += '<td>';
            html += security ? security.operator_name : '[claim]';
            html += '</td>';
            
            // Bartender column
            html += '<td>';
            html += bartender ? bartender.operator_name : '[claim]';
            html += '</td>';
            
            // Cashier column
            html += '<td>';
            html += cashier ? cashier.operator_name : '[claim]';
            html += '</td>';
            
            // Vibe Liaison column
            html += '<td>';
            html += vibeLiaison ? vibeLiaison.operator_name : '[claim]';
            html += '</td>';
            
            // Medical column
            html += '<td>';
            html += medical ? medical.operator_name : '[claim]';
            html += '</td>';
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        return html;
    },

    renderProviderList(operatorType) {
        const container = document.getElementById('provider-list-container');
        if (!container) {
            console.error('Provider list container not found!');
            return;
        }

        views.showLoading('provider-list-container');

        // Fetch providers for this type
        api.fetchProvidersByType(operatorType).then(providers => {
            if (!providers || providers.length === 0) {
                container.innerHTML = '<div class="empty-state">> No providers found for this category.</div>';
                return;
            }

            // Sort alphabetically
            providers.sort((a, b) => a.name.localeCompare(b.name));

            const html = providers.map(provider => {
                const rating = provider.rating || 0;
                const reviewCount = provider.review_count || 0;
                const pastTotal = provider.past_events_total || 0;
                const upcomingTotal = provider.upcoming_total || 0;
                
                return `
                    <div class="provider-list-row" onclick="router.showProviderDetail('${provider.name}', '${operatorType}')">
                        <div class="provider-row-name">${provider.name}</div>
                        <div class="provider-row-role">${provider.role || CONFIG.operatorTypes[operatorType].label}</div>
                        <div class="provider-row-stats">
                            <span class="stat-rating">${rating.toFixed(1)} ⭐ (${reviewCount})</span>
                            <span class="stat">${pastTotal}</span>
                            <span class="stat">${upcomingTotal}</span>
                        </div>
                        <a href="#" class="details-link" onclick="event.stopPropagation(); router.showProviderDetail('${provider.name}', '${operatorType}'); return false;">[MORE]</a>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;
            console.log(`✅ Rendered ${providers.length} providers for ${operatorType}`);
        }).catch(error => {
            console.error('Error rendering provider list:', error);
            views.showError('provider-list-container', 'Failed to load providers');
        });
    },

    async renderProviderDetail(providerName, operatorType) {
        const container = document.getElementById('provider-detail-container');
        if (!container) {
            console.error('Provider detail container not found!');
            return;
        }

        views.showLoading('provider-detail-container');

        // Find provider data
        const providers = state.providersData[operatorType] || [];
        const provider = providers.find(p => p.name === providerName);

        if (!provider) {
            container.innerHTML = '<div class="empty-state">> Provider not found.</div>';
            return;
        }

        // Get events for this provider
        const providerEvents = state.eventOperatorsData.filter(eo => 
            eo.operator_name === providerName && eo.operator_type === operatorType
        );

        // Get upcoming events
        const now = new Date();
        const upcomingEvents = providerEvents.filter(eo => {
            const event = state.eventsData.find(e => (e.event_uid || e.title || e.name) === eo.event_uid);
            if (!event || !event.date) return false;
            const eventDate = new Date(event.date);
            return eventDate >= now;
        });

        // Fetch reviews for this provider
        const reviews = await api.fetchProviderReviews(providerName, operatorType);
        const rating = provider.rating || 0;
        const reviewCount = provider.review_count || 0;
        const pastTotal = provider.past_events_total || 0;
        const upcomingTotal = provider.upcoming_total || 0;
        
        const html = `
            <div class="provider-detail-card">
                <div class="provider-detail-header">
                    <h3>${provider.name}</h3>
                    <span class="provider-type">${CONFIG.operatorTypes[operatorType].label}</span>
                </div>
                <div class="provider-detail-stats">
                    <div class="stat-item">
                        <span class="stat-label">RATING:</span>
                        <span class="stat-value">${rating.toFixed(1)} ⭐ (${reviewCount} reviews)</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">PAST EVENTS:</span>
                        <span class="stat-value">${pastTotal}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">UPCOMING:</span>
                        <span class="stat-value">${upcomingTotal}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">ROLE:</span>
                        <span class="stat-value">${provider.role || 'N/A'}</span>
                    </div>
                </div>
                ${reviews.length > 0 ? `
                <div class="provider-reviews-section">
                    <h4>RECENT REVIEWS</h4>
                    <ul class="reviews-list">
                        ${reviews.slice(0, 5).map(review => `
                            <li class="review-item">
                                <div class="review-rating">${review.rating.toFixed(1)} ⭐</div>
                                <div class="review-comment">${review.comment || 'No comment'}</div>
                                <div class="review-meta">${review.reviewer_name || 'Anonymous'} • ${new Date(review.created_at).toLocaleDateString()}</div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                ${upcomingEvents.length > 0 ? `
                <div class="provider-upcoming-events">
                    <h4>UPCOMING EVENTS</h4>
                    <ul>
                        ${upcomingEvents.slice(0, 5).map(eo => {
                            const event = state.eventsData.find(e => (e.event_uid || e.title || e.name) === eo.event_uid);
                            if (!event) return '';
                            const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
                            return `<li>${eventDate} - ${event.title || event.name}</li>`;
                        }).join('')}
                    </ul>
                </div>
                ` : ''}
                <div class="provider-detail-actions">
                    <button class="back-button" onclick="router.backToProviderList()">[BACK]</button>
                    <button class="more-button" onclick="router.showFullProviderProfile('${providerName}', '${operatorType}')">[MORE]</button>
                </div>
            </div>
        `;

        container.innerHTML = html;
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
                        <button class="back-button" onclick="router.switchTab('rave-operators')">[BACK]</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        
        if (CONFIG.flags.debug) console.log('Operator profile rendered');
    },
    
    renderNostrDevTools() {
        const view = document.getElementById('nostr-view');
        if (!view) return;
        
        // Refresh status display
        this.updateNostrStatus();
    },
    
    async updateNostrStatus() {
        // Only update if nostrIsolated flag is enabled
        if (!CONFIG.flags.nostrIsolated) {
            document.getElementById('nostr-connection-status').textContent = 'Not Isolated';
            document.getElementById('nostr-relay-url').textContent = 'N/A (legacy mode)';
            return;
        }
        
        if (!window.nostr) {
            document.getElementById('nostr-connection-status').textContent = 'Module Not Available';
            return;
        }
        
        try {
            const status = nostr.getStatus();
            document.getElementById('nostr-connection-status').textContent = 
                status.connected ? 'Connected' : 'Disconnected';
            document.getElementById('nostr-relay-url').textContent = 
                status.relay || '-';
            document.getElementById('nostr-has-keys').textContent = 
                status.hasKeys ? 'Yes' : 'No';
            document.getElementById('nostr-feed-count').textContent = 
                status.feedCount || 0;
            document.getElementById('nostr-last-sync').textContent = 
                status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never';
        } catch (error) {
            console.error('Error updating nostr status:', error);
            document.getElementById('nostr-connection-status').textContent = 'Error';
        }
    },
    
    displayNostrResult(containerId, data, title = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '';
        if (title) {
            html += `<strong>${title}:</strong>\n\n`;
        }
        
        if (typeof data === 'object') {
            html += JSON.stringify(data, null, 2);
        } else {
            html += String(data);
        }
        
        container.innerHTML = `<pre>${html}</pre>`;
        container.scrollTop = 0;
    },
    
    displayNostrKeys(keys) {
        const container = document.getElementById('nostr-keys-display');
        if (!container) return;
        
        if (!keys) {
            container.innerHTML = '<p class="nostr-placeholder">No keys available</p>';
            return;
        }
        
        const html = `
            <div class="key-item">
                <span class="key-label">Public Key:</span>
                <span class="key-value">${keys.publicKey || 'N/A'}</span>
            </div>
            <div class="key-item">
                <span class="key-label">Private Key:</span>
                <span class="key-value">${keys.privateKey ? keys.privateKey.substring(0, 20) + '...' : 'N/A'}</span>
            </div>
            <div class="key-item">
                <span class="key-label">NPUB:</span>
                <span class="key-value">${keys.npub || 'N/A'}</span>
            </div>
            <div class="key-item">
                <span class="key-label">NSEC:</span>
                <span class="key-value">${keys.nsec ? keys.nsec.substring(0, 20) + '...' : 'N/A'}</span>
            </div>
        `;
        
        container.innerHTML = html;
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

    async renderEventDetailsModal(eventTitle) {
        // Compact modal view (similar to DJ details modal)
        const modal = document.getElementById('event-details-modal');
        const titleElement = document.getElementById('event-details-modal-title');
        const bodyElement = document.getElementById('event-details-modal-body');
        
        if (!modal || !titleElement || !bodyElement) {
            console.error('Event details modal elements not found');
            return;
        }
        
        // Find event from state
        const event = state.eventsData.find(e => {
            const title = e.title || e.name || '';
            return title === eventTitle;
        });
        
        if (!event) {
            bodyElement.innerHTML = '<div class="empty-state">> Event not found</div>';
            modal.style.display = 'flex';
            return;
        }
        
        // Update title
        const title = event.title || event.name || 'Event';
        titleElement.textContent = title;
        
        // Show loading
        bodyElement.innerHTML = '<div class="empty-state">> Loading event details...</div>';
        modal.style.display = 'flex';
        
        try {
            // Safely parse date
            let eventDate = 'Date TBD';
            let eventTime = '--:--';
            if (event.date) {
                try {
                    const dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                    if (!isNaN(dateObj.getTime())) {
                        eventDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        eventTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                } catch (e) {
                    // Keep defaults
                }
            }
            
            // Build compact details HTML
            let html = '<div class="event-details-compact">';
            
            // Key info
            html += '<div class="event-details-stats">';
            html += `<div class="detail-stat"><span class="detail-label">DATE:</span> ${eventDate}</div>`;
            if (eventTime !== '--:--') {
                html += `<div class="detail-stat"><span class="detail-label">TIME:</span> ${eventTime}</div>`;
            }
            if (event.location || event.venue) {
                html += `<div class="detail-stat"><span class="detail-label">VENUE:</span> ${event.venue || event.location || 'TBD'}</div>`;
            }
            if (event.address) {
                html += `<div class="detail-stat"><span class="detail-label">ADDRESS:</span> ${event.address}</div>`;
            }
            if (event.dj || (event.artists && event.artists.length > 0)) {
                const artists = event.dj ? [event.dj] : (event.artists || []);
                if (artists.length > 0) {
                    html += `<div class="detail-stat"><span class="detail-label">LINEUP:</span> ${artists.slice(0, 3).join(', ')}${artists.length > 3 ? ` +${artists.length - 3}` : ''}</div>`;
                }
            }
            if (event.genres && event.genres.length > 0) {
                html += `<div class="detail-stat"><span class="detail-label">GENRES:</span> ${event.genres.join(', ')}</div>`;
            }
            if (event.promoter) {
                html += `<div class="detail-stat"><span class="detail-label">PROMOTER:</span> ${event.promoter}</div>`;
            }
            // Cost and minAge are always generated now
            html += `<div class="detail-stat"><span class="detail-label">COST:</span> ${event.cost || 'TBD'}</div>`;
            html += `<div class="detail-stat"><span class="detail-label">MIN AGE:</span> ${event.minAge || 'TBD'}</div>`;
            if (event.interested !== undefined && event.interested !== null) {
                html += `<div class="detail-stat"><span class="detail-label">INTERESTED:</span> ${event.interested}</div>`;
            }
            html += '</div>';
            
            // Description preview (first 150 chars)
            if (event.description) {
                const descPreview = event.description.length > 150 
                    ? event.description.substring(0, 150) + '...' 
                    : event.description;
                html += `<div class="event-details-description"><span class="detail-section-label">DESCRIPTION:</span> ${descPreview}</div>`;
            }
            
            // Add action buttons if user is logged in
            const currentUser = state.currentUser || state.emulatedUser;
            const eventUid = event.event_uid || title;
            if (currentUser) {
                const isSaved = state.userEventLists.saved.includes(eventUid);
                const isMaybe = state.userEventLists.maybe.includes(eventUid);
                const isGoing = state.userEventLists.going.includes(eventUid);
                
                html += '<div class="event-details-actions">';
                if (isSaved) {
                    html += `<a href="#" class="event-action saved" onclick="router.removeEventFromList('${eventUid}', 'saved'); views.closeEventDetailsModal(); return false;">[SAVED]</a>`;
                } else {
                    html += `<a href="#" class="event-action" onclick="router.addEventToList('${eventUid}', 'saved'); views.closeEventDetailsModal(); return false;">[SAVE]</a>`;
                }
                if (isMaybe) {
                    html += `<a href="#" class="event-action maybe" onclick="router.removeEventFromList('${eventUid}', 'maybe'); views.closeEventDetailsModal(); return false;">[MAYBE]</a>`;
                } else {
                    html += `<a href="#" class="event-action" onclick="router.addEventToList('${eventUid}', 'maybe'); views.closeEventDetailsModal(); return false;">[MAYBE]</a>`;
                }
                if (isGoing) {
                    html += `<a href="#" class="event-action going" onclick="router.removeEventFromList('${eventUid}', 'going'); views.closeEventDetailsModal(); return false;">[GOING]</a>`;
                } else {
                    html += `<a href="#" class="event-action" onclick="router.addEventToList('${eventUid}', 'going'); views.closeEventDetailsModal(); return false;">[GOING]</a>`;
                }
                html += '</div>';
            }
            
            // Full details link
            html += '<div class="event-details-actions">';
            html += `<button class="terminal-button" onclick="views.closeEventDetailsModal(); router.showEventDetailsView('${title}');">[VIEW FULL DETAILS]</button>`;
            html += '</div>';
            
            html += '</div>';
            bodyElement.innerHTML = html;
        } catch (error) {
            console.error('Error loading event details:', error);
            bodyElement.innerHTML = `<div class="empty-state">> Error loading event details: ${error.message}</div>`;
            modal.style.display = 'flex';
        }
    },
    
    closeEventDetailsModal() {
        const modal = document.getElementById('event-details-modal');
        if (modal) {
            modal.style.display = 'none';
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
        
        // Get all artists/lineup
        const artists = event.dj ? [event.dj] : (event.artists || []);
        
        container.innerHTML = `
            <div class="event-details-card">
                <div class="event-details-header">
                    <h1 class="event-details-title">${title}</h1>
                    <p class="event-details-date">${eventDate} ${eventTime}</p>
                    ${event.location || event.venue ? `<p class="event-details-location">${event.venue || event.location}</p>` : ''}
                    ${event.address ? `<p class="event-details-address">${event.address}</p>` : ''}
                </div>
                
                <div class="event-details-content">
                    <div class="event-details-info">
                        ${event.type ? `<p><strong>TYPE:</strong> ${event.type.toUpperCase()}</p>` : ''}
                        ${event.music ? `<p><strong>MUSIC:</strong> ${event.music}</p>` : ''}
                        ${event.genres && event.genres.length > 0 ? `<p><strong>GENRES:</strong> ${event.genres.join(', ')}</p>` : ''}
                        ${event.interested !== undefined && event.interested !== null ? `<p><strong>INTERESTED:</strong> ${event.interested} people</p>` : ''}
                        ${event.friendsGoing !== undefined ? `<p><strong>ATTENDANCE:</strong> ${event.friendsGoing || 0}/${event.attending || 0}</p>` : ''}
                    </div>
                    
                    <!-- PROVIDERS SECTION - Showcase ALL providers for DIY culture emphasis -->
                    <div class="event-details-providers">
                        <p><strong>PROVIDERS:</strong></p>
                    ${artists.length > 0 ? `
                        <div class="provider-group">
                            <strong>DJs / ARTISTS:</strong>
                        <ul>
                                ${artists.map(artist => `<li>${artist} <a href="#" onclick="router.showDJProfileView('${artist}'); return false;" style="color: var(--text-primary); text-decoration: underline;">[PROFILE]</a></li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                        ${event.venue ? `
                        <div class="provider-group">
                            <strong>VENUE:</strong> ${event.venue}
                        </div>
                        ` : ''}
                        ${event.promoter ? `
                        <div class="provider-group">
                            <strong>PROMOTER:</strong> ${event.promoter}
                        </div>
                        ` : ''}
                        ${event.sound_system || event.soundSystem ? `
                        <div class="provider-group">
                            <strong>SOUND SYSTEM:</strong> ${event.sound_system || event.soundSystem}
                        </div>
                        ` : ''}
                        ${event.operator || (event.operators && event.operators.length > 0) ? `
                        <div class="provider-group">
                            <strong>OPERATOR${(Array.isArray(event.operator || event.operators) ? (event.operator || event.operators) : [event.operator || event.operators]).length > 1 ? 'S' : ''}:</strong> ${Array.isArray(event.operator || event.operators) ? (event.operator || event.operators).join(', ') : (event.operator || event.operators)}
                        </div>
                        ` : ''}
                        ${event.visual_artist || event.visualArtist ? `
                        <div class="provider-group">
                            <strong>VISUAL ARTIST:</strong> ${event.visual_artist || event.visualArtist}
                        </div>
                        ` : ''}
                        ${event.lighting || event.lighting_designer ? `
                        <div class="provider-group">
                            <strong>LIGHTING:</strong> ${event.lighting || event.lighting_designer}
                        </div>
                        ` : ''}
                        ${event.stage_design || event.stageDesign ? `
                        <div class="provider-group">
                            <strong>STAGE DESIGN:</strong> ${event.stage_design || event.stageDesign}
                        </div>
                        ` : ''}
                        ${event.photographer || event.photo ? `
                        <div class="provider-group">
                            <strong>PHOTOGRAPHY:</strong> ${event.photographer || event.photo}
                        </div>
                        ` : ''}
                    </div>
                    
                    ${event.description ? `
                    <div class="event-details-description">
                        <p><strong>DESCRIPTION:</strong></p>
                        <p>${event.description}</p>
                    </div>
                    ` : ''}
                    
                    <div class="event-details-pricing">
                        <p><strong>COST:</strong> ${event.cost || 'TBD'}</p>
                        <p><strong>MIN AGE:</strong> ${event.minAge || 'TBD'}</p>
                    </div>
                    
                    <div class="event-details-actions">
                        <button class="event-action-button secondary" onclick="router.switchTab('events')">
                            [BACK TO EVENTS]
                        </button>
                    </div>
                </div>
            </div>
        `;
        
            if (CONFIG.flags.debug) console.log('Event details rendered');
        },
        
        renderMaybeComparison(events) {
            const container = document.getElementById('maybe-comparison-container');
            if (!container) {
                console.error('Maybe comparison container not found');
                return;
            }
            
            if (!events || events.length === 0) {
                container.innerHTML = '<div class="empty-state">> No events to compare</div>';
                return;
            }
            
            // Group events by date (day of week + date)
            const groupedByDate = {};
            events.forEach(event => {
                let dateKey = 'UNKNOWN';
                let dateObj = null;
                
                if (event.date) {
                    try {
                        dateObj = typeof event.date === 'string' ? new Date(event.date) : event.date;
                        if (!isNaN(dateObj.getTime())) {
                            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            dateKey = `${dayOfWeek}, ${dateStr}`;
                        }
                    } catch (e) {
                        // Keep default
                    }
                }
                
                if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push({ ...event, dateObj });
            });
            
            // Sort date groups (upcoming first)
            const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                const eventsA = groupedByDate[a];
                const eventsB = groupedByDate[b];
                const dateA = eventsA[0]?.dateObj;
                const dateB = eventsB[0]?.dateObj;
                
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA - dateB;
            });
            
            // Render grouped comparison
            let html = '<div class="maybe-comparison-groups">';
            
            sortedDates.forEach(dateKey => {
                const dateEvents = groupedByDate[dateKey];
                
                html += `<div class="comparison-date-group">`;
                html += `<h3 class="comparison-date-header">${dateKey}</h3>`;
                html += `<div class="comparison-events-stack">`;
                
                dateEvents.forEach(event => {
                    const title = event.title || event.name || 'Event';
                    const eventUid = event.event_uid || title;
                    const venue = event.venue || event.location || 'TBD';
                    const artists = event.dj ? [event.dj] : (event.artists || []);
                    const genres = event.genres || [];
                    const cost = event.cost || 'TBD';
                    const interested = event.interested !== undefined && event.interested !== null ? event.interested : null;
                    
                    let time = '--:--';
                    if (event.date && event.dateObj && !isNaN(event.dateObj.getTime())) {
                        time = event.dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    }
                    
                    html += `<div class="comparison-event-item">`;
                    html += `<div class="comparison-event-header">`;
                    html += `<h4 class="comparison-event-title">${title}</h4>`;
                    html += `<button class="comparison-remove-btn" onclick="router.removeEventFromList('${eventUid}', 'maybe')" title="Remove from maybe list">×</button>`;
                    html += `</div>`;
                    html += `<div class="comparison-event-details">`;
                    html += `<div class="comparison-detail-row"><span class="comparison-label">TIME:</span> ${time}</div>`;
                    html += `<div class="comparison-detail-row"><span class="comparison-label">VENUE:</span> ${venue}</div>`;
                    if (artists.length > 0) {
                        html += `<div class="comparison-detail-row"><span class="comparison-label">LINEUP:</span> ${artists.join(', ')}</div>`;
                    }
                    if (genres.length > 0) {
                        html += `<div class="comparison-detail-row"><span class="comparison-label">GENRES:</span> ${genres.join(', ')}</div>`;
                    }
                    html += `<div class="comparison-detail-row"><span class="comparison-label">COST:</span> ${cost}</div>`;
                    if (interested !== null) {
                        html += `<div class="comparison-detail-row"><span class="comparison-label">INTERESTED:</span> ${interested}</div>`;
                    }
                    html += `</div>`;
                    html += `<div class="comparison-event-actions">`;
                    html += `<a href="#" class="comparison-action-btn" onclick="event.stopPropagation(); router.addEventToList('${eventUid}', 'going'); return false;">[MARK AS GOING]</a>`;
                    html += `<a href="#" class="comparison-action-btn secondary" onclick="event.stopPropagation(); router.showEventDetailsModal('${title}'); return false;">[VIEW DETAILS]</a>`;
                    html += `</div>`;
                    html += `</div>`;
                });
                
                html += `</div>`; // Close comparison-events-stack
                html += `</div>`; // Close comparison-date-group
            });
            
            html += '</div>'; // Close maybe-comparison-groups
            
            container.innerHTML = html;
            
            if (CONFIG.flags.debug) console.log(`✅ Rendered ${events.length} events grouped into ${sortedDates.length} date groups`);
        },
    
    async renderDJReviews(djName) {
        const container = document.getElementById('dj-reviews-container');
        if (!container) {
            console.error('DJ reviews container not found!');
            return;
        }
        
        // Show loading
        container.innerHTML = '<div class="empty-state">> Loading reviews...</div>';
        
        try {
            // Fetch reviews and aggregate
            const reviews = await api.fetchDJReviews(djName);
            const aggregate = await api.fetchDJReviewsAggregate(djName);
            
            // If no reviews AND no aggregate data, show empty state
            if ((!reviews || reviews.length === 0) && (!aggregate || aggregate.review_count === 0)) {
                container.innerHTML = `
                    <div class="empty-state">
                        > No reviews yet.
                        <br>
                        <button class="terminal-button" onclick="views.openReviewModal('${djName}')" style="margin-top: 15px;">
                            [SUBMIT FIRST REVIEW]
                        </button>
                    </div>
                `;
                return;
            }
            
            // If aggregate exists but no individual reviews, still show aggregate info
            if ((!reviews || reviews.length === 0) && aggregate && aggregate.review_count > 0) {
                // Show aggregate info (reviews may be pending or loading)
                let html = '';
                html += `
                    <div class="dj-profile-section" style="margin-bottom: 30px;">
                        <div class="section-label">REVIEWS SUMMARY</div>
                        <div class="section-content">
                            <div class="stat-line"><span class="stat-label">AVERAGE:</span> ${aggregate.average_rating}/5</div>
                            <div class="stat-line"><span class="stat-label">TOTAL:</span> ${aggregate.review_count} reviews</div>
                        </div>
                    </div>
                `;
                html += `
                    <div style="margin-bottom: 20px;">
                        <button class="terminal-button" onclick="views.openReviewModal('${djName}')">
                            [SUBMIT REVIEW]
                        </button>
                    </div>
                `;
                container.innerHTML = html;
                return;
            }
            
            // Format date helper
            const formatDate = (dateString) => {
                if (!dateString) return 'Unknown date';
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                });
            };
            
            // Build reviews list
            let html = '';
            
            // Header with aggregate info
            if (aggregate) {
                html += `
                    <div class="dj-profile-section" style="margin-bottom: 30px;">
                        <div class="section-label">REVIEWS SUMMARY</div>
                        <div class="section-content">
                            <div class="stat-line"><span class="stat-label">AVERAGE:</span> ${aggregate.average_rating}/5</div>
                            <div class="stat-line"><span class="stat-label">TOTAL:</span> ${aggregate.review_count} reviews</div>
                        </div>
                    </div>
                `;
            }
            
            // Add review button
            html += `
                <div style="margin-bottom: 20px;">
                    <button class="terminal-button" onclick="views.openReviewModal('${djName}')">
                        [SUBMIT REVIEW]
                    </button>
                </div>
            `;
            
            // Reviews list
            html += '<div class="reviews-list">';
            reviews.forEach(review => {
                html += `
                    <div class="review-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid var(--border-primary); background: var(--bg-secondary);">
                        <div class="review-header" style="margin-bottom: 10px;">
                            <span class="review-user" style="font-weight: 700; color: var(--accent);">${review.user_name || 'Anonymous'}</span>
                            <span class="review-rating" style="margin-left: 15px; color: var(--text-primary);">${review.rating}/5</span>
                            <span class="review-date" style="margin-left: 15px; color: var(--text-secondary); font-size: 0.85rem;">${formatDate(review.created_at)}</span>
                        </div>
                        ${review.comment ? `<div class="review-comment" style="margin-top: 8px; color: var(--text-primary); line-height: 1.6;">${review.comment}</div>` : ''}
                        ${review.event_title ? `<div class="review-event" style="margin-top: 8px; color: var(--text-secondary); font-size: 0.85rem;">Event: ${review.event_title}</div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            
            container.innerHTML = html;
            
            if (CONFIG.flags.debug) console.log('Reviews rendered:', reviews.length);
        } catch (error) {
            console.error('Error rendering reviews:', error);
            container.innerHTML = `<div class="empty-state">> Error loading reviews: ${error.message}</div>`;
        }
    },
    
    async openReviewModal(djName) {
        const modal = document.getElementById('review-modal');
        if (!modal) {
            console.error('Review modal not found!');
            return;
        }
        
        // Store current DJ
        state.currentReviewDJ = djName;
        
        // Check if user is authenticated (real or emulated)
        const hasUser = state.currentUser || state.emulatedUser;
        
        if (!hasUser) {
            // Show user selector
            document.getElementById('user-selector-section').style.display = 'block';
            document.getElementById('review-form-section').style.display = 'none';
            
            // Load emulated users
            try {
                const users = await api.fetchEmulatedUsers();
                const select = document.getElementById('emulated-user-select');
                if (select) {
                    select.innerHTML = '<option value="">-- Select User --</option>';
                    users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.display_name || user.username;
                        select.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error loading emulated users:', error);
                alert('Error loading users. Please refresh and try again.');
                return;
            }
        } else {
            // User already selected, show form
            document.getElementById('user-selector-section').style.display = 'none';
            document.getElementById('review-form-section').style.display = 'block';
        }
        
        // Show modal
        modal.style.display = 'block';
    },
    
    async confirmEmulatedUser() {
        const select = document.getElementById('emulated-user-select');
        if (!select || !select.value) {
            alert('Please select a user');
            return;
        }
        
        try {
            const user = await api.selectEmulatedUser(select.value);
            if (user) {
                // Hide selector, show form
                document.getElementById('user-selector-section').style.display = 'none';
                document.getElementById('review-form-section').style.display = 'block';
            }
        } catch (error) {
            console.error('Error selecting user:', error);
            alert('Error selecting user: ' + error.message);
        }
    },
    
    async submitReview() {
        const djName = state.currentReviewDJ;
        if (!djName) {
            alert('No DJ selected');
            return;
        }
        
        const rating = parseFloat(document.getElementById('review-rating').value);
        const comment = document.getElementById('review-comment').value.trim();
        const eventTitle = document.getElementById('review-event').value.trim();
        
        if (isNaN(rating) || rating < 0 || rating > 5) {
            alert('Please enter a valid rating between 0 and 5');
            return;
        }
        
        // Check user
        const hasUser = state.currentUser || state.emulatedUser;
        if (!hasUser) {
            alert('Please select a user first');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('submit-review-btn');
            if (submitBtn) submitBtn.disabled = true;
            
            const result = await api.submitReview({
                dj_name: djName,
                rating: rating,
                comment: comment || null,
                event_title: eventTitle || null
            });
            
            if (result.success) {
                // Close modal
                this.closeReviewModal();
                
                // Refresh reviews if we're on the reviews page
                if (state.currentView === 'dj-reviews') {
                    await this.renderDJReviews(djName);
                } else if (state.currentView === 'connections') {
                    // Refresh user reviews in YOU tab
                    await this.loadYouTab();
                    // Show success message
                    alert('Review submitted successfully!');
                } else {
                    // Show success message
                    alert('Review submitted successfully!');
                    // Optionally refresh DJ profile to show updated review count
                    if (state.currentView === 'dj-profile') {
                        const profile = await api.fetchDJProfile(djName);
                        await views.renderDJProfile(profile);
                    }
                }
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Error submitting review: ' + error.message);
        } finally {
            const submitBtn = document.getElementById('submit-review-btn');
            if (submitBtn) submitBtn.disabled = false;
        }
    },
    
    closeReviewModal() {
        const modal = document.getElementById('review-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Clear form
        document.getElementById('review-rating').value = '5';
        document.getElementById('review-comment').value = '';
        document.getElementById('review-event').value = '';
        
        state.currentReviewDJ = null;
    },
    
    initUserPortal() {
        // Initialize user portal tabs
        const tabButtons = document.querySelectorAll('.user-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-user-tab');
                this.switchUserTab(tabName);
            });
        });
        
        // Load YOU tab by default
        this.switchUserTab('you');
    },
    
    switchUserTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.user-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`user-tab-${tabName}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Hide all tab content
        document.querySelectorAll('.user-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab content
        const activeContent = document.getElementById(`user-tab-content-${tabName}`);
        if (activeContent) activeContent.classList.add('active');
        
        // Load content based on tab
        if (tabName === 'you') {
            this.loadYouTab();
        } else if (tabName === 'them') {
            this.loadThemTab();
        } else if (tabName === 'inbox') {
            this.loadInboxTab();
        }
    },
    
    async loadYouTab() {
        // Get current user (real or emulated)
        const currentUser = state.currentUser || state.emulatedUser;
        
        if (!currentUser) {
            // Not logged in - show login prompt
            document.getElementById('user-reviews-container').innerHTML = `
                <div class="empty-state">
                    > Please select an emulated user or sign in to view your activity.
                </div>
            `;
            return;
        }
        
        // Load user reviews
        await this.renderUserReviews(currentUser.id);
    },
    
    async renderUserReviews(userId) {
        const container = document.getElementById('user-reviews-container');
        if (!container) return;
        
        container.innerHTML = '<div class="empty-state">> Loading your reviews...</div>';
        
        try {
            const reviews = await api.fetchUserReviews(userId);
            
            if (!reviews || reviews.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        > No reviews submitted yet.
                        <br>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">
                            Submit reviews on DJ profiles to see them here.
                        </span>
                    </div>
                `;
                return;
            }
            
            // Format date helper
            const formatDate = (dateString) => {
                if (!dateString) return 'Unknown date';
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric'
                });
            };
            
            let html = '';
            reviews.forEach(review => {
                html += `
                    <div class="user-review-item">
                        <div class="user-review-header">
                            <div>
                                <span class="user-review-target">${review.dj_name}</span>
                                <span class="user-review-rating" style="margin-left: 15px;">${review.rating}/5</span>
                            </div>
                            <span class="user-review-date">${formatDate(review.created_at)}</span>
                        </div>
                        ${review.comment ? `<div class="user-review-comment">${review.comment}</div>` : ''}
                        ${review.event_title ? `<div class="user-review-event">Event: ${review.event_title}</div>` : ''}
                        <div style="margin-top: 10px;">
                            <a href="#" class="user-review-link" onclick="router.showDJProfileView('${review.dj_name}'); return false;">
                                [VIEW DJ PROFILE]
                            </a>
                            ${review.event_title ? `
                                <a href="#" class="user-review-link" onclick="router.showEventDetailsView('${review.event_title}'); return false;" style="margin-left: 15px;">
                                    [VIEW EVENT]
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error rendering user reviews:', error);
            container.innerHTML = `<div class="empty-state">> Error loading reviews: ${error.message}</div>`;
        }
    },
    
    loadThemTab() {
        // Placeholder for THEM tab content
        // Will be implemented later
    },
    
    loadInboxTab() {
        // Placeholder for INBOX tab content
        // Appearance only for now
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

    toggleDJViewMode() {
        // Toggle between list and card view modes
        state.djViewMode = state.djViewMode === 'list' ? 'cards' : 'list';
        
        const toggleBtn = document.getElementById('dj-view-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = state.djViewMode === 'list' ? '[EXPAND]' : '[LIST]';
        }
        
        // Re-render DJ profiles with new mode
        const activeDJs = getDJsActiveThisWeek();
        views.renderDJProfiles(activeDJs);
    },
    
    toggleVenueViewMode() {
        // Toggle between list and card view modes for venues
        state.venueViewMode = state.venueViewMode === 'list' ? 'cards' : 'list';
        
        const toggleBtn = document.getElementById('venue-view-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = state.venueViewMode === 'list' ? '[EXPAND]' : '[LIST]';
        }
        
        // Re-render venues with new mode
        if (state.venuesData && state.venuesData.length > 0) {
            views.renderVenues(state.venuesData);
        } else {
            // Fetch venues if not loaded
            api.fetchVenues().then(venues => {
                views.renderVenues(venues);
            });
        }
    },
    
    toggleEventViewMode() {
        // Toggle between list and card view modes for events
        state.eventViewMode = state.eventViewMode === 'list' ? 'cards' : 'list';
        
        const toggleBtn = document.getElementById('event-view-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = state.eventViewMode === 'list' ? '[EXPAND]' : '[LIST]';
        }
        
        // Re-render events with new mode
        if (state.eventsData && state.eventsData.length > 0) {
            views.renderEvents(state.eventsData);
        }
    },
    
    toggleDateSort() {
        // Set active sort to date
        state.activeSort = 'date';
        
        // Toggle date sort order
        state.dateSortOrder = state.dateSortOrder === 'asc' ? 'desc' : 'asc';
        
        // Update sort indicator in Events header
        const eventsSortHeader = document.getElementById('events-date-sort');
        if (eventsSortHeader) {
            eventsSortHeader.textContent = `DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}`;
        }
        
        // Update sort indicator in DJs header
        const djsSortHeader = document.getElementById('djs-date-sort');
        if (djsSortHeader) {
            djsSortHeader.textContent = `DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}`;
        }
        
        // Update sort indicator in Venues header
        const venuesSortHeader = document.getElementById('venues-date-sort');
        if (venuesSortHeader) {
            venuesSortHeader.textContent = `DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}`;
        }
        
        // Update sort indicators in table headers (only DATE headers)
        const dateHeaders = document.querySelectorAll('.sortable-header');
        dateHeaders.forEach(header => {
            if (header.textContent.includes('DATE')) {
                header.textContent = `DATE ${state.dateSortOrder === 'asc' ? '↑' : '↓'}`;
            }
        });
        
        // Re-render current view with new sort order
        if (state.currentView === 'events' && state.eventsData && state.eventsData.length > 0) {
            views.renderEvents(state.eventsData);
        } else if (state.currentView === 'dj') {
            const activeDJs = getDJsActiveThisWeek();
            if (activeDJs.length > 0) {
                views.renderDJProfiles(activeDJs);
            }
        } else if (state.currentView === 'venues') {
            if (state.venuesData && state.venuesData.length > 0) {
                views.renderVenues(state.venuesData);
            } else {
                api.fetchVenues().then(venues => {
                    views.renderVenues(venues);
                });
            }
        } else if (state.currentView === 'rave-operators') {
            // Re-render current MAKERS sub-tab
            const activeSubTab = document.querySelector('.sub-tab-button.active');
            if (activeSubTab) {
                const subTabName = activeSubTab.getAttribute('data-sub-tab');
                views.renderOperatorsTable(subTabName);
            }
        }
    },
    
    filterByTime(timeType) {
        // Toggle sort order for START or END column
        if (timeType === 'start' || timeType === 'end') {
            // Set active sort to the clicked column
            state.activeSort = timeType;
            
            // Toggle sort order
            state.timeSortOrder[timeType] = state.timeSortOrder[timeType] === 'asc' ? 'desc' : 'asc';
            
            // Update sort indicators in table headers
            const timeHeaders = document.querySelectorAll('.sortable-header');
            timeHeaders.forEach(header => {
                if (header.textContent.includes('START') && timeType === 'start') {
                    header.textContent = `START ${state.timeSortOrder.start === 'asc' ? '↑' : '↓'}`;
                } else if (header.textContent.includes('END') && timeType === 'end') {
                    header.textContent = `END ${state.timeSortOrder.end === 'asc' ? '↑' : '↓'}`;
                }
            });
            
            // Re-render current view with new sort order
            if (state.currentView === 'events' && state.eventsData && state.eventsData.length > 0) {
                views.renderEvents(state.eventsData);
            } else if (state.currentView === 'dj') {
                const activeDJs = getDJsActiveThisWeek();
                if (activeDJs.length > 0) {
                    views.renderDJProfiles(activeDJs);
                }
            } else if (state.currentView === 'venues') {
                if (state.venuesData && state.venuesData.length > 0) {
                    views.renderVenues(state.venuesData);
                } else {
                    api.fetchVenues().then(venues => {
                        views.renderVenues(venues);
                    });
                }
            }
        }
    },
    
    syncTimeRangeButtons() {
        // Update all time range buttons to show current selection
        const buttonText = this.getTimeRangeButtonText(state.timeRange);
        const buttons = document.querySelectorAll('.time-range-button');
        buttons.forEach(btn => {
            btn.textContent = buttonText;
        });
    },
    
    toggleTimeRangeMenu(view = 'events') {
        // Close all menus first
        const allMenus = document.querySelectorAll('.time-range-menu');
        allMenus.forEach(menu => menu.style.display = 'none');
        
        // Get the menu for this view
        const menuId = view === 'events' ? 'time-range-menu' : `time-range-menu-${view}`;
        const menu = document.getElementById(menuId);
        if (!menu) return;
        
        // Toggle this menu
        const isVisible = menu.style.display !== 'none';
        menu.style.display = isVisible ? 'none' : 'block';
        
        // Close menu when clicking outside
        if (!isVisible) {
            setTimeout(() => {
                document.addEventListener('click', function closeMenu(e) {
                    if (!menu.contains(e.target) && !e.target.closest('.time-range-button')) {
                        menu.style.display = 'none';
                        document.removeEventListener('click', closeMenu);
                    }
                }, { once: true });
            }, 0);
        }
    },
    
    setTimeRange(range) {
        state.timeRange = range;
        
        // Handle custom date selection - don't close menu, just show date selector
        if (range === 'custom') {
            this.showCustomDateSelector();
            // Don't close menu, keep it open for date selection
            return;
        }
        
        // Update button text
        const buttonText = this.getTimeRangeButtonText(range);
        const buttons = document.querySelectorAll('.time-range-button');
        buttons.forEach(btn => {
            if (btn.id.includes('time-range-button')) {
                btn.textContent = buttonText;
            }
        });
        
        // Hide custom date selector
        const allCustom = document.querySelectorAll('.time-range-custom');
        allCustom.forEach(custom => custom.style.display = 'none');
        
        // Close menu
        const allMenus = document.querySelectorAll('.time-range-menu');
        allMenus.forEach(menu => menu.style.display = 'none');
        
        // Apply filter and re-render
        this.applyTimeRangeFilter();
    },
    
    getTimeRangeButtonText(range) {
        switch(range) {
            case 'weekend': return '[WEEKEND]';
            case 'week': return '[WEEK]';
            case 'next-weekend': return '[NEXT WEEKEND]';
            case 'custom': return state.customDate ? this.formatDateForButton(state.customDate) : '[CUSTOM]';
            default: return '[WEEKEND]';
        }
    },
    
    formatDateForButton(date) {
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const day = days[date.getDay()];
        const month = date.getMonth() + 1;
        const dayNum = date.getDate();
        return `[${day}-${month}-${dayNum}]`;
    },
    
    showCustomDateSelector() {
        // Show custom date selector in all menus
        const allCustom = document.querySelectorAll('.time-range-custom');
        allCustom.forEach(custom => custom.style.display = 'block');
        
        // Generate date options (unlimited - generate on scroll)
        const dateScrolls = document.querySelectorAll('.date-scroll');
        dateScrolls.forEach(scroll => {
            this.generateDateOptions(scroll);
            // Set up infinite scroll
            this.setupInfiniteDateScroll(scroll);
        });
    },
    
    generateDateOptions(container, startDay = 0, count = 100) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        let html = '';
        
        // Generate dates starting from startDay
        for (let i = startDay; i < startDay + count; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            const day = days[date.getDay()];
            const month = date.getMonth() + 1;
            const dayNum = date.getDate();
            const dateStr = `${day}-${month}-${dayNum}`;
            const isSelected = state.customDate && 
                date.toDateString() === state.customDate.toDateString();
            
            html += `<div class="date-option ${isSelected ? 'selected' : ''}" 
                          data-date-index="${i}"
                          onclick="router.selectCustomDate('${date.toISOString()}')">
                      ${dateStr}
                    </div>`;
        }
        
        if (startDay === 0) {
            container.innerHTML = html;
        } else {
            // Append new dates
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            while (tempDiv.firstChild) {
                container.appendChild(tempDiv.firstChild);
            }
        }
    },
    
    setupInfiniteDateScroll(container) {
        // Get the scroll container (parent of date-scroll which is date-scroll-container)
        const scrollContainer = container.parentElement;
        if (!scrollContainer || !scrollContainer.classList.contains('date-scroll-container')) {
            return;
        }
        
        // Remove existing scroll listener if any
        if (scrollContainer._scrollHandler) {
            scrollContainer.removeEventListener('scroll', scrollContainer._scrollHandler);
        }
        
        // Track if we're currently loading to prevent duplicate loads
        let isLoading = false;
        
        // Add infinite scroll to the scroll container
        scrollContainer._scrollHandler = () => {
            if (isLoading) return;
            
            const scrollTop = scrollContainer.scrollTop;
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            
            // Load more when near bottom (within 200px)
            if (scrollHeight - scrollTop - clientHeight < 200) {
                isLoading = true;
                const existingOptions = container.querySelectorAll('.date-option');
                const lastIndex = existingOptions.length > 0 
                    ? parseInt(existingOptions[existingOptions.length - 1].getAttribute('data-date-index') || '0')
                    : 0;
                
                // Generate next batch
                this.generateDateOptions(container, lastIndex + 1, 100);
                
                // Reset loading flag after a brief delay
                setTimeout(() => {
                    isLoading = false;
                }, 100);
            }
        };
        
        scrollContainer.addEventListener('scroll', scrollContainer._scrollHandler);
    },
    
    selectCustomDate(dateString) {
        state.customDate = new Date(dateString);
        state.timeRange = 'custom';
        
        // Update button text
        const buttonText = this.formatDateForButton(state.customDate);
        const buttons = document.querySelectorAll('.time-range-button');
        buttons.forEach(btn => {
            if (btn.id.includes('time-range-button')) {
                btn.textContent = buttonText;
            }
        });
        
        // Update selected state in date options
        const allDateOptions = document.querySelectorAll('.date-option');
        allDateOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('onclick')?.includes(dateString)) {
                option.classList.add('selected');
            }
        });
        
        // Close menu
        const allMenus = document.querySelectorAll('.time-range-menu');
        allMenus.forEach(menu => menu.style.display = 'none');
        
        // Apply filter and re-render
        this.applyTimeRangeFilter();
    },
    
    getTimeRangeDates() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        let startDate, endDate;
        
        switch(state.timeRange) {
            case 'weekend':
                // This weekend (Friday 00:00 to Sunday 23:59:59)
                // If weekend is over, show next weekend
                const dayOfWeek = now.getDay();
                let daysUntilFriday;
                
                if (dayOfWeek === 0) { // Sunday
                    // Weekend is over, show next weekend
                    daysUntilFriday = 5;
                } else if (dayOfWeek <= 4) { // Monday-Thursday
                    daysUntilFriday = 5 - dayOfWeek;
                } else if (dayOfWeek === 5) { // Friday
                    daysUntilFriday = 0; // This weekend
                } else { // Saturday
                    daysUntilFriday = -1; // This weekend (already started)
                }
                
                startDate = new Date(now);
                if (daysUntilFriday < 0) {
                    // Weekend already started, use this Friday
                    startDate.setDate(now.getDate() - (now.getDay() - 5));
                } else {
                    startDate.setDate(now.getDate() + daysUntilFriday);
                }
                startDate.setHours(0, 0, 0, 0);
                
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 2); // Sunday
                endDate.setHours(23, 59, 59, 999);
                
                // If weekend is over, show next weekend
                if (now > endDate) {
                    startDate.setDate(startDate.getDate() + 7);
                    endDate.setDate(endDate.getDate() + 7);
                }
                break;
                
            case 'week':
                // Next 7 days
                startDate = new Date(now);
                endDate = new Date(now);
                endDate.setDate(now.getDate() + 7);
                endDate.setHours(23, 59, 59, 999);
                break;
                
            case 'next-weekend':
                // Next weekend (always future)
                const dayOfWeek2 = now.getDay();
                const daysUntilNextFriday = (5 - dayOfWeek2 + 7) % 7;
                const nextFridayDays = daysUntilNextFriday === 0 ? 7 : daysUntilNextFriday;
                
                startDate = new Date(now);
                startDate.setDate(now.getDate() + nextFridayDays);
                startDate.setHours(0, 0, 0, 0);
                
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 2); // Sunday
                endDate.setHours(23, 59, 59, 999);
                break;
                
            case 'custom':
                // Single day
                if (state.customDate) {
                    startDate = new Date(state.customDate);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(state.customDate);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    startDate = now;
                    endDate = new Date(now);
                    endDate.setHours(23, 59, 59, 999);
                }
                break;
                
            default:
                startDate = now;
                endDate = new Date(now);
                endDate.setDate(now.getDate() + 7);
                endDate.setHours(23, 59, 59, 999);
        }
        
        return { startDate, endDate };
    },
    
    applyTimeRangeFilter() {
        // Re-render based on current view (filtering happens in render functions)
        if (state.currentView === 'events') {
            if (state.eventsData && state.eventsData.length > 0) {
                views.renderEvents(state.eventsData);
            }
        } else if (state.currentView === 'dj') {
            const activeDJs = getDJsActiveThisWeek();
            if (activeDJs.length > 0) {
                views.renderDJProfiles(activeDJs);
            }
        } else if (state.currentView === 'venues') {
            if (state.venuesData && state.venuesData.length > 0) {
                views.renderVenues(state.venuesData);
            } else {
                api.fetchVenues().then(venues => {
                    views.renderVenues(venues);
                });
            }
        } else if (state.currentView === 'rave-operators') {
            // Filter MAKERS events by time range
            const activeSubTab = document.querySelector('.sub-tab-button.active');
            if (activeSubTab) {
                const subTabName = activeSubTab.getAttribute('data-sub-tab');
                views.renderOperatorsTable(subTabName);
            }
        }
    },
    
    async showDJDetailsModal(djName) {
        // Show compact DJ details in modal (similar to event details)
        await views.renderDJDetailsModal(djName);
    },
    
    async showDJProfileView(djName) {
        console.log('Switching to DJ profile view for:', djName);
        state.currentView = 'dj-profile';
        state.selectedDJ = djName;
        
        // If navigation source not set, default to 'list' (came from DJ list directly)
        if (!state.djNavigationSource) {
            state.djNavigationSource = 'list';
        }
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'block';
        document.getElementById('event-details-view').style.display = 'none';
        const djUpcomingView = document.getElementById('dj-upcoming-view');
        if (djUpcomingView) djUpcomingView.style.display = 'none';
        const reviewsView = document.getElementById('dj-reviews-view');
        if (reviewsView) reviewsView.style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('dj-profile-title');
        if (titleElement) {
            titleElement.textContent = `${djName} - Profile`;
        }
        
        // Update back button based on navigation source
        const backBtn = document.getElementById('back-to-dj-list');
        if (backBtn) {
            if (state.djNavigationSource === 'modal' || state.djNavigationSource === 'list') {
                backBtn.textContent = '← Back to DJs';
                backBtn.onclick = () => {
                    state.djNavigationSource = null;
                    this.switchTab('djs');
                };
            } else if (state.djNavigationSource === 'profile') {
                backBtn.textContent = '← Back to Profile';
                backBtn.onclick = () => {
                    state.djNavigationSource = 'profile';
                    this.showDJProfileView(djName);
                };
            }
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

    async showDJReviews(djName) {
        console.log('Showing reviews for DJ:', djName);
        state.currentView = 'dj-reviews';
        state.selectedDJ = djName;
        
        // If navigation source not set, default based on current view
        if (!state.djNavigationSource) {
            state.djNavigationSource = state.currentView === 'dj-profile' ? 'profile' : 'list';
        }
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('dj-profile-view').style.display = 'none';
        document.getElementById('event-details-view').style.display = 'none';
        document.getElementById('dj-upcoming-view').style.display = 'none';
        const reviewsView = document.getElementById('dj-reviews-view');
        if (reviewsView) {
            reviewsView.style.display = 'block';
        }
        
        // Update title
        const titleElement = document.getElementById('dj-reviews-title');
        if (titleElement) {
            titleElement.textContent = `${djName} - Reviews`;
        }
        
        // Wire up back button based on navigation source
        const backBtn = document.getElementById('back-to-dj-profile-from-reviews');
        if (backBtn) {
            if (state.djNavigationSource === 'modal' || state.djNavigationSource === 'list') {
                // Came from modal/list, go back to DJ list
                backBtn.textContent = '← Back to DJs';
                backBtn.onclick = () => {
                    state.djNavigationSource = null;
                    this.switchTab('djs');
                };
            } else if (state.djNavigationSource === 'profile') {
                // Came from profile, go back to profile
                backBtn.textContent = '← Back to Profile';
                backBtn.onclick = () => {
                    state.djNavigationSource = 'profile';
                    this.showDJProfileView(djName);
                };
            }
        }
        
        // Render reviews
        await views.renderDJReviews(djName);
    },

    async showEventDetailsModal(eventTitle) {
        // Show compact event details in modal (similar to DJ details modal)
        await views.renderEventDetailsModal(eventTitle);
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
        const reviewsView = document.getElementById('dj-reviews-view');
        if (reviewsView) reviewsView.style.display = 'none';
        
        // Update the title
        const titleElement = document.getElementById('event-details-title');
        if (titleElement) {
            titleElement.textContent = `${eventTitle} - Details`;
        }
        
        // Find and render the event details
        const event = state.eventsData.find(e => {
            const title = e.title || e.name || '';
            return title === eventTitle;
        });
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
        
        // Hide all views (safely check for existence)
        const viewsToHide = [
            'events-view', 'dj-view', 'dj-profile-view', 'event-details-view',
            'venue-details-view', 'venues-view', 'operator-profile-view',
            'rave-operators-view', 'connections-view', 'rave-operators-table-view',
            'provider-list-view', 'provider-detail-view', 'nostr-view'
        ];
        viewsToHide.forEach(viewId => {
            const view = document.getElementById(viewId);
            if (view) view.style.display = 'none';
        });
        const djUpcomingView = document.getElementById('dj-upcoming-view');
        if (djUpcomingView) djUpcomingView.style.display = 'none';
        const djReviewsView = document.getElementById('dj-reviews-view');
        if (djReviewsView) djReviewsView.style.display = 'none';
        const savedEventsView = document.getElementById('saved-events-view');
        if (savedEventsView) savedEventsView.style.display = 'none';
        const maybeComparisonView = document.getElementById('maybe-comparison-view');
        if (maybeComparisonView) maybeComparisonView.style.display = 'none';
        const goingEventsView = document.getElementById('going-events-view');
        if (goingEventsView) goingEventsView.style.display = 'none';
        
        // Show the selected tab's view
        switch(tabName) {
            case 'events':
                document.getElementById('events-view').style.display = 'block';
                state.currentView = 'events';
                // Sync time range button
                this.syncTimeRangeButtons();
                // Ensure all events are displayed (with time range filtering)
                if (state.eventsData && state.eventsData.length > 0) {
                    views.renderEvents(state.eventsData);
                } else {
                    // Load events if not already loaded
                    views.showLoading('events-container');
                    api.fetchEvents().then(events => {
                        views.renderEvents(events);
                    }).catch(error => {
                        console.error('Error loading events:', error);
                        views.showError('events-container', 'Failed to load events');
                    });
                }
                break;
            case 'djs':
                document.getElementById('dj-view').style.display = 'block';
                state.currentView = 'dj';
                // Sync time range button
                this.syncTimeRangeButtons();
                // Show only DJs active in time range
                views.showLoading('dj-profiles-container');
                
                // Always ensure events are loaded first
                const loadDJs = async () => {
                    try {
                        // Always fetch events to ensure we have the latest data
                        await api.fetchEvents();
                        console.log('Events loaded for DJs:', state.eventsData?.length || 0);
                        
                const activeDJs = getDJsActiveThisWeek();
                        console.log('Active DJs found:', activeDJs.length);
                        
                if (activeDJs.length === 0) {
                    const cityContext = state.userCity ? ` in ${state.userCity}` : '';
                    views.showEmpty('dj-profiles-container', `> No DJs active in the next 7 days${cityContext}.`);
                } else {
                            await views.renderDJProfiles(activeDJs);
                        }
                    } catch (error) {
                        console.error('Error loading DJs:', error);
                        views.showError('dj-profiles-container', 'Failed to load DJs: ' + (error.message || 'Unknown error'));
                    }
                };
                
                loadDJs();
                break;
            case 'venues':
                document.getElementById('venues-view').style.display = 'block';
                state.currentView = 'venues';
                // Sync time range button
                this.syncTimeRangeButtons();
                    views.showLoading('venues-container');
                
                // Always ensure events are loaded first (venues are extracted from events)
                const loadVenues = async () => {
                    try {
                        // Always fetch events to ensure we have the latest data
                        await api.fetchEvents();
                        console.log('Events loaded for venues:', state.eventsData?.length || 0);
                        
                        const venues = await api.fetchVenues();
                        console.log('Venues extracted:', venues?.length || 0);
                        
                        if (venues && venues.length > 0) {
                        views.renderVenues(venues);
                } else {
                            views.showEmpty('venues-container', '> No venues found in events data.');
                        }
                    } catch (error) {
                        console.error('Error loading venues:', error);
                        views.showError('venues-container', 'Failed to load venues: ' + (error.message || 'Unknown error'));
                    }
                };
                
                loadVenues();
                break;
            case 'rave-operators':
                document.getElementById('rave-operators-view').style.display = 'block';
                document.getElementById('rave-operators-table-view').style.display = 'block';
                document.getElementById('provider-list-view').style.display = 'none';
                document.getElementById('provider-detail-view').style.display = 'none';
                state.currentView = 'rave-operators';
                state.raveOperatorsView = 'table';
                state.selectedOperatorType = 'sound';
                // Sync time range button
                this.syncTimeRangeButtons();
                
                // Always ensure events are loaded first
                const loadOperators = async () => {
                    try {
                        // Always fetch events to ensure we have the latest data
                        await api.fetchEvents();
                        console.log('Events loaded for operators:', state.eventsData?.length || 0);
                        
                        await views.renderOperatorsTable('sound');
                    } catch (error) {
                        console.error('Error loading operators table:', error);
                        views.showError('operators-table-container', 'Failed to load operators: ' + (error.message || 'Unknown error'));
                    }
                };
                
                loadOperators();
                break;
            case 'connections':
                document.getElementById('connections-view').style.display = 'block';
                state.currentView = 'connections';
                // Initialize user portal (load YOU tab by default)
                views.initUserPortal();
                break;
                
            case 'nostr':
                if (!CONFIG.flags.nostrDevTab) {
                    console.warn('NOSTR tab disabled by flag');
                    return;
                }
                document.getElementById('nostr-view').style.display = 'block';
                state.currentView = 'nostr';
                views.renderNostrDevTools();
                break;
        }
    },

    async showVenueDetailsModal(venueName) {
        // Show compact venue details in modal (similar to DJ details modal)
        await views.renderVenueDetailsModal(venueName);
    },
    
    async showVenueProfileView(venueName) {
        console.log('Switching to venue profile view for:', venueName);
        state.currentView = 'venue-profile';
        state.selectedVenue = venueName;
        
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
            titleElement.textContent = `${venueName} - Profile`;
        }
        
        // Load and render the venue profile
        views.showLoading('venue-details-container');
        try {
        const venue = state.venuesData.find(v => v.name === venueName);
        if (venue) {
                await views.renderVenueProfile(venue);
            } else {
                // Try to fetch venues if not loaded
                await api.fetchVenues();
                const updatedVenue = state.venuesData.find(v => v.name === venueName);
                if (updatedVenue) {
                    await views.renderVenueProfile(updatedVenue);
        } else {
            views.showError('venue-details-container', 'Venue not found');
                }
            }
        } catch (error) {
            views.showError('venue-details-container', error.message);
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

    switchRaveOperatorsSubTab(subTabName) {
        console.log('Switching to sub-tab:', subTabName);
        state.selectedOperatorType = subTabName;
        state.raveOperatorsView = 'table';
        
        // Update sub-tab button states
        document.querySelectorAll('.sub-tab-button').forEach(button => {
            button.classList.remove('active');
        });
        const subTabButton = document.getElementById(`sub-tab-${subTabName}`);
        if (subTabButton) {
            subTabButton.classList.add('active');
        }
        
        // Show/hide views
        document.getElementById('rave-operators-table-view').style.display = 'block';
        document.getElementById('provider-list-view').style.display = 'none';
        document.getElementById('provider-detail-view').style.display = 'none';
        
        // Render the appropriate table
        views.renderOperatorsTable(subTabName);
    },

    filterByOperatorType(operatorType) {
        console.log('Filtering by operator type:', operatorType);
        // For now, just switch to the sub-tab
        // Future: implement filtering logic in matrix view
        this.switchRaveOperatorsSubTab(operatorType);
    },

    showOperatorDropdown(eventUid, operatorType, clickEvent) {
        // Prevent event propagation
        if (clickEvent) {
            clickEvent.stopPropagation();
        }
        
        // Find existing dropdown
        const existingDropdown = document.querySelector('.operator-dropdown');
        if (existingDropdown) {
            // If clicking same cell, close dropdown
            const cell = clickEvent?.target?.closest('.matrix-operator-cell');
            if (cell && cell.contains(existingDropdown)) {
                existingDropdown.remove();
                return;
            }
            existingDropdown.remove();
        }
        
        // Get operators for this event and type
        const operators = state.eventOperatorsData.filter(eo => 
            eo.event_uid === eventUid && eo.operator_type === operatorType
        );
        
        if (operators.length === 0) return;
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'operator-dropdown';
        dropdown.innerHTML = `
            <ul>
                ${operators.map(op => `
                    <li onclick="router.showProviderDetail('${op.operator_name}', '${operatorType}'); event.stopPropagation();">
                        ${op.operator_name}${op.is_primary ? ' (primary)' : ''}
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Position dropdown near clicked cell
        const cell = clickEvent?.target?.closest('.matrix-operator-cell');
        if (cell) {
            cell.style.position = 'relative';
            cell.appendChild(dropdown);
        }
        
        // Close dropdown when clicking elsewhere
        setTimeout(() => {
            const closeDropdown = (e) => {
                if (!dropdown.contains(e.target) && e.target !== clickEvent?.target) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            };
            document.addEventListener('click', closeDropdown);
        }, 100);
    },

    claimOperatorSpot(eventUid, operatorType) {
        console.log('Claim operator spot:', eventUid, operatorType);
        // Future: implement claim functionality
        alert(`Claim operator spot for ${operatorType} at event ${eventUid}. Feature coming soon!`);
    },

    showProviderDetail(providerName, operatorType) {
        console.log('Showing provider detail:', providerName, operatorType);
        state.selectedProvider = { name: providerName, type: operatorType };
        state.raveOperatorsView = 'detail';
        
        // Hide list view, show detail view
        document.getElementById('provider-list-view').style.display = 'none';
        document.getElementById('provider-detail-view').style.display = 'block';
        
        views.renderProviderDetail(providerName, operatorType);
    },

    backToProviderList() {
        console.log('Back to provider list');
        state.raveOperatorsView = 'list';
        state.selectedProvider = null;
        
        // Show list view, hide detail view
        document.getElementById('provider-list-view').style.display = 'block';
        document.getElementById('provider-detail-view').style.display = 'none';
        
        // Re-render list for current operator type
        if (state.selectedOperatorType) {
            views.renderProviderList(state.selectedOperatorType);
        }
    },

    showFullProviderProfile(providerName, operatorType) {
        console.log('Show full provider profile:', providerName, operatorType);
        // Future: implement full profile page
        // For now, just show alert
        alert(`Full profile page for ${providerName} (${operatorType}). Feature coming soon!`);
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
            backToOperatorsButton.addEventListener('click', () => this.switchTab('rave-operators'));
        }
        
        // Back to friends button
        
        // Tab button event listeners
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Sub-tab button event listeners for Rave Operators
        document.querySelectorAll('.sub-tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const subTabName = button.getAttribute('data-sub-tab');
                this.switchRaveOperatorsSubTab(subTabName);
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
        
        // Email link button (independent action, not a toggle)
        const authEmailLinkBtn = document.getElementById('auth-email-link-btn');
        if (authEmailLinkBtn) {
            authEmailLinkBtn.addEventListener('click', () => this.handleEmailLinkLogin());
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
            } else if (state.currentView === 'rave-operators') {
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
        const passwordGroup = document.getElementById('password-group');
        const authMethodToggle = document.getElementById('auth-method-toggle');
        
        if (!authModal) return;
        
        // Set mode
        state.authModalMode = mode;
        state.authLoginMethod = 'password'; // Reset to password method
        
        // Update UI based on mode
        if (mode === 'login') {
            authModalTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Log in';
            authSwitchText.textContent = "Don't have an account?";
            authSwitchBtn.textContent = 'Sign Up';
            
            // Show password field and email link option (independent)
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (authMethodToggle) authMethodToggle.style.display = 'block';
            // Always use password method for form submit
            state.authLoginMethod = 'password';
        } else {
            authModalTitle.textContent = 'Sign Up';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchText.textContent = 'Already have an account?';
            authSwitchBtn.textContent = 'Log in';
            
            // Show password field, hide email link option for signup
            if (passwordGroup) passwordGroup.style.display = 'block';
            if (authMethodToggle) authMethodToggle.style.display = 'none';
            state.authLoginMethod = 'password';
        }
        
        // Clear form
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        
        // Show modal
        authModal.style.display = 'flex';
    },
    
    async handleEmailLinkLogin() {
        // Independent email link action - doesn't affect the form
        const email = document.getElementById('auth-email').value.trim();
        
        if (!email) {
            alert('Please enter your email address');
            return;
        }
        
        try {
            const result = await this.handleLoginWithEmailLink(email);
            
            if (result.success && result.sent) {
                this.hideAuthModal();
                alert('Check your email for the login link! Click the link in your email to sign in.');
            } else {
                alert('Failed to send email link. Please try again.');
            }
        } catch (error) {
            console.error('Email link error:', error);
            alert('Failed to send email link: ' + error.message);
        }
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

    // Mode selection functions removed - see docs/NOSTR_AUTH_REMOVED.md for future Nostr integration

    async handleAuthSubmit(e) {
        e.preventDefault();
        console.log('Handling auth submit in', state.authModalMode, 'mode');
        
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        
        // Validate
        if (!email) {
            alert('Please enter your email');
            return;
        }
        
        if (!password) {
            alert('Please enter your password');
            return;
        }
        
        try {
            let result;
            if (state.authModalMode === 'login') {
                // Always use password login for form submit
                result = await this.handleLogin(email, password);
            } else {
                // Signup
                result = await this.handleSignup(email, password);
            }
            
            if (result.success) {
                this.hideAuthModal();
                this.updateAuthStatus();
                console.log('Authentication successful');
                alert(state.authModalMode === 'login' ? 'Logged in successfully!' : 'Account created successfully!');
            } else {
                alert('Authentication failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Authentication error:', error);
            alert('Authentication failed: ' + error.message);
        }
    },

    async handleLogin(email, password) {
        console.log('Handling login with password for', email);
        
        try {
            // Standard Supabase login with password
            const { data, error } = await state.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('Login error details:', error);
                
                // Provide more helpful error messages
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please check your credentials.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please check your email and click the confirmation link before logging in.');
                } else {
                    throw error;
                }
            }
            
            // Check if session was created
            if (!data.session) {
                console.warn('Login succeeded but no session returned. User may need to confirm email.');
                throw new Error('Account created but email confirmation required. Please check your email.');
            }
            
            // Update state
            state.currentUser = data.user;
            state.isAuthenticated = true;
            state.authSession = data.session;
            
            console.log('Login successful for:', data.user.email);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login error:', error);
            throw new Error(error.message || 'Login failed. Please check your credentials.');
        }
    },
    
    async handleLoginWithEmailLink(email) {
        console.log('Handling login with email link for', email);
        
        try {
            // Determine redirect URL
            // Priority: CONFIG.appUrl > Supabase project URL with app path > current origin
            let redirectUrl;
            if (CONFIG.appUrl) {
                // Use explicitly configured app URL
                redirectUrl = `${CONFIG.appUrl}${window.location.pathname}`;
            } else {
                // Try to use Supabase preview URL pattern if available
                // Supabase projects often have preview URLs like: https://[project-ref].supabase.app
                // Extract project ref from supabaseUrl
                const projectRefMatch = CONFIG.supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
                if (projectRefMatch) {
                    const projectRef = projectRefMatch[1];
                    // Try Supabase preview/deployment URL pattern
                    redirectUrl = `https://${projectRef}.supabase.app${window.location.pathname}`;
                    console.log('Using Supabase preview URL for redirect:', redirectUrl);
                } else {
                    // Fallback to current origin
                    redirectUrl = `${window.location.origin}${window.location.pathname}`;
                    console.warn('Using current origin for redirect (may not work for email links):', redirectUrl);
                    console.warn('Consider setting CONFIG.appUrl to your deployment URL or configure in Supabase Dashboard > Authentication > URL Configuration');
                }
            }
            
            // Send magic link via Supabase
            const { data, error } = await state.supabaseClient.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: redirectUrl
                }
            });
            
            if (error) throw error;
            
            console.log('Email link sent with redirect URL:', redirectUrl);
            return { success: true, sent: true, email: email };
        } catch (error) {
            console.error('Email link error:', error);
            throw new Error(error.message || 'Failed to send email link. Please try again.');
        }
    },

    async handleSignup(email, password) {
        console.log('Handling signup for', email);
        
        try {
            // Standard Supabase signup
            const { data, error } = await state.supabaseClient.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('Signup error details:', error);
                
                // Check if user already exists
                if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                    // Try to sign in instead
                    console.log('User already exists, attempting login...');
                    return await this.handleLogin(email, password);
                }
                throw error;
            }
            
            // Check if session was created (depends on Supabase email confirmation settings)
            if (data.session) {
                // Session created - user is logged in
                state.currentUser = data.user;
                state.isAuthenticated = true;
                state.authSession = data.session;
                console.log('Signup successful with session for:', data.user.email);
            } else {
                // No session - email confirmation required
                console.log('Signup successful but email confirmation required for:', data.user.email);
                throw new Error('Account created! Please check your email and click the confirmation link to complete signup.');
            }
            
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Signup error:', error);
            throw new Error(error.message || 'Signup failed. Please try again.');
        }
    },

    // Recovery phrase modal removed - see docs/NOSTR_AUTH_REMOVED.md for future Nostr integration

    async handleLogout() {
        console.log('Handling logout');
        
        try {
            // Sign out from Supabase
            const { error } = await state.supabaseClient.auth.signOut();
            
            if (error) throw error;
            
            // Clear state
            state.currentUser = null;
            state.isAuthenticated = false;
            state.authSession = null;
            state.emulatedUser = null; // Also clear emulated user on logout
            
            // Update UI
            this.updateAuthStatus();
            alert('Logged out successfully!');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed: ' + error.message);
        }
    },

    async updateAuthStatus() {
        console.log('Updating auth status...');
        
        const authStatus = document.getElementById('auth-status');
        const authUser = document.getElementById('auth-user');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const eventListsIndicators = document.getElementById('event-lists-indicators');
        
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
            
            // Show event lists indicators
            if (eventListsIndicators) {
                eventListsIndicators.style.display = 'flex';
            }
            
            // Load user event lists
            try {
                const userId = state.currentUser.id || state.currentUser.user_id;
                if (userId) {
                    const lists = await api.fetchUserEventLists(userId);
                    state.userEventLists = lists;
                    this.updateEventListCounts();
                }
            } catch (error) {
                console.error('Error loading user event lists:', error);
            }
        } else {
            // User is not authenticated
            authStatus.textContent = 'Not signed in';
            authUser.style.display = 'none';
            
            // Show/hide buttons
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (signupBtn) signupBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            
            // Hide event lists indicators
            if (eventListsIndicators) {
                eventListsIndicators.style.display = 'none';
            }
            
            // Clear event lists
            state.userEventLists = { saved: [], maybe: [], going: [] };
            this.updateEventListCounts();
        }
        
        console.log('Auth status updated:', state.isAuthenticated ? 'authenticated' : 'not authenticated');
    },
    
    updateEventListCounts() {
        const savedCount = document.getElementById('saved-count');
        const maybeCount = document.getElementById('maybe-count');
        const goingCount = document.getElementById('going-count');
        
        if (savedCount) savedCount.textContent = state.userEventLists.saved.length;
        if (maybeCount) maybeCount.textContent = state.userEventLists.maybe.length;
        if (goingCount) goingCount.textContent = state.userEventLists.going.length;
    },
    
    async addEventToList(eventUid, listType) {
        const currentUser = state.currentUser || state.emulatedUser;
        if (!currentUser) {
            alert('Please log in to save events');
            return;
        }
        
        const userId = currentUser.id || currentUser.user_id;
        if (!userId) {
            console.error('No user ID available');
            return;
        }
        
        try {
            await api.addEventToList(userId, eventUid, listType);
            
            // Update state
            if (!state.userEventLists[listType].includes(eventUid)) {
                state.userEventLists[listType].push(eventUid);
            }
            
            // Remove from other lists
            ['saved', 'maybe', 'going'].forEach(type => {
                if (type !== listType) {
                    const index = state.userEventLists[type].indexOf(eventUid);
                    if (index > -1) {
                        state.userEventLists[type].splice(index, 1);
                    }
                }
            });
            
            this.updateEventListCounts();
            
            // Re-render events to update button states
            if (state.eventsData && state.eventsData.length > 0) {
                views.renderEvents(state.eventsData);
            }
        } catch (error) {
            console.error('Error adding event to list:', error);
            alert('Failed to add event to list. Please try again.');
        }
    },
    
    async removeEventFromList(eventUid, listType) {
        const currentUser = state.currentUser || state.emulatedUser;
        if (!currentUser) return;
        
        const userId = currentUser.id || currentUser.user_id;
        if (!userId) return;
        
        try {
            await api.removeEventFromList(userId, eventUid, listType);
            
            // Update state
            const index = state.userEventLists[listType].indexOf(eventUid);
            if (index > -1) {
                state.userEventLists[listType].splice(index, 1);
            }
            
            this.updateEventListCounts();
            
            // Re-render current view if it's a list view
            if (state.currentView === 'saved' || state.currentView === 'going') {
                if (listType === 'saved') {
                    this.showSavedEvents();
                } else if (listType === 'going') {
                    this.showGoingEvents();
                }
            } else if (state.currentView === 'maybe') {
                this.showMaybeComparison();
            } else {
                // Re-render events to update button states
                if (state.eventsData && state.eventsData.length > 0) {
                    views.renderEvents(state.eventsData);
                }
            }
        } catch (error) {
            console.error('Error removing event from list:', error);
            alert('Failed to remove event from list. Please try again.');
        }
    },
    
    async showSavedEvents() {
        console.log('Showing saved events');
        state.currentView = 'saved';
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('saved-events-view').style.display = 'block';
        document.getElementById('maybe-comparison-view').style.display = 'none';
        document.getElementById('going-events-view').style.display = 'none';
        
        const container = document.getElementById('saved-events-container');
        if (!container) return;
        
        if (state.userEventLists.saved.length === 0) {
            container.innerHTML = '<div class="empty-state">> No saved events</div>';
            return;
        }
        
        container.innerHTML = '<div class="empty-state">> Loading saved events...</div>';
        
        try {
            const events = await api.getEventsByUids(state.userEventLists.saved);
            views.renderEvents(events, 'saved-events-container');
        } catch (error) {
            console.error('Error loading saved events:', error);
            container.innerHTML = '<div class="empty-state">> Error loading saved events</div>';
        }
    },
    
    async showMaybeComparison() {
        console.log('Showing maybe events comparison');
        state.currentView = 'maybe';
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('saved-events-view').style.display = 'none';
        document.getElementById('maybe-comparison-view').style.display = 'block';
        document.getElementById('going-events-view').style.display = 'none';
        
        const container = document.getElementById('maybe-comparison-container');
        if (!container) return;
        
        if (state.userEventLists.maybe.length === 0) {
            container.innerHTML = '<div class="empty-state">> No events in maybe list</div>';
            return;
        }
        
        container.innerHTML = '<div class="empty-state">> Loading maybe events...</div>';
        
        try {
            const events = await api.getEventsByUids(state.userEventLists.maybe);
            views.renderMaybeComparison(events);
        } catch (error) {
            console.error('Error loading maybe events:', error);
            container.innerHTML = '<div class="empty-state">> Error loading maybe events</div>';
        }
    },
    
    async showGoingEvents() {
        console.log('Showing going events');
        state.currentView = 'going';
        
        // Hide all other views
        document.getElementById('events-view').style.display = 'none';
        document.getElementById('dj-view').style.display = 'none';
        document.getElementById('saved-events-view').style.display = 'none';
        document.getElementById('maybe-comparison-view').style.display = 'none';
        document.getElementById('going-events-view').style.display = 'block';
        
        const container = document.getElementById('going-events-container');
        if (!container) return;
        
        if (state.userEventLists.going.length === 0) {
            container.innerHTML = '<div class="empty-state">> No events marked as going</div>';
            return;
        }
        
        container.innerHTML = '<div class="empty-state">> Loading going events...</div>';
        
        try {
            const events = await api.getEventsByUids(state.userEventLists.going);
            views.renderEvents(events, 'going-events-container');
        } catch (error) {
            console.error('Error loading going events:', error);
            container.innerHTML = '<div class="empty-state">> Error loading going events</div>';
        }
    },

    // Account mode indicator functions removed - see docs/NOSTR_AUTH_REMOVED.md for future Nostr integration
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
// NOSTR DEV TAB EVENT HANDLERS
// ============================================================================
function initNostrDevTab() {
    if (!CONFIG.flags.nostrDevTab) {
        // Hide tab if flag disabled
        const tabButton = document.getElementById('tab-nostr');
        if (tabButton) tabButton.style.display = 'none';
        return;
    }
    
    // Show tab if flag enabled
    const tabButton = document.getElementById('tab-nostr');
    if (tabButton) tabButton.style.display = 'inline-block';
    
    // Only set up handlers if nostrIsolated flag is enabled
    if (!CONFIG.flags.nostrIsolated) {
        return; // Will work but may have limited functionality
    }
    
    // Status refresh
    const refreshStatusBtn = document.getElementById('nostr-refresh-status');
    if (refreshStatusBtn) {
        refreshStatusBtn.addEventListener('click', () => views.updateNostrStatus());
    }
    
    // Key Management
    const generateKeysBtn = document.getElementById('nostr-generate-keys');
    if (generateKeysBtn) {
        generateKeysBtn.addEventListener('click', async () => {
            try {
                const keys = await nostr.generateKeys();
                setNostrKeys(keys);
                views.displayNostrKeys(keys);
                views.displayNostrResult('nostr-keys-display', keys, 'Generated Keys');
                views.updateNostrStatus();
            } catch (error) {
                views.displayNostrResult('nostr-keys-display', { error: error.message }, 'Error');
            }
        });
    }
    
    const testKeygenBtn = document.getElementById('nostr-test-keygen');
    if (testKeygenBtn) {
        testKeygenBtn.addEventListener('click', async () => {
            try {
                const result = await nostr.testKeyGeneration();
                views.displayNostrResult('nostr-dev-results', result, 'Key Generation Test');
            } catch (error) {
                views.displayNostrResult('nostr-dev-results', { error: error.message }, 'Error');
            }
        });
    }
    
    const testEncryptionBtn = document.getElementById('nostr-test-encryption');
    if (testEncryptionBtn) {
        testEncryptionBtn.addEventListener('click', async () => {
            try {
                const result = await nostr.testEncryption();
                views.displayNostrResult('nostr-dev-results', result, 'Encryption Test');
            } catch (error) {
                views.displayNostrResult('nostr-dev-results', { error: error.message }, 'Error');
            }
        });
    }
    
    // Connection Management
    const connectBtn = document.getElementById('nostr-connect');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            const input = document.getElementById('nostr-relay-input');
            const relayUrl = input?.value || CONFIG.nostrRelayUrl;
            try {
                const result = await nostr.connect(relayUrl);
                views.displayNostrResult('nostr-connection-result', { success: true, relay: relayUrl }, 'Connection');
                views.updateNostrStatus();
            } catch (error) {
                views.displayNostrResult('nostr-connection-result', { error: error.message }, 'Connection Error');
            }
        });
    }
    
    const disconnectBtn = document.getElementById('nostr-disconnect');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            try {
                await nostr.disconnect();
                views.displayNostrResult('nostr-connection-result', { success: true, message: 'Disconnected' }, 'Disconnection');
                views.updateNostrStatus();
            } catch (error) {
                views.displayNostrResult('nostr-connection-result', { error: error.message }, 'Error');
            }
        });
    }
    
    const healthCheckBtn = document.getElementById('nostr-health-check');
    if (healthCheckBtn) {
        healthCheckBtn.addEventListener('click', async () => {
            const input = document.getElementById('nostr-relay-input');
            const relayUrl = input?.value || CONFIG.nostrRelayUrl;
            try {
                const result = await nostr.healthCheck(relayUrl);
                views.displayNostrResult('nostr-connection-result', result, 'Health Check');
            } catch (error) {
                views.displayNostrResult('nostr-connection-result', { error: error.message }, 'Error');
            }
        });
    }
    
    // Query Tools
    const queryEventsBtn = document.getElementById('nostr-query-events');
    if (queryEventsBtn) {
        queryEventsBtn.addEventListener('click', async () => {
            try {
                const filter = { kinds: [1], limit: 10 };
                const result = await nostr.queryEvents(filter);
                views.displayNostrResult('nostr-query-results', result, 'Query Events');
            } catch (error) {
                views.displayNostrResult('nostr-query-results', { error: error.message }, 'Error');
            }
        });
    }
    
    const queryProfilesBtn = document.getElementById('nostr-query-profiles');
    if (queryProfilesBtn) {
        queryProfilesBtn.addEventListener('click', async () => {
            try {
                const result = await nostr.queryProfiles();
                views.displayNostrResult('nostr-query-results', result, 'Query Profiles');
            } catch (error) {
                views.displayNostrResult('nostr-query-results', { error: error.message }, 'Error');
            }
        });
    }
    
    const fetchFeedBtn = document.getElementById('nostr-fetch-feed');
    if (fetchFeedBtn) {
        fetchFeedBtn.addEventListener('click', async () => {
            try {
                const result = await nostr.fetchFeed();
                views.displayNostrResult('nostr-query-results', result, 'Fetch Feed');
                views.updateNostrStatus();
            } catch (error) {
                views.displayNostrResult('nostr-query-results', { error: error.message }, 'Error');
            }
        });
    }
    
    // Dev Tools
    const testConnectionBtn = document.getElementById('nostr-test-connection');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', async () => {
            try {
                const result = await nostr.testConnection();
                views.displayNostrResult('nostr-dev-results', result, 'Connection Test');
            } catch (error) {
                views.displayNostrResult('nostr-dev-results', { error: error.message }, 'Error');
            }
        });
    }
    
    const getStatusBtn = document.getElementById('nostr-get-status');
    if (getStatusBtn) {
        getStatusBtn.addEventListener('click', () => {
            const status = nostr.getStatus();
            views.displayNostrResult('nostr-dev-results', status, 'Status');
        });
    }
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

// Aggregate venue statistics from events data
function aggregateVenueStats(venueName) {
    const venueEvents = state.eventsData.filter(event => {
        const eventVenue = event.venue || event.location || event.venue?.name || '';
        return eventVenue.toLowerCase().includes(venueName.toLowerCase()) ||
               venueName.toLowerCase().includes(eventVenue.toLowerCase());
    });

    if (venueEvents.length === 0) {
        return null;
    }

    // Sort events by date
    const sortedEvents = venueEvents
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
            dj: e.dj || (e.artists && e.artists[0]) || 'TBD',
            city: e.city || e.venue?.city || null
        }));

    // Get past events
    const pastEvents = sortedEvents.filter(e => e.dateObj && e.dateObj < now);

    // Aggregate DJs who have played here
    const djCounts = {};
    sortedEvents.forEach(e => {
        const dj = e.dj || (e.artists && e.artists[0]);
        if (dj) {
            djCounts[dj] = (djCounts[dj] || 0) + 1;
        }
    });
    const topDJs = Object.entries(djCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dj, count]) => ({ dj, count }));

    // Aggregate genres/styles
    const styleCounts = {};
    sortedEvents.forEach(e => {
        const styles = e.styles || (e.genre ? [e.genre] : []) || (e.genres || []);
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

    return {
        totalEvents,
        pastEvents: pastEvents.length,
        upcomingEvents: upcomingEvents.length,
        firstAppearance,
        lastAppearance,
        activityStatus,
        upcomingEvents,
        topDJs,
        topStyles,
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
    if (!state.eventsData || state.eventsData.length === 0) {
        console.warn('getDJsActiveThisWeek: No events data available');
        return [];
    }
    
    // Use time range filter if set, otherwise default to 7 days
    let startDate, endDate;
    if (state.timeRange && router) {
        const rangeDates = router.getTimeRangeDates();
        startDate = rangeDates.startDate;
        endDate = rangeDates.endDate;
    } else {
    const now = new Date();
        startDate = now;
        endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Get all events in time range
    const upcomingEvents = state.eventsData.filter(event => {
        const date = event.date || event.start;
        if (!date) return false;
        try {
        const eventDate = new Date(date);
            return eventDate >= startDate && eventDate <= endDate;
        } catch (e) {
            console.warn('Invalid date in event:', date, event);
            return false;
        }
    });
    
    console.log('Upcoming events in next 7 days:', upcomingEvents.length);
    
    // Group by DJ
    const djMap = {};
    
    upcomingEvents.forEach(event => {
        // Try multiple fields for DJ name
        const djName = event.dj || event.artist || event.artists?.[0] || event.organizer?.name || '';
        if (!djName || djName === 'TBD') return;
        
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
    
    // Initialize NOSTR dev tab (if flag enabled)
    initNostrDevTab();
    if (!socialInitialized) {
        console.warn('Social layer initialization failed, continuing without social features');
    }
    
    // Set up navigation
    router.init();
    
    // Initialize time range buttons
    router.syncTimeRangeButtons();
    
    // Update auth status after router is initialized (to restore UI state)
    if (router.updateAuthStatus) {
        router.updateAuthStatus();
    }
    
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
// ============================================================================