# BrowseEasy Test Suite

This directory contains comprehensive tests for the BrowseEasy browser extension.

## Test Structure

### Core Feature Tests
- **accessibility-features.test.html** - Tests all accessibility functions
- **theme-system.test.html** - Tests theme switching functionality  
- **live-captions.test.html** - Tests real-time caption generation
- **ai-integration.test.html** - Tests AI-powered features
- **content-sharing.test.html** - Tests page content extraction

### Unit Tests
- **unit-tests.js** - JavaScript unit tests for core functions
- **test-utils.js** - Shared utilities and helpers for testing

### Manual Test Pages
- **manual-test-page.html** - Comprehensive page for manual testing of all features

## Key Features Being Tested

### Accessibility Features
1. **Link Highlighting** - Yellow background, orange border
2. **Dyslexia-Friendly Text** - Better fonts and spacing
3. **Website Scaling** - 50-300% zoom levels
4. **Image Hiding** - Hide/show images and videos
5. **Cursor Size** - Adjustable cursor from 50-300%
6. **Sound Control** - Mute/unmute audio/video
7. **Hover Highlighting** - Element highlighting on hover
8. **Button Enlargement** - Make buttons more visible
9. **Contrast Adjustment** - 50-300% contrast levels
10. **Alt Text Generation** - AI-powered image descriptions
11. **Live Captions** - Real-time speech-to-text for media

### UI Features
1. **Theme System** - Light, Dark, High Contrast, Dark High Contrast
2. **Panel Interface** - Extension popup functionality
3. **Settings Persistence** - Chrome storage integration
4. **Content Sharing** - Page content extraction for AI

### AI Integration
1. **Natural Language Processing** - Command interpretation
2. **Smart Defaults** - Intelligent percentage selection
3. **Image Analysis** - Alt text generation via Gemini API
4. **Speech Recognition** - Live captions via Sarvam API

## How to Run Tests

### Manual Testing
1. Load the extension in Chrome developer mode
2. Open any test HTML file in a browser tab
3. Follow the instructions on each test page
4. Verify expected behavior matches actual results

### Unit Testing
1. Open `unit-tests.js` in browser console or Node.js
2. Run individual test functions
3. Check console output for pass/fail results

### Integration Testing
1. Use `manual-test-page.html` for comprehensive testing
2. Test all features in sequence
3. Verify cross-feature compatibility

## Test Guidelines

### What to Test
- ✅ Each accessibility feature works independently
- ✅ Features work together without conflicts
- ✅ Theme switching preserves settings
- ✅ Settings persist across browser sessions
- ✅ AI integration responds correctly
- ✅ Error handling works properly
- ✅ Performance is acceptable

### What NOT to Test
- ❌ Browser-specific compatibility (focus on Chrome)
- ❌ Network connectivity issues
- ❌ Third-party API availability
- ❌ Complex edge cases unlikely in real usage

## Running Specific Tests

```bash
# To test accessibility features
open tests/accessibility-features.test.html

# To test themes
open tests/theme-system.test.html

# To run unit tests
open tests/unit-tests.js

# For comprehensive manual testing
open tests/manual-test-page.html
```

## Expected Test Coverage

- **Accessibility Functions**: 100% of 11 core features
- **Theme System**: All 4 themes with persistence
- **AI Integration**: Command parsing and API calls
- **Error Handling**: Graceful degradation
- **Performance**: No memory leaks or excessive CPU usage

## Maintenance

- Update tests when adding new features
- Keep test data minimal and focused
- Remove obsolete tests promptly
- Document any test dependencies clearly 