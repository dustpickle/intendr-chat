// Chat Widget Script - Version 1.9.1

(function() {
    // Configuration
    const CHAT_VERSION = "1.9.1";
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
      branding: { logo: '', name: '', welcomeText: 'Hello! How can I assist you today?' },
      style: { primaryColor: '#854fff', secondaryColor: '#6b3fd4', position: 'right' },
      dealer: { name: '', phone: '', website: '', searchPage: '', provider: '' }
    };
    
    // Merge user config with defaults
    const config = window.ChatWidgetConfig ? {
      webhook: { ...defaultConfig.webhook, ...window.ChatWidgetConfig.webhook },
      branding: { ...defaultConfig.branding, ...window.ChatWidgetConfig.branding },
      style: { ...defaultConfig.style, ...window.ChatWidgetConfig.style },
      dealer: { ...defaultConfig.dealer, ...window.ChatWidgetConfig.dealer }
    } : defaultConfig;
    
    // Prevent multiple initializations
    if (window.N8NChatWidgetInitialized) return;
    window.N8NChatWidgetInitialized = true;
    
    // Flag to track if user has manually closed the chat in this session
    let userManuallyClosedChat = false;
    
    // Function to check if chat was manually closed
    function checkIfChatWasManuallyClosed() {
      try {
        const chatState = localStorage.getItem('n8nChatState');
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
        localStorage.setItem('n8nChatState', JSON.stringify(state));
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
          
          // Add welcome message only for new sessions
          const botMessageDiv = document.createElement('div');
          botMessageDiv.className = 'chat-message bot';
          botMessageDiv.innerHTML = formatMessage(config.branding.welcomeText);
          messagesContainer.appendChild(botMessageDiv);
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
    
    // Create quick action buttons
    function createQuickActionButtons() {
      const quickActionsContainer = document.createElement('div');
      quickActionsContainer.className = 'quick-actions';
      
      const quickActions = [
        { text: 'Schedule Tour', action: 'Schedule Tour' },
        { text: 'Find Location', action: 'Find Location' },
        { text: 'Ask Question', action: 'Ask Question' },
        { text: 'Contact Us', action: 'Contact Us' }
      ];
      
      quickActions.forEach(function(action) {
        const button = document.createElement('button');
        button.className = 'quick-action-btn';
        button.textContent = action.text;
        
        button.addEventListener('click', function(e) {
          console.log('Quick action button clicked:', action.text);
          console.log('Action to send:', action.action);
          
          e.preventDefault();
          e.stopPropagation();
          
          // Add user message to chat
          const userMessageDiv = document.createElement('div');
          userMessageDiv.className = 'chat-message user';
          userMessageDiv.textContent = action.action;
          messagesContainer.appendChild(userMessageDiv);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          
          console.log('User message added to chat');
          
          // Send the message
          console.log('Attempting to send message...');
          sendMessage(action.action);
          console.log('Message sent');
          
          // Remove the quick actions
          if (quickActionsContainer.parentNode) {
            quickActionsContainer.parentNode.removeChild(quickActionsContainer);
            console.log('Quick actions removed');
          }
        });
        
        console.log('Button created and event listener added:', action.text);
        quickActionsContainer.appendChild(button);
      });
      
      console.log('Quick actions container created with buttons');
      return quickActionsContainer;
    }
    
    // Create thinking animation
    function showThinkingAnimation() {
      const thinkingDiv = document.createElement('div');
      thinkingDiv.className = 'thinking';
      thinkingDiv.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
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
          
          localStorage.setItem('n8nChatSession', JSON.stringify(sessionData));
        } catch (error) {
          console.error('Error saving chat session:', error);
        }
      }
    }
    
    function loadSession() {
      try {
        const savedSession = localStorage.getItem('n8nChatSession');
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
            localStorage.removeItem('n8nChatSession');
          }
        }
      } catch (error) {
        console.error('Error loading saved chat session:', error);
        localStorage.removeItem('n8nChatSession');
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
      .n8n-chat-widget {
        --chat--color-primary: ${config.style.primaryColor};
        --chat--color-secondary: ${config.style.secondaryColor};
        font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .n8n-chat-widget .chat-container {
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
        .n8n-chat-widget .chat-container {
          width: 100%;
          height: 100%;
          bottom: 0;
          right: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .n8n-chat-widget .chat-container.position-left {
          left: 0;
        }
      }
      .n8n-chat-widget .chat-container.position-left {
        right: auto;
        left: 20px;
        transform-origin: bottom left;
      }
      .n8n-chat-widget .chat-container.open {
        opacity: 1;
        transform: scale(1);
        pointer-events: all;
        visibility: visible;
      }
      .n8n-chat-widget .brand-header {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid rgba(133, 79, 255, 0.1);
        position: relative;
      }
      .n8n-chat-widget .close-button {
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
      .n8n-chat-widget .brand-header img {
        width: 32px;
        height: 32px;
      }
      .n8n-chat-widget .brand-header span {
        font-size: 18px;
        font-weight: 500;
      }
      .n8n-chat-widget .chat-interface {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .n8n-chat-widget .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }
      .n8n-chat-widget .chat-message {
        padding: 12px 16px;
        margin: 8px 0;
        border-radius: 12px;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.5;
      }
      .n8n-chat-widget .chat-message.user {
        background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
        color: white;
        align-self: flex-end;
        box-shadow: 0 4px 12px rgba(133, 79, 255, 0.2);
      }
      .n8n-chat-widget .chat-message.bot {
        background: #ffffff;
        border: 1px solid rgba(133, 79, 255, 0.2);
        color: #333;
        align-self: flex-start;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }
      .n8n-chat-widget .quick-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px;
        padding: 0px;
        margin-top: 5px;
      }
      .n8n-chat-widget .quick-action-btn {
        padding: 12px 10px;
        border-radius: 8px;
        border: 1px solid rgba(133, 79, 255, 0.3);
        background: #fff;
        color: var(--chat--color-primary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .n8n-chat-widget .quick-action-btn:hover {
        background: rgba(133, 79, 255, 0.1);
        transform: translateY(-2px);
      }
      .n8n-chat-widget .chat-message.bot a {
        color: var(--chat--color-primary);
        text-decoration: none;
        font-weight: 500;
      }
      .n8n-chat-widget .chat-message.bot a:hover {
        text-decoration: underline;
      }
      .n8n-chat-widget .chat-input {
        padding: 16px;
        border-top: 1px solid rgba(133, 79, 255, 0.1);
        display: flex;
        gap: 8px;
      }
      .n8n-chat-widget .chat-input textarea {
        flex: 1;
        padding: 12px;
        border: 1px solid rgba(133, 79, 255, 0.2);
        border-radius: 8px;
        resize: none;
        font-family: inherit;
        font-size: 14px;
      }
      .n8n-chat-widget .chat-input button {
        background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0 20px;
        cursor: pointer;
        font-weight: 500;
      }
    .n8n-chat-widget .chat-toggle {
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
    
    .n8n-chat-widget .chat-toggle.hidden {
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }
    
    .n8n-chat-widget .chat-toggle-content {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    
    .n8n-chat-widget .chat-toggle svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      color: white;
    }
    
    .n8n-chat-widget .chat-toggle-text {
      font-size: 16px;
      font-weight: 500;
      white-space: nowrap;
      line-height: 24px;
    }
    
    .n8n-chat-widget .online-indicator {
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
      .n8n-chat-widget .chat-toggle {
        width: 60px;
        height: 60px;
        padding: 0;
        justify-content: center;
      }
    
      .n8n-chat-widget .chat-toggle-text {
        display: none;
      }
      
      .n8n-chat-widget .online-indicator {
        top: -20px;
        right: -4px;
      }
    }
    
        .n8n-chat-widget .chat-toggle.position-left {
          right: auto;
          left: 20px;
        }
        .n8n-chat-widget .chat-toggle svg {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }
        .n8n-chat-widget .thinking {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 8px 0;
          border-radius: 12px;
          max-width: 80%;
          align-self: flex-start;
          background: #fff;
          border: 1px solid rgba(133, 79, 255, 0.2);
        }
        .n8n-chat-widget .dot {
          height: 8px;
          width: 8px;
          margin: 0 2px;
          background-color: var(--chat--color-primary);
          border-radius: 50%;
          display: inline-block;
          opacity: 0.6;
          animation: dot-pulse 1.5s infinite;
        }
        .n8n-chat-widget .dot:nth-child(1) { animation-delay: 0s; }
        .n8n-chat-widget .dot:nth-child(2) { animation-delay: 0.3s; }
        .n8n-chat-widget .dot:nth-child(3) { animation-delay: 0.6s; }
        /* Prompt bubble styles */
        .n8n-chat-widget .prompt-bubble {
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
        .n8n-chat-widget .chat-toggle.position-left + .prompt-bubble {
          right: auto;
          left: 10px;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dot-pulse {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.6; transform: scale(1); }
        }
      `;
      
      // Inject styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
      
      // Create DOM elements
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'n8n-chat-widget';
      
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
      
      // Send message function
      async function sendMessage(message) {
        // Reset inactivity state when user sends a message
        resetInactivityState();
        
        // Hide prompt bubble if it's visible
        hidePromptBubble();
    
        const messageData = {
            action: "sendMessage",
            sessionId: currentSessionId,
            route: config.webhook.route,
            chatInput: message,
            metadata: { 
                userId: "",
                utmParams: window.initialUtmParameters || {},
                pageUrl: window.location.href,
                userIP: userIP,
                dealer: config.dealer
            }
        };
        
        // Add user message to chat
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        userMessageDiv.textContent = message;
        messagesContainer.appendChild(userMessageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Save session after adding user message
        saveSession();
        
        try {
          // Show thinking animation
          const thinkingDiv = showThinkingAnimation();
          
          try {
            const response = await fetch(config.webhook.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(messageData)
            });
            
            // Remove thinking animation
            removeThinkingAnimation();
            
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            let data;
            try {
              data = await response.json();
            } catch (parseError) {
              console.error('Error parsing JSON response:', parseError);
              const textResponse = await response.text();
              console.log('Raw text response:', textResponse);
              data = { output: "I'm sorry, I couldn't process that request properly." };
            }
            
            // Extract the output text
            let outputText = '';
            if (Array.isArray(data) && data.length > 0 && data[0].output) {
              outputText = data[0].output;
            } else if (data && data.output) {
              outputText = data.output;
            } else if (typeof data === 'string') {
              outputText = data;
            }
            
            // Fallback for empty responses
            if (!outputText || outputText.trim() === '') {
              outputText = "I received your message, but I'm having trouble generating a response.";
            }

            // Check if the response contains a redirect URL
            const redirectMatch = outputText.match(/\[REDIRECT\](.*?)\[\/REDIRECT\]/);
            if (redirectMatch && redirectMatch[1]) {
              const redirectUrl = redirectMatch[1].trim();
              // Create and add bot message before redirect
              const botMessageDiv = document.createElement('div');
              botMessageDiv.className = 'chat-message bot';
              botMessageDiv.innerHTML = formatMessage("Redirecting you now...");
              messagesContainer.appendChild(botMessageDiv);

              // Add follow-up message with options
              const followUpDiv = document.createElement('div');
              followUpDiv.className = 'chat-message bot';
              followUpDiv.innerHTML = formatMessage("After viewing the vehicle, would you like to:");
              
              // Create quick action buttons container
              const quickActionsContainer = document.createElement('div');
              quickActionsContainer.className = 'quick-actions';
              
              // Define the quick actions
              const quickActions = [
                { text: 'Call Sales Representative', action: 'I would like to speak with a sales representative about this vehicle.' },
                { text: 'Schedule Test Drive', action: 'I would like to schedule a test drive for this vehicle.' },
                { text: 'Continue Chatting', action: 'I would like to continue chatting about other options.' }
              ];
              
              console.log('Creating quick action buttons...');
              
              // Create and add the quick action buttons
              quickActions.forEach(function(action) {
                const button = document.createElement('button');
                button.className = 'quick-action-btn';
                button.textContent = action.text;
                
                console.log('Adding click handler to button:', action.text);
                
                button.addEventListener('click', function(e) {
                  console.log('Button clicked:', action.text);
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Add user message to chat
                  const userMessageDiv = document.createElement('div');
                  userMessageDiv.className = 'chat-message user';
                  userMessageDiv.textContent = action.action;
                  messagesContainer.appendChild(userMessageDiv);
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                  
                  console.log('User message added to chat:', action.action);
                  
                  // Send the message
                  console.log('Calling sendMessage...');
                  sendMessage(action.action);
                  console.log('sendMessage called');
                  
                  // Remove the quick actions
                  if (quickActionsContainer.parentNode) {
                    quickActionsContainer.parentNode.removeChild(quickActionsContainer);
                    console.log('Quick actions removed');
                  }
                });
                
                quickActionsContainer.appendChild(button);
                console.log('Button added to container:', action.text);
              });
              
              console.log('All quick action buttons created');
              followUpDiv.appendChild(quickActionsContainer);
              messagesContainer.appendChild(followUpDiv);
              console.log('Follow-up message and quick actions added to chat');
              
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
              
              // Save session before redirect
              saveSession();
              
              // Perform the redirect after a short delay
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 2000); // Increased delay to give time to read the follow-up message
              return;
            }
            
            // Create and add bot message
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage(outputText);
            messagesContainer.appendChild(botMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Save session
            saveSession();
            
            // Reset inactivity timer (without resetting the inactivityMessageSent flag)
            resetInactivityTimer();
          } catch (error) {
            // Handle errors
            console.error('API Error:', error);
            removeThinkingAnimation();
            
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.className = 'chat-message bot';
            errorMessageDiv.textContent = "I'm sorry, I'm having trouble connecting to our services right now.";
            messagesContainer.appendChild(errorMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            saveSession();
          }
        } catch (error) {
          console.error('Error:', error);
          removeThinkingAnimation();
          
          const errorMessageDiv = document.createElement('div');
          errorMessageDiv.className = 'chat-message bot';
          errorMessageDiv.textContent = "I'm sorry, something went wrong. Please try again.";
          messagesContainer.appendChild(errorMessageDiv);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          
          saveSession();
        }
      }
      
      // Expose sendMessage function to global scope for inline click handlers
      window.sendMessage = sendMessage;
      
      // Add event listeners
      toggleButton.addEventListener('click', function() {
        hidePromptBubble();
        promptBubbleShown = true;
        
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
            
            // Add welcome message only for new sessions
            const botMessageDiv = document.createElement('div');
            botMessageDiv.className = 'chat-message bot';
            botMessageDiv.innerHTML = formatMessage(config.branding.welcomeText);
            messagesContainer.appendChild(botMessageDiv);
          }
          
          // Save session after changes
          saveSession();
          
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          startInactivityTimer();
          clearTimeout(promptBubbleTimer);
        }
      });
      
      // Send button click event
      sendButton.addEventListener('click', function() {
        const message = textarea.value.trim();
        if (message) {
          sendMessage(message);
          textarea.value = '';
        }
      });
      
      // Textarea keypress event
      textarea.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const message = textarea.value.trim();
          if (message) {
            sendMessage(message);
            textarea.value = '';
          }
        }
      });
      
      // Close button event
      const closeButton = chatContainer.querySelector('.close-button');
      closeButton.addEventListener('click', function() {
        chatContainer.classList.remove('open');
        toggleButton.classList.remove('hidden');
        document.body.style.overflow = '';
        clearTimeout(inactivityTimer);
        saveSession();
        
        // Track that user has manually closed the chat
        userManuallyClosedChat = true;
        saveChatState(true);
      });
      
      // Auto-open chat on desktop after 5 seconds
      const AUTO_OPEN_DELAY = 5000; // 5 seconds
      const isDesktop = window.innerWidth > 768; // Common breakpoint for desktop
      
      // Check if chat was manually closed in previous session
      userManuallyClosedChat = checkIfChatWasManuallyClosed();
      
      if (isDesktop && !userManuallyClosedChat) {
        setTimeout(function() {
          // Only auto-open if the user hasn't manually closed the chat
          if (!userManuallyClosedChat) {
            openChat();
          }
        }, AUTO_OPEN_DELAY);
      }

      // Handle page visibility changes
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !userManuallyClosedChat) {
          // If page becomes visible and chat wasn't manually closed, open it
          openChat();
        }
      });

      // Handle page navigation (for single-page applications)
      let lastUrl = window.location.href;
      new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          if (!userManuallyClosedChat) {
            openChat();
          }
        }
      }).observe(document, { subtree: true, childList: true });
    })();