const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const audioModeButton = document.getElementById('audioModeButton');
const tabSwitcher = document.getElementById('tab-switcher');
const chatTab = document.getElementById('chatTab');
const settingsTab = document.getElementById('settingsTab');
const messagesContainer = document.getElementById('messages');
const settingsGrid = document.getElementById('settings-grid');
const shareTabBtn = document.getElementById('share-tab-btn');
const shareContentToggle = document.getElementById('share-content-toggle');
const contentStatus = document.getElementById('content-status');

let chatHistory = []; // Initialize chat history
const MAX_HISTORY_MESSAGES = 10; // Max number of messages (user + bot) to keep, excluding system prompt & current query

// Theme switching functionality
const themeButtons = document.querySelectorAll('.theme-btn');
let currentTheme = 'light'; // Default theme

// Content sharing functionality
let contentSharingEnabled = false;
let currentPageContent = null;

// Load saved theme preference
async function loadTheme() {
  try {
    const result = await chrome.storage.sync.get('browseEasyTheme');
    const savedTheme = result.browseEasyTheme || 'light';
    setTheme(savedTheme);
  } catch (error) {
    console.error('Failed to load theme:', error);
    setTheme('light'); // Fallback to light theme
  }
}

// Set theme and update UI
function setTheme(theme) {
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  
  // Update active button
  themeButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-theme') === theme) {
      btn.classList.add('active');
    }
  });
  
  // Save theme preference
  chrome.storage.sync.set({ browseEasyTheme: theme }).catch(error => {
    console.error('Failed to save theme:', error);
  });
}

// Add event listeners for theme buttons
themeButtons.forEach(button => {
  // Skip the share tab button - it's not a theme button
  if (button.id === 'share-tab-btn') return;
  
  button.addEventListener('click', () => {
    const theme = button.getAttribute('data-theme');
    setTheme(theme);
  });
});

// Add event listener for share tab button
shareTabBtn.addEventListener('click', () => {
  contentSharingEnabled = !contentSharingEnabled;
  updateShareTabButton();
  saveContentSharingPreference(contentSharingEnabled);
});

// Update share tab button appearance
function updateShareTabButton() {
  if (contentSharingEnabled) {
    shareTabBtn.classList.add('active');
    shareTabBtn.title = 'Content sharing enabled - Click to disable';
  } else {
    shareTabBtn.classList.remove('active');
    shareTabBtn.title = 'Share current tab content with AI - Click to enable';
  }
}

// Load theme on startup
loadTheme();

// Listener for the new audio mode button
if (audioModeButton) {
  audioModeButton.addEventListener('click', () => {
    // Define properties for the popup window
    const popupWidth = 300;
    const popupHeight = 250;
    // Calculate position to center it (optional, browsers might handle this differently)
    const left = (screen.width / 2) - (popupWidth / 2);
    const top = (screen.height / 2) - (popupHeight / 2);

    chrome.windows.create({
      url: chrome.runtime.getURL('audio_input.html'),
      type: 'popup',
      width: popupWidth,
      height: popupHeight,
      left: Math.round(left),
      top: Math.round(top)
    });
  });
}

// Listen for messages from other parts of the extension (e.g., audio_input.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'processAudioTranscript' && message.transcript) {
    console.log('[BrowseEasy Panel] Received transcript:', message.transcript);
    append('user', message.transcript);
    // Add user message to history before sending to Gemini
    chatHistory.push({ role: "user", parts: [{ text: message.transcript }] });
    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
    }

    inputEl.value = ''; 
    inputEl.disabled = true; 

    (async () => {
      try {
        const { botResponseText, botResponseForHistory } = await sendToGemini(message.transcript);
        append('bot', botResponseText);
        // Add bot response to history
        chatHistory.push(botResponseForHistory);
        if (chatHistory.length > MAX_HISTORY_MESSAGES) {
            chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
        }
      } catch (err) {
        append('error', err.toString());
      } finally {
        inputEl.disabled = false;
      }
    })();
    sendResponse({ success: true, message: "Transcript received and processing initiated." });
    return true; 
  } else if (message.type === 'anotherMessageType') {
    // Handle other potential messages if any in the future
  }
  // Return false or nothing for synchronous message handlers or if not handling this message
  // to prevent the port from being kept open unnecessarily.
  return false; 
});

