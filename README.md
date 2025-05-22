# BrowseEasy Chrome Extension

A Chrome extension that adds a smart chatbot sidebar to your browser. Supports both WebLLM (local) and OpenAI-compatible LLMs.

## Features

- Collapsible sidebar interface
- Switch between WebLLM and OpenAI
- Persistent chat history
- Modern, clean UI

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

   For development with hot reload:
   ```bash
   npm run watch
   ```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `browseeasy` directory

## Usage

1. Click the BrowseEasy icon in your Chrome toolbar to toggle the sidebar
2. Choose between WebLLM (local) or OpenAI
3. If using OpenAI, enter your API key in the settings
4. Start chatting!

## Configuration

- WebLLM: Uses local browser-based inference (coming soon)
- OpenAI: Requires an API key from OpenAI (coming soon)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT