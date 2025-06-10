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

  // Text-to-Speech functionality
  let currentSpeechUtterance = null;
  
  function readTextAloud(text) {
    try {
      // Stop any current speech
      stopCurrentSpeech();
      
      if (!text || !text.trim()) {
        log('No text to read');
        return;
      }
      
      // Check if speech synthesis is supported
      if (!('speechSynthesis' in window)) {
        error('Speech synthesis not supported in this browser');
        showTTSNotification('Speech synthesis not supported in this browser');
        return;
      }
      
      // Create speech utterance
      currentSpeechUtterance = new SpeechSynthesisUtterance(text.trim());
      
      // Set speech parameters
      currentSpeechUtterance.rate = 0.9; // Slightly slower for better comprehension
      currentSpeechUtterance.pitch = 1;
      currentSpeechUtterance.volume = 0.8;
      
      // Event handlers
      currentSpeechUtterance.onstart = () => {
        log('Started reading text aloud');
        showTTSNotification('🔊 Reading text aloud...', 2000);
      };
      
      currentSpeechUtterance.onend = () => {
        log('Finished reading text aloud');
        currentSpeechUtterance = null;
      };
      
      currentSpeechUtterance.onerror = (event) => {
        error('Speech synthesis error:', event.error);
        showTTSNotification(`Speech error: ${event.error}`);
        currentSpeechUtterance = null;
      };
      
      // Start speaking
      speechSynthesis.speak(currentSpeechUtterance);
      
    } catch (err) {
      error('Error in readTextAloud:', err);
      showTTSNotification(`Error: ${err.message}`);
    }
  }
  
  async function readImageAloud(imageSrc) {
    try {
      log('Reading image aloud, imageSrc:', imageSrc);
      
      // Find the image element
      const images = Array.from(document.querySelectorAll('img'));
      log('Found', images.length, 'images on page');
      
      // Try multiple matching strategies
      let targetImage = null;
      
      // 1. Try exact match first
      targetImage = images.find(img => img.src === imageSrc);
      
      // 2. If not found, try matching without resolution suffixes (@1.5x, @2x, etc.)
      if (!targetImage) {
        const cleanImageSrc = imageSrc.replace(/@[0-9.]+x/, '');
        targetImage = images.find(img => img.src === cleanImageSrc);
        if (targetImage) {
          log('Found image using cleaned URL:', cleanImageSrc);
        }
      }
      
      // 3. If still not found, try matching by basename
      if (!targetImage) {
        const imageName = imageSrc.split('/').pop().replace(/@[0-9.]+x/, '');
        targetImage = images.find(img => {
          const imgName = img.src.split('/').pop();
          return imgName === imageName;
        });
        if (targetImage) {
          log('Found image using basename match:', imageName);
        }
      }
      
      // 4. Last resort: try partial URL matching
      if (!targetImage) {
        const baseUrl = imageSrc.split('?')[0].replace(/@[0-9.]+x/, '');
        targetImage = images.find(img => {
          const imgBaseUrl = img.src.split('?')[0];
          return imgBaseUrl.includes(baseUrl.split('/').pop()) || baseUrl.includes(imgBaseUrl.split('/').pop());
        });
        if (targetImage) {
          log('Found image using partial URL match');
        }
      }
      
      if (!targetImage) {
        error('Image not found with src:', imageSrc);
        log('Available image sources:', images.map(img => img.src).slice(0, 5));
        log('Tried clean src:', imageSrc.replace(/@[0-9.]+x/, ''));
        showTTSNotification('Image not found');
        return;
      }
      
      log('Found target image, dimensions:', targetImage.width, 'x', targetImage.height);
      
      // Check if image already has alt text
      let altText = targetImage.alt?.trim();
      
      if (altText) {
        log('Image has existing alt text:', altText);
        readTextAloud(`Image description: ${altText}`);
        return;
      }
      
      log('No existing alt text, generating...');
      
      // Generate alt text if not present
      showTTSNotification('🤖 Generating image description...', 5000);
      
      try {
        if (!accessibilityManager) {
          error('Accessibility manager not initialized');
          throw new Error('Accessibility manager not initialized');
        }
        
        log('Getting image base64 data...');
        
        // Use existing alt text generation functionality
        const imageData = await accessibilityManager.getImageBase64(targetImage);
        
        log('Got image data, MIME type:', imageData.mimeType, 'base64 length:', imageData.base64.length);
        
        const response = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Alt text generation request timed out'));
          }, 15000);
          
          log('Sending generateAltText message to background...');
          
          chrome.runtime.sendMessage({
            type: 'generateAltText',
            imgBase64: imageData.base64,
            mimeType: imageData.mimeType,
            originalSrc: targetImage.src
          }, (response) => {
            clearTimeout(timeout);
            
            if (chrome.runtime.lastError) {
              error('Runtime error in generateAltText:', chrome.runtime.lastError);
              return reject(chrome.runtime.lastError);
            }
            
            log('Received response from background:', response);
            resolve(response);
          });
        });
        
        if (response && response.altText && response.altText.trim()) {
          altText = response.altText.trim();
          // Set the alt text on the image for future use
          targetImage.alt = altText;
          log('Generated alt text successfully:', altText);
          showTTSNotification('✅ Description generated');
          readTextAloud(`Generated image description: ${altText}`);
        } else if (response && response.error) {
          throw new Error(`API error: ${response.error}`);
        } else {
          throw new Error('Empty alt text generated');
        }
        
      } catch (genError) {
        error('Failed to generate alt text:', genError);
        showTTSNotification('❌ Failed to generate image description');
        // Fall back to basic image info
        try {
          const fallbackText = `Image from ${new URL(imageSrc).hostname}`;
          readTextAloud(fallbackText);
        } catch (urlError) {
          readTextAloud('Unable to describe image');
        }
      }
      
    } catch (err) {
      error('Error in readImageAloud:', err);
      showTTSNotification(`❌ Error: ${err.message}`);
    }
  }
  
  function stopCurrentSpeech() {
    if (speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.cancel();
      log('Stopped current speech');
    }
    currentSpeechUtterance = null;
  }
  
  function showTTSNotification(message, duration = 3000) {
    // Create or update notification
    let notification = document.getElementById('browseeasy-tts-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'browseeasy-tts-notification';
      notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: #1a73e8 !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        z-index: 2147483646 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        max-width: 300px !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
        pointer-events: none !important;
      `;
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Clear any existing timeout
    if (notification.hideTimeout) {
      clearTimeout(notification.hideTimeout);
    }
    
    // Hide after duration
    notification.hideTimeout = setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  // Listen for messages from the panel/background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received message:', message.type, 'from:', sender.id || 'unknown', 'full message:', message);

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

        case 'readTextAloud':
          log('Reading text aloud from context menu:', message.text);
          try {
            readTextAloud(message.text);
            sendResponse({ success: true });
          } catch (err) {
            error('Error in readTextAloud:', err);
            sendResponse({ error: err.message });
          }
          break;

        case 'readImageAloud':
          log('Reading image aloud from context menu:', message.imageSrc);
          try {
            readImageAloud(message.imageSrc).then(() => {
              sendResponse({ success: true });
            }).catch(err => {
              error('Error in readImageAloud:', err);
              sendResponse({ error: err.message });
            });
            return true; // Will respond asynchronously
          } catch (err) {
            error('Error in readImageAloud setup:', err);
            sendResponse({ error: err.message });
          }
          break;

        case 'applySettings':
          if (!accessibilityManager) {
            error('Accessibility manager not initialized for applySettings');
            sendResponse({ error: 'Accessibility manager not initialized' });
            break;
          }
          log('Applying settings:', message.settings);
          accessibilityManager.applySettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'executeFunction':
          if (!accessibilityManager) {
            error('Accessibility manager not initialized for executeFunction');
            sendResponse({ error: 'Accessibility manager not initialized' });
            break;
          }
          log('Executing function:', message.functionName, 'with params:', message.parameters);
          try {
            accessibilityManager.executeFunction(message.functionName, message.parameters);
            sendResponse({ success: true });
          } catch (err) {
            error('Error executing function:', err);
            sendResponse({ error: err.message });
          }
          break;

        case 'updateSetting':
          if (!settingsManager) {
            error('Settings manager not initialized for updateSetting');
            sendResponse({ error: 'Settings manager not initialized' });
            break;
          }
          log('Updating single setting:', message.key, '=', message.value);
          settingsManager.saveSettings({ [message.key]: message.value }).then(() => {
            log('Single setting update successful');
            sendResponse({ success: true });
          }).catch(err => {
            error('Failed to update setting:', err);
            sendResponse({ error: err.message });
          });
          return true; // Will respond asynchronously

        case 'updateSettings':
          if (!settingsManager || !accessibilityManager) {
            error('Managers not initialized for updateSettings');
            sendResponse({ error: 'Managers not initialized' });
            break;
          }
          log('Updating multiple settings:', message.settings);
          settingsManager.saveSettings(message.settings).then(() => {
            // Apply the updated settings to the accessibility manager
            const allSettings = settingsManager.getAllSettings();
            accessibilityManager.applySettings(allSettings);
            log('Multiple settings update successful');
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