// CLIENT-SPECIFIC customizations for Intendr Chat Widget Template
// This file should be loaded BEFORE chatembed.js
// 
// INSTRUCTIONS:
// 1. Replace "CLIENT" with your client name (e.g., "Acme", "TechCorp", etc.)
// 2. Update endpoints to point to your client-specific automation URLs
// 3. Customize branding, settings, and hooks as needed
// 4. Remove or modify hooks you don't need

window.ChatWidgetCustomConfig = {
  endpoints: {
    // REQUIRED: Update these URLs for your client
    pageContext: 'https://YOUR-CLIENT-automation.cloudcovehosting.com/webhook/pagecontext',
    voiceCall: 'https://YOUR-CLIENT-automation.cloudcovehosting.com/webhook/voice-call',
    // OPTIONAL: Keep default or customize
    ipify: 'https://api.ipify.org?format=json'
  },
  
  storageKeys: {
    // OPTIONAL: Customize storage keys with your client prefix
    chatSession: 'yourClientChatSession',
    chatState: 'yourClientChatState',
    pageSummary: 'yourClientPageSummary',
    navLinks: 'your_client_nav_links',
    overtakeShown: 'yourClientOvertakeShown'
  },
  
  settings: {
    // OPTIONAL: Override default settings
    utmCampaign: 'YourClient-AIChat',
    sessionValidity: 24 * 60 * 60 * 1000, // 24 hours (default)
    // Add custom settings here
    enableCustomFeatures: true
  },
  
  branding: {
    // OPTIONAL: Override branding
    name: 'Your Client AI Assistant',
    typingText: 'Your Client is typing',
    greetingText: 'Hello! I am your Client AI Assistant.'
  },
  
  hooks: {
    // OPTIONAL: Custom functionality hooks
    
    // Modify user messages before sending
    beforeSendMessage: async function(message) {
      // Example: Add client-specific preprocessing
      // if (message.toLowerCase().includes('special keyword')) {
      //   return message + ' [CLIENT_SPECIAL]';
      // }
      
      // Example: Analytics tracking
      // if (window.yourClientAnalytics) {
      //   window.yourClientAnalytics.trackMessage('user_message', message);
      // }
      
      return message; // Return modified message or original
    },
    
    // Process bot responses after receiving
    afterReceiveMessage: async function(message, messageElement) {
      // Example: Add client-specific styling
      // if (message.includes('SPECIAL_FLAG')) {
      //   messageElement.style.border = '2px solid gold';
      // }
      
      // Example: Analytics tracking
      // if (window.yourClientAnalytics) {
      //   window.yourClientAnalytics.trackMessage('bot_response', message);
      // }
    },
    
    // Validate/modify phone calls before initiating
    beforePhoneCall: async function(callType, phone) {
      // Example: Client-specific validation
      // if (!phone.startsWith('+1')) {
      //   alert('YourClient requires US phone numbers (+1)');
      //   return false; // Cancel the call
      // }
      
      // Example: Analytics tracking
      // if (window.yourClientAnalytics) {
      //   window.yourClientAnalytics.trackPhoneCall('initiated', callType, phone);
      // }
      
      return true; // Allow the call to proceed
    },
    
    // Handle phone call completion
    afterPhoneCall: async function(callType, phone, result) {
      // Example: Analytics tracking
      // if (window.yourClientAnalytics) {
      //   window.yourClientAnalytics.trackPhoneCall('completed', callType, phone, result);
      // }
      
      // Example: CRM integration
      // if (result.status === 'success') {
      //   fetch('https://your-client-crm.example.com/api/call-completed', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       phone: phone,
      //       callType: callType,
      //       timestamp: new Date().toISOString(),
      //       result: result
      //     })
      //   }).catch(err => console.error('[YourClient] CRM sync failed:', err));
      // }
    },
    
    // Custom message processing and transformations
    customMessageProcessing: async function(cleanedMessage, originalMessage) {
      let processedMessage = cleanedMessage;
      
      // Example: Replace generic terms with client-specific ones
      // processedMessage = processedMessage.replace(/contact us/gi, 'contact YourClient');
      
      // Example: Add client-specific disclaimers
      // if (processedMessage.includes('pricing') || processedMessage.includes('cost')) {
      //   processedMessage += '<br><small><em>* YourClient pricing subject to additional terms</em></small>';
      // }
      
      // Example: Handle client-specific response formatting
      // if (originalMessage.includes('[CLIENT_SPECIAL_OFFER]')) {
      //   processedMessage = `
      //     <div style="background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%); color: white; padding: 15px; border-radius: 10px; margin: 10px 0;">
      //       <h4 style="margin: 0 0 10px 0;">🎉 Exclusive YourClient Offer!</h4>
      //       <p style="margin: 0;">${processedMessage}</p>
      //     </div>
      //   `;
      // }
      
      return processedMessage;
    }
  }
};

