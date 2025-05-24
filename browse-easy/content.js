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
    log('Received message:', message.type, 'from:', sender.id || 'unknown');
    
    if (!accessibilityManager || !settingsManager) {
      const errorMsg = 'Accessibility manager not initialized';
      error(errorMsg);
      sendResponse({ error: errorMsg });
      return false;
    }

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
          accessibilityManager.executeFunction(message.functionName, message.parameters);
          sendResponse({ success: true });
          break;

        case 'updateSetting':
          log('Updating single setting:', message.key, '=', message.value);
          settingsManager.saveSettings({ [message.key]: message.value }).then(() => {
            sendResponse({ success: true });
          }).catch(err => {
            error('Failed to update setting:', err);
            sendResponse({ error: err.message });
          });
          return true; // Will respond asynchronously

        case 'updateSettings':
          log('Updating multiple settings:', message.settings);
          settingsManager.saveSettings(message.settings).then(() => {
            sendResponse({ success: true });
          }).catch(err => {
            error('Failed to update settings:', err);
            sendResponse({ error: err.message });
          });
          return true; // Will respond asynchronously

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

        case 'clearAll':
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
    }
  };

  log('Content script loaded, debug functions available');

})(); 