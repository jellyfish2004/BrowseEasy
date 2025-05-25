# BrowseEasy - AI-Powered Accessibility Browser Extension

BrowseEasy is a Chrome extension that makes web pages more accessible using AI-powered assistance and automated accessibility features.

Usage:
```
git clone https://github.com/jellyfish2004/BrowseEasy.git
cd browse-easy
cp config.example.js config.js
enter API keys for gemini (chat agent), and sarvam (for ASR)
go to chrome://extensions -> load unpacked -> select browse-easy folder
```

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

### Settings Persistence
- **Automatic Persistence**: All accessibility settings are automatically saved and persist across browser sessions
- **Cross-Tab Sync**: Settings are synchronized across all open tabs in real-time
- **Manual Settings**: Use the Settings tab in the extension panel to manually toggle features
- **AI-Applied Settings**: Settings applied through AI chat are automatically saved
- **Page Reload**: Settings are automatically reapplied when pages are refreshed or new pages are loaded

#### How Settings Persistence Works
1. **Settings Storage**: All settings are stored using Chrome's sync storage API
2. **Auto-Application**: When a webpage loads, saved settings are automatically applied
3. **Real-Time Sync**: Changes made in one tab are immediately applied to all other tabs
4. **Persistent State**: The Settings tab always shows the current saved state of all features

#### Testing Settings Persistence
Use the included test page to verify settings persistence:
1. Open `test-persistence.html` in your browser
2. Enable some accessibility features through the extension panel
3. Refresh the page - settings should persist and be automatically applied
4. Open the same page in a new tab - settings should apply there too

#### Testing Hover Highlighting
Use the dedicated hover test page to verify the hover highlighting feature:
1. Open `test-hover.html` in your browser
2. Enable "Highlight on Hover" through the extension panel
3. Hover over interactive elements - they should highlight with yellow background and orange outline
4. Non-interactive elements (disabled buttons, empty links, regular text) should NOT highlight

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

### API Integration

The extension uses Google's Gemini API and Sarvam's ASR API for AI functionality. You'll need:
1. A Google AI Studio account
2. A Gemini API key
4. A Sarvam.AI api key
3. The keys configured in `config.js`

## Privacy & Security
- Settings are stored locally using Chrome's storage API
- Only the user's messages are sent to the Gemini API
- No page content or personal data is transmitted
- All accessibility modifications are applied locally

## Future Enhancements
- WCAG compliance checker
- More accessibility functions
- Custom accessibility profiles
- Export/import settings
- Accessibility reports
- Agentic web navigation