// OPTIONAL: Client-specific analytics setup
/*
window.yourClientAnalytics = {
  trackMessage: function(type, message) {
    fetch('https://your-client-analytics.example.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'chat_message',
        type: type,
        message: message,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    }).catch(err => console.error('[YourClient] Analytics failed:', err));
  },
  
  trackPhoneCall: function(action, callType, phone, result = null) {
    fetch('https://your-client-analytics.example.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'phone_call',
        action: action,
        callType: callType,
        phone: phone,
        result: result,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    }).catch(err => console.error('[YourClient] Analytics failed:', err));
  }
};
*/

// Set standard widget configuration
window.ChatWidgetConfig = {
  webhook: {
    url: 'https://your-automation-url.com/webhook/your-webhook-id/chat',
    route: 'general' // or 'specific-route'
  },
  branding: {
    logo: 'https://your-logo-url.com/logo.png',
    name: 'Your Client AI Assistant',
    welcomeText: 'Welcome! How can we help you today?'
  },
  style: {
    primaryColor: '#your-primary-color',
    secondaryColor: '#your-secondary-color',
    position: 'right', // 'left' or 'right'
    backgroundColor: '#ffffff',
    fontColor: '#333333'
  },
  business: {
    name: 'Your Business Name',
    phone: '+1-555-123-4567',
    website: 'https://your-website.com',
    searchPage: 'https://your-website.com/search',
    provider: 'Your Business'
  },
  overtake: false, // Set to true to enable overtake modal
  overtakePath: '/', // Path to redirect for overtake
  
  // OPTIONAL: Initial quick action buttons (2x2 grid)
  initialButtons: [
    {
      text: 'Get Started',
      message: 'I would like to get started.'
    },
    {
      text: 'Ask Question',
      message: 'I have a question.'
    },
    {
      text: 'Contact Sales',
      message: 'I would like to speak with sales.'
    },
    {
      text: 'Support',
      message: 'I need technical support.'
    }
  ]
  // Note: Remove initialButtons array or set to [] to disable initial buttons
};

// Auto-load core chat widget after customizations are set
function loadCoreWidget() {
  const script = document.createElement('script');
  script.src = './chatembed.js'; // Adjust path as needed
  script.onload = function() {
    console.log('[YourClient] Core widget loaded successfully');
  };
  script.onerror = function() {
    console.error('[YourClient] Failed to load core widget');
  };
  document.head.appendChild(script);
}

// OPTIONAL: Client-specific initialization and styling
document.addEventListener('DOMContentLoaded', function() {
  console.log('[YourClient] Client customizations loaded');
  
  // OPTIONAL: Add client-specific CSS
  /*
  const clientStyles = document.createElement('style');
  clientStyles.textContent = `
    // Custom CSS for your client
    .intendr-chat-widget .brand-header {
      background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%) !important;
    }
    
    .intendr-chat-widget .chat-message.user {
      background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%) !important;
    }
    
    .intendr-chat-widget .chat-input button,
    .intendr-chat-widget #intendr-voice-button {
      background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%) !important;
    }
  `;
  document.head.appendChild(clientStyles);
  */
  
  // Load core widget
  loadCoreWidget();
}); 