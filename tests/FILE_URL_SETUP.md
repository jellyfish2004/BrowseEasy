# File URL Access Setup

## Why Local HTML Files Don't Work by Default

Chrome extensions require explicit permission to access `file://` URLs (local HTML files). Even though we've updated the manifest to include file URL permissions, you need to manually enable this in Chrome.

## How to Enable File URL Access

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/` in your browser
   - Or click the puzzle piece icon → "Manage extensions"

2. **Find BrowseEasy Extension**
   - Look for the BrowseEasy extension in the list

3. **Enable File Access**
   - Click "Details" on the BrowseEasy extension
   - Scroll down to find "Allow access to file URLs"
   - Toggle this option **ON**

4. **Reload the Extension** (if needed)
   - You may need to click the refresh/reload icon on the extension

## Testing with Local Files

Once file URL access is enabled, you can:

- Open the test files directly in Chrome (e.g., `file:///path/to/manual-test-page.html`)
- The BrowseEasy extension should now work on these local files
- All accessibility features will function normally

## Alternative Testing Method

If you prefer not to enable file URL access, you can:

1. **Use a Local Server**
   ```bash
   # In the tests directory:
   python -m http.server 8000
   # Then visit: http://localhost:8000/manual-test-page.html
   ```

2. **Host the Files Online**
   - Upload the test files to a web server
   - Access them via HTTP/HTTPS URLs

## Troubleshooting

- **Extension not appearing on page**: Check that file URL access is enabled
- **Features not working**: Make sure the extension is loaded and active
- **Console errors**: Check browser console for any permission errors 