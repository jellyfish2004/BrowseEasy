# BrowseEasy - AI-Powered Accessibility Browser Extension

BrowseEasy is a Chrome extension that makes web pages more accessible using AI-powered assistance and automated accessibility features.

## Features

### Accessibility Functions
- **Highlight Links**: Makes all links more visible with yellow background and orange borders
- **Dyslexia-Friendly Text**: Improves readability with better fonts and spacing
- **Website Scaling**: Zoom the entire website (50-300%)
- **Hide Images**: Remove distracting images and videos
- **Cursor Size**: Adjust cursor size for better visibility (50-300%)
- **Mute Sound**: Automatically mute all audio and video content
- **Text Spacing**: Improve readability with better line and letter spacing
- **Highlight on Hover**: Highlight elements when hovering over them
- **Enlarge Buttons**: Make buttons bigger and more accessible
- **Add Tooltips**: Automatically add helpful tooltips to elements
- **Adjust Contrast**: Modify page contrast for better visibility

### AI Assistant
- Chat with an AI assistant that can apply accessibility changes in real-time
- Natural language commands like "make this more readable" or "highlight the links"
- Intelligent suggestions for improving page accessibility

## Installation

1. Ensure you have a Gemini API key from Google AI Studio
2. Copy `config.example.js` to `config.js` and add your API key:
   ```javascript
   window.config = {
     GEMINI_API_KEY: 'your-api-key-here'
   };
   ```
3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `browse-easy` folder

## Usage

### AI Assistant
1. Click the BrowseEasy icon to open the side panel
2. Chat with the AI assistant using natural language:
   - "Make this page more readable"
   - "I can't see the links clearly"
   - "The text is too small"
   - "Hide all the images"
   - "Make the buttons bigger"
   - "This page is too bright"

### Manual Testing (For Development)
1. Open the extension side panel
2. Open browser console (F12)
3. Modify the `TEST_SETTINGS` object in `test-settings.js`
4. Run `applyTestSettings()` in the console to apply changes
5. Run `clearAllSettings()` to reset

Example test settings:
```javascript
// Edit test-settings.js and change values
const TEST_SETTINGS = {
  enabled: true,
  highlightLinks: true,        // Enable link highlighting
  dyslexiaFriendly: true,      // Enable dyslexia-friendly text
  websiteScale: 150,           // Scale to 150%
  hideImages: false,
  cursorSize: 200,             // Double cursor size
  muteSound: true,             // Mute all sound
  textSpacing: 130,            // Increase text spacing
  highlightOnHover: true,      // Enable hover highlighting
  enlargeButtons: true,        // Make buttons bigger
  addTooltips: true,           // Add tooltips
  adjustContrast: 120          // Increase contrast
};
```

## Debugging & Troubleshooting

### Quick Debug Steps

1. **Use the Debug Page**: Open `debug.html` in your browser for comprehensive testing
2. **Check Console Logs**: Open F12 and look for `[BrowseEasy Content]` and `[BrowseEasy Tools]` messages
3. **Test Connection**: Use the debug page's connection test or run `testContentScriptConnection()` in console

### Common Issues

#### "Could not establish connection. Receiving end does not exist"
This means the content script isn't receiving messages. Check:

1. **Extension is loaded**: Go to `chrome://extensions/` and ensure BrowseEasy is enabled
2. **Page compatibility**: Content scripts only work on `http://` and `https://` pages, not on:
   - `chrome://` pages
   - `chrome-extension://` pages
   - Local `file://` pages
   - New tab pages
3. **Content script initialization**: Check console for `[BrowseEasy Content]` logs

#### Debug Console Commands
Open the extension side panel and run these in the browser console:

```javascript
// Test if content script is loaded
window.browseEasyDebug.getStatus()

// Test connection
await testContentScriptConnection()

// Apply test settings manually
applyTestSettings()

// Check what's available
console.log('Tools available:', typeof executeAccessibilityTool)
console.log('Settings available:', typeof TEST_SETTINGS)
```

#### Step-by-Step Debugging

1. **Load the debug page**: Open `debug.html` in a new tab
2. **Check extension status**: Click "Check Extension Status" 
3. **Test connection**: Click "Test Content Script Connection"
4. **Test individual features**: Use the feature test buttons
5. **Check console logs**: Look for error messages in F12 console

#### Debug Logs to Look For

**Content Script Logs**:
```
[BrowseEasy Content] Content script loading...
[BrowseEasy Content] Initializing BrowseEasy on: https://example.com
[BrowseEasy Content] Script loaded: accessibility.js
[BrowseEasy Content] Script loaded: settings.js
[BrowseEasy Content] Managers created successfully
[BrowseEasy Content] BrowseEasy accessibility features initialized successfully
```

**Tool Execution Logs**:
```
[BrowseEasy Tools] Testing connection to tab: https://example.com
[BrowseEasy Tools] Connection test successful
[BrowseEasy Tools] Executing tool: highlightLinks
[BrowseEasy Tools] Tool execution successful
```

#### Manual Testing Without AI
If the AI integration isn't working, you can test features manually:

```javascript
// In the extension side panel console:
applyTestSettings()  // Apply test settings
clearAllSettings()   // Clear all
```

#### Extension Reload Process
1. Go to `chrome://extensions/`
2. Click the reload button for BrowseEasy
3. Refresh any open web pages
4. Test the extension again

## Architecture

### Files Structure
- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker for extension lifecycle
- `content.js` - Content script injected into web pages
- `accessibility.js` - Core accessibility functions
- `settings.js` - Settings management system
- `tools.js` - AI tool calling definitions
- `panel.html/js` - Side panel UI and AI chat interface
- `test-settings.js` - Development testing utilities
- `debug.html` - Debugging and testing page

### Data Flow
1. User interacts with AI in side panel (`panel.js`)
2. AI processes request and calls accessibility tools (`tools.js`)
3. Tools send messages to content script (`content.js`)
4. Content script applies changes using accessibility manager (`accessibility.js`)
5. Settings are persisted using settings manager (`settings.js`)

### Tool Calling System
The extension uses Gemini's function calling feature to let the AI execute accessibility functions:

```javascript
// AI can call these functions based on user requests
const tools = [
  'highlightLinks',
  'dyslexiaFriendly', 
  'scaleWebsite',
  'hideImages',
  // ... etc
];
```

## Development

### Adding New Accessibility Functions
1. Add the function to `AccessibilityManager` in `accessibility.js`
2. Add the tool definition to `ACCESSIBILITY_TOOLS` in `tools.js`
3. Update the AI system prompt in `panel.js`

### Testing New Features
1. Modify `TEST_SETTINGS` in `test-settings.js`
2. Reload the extension
3. Use console commands to test: `applyTestSettings()` or `clearAllSettings()`

## API Integration

The extension uses Google's Gemini API for AI functionality. You'll need:
1. A Google AI Studio account
2. A Gemini API key
3. The key configured in `config.js`

## Privacy & Security
- Settings are stored locally using Chrome's storage API
- Only the user's messages are sent to the Gemini API
- No page content or personal data is transmitted
- All accessibility modifications are applied locally

## Future Enhancements
- Settings UI for manual control
- WCAG compliance checker
- More accessibility functions
- Custom accessibility profiles
- Export/import settings
- Accessibility reports
