/**
 * BrowseEasy Unit Tests
 * Tests for core functionality and utility functions
 */

// Mock Chrome APIs for testing
const mockChrome = {
  runtime: {
    sendMessage: (message, callback) => {
      // Mock successful response
      setTimeout(() => callback({ success: true, message: 'Mock response' }), 10);
    },
    lastError: null
  },
  storage: {
    local: {
      get: (keys, callback) => {
        const mockData = {
          browseEasySettings: {
            enabled: true,
            highlightLinks: false,
            dyslexiaFriendly: false,
            websiteScale: 100
          },
          browseEasyTheme: 'light'
        };
        callback(mockData);
      },
      set: (data, callback) => {
        setTimeout(() => callback && callback(), 10);
      }
    }
  }
};

// Setup mock environment if not in extension context
if (typeof chrome === 'undefined') {
  window.chrome = mockChrome;
}

/**
 * Test Suite: Core Accessibility Functions
 */
const accessibilityTests = {
  
  testSettingsValidation: () => {
    // Test valid settings object
    const validSettings = {
      enabled: true,
      highlightLinks: true,
      websiteScale: 150,
      cursorSize: 200
    };
    
    const isValid = validateSettings(validSettings);
    return assert(isValid === true, 'Valid settings should pass validation');
  },

  testSettingsValidationInvalid: () => {
    // Test invalid settings object
    const invalidSettings = {
      enabled: 'not boolean',
      websiteScale: 500, // Out of range
      cursorSize: 'invalid'
    };
    
    const isValid = validateSettings(invalidSettings);
    return assert(isValid === false, 'Invalid settings should fail validation');
  },

  testPercentageNormalization: () => {
    // Test percentage value normalization
    const testCases = [
      { input: 50, expected: 50 },
      { input: 300, expected: 300 },
      { input: 400, expected: 300 }, // Should be clamped
      { input: 10, expected: 50 },   // Should be clamped
      { input: '150', expected: 150 }, // String conversion
    ];

    let allPassed = true;
    testCases.forEach(({ input, expected }) => {
      const result = normalizePercentage(input, 50, 300);
      if (result !== expected) {
        assert(false, `normalizePercentage(${input}) expected ${expected}, got ${result}`);
        allPassed = false;
      }
    });

    return assert(allPassed, 'All percentage normalization tests should pass');
  },

  testCSSInjection: () => {
    // Test CSS injection functionality
    const testCSS = '.test { color: red; }';
    const testId = 'test-css-injection';
    
    injectCSS(testCSS, testId);
    
    const injectedStyle = document.getElementById(testId);
    const exists = injectedStyle !== null;
    const hasCorrectContent = injectedStyle && injectedStyle.textContent.includes('test');
    
    // Cleanup
    if (injectedStyle) {
      injectedStyle.remove();
    }
    
    return assert(exists && hasCorrectContent, 'CSS should be injected with correct content');
  },

  testCSSRemoval: () => {
    // Test CSS removal functionality
    const testCSS = '.test-removal { color: blue; }';
    const testId = 'test-css-removal';
    
    injectCSS(testCSS, testId);
    let styleExists = document.getElementById(testId) !== null;
    assert(styleExists, 'CSS should be injected');
    
    removeCSS(testId);
    styleExists = document.getElementById(testId) !== null;
    
    return assert(!styleExists, 'CSS should be removed after removeCSS call');
  },

  testElementSelection: () => {
    // Test element selection utilities
    const testElement = document.createElement('div');
    testElement.id = 'test-element-selection';
    testElement.className = 'test-class';
    document.body.appendChild(testElement);
    
    const byId = document.getElementById('test-element-selection');
    const byClass = document.querySelector('.test-class');
    
    const foundCorrectly = byId === testElement && byClass === testElement;
    
    // Cleanup
    testElement.remove();
    
    return assert(foundCorrectly, 'Element selection should work correctly');
  }
};

/**
 * Test Suite: Theme System
 */
