# BrowseEasy - Chrome Extension for Web Accessibility

BrowseEasy is a Chrome extension that provides AI-powered accessibility features to make web browsing easier for users with various needs.

## Features

### Core Accessibility Tools
- **Highlight Links**: Makes all links more visible with yellow background and orange borders
- **Dyslexia Friendly Text**: Applies dyslexia-friendly fonts and spacing
- **Scale Website**: Zoom in/out on entire websites (50-300%)
- **Hide Images**: Hide all images and background images for faster loading
- **Cursor Size**: Adjust cursor size for better visibility (50-300%)
- **Mute Sound**: Automatically mute all audio and video on websites
- **Text Spacing**: Adjust line height, letter spacing, and word spacing (50-300%)
- **Highlight on Hover**: Highlight interactive elements when hovering over them
- **Enlarge Buttons**: Make all buttons larger and more accessible
- **Add Tooltips**: Automatically add helpful tooltips to elements
- **Adjust Contrast**: Modify page contrast for better visibility (50-300%)
- **Generate Alt Text**: AI-powered alt text generation for images

### AI Chat Integration
- Chat with AI to apply accessibility settings using natural language
- AI can analyze page content and suggest appropriate accessibility modifications
- Settings applied through AI chat are automatically saved and persisted

### Settings Persistence
- **Automatic Persistence**: All settings are automatically saved using Chrome's sync storage
- **Cross-Tab Synchronization**: Settings changes in one tab are immediately applied to all other tabs
- **Page Reload Persistence**: Settings persist when pages are reloaded or when navigating to new pages
- **AI Chat Integration**: Settings applied through AI chat are automatically saved
- **Manual Settings**: Settings changed through the Settings tab are properly saved and applied

### Theme Options
- **Light Theme (☀️)**: Clean, bright interface with Google-style colors (default)
- **Dark Theme (🌙)**: Dark background with light text for reduced eye strain
- **High Contrast (⚫)**: Maximum contrast for accessibility with bold borders and high contrast colors
- **Theme Persistence**: Your theme preference is saved and restored when you reopen the extension
- **Smooth Transitions**: Themes switch instantly with smooth color transitions

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `browse-easy` folder
5. The extension will appear in your Chrome toolbar

## Usage

### Using the Extension Panel
1. Click the BrowseEasy icon in your Chrome toolbar
2. **Choose your theme**: Click the theme buttons (☀️ 🌙 ⚫) in the top-right corner
3. Use the **Chat** tab to interact with AI for accessibility help
4. Use the **Settings** tab to manually toggle accessibility features
5. Settings and theme preferences are automatically saved and will persist across browser sessions

### Theme Switching
- **☀️ Light Theme**: Default bright theme with clean Google-style colors
- **🌙 Dark Theme**: Dark mode for reduced eye strain in low-light conditions
- **⚫ High Contrast**: High contrast mode for users with visual impairments
- Themes can be switched instantly and your preference is saved automatically
- All UI elements (messages, settings, buttons) adapt to the selected theme

### AI Chat Commands
You can use natural language to control accessibility features:
- "Make the text larger"
- "Hide all images on this page"
- "Highlight all the links"
- "Make the cursor bigger"
- "Add tooltips to buttons"
- "Generate alt text for images"

### Settings Persistence
- Settings automatically save when changed through either the Chat or Settings tabs
- Settings sync across all browser tabs in real-time
- Settings persist when you reload pages or restart your browser
- Each website can have different settings if needed

## Troubleshooting

### Hover Highlighting Issues

If you see blue dashed outlines appearing on elements without hovering:

1. **Check Extension Status**:
   - Open browser console (F12)
   - Type: `window.browseEasyDebug.getCurrentSettings()`
   - Check if `highlightOnHover` is `true` when it should be `false`

2. **Force Cleanup**:
   - In console, type: `window.browseEasyDebug.forceCleanup()`
   - This will remove all BrowseEasy styles

3. **Check Applied Styles**:
   - In console, type: `window.browseEasyDebug.getAppliedStyles()`
   - Look for `browse-easy-highlight-hover` in the list

4. **Debug Pages**:
   - Use the test pages in the extension folder:
     - `test-current-issue.html` - Comprehensive debugging
     - `test-hover-simple.html` - Simple hover testing
     - `debug-styles.html` - Style debugging
     - `test-themes.html` - Theme switching test

5. **Manual Style Removal**:
   ```javascript
   // Remove hover highlighting styles manually
   document.getElementById('browse-easy-highlight-hover')?.remove();
   ```

### Theme Issues

1. **Theme Not Saving**:
   - Ensure Chrome sync is enabled
   - Check Chrome storage permissions
   - Try switching themes again

2. **Theme Not Loading**:
   - Reload the extension panel
   - Check browser console for errors
   - Reset to light theme by clicking the ☀️ button

### General Issues

1. **Extension Not Working**:
   - Check if the extension is enabled in `chrome://extensions/`
   - Reload the page after enabling the extension
   - Check browser console for error messages

2. **Settings Not Persisting**:
   - Ensure Chrome sync is enabled
   - Check Chrome storage permissions
   - Try clearing extension data and reconfiguring

3. **AI Chat Not Responding**:
   - Check your internet connection
   - Verify the Gemini API key is configured
   - Check browser console for API errors

## Development

### File Structure
```
browse-easy/
├── manifest.json          # Extension configuration
├── panel.html             # Extension popup UI
├── panel.js               # Main extension logic
├── content.js             # Content script for web pages
├── accessibility.js       # Accessibility features implementation
├── settings.js            # Settings management
├── tools.js               # AI tool definitions
├── background.js           # Background script
└── test-*.html            # Test and debug pages
```

### Key Components

- **AccessibilityManager**: Handles all accessibility feature implementations
- **SettingsManager**: Manages settings persistence and synchronization
- **AI Integration**: Gemini API integration for natural language processing
- **Content Script**: Injects accessibility features into web pages
- **Theme System**: CSS custom properties with data attributes for theme switching

### Testing

Use the provided test pages to verify functionality:
- `test-persistence.html` - Test settings persistence
- `test-hover.html` - Test hover highlighting
- `debug-styles.html` - Debug styling issues
- `test-current-issue.html` - Debug specific issues
- `test-themes.html` - Test theme switching functionality

### Theme Development

The theme system uses CSS custom properties (variables) with data attributes:
- Light theme: `[data-theme="light"]` (default)
- Dark theme: `[data-theme="dark"]`
- High contrast: `[data-theme="high-contrast"]`

Theme preferences are stored in Chrome storage under the key `browseEasyTheme`.

## API Integration

The extension uses Google's Gemini API for AI functionality. The API key is configured in the background script.

## Privacy

- Settings are stored locally using Chrome's sync storage
- Theme preferences are stored locally using Chrome's sync storage
- AI conversations are sent to Google's Gemini API
- No personal data is collected or stored beyond accessibility preferences

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the provided test pages
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Use the debug pages to identify the problem
3. Check browser console for error messages
4. Create an issue in the repository with debug information 