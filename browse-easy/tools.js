// Tool definitions for AI-powered accessibility adjustments
const ACCESSIBILITY_TOOLS = [
  {
    "name": "highlightLinks",
    "description": "Highlight all links on the page with yellow background and orange border",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to enable or disable link highlighting"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "dyslexiaFriendly",
    "description": "Make text dyslexia-friendly with better fonts and spacing",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to enable or disable dyslexia-friendly formatting"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "scaleWebsite",
    "description": "Scale the entire website up or down",
    "parameters": {
      "type": "object",
      "properties": {
        "scale": {
          "type": "number",
          "description": "Scale percentage (50-300, where 100 is normal size)",
          "minimum": 50,
          "maximum": 300
        }
      },
      "required": ["scale"]
    }
  },
  {
    "name": "hideImages",
    "description": "Hide all images and videos on the page",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to hide or show images"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "adjustCursorSize",
    "description": "Make the cursor larger or smaller",
    "parameters": {
      "type": "object",
      "properties": {
        "size": {
          "type": "number",
          "description": "Cursor size percentage (50-300, where 100 is normal size)",
          "minimum": 50,
          "maximum": 300
        }
      },
      "required": ["size"]
    }
  },
  {
    "name": "muteSound",
    "description": "Mute or unmute all audio and video on the page",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to mute or unmute sound"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "adjustTextSpacing",
    "description": "Adjust text spacing, line height, and letter spacing",
    "parameters": {
      "type": "object",
      "properties": {
        "spacing": {
          "type": "number",
          "description": "Text spacing percentage (50-300, where 100 is normal spacing)",
          "minimum": 50,
          "maximum": 300
        }
      },
      "required": ["spacing"]
    }
  },
  {
    "name": "highlightOnHover",
    "description": "Highlight elements when hovering over them",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to enable or disable hover highlighting"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "enlargeButtons",
    "description": "Make all buttons larger and more visible",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to enlarge buttons or use normal size"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "addTooltips",
    "description": "Add helpful tooltips to images, buttons, and links",
    "parameters": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "description": "Whether to add or remove tooltips"
        }
      },
      "required": ["enabled"]
    }
  },
  {
    "name": "adjustContrast",
    "description": "Adjust the contrast of the entire page",
    "parameters": {
      "type": "object",
      "properties": {
        "contrast": {
          "type": "number",
          "description": "Contrast percentage (50-300, where 100 is normal contrast)",
          "minimum": 50,
          "maximum": 300
        }
      },
      "required": ["contrast"]
    }
  }
];

// Debug logging
function debugLog(...args) {
  console.log('[BrowseEasy Tools]', ...args);
}

// Function to test if content script is ready
async function testContentScriptConnection() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        resolve({ error: 'No active tab found' });
        return;
      }

      debugLog('Testing connection to tab:', tabs[0].url);
      
      chrome.tabs.sendMessage(tabs[0].id, { type: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          debugLog('Connection test failed:', chrome.runtime.lastError.message);
          resolve({ 
            error: chrome.runtime.lastError.message,
            tabId: tabs[0].id,
            tabUrl: tabs[0].url 
          });
        } else {
          debugLog('Connection test successful:', response);
          resolve({ success: true, response, tabId: tabs[0].id, tabUrl: tabs[0].url });
        }
      });
    });
  });
}

// Function to execute accessibility tools with better error handling
async function executeAccessibilityTool(toolName, parameters) {
  debugLog('Executing tool:', toolName, 'with parameters:', parameters);
  
  // First test the connection
  const connectionTest = await testContentScriptConnection();
  if (connectionTest.error) {
    debugLog('Connection test failed before executing tool');
    throw new Error(`Content script not ready: ${connectionTest.error}. Tab: ${connectionTest.tabUrl}`);
  }
  
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        debugLog('Sending executeFunction message to tab:', tabs[0].id);
        
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'executeFunction',
          functionName: toolName,
          parameters: parameters
        }, (response) => {
          if (chrome.runtime.lastError) {
            debugLog('Tool execution failed:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.error) {
            debugLog('Tool execution error from content script:', response.error);
            reject(new Error(response.error));
          } else {
            debugLog('Tool execution successful:', response);
            resolve(response);
          }
        });
      } else {
        reject(new Error('No active tab found'));
      }
    });
  });
}

// Function to update settings with better error handling
async function updateAccessibilitySettings(settings) {
  debugLog('Updating settings:', settings);
  
  // First test the connection
  const connectionTest = await testContentScriptConnection();
  if (connectionTest.error) {
    debugLog('Connection test failed before updating settings');
    throw new Error(`Content script not ready: ${connectionTest.error}. Tab: ${connectionTest.tabUrl}`);
  }
  
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        debugLog('Sending updateSettings message to tab:', tabs[0].id);
        
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'updateSettings',
          settings: settings
        }, (response) => {
          if (chrome.runtime.lastError) {
            debugLog('Settings update failed:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.error) {
            debugLog('Settings update error from content script:', response.error);
            reject(new Error(response.error));
          } else {
            debugLog('Settings update successful:', response);
            resolve(response);
          }
        });
      } else {
        reject(new Error('No active tab found'));
      }
    });
  });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ACCESSIBILITY_TOOLS, executeAccessibilityTool, updateAccessibilitySettings, testContentScriptConnection };
} else {
  window.ACCESSIBILITY_TOOLS = ACCESSIBILITY_TOOLS;
  window.executeAccessibilityTool = executeAccessibilityTool;
  window.updateAccessibilitySettings = updateAccessibilitySettings;
  window.testContentScriptConnection = testContentScriptConnection;
  
  // Add global debug functions
  window.browseEasyToolsDebug = {
    testConnection: testContentScriptConnection,
    logs: []
  };
} 