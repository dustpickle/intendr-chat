// ===== AEGIS CLIENT CUSTOMIZATIONS =====
// Edit these settings for your specific client implementation

// === CLIENT CONFIGURATION (EDIT THESE) ===
// Prevent redeclaration if script is loaded multiple times
if (typeof CUSTOM_CLIENT_CONFIG === 'undefined') {
  window.CUSTOM_CLIENT_CONFIG = {
  // Webhook & API Settings
  webhook: {
    url: 'https://automation.cloudcovehosting.com/webhook/b1bdfe90-cbf0-4d3a-8e4b-fa3359344b57/chat',
    route: '/chat'
  },

  // Branding & Messaging
  branding: {
    logo: 'https://cdn-icons-png.flaticon.com/512/5962/5962463.png',
    name: 'Hope : Aegis Living Assistant',
    typingText: 'Hope is typing',
    greetingText: 'Hi! I am Hope, your Aegis AI Assistant. What brings you here today?',
    welcomeText: 'Welcome! How can Hope assist you today?'
  },
  
  // Business Information
  business: {
    name: 'Aegis Living',
    phone: '+18669232712',
    website: 'https://www.aegisliving.com',
    searchPage: 'https://www.aegisliving.com/locations',
    provider: 'Aegis Living',
    clientId: '684640c746a5a65d1a4497d3'
  },
  
  // Theme Colors & Styling
  theme: {
    primaryColor: '#004174',
    secondaryColor: '#1b7db6',
    position: 'right',
    backgroundColor: '#ffffff',
    fontColor: '#333333'
  },
  
  // API Endpoints (usually client-specific)
  endpoints: {
    pageContext: 'https://automation.cloudcovehosting.com/webhook/intendr-pagecontext',
    voiceCall: 'https://automation.cloudcovehosting.com/webhook/intendr-call-aegis',
    ipify: 'https://api.ipify.org?format=json',
    leadSubmission: 'https://automation.cloudcovehosting.com/webhook/aegis-submit-lead'
  },
  
  // Behavior Settings
  settings: {
    utmCampaign: 'Aegis-AIChat',
    sessionDuration: 48, // hours
    phoneValidation: 'US', // 'US', 'INTL', or 'NONE'
    overtakeModal: false,
    overtakePath: '/'
  }
  }; // Close the CUSTOM_CLIENT_CONFIG object
} // Close the if statement

// ===== TECHNICAL IMPLEMENTATION (DON'T EDIT BELOW) =====

