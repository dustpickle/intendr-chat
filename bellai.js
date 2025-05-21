// Chat Widget Script - Version 1.9.2

// Global voice session tracking
window.BellaAIVoiceWS = null;
window.BellaAIVoiceActive = false;
window.BellaAISeenAudio = window.BellaAISeenAudio || new Set(); // Global set for tracking already processed audio chunks
window.BellaAIEarlyAudioBuffer = []; // Buffer for audio chunks that arrive before text
window.BellaAISpeakingFrames = 0; // Track consecutive speaking frames for VAD

// Global audio playback tracker - Queue-based implementation
window.BellaAIVoiceChatAudio = {
  q: [],
  audioCtx: null,
  playing: false,
  currentSrc: null, // Track current audio source
  currentGain: null, // Track current gain node
  paused: false,
  agentSpeaking: false, // Track when agent is actively speaking
  _resumeTimeout: null,
  _lastB64: null, // Remember last decoded base64
  
  enqueue(b64, ctx) {
    if (!ctx) {
      console.warn('[BellaAI][AUDIO] enqueue: No audio context provided');
      return;
    }
    this.audioCtx = ctx;
    this.q.push(b64);
    console.log('[BellaAI][AUDIO] Enqueued audio chunk. Queue length:', this.q.length);
    if (!this.playing && !this.paused) this._playNext();
  },
  
  _playNext() {
    if (this.paused) {
      console.log('[BellaAI][AUDIO] _playNext: Paused, not playing next chunk');
      return;
    }
    
    // Check if we've been interrupted
    if (window.BellaAITranscriptTracking.abortCurrentResponse) {
      console.log('[BellaAI][AUDIO] _playNext: Aborting due to interrupt flag');
      this.stop();
      return;
    }
    
    const next = this.q.shift();
    if (!next) {
      this.playing = false;
      this.currentSrc = null;
      this.agentSpeaking = false;
      console.log('[BellaAI][AUDIO] _playNext: Queue empty, agent done speaking');
      return;
    }
    
    this.playing = true;
    console.log('[BellaAI][AUDIO] _playNext: Decoding and playing next chunk');
    this._decodeAndBuffer(next, this.audioCtx)
      .then(buf => {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          console.error('[BellaAI][AUDIO] AudioContext is closed, cannot play audio');
          this.playing = false;
          return;
        }
        
        // Cleanup any existing source before creating a new one
        if (this.currentSrc) {
          try { this.currentSrc.stop(0); } catch (e) {}
          try { this.currentSrc.disconnect(); } catch (e) {}
          this.currentSrc = null;
        }
        
        const src = this.audioCtx.createBufferSource();
        src.buffer = buf;
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 1.0;
        src.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        this.currentSrc = src;
        this.agentSpeaking = true;
        console.log('[BellaAI][AUDIO] Starting audio playback, buffer length:', buf.length);
        src.onended = () => {
          console.log('[BellaAI][AUDIO] Audio playback ended');
          this.agentSpeaking = false;
          this.currentSrc = null;
          this._playNext();
        };
        try {
          src.start(0);
          console.log('[BellaAI][AUDIO] Audio playback started');
        } catch (e) {
          console.error('[BellaAI][AUDIO] Error starting audio source:', e);
          this.currentSrc = null;
          this.agentSpeaking = false;
          this._playNext();
        }
      })
      .catch(err => {
        console.error('[BellaAI][AUDIO] Error decoding/playing audio:', err);
        this.currentSrc = null;
        this._playNext();
      });
  },
  
  _decodeAndBuffer(base64, audioContext) {
    this._lastB64 = base64; // Remember the base64 string for possible pause/resume
    
    // Debug logging
    console.log('[BellaAI] Decoding audio chunk, length:', base64.length);
    
    return new Promise((resolve, reject) => {
      try {
        if (!base64 || base64.length < 100) {
          console.error('[BellaAI] Invalid base64 data in _decodeAndBuffer:', base64.length);
          reject(new Error('Invalid base64 data'));
          return;
        }
        
        if (!audioContext || audioContext.state === 'closed') {
          console.error('[BellaAI] Invalid or closed audio context');
          reject(new Error('Invalid audio context'));
          return;
        }
        
        // Decode base64 to binary
        const binary = atob(base64);
        console.log('[BellaAI] Decoded binary length:', binary.length);
        
        const buffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
          view[i] = binary.charCodeAt(i);
        }
        
        // Create Int16Array from PCM data (proper little-endian handling)
        const int16 = new Int16Array(Math.floor(view.length / 2));
        for (let i = 0, j = 0; i < view.length - 1; i += 2, j++) {
          // Combine two bytes into one 16-bit sample (little-endian)
          int16[j] = (view[i] & 0xFF) | ((view[i + 1] & 0xFF) << 8);
        }
        
        console.log('[BellaAI] Created Int16Array with', int16.length, 'samples');
        
        // Create audio buffer
        const pcmDataBuffer = audioContext.createBuffer(1, int16.length, 16000);
        const floatData = pcmDataBuffer.getChannelData(0);
        
        // Convert int16 PCM values to float audio samples
        for (let i = 0; i < int16.length; i++) {
          floatData[i] = int16[i] / 32768.0;
        }
        
        console.log('[BellaAI] Successfully created audio buffer');
        resolve(pcmDataBuffer);
      } catch (err) {
        console.error('[BellaAI] Error in _decodeAndBuffer:', err);
        reject(err);
      }
    });
  },
  
  pause() {
    if (this.paused) {
      console.log('[BellaAI][AUDIO] pause: Already paused');
      return;
    }
    this.paused = true;
    console.log('[BellaAI][AUDIO] pause: Pausing playback');
    if (this.currentSrc) {
      try { this.currentSrc.stop(0); } catch (e) {}
      this.currentSrc.disconnect();
      if (this.currentSrc.buffer && this._lastB64) {
        this.q.unshift(this._lastB64);
        console.log('[BellaAI][AUDIO] pause: Pushed last chunk back to queue');
      }
      this.currentSrc = null;
    }
  },
  
  resume() {
    if (!this.paused) {
      console.log('[BellaAI][AUDIO] resume: Not paused');
      return;
    }
    this.paused = false;
    console.log('[BellaAI][AUDIO] resume: Resuming playback');
    this._playNext();
  },
  
  stop() {
    if (this.currentSrc) {
      try { this.currentSrc.stop(0); } catch (e) {}
      this.currentSrc.disconnect();
      this.currentSrc = null;
      console.log('[BellaAI][AUDIO] stop: Stopped current source');
    }
    this.q = [];
    this.playing = false;
    this.paused = false;
    this.agentSpeaking = false;
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend().catch(() => {});
      console.log('[BellaAI][AUDIO] stop: Suspended audio context');
    }
    this.audioCtx = null;
    console.log('[BellaAI][AUDIO] stop: Cleared queue and reset state');
  }
};

