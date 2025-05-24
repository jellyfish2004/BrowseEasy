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
          background-color: yellow !important;
          color: black !important;
          text-decoration: underline !important;
          border: 2px solid #ff6600 !important;
          padding: 2px !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
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

  // 7. Adjust Text Spacing
  adjustTextSpacing(spacing) {
    const id = 'browse-easy-text-spacing';
    const textElementsSelector = 'p, div, span, li, a, article, section, main, aside, header, footer, caption, td, th, label, h1, h2, h3, h4, h5, h6';
    const blockElementsSelector = 'p, div, li, article, section, main, aside, header, footer, h1, h2, h3, h4, h5, h6';

    if (spacing !== 100) {
      const spaceMultiplier = Math.max(0.5, Math.min(3, spacing / 100)); // Clamp multiplier between 0.5 and 3
      const css = `
        ${textElementsSelector} {
          line-height: calc(1.5em * ${spaceMultiplier}) !important; 
          letter-spacing: calc(0.05em * ${spaceMultiplier}) !important;
          word-spacing: calc(0.1em * ${spaceMultiplier}) !important;
        }
        ${blockElementsSelector} {
          margin-bottom: calc(1em * ${spaceMultiplier}) !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 8. Highlight on Hover
  highlightOnHover(enabled) {
    const id = 'browse-easy-highlight-hover';
    const interactiveSelector = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="tab"], [role="option"], [tabindex]';
    if (enabled) {
      const css = `
        ${interactiveSelector}:hover {
          background-color: rgba(255, 255, 0, 0.35) !important; /* Slightly more visible */
          outline: 2px solid #cc5200 !important; /* Darker orange */
          box-shadow: 0 0 5px rgba(255, 255, 0, 0.5) !important;
        }
      `;
      this.injectCSS(css, id);
    } else {
      this.removeCSS(id);
    }
  }

  // 9. Enlarge Buttons
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

  // 10. Add Tooltips
  addTooltips(enabled) {
    const tooltipMarker = 'data-browseeasy-tooltip';
    if (enabled) {
      document.querySelectorAll('img, button, a, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], [role="link"]').forEach(el => {
        if (!el.title && !el.getAttribute('aria-label') && !el.hasAttribute(tooltipMarker)) {
          let tooltip = '';
          if (el.tagName === 'IMG') {
            tooltip = el.alt || 'Image';
          } else if (el.tagName === 'A') {
            tooltip = el.textContent.trim() || el.href || 'Link';
          } else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
            tooltip = el.textContent.trim() || el.getAttribute('aria-label') || 'Button';
          } else if (el.tagName === 'INPUT') {
            tooltip = el.placeholder || el.value || el.type || 'Input field';
          }
          if (tooltip) {
            el.title = tooltip.substring(0, 150); // Limit tooltip length slightly more
            el.setAttribute(tooltipMarker, 'true');
          }
        }
      });
    } else {
      document.querySelectorAll(`[${tooltipMarker}]`).forEach(el => {
        el.removeAttribute('title');
        el.removeAttribute(tooltipMarker);
      });
    }
  }

  // 11. Adjust Contrast
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
    this.adjustTextSpacing(settings.textSpacing);
    this.highlightOnHover(settings.highlightOnHover);
    this.enlargeButtons(settings.enlargeButtons);
    this.addTooltips(settings.addTooltips);
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
      case 'adjustTextSpacing':
        this.adjustTextSpacing(parameters.spacing);
        break;
      case 'highlightOnHover':
        this.highlightOnHover(parameters.enabled);
        break;
      case 'enlargeButtons':
        this.enlargeButtons(parameters.enabled);
        break;
      case 'addTooltips':
        this.addTooltips(parameters.enabled);
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