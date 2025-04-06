import { SessionManager } from './sessionManager.js';
import { DriveUtils } from './driveUtils.js';

class PopupManager {
    constructor() {
        this.sessionManager = new SessionManager();
        this.driveUtils = new DriveUtils();
        this.initializeElements();
        this.attachEventListeners();
        this.loadSessions();
    }

    initializeElements() {
        this.syncButton = document.getElementById('syncButton');
        this.syncStatus = document.getElementById('syncStatus');
        this.sessionList = document.getElementById('sessionList');
        this.saveCurrentButton = document.getElementById('saveCurrentButton');
        this.saveSessionForm = document.getElementById('saveSessionForm');
        this.sessionNameInput = document.getElementById('sessionName');
        this.previewWindow = document.getElementById('previewWindow');
        this.confirmSaveButton = document.getElementById('confirmSave');
        this.cancelSaveButton = document.getElementById('cancelSave');
    }

    attachEventListeners() {
        this.syncButton.addEventListener('click', () => this.syncWithDrive());
        this.saveCurrentButton.addEventListener('click', () => this.showSaveSessionForm());
        this.confirmSaveButton.addEventListener('click', () => this.saveCurrentSession());
        this.cancelSaveButton.addEventListener('click', () => this.hideSaveSessionForm());
        this.sessionList.addEventListener('click', (e) => this.handleSessionClick(e));
    }

    async loadSessions() {
        const sessions = await this.sessionManager.getSessions();
        this.renderSessions(sessions);
    }

    renderSessions(sessions) {
        this.sessionList.innerHTML = '';
        sessions.forEach(session => {
            const sessionElement = this.createSessionElement(session);
            this.sessionList.appendChild(sessionElement);
        });
    }

    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        const header = document.createElement('div');
        header.className = 'session-header';
        header.innerHTML = `
            <span>${session.name}</span>
            <div class="session-actions">
                <button onclick="popupManager.restoreSession('${session.id}')">Restore</button>
                <button onclick="popupManager.deleteSession('${session.id}')" style="background: #dc3545;">Delete</button>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'session-content';
        content.innerHTML = this.createSessionContentHtml(session);

        div.appendChild(header);
        div.appendChild(content);
        return div;
    }

    createSessionContentHtml(session) {
        let html = '';
        session.windows.forEach((window, index) => {
            html += `
                <div class="window-item">
                    <div class="window-title">Window ${index + 1} (${window.tabs.length} tabs)</div>
                    <div class="tab-list">
                        ${window.tabs.map(tab => `
                            <div class="tab-item">
                                ${tab.favIconUrl ? `<img class="tab-favicon" src="${tab.favIconUrl}" alt="">` : ''}
                                <span>${tab.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        return html;
    }

    handleSessionClick(e) {
        const header = e.target.closest('.session-header');
        if (header) {
            const content = header.nextElementSibling;
            if (content && content.classList.contains('session-content')) {
                content.classList.toggle('expanded');
            }
        }
    }

    async showSaveSessionForm() {
        this.saveCurrentButton.style.display = 'none';
        this.saveSessionForm.classList.add('visible');
        
        // Show preview of current windows and tabs
        const windows = await chrome.windows.getAll({ populate: true });
        const previewHtml = this.createSessionContentHtml({ windows });
        this.previewWindow.innerHTML = previewHtml;
        this.previewWindow.classList.add('visible');
    }

    hideSaveSessionForm() {
        this.saveCurrentButton.style.display = 'block';
        this.saveSessionForm.classList.remove('visible');
        this.previewWindow.classList.remove('visible');
        this.sessionNameInput.value = '';
    }

    async saveCurrentSession() {
        const sessionName = this.sessionNameInput.value.trim();
        if (!sessionName) {
            alert('Please enter a session name');
            return;
        }

        try {
            await this.sessionManager.saveCurrentSession(sessionName);
            await this.loadSessions();
            this.hideSaveSessionForm();
        } catch (error) {
            console.error('Error saving session:', error);
            alert('Failed to save session. Please try again.');
        }
    }

    async restoreSession(sessionId) {
        try {
            await this.sessionManager.restoreSession(sessionId);
            window.close();
        } catch (error) {
            console.error('Error restoring session:', error);
            alert('Failed to restore session. Please try again.');
        }
    }

    async deleteSession(sessionId) {
        if (confirm('Are you sure you want to delete this session?')) {
            try {
                await this.sessionManager.deleteSession(sessionId);
                await this.loadSessions();
            } catch (error) {
                console.error('Error deleting session:', error);
                alert('Failed to delete session. Please try again.');
            }
        }
    }

    async syncWithDrive() {
        try {
            this.syncButton.disabled = true;
            this.syncButton.textContent = 'Syncing...';
            
            await this.driveUtils.sync();
            await this.loadSessions();
            
            const lastSynced = new Date().toLocaleString();
            this.syncStatus.textContent = `Last synced: ${lastSynced}`;
        } catch (error) {
            console.error('Error syncing with Drive:', error);
            alert('Failed to sync with Google Drive. Please try again.');
        } finally {
            this.syncButton.disabled = false;
            this.syncButton.textContent = 'Sync Now';
        }
    }
}

// Initialize the popup manager
const popupManager = new PopupManager();
window.popupManager = popupManager; 
