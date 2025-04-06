# Session Sync Buddy

A Chrome extension that helps you save, manage, and sync your browser sessions across devices using Google Drive.

## Features

- **Session Management**
  - Save and restore browser sessions
  - Name and organize sessions
  - Delete unwanted sessions
  - Multi-window support

- **Cross-Device Sync**
  - Automatic sync with Google Drive
  - Secure storage in Drive's AppData folder
  - Conflict resolution (latest version wins)
  - Configurable sync interval

- **Import/Export**
  - Export sessions in multiple formats:
    - JSON (complete data backup)
    - TXT (plain list of URLs)
    - HTML (clickable bookmarks view)
  - Import sessions from any supported format

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Setup

1. After installation, click the extension icon
2. Click "Sync Now" to authenticate with Google Drive
3. Grant the necessary permissions when prompted

## Usage

### Saving Sessions

1. Click the extension icon
2. Click "Save Current Session"
3. Enter a name for your session
4. Click "Save"

### Restoring Sessions

1. Click the extension icon
2. Find the session you want to restore
3. Click "Restore"

### Syncing

- Automatic sync every 30 minutes (configurable)
- Manual sync via the "Sync Now" button
- Sync on browser shutdown

### Import/Export

1. Open the extension options page
2. Choose your preferred format
3. Click "Export" or "Import"

## Security

- Uses Chrome's secure storage for local data
- Google Drive AppData folder for cloud storage
- OAuth 2.0 authentication
- No access to user's main Drive content
- No credentials stored locally

## Development

### Project Structure

```
/session-sync-buddy
├── manifest.json
├── background.js         # Handles auth, syncing
├── popup.html
├── popup.js              # UI interaction
├── options.html
├── options.js            # Settings: import/export, sync
├── driveUtils.js         # Upload/download helpers
├── sessionManager.js     # Save/restore logic
└── icons/
```

### Building

No build step required. The extension uses vanilla JavaScript and Chrome's native modules.

### Testing

1. Load the extension in Chrome
2. Test core functionality:
   - Saving sessions
   - Restoring sessions
   - Syncing with Drive
   - Import/Export
3. Test on multiple devices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details
