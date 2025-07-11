// Chat Widget Script - Version 1.9.2

// ===== CONFIGURATION SYSTEM =====
// Default configuration - can be overridden by client-specific files
const DEFAULT_CONFIG = {
  endpoints: {
    pageContext: 'https://automation.cloudcovehosting.com/webhook/intendr-pagecontext',
    voiceCall: 'https://automation.cloudcovehosting.com/webhook/intendr-call-aegis',
    ipify: 'https://api.ipify.org?format=json',
    leadSubmission: 'https://automation.cloudcovehosting.com/webhook/aegis-submit-lead'
  },
  storageKeys: {
    chatSession: 'intendrChatSession',
    chatState: 'intendrChatState',
    pageSummary: 'intendrPageSummary',
    navLinks: 'intendr_nav_links',
    overtakeShown: 'intendrOvertakeShown',
    funnelData: 'intendrFunnelData'
  },
  settings: {
    version: "2.0",
    sessionValidity: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    inactivityTimeout: 120000, // 2 minutes
    promptBubbleTimeout: 120000, // 2 minutes
    utmCampaign: 'Intendr-AIChat'
  },
  branding: {
    name: 'Intendr : AI Assistant',
    typingText: 'Assistant is typing',
    greetingText: 'Hi I am your AI assistant!'
  },
  hooks: {
    beforeSendMessage: null,
    afterReceiveMessage: null,
    beforePhoneCall: null,
    afterPhoneCall: null,
    customMessageProcessing: null
  },
  funnels: {
    scheduleTour: {
      enabled: true,
      title: 'Schedule a Tour',
      steps: ['location', 'datetime', 'contact'],
      locations: [], // Will be populated from client config
      timeSlots: {
        startHour: 9,
        endHour: 17,
        duration: 60 // minutes
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
  }
};

// Merge with client-specific configuration if it exists
const CLIENT_CONFIG = window.ChatWidgetCustomConfig || {};
const MERGED_CONFIG = deepMerge(DEFAULT_CONFIG, CLIENT_CONFIG);

// Extract merged configuration for backward compatibility
const INTENDR_API_ENDPOINTS = MERGED_CONFIG.endpoints;
const INTENDR_STORAGE_KEYS = MERGED_CONFIG.storageKeys;
const INTENDR_SETTINGS = MERGED_CONFIG.settings;
const INTENDR_BRANDING = MERGED_CONFIG.branding;
const INTENDR_HOOKS = MERGED_CONFIG.hooks;

// Expose merged config globally for debugging and client access
window.MERGED_CONFIG = MERGED_CONFIG;

// Deep merge utility function
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Simple phone call tracking
window.IntendrPhoneCallActive = false;

  // Load tracking pixel immediately for visitor tracking
  (function() {
    // Extract chatbot ID immediately from config
    function getChatbotIdFromConfig() {
      if (!window.ChatWidgetConfig?.webhook?.url) {
        console.warn('No webhook URL found in ChatWidgetConfig');
        return null;
      }
      
      try {
        const webhookUrl = window.ChatWidgetConfig.webhook.url;
        const matches = webhookUrl.match(/\/webhook\/([^\/]+)/);
        if (matches && matches[1]) {
          return matches[1].replace(/\/chat$/, '');
        }
      } catch (err) {
        console.error('Error extracting chatbot ID for tracking pixel:', err);
      }
      return null;
    }
    
    const chatbotId = getChatbotIdFromConfig();
    
    if (chatbotId && !window.IntendrTrackingInitialized) {
      console.log('🎯 [Tracking Pixel] Loading tracking pixel immediately for chatbot:', chatbotId);
      
      // Create script element for tracking pixel
      const trackingScript = document.createElement('script');
      trackingScript.src = 'https://intendr.ai/api/tracking-pixel';
      trackingScript.setAttribute('data-chatbot-id', chatbotId);
      trackingScript.async = true;
      trackingScript.defer = true;
      
      // Add error handling
      trackingScript.onerror = function() {
        console.warn('🚨 [Tracking Pixel] Failed to load tracking pixel script');
      };
      
      trackingScript.onload = function() {
        console.log('✅ [Tracking Pixel] Tracking pixel loaded immediately and tracking visitors');
      };
      
      // Add to document head
      document.head.appendChild(trackingScript);
    }
  })();

  // Main chat widget code
  (function() {
    // Configuration
    const CHAT_VERSION = "2.0";
    console.log("ChatVersion:", CHAT_VERSION);
    
    // Store user IP globally
    let userIP = '';
    
    // Fetch user IP address
    async function fetchUserIP() {
      try {
        const response = await fetch(INTENDR_API_ENDPOINTS.ipify);
        const data = await response.json();
        userIP = data.ip;
        console.log('User IP collected for chat');
      } catch (error) {
        console.error('Error fetching IP:', error);
        userIP = 'unknown';
      }
    }
    
    // Call IP fetch on initialization
    fetchUserIP();
    
    // Default configuration
    const defaultConfig = {
      webhook: { url: '', route: '' },
      branding: { 
        logo: 'https://cdn-icons-png.flaticon.com/512/5962/5962463.png', 
        name: 'Intendr : AI Assistant', 
        welcomeText: '' 
      },
      style: { 
        primaryColor: '#003f72', 
        secondaryColor: '#003f72', 
        position: 'right',
        backgroundColor: '#ffffff',
        fontColor: '#333333'
      },
      business: { name: '', phone: '', website: '', searchPage: '', provider: '' },
      overtake: false,
      initialButtons: []
    };
    
    // Merge user config with defaults
    const config = window.ChatWidgetConfig ? {
      webhook: { ...defaultConfig.webhook, ...window.ChatWidgetConfig.webhook },
      branding: { ...defaultConfig.branding, ...window.ChatWidgetConfig.branding },
      style: { ...defaultConfig.style, ...window.ChatWidgetConfig.style },
      business: { ...defaultConfig.business, ...window.ChatWidgetConfig.business },
      overtake: window.ChatWidgetConfig.overtake || false,
      overtakePath: window.ChatWidgetConfig.overtakePath || '/',
      initialButtons: window.ChatWidgetConfig.initialButtons || []
    } : defaultConfig;
    
    // Prevent multiple initializations
    if (window.IntendrChatWidgetInitialized) return;
    window.IntendrChatWidgetInitialized = true;
    
    // Initialize session ID early for analytics tracking
    let currentSessionId = '';
    
    // Analytics tracking function (declared early to avoid reference errors)
    async function trackAnalyticsEvent(eventType, additionalData = {}) {
      try {
        // Extract chatbot ID from webhook URL
        let chatbotId = '';
        try {
          const webhookUrl = config.webhook.url;
          const matches = webhookUrl.match(/\/webhook\/([^\/]+)/);
          if (matches && matches[1]) {
            chatbotId = matches[1].replace(/\/chat$/, '');
          }
        } catch (err) {
          console.error('Error extracting chatbot ID for analytics:', err);
          return;
        }

        if (!chatbotId) {
          console.warn('No chatbot ID found for analytics tracking');
          return;
        }

        // Prepare tracking data
        const trackingData = {
          chatbotId: chatbotId,
          sessionId: getAnalyticsSessionId(), // Use consistent analytics sessionId
          event: eventType,
          metadata: {
            chatSessionId: currentSessionId || null, // Individual chat conversation ID
            userAgent: navigator.userAgent,
            utmParams: window.initialUtmParameters || {},
            pageUrl: window.location.href,
            referrer: document.referrer || null,
            fingerprint: generateBrowserFingerprint(),
            language: navigator.language,
            screenResolution: screen.width + 'x' + screen.height,
            ip: userIP,
            timestamp: new Date().toISOString(),
            ...additionalData
          }
        };

        // Log the payload being sent for debugging
        console.log('📊 [Analytics] Sending payload:', JSON.stringify(trackingData, null, 2));
        console.log('📊 [Analytics] Event type:', eventType, '| Timestamp:', new Date().toLocaleTimeString());

        // Send to analytics API
        const response = await fetch('https://intendr.ai/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(trackingData)
        });

        if (response.ok) {
          console.log(`✅ [Analytics] ${eventType} tracked successfully - Status: ${response.status}`);
        } else {
          console.warn(`❌ [Analytics] Failed to track ${eventType} - Status: ${response.status}`);
          console.warn(`❌ [Analytics] Response:`, await response.text());
        }
      } catch (error) {
        console.warn('🚨 [Analytics] Tracking error:', error);
      }
    }

    // Generate browser fingerprint for deduplication
    function generateBrowserFingerprint() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Browser fingerprint', 2, 2);
        
        const fingerprint = [
          navigator.userAgent,
          navigator.language,
          screen.width + 'x' + screen.height,
          new Date().getTimezoneOffset(),
          canvas.toDataURL()
        ].join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          const char = fingerprint.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        
        return 'fp_' + Math.abs(hash).toString(36);
      } catch (error) {
        return 'fp_' + Math.random().toString(36).substring(2, 15);
      }
    }

    // Tracking pixel is now loaded immediately at script start (see above)
    
    // Track visitor directly since tracking pixel has endpoint bug
    const visitorTrackingKey = 'intendr_visitor_tracked_session';
    const sessionKey = window.sessionStorage.getItem(visitorTrackingKey);
    if (!sessionKey) {
      console.log('🎯 [Analytics] New visitor detected - tracking page load event directly');
      trackAnalyticsEvent('visitor');
      window.sessionStorage.setItem(visitorTrackingKey, 'true');
    } else {
      console.log('🔄 [Analytics] Returning visitor - skipping duplicate tracking');
    }
    console.log('🎯 [Analytics] Visitor tracking handled directly by chat widget (tracking pixel has endpoint bug)');
    
    // Track page visibility changes (after initial visitor tracking)
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        console.log('👁️ [Analytics] Page visibility changed - user returned to tab');
        // User came back to page - track page view
        trackAnalyticsEvent('page_view');
      }
    });
    
    // Flag to track if user has manually closed the chat in this session
    let userManuallyClosedChat = false;
    
    // Function to check if chat was manually closed
    function checkIfChatWasManuallyClosed() {
      try {
        const chatState = sessionStorage.get(INTENDR_STORAGE_KEYS.chatState);
        if (chatState) {
          const state = JSON.parse(chatState);
          return state.manuallyClosed || false;
        }
      } catch (error) {
        console.error('Error reading chat state:', error);
      }
      return false;
    }

    // Function to save chat state
    function saveChatState(manuallyClosed) {
      try {
        const state = {
          manuallyClosed: manuallyClosed,
          timestamp: new Date().getTime()
        };
        sessionStorage.set(INTENDR_STORAGE_KEYS.chatState, JSON.stringify(state));
      } catch (error) {
        console.error('Error saving chat state:', error);
      }
    }
    
    // Function to show initial buttons
    function showInitialButtons() {
      // Simple check: if no initial buttons configured, return
      if (!config.initialButtons || config.initialButtons.length === 0) return;
      
      const buttonsContainer = chatContainer.querySelector('.initial-buttons-container');
      if (!buttonsContainer) return;
      
      // Don't interfere with action buttons - if container has action-buttons class, leave it alone
      if (buttonsContainer.classList.contains('action-buttons')) {
        return;
      }
      
      // Check if there are any user messages in the chat
      const messagesContainer = chatContainer.querySelector('.chat-messages');
      const userMessages = messagesContainer ? messagesContainer.querySelectorAll('.chat-message.user') : [];
      
      if (userMessages.length > 0) {
        // User has sent messages, hide buttons (only if not action buttons)
        buttonsContainer.style.display = 'none';
        return;
      }
      
      // No user messages, show the buttons
      buttonsContainer.innerHTML = '';
      
              config.initialButtons.forEach(buttonConfig => {
          const button = document.createElement('button');
          button.className = 'initial-button';
          button.textContent = buttonConfig.text;
          button.onclick = function() {
            console.log('[DEBUG] Initial button clicked:', buttonConfig.text);
            console.log('[DEBUG] Button message:', buttonConfig.message);
            
            // Check if the button message should trigger a funnel instead of sending a message
            const funnelType = detectFunnelFromMessage(buttonConfig.message);
            console.log('[DEBUG] Detected funnel type:', funnelType);
            
            if (funnelType) {
              console.log('[DEBUG] Starting funnel:', funnelType);
              if (!chatContainer.classList.contains('open')) {
                showChat();
                setTimeout(() => startFunnel(funnelType), 300);
              } else {
                startFunnel(funnelType);
              }
            } else {
              console.log('[DEBUG] No funnel detected, sending message');
              // Send the predefined message (sendMessage handles both UI and backend)
              sendMessage(buttonConfig.message);
            }
            
            // After sending, check buttons again (will hide them since user message now exists)
            setTimeout(showInitialButtons, 100);
          };
          buttonsContainer.appendChild(button);
        });
      
      buttonsContainer.style.display = 'grid';
    }
    
    // Function to hide initial buttons
    function hideInitialButtons() {
      const buttonsContainer = chatContainer.querySelector('.initial-buttons-container');
      if (buttonsContainer) {
        buttonsContainer.style.display = 'none';
      }
    }
    
    // Function to parse action tags from bot messages and generate action buttons
    function parseAndShowActionButtons(message) {
      console.log('[DEBUG] parseAndShowActionButtons called with message:', message);
      
      const buttonsContainer = chatContainer.querySelector('.initial-buttons-container');
      console.log('[DEBUG] buttonsContainer found:', !!buttonsContainer);
      if (!buttonsContainer) return message;
      
      // Clear any existing action buttons
      clearActionButtons();
      
      const actionButtons = [];
      let processedMessage = message;
      
      // Parse [phone] tags with optional btntext attribute
      const phoneRegex = /\[phone(?:\s+btntext="([^"]*)")?\](.*?)\[\/phone\]/g;
      let phoneMatch;
      while ((phoneMatch = phoneRegex.exec(message)) !== null) {
        const buttonText = phoneMatch[1] || 'Call Now';
        const phoneNumber = phoneMatch[2];
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(phoneMatch[0], '');
        
        // Add action button
        actionButtons.push({
          text: buttonText,
          action: () => window.open(`tel:${cleanPhone}`, '_self')
        });
      }
      
      // Parse [url] tags with optional btntext attribute
      const urlRegex = /\[url(?:\s+btntext="([^"]*)")?\](.*?)\[\/url\]/g;
      let urlMatch;
      while ((urlMatch = urlRegex.exec(message)) !== null) {
        const buttonText = urlMatch[1] || 'Visit Page';
        const url = urlMatch[2];
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(urlMatch[0], '');
        
        // Add action button
        actionButtons.push({
          text: buttonText,
          action: () => window.open(url, '_blank')
        });
      }
      
      // Parse [button] tags
      const buttonRegex = /\[button message="(.*?)"\](.*?)\[\/button\]/g;
      let buttonMatch;
      while ((buttonMatch = buttonRegex.exec(message)) !== null) {
        const buttonMessage = buttonMatch[1];
        const buttonText = buttonMatch[2];
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(buttonMatch[0], '');
        
        // Check if the button message should trigger a funnel instead of sending a message
        const funnelType = detectFunnelFromMessage(buttonMessage);
        
        if (funnelType) {
          // Add funnel action button
          actionButtons.push({
            text: buttonText,
            action: () => startFunnel(funnelType)
          });
        } else {
          // Add regular message action button
          actionButtons.push({
            text: buttonText,
            action: () => sendMessage(buttonMessage)
          });
        }
      }

      // If no explicit action buttons were found, look for phone numbers in the message
      if (actionButtons.length === 0) {
        // Phone number regex that matches various formats
        const phoneNumberRegex = /(?:^|\s)(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})(?:\s|$)/g;
        let phoneNumberMatch;
        
        while ((phoneNumberMatch = phoneNumberRegex.exec(message)) !== null) {
          const fullMatch = phoneNumberMatch[0].trim();
          const cleanPhone = fullMatch.replace(/[^\d+]/g, '');
          
          // Create a button text that includes the location if mentioned
          let buttonText = 'Call Now';
          const locationMatch = message.match(/Aegis Living\s+([^,.]+)/i);
          if (locationMatch) {
            buttonText = `Call ${locationMatch[1]}`;
          }
          
          // Add action button
          actionButtons.push({
            text: buttonText,
            action: () => window.open(`tel:${cleanPhone}`, '_self')
          });
        }
      }
      
      // Show action buttons if any were found
      console.log('[DEBUG] actionButtons found:', actionButtons.length, actionButtons);
      if (actionButtons.length > 0) {
        console.log('[DEBUG] Calling showActionButtons');
        showActionButtons(actionButtons);
      } else {
        console.log('[DEBUG] No action buttons to show');
      }
      
      console.log('[DEBUG] Returning processed message:', processedMessage.trim());
      return processedMessage.trim();
    }
    
    // Function to show action buttons
    function showActionButtons(actionButtons) {
      console.log('[DEBUG] showActionButtons called with:', actionButtons);
      
      const buttonsContainer = chatContainer.querySelector('.initial-buttons-container');
      console.log('[DEBUG] showActionButtons - buttonsContainer found:', !!buttonsContainer);
      if (!buttonsContainer) return;
      
      // Clear container and add action buttons
      buttonsContainer.innerHTML = '';
      buttonsContainer.className = 'initial-buttons-container action-buttons';
      console.log('[DEBUG] Container cleared and class set');
      
      actionButtons.forEach((buttonConfig, index) => {
        console.log('[DEBUG] Creating button', index, ':', buttonConfig.text);
        const button = document.createElement('button');
        button.className = 'initial-button action-button';
        button.textContent = buttonConfig.text;
        button.onclick = function() {
          // Ensure chat is open before executing the action
          if (!chatContainer.classList.contains('open')) {
            showChat();
            // Wait a moment for the chat to open, then execute the action
            setTimeout(() => {
              buttonConfig.action();
              // Clear action buttons after use
              clearActionButtons();
            }, 300);
          } else {
            // Chat is already open, execute action immediately
            buttonConfig.action();
            // Clear action buttons after use
            clearActionButtons();
          }
        };
        buttonsContainer.appendChild(button);
        console.log('[DEBUG] Button', index, 'appended. Button element:', button);
      });
      
      // Adjust grid layout based on number of buttons
      if (actionButtons.length === 1) {
        buttonsContainer.style.gridTemplateColumns = '1fr';
      } else if (actionButtons.length === 2) {
        buttonsContainer.style.gridTemplateColumns = '1fr 1fr';
      } else {
        buttonsContainer.style.gridTemplateColumns = '1fr 1fr';
      }
      
      buttonsContainer.style.display = 'grid';
      console.log('[DEBUG] Action buttons displayed, container style set to grid');
      console.log('[DEBUG] Final container state:', buttonsContainer);
      console.log('[DEBUG] Container children count:', buttonsContainer.children.length);
      console.log('[DEBUG] Container computed style display:', window.getComputedStyle(buttonsContainer).display);
      console.log('[DEBUG] Container computed style visibility:', window.getComputedStyle(buttonsContainer).visibility);
    }
    
    // Function to clear action buttons
    function clearActionButtons() {
      const buttonsContainer = chatContainer.querySelector('.initial-buttons-container');
      if (buttonsContainer) {
        buttonsContainer.classList.remove('action-buttons');
        buttonsContainer.style.display = 'none';
        buttonsContainer.innerHTML = '';
        
        // After clearing action buttons, check if we should show initial buttons
        setTimeout(showInitialButtons, 50);
      }
    }
    
    // ===== FUNNEL SYSTEM =====
    
    // Funnel state management
    let currentFunnel = null;
    let funnelData = {};
    
    // Function to save funnel data
    function saveFunnelData() {
      try {
        const data = {
          currentFunnel,
          funnelData,
          timestamp: new Date().getTime()
        };
        sessionStorage.set(INTENDR_STORAGE_KEYS.funnelData, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving funnel data:', error);
      }
    }
    
    // Function to load funnel data
    function loadFunnelData() {
      try {
        const saved = sessionStorage.get(INTENDR_STORAGE_KEYS.funnelData);
        if (saved) {
          const data = JSON.parse(saved);
          const now = new Date().getTime();
          // Check if data is less than 1 hour old
          if (now - data.timestamp < 3600000) {
            currentFunnel = data.currentFunnel;
            funnelData = data.funnelData || {};
            return true;
          }
        }
      } catch (error) {
        console.error('Error loading funnel data:', error);
      }
      return false;
    }
    
    // Function to clear funnel data
    function clearFunnelData() {
      currentFunnel = null;
      funnelData = {};
      sessionStorage.remove(INTENDR_STORAGE_KEYS.funnelData);
    }
    
    // Function to start a funnel
    function startFunnel(funnelType) {
      if (!MERGED_CONFIG.funnels[funnelType] || !MERGED_CONFIG.funnels[funnelType].enabled) {
        console.warn(`Funnel ${funnelType} is not enabled`);
        return;
      }
      
      currentFunnel = funnelType;
      funnelData = {};
      
      // For schedule tour funnel, try to auto-select location from URL
      if (funnelType === 'scheduleTour') {
        const autoSelectedLocation = autoSelectLocationFromURL();
        if (autoSelectedLocation) {
          funnelData.selectedLocation = autoSelectedLocation;
          funnelData.currentStep = 'datetime'; // Skip location step
          console.log(`Auto-selected location: ${autoSelectedLocation.name}, skipping to datetime step`);
        }
      }
      
      saveFunnelData();
      
      // Hide chat interface and show funnel
      showFunnelPanel();
    }
    
    // Function to show funnel panel
    function showFunnelPanel() {
      const chatInterface = chatContainer.querySelector('.chat-interface');
      const funnelPanel = chatContainer.querySelector('.funnel-panel');
      
      if (chatInterface) chatInterface.style.display = 'none';
      if (funnelPanel) funnelPanel.style.display = 'flex';
      
      // Load the first step
      loadFunnelStep();
    }
    
    // Function to hide funnel panel and return to chat
    function hideFunnelPanel() {
      const chatInterface = chatContainer.querySelector('.chat-interface');
      const funnelPanel = chatContainer.querySelector('.funnel-panel');
      
      if (chatInterface) chatInterface.style.display = 'flex';
      if (funnelPanel) funnelPanel.style.display = 'none';
      
      // Clear funnel data
      clearFunnelData();
      
      // Send a message back to the chat summarizing what was done
      if (funnelData.submitted) {
        const summaryMessage = generateFunnelSummary();
        sendMessage(summaryMessage);
      }
    }
    
    // Function to load current funnel step
    function loadFunnelStep() {
      if (!currentFunnel) return;
      
      const funnelConfig = MERGED_CONFIG.funnels[currentFunnel];
      const currentStep = funnelData.currentStep || funnelConfig.steps[0];
      const stepIndex = funnelConfig.steps.indexOf(currentStep);
      
      if (stepIndex === -1) {
        console.error('Invalid funnel step:', currentStep);
        return;
      }
      
      const funnelPanel = chatContainer.querySelector('.funnel-panel');
      if (!funnelPanel) return;
      
      // Update header
      const header = funnelPanel.querySelector('.funnel-header h2');
      if (header) {
        header.textContent = funnelConfig.title;
      }
      
      // Update progress
      const progress = funnelPanel.querySelector('.funnel-progress');
      if (progress) {
        const progressPercent = ((stepIndex + 1) / funnelConfig.steps.length) * 100;
        progress.style.width = progressPercent + '%';
      }
      
      // Load step content
      const content = funnelPanel.querySelector('.funnel-content');
      if (content) {
        content.innerHTML = '';
        
        switch (currentStep) {
          case 'location':
            loadLocationStep(content);
            break;
          case 'datetime':
            loadDateTimeStep(content);
            break;
          case 'contact':
            loadContactStep(content);
            break;
          default:
            console.error('Unknown funnel step:', currentStep);
        }
      }
    }
    
    // Function to load location selection step
    function loadLocationStep(container) {
      const locations = MERGED_CONFIG.funnels.scheduleTour.locations || [];
      
      container.innerHTML = `
        <div class="funnel-step">
          <h3>Select a Location</h3>
          <p>Choose the location you'd like to tour:</p>
          
          <div class="location-search">
            <input type="text" id="location-search" placeholder="Search by city, zip code, or location name..." />
            <button id="use-location-btn" class="secondary-btn">Use My Location</button>
          </div>
          
          <div class="locations-list">
            ${locations.map(location => `
              <div class="location-item" data-location-id="${location.id}">
                <div class="location-info">
                  <h4>${location.name}</h4>
                  <p>${location.address}</p>
                  <p>${location.city}, ${location.state} ${location.zip}</p>
                </div>
                <button class="select-location-btn">Select</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      // Add event listeners
      const searchInput = container.querySelector('#location-search');
      const useLocationBtn = container.querySelector('#use-location-btn');
      const locationItems = container.querySelectorAll('.location-item');
      
      // Search functionality
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        locationItems.forEach(item => {
          const locationName = item.querySelector('h4').textContent.toLowerCase();
          const locationAddress = item.querySelector('p').textContent.toLowerCase();
          const matches = locationName.includes(searchTerm) || locationAddress.includes(searchTerm);
          item.style.display = matches ? 'flex' : 'none';
        });
      });
      
      // Use location button
      useLocationBtn.addEventListener('click', function() {
        if (navigator.geolocation) {
          this.textContent = 'Getting location...';
          this.disabled = true;
          
          navigator.geolocation.getCurrentPosition(
            function(position) {
              const { latitude, longitude } = position.coords;
              // Sort locations by distance instead of auto-selecting
              const sortedLocations = sortLocationsByDistance(latitude, longitude, locations);
              if (sortedLocations.length > 0) {
                // Display locations sorted by distance
                displayLocationsWithDistance(sortedLocations, container);
                // Update button text to show success
                useLocationBtn.textContent = 'Location Found ✓';
                useLocationBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                setTimeout(() => {
                  useLocationBtn.textContent = 'Use My Location';
                  useLocationBtn.style.background = '';
                  useLocationBtn.disabled = false;
                }, 2000);
              } else {
                alert('No locations found near you. Please select a location manually.');
                useLocationBtn.textContent = 'Use My Location';
                useLocationBtn.disabled = false;
              }
            },
            function(error) {
              console.error('Geolocation error:', error);
              alert('Unable to get your location. Please select a location manually.');
              useLocationBtn.textContent = 'Use My Location';
              useLocationBtn.disabled = false;
            }
          );
        } else {
          alert('Geolocation is not supported by your browser.');
        }
      });
      
      // Location selection
      locationItems.forEach(item => {
        const selectBtn = item.querySelector('.select-location-btn');
        selectBtn.addEventListener('click', function() {
          const locationId = item.dataset.locationId;
          const location = locations.find(loc => loc.id === locationId);
          if (location) {
            selectLocation(location);
          }
        });
      });
    }
    
    // Function to find closest location
    function findClosestLocation(lat, lng, locations) {
      let closest = null;
      let minDistance = Infinity;
      
      locations.forEach(location => {
        if (location.latitude && location.longitude) {
          const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
          if (distance < minDistance) {
            minDistance = distance;
            closest = location;
          }
        }
      });
      
      return closest;
    }
    
    // Function to sort locations by distance from user
    function sortLocationsByDistance(lat, lng, locations) {
      return locations
        .filter(location => location.latitude && location.longitude)
        .map(location => ({
          ...location,
          distance: calculateDistance(lat, lng, location.latitude, location.longitude)
        }))
        .sort((a, b) => a.distance - b.distance);
    }
    
    // Function to calculate distance between two points
    function calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
    
    // Function to display locations with distance information
    function displayLocationsWithDistance(sortedLocations, container) {
      const locationsList = container.querySelector('.locations-list');
      if (!locationsList) return;
      
      locationsList.innerHTML = sortedLocations.map(location => `
        <div class="location-item" data-location-id="${location.id}">
          <div class="location-info">
            <h4>${location.name}</h4>
            <p>${location.address}</p>
            <p>${location.city}, ${location.state} ${location.zip}</p>
            <p class="distance-info">${location.distance.toFixed(1)} miles away</p>
          </div>
          <button class="select-location-btn">Select</button>
        </div>
      `).join('');
      
      // Re-attach event listeners
      const locationItems = locationsList.querySelectorAll('.location-item');
      locationItems.forEach(item => {
        const selectBtn = item.querySelector('.select-location-btn');
        selectBtn.addEventListener('click', function() {
          const locationId = item.dataset.locationId;
          const location = sortedLocations.find(loc => loc.id === locationId);
          if (location) {
            selectLocation(location);
          }
        });
      });
      
      // Re-attach search functionality
      const searchInput = container.querySelector('#location-search');
      if (searchInput) {
        // Remove existing event listener to avoid duplicates
        searchInput.removeEventListener('input', searchInput._searchHandler);
        
        // Create new search handler
        searchInput._searchHandler = function() {
          const searchTerm = this.value.toLowerCase();
          locationItems.forEach(item => {
            const locationName = item.querySelector('h4').textContent.toLowerCase();
            const locationAddress = item.querySelector('p').textContent.toLowerCase();
            const distanceInfo = item.querySelector('.distance-info')?.textContent.toLowerCase() || '';
            const matches = locationName.includes(searchTerm) || 
                           locationAddress.includes(searchTerm) || 
                           distanceInfo.includes(searchTerm);
            item.style.display = matches ? 'flex' : 'none';
          });
        };
        
        // Add the new event listener
        searchInput.addEventListener('input', searchInput._searchHandler);
      }
    }
    
    // Function to select a location
    function selectLocation(location) {
      funnelData.selectedLocation = location;
      funnelData.currentStep = 'datetime';
      saveFunnelData();
      loadFunnelStep();
    }
    
    // Function to load date/time selection step
    function loadDateTimeStep(container) {
      const timeSlots = MERGED_CONFIG.funnels.scheduleTour.timeSlots;
      const selectedLocation = funnelData.selectedLocation;
      
      if (!selectedLocation) {
        console.error('No location selected');
        return;
      }
      
      container.innerHTML = `
        <div class="funnel-step">
          <h3>Select Date & Time</h3>
          <p>Choose when you'd like to tour ${selectedLocation.name}:</p>
          
          <div class="calendar-container">
            <div class="calendar-header">
              <button class="calendar-nav" id="prev-month">‹</button>
              <h4 id="current-month">Loading...</h4>
              <button class="calendar-nav" id="next-month">›</button>
            </div>
            
            <div class="calendar-grid">
              <div class="calendar-weekdays">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div>
                <div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              <div class="calendar-days" id="calendar-days"></div>
            </div>
          </div>
          
          <div class="time-slots" id="time-slots" style="display: none;">
            <h4>Available Times</h4>
            <div class="time-grid" id="time-grid"></div>
          </div>
        </div>
      `;
      
      // Initialize calendar
      initializeCalendar(container, timeSlots);
    }
    
    // Function to initialize calendar
    function initializeCalendar(container, timeSlots) {
      let currentDate = new Date();
      let selectedDate = null;
      
      const monthDisplay = container.querySelector('#current-month');
      const daysContainer = container.querySelector('#calendar-days');
      const prevBtn = container.querySelector('#prev-month');
      const nextBtn = container.querySelector('#next-month');
      const timeSlotsContainer = container.querySelector('#time-slots');
      const timeGrid = container.querySelector('#time-grid');
      
      function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        monthDisplay.textContent = currentDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 42; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          
          const isCurrentMonth = date.getMonth() === month;
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;
          const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
          
          let className = 'calendar-day';
          if (!isCurrentMonth) className += ' other-month';
          if (isToday) className += ' today';
          if (isPast) className += ' past';
          if (isSelected) className += ' selected';
          
          html += `<div class="${className}" data-date="${date.toISOString().split('T')[0]}">${date.getDate()}</div>`;
        }
        
        daysContainer.innerHTML = html;
        
        // Add click listeners
        daysContainer.querySelectorAll('.calendar-day').forEach(day => {
          if (!day.classList.contains('past') && !day.classList.contains('other-month')) {
            day.addEventListener('click', function() {
              const dateStr = this.dataset.date;
              selectedDate = new Date(dateStr);
              
              // Update selection
              daysContainer.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
              this.classList.add('selected');
              
              // Show time slots
              showTimeSlots(selectedDate, timeSlots, timeSlotsContainer, timeGrid);
            });
          }
        });
      }
      
      // Navigation
      prevBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
      });
      
      nextBtn.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
      });
      
      // Initial render
      renderCalendar();
    }
    
    // Function to show time slots
    function showTimeSlots(selectedDate, timeSlots, container, grid) {
      container.style.display = 'block';
      
      const { startHour, endHour, duration } = timeSlots;
      const slots = [];
      
      for (let hour = startHour; hour < endHour; hour++) {
        const time = new Date(selectedDate);
        time.setHours(hour, 0, 0, 0);
        slots.push(time);
      }
      
      grid.innerHTML = slots.map(slot => `
        <button class="time-slot" data-time="${slot.toISOString()}">
          ${slot.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}
        </button>
      `).join('');
      
      // Add click listeners
      grid.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', function() {
          grid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          this.classList.add('selected');
          
          const selectedTime = new Date(this.dataset.time);
          selectDateTime(selectedDate, selectedTime);
        });
      });
    }
    
    // Function to select date and time
    function selectDateTime(date, time) {
      funnelData.selectedDate = date;
      funnelData.selectedTime = time;
      funnelData.currentStep = 'contact';
      saveFunnelData();
      loadFunnelStep();
    }
    
    // Function to load contact information step
    function loadContactStep(container) {
      const funnelType = currentFunnel;
      const funnelConfig = MERGED_CONFIG.funnels[funnelType];
      
      let title = 'Contact Information';
      let description = 'Please provide your contact information:';
      
      if (funnelType === 'scheduleTour') {
        const location = funnelData.selectedLocation;
        const date = funnelData.selectedDate;
        const time = funnelData.selectedTime;
        
        title = 'Schedule Your Tour';
        description = `Tour at ${location.name} on ${date.toLocaleDateString()} at ${time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}`;
      }
      
      container.innerHTML = `
        <div class="funnel-step">
          <h3>${title}</h3>
          <p>${description}</p>
          
          <form class="contact-form" id="contact-form">
            <div class="form-group">
              <label for="first-name">First Name *</label>
              <input type="text" id="first-name" required />
            </div>
            
            <div class="form-group">
              <label for="last-name">Last Name *</label>
              <input type="text" id="last-name" required />
            </div>
            
            <div class="form-group">
              <label for="email">Email Address *</label>
              <input type="email" id="email" required />
            </div>
            
            <div class="form-group">
              <label for="phone">Phone Number *</label>
              <input type="tel" id="phone" required />
            </div>
            
            <div class="form-group">
              <label for="message">Message (Optional)</label>
              <textarea id="message" rows="3" placeholder="Any additional information..."></textarea>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="submit-btn">Submit</button>
            </div>
          </form>
        </div>
      `;
      
      // Add form submission handler
      const form = container.querySelector('#contact-form');
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitFunnelForm();
      });
    }
    
    // Function to submit funnel form
    async function submitFunnelForm() {
      const form = document.getElementById('contact-form');
      const submitBtn = form.querySelector('.submit-btn');
      const originalText = submitBtn.textContent;
      
      try {
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Collect form data
        const formData = {
          firstName: document.getElementById('first-name').value,
          lastName: document.getElementById('last-name').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value,
          message: document.getElementById('message').value
        };
        
        // Prepare lead data
        const leadData = {
          client: config.business.name || 'Aegis Living',
          chatbotId: extractChatbotId(),
          sessionId: currentSessionId,
          leadname: `${formData.firstName} ${formData.lastName}`,
          leadphone: formData.phone,
          leademail: formData.email,
          leadtype: getLeadType(),
          leadnotes: formData.message,
          tourdateandtime: getTourDateTime()
        };
        
        // Submit to webhook
        const response = await fetch(INTENDR_API_ENDPOINTS.leadSubmission, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(leadData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to submit lead');
        }
        
        // Mark as submitted
        funnelData.submitted = true;
        funnelData.formData = formData;
        saveFunnelData();
        
        // Show success message
        showFunnelSuccess();
        
      } catch (error) {
        console.error('Error submitting funnel form:', error);
        alert('There was an error submitting your information. Please try again.');
        
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
    
    // Function to extract chatbot ID
    function extractChatbotId() {
      try {
        const webhookUrl = config.webhook.url;
        const matches = webhookUrl.match(/\/webhook\/([^\/]+)/);
        if (matches && matches[1]) {
          return matches[1].replace(/\/chat$/, '');
        }
      } catch (err) {
        console.error('Error extracting chatbot ID:', err);
      }
      return 'b1bdfe90-cbf0-4d3a-8e4b-fa3359344b57'; // Default fallback
    }
    
    // Function to get lead type
    function getLeadType() {
      switch (currentFunnel) {
        case 'scheduleTour': return 'Tour';
        case 'jobInquiry': return 'Job Inquiry';
        case 'residentInquiry': return 'Resident Inquiry';
        default: return 'General';
      }
    }
    
    // Function to get tour date and time
    function getTourDateTime() {
      if (currentFunnel === 'scheduleTour' && funnelData.selectedDate && funnelData.selectedTime) {
        const date = funnelData.selectedDate;
        const time = funnelData.selectedTime;
        return `${date.toLocaleDateString()} ${time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}`;
      }
      return '';
    }
    
    // Function to show funnel success
    function showFunnelSuccess() {
      const funnelPanel = chatContainer.querySelector('.funnel-panel');
      const content = funnelPanel.querySelector('.funnel-content');
      
      content.innerHTML = `
        <div class="funnel-success">
          <div class="success-icon">✓</div>
          <h3>Thank You!</h3>
          <p>Your information has been submitted successfully. We'll be in touch with you soon!</p>
          
          <div class="success-actions">
            <button class="primary-btn" onclick="window.intendrBackToChat()">Return to Chat</button>
          </div>
        </div>
      `;
    }
    
    // Function to generate funnel summary
    function generateFunnelSummary() {
      if (!funnelData.submitted) return '';
      
      const formData = funnelData.formData;
      let summary = `I've submitted your ${getLeadType().toLowerCase()} request. `;
      
      if (currentFunnel === 'scheduleTour') {
        const location = funnelData.selectedLocation;
        const dateTime = getTourDateTime();
        summary += `Your tour is scheduled for ${dateTime} at ${location.name}. `;
      }
      
      summary += `We'll contact you at ${formData.email} or ${formData.phone} to confirm the details. Is there anything else I can help you with?`;
      
      return summary;
    }
    
    // Function to detect funnel type from a message
    function detectFunnelFromMessage(message) {
      const lowerMessage = message.toLowerCase();
      console.log('[DEBUG] detectFunnelFromMessage called with:', message);
      console.log('[DEBUG] Lower message:', lowerMessage);
      
      // Schedule Tour funnel detection
      if (lowerMessage.includes('schedule') && lowerMessage.includes('tour') ||
          lowerMessage.includes('book') && lowerMessage.includes('tour') ||
          lowerMessage.includes('tour') && lowerMessage.includes('visit') ||
          lowerMessage.includes('schedule') && lowerMessage.includes('visit') ||
          lowerMessage.includes('tour') && lowerMessage.includes('community') ||
          lowerMessage.includes('schedule') && lowerMessage.includes('appointment') ||
          lowerMessage.includes('tour') && lowerMessage.includes('location')) {
        console.log('[DEBUG] Detected scheduleTour funnel');
        return 'scheduleTour';
      }
      
      // Job Inquiry funnel detection - improved to be more flexible
      if (lowerMessage.includes('job') && (lowerMessage.includes('opportunity') || lowerMessage.includes('opportunities')) ||
          lowerMessage.includes('career') && (lowerMessage.includes('opportunity') || lowerMessage.includes('opportunities')) ||
          lowerMessage.includes('employment') ||
          lowerMessage.includes('work') && (lowerMessage.includes('opportunity') || lowerMessage.includes('opportunities')) ||
          lowerMessage.includes('job') && lowerMessage.includes('position') ||
          lowerMessage.includes('hire') ||
          lowerMessage.includes('apply') && lowerMessage.includes('job') ||
          lowerMessage.includes('interested') && lowerMessage.includes('job') ||
          lowerMessage.includes('job') && lowerMessage.includes('interested')) {
        console.log('[DEBUG] Detected jobInquiry funnel');
        return 'jobInquiry';
      }
      
      // Resident Inquiry funnel detection
      if (lowerMessage.includes('resident') && lowerMessage.includes('support') ||
          lowerMessage.includes('resident') && lowerMessage.includes('assistance') ||
          lowerMessage.includes('existing') && lowerMessage.includes('resident') ||
          lowerMessage.includes('current') && lowerMessage.includes('resident') ||
          lowerMessage.includes('resident') && lowerMessage.includes('help') ||
          lowerMessage.includes('resident') && lowerMessage.includes('service')) {
        console.log('[DEBUG] Detected residentInquiry funnel');
        return 'residentInquiry';
      }
      
      // No funnel detected
      console.log('[DEBUG] No funnel detected');
      return null;
    }
    
    // Function to go back to previous funnel step
    function backToFunnelStep(step) {
      funnelData.currentStep = step;
      saveFunnelData();
      loadFunnelStep();
    }
    
    // Smart back navigation function
    function smartBackNavigation() {
      if (!currentFunnel) {
        hideFunnelPanel();
        return;
      }
      
      const funnelConfig = MERGED_CONFIG.funnels[currentFunnel];
      const currentStep = funnelData.currentStep || funnelConfig.steps[0];
      const stepIndex = funnelConfig.steps.indexOf(currentStep);
      
      if (stepIndex <= 0) {
        // On first step or invalid step, go back to chat
        hideFunnelPanel();
      } else {
        // Go to previous step
        const previousStep = funnelConfig.steps[stepIndex - 1];
        backToFunnelStep(previousStep);
      }
    }
    
    // Expose functions globally for onclick handlers
    window.intendrBackToChat = hideFunnelPanel;
    window.intendrBackToFunnelStep = backToFunnelStep;
    window.intendrSmartBackNavigation = smartBackNavigation;
    
    // Expose funnel functions globally for external use
    window.IntendrStartFunnel = function(funnelType) {
      if (!chatContainer.classList.contains('open')) {
        showChat();
        setTimeout(() => startFunnel(funnelType), 300);
      } else {
        startFunnel(funnelType);
      }
    };
    window.IntendrShowFunnelPanel = showFunnelPanel;
    window.IntendrHideFunnelPanel = hideFunnelPanel;
    window.IntendrLoadFunnelStep = loadFunnelStep;
    
    // Enhanced action button parsing to include funnel triggers
    function parseAndShowActionButtons(message) {
      console.log('[DEBUG] parseAndShowActionButtons called with message:', message);
      
      const buttonsContainer = chatContainer.querySelector('.initial-buttons-container');
      console.log('[DEBUG] buttonsContainer found:', !!buttonsContainer);
      if (!buttonsContainer) return message;
      
      // Clear any existing action buttons
      clearActionButtons();
      
      const actionButtons = [];
      let processedMessage = message;
      
      // Parse [funnel] tags for funnel triggers
      const funnelRegex = /\[funnel\s+type="([^"]+)"(?:\s+btntext="([^"]*)")?\](.*?)\[\/funnel\]/g;
      let funnelMatch;
      while ((funnelMatch = funnelRegex.exec(message)) !== null) {
        const funnelType = funnelMatch[1];
        const buttonText = funnelMatch[2] || funnelMatch[3];
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(funnelMatch[0], '');
        
        // Add funnel action button
        actionButtons.push({
          text: buttonText,
          action: () => startFunnel(funnelType)
        });
      }
      
      // Parse [phone] tags with optional btntext attribute
      const phoneRegex = /\[phone(?:\s+btntext="([^"]*)")?\](.*?)\[\/phone\]/g;
      let phoneMatch;
      while ((phoneMatch = phoneRegex.exec(message)) !== null) {
        const buttonText = phoneMatch[1] || 'Call Now';
        const phoneNumber = phoneMatch[2];
        const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(phoneMatch[0], '');
        
        // Add action button
        actionButtons.push({
          text: buttonText,
          action: () => window.open(`tel:${cleanPhone}`, '_self')
        });
      }
      
      // Parse [url] tags with optional btntext attribute
      const urlRegex = /\[url(?:\s+btntext="([^"]*)")?\](.*?)\[\/url\]/g;
      let urlMatch;
      while ((urlMatch = urlRegex.exec(message)) !== null) {
        const buttonText = urlMatch[1] || 'Visit Page';
        const url = urlMatch[2];
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(urlMatch[0], '');
        
        // Add action button
        actionButtons.push({
          text: buttonText,
          action: () => window.open(url, '_blank')
        });
      }
      
      // Parse [button] tags
      const buttonRegex = /\[button message="(.*?)"\](.*?)\[\/button\]/g;
      let buttonMatch;
      while ((buttonMatch = buttonRegex.exec(message)) !== null) {
        const buttonMessage = buttonMatch[1];
        const buttonText = buttonMatch[2];
        
        // Remove the tag from the message
        processedMessage = processedMessage.replace(buttonMatch[0], '');
        
        // Check if the button message should trigger a funnel instead of sending a message
        const funnelType = detectFunnelFromMessage(buttonMessage);
        
        if (funnelType) {
          // Add funnel action button
          actionButtons.push({
            text: buttonText,
            action: () => startFunnel(funnelType)
          });
        } else {
          // Add regular message action button
          actionButtons.push({
            text: buttonText,
            action: () => sendMessage(buttonMessage)
          });
        }
      }

      // If no explicit action buttons were found, look for phone numbers in the message
      if (actionButtons.length === 0) {
        // Phone number regex that matches various formats
        const phoneNumberRegex = /(?:^|\s)(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})(?:\s|$)/g;
        let phoneNumberMatch;
        
        while ((phoneNumberMatch = phoneNumberRegex.exec(message)) !== null) {
          const fullMatch = phoneNumberMatch[0].trim();
          const cleanPhone = fullMatch.replace(/[^\d+]/g, '');
          
          // Create a button text that includes the location if mentioned
          let buttonText = 'Call Now';
          const locationMatch = message.match(/Aegis Living\s+([^,.]+)/i);
          if (locationMatch) {
            buttonText = `Call ${locationMatch[1]}`;
          }
          
          // Add action button
          actionButtons.push({
            text: buttonText,
            action: () => window.open(`tel:${cleanPhone}`, '_self')
          });
        }
      }
      
      // Show action buttons if any were found
      console.log('[DEBUG] actionButtons found:', actionButtons.length, actionButtons);
      if (actionButtons.length > 0) {
        console.log('[DEBUG] Calling showActionButtons');
        showActionButtons(actionButtons);
      } else {
        console.log('[DEBUG] No action buttons to show');
      }
      
      console.log('[DEBUG] Returning processed message:', processedMessage.trim());
      return processedMessage.trim();
    }

    // Function to open chat
    function openChat() {
      if (!chatContainer.classList.contains('open')) {
        hidePromptBubble();
        promptBubbleShown = true;
        
        chatContainer.classList.add('open');
        toggleButton.classList.add('hidden');
        
        // Handle mobile
        if (window.innerWidth <= 600) {
          document.body.style.overflow = 'hidden';
        }
        
        // Clear any existing messages first
        messagesContainer.innerHTML = '';
        
        // Try to load existing session
        const sessionRestored = loadSession();
        
        if (!sessionRestored) {
          // Create new session
          inactivityMessageSent = false;
          currentSessionId = generateSessionId();
          // Show initial messages immediately
          sendInitialMessages();
          // Generate page summary in background
          generatePageSummary();
        }
        
        // Always check and show/hide initial buttons based on current messages
        showInitialButtons();
        
        // Save session after changes
        saveSession();
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        startInactivityTimer();
        clearTimeout(promptBubbleTimer);
      }
    }
    
    // UTM tracking function
    function extractUtmParameters(url) {
      const utmParams = {};
      try {
        const urlObj = new URL(url);
        const searchParams = new URLSearchParams(urlObj.search);
        
        // Standard UTM parameters
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        utmKeys.forEach(function(key) {
          if (searchParams.has(key)) {
            utmParams[key] = searchParams.get(key);
          }
        });
        
        // Also check for any other custom utm parameters
        for (const [key, value] of searchParams.entries()) {
          if (key.startsWith('utm_') && !utmKeys.includes(key)) {
            utmParams[key] = value;
          }
        }
      } catch (error) {
        console.error('Error extracting UTM parameters:', error);
      }
      return utmParams;
    }
    
    // Store UTM parameters globally when first loaded
    window.initialUtmParameters = extractUtmParameters(window.location.href);
    console.log('Initial UTM Parameters:', window.initialUtmParameters);
    
    // Generate UUID
    function generateUUID() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      } else {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    }

    // Get analytics sessionId for visitor/chat correlation (reuses existing)
    function getAnalyticsSessionId() {
      const trackingSessionKey = 'intendr_session_id';
      try {
        const existingTrackingSession = sessionStorage.getItem(trackingSessionKey);
        if (existingTrackingSession) {
          return existingTrackingSession;
        }
      } catch (error) {
        console.warn('Error reading tracking session from sessionStorage:', error);
      }
      
      // Generate new UUID for analytics
      const newAnalyticsSessionId = generateUUID();
      try {
        sessionStorage.setItem(trackingSessionKey, newAnalyticsSessionId);
      } catch (error) {
        console.warn('Error storing tracking session in sessionStorage:', error);
      }
      
      return newAnalyticsSessionId;
    }

    // Generate new chat session ID (always creates new for each conversation)
    function generateSessionId() {
      const newChatSessionId = generateUUID();
      console.log('🆕 Generated new chat sessionId:', newChatSessionId);
      return newChatSessionId;
    }



    // Enhanced lead conversion tracking
    function trackLeadConversion(leadData) {
      trackAnalyticsEvent('lead_conversion', {
        leadId: leadData.id || null,
        leadEmail: leadData.email || null,
        leadPhone: leadData.phone || null,
        conversionSource: 'chat_widget'
      });
    }

    // Make trackLeadConversion available globally for external use
    window.IntendrTrackLeadConversion = trackLeadConversion;
    
    // Format message with links and markdown
    function formatMessage(text) {
      if (!text) return '';
      
      // Check if the message contains HTML elements, and if so, don't process URLs
      const containsHtml = /<[a-z][\s\S]*>/i.test(text);
      
      // Convert markdown-style links [text](url) to HTML links
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      
      // Handle raw URLs ONLY if the message doesn't contain HTML
      if (!containsHtml) {
        text = text.replace(/(https?:\/\/[^\s<]+)(?![^<]*>)/g, '<a href="$1" target="_blank">Visit Website</a>');
      }
      
      // Bold text between ** **
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Italic text between * *
      text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      
      // Convert newlines to <br>
      text = text.replace(/\n/g, '<br>');
      
      return text;
    }
    
    // Function to append UTM parameters to URL
    function appendUtmToUrl(url) {
      try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        // Add the required UTM parameters
        params.set('utm_source', 'Intendr');
        params.set('utm_medium', 'chat');
        params.set('utm_campaign', INTENDR_SETTINGS.utmCampaign);
        
        // Rebuild the URL with the new parameters
        urlObj.search = params.toString();
        return urlObj.toString();
      } catch (error) {
        console.error('Error appending UTM parameters to URL:', error);
        // If URL parsing fails, return original URL
        return url;
      }
    }
    
    // Create thinking animation
    function showThinkingAnimation() {
      const thinkingDiv = document.createElement('div');
      thinkingDiv.className = 'thinking';
      thinkingDiv.innerHTML = `
          <span>${INTENDR_BRANDING.typingText}</span>
        <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
        </div>
      `;
      thinkingDiv.id = 'thinking-animation';
      messagesContainer.appendChild(thinkingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      return thinkingDiv;
    }
    
    // Remove thinking animation
    function removeThinkingAnimation() {
      const thinkingElement = document.getElementById('thinking-animation');
      if (thinkingElement) {
        thinkingElement.remove();
      }
    }
    
    // Session persistence
    let sessionStorage = {
      get: function(key) {
        if (!isLocalStorageAvailable()) return null;
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.warn('Error reading from localStorage:', e);
          return null;
        }
      },
      set: function(key, value) {
        if (!isLocalStorageAvailable()) return;
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('Error writing to localStorage:', e);
        }
      },
      remove: function(key) {
        if (!isLocalStorageAvailable()) return;
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('Error removing from localStorage:', e);
        }
      }
    };

    function saveSession() {
      if (currentSessionId) {
        try {
          const sessionData = {
            sessionId: currentSessionId,
            messages: Array.from(messagesContainer.children)
              .filter(function(el) { return el.classList.contains('chat-message'); })
              .map(function(msgEl) {
                return {
                  type: msgEl.classList.contains('user') ? 'user' : 'bot',
                  content: msgEl.classList.contains('user') ? msgEl.textContent : msgEl.innerHTML
                };
              }),
            inactivityMessageSent: inactivityMessageSent,
            promptBubbleShown: promptBubbleShown,
            timestamp: new Date().getTime(),
            utmParameters: window.initialUtmParameters || {}
          };
          
          sessionStorage.set(INTENDR_STORAGE_KEYS.chatSession, JSON.stringify(sessionData));
        } catch (error) {
          console.error('Error saving chat session:', error);
        }
      }
    }

    function loadSession() {
      try {
        const savedSession = sessionStorage.get(INTENDR_STORAGE_KEYS.chatSession);
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // Check if session is still valid (less than 24 hours old)
          const now = new Date().getTime();
          const sessionAge = now - sessionData.timestamp;
          
          if (sessionAge < INTENDR_SETTINGS.sessionValidity) {
            // Clear the messages container completely before restoring
            messagesContainer.innerHTML = '';
            
            // Restore session ID
            currentSessionId = sessionData.sessionId;
            
            // Restore inactivity message status
            if (sessionData.inactivityMessageSent) {
              inactivityMessageSent = true;
            }
            
            // Restore prompt bubble state
            if (sessionData.promptBubbleShown) {
              promptBubbleShown = true;
            }
            
            // Restore UTM parameters if they exist in the session
            if (sessionData.utmParameters) {
              window.initialUtmParameters = sessionData.utmParameters;
            }
            
            // Restore messages
            if (sessionData.messages && sessionData.messages.length > 0) {
              sessionData.messages.forEach(function(msg) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message ' + msg.type;
                if (msg.type === 'user') {
                  messageDiv.textContent = msg.content;
                } else {
                  messageDiv.innerHTML = msg.content;
                }
                messagesContainer.appendChild(messageDiv);
              });
              
              // After restoring messages, check buttons
              setTimeout(showInitialButtons, 100);
            }
            
            return true;
          }
          // Session too old, clear it
          sessionStorage.remove(INTENDR_STORAGE_KEYS.chatSession);
        }
      } catch (error) {
        console.error('Error loading saved chat session:', error);
        sessionStorage.remove(INTENDR_STORAGE_KEYS.chatSession);
      }
      return false;
    }
    
    // Inactivity detection for chat window
    let inactivityTimer;
    let inactivityMessageSent = false;
    
    function startInactivityTimer() {
      clearTimeout(inactivityTimer);
    }
    
    function resetInactivityTimer() {
      if (chatContainer.classList.contains('open')) {
        clearTimeout(inactivityTimer);
          startInactivityTimer();
      }
    }
    
    function resetInactivityState() {
      clearTimeout(inactivityTimer);
      startInactivityTimer();
    }
    
    // Prompt bubble functionality
    let promptBubbleTimer;
    let promptBubbleShown = false;
    
    function startPromptBubbleTimer() {
      // Only start timer if prompt hasn't been shown yet
      if (!promptBubbleShown) {
        promptBubbleTimer = setTimeout(function() {
          showPromptBubble();
        }, INTENDR_SETTINGS.promptBubbleTimeout);
      }
    }
    
    function showPromptBubble() {
      // Only show if chat isn't open and prompt hasn't been shown
      if (!chatContainer.classList.contains('open') && !promptBubbleShown) {
        const promptBubble = document.createElement('div');
        promptBubble.className = 'prompt-bubble';
        promptBubble.textContent = 'Have a question?';
        promptBubble.id = 'prompt-bubble';
        
        // Add click handler to open chat
        promptBubble.addEventListener('click', function() {
          // Hide prompt bubble
          hidePromptBubble();
          
          // Open chat
          toggleButton.click();
        });
        
        widgetContainer.appendChild(promptBubble);
        promptBubbleShown = true;
        
        // Save session state
        saveSession();
      }
    }
    
    function hidePromptBubble() {
      const promptBubble = document.getElementById('prompt-bubble');
      if (promptBubble) {
        promptBubble.remove();
      }
    }
    
    // Styles
    const styles = `
      :root {
        --chat--color-primary: ${config.style.primaryColor};
        --chat--color-secondary: ${config.style.secondaryColor};
      }
      div#notificationDisplay {
        display: none !important;
      }
      iframe#c1-leads-assistant {
        display: none !important;
      }
      .intendr-chat-widget {
        font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .intendr-chat-widget .chat-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        width: 380px;
        height: 600px;
        background: #ffffff;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(133, 79, 255, 0.15);
        border: 1px solid rgba(133, 79, 255, 0.2);
        overflow: hidden;
        opacity: 0;
        transform-origin: bottom right;
        transform: scale(0);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        display: flex;
        flex-direction: column;
        visibility: hidden;
      }
      @media screen and (max-width: 600px) {
        .intendr-chat-widget .chat-container {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .intendr-chat-widget .chat-container.position-left {
          left: 0;
        }
      }
      .intendr-chat-widget .chat-container.position-left {
        right: auto;
        left: 20px;
        transform-origin: bottom left;
      }
      .intendr-chat-widget .chat-container.open {
        opacity: 1;
        transform: scale(1);
        pointer-events: all;
        visibility: visible;
      }
      .intendr-chat-widget .brand-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
      }
      .intendr-chat-widget .close-button {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 20px;
        opacity: 0.8;
        color: #ffffff;
      }
      .intendr-chat-widget .brand-header img {
        width: 32px;
        height: 32px;
        filter: brightness(0) invert(1);
      }
      .intendr-chat-widget .brand-header span {
        font-size: 18px;
        font-weight: 500;
        color: #ffffff;
      }
      .intendr-chat-widget .chat-interface {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .intendr-chat-widget .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      .intendr-chat-widget .chat-message {
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.5;
      }
      .intendr-chat-widget .chat-message.user {
        background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
        color: #fff;
        align-self: flex-end;
        box-shadow: 0 4px 12px rgba(133, 79, 255, 0.2);
        border-radius: 12px;
        padding: 12px 16px;
        margin: 8px 0;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.5;
      }
      .intendr-chat-widget .chat-message.bot {
        background: #ffffff;
        border: 1px solid rgba(133, 79, 255, 0.2);
        color: #333;
        align-self: flex-start;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      .intendr-chat-widget .chat-message.bot a {
        color: var(--chat--color-primary);
        text-decoration: none;
        font-weight: 500;
      }
      .intendr-chat-widget .chat-message.bot a:hover {
        text-decoration: underline;
      }
      .intendr-chat-widget .chat-message.bot a:hover {
        text-decoration: underline;
      }
      .intendr-chat-widget .chat-input {
        padding: 16px;
        border-top: 1px solid rgba(133, 79, 255, 0.1);
        display: flex;
        gap: 8px;
      }
      .intendr-chat-widget .chat-input textarea {
        flex: 1 !important;
        padding: 12px !important;
        border: 1px solid rgba(133, 79, 255, 0.2) !important;
        border-radius: 8px !important;
        resize: none !important;
        font-family: inherit !important;
        font-size: 14px !important;
        height: auto !important;
        min-height: 40px !important;
        max-height: 120px !important;
        width: auto !important;
        box-sizing: border-box !important;
      }
      .intendr-chat-widget .chat-input button {
        background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0 18px;
        cursor: pointer;
        font-weight: 500;
        font-size: 16px;
        height: 40px;
        min-width: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .intendr-chat-widget .chat-input button svg {
        fill: #fff;
        stroke: #fff;
      }
    .intendr-chat-widget .chat-toggle {
      position: fixed;
      bottom: 60px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px var(--chat--color-primary);
      z-index: 2147483647;
      border-radius: 30px !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1;
      transform: scale(1);
    }
    .intendr-chat-widget .phone-toggle {
      bottom: 60px !important;
    }
    
    .intendr-chat-widget .chat-toggle.hidden {
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }
    
    .intendr-chat-widget .chat-toggle-content {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    
    .intendr-chat-widget .chat-toggle svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      color: white;
    }
    
    .intendr-chat-widget .chat-toggle-text {
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      line-height: 24px;
    }
    
    .intendr-chat-widget .online-indicator {
      position: absolute;
      top: -20px;
      right: -4px;
      width: 12px;
      height: 12px;
      background-color: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      }
    }
    
    /* Update mobile styles for online indicator */
    @media screen and (max-width: 600px) {
      .intendr-chat-widget .chat-toggle {
        width: 60px;
        height: 60px;
        padding: 0;
        justify-content: center;
      }
    
      .intendr-chat-widget .chat-toggle-text {
        display: none;
      }
      
      .intendr-chat-widget .online-indicator {
        top: -20px;
        right: -4px;
      }
    }
    
        .intendr-chat-widget .chat-toggle.position-left {
          right: auto;
          left: 20px;
        }
        .intendr-chat-widget .chat-toggle svg {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }
        .intendr-chat-widget .thinking {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 8px 0;
          border-radius: 12px;
          max-width: 80%;
          align-self: flex-start;
          background: #fff;
          border: 1px solid rgba(133, 79, 255, 0.2);
          gap: 8px;
        }
        .intendr-chat-widget .thinking span {
          color: #666;
          font-size: 14px;
        }
        .intendr-chat-widget .dots {
          display: flex;
          gap: 2px;
        }
        .intendr-chat-widget .dot {
          height: 8px;
          width: 8px;
          background-color: var(--chat--color-primary);
          border-radius: 50%;
          display: inline-block;
          opacity: 0.4;
          animation: dot-typing 1.4s infinite ease-in-out;
        }
        .intendr-chat-widget .dot:nth-child(1) { animation-delay: 0s; }
        .intendr-chat-widget .dot:nth-child(2) { animation-delay: 0.2s; }
        .intendr-chat-widget .dot:nth-child(3) { animation-delay: 0.4s; }
        /* Prompt bubble styles */
        .intendr-chat-widget .prompt-bubble {
          position: absolute;
          bottom: 90px;
          right: 10px;
          background: white;
          color: var(--chat--color-primary);
          padding: 8px 14px;
          border-radius: 18px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          z-index: 2147483646;
          border: 1px solid rgba(133, 79, 255, 0.2);
          animation: bounce-in 0.5s;
        }
        /* Position the prompt bubble on the left if chat is on the left */
        .intendr-chat-widget .chat-toggle.position-left + .prompt-bubble {
          right: auto;
          left: 10px;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dot-typing {
          0%, 60%, 100% { opacity: 0.4; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.2); }
        }
        /* Initial buttons styles */
        .intendr-chat-widget .initial-buttons-container {
          padding: 10px 10px 0px 10px;
          border-top: 1px solid rgba(133, 79, 255, 0.1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .intendr-chat-widget .initial-button {
          background: white;
          border: 1px solid rgba(133, 79, 255, 0.2);
          border-radius: 8px;
          padding: 12px 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          font-size: 13px;
          font-weight: 500;
          color: var(--chat--color-primary);
        }
        .intendr-chat-widget .initial-button:hover {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border-color: transparent;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.3);
        }
        /* Action buttons (from bot messages) */
        .intendr-chat-widget .action-buttons {
          border-top: 2px solid rgba(133, 79, 255, 0.3);
          background: rgba(133, 79, 255, 0.02);
          padding: 10px;
          display: grid;
          gap: 8px;
        }
        .intendr-chat-widget .action-button {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border: none;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          font-size: 14px;
          line-height: 1.4;
          width: 100%;
          box-sizing: border-box;
        }
        .intendr-chat-widget .action-button:hover {
          background: linear-gradient(135deg, #5a67d8 0%, #6b5b95 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(133, 79, 255, 0.4);
        }

        @media screen and (max-width: 600px) {
          .intendr-chat-widget .action-buttons {
            padding: 8px;
            gap: 6px;
          }
          .intendr-chat-widget .action-button {
            padding: 10px 12px;
            font-size: 13px;
            border-radius: 6px;
          }
        }

        /* Defensive styles for widget overlays only */
        .intendr-widget-overlay {
          position: fixed !important;
          z-index: 2147483648 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          box-sizing: border-box !important;
          /* Reset common problematic properties */
          margin: 0 !important;
          transform: none !important;
          animation: none !important;
          transition: none !important;
        }

        .intendr-widget-overlay * {
          box-sizing: border-box !important;
          font-family: inherit !important;
        }

        .intendr-widget-overlay input {
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
        }

        .intendr-widget-overlay button {
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
        }

        /* Defensive styles for chat input textarea only */
        .intendr-chat-widget .chat-input textarea {
          width: 100% !important;
          min-height: 40px !important;
          max-height: 120px !important;
          height: 40px !important;
          padding: 12px 50px 12px 16px !important;
          margin: 0 !important;
          border: 1px solid #e0e0e0 !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          line-height: 1.2 !important;
          background: white !important;
          color: #333 !important;
          resize: none !important;
          outline: none !important;
          box-sizing: border-box !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          display: block !important;
          position: relative !important;
          overflow: hidden !important;
          overflow-y: auto !important;
          word-wrap: break-word !important;
          white-space: nowrap !important;
          vertical-align: top !important;
          text-align: left !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-indent: 0 !important;
          text-transform: none !important;
          text-decoration: none !important;
        }

        .intendr-chat-widget .chat-input textarea:focus {
          border-color: var(--chat--color-primary) !important;
          box-shadow: 0 0 0 2px rgba(133, 79, 255, 0.2) !important;
        }

        /* Defensive styles for thinking/typing indicator */
        .intendr-chat-widget .thinking {
          background: white !important;
          border: 1px solid #e0e0e0 !important;
          border-radius: 15px !important;
          padding: 8px 12px !important;
          margin: 8px 0 !important;
          display: inline-block !important;
          width: auto !important;
          max-width: none !important;
          float: left !important;
          clear: both !important;
          box-sizing: border-box !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #666 !important;
          text-align: left !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-indent: 0 !important;
          text-transform: none !important;
          text-decoration: none !important;
        }

        .intendr-chat-widget .thinking span {
          margin: 0 !important;
          padding: 0 !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          color: inherit !important;
        }

        /* Defensive styles for action buttons */
        .intendr-chat-widget .initial-button,
        .intendr-chat-widget .action-button {
          padding: 12px 20px !important;
          border: none !important;
          border-radius: 8px !important;
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%) !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          line-height: 1.2 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 8px rgba(133, 79, 255, 0.3) !important;
          display: inline-block !important;
          text-align: center !important;
          text-decoration: none !important;
          box-sizing: border-box !important;
          min-height: auto !important;
          height: auto !important;
          max-height: none !important;
          vertical-align: top !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-indent: 0 !important;
          text-transform: none !important;
          outline: none !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
        }

        .intendr-chat-widget .initial-button:hover,
        .intendr-chat-widget .action-button:hover {
          background: linear-gradient(135deg, var(--chat--color-secondary) 0%, var(--chat--color-primary) 100%) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 16px rgba(133, 79, 255, 0.4) !important;
        }

        /* ===== FUNNEL SYSTEM STYLES ===== */
        
        /* Funnel Panel */
        .intendr-chat-widget .funnel-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ffffff;
        }
        
        .intendr-chat-widget .funnel-header {
          padding: 16px;
          border-bottom: 1px solid rgba(133, 79, 255, 0.1);
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          position: relative;
        }
        
        .intendr-chat-widget .back-to-chat-btn {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .intendr-chat-widget .back-to-chat-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .intendr-chat-widget .funnel-header h2 {
          margin: 0;
          text-align: center;
          font-size: 18px;
          font-weight: 500;
        }
        
        .intendr-chat-widget .funnel-progress-container {
          margin-top: 12px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .intendr-chat-widget .funnel-progress {
          height: 100%;
          background: white;
          border-radius: 2px;
          transition: width 0.3s ease;
          width: 0%;
        }
        
        .intendr-chat-widget .funnel-content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        
        /* Funnel Step */
        .intendr-chat-widget .funnel-step {
          max-width: 100%;
        }
        
        .intendr-chat-widget .funnel-step h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .intendr-chat-widget .funnel-step p {
          margin: 0 0 12px 0;
          color: #666;
          font-size: 13px;
          line-height: 1.4;
        }
        
        /* Location Search */
        .intendr-chat-widget .location-search {
          margin-bottom: 12px;
          display: flex;
          gap: 6px;
        }
        
        .intendr-chat-widget .location-search input {
          flex: 1;
          padding: 8px 10px;
          border: 1px solid rgba(133, 79, 255, 0.2);
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .intendr-chat-widget .location-search input:focus {
          border-color: var(--chat--color-primary);
          box-shadow: 0 0 0 2px rgba(133, 79, 255, 0.1);
        }
        
        .intendr-chat-widget .secondary-btn {
          padding: 8px 12px;
          background: white;
          border: 1px solid rgba(133, 79, 255, 0.2);
          border-radius: 6px;
          color: var(--chat--color-primary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          font-size: 12px;
        }
        
        .intendr-chat-widget .secondary-btn:hover {
          background: rgba(133, 79, 255, 0.05);
          border-color: var(--chat--color-primary);
        }
        
        /* Locations List */
        .intendr-chat-widget .locations-list {
          margin-bottom: 12px;
        }
        
        .intendr-chat-widget .location-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border: 1px solid rgba(133, 79, 255, 0.1);
          border-radius: 6px;
          margin-bottom: 6px;
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .intendr-chat-widget .location-item:hover {
          border-color: var(--chat--color-primary);
          box-shadow: 0 2px 8px rgba(133, 79, 255, 0.1);
        }
        
        .intendr-chat-widget .location-info h4 {
          margin: 0 0 2px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        
        .intendr-chat-widget .location-info p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.3;
        }
        
        .intendr-chat-widget .distance-info {
          margin: 2px 0 0 0 !important;
          font-size: 11px !important;
          color: var(--chat--color-primary) !important;
          font-weight: 600 !important;
          background: rgba(133, 79, 255, 0.1) !important;
          padding: 2px 6px !important;
          border-radius: 3px !important;
          display: inline-block !important;
        }
        
        .intendr-chat-widget .select-location-btn {
          padding: 6px 12px;
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }
        
        .intendr-chat-widget .select-location-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.3);
        }
        
        /* Calendar */
        .intendr-chat-widget .calendar-container {
          margin-bottom: 12px;
        }
        
        .intendr-chat-widget .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .intendr-chat-widget .calendar-nav {
          background: none;
          border: none;
          font-size: 16px;
          color: var(--chat--color-primary);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .intendr-chat-widget .calendar-nav:hover {
          background: rgba(133, 79, 255, 0.1);
        }
        
        .intendr-chat-widget .calendar-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        
        .intendr-chat-widget .calendar-grid {
          border: 1px solid rgba(133, 79, 255, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .intendr-chat-widget .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: rgba(133, 79, 255, 0.05);
        }
        
        .intendr-chat-widget .calendar-weekdays div {
          padding: 8px 6px;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #666;
          border-bottom: 1px solid rgba(133, 79, 255, 0.1);
        }
        
        .intendr-chat-widget .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        
        .intendr-chat-widget .calendar-day {
          padding: 8px 6px;
          text-align: center;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border-right: 1px solid rgba(133, 79, 255, 0.05);
          border-bottom: 1px solid rgba(133, 79, 255, 0.05);
        }
        
        .intendr-chat-widget .calendar-day:hover:not(.past):not(.other-month) {
          background: rgba(133, 79, 255, 0.1);
        }
        
        .intendr-chat-widget .calendar-day.other-month {
          color: #ccc;
          cursor: default;
        }
        
        .intendr-chat-widget .calendar-day.past {
          color: #ccc;
          cursor: default;
        }
        
        .intendr-chat-widget .calendar-day.today {
          background: rgba(133, 79, 255, 0.1);
          font-weight: 600;
        }
        
        .intendr-chat-widget .calendar-day.selected {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          font-weight: 600;
        }
        
        /* Time Slots */
        .intendr-chat-widget .time-slots {
          margin-top: 12px;
        }
        
        .intendr-chat-widget .time-slots h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        
        .intendr-chat-widget .time-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
          gap: 6px;
        }
        
        .intendr-chat-widget .time-slot {
          padding: 8px 6px;
          background: white;
          border: 1px solid rgba(133, 79, 255, 0.2);
          border-radius: 4px;
          color: #333;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        
        .intendr-chat-widget .time-slot:hover {
          border-color: var(--chat--color-primary);
          background: rgba(133, 79, 255, 0.05);
        }
        
        .intendr-chat-widget .time-slot.selected {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border-color: transparent;
        }
        
        /* Contact Form */
        .intendr-chat-widget .contact-form {
          margin-top: 12px;
        }
        
        .intendr-chat-widget .form-group {
          margin-bottom: 10px;
        }
        
        .intendr-chat-widget .form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #333;
        }
        
        .intendr-chat-widget .form-group input,
        .intendr-chat-widget .form-group textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid rgba(133, 79, 255, 0.2);
          border-radius: 6px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        
        .intendr-chat-widget .form-group input:focus,
        .intendr-chat-widget .form-group textarea:focus {
          border-color: var(--chat--color-primary);
          box-shadow: 0 0 0 2px rgba(133, 79, 255, 0.1);
        }
        
        .intendr-chat-widget .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }
        
        .intendr-chat-widget .form-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        
        .intendr-chat-widget .back-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid rgba(133, 79, 255, 0.2);
          border-radius: 6px;
          color: var(--chat--color-primary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }
        
        .intendr-chat-widget .back-btn:hover {
          background: rgba(133, 79, 255, 0.05);
          border-color: var(--chat--color-primary);
        }
        
        .intendr-chat-widget .submit-btn {
          flex: 1;
          padding: 8px 16px;
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }
        
        .intendr-chat-widget .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.3);
        }
        
        .intendr-chat-widget .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Funnel Actions */
        .intendr-chat-widget .funnel-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-start;
        }
        
        /* Success State */
        .intendr-chat-widget .funnel-success {
          text-align: center;
          padding: 20px 12px;
        }
        
        .intendr-chat-widget .success-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          margin: 0 auto 12px;
        }
        
        .intendr-chat-widget .funnel-success h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }
        
        .intendr-chat-widget .funnel-success p {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .intendr-chat-widget .success-actions {
          display: flex;
          justify-content: center;
        }
        
        .intendr-chat-widget .primary-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
        }
        
        .intendr-chat-widget .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.3);
        }
        
        /* Mobile Responsive */
        @media screen and (max-width: 600px) {
          .intendr-chat-widget .location-search {
            flex-direction: column;
          }
          
          .intendr-chat-widget .location-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .intendr-chat-widget .select-location-btn {
            align-self: stretch;
          }
          
          .intendr-chat-widget .time-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .intendr-chat-widget .form-actions {
            flex-direction: column;
          }
          
          .intendr-chat-widget .funnel-content {
            padding: 16px;
          }
        }
      `;
      
      // Inject styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      
      // Create DOM elements
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'intendr-chat-widget';
      
      const chatContainer = document.createElement('div');
      chatContainer.className = `chat-container${config.style.position === 'left' ? ' position-left' : ''}`;
      
      const chatInterfaceHTML = `
        <div class="chat-interface">
          <div class="brand-header">
            <img src="${config.branding.logo}" alt="${config.branding.name}">
            <span>${config.branding.name}</span>
            <button class="close-button">×</button>
          </div>
          <div class="chat-messages"></div>
          <div class="initial-buttons-container" style="display: none;"></div>
          <div class="chat-input">
            <textarea placeholder="Type your message here..." rows="1"></textarea>
            <button type="submit">Send</button>
          </div>
        </div>
        
        <div class="funnel-panel" style="display: none;">
          <div class="funnel-header">
            <button class="back-to-chat-btn" onclick="window.intendrSmartBackNavigation()">←</button>
            <h2>Schedule a Tour</h2>
            <div class="funnel-progress-container">
              <div class="funnel-progress"></div>
            </div>
          </div>
          <div class="funnel-content"></div>
        </div>
      `;
      
      chatContainer.innerHTML = chatInterfaceHTML;
      
      const toggleButton = document.createElement('button');
      toggleButton.className = `chat-toggle${config.style.position === 'left' ? ' position-left' : ''}`;
      toggleButton.innerHTML = `
        <div class="chat-toggle-content">
          <div class="online-indicator"></div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
          </svg>
          <span class="chat-toggle-text">Chat with us!</span>
        </div>
      `;
      
      // Position the chat toggle button to the left of where phone button will be
      if (config.style.position !== 'left') {
        toggleButton.style.right = '85px';
      }
      
      widgetContainer.appendChild(chatContainer);
      widgetContainer.appendChild(toggleButton);
      
      // Create phone call button
      const phoneButton = document.createElement('button');
      phoneButton.className = `chat-toggle phone-toggle${config.style.position === 'left' ? ' position-left' : ''}`;
      phoneButton.innerHTML = `
        <div class="chat-toggle-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        </div>
      `;
      
      // Style the phone button - keep at original position
      phoneButton.style.position = 'fixed';
      phoneButton.style.bottom = '20px';
      phoneButton.style.right = config.style.position === 'left' ? '20px' : '20px'; // Right side positioning
      phoneButton.style.width = '60px';
      phoneButton.style.height = '60px';
      phoneButton.style.borderRadius = '50%';
      phoneButton.style.display = 'flex';
      phoneButton.style.alignItems = 'center';
      phoneButton.style.justifyContent = 'center';
      phoneButton.style.background = 'linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%)';
      phoneButton.style.color = 'white';
      phoneButton.style.border = 'none';
      phoneButton.style.cursor = 'pointer';
      phoneButton.style.boxShadow = '0 4px 12px var(--chat--color-primary)';
      phoneButton.style.zIndex = '2147483646';
      phoneButton.style.padding = '0';
      
      // Remove the position adjustment of the chat toggle button
      // Let both buttons sit in their natural positions
      
      // Phone button click handler
      phoneButton.onclick = function(e) {
        e.stopPropagation();
        
        // Remove any existing tooltip
        const existingTooltip = document.getElementById('intendr-phone-tooltip');
        if (existingTooltip) {
          existingTooltip.remove();
          return;
        }
        
        // Create tooltip - use a more compact style matching the in-chat tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'intendr-phone-tooltip';
        tooltip.className = 'intendr-widget-overlay';
        
        // Apply defensive styles
        Object.assign(tooltip.style, {
          position: 'fixed',
          bottom: '130px',
          right: config.style.position === 'left' ? '20px' : '20px',
          background: 'white',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          padding: '10px',
          zIndex: '2147483646',
          width: '200px',
          boxSizing: 'border-box',
          margin: '0',
          border: 'none',
          outline: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          lineHeight: '1.4',
          color: '#333',
          textAlign: 'left'
        })
        
        // Add a CSS pointer to connect tooltip to phone button
        const pointerStyle = document.createElement('style');
        pointerStyle.textContent = `
          #intendr-phone-tooltip::after {
            content: '';
            position: absolute;
            bottom: -10px;
            right: 30px;
            margin-left: -10px;
            border-width: 10px 10px 0;
            border-style: solid;
            border-color: white transparent transparent transparent;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
          }
        `;
        document.head.appendChild(pointerStyle);
        
        tooltip.innerHTML = `
          <div style="font-size:1.1rem;font-weight:600;margin-bottom:8px;color:#333;">Prefer to talk on the phone?</div>
          <div style="font-size:0.9rem;color:#666;margin-bottom:12px;">I can ring you now at the number you enter below to make things easier!</div>
          <div id="intendr-phone-input-container" style="width:100% !important;box-sizing:border-box !important;margin:0 !important;padding:0 !important;">
            <input type="tel" id="intendr-direct-phone-input" placeholder="(123) 123-1234" style="width:100% !important;padding:10px !important;border-radius:4px !important;border:1px solid #ccc !important;margin:0 0 6px 0 !important;font-size:1rem !important;box-sizing:border-box !important;font-family:inherit !important;line-height:normal !important;background:white !important;color:#333 !important;outline:none !important;text-align:left !important;">
            <div id="intendr-direct-phone-validation" style="color:#c00 !important;margin:0 0 6px 0 !important;text-align:left !important;display:none !important;font-size:0.85rem !important;font-family:inherit !important;line-height:1.2 !important;padding:0 !important;"></div>
            <button id="intendr-direct-start-call" style="width:100% !important;padding:10px !important;border-radius:4px !important;background:linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%) !important;color:#fff !important;font-weight:500 !important;font-size:1rem !important;border:none !important;cursor:pointer !important;box-sizing:border-box !important;box-shadow:0 4px 12px rgba(133, 79, 255, 0.2) !important;font-family:inherit !important;line-height:normal !important;text-align:center !important;margin:0 !important;outline:none !important;">Start Call</button>
          </div>
          <div id="intendr-direct-call-error" style="color:#c00;margin-top:8px;text-align:center;display:none;"></div>
        `;
        
        // Add the tooltip to the body, not as a child of the button
        document.body.appendChild(tooltip);
        
        // Correctly position the tooltip after it's been created
        const phoneRect = phoneButton.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position tooltip to align the pointer with the center of the phone button
        // Add mobile-specific positioning
        if (window.innerWidth <= 600) {
          tooltip.style.width = '280px';
          tooltip.style.left = '20px';
          tooltip.style.right = 'auto';
          tooltip.style.transform = 'none';
          tooltip.style.bottom = '90px';
          tooltip.style.top = 'auto';
        } else {
          tooltip.style.right = `${window.innerWidth - phoneRect.right - (phoneRect.width / 2) + 30}px`;
        }
        
        // Close tooltip when clicking outside
        document.addEventListener('click', function closeDirectTooltip(e) {
          if (!tooltip.contains(e.target) && e.target !== phoneButton) {
            tooltip.remove();
            document.removeEventListener('click', closeDirectTooltip);
          }
        });
        
        // Add validation functions for direct phone input
        const directPhoneInput = document.getElementById('intendr-direct-phone-input');
        const directValidationDiv = document.getElementById('intendr-direct-phone-validation');
        
        function validateDirectPhoneNumber(phone) {
          const digits = phone.replace(/\D/g, '');
          if (digits.length === 10) {
            return { valid: true, formatted: `+1${digits}` };
          } else if (digits.length === 11 && digits.startsWith('1')) {
            return { valid: true, formatted: `+${digits}` };
          } else {
            return { 
              valid: false, 
              error: 'Please enter a valid US phone number (10 digits)' 
            };
          }
        }
        
        function showDirectValidationError(message) {
          directValidationDiv.textContent = message;
          directValidationDiv.style.display = 'block';
          directPhoneInput.style.borderColor = '#c00';
        }
        
        function clearDirectValidationError() {
          directValidationDiv.style.display = 'none';
          directPhoneInput.style.borderColor = '#ccc';
        }
        
        // Add real-time validation
        directPhoneInput.addEventListener('input', function() {
          const value = this.value.trim();
          if (value) {
            const validation = validateDirectPhoneNumber(value);
            if (validation.valid) {
              clearDirectValidationError();
            } else {
              showDirectValidationError(validation.error);
            }
          } else {
            clearDirectValidationError();
          }
        });
        
        // Handle the call button click
        document.getElementById('intendr-direct-start-call').onclick = async function() {
          const phone = directPhoneInput.value.trim();
          const errorDiv = document.getElementById('intendr-direct-call-error');
          
          // Clear previous errors
          errorDiv.style.display = 'none';
          clearDirectValidationError();
          
          if (!phone) {
            showDirectValidationError('Please enter your phone number.');
            return;
          }
          
          const validation = validateDirectPhoneNumber(phone);
          if (!validation.valid) {
            showDirectValidationError(validation.error);
            return;
          }
          
          try {
            // Disable input while processing
            directPhoneInput.disabled = true;
            document.getElementById('intendr-direct-start-call').disabled = true;
            document.getElementById('intendr-direct-start-call').textContent = 'Connecting...';
            
            // Use formatted phone number with +1
            await initiateVoiceCall('phone_raw', validation.formatted);
            
            // Show success message
            errorDiv.style.color = '#090';
            errorDiv.textContent = 'Call initiated! Please answer your phone.';
            errorDiv.style.display = 'block';
            
            // Remove tooltip after a delay
            setTimeout(() => {
              tooltip.remove();
            }, 3000);
            
          } catch (err) {
            errorDiv.textContent = err.message || "Couldn't connect your call. Please try again.";
            errorDiv.style.display = 'block';
            
            // Re-enable input
            directPhoneInput.disabled = false;
            document.getElementById('intendr-direct-start-call').disabled = false;
            document.getElementById('intendr-direct-start-call').textContent = 'Start Call';
          }
        };
      };
      
      widgetContainer.appendChild(phoneButton);
      document.body.appendChild(widgetContainer);
      
      // Get references to elements
      const chatInterface = chatContainer.querySelector('.chat-interface');
      const messagesContainer = chatContainer.querySelector('.chat-messages');
      const textarea = chatContainer.querySelector('textarea');
      const sendButton = chatContainer.querySelector('button[type="submit"]');
      const closeButton = chatContainer.querySelector('.close-button');
      
      // Add event listeners
      toggleButton.addEventListener('click', function() {
        if (!chatContainer.classList.contains('open')) {
          chatContainer.classList.add('open');
          toggleButton.classList.add('hidden');
          
          // Handle mobile
          if (window.innerWidth <= 600) {
            document.body.style.overflow = 'hidden';
          }
          
          // Clear any existing messages first
          messagesContainer.innerHTML = '';
          
          // Try to load existing session
          const sessionRestored = loadSession();
          
          if (!sessionRestored) {
            // Create new session
            inactivityMessageSent = false;
            currentSessionId = generateSessionId();
            
            // Generate page context before sending initial messages
            generatePageSummary().then(() => {
              // Send initial messages after page context is generated
              sendInitialMessages();
            });
          }
          
          // Save session after changes
          saveSession();
          
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          startInactivityTimer();
          clearTimeout(promptBubbleTimer);
        }
      });

      closeButton.addEventListener('click', function() {
        // Track session end before closing
        const messagesContainer = document.querySelector('.chat-messages');
        const userMessages = messagesContainer ? messagesContainer.querySelectorAll('.chat-message.user') : [];
        const botMessages = messagesContainer ? messagesContainer.querySelectorAll('.chat-message.bot') : [];
        
        if (userMessages.length > 0) {
          trackAnalyticsEvent('session_end', {
            messageCount: userMessages.length + botMessages.length,
            userMessageCount: userMessages.length,
            botMessageCount: botMessages.length,
            sessionDuration: Date.now() - (new Date().getTime() || Date.now())
          });
        }

        if (overlayDiv) {
          hideOvertakeModal();
        } else {
          hideChat();
        }
        userManuallyClosedChat = true;
        saveChatState(true);
        if (window.innerWidth <= 600) document.body.style.overflow = '';
      });

      // Handle textarea input
      textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
      });

      // Enhanced handleMessageSend to support close commands
      function handleMessageSend() {
        // Find the current active textarea - try window reference first, 
        // then global textarea, then query for it directly
        const input = window.intendrTextarea || 
                     textarea || 
                     document.querySelector('.chat-input textarea');
                     
        if (!input) {
          console.error('[Intendr] No textarea found for message sending');
          return;
        }
        
        const message = input.value.trim();
        if (!message) return;
        
        // Check for close commands
        const closeCommands = ['close', 'close chat', 'exit', 'quit', 'dismiss'];
        if (closeCommands.includes(message.toLowerCase())) {
          if (overlayDiv) hideOvertakeModal();
          else hideChat();
          input.value = '';
          return;
        }
        
        // Clear any action buttons before sending new message
        clearActionButtons();
        
        sendMessage(message);
        input.value = '';
        input.style.height = 'auto';
        
        // After sending message, check buttons (will hide them since user message now exists)
        setTimeout(showInitialButtons, 100);
      }

      sendButton.addEventListener('click', handleMessageSend);
      textarea.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleMessageSend();
        }
      });

      // Handle window resize
      window.addEventListener('resize', function() {
        if (window.innerWidth <= 600) {
          if (chatContainer.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
          }
        } else {
          document.body.style.overflow = '';
        }
      });
      
      // Store page summary globally
      let pageSummary = null;
      let summaryFetchTimeout = null;
      
      // Function to determine page type
      function determinePageType() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/products/') || path.includes('/inventory/') || path.includes('/catalog/')) {
          return 'products';
        } else if (path.includes('/services/') || path.includes('/service/')) {
          return 'services';
        } else if (path.includes('/about')) {
          return 'about';
        } else if (path.includes('/contact')) {
          return 'contact';
        } else if (path.includes('/pricing') || path.includes('/plans')) {
          return 'pricing';
        } else if (path.includes('/support') || path.includes('/help')) {
          return 'support';
        } else if (path === '/' || path === '/index.html') {
          return 'home';
        }
        return 'other';
      }

      // Function to clean HTML content
      function cleanHtmlContent(element) {
        if (!element) return '';
        
        // Clone the entire document body to get all content
        const clone = document.body.cloneNode(true);
        
        // Remove all chat containers and their contents
        const chatContainers = clone.querySelectorAll('.chat-container');
        chatContainers.forEach(container => container.remove());
        
        // Remove all script, style, and other non-content elements
        const elementsToRemove = [
          'script', 'style', 'noscript', 'iframe', 'svg', 'img', 
          'button', 'input', 'select', 'textarea', 'form',
          'link', 'meta', 'head', 'style', 'script'
        ];
        
        elementsToRemove.forEach(selector => {
          const elements = clone.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });
        
        // Get all text content
        let text = clone.textContent || clone.innerText;
        
        // Clean up the text
        text = text
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/\n+/g, ' ')  // Replace newlines with space
          .replace(/\t+/g, ' ')  // Replace tabs with space
          .replace(/\r+/g, ' ')  // Replace carriage returns with space
          .replace(/\s+/g, ' ')  // Clean up any remaining multiple spaces
          .trim();
        
        // Remove any remaining HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        // Remove any special characters that might be causing issues
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        return text;
      }

      // Function to extract navigation links
      function collectNavigationLinks() {
        // Check if we already have stored links
        const storedLinks = localStorage.getItem(INTENDR_STORAGE_KEYS.navLinks)
        if (storedLinks) return JSON.parse(storedLinks)

        const links = new Set()
        
        // Function to process links from an element
        function processLinks(element) {
            if (!element) return
            const anchorElements = element.querySelectorAll('a[href]')
            anchorElements.forEach(anchor => {
                const href = anchor.getAttribute('href')
                const text = anchor.textContent.trim()
                if (href && !href.startsWith('#') && !href.startsWith('javascript:') && text) {
                    // Convert relative URLs to absolute
                    const absoluteUrl = new URL(href, window.location.origin).href
                    // Store as object with text and url
                    links.add(JSON.stringify({
                        text: text,
                        url: absoluteUrl
                    }))
                }
            })
        }

        // Try to find navigation elements
        const navElement = document.querySelector('nav')
        const headerElement = document.querySelector('header')
        
        // Process nav and header if they exist
        if (navElement) processLinks(navElement)
        if (headerElement) processLinks(headerElement)

        // If no links found in nav/header, look for elements with 'nav' in their class
        if (links.size === 0) {
            const navLikeElements = document.querySelectorAll('[class*="nav"]')
            navLikeElements.forEach(element => processLinks(element))
        }

        // Convert Set of JSON strings back to array of objects
        const linksArray = Array.from(links).map(link => JSON.parse(link))
        localStorage.setItem(INTENDR_STORAGE_KEYS.navLinks, JSON.stringify(linksArray))
        return linksArray
      }

      // Function to generate page summary with caching
      async function generatePageSummary() {
        try {
          // Get navigation links
          const navigationLinks = collectNavigationLinks();

          // Get page type
          const pageType = determinePageType();

          // Clean the entire page content
          const cleanedContent = cleanHtmlContent(document.body);
          if (!cleanedContent) {
            console.log('No text content found on page');
            return null;
          }

          // Generate content hash
          const contentHash = await generateContentHash(cleanedContent);

          // Check cache
          const cachedSummary = getCachedSummary(window.location.href, contentHash);
          if (cachedSummary) {
            console.log('Using cached page summary');
            return {
              ...cachedSummary,
              navigationLinks
            };
          }

          // Prepare metadata
          const metadata = {
            title: document.title,
            url: window.location.href,
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            type: pageType,
            business: config.business,
            navigationLinks
          };

          // Generate summary
          const response = await fetch(INTENDR_API_ENDPOINTS.pageContext, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            },
            body: JSON.stringify({
              content: cleanedContent,
              metadata: metadata
            })
          });

          if (!response.ok) {
            console.warn('Failed to generate page summary:', response.status, response.statusText);
            return null;
          }

          const summary = await response.text();
          if (summary) {
            cacheSummary(window.location.href, contentHash, summary);
            return {
              summary,
              navigationLinks
            };
          }

          console.warn('Empty response from page context webhook');
          return null;
        } catch (error) {
          console.error('Error generating page summary:', error);
          return null;
        }
      }

      // Function to generate a simple hash of the content
      async function generateContentHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      // Function to get cached summary
      function getCachedSummary(url, contentHash) {
        try {
          const cached = localStorage.getItem(INTENDR_STORAGE_KEYS.pageSummary);
          if (cached) {
            const { url: cachedUrl, hash: cachedHash, summary, timestamp } = JSON.parse(cached);
            // Check if the cache is for the same URL, content, and less than 1 hour old
            if (cachedUrl === url && cachedHash === contentHash && 
                (Date.now() - timestamp) < 3600000) { // 1 hour cache
              return summary;
            }
          }
        } catch (error) {
          console.error('Error reading cached summary:', error);
        }
        return null;
      }

      // Function to cache summary
      function cacheSummary(url, contentHash, summary) {
        try {
          const cacheData = {
            url,
            hash: contentHash,
            summary,
            timestamp: Date.now()
          };
          localStorage.setItem(INTENDR_STORAGE_KEYS.pageSummary, JSON.stringify(cacheData));
        } catch (error) {
          console.error('Error caching summary:', error);
        }
      }

      // Debounced function to generate summary
      function debouncedGenerateSummary() {
        if (summaryFetchTimeout) {
          clearTimeout(summaryFetchTimeout);
        }
        summaryFetchTimeout = setTimeout(async () => {
          pageSummary = await generatePageSummary();
        }, 1000); // Wait 1 second after last page change before generating summary
      }

      // Generate summary when page loads
      document.addEventListener('DOMContentLoaded', debouncedGenerateSummary);

      // Generate summary when URL changes (for SPA navigation)
      const lastUrl = window.location.href;
      new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          debouncedGenerateSummary();
            }
      }).observe(document, { subtree: true, childList: true });

      // Send message function
      async function sendMessage(message) {
        if (!message.trim()) return;
        
        // Track session start or update
        const messagesContainer = document.querySelector('.chat-messages');
        const userMessages = messagesContainer ? messagesContainer.querySelectorAll('.chat-message.user') : [];
        
        if (userMessages.length === 0) {
          // First message - track session start
          await trackAnalyticsEvent('session_start', {
            firstMessage: message.trim()
          });
        } else {
          // Subsequent messages - track session update
          await trackAnalyticsEvent('session_update', {
            messageCount: userMessages.length + 1,
            userMessageCount: userMessages.length + 1,
            latestMessage: message.trim()
          });
        }
        
        // Execute beforeSendMessage hook if provided
        if (INTENDR_HOOKS.beforeSendMessage && typeof INTENDR_HOOKS.beforeSendMessage === 'function') {
          try {
            const result = await INTENDR_HOOKS.beforeSendMessage(message);
            if (result === false) return; // Hook can cancel message sending
            if (typeof result === 'string') message = result; // Hook can modify message
          } catch (error) {
            console.error('[Intendr] Error in beforeSendMessage hook:', error);
          }
        }
        
        // Add user message to chat
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        userMessageDiv.textContent = message;
        messagesContainer.appendChild(userMessageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show thinking animation
          // Show thinking animation
          const thinkingDiv = showThinkingAnimation();
          
          try {
          // Get current page context if available
          const currentPageContext = pageSummary || await generatePageSummary();
          
          // Determine if this is the first message of the session
          const isFirstMessage = userMessages.length === 0;
          
          // Prepare message data - only include chat history on first message or when explicitly needed
          const messageData = {
            chatInput: message,
            sessionId: currentSessionId,
            isFirstMessage: isFirstMessage,
            currentPageUrl: window.location.href, // Include current page URL with UTMs
            metadata: {
              business: config.business,
              pageContext: currentPageContext,
              utmParameters: window.initialUtmParameters || {},
              userIP: userIP,
              currentPageUrl: window.location.href // Also include in metadata for consistency
            }
          };
          
          // Only send chat history on first message or session restoration
          if (isFirstMessage) {
            const chatHistory = getChatHistory();
            if (chatHistory.length > 0) {
              messageData.chatHistory = chatHistory;
              console.log('💬 [Chat Context] First message - sending full conversation history to n8n:', chatHistory);
            } else {
              console.log('🆕 [Chat Context] New session - no previous history to send');
            }
          } else {
            console.log('🔄 [Chat Context] Continuing session - sending only current message and sessionId');
          }
          
          // Send to webhook
            const response = await fetch(config.webhook.url, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
              },
              body: JSON.stringify(messageData)
            });
            
          if (!response.ok) {
            // Check if it's a session-related error
            const errorText = await response.text();
            if (response.status === 404 || errorText.includes('session') || errorText.includes('unknown')) {
              console.log('🔄 [Chat Context] Session not found in n8n - resending with full history');
              
              // Resend with full chat history
              const chatHistory = getChatHistory();
              messageData.chatHistory = chatHistory;
              messageData.sessionRecovery = true;
              
              const retryResponse = await fetch(config.webhook.url, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'POST, OPTIONS',
                  'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify(messageData)
              });
              
              if (!retryResponse.ok) throw new Error('Failed to send message after retry');
              response = retryResponse; // Use retry response for processing
            } else {
              throw new Error('Failed to send message: ' + errorText);
            }
          }
          
          // Try to parse as JSON, fallback to plain text
          let botReply = '';
          const responseText = await response.text();
          try {
            const data = JSON.parse(responseText);
            if (Array.isArray(data) && data.length > 0 && data[0].output) {
              botReply = data[0].output;
            } else if (data && typeof data === 'object') {
              botReply = data.output || data.response || data.message || '';
            } else if (typeof data === 'string') {
              botReply = data;
            }
          } catch (e) {
            botReply = responseText;
          }
            // Fallback for empty responses
          if (!botReply || botReply.trim() === '') {
            botReply = "I received your message, but I'm having trouble generating a response.";
            }
            
          // Remove thinking animation
          removeThinkingAnimation();

          // Handle [REDIRECT]...[/REDIRECT] in botReply
          const redirectMatch = botReply.match(/\[REDIRECT\](.*?)\[\/REDIRECT\]/);
          if (redirectMatch && redirectMatch[1]) {
            const originalUrl = redirectMatch[1].trim();
            const redirectUrl = appendUtmToUrl(originalUrl);

            // First, show the message with the redirect URL removed
            const cleanedMessage = botReply.replace(/\[REDIRECT\][\s\S]*?\[\/REDIRECT\]/g, '').trim();
            if (cleanedMessage) {
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
              botMessageDiv.innerHTML = formatMessage(cleanedMessage);
            messagesContainer.appendChild(botMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Then show 'Redirecting you now...' message
            setTimeout(() => {
              const redirectMsgDiv = document.createElement('div');
              redirectMsgDiv.className = 'chat-message bot';
              redirectMsgDiv.innerHTML = formatMessage('Redirecting you now... If you see anything on this page that interests you, let me know and I will give you more details. ');
              messagesContainer.appendChild(redirectMsgDiv);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
              
              // Save session before redirecting
            saveSession();
            
              // Redirect after a 3 second delay
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 3000);
            }, 1000); // Wait 1 second before showing the redirect message
            
            return;
          }

          // Remove any [REDIRECT]...[/REDIRECT] tags from the message if present
          let cleanedReply = botReply.replace(/\[REDIRECT\][\s\S]*?\[\/REDIRECT\]/g, '').trim();

          // Execute customMessageProcessing hook if provided
          if (INTENDR_HOOKS.customMessageProcessing && typeof INTENDR_HOOKS.customMessageProcessing === 'function') {
            try {
              const result = await INTENDR_HOOKS.customMessageProcessing(cleanedReply, botReply);
              if (typeof result === 'string') cleanedReply = result;
            } catch (error) {
              console.error('[Intendr] Error in customMessageProcessing hook:', error);
            }
          }

          // Add bot response (if anything remains after cleaning)
          if (cleanedReply) {
            // Parse action tags and create action buttons
            const processedMessage = parseAndShowActionButtons(cleanedReply);
            
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage(processedMessage);
            messagesContainer.appendChild(botMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Execute afterReceiveMessage hook if provided
            if (INTENDR_HOOKS.afterReceiveMessage && typeof INTENDR_HOOKS.afterReceiveMessage === 'function') {
              try {
                await INTENDR_HOOKS.afterReceiveMessage(cleanedReply, botMessageDiv);
              } catch (error) {
                console.error('[Intendr] Error in afterReceiveMessage hook:', error);
              }
            }
          }
            
          // Save session after changes
            saveSession();

          // Reset inactivity timer
          resetInactivityState();
        } catch (error) {
          console.error('Error sending message:', error);
          removeThinkingAnimation();
          
          // Show error message
          const errorMessageDiv = document.createElement('div');
          errorMessageDiv.className = 'chat-message bot';
          errorMessageDiv.innerHTML = formatMessage("I apologize, but I'm having trouble connecting right now. Please try again in a moment.");
          messagesContainer.appendChild(errorMessageDiv);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
      
      // Function to send initial messages
      function sendInitialMessages() {
        const businessName = config.business.name || '[BusinessName]';
        const messages = [
          `${INTENDR_BRANDING.greetingText} I am here to help you with ${businessName}. How can I assist you today?`
        ];

        messages.forEach((message, index) => {
          setTimeout(() => {
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage(message);
            messagesContainer.appendChild(botMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          saveSession();
          }, index * 1000); // Send each message with a 1-second delay
        });
      }

      // Overtake modal logic
      function shouldShowOvertake() {
        const pathToMatch = config.overtakePath || '/';
        return config.overtake === true &&
          window.location.pathname === pathToMatch &&
          !localStorage.getItem(INTENDR_STORAGE_KEYS.overtakeShown);
      }

      let overlayDiv = null;
      function showOvertakeModal() {
        overlayDiv = document.createElement('div');
        overlayDiv.className = 'intendr-overtake-overlay';
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.inset = '0';
        overlayDiv.style.background = 'rgba(0,0,0,0.6)';
        overlayDiv.style.zIndex = '2147483646';
        overlayDiv.style.display = 'flex';
        overlayDiv.style.alignItems = 'center';
        overlayDiv.style.justifyContent = 'center';
        overlayDiv.style.transition = 'opacity 0.4s';
        overlayDiv.style.opacity = '0';
        overlayDiv.style.animation = 'intendr-fadein 0.4s forwards';
        chatContainer.classList.add('overtake-modal');
        chatContainer.style.position = 'relative';
        chatContainer.style.left = '';
        chatContainer.style.top = '';
        chatContainer.style.transform = '';
        chatContainer.style.zIndex = '2147483647';
        chatContainer.style.width = '800px';
        chatContainer.style.height = 'auto';
        chatContainer.style.maxHeight = '90vh';
        chatContainer.style.borderRadius = '18px';
        chatContainer.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
        chatContainer.style.opacity = '0';
        chatContainer.style.background = '#fff';
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column';
        chatContainer.style.padding = '32px 28px 20px 28px';
        chatContainer.style.transition = 'opacity 0.4s';
        
        // Ensure CSS variables are set for the overtake modal
        chatContainer.style.setProperty('--chat--color-primary', config.style.primaryColor);
        chatContainer.style.setProperty('--chat--color-secondary', config.style.secondaryColor);
        
        setTimeout(() => { chatContainer.style.opacity = '1'; }, 50);
        if (window.innerWidth <= 900) {
          chatContainer.style.width = '95vw';
        }
          if (window.innerWidth <= 600) {
          chatContainer.style.width = '95vw';
          chatContainer.style.height = '85vh';
          chatContainer.style.maxHeight = '85vh';
          chatContainer.style.borderRadius = '12px';
          chatContainer.style.padding = '16px 6px 10px 6px';
        }
        toggleButton.classList.add('hidden');
        document.body.appendChild(overlayDiv);
        overlayDiv.appendChild(chatContainer);
            document.body.style.overflow = 'hidden';
        localStorage.setItem(INTENDR_STORAGE_KEYS.overtakeShown, '1');
        showChat();
      }

      function hideOvertakeModal() {
        if (overlayDiv) {
          widgetContainer.appendChild(chatContainer);
          overlayDiv.remove();
          overlayDiv = null;
        }
        chatContainer.classList.remove('overtake-modal');
        chatContainer.style.position = '';
        chatContainer.style.left = '';
        chatContainer.style.top = '';
        chatContainer.style.transform = '';
        chatContainer.style.zIndex = '';
        chatContainer.style.width = '';
        chatContainer.style.height = '';
        chatContainer.style.maxHeight = '';
        chatContainer.style.borderRadius = '';
        chatContainer.style.boxShadow = '';
        chatContainer.style.opacity = '';
        chatContainer.style.background = '';
        chatContainer.style.display = '';
        chatContainer.style.flexDirection = '';
        chatContainer.style.padding = '';
        document.body.style.overflow = '';
        hideChat();
          }
          
      // Add fade-in keyframes and modal polish styles
      const modalStyles = document.createElement('style');
      modalStyles.textContent = `
        @keyframes intendr-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .intendr-overtake-overlay {
          animation: intendr-fadein 0.4s forwards;
        }
        .overtake-modal .brand-header {
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 12px;
        }
        .overtake-modal .brand-header img {
          width: 40px;
          height: 40px;
          margin-right: 10px;
        }
        .overtake-modal .brand-header span {
          font-size: 22px;
          font-weight: 600;
        }
        .overtake-modal .close-button {
          position: absolute;
          right: 18px;
          top: 18px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 28px;
          color: #888;
          opacity: 0.7;
          z-index: 2;
          transition: opacity 0.2s;
        }
        .overtake-modal .close-button:hover {
          opacity: 1;
        }
        .overtake-modal .chat-messages {
          display: flex;
          flex-direction: column;
          flex: 1 1 0%;
          overflow-y: auto;
          padding: 10px 0 10px 0;
          margin-bottom: 10px;
          background: none;
          min-height: 400px;
        }
        .overtake-modal .chat-input {
          padding: 0;
          border-top: 1px solid #f0f0f0;
          margin-top: 10px;
          background: none;
          display: flex;
          align-items: center;
        }
        .overtake-modal .chat-input textarea {
          flex: 1 !important;
          padding: 12px !important;
          border: 1px solid rgba(133, 79, 255, 0.2) !important;
          border-radius: 8px !important;
          resize: none !important;
          font-family: inherit !important;
          font-size: 14px !important;
          height: auto !important;
          min-height: 40px !important;
          max-height: 120px !important;
          width: auto !important;
          box-sizing: border-box !important;
          margin-right: 8px;
        }
        .overtake-modal .chat-input button[type="submit"] {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0 18px;
          cursor: pointer;
          font-weight: 500;
          font-size: 16px;
          height: 40px;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .overtake-modal .chat-input button[type="submit"] svg {
          fill: #fff;
          stroke: #fff;
        }
        .overtake-modal .chat-message.user {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: #fff;
          align-self: flex-end;
          text-align: right;
          margin-left: auto;
          margin-right: 0;
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin: 8px 0;
          max-width: 80%;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.5;
        }
        .overtake-modal #intendr-voice-button {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
        }
        @media (max-width: 600px) {
          .overtake-modal {
            padding: 0 !important;
          }
          .overtake-modal .brand-header img {
            width: 32px;
            height: 32px;
          }
          .overtake-modal .brand-header span {
            font-size: 18px;
          }
          .overtake-modal .chat-messages {
            min-height: 200px;
          }
        }
        .chat-container.overtake-modal {
          height: 100% !important;
        }
        .chat-interface {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }
        .overtake-modal {
          height: 60vh;
          max-height: 60vh;
          display: flex;
          flex-direction: column;
        }
        .overtake-modal .chat-messages {
          flex: 1 1 0%;
          overflow-y: auto;
          min-height: 0;
        }
        @media (max-width: 600px) {
          .overtake-modal {
            height: 85vh !important;
            max-height: 85vh !important;
          }
        }
      `;
      document.head.appendChild(modalStyles);
          
      // Add/restore CSS for responsive modal width
      const modalResponsiveStyles = document.createElement('style');
      modalResponsiveStyles.textContent = `
        .overtake-modal {
          width: 800px !important;
          max-width: 95vw;
        }
        @media (max-width: 900px) {
          .overtake-modal {
            width: 95vw !important;
          }
        }
        @media (max-width: 600px) {
          .overtake-modal {
            width: 95vw !important;
            height: 85vh !important;
            max-height: 85vh !important;
            border-radius: 12px !important;
            padding: 16px 6px 10px 6px !important;
          }
        }
      `;
      document.head.appendChild(modalResponsiveStyles);

      // On load, check for overtake
      if (shouldShowOvertake()) {
        setTimeout(() => {
          showOvertakeModal();
        }, 400); // slight delay for effect
      }

      // --- Chat Initialization Refactor ---
      function initChat() {
        // Only run once
        if (window.IntendrChatWidgetChatInitialized) return;
        window.IntendrChatWidgetChatInitialized = true;

        // Load funnel data if exists
        const funnelDataLoaded = loadFunnelData();
        if (funnelDataLoaded && currentFunnel) {
          // If we have active funnel data, show funnel panel instead of chat
          showFunnelPanel();
        } else {
          // Restore session or show initial messages
          const sessionRestored = loadSession();
          if (!sessionRestored) {
            inactivityMessageSent = false;
            currentSessionId = generateSessionId();
            sendInitialMessages();
            generatePageSummary();
          }
          saveSession();
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          startInactivityTimer();
          clearTimeout(promptBubbleTimer);
        }

        // Add event listeners (only once)
        toggleButton.addEventListener('click', function() {
          showChat();
        });
        closeButton.addEventListener('click', function() {
          // Track session end before closing
          const messagesContainer = document.querySelector('.chat-messages');
          const userMessages = messagesContainer ? messagesContainer.querySelectorAll('.chat-message.user') : [];
          const botMessages = messagesContainer ? messagesContainer.querySelectorAll('.chat-message.bot') : [];
          
          if (userMessages.length > 0) {
            trackAnalyticsEvent('session_end', {
              messageCount: userMessages.length + botMessages.length,
              userMessageCount: userMessages.length,
              botMessageCount: botMessages.length,
              sessionDuration: Date.now() - (new Date().getTime() || Date.now())
            });
          }

          hideChat();
          userManuallyClosedChat = true;
          saveChatState(true);
          if (window.innerWidth <= 600) document.body.style.overflow = '';
        });
        sendButton.addEventListener('click', handleMessageSend);
        textarea.addEventListener('keypress', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleMessageSend();
          }
        });
        textarea.addEventListener('input', function() {
          this.style.height = 'auto';
          this.style.height = (this.scrollHeight) + 'px';
        });
        window.addEventListener('resize', function() {
          if (window.innerWidth <= 600) {
            if (chatContainer.classList.contains('open')) document.body.style.overflow = 'hidden';
          } else {
        document.body.style.overflow = '';
          }
        });
      }

      function showChat() {
            hidePromptBubble();
            promptBubbleShown = true;
            chatContainer.classList.add('open');
            toggleButton.classList.add('hidden');
        if (window.innerWidth <= 600) document.body.style.overflow = 'hidden';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        startInactivityTimer();
        clearTimeout(promptBubbleTimer);
      }

      function hideChat() {
        chatContainer.classList.remove('open');
        toggleButton.classList.remove('hidden');
        if (window.innerWidth <= 600) document.body.style.overflow = '';
      }

      // --- End Chat Initialization Refactor ---

      // Call initChat on page load
      initChat();

      // Generate page summary on load
      generatePageSummary();

      // Ensure chat input row markup and send button are correct
      // (Rebuild input row if needed)
      function ensureInputRow() {
        const chatInputDiv = chatContainer.querySelector('.chat-input');
        if (!chatInputDiv) return;
        chatInputDiv.innerHTML = '';
        
        // Voice button with microphone and phone icons
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.title = 'Transfer to Phone';
        voiceBtn.id = 'intendr-voice-button';
        voiceBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        `;
        voiceBtn.style.display = 'flex';
        voiceBtn.style.alignItems = 'center';
        voiceBtn.style.justifyContent = 'center';
        voiceBtn.style.background = 'linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%)';
        voiceBtn.style.color = 'white';
        voiceBtn.style.border = 'none';
        voiceBtn.style.borderRadius = '8px';
        voiceBtn.style.padding = '0 12px';
        voiceBtn.style.cursor = 'pointer';
        voiceBtn.style.fontWeight = '500';
        voiceBtn.style.fontSize = '16px';
        voiceBtn.style.height = '40px';
        voiceBtn.style.minWidth = '40px';
        voiceBtn.style.marginRight = '0';
        
        // Simple phone call initiation
        voiceBtn.onclick = function(e) {
          e.stopPropagation();
          showVoiceTransferModal(); // Use the existing modal for phone calls
        };
        
        // Textarea
        const textareaEl = document.createElement('textarea');
        textareaEl.placeholder = 'Type your message here...';
        textareaEl.rows = 1;
        textareaEl.style.resize = 'none';
        textareaEl.style.flex = '1';
        textareaEl.style.marginRight = '8px';
        textareaEl.className = textarea.className;
        
        // Send button
        const sendBtn = document.createElement('button');
        sendBtn.type = 'submit';
        sendBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
        sendBtn.style.display = 'flex';
        sendBtn.style.alignItems = 'center';
        sendBtn.style.justifyContent = 'center';
        sendBtn.style.background = 'linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%)';
        sendBtn.style.color = 'white';
        sendBtn.style.border = 'none';
        sendBtn.style.borderRadius = '8px';
        sendBtn.style.padding = '0 18px';
        sendBtn.style.cursor = 'pointer';
        sendBtn.style.fontWeight = '500';
        sendBtn.style.fontSize = '16px';
        sendBtn.style.height = '40px';
        sendBtn.style.minWidth = '40px';
        
        // Add elements to container
        // Temporarily commented out voice button - will bring back later
        // chatInputDiv.appendChild(voiceBtn);
        chatInputDiv.appendChild(textareaEl);
        chatInputDiv.appendChild(sendBtn);
        
        // Re-attach listeners
        sendBtn.addEventListener('click', handleMessageSend);
        textareaEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
            handleMessageSend();
          }
        });
        textareaEl.addEventListener('input', function() {
          this.style.height = 'auto';
          this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Update references
        window.intendrTextarea = textareaEl;
      }
      ensureInputRow();

      // Add/restore CSS for message bubbles and input row
      const bubbleStyles = document.createElement('style');
      bubbleStyles.textContent = `
        .chat-message.user {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          align-self: flex-end;
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin: 8px 0;
          max-width: 80%;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.5;
        }
        .chat-message.bot {
          background: #ffffff;
          border: 1px solid rgba(133, 79, 255, 0.2);
          color: #333;
          align-self: flex-start;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 12px 16px;
          margin: 8px 0;
          max-width: 80%;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.5;
        }
        .chat-input {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          border-top: 1px solid #f0f0f0;
          margin-top: 10px;
          background: none;
        }
        .chat-input textarea {
          flex: 1 !important;
          padding: 12px !important;
          border: 1px solid rgba(133, 79, 255, 0.2) !important;
          border-radius: 6px !important;
          resize: none !important;
          font-family: inherit !important;
          font-size: 14px !important;
          height: auto !important;
          min-height: 40px !important;
          max-height: 120px !important;
          width: auto !important;
          box-sizing: border-box !important;
          margin-right: 8px;
        }
        .chat-input button[type="submit"] {
          background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0 18px;
          cursor: pointer;
          font-weight: 500;
          font-size: 16px;
          height: 40px;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `;
      document.head.appendChild(bubbleStyles);

      // Add Escape key handler to close modal or minimize chat
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (overlayDiv) {
            hideOvertakeModal();
          } else if (chatContainer.classList.contains('open')) {
            hideChat();
          }
        }
      });
      
      // --- Voice Call Integration via n8n ---

      // Helper: Get chat history from localStorage
      function getChatHistory() {
        try {
          const savedSession = localStorage.getItem(INTENDR_STORAGE_KEYS.chatSession);
          if (!savedSession) return [];
          
          const sessionData = JSON.parse(savedSession);
          if (!sessionData.messages || !Array.isArray(sessionData.messages)) return [];
          
          // Format the messages in the structure expected by the API
          return sessionData.messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.type === 'user' ? msg.content : msg.content.replace(/<[^>]*>/g, ''),
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.error('Failed to parse chat history', e);
          return [];
        }
      }

      // Helper: Get business info from config
      function getBusinessInfo() {
        console.log('Getting business info from config:', config.business);
        // Return the actual business config without fallback values
        return config.business;
      }

      // Helper: Initiate voice call via n8n
      async function initiateVoiceCall(callType, phone) {
        // Execute beforePhoneCall hook if provided
        if (INTENDR_HOOKS.beforePhoneCall && typeof INTENDR_HOOKS.beforePhoneCall === 'function') {
          try {
            const result = await INTENDR_HOOKS.beforePhoneCall(callType, phone);
            if (result === false) return; // Hook can cancel phone call
          } catch (error) {
            console.error('[Intendr] Error in beforePhoneCall hook:', error);
          }
        }
        
        // Get business info directly from config to ensure we have the latest values
        const chatHistory = getChatHistory()
        const businessInfo = config.business
        console.log('[Intendr] Initiating voice call with business info:', businessInfo)
        
        // Extract chatbot ID from webhook URL (between /webhook/ and /chat)
        let chatbotId = '';
        try {
          const webhookUrl = config.webhook.url;
          const matches = webhookUrl.match(/\/webhook\/([^\/]+)/);
          if (matches && matches[1]) {
            chatbotId = matches[1];
            // Remove /chat suffix if present
            chatbotId = chatbotId.replace(/\/chat$/, '');
          }
        } catch (err) {
          console.error('[Intendr] Error extracting chatbot ID:', err);
        }
        
        let payload = {};
        
        if (callType === 'phone_raw') {
          // For direct phone calls, only include the chatbot ID and phone number
          payload = {
            type: callType,
            phone: phone,
            chatbotId: chatbotId,
            businessInfo: businessInfo // Add business info to phone_raw calls
          };
        } else {
          // For regular phone calls from chat, include chat history and session ID
          payload = {
            type: callType,
            chatHistory,
            businessInfo,
            sessionId: currentSessionId,
            chatbotId: chatbotId // Add chatbotId to regular phone calls as well
          };
          
          if (callType === 'phone') {
            if (!phone) throw new Error('Phone number required for phone call');
            payload.phone = phone;
          }
        }
        
        try {
          console.log('[Intendr] Sending voice call payload:', JSON.stringify(payload))
          
          const response = await fetch(INTENDR_API_ENDPOINTS.voiceCall, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error('Failed to initiate call: ' + text);
          }
          
          const contentType = response.headers.get('content-type');
          let result;
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
          } else {
            // Handle text/plain responses
            const text = await response.text();
            result = { 
              status: 'success', 
              message: text,
              callDetails: {
                phone: phone,
                callId: 'unknown',
                status: 'connecting'
              }
            };
          }
          
          // Execute afterPhoneCall hook if provided
          if (INTENDR_HOOKS.afterPhoneCall && typeof INTENDR_HOOKS.afterPhoneCall === 'function') {
            try {
              await INTENDR_HOOKS.afterPhoneCall(callType, phone, result);
            } catch (error) {
              console.error('[Intendr] Error in afterPhoneCall hook:', error);
            }
          }
          
          return result;
        } catch (error) {
          console.error('Error in initiateVoiceCall:', error);
          throw error;
        }
      }



      // Voice Transfer Tooltip (positioned above phone button)
      function showVoiceTransferModal() {
        // Remove any existing tooltip
        const oldTooltip = document.getElementById('intendr-voice-tooltip')
        if (oldTooltip) oldTooltip.remove()
        
        // Find the phone button to position tooltip above it
        const phoneButton = document.getElementById('intendr-voice-button')
        if (!phoneButton) {
          console.error('Phone button not found')
          return
        }
        
        // Get button position
        const buttonRect = phoneButton.getBoundingClientRect()
        
        // Create tooltip container (speech bubble style)
        const tooltip = document.createElement('div')
        tooltip.id = 'intendr-voice-tooltip'
        tooltip.className = 'intendr-widget-overlay'  // Add defensive class
        
        // Apply defensive inline styles to override site CSS
        Object.assign(tooltip.style, {
          position: 'fixed',
          bottom: '130px',
          right: config.style.position === 'left' ? '20px' : '20px',
          background: 'white',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          padding: '10px',
          zIndex: '2147483646',
          width: '200px',
          boxSizing: 'border-box',
          margin: '0',
          border: 'none',
          outline: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          lineHeight: '1.4',
          color: '#333',
          textAlign: 'left'
        })
        
        // Add a CSS pointer to connect tooltip to phone button
        const pointerStyle = document.createElement('style');
        pointerStyle.textContent = `
          #intendr-voice-tooltip::after {
            content: '';
            position: absolute;
            bottom: -10px;
            right: 30px;
            margin-left: -10px;
            border-width: 10px 10px 0;
            border-style: solid;
            border-color: white transparent transparent transparent;
            filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
          }
        `;
        document.head.appendChild(pointerStyle);
        
        tooltip.innerHTML = `
          <div style="font-size:1.1rem;font-weight:600;margin-bottom:8px;color:#333;">Prefer to talk on the phone?</div>
          <div style="font-size:0.9rem;color:#666;margin-bottom:12px;">I can ring you now at the number you enter below to make things easier!</div>
          <div id="intendr-phone-input-container" style="width:100% !important;box-sizing:border-box !important;margin:0 !important;padding:0 !important;">
            <input type="tel" id="intendr-direct-phone-input" placeholder="(123) 123-1234" style="width:100% !important;padding:10px !important;border-radius:4px !important;border:1px solid #ccc !important;margin:0 0 6px 0 !important;font-size:1rem !important;box-sizing:border-box !important;font-family:inherit !important;line-height:normal !important;background:white !important;color:#333 !important;outline:none !important;text-align:left !important;">
            <div id="intendr-direct-phone-validation" style="color:#c00 !important;margin:0 0 6px 0 !important;text-align:left !important;display:none !important;font-size:0.85rem !important;font-family:inherit !important;line-height:1.2 !important;padding:0 !important;"></div>
            <button id="intendr-direct-start-call" style="width:100% !important;padding:10px !important;border-radius:4px !important;background:linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%) !important;color:#fff !important;font-weight:500 !important;font-size:1rem !important;border:none !important;cursor:pointer !important;box-sizing:border-box !important;box-shadow:0 4px 12px rgba(133, 79, 255, 0.2) !important;font-family:inherit !important;line-height:normal !important;text-align:center !important;margin:0 !important;outline:none !important;">Start Call</button>
          </div>
          <div id="intendr-direct-call-error" style="color:#c00;margin-top:8px;text-align:center;display:none;"></div>
        `;
        
        // Add the tooltip to the body, not as a child of the button
        document.body.appendChild(tooltip);
        
        // Correctly position the tooltip after it's been created
        const phoneRect = phoneButton.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position tooltip to align the pointer with the center of the phone button
        // Add mobile-specific positioning
        if (window.innerWidth <= 600) {
          tooltip.style.width = '280px';
          tooltip.style.left = '20px';
          tooltip.style.right = 'auto';
          tooltip.style.transform = 'none';
          tooltip.style.bottom = '90px';
          tooltip.style.top = 'auto';
        } else {
          tooltip.style.right = `${window.innerWidth - phoneRect.right - (phoneRect.width / 2) + 30}px`;
        }
        
        // Close tooltip when clicking outside
        document.addEventListener('click', function closeDirectTooltip(e) {
          if (!tooltip.contains(e.target) && e.target !== phoneButton) {
            tooltip.remove();
            document.removeEventListener('click', closeDirectTooltip);
          }
        });
        
        // Add validation functions for direct phone input
        const directPhoneInput = document.getElementById('intendr-direct-phone-input');
        const directValidationDiv = document.getElementById('intendr-direct-phone-validation');
        
        function validateDirectPhoneNumber(phone) {
          const digits = phone.replace(/\D/g, '');
          if (digits.length === 10) {
            return { valid: true, formatted: `+1${digits}` };
          } else if (digits.length === 11 && digits.startsWith('1')) {
            return { valid: true, formatted: `+${digits}` };
          } else {
            return { 
              valid: false, 
              error: 'Please enter a valid US phone number (10 digits)' 
            };
          }
        }
        
        function showDirectValidationError(message) {
          directValidationDiv.textContent = message;
          directValidationDiv.style.display = 'block';
          directPhoneInput.style.borderColor = '#c00';
        }
        
        function clearDirectValidationError() {
          directValidationDiv.style.display = 'none';
          directPhoneInput.style.borderColor = '#ccc';
        }
        
        // Add real-time validation
        directPhoneInput.addEventListener('input', function() {
          const value = this.value.trim();
          if (value) {
            const validation = validateDirectPhoneNumber(value);
            if (validation.valid) {
              clearDirectValidationError();
            } else {
              showDirectValidationError(validation.error);
            }
          } else {
            clearDirectValidationError();
          }
        });
        
        // Handle the call button click
        document.getElementById('intendr-direct-start-call').onclick = async function() {
          const phone = directPhoneInput.value.trim();
          const errorDiv = document.getElementById('intendr-direct-call-error');
          
          // Clear previous errors
          errorDiv.style.display = 'none';
          clearDirectValidationError();
          
          if (!phone) {
            showDirectValidationError('Please enter your phone number.');
            return;
          }
          
          const validation = validateDirectPhoneNumber(phone);
          if (!validation.valid) {
            showDirectValidationError(validation.error);
            return;
          }
          
          try {
            // Disable input while processing
            directPhoneInput.disabled = true;
            document.getElementById('intendr-direct-start-call').disabled = true;
            document.getElementById('intendr-direct-start-call').textContent = 'Connecting...';
            
            // Use formatted phone number with +1
            await initiateVoiceCall('phone_raw', validation.formatted);
            
            // Show success message
            errorDiv.style.color = '#090';
            errorDiv.textContent = 'Call initiated! Please answer your phone.';
            errorDiv.style.display = 'block';
            
            // Remove tooltip after a delay
            setTimeout(() => {
              tooltip.remove();
            }, 3000);
            
          } catch (err) {
            errorDiv.textContent = err.message || "Couldn't connect your call. Please try again.";
            errorDiv.style.display = 'block';
            
            // Re-enable input
            directPhoneInput.disabled = false;
            document.getElementById('intendr-direct-start-call').disabled = false;
            document.getElementById('intendr-direct-start-call').textContent = 'Start Call';
          }
        };
      }



      // Simple voice transfer functionality - removed complex WebSocket voice chat

      // Helper: Extract messages from chat session
      function getChatSessionMessages() {
        try {
          const savedSession = localStorage.getItem(INTENDR_STORAGE_KEYS.chatSession);
          if (!savedSession) return [];
          const sessionData = JSON.parse(savedSession);
          if (!sessionData.messages || !Array.isArray(sessionData.messages)) return [];
          return sessionData.messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.type === 'user' ? msg.content : msg.content.replace(/<[^>]*>/g, '') 
          }));
        } catch (error) {
          console.error('Error processing chat session messages:', error);
          return [];
        }
      }

      // Function to auto-select location based on current page URL
      function autoSelectLocationFromURL() {
        const currentUrl = window.location.href.toLowerCase();
        const locations = MERGED_CONFIG.funnels.scheduleTour.locations || [];
        
        // Find location that matches the current URL
        for (const location of locations) {
          // Check if the location's URL is in the current page URL
          if (location.url && currentUrl.includes(location.url.toLowerCase())) {
            console.log(`Auto-selecting location: ${location.name} (${location.id})`);
            return location;
          }
          
          // Also check if the location name appears in the URL path
          const locationNameInUrl = location.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          if (currentUrl.includes(locationNameInUrl)) {
            console.log(`Auto-selecting location by name: ${location.name} (${location.id})`);
            return location;
          }
        }
        
        return null;
      }
      
      // Function to start a funnel
      function startFunnel(funnelType) {
        if (!MERGED_CONFIG.funnels[funnelType] || !MERGED_CONFIG.funnels[funnelType].enabled) {
          console.warn(`Funnel ${funnelType} is not enabled`);
          return;
        }
        
        currentFunnel = funnelType;
        funnelData = {};
        
        // For schedule tour funnel, try to auto-select location from URL
        if (funnelType === 'scheduleTour') {
          const autoSelectedLocation = autoSelectLocationFromURL();
          if (autoSelectedLocation) {
            funnelData.selectedLocation = autoSelectedLocation;
            funnelData.currentStep = 'datetime'; // Skip location step
            console.log(`Auto-selected location: ${autoSelectedLocation.name}, skipping to datetime step`);
          }
        }
        
        saveFunnelData();
        
        // Hide chat interface and show funnel
        showFunnelPanel();
      }

    })();

    // Check if localStorage is available and working
    function isLocalStorageAvailable() {
      try {
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    }

    // Function to go back to previous funnel step
    function backToFunnelStep(step) {
      funnelData.currentStep = step;
      saveFunnelData();
      loadFunnelStep();
    }