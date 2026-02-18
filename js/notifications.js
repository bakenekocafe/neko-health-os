// ============================================================
// 猫の健康管理OS - Notification Engine
// ============================================================

const Notifications = {
    // Cooldown periods (hours)
    COOLDOWN: {
        sos_lv2: 6,
        sos_lv3: 0,      // no limit
        weight_unmeasured: Infinity, // until resolved
        floor_incident: 6,
        approval_overdue: 24
    },

    // ── Check and Fire Notifications ──
    checkAll() {
        const cats = Store.getCats().filter(c => c.status === 'facility');
        const fired = [];

        for (const cat of cats) {
            // SOS notifications
            const latestRecord = Store.getLatestRecord(cat.id);
            if (latestRecord?.sos_level >= 2) {
                const type = `sos_lv${latestRecord.sos_level}`;
                if (this.canFire(cat.id, type)) {
                    fired.push(this.fire(cat.id, type, {
                        level: latestRecord.sos_level,
                        note: latestRecord.sos_note,
                        cat_name: cat.name
                    }));
                }
            }

            // Weight unmeasured
            const latestWeight = Store.getLatestWeight(cat.id);
            const daysSince = latestWeight ? Utils.daysSince(latestWeight.timestamp) : null;
            if (daysSince === null || daysSince >= 8) {
                if (this.canFire(cat.id, 'weight_unmeasured')) {
                    fired.push(this.fire(cat.id, 'weight_unmeasured', {
                        days: daysSince,
                        cat_name: cat.name
                    }));
                }
            } else {
                // Resolve weight notification if measured
                this.resolveByType(cat.id, 'weight_unmeasured');
            }

            // Approval overdue
            const approval = Store.getApprovalForCat(cat.id);
            if (approval) {
                const daysSinceApproval = Utils.daysSince(approval.confirmed_at);
                if (daysSinceApproval >= approval.reapproval_cycle_days) {
                    if (this.canFire(cat.id, 'approval_overdue')) {
                        fired.push(this.fire(cat.id, 'approval_overdue', {
                            days_overdue: daysSinceApproval - approval.reapproval_cycle_days,
                            cat_name: cat.name,
                            approval_type: approval.type,
                            cycle_days: approval.reapproval_cycle_days,
                            approved_by: approval.approved_by || '',
                            change_summary: approval.change_summary || '',
                            confirmed_at: approval.confirmed_at,
                            care_plan: approval.care_plan || ''
                        }));
                    }
                }
            }
        }

        // Floor incidents
        const activeIncidents = Store.getActiveIncidents();
        for (const incident of activeIncidents) {
            if (this.canFire(null, 'floor_incident', incident.incident_id || incident.id)) {
                fired.push(this.fire(null, 'floor_incident', {
                    incident_id: incident.incident_id || incident.id,
                    type: incident.type,
                    floor_id: incident.floor_id
                }));
            }
        }

        return fired;
    },

    // ── Can Fire (cooldown check) ──
    canFire(catId, type, entityId = null) {
        const all = Store.getAll('notifications');
        const existing = all.filter(n => {
            if (catId && n.cat_id !== catId) return false;
            if (n.type !== type) return false;
            if (entityId && n.data?.incident_id !== entityId) return false;
            return true;
        });

        if (existing.length === 0) return true;

        const latest = existing.sort((a, b) => new Date(b.fired_at) - new Date(a.fired_at))[0];

        // If resolved, allow new fire
        if (latest.status === 'resolved') return true;

        // Weight unmeasured: no re-notification until resolved
        if (type === 'weight_unmeasured' && latest.status !== 'resolved') return false;

        // SOS Lv.3: no cooldown limit
        if (type === 'sos_lv3') return true;

        // Check cooldown
        const cooldownHours = this.COOLDOWN[type] || 6;
        const hoursSince = Utils.hoursSince(latest.fired_at);
        return hoursSince >= cooldownHours;
    },

    // ── Fire Notification ──
    fire(catId, type, data = {}) {
        const notification = Store.add('notifications', {
            cat_id: catId,
            type,
            status: 'active',
            data,
            fired_at: Utils.now(),
            cooldown_until: this.getCooldownUntil(type)
        });

        // Also add to timeline
        Store.addTimelineEvent({
            cat_id: catId,
            event_type: `notification_${type}`,
            is_key_event: type === 'sos_lv2' || type === 'sos_lv3',
            data: { notification_id: notification.id, ...data }
        });

        // Show toast
        this.showToast(notification);

        return notification;
    },

    getCooldownUntil(type) {
        const hours = this.COOLDOWN[type];
        if (!hours || hours === Infinity) return null;
        const d = new Date();
        d.setHours(d.getHours() + hours);
        return d.toISOString();
    },

    // ── Acknowledge (with next action) ──
    acknowledge(notificationId, nextAction, acknowledgedBy) {
        Store.update('notifications', notificationId, {
            status: 'acknowledged',
            next_action: nextAction || '',
            acknowledged_by: acknowledgedBy || DriveAPI.getStaffId(),
            acknowledged_at: Utils.now()
        });
    },

    // ── Resolve ──
    resolve(notificationId) {
        Store.update('notifications', notificationId, {
            status: 'resolved',
            resolved_at: Utils.now()
        });
    },

    resolveByType(catId, type) {
        const all = Store.getAll('notifications');
        all.filter(n => n.cat_id === catId && n.type === type && n.status !== 'resolved')
            .forEach(n => this.resolve(n.id));
    },

    // ── Toast Display ──
    showToast(notification) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const typeLabels = {
            sos_lv2: { icon: '⚠️', label: 'SOS Lv.2', class: 'toast-warning' },
            sos_lv3: { icon: '🚨', label: 'SOS Lv.3', class: 'toast-danger' },
            weight_unmeasured: { icon: '⚖️', label: '体重未計測', class: 'toast-warning' },
            floor_incident: { icon: '🏠', label: 'フロアインシデント', class: 'toast-danger' },
            approval_overdue: { icon: '📋', label: '再承認期限超過', class: 'toast-info' }
        };

        const typeInfo = typeLabels[notification.type] || { icon: '🔔', label: '通知', class: 'toast-info' };
        const catName = notification.data?.cat_name || '';

        const toast = document.createElement('div');
        toast.className = `toast ${typeInfo.class}`;
        toast.innerHTML = `
      <span style="font-size:1.2em">${typeInfo.icon}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:0.875rem">${typeInfo.label}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px">${Utils.escapeHtml(catName)}</div>
      </div>
      <button class="btn-icon" onclick="this.parentElement.remove()">✕</button>
    `;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 8000);
    },

    // ── Count active ──
    countActive() {
        return Store.getActiveNotifications().length;
    }
};