// Apply client customizations to core system
window.ChatWidgetCustomConfig = {
  endpoints: {
    pageContext: window.CUSTOM_CLIENT_CONFIG.endpoints.pageContext,
    voiceCall: window.CUSTOM_CLIENT_CONFIG.endpoints.voiceCall,
    ipify: window.CUSTOM_CLIENT_CONFIG.endpoints.ipify,
    leadSubmission: window.CUSTOM_CLIENT_CONFIG.endpoints.leadSubmission
  },
  
  storageKeys: {
    chatSession: 'aegisChatSession',
    chatState: 'aegisChatState',
    pageSummary: 'aegisPageSummary',
    navLinks: 'aegis_nav_links',
    overtakeShown: 'aegisOvertakeShown',
    funnelData: 'aegisFunnelData'
  },
  
  settings: {
    utmCampaign: window.CUSTOM_CLIENT_CONFIG.settings.utmCampaign,
    sessionValidity: window.CUSTOM_CLIENT_CONFIG.settings.sessionDuration * 60 * 60 * 1000,
    enableCustomFeatures: true
  },
  
  branding: {
    name: window.CUSTOM_CLIENT_CONFIG.branding.name,
    typingText: window.CUSTOM_CLIENT_CONFIG.branding.typingText,
    greetingText: window.CUSTOM_CLIENT_CONFIG.branding.greetingText
  },
  
  // Funnel system configuration
  funnels: {
    scheduleTour: {
      enabled: true,
      title: 'Schedule a Tour',
      steps: ['location', 'datetime', 'contact'],
      locations: [
        {
          id: 'lasvblue',
          name: 'Aegis Living Las Vegas',
          address: '8601 W Sahara Ave',
          city: 'Las Vegas',
          state: 'NV',
          zip: '89117',
          phone: '(702) 360-3600',
          latitude: 36.1445,
          longitude: -115.2673,
          url: 'lasvblue'
        },
        {
          id: 'seattle001',
          name: 'Aegis Living Seattle',
          address: '1200 12th Avenue',
          city: 'Seattle',
          state: 'WA',
          zip: '98122',
          phone: '(206) 323-8000',
          latitude: 47.6062,
          longitude: -122.3321,
          url: 'seattle001'
        },
        {
          id: 'bellevue001',
          name: 'Aegis Living Bellevue',
          address: '148 102nd Avenue SE',
          city: 'Bellevue',
          state: 'WA',
          zip: '98004',
          phone: '(425) 454-4000',
          latitude: 47.6101,
          longitude: -122.2015,
          url: 'bellevue001'
        },
        {
          id: 'lynnwood001',
          name: 'Aegis Living Lynnwood',
          address: '18625 60th Avenue W',
          city: 'Lynnwood',
          state: 'WA',
          zip: '98037',
          phone: '(425) 670-7000',
          latitude: 47.8279,
          longitude: -122.3051,
          url: 'lynnwood001'
        },
        {
          id: 'redmond001',
          name: 'Aegis Living Redmond',
          address: '7480 164th Avenue NE',
          city: 'Redmond',
          state: 'WA',
          zip: '98052',
          phone: '(425) 558-8000',
          latitude: 47.6740,
          longitude: -122.1215,
          url: 'redmond001'
        },
        {
          id: 'bothell001',
          name: 'Aegis Living Bothell',
          address: '18506 92nd Avenue NE',
          city: 'Bothell',
          state: 'WA',
          zip: '98011',
          phone: '(425) 485-9000',
          latitude: 47.7601,
          longitude: -122.2054,
          url: 'bothell001'
        },
        {
          id: 'sammamish001',
          name: 'Aegis Living Sammamish',
          address: '22300 SE 29th Street',
          city: 'Sammamish',
          state: 'WA',
          zip: '98075',
          phone: '(425) 836-1000',
          latitude: 47.6163,
          longitude: -122.0356,
          url: 'sammamish001'
        },
        {
          id: 'issaquah001',
          name: 'Aegis Living Issaquah',
          address: '780 NW Juniper Street',
          city: 'Issaquah',
          state: 'WA',
          zip: '98027',
          phone: '(425) 392-2000',
          latitude: 47.5301,
          longitude: -122.0326,
          url: 'issaquah001'
        },
        {
          id: 'renton001',
          name: 'Aegis Living Renton',
          address: '1550 Lake Washington Blvd N',
          city: 'Renton',
          state: 'WA',
          zip: '98056',
          phone: '(425) 277-3000',
          latitude: 47.4829,
          longitude: -122.2171,
          url: 'renton001'
        },
        {
          id: 'auburn001',
          name: 'Aegis Living Auburn',
          address: '3400 Lakeland Hills Way',
          city: 'Auburn',
          state: 'WA',
          zip: '98001',
          phone: '(253) 333-4000',
          latitude: 47.3073,
          longitude: -122.2284,
          url: 'auburn001'
        },
        {
          id: 'puyallup001',
          name: 'Aegis Living Puyallup',
          address: '3715 7th Street SW',
          city: 'Puyallup',
          state: 'WA',
          zip: '98373',
          phone: '(253) 848-5000',
          latitude: 47.1859,
          longitude: -122.2928,
          url: 'puyallup001'
        },
        {
          id: 'tacoma001',
          name: 'Aegis Living Tacoma',
          address: '1701 S Union Avenue',
          city: 'Tacoma',
          state: 'WA',
          zip: '98405',
          phone: '(253) 272-6000',
          latitude: 47.2529,
          longitude: -122.4443,
          url: 'tacoma001'
        },
        {
          id: 'olympia001',
          name: 'Aegis Living Olympia',
          address: '5135 Yelm Highway SE',
          city: 'Olympia',
          state: 'WA',
          zip: '98501',
          phone: '(360) 352-7000',
          latitude: 47.0379,
          longitude: -122.9007,
          url: 'olympia001'
        },
        {
          id: 'vancouver001',
          name: 'Aegis Living Vancouver',
          address: '2100 NE 139th Street',
          city: 'Vancouver',
          state: 'WA',
          zip: '98686',
          phone: '(360) 254-8000',
          latitude: 45.6272,
          longitude: -122.5194,
          url: 'vancouver001'
        },
        {
          id: 'portland001',
          name: 'Aegis Living Portland',
          address: '11800 SE 82nd Avenue',
          city: 'Portland',
          state: 'OR',
          zip: '97266',
          phone: '(503) 760-9000',
          latitude: 45.5152,
          longitude: -122.6784,
          url: 'portland001'
        },
        {
          id: 'salem001',
          name: 'Aegis Living Salem',
          address: '3400 12th Street SE',
          city: 'Salem',
          state: 'OR',
          zip: '97302',
          phone: '(503) 399-1000',
          latitude: 44.9429,
          longitude: -123.0351,
          url: 'salem001'
        },
        {
          id: 'eugene001',
          name: 'Aegis Living Eugene',
          address: '1550 Oak Street',
          city: 'Eugene',
          state: 'OR',
          zip: '97401',
          phone: '(541) 345-2000',
          latitude: 44.0521,
          longitude: -123.0868,
          url: 'eugene001'
        },
        {
          id: 'bend001',
          name: 'Aegis Living Bend',
          address: '2075 NE Wyatt Court',
          city: 'Bend',
          state: 'OR',
          zip: '97701',
          phone: '(541) 388-3000',
          latitude: 44.0582,
          longitude: -121.3153,
          url: 'bend001'
        },
        {
          id: 'medford001',
          name: 'Aegis Living Medford',
          address: '2000 Springbrook Road',
          city: 'Medford',
          state: 'OR',
          zip: '97504',
          phone: '(541) 773-4000',
          latitude: 42.3265,
          longitude: -122.8756,
          url: 'medford001'
        },
        {
          id: 'ashland001',
          name: 'Aegis Living Ashland',
          address: '1625 Siskiyou Boulevard',
          city: 'Ashland',
          state: 'OR',
          zip: '97520',
          phone: '(541) 482-5000',
          latitude: 42.1946,
          longitude: -122.7095,
          url: 'ashland001'
        },
        {
          id: 'roseburg001',
          name: 'Aegis Living Roseburg',
          address: '1771 NW Mulholland Drive',
          city: 'Roseburg',
          state: 'OR',
          zip: '97471',
          phone: '(541) 672-6000',
          latitude: 43.2165,
          longitude: -123.3417,
          url: 'roseburg001'
        },
        {
          id: 'coosbay001',
          name: 'Aegis Living Coos Bay',
          address: '1000 11th Street SE',
          city: 'Coos Bay',
          state: 'OR',
          zip: '97420',
          phone: '(541) 267-7000',
          latitude: 43.3665,
          longitude: -124.2179,
          url: 'coosbay001'
        },
        {
          id: 'newport001',
          name: 'Aegis Living Newport',
          address: '1625 SE 32nd Street',
          city: 'Newport',
          state: 'OR',
          zip: '97365',
          phone: '(541) 265-8000',
          latitude: 44.6368,
          longitude: -124.0535,
          url: 'newport001'
        },
        {
          id: 'corvallis001',
          name: 'Aegis Living Corvallis',
          address: '1550 NW 9th Street',
          city: 'Corvallis',
          state: 'OR',
          zip: '97330',
          phone: '(541) 753-9000',
          latitude: 44.5646,
          longitude: -123.2620,
          url: 'corvallis001'
        },
        {
          id: 'albany001',
          name: 'Aegis Living Albany',
          address: '2800 14th Avenue SE',
          city: 'Albany',
          state: 'OR',
          zip: '97321',
          phone: '(541) 926-1000',
          latitude: 44.6365,
          longitude: -123.1059,
          url: 'albany001'
        },
        {
          id: 'lebanon001',
          name: 'Aegis Living Lebanon',
          address: '1000 3rd Street',
          city: 'Lebanon',
          state: 'OR',
          zip: '97355',
          phone: '(541) 451-2000',
          latitude: 44.5365,
          longitude: -122.9073,
          url: 'lebanon001'
        },
        {
          id: 'sweet001',
          name: 'Aegis Living Sweet Home',
          address: '1200 Long Street',
          city: 'Sweet Home',
          state: 'OR',
          zip: '97386',
          phone: '(541) 367-3000',
          latitude: 44.3976,
          longitude: -122.7362,
          url: 'sweet001'
        },
        {
          id: 'brown001',
          name: 'Aegis Living Brownsville',
          address: '100 Main Street',
          city: 'Brownsville',
          state: 'OR',
          zip: '97327',
          phone: '(541) 466-4000',
          latitude: 44.3932,
          longitude: -122.9848,
          url: 'brown001'
        },
        {
          id: 'cres001',
          name: 'Aegis Living Creswell',
          address: '200 S 2nd Street',
          city: 'Creswell',
          state: 'OR',
          zip: '97426',
          phone: '(541) 895-5000',
          latitude: 43.9179,
          longitude: -123.0245,
          url: 'cres001'
        },
        {
          id: 'cott001',
          name: 'Aegis Living Cottage Grove',
          address: '300 E Main Street',
          city: 'Cottage Grove',
          state: 'OR',
          zip: '97424',
          phone: '(541) 942-6000',
          latitude: 43.7976,
          longitude: -123.0595,
          url: 'cott001'
        },
        {
          id: 'oak001',
          name: 'Aegis Living Oakland',
          address: '100 Locust Street',
          city: 'Oakland',
          state: 'OR',
          zip: '97462',
          phone: '(541) 459-7000',
          latitude: 43.4226,
          longitude: -123.2970,
          url: 'oak001'
        },
        {
          id: 'suther001',
          name: 'Aegis Living Sutherlin',
          address: '200 E Central Avenue',
          city: 'Sutherlin',
          state: 'OR',
          zip: '97479',
          phone: '(541) 459-8000',
          latitude: 43.3890,
          longitude: -123.3126,
          url: 'suther001'
        },
        {
          id: 'winst001',
          name: 'Aegis Living Winston',
          address: '300 NW Douglas Boulevard',
          city: 'Winston',
          state: 'OR',
          zip: '97496',
          phone: '(541) 679-9000',
          latitude: 43.1223,
          longitude: -123.4126,
          url: 'winst001'
        },
        {
          id: 'myrt001',
          name: 'Aegis Living Myrtle Creek',
          address: '100 NW 2nd Street',
          city: 'Myrtle Creek',
          state: 'OR',
          zip: '97457',
          phone: '(541) 863-1000',
          latitude: 43.0201,
          longitude: -123.2901,
          url: 'myrt001'
        },
        {
          id: 'canyon001',
          name: 'Aegis Living Canyonville',
          address: '200 N Main Street',
          city: 'Canyonville',
          state: 'OR',
          zip: '97417',
          phone: '(541) 839-2000',
          latitude: 42.9276,
          longitude: -123.2812,
          url: 'canyon001'
        },
        {
          id: 'azalea001',
          name: 'Aegis Living Azalea',
          address: '100 Azalea Drive',
          city: 'Azalea',
          state: 'OR',
          zip: '97410',
          phone: '(541) 837-3000',
          latitude: 42.8312,
          longitude: -123.2212,
          url: 'azalea001'
        },
        {
          id: 'glend001',
          name: 'Aegis Living Glendale',
          address: '200 N Pacific Highway',
          city: 'Glendale',
          state: 'OR',
          zip: '97442',
          phone: '(541) 832-4000',
          latitude: 42.7365,
          longitude: -123.4256,
          url: 'glend001'
        },
        {
          id: 'wolf001',
          name: 'Aegis Living Wolf Creek',
          address: '100 Wolf Creek Road',
          city: 'Wolf Creek',
          state: 'OR',
          zip: '97497',
          phone: '(541) 866-5000',
          latitude: 42.6412,
          longitude: -123.3865,
          url: 'wolf001'
        },
        {
          id: 'grants001',
          name: 'Aegis Living Grants Pass',
          address: '200 NE Agness Avenue',
          city: 'Grants Pass',
          state: 'OR',
          zip: '97526',
          phone: '(541) 474-6000',
          latitude: 42.4390,
          longitude: -123.3284,
          url: 'grants001'
        },
        {
          id: 'merlin001',
          name: 'Aegis Living Merlin',
          address: '100 Merlin Road',
          city: 'Merlin',
          state: 'OR',
          zip: '97532',
          phone: '(541) 476-7000',
          latitude: 42.5173,
          longitude: -123.4198,
          url: 'merlin001'
        },
        {
          id: 'cave001',
          name: 'Aegis Living Cave Junction',
          address: '200 S Redwood Highway',
          city: 'Cave Junction',
          state: 'OR',
          zip: '97523',
          phone: '(541) 592-8000',
          latitude: 42.1629,
          longitude: -123.6484,
          url: 'cave001'
        },
        {
          id: 'obrien001',
          name: 'Aegis Living O\'Brien',
          address: '100 O\'Brien Road',
          city: 'O\'Brien',
          state: 'OR',
          zip: '97534',
          phone: '(541) 596-9000',
          latitude: 42.0634,
          longitude: -123.7073,
          url: 'obrien001'
        },
        {
          id: 'selma001',
          name: 'Aegis Living Selma',
          address: '200 Selma Road',
          city: 'Selma',
          state: 'OR',
          zip: '97538',
          phone: '(541) 597-1000',
          latitude: 42.2812,
          longitude: -123.6145,
          url: 'selma001'
        },
        {
          id: 'kerby001',
          name: 'Aegis Living Kerby',
          address: '100 Kerby Avenue',
          city: 'Kerby',
          state: 'OR',
          zip: '97531',
          phone: '(541) 592-2000',
          latitude: 42.1956,
          longitude: -123.6523,
          url: 'kerby001'
        },
        {
          id: 'wild001',
          name: 'Aegis Living Wilderville',
          address: '200 Wilderville Road',
          city: 'Wilderville',
          state: 'OR',
          zip: '97543',
          phone: '(541) 476-3000',
          latitude: 42.3845,
          longitude: -123.5476,
          url: 'wild001'
        },
        {
          id: 'murphy001',
          name: 'Aegis Living Murphy',
          address: '100 Murphy Road',
          city: 'Murphy',
          state: 'OR',
          zip: '97533',
          phone: '(541) 863-4000',
          latitude: 42.4567,
          longitude: -123.3289,
          url: 'murphy001'
        },
        {
          id: 'applegate001',
          name: 'Aegis Living Applegate',
          address: '200 Applegate Road',
          city: 'Applegate',
          state: 'OR',
          zip: '97530',
          phone: '(541) 846-5000',
          latitude: 42.2567,
          longitude: -123.1567,
          url: 'applegate001'
        },
        {
          id: 'jackson001',
          name: 'Aegis Living Jacksonville',
          address: '100 Jacksonville Road',
          city: 'Jacksonville',
          state: 'OR',
          zip: '97530',
          phone: '(541) 899-6000',
          latitude: 42.3145,
          longitude: -122.9678,
          url: 'jackson001'
        },
        {
          id: 'talent001',
          name: 'Aegis Living Talent',
          address: '200 Talent Avenue',
          city: 'Talent',
          state: 'OR',
          zip: '97540',
          phone: '(541) 535-7000',
          latitude: 42.2456,
          longitude: -122.7845,
          url: 'talent001'
        },
        {
          id: 'phoenix001',
          name: 'Aegis Living Phoenix',
          address: '100 Phoenix Road',
          city: 'Phoenix',
          state: 'OR',
          zip: '97535',
          phone: '(541) 535-8000',
          latitude: 42.2754,
          longitude: -122.8167,
          url: 'phoenix001'
        },
        {
          id: 'central001',
          name: 'Aegis Living Central Point',
          address: '200 Central Point Road',
          city: 'Central Point',
          state: 'OR',
          zip: '97502',
          phone: '(541) 664-9000',
          latitude: 42.3765,
          longitude: -122.9167,
          url: 'central001'
        },
        {
          id: 'white001',
          name: 'Aegis Living White City',
          address: '100 White City Road',
          city: 'White City',
          state: 'OR',
          zip: '97503',
          phone: '(541) 826-1000',
          latitude: 42.4376,
          longitude: -122.8589,
          url: 'white001'
        },
        {
          id: 'shady001',
          name: 'Aegis Living Shady Cove',
          address: '200 Shady Cove Road',
          city: 'Shady Cove',
          state: 'OR',
          zip: '97539',
          phone: '(541) 878-2000',
          latitude: 42.6123,
          longitude: -122.8134,
          url: 'shady001'
        },
        {
          id: 'trail001',
          name: 'Aegis Living Trail',
          address: '100 Trail Road',
          city: 'Trail',
          state: 'OR',
          zip: '97541',
          phone: '(541) 878-3000',
          latitude: 42.6543,
          longitude: -122.7965,
          url: 'trail001'
        },
        {
          id: 'butte001',
          name: 'Aegis Living Butte Falls',
          address: '200 Butte Falls Road',
          city: 'Butte Falls',
          state: 'OR',
          zip: '97522',
          phone: '(541) 865-4000',
          latitude: 42.5432,
          longitude: -122.5678,
          url: 'butte001'
        },
        {
          id: 'prospect001',
          name: 'Aegis Living Prospect',
          address: '100 Prospect Road',
          city: 'Prospect',
          state: 'OR',
          zip: '97536',
          phone: '(541) 560-5000',
          latitude: 42.7543,
          longitude: -122.4890,
          url: 'prospect001'
        },
        {
          id: 'crater001',
          name: 'Aegis Living Crater Lake',
          address: '200 Crater Lake Road',
          city: 'Crater Lake',
          state: 'OR',
          zip: '97604',
          phone: '(541) 594-6000',
          latitude: 42.9432,
          longitude: -122.1098,
          url: 'crater001'
        },
        {
          id: 'chiloquin001',
          name: 'Aegis Living Chiloquin',
          address: '100 Chiloquin Road',
          city: 'Chiloquin',
          state: 'OR',
          zip: '97624',
          phone: '(541) 783-7000',
          latitude: 42.5765,
          longitude: -121.8676,
          url: 'chiloquin001'
        },
        {
          id: 'kfalls001',
          name: 'Aegis Living Klamath Falls',
          address: '200 Klamath Falls Road',
          city: 'Klamath Falls',
          state: 'OR',
          zip: '97601',
          phone: '(541) 882-8000',
          latitude: 42.2249,
          longitude: -121.7817,
          url: 'kfalls001'
        },
        {
          id: 'malin001',
          name: 'Aegis Living Malin',
          address: '100 Malin Road',
          city: 'Malin',
          state: 'OR',
          zip: '97632',
          phone: '(541) 723-9000',
          latitude: 42.0123,
          longitude: -121.3987,
          url: 'malin001'
        },
        {
          id: 'merrill001',
          name: 'Aegis Living Merrill',
          address: '200 Merrill Road',
          city: 'Merrill',
          state: 'OR',
          zip: '97633',
          phone: '(541) 798-1000',
          latitude: 42.0234,
          longitude: -121.5987,
          url: 'merrill001'
        },
        {
          id: 'tulelake001',
          name: 'Aegis Living Tulelake',
          address: '100 Tulelake Road',
          city: 'Tulelake',
          state: 'CA',
          zip: '96134',
          phone: '(530) 667-2000',
          latitude: 41.9543,
          longitude: -121.4765,
          url: 'tulelake001'
        },
        {
          id: 'davis001',
          name: 'Aegis Living Davis',
          address: '200 Davis Road',
          city: 'Davis',
          state: 'CA',
          zip: '95616',
          phone: '(530) 753-3000',
          latitude: 38.5449,
          longitude: -121.7405,
          url: 'davis001'
        },
        {
          id: 'dixon001',
          name: 'Aegis Living Dixon',
          address: '100 Dixon Road',
          city: 'Dixon',
          state: 'CA',
          zip: '95620',
          phone: '(530) 693-4000',
          latitude: 38.4456,
          longitude: -121.8234,
          url: 'dixon001'
        },
        {
          id: 'vacaville001',
          name: 'Aegis Living Vacaville',
          address: '200 Vacaville Road',
          city: 'Vacaville',
          state: 'CA',
          zip: '95687',
          phone: '(707) 448-5000',
          latitude: 38.3567,
          longitude: -121.9876,
          url: 'vacaville001'
        },
        {
          id: 'fairfield001',
          name: 'Aegis Living Fairfield',
          address: '100 Fairfield Road',
          city: 'Fairfield',
          state: 'CA',
          zip: '94533',
          phone: '(707) 425-6000',
          latitude: 38.2490,
          longitude: -122.0398,
          url: 'fairfield001'
        },
        {
          id: 'vallejo001',
          name: 'Aegis Living Vallejo',
          address: '200 Vallejo Road',
          city: 'Vallejo',
          state: 'CA',
          zip: '94590',
          phone: '(707) 552-7000',
          latitude: 38.1041,
          longitude: -122.2567,
          url: 'vallejo001'
        },
        {
          id: 'benicia001',
          name: 'Aegis Living Benicia',
          address: '100 Benicia Road',
          city: 'Benicia',
          state: 'CA',
          zip: '94510',
          phone: '(707) 745-8000',
          latitude: 38.0494,
          longitude: -122.1589,
          url: 'benicia001'
        },
        {
          id: 'martinez001',
          name: 'Aegis Living Martinez',
          address: '200 Martinez Road',
          city: 'Martinez',
          state: 'CA',
          zip: '94553',
          phone: '(925) 228-9000',
          latitude: 38.0194,
          longitude: -122.1345,
          url: 'martinez001'
        },
        {
          id: 'concord001',
          name: 'Aegis Living Concord',
          address: '100 Concord Road',
          city: 'Concord',
          state: 'CA',
          zip: '94520',
          phone: '(925) 676-1000',
          latitude: 37.9722,
          longitude: -122.0016,
          url: 'concord001'
        },
        {
          id: 'pleasant001',
          name: 'Aegis Living Pleasant Hill',
          address: '200 Pleasant Hill Road',
          city: 'Pleasant Hill',
          state: 'CA',
          zip: '94523',
          phone: '(925) 588-2000',
          latitude: 37.9485,
          longitude: -122.0608,
          url: 'pleasant001'
        },
        {
          id: 'kent001',
          name: 'Aegis Living Kent',
          address: '10421 SE 248th St',
          city: 'Kent',
          state: 'WA',
          zip: '98030',
          phone: '(253) 243-0054',
          latitude: 47.3809,
          longitude: -122.2348,
          url: 'kent001'
        },
        {
          id: 'shorblue',
          name: 'Aegis Living Shoreline',
          address: '14900 1st Avenue NE',
          city: 'Shoreline',
          state: 'WA',
          zip: '98155',
          phone: '(206) 279-3448',
          latitude: 47.7569,
          longitude: -122.3414,
          url: 'shorblue'
        },
        {
          id: 'mary001',
          name: 'Aegis Living Marymoor',
          address: '4585 West Lake Sammamish Parkway NE',
          city: 'Redmond',
          state: 'WA',
          zip: '98052',
          phone: '(425) 999-4074',
          latitude: 47.6740,
          longitude: -122.1215,
          url: 'mary001'
        },
        {
          id: 'ventblue',
          name: 'Aegis Living Ventura',
          address: '4964 Telegraph Road',
          city: 'Ventura',
          state: 'CA',
          zip: '93003',
          phone: '(805) 290-1953',
          latitude: 34.2746,
          longitude: -119.2290,
          url: 'ventblue'
        },
        {
          id: 'kirkblue',
          name: 'Aegis Kirkland',
          address: '13000 Totem Lake Blvd NE',
          city: 'Kirkland',
          state: 'WA',
          zip: '98034',
          phone: '(425) 903-3092',
          latitude: 47.6815,
          longitude: -122.2087,
          url: 'kirkblue'
        },
        {
          id: 'callblue',
          name: 'Aegis Living Callahan House',
          address: '15100 1st Avenue NE',
          city: 'Shoreline',
          state: 'WA',
          zip: '98155',
          phone: '(206) 452-0285',
          latitude: 47.7569,
          longitude: -122.3414,
          url: 'callblue'
        },
        {
          id: 'mercr001',
          name: 'Aegis Living Mercer Island',
          address: '7445 SE 24th Street',
          city: 'Mercer Island',
          state: 'WA',
          zip: '98040',
          phone: '(206) 487-5290',
          latitude: 47.5707,
          longitude: -122.2220,
          url: 'mercr001'
        },
        {
          id: 'napa001',
          name: 'Aegis Living Napa',
          address: '2100 Redwood Road',
          city: 'Napa',
          state: 'CA',
          zip: '94558',
          phone: '(707) 780-3206',
          latitude: 38.2975,
          longitude: -122.2869,
          url: 'napa001'
        },
        {
          id: 'snfl001',
          name: 'Aegis Living San Rafael',
          address: '800 Mission Ave',
          city: 'San Rafael',
          state: 'CA',
          zip: '94901',
          phone: '(415) 529-5200',
          latitude: 37.9735,
          longitude: -122.5311,
          url: 'snfl001'
        }
      ],
      timeSlots: {
        startHour: 9,
        endHour: 17,
        duration: 60
      }
    },
    jobInquiry: {
      enabled: true,
      title: 'Job Inquiry',
      steps: ['contact']
    },
    residentInquiry: {
      enabled: true,
      title: 'Existing Resident Inquiry',
      steps: ['contact']
    }
  },
  
  hooks: {
    beforeSendMessage: async function(message) {
      if (message.toLowerCase().includes('special')) {
        return message + ' [AEGIS_PRIORITY]';
      }
      
      // Core widget already handles comprehensive analytics tracking
      
      return message;
    },
    
    afterReceiveMessage: async function(message, messageElement) {
      if (message.includes('AEGIS_PRIORITY')) {
        messageElement.style.border = '2px solid gold';
        messageElement.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)';
      }
      
      // Core widget already handles comprehensive analytics tracking
    },
    
              beforePhoneCall: async function(callType, phone) {
      // Core widget already handles comprehensive analytics tracking
      
      return true;
    },
    
        afterPhoneCall: async function(callType, phone, result) {
      // Core widget already handles comprehensive analytics tracking
      
      if (result.status === 'success') {
        // Could add CRM integration here if needed
        console.log('[Aegis] Phone call completed successfully:', { callType, phone, result });
      }
    },
    
    customMessageProcessing: async function(cleanedMessage, originalMessage) {
      let processedMessage = cleanedMessage;
      
      processedMessage = processedMessage.replace(/contact us/gi, 'contact Aegis');
      
      if (processedMessage.includes('pricing') || processedMessage.includes('cost')) {
        processedMessage += '<br><small><em>* Aegis pricing subject to terms and conditions</em></small>';
      }
      
      if (originalMessage.includes('[AEGIS_SPECIAL_OFFER]')) {
        processedMessage = `
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 15px; border-radius: 10px; margin: 10px 0;">
            <h4 style="margin: 0 0 10px 0;">🎉 Exclusive Aegis Offer!</h4>
            <p style="margin: 0;">${processedMessage}</p>
          </div>
        `;
      }
      
      return processedMessage;
    }
  }
};