const themeTests = {
  
  testThemeValidation: () => {
    const validThemes = ['light', 'dark', 'high-contrast', 'dark-high-contrast'];
    const invalidThemes = ['invalid', '', null, undefined, 123];
    
    let allValid = validThemes.every(theme => isValidTheme(theme));
    let allInvalid = invalidThemes.every(theme => !isValidTheme(theme));
    
    return assert(allValid && allInvalid, 'Theme validation should work correctly');
  },

  testThemeApplication: () => {
    // Test theme CSS generation
    const lightTheme = generateThemeCSS('light');
    const darkTheme = generateThemeCSS('dark');
    
    const lightHasCorrectColors = lightTheme.includes('--bg-primary: #ffffff');
    const darkHasCorrectColors = darkTheme.includes('--bg-primary: #1a1a1a');
    
    return assert(lightHasCorrectColors && darkHasCorrectColors, 'Theme CSS should have correct colors');
  },

  testThemePersistence: async () => {
    // Test theme saving and loading
    const testTheme = 'dark';
    
    await saveTheme(testTheme);
    const loadedTheme = await loadTheme();
    
    return assert(loadedTheme === testTheme, 'Theme should persist correctly');
  }
};

/**
 * Test Suite: AI Integration
 */
const aiTests = {
  
  testCommandParsing: () => {
    const testCommands = [
      { input: 'make this page bigger', expected: { action: 'scale', value: 150 } },
      { input: 'scale to 120%', expected: { action: 'scale', value: 120 } },
      { input: 'increase cursor size', expected: { action: 'cursor', value: 150 } },
      { input: 'set cursor to 200%', expected: { action: 'cursor', value: 200 } }
    ];
    
    let allPassed = true;
    testCommands.forEach(({ input, expected }) => {
      const result = parseAccessibilityCommand(input);
      if (result.action !== expected.action || result.value !== expected.value) {
        assert(false, `Command parsing failed for: "${input}"`);
        allPassed = false;
      }
    });
    
    return assert(allPassed, 'All command parsing tests should pass');
  },

  testDefaultValueExtraction: () => {
    const testCases = [
      { input: 'make bigger', expected: 150 },
      { input: 'make smaller', expected: 75 },
      { input: 'set to 175%', expected: 175 },
      { input: 'increase by a lot', expected: 200 }
    ];
    
    let allPassed = true;
    testCases.forEach(({ input, expected }) => {
      const result = extractPercentageOrDefault(input);
      if (result !== expected) {
        assert(false, `Default value extraction failed for: "${input}"`);
        allPassed = false;
      }
    });
    
    return assert(allPassed, 'Default value extraction should work correctly');
  }
};

/**
 * Test Suite: Performance & Memory
 */
const performanceTests = {
  
  testMemoryLeaks: () => {
    // Test for common memory leak patterns
    const initialElementCount = document.querySelectorAll('style').length;
    
    // Simulate multiple CSS injections and removals
    for (let i = 0; i < 100; i++) {
      injectCSS('.test { color: red; }', `test-leak-${i}`);
      removeCSS(`test-leak-${i}`);
    }
    
    const finalElementCount = document.querySelectorAll('style').length;
    const noMemoryLeak = finalElementCount <= initialElementCount + 1; // Allow for minor variance
    
    return assert(noMemoryLeak, 'No memory leaks should occur with CSS injection/removal');
  },

  testPerformanceImpact: () => {
    // Test performance impact of accessibility functions
    const iterations = 1000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // Simulate lightweight accessibility operations
      validateSettings({ enabled: true, websiteScale: 100 });
      isValidTheme('light');
    }
    
    const end = performance.now();
    const timePerOperation = (end - start) / iterations;
    const isPerformant = timePerOperation < 1; // Less than 1ms per operation
    
    return assert(isPerformant, `Operations should be performant (${timePerOperation.toFixed(3)}ms per op)`);
  }
};

/**
 * Test Suite: Error Handling
 */
const errorHandlingTests = {
  
  testInvalidInputHandling: () => {
    // Test graceful handling of invalid inputs
    const invalidInputs = [null, undefined, '', 'invalid', {}, []];
    
    let allHandledGracefully = true;
    invalidInputs.forEach(input => {
      try {
        validateSettings(input);
        normalizePercentage(input);
        isValidTheme(input);
      } catch (error) {
        // Functions should not throw for invalid inputs
        allHandledGracefully = false;
      }
    });
    
    return assert(allHandledGracefully, 'Invalid inputs should be handled gracefully');
  },

  testAPIErrorHandling: async () => {
    // Test handling of API errors
    const originalSendMessage = chrome.runtime.sendMessage;
    
    // Mock failing API
    chrome.runtime.sendMessage = (message, callback) => {
      chrome.runtime.lastError = { message: 'Test error' };
      callback(null);
    };
    
    let errorHandled = false;
    try {
      await sendMessageWithErrorHandling({ type: 'test' });
    } catch (error) {
      errorHandled = true;
    }
    
    // Restore original function
    chrome.runtime.sendMessage = originalSendMessage;
    chrome.runtime.lastError = null;
    
    return assert(errorHandled, 'API errors should be properly handled');
  }
};

