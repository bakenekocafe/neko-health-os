// ============================================================
// 猫の健康管理OS - Google Drive API Wrapper
// ============================================================

const DriveAPI = {
    CLIENT_ID: '', // GCP OAuth Client ID (user must configure)
    API_KEY: '',   // GCP API Key (user must configure)
    SCOPES: 'https://www.googleapis.com/auth/drive.file',
    ROOT_FOLDER_NAME: 'neko-health-os-data',

    tokenClient: null,
    accessToken: null,
    rootFolderId: null,
    isInitialized: false,
    userProfile: null,

    // ── Configuration ──
    configure(clientId, apiKey) {
        this.CLIENT_ID = clientId;
        this.API_KEY = apiKey;
    },

    // ── Initialize Google Identity Services ──
    async init() {
        // For demo mode without Google credentials
        if (!this.CLIENT_ID || !this.API_KEY) {
            console.warn('[Drive] No credentials configured. Running in local-only mode.');
            this.isInitialized = false;
            return false;
        }

        return new Promise((resolve) => {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('[Drive] Auth error:', response.error);
                        resolve(false);
                        return;
                    }
                    this.accessToken = response.access_token;
                    this.isInitialized = true;
                    resolve(true);
                },
            });
            resolve(true);
        });
    },

    // ── Sign In ──
    async signIn() {
        if (!this.CLIENT_ID) {
            // Demo mode: simulate login
            this.userProfile = {
                email: 'staff@example.com',
                name: 'スタッフ（デモ）',
                picture: null
            };
            return this.userProfile;
        }

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (response) => {
                if (response.error) {
                    reject(response.error);
                    return;
                }
                this.accessToken = response.access_token;
                this.isInitialized = true;
                // Get user profile
                try {
                    const profile = await this.fetchUserProfile();
                    this.userProfile = profile;
                    resolve(profile);
                } catch (e) {
                    reject(e);
                }
            };
            this.tokenClient.requestAccessToken();
        });
    },

    // ── Fetch User Profile ──
    async fetchUserProfile() {
        const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        return resp.json();
    },

    // ── Sign Out ──
    signOut() {
        if (this.accessToken && typeof google !== 'undefined') {
            google.accounts.oauth2.revoke(this.accessToken);
        }
        this.accessToken = null;
        this.isInitialized = false;
        this.userProfile = null;
        this.rootFolderId = null;
    },

    // ── API Request Helper ──
    async request(url, options = {}) {
        if (!this.accessToken) return null;

        const resp = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                ...options.headers,
            }
        });

        if (!resp.ok) {
            console.error(`[Drive] API error: ${resp.status}`, await resp.text());
            return null;
        }

        return resp.json();
    },

    // ── Find or Create Root Folder ──
    async ensureRootFolder() {
        if (this.rootFolderId) return this.rootFolderId;

        // Search for existing folder
        const query = `name='${this.ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const result = await this.request(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
        );

        if (result?.files?.length > 0) {
            this.rootFolderId = result.files[0].id;
            return this.rootFolderId;
        }

        // Create folder
        const folder = await this.request('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: this.ROOT_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });

        this.rootFolderId = folder?.id;
        return this.rootFolderId;
    },

    // ── Find or Create Subfolder ──
    async ensureSubFolder(parentId, folderName) {
        const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const result = await this.request(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
        );

        if (result?.files?.length > 0) {
            return result.files[0].id;
        }

        const folder = await this.request('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            })
        });

        return folder?.id;
    },

    // ── Save JSON Data ──
    async saveJSON(fileName, data) {
        if (!this.isInitialized) return false;

        const folderId = await this.ensureRootFolder();
        if (!folderId) return false;

        // Check if file exists
        const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
        const result = await this.request(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`
        );

        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });

        if (result?.files?.length > 0) {
            // Update existing
            const fileId = result.files[0].id;
            await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: blob
            });
        } else {
            // Create new
            const metadata = {
                name: fileName,
                parents: [folderId],
                mimeType: 'application/json'
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.accessToken}` },
                body: form
            });
        }

        return true;
    },

    // ── Load JSON Data ──
    async loadJSON(fileName) {
        if (!this.isInitialized) return null;

        const folderId = await this.ensureRootFolder();
        if (!folderId) return null;

        const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
        const result = await this.request(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`
        );

        if (!result?.files?.length) return null;

        const fileId = result.files[0].id;
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${this.accessToken}` }
        });

        return resp.json();
    },

    // ── Upload File (medical records, photos) ──
    async uploadFile(catId, file, description = '') {
        if (!this.isInitialized) return null;

        const rootId = await this.ensureRootFolder();
        const catsFolder = await this.ensureSubFolder(rootId, 'cats');
        const catFolder = await this.ensureSubFolder(catsFolder, catId);

        const metadata = {
            name: file.name,
            parents: [catFolder],
            description: description
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form
        });

        return resp.json();
    },

    // ── Get Staff ID ──
    getStaffId() {
        return this.userProfile?.email || 'anonymous';
    },

    getStaffName() {
        return this.userProfile?.name || 'スタッフ';
    }
};