// Listen for alt text results from content script and display in chat
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'altTextResults' && Array.isArray(message.results)) {
    let summary = '<strong>Generated Alt Texts for Images:</strong><br><ul>';
    message.results.forEach(({src, alt}) => {
      summary += `<li><code>${src}</code><br><em>${alt}</em></li>`;
    });
    if (Array.isArray(message.skipped) && message.skipped.length > 0) {
      summary += `<br><strong>Skipped (CORS/tainted):</strong><ul>`;
      message.skipped.forEach(src => {
        summary += `<li><code>${src}</code></li>`;
      });
      summary += '</ul>';
    }
    append('bot', summary);
  }
});

inputEl.addEventListener('keydown', async e => {
  if (e.key !== 'Enter' || !inputEl.value.trim()) return;
  const userMsg = inputEl.value.trim();
  append('user', userMsg);
  // Add user message to history before sending to Gemini
  chatHistory.push({ role: "user", parts: [{ text: userMsg }] });
  if (chatHistory.length > MAX_HISTORY_MESSAGES) {
      chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
  }

  inputEl.value = '';
  inputEl.disabled = true;
  
  try {
    const { botResponseText, botResponseForHistory } = await sendToGemini(userMsg);
    append('bot', botResponseText);
    // Add bot response to history
    chatHistory.push(botResponseForHistory);
    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
    }
  } catch (err) {
    append('error', err.toString());
  } finally {
    inputEl.disabled = false;
    inputEl.focus();
  }
});

