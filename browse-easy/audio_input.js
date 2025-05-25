// Make sure to include config.js before this script in audio_input.html
// (It should already be there if added previously for Gemini key)
// We need window.config.SARVAM_API_KEY and window.config.GEMINI_API_KEY

const recordButton = document.getElementById('recordButton');
const statusMessage = document.getElementById('statusMessage');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let audioContext; // For decoding audio data

// Initialize AudioContext
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

recordButton.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Let browser use its default mimeType, we will convert to WAV later
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const originalAudioBlob = new Blob(audioChunks, {
                    type: mediaRecorder.mimeType || 'audio/webm' // Use actual mimeType if available
                });
                audioChunks = [];
                recordButton.disabled = true;
                statusMessage.textContent = 'Converting to WAV...';

                try {
                    const arrayBuffer = await originalAudioBlob.arrayBuffer();
                    const audioCtx = getAudioContext();
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    const wavBlob = audioBufferToWav(audioBuffer);

                    statusMessage.textContent = 'Transcribing audio...';
                    const transcript = await transcribeAudioWithSarvam(wavBlob);
                    statusMessage.textContent = 'Transcript: ' + transcript.substring(0, 50) + '...';
                    
                    await chrome.sidePanel.open({ windowId: await getCurrentWindowId() });
                    await chrome.runtime.sendMessage({
                        type: 'processAudioTranscript',
                        transcript: transcript
                    });
                    window.close();

                } catch (error) {
                    console.error('Audio conversion, Sarvam API or messaging error:', error);
                    statusMessage.textContent = `Error: ${error.message}`.substring(0, 150);
                } finally {
                    recordButton.disabled = false;
                    recordButton.textContent = 'Record';
                    recordButton.classList.remove('recording');
                    isRecording = false;
                    if (statusMessage.textContent.startsWith('Error')) {
                         setTimeout(() => {
                            if(statusMessage.textContent.startsWith('Error')) statusMessage.textContent = 'Click Record to start.';
                         }, 5000);
                    }
                }
            };

            mediaRecorder.start();
            isRecording = true;
            recordButton.textContent = 'Stop Recording';
            recordButton.classList.add('recording');
            statusMessage.textContent = 'Recording...';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            statusMessage.textContent = 'Error: Could not access microphone.';
        }
    } else {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    }
});

// Function to convert an AudioBuffer to a WAV Blob
function audioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        len = buffer.length * numOfChan * 2 + 44, // 2 bytes per sample
        arrBuffer = new ArrayBuffer(len),
        view = new DataView(arrBuffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    // Write WAV container info
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
    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

async function transcribeAudioWithSarvam(audioBlob) {
    if (!window.config || !window.config.SARVAM_API_KEY) {
        throw new Error('Sarvam API key not found in config.js');
    }
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav'); 
    // The model parameter 'saaras:v2' validity for the 'speech-to-text-translate' endpoint should be confirmed.
    // If it causes issues or is not needed, it can be removed.
    formData.append('model', 'saaras:v2'); 
    const apiUrl = 'https://api.sarvam.ai/speech-to-text-translate';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'api-subscription-key': window.config.SARVAM_API_KEY,
        },
        body: formData
    });
    if (!response.ok) {
        let errorDetails = response.statusText;
        try {
            const errorData = await response.json();
            errorDetails = errorData.message || errorData.detail || JSON.stringify(errorData) || response.statusText;
        } catch (e) { /* ignore */ }
        throw new Error(`Sarvam API Error (${response.status}): ${errorDetails}`);
    }
    const result = await response.json();
    if (result.transcript === undefined || result.transcript === null) {
        throw new Error('Sarvam API did not return a transcript, or transcript is null.');
    }
    return result.transcript;
}

async function getCurrentWindowId() {
    const { id } = await chrome.windows.getCurrent();
    return id;
}

// Ensure config.js is loaded before this script.
// It might be good practice to add a check for window.config here.
if (!window.config || !window.config.SARVAM_API_KEY || !window.config.GEMINI_API_KEY) {
    statusMessage.textContent = 'Error: API keys not configured!';
    recordButton.disabled = true;
    console.error("API Keys not found in window.config. Make sure config.js is loaded and correct.");
} 