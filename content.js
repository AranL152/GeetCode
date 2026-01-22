// content.js - Injects script and listens for events

(function() {
  'use strict';
  
  console.log('🟢 Content script starting...');
  
  // Inject our script into the page
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    console.log('✅ Injected script loaded');
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  
  // Listen for events from injected script
  window.addEventListener('leetcodeAccepted', function(event) {
    console.log('📬 Received submission from page:', event.detail);
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'submissionDetected',
      data: event.detail
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('✅ Sent to background successfully');
      }
    });
  });
  
  console.log('✅ Event listeners set up');
})();