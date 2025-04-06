import { DriveUtils } from './driveUtils.js';

const driveUtils = new DriveUtils();
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ sessions: [] });
    startAutoSync();
});

// Handle browser shutdown
chrome.runtime.onSuspend.addListener(async () => {
    try {
        await driveUtils.sync();
    } catch (error) {
        console.error('Failed to sync before shutdown:', error);
    }
});

// Start automatic syncing
function startAutoSync() {
    setInterval(async () => {
        try {
            await driveUtils.sync();
        } catch (error) {
            console.error('Auto-sync error:', error);
        }
    }, SYNC_INTERVAL);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sync') {
        driveUtils.sync()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
}); 
