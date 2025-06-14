// Import config
importScripts('config.js');

// Debug logging
function log(...args) {
  console.log('[BrowseEasy Background]', ...args);
}

function error(...args) {
  console.error('[BrowseEasy Background ERROR]', ...args);
}

// Create context menus
function createContextMenus() {
  log('Creating context menus...');
  
  try {
    // Remove existing menus first
    chrome.contextMenus.removeAll(() => {
      log('Removed existing context menus');
      
      // Context menu for selected text
      chrome.contextMenus.create({
        id: 'browse-easy-read-selection',
        title: '🔊 Read selected text aloud',
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          error('Error creating selection context menu:', chrome.runtime.lastError);
        } else {
          log('Created selection context menu');
        }
      });
      
      // Context menu for images
      chrome.contextMenus.create({
        id: 'browse-easy-read-image',
        title: '🖼️ Read image description aloud',
        contexts: ['image']
      }, () => {
        if (chrome.runtime.lastError) {
          error('Error creating image context menu:', chrome.runtime.lastError);
        } else {
          log('Created image context menu');
        }
      });
    });
  } catch (err) {
    error('Error in createContextMenus:', err);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  log('Context menu clicked:', {
    menuItemId: info.menuItemId,
    tabId: tab.id,
    tabUrl: tab.url,
    selectionText: info.selectionText,
    srcUrl: info.srcUrl
  });

  try {
    if (info.menuItemId === 'browse-easy-read-selection') {
      log('Processing read selection request');
      
      // Read selected text
      const selectedText = info.selectionText;
      if (selectedText && selectedText.trim()) {
        log('Sending readTextAloud message to tab:', tab.id);
        
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'readTextAloud',
          text: selectedText.trim()
        });
        
        log('Response from content script:', response);
      } else {
        error('No selected text found');
      }
    } else if (info.menuItemId === 'browse-easy-read-image') {
      log('Processing read image request');
      
      // Read image description
      if (info.srcUrl) {
        log('Sending readImageAloud message to tab:', tab.id);
        
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'readImageAloud',
          imageSrc: info.srcUrl
        });
        
        log('Response from content script:', response);
      } else {
        error('No image source URL found');
      }
    } else {
      error('Unknown menu item ID:', info.menuItemId);
    }
  } catch (err) {
    error('Error handling context menu click:', err);
    
    // Try to inject content scripts if they're not present
    if (err.message && err.message.includes('Could not establish connection')) {
      log('Content script seems missing, trying to inject...');
      await injectContentScripts(tab.id);
      
      // Retry the operation
      setTimeout(async () => {
        try {
          log('Retrying context menu operation...');
          chrome.contextMenus.onClicked.removeListener(arguments.callee);
          chrome.contextMenus.onClicked.addListener(arguments.callee);
        } catch (retryErr) {
          error('Retry failed:', retryErr);
        }
      }, 1000);
    }
  }
});

// Function to inject content scripts into a specific tab
async function injectContentScripts(tabId) {
  try {
    log('Injecting content scripts into tab:', tabId);
    
    // Inject the content scripts in the same order as manifest.json
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['config.js']
    });
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['accessibility.js']
    });
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['settings.js']
    });
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    
    log('Successfully injected content scripts into tab:', tabId);
  } catch (error) {
    error('Failed to inject content scripts:', error);
  }
}

// Inject content scripts into all existing tabs on startup
chrome.runtime.onStartup.addListener(injectIntoExistingTabs);
chrome.runtime.onInstalled.addListener((details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
  
  // Create context menus
  createContextMenus();
  
  // Inject into existing tabs when extension is installed/enabled
  if (details.reason === 'install' || details.reason === 'enable') {
    injectIntoExistingTabs();
  }
});

