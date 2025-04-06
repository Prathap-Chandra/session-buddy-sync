import { SessionManager } from './sessionManager.js';
import { DriveUtils } from './driveUtils.js';

class OptionsManager {
    constructor() {
        this.sessionManager = new SessionManager();
        this.driveUtils = new DriveUtils();
        this.initializeElements();
        this.attachEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        this.syncInterval = document.getElementById('syncInterval');
        this.saveSettings = document.getElementById('saveSettings');
        this.exportFormat = document.getElementById('exportFormat');
        this.exportButton = document.getElementById('exportButton');
        this.importButton = document.getElementById('importButton');
        this.importFile = document.getElementById('importFile');
        this.syncNow = document.getElementById('syncNow');
        this.syncStatus = document.getElementById('syncStatus');
    }

    attachEventListeners() {
        this.saveSettings.addEventListener('click', () => this.saveSettingsHandler());
        this.exportButton.addEventListener('click', () => this.exportSessions());
        this.importButton.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.importSessions(e));
        this.syncNow.addEventListener('click', () => this.syncWithDrive());
    }

    async loadSettings() {
        const settings = await chrome.storage.local.get('settings');
        if (settings.settings) {
            this.syncInterval.value = settings.settings.syncInterval || 30;
        }
    }

    async saveSettingsHandler() {
        const settings = {
            syncInterval: parseInt(this.syncInterval.value)
        };
        await chrome.storage.local.set({ settings });
        this.showStatus('Settings saved successfully!', 'success');
    }

    async exportSessions() {
        try {
            const format = this.exportFormat.value;
            const data = await this.sessionManager.exportSessions(format);
            
            const blob = new Blob([data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `sessions.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus('Sessions exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showStatus('Failed to export sessions: ' + error.message, 'error');
        }
    }

    async importSessions(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const format = file.name.split('.').pop().toLowerCase();
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    await this.sessionManager.importSessions(e.target.result, format);
                    this.showStatus('Sessions imported successfully!', 'success');
                } catch (error) {
                    console.error('Import error:', error);
                    this.showStatus('Failed to import sessions: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error('Import error:', error);
            this.showStatus('Failed to import sessions: ' + error.message, 'error');
        }
    }

    async syncWithDrive() {
        try {
            this.syncNow.disabled = true;
            this.syncNow.textContent = 'Syncing...';
            
            await this.driveUtils.sync();
            this.showStatus('Sync completed successfully!', 'success');
        } catch (error) {
            console.error('Sync error:', error);
            this.showStatus('Failed to sync: ' + error.message, 'error');
        } finally {
            this.syncNow.disabled = false;
            this.syncNow.textContent = 'Sync Now';
        }
    }

    showStatus(message, type) {
        this.syncStatus.textContent = message;
        this.syncStatus.className = `status ${type}`;
        setTimeout(() => {
            this.syncStatus.textContent = '';
            this.syncStatus.className = 'status';
        }, 3000);
    }
}

// Initialize the options manager
const optionsManager = new OptionsManager(); 