async function sendToGemini(userMessage) {
  const systemPromptText = `You are BrowseEasy, an AI assistant that helps make web pages more accessible. You have access to tools that can modify the current webpage to improve accessibility.

Available tools:
- highlightLinks: Highlight all links with yellow background
- dyslexiaFriendly: Make text dyslexia-friendly with better fonts and spacing
- scaleWebsite: Scale the website up or down (50-300%, default: 150% for "bigger", 75% for "smaller")
- hideImages: Hide all images and videos
- adjustCursorSize: Make cursor larger or smaller (50-300%, default: 150% for "bigger", 75% for "smaller")
- muteSound: Mute all audio and video
- adjustTextSpacing: Adjust text spacing and line height (50-300%, default: 150% for "more spacing", 75% for "less spacing")
- highlightOnHover: Highlight elements when hovering
- enlargeButtons: Make buttons larger and more visible
- addTooltips: Add helpful tooltips to elements
- adjustContrast: Adjust page contrast (50-300%, default: 150% for "higher contrast", 75% for "lower contrast")

When users ask for accessibility improvements, use the appropriate tools with sensible defaults:
- "Make this bigger/larger" → use scaleWebsite with 150%
- "Make this smaller" → use scaleWebsite with 75%
- "Increase text spacing" → use adjustTextSpacing with 150%
- "Make cursor bigger" → use adjustCursorSize with 150%
- "Higher contrast" → use adjustContrast with 150%
- "Lower contrast" → use adjustContrast with 75%

For more specific requests like "make it 200% bigger" or "scale to 120%", use the exact percentage specified.

You can also answer questions about the current webpage content if the user has enabled content sharing. When content sharing is enabled, you'll have access to the page's text, headings, links, images, and other elements.

Always explain what you're doing and be helpful in suggesting other accessibility improvements.`;

  // Build the user message with optional page content
  let fullUserMessage = userMessage;
  
  if (contentSharingEnabled && currentPageContent) {
    const pageInfo = `

CURRENT PAGE INFORMATION:
Title: ${currentPageContent.title}
URL: ${currentPageContent.url}

Main Content: ${currentPageContent.text.substring(0, 3000)}${currentPageContent.text.length > 3000 ? '...' : ''}

Headings: ${currentPageContent.headings.map(h => `${h.level}: ${h.text}`).join(', ')}

Key Links: ${currentPageContent.links.slice(0, 10).map(l => `"${l.text}" (${l.href})`).join(', ')}${currentPageContent.links.length > 10 ? '...' : ''}

Images: ${currentPageContent.images.slice(0, 5).map(img => `"${img.alt || 'No alt text'}" (${img.src})`).join(', ')}${currentPageContent.images.length > 5 ? '...' : ''}

User request: ${userMessage}`;
    
    fullUserMessage = pageInfo;
  } else {
    fullUserMessage = `User request: ${userMessage}`;
  }
  
  // Construct messages: system prompt, then history, then current user message
  const messagesForAPI = [
    // System prompt can be implicitly handled by Gemini if we structure history correctly
    // Or we can add it as the first "user" or "model" turn if needed. 
    // For now, let's assume the history itself carries the context post-initial prompt.
    // The `systemPromptText` variable above is just for reference or if we want to include it directly.
    // Let's adjust: Gemini API often expects history to start with a user message if no explicit system instruction is part of `contents`.
    // A common pattern is [{role: "user", parts: [SYSTEM_PROMPT_HERE]}, {role: "model", parts: ["OK"]}, ...history... , {role: "user", parts: [CURRENT_MESSAGE]}]
    // For simplicity with function calling, the Gemini docs show system instructions in the first user message sometimes.
    // Let's use a structure where system instructions are part of the *first* user message in the API call for this turn.
  ];

  // Prepend chat history to the current user message for the API call
  // The Gemini API expects alternating user and model roles.
  const currentTurnContents = [
    ...chatHistory, // chatHistory already contains {role, parts}
    { 
      role: "user", 
      parts: [{ text: `${systemPromptText}\n\n${fullUserMessage}` }] // Combine system prompt with current user message (and optional page content)
    }
  ];

  const requestBody = {
    contents: currentTurnContents, // Send history + current message (with system prompt and optional page content)
    tools: [
      {
        function_declarations: ACCESSIBILITY_TOOLS
      }
    ]
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.config.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', },
    body: JSON.stringify(requestBody)
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No response from AI');
  }

  // This part needs to return two things:
  // 1. The text/HTML string to display in the chat (botResponseText)
  // 2. The raw part(s) from the AI to store in chatHistory (botResponseForHistory)
  let botResponseForHistory = candidate.content; // This should be {role: "model", parts: [...]}
  let botResponseText = '';
  let appliedToolsHtml = '';

  const functionCalls = candidate.content?.parts?.filter(part => part.functionCall);
  const textPart = candidate.content?.parts?.find(part => part.text);
  let aiTextResponse = textPart?.text || '';

  if (functionCalls && functionCalls.length > 0) {
    let toolResults = [];
    
    for (const functionCall of functionCalls) {
      try {
        const result = await executeAccessibilityTool(
          functionCall.functionCall.name,
          functionCall.functionCall.args
        );
        
        // Save settings when tools are executed via AI chat
        await saveSettingsFromToolExecution(functionCall.functionCall.name, functionCall.functionCall.args);
        
        toolResults.push({
          name: functionCall.functionCall.name,
          success: true,
          result: result
        });
      } catch (error) {
        toolResults.push({
          name: functionCall.functionCall.name,
          success: false,
          error: error.message
        });
      }
    }

    if (toolResults.length > 0) {
      appliedToolsHtml = '<div class="applied-tools-summary"><h4>Tools Executed:</h4><ul>';
      toolResults.forEach(result => {
        if (result.success) {
          appliedToolsHtml += `<li class="tool-success">✅ ${result.name}</li>`;
        } else {
          appliedToolsHtml += `<li class="tool-failure">❌ ${result.name}: ${result.error}</li>`;
        }
      });
      appliedToolsHtml += '</ul></div>';
      
      // Re-render settings grid to reflect changes
      renderSettingsGrid(currentSettings);
    }

    // Construct botResponseText for display
    if (aiTextResponse && appliedToolsHtml) botResponseText = `${aiTextResponse}\n\n${appliedToolsHtml}`;
    else if (aiTextResponse) botResponseText = aiTextResponse;
    else if (appliedToolsHtml) botResponseText = appliedToolsHtml;
    else botResponseText = 'Accessibility adjustments applied!';

  } else {
    if (contentSharingEnabled && currentPageContent) {
      botResponseText = aiTextResponse || 'I can help you with this page! I can see the content and apply accessibility improvements, or answer questions about what\'s on the page.';
    } else {
      botResponseText = aiTextResponse || 'I can help you make this page more accessible. Try asking me to make it more readable, highlight links, or adjust the size! You can also enable "Share current page content" to let me answer questions about the page.';
    }
  }
  
  // If botResponseForHistory is undefined or doesn't have role, construct it.
  // Gemini API response candidate.content should already be in the correct format {role: "model", parts: [...]}
  if (!botResponseForHistory || !botResponseForHistory.role) {
      botResponseForHistory = { role: "model", parts: candidate.content?.parts || [{text: botResponseText}] };
  }

  return { botResponseText, botResponseForHistory };
}

