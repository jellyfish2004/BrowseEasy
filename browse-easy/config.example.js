// Template for configuration values
// Copy this file to config.js and replace with your actual values
const config = {
  GEMINI_API_KEY: 'your-api-key-here',
  SARVAM_API_KEY: 'your-api-key-here'
}; 

// Make available to both window context and service worker context
if (typeof window !== 'undefined') {
  window.config = config;
} 