async function injectIntoExistingTabs() {
  console.log('Injecting content scripts into existing tabs...');
  try {
    const tabs = await chrome.tabs.query({});
    console.log(`Found ${tabs.length} tabs to potentially inject into`);
    
    for (const tab of tabs) {
      // Skip chrome:// pages and other restricted URLs
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:') ||
          tab.url.startsWith('moz-extension://')) {
        continue;
      }
      
      try {
        console.log(`Injecting into tab: ${tab.url}`);
        
        // Inject the content scripts in the same order as manifest.json
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['config.js']
        });
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['accessibility.js']
        });
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['settings.js']
        });
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        console.log(`Successfully injected into tab: ${tab.url}`);
      } catch (error) {
        // This will fail for pages that don't allow script injection
        // (like chrome:// pages or some restricted sites) - that's expected
        console.log(`Could not inject into ${tab.url}: ${error.message}`);
      }
    }
    console.log('Finished injecting into existing tabs');
  } catch (error) {
    console.error('Failed to inject into existing tabs:', error);
  }
}

// Listen for messages from content scripts and panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'spotlightQuery' && message.query) {
    // Forward spotlight queries from content script to panel
    console.log('Forwarding spotlight query to panel:', message.query);
    chrome.runtime.sendMessage({ 
      type: 'processSpotlightQuery', 
      query: message.query 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Could not forward to panel:', chrome.runtime.lastError.message);
      }
    });
    sendResponse({ success: true });
    return false;
  } else if (message.type === 'generateAltText' && message.imgBase64) {
    // Call Gemini API to generate alt text from base64 image
    (async () => {
      try {
        console.log(`[BrowseEasy Background] Generating alt text for image: ${message.originalSrc}`);
        
        if (!config || !config.GEMINI_API_KEY) {
          throw new Error('Gemini API key not found');
        }
        
        const apiKey = config.GEMINI_API_KEY;
        
        // Use the provided MIME type or default to image/png
        const mimeType = message.mimeType || 'image/png';
        
        const prompt = `You are an expert at writing accessible alt text for images on web pages.
Write a concise, descriptive alt text (max 1 sentence, 10-20 words) for a visually impaired user.
Describe the main subject, action, and context if possible.
Do not use generic phrases like 'image', 'picture', or 'photo'.
Be specific about what you see - people, objects, actions, text content, etc.
Return only the alt text, nothing else.`;

        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { 
                  inline_data: { 
                    mime_type: mimeType, 
                    data: message.imgBase64 
                  } 
                }
              ]
            }
          ]
        };
        
        console.log(`[BrowseEasy Background] Calling Gemini API with MIME type: ${mimeType}`);
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
        }
        
        const data = await res.json();
        let altText = '';
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          altText = data.candidates[0].content.parts[0].text.trim();
          console.log(`[BrowseEasy Background] Generated alt text: "${altText}"`);
        } else {
          console.warn('[BrowseEasy Background] No alt text in API response:', data);
        }
        
        sendResponse({ altText });
      } catch (e) {
        console.error('[BrowseEasy Background] Alt text generation failed:', e);
        sendResponse({ altText: '', error: e.message });
      }
    })();
    return true; // async
  }
});

// Listen for the open-spotlight command and show spotlight overlay on current tab
chrome.commands.onCommand.addListener(async (command) => {
  console.log('command', command);
  if (command === 'open-spotlight') {
    console.log('open-spotlight attempted');
    try {
      // Send message to content script to show spotlight overlay
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'openSpotlight' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Failed to send to content script:', chrome.runtime.lastError.message);
            // Show notification that BrowseEasy needs to be enabled
            chrome.action.setBadgeText({ text: '!' });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
            chrome.action.setTitle({ title: 'BrowseEasy spotlight not available on this page' });
            
            // Clear the badge after 3 seconds
            setTimeout(() => {
              chrome.action.setBadgeText({ text: '' });
              chrome.action.setTitle({ title: 'Open BrowseEasy' });
            }, 3000);
          } else {
            console.log('Spotlight overlay shown successfully');
          }
        });
      }
    } catch (e) {
      console.error('Failed to handle spotlight command:', e);
    }
  }
});