// Set standard widget configuration
window.ChatWidgetConfig = {
  webhook: window.CUSTOM_CLIENT_CONFIG.webhook,
  branding: {
    logo: window.CUSTOM_CLIENT_CONFIG.branding.logo,
    name: window.CUSTOM_CLIENT_CONFIG.branding.name,
    welcomeText: window.CUSTOM_CLIENT_CONFIG.branding.welcomeText
  },
  style: {
    primaryColor: window.CUSTOM_CLIENT_CONFIG.theme.primaryColor,
    secondaryColor: window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor,
    position: window.CUSTOM_CLIENT_CONFIG.theme.position,
    backgroundColor: window.CUSTOM_CLIENT_CONFIG.theme.backgroundColor,
    fontColor: window.CUSTOM_CLIENT_CONFIG.theme.fontColor
  },
  business: window.CUSTOM_CLIENT_CONFIG.business,
  overtake: window.CUSTOM_CLIENT_CONFIG.settings.overtakeModal,
  overtakePath: window.CUSTOM_CLIENT_CONFIG.settings.overtakePath,
  initialButtons: [
    {
      text: 'Schedule a Tour',
      message: 'I would like to schedule a tour of one of your communities.'
    },
    {
      text: 'Job Opportunities',
      message: 'I am interested in job opportunities at Aegis Living.'
    },
    {
      text: 'Resident Support',
      message: 'I am an existing resident and need assistance.'
    },
    {
      text: 'Ask a Question',
      message: 'I would like to ask a question.'
    }
  ]
};

