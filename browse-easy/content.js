// Content script for BrowseEasy accessibility features
(function() {
  'use strict';

  let accessibilityManager = null;
  let settingsManager = null;
  let debugMode = true; // Enable debug logging

  function log(...args) {
    if (debugMode) {
      console.log('[BrowseEasy Content]', ...args);
    }
  }

  function error(...args) {
    console.error('[BrowseEasy Content ERROR]', ...args);
  }

  // Initialize accessibility manager when page loads
  async function initialize() {
    log('Initializing BrowseEasy on:', window.location.href);
    
    // Check if we're in a valid context
    if (!chrome || !chrome.runtime) {
      error('Chrome runtime not available');
      return;
    }

    log('Chrome runtime available, initializing managers...');

    try {
      await initializeManagers();
      log('BrowseEasy accessibility features initialized successfully');
    } catch (err) {
      error('Failed to initialize BrowseEasy:', err);
    }
  }

  // Initialize managers (scripts are already loaded via manifest)
  async function initializeManagers() {
    try {
      log('Checking if classes are available...');
      
      // Classes should be available immediately since they're loaded via manifest
      if (typeof AccessibilityManager === 'undefined') {
        error('AccessibilityManager not found');
        // List what is available for debugging
        log('Available globals:', Object.keys(window).filter(key => 
          key.includes('Accessibility') || key.includes('Settings') || key.includes('Manager')
        ));
        throw new Error('AccessibilityManager class not available');
      }
      
      if (typeof SettingsManager === 'undefined') {
        error('SettingsManager not found');
        throw new Error('SettingsManager class not available');
      }

      log('Creating manager instances...');
      accessibilityManager = new AccessibilityManager();
      settingsManager = new SettingsManager();
      
      // Make accessibility manager available globally for debugging
      window.browseEasyManager = accessibilityManager;
      
      log('Managers created successfully');
      
      // Load and apply saved settings
      try {
        const settings = await settingsManager.loadSettings();
        log('Settings loaded:', settings);
        accessibilityManager.applySettings(settings);
      } catch (err) {
        error('Failed to load settings:', err);
      }

      // Listen for settings changes
      settingsManager.addListener((settings) => {
        log('Settings changed:', settings);
        accessibilityManager.applySettings(settings);
      });
      
      // Listen for storage changes to sync settings across tabs
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.browseEasySettings) {
          log('Storage changed, updating settings:', changes.browseEasySettings.newValue);
          if (changes.browseEasySettings.newValue) {
            accessibilityManager.applySettings(changes.browseEasySettings.newValue);
          }
        }
      });
      
      // Signal that we're ready
      if (chrome.runtime && chrome.runtime.sendMessage) {
        try {
          await chrome.runtime.sendMessage({
            type: 'contentScriptReady',
            url: window.location.href
          });
          log('Ready signal sent');
        } catch (err) {
          log('Could not send ready signal (this is normal):', err.message);
        }
      }
      
    } catch (err) {
      error('Failed to initialize managers:', err);
      throw err;
    }
  }

  // Spotlight functionality
  let spotlightOverlay = null;
  let spotlightInput = null;

  function createSpotlightOverlay() {
    if (spotlightOverlay) return; // Already created

    // Create overlay
    spotlightOverlay = document.createElement('div');
    spotlightOverlay.id = 'browseeasy-spotlight-overlay';
    spotlightOverlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(32, 33, 36, 0.7) !important;
      z-index: 2147483647 !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    `;

    // Create input
    spotlightInput = document.createElement('input');
    spotlightInput.id = 'browseeasy-spotlight-input';
    spotlightInput.type = 'text';
    spotlightInput.placeholder = 'Ask BrowseEasy...';
    spotlightInput.autocomplete = 'off';
    spotlightInput.style.cssText = `
      width: 500px !important;
      max-width: 80vw !important;
      padding: 20px 28px !important;
      font-size: 18px !important;
      border-radius: 12px !important;
      border: 2px solid #1a73e8 !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
      outline: none !important;
      background: white !important;
      color: #202124 !important;
      font-family: inherit !important;
    `;

    spotlightInput.addEventListener('focus', () => {
      spotlightInput.style.borderColor = '#1a73e8';
      spotlightInput.style.boxShadow = '0 8px 36px rgba(26,115,232,0.25)';
    });

    spotlightInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && spotlightInput.value.trim()) {
        const query = spotlightInput.value.trim();
        log('Spotlight query:', query);
        
        // Send message to panel to handle the query
        try {
          await chrome.runtime.sendMessage({
            type: 'spotlightQuery',
            query: query
          });
          hideSpotlight();
        } catch (err) {
          error('Failed to send spotlight query:', err);
        }
      } else if (e.key === 'Escape') {
        hideSpotlight();
      }
    });

    // Hide on overlay click
    spotlightOverlay.addEventListener('click', (e) => {
      if (e.target === spotlightOverlay) {
        hideSpotlight();
      }
    });

    spotlightOverlay.appendChild(spotlightInput);
    document.body.appendChild(spotlightOverlay);
    
    log('Spotlight overlay created');
  }

  function showSpotlight() {
    createSpotlightOverlay();
    if (spotlightOverlay && spotlightInput) {
      spotlightOverlay.style.display = 'flex';
      spotlightInput.value = '';
      // Force focus with a small delay to ensure it works
      setTimeout(() => {
        spotlightInput.focus();
        spotlightInput.select();
      }, 50);
      log('Spotlight shown');
    }
  }

  function hideSpotlight() {
    if (spotlightOverlay) {
      spotlightOverlay.style.display = 'none';
      spotlightInput.value = '';
      log('Spotlight hidden');
    }
  }

  // Listen for messages from the panel/background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received message:', message.type, 'from:', sender.id || 'unknown');

    try {
      switch (message.type) {
        case 'openSpotlight':
          log('Opening spotlight overlay');
          showSpotlight();
          sendResponse({ success: true });
          break;

        case 'hideSpotlight':
          log('Hiding spotlight overlay');
          hideSpotlight();
          sendResponse({ success: true });
          break;

        case 'ping':
          log('Ping received');
          sendResponse({ success: true, ready: true });
          break;

        case 'applySettings':
          if (!accessibilityManager) {
            sendResponse({ error: 'Accessibility manager not initialized' });
            break;
          }
          log('Applying settings:', message.settings);
          accessibilityManager.applySettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'executeFunction':
          if (!accessibilityManager) {
            sendResponse({ error: 'Accessibility manager not initialized' });
            break;
          }
          log('Executing function:', message.functionName, 'with params:', message.parameters);
          accessibilityManager.executeFunction(message.functionName, message.parameters);
          sendResponse({ success: true });
          break;

        case 'updateSetting':
          if (!settingsManager) {
            sendResponse({ error: 'Settings manager not initialized' });
            break;
          }
          log('Updating single setting:', message.key, '=', message.value);
          settingsManager.saveSettings({ [message.key]: message.value }).then(() => {
            sendResponse({ success: true });
          }).catch(err => {
            error('Failed to update setting:', err);
            sendResponse({ error: err.message });
          });
          return true; // Will respond asynchronously

        case 'updateSettings':
          if (!settingsManager || !accessibilityManager) {
            sendResponse({ error: 'Managers not initialized' });
            break;
          }
          log('Updating multiple settings:', message.settings);
          settingsManager.saveSettings(message.settings).then(() => {
            // Apply the updated settings to the accessibility manager
            const allSettings = settingsManager.getAllSettings();
            accessibilityManager.applySettings(allSettings);
            sendResponse({ success: true });
          }).catch(err => {
            error('Failed to update settings:', err);
            sendResponse({ error: err.message });
          });
          return true; // Will respond asynchronously

        case 'getSettings':
          if (!settingsManager) {
            sendResponse({ error: 'Settings manager not initialized' });
            break;
          }
          try {
            const settings = settingsManager.getAllSettings();
            log('Returning settings:', settings);
            sendResponse({ settings });
          } catch (err) {
            error('Failed to get settings:', err);
            sendResponse({ error: err.message });
          }
          break;

        case 'getPageContent':
          try {
            const pageContent = extractPageContent();
            log('Extracted page content, length:', pageContent.text.length);
            sendResponse({ success: true, content: pageContent });
          } catch (err) {
            error('Failed to extract page content:', err);
            sendResponse({ error: err.message });
          }
          break;

        case 'clearAll':
          if (!accessibilityManager) {
            sendResponse({ error: 'Accessibility manager not initialized' });
            break;
          }
          log('Clearing all accessibility settings');
          accessibilityManager.clearAll();
          sendResponse({ success: true });
          break;

        default:
          const errorMsg = `Unknown message type: ${message.type}`;
          error(errorMsg);
          sendResponse({ error: errorMsg });
      }
    } catch (err) {
      error('Error handling message:', err);
      sendResponse({ error: err.message });
    }
    
    return false; // Don't keep the message port open unless explicitly returning true
  });

  // Function to extract meaningful content from the current webpage
  function extractPageContent() {
    const content = {
      url: window.location.href,
      title: document.title,
      text: '',
      headings: [],
      links: [],
      images: [],
      forms: [],
      metadata: {}
    };

    // Extract main text content
    const textElements = document.querySelectorAll('p, div, span, article, section, main, aside, li, td, th');
    const textContent = [];
    
    textElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 10 && !isHiddenElement(el)) {
        textContent.push(text);
      }
    });
    
    // Remove duplicates and join
    content.text = [...new Set(textContent)].join(' ').substring(0, 10000); // Limit to 10k chars

    // Extract headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const text = heading.textContent?.trim();
      if (text && !isHiddenElement(heading)) {
        content.headings.push({
          level: heading.tagName.toLowerCase(),
          text: text
        });
      }
    });

    // Extract links
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      const text = link.textContent?.trim();
      const href = link.href;
      if (text && href && !isHiddenElement(link)) {
        content.links.push({
          text: text,
          href: href
        });
      }
    });

    // Extract images with alt text
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!isHiddenElement(img)) {
        content.images.push({
          src: img.src,
          alt: img.alt || '',
          title: img.title || ''
        });
      }
    });

    // Extract form information
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      if (!isHiddenElement(form)) {
        const inputs = form.querySelectorAll('input, select, textarea');
        const formData = {
          action: form.action || '',
          method: form.method || 'get',
          inputs: []
        };
        
        inputs.forEach(input => {
          formData.inputs.push({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name || '',
            placeholder: input.placeholder || '',
            label: getInputLabel(input)
          });
        });
        
        content.forms.push(formData);
      }
    });

    // Extract metadata
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.name || meta.property;
      const content_attr = meta.content;
      if (name && content_attr) {
        content.metadata[name] = content_attr;
      }
    });

    return content;
  }

  // Helper function to check if element is hidden
  function isHiddenElement(element) {
    const style = window.getComputedStyle(element);
    return style.display === 'none' || 
           style.visibility === 'hidden' || 
           style.opacity === '0' ||
           element.offsetParent === null;
  }

  // Helper function to get label for form inputs
  function getInputLabel(input) {
    // Try to find associated label
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }
    
    // Try to find parent label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.trim() || '';
    }
    
    // Try to find nearby text
    const prevSibling = input.previousElementSibling;
    if (prevSibling && prevSibling.textContent) {
      return prevSibling.textContent.trim();
    }
    
    return '';
  }

  // Initialize when the page is ready
  log('Content script loading...');
  
  if (document.readyState === 'loading') {
    log('Document still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    log('Document already loaded, initializing immediately');
    // Add a small delay to ensure all scripts are fully loaded
    setTimeout(initialize, 100);
  }

  // Add global debug functions (always available)
  window.browseEasyDebug = {
    getStatus: () => ({
      initialized: !!(accessibilityManager && settingsManager),
      accessibilityManager: !!accessibilityManager,
      settingsManager: !!settingsManager,
      accessibilityManagerClass: typeof AccessibilityManager !== 'undefined',
      settingsManagerClass: typeof SettingsManager !== 'undefined',
      url: window.location.href,
      readyState: document.readyState,
      chromeRuntime: !!chrome?.runtime
    }),
    testConnection: () => {
      return new Promise((resolve) => {
        if (!chrome?.runtime?.sendMessage) {
          resolve({ error: 'Chrome runtime not available' });
          return;
        }
        chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
          resolve(response || { error: 'No response' });
        });
      });
    },
    log: log,
    error: error,
    testFeature: (featureName, params) => {
      if (accessibilityManager) {
        accessibilityManager.executeFunction(featureName, params);
        return 'Feature executed';
      } else {
        return 'Accessibility manager not initialized';
      }
    },
    getAppliedStyles: () => {
      if (accessibilityManager) {
        return accessibilityManager.getAppliedStyles();
      } else {
        return { error: 'Accessibility manager not initialized' };
      }
    },
    forceCleanup: () => {
      if (accessibilityManager) {
        accessibilityManager.forceCleanup();
        return 'Force cleanup completed';
      } else {
        return 'Accessibility manager not initialized';
      }
    },
    getCurrentSettings: () => {
      if (settingsManager) {
        return settingsManager.getAllSettings();
      } else {
        return { error: 'Settings manager not initialized' };
      }
    }
  };

  log('Content script loaded, debug functions available');

})(); 