function append(type, text) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  if (type === 'bot') {
    // Process basic markdown for bot messages and allow HTML
    let processedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
      .replace(/\n/g, '<br>');                   // Newlines
    div.innerHTML = processedText;
  } else {
    div.textContent = text; // User messages and errors as plain text
    div.style.whiteSpace = 'pre-wrap'; // Preserve formatting for user input/errors
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Add some quick accessibility commands
document.addEventListener('DOMContentLoaded', () => {
  append('bot', '👋 Hi! I\'m BrowseEasy, your accessibility assistant. I can help make web pages easier to read and navigate.\n\n**Try saying:**\n• "Make this more readable"\n• "Highlight the links"\n• "Make the text bigger"\n• "Hide images"\n• "Make buttons larger"\n\n**New!** Click the 📄 button at the top to share tab content and ask me questions like:\n• "What is this page about?"\n• "Summarize the main content"\n• "What links are available?"\n\nWhat would you like me to help with?');
});

// Tab switching logic
chatTab.addEventListener('click', () => {
  chatTab.classList.add('active');
  settingsTab.classList.remove('active');
  messagesContainer.style.display = '';
  document.getElementById('input-area').style.display = '';
  settingsGrid.style.display = 'none';
});
settingsTab.addEventListener('click', async () => {
  chatTab.classList.remove('active');
  settingsTab.classList.add('active');
  messagesContainer.style.display = 'none';
  document.getElementById('input-area').style.display = 'none';
  settingsGrid.style.display = 'grid';
  
  // Refresh settings from storage when opening settings tab
  try {
    const result = await chrome.storage.sync.get('browseEasySettings');
    const defaultSettings = {
      highlightLinks: false,
      dyslexiaFriendly: false,
      websiteScale: 100,
      hideImages: false,
      cursorSize: 100,
      muteSound: false,
      textSpacing: 100,
      highlightOnHover: false,
      enlargeButtons: false,
      addTooltips: false,
      adjustContrast: 100,
      enabled: true
    };
    
    currentSettings = { ...defaultSettings, ...result.browseEasySettings };
    renderSettingsGrid(currentSettings);
  } catch (error) {
    console.error('Failed to refresh settings:', error);
  }
});

// Settings grid rendering
const TOOL_ICONS = {
  highlightLinks: '🔗',
  dyslexiaFriendly: '📖',
  scaleWebsite: '🔍',
  hideImages: '🚫',
  adjustCursorSize: '🖱️',
  muteSound: '🔇',
  adjustTextSpacing: '↔️',
  highlightOnHover: '🖍️',
  enlargeButtons: '⬆️',
  addTooltips: '💡',
  adjustContrast: '🌗'
};

// Friendly labels for each tool
const TOOL_LABELS = {
  highlightLinks: 'Highlight Links',
  dyslexiaFriendly: 'Dyslexia-Friendly Text',
  scaleWebsite: 'Scale Website',
  hideImages: 'Hide Images',
  adjustCursorSize: 'Big Cursor',
  muteSound: 'Mute All Sound',
  adjustTextSpacing: 'Adjust Text Spacing',
  highlightOnHover: 'Highlight on Hover',
  enlargeButtons: 'Enlarge Buttons',
  addTooltips: 'Add Tooltips',
  adjustContrast: 'Adjust Contrast',
  generateAltTextForImages: 'Generate Alt Text'
};

// Global settings object to track current state
let currentSettings = {};

// Function to save settings to storage and apply to current page
async function saveAndApplySettings(newSettings) {
  try {
    // Update current settings
    currentSettings = { ...currentSettings, ...newSettings };
    
    // Save to storage
    await chrome.storage.sync.set({ browseEasySettings: currentSettings });
    
    // Apply to current page via content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, {
          type: 'updateSettings',
          settings: newSettings
        });
      } catch (error) {
        console.log('Could not apply settings to current page:', error.message);
      }
    }
    
    return currentSettings;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