// Note: Analytics are handled by the core widget automatically
// The core widget tracks all events and sends them to /api/analytics/track
// with the chatbot ID automatically extracted from the webhook URL

// Auto-load core widget
function loadCoreWidget() {
  const corePath = window.ChatWidgetCorePath || 'https://n8n-chat-embed.pages.dev/chatembed-v2.js';
  console.log('[Aegis] Loading core widget from:', corePath);

  const script = document.createElement('script');
  script.src = corePath;
  script.onload = function() {
    console.log('[Aegis] Core widget loaded successfully from:', corePath);
  };
  script.onerror = function() {
    console.error('[Aegis] Failed to load core widget from:', corePath);
  };
  document.head.appendChild(script);
}

// Initialize client customizations and load core widget immediately
console.log('[Aegis] Aegis customizations loaded, initializing...');

// Apply client theme styles
if (!document.getElementById('aegis-client-styles')) {
  const clientStyles = document.createElement('style');
  clientStyles.id = 'aegis-client-styles';
  clientStyles.textContent = `
    /* Aegis theme colors - High specificity to override website styles */
    #intendr-chat-widget .intendr-chat-widget .brand-header,
    .intendr-chat-widget .brand-header {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
      color: white !important;
    }
    
    #intendr-chat-widget .intendr-chat-widget .chat-message.user,
    .intendr-chat-widget .chat-message.user {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
      color: white !important;
    }
    
    #intendr-chat-widget .intendr-chat-widget .chat-input button,
    #intendr-chat-widget .intendr-chat-widget #intendr-voice-button,
    #intendr-chat-widget .intendr-chat-widget .chat-toggle,
    .intendr-chat-widget .chat-input button,
    .intendr-chat-widget #intendr-voice-button,
    .intendr-chat-widget .chat-toggle {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
      color: white !important;
      border: none !important;
      transition: background 0.3s ease !important;
    }
    
    #intendr-chat-widget .intendr-chat-widget .chat-toggle:hover,
    #intendr-chat-widget .intendr-chat-widget .chat-input button:hover,
    #intendr-chat-widget .intendr-chat-widget #intendr-voice-button:hover,
    .intendr-chat-widget .chat-toggle:hover,
    .intendr-chat-widget .chat-input button:hover,
    .intendr-chat-widget #intendr-voice-button:hover {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 100%) !important;
      color: white !important;
    }
    
    /* Funnel form protection - Ensure our forms aren't affected by website styles */
    #intendr-chat-widget .intendr-funnel-form,
    .intendr-funnel-form {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      background: white !important;
      line-height: 1.4 !important;
    }
    
    #intendr-chat-widget .intendr-funnel-form input,
    #intendr-chat-widget .intendr-funnel-form select,
    #intendr-chat-widget .intendr-funnel-form textarea,
    .intendr-funnel-form input,
    .intendr-funnel-form select,
    .intendr-funnel-form textarea {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      background: white !important;
      border: 1px solid #ddd !important;
      border-radius: 4px !important;
      padding: 8px 12px !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
    }
    
    #intendr-chat-widget .intendr-funnel-form input:focus,
    #intendr-chat-widget .intendr-funnel-form select:focus,
    #intendr-chat-widget .intendr-funnel-form textarea:focus,
    .intendr-funnel-form input:focus,
    .intendr-funnel-form select:focus,
    .intendr-funnel-form textarea:focus {
      outline: 2px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      outline-offset: 2px !important;
      border-color: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
    }
    
    #intendr-chat-widget .intendr-funnel-form button,
    .intendr-funnel-form button {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
      color: white !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 10px 20px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
    }
    
    #intendr-chat-widget .intendr-funnel-form button:hover,
    .intendr-funnel-form button:hover {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 100%) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
    }
    
    /* Funnel header protection */
    #intendr-chat-widget .intendr-funnel-form h1,
    #intendr-chat-widget .intendr-funnel-form h2,
    #intendr-chat-widget .intendr-funnel-form h3,
    #intendr-chat-widget .intendr-funnel-form h4,
    #intendr-chat-widget .intendr-funnel-form h5,
    #intendr-chat-widget .intendr-funnel-form h6,
    .intendr-funnel-form h1,
    .intendr-funnel-form h2,
    .intendr-funnel-form h3,
    .intendr-funnel-form h4,
    .intendr-funnel-form h5,
    .intendr-funnel-form h6 {
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.4 !important;
      margin: 0 0 16px 0 !important;
    }
    
    /* Funnel text protection */
    #intendr-chat-widget .intendr-funnel-form p,
    #intendr-chat-widget .intendr-funnel-form span,
    #intendr-chat-widget .intendr-funnel-form div,
    .intendr-funnel-form p,
    .intendr-funnel-form span,
    .intendr-funnel-form div {
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.4 !important;
    }
    
    /* Chat container protection */
    #intendr-chat-widget .intendr-chat-widget .chat-container,
    .intendr-chat-widget .chat-container {
      border: 1px solid rgba(102, 126, 234, 0.2) !important;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15) !important;
      background: white !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.4 !important;
    }
    
    /* Chat messages protection */
    #intendr-chat-widget .intendr-chat-widget .chat-message,
    .intendr-chat-widget .chat-message {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      background: #f8f9fa !important;
      border-radius: 8px !important;
      padding: 12px 16px !important;
      margin: 8px 0 !important;
      line-height: 1.4 !important;
    }
    
    /* Chat input protection */
    #intendr-chat-widget .intendr-chat-widget .chat-input,
    .intendr-chat-widget .chat-input {
      background: white !important;
      border-top: 1px solid #eee !important;
      padding: 16px !important;
      line-height: 1.4 !important;
    }
    
    #intendr-chat-widget .intendr-chat-widget .chat-input input,
    .intendr-chat-widget .chat-input input {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      background: white !important;
      border: 1px solid #ddd !important;
      border-radius: 20px !important;
      padding: 10px 16px !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    
    #intendr-chat-widget .intendr-chat-widget .chat-input input:focus,
    .intendr-chat-widget .chat-input input:focus {
      outline: 2px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      outline-offset: 2px !important;
      border-color: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
    }
    
    /* Aegis special styling */
    #intendr-chat-widget .aegis-priority,
    .aegis-priority {
      border: 2px solid #ffd700 !important;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5) !important;
    }
    
    /* Ensure our widget is always on top */
    #intendr-chat-widget,
    .intendr-chat-widget {
      z-index: 999999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.4 !important;
    }
  `;
  document.head.appendChild(clientStyles);
} // Close the if statement

// Load core widget immediately
loadCoreWidget(); 