/**
 * Utility Functions for Testing
 */
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  
  if (typeof settings.enabled !== 'undefined' && typeof settings.enabled !== 'boolean') {
    return false;
  }
  
  if (typeof settings.websiteScale !== 'undefined') {
    const scale = parseFloat(settings.websiteScale);
    if (isNaN(scale) || scale < 50 || scale > 300) return false;
  }
  
  return true;
}

function normalizePercentage(value, min = 50, max = 300) {
  const num = parseFloat(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function injectCSS(css, id) {
  removeCSS(id); // Remove existing
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

function removeCSS(id) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
}

function isValidTheme(theme) {
  const validThemes = ['light', 'dark', 'high-contrast', 'dark-high-contrast'];
  return validThemes.includes(theme);
}

function generateThemeCSS(theme) {
  const themes = {
    light: { '--bg-primary': '#ffffff', '--text-primary': '#202124' },
    dark: { '--bg-primary': '#1a1a1a', '--text-primary': '#e8eaed' }
  };
  
  const colors = themes[theme] || themes.light;
  return Object.entries(colors)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');
}

async function saveTheme(theme) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ browseEasyTheme: theme }, resolve);
  });
}

async function loadTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['browseEasyTheme'], (result) => {
      resolve(result.browseEasyTheme || 'light');
    });
  });
}

function parseAccessibilityCommand(command) {
  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('scale') || lowerCommand.includes('bigger') || lowerCommand.includes('smaller')) {
    const percentage = extractPercentageOrDefault(command);
    return { action: 'scale', value: percentage };
  }
  
  if (lowerCommand.includes('cursor')) {
    const percentage = extractPercentageOrDefault(command);
    return { action: 'cursor', value: percentage };
  }
  
  return { action: 'unknown', value: 100 };
}

function extractPercentageOrDefault(text) {
  const percentageMatch = text.match(/(\d+)%?/);
  if (percentageMatch) {
    return parseInt(percentageMatch[1]);
  }
  
  const lowerText = text.toLowerCase();
  if (lowerText.includes('bigger') || lowerText.includes('increase')) {
    return lowerText.includes('lot') ? 200 : 150;
  }
  if (lowerText.includes('smaller') || lowerText.includes('decrease')) {
    return 75;
  }
  
  return 100;
}

async function sendMessageWithErrorHandling(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Main Test Runner
 */
async function runAllUnitTests() {
  console.log('🧪 Starting BrowseEasy Unit Tests');
  
  const testSuites = [
    { name: 'Accessibility Functions', tests: accessibilityTests },
    { name: 'Theme System', tests: themeTests },
    { name: 'AI Integration', tests: aiTests },
    { name: 'Performance & Memory', tests: performanceTests },
    { name: 'Error Handling', tests: errorHandlingTests }
  ];
  
  const results = [];
  
  for (const suite of testSuites) {
    if (typeof testUtils !== 'undefined') {
      const result = await testUtils.runTestSuite(suite.tests, suite.name);
      results.push(result);
    } else {
      console.log(`Running ${suite.name}...`);
      for (const [testName, testFn] of Object.entries(suite.tests)) {
        try {
          const result = await testFn();
          console.log(`  ✅ ${testName}: ${result ? 'PASS' : 'FAIL'}`);
        } catch (error) {
          console.log(`  ❌ ${testName}: ERROR - ${error.message}`);
        }
      }
    }
  }
  
  if (typeof testUtils !== 'undefined') {
    const overallReport = testUtils.generateReport();
    console.log('📊 Unit Test Summary:', overallReport);
    return overallReport;
  }
  
  return results;
}

// Auto-run tests if in test environment
if (typeof window !== 'undefined' && window.location?.href?.includes('test')) {
  window.addEventListener('DOMContentLoaded', runAllUnitTests);
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.runAllUnitTests = runAllUnitTests;
  window.accessibilityTests = accessibilityTests;
  window.themeTests = themeTests;
  window.aiTests = aiTests;
  window.performanceTests = performanceTests;
  window.errorHandlingTests = errorHandlingTests;
}

console.log('🧪 BrowseEasy Unit Tests loaded. Run runAllUnitTests() to execute.'); 