// Function to save settings when tools are executed via AI chat
async function saveSettingsFromToolExecution(toolName, parameters) {
  try {
    let newSettings = {};
    
    // Map tool executions to settings updates
    switch (toolName) {
      case 'highlightLinks':
        newSettings.highlightLinks = parameters.enabled;
        break;
      case 'dyslexiaFriendly':
        newSettings.dyslexiaFriendly = parameters.enabled;
        break;
      case 'scaleWebsite':
        newSettings.websiteScale = parameters.scale;
        break;
      case 'hideImages':
        newSettings.hideImages = parameters.enabled;
        break;
      case 'adjustCursorSize':
        newSettings.cursorSize = parameters.size;
        break;
      case 'muteSound':
        newSettings.muteSound = parameters.enabled;
        break;
      case 'adjustTextSpacing':
        newSettings.textSpacing = parameters.spacing;
        break;
      case 'highlightOnHover':
        newSettings.highlightOnHover = parameters.enabled;
        break;
      case 'enlargeButtons':
        newSettings.enlargeButtons = parameters.enabled;
        break;
      case 'addTooltips':
        newSettings.addTooltips = parameters.enabled;
        break;
      case 'adjustContrast':
        newSettings.adjustContrast = parameters.contrast;
        break;
      // generateAltTextForImages doesn't need to be saved as a setting
      default:
        return; // No settings to save for this tool
    }
    
    if (Object.keys(newSettings).length > 0) {
      // Update current settings
      currentSettings = { ...currentSettings, ...newSettings };
      
      // Save to storage
      await chrome.storage.sync.set({ browseEasySettings: currentSettings });
      
      console.log('Settings saved from AI tool execution:', newSettings);
    }
  } catch (error) {
    console.error('Failed to save settings from tool execution:', error);
  }
}

function renderSettingsGrid(settings) {
  currentSettings = { ...settings }; // Update current settings reference
  settingsGrid.innerHTML = '';
  ACCESSIBILITY_TOOLS.forEach((tool, idx) => {
    const icon = TOOL_ICONS[tool.name] || '⚙️';
    const isToggle = tool.parameters.properties.enabled !== undefined;
    let isActive = false;
    if (isToggle) {
      isActive = !!settings[tool.name];
    }
    const div = document.createElement('div');
    const colorClass = `color-${idx % 10}`;
    div.className = 'settings-icon ' + colorClass + (isActive ? ' active' : '');
    div.title = tool.description;
    const label = TOOL_LABELS[tool.name] || tool.description;
    div.innerHTML = `<span>${icon}</span><span class=\"settings-label\">${label}</span>`;
    div.addEventListener('click', async () => {
      if (tool.name === 'generateAltTextForImages') {
        div.innerHTML = `<span>⏳</span><span class='settings-label'>Generating...</span>`;
        await executeAccessibilityTool('generateAltTextForImages', {});
        div.innerHTML = `<span>${icon}</span><span class='settings-label'>Done!</span>`;
        setTimeout(() => renderSettingsGrid(currentSettings), 1200);
        return;
      }
      if (isToggle) {
        // Toggle boolean
        const newValue = !settings[tool.name];
        const newSettings = { [tool.name]: newValue };
        
        // Save and apply settings
        await saveAndApplySettings(newSettings);
        
        // Re-render grid with updated settings
        renderSettingsGrid(currentSettings);
      } else if (tool.parameters.properties.scale) {
        // Prompt for scale value
        const scale = prompt('Enter scale (50-300):', settings.websiteScale || 100);
        if (scale && !isNaN(scale)) {
          const scaleValue = Math.max(50, Math.min(300, Number(scale)));
          const newSettings = { websiteScale: scaleValue };
          
          // Save and apply settings
          await saveAndApplySettings(newSettings);
          await executeAccessibilityTool('scaleWebsite', { scale: scaleValue });
          
          // Re-render grid with updated settings
          renderSettingsGrid(currentSettings);
        }
      } else if (tool.parameters.properties.size) {
        const size = prompt('Enter cursor size (50-300):', settings.cursorSize || 100);
        if (size && !isNaN(size)) {
          const sizeValue = Math.max(50, Math.min(300, Number(size)));
          const newSettings = { cursorSize: sizeValue };
          
          // Save and apply settings
          await saveAndApplySettings(newSettings);
          await executeAccessibilityTool('adjustCursorSize', { size: sizeValue });
          
          // Re-render grid with updated settings
          renderSettingsGrid(currentSettings);
        }
      } else if (tool.parameters.properties.spacing) {
        const spacing = prompt('Enter text spacing (50-300):', settings.textSpacing || 100);
        if (spacing && !isNaN(spacing)) {
          const spacingValue = Math.max(50, Math.min(300, Number(spacing)));
          const newSettings = { textSpacing: spacingValue };
          
          // Save and apply settings
          await saveAndApplySettings(newSettings);
          await executeAccessibilityTool('adjustTextSpacing', { spacing: spacingValue });
          
          // Re-render grid with updated settings
          renderSettingsGrid(currentSettings);
        }
      } else if (tool.parameters.properties.contrast) {
        const contrast = prompt('Enter contrast (50-300):', settings.adjustContrast || 100);
        if (contrast && !isNaN(contrast)) {
          const contrastValue = Math.max(50, Math.min(300, Number(contrast)));
          const newSettings = { adjustContrast: contrastValue };
          
          // Save and apply settings
          await saveAndApplySettings(newSettings);
          await executeAccessibilityTool('adjustContrast', { contrast: contrastValue });
          
          // Re-render grid with updated settings
          renderSettingsGrid(currentSettings);
        }
      }
    });
    settingsGrid.appendChild(div);
  });
}

