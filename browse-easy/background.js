// Optional: ensure clicking the action opens the side panel
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);
});

// Listen for alt text generation requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'generateAltText' && message.imgBase64) {
    // Call Gemini API to generate alt text from base64 image
    (async () => {
      try {
        const apiKey = (typeof window !== 'undefined' && window.config && window.config.GEMINI_API_KEY)
          ? window.config.GEMINI_API_KEY
          : (typeof config !== 'undefined' ? config.GEMINI_API_KEY : null);
        if (!apiKey) throw new Error('Gemini API key not found');
        const prompt = `You are an expert at writing accessible alt text for images on web pages.\nWrite a concise, descriptive alt text (max 1 sentence, 10-20 words) for a visually impaired user.\nDescribe the main subject, action, and context if possible.\nDo not use generic phrases like 'image', 'picture', or 'photo'.\nReturn only the alt text, nothing else.`;
        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/png', data: message.imgBase64 } }
              ]
            }
          ]
        };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        const data = await res.json();
        let altText = '';
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          altText = data.candidates[0].content.parts[0].text;
        }
        sendResponse({ altText });
      } catch (e) {
        sendResponse({ altText: '' });
      }
    })();
    return true; // async
  }
});
