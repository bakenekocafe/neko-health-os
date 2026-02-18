// ============================================================
// 猫の健康管理OS - Data Store (Drive + localStorage)
// ============================================================

const Store = {
    collections: ['cats', 'records', 'approvals', 'incidents', 'timeline', 'notifications'],
    _cache: {},
    _dirty: new Set(),
    _syncInterval: null,

    // ── Initialize ──
    async init() {
        // Load from localStorage cache first (instant)
        for (const col of this.collections) {
            const cached = localStorage.getItem(`neko_${col}`);
            this._cache[col] = cached ? JSON.parse(cached) : [];
        }

        // Load settings
        const settings = localStorage.getItem('neko_settings');
        this._cache.settings = settings ? JSON.parse(settings) : {
            driveClientId: '',
            driveApiKey: ''
        };

        // Sync from Drive if available
        if (DriveAPI.isInitialized) {
            await this.syncFromDrive();
        }

        // Auto-sync every 5 minutes
        this._syncInterval = setInterval(() => this.syncToDrive(), 5 * 60 * 1000);
    },

    // ── Sync from Drive ──
    async syncFromDrive() {
        if (!DriveAPI.isInitialized) return;
        for (const col of this.collections) {
            try {
                const data = await DriveAPI.loadJSON(`${col}.json`);
                if (data) {
                    this._cache[col] = data;
                    localStorage.setItem(`neko_${col}`, JSON.stringify(data));
                }
            } catch (e) {
                console.warn(`[Store] Failed to sync ${col} from Drive:`, e);
            }
        }
    },

    // ── Sync to Drive ──
    async syncToDrive() {
        if (!DriveAPI.isInitialized || this._dirty.size === 0) return;
        const dirtyCollections = [...this._dirty];
        this._dirty.clear();
        for (const col of dirtyCollections) {
            try {
                await DriveAPI.saveJSON(`${col}.json`, this._cache[col]);
            } catch (e) {
                console.warn(`[Store] Failed to sync ${col} to Drive:`, e);
                this._dirty.add(col); // retry next time
            }
        }
    },

    // ── Generic CRUD ──
    getAll(collection) {
        return this._cache[collection] || [];
    },

    getById(collection, id) {
        return this.getAll(collection).find(item => item.id === id);
    },

    add(collection, item) {
        if (!item.id) item.id = Utils.generateId();
        if (!item.created_at) item.created_at = Utils.now();
        this._cache[collection].push(item);
        this._persist(collection);
        return item;
    },

    update(collection, id, updates) {
        const items = this.getAll(collection);
        const idx = items.findIndex(item => item.id === id);
        if (idx === -1) return null;
        items[idx] = { ...items[idx], ...updates, updated_at: Utils.now() };
        this._persist(collection);
        return items[idx];
    },

    remove(collection, id) {
        this._cache[collection] = this.getAll(collection).filter(item => item.id !== id);
        this._persist(collection);
    },

    _persist(collection) {
        localStorage.setItem(`neko_${collection}`, JSON.stringify(this._cache[collection]));
        this._dirty.add(collection);
        // Debounced Drive sync
        clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => this.syncToDrive(), 3000);
    },

    // ── Cat Specific ──
    getCats() {
        return this.getAll('cats');
    },

    getCat(id) {
        return this.getById('cats', id);
    },

    saveCat(catData) {
        if (catData.id && this.getCat(catData.id)) {
            return this.update('cats', catData.id, catData);
        }
        return this.add('cats', {
            management_id: '',
            microchip_id: '',
            name: '',
            photo_base64: '',
            feature_memo: '',
            sex: 'unknown',
            neutered_status: 'unknown',
            birth_date: null,
            birth_date_precision: 'unknown',
            estimated_age_years: null,
            fiv_status: 'unknown',
            felv_status: 'unknown',
            test_date_fiv: null,
            test_date_felv: null,
            chronic_conditions: [],
            status: 'facility',
            ...catData
        });
    },

    // ── Records ──
    getRecordsForCat(catId) {
        return this.getAll('records')
            .filter(r => r.cat_id === catId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    getLatestRecord(catId) {
        const records = this.getRecordsForCat(catId);
        return records[0] || null;
    },

    getLatestWeight(catId) {
        const records = this.getRecordsForCat(catId).filter(r => r.weight !== null && r.weight !== undefined);
        return records[0] || null;
    },

    getRecentWeights(catId, days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return this.getAll('records')
            .filter(r => r.cat_id === catId && r.weight !== null && r.weight !== undefined && new Date(r.timestamp) >= cutoff)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    addRecord(record) {
        return this.add('records', {
            cat_id: '',
            date: Utils.today(),
            staff_id: DriveAPI.getStaffId(),
            weight: null,
            visual_scores: [],
            sos_level: null,
            sos_note: '',
            ...record,
            timestamp: Utils.now()
        });
    },

    // ── Approvals ──
    getApprovalForCat(catId) {
        const approvals = this.getAll('approvals')
            .filter(a => a.cat_id === catId)
            .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at));
        return approvals[0] || null;
    },

    // ── Incidents ──
    getActiveIncidents() {
        return this.getAll('incidents').filter(i => i.status === 'active');
    },

    getIncidentById(id) {
        return this.getById('incidents', id);
    },

    // ── Timeline ──
    addTimelineEvent(event) {
        return this.add('timeline', {
            cat_id: null,
            event_type: '',
            is_key_event: false,
            data: {},
            ...event,
            created_at: Utils.now()
        });
    },

    getTimelineForCat(catId, keyOnly = false) {
        let events = this.getAll('timeline').filter(e => e.cat_id === catId);
        if (keyOnly) events = events.filter(e => e.is_key_event);
        return events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    getFullTimeline(keyOnly = false) {
        let events = this.getAll('timeline');
        if (keyOnly) events = events.filter(e => e.is_key_event);
        return events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    // ── Notifications ──
    getActiveNotifications() {
        return this.getAll('notifications').filter(n => n.status === 'active');
    },

    // ── Settings ──
    getSettings() {
        return this._cache.settings || {};
    },

    saveSettings(settings) {
        this._cache.settings = { ...this._cache.settings, ...settings };
        localStorage.setItem('neko_settings', JSON.stringify(this._cache.settings));
    },

    // ── Export / Import ──
    exportAll() {
        const data = {};
        for (const col of this.collections) {
            data[col] = this._cache[col];
        }
        data.exported_at = Utils.now();
        data.version = '2.1';
        return data;
    },

    importAll(data) {
        for (const col of this.collections) {
            if (data[col]) {
                this._cache[col] = data[col];
                this._persist(col);
            }
        }
    },

    exportAuditPack(catId) {
        const cat = this.getCat(catId);
        if (!cat) return null;
        return {
            cat,
            records: this.getRecordsForCat(catId),
            approval: this.getApprovalForCat(catId),
            timeline: this.getTimelineForCat(catId),
            exported_at: Utils.now(),
            version: '2.1'
        };
    }
};
