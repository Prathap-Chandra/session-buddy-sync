export class DriveUtils {
    constructor() {
        this.FILE_NAME = 'session-sync.json';
        this.FILE_MIME_TYPE = 'application/json';
    }

    async getAuthToken() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(token);
                }
            });
        });
    }

    async getFileId(token) {
        try {
            console.log(`Searching for file: ${this.FILE_NAME} in Google Drive`);
            const response = await fetch(
                'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
                    q: `name='${this.FILE_NAME}' and trashed=false`,
                    fields: 'files(id, name, modifiedTime, webViewLink)'
                }),
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to search for file: ${response.status}`);
            }

            const data = await response.json();
            if (data.files && data.files.length > 0) {
                console.log(`Found existing file: ${this.FILE_NAME}`, {
                    id: data.files[0].id,
                    lastModified: data.files[0].modifiedTime,
                    url: data.files[0].webViewLink
                });
                return data.files[0].id;
            } else {
                console.log(`No existing file found with name: ${this.FILE_NAME}`);
                return null;
            }
        } catch (error) {
            console.error('Error in getFileId:', error);
            return null;
        }
    }

    async uploadToDrive(sessions) {
        console.log('Starting Drive sync operation...');
        const token = await this.getAuthToken();
        const fileId = await this.getFileId(token);
        const fileContent = JSON.stringify({
            lastSynced: new Date().toISOString(),
            sessions
        }, null, 2); // Pretty print JSON for readability

        if (fileId) {
            // Update existing file
            console.log(`Updating existing file in Drive: ${this.FILE_NAME}`);
            const response = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime,webViewLink`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': this.FILE_MIME_TYPE
                    },
                    body: fileContent
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update file in Drive: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Successfully updated file in Drive: ${this.FILE_NAME}`, {
                id: result.id,
                modifiedTime: result.modifiedTime,
                url: result.webViewLink
            });
            return result;
        } else {
            // Create new file in Drive root
            console.log(`Creating new file in Drive: ${this.FILE_NAME}`);
            
            // First, create the file metadata
            const metadataResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files?fields=id,name,modifiedTime,webViewLink',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.FILE_NAME,
                        mimeType: this.FILE_MIME_TYPE
                    })
                }
            );

            if (!metadataResponse.ok) {
                const errorText = await metadataResponse.text();
                throw new Error(`Failed to create file metadata in Drive: ${errorText}`);
            }

            const file = await metadataResponse.json();
            console.log('Created file metadata:', {
                name: file.name,
                id: file.id,
                url: file.webViewLink
            });

            // Then, upload the content
            const contentResponse = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media&fields=id,modifiedTime,webViewLink`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': this.FILE_MIME_TYPE
                    },
                    body: fileContent
                }
            );

            if (!contentResponse.ok) {
                const errorText = await contentResponse.text();
                throw new Error(`Failed to upload file content to Drive: ${errorText}`);
            }

            const result = await contentResponse.json();
            console.log(`✅ Successfully created and uploaded new file to Drive: ${this.FILE_NAME}`, {
                id: result.id,
                modifiedTime: result.modifiedTime,
                url: result.webViewLink
            });
            return result;
        }
    }

    async downloadFromDrive() {
        console.log('Starting download from Drive...');
        const token = await this.getAuthToken();
        const fileId = await this.getFileId(token);

        if (!fileId) {
            console.log('No file found to download');
            return null;
        }

        console.log(`Downloading file: ${this.FILE_NAME}`);
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to download from Drive');
        }

        const data = await response.json();
        console.log(`✅ Successfully downloaded file from Drive: ${this.FILE_NAME}`);
        return data;
    }

    async sync() {
        try {
            console.log('Starting sync operation...');
            // Get local sessions
            const localSessions = await chrome.storage.local.get('sessions');
            const localData = localSessions.sessions || [];
            console.log('Local sessions loaded:', localData.length);

            // Get remote sessions
            let remoteData = null;
            try {
                remoteData = await this.downloadFromDrive();
                console.log('Remote sessions loaded:', remoteData?.sessions?.length || 0);
            } catch (error) {
                console.log('No remote data found, will upload local data');
            }

            if (remoteData) {
                // Merge sessions, keeping the most recent version of each
                const mergedSessions = this.mergeSessions(localData, remoteData.sessions);
                console.log('Merged sessions:', mergedSessions.length);
                await chrome.storage.local.set({ sessions: mergedSessions });
                await this.uploadToDrive(mergedSessions);
            } else {
                // Upload local data to Drive
                console.log('Uploading local sessions to Drive:', localData.length);
                await this.uploadToDrive(localData);
            }
            
            console.log('✅ Sync completed successfully!');
        } catch (error) {
            console.error('❌ Sync error:', error);
            throw error;
        }
    }

    mergeSessions(localSessions, remoteSessions) {
        const sessionMap = new Map();

        // Add local sessions to map
        localSessions.forEach(session => {
            sessionMap.set(session.id, session);
        });

        // Merge remote sessions
        if (Array.isArray(remoteSessions)) {
            remoteSessions.forEach(session => {
                const existingSession = sessionMap.get(session.id);
                if (!existingSession || new Date(session.savedAt) > new Date(existingSession.savedAt)) {
                    sessionMap.set(session.id, session);
                }
            });
        }

        return Array.from(sessionMap.values());
    }
} 
