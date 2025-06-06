// Default accessibility settings
const DEFAULT_SETTINGS = {
  highlightLinks: false,
  dyslexiaFriendly: false,
  websiteScale: 100, // percentage
  hideImages: false,
  cursorSize: 100, // percentage
  muteSound: false,
  highlightOnHover: false,
  enlargeButtons: false,
  adjustContrast: 100, // percentage
  enabled: true // master toggle
};

class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = [];
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('browseEasySettings');
      this.settings = { ...DEFAULT_SETTINGS, ...result.browseEasySettings };
      return this.settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.settings;
    }
  }

  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.sync.set({ browseEasySettings: this.settings });
      this.notifyListeners();
      return this.settings;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  getSetting(key) {
    return this.settings[key];
  }

  getAllSettings() {
    return { ...this.settings };
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.settings));
  }
}

// Always make classes available globally for content scripts
window.SettingsManager = SettingsManager;
window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

// Also support module exports for other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsManager, DEFAULT_SETTINGS };
} 