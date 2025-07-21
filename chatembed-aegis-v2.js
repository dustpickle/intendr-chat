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
    greetingText: 'Hi! I am Hope, your Aegis virtual care consultant. What brings you here today?'
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
  
  // Google Maps API Configuration
  googleMaps: {
    apiKey: 'AIzaSyDlUpmnRaDHwK2G6O1Sd7xiAxzy9z__9UA',
    libraries: ['places']
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
                address: '9100 West Desert Inn Rd',
                city: 'Las Vegas',
                state: 'NV',
                zip: '89117',
                phone: '(702) 472-8505',
                latitude: 36.1147,
                longitude: -115.1728,
                slug: 'aegis-living-las-vegas-nv'
            },
            {
                id: 'snfrblue',
                name: 'Aegis Living San Francisco',
                address: '2280 Gellert Blvd',
                city: 'South San Francisco',
                state: 'CA',
                zip: '94080',
                phone: '(650) 242-4154',
                latitude: 37.6547,
                longitude: -122.4077,
                slug: 'aegis-living-san-francisco-ca'
            },
            {
                id: 'aptoblue',
                name: 'Aegis Living Aptos',
                address: '125 Heather Terrace',
                city: 'Aptos',
                state: 'CA',
                zip: '95003',
                phone: '(831) 706-2977',
                latitude: 36.9772,
                longitude: -121.8994,
                slug: 'aegis-living-aptos-ca'
            },
            {
                id: 'cortblue',
                name: 'Aegis Living Corte Madera',
                address: '5555 Paradise Drive',
                city: 'Corte Madera',
                state: 'CA',
                zip: '94925',
                phone: '(415) 483-1399',
                latitude: 37.9255,
                longitude: -122.5277,
                slug: 'aegis-living-corte-madera-ca'
            },
            {
                id: 'shad001',
                name: 'Aegis Living Shadowridge',
                address: '1440 South Melrose Dr',
                city: 'Oceanside',
                state: 'CA',
                zip: '92056',
                phone: '(760) 444-0758',
                latitude: 33.1959,
                longitude: -117.3795,
                slug: 'aegis-living-shadowridge-oceanside-ca'
            },
            {
                id: 'wsea001',
                name: 'Aegis Living West Seattle',
                address: '4700 SW Admiral Way',
                city: 'Seattle',
                state: 'WA',
                zip: '98116',
                phone: '(206) 487-5289',
                latitude: 47.5707,
                longitude: -122.3871,
                slug: 'aegis-living-west-seattle-wa'
            },
            {
                id: 'agnew001',
                name: 'Aegis Gardens Newcastle',
                address: '13056 SE 76th St',
                city: 'Newcastle',
                state: 'WA',
                zip: '98056',
                phone: '(425) 903-3530',
                latitude: 47.5301,
                longitude: -122.1559,
                slug: 'aegis-gardens-newcastle-wa'
            },
            {
                id: 'carm001',
                name: 'Aegis Living Carmichael',
                address: '4050 Walnut Ave',
                city: 'Carmichael',
                state: 'CA',
                zip: '95608',
                phone: '(916) 231-9427',
                latitude: 38.6171,
                longitude: -121.3283,
                slug: 'aegis-living-carmichael-ca'
            },
            {
                id: 'frem001',
                name: 'Aegis Living Fremont',
                address: '3850 Walnut Ave',
                city: 'Fremont',
                state: 'CA',
                zip: '94538',
                phone: '(510) 584-9526',
                latitude: 37.5485,
                longitude: -121.9886,
                slug: 'aegis-living-fremont-ca'
            },
            {
                id: 'klake001',
                name: 'Aegis Living Kirkland Waterfront',
                address: '1002 Lake Street South',
                city: 'Kirkland',
                state: 'WA',
                zip: '98033',
                phone: '(425) 659-3432',
                latitude: 47.6815,
                longitude: -122.2087,
                slug: 'aegis-living-kirkland-waterfront-wa'
            },
            {
                id: 'green001',
                name: 'Aegis Living Greenwood',
                address: '10000 Holman Road NW',
                city: 'Seattle',
                state: 'WA',
                zip: '98177',
                phone: '(206) 202-4588',
                latitude: 47.7209,
                longitude: -122.3546,
                slug: 'aegis-living-greenwood-seattle-wa'
            },
            {
                id: 'issa001',
                name: 'Aegis Living Issaquah',
                address: '780 NW Juniper St',
                city: 'Issaquah',
                state: 'WA',
                zip: '98027',
                phone: '(425) 298-3969',
                latitude: 47.5301,
                longitude: -122.0326,
                slug: 'aegis-living-issaquah-wa'
            },
            {
                id: 'madi001',
                name: 'Aegis Living Madison',
                address: '2200 E Madison St',
                city: 'Seattle',
                state: 'WA',
                zip: '98112',
                phone: '(206) 203-6348',
                latitude: 47.6205,
                longitude: -122.2992,
                slug: 'aegis-living-madison-seattle-wa'
            },
            {
                id: 'lagu001',
                name: 'Aegis Living Laguna Niguel',
                address: '32170 Niguel Rd',
                city: 'Laguna Niguel',
                state: 'CA',
                zip: '92677',
                phone: '(949) 340-9152',
                latitude: 33.5225,
                longitude: -117.7075,
                slug: 'aegis-living-laguna-niguel-ca'
            },
            {
                id: 'gale001n',
                name: 'Aegis Living Queen Anne Galer',
                address: '223 West Galer Street',
                city: 'Seattle',
                state: 'WA',
                zip: '98119',
                phone: '(206) 673-5986',
                latitude: 47.6371,
                longitude: -122.3647,
                slug: 'aegis-living-queen-anne-galer-seattle-wa'
            },
            {
                id: 'agarblue',
                name: 'Aegis Gardens Fremont',
                address: '36281 Fremont Blvd',
                city: 'Fremont',
                state: 'CA',
                zip: '94536',
                phone: '(510) 279-4231',
                latitude: 37.5485,
                longitude: -121.9886,
                slug: 'aegis-gardens-fremont-ca'
            },
            {
                id: 'mora001',
                name: 'Aegis Living Moraga',
                address: '950 Country Club Drive',
                city: 'Moraga',
                state: 'CA',
                zip: '94556',
                phone: '(925) 478-7327',
                latitude: 37.8349,
                longitude: -122.1297,
                slug: 'aegis-living-moraga-ca'
            },
            {
                id: 'ovlk001',
                name: 'Aegis Living Bellevue Overlake',
                address: '1845 116th Avenue NE',
                city: 'Bellevue',
                state: 'WA',
                zip: '98004',
                phone: '(425) 223-3454',
                latitude: 47.6101,
                longitude: -122.2015,
                slug: 'aegis-living-bellevue-overlake-wa'
            },
            {
                id: 'raven001',
                name: 'Aegis Living Ravenna',
                address: '8511 15th Avenue NE',
                city: 'Seattle',
                state: 'WA',
                zip: '98115',
                phone: '(206) 701-567',
                latitude: 47.6819,
                longitude: -122.2861,
                slug: 'aegis-living-ravenna-seattle-wa'
            },
            {
                id: 'laur001',
                name: 'Aegis Living Laurelhurst',
                address: '3200 NE 45th Street',
                city: 'Seattle',
                state: 'WA',
                zip: '98105',
                phone: '(206) 823-1332',
                latitude: 47.6606,
                longitude: -122.2965,
                slug: 'aegis-living-laurelhurst-seattle-wa'
            },
            {
                id: 'redm001',
                name: 'Aegis Living Redmond',
                address: '7480 West Lake Sammamish Parkway NE',
                city: 'Redmond',
                state: 'WA',
                zip: '98052',
                phone: '(425) 786-2040',
                latitude: 47.6740,
                longitude: -122.1215,
                slug: 'aegis-living-redmond-wa'
            },
            {
                id: 'lodgblue',
                name: 'Aegis Lodge Kirkland',
                address: '12629 116th Ave NE',
                city: 'Kirkland',
                state: 'WA',
                zip: '98034',
                phone: '(425) 947-0105',
                latitude: 47.6815,
                longitude: -122.2087,
                slug: 'aegis-lodge-kirkland-wa'
            },
            {
                id: 'blrd001',
                name: 'Aegis Living Ballard',
                address: '949 NW Market Street',
                city: 'Seattle',
                state: 'WA',
                zip: '98107',
                phone: '(425) 947-0105',
                latitude: 47.6681,
                longitude: -122.3847,
                slug: 'aegis-living-ballard-seattle-wa'
            },
            {
                id: 'bellblue',
                name: 'Aegis Living Bellevue',
                address: '148 102nd Ave SE',
                city: 'Bellevue',
                state: 'WA',
                zip: '98004',
                phone: '(425) 298-3979',
                latitude: 47.6101,
                longitude: -122.2015,
                slug: 'aegis-living-bellevue-wa'
            },
            {
                id: 'granblue',
                name: 'Aegis Living Granada Hills',
                address: '10801 Lindley Ave',
                city: 'Granada Hills',
                state: 'CA',
                zip: '91344',
                phone: '(818) 275-4700',
                latitude: 34.2728,
                longitude: -118.5048,
                slug: 'aegis-living-granada-hills-ca'
            },
            {
                id: 'rodgr001',
                name: 'Aegis Living Queen Anne Rodgers Park',
                address: '2900 3rd Avenue West',
                city: 'Seattle',
                state: 'WA',
                zip: '98119',
                phone: '(206) 858-9989',
                latitude: 47.6371,
                longitude: -122.3647,
                slug: 'aegis-living-queen-anne-rodgers-park-seattle-wa'
            },
            {
                id: 'danablue',
                name: 'Aegis Living Dana Point',
                address: '26922 Camino de Estrella',
                city: 'Dana Point',
                state: 'CA',
                zip: '92624',
                phone: '(949) 340-8558',
                latitude: 33.4669,
                longitude: -117.6981,
                slug: 'aegis-living-dana-point-ca'
            },
            {
                id: 'lakeu001',
                name: 'Aegis Living Lake Union',
                address: '1936 Eastlake Avenue East',
                city: 'Seattle',
                state: 'WA',
                zip: '98102',
                phone: '(206) 202-9670',
                latitude: 47.6205,
                longitude: -122.2992,
                slug: 'aegis-living-lake-union-seattle-wa'
            },
            {
                id: 'lynn001',
                name: 'Aegis Living Lynnwood',
                address: '18700 44th Ave W',
                city: 'Lynnwood',
                state: 'WA',
                zip: '98037',
                phone: '(425) 329-7289',
                latitude: 47.8279,
                longitude: -122.3051,
                slug: 'aegis-living-lynnwood-wa'
            },
            {
                id: 'pleablue',
                name: 'Aegis Living Pleasant Hill',
                address: '1660 Oak Park Blvd',
                city: 'Pleasant Hill',
                state: 'CA',
                zip: '94523',
                phone: '(925) 588-7030',
                latitude: 37.9485,
                longitude: -122.0608,
                slug: 'aegis-living-pleasant-hill-ca'
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
                slug: 'aegis-living-kent-wa'
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
                slug: 'aegis-living-shoreline-wa'
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
                slug: 'aegis-living-marymoor-redmond-wa'
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
                slug: 'aegis-living-ventura-ca'
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
                slug: 'aegis-lodge-kirkland-wa'
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
                slug: 'aegis-living-callahan-house-shoreline-wa'
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
                slug: 'aegis-living-mercer-island-wa'
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
                slug: 'aegis-living-napa-ca'
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
                slug: 'aegis-living-san-rafael-ca'
            }
        ],
        timeSlots: {
          startHour: 9,
          endHour: 17,
          duration: 60 // minutes
        },
        hubspot: {
          portalId: 1545762,
          formId: '72d84ddd-4df0-4dc6-bc48-9f6cdec78dde'
        }
      },
      jobInquiry: {
        enabled: true,
        title: 'Job Inquiry',
        steps: ['contact'],
        hubspot: {
          portalId: 1545762,
          formId: '72d84ddd-4df0-4dc6-bc48-9f6cdec78dde'
        }
      },
      residentInquiry: {
        enabled: true,
        title: 'Existing Resident Inquiry',
        steps: ['contact'],
        hubspot: {
          portalId: 1545762,
          formId: '72d84ddd-4df0-4dc6-bc48-9f6cdec78dde'
        }
      },
      contact: {
        enabled: true,
        title: 'Contact Us',
        steps: ['contact'],
        hubspot: {
          portalId: 1545762,
          formId: '72d84ddd-4df0-4dc6-bc48-9f6cdec78dde'
        }
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
    typingText: window.CUSTOM_CLIENT_CONFIG.branding.typingText,
    greetingText: window.CUSTOM_CLIENT_CONFIG.branding.greetingText
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
  // const corePath = window.ChatWidgetCorePath || 'chatembed-v2.js';
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
    
    /* Specific funnel header styling */
    #intendr-chat-widget .intendr-chat-widget .funnel-header h2,
    .intendr-chat-widget .funnel-header h2 {
      margin: 0 !important;
      text-align: center !important;
      font-size: 18px !important;
      font-weight: 500 !important;
      color: white !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      line-height: 1.4 !important;
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
    
    /* Enhanced location display styling */
    #intendr-chat-widget .intendr-location-item,
    .intendr-location-item {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 16px !important;
      border: 1px solid #eee !important;
      border-radius: 8px !important;
      margin-bottom: 12px !important;
      background: white !important;
      transition: all 0.3s ease !important;
    }
    
    #intendr-chat-widget .intendr-location-item:hover,
    .intendr-location-item:hover {
      border-color: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }
    
    #intendr-chat-widget .location-info,
    .location-info {
      flex: 1 !important;
    }
    
    #intendr-chat-widget .location-info h4,
    .location-info h4 {
      margin: 0 0 4px 0 !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
    }
    
    #intendr-chat-widget .location-info p,
    .location-info p {
      margin: 2px 0 !important;
      font-size: 14px !important;
      color: #666 !important;
    }
    
    #intendr-chat-widget .select-location-btn,
    .select-location-btn {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
      color: white !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 8px 16px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
    }
    
    #intendr-chat-widget .select-location-btn:hover,
    .select-location-btn:hover {
      background: linear-gradient(135deg, ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 0%, ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} 100%) !important;
      transform: translateY(-1px) !important;
    }
    
    /* Google Places Autocomplete styling */
    .pac-container {
      z-index: 2147483649 !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      border: 1px solid #ddd !important;
      background: white !important;
      position: absolute !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    
    .pac-item {
      padding: 8px 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.fontColor} !important;
      cursor: pointer !important;
      border-bottom: 1px solid #f0f0f0 !important;
    }
    
    .pac-item:hover {
      background-color: #f8f9fa !important;
    }
    
    .pac-item:last-child {
      border-bottom: none !important;
    }
    
    /* Hide "Powered by Google" text */
    .pac-container:after {
      display: none !important;
    }
    
    /* Alternative method to hide Google branding */
    .pac-container .pac-item:last-child {
      display: none !important;
    }
    
    /* Ensure autocomplete is visible in chat widget */
    #intendr-chat-widget .pac-container,
    .intendr-chat-widget .pac-container {
      z-index: 2147483649 !important;
    }
    
    /* Force autocomplete above everything */
    .pac-container {
      z-index: 2147483649 !important;
      position: absolute !important;
    }
    
    /* Ensure location search container properly contains dropdown */
    .location-search {
      position: relative !important;
      overflow: visible !important;
    }
    
    /* Selected location styling */
    #intendr-chat-widget .selected-location,
    .selected-location {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
      border: 2px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      border-radius: 12px !important;
      padding: 20px !important;
      margin-bottom: 20px !important;
    }
    
    #intendr-chat-widget .selected-location-header,
    .selected-location-header {
      text-align: center !important;
      margin-bottom: 16px !important;
    }
    
    #intendr-chat-widget .selected-location-header h4,
    .selected-location-header h4 {
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      margin: 0 0 4px 0 !important;
      font-size: 16px !important;
      font-weight: 600 !important;
    }
    
    #intendr-chat-widget .selected-location-header p,
    .selected-location-header p {
      color: #666 !important;
      margin: 0 !important;
      font-size: 14px !important;
    }
    
    #intendr-chat-widget .location-item.selected,
    .location-item.selected {
      background: white !important;
      border: 2px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      box-shadow: 0 4px 12px rgba(0, 65, 116, 0.15) !important;
    }
    
    #intendr-chat-widget .selected-badge,
    .selected-badge {
      background: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      color: white !important;
      padding: 4px 8px !important;
      border-radius: 12px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      display: inline-block !important;
      margin-top: 8px !important;
    }
    
    /* Currently selected location in list styling */
    #intendr-chat-widget .location-item.currently-selected,
    .location-item.currently-selected {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
      border: 2px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      box-shadow: 0 4px 12px rgba(0, 65, 116, 0.15) !important;
      order: -1 !important;
    }
    
    #intendr-chat-widget .currently-selected-badge,
    .currently-selected-badge {
      background: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      color: white !important;
      padding: 4px 8px !important;
      border-radius: 12px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      display: inline-block !important;
      margin-top: 8px !important;
    }
    
    /* Clickable location items */
    #intendr-chat-widget .location-item.clickable,
    .location-item.clickable {
      cursor: pointer !important;
      transition: all 0.3s ease !important;
    }
    
    #intendr-chat-widget .location-item.clickable:hover,
    .location-item.clickable:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
      border-color: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
    }
    
    /* Select indicator styling */
    #intendr-chat-widget .select-indicator,
    .select-indicator {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 32px !important;
      height: 32px !important;
      border-radius: 50% !important;
      background: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      color: white !important;
      font-size: 18px !important;
      font-weight: bold !important;
      transition: all 0.3s ease !important;
    }
    
    #intendr-chat-widget .location-item.clickable:hover .select-indicator,
    .location-item.clickable:hover .select-indicator {
      background: ${window.CUSTOM_CLIENT_CONFIG.theme.secondaryColor} !important;
      transform: scale(1.1) !important;
    }
    
    #intendr-chat-widget .location-item.currently-selected .select-indicator,
    .location-item.currently-selected .select-indicator {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
    }
    
    #intendr-chat-widget .change-location-section,
    .change-location-section {
      text-align: center !important;
      margin-top: 16px !important;
      padding-top: 16px !important;
      border-top: 1px solid rgba(0, 65, 116, 0.1) !important;
    }
    
    #intendr-chat-widget .change-location-section p,
    .change-location-section p {
      margin: 0 0 12px 0 !important;
      color: #666 !important;
      font-size: 14px !important;
    }
    
    #intendr-chat-widget .all-locations-section,
    .all-locations-section {
      margin-top: 20px !important;
    }
    
    /* Loading message styling */
    #intendr-chat-widget .chat-message.bot.loading,
    .chat-message.bot.loading {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%) !important;
      border: 1px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      color: ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      font-style: italic !important;
      position: relative !important;
      padding-right: 40px !important;
    }
    
    @keyframes spin {
      0% { transform: translateY(-50%) rotate(0deg); }
      100% { transform: translateY(-50%) rotate(360deg); }
    }
    
    /* Explicit spinner element for loading messages */
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${window.CUSTOM_CLIENT_CONFIG.theme.primaryColor} !important;
      border-top: 2px solid transparent !important;
      border-radius: 50%;
      animation: spin 1s linear infinite !important;
      vertical-align: middle;
      margin-left: 8px;
      margin-bottom: 2px;
      position: relative;
      top: 0;
    }
  `;
  document.head.appendChild(clientStyles);
} // Close the if statement

// Load Google Maps API for autocomplete functionality
function loadGoogleMapsAPI() {
  if (window.google && window.google.maps) {
    console.log('[Aegis] Google Maps API already loaded');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${window.CUSTOM_CLIENT_CONFIG.googleMaps.apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('[Aegis] Google Maps API loaded successfully');
      resolve();
    };
    
    script.onerror = () => {
      console.error('[Aegis] Failed to load Google Maps API');
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get coordinates from Google Places API
async function getCoordinatesFromPlace(placeDescription) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps API not loaded'));
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: placeDescription }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng()
        });
      } else {
        reject(new Error('Could not geocode address'));
      }
    });
  });
}

// Sort locations by distance from selected city
function sortLocationsByDistance(locations, userLat, userLng) {
  return locations.map(location => ({
    ...location,
    distance: calculateDistance(userLat, userLng, location.latitude, location.longitude)
  })).sort((a, b) => a.distance - b.distance);
}

// Enhanced funnel functionality with Google Places integration
window.IntendrEnhancedFunnel = {
  // Initialize Google Maps API and autocomplete
  async initGoogleMaps() {
    try {
      await loadGoogleMapsAPI();
      return true;
    } catch (error) {
      console.error('[Aegis] Failed to initialize Google Maps:', error);
      return false;
    }
  },

  // Create autocomplete input for location search
  createLocationAutocomplete(inputElement, onLocationSelect) {
    if (!window.google || !window.google.maps) {
      console.error('[Aegis] Google Maps API not available');
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
      types: ['(cities)'],
      componentRestrictions: { country: 'us' }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          description: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        onLocationSelect(location);
      }
    });

    return autocomplete;
  },

  // Sort and display locations based on user's selected city
  async sortAndDisplayLocations(userLocation, locations) {
    try {
      const sortedLocations = sortLocationsByDistance(
        locations, 
        userLocation.lat, 
        userLocation.lng
      );

      // Update the locations display with distance information
      const locationList = document.querySelector('.intendr-location-list');
      if (locationList) {
        locationList.innerHTML = '';
        
        sortedLocations.forEach(location => {
          const locationElement = document.createElement('div');
          locationElement.className = 'intendr-location-item';
          locationElement.innerHTML = `
            <div class="location-info">
              <h4>${location.name}</h4>
              <p>${location.address}, ${location.city}, ${location.state} ${location.zip}</p>
              <p><strong>${location.distance.toFixed(1)} miles away</strong></p>
            </div>
            <button class="select-location-btn" data-location-id="${location.id}">
              Select
            </button>
          `;
          locationList.appendChild(locationElement);
        });
      }

      return sortedLocations;
    } catch (error) {
      console.error('[Aegis] Error sorting locations:', error);
      return locations; // Return original order if sorting fails
    }
  }
};

// Load core widget immediately
  loadCoreWidget();