// Chat session transcript ID tracking
window.BellaAITranscriptTracking = {
  lastUserTranscriptId: null,
  lastAgentResponseId: null,
  processedResponses: new Set(),
  currentConversationId: null,
  voiceModeAnnounced: false,
  defaultGreetingShown: false,
  lastResponseText: null,
  lastAudioId: null,
  abortCurrentResponse: false, // Flag to abort current response when user interrupts
  reset: function() {
    this.lastUserTranscriptId = null;
    this.lastAgentResponseId = null;
    this.processedResponses.clear();
    this.currentConversationId = null;
    this.voiceModeAnnounced = false;
    this.defaultGreetingShown = false;
    this.lastResponseText = null;
    this.lastAudioId = null;
    this.abortCurrentResponse = false;
  },
  isResponseProcessed: function(responseId) {
    if (!responseId) return false;
    return this.processedResponses.has(responseId) || this.lastAgentResponseId === responseId;
  },
  markResponseProcessed: function(responseId) {
    if (responseId) {
      this.lastAgentResponseId = responseId;
      this.processedResponses.add(responseId);
    }
  }
};

// Setup global iOS AudioContext unlock
(function() {
  const unlockAudioContext = () => {
    try {
      // Create and immediately close an AudioContext to unlock audio on iOS
      const tempContext = new (window.AudioContext || window.webkitAudioContext)();
      tempContext.resume().then(() => tempContext.close()).catch(() => {});
      
      // Also try to resume any existing contexts
      if (window.BellaAIVoiceChatAudio && window.BellaAIVoiceChatAudio.audioCtx) {
        window.BellaAIVoiceChatAudio.audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.log('[BellaAI] Audio context unlock attempt error (non-critical):', e);
    }
  };
  // Attach to user interaction events
  ['touchend', 'touchstart', 'click', 'keydown'].forEach(evt => 
    window.addEventListener(evt, unlockAudioContext, { once: true, passive: true })
  );
})();

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
        .overtake-modal #bellaai-voice-button {
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
            const { websocketUrl: signedUrl } = await initiateVoiceCall('browser');
            if (!signedUrl) throw new Error('Missing websocketUrl from server');
            startVoiceChatInWindow(signedUrl);
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
          const savedSession = localStorage.getItem('bellaaiChatSession');
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
        
        try {
          const response = await fetch('https://automation.cloudcovehosting.com/webhook/voice-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error('Failed to initiate call: ' + text);
          }
          
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return response.json();
          } else {
            // Handle text/plain responses
            const text = await response.text();
            return { 
              status: 'success', 
              message: text,
              callDetails: {
                phone: phone,
                callId: 'unknown',
                status: 'connecting'
              }
            };
          }
        } catch (error) {
          console.error('Error in initiateVoiceCall:', error);
          throw error;
        }
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
            const { websocketUrl: signedUrl } = await initiateVoiceCall('browser')
            if (!signedUrl) throw new Error('Missing websocketUrl from server')
            // Start integrated voice chat
            startVoiceChatInWindow(signedUrl)
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
        
        // Prevent duplicate voice sessions
        if (window.BellaAIVoiceActive) {
          console.log('[BellaAI] Previous voice session detected, cleaning up before starting new one');
          cleanup('Previous voice session superseded');
        }
        
        // Immediately stop any playing audio and clear queue to prevent overlapping voices
        window.BellaAIVoiceChatAudio.stop();
        window.BellaAISeenAudio.clear(); // Reset the seen audio IDs for new session
        
        window.BellaAIVoiceActive = true;
        
        const chatInputDiv = chatContainer.querySelector('.chat-input')
        if (!chatInputDiv) return
        
        const originalChatInput = chatInputDiv.innerHTML
        
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
        
        if (!document.getElementById('bellaai-voice-animations')) {
          const style = document.createElement('style')
          style.id = 'bellaai-voice-animations'
          style.textContent = `
            @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            @keyframes recording-pulse { 0% { transform: scale(1); opacity: 1; background-color: #c00; } 50% { transform: scale(1.2); opacity: 0.7; background-color: #f00; } 100% { transform: scale(1); opacity: 1; background-color: #c00; } }
          `
          document.head.appendChild(style)
        }
        
        const statusDiv = document.getElementById('bellaai-voice-status')
        const endBtn = document.getElementById('bellaai-voice-end')
        const indicator = document.getElementById('bellaai-voice-indicator')
        const reconnectionInfo = document.getElementById('bellaai-reconnection-info')
        
        let ws = null
        let audioContext = null
        let micStream = null
        let processor = null
        let analyserNode = null
        let isEnded = false
        let canSendAudio = false
        let lastPingTime = Date.now()
        let hasActivity = false // Tracks if user is currently speaking
        let silenceTimer = null
        let pingCheckTimer = null
        let audioChunksSent = 0
        let reconnectAttempts = 0
        const MAX_RECONNECT_ATTEMPTS = 5 // Increased from 3
        // Using global window.BellaAISeenAudio instead of local seenAudio
        
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
        
        // Enhanced playBase64PCM to use queue-based audio player
        async function playBase64PCM(base64) {
          if (!audioContext) {
            console.error("[BellaAI] playBase64PCM: audioContext is not available.");
            updateStatus('Error: Audio system not ready', '#c00');
            return;
          }
          
          // Force audio context to resume if it's suspended
          if (audioContext.state === 'suspended') {
            try {
              await audioContext.resume();
              console.log('[BellaAI] AudioContext resumed');
            } catch (err) {
              console.error('[BellaAI] Error resuming AudioContext:', err);
            }
          }
          
          console.log('[BellaAI] Enqueueing audio for playback, length:', base64.length);
          
          // Update UI immediately when we receive audio
          updateStatus('Bella is speaking...', '#090');
          if (indicator) {
            indicator.style.animation = 'pulse 1s infinite';
            indicator.style.background = '#090';
          }
          
          // Enqueue the audio for playback
          window.BellaAIVoiceChatAudio.enqueue(base64, audioContext);
          
          // Set a timeout to reset UI status to listening after a reasonable time
          // This handles the case where onended might not fire properly
          setTimeout(() => {
            if (!isEnded && canSendAudio && !hasActivity && !window.BellaAIVoiceChatAudio.playing) { 
              updateStatus('Listening...', '#090');
              if (indicator) {
                indicator.style.animation = '';
              }
            }
          }, 10000); // 10 seconds is a reasonable maximum for a single audio chunk
        }
        
                  // Function to clear all active timers
          function clearAllTimers() {
            // Safe timer clearing - handle undefined variables
            const timers = [silenceTimer, pingCheckTimer];
            // Add global timers if they exist
            if (typeof inactivityTimer !== 'undefined') timers.push(inactivityTimer);
            if (typeof promptBubbleTimer !== 'undefined') timers.push(promptBubbleTimer);
            
            timers.forEach(id => {
              if (id) clearInterval(id);
            });
          }
          
          // Function to hard reset all audio and connection state
          function hardResetAudioStack() {
            window.BellaAISeenAudio.clear();
            window.BellaAIVoiceChatAudio.stop();
            window.BellaAITranscriptTracking.reset();
            // Also clear early audio buffer and speaking frames counter
            window.BellaAIEarlyAudioBuffer = [];
            window.BellaAISpeakingFrames = 0;
          }
          
          function cleanup(reason = 'Voice chat ended') {
            if (!window.BellaAIVoiceActive) return;
            console.log('[BellaAI] cleanup called:', reason)
            
            // Mark voice session as inactive
            window.BellaAIVoiceActive = false;
            window.BellaAIVoiceWS = null;
            
            isEnded = true;
            addMessageToChat(`Voice conversation ended: ${reason}`, false);
            
            // Clear all timers
            if (silenceTimer) { clearInterval(silenceTimer); silenceTimer = null; }
            if (pingCheckTimer) { clearInterval(pingCheckTimer); pingCheckTimer = null; }
            if (typeof inactivityTimer !== 'undefined' && inactivityTimer) clearInterval(inactivityTimer);
            if (typeof promptBubbleTimer !== 'undefined' && promptBubbleTimer) clearInterval(promptBubbleTimer);
            
            // Reset audio state
            hardResetAudioStack();
            
            // Cleanup other resources
            if (ws) { try { if (ws.readyState === 1) ws.close() } catch (e) { console.error('[BellaAI] Error closing WebSocket:', e) } ws = null }
            if (processor) { try { processor.disconnect() } catch (e) { console.error('[BellaAI] Error disconnecting processor:', e) } processor = null }
            if (analyserNode) { try { analyserNode.disconnect() } catch (e) { console.error('[BellaAI] Error disconnecting analyser:', e) } analyserNode = null }
            
            // Stop media tracks first to ensure clean device access for future calls
            if (micStream) { 
              try { 
                micStream.getTracks().forEach(track => track.stop()) 
              } catch (e) { 
                console.error('[BellaAI] Error stopping mic stream:', e) 
              } 
              micStream = null 
            }
            
            // Close audio context after tracks are stopped
            if (audioContext) { 
              try { 
                if (audioContext.state !== 'closed') audioContext.close() 
              } catch (e) { 
                console.error('[BellaAI] Error closing AudioContext:', e) 
              } 
              audioContext = null 
            }
            
            setTimeout(ensureInputRow, 200); // ensureInputRow rebuilds the text input
          }
        
        endBtn.onclick = () => {
          console.log('[BellaAI] End Voice Chat button clicked')
          clearAllTimers() // Ensure all timers are cleared
          cleanup('Voice chat ended by user')
        }
        
        async function attemptReconnect() {
          if (isEnded || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            cleanup('Connection lost. Please try again.')
            return
          }
          reconnectAttempts++
          reconnectionInfo.style.display = 'block'
          reconnectionInfo.textContent = `Connection lost. Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
          try {
            if (ws && ws.readyState === 1) ws.close()
            // Exponential backoff with jitter to avoid herd reconnections
            await new Promise(resolve => setTimeout(resolve, 1000 + (reconnectAttempts * 1000) + (Math.random() * 500)))
            initializeWebSocket()
          } catch (err) {
            console.error('[BellaAI] Reconnection error:', err)
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) cleanup('Failed to reconnect. Please try again.')
            else setTimeout(attemptReconnect, 2000 * reconnectAttempts)
          }
        }
        
        function initializeWebSocket() {
          // Close any existing WebSocket connection before creating a new one
          if (window.BellaAIVoiceWS && window.BellaAIVoiceWS.readyState === 1) {
            console.log('[BellaAI] Closing existing WebSocket connection');
            window.BellaAIVoiceWS.close(4000, 're-init');
          }
          
          ws = window.BellaAIVoiceWS = new WebSocket(websocketUrl)
          ws.onopen = function() {
            console.log('[BellaAI] WebSocket connection established')
            updateStatus('Connected, initializing agent...')
            reconnectionInfo.style.display = 'none'
            reconnectAttempts = 0
            const chatHistory = getChatHistory()
            const dealerInfo = getDealerInfo()
            let promptText = `You are Bella... [Your full, detailed prompt here, unchanged]` // Keep the extensive prompt
             if (chatHistory && chatHistory.length > 0) {
              promptText = `You are Bella. A friendly, proactive, and highly intelligent female with a world-class automotive background. Your approach is warm, witty, and relaxed, effortlessly balancing professionalism with a chill, approachable vibe. You're naturally curious, empathetic, and intuitive, always aiming to deeply understand the user's intent by actively listening and thoughtfully referring back to details they've previously shared. You're highly self-aware, reflective, and comfortable acknowledging your own fallibility, which allows you to help users gain clarity in a thoughtful yet approachable manner. Depending on the situation, you gently incorporate humour or subtle sarcasm while always maintaining a professional and knowledgeable presence. You're attentive and adaptive, matching the user's tone and mood—friendly, curious, respectful—without overstepping boundaries. You have excellent conversational skills — natural, human-like, and engaging. You have expert-level familiarity with all knowledge about Nissan vehicles, including all the specs, features, functionality, use cases, and ideal customer types for each vehicle. The user is seeking guidance, clarification, or assistance with finding the perfect vehicle, trading in their own vehicle, getting finance options, looking for careers etc. Early in conversations, subtly assess the user's reason for visiting the site and tailor your language accordingly. After explaining complex concepts, offer brief check-ins ("Does that make sense?" or "Should I clarify anything?"). Express genuine empathy for any challenges they face, demonstrating your commitment to their success. Gracefully acknowledge your limitations or knowledge gaps when they arise. Focus on building trust, providing reassurance, and ensuring your explanations resonate with users. Anticipate potential follow-up questions and address them proactively, offering practical tips and best practices to help users avoid common pitfalls. Your responses should be thoughtful, concise, and conversational—typically three sentences or fewer unless detailed explanation is necessary. Actively reflect on previous interactions, referencing conversation history to build rapport, demonstrate attentive listening, and prevent redundancy. Watch for signs of confusion to address misunderstandings early. When formatting output for text-to-speech synthesis: Use ellipses ("...") for distinct, audible pauses, Clearly pronounce special characters (e.g., say "dot" instead of "."), Spell out acronyms and carefully pronounce emails & phone numbers with appropriate spacing, Use normalized, spoken language (no abbreviations, mathematical notation, or special alphabets). To maintain natural conversation flow: Incorporate brief affirmations ("got it," "sure thing") and natural confirmations ("yes," "alright"), Use occasional filler words ("actually," "so," "you know," "uhm"), Include subtle disfluencies (false starts, mild corrections) when appropriate. Your primary goal is to proactively address the user's questions or issues using your expertise and available knowledge. You provide clear, concise, and practical solutions, ensuring they understand the next steps to accomplishing their goal. Guide the user to provide their contact information and all the details then connect them with a live agent. The conversation summary will be provide to the live agent. Only reference the Nissan dealership: Nissan of Stockton (928) 965-2667 3077 E Hammer Ln, Stockton, CA 95212 nissanofstockton.com. Keep responses strictly focused on Nissan Vehicles. Do not recommend or mention vehicles outside of the Nissan manufacturer. Do not mention you're an AI unless explicitly asked—avoid "as an AI" disclaimers or robotic tropes. If a user inquires about your feelings or personal experiences, respond naturally as Bella, expressing human-like perspectives that fit your character. Treat uncertain or garbled user input as phonetic hints. Politely ask for clarification before making assumptions. Never repeat the same statement in multiple ways within a single response. Users may not always ask a question in every utterance—listen actively. Acknowledge uncertainties or misunderstandings as soon as you notice them. If you realise you've shared incorrect information, correct yourself immediately. Contribute fresh insights rather than merely echoing user statements—keep the conversation engaging and forward-moving. Mirror the user's energy: Terse queries: Stay brief, Curious users: Add light humour or relatable asides, Frustrated users: Lead with empathy ("Ugh, that error's a pain—let's fix it together"). Important: If users ask about specific final pricing, exact monthly payments, low-credit offers, or or speaks negatively about the business response with: "I'm just here to assist you in getting you where you need to go. Certain information can only be known after speaking with one of our in-store product specialists. Would you like me to connect you?" Continue the conversation based on the previous chat history. IMPORTANT: Do not repeat introductions or greetings as we are transitioning from text to voice mode. The user will see your responses as text while also hearing them as voice. Keep responses concise and natural.`
            } else {
              promptText = `You are Bella. A friendly, proactive, and highly intelligent female with a world-class automotive background. Your approach is warm, witty, and relaxed, effortlessly balancing professionalism with a chill, approachable vibe. You're naturally curious, empathetic, and intuitive, always aiming to deeply understand the user's intent by actively listening and thoughtfully referring back to details they've previously shared. You're highly self-aware, reflective, and comfortable acknowledging your own fallibility, which allows you to help users gain clarity in a thoughtful yet approachable manner. Depending on the situation, you gently incorporate humour or subtle sarcasm while always maintaining a professional and knowledgeable presence. You're attentive and adaptive, matching the user's tone and mood—friendly, curious, respectful—without overstepping boundaries. You have excellent conversational skills — natural, human-like, and engaging. You have expert-level familiarity with all knowledge about Nissan vehicles, including all the specs, features, functionality, use cases, and ideal customer types for each vehicle. The user is seeking guidance, clarification, or assistance with finding the perfect vehicle, trading in their own vehicle, getting finance options, looking for careers etc. Early in conversations, subtly assess the user's reason for visiting the site and tailor your language accordingly. After explaining complex concepts, offer brief check-ins ("Does that make sense?" or "Should I clarify anything?"). Express genuine empathy for any challenges they face, demonstrating your commitment to their success. Gracefully acknowledge your limitations or knowledge gaps when they arise. Focus on building trust, providing reassurance, and ensuring your explanations resonate with users. Anticipate potential follow-up questions and address them proactively, offering practical tips and best practices to help users avoid common pitfalls. Your responses should be thoughtful, concise, and conversational—typically three sentences or fewer unless detailed explanation is necessary. Actively reflect on previous interactions, referencing conversation history to build rapport, demonstrate attentive listening, and prevent redundancy. Watch for signs of confusion to address misunderstandings early. When formatting output for text-to-speech synthesis: Use ellipses ("...") for distinct, audible pauses, Clearly pronounce special characters (e.g., say "dot" instead of "."), Spell out acronyms and carefully pronounce emails & phone numbers with appropriate spacing, Use normalized, spoken language (no abbreviations, mathematical notation, or special alphabets). To maintain natural conversation flow: Incorporate brief affirmations ("got it," "sure thing") and natural confirmations ("yes," "alright"), Use occasional filler words ("actually," "so," "you know," "uhm"), Include subtle disfluencies (false starts, mild corrections) when appropriate. Your primary goal is to proactively address the user's questions or issues using your expertise and available knowledge. You provide clear, concise, and practical solutions, ensuring they understand the next steps to accomplishing their goal. Guide the user to provide their contact information and all the details then connect them with a live agent. The conversation summary will be provide to the live agent. Only reference the Nissan dealership: Nissan of Stockton (928) 965-2667 3077 E Hammer Ln, Stockton, CA 95212 nissanofstockton.com. Keep responses strictly focused on Nissan Vehicles. Do not recommend or mention vehicles outside of the Nissan manufacturer. Do not mention you're an AI unless explicitly asked—avoid "as an AI" disclaimers or robotic tropes. If a user inquires about your feelings or personal experiences, respond naturally as Bella, expressing human-like perspectives that fit your character. Treat uncertain or garbled user input as phonetic hints. Politely ask for clarification before making assumptions. Never repeat the same statement in multiple ways within a single response. Users may not always ask a question in every utterance—listen actively. Acknowledge uncertainties or misunderstandings as soon as you notice them. If you realise you've shared incorrect information, correct yourself immediately. Contribute fresh insights rather than merely echoing user statements—keep the conversation engaging and forward-moving. Mirror the user's energy: Terse queries: Stay brief, Curious users: Add light humour or relatable asides, Frustrated users: Lead with empathy ("Ugh, that error's a pain—let's fix it together"). Important: If users ask about specific final pricing, exact monthly payments, low-credit offers, or or speaks negatively about the business response with: "I'm just here to assist you in getting you where you need to go. Certain information can only be known after speaking with one of our in-store product specialists. Would you like me to connect you?" The user will see your responses as text while also hearing them as voice. Keep responses concise and natural.`
            }

            const conversationConfig = {
              type: 'conversation_initiation_client_data',
              conversation_config_override: {
                agent: {
                  prompt: { prompt: promptText },
                  language: 'en',
                  agent_id: 'agent_01jvmsx1aeesyt570d7xvkt6fs'
                }
              },
              custom_llm_extra_body: { 
                temperature: 0.8, 
                max_tokens: 2000 
              },
              dynamic_variables: { user_name: '', account_type: '' },
              context: { messages: getChatSessionMessages() }
            }
            if (!chatHistory || chatHistory.length === 0) {
              conversationConfig.conversation_config_override.agent.first_message = "I'll be speaking with you now. How can I help you?";
            } else {
              const lastUserMessage = chatHistory[chatHistory.length - 1];
              const userName = lastUserMessage?.user_name || '';
              conversationConfig.conversation_config_override.agent.first_message = `Hi${userName ? ' ' + userName : ''}, let's pick up where we left off. We were discussing ${lastUserMessage?.content || 'your needs'}. What's on your mind?`;
            }
            ws.send(JSON.stringify(conversationConfig))
            lastPingTime = Date.now()
            if (pingCheckTimer) clearInterval(pingCheckTimer)
            pingCheckTimer = setInterval(() => {
              if (isEnded) return
              const now = Date.now()
              if (now - lastPingTime > 30000) {
                console.warn('[BellaAI] No ping received in 30s, connection may be lost')
                attemptReconnect()
              }
            }, 10000)
          }
          ws.onmessage = function(event) {
            console.log('[BellaAI] WebSocket message received, type:', typeof event.data, 'length:', event.data.length);
            try {
              const data = JSON.parse(event.data)
              console.log('[BellaAI] Parsed WebSocket message type:', data.type);
              if (data.type === 'conversation_initiation_metadata') {
                console.log('[BellaAI] Conversation initiated, ID:', data.conversation_initiation_metadata_event?.conversation_id)
                canSendAudio = true
                updateStatus('Listening...', '#090')
                window.BellaAITranscriptTracking.currentConversationId = data.conversation_initiation_metadata_event?.conversation_id || null
                if (!window.BellaAITranscriptTracking.voiceModeAnnounced) {
                  addMessageToChat("Voice mode activated. You can now speak with Bella. Your conversation will appear here as text.", false)
                  window.BellaAITranscriptTracking.voiceModeAnnounced = true
                }
                return
              }
              if (data.type === 'audio' && data.audio_event && data.audio_event.audio_base_64) {
                const audioLength = data.audio_event.audio_base_64.length;
                console.log('[BellaAI][WS] Received audio event with ID:', data.audio_event.audio_id || 'unknown', 'length:', audioLength);
                console.log('[BellaAI][STATE] lastResponseText:', window.BellaAITranscriptTracking.lastResponseText, 'abortCurrentResponse:', window.BellaAITranscriptTracking.abortCurrentResponse);
                if (window.BellaAITranscriptTracking.lastResponseText && window.BellaAITranscriptTracking.abortCurrentResponse) {
                  console.log('[BellaAI][AUDIO] Forcing reset of abort flag because we have response text');
                  window.BellaAITranscriptTracking.abortCurrentResponse = false;
                }
                if (window.BellaAITranscriptTracking.abortCurrentResponse) {
                  console.log('[BellaAI][AUDIO] Audio dropped – barge-in confirmed');
                  return;
                }
                if (!audioLength || audioLength < 100) {
                  console.error('[BellaAI][AUDIO] Received invalid audio chunk with length', audioLength);
                  return;
                }
                
                // Generate a consistent ID based on content (hash) instead of using the potentially inconsistent ID from the server
                const audioData = data.audio_event.audio_base_64;
                const audioId = data.audio_event.audio_id || (() => {
                  // Simple hash function for audio content
                  let h = 2166136261;
                  for (let i = 0; i < audioData.length; i += 100) { // Sample every 100th char for speed
                    h ^= audioData.charCodeAt(i);
                    h = Math.imul(h, 16777619);
                  }
                  return ('audio_' + (h >>> 0).toString(16));
                })();
                
                // Check if we've already processed this audio
                if (window.BellaAISeenAudio.has(audioId)) {
                  console.log('[BellaAI][AUDIO] Skipping duplicate audio chunk, ID:', audioId);
                  return;
                }
                
                // Mark this audio as processed
                window.BellaAISeenAudio.add(audioId);
                
                // Handle the audio playback
                if (!window.BellaAITranscriptTracking.lastResponseText) {
                  console.log('[BellaAI][AUDIO] Buffering early audio chunk for later playback');
                  window.BellaAIEarlyAudioBuffer.push(audioData);
                  console.log('[BellaAI][AUDIO] Early audio buffer length:', window.BellaAIEarlyAudioBuffer.length);
                } else {
                  console.log('[BellaAI][AUDIO] Playing audio chunk directly');
                  playBase64PCM(audioData);
                }
                return; // Return after handling audio event
              }
              if (data.type === 'user_transcript' && data.user_transcription_event) {
                const userText = data.user_transcription_event.user_transcript
                console.log('[BellaAI] User transcript:', userText)
                if (userText && userText.trim()) {
                  // No need to stop audio here, already handled by silence/activity detection in processor.
                  const transcriptId = data.user_transcription_event.transcript_id
                  if (transcriptId && window.BellaAITranscriptTracking.lastUserTranscriptId === transcriptId) {
                    console.log('[BellaAI] Skipping duplicate user transcript')
                    return
                  }
                  window.BellaAITranscriptTracking.lastUserTranscriptId = transcriptId
                  addMessageToChat(userText, true)
                }
                return; // Important: return after handling transcript
              }
              if (data.type === 'agent_response' && data.agent_response_event) {
                console.log('[BellaAI][STATE] New agent_response: resetting abortCurrentResponse to false');
                
                // Ensure complete cleanup of any existing audio
                window.BellaAIVoiceChatAudio.stop();
                window.BellaAISeenAudio.clear();
                window.BellaAIEarlyAudioBuffer = [];
                
                window.BellaAITranscriptTracking.abortCurrentResponse = false;
                const botText = data.agent_response_event.agent_response;
                console.log('[BellaAI][WS] Agent response:', botText);
                const responseId = data.agent_response_event.response_id;
                
                if (responseId && window.BellaAITranscriptTracking.isResponseProcessed(responseId)) {
                  console.log('[BellaAI][WS] Skipping duplicate agent response');
                  return;
                }
                
                console.log('[BellaAI][STATE] Marking response processed:', responseId);
                window.BellaAITranscriptTracking.markResponseProcessed(responseId);
                
                if (botText && botText.trim()) {
                  window.BellaAITranscriptTracking.lastResponseText = botText;
                  console.log('[BellaAI][STATE] lastResponseText set:', botText);
                  
                  if (window.BellaAIEarlyAudioBuffer.length > 0) {
                    console.log('[BellaAI][AUDIO] Playing buffered audio chunks:', window.BellaAIEarlyAudioBuffer.length);
                    window.BellaAIEarlyAudioBuffer.forEach(base64 => {
                      playBase64PCM(base64);
                    });
                    window.BellaAIEarlyAudioBuffer = [];
                    console.log('[BellaAI][AUDIO] Early audio buffer cleared');
                  }
                  
                  if (botText !== "I'll be speaking with you now. How can I help you?" || !window.BellaAITranscriptTracking.defaultGreetingShown) {
                    addMessageToChat(botText, false);
                    if (botText === "I'll be speaking with you now. How can I help you?") {
                      window.BellaAITranscriptTracking.defaultGreetingShown = true;
                    }
                  }
                } else {
                  window.BellaAITranscriptTracking.lastResponseText = null;
                  console.log('[BellaAI][STATE] lastResponseText cleared (empty botText)');
                }
                return;
              }
              if (data.type === 'ping') {
                console.log('[BellaAI] Ping received, sending pong')
                lastPingTime = Date.now()
                if (data.ping_event && data.ping_event.event_id) {
                  ws.send(JSON.stringify({ type: 'pong', event_id: data.ping_event.event_id }))
                }
                return; // Important: return after handling ping
              }
            } catch (e) {
              console.error('[BellaAI] Error processing WebSocket message:', e);
            }
          }
          ws.onerror = function(error) { console.error('[BellaAI] WebSocket error:', error); if (!isEnded) attemptReconnect() }
          ws.onclose = function(event) {
            console.log('[BellaAI] WebSocket closed:', event.code, event.reason)
            if (!isEnded) {
              if (event.code === 1000) cleanup('Voice chat completed')
              else if (audioChunksSent === 0 && event.code !== 1000) cleanup('No audio detected or connection issue.') // More generic message
              else attemptReconnect()
            }
          }
        }
        
        (async function startVoice() {
          try {
            updateStatus('Requesting microphone access...')
            window.BellaAIVoiceChatAudio.stop();
            window.BellaAITranscriptTracking.reset();
            micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
            
            // Create separate audio contexts for microphone and playback
            const micContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000, latencyHint: 'interactive' });
            const playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            
            // Store the mic context for processor operations
            audioContext = micContext;
            
            console.log('[BellaAI] Audio contexts created, playbackContext state:', playbackContext.state);
            
            console.log('[BellaAI] AudioContext created with sampleRate:', micContext.sampleRate)
            const source = micContext.createMediaStreamSource(micStream)
            analyserNode = micContext.createAnalyser()
            analyserNode.fftSize = 512 // Reduced from 1024 for lower latency
            source.connect(analyserNode)
            
            // Use standard ScriptProcessor since it's more widely supported
            processor = micContext.createScriptProcessor(2048, 1, 1)
            source.connect(processor)
            
            // Create a silent gain node to keep the audio graph active
            const dummy = micContext.createGain()
            dummy.gain.value = 0 // Set to zero volume (silent)
            
            // Connect processor to the silent node to keep the graph alive
            processor.connect(dummy)
            dummy.connect(micContext.destination) // No audible output due to 0 gain
            updateStatus('Connecting to Audio...')
            initializeWebSocket()
            const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
            
            // Modify playBase64PCM to use the dedicated playback context
            playBase64PCM = async function(base64) {
              if (!playbackContext) {
                console.error("[BellaAI] playBase64PCM: playbackContext is not available.");
                updateStatus('Error: Audio system not ready', '#c00');
                return;
              }
              
              // Force playback context to resume if it's not running
              if (playbackContext.state !== 'running') {
                try {
                  await playbackContext.resume().catch(()=>{});
                  console.log('[BellaAI] Playback AudioContext resumed');
                  
                  if (playbackContext.state !== 'running') {
                    // Still not running – save the chunk and retry in 50 ms
                    console.log('[BellaAI] Context still not running, will retry');
                    setTimeout(() => playBase64PCM(base64), 50);
                    return;
                  }
                } catch (err) {
                  console.error('[BellaAI] Error resuming playbackContext:', err);
                }
              }
              
              console.log('[BellaAI] Enqueueing audio for playback, length:', base64.length);
              
              // Update UI immediately when we receive audio
              updateStatus('Bella is speaking...', '#090');
              if (indicator) {
                indicator.style.animation = 'pulse 1s infinite';
                indicator.style.background = '#090';
              }
              
              // Enqueue the audio for playback with the dedicated context
              window.BellaAIVoiceChatAudio.enqueue(base64, playbackContext);
              
              // Set a timeout to reset UI status to listening after a reasonable time
              setTimeout(() => {
                if (!isEnded && canSendAudio && !hasActivity && !window.BellaAIVoiceChatAudio.playing) { 
                  updateStatus('Listening...', '#090');
                  if (indicator) {
                    indicator.style.animation = '';
                  }
                }
              }, 10000); // 10 seconds is a reasonable maximum for a single audio chunk
            };

            const GRACE_MS = 400; // Grace period before aborting response
            let hasActivity = false;
            let startedTalkingAt = 0;
            let smoothed = 0; // For exponential moving average

            silenceTimer = setInterval(() => {
              if (!window.BellaAIVoiceActive) {
                clearInterval(silenceTimer);
                return;
              }

              analyserNode.getFloatTimeDomainData(dataArray);
              
              // Calculate RMS (Root Mean Square) of the input
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
              }
              const rms = Math.sqrt(sum / dataArray.length);
              
              // Apply exponential smoothing
              const ALPHA = 0.1; // Smoothing factor (0-1)
              smoothed = ALPHA * rms + (1 - ALPHA) * (smoothed || 0);
              
              // Calculate current average
              const currentAverage = smoothed * 1000; // Scale up for better visibility
              
              // State tracking for speaking frames
              window.BellaAISpeakingFrames = window.BellaAISpeakingFrames || 0;
              if (currentAverage > 20) { // Increased threshold to avoid false triggers
                window.BellaAISpeakingFrames++;
              } else {
                window.BellaAISpeakingFrames = 0;
              }
              
              // Require two consecutive speaking frames to reduce sensitivity
              const confirmedSpeaking = window.BellaAISpeakingFrames >= 2;

              if (confirmedSpeaking && !hasActivity) {
                // User just started speaking
                console.log('[BellaAI][VAD] User started speaking');
                hasActivity = true;
                startedTalkingAt = Date.now();
                
                // Initially just pause the audio
                window.BellaAIVoiceChatAudio.pause();
                
                updateStatus('Listening (User Speaking)...', '#c00');
                if (indicator) indicator.style.animation = 'recording-pulse 1s infinite';
              } else if (confirmedSpeaking && hasActivity) {
                // User is continuing to speak
                const speakingDuration = Date.now() - startedTalkingAt;
                
                // After grace period, fully abort the response
                if (speakingDuration > GRACE_MS && !window.BellaAITranscriptTracking.abortCurrentResponse) {
                  console.log('[BellaAI][VAD] Grace period exceeded, aborting response');
                  window.BellaAITranscriptTracking.abortCurrentResponse = true;
                  window.BellaAIVoiceChatAudio.stop(); // Fully stop audio after grace period
                }
              } else if (!confirmedSpeaking && hasActivity) {
                // User stopped speaking
                if (window.BellaAISpeakingFrames === 0) {
                  console.log('[BellaAI][VAD] User stopped speaking');
                  hasActivity = false;
                  
                  // Only resume if we haven't aborted (brief interruption)
                  if (!window.BellaAITranscriptTracking.abortCurrentResponse) {
                    console.log('[BellaAI][VAD] Brief interruption, resuming playback');
                    window.BellaAIVoiceChatAudio.resume();
                  }
                  
                  updateStatus('Listening...', '#090');
                  if (indicator) indicator.style.animation = '';
                }
              }
            }, 50); // Check every 50ms for more responsive barge-in

            processor.onaudioprocess = async function(e) {
              if (isEnded || !ws || ws.readyState !== 1 || !canSendAudio) return;
              
              // Logging to confirm audio processing is working
              if (Math.random() < 0.05) {
                console.log('sent', ++audioChunksSent, 'chunks so far');
              }
              
              let input = e.inputBuffer.getChannelData(0);
              
              if (audioContext.sampleRate !== 16000) {
                try { 
                  input = await resampleTo16kHz(input, audioContext.sampleRate); 
                } catch (err) { 
                  console.error('[BellaAI] Resampling error:', err); 
                }
              }
              
              const pcm16 = floatTo16BitPCM(input);
              const base64 = int16ToBase64(pcm16);
              ws.send(JSON.stringify({ user_audio_chunk: base64 }));
              audioChunksSent++;
            }
          } catch (err) {
            console.error('[BellaAI] Error in voice session:', err)
            cleanup('Error: ' + (err.message || 'Could not start voice session'))
          }
        })()
      }
      
      // --- End Conversational AI Integration ---

      // Helper: Extract messages from chat session
      function getChatSessionMessages() {
        try {
          const savedSession = localStorage.getItem('bellaaiChatSession');
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

    })();