// Test file for manually adjusting accessibility settings
// You can modify these values and reload the extension to test different features

// To test features, change these values and reload the extension
const TEST_SETTINGS = {
  enabled: true,
  highlightLinks: true,          // Set to true to highlight all links
  dyslexiaFriendly: true,        // Set to true for dyslexia-friendly text
  websiteScale: 100,              // Change to 150 for 150% scale, etc.
  hideImages: true,              // Set to true to hide images
  cursorSize: 100,                // Change to 200 for larger cursor
  muteSound: false,               // Set to true to mute audio/video
  highlightOnHover: false,        // Set to true to highlight on hover
  enlargeButtons: false,          // Set to true to make buttons bigger
  addTooltips: false,             // Set to true to add tooltips
  adjustContrast: 100             // Change to 150 for higher contrast
};

// Function to apply test settings to current tab
async function applyTestSettings() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'updateSettings',
        settings: TEST_SETTINGS
      });
      console.log('Test settings applied:', response);
    }
  } catch (error) {
    console.error('Failed to apply test settings:', error);
  }
}

// Function to clear all settings
async function clearAllSettings() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'clearAll'
      });
      console.log('Settings cleared:', response);
    }
  } catch (error) {
    console.error('Failed to clear settings:', error);
  }
}

// Export functions for use in console
window.applyTestSettings = applyTestSettings;
window.clearAllSettings = clearAllSettings;
window.TEST_SETTINGS = TEST_SETTINGS;

console.log('Test settings loaded. Use applyTestSettings() to apply or clearAllSettings() to clear.');
console.log('Current test settings:', TEST_SETTINGS); 