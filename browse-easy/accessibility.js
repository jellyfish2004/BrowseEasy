class AccessibilityManager {
  constructor() {
    this.appliedStyles = [];
    this.originalStyles = new Map();
    this.observers = [];
  }

  // Helper function to create and inject CSS
  injectCSS(css, id) {
    this.removeCSS(id);
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
    this.appliedStyles.push(id);
  }

  // Helper function to remove CSS
  removeCSS(id) {
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
      existingStyle.remove();
      this.appliedStyles = this.appliedStyles.filter(styleId => styleId !== id);
    }
  }

  // 1. Highlight Links
  highlightLinks(enabled) {
    const id = 'browse-easy-highlight-links';
    if (enabled) {
      const css = `
        a, a:visited {
          position: relative !important;
          background-color: yellow !important;
          color: black !important;
          text-decoration: underline !important;
          border: 2px solid #ff6600 !important;
          padding: 2px !important;
          z-index: 10001 !important;
          text-shadow: none !important;
        }
        /* For links with white or gray text, use a blue background and white text */
        a.browse-easy-link-blue, a.browse-easy-link-blue:visited {
          background-color: #1976d2 !important;
          color: #fff !important;
          border: 2px solid #ff6600 !important;
          text-shadow: 0 1px 6px #000, 0 0 2px #fff;
        }
      `;
      this.injectCSS(css, id);
      // Add the class to links with white or gray text (brightness > 180)
      document.querySelectorAll('a, a:visited').forEach(link => {
        const style = window.getComputedStyle(link);
        const color = style.color;
        // Parse rgb/rgba/hex
        let r, g, b;
        if (color.startsWith('rgb')) {
          [r, g, b] = color.match(/\d+/g).map(Number);
        } else if (color.startsWith('#')) {
          if (color.length === 4) {
            r = parseInt(color[1] + color[1], 16);
            g = parseInt(color[2] + color[2], 16);
            b = parseInt(color[3] + color[3], 16);
          } else if (color.length === 7) {
            r = parseInt(color.slice(1, 3), 16);
            g = parseInt(color.slice(3, 5), 16);
            b = parseInt(color.slice(5, 7), 16);
          }
        }
        // If the color is white or gray (brightness > 180), use blue highlight
        if (typeof r !== 'undefined' && typeof g !== 'undefined' && typeof b !== 'undefined') {
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 180) {
            link.classList.add('browse-easy-link-blue');
          } else {
            link.classList.remove('browse-easy-link-blue');
          }
        }
      });
    } else {
      this.removeCSS(id);
      // Remove the special class from all links
      document.querySelectorAll('a.browse-easy-link-blue').forEach(link => {
        link.classList.remove('browse-easy-link-blue');
      });
    }
  }

  // 2. Dyslexia Friendly Text
  dyslexiaFriendly(enabled) {
    const id = 'browse-easy-dyslexia-friendly';
    const textElementsSelector = 'p, div, span, li, a, article, section, main, aside, header, footer, caption, td, th, label, h1, h2, h3, h4, h5, h6';
    if (enabled) {
      const css = `
        ${textElementsSelector} {
          font-family: 'Arial', 'Helvetica', sans-serif !important;
          line-height: 1.6 !important; /* Slightly increased default line-height */
          letter-spacing: 0.12em !important; /* Slightly increased default letter-spacing */
          word-spacing: 0.2em !important;
          /* text-align: left !important; /* Removing this to respect original alignment more often */
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 3. Scale Website
  scaleWebsite(scale) {
    const id = 'browse-easy-scale';
    if (scale !== 100) {
      const zoomLevel = scale / 100;
      const css = `
        body {
          zoom: ${zoomLevel} !important;
          transform-origin: top left !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 4. Hide Images
  hideImages(enabled) {
    const id = 'browse-easy-hide-images';
    if (enabled) {
      const css = `
        img, svg, picture, video {
          display: none !important;
        }
        div[style*="background-image"] {
          background-image: none !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 5. Cursor Size
  adjustCursorSize(size) {
    const id = 'browse-easy-cursor-size';
    if (size !== 100) {
      const cursorSize = Math.max(16, size * 0.32); // Convert percentage to pixels
      const css = `
        * {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 32 32"><path d="M8 2l6 20 4-8 8-4z" fill="black"/><path d="M8 2l6 20 4-8 8-4z" fill="white" stroke="black" stroke-width="1"/></svg>'), auto !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 6. Mute Sound
  muteSound(enabled) {
    if (enabled) {
      document.querySelectorAll('audio, video').forEach(el => {
        el.muted = true;
      });
      // Observe for new audio/video elements
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.tagName === 'AUDIO' || node.tagName === 'VIDEO')) {
              node.muted = true;
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
      this.observers.push(observer);
    } else {
      document.querySelectorAll('audio, video').forEach(el => {
        el.muted = false;
      });
      this.observers.forEach(observer => observer.disconnect());
      this.observers = [];
    }
  }

  // 7. Highlight on Hover
  highlightOnHover(enabled) {
    const id = 'browse-easy-highlight-hover';
    if (enabled) {
      // Accessible, visually appealing hover effect
      const css = `
        a:not([href=""]):not([href="#"]):hover,
        button:not([disabled]):hover,
        input:not([disabled]):not([type="hidden"]):hover,
        select:not([disabled]):hover,
        textarea:not([disabled]):hover,
        [role="button"]:not([aria-disabled="true"]):hover,
        [role="link"]:not([aria-disabled="true"]):hover,
        [role="checkbox"]:not([aria-disabled="true"]):hover,
        [role="radio"]:not([aria-disabled="true"]):hover,
        [role="menuitem"]:not([aria-disabled="true"]):hover,
        [role="tab"]:not([aria-disabled="true"]):hover,
        [role="option"]:not([aria-disabled="true"]):hover,
        [tabindex]:not([tabindex="-1"]):not([disabled]):hover {
          background-color: rgba(25, 118, 210, 0.92) !important; /* #1976d2 */
          outline: 3px solid #fff !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 6px rgba(25, 118, 210, 0.25), 0 0 12px 2px #1976d2 !important;
          border-radius: 8px !important;
          transition: all 0.12s cubic-bezier(.4,2,.6,1) !important;
          position: relative !important;
          z-index: 10002 !important;
          transform: scale(1.04) !important;
          color: #fff !important;
        }
        a:not([href=""]):not([href="#"]):hover {
          background-color: rgba(25, 118, 210, 0.96) !important;
          color: #fff !important;
          text-decoration: underline !important;
          text-decoration-color: #fff !important;
          text-decoration-thickness: 3px !important;
          border: none !important;
          mix-blend-mode: normal !important;
          text-shadow: 0 1px 4px #000, 0 0 2px #1976d2;
        }
        button:not([disabled]):hover,
        input[type="button"]:not([disabled]):hover,
        input[type="submit"]:not([disabled]):hover,
        input[type="reset"]:not([disabled]):hover,
        [role="button"]:not([aria-disabled="true"]):hover {
          transform: scale(1.07) !important;
          background-color: rgba(25, 118, 210, 0.92) !important;
          color: #fff !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 8. Enlarge Buttons
  enlargeButtons(enabled) {
    const id = 'browse-easy-enlarge-buttons';
    if (enabled) {
      const css = `
        button, input[type="button"], input[type="submit"], input[type="reset"], 
        a[role="button"], .btn, [role="button"] {
          min-height: 44px !important;
          min-width: 44px !important;
          padding: 12px 16px !important;
          font-size: 16px !important;
          font-weight: bold !important;
          border: 2px solid #333 !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 10. Adjust Contrast
  adjustContrast(contrast) {
    const id = 'browse-easy-contrast';
    if (contrast !== 100) {
      const contrastValue = contrast / 100;
      const css = `
        html {
          filter: contrast(${contrastValue}) !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // Helper to convert image to base64
  getImageBase64(img) {
    return new Promise((resolve, reject) => {
      const imgEl = new window.Image();
      imgEl.crossOrigin = 'Anonymous';
      imgEl.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.width;
        canvas.height = imgEl.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgEl, 0, 0);
        resolve(canvas.toDataURL('image/png').split(',')[1]); // base64 part only
      };
      imgEl.onerror = reject;
      imgEl.src = img.src;
    });
  }

  // Generate alt text for images without alt, and return results (skipping tainted images)
  async generateAltTextForImages() {
    const images = Array.from(document.querySelectorAll('img'));
    const missingAltImages = images.filter(img => !img.hasAttribute('alt') || img.alt.trim() === '');
    const results = [];
    const skipped = [];
    for (const img of missingAltImages) {
      try {
        const base64 = await this.getImageBase64(img);
        const altText = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'generateAltText',
            imgBase64: base64
          }, (response) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (response && response.altText) resolve(response.altText);
            else reject(new Error('No alt text returned'));
          });
        });
        if (altText) img.alt = altText;
        results.push({ src: img.src, alt: altText });
      } catch (e) {
        // Tainted image or other error
        skipped.push(img.src);
      }
    }
    // Send results and skipped to panel for chat display
    chrome.runtime.sendMessage({ type: 'altTextResults', results, skipped });
    return { results, skipped };
  }

  // Apply all settings
  applySettings(settings) {
    if (!settings.enabled) {
      this.clearAll();
      return;
    }

    this.highlightLinks(settings.highlightLinks);
    this.dyslexiaFriendly(settings.dyslexiaFriendly);
    this.scaleWebsite(settings.websiteScale);
    this.hideImages(settings.hideImages);
    this.adjustCursorSize(settings.cursorSize);
    this.muteSound(settings.muteSound);
    this.highlightOnHover(settings.highlightOnHover);
    this.enlargeButtons(settings.enlargeButtons);
    this.adjustContrast(settings.adjustContrast);
  }

  // Clear all modifications
  clearAll() {
    this.appliedStyles.forEach(id => this.removeCSS(id));
    this.appliedStyles = [];
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Unmute all media
    document.querySelectorAll('audio, video').forEach(el => {
      el.muted = false;
    });
    
    // Remove any tooltips we added
    document.querySelectorAll('[data-browseeasy-tooltip]').forEach(el => {
      el.removeAttribute('title');
      el.removeAttribute('data-browseeasy-tooltip');
    });
  }

  // Debug function to check what styles are currently applied
  getAppliedStyles() {
    return {
      appliedStyleIds: [...this.appliedStyles],
      activeStyleElements: this.appliedStyles.map(id => {
        const element = document.getElementById(id);
        return {
          id: id,
          exists: !!element,
          content: element ? element.textContent.substring(0, 100) + '...' : null
        };
      }),
      observersCount: this.observers.length
    };
  }

  // Force remove all BrowseEasy styles (emergency cleanup)
  forceCleanup() {
    // Remove all style elements with BrowseEasy IDs
    document.querySelectorAll('style[id*="browse-easy"]').forEach(style => {
      style.remove();
    });
    
    // Clear our tracking arrays
    this.appliedStyles = [];
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Remove tooltips
    document.querySelectorAll('[data-browseeasy-tooltip]').forEach(el => {
      el.removeAttribute('title');
      el.removeAttribute('data-browseeasy-tooltip');
    });
    
    console.log('[BrowseEasy] Force cleanup completed');
  }

  // Tool calling interface for AI integration
  executeFunction(functionName, parameters) {
    switch (functionName) {
      case 'highlightLinks':
        this.highlightLinks(parameters.enabled);
        break;
      case 'dyslexiaFriendly':
        this.dyslexiaFriendly(parameters.enabled);
        break;
      case 'scaleWebsite':
        this.scaleWebsite(parameters.scale);
        break;
      case 'hideImages':
        this.hideImages(parameters.enabled);
        break;
      case 'adjustCursorSize':
        this.adjustCursorSize(parameters.size);
        break;
      case 'muteSound':
        this.muteSound(parameters.enabled);
        break;
      case 'highlightOnHover':
        this.highlightOnHover(parameters.enabled);
        break;
      case 'enlargeButtons':
        this.enlargeButtons(parameters.enabled);
        break;
      case 'adjustContrast':
        this.adjustContrast(parameters.contrast);
        break;
      case 'generateAltTextForImages':
        this.generateAltTextForImages();
        break;
      default:
        console.warn('Unknown accessibility function:', functionName);
    }
  }
}

// Always make the class available globally for content scripts
window.AccessibilityManager = AccessibilityManager;

// Also support module exports for other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityManager;
} 