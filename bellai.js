// Chat Widget Script - Version 1.9.1

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
        color: white;
        align-self: flex-end;
        box-shadow: 0 4px 12px rgba(133, 79, 255, 0.2);
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
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0 20px;
        cursor: pointer;
        font-weight: 500;
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
        const input = window.bellaaiTextarea || textarea;
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

      // Function to generate page summary with caching
      async function generatePageSummary() {
        try {
          // Get main content
          const mainContent = document.querySelector('main, #main, .main-content, .content');
          if (!mainContent) {
            console.log('No main content found on page');
            return null;
          }

          // Extract and clean text content
          const textContent = cleanHtmlContent(mainContent);
          if (!textContent) {
            console.log('No text content found in main content');
            return null;
          }

          // Generate a simple hash of the content to check if it's changed
          const contentHash = await generateContentHash(textContent);
          
          // Check if we have a cached summary for this content
          const cachedSummary = getCachedSummary(window.location.href, contentHash);
          if (cachedSummary) {
            console.log('Using cached page summary');
            return cachedSummary;
          }

          // Get page metadata
          const metadata = {
            title: document.title,
            url: window.location.href,
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            type: determinePageType(),
            dealer: config.dealer
          };

          // Prepare URL with query parameters
          const params = new URLSearchParams({
            content: textContent,
            metadata: JSON.stringify(metadata)
          });

          // Send GET request to pagecontext webhook
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

          // Get the text response
          const summary = await response.text();
          
          // Cache the summary if we got one
          if (summary) {
            cacheSummary(window.location.href, contentHash, summary);
          } else {
            console.warn('Empty response from page context webhook');
          }
          
          return summary;
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
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0 20px;
          cursor: pointer;
          font-weight: 500;
          font-size: 15px;
          height: 40px;
          min-width: 70px;
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
        const textareaEl = document.createElement('textarea');
        textareaEl.placeholder = 'Type your message here...';
        textareaEl.rows = 1;
        textareaEl.style.resize = 'none';
        textareaEl.style.flex = '1';
        textareaEl.style.marginRight = '8px';
        textareaEl.className = textarea.className;
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
    })();