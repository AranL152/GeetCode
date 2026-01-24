// content.js - Injects script and listens for events

(function() {
  'use strict';

  console.log(' Content script starting...');

  // Check if extension context is still valid
  function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id != null;
    } catch (e) {
      return false;
    }
  }

  // Inject our script into the page
  if (!isExtensionContextValid()) {
    console.log(' Extension context invalid, skipping injection');
    return;
  }

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    console.log('Injected script loaded');
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for events from injected script
  window.addEventListener('leetcodeAccepted', function(event) {
    // Check context before sending message
    if (!isExtensionContextValid()) {
      console.log('Extension context invalidated, please refresh the page');
      return;
    }

    console.log('📬 Received submission from page:', event.detail);

    // Send to background script
    try {
      chrome.runtime.sendMessage({
        action: 'submissionDetected',
        data: event.detail
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
        } else {
          console.log(' Sent to background successfully');
        }
      });
    } catch (e) {
      console.log('Extension context invalidated, please refresh the page');
    }
  });

  console.log('Event listeners set up');
})();
