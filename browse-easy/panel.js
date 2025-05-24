const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');

inputEl.addEventListener('keydown', async e => {
  if (e.key !== 'Enter' || !inputEl.value.trim()) return;
  const userMsg = inputEl.value.trim();
  append('user', userMsg);
  inputEl.value = '';
  inputEl.disabled = true;
  
  try {
    const response = await sendToGemini(userMsg);
    append('bot', response);
  } catch (err) {
    append('error', err.toString());
  } finally {
    inputEl.disabled = false;
    inputEl.focus();
  }
});

async function sendToGemini(userMessage) {
  const systemPrompt = `You are BrowseEasy, an AI assistant that helps make web pages more accessible. You have access to tools that can modify the current webpage to improve accessibility.

Available tools:
- highlightLinks: Highlight all links with yellow background
- dyslexiaFriendly: Make text dyslexia-friendly with better fonts and spacing
- scaleWebsite: Scale the website up or down (50-300%)
- hideImages: Hide all images and videos
- adjustCursorSize: Make cursor larger or smaller (50-300%)
- muteSound: Mute all audio and video
- adjustTextSpacing: Adjust text spacing and line height (50-300%)
- highlightOnHover: Highlight elements when hovering
- enlargeButtons: Make buttons larger and more visible
- addTooltips: Add helpful tooltips to elements
- adjustContrast: Adjust page contrast (50-300%)

When users ask for accessibility improvements, use the appropriate tools. For example:
- "Make this more readable" → use dyslexiaFriendly, adjustTextSpacing, possibly scaleWebsite
- "I can't see the links" → use highlightLinks
- "The text is too small" → use scaleWebsite
- "Make the buttons bigger" → use enlargeButtons
- "This is too bright" → use adjustContrast
- "Hide distracting images" → use hideImages

Always explain what you're doing and be helpful in suggesting other accessibility improvements.

User request: ${userMessage}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt
          }
        ]
      }
    ],
    tools: [
      {
        function_declarations: ACCESSIBILITY_TOOLS
      }
    ]
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.config.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No response from AI');
  }

  // Check if the AI wants to use tools
  const functionCalls = candidate.content?.parts?.filter(part => part.functionCall);
  
  if (functionCalls && functionCalls.length > 0) {
    // Execute the function calls
    let toolResults = [];
    
    for (const functionCall of functionCalls) {
      try {
        const result = await executeAccessibilityTool(
          functionCall.functionCall.name,
          functionCall.functionCall.args
        );
        toolResults.push({
          name: functionCall.functionCall.name,
          success: true,
          result: result
        });
      } catch (error) {
        toolResults.push({
          name: functionCall.functionCall.name,
          success: false,
          error: error.message
        });
      }
    }

    // Get the text response
    const textPart = candidate.content?.parts?.find(part => part.text);
    let response = textPart?.text || '';

    // Add information about executed tools
    if (toolResults.length > 0) {
      const toolMessages = toolResults.map(result => {
        if (result.success) {
          return `✅ Applied ${result.name}`;
        } else {
          return `❌ Failed to apply ${result.name}: ${result.error}`;
        }
      });
      
      if (response) {
        response += '\n\n' + toolMessages.join('\n');
      } else {
        response = toolMessages.join('\n');
      }
    }

    return response || 'Accessibility adjustments applied!';
  } else {
    // Regular text response
    const textPart = candidate.content?.parts?.find(part => part.text);
    return textPart?.text || 'I can help you make this page more accessible. Try asking me to make it more readable, highlight links, or adjust the size!';
  }
}

function append(type, text) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Add some quick accessibility commands
document.addEventListener('DOMContentLoaded', () => {
  append('bot', '👋 Hi! I\'m BrowseEasy, your accessibility assistant. I can help make web pages easier to read and navigate. Try saying:\n\n• "Make this more readable"\n• "Highlight the links"\n• "Make the text bigger"\n• "Hide images"\n• "Make buttons larger"\n\nWhat would you like me to help with?');
});
