// Chat Widget Script - Version 1.2.0
// Last updated: Feb 24, 2025
// Fixed initial 500 error by skipping loadPreviousSession
(function() {
    // Create and inject styles
    const styles = `
        .n8n-chat-widget {
            --chat--color-primary: var(--n8n-chat-primary-color, #854fff);
            --chat--color-secondary: var(--n8n-chat-secondary-color, #6b3fd4);
            --chat--color-background: var(--n8n-chat-background-color, #ffffff);
            --chat--color-font: var(--n8n-chat-font-color, #333333);
            font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        .n8n-chat-widget .chat-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: none;
            width: 380px;
            height: 600px;
            background: var(--chat--color-background);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(133, 79, 255, 0.15);
            border: 1px solid rgba(133, 79, 255, 0.2);
            overflow: hidden;
            font-family: inherit;
        }

        .n8n-chat-widget .chat-container.position-left {
            right: auto;
            left: 20px;
        }

        .n8n-chat-widget .chat-container.open {
            display: flex;
            flex-direction: column;
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
            color: var(--chat--color-font);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
            font-size: 20px;
            opacity: 0.6;
        }

        .n8n-chat-widget .close-button:hover {
            opacity: 1;
        }

        .n8n-chat-widget .brand-header img {
            width: 32px;
            height: 32px;
        }

        .n8n-chat-widget .brand-header span {
            font-size: 18px;
            font-weight: 500;
            color: var(--chat--color-font);
        }

        .n8n-chat-widget .new-conversation {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            text-align: center;
            width: 100%;
            max-width: 300px;
        }

        .n8n-chat-widget .welcome-text {
            font-size: 24px;
            font-weight: 600;
            color: var(--chat--color-font);
            margin-bottom: 24px;
            line-height: 1.3;
        }

        .n8n-chat-widget .new-chat-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 16px 24px;
            background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: transform 0.3s;
            font-weight: 500;
            font-family: inherit;
            margin-bottom: 12px;
        }

        .n8n-chat-widget .new-chat-btn:hover {
            transform: scale(1.02);
        }

        .n8n-chat-widget .message-icon {
            width: 20px;
            height: 20px;
        }

        .n8n-chat-widget .response-text {
            font-size: 14px;
            color: var(--chat--color-font);
            opacity: 0.7;
            margin: 0;
        }

        .n8n-chat-widget .chat-interface {
            display: none;
            flex-direction: column;
            height: 100%;
        }

        .n8n-chat-widget .chat-interface.active {
            display: flex;
        }

        .n8n-chat-widget .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: var(--chat--color-background);
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
            border: none;
        }

        .n8n-chat-widget .chat-message.bot {
            background: var(--chat--color-background);
            border: 1px solid rgba(133, 79, 255, 0.2);
            color: var(--chat--color-font);
            align-self: flex-start;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .n8n-chat-widget .chat-input {
            padding: 16px;
            background: var(--chat--color-background);
            border-top: 1px solid rgba(133, 79, 255, 0.1);
            display: flex;
            gap: 8px;
        }

        .n8n-chat-widget .chat-input textarea {
            flex: 1;
            padding: 12px;
            border: 1px solid rgba(133, 79, 255, 0.2);
            border-radius: 8px;
            background: var(--chat--color-background);
            color: var(--chat--color-font);
            resize: none;
            font-family: inherit;
            font-size: 14px;
        }

        .n8n-chat-widget .chat-input textarea::placeholder {
            color: var(--chat--color-font);
            opacity: 0.6;
        }

        .n8n-chat-widget .chat-input button {
            background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0 20px;
            cursor: pointer;
            transition: transform 0.2s;
            font-family: inherit;
            font-weight: 500;
        }

        .n8n-chat-widget .chat-input button:hover {
            transform: scale(1.05);
        }

        .n8n-chat-widget .chat-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: linear-gradient(135deg, var(--chat--color-primary) 0%, var(--chat--color-secondary) 100%);
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(133, 79, 255, 0.3);
            z-index: 999;
            transition: transform 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .n8n-chat-widget .chat-toggle.position-left {
            right: auto;
            left: 20px;
        }

        .n8n-chat-widget .chat-toggle:hover {
            transform: scale(1.05);
        }

        .n8n-chat-widget .chat-toggle svg {
            width: 24px;
            height: 24px;
            fill: currentColor;
        }

        /* Thinking animation styles */
        .n8n-chat-widget .thinking {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            margin: 8px 0;
            border-radius: 12px;
            max-width: 80%;
            align-self: flex-start;
            background: var(--chat--color-background);
            border: 1px solid rgba(133, 79, 255, 0.2);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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

        .n8n-chat-widget .dot:nth-child(1) {
            animation-delay: 0s;
        }

        .n8n-chat-widget .dot:nth-child(2) {
            animation-delay: 0.3s;
        }

        .n8n-chat-widget .dot:nth-child(3) {
            animation-delay: 0.6s;
        }

        @keyframes dot-pulse {
            0% {
                opacity: 0.6;
                transform: scale(1);
            }
            50% {
                opacity: 1;
                transform: scale(1.2);
            }
            100% {
                opacity: 0.6;
                transform: scale(1);
            }
        }
    `;

    // Load Geist font
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://cdn.jsdelivr.net/npm/geist@1.0.0/dist/fonts/geist-sans/style.css';
    document.head.appendChild(fontLink);

    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Default configuration
    const defaultConfig = {
        webhook: {
            url: '',
            route: ''
        },
        branding: {
            logo: '',
            name: '',
            welcomeText: '',
            responseTimeText: ''
        },
        style: {
            primaryColor: '',
            secondaryColor: '',
            position: 'right',
            backgroundColor: '#ffffff',
            fontColor: '#333333'
        }
    };

    // Merge user config with defaults
    const config = window.ChatWidgetConfig ? 
        {
            webhook: { ...defaultConfig.webhook, ...window.ChatWidgetConfig.webhook },
            branding: { ...defaultConfig.branding, ...window.ChatWidgetConfig.branding },
            style: { ...defaultConfig.style, ...window.ChatWidgetConfig.style }
        } : defaultConfig;

    // Prevent multiple initializations
    if (window.N8NChatWidgetInitialized) return;
    window.N8NChatWidgetInitialized = true;

    let currentSessionId = '';

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'n8n-chat-widget';
    
    // Set CSS variables for colors
    widgetContainer.style.setProperty('--n8n-chat-primary-color', config.style.primaryColor);
    widgetContainer.style.setProperty('--n8n-chat-secondary-color', config.style.secondaryColor);
    widgetContainer.style.setProperty('--n8n-chat-background-color', config.style.backgroundColor);
    widgetContainer.style.setProperty('--n8n-chat-font-color', config.style.fontColor);

    const chatContainer = document.createElement('div');
    chatContainer.className = `chat-container${config.style.position === 'left' ? ' position-left' : ''}`;
    
    // Modified HTML - removed new conversation section and directly use chat interface
    const chatInterfaceHTML = `
        <div class="chat-interface active">
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.476 0-2.886-.313-4.156-.878l-3.156.586.586-3.156A7.962 7.962 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
        </svg>`;
    
    widgetContainer.appendChild(chatContainer);
    widgetContainer.appendChild(toggleButton);
    document.body.appendChild(widgetContainer);

    // Get references to elements from new chat interface structure
    const chatInterface = chatContainer.querySelector('.chat-interface');
    const messagesContainer = chatContainer.querySelector('.chat-messages');
    const textarea = chatContainer.querySelector('textarea');
    const sendButton = chatContainer.querySelector('button[type="submit"]');

    // Function to create thinking animation
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

    // Function to remove thinking animation
    function removeThinkingAnimation() {
        const thinkingElement = document.getElementById('thinking-animation');
        if (thinkingElement) {
            thinkingElement.remove();
        }
    }

    function generateUUID() {
        return crypto.randomUUID();
    }

    async function startNewConversation() {
        currentSessionId = generateUUID();
        const data = [{
            action: "loadPreviousSession",
            sessionId: currentSessionId,
            route: config.webhook.route,
            metadata: {
                userId: ""
            }
        }];

        try {
            // Show thinking animation immediately
            const thinkingDiv = showThinkingAnimation();
            
            try {
                const response = await fetch(config.webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                // Remove thinking animation
                removeThinkingAnimation();

                // Check if response is ok (status in the range 200-299)
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                let responseData;
                try {
                    responseData = await response.json();
                    console.log('Initial conversation response:', responseData);
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    // If response isn't valid JSON, try to get text
                    const textResponse = await response.text();
                    console.log('Raw response:', textResponse);
                    responseData = { output: textResponse };
                }
                
                // Extract the output text, handling different response formats
                let outputText = '';
                if (Array.isArray(responseData)) {
                    if (responseData.length > 0 && responseData[0].output) {
                        outputText = responseData[0].output;
                    }
                } else if (responseData && responseData.output) {
                    outputText = responseData.output;
                } else if (typeof responseData === 'string') {
                    outputText = responseData;
                }
                
                // Use default greeting if the response is empty
                if (!outputText || outputText.trim() === '') {
                    outputText = config.branding.welcomeText || "Hello! How can I assist you today?";
                }
                
                // Create and append the bot message
                const botMessageDiv = document.createElement('div');
                botMessageDiv.className = 'chat-message bot';
                botMessageDiv.textContent = outputText;
                messagesContainer.appendChild(botMessageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (fetchError) {
                // Handle network or server errors
                console.error('API Error:', fetchError);
                
                // Remove thinking animation if there's an error
                removeThinkingAnimation();
                
                // Create fallback message for API errors
                const errorMessageDiv = document.createElement('div');
                errorMessageDiv.className = 'chat-message bot';
                errorMessageDiv.textContent = config.branding.welcomeText || "Hello! How can I assist you today? (Note: Our messaging system is currently experiencing some technical difficulties. Basic chat is available, but some features may be limited.)";
                messagesContainer.appendChild(errorMessageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        } catch (error) {
            // Remove thinking animation if there's an error
            removeThinkingAnimation();
            console.error('Error starting conversation:', error);
            
            // Add a fallback message in case of error
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.className = 'chat-message bot';
            errorMessageDiv.textContent = config.branding.welcomeText || "Hello! How can I assist you today?";
            messagesContainer.appendChild(errorMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    async function sendMessage(message) {
        const messageData = {
            action: "sendMessage",
            sessionId: currentSessionId,
            route: config.webhook.route,
            chatInput: message,
            metadata: {
                userId: ""
            }
        };

        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        userMessageDiv.textContent = message;
        messagesContainer.appendChild(userMessageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // Show thinking animation
            const thinkingDiv = showThinkingAnimation();
            
            try {
                const response = await fetch(config.webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(messageData)
                });
                
                // Remove thinking animation
                removeThinkingAnimation();
                
                // Check if response is ok
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                let data;
                try {
                    data = await response.json();
                    console.log('Response data:', data);
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError);
                    const textResponse = await response.text();
                    console.log('Raw text response:', textResponse);
                    data = { output: "I'm sorry, I couldn't process that request properly." };
                }
                
                let outputText = '';
                if (Array.isArray(data)) {
                    if (data.length > 0 && data[0].output) {
                        outputText = data[0].output;
                    }
                } else if (data && data.output) {
                    outputText = data.output;
                } else if (typeof data === 'string') {
                    outputText = data;
                }
                
                // Fallback for empty responses
                if (!outputText || outputText.trim() === '') {
                    outputText = "I received your message, but I'm having trouble generating a response right now.";
                }
                
                const botMessageDiv = document.createElement('div');
                botMessageDiv.className = 'chat-message bot';
                botMessageDiv.textContent = outputText;
                messagesContainer.appendChild(botMessageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (fetchError) {
                // Handle API errors
                console.error('API Error:', fetchError);
                
                // Remove thinking animation
                removeThinkingAnimation();
                
                // Create error message
                const errorMessageDiv = document.createElement('div');
                errorMessageDiv.className = 'chat-message bot';
                errorMessageDiv.textContent = "I'm sorry, I'm having trouble connecting to our services right now. Please try again later.";
                messagesContainer.appendChild(errorMessageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        } catch (error) {
            // Catch any other errors
            removeThinkingAnimation();
            console.error('Error sending message:', error);
            
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.className = 'chat-message bot';
            errorMessageDiv.textContent = "I'm sorry, something went wrong. Please try again.";
            messagesContainer.appendChild(errorMessageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Auto-start conversation when widget opens, but skip the initial API call
    toggleButton.addEventListener('click', () => {
        if (!chatContainer.classList.contains('open')) {
            chatContainer.classList.add('open');
            
            // Start a conversation with a default message instead of calling the API
            if (!currentSessionId) {
                // Generate a session ID without making the initial API call
                currentSessionId = generateUUID();
                
                // Add the welcome message directly
                const botMessageDiv = document.createElement('div');
                botMessageDiv.className = 'chat-message bot';
                botMessageDiv.textContent = config.branding.welcomeText || "Hello! How can I assist you today?";
                messagesContainer.appendChild(botMessageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        } else {
            chatContainer.classList.remove('open');
        }
    });
    
    sendButton.addEventListener('click', () => {
        const message = textarea.value.trim();
        if (message) {
            sendMessage(message);
            textarea.value = '';
        }
    });
    
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const message = textarea.value.trim();
            if (message) {
                sendMessage(message);
                textarea.value = '';
            }
        }
    });
    
    // Removed original toggle button event listener as it's replaced above

    // Add close button handlers
    const closeButtons = chatContainer.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            chatContainer.classList.remove('open');
        });
    });
})();
