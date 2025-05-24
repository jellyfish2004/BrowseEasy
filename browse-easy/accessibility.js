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
    if (enabled) {
      const css = `
        * {
          font-family: 'Arial', 'Helvetica', sans-serif !important;
          line-height: 1.5 !important;
          letter-spacing: 0.1em !important;
          word-spacing: 0.2em !important;
        }
        p, div, span, li {
          text-align: left !important;
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
    if (spacing !== 100) {
      const spaceMultiplier = spacing / 100;
      const css = `
        * {
          line-height: ${1.2 * spaceMultiplier} !important;
          letter-spacing: ${0.05 * spaceMultiplier}em !important;
          word-spacing: ${0.1 * spaceMultiplier}em !important;
        }
        p, div, span, li, h1, h2, h3, h4, h5, h6 {
          margin-bottom: ${10 * spaceMultiplier}px !important;
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
    if (enabled) {
      const css = `
        *:hover {
          background-color: rgba(255, 255, 0, 0.3) !important;
          outline: 2px solid #ff6600 !important;
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
    if (enabled) {
      document.querySelectorAll('img, button, a, input').forEach(el => {
        if (!el.title && !el.getAttribute('aria-label')) {
          let tooltip = '';
          if (el.tagName === 'IMG') {
            tooltip = el.alt || 'Image';
          } else if (el.tagName === 'A') {
            tooltip = el.textContent.trim() || el.href || 'Link';
          } else if (el.tagName === 'BUTTON') {
            tooltip = el.textContent.trim() || 'Button';
          } else if (el.tagName === 'INPUT') {
            tooltip = el.placeholder || el.type || 'Input field';
          }
          if (tooltip) {
            el.title = tooltip.substring(0, 100); // Limit tooltip length
          }
        }
      });
    } else {
      // Remove auto-generated tooltips (this is basic - in practice we'd need to track which ones we added)
      document.querySelectorAll('[title]').forEach(el => {
        if (el.title.length <= 100 && (
          el.title === 'Image' || 
          el.title === 'Link' || 
          el.title === 'Button' ||
          el.title.includes('Input field')
        )) {
          el.removeAttribute('title');
        }
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