// Chat Widget Script - Version 1.9.2

// Global audio playback tracker to prevent overlapping audio
window.BellaAIVoiceChatAudio = {
  currentSource: null,
  isPlaying: false,
  stop: function() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (err) {
        console.error('[BellaAI] Error stopping audio:', err);
      }
      this.currentSource = null;
      this.isPlaying = false;
    }
  },
  play: function(source) {
    this.stop(); // Stop any existing audio
    this.currentSource = source;
    this.isPlaying = true;
    source.onended = () => {
      this.isPlaying = false;
      this.currentSource = null;
    };
    source.start(0);
  }
};

// Chat session transcript ID tracking to prevent duplicate messages
window.BellaAITranscriptTracking = {
  lastUserTranscriptId: null,
  lastAgentResponseId: null,
  currentConversationId: null,
  reset: function() {
    this.lastUserTranscriptId = null;
    this.lastAgentResponseId = null;
    this.currentConversationId = null;
  }
};

(function() {
    // Configuration
    const CHAT_VERSION = "2.0";
    console.log("ChatVersion:", CHAT_VERSION);
    
    // Store user IP globally
    let userIP = '';
    
    // Fetch user IP address
    async function fetchUserIP() {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
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
        name: 'Bella : Product Specialist', 
        welcomeText: '' 
      },
      style: { 
        primaryColor: '#003f72', 
        secondaryColor: '#003f72', 
        position: 'right',
        backgroundColor: '#ffffff',
        fontColor: '#333333'
      },
      dealer: { name: '', phone: '', website: '', searchPage: '', provider: '' },
      overtake: false
    };
    
    // Merge user config with defaults
    const config = window.ChatWidgetConfig ? {
      webhook: { ...defaultConfig.webhook, ...window.ChatWidgetConfig.webhook },
      branding: { ...defaultConfig.branding, ...window.ChatWidgetConfig.branding },
      style: { ...defaultConfig.style, ...window.ChatWidgetConfig.style },
      dealer: { ...defaultConfig.dealer, ...window.ChatWidgetConfig.dealer },
      overtake: window.ChatWidgetConfig.overtake || false,
      overtakePath: window.ChatWidgetConfig.overtakePath || '/'
    } : defaultConfig;
    
    // Prevent multiple initializations
    if (window.BellaAIChatWidgetInitialized) return;
    window.BellaAIChatWidgetInitialized = true;
    
    // Flag to track if user has manually closed the chat in this session
    let userManuallyClosedChat = false;
    
    // Function to check if chat was manually closed
    function checkIfChatWasManuallyClosed() {
      try {
        const chatState = localStorage.getItem('bellaaiChatState');
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
        localStorage.setItem('bellaaiChatState', JSON.stringify(state));
      } catch (error) {
        console.error('Error saving chat state:', error);
      }
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
          currentSessionId = generateUUID();
          // Show initial messages immediately
          sendInitialMessages();
          // Generate page summary in background
          generatePageSummary();
        }
        
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
        params.set('utm_source', 'BellaAI');
        params.set('utm_medium', 'chat');
        params.set('utm_campaign', 'Drivonic-MarketBuilder-AIChat');
        
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
        <span>Bella is typing</span>
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
    let currentSessionId = '';
    
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
            promptBubbleShown: promptBubbleShown, // Save prompt bubble state
            timestamp: new Date().getTime(),
            // Store UTM parameters with the session
            utmParameters: window.initialUtmParameters || {}
          };
          
          localStorage.setItem('bellaaiChatSession', JSON.stringify(sessionData));
        } catch (error) {
          console.error('Error saving chat session:', error);
        }
      }
    }
    
    function loadSession() {
      try {
        const savedSession = localStorage.getItem('bellaaiChatSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // Check if session is still valid (less than 24 hours old)
          const now = new Date().getTime();
          const sessionAge = now - sessionData.timestamp;
          const SESSION_VALIDITY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          if (sessionAge < SESSION_VALIDITY) {
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
            }
            
            return true;
          } else {
            // Session too old, clear it
            localStorage.removeItem('bellaaiChatSession');
          }
        }
      } catch (error) {
        console.error('Error loading saved chat session:', error);
        localStorage.removeItem('bellaaiChatSession');
      }
      return false;
    }
    
    // Inactivity detection for chat window
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 120000; // 2 minutes in milliseconds
    let inactivityMessageSent = false;
    
    function startInactivityTimer() {
      clearTimeout(inactivityTimer);
      
      if (!inactivityMessageSent) {
        inactivityTimer = setTimeout(function() {
          if (chatContainer.classList.contains('open') && currentSessionId) {
            // Keep the original inactivity message
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage("Do you have any questions I can help with?");
            messagesContainer.appendChild(botMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            inactivityMessageSent = true;
            saveSession();
          }
        }, INACTIVITY_TIMEOUT);
      }
    }
    
    function resetInactivityTimer() {
      if (chatContainer.classList.contains('open')) {
        clearTimeout(inactivityTimer);
        
        if (!inactivityMessageSent) {
          startInactivityTimer();
        }
      }
    }
    
    function resetInactivityState() {
      inactivityMessageSent = false;
      clearTimeout(inactivityTimer);
      startInactivityTimer();
    }
    
    // Prompt bubble functionality
    let promptBubbleTimer;
    let promptBubbleShown = false;
    const PROMPT_BUBBLE_TIMEOUT = 120000; // 2 minutes in milliseconds
    
    function startPromptBubbleTimer() {
      // Only start timer if prompt hasn't been shown yet
      if (!promptBubbleShown) {
        promptBubbleTimer = setTimeout(function() {
          showPromptBubble();
        }, PROMPT_BUBBLE_TIMEOUT);
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
      .bellaai-chat-widget {
        --chat--color-primary: ${config.style.primaryColor};
        --chat--color-secondary: ${config.style.secondaryColor};
        font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .bellaai-chat-widget .chat-container {
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
        .bellaai-chat-widget .chat-container {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .bellaai-chat-widget .chat-container.position-left {
          left: 0;
        }
      }
      .bellaai-chat-widget .chat-container.position-left {
        right: auto;
        left: 20px;
        transform-origin: bottom left;
      }
      .bellaai-chat-widget .chat-container.open {
        opacity: 1;
        transform: scale(1);
        pointer-events: all;
        visibility: visible;
      }
      .bellaai-chat-widget .brand-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid rgba(133, 79, 255, 0.1);
        position: relative;
      }
      .bellaai-chat-widget .close-button {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 20px;
        opacity: 0.6;
      }
      .bellaai-chat-widget .brand-header img {
        width: 32px;
        height: 32px;
      }
      .bellaai-chat-widget .brand-header span {
        font-size: 18px;
        font-weight: 500;
      }
      .bellaai-chat-widget .chat-interface {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .bellaai-chat-widget .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      .bellaai-chat-widget .chat-message {
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.5;
      }
      .bellaai-chat-widget .chat-message.user {
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
      .bellaai-chat-widget .chat-message.bot {
        background: #ffffff;
        border: 1px solid rgba(133, 79, 255, 0.2);
        color: #333;
        align-self: flex-start;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      .bellaai-chat-widget .chat-message.bot a {
        color: var(--chat--color-primary);
        text-decoration: none;
        font-weight: 500;
      }
      .bellaai-chat-widget .chat-message.bot a:hover {
        text-decoration: underline;
      }
      .bellaai-chat-widget .chat-message.bot a:hover {
        text-decoration: underline;
      }
      .bellaai-chat-widget .chat-input {
        padding: 16px;
        border-top: 1px solid rgba(133, 79, 255, 0.1);
        display: flex;
        gap: 8px;
      }
      .bellaai-chat-widget .chat-input textarea {
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
      .bellaai-chat-widget .chat-input button {
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
      .bellaai-chat-widget .chat-input button svg {
        fill: #fff;
        stroke: #fff;
      }
    .bellaai-chat-widget .chat-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(133, 79, 255, 0.3);
      z-index: 2147483647;
      border-radius: 30px !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1;
      transform: scale(1);
    }
    
    .bellaai-chat-widget .chat-toggle.hidden {
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }
    
    .bellaai-chat-widget .chat-toggle-content {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    
    .bellaai-chat-widget .chat-toggle svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      color: white;
    }
    
    .bellaai-chat-widget .chat-toggle-text {
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      line-height: 24px;
    }
    
    .bellaai-chat-widget .online-indicator {
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
      .bellaai-chat-widget .chat-toggle {
        width: 60px;
        height: 60px;
        padding: 0;
        justify-content: center;
      }
    
      .bellaai-chat-widget .chat-toggle-text {
        display: none;
      }
      
      .bellaai-chat-widget .online-indicator {
        top: -20px;
        right: -4px;
      }
    }
    
        .bellaai-chat-widget .chat-toggle.position-left {
          right: auto;
          left: 20px;
        }
        .bellaai-chat-widget .chat-toggle svg {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }
        .bellaai-chat-widget .thinking {
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
        .bellaai-chat-widget .thinking span {
          color: #666;
          font-size: 14px;
        }
        .bellaai-chat-widget .dots {
          display: flex;
          gap: 2px;
        }
        .bellaai-chat-widget .dot {
          height: 8px;
          width: 8px;
          background-color: var(--chat--color-primary);
          border-radius: 50%;
          display: inline-block;
          opacity: 0.4;
          animation: dot-typing 1.4s infinite ease-in-out;
        }
        .bellaai-chat-widget .dot:nth-child(1) { animation-delay: 0s; }
        .bellaai-chat-widget .dot:nth-child(2) { animation-delay: 0.2s; }
        .bellaai-chat-widget .dot:nth-child(3) { animation-delay: 0.4s; }
        /* Prompt bubble styles */
        .bellaai-chat-widget .prompt-bubble {
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
        .bellaai-chat-widget .chat-toggle.position-left + .prompt-bubble {
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
      `;
      
      // Inject styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      
      // Create DOM elements
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'bellaai-chat-widget';
      
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
          <div class="chat-input">
            <textarea placeholder="Type your message here..." rows="1"></textarea>
            <button type="submit">Send</button>
          </div>
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
      
      widgetContainer.appendChild(chatContainer);
      widgetContainer.appendChild(toggleButton);
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
            currentSessionId = generateUUID();
            
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
        const input = window.bellaaiTextarea || 
                     textarea || 
                     document.querySelector('.chat-input textarea');
                     
        if (!input) {
          console.error('[BellaAI] No textarea found for message sending');
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
        sendMessage(message);
        input.value = '';
        input.style.height = 'auto';
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
        if (path.includes('/new-vehicles/') || path.includes('/used-vehicles/')) {
          return 'inventory';
        } else if (path.includes('/finance')) {
          return 'finance';
        } else if (path.includes('/service')) {
          return 'service';
        } else if (path.includes('/parts')) {
          return 'parts';
        } else if (path.includes('/about')) {
          return 'about';
        } else if (path.includes('/contact')) {
          return 'contact';
        } else if (path === '/' || path === '/index.html') {
          return 'home';
        }
        return 'other';
      }

      // Function to clean HTML content
      function cleanHtmlContent(element) {
        if (!element) return '';
        
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true);
        
        // Remove script tags
        const scripts = clone.getElementsByTagName('script');
        while (scripts.length > 0) {
          scripts[0].parentNode.removeChild(scripts[0]);
        }
        
        // Remove style tags
        const styles = clone.getElementsByTagName('style');
        while (styles.length > 0) {
          styles[0].parentNode.removeChild(styles[0]);
        }
        
        // Get text content and clean it
        let text = clone.textContent || clone.innerText;
        
        // Remove extra whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // Remove any remaining HTML tags
        text = text.replace(/<[^>]*>/g, '');
        
        return text;
      }

      // Function to extract navigation links
      function collectNavigationLinks() {
        // Check if we already have stored links
        const storedLinks = localStorage.getItem('bellai_nav_links')
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
        localStorage.setItem('bellai_nav_links', JSON.stringify(linksArray))
        return linksArray
      }

      // Function to generate page summary with caching
      async function generatePageSummary() {
        try {
          const mainContent = document.querySelector('main, #main, .main-content, .content');
          if (!mainContent) {
            console.log('No main content found on page');
            return null;
          }

          // Get navigation links
          const navigationLinks = collectNavigationLinks();

          // Get page type
          const pageType = determinePageType();

          // Clean the content
          const cleanedContent = cleanHtmlContent(mainContent);
          if (!cleanedContent) {
            console.log('No text content found in main content');
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
            dealer: config.dealer,
            navigationLinks
          };

          // Generate summary
          const params = new URLSearchParams({
            content: cleanedContent,
            metadata: JSON.stringify(metadata)
          });

          const response = await fetch('https://automation.cloudcovehosting.com/webhook/pagecontext?' + params.toString(), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            }
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
          const cached = localStorage.getItem('bellaaiPageSummary');
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
          localStorage.setItem('bellaaiPageSummary', JSON.stringify(cacheData));
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
          
          // Prepare message data
          const messageData = {
            chatInput: message,
            sessionId: currentSessionId,
            metadata: {
              dealer: config.dealer,
              pageContext: currentPageContext,
              utmParameters: window.initialUtmParameters || {},
              userIP: userIP
            }
          };
          
          // Send to webhook
            const response = await fetch(config.webhook.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(messageData)
            });
            
          if (!response.ok) throw new Error('Failed to send message');
          
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

            // Show 'Redirecting you now...' message
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage('Redirecting you now...');
            messagesContainer.appendChild(botMessageDiv);

            // Show follow-up message
            const followUpDiv = document.createElement('div');
            followUpDiv.className = 'chat-message bot';
            followUpDiv.innerHTML = formatMessage("Our product specialists are ready to help you explore your options and answer any questions. What's the best phone number to reach you at?");
            messagesContainer.appendChild(followUpDiv);

            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            saveSession();
            
            // Redirect after a short delay
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 2000);
            return;
          }

          // Remove any [REDIRECT]...[/REDIRECT] tags from the message if present
          const cleanedReply = botReply.replace(/\[REDIRECT\][\s\S]*?\[\/REDIRECT\]/g, '').trim();

          // Add bot response (if anything remains after cleaning)
          if (cleanedReply) {
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage(cleanedReply);
            messagesContainer.appendChild(botMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        const dealerName = config.dealer.name || '[DealerName]';
        const messages = [
          "Hi, I'm Bella! I'm a product specialist here to help guide you through our site today.",
          `We do things a little bit differently here at ${dealerName} and our customers really seem to appreciate it.`,
          "First let me ask, what brings you here today so I can help guide you to the right department?"
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
          !localStorage.getItem('bellaaiOvertakeShown');
      }

      let overlayDiv = null;
      function showOvertakeModal() {
        overlayDiv = document.createElement('div');
        overlayDiv.className = 'bellaai-overtake-overlay';
        overlayDiv.style.position = 'fixed';
        overlayDiv.style.inset = '0';
        overlayDiv.style.background = 'rgba(0,0,0,0.6)';
        overlayDiv.style.zIndex = '2147483646';
        overlayDiv.style.display = 'flex';
        overlayDiv.style.alignItems = 'center';
        overlayDiv.style.justifyContent = 'center';
        overlayDiv.style.transition = 'opacity 0.4s';
        overlayDiv.style.opacity = '0';
        overlayDiv.style.animation = 'bellaai-fadein 0.4s forwards';
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
        localStorage.setItem('bellaaiOvertakeShown', '1');
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
        @keyframes bellaai-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .bellaai-overtake-overlay {
          animation: bellaai-fadein 0.4s forwards;
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
          flex: 1;
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
          box-shadow: 0 4px 12px rgba(133, 79, 255, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin: 8px 0;
          max-width: 80%;
          word-wrap: break-word;
          font-size: 14px;
          line-height: 1.5;
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
        if (window.BellaAIChatWidgetChatInitialized) return;
        window.BellaAIChatWidgetChatInitialized = true;

        // Restore session or show initial messages
        const sessionRestored = loadSession();
          if (!sessionRestored) {
            inactivityMessageSent = false;
            currentSessionId = generateUUID();
          sendInitialMessages();
          generatePageSummary();
          }
          saveSession();
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          startInactivityTimer();
          clearTimeout(promptBubbleTimer);

        // Add event listeners (only once)
        toggleButton.addEventListener('click', function() {
          showChat();
        });
        closeButton.addEventListener('click', function() {
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

      // Ensure chat input row markup and send button are correct
      // (Rebuild input row if needed)
      function ensureInputRow() {
        const chatInputDiv = chatContainer.querySelector('.chat-input');
        if (!chatInputDiv) return;
        chatInputDiv.innerHTML = '';
        
        // Voice button with microphone and phone icons
        const voiceBtn = document.createElement('button');
        voiceBtn.type = 'button';
        voiceBtn.title = 'Transfer to Voice';
        voiceBtn.id = 'bellaai-voice-button';
        voiceBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
          <span style="margin:0 2px;">/</span>
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
        voiceBtn.style.marginRight = '8px';
        
        // Create a tooltip that will appear when the button is clicked
        voiceBtn.onclick = function(e) {
          e.stopPropagation();
          
          // Remove any existing tooltip
          const existingTooltip = document.getElementById('bellaai-voice-tooltip');
          if (existingTooltip) {
            existingTooltip.remove();
            return;
          }
          
          // Create tooltip
          const tooltip = document.createElement('div');
          tooltip.id = 'bellaai-voice-tooltip';
          tooltip.style.position = 'absolute';
          tooltip.style.bottom = '50px';
          tooltip.style.left = '0';
          tooltip.style.background = 'white';
          tooltip.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
          tooltip.style.borderRadius = '8px';
          tooltip.style.padding = '10px';
          tooltip.style.zIndex = '9999';
          tooltip.style.width = '210px';
          
          tooltip.innerHTML = `
            <div style="font-size:0.9rem;font-weight:600;margin-bottom:8px;color:#333;">Transfer to Voice</div>
            <button id="bellaai-browser-voice" style="width:100%;margin-bottom:6px;padding:8px;border-radius:4px;background:#003f72;color:#fff;font-weight:500;font-size:0.85rem;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              Start Voice Chat
            </button>
            <button id="bellaai-phone-voice" style="width:100%;padding:8px;border-radius:4px;background:#003f72;color:#fff;font-weight:500;font-size:0.85rem;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Call my Phone
            </button>
            <div id="bellaai-phone-input-container" style="display:none;margin-top:6px;">
              <input type="tel" id="bellaai-phone-input" placeholder="Your phone number" style="width:100%;padding:8px;border-radius:4px;border:1px solid #ccc;margin-bottom:6px;font-size:0.85rem;">
              <button id="bellaai-start-call" style="width:100%;padding:8px;border-radius:4px;background:#003f72;color:#fff;font-weight:500;font-size:0.85rem;border:none;cursor:pointer;">Start Call</button>
            </div>
          `;
          
          // Position the tooltip
          chatInputDiv.style.position = 'relative';
          chatInputDiv.appendChild(tooltip);
          
          // Close tooltip when clicking outside
          document.addEventListener('click', function closeTooltip(e) {
            if (!tooltip.contains(e.target) && e.target !== voiceBtn) {
              tooltip.remove();
              document.removeEventListener('click', closeTooltip);
            }
          });
          
          // Button event handlers
          document.getElementById('bellaai-browser-voice').onclick = async function() {
            tooltip.remove();
            try {
              const res = await initiateVoiceCall('browser');
              if (!res.websocketUrl) throw new Error('Missing websocketUrl from server');
              startVoiceChatInWindow(res.websocketUrl);
            } catch (err) {
              console.error('Error starting voice chat:', err);
              
              // Show error message in chat
              const errorMsg = document.createElement('div');
              errorMsg.className = 'chat-message bot';
              errorMsg.innerHTML = formatMessage("I couldn't start the voice chat. Please try again later.");
              messagesContainer.appendChild(errorMsg);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          };
          
          document.getElementById('bellaai-phone-voice').onclick = function() {
            document.getElementById('bellaai-phone-input-container').style.display = 'block';
            document.getElementById('bellaai-browser-voice').style.display = 'none';
            document.getElementById('bellaai-phone-voice').style.display = 'none';
          };
          
          document.getElementById('bellaai-start-call').onclick = async function() {
            const phone = document.getElementById('bellaai-phone-input').value.trim();
            if (!phone) return;
            
            try {
              tooltip.remove();
              await initiateVoiceCall('phone', phone);
              
              // Show message in chat
              const msgDiv = document.createElement('div');
              msgDiv.className = 'chat-message bot';
              msgDiv.innerHTML = formatMessage("I'm calling your phone now. Please answer to continue our conversation.");
              messagesContainer.appendChild(msgDiv);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (err) {
              console.error('Error initiating phone call:', err);
              
              // Show error message
              const errorMsg = document.createElement('div');
              errorMsg.className = 'chat-message bot';
              errorMsg.innerHTML = formatMessage("I couldn't connect to your phone. Please check the number and try again.");
              messagesContainer.appendChild(errorMsg);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          };
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
        chatInputDiv.appendChild(voiceBtn);
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
        window.bellaaiTextarea = textareaEl;
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
          const history = localStorage.getItem('bella-chat-history')
          return history ? JSON.parse(history) : []
        } catch (e) {
          console.error('Failed to parse chat history', e)
          return []
        }
      }

      // Helper: Get dealer info from config
      function getDealerInfo() {
        return config.dealer || {}
      }

      // Helper: Initiate voice call via n8n
      async function initiateVoiceCall(callType, phone) {
        const chatHistory = getChatHistory()
        const dealerInfo = getDealerInfo()
        const payload = {
          type: callType,
          chatHistory,
          dealerInfo
        }
        if (callType === 'phone') {
          if (!phone) throw new Error('Phone number required for phone call')
          payload.phone = phone
        }
        const response = await fetch('https://automation.cloudcovehosting.com/webhook/voice-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!response.ok) {
          const err = await response.text()
          throw new Error('Failed to initiate call: ' + err)
        }
        return response.json()
      }

      // Helper: Send transcript to n8n
      function sendTranscriptToN8N(transcript) {
        const chatHistory = getChatHistory()
        const dealerInfo = getDealerInfo()
        fetch('https://automation.cloudcovehosting.com/webhook/voice-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, chatHistory, dealerInfo })
        })
      }

      // Voice Transfer Tooltip (replacing modal)
      function showVoiceTransferModal() {
        // Remove any existing tooltip
        const oldTooltip = document.getElementById('bellaai-voice-tooltip')
        if (oldTooltip) oldTooltip.remove()
        
        // Create tooltip container
        const tooltip = document.createElement('div')
        tooltip.id = 'bellaai-voice-tooltip'
        tooltip.style.position = 'fixed'
        tooltip.style.top = '50%'
        tooltip.style.left = '50%'
        tooltip.style.transform = 'translate(-50%, -50%)'
        tooltip.style.background = 'white'
        tooltip.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)'
        tooltip.style.borderRadius = '12px'
        tooltip.style.padding = '16px'
        tooltip.style.zIndex = '9999'
        tooltip.style.width = '280px'
        tooltip.style.maxWidth = '90vw'
        
        // Add tooltip content
        tooltip.innerHTML = `
          <div style="font-size:1rem;font-weight:600;margin-bottom:12px;color:#333;text-align:center;">Transfer to Voice</div>
          <button id="bellaai-browser-voice" style="width:100%;margin-bottom:10px;padding:10px;border-radius:6px;background:${config.style.primaryColor};color:#fff;font-weight:500;font-size:0.95rem;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            Start Voice Chat
          </button>
          <button id="bellaai-phone-voice" style="width:100%;padding:10px;border-radius:6px;background:${config.style.primaryColor};color:#fff;font-weight:500;font-size:0.95rem;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            Call my Phone
          </button>
          <div id="bellaai-phone-form" style="display:none;margin-top:10px;">
            <input id="bellaai-phone-input" type="tel" placeholder="Enter your phone number" required style="width:100%;padding:10px;border-radius:6px;border:1px solid #ccc;margin-bottom:8px;font-size:0.95rem;" />
            <button id="bellaai-start-call" style="width:100%;padding:10px;border-radius:6px;background:${config.style.primaryColor};color:#fff;font-weight:500;font-size:0.95rem;border:none;cursor:pointer;">Start Call</button>
          </div>
          <div id="bellaai-voice-error" style="color:#c00;margin-top:8px;text-align:center;display:none;"></div>
          <button id="bellaai-voice-cancel" style="display:block;margin:10px auto 0;background:none;border:none;color:#666;cursor:pointer;font-size:0.9rem;">Cancel</button>
        `
        
        document.body.appendChild(tooltip)
        
        // Add overlay to capture clicks outside the tooltip
        const overlay = document.createElement('div')
        overlay.style.position = 'fixed'
        overlay.style.top = '0'
        overlay.style.left = '0'
        overlay.style.width = '100vw'
        overlay.style.height = '100vh'
        overlay.style.background = 'rgba(0,0,0,0.3)'
        overlay.style.zIndex = '9998'
        document.body.appendChild(overlay)
        
        // Remove tooltip and overlay when clicking outside
        overlay.onclick = function() {
          tooltip.remove()
          overlay.remove()
        }
        
        // Add button handlers
        const browserBtn = document.getElementById('bellaai-browser-voice')
        const phoneBtn = document.getElementById('bellaai-phone-voice')
        const phoneForm = document.getElementById('bellaai-phone-form')
        const phoneInput = document.getElementById('bellaai-phone-input')
        const errorDiv = document.getElementById('bellaai-voice-error')
        const cancelBtn = document.getElementById('bellaai-voice-cancel')
        
        browserBtn.onclick = async function() {
          errorDiv.style.display = 'none'
          browserBtn.disabled = true
          try {
            const res = await initiateVoiceCall('browser')
            if (!res.websocketUrl) throw new Error('Missing websocketUrl from server')
            // Start integrated voice chat
            startVoiceChatInWindow(res.websocketUrl)
            tooltip.remove()
            overlay.remove()
          } catch (err) {
            errorDiv.textContent = err.message
            errorDiv.style.display = 'block'
            browserBtn.disabled = false
          }
        }
        
        phoneBtn.onclick = function() {
          phoneForm.style.display = 'block'
          phoneBtn.style.display = 'none'
          browserBtn.style.display = 'none'
        }
        
        phoneForm.onsubmit = function(e) {
          e.preventDefault()
        }
        
        document.getElementById('bellaai-start-call').onclick = async function() {
          errorDiv.style.display = 'none'
          const phone = phoneInput.value.trim()
          if (!phone) {
            errorDiv.textContent = 'Please enter your phone number.'
            errorDiv.style.display = 'block'
            return
          }
          phoneInput.disabled = true
          document.getElementById('bellaai-start-call').disabled = true
          try {
            await initiateVoiceCall('phone', phone)
            errorDiv.style.color = '#090'
            errorDiv.textContent = 'Call initiated! Please answer your phone.'
            errorDiv.style.display = 'block'
            setTimeout(() => {
              tooltip.remove()
              overlay.remove()
            }, 2000)
          } catch (err) {
            errorDiv.textContent = err.message
            errorDiv.style.display = 'block'
            phoneInput.disabled = false
            document.getElementById('bellaai-start-call').disabled = false
          }
        }
        
        cancelBtn.onclick = function() {
          tooltip.remove()
          overlay.remove()
        }
      }

      // --- Conversational AI Integration ---
      // Utility: Convert Float32 PCM to 16-bit PCM
      function floatTo16BitPCM(input) {
        const output = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]))
          output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
        }
        return output
      }

      // Utility: Convert Int16Array to Base64
      function int16ToBase64(int16arr) {
        const buf = new Uint8Array(int16arr.buffer)
        let binary = ''
        for (let i = 0; i < buf.byteLength; i++) binary += String.fromCharCode(buf[i])
        return btoa(binary)
      }

      // Utility: Resample audio to 16kHz
      async function resampleTo16kHz(input, inputSampleRate) {
        console.log('[BellaAI] Resampling from', inputSampleRate, 'Hz to 16000 Hz')
        if (inputSampleRate === 16000) return input
        const ratio = 16000 / inputSampleRate
        const outputLength = Math.ceil(input.length * ratio)
        const offlineCtx = new OfflineAudioContext(1, outputLength, 16000)
        const buffer = offlineCtx.createBuffer(1, input.length, inputSampleRate)
        buffer.copyToChannel(input, 0)
        const source = offlineCtx.createBufferSource()
        source.buffer = buffer
        source.connect(offlineCtx.destination)
        source.start(0)
        try {
          const rendered = await offlineCtx.startRendering()
          return rendered.getChannelData(0)
        } catch (err) {
          console.error('[BellaAI] Resampling error:', err)
          return input // Fall back to original
        }
      }

      // Integrated voice chat directly into the main chat window
      function startVoiceChatInWindow(websocketUrl) {
        console.log('[BellaAI] startVoiceChatInWindow called with', websocketUrl)
        
        // Create voice controls to replace the chat input
        const chatInputDiv = chatContainer.querySelector('.chat-input')
        if (!chatInputDiv) return
        
        // Save original chat input content to restore later
        const originalChatInput = chatInputDiv.innerHTML
        
        // Replace with voice controls
        chatInputDiv.innerHTML = `
          <div id="bellaai-voice-controls" style="width:100%;display:flex;flex-direction:column;align-items:center;">
            <div style="display:flex;align-items:center;justify-content:center;margin-bottom:0.5rem;">
              <div id="bellaai-voice-indicator" style="width:12px;height:12px;background:#ccc;border-radius:50%;margin-right:8px;"></div>
              <div id="bellaai-voice-status" style="color:#666;font-size:0.9rem;text-align:center;">Initializing...</div>
            </div>
            <button id="bellaai-voice-end" style="width:100%;padding:0.75rem 0;border-radius:8px;background:#003f72;color:#fff;font-weight:500;font-size:1rem;border:none;cursor:pointer;">End Voice Chat</button>
            <div id="bellaai-reconnection-info" style="margin-top:0.5rem;font-size:0.8rem;color:#666;display:none;text-align:center;">Connection lost. Attempting to reconnect...</div>
          </div>
        `
        
        // Add CSS for animations if not already added
        if (!document.getElementById('bellaai-voice-animations')) {
          const style = document.createElement('style')
          style.id = 'bellaai-voice-animations'
          style.textContent = `
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
            
            @keyframes recording-pulse {
              0% { transform: scale(1); opacity: 1; background-color: #c00; }
              50% { transform: scale(1.2); opacity: 0.7; background-color: #f00; }
              100% { transform: scale(1); opacity: 1; background-color: #c00; }
            }
          `
          document.head.appendChild(style)
        }
        
        // Get DOM elements
        const statusDiv = document.getElementById('bellaai-voice-status')
        const endBtn = document.getElementById('bellaai-voice-end')
        const indicator = document.getElementById('bellaai-voice-indicator')
        const reconnectionInfo = document.getElementById('bellaai-reconnection-info')
        
        // State variables
        let ws = null
        let audioContext = null
        let micStream = null
        let processor = null
        let analyserNode = null
        let isEnded = false
        let canSendAudio = false
        let lastPingTime = Date.now()
        let hasActivity = false
        let silenceTimer = null
        let activityCheckTimer = null
        let pingCheckTimer = null
        let audioChunksSent = 0
        let reconnectAttempts = 0
        const MAX_RECONNECT_ATTEMPTS = 3
        
        // Update status with color
        function updateStatus(message, color = '#666') {
          if (statusDiv) {
            statusDiv.textContent = message
            statusDiv.style.color = color
          }
          if (indicator) {
            indicator.style.background = color
          }
          console.log('[BellaAI] Status:', message)
        }
        
        // Add message to chat (used for both user and AI messages)
        function addMessageToChat(message, isUser = false) {
          const messageDiv = document.createElement('div')
          messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`
          
          if (isUser) {
            messageDiv.textContent = message
          } else {
            messageDiv.innerHTML = formatMessage(message)
          }
          
          messagesContainer.appendChild(messageDiv)
          messagesContainer.scrollTop = messagesContainer.scrollHeight
          saveSession()
        }
        
        // Play audio from base64 PCM (16kHz mono)
        async function playBase64PCM(base64) {
          if (!audioContext) return
          
          // Use global audio manager to track playback
          try {
            const binary = atob(base64)
            const buf = new ArrayBuffer(binary.length)
            const view = new Uint8Array(buf)
            for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
            
            // Create audio buffer (PCM 16kHz mono, 16-bit signed)
            const audioBuffer = audioContext.createBuffer(1, view.length / 2, 16000)
            const floatBuf = audioBuffer.getChannelData(0)
            
            // Convert Int16 PCM to Float32
            const int16 = new Int16Array(view.buffer)
            for (let i = 0; i < int16.length; i++) {
              floatBuf[i] = int16[i] / 32768.0
            }
            
            // Play the audio
            const src = audioContext.createBufferSource()
            src.buffer = audioBuffer
            src.connect(audioContext.destination)
            
            // Use global audio manager to handle the audio playback
            window.BellaAIVoiceChatAudio.play(src);
            
            // Update UI to show audio is playing
            updateStatus('Bella is speaking...', '#090')
            
            // Add visual indication that AI is speaking
            indicator.style.animation = 'pulse 1s infinite'
            indicator.style.background = '#090'
            
            // Add event for when playback ends
            src.onended = () => {
              console.log('[BellaAI] Audio playback completed')
              window.BellaAIVoiceChatAudio.currentSource = null
              
              // Reset UI when playback completes naturally
              if (!isEnded && canSendAudio) {
                updateStatus('Listening...', '#090')
                if (indicator) {
                  indicator.style.animation = ''
                }
              }
            }
          } catch (err) {
            console.error('[BellaAI] Error playing audio:', err)
          }
        }
        
        // Clean up resources and restore chat input
        function cleanup(reason = 'Voice chat ended') {
          if (isEnded) return
          console.log('[BellaAI] cleanup called:', reason)
          isEnded = true
          
          // Add a system message about voice chat ending
          addMessageToChat(`Voice conversation ended: ${reason}`, false)
          
          // Clear timers
          if (silenceTimer) clearInterval(silenceTimer)
          if (activityCheckTimer) clearInterval(activityCheckTimer)
          if (pingCheckTimer) clearInterval(pingCheckTimer)
          
          // Stop any playing audio using global audio manager
          window.BellaAIVoiceChatAudio.stop();
          
          // Reset transcript tracking variables
          window.BellaAITranscriptTracking.reset();
          
          // Close WebSocket
          if (ws) {
            try {
              if (ws.readyState === 1) { // Open
                ws.close()
              }
            } catch (e) {
              console.error('[BellaAI] Error closing WebSocket:', e)
            }
            ws = null
          }
          
          // Clean up audio resources
          if (processor) {
            try {
              processor.disconnect()
            } catch (e) {
              console.error('[BellaAI] Error disconnecting processor:', e)
            }
            processor = null
          }
          
          if (analyserNode) {
            try {
              analyserNode.disconnect()
            } catch (e) {
              console.error('[BellaAI] Error disconnecting analyser:', e)
            }
            analyserNode = null
          }
          
          if (audioContext) {
            try {
              if (audioContext.state !== 'closed') {
                audioContext.close()
              }
            } catch (e) {
              console.error('[BellaAI] Error closing AudioContext:', e)
            }
            audioContext = null
          }
          
          if (micStream) {
            try {
              micStream.getTracks().forEach(track => track.stop())
            } catch (e) {
              console.error('[BellaAI] Error stopping mic stream:', e)
            }
            micStream = null
          }
          
          // Restore original chat input with a slight delay to ensure proper cleanup
          setTimeout(function() {
            // Completely rebuild the input row
            ensureInputRow();
            
            // Update global references
            textarea = chatContainer.querySelector('.chat-input textarea');
            sendButton = chatContainer.querySelector('.chat-input button.send-button');
            
            // Re-attach event listeners
            if (textarea && sendButton) {
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
              
              console.log('[BellaAI] Chat input fully restored with event listeners');
            } else {
              console.error('[BellaAI] Failed to find textarea or send button after restoration');
            }
          }, 200);
        }
        
        // Set up end call button
        endBtn.onclick = () => {
          console.log('[BellaAI] End Voice Chat button clicked')
          cleanup('Voice chat ended by user')
        }
        
        // Attempt to reconnect WebSocket
        async function attemptReconnect() {
          if (isEnded || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            cleanup('Connection lost. Please try again.')
            return
          }
          
          reconnectAttempts++
          reconnectionInfo.style.display = 'block'
          reconnectionInfo.textContent = `Connection lost. Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
          
          try {
            // Close existing connection if any
            if (ws && ws.readyState === 1) {
              ws.close()
            }
            
            // Wait a bit before reconnecting
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Reinitialize WebSocket
            initializeWebSocket()
            
          } catch (err) {
            console.error('[BellaAI] Reconnection error:', err)
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              cleanup('Failed to reconnect. Please try again.')
            } else {
              // Try again
              setTimeout(attemptReconnect, 2000)
            }
          }
        }
        
        // Setup WebSocket with handling
        function initializeWebSocket() {
          // Connect to WebSocket
          ws = new WebSocket(websocketUrl)
          
          // WebSocket open handler
          ws.onopen = function() {
            console.log('[BellaAI] WebSocket connection established')
            updateStatus('Connected, initializing agent...')
            reconnectionInfo.style.display = 'none'
            
            // Reset reconnect counter on successful connection
            reconnectAttempts = 0
            
            // Add a message to the chat that voice mode is starting
            addMessageToChat("Voice mode activated. You can now speak with Bella. Your conversation will appear here as text.", false)
            
            // Send initial conversation config
            const chatHistory = getChatHistory()
            const dealerInfo = getDealerInfo()
            
            // Build appropriate prompt text
            let promptText
            if (chatHistory && chatHistory.length > 0) {
              promptText = `You are a helpful product specialist for ${dealerInfo.name || 'our dealership'}. Continue the conversation based on the previous chat history. IMPORTANT: Do not repeat introductions or greetings as we are transitioning from text to voice mode. The user will see your responses as text while also hearing them as voice.`
            } else {
              promptText = `You are a helpful product specialist for ${dealerInfo.name || 'our dealership'}. The user will see your responses as text while also hearing them as voice. Keep responses concise and avoid repeating the same information in different messages.`
            }
            
            // Don't include a first_message since we'll just use the text chat context
            console.log('[BellaAI] Sending conversation config')
            
            const conversationConfig = {
              type: 'conversation_initiation_client_data',
              conversation_config_override: {
                agent: {
                  prompt: { prompt: promptText },
                  language: 'en'
                },
                tts: { voice_id: '21m00Tcm4TlvDq8ikWAM' }
              },
              custom_llm_extra_body: { 
                temperature: 0.7, 
                max_tokens: 150
              },
              dynamic_variables: { 
                user_name: '', 
                account_type: '' 
              }
            }
            
            // Only send first_message if we don't have chat history
            if (!chatHistory || chatHistory.length === 0) {
              conversationConfig.conversation_config_override.agent.first_message = 
                "I'll be speaking with you now. How can I help you?";
            }
            
            // Send the configuration
            ws.send(JSON.stringify(conversationConfig))
            
            // Set up ping check timer
            lastPingTime = Date.now()
            if (pingCheckTimer) clearInterval(pingCheckTimer)
            
            pingCheckTimer = setInterval(() => {
              if (isEnded) return
              
              // Check if it's been too long since last ping
              const now = Date.now()
              if (now - lastPingTime > 30000) { // 30 seconds
                console.warn('[BellaAI] No ping received in 30s, connection may be lost')
                attemptReconnect()
              }
            }, 10000) // Check every 10 seconds
          }
          
          // WebSocket message handler
          ws.onmessage = function(event) {
            try {
              console.log('[BellaAI] WebSocket message received:', event.data.substring(0, 150) + '...')
              const data = JSON.parse(event.data)
              
              // Handle conversation initialization metadata
              if (data.type === 'conversation_initiation_metadata') {
                console.log('[BellaAI] Conversation initiated, ID:', 
                  data.conversation_initiation_metadata_event?.conversation_id)
                canSendAudio = true
                updateStatus('Listening...', '#090')
                
                // Store conversation ID to help with tracking responses
                window.BellaAITranscriptTracking.currentConversationId = 
                  data.conversation_initiation_metadata_event?.conversation_id || null
              }
              
              // Handle audio from the agent
              else if (data.type === 'audio' && data.audio_event && data.audio_event.audio_base_64) {
                console.log('[BellaAI] Received audio')
                playBase64PCM(data.audio_event.audio_base_64)
              }
              
              // Handle user transcript (what we said)
              else if (data.type === 'user_transcript' && data.user_transcription_event) {
                const userText = data.user_transcription_event.user_transcript
                console.log('[BellaAI] User transcript:', userText)
                if (userText && userText.trim()) {
                  // Store last transcript ID to avoid duplicates
                  const transcriptId = data.user_transcription_event.transcript_id
                  if (transcriptId && window.BellaAITranscriptTracking.lastUserTranscriptId === transcriptId) {
                    console.log('[BellaAI] Skipping duplicate user transcript')
                    return
                  }
                  window.BellaAITranscriptTracking.lastUserTranscriptId = transcriptId
                  
                  addMessageToChat(userText, true)
                }
              }
              
              // Handle agent responses (what the AI says)
              else if (data.type === 'agent_response' && data.agent_response_event) {
                const botText = data.agent_response_event.agent_response
                console.log('[BellaAI] Agent response:', botText)
                
                // Check for duplicates using response ID if available
                const responseId = data.agent_response_event.response_id
                if (responseId && window.BellaAITranscriptTracking.lastAgentResponseId === responseId) {
                  console.log('[BellaAI] Skipping duplicate agent response')
                  return
                }
                window.BellaAITranscriptTracking.lastAgentResponseId = responseId
                
                if (botText && botText.trim()) {
                  addMessageToChat(botText, false)
                }
              }
              
              // Handle ping/pong for keeping connection alive
              else if (data.type === 'ping') {
                console.log('[BellaAI] Ping received, sending pong')
                lastPingTime = Date.now()
                // Send pong response with same event_id - CRITICAL
                if (data.ping_event && data.ping_event.event_id) {
                  ws.send(JSON.stringify({
                    type: 'pong',
                    event_id: data.ping_event.event_id
                  }))
                }
              }
              
            } catch (e) {
              console.error('[BellaAI] Error processing WebSocket message:', e)
            }
          }
          
          // WebSocket error handler
          ws.onerror = function(error) {
            console.error('[BellaAI] WebSocket error:', error)
            if (!isEnded) attemptReconnect()
          }
          
          // WebSocket close handler
          ws.onclose = function(event) {
            console.log('[BellaAI] WebSocket closed:', event.code, event.reason)
            if (!isEnded) {
              if (event.code === 1000) {
                cleanup('Voice chat completed')
              } else if (audioChunksSent === 0) {
                cleanup('No audio detected, please try again')
              } else {
                attemptReconnect()
              }
            }
          }
        }
        
        // Start the voice session
        (async function startVoice() {
          try {
            updateStatus('Requesting microphone access...')
            
            // Reset audio and transcript tracking variables
            window.BellaAIVoiceChatAudio.stop();
            window.BellaAITranscriptTracking.reset();
            
            // Get microphone access
            micStream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              } 
            })
            
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)()
            console.log('[BellaAI] AudioContext created with sampleRate:', audioContext.sampleRate)
            
            // Set up audio processing pipeline
            const source = audioContext.createMediaStreamSource(micStream)
            
            // Analyser to detect silence
            analyserNode = audioContext.createAnalyser()
            analyserNode.fftSize = 256
            source.connect(analyserNode)
            
            // ScriptProcessor for audio data
            processor = audioContext.createScriptProcessor(4096, 1, 1)
            source.connect(processor)
            processor.connect(audioContext.destination)
            
            updateStatus('Connecting to Audio...')
            
            // Initialize WebSocket connection
            initializeWebSocket()
            
            // Set up silence detection
            const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
            
            // Check for audio activity every 100ms
            silenceTimer = setInterval(() => {
              if (isEnded) return
              analyserNode.getByteFrequencyData(dataArray)
              
              // Check if there's audio activity (non-zero frequency data)
              const sum = dataArray.reduce((a, b) => a + b, 0)
              const average = sum / dataArray.length
              
              // If average is above threshold, consider it as activity
              const previousActivity = hasActivity
              hasActivity = average > 5 // Low threshold to detect even quiet speech
              
              // Update indicator based on activity change
              if (hasActivity && canSendAudio) {
                if (!previousActivity) {
                  // Just started talking
                  updateStatus('Listening...', '#c00')
                  if (indicator) {
                    indicator.style.animation = 'recording-pulse 1s infinite'
                  }
                } else {
                  // If sound is detected, show recording indicator
                  updateStatus('Listening...', '#c00')
                  indicator.style.animation = 'pulse 1s infinite'
                  indicator.style.background = '#c00'
                }
              } else if (canSendAudio && previousActivity) {
                // Just stopped talking
                updateStatus('Listening...', '#090')
                if (indicator) {
                  indicator.style.animation = ''
                }
              }
            }, 100)
            
            // Audio processor - collects audio data and sends to WebSocket
            processor.onaudioprocess = async function(e) {
              if (isEnded || !ws || ws.readyState !== 1 || !canSendAudio) return
              
              // Get audio data from the buffer
              let input = e.inputBuffer.getChannelData(0)
              
              // Resample to 16kHz if needed
              if (audioContext.sampleRate !== 16000) {
                try {
                  input = await resampleTo16kHz(input, audioContext.sampleRate)
                } catch (err) {
                  console.error('[BellaAI] Resampling error:', err)
                  // Continue with original audio
                }
              }
              
              // Convert to 16-bit PCM and then to base64
              const pcm16 = floatTo16BitPCM(input)
              const base64 = int16ToBase64(pcm16)
              
              // Send as user_audio_chunk - EXACT FORMAT
              ws.send(JSON.stringify({ 
                user_audio_chunk: base64
              }))
              
              audioChunksSent++
              if (audioChunksSent % 25 === 0) {
                console.log('[BellaAI] Sent', audioChunksSent, 'audio chunks')
              }
            }
            
          } catch (err) {
            console.error('[BellaAI] Error in voice session:', err)
            cleanup('Error: ' + (err.message || 'Could not start voice session'))
          }
        })()
      }
      // --- End Conversational AI Integration ---

    })();