// Load settings and render grid on startup
window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load settings from storage
    const result = await chrome.storage.sync.get('browseEasySettings');
    const defaultSettings = {
      highlightLinks: false,
      dyslexiaFriendly: false,
      websiteScale: 100,
      hideImages: false,
      cursorSize: 100,
      muteSound: false,
      textSpacing: 100,
      highlightOnHover: false,
      enlargeButtons: false,
      addTooltips: false,
      adjustContrast: 100,
      enabled: true
    };
    
    currentSettings = { ...defaultSettings, ...result.browseEasySettings };
    
    // Render the settings grid with loaded settings
    renderSettingsGrid(currentSettings);
    
    console.log('Panel loaded with settings:', currentSettings);
  } catch (error) {
    console.error('Failed to load settings in panel:', error);
    // Fallback to default settings
    const defaultSettings = {
      highlightLinks: false,
      dyslexiaFriendly: false,
      websiteScale: 100,
      hideImages: false,
      cursorSize: 100,
      muteSound: false,
      textSpacing: 100,
      highlightOnHover: false,
      enlargeButtons: false,
      addTooltips: false,
      adjustContrast: 100,
      enabled: true
    };
    currentSettings = defaultSettings;
    renderSettingsGrid(currentSettings);
  }
});

// Load content sharing preference
async function loadContentSharingPreference() {
  try {
    const result = await chrome.storage.sync.get('browseEasyContentSharing');
    contentSharingEnabled = result.browseEasyContentSharing || false;
    updateShareTabButton();
    
    if (contentSharingEnabled) {
      await loadCurrentPageContent();
    }
  } catch (error) {
    console.error('Failed to load content sharing preference:', error);
  }
}

// Save content sharing preference
async function saveContentSharingPreference(enabled) {
  try {
    contentSharingEnabled = enabled;
    await chrome.storage.sync.set({ browseEasyContentSharing: enabled });
    updateShareTabButton();
    
    if (enabled) {
      await loadCurrentPageContent();
    } else {
      currentPageContent = null;
    }
  } catch (error) {
    console.error('Failed to save content sharing preference:', error);
  }
}

// Load current page content
async function loadCurrentPageContent() {
  try {
    console.log('Loading current page content...');
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const messagePromise = chrome.tabs.sendMessage(tabs[0].id, {
        type: 'getPageContent'
      });
      
      const response = await Promise.race([messagePromise, timeoutPromise]);
      
      if (response && response.success) {
        currentPageContent = response.content;
        console.log('Page content loaded successfully:', currentPageContent.title);
      } else {
        throw new Error(response?.error || 'Failed to get page content');
      }
    } else {
      throw new Error('No active tab found');
    }
  } catch (error) {
    console.error('Failed to load page content:', error);
    currentPageContent = null;
    
    // Try again after a short delay
    setTimeout(() => {
      if (contentSharingEnabled) {
        loadCurrentPageContent();
      }
    }, 2000);
  }
}

// Load content sharing preference on startup
loadContentSharingPreference();

// Listen for tab changes and reload content if sharing is enabled
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
  if (contentSharingEnabled) {
    // Small delay to ensure the tab is fully loaded
    setTimeout(() => {
      loadCurrentPageContent();
    }, 500);
  }
});

// Listen for tab updates (page navigation) and reload content if sharing is enabled
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && contentSharingEnabled) {
    // Check if this is the active tab
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs[0] && activeTabs[0].id === tabId) {
      console.log('Active tab updated:', tab.url);
      // Small delay to ensure the page is fully loaded
      setTimeout(() => {
        loadCurrentPageContent();
      }, 1000);
    }
  }
});
