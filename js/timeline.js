// ============================================================
// 猫の健康管理OS - Timeline Manager
// ============================================================

const Timeline = {
    // ── Event Type Config ──
    EVENT_TYPES: {
        // Key Events
        sos_lv2: { icon: '⚠️', label: 'SOS Lv.2', dotClass: 'warning', bgClass: 'color-warning-soft', isKey: true },
        sos_lv3: { icon: '🚨', label: 'SOS Lv.3', dotClass: 'danger', bgClass: 'color-danger-soft', isKey: true },
        floor_incident_created: { icon: '🏠', label: 'フロアインシデント発生', dotClass: 'danger', isKey: true },
        floor_incident_resolved: { icon: '✅', label: 'フロアインシデント解決', dotClass: 'success', isKey: true },
        modification_approved: { icon: '📋', label: '指示変更承認', dotClass: 'key-event', isKey: true },
        status_changed: { icon: '🏷️', label: 'ステータス変更', dotClass: 'key-event', isKey: true },
        medical_record_added: { icon: '🏥', label: '医療原本追加', dotClass: 'key-event', isKey: true },
        weight_unmeasured_8d: { icon: '⚖️', label: '体重未計測8日到達', dotClass: 'warning', isKey: true },
        weight_unmeasured_resolved: { icon: '⚖️', label: '体重未計測解消', dotClass: 'success', isKey: true },
        infection_test: { icon: '🔬', label: '感染症検査', dotClass: 'key-event', isKey: true },
        // Full Timeline Events
        weight_recorded: { icon: '⚖️', label: '体重記録', dotClass: '' },
        visual_recorded: { icon: '👀', label: 'ビジュアル記録', dotClass: '' },
        sos_lv1: { icon: '💛', label: 'SOS Lv.1', dotClass: 'warning' },
        approval_continued: { icon: '🔄', label: '継続承認', dotClass: '' },
        cat_registered: { icon: '🐱', label: '個体登録', dotClass: 'key-event' },
        cat_updated: { icon: '✏️', label: '個体情報更新', dotClass: '' },
        notification_sos_lv2: { icon: '🔔', label: '通知: SOS Lv.2', dotClass: 'warning' },
        notification_sos_lv3: { icon: '🔔', label: '通知: SOS Lv.3', dotClass: 'danger' },
        notification_weight_unmeasured: { icon: '🔔', label: '通知: 体重未計測', dotClass: 'warning' },
        notification_floor_incident: { icon: '🔔', label: '通知: インシデント', dotClass: 'danger' },
        notification_approval_overdue: { icon: '🔔', label: '通知: 承認期限', dotClass: 'warning' },
    },

    // ── Add Event Helper ──
    addEvent(catId, eventType, data = {}) {
        const typeConfig = this.EVENT_TYPES[eventType] || {};
        return Store.addTimelineEvent({
            cat_id: catId,
            event_type: eventType,
            is_key_event: typeConfig.isKey || false,
            data
        });
    },

    // ── Render Timeline ──
    renderTimeline(events, container, options = {}) {
        container.innerHTML = '';
        if (events.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📜</div>
          <h3>イベントがありません</h3>
          <p>記録が追加されるとここに表示されます</p>
        </div>
      `;
            return;
        }

        const list = document.createElement('div');
        list.className = 'timeline-list';

        let lastDate = '';
        events.forEach((event, idx) => {
            const eventDate = event.created_at?.split('T')[0] || '';
            if (eventDate !== lastDate) {
                lastDate = eventDate;
                const sep = document.createElement('div');
                sep.className = 'timeline-date-separator';
                sep.innerHTML = `<span>${Utils.formatDate(eventDate)}</span>`;
                // Insert before the list
                if (idx === 0) {
                    container.appendChild(sep);
                } else {
                    list.appendChild(sep);
                }
            }

            const typeConfig = this.EVENT_TYPES[event.event_type] || { icon: '📌', label: event.event_type, dotClass: '' };
            const catName = event.data?.cat_name || '';

            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.style.animationDelay = `${Math.min(idx * 50, 400)}ms`;

            const dotClasses = ['timeline-dot'];
            if (typeConfig.dotClass) dotClasses.push(typeConfig.dotClass);
            if (event.is_key_event) dotClasses.push('key-event');

            item.innerHTML = `
        <div class="${dotClasses.join(' ')}"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <div class="timeline-event-type">
              <span class="timeline-event-icon">${typeConfig.icon}</span>
              <span>${typeConfig.label}</span>
              ${event.is_key_event ? '<span class="badge badge-primary" style="margin-left:4px">KEY</span>' : ''}
            </div>
            <span class="timeline-timestamp">${Utils.formatDateTime(event.created_at)}</span>
          </div>
          <div class="timeline-body">
            ${catName ? `<span class="timeline-cat-link" data-cat-id="${event.cat_id}">${Utils.escapeHtml(catName)}</span> ` : ''}
            ${event.data?.description ? Utils.escapeHtml(event.data.description) : ''}
            ${event.data?.note ? `<br><em>${Utils.escapeHtml(event.data.note)}</em>` : ''}
          </div>
        </div>
      `;

            // Click cat link to navigate
            const catLink = item.querySelector('.timeline-cat-link');
            if (catLink) {
                catLink.addEventListener('click', () => {
                    window.location.hash = `#/cat/${event.cat_id}`;
                });
            }

            list.appendChild(item);
        });

        container.appendChild(list);
    }
};
