// ===== AEGIS CLIENT CUSTOMIZATIONS =====
// Edit these settings for your specific client implementation

// === CLIENT CONFIGURATION (EDIT THESE) ===
const CUSTOM_CLIENT_CONFIG = {
  // Webhook & API Settings
  webhook: {
    url: 'https://automation.cloudcovehosting.com/webhook/b1bdfe90-cbf0-4d3a-8e4b-fa3359344b57/chat',
    route: 'general'
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
    voiceCall: 'https://automation.cloudcovehosting.com/webhook/intendr-call'
  },
  
  // Behavior Settings
  settings: {
    utmCampaign: 'Aegis-AIChat',
    sessionDuration: 48, // hours
    phoneValidation: 'US', // 'US', 'INTL', or 'NONE'
    overtakeModal: false,
    overtakePath: '/'
  }
};

// ===== TECHNICAL IMPLEMENTATION (DON'T EDIT BELOW) =====

// Apply client customizations to core system
window.ChatWidgetCustomConfig = {
  endpoints: {
    pageContext: CUSTOM_CLIENT_CONFIG.endpoints.pageContext,
    voiceCall: CUSTOM_CLIENT_CONFIG.endpoints.voiceCall,
    ipify: 'https://api.ipify.org?format=json'
  },
  
  storageKeys: {
    chatSession: 'aegisChatSession',
    chatState: 'aegisChatState',
    pageSummary: 'aegisPageSummary',
    navLinks: 'aegis_nav_links',
    overtakeShown: 'aegisOvertakeShown'
  },
  
  settings: {
    utmCampaign: CUSTOM_CLIENT_CONFIG.settings.utmCampaign,
    sessionValidity: CUSTOM_CLIENT_CONFIG.settings.sessionDuration * 60 * 60 * 1000,
    enableCustomFeatures: true
  },
  
  branding: {
    name: CUSTOM_CLIENT_CONFIG.branding.name,
    typingText: CUSTOM_CLIENT_CONFIG.branding.typingText,
    greetingText: CUSTOM_CLIENT_CONFIG.branding.greetingText
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
  webhook: CUSTOM_CLIENT_CONFIG.webhook,
  branding: {
    logo: CUSTOM_CLIENT_CONFIG.branding.logo,
    name: CUSTOM_CLIENT_CONFIG.branding.name,
    welcomeText: CUSTOM_CLIENT_CONFIG.branding.welcomeText
  },
  style: {
    primaryColor: CUSTOM_CLIENT_CONFIG.theme.primaryColor,
    secondaryColor: CUSTOM_CLIENT_CONFIG.theme.secondaryColor,
    position: CUSTOM_CLIENT_CONFIG.theme.position,
    backgroundColor: CUSTOM_CLIENT_CONFIG.theme.backgroundColor,
    fontColor: CUSTOM_CLIENT_CONFIG.theme.fontColor
  },
  business: CUSTOM_CLIENT_CONFIG.business,
  overtake: CUSTOM_CLIENT_CONFIG.settings.overtakeModal,
  overtakePath: CUSTOM_CLIENT_CONFIG.settings.overtakePath,
  initialButtons: [
    {
      text: 'Schedule A Tour',
      message: 'I would like to schedule a tour.'
    },
    {
      text: 'Ask A Question',
      message: 'I would like to ask a question.'
    },
    {
      text: 'Careers',
      message: 'I am looking for career opportunities.'
    },
    {
      text: 'Volunteer',
      message: 'I would like to volunteer at Aegis Living.'
    }
  ]
};

// Note: Analytics are handled by the core widget automatically
// The core widget tracks all events and sends them to /api/analytics/track
// with the chatbot ID automatically extracted from the webhook URL

// Auto-load core widget
function loadCoreWidget() {
  // const corePath = window.ChatWidgetCorePath || 'https://n8n-chat-embed.pages.dev/chatembed.js';
  const corePath = window.ChatWidgetCorePath || 'chatembed.js';

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

// Initialize client customizations
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Aegis] Aegis customizations loaded');
  
  // Apply client theme styles
  const clientStyles = document.createElement('style');
  clientStyles.textContent = `
    /* Aegis theme colors */
    .intendr-chat-widget .brand-header {
      background: linear-gradient(135deg, ${CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
    }
    
    .intendr-chat-widget .chat-message.user {
      background: linear-gradient(135deg, ${CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
    }
    
    .intendr-chat-widget .chat-input button,
    .intendr-chat-widget #intendr-voice-button,
    .intendr-chat-widget .chat-toggle {
      background: linear-gradient(135deg, ${CUSTOM_CLIENT_CONFIG.theme.primaryColor} 0%, ${CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 100%) !important;
      transition: background 0.3s ease !important;
    }
    
    .intendr-chat-widget .chat-toggle:hover,
    .intendr-chat-widget .chat-input button:hover,
    .intendr-chat-widget #intendr-voice-button:hover {
      background: linear-gradient(135deg, ${CUSTOM_CLIENT_CONFIG.theme.secondaryColor} 0%, ${CUSTOM_CLIENT_CONFIG.theme.primaryColor} 100%) !important;
    }
    
    /* Aegis special styling */
    .aegis-priority {
      border: 2px solid #ffd700 !important;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.5) !important;
    }
    
    .intendr-chat-widget .chat-container {
      border: 1px solid rgba(102, 126, 234, 0.2) !important;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15) !important;
    }
  `;
  document.head.appendChild(clientStyles);
  
  // Load core widget
  loadCoreWidget();
}); 