const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const audioModeButton = document.getElementById('audioModeButton'); // Get the new button

let chatHistory = []; // Initialize chat history
const MAX_HISTORY_MESSAGES = 10; // Max number of messages (user + bot) to keep, excluding system prompt & current query

// Listener for the new audio mode button
if (audioModeButton) {
  audioModeButton.addEventListener('click', () => {
    // Define properties for the popup window
    const popupWidth = 300;
    const popupHeight = 250;
    // Calculate position to center it (optional, browsers might handle this differently)
    const left = (screen.width / 2) - (popupWidth / 2);
    const top = (screen.height / 2) - (popupHeight / 2);

    chrome.windows.create({
      url: chrome.runtime.getURL('audio_input.html'),
      type: 'popup',
      width: popupWidth,
      height: popupHeight,
      left: Math.round(left),
      top: Math.round(top)
    });
  });
}

// Listen for messages from other parts of the extension (e.g., audio_input.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'processAudioTranscript' && message.transcript) {
    console.log('[BrowseEasy Panel] Received transcript:', message.transcript);
    append('user', message.transcript);
    // Add user message to history before sending to Gemini
    chatHistory.push({ role: "user", parts: [{ text: message.transcript }] });
    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
    }

    inputEl.value = ''; 
    inputEl.disabled = true; 

    (async () => {
      try {
        const { botResponseText, botResponseForHistory } = await sendToGemini(message.transcript);
        append('bot', botResponseText);
        // Add bot response to history
        chatHistory.push(botResponseForHistory);
        if (chatHistory.length > MAX_HISTORY_MESSAGES) {
            chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
        }
      } catch (err) {
        append('error', err.toString());
      } finally {
        inputEl.disabled = false;
      }
    })();
    sendResponse({ success: true, message: "Transcript received and processing initiated." });
    return true; 
  } else if (message.type === 'anotherMessageType') {
    // Handle other potential messages if any in the future
  }
  // Return false or nothing for synchronous message handlers or if not handling this message
  // to prevent the port from being kept open unnecessarily.
  return false; 
});

inputEl.addEventListener('keydown', async e => {
  if (e.key !== 'Enter' || !inputEl.value.trim()) return;
  const userMsg = inputEl.value.trim();
  append('user', userMsg);
  // Add user message to history before sending to Gemini
  chatHistory.push({ role: "user", parts: [{ text: userMsg }] });
  if (chatHistory.length > MAX_HISTORY_MESSAGES) {
      chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
  }

  inputEl.value = '';
  inputEl.disabled = true;
  
  try {
    const { botResponseText, botResponseForHistory } = await sendToGemini(userMsg);
    append('bot', botResponseText);
    // Add bot response to history
    chatHistory.push(botResponseForHistory);
    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory.splice(0, chatHistory.length - MAX_HISTORY_MESSAGES);
    }
  } catch (err) {
    append('error', err.toString());
  } finally {
    inputEl.disabled = false;
    inputEl.focus();
  }
});

async function sendToGemini(userMessage) {
  const systemPromptText = `You are BrowseEasy, an AI assistant that helps make web pages more accessible. You have access to tools that can modify the current webpage to improve accessibility.

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
  
  // Construct messages: system prompt, then history, then current user message
  const messagesForAPI = [
    // System prompt can be implicitly handled by Gemini if we structure history correctly
    // Or we can add it as the first "user" or "model" turn if needed. 
    // For now, let's assume the history itself carries the context post-initial prompt.
    // The `systemPromptText` variable above is just for reference or if we want to include it directly.
    // Let's adjust: Gemini API often expects history to start with a user message if no explicit system instruction is part of `contents`.
    // A common pattern is [{role: "user", parts: [SYSTEM_PROMPT_HERE]}, {role: "model", parts: ["OK"]}, ...history... , {role: "user", parts: [CURRENT_MESSAGE]}]
    // For simplicity with function calling, the Gemini docs show system instructions in the first user message sometimes.
    // Let's use a structure where system instructions are part of the *first* user message in the API call for this turn.
  ];

  // Prepend chat history to the current user message for the API call
  // The Gemini API expects alternating user and model roles.
  const currentTurnContents = [
    ...chatHistory, // chatHistory already contains {role, parts}
    { 
      role: "user", 
      parts: [{ text: `${systemPromptText}\n\nUser request: ${userMessage}` }] // Combine system prompt with current user message for this turn's context
    }
  ];

  const requestBody = {
    contents: currentTurnContents, // Send history + current message (with system prompt)
    tools: [
      {
        function_declarations: ACCESSIBILITY_TOOLS
      }
    ]
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${window.config.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', },
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

  // This part needs to return two things:
  // 1. The text/HTML string to display in the chat (botResponseText)
  // 2. The raw part(s) from the AI to store in chatHistory (botResponseForHistory)
  let botResponseForHistory = candidate.content; // This should be {role: "model", parts: [...]}
  let botResponseText = '';
  let appliedToolsHtml = '';

  const functionCalls = candidate.content?.parts?.filter(part => part.functionCall);
  const textPart = candidate.content?.parts?.find(part => part.text);
  let aiTextResponse = textPart?.text || '';

  if (functionCalls && functionCalls.length > 0) {
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

    if (toolResults.length > 0) {
      appliedToolsHtml = '<div class="applied-tools-summary"><h4>Tools Executed:</h4><ul>';
      toolResults.forEach(result => {
        if (result.success) {
          appliedToolsHtml += `<li class="tool-success">✅ ${result.name}</li>`;
        } else {
          appliedToolsHtml += `<li class="tool-failure">❌ ${result.name}: ${result.error}</li>`;
        }
      });
      appliedToolsHtml += '</ul></div>';
    }

    // Construct botResponseText for display
    if (aiTextResponse && appliedToolsHtml) botResponseText = `${aiTextResponse}\n\n${appliedToolsHtml}`;
    else if (aiTextResponse) botResponseText = aiTextResponse;
    else if (appliedToolsHtml) botResponseText = appliedToolsHtml;
    else botResponseText = 'Accessibility adjustments applied!';

  } else {
    botResponseText = aiTextResponse || 'I can help you make this page more accessible. Try asking me to make it more readable, highlight links, or adjust the size!';
  }
  
  // If botResponseForHistory is undefined or doesn't have role, construct it.
  // Gemini API response candidate.content should already be in the correct format {role: "model", parts: [...]}
  if (!botResponseForHistory || !botResponseForHistory.role) {
      botResponseForHistory = { role: "model", parts: candidate.content?.parts || [{text: botResponseText}] };
  }

  return { botResponseText, botResponseForHistory };
}

function append(type, text) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  if (type === 'bot') {
    // Process basic markdown for bot messages and allow HTML
    let processedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
      .replace(/\n/g, '<br>');                   // Newlines
    div.innerHTML = processedText;
  } else {
    div.textContent = text; // User messages and errors as plain text
    div.style.whiteSpace = 'pre-wrap'; // Preserve formatting for user input/errors
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Add some quick accessibility commands
document.addEventListener('DOMContentLoaded', () => {
  append('bot', '👋 Hi! I\'m BrowseEasy, your accessibility assistant. I can help make web pages easier to read and navigate. Try saying:\n\n• "Make this more readable"\n• "Highlight the links"\n• "Make the text bigger"\n• "Hide images"\n• "Make buttons larger"\n\nWhat would you like me to help with?');
});
