import { DriveUtils } from './driveUtils.js';

export class SessionManager {
    constructor() {
        this.storage = chrome.storage.local;
        this.driveUtils = new DriveUtils();
    }

    async getSessions() {
        const result = await this.storage.get('sessions');
        return result.sessions || [];
    }

    async saveCurrentSession(name) {
        const windows = await chrome.windows.getAll({ populate: true });
        const session = {
            id: Date.now().toString(),
            name,
            savedAt: new Date().toISOString(),
            windows: windows.map(window => ({
                id: window.id,
                tabs: window.tabs.map(tab => ({
                    title: tab.title,
                    url: tab.url,
                    favIconUrl: tab.favIconUrl
                }))
            }))
        };

        const sessions = await this.getSessions();
        sessions.push(session);
        await this.storage.set({ sessions });

        // Sync with Drive immediately after saving
        try {
            await this.driveUtils.sync();
            console.log('Session synced with Drive successfully');
        } catch (error) {
            console.error('Failed to sync session with Drive:', error);
            // Don't throw the error here as the session is already saved locally
        }
    }

    async restoreSession(sessionId) {
        const sessions = await this.getSessions();
        const session = sessions.find(s => s.id === sessionId);
        if (!session) throw new Error('Session not found');

        // Close all existing windows
        const windows = await chrome.windows.getAll();
        for (const window of windows) {
            await chrome.windows.remove(window.id);
        }

        // Create new windows with saved tabs
        for (const window of session.windows) {
            const tabs = window.tabs.map(tab => ({ url: tab.url }));
            await chrome.windows.create({ tabs });
        }
    }

    async deleteSession(sessionId) {
        const sessions = await this.getSessions();
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        await this.storage.set({ sessions: updatedSessions });

        // Sync with Drive immediately after deleting
        try {
            await this.driveUtils.sync();
            console.log('Session deletion synced with Drive successfully');
        } catch (error) {
            console.error('Failed to sync session deletion with Drive:', error);
        }
    }

    async exportSessions(format = 'json') {
        const sessions = await this.getSessions();
        
        switch (format) {
            case 'json':
                return this.exportAsJson(sessions);
            case 'txt':
                return this.exportAsTxt(sessions);
            case 'html':
                return this.exportAsHtml(sessions);
            default:
                throw new Error('Unsupported export format');
        }
    }

    exportAsJson(sessions) {
        return JSON.stringify(sessions, null, 2);
    }

    exportAsTxt(sessions) {
        let text = '';
        sessions.forEach(session => {
            text += `Session: ${session.name}\n`;
            session.windows.forEach(window => {
                window.tabs.forEach(tab => {
                    text += `${tab.title}\n${tab.url}\n\n`;
                });
            });
            text += '\n';
        });
        return text;
    }

    exportAsHtml(sessions) {
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Session Sync Buddy Export</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .session { margin-bottom: 20px; }
                    .tab { margin: 10px 0; }
                </style>
            </head>
            <body>
        `;

        sessions.forEach(session => {
            html += `<div class="session">
                <h2>${session.name}</h2>
                <div class="tabs">`;
            
            session.windows.forEach(window => {
                window.tabs.forEach(tab => {
                    html += `
                        <div class="tab">
                            <a href="${tab.url}">${tab.title}</a>
                        </div>
                    `;
                });
            });
            
            html += `</div></div>`;
        });

        html += `</body></html>`;
        return html;
    }

    async importSessions(data, format = 'json') {
        let sessions;
        
        switch (format) {
            case 'json':
                sessions = JSON.parse(data);
                break;
            case 'txt':
                sessions = this.parseTxt(data);
                break;
            case 'html':
                sessions = this.parseHtml(data);
                break;
            default:
                throw new Error('Unsupported import format');
        }

        const existingSessions = await this.getSessions();
        const updatedSessions = [...existingSessions, ...sessions];
        await this.storage.set({ sessions: updatedSessions });

        // Sync with Drive immediately after importing
        try {
            await this.driveUtils.sync();
            console.log('Imported sessions synced with Drive successfully');
        } catch (error) {
            console.error('Failed to sync imported sessions with Drive:', error);
        }
    }

    parseTxt(data) {
        const sessions = [];
        const lines = data.split('\n');
        let currentSession = null;
        
        for (const line of lines) {
            if (line.startsWith('Session: ')) {
                if (currentSession) sessions.push(currentSession);
                currentSession = {
                    id: Date.now().toString(),
                    name: line.replace('Session: ', ''),
                    savedAt: new Date().toISOString(),
                    windows: [{ tabs: [] }]
                };
            } else if (line && currentSession && !line.startsWith('http')) {
                currentSession.windows[0].tabs.push({
                    title: line,
                    url: lines[lines.indexOf(line) + 1],
                    favIconUrl: ''
                });
            }
        }
        
        if (currentSession) sessions.push(currentSession);
        return sessions;
    }

    parseHtml(data) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const sessions = [];
        
        doc.querySelectorAll('.session').forEach(sessionEl => {
            const session = {
                id: Date.now().toString(),
                name: sessionEl.querySelector('h2').textContent,
                savedAt: new Date().toISOString(),
                windows: [{ tabs: [] }]
            };
            
            sessionEl.querySelectorAll('.tab a').forEach(link => {
                session.windows[0].tabs.push({
                    title: link.textContent,
                    url: link.href,
                    favIconUrl: ''
                });
            });
            
            sessions.push(session);
        });
        
        return sessions;
    }
} 
