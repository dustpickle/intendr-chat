# 🏗️ Modular Chat Widget System

This document explains the modular architecture for the Intendr Chat Widget that allows for core functionality with client-specific customizations.

## 📋 System Overview

The modular system consists of:
- **Core file (`chatembed.js`)** - Base functionality and configuration system
- **Client-specific files (`chatembed-{client}.js`)** - Custom endpoints, branding, and functionality
- **Template file (`chatembed-template.js`)** - Starting point for new client implementations

## 🎯 Benefits

✅ **Single Codebase Maintenance** - Core functionality in one file  
✅ **Client-Specific Customization** - Override endpoints, branding, and behavior  
✅ **Easy Extensibility** - Hook system for custom functionality  
✅ **Isolated Changes** - Client changes don't affect core or other clients  
✅ **Backward Compatibility** - Existing implementations continue to work  

## 📁 File Structure

```
├── chatembed.js                    # Core chat widget (shared)
├── chatembed-client.js            # Client-specific customizations example
├── chatembed-template.js          # Template for new clients
├── example-client-implementation.html
└── MODULAR_SYSTEM_README.md       # This documentation
```

## 🔧 Implementation Pattern

### 1. Configuration Override Pattern

The system uses a global configuration object that client files can set before the core loads:

```javascript
// Client file sets configuration BEFORE core loads
window.ChatWidgetCustomConfig = {
  endpoints: { /* custom endpoints */ },
  branding: { /* custom branding */ },
  hooks: { /* custom functionality */ }
};
```

### 2. Deep Merge System

The core file merges default configuration with client customizations:

```javascript
const MERGED_CONFIG = deepMerge(DEFAULT_CONFIG, CLIENT_CONFIG);
```

## 🚀 Quick Start Guide

### For Client (Example Implementation)

```html
<!-- OPTIONAL: Override core widget path if needed -->
<script>
  // window.ChatWidgetCorePath = 'https://cdn.example.com/chatembed.js';
</script>

<!-- SINGLE LOAD: Client file will auto-load core widget -->
<script src="chatembed-client.js"></script>

<!-- Set standard widget config -->
<script>
  window.ChatWidgetConfig = {
    webhook: { url: 'your-webhook-url' },
    business: { name: 'Your Business', phone: '+1-555-PHONE' },
    style: { primaryColor: '#667eea' }
  };
</script>
```

### For New Clients

1. **Copy the template**: `cp chatembed-template.js chatembed-yourclient.js`
2. **Replace placeholders**: Update "YourClient" with your client name
3. **Update endpoints**: Set your client-specific automation URLs
4. **Customize hooks**: Add your specific functionality
5. **Single script include**: Just load your client file - it auto-loads the core

### 🔄 Auto-Loading Feature

Client files now automatically load the core widget:
- **Default path**: `./chatembed.js` (same directory)
- **Custom path**: Set `window.ChatWidgetCorePath` before loading client file
- **CDN support**: Can load core from different domain/CDN

## ⚙️ Configuration Options

### Endpoints Configuration
```javascript
endpoints: {
  pageContext: 'https://client-automation.example.com/webhook/pagecontext',
  voiceCall: 'https://client-automation.example.com/webhook/voice-call',
  ipify: 'https://api.ipify.org?format=json' // Usually keep default
}
```

### Branding Configuration
```javascript
branding: {
  name: 'Client AI Assistant',
  typingText: 'Client is typing',
  greetingText: 'Hello! I am your Client AI Assistant.'
}
```

### Settings Configuration
```javascript
settings: {
  utmCampaign: 'Client-AIChat',
  sessionValidity: 24 * 60 * 60 * 1000, // 24 hours
  inactivityTimeout: 120000, // 2 minutes
  promptBubbleTimeout: 120000, // 2 minutes
  // Add custom settings
  enableCustomFeatures: true
}
```

### Storage Keys Configuration
```javascript
storageKeys: {
  chatSession: 'clientChatSession',
  chatState: 'clientChatState',
  pageSummary: 'clientPageSummary',
  navLinks: 'client_nav_links',
  overtakeShown: 'clientOvertakeShown'
}
```

## 🎣 Hook System

The system provides 5 powerful hooks for customization:

### 1. beforeSendMessage
Modify or validate user messages before sending:
```javascript
beforeSendMessage: async function(message) {
  // Preprocess message
  if (message.includes('special keyword')) {
    return message + ' [PRIORITY]';
  }
  // Return false to cancel sending
  // Return string to modify message
  return message;
}
```

### 2. afterReceiveMessage
Process bot responses after receiving:
```javascript
afterReceiveMessage: async function(message, messageElement) {
  // Add custom styling
  if (message.includes('SPECIAL')) {
    messageElement.style.border = '2px solid gold';
  }
  // Track analytics
  analytics.track('bot_response', message);
}
```

