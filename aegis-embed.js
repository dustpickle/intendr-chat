// ===== AEGIS LIVING CHAT WIDGET EMBED SCRIPT =====
// Simple one-line embed for Aegis Living websites

(function() {
  console.log('[Aegis] Starting Aegis chat widget embed...');
  
  // Function to load the Aegis client configuration
  function loadAegisWidget() {
    const script = document.createElement('script');
    script.src = 'https://n8n-chat-embed.pages.dev/chatembed-aegis-v2.js';
    script.async = true;
    script.onload = function() {
      console.log('[Aegis] Aegis chat widget configuration loaded successfully');
    };
    script.onerror = function() {
      console.error('[Aegis] Failed to load Aegis chat widget configuration');
    };
    document.head.appendChild(script);
  }
  
  // Load immediately if DOM is ready, otherwise wait for it
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAegisWidget);
  } else {
    loadAegisWidget();
  }
})(); 