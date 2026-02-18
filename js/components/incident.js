// ============================================================
// 猫の健康管理OS - Incident Component
// ============================================================

const Incident = {
    render(container) {
        const allIncidents = Store.getAll('incidents').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const activeIncidents = allIncidents.filter(i => i.status === 'active');
        const resolvedIncidents = allIncidents.filter(i => i.status === 'resolved');

        container.innerHTML = `
      <div class="page-header flex items-center justify-between">
        <div>
          <h1 class="page-title">🏠 フロアインシデント</h1>
          <p class="page-subtitle">多頭環境の健康リスク管理</p>
        </div>
        <button class="btn btn-primary" id="btn-new-incident">＋ インシデント報告</button>
      </div>

      ${activeIncidents.length > 0 ? `
      <h2 style="font-size:var(--text-lg);font-weight:var(--font-semibold);margin-bottom:var(--space-4)">
        🔴 アクティブ (${activeIncidents.length})
      </h2>
      ${activeIncidents.map(i => this.renderCard(i)).join('')}
      ` : `
      <div class="alert alert-info mb-6">
        <span>✅</span>
        <div>現在アクティブなインシデントはありません</div>
      </div>
      `}

      ${resolvedIncidents.length > 0 ? `
      <div class="divider"></div>
      <h2 style="font-size:var(--text-lg);font-weight:var(--font-semibold);margin-bottom:var(--space-4);color:var(--text-secondary)">
        ✅ 解決済み (${resolvedIncidents.length})
      </h2>
      ${resolvedIncidents.slice(0, 10).map(i => this.renderCard(i)).join('')}
      ` : ''}
    `;

        // Events
        document.getElementById('btn-new-incident').addEventListener('click', () => this.showCreateDialog());

        container.querySelectorAll('.btn-resolve-incident').forEach(btn => {
            btn.addEventListener('click', () => this.showResolveDialog(btn.dataset.id));
        });
    },

    renderCard(incident) {
        const isActive = incident.status === 'active';
        const cats = (incident.suspected_cat_ids || []).map(id => Store.getCat(id)).filter(Boolean);
        const hoursActive = Utils.hoursSince(incident.created_at);

        return `
      <div class="incident-card ${isActive ? 'active' : 'resolved'} animate-fadeIn">
        <div class="incident-header">
          <div class="incident-type">
            <span>${isActive ? '🔴' : '✅'}</span>
            <span>${Utils.escapeHtml(incident.type || 'インシデント')}</span>
            <span class="badge ${isActive ? 'badge-danger' : 'badge-success'}">${isActive ? 'アクティブ' : '解決済み'}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            <span style="font-size:var(--text-xs);color:var(--text-muted)">
              ${isActive ? `${Math.floor(hoursActive)}時間前` : Utils.formatDateTime(incident.resolved_at)}
            </span>
            ${isActive ? `<button class="btn btn-sm btn-success btn-resolve-incident" data-id="${incident.id}">解決</button>` : ''}
          </div>
        </div>
        <div class="incident-body">
          <div style="margin-bottom:var(--space-2)">
            <strong>フロア:</strong> ${Utils.escapeHtml(incident.floor_id || '—')}
            <span style="margin-left:var(--space-4)"><strong>報告者:</strong> ${Utils.escapeHtml(incident.created_by || '—')}</span>
            <span style="margin-left:var(--space-4)"><strong>日時:</strong> ${Utils.formatDateTime(incident.created_at)}</span>
          </div>
          ${incident.evidence_note ? `<div style="margin-top:var(--space-2);font-style:italic">${Utils.escapeHtml(incident.evidence_note)}</div>` : ''}
          ${incident.resolution_type ? `<div style="margin-top:var(--space-2)"><strong>解決区分:</strong> ${incident.resolution_type}</div>` : ''}
        </div>
        ${cats.length > 0 ? `
        <div class="incident-suspects">
          <span style="font-size:var(--text-xs);color:var(--text-muted);margin-right:var(--space-2)">疑い猫:</span>
          ${cats.map(c => `
            <a href="#/cat/${c.id}" class="suspect-tag">
              ${c.photo_base64 ? `<img src="${c.photo_base64}" alt="">` : '🐱'}
              <span>${Utils.escapeHtml(c.name)}</span>
            </a>
          `).join('')}
        </div>` : ''}
      </div>
    `;
    },

    showCreateDialog() {
        const cats = Store.getCats().filter(c => c.status === 'facility');
        const content = `
      <div class="form-group">
        <label>インシデント種別</label>
        <input type="text" id="incident-type" placeholder="例: 嘔吐・下痢・くしゃみ">
      </div>
      <div class="form-group">
        <label>フロアID</label>
        <input type="text" id="incident-floor" placeholder="例: 1F, 2F-A">
      </div>
      <div class="form-group">
        <label>疑い猫（複数選択可）</label>
        <div style="max-height:200px;overflow-y:auto;padding:var(--space-2)">
          ${cats.map(c => `
            <label style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2);cursor:pointer;margin-bottom:0">
              <input type="checkbox" class="incident-cat-check" value="${c.id}" style="width:auto">
              <span>${Utils.escapeHtml(c.name)}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>状況メモ</label>
        <textarea id="incident-evidence" placeholder="発見時の状況を記録..."></textarea>
      </div>
    `;

        const footerEl = document.createElement('div');
        footerEl.style.display = 'flex';
        footerEl.style.gap = '0.75rem';
        footerEl.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.addEventListener('click', () => Modal.close());

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-danger';
        saveBtn.textContent = '報告する';
        saveBtn.addEventListener('click', () => {
            const type = document.getElementById('incident-type').value.trim();
            if (!type) { alert('種別を入力してください'); return; }

            const suspectedIds = [...document.querySelectorAll('.incident-cat-check:checked')].map(cb => cb.value);

            const incident = Store.add('incidents', {
                type,
                floor_id: document.getElementById('incident-floor').value.trim(),
                created_by: DriveAPI.getStaffId(),
                status: 'active',
                suspected_cat_ids: suspectedIds,
                evidence_note: document.getElementById('incident-evidence').value.trim()
            });

            Timeline.addEvent(null, 'floor_incident_created', {
                description: `フロアインシデント発生: ${type} (${incident.floor_id || '—'})`,
                incident_id: incident.id,
                suspected_cats: suspectedIds.map(id => Store.getCat(id)?.name).filter(Boolean).join(', ')
            });

            Notifications.checkAll();
            Modal.close();
            this.render(document.getElementById('main-content'));
        });

        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(saveBtn);

        Modal.show({ title: '🏠 フロアインシデント報告', content, footer: footerEl, size: 'lg' });
    },

    showResolveDialog(incidentId) {
        const incident = Store.getIncidentById(incidentId);
        if (!incident) return;

        const content = `
      <div class="form-group">
        <label>解決区分</label>
        <select id="resolve-type">
          <option value="suspected">疑い (suspected)</option>
          <option value="confirmed">確定 (confirmed)</option>
          <option value="unknown">不明 (unknown)</option>
        </select>
      </div>
    `;

        const footerEl = document.createElement('div');
        footerEl.style.display = 'flex';
        footerEl.style.gap = '0.75rem';
        footerEl.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.addEventListener('click', () => Modal.close());

        const resolveBtn = document.createElement('button');
        resolveBtn.className = 'btn btn-success';
        resolveBtn.textContent = '解決する';
        resolveBtn.addEventListener('click', () => {
            const resType = document.getElementById('resolve-type').value;
            Store.update('incidents', incidentId, {
                status: 'resolved',
                resolved_at: Utils.now(),
                resolved_by: DriveAPI.getStaffId(),
                resolution_type: resType
            });

            Timeline.addEvent(null, 'floor_incident_resolved', {
                description: `フロアインシデント解決: ${incident.type} (${resType})`,
                incident_id: incidentId
            });

            Modal.close();
            this.render(document.getElementById('main-content'));
        });

        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(resolveBtn);

        Modal.show({ title: '✅ インシデント解決', content, footer: footerEl });
    }
};