### 3. beforePhoneCall
Validate or modify phone calls before initiating:
```javascript
beforePhoneCall: async function(callType, phone) {
  // Validate phone format
  if (!phone.startsWith('+1')) {
    alert('US numbers only');
    return false; // Cancel call
  }
  return true; // Allow call
}
```

### 4. afterPhoneCall
Handle phone call completion:
```javascript
afterPhoneCall: async function(callType, phone, result) {
  // Sync with CRM
  await syncCallWithCRM(phone, result);
  // Track analytics
  analytics.track('call_completed', { phone, result });
}
```

### 5. customMessageProcessing
Transform bot messages before display:
```javascript
customMessageProcessing: async function(cleanedMessage, originalMessage) {
  // Replace generic terms
  let processed = cleanedMessage.replace(/contact us/gi, 'contact Client');
  
  // Add disclaimers
  if (processed.includes('pricing')) {
    processed += '<small>* Terms apply</small>';
  }
  
  return processed;
}
```

## 📊 Real-World Examples

### Client Implementation Features

- ✅ Custom API endpoints (`client-automation.cloudcovehosting.com`)
- ✅ Purple gradient branding
- ✅ US phone number validation
- ✅ Analytics tracking to `client-analytics.example.com`
- ✅ CRM integration on call completion
- ✅ Custom message processing with disclaimers
- ✅ Special offer formatting
- ✅ 48-hour session duration

### Template Features

- 📝 Commented examples for all hooks
- 📝 Placeholder URLs and names
- 📝 Optional analytics setup
- 📝 Optional CSS customization
- 📝 Step-by-step instructions

## 🔍 Debugging & Inspection

The merged configuration is available globally for debugging:

```javascript
// In browser console after page load
console.log('Final config:', window.MERGED_CONFIG);
console.log('Active endpoints:', window.MERGED_CONFIG.endpoints);
console.log('Active branding:', window.MERGED_CONFIG.branding);
```

## 🚨 Common Pitfalls

### ❌ Wrong Loading Order
```html
<!-- WRONG: Core loads before customizations -->
<script src="chatembed.js"></script>
<script src="chatembed-client.js"></script>
```

```html
<!-- CORRECT: Customizations load before core -->
<script src="chatembed-client.js"></script>
<script src="chatembed.js"></script>
```

### ❌ Incomplete Configuration
```javascript
// WRONG: Missing required endpoints
window.ChatWidgetCustomConfig = {
  branding: { name: 'Client' }
  // Missing endpoints!
};
```

```javascript
// CORRECT: Include all required sections
window.ChatWidgetCustomConfig = {
  endpoints: {
    pageContext: 'https://client.example.com/webhook/pagecontext',
    voiceCall: 'https://client.example.com/webhook/voice-call'
  },
  branding: { name: 'Client' }
};
```

### ❌ Hook Errors Not Handled
```javascript
// WRONG: Unhandled errors can break the widget
beforeSendMessage: function(message) {
  somethingThatMightFail();
  return message;
}
```

```javascript
// CORRECT: Always wrap hook code in try-catch
beforeSendMessage: async function(message) {
  try {
    somethingThatMightFail();
    return message;
  } catch (error) {
    console.error('[Client] Hook error:', error);
    return message; // Return original on error
  }
}
```

## 🔧 Development Workflow

### Creating a New Client Implementation

1. **Copy template**: `cp chatembed-template.js chatembed-newclient.js`
2. **Update placeholders**: Search and replace "YourClient" with "NewClient"
3. **Set endpoints**: Update automation URLs
4. **Test basic functionality**: Load with core file
5. **Add custom hooks**: Implement client-specific features
6. **Test thoroughly**: Verify all features work
7. **Document customizations**: Update this README if needed

### Testing Client Implementations

1. **Syntax check**: `node -c chatembed-client.js`
2. **Load order test**: Verify client file loads before core
3. **Configuration merge test**: Check `window.MERGED_CONFIG` in browser
4. **Hook execution test**: Verify hooks are called with console logs
5. **Endpoint test**: Confirm API calls go to correct URLs
6. **Styling test**: Verify custom CSS is applied

## 📈 Future Enhancements

Possible extensions to the modular system:
- Version compatibility checking
- Configuration validation
- Hook performance monitoring
- Dynamic hook registration
- Client-specific feature flags
- A/B testing framework integration

## 🆘 Support

For issues with the modular system:
1. Check browser console for configuration errors
2. Verify loading order (client file before core)
3. Inspect `window.MERGED_CONFIG` for expected values
4. Test hooks with console logging
5. Validate endpoint URLs are accessible 