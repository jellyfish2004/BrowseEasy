/**
 * BrowseEasy Test Utilities
 * Shared functions and helpers for testing
 */

class TestUtils {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  // Test result logging
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const result = { timestamp, type, message };
    this.results.push(result);
    
    const color = {
      'pass': 'color: green',
      'fail': 'color: red', 
      'info': 'color: blue',
      'warn': 'color: orange'
    }[type] || '';
    
    console.log(`%c[${type.toUpperCase()}] ${message}`, color);
    return result;
  }

  // Test assertions
  assert(condition, message) {
    if (condition) {
      this.log(`✅ ${message}`, 'pass');
      return true;
    } else {
      this.log(`❌ ${message}`, 'fail');
      return false;
    }
  }

  assertEqual(actual, expected, message) {
    const condition = actual === expected;
    const detail = condition ? '' : ` (got: ${actual}, expected: ${expected})`;
    return this.assert(condition, `${message}${detail}`);
  }

  assertNotEqual(actual, notExpected, message) {
    const condition = actual !== notExpected;
    const detail = condition ? '' : ` (both values are: ${actual})`;
    return this.assert(condition, `${message}${detail}`);
  }

  assertTrue(value, message) {
    return this.assert(value === true, message);
  }

  assertFalse(value, message) {
    return this.assert(value === false, message);
  }

  // DOM testing helpers
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Style testing helpers
  getComputedStyle(element, property) {
    return window.getComputedStyle(element).getPropertyValue(property);
  }

  hasClass(element, className) {
    return element.classList.contains(className);
  }

  // Extension testing helpers
  async sendMessageToExtension(message) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.sendMessage) {
        reject(new Error('Chrome extension API not available'));
        return;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Test data generators
  generateTestElements() {
    const container = document.createElement('div');
    container.id = 'test-container';
    container.innerHTML = `
      <h1>Test Heading</h1>
      <p>Test paragraph with <a href="#" id="test-link">test link</a></p>
      <button id="test-button">Test Button</button>
      <input id="test-input" type="text" placeholder="Test input" />
      <img id="test-image" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Test image" />
      <video id="test-video" controls style="width: 200px;">
        <source src="data:video/mp4;base64," type="video/mp4">
      </video>
    `;
    document.body.appendChild(container);
    return container;
  }

  cleanupTestElements() {
    const container = document.getElementById('test-container');
    if (container) {
      container.remove();
    }
  }

  // Test suite runner
  async runTestSuite(tests, suiteName = 'Test Suite') {
    this.log(`Starting ${suiteName}`, 'info');
    const startTime = Date.now();
    let passed = 0;
    let failed = 0;

    for (const [testName, testFn] of Object.entries(tests)) {
      this.log(`Running ${testName}...`, 'info');
      try {
        const result = await testFn();
        if (result !== false) {
          passed++;
          this.log(`${testName} passed`, 'pass');
        } else {
          failed++;
          this.log(`${testName} failed`, 'fail');
        }
      } catch (error) {
        failed++;
        this.log(`${testName} threw error: ${error.message}`, 'fail');
      }
    }

    const duration = Date.now() - startTime;
    const total = passed + failed;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    this.log(`${suiteName} completed: ${passed}/${total} passed (${percentage}%) in ${duration}ms`, 
              passed === total ? 'pass' : 'fail');

    return {
      suiteName,
      passed,
      failed,
      total,
      percentage,
      duration,
      results: this.results
    };
  }

  // Generate test report
  generateReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.type === 'pass').length;
    const failed = this.results.filter(r => r.type === 'fail').length;
    const duration = Date.now() - this.startTime;

    return {
      summary: {
        total,
        passed,
        failed,
        percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
        duration
      },
      results: this.results
    };
  }

  // Visual test helpers
  highlightElement(element, color = 'red', duration = 2000) {
    const originalOutline = element.style.outline;
    element.style.outline = `3px solid ${color}`;
    
    setTimeout(() => {
      element.style.outline = originalOutline;
    }, duration);
  }

  // Performance testing
  measurePerformance(fn, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      const end = performance.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      average: avg,
      minimum: min,
      maximum: max,
      iterations,
      times
    };
  }
}

// Global test instance
window.testUtils = new TestUtils();

// Convenience functions
window.assert = (condition, message) => testUtils.assert(condition, message);
window.assertEqual = (actual, expected, message) => testUtils.assertEqual(actual, expected, message);
window.assertNotEqual = (actual, notExpected, message) => testUtils.assertNotEqual(actual, notExpected, message);
window.assertTrue = (value, message) => testUtils.assertTrue(value, message);
window.assertFalse = (value, message) => testUtils.assertFalse(value, message);

console.log('🧪 BrowseEasy Test Utils loaded'); 