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

  // Listen for messages from the panel/background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received message:', message.type, 'from:', sender.id || 'unknown', 'data:', message);
    
    if (!accessibilityManager || !settingsManager) {
      const errorMsg = 'Accessibility manager not initialized';
      error(errorMsg);
      sendResponse({ error: errorMsg });
      return false; // Still synchronous if managers not init
    }

    // Make the main try block async to handle awaiting results
    (async () => {
      try {
        switch (message.type) {
          case 'ping':
            log('Ping received');
            sendResponse({ success: true, ready: true });
            break;

          case 'applySettings':
            log('Applying settings:', message.settings);
            accessibilityManager.applySettings(message.settings);
            sendResponse({ success: true });
            break;

          case 'executeFunction':
            log('Executing function:', message.functionName, 'with params:', message.parameters);
            const result = await accessibilityManager.executeFunction(message.functionName, message.parameters); // Await the result
            
            if (message.functionName === 'generateMissingAltTexts') {
              log('Image list from generateMissingAltTexts (awaited):', result);
              sendResponse({ success: true, action: 'processImagesForAltText', data: result });
            } else {
              sendResponse({ success: true }); 
            }
            break;
          
          case 'applySingleAltText': 
            log('Applying single alt text:', message.imageId, message.altText, message.targetAttribute);
            if (message.imageId && message.altText !== undefined && message.targetAttribute) {
              accessibilityManager.applyGeneratedAltText(message.imageId, message.altText, message.targetAttribute);
              sendResponse({ success: true });
            } else {
              error('Missing imageId, altText, or targetAttribute for applySingleAltText');
              sendResponse({ success: false, error: 'Missing imageId, altText, or targetAttribute' });
            }
            break;

          case 'updateSetting':
            log('Updating single setting:', message.key, '=', message.value);
            // saveSettings is already async, so this is fine
            settingsManager.saveSettings({ [message.key]: message.value })
              .then(() => sendResponse({ success: true }))
              .catch(err => {
                error('Failed to update setting:', err);
                sendResponse({ error: err.message });
              });
            // No need to return true here if the main wrapper returns true
            break; 

          case 'updateSettings':
            log('Updating multiple settings:', message.settings);
            settingsManager.saveSettings(message.settings)
              .then(() => {
                const allSettings = settingsManager.getAllSettings();
                accessibilityManager.applySettings(allSettings);
                sendResponse({ success: true });
              })
              .catch(err => {
                error('Failed to update settings:', err);
                sendResponse({ error: err.message });
              });
            break;

          case 'getSettings':
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
            // extractPageContent is synchronous
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
            log('Clearing all accessibility settings');
            accessibilityManager.clearAll();
            sendResponse({ success: true });
            break;

          default:
            const errorMsgSwitch = `Unknown message type: ${message.type}`;
            error(errorMsgSwitch);
            sendResponse({ error: errorMsgSwitch });
        }
      } catch (err) {
        error('Error handling message:', err);
        sendResponse({ error: err.message });
      }
    })(); // Immediately invoke the async function
    
    return true; // Crucial: Indicate that sendResponse will be called asynchronously for ALL cases now handled by the async IIFE.
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