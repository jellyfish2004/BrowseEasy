class AccessibilityManager {
  constructor() {
    this.appliedStyles = [];
    this.originalStyles = new Map();
    this.observers = [];
    this.captionsEnabled = false;
    this.captionOverlay = null;
    this.activeMediaElements = new Set();
    this.mediaContexts = new Map();
    this.captionText = '';
    this.captionTimeout = null;
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

  // 11. Live Captions
  liveCaptions(enabled) {
    console.log('[BrowseEasy] liveCaptions called with enabled:', enabled);
    if (enabled) {
      this.enableLiveCaptions();
    } else {
      this.disableLiveCaptions();
    }
  }

  enableLiveCaptions() {
    if (this.captionsEnabled) {
      console.log('[BrowseEasy] Live captions already enabled, skipping');
      return;
    }
    
    console.log('[BrowseEasy] Enabling live captions');
    this.captionsEnabled = true;
    
    // Check for API key
    if (!window.config || !window.config.SARVAM_API_KEY) {
      console.error('[BrowseEasy] Sarvam API key not found - live captions will not work');
      return;
    }
    console.log('[BrowseEasy] Sarvam API key found');
    
    // Create shared AudioContext for audio conversion
    if (!this.captionAudioContext) {
      this.captionAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[BrowseEasy] Created shared AudioContext for captions');
    }
    
    // Create caption overlay
    this.createCaptionOverlay();
    
    // Find and monitor all audio/video elements
    this.monitorMediaElements();
  }

  disableLiveCaptions() {
    if (!this.captionsEnabled) return;
    
    console.log('[BrowseEasy] Disabling live captions');
    this.captionsEnabled = false;
    
    // Remove caption overlay
    if (this.captionOverlay) {
      this.captionOverlay.remove();
      this.captionOverlay = null;
    }
    
    // Close shared AudioContext
    if (this.captionAudioContext && this.captionAudioContext.state !== 'closed') {
      this.captionAudioContext.close();
      this.captionAudioContext = null;
      console.log('[BrowseEasy] Closed shared AudioContext for captions');
    }
    
    // Stop monitoring media elements
    this.stopMonitoringMedia();
    
    // Clear any timeouts
    if (this.captionTimeout) {
      clearTimeout(this.captionTimeout);
      this.captionTimeout = null;
    }
  }

  createCaptionOverlay() {
    console.log('[BrowseEasy] Creating caption overlay');
    
    // Remove existing overlay if any
    if (this.captionOverlay) {
      console.log('[BrowseEasy] Removing existing caption overlay');
      this.captionOverlay.remove();
    }
    
    this.captionOverlay = document.createElement('div');
    this.captionOverlay.id = 'browse-easy-live-captions';
    this.captionOverlay.style.cssText = `
      position: fixed !important;
      bottom: 60px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.8) !important;
      color: white !important;
      font-family: Arial, sans-serif !important;
      font-size: 24px !important;
      font-weight: normal !important;
      line-height: 1.4 !important;
      padding: 12px 20px !important;
      border-radius: 6px !important;
      max-width: 80% !important;
      text-align: center !important;
      z-index: 999999 !important;
      pointer-events: none !important;
      display: none !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    `;
    
    document.body.appendChild(this.captionOverlay);
    console.log('[BrowseEasy] Caption overlay created and added to body');
    
    // Test caption overlay by showing a test message
    this.captionOverlay.textContent = 'Live captions enabled - play audio/video to see captions';
    this.captionOverlay.style.display = 'block';
    setTimeout(() => {
      if (this.captionOverlay) {
        this.captionOverlay.style.display = 'none';
      }
    }, 3000);
  }

  monitorMediaElements() {
    console.log('[BrowseEasy] Starting to monitor media elements');
    
    // Find existing media elements
    const mediaElements = document.querySelectorAll('audio, video');
    console.log(`[BrowseEasy] Found ${mediaElements.length} existing media elements:`, 
                Array.from(mediaElements).map(el => ({
                  tag: el.tagName,
                  src: el.src || el.currentSrc,
                  paused: el.paused,
                  readyState: el.readyState
                })));
    
    mediaElements.forEach(media => this.attachMediaCapture(media));
    
    // Monitor for new media elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
              console.log('[BrowseEasy] New media element detected:', node.tagName, node.src);
              this.attachMediaCapture(node);
            }
            // Also check children
            const childMedia = node.querySelectorAll && node.querySelectorAll('audio, video');
            if (childMedia && childMedia.length > 0) {
              console.log(`[BrowseEasy] Found ${childMedia.length} child media elements`);
              childMedia.forEach(media => this.attachMediaCapture(media));
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    this.observers.push(observer);
    console.log('[BrowseEasy] Media element observer set up');
  }

  async attachMediaCapture(mediaElement) {
    if (this.activeMediaElements.has(mediaElement)) {
      console.log('[BrowseEasy] Media element already has capture attached, skipping:', mediaElement.src || mediaElement.currentSrc);
      return;
    }
    
    console.log('[BrowseEasy] Attaching caption capture to media element:', {
      tag: mediaElement.tagName,
      src: mediaElement.src || mediaElement.currentSrc,
      paused: mediaElement.paused,
      readyState: mediaElement.readyState,
      crossOrigin: mediaElement.crossOrigin
    });
    
    try {
      // Wait for media to be ready
      if (mediaElement.readyState < 2) {
        console.log('[BrowseEasy] Waiting for media metadata to load...');
        await new Promise((resolve, reject) => {
          const handler = () => {
            console.log('[BrowseEasy] Media metadata loaded');
            mediaElement.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          const errorHandler = (e) => {
            console.error('[BrowseEasy] Media load error:', e);
            mediaElement.removeEventListener('error', errorHandler);
            reject(e);
          };
          mediaElement.addEventListener('loadedmetadata', handler);
          mediaElement.addEventListener('error', errorHandler);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            mediaElement.removeEventListener('loadedmetadata', handler);
            mediaElement.removeEventListener('error', errorHandler);
            reject(new Error('Timeout waiting for media metadata'));
          }, 10000);
        });
      }
      
      console.log('[BrowseEasy] Creating audio context and source...');
      
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[BrowseEasy] Audio context state:', audioContext.state);
      
      const source = audioContext.createMediaElementSource(mediaElement);
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      // Connect: source -> gain -> destination (speakers)
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Also connect to analyser for monitoring
      source.connect(analyser);
      
      console.log('[BrowseEasy] Audio routing set up successfully');
      
      // Store context info
      this.mediaContexts.set(mediaElement, {
        audioContext,
        source,
        analyser,
        gainNode,
        mediaRecorder: null
      });
      
      this.activeMediaElements.add(mediaElement);
      
      // Start capturing when media plays
      mediaElement.addEventListener('play', () => {
        console.log('[BrowseEasy] Media play event fired');
        this.startCapturing(mediaElement);
      });
      mediaElement.addEventListener('pause', () => {
        console.log('[BrowseEasy] Media pause event fired');
        this.stopCapturing(mediaElement);
      });
      mediaElement.addEventListener('ended', () => {
        console.log('[BrowseEasy] Media ended event fired');
        this.stopCapturing(mediaElement);
      });
      
      console.log('[BrowseEasy] Successfully attached capture to media element');
      
      // If media is already playing, start capturing
      if (!mediaElement.paused) {
        console.log('[BrowseEasy] Media is already playing, starting capture immediately');
        this.startCapturing(mediaElement);
      }
      
    } catch (error) {
      console.error('[BrowseEasy] Failed to attach caption capture:', error);
    }
  }

  async startCapturing(mediaElement) {
    if (!this.captionsEnabled) return;
    
    const context = this.mediaContexts.get(mediaElement);
    if (!context) return;
    
    console.log('[BrowseEasy] Starting direct audio capture for captions (bypassing MediaRecorder)');
    
    try {
      // Create ScriptProcessorNode for direct audio capture
      const bufferSize = 4096;
      const processor = context.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      // Connect source to processor
      context.source.connect(processor);
      processor.connect(context.audioContext.destination);
      
      // Store audio samples
      context.audioSamples = [];
      context.sampleRate = context.audioContext.sampleRate;
      
      let lastProcessTime = Date.now();
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Copy samples to our buffer
        const samples = new Float32Array(inputData.length);
        samples.set(inputData);
        context.audioSamples.push(samples);
        
        // Process every 5 seconds
        const now = Date.now();
        if (now - lastProcessTime >= 5000) {
          this.processDirectAudioSamples(context);
          lastProcessTime = now;
        }
      };
      
      context.processor = processor;
      console.log('[BrowseEasy] Direct audio capture started with ScriptProcessorNode');
      
    } catch (error) {
      console.error('[BrowseEasy] Failed to start direct audio capture:', error);
    }
  }

  async processDirectAudioSamples(context) {
    if (!context.audioSamples || context.audioSamples.length === 0) return;
    
    try {
      console.log('[BrowseEasy] Processing', context.audioSamples.length, 'audio sample chunks');
      
      // Calculate total length
      const totalLength = context.audioSamples.reduce((sum, chunk) => sum + chunk.length, 0);
      
      // Combine all samples into one buffer
      const combinedSamples = new Float32Array(totalLength);
      let offset = 0;
      
      for (const chunk of context.audioSamples) {
        combinedSamples.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Create AudioBuffer
      const audioBuffer = context.audioContext.createBuffer(1, totalLength, context.sampleRate);
      audioBuffer.getChannelData(0).set(combinedSamples);
      
      // Convert directly to WAV
      const wavBlob = this.audioBufferToWav(audioBuffer);
      console.log('[BrowseEasy] Created WAV from direct samples, size:', wavBlob.size);
      
      // Process with API
      await this.processAudioChunk(wavBlob);
      
      // Clear processed samples, keep only recent ones
      const keepSamples = Math.floor(context.audioSamples.length / 3);
      context.audioSamples = context.audioSamples.slice(-keepSamples);
      
    } catch (error) {
      console.error('[BrowseEasy] Error processing direct audio samples:', error);
    }
  }

  stopCapturing(mediaElement) {
    const context = this.mediaContexts.get(mediaElement);
    if (!context || !context.processor) return;
    
    console.log('[BrowseEasy] Stopping direct audio capture for captions');
    
    try {
      // Disconnect processor
      context.source.disconnect(context.processor);
      context.processor.disconnect();
      context.processor = null;
      
      // Clear accumulated samples
      context.audioSamples = [];
    } catch (error) {
      console.warn('[BrowseEasy] Error stopping audio processor:', error);
    }
  }

  async processAudioChunk(wavBlob) {
    try {
      console.log('[BrowseEasy] Processing WAV audio chunk, size:', wavBlob.size, 'bytes');
      
      // Validate that it's actually a WAV file
      if (wavBlob.type !== 'audio/wav' && wavBlob.size < 44) {
        console.warn('[BrowseEasy] Invalid WAV file, skipping');
        return;
      }
      
      console.log('[BrowseEasy] Calling Sarvam ASR API with WAV file...');
      
      // Call Sarvam ASR API with FormData
      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');
      formData.append('model', 'saaras:v2');
      
      const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
        method: 'POST',
        headers: {
          'api-subscription-key': window.config?.SARVAM_API_KEY
        },
        body: formData
      });
      
      console.log('[BrowseEasy] ASR API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[BrowseEasy] ASR API response:', result);
        
        if (result.transcript && result.transcript.trim()) {
          console.log('[BrowseEasy] Got transcript:', result.transcript.trim());
          this.displayCaption(result.transcript.trim());
        } else {
          console.log('[BrowseEasy] No transcript in response or empty transcript');
        }
      } else {
        const errorText = await response.text();
        console.error('[BrowseEasy] ASR API error:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('[BrowseEasy] Error processing audio for captions:', error);
    }
  }

  // Convert audio blob to WAV format for Sarvam API compatibility
  async convertToWav(audioBlob) {
    try {
      // Validate input
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid or empty audio blob');
      }
      
      console.log('[BrowseEasy] Converting audio blob to WAV, original size:', audioBlob.size, 'type:', audioBlob.type);
      
      // If already WAV format, return as is
      if (audioBlob.type === 'audio/wav' || audioBlob.type === 'audio/wave') {
        console.log('[BrowseEasy] Audio already in WAV format, no conversion needed');
        return audioBlob;
      }
      
      // Get array buffer from blob
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Failed to get array buffer from audio blob');
      }
      
      console.log('[BrowseEasy] Array buffer size:', arrayBuffer.byteLength);
      
      // Use shared audio context or create new one if not available
      let audioContext = this.captionAudioContext;
      let shouldCloseContext = false;
      
      if (!audioContext || audioContext.state === 'closed') {
        console.log('[BrowseEasy] Creating temporary AudioContext for conversion');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        shouldCloseContext = true;
      }
      
      console.log('[BrowseEasy] AudioContext state:', audioContext.state);
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        console.log('[BrowseEasy] Resuming AudioContext');
        await audioContext.resume();
      }
      
      // Decode audio data
      console.log('[BrowseEasy] Decoding audio data...');
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice()); // Create a copy
      
      console.log('[BrowseEasy] Audio decoded successfully:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      // Convert to WAV
      const wavBlob = this.audioBufferToWav(audioBuffer);
      
      // Close temporary context if we created one
      if (shouldCloseContext) {
        audioContext.close();
      }
      
      console.log('[BrowseEasy] WAV conversion complete, size:', wavBlob.size);
      return wavBlob;
    } catch (error) {
      console.error('[BrowseEasy] Error converting audio to WAV:', error);
      console.error('[BrowseEasy] Audio blob details:', {
        size: audioBlob?.size,
        type: audioBlob?.type
      });
      throw error;
    }
  }

  // Convert AudioBuffer to WAV Blob (adapted from audio_input.js)
  audioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        len = buffer.length * numOfChan * 2 + 44, // 2 bytes per sample
        arrBuffer = new ArrayBuffer(len),
        view = new DataView(arrBuffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    // Write WAV container info
    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    setUint32(0x46464952); // "RIFF"
    setUint32(len - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this version)

    setUint32(0x61746164); // "data" - chunk
    setUint32(len - pos - 4); // chunk length

    // Write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < len) {
        for (i = 0; i < numOfChan; i++) { // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767); // scale to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++; // next source sample
    }
    
    return new Blob([arrBuffer], { type: 'audio/wav' });
  }

  displayCaption(text) {
    console.log('[BrowseEasy] displayCaption called with text:', text);
    
    if (!this.captionOverlay) {
      console.error('[BrowseEasy] Caption overlay not found!');
      return;
    }
    
    if (!this.captionsEnabled) {
      console.warn('[BrowseEasy] Captions disabled, not displaying');
      return;
    }
    
    // Update caption text
    this.captionText = text;
    this.captionOverlay.textContent = text;
    this.captionOverlay.style.display = 'block';
    
    console.log('[BrowseEasy] Caption displayed:', text);
    
    // Clear existing timeout
    if (this.captionTimeout) {
      clearTimeout(this.captionTimeout);
    }
    
    // Hide caption after 5 seconds of no new text
    this.captionTimeout = setTimeout(() => {
      if (this.captionOverlay) {
        console.log('[BrowseEasy] Hiding caption after timeout');
        this.captionOverlay.style.display = 'none';
      }
    }, 5000);
  }

  stopMonitoringMedia() {
    console.log('[BrowseEasy] Stopping media monitoring');
    
    // Stop all media recorders
    this.mediaContexts.forEach((context, mediaElement) => {
      if (context.mediaRecorder) {
        try {
          context.mediaRecorder.stop();
        } catch (e) {
          console.warn('[BrowseEasy] Error stopping recorder:', e);
        }
      }
      
      // Close audio context
      if (context.audioContext && context.audioContext.state !== 'closed') {
        context.audioContext.close();
      }
    });
    
    // Clear collections
    this.activeMediaElements.clear();
    this.mediaContexts.clear();
    console.log('[BrowseEasy] Media monitoring stopped and cleaned up');
  }

  // Debug function - call from console: window.browseEasyManager.debugCaptions()
  debugCaptions() {
    console.log('[BrowseEasy Debug] Caption state:', {
      captionsEnabled: this.captionsEnabled,
      overlayExists: !!this.captionOverlay,
      overlayInDOM: this.captionOverlay ? document.body.contains(this.captionOverlay) : false,
      activeMediaCount: this.activeMediaElements.size,
      mediaContextsCount: this.mediaContexts.size,
      observersCount: this.observers.length,
      apiKeyExists: !!(window.config && window.config.SARVAM_API_KEY)
    });
    
    if (this.captionOverlay) {
      console.log('[BrowseEasy Debug] Overlay styles:', this.captionOverlay.style.cssText);
    }
    
    // Test caption display
    if (this.captionsEnabled && this.captionOverlay) {
      this.displayCaption('Test caption - if you see this, captions are working!');
    }
    
    return 'Debug info logged to console';
  }

  // Helper to convert image to base64 with proper MIME type detection and resizing
  async getImageBase64(img) {
    try {
      // First try to fetch the image to get proper MIME type and avoid CORS issues
      const response = await fetch(img.src);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      
      const contentType = response.headers.get('content-type') || 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to blob and create object URL
      const blob = new Blob([arrayBuffer], { type: contentType });
      const imageUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const imgEl = new Image();
        imgEl.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            
            // Resize image to reduce token costs (max 512px width/height)
            const maxSize = 512;
            let { width, height } = imgEl;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height * maxSize) / width;
                width = maxSize;
              } else {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgEl, 0, 0, width, height);
            
            // Convert to base64 with proper MIME type
            const dataURL = canvas.toDataURL(contentType, 0.8); // 0.8 quality for compression
            const base64 = dataURL.split(',')[1];
            
            URL.revokeObjectURL(imageUrl);
            resolve({ base64, mimeType: contentType });
          } catch (canvasError) {
            URL.revokeObjectURL(imageUrl);
            reject(canvasError);
          }
        };
        imgEl.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        imgEl.src = imageUrl;
      });
    } catch (fetchError) {
      // Fallback to direct canvas approach for same-origin images
      return new Promise((resolve, reject) => {
        const imgEl = new Image();
        imgEl.crossOrigin = 'Anonymous';
        imgEl.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            
            // Resize image to reduce token costs
            const maxSize = 512;
            let { width, height } = imgEl;
            
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height * maxSize) / width;
                width = maxSize;
              } else {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgEl, 0, 0, width, height);
            
            // Default to PNG if we can't determine MIME type
            const dataURL = canvas.toDataURL('image/png', 0.8);
            const base64 = dataURL.split(',')[1];
            
            resolve({ base64, mimeType: 'image/png' });
          } catch (canvasError) {
            reject(canvasError);
          }
        };
        imgEl.onerror = () => reject(new Error('Failed to load image with CORS'));
        imgEl.src = img.src;
      });
    }
  }

  // Generate alt text for images without alt, and return results (skipping tainted images)
  async generateAltTextForImages() {
    const images = Array.from(document.querySelectorAll('img'));
    const missingAltImages = images.filter(img => !img.hasAttribute('alt') || img.alt.trim() === '');
    const results = [];
    const skipped = [];
    
    console.log(`[BrowseEasy] Found ${missingAltImages.length} images missing alt text`);
    
    for (const img of missingAltImages) {
      try {
        console.log(`[BrowseEasy] Processing image: ${img.src}`);
        const imageData = await this.getImageBase64(img);
        
        const altText = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'generateAltText',
            imgBase64: imageData.base64,
            mimeType: imageData.mimeType,
            originalSrc: img.src
          }, (response) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (response && response.altText) resolve(response.altText);
            else reject(new Error('No alt text returned'));
          });
        });
        
        if (altText && altText.trim()) {
          img.alt = altText.trim();
          results.push({ src: img.src, alt: altText.trim() });
          console.log(`[BrowseEasy] Generated alt text for ${img.src}: "${altText}"`);
        } else {
          console.warn(`[BrowseEasy] Empty alt text returned for ${img.src}`);
          skipped.push(img.src);
        }
      } catch (e) {
        console.warn(`[BrowseEasy] Failed to process image ${img.src}:`, e.message);
        skipped.push(img.src);
      }
    }
    
    // Send results and skipped to panel for chat display
    chrome.runtime.sendMessage({ type: 'altTextResults', results, skipped });
    console.log(`[BrowseEasy] Alt text generation complete: ${results.length} processed, ${skipped.length} skipped`);
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
    this.liveCaptions(settings.liveCaptions);
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
    
    // Disable live captions (this will also close the AudioContext)
    this.disableLiveCaptions();
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
      case 'liveCaptions':
        this.liveCaptions(parameters.enabled);
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