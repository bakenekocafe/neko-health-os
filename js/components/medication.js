// ============================================================
// 猫の健康管理OS - Medication Component (投薬記録)
// ============================================================

const Medication = {
    renderInline(catId) {
        const records = Store.getAll('records')
            .filter(r => r.cat_id === catId && r.type === 'medication')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const activeCount = records.filter(r => !r.ended_at).length;

        return `
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
            <span style="font-size:var(--text-sm);color:var(--text-muted)">
              ${activeCount > 0 ? `服用中: ${activeCount}種類` : '投薬記録なし'}
            </span>
            <button class="btn btn-primary btn-sm" id="btn-add-medication">💊 投薬記録</button>
          </div>
          ${records.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:var(--space-2)">
            ${records.slice(0, 10).map(r => `
              <div class="stat-card" style="border-left:3px solid ${r.ended_at ? 'var(--text-muted)' : 'var(--color-primary)'}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-weight:var(--font-semibold);font-size:var(--text-sm)">${Utils.escapeHtml(r.data?.medicine_name || '')}</div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">
                      ${Utils.escapeHtml(r.data?.dosage || '')} / ${Utils.escapeHtml(r.data?.frequency || '')}
                    </div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">${Utils.formatDate(r.timestamp)}</div>
                    ${r.ended_at
                ? `<span class="badge badge-muted">終了</span>`
                : `<button class="btn btn-sm btn-secondary btn-end-medication" data-id="${r.id}">終了</button>`}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>` : ''}
        </div>`;
    },

    initEvents(catId) {
        document.getElementById('btn-add-medication')?.addEventListener('click', () => {
            this.showDialog(catId);
        });

        document.querySelectorAll('.btn-end-medication').forEach(btn => {
            btn.addEventListener('click', () => {
                const recordId = btn.dataset.id;
                Store.update('records', recordId, { ended_at: Utils.now() });
                App.navigate(window.location.hash);
            });
        });
    },

    showDialog(catId) {
        const content = `
        <div>
          <div class="form-group">
            <label>薬品名 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="med-name" placeholder="例: アモキシシリン" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>用量</label>
              <input type="text" id="med-dosage" placeholder="例: 50mg">
            </div>
            <div class="form-group">
              <label>頻度</label>
              <input type="text" id="med-frequency" placeholder="例: 1日2回">
            </div>
          </div>
          <div class="form-group">
            <label>備考</label>
            <textarea id="med-note" placeholder="例: 食後に投与、副作用注意"></textarea>
          </div>
        </div>`;

        const footerEl = document.createElement('div');
        footerEl.style.display = 'flex';
        footerEl.style.gap = '0.75rem';
        footerEl.style.justifyContent = 'flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'キャンセル';
        cancelBtn.addEventListener('click', () => Modal.close());

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = '記録する';
        saveBtn.addEventListener('click', () => {
            const name = document.getElementById('med-name').value.trim();
            if (!name) { alert('薬品名は必須です'); return; }

            const cat = Store.getCat(catId);
            Store.addRecord({
                cat_id: catId,
                type: 'medication',
                data: {
                    medicine_name: name,
                    dosage: document.getElementById('med-dosage').value.trim(),
                    frequency: document.getElementById('med-frequency').value.trim(),
                    note: document.getElementById('med-note').value.trim()
                },
                staff: DriveAPI.getStaffId()
            });

            Timeline.addEvent(catId, 'medication_started', {
                cat_name: cat?.name || '',
                description: `投薬開始: ${name}`,
                staff: DriveAPI.getStaffId()
            });

            Modal.close();
            App.navigate(window.location.hash);
        });

        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(saveBtn);
        Modal.show({ title: '💊 投薬記録', content, footer: footerEl });
    }
};
