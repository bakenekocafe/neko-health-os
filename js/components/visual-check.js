// ============================================================
// 猫の健康管理OS - Visual Check Component (観察記録)
// ============================================================

const VisualCheck = {
    // 観察項目の定義
    ITEMS: [
        {
            id: 'coat', label: '被毛の状態', icon: '🐾', options: [
                { value: 0, label: '良好' },
                { value: -5, label: 'やや乱れ (-5)' },
                { value: -10, label: '著しく乱れ (-10)' }
            ]
        },
        {
            id: 'eyes', label: '目の状態', icon: '👁️', options: [
                { value: 0, label: '異常なし' },
                { value: -5, label: '軽度の充血/目やに (-5)' },
                { value: -10, label: '重度の充血/腫れ (-10)' }
            ]
        },
        {
            id: 'appetite', label: '食欲', icon: '🍽️', options: [
                { value: 0, label: '正常' },
                { value: -5, label: 'やや減退 (-5)' },
                { value: -15, label: '食べない (-15)' }
            ]
        },
        {
            id: 'activity', label: '活動量', icon: '🏃', options: [
                { value: 0, label: '正常' },
                { value: -5, label: 'やや低下 (-5)' },
                { value: -10, label: '著しく低下 (-10)' }
            ]
        },
        {
            id: 'hydration', label: '飲水量', icon: '💧', options: [
                { value: 0, label: '正常' },
                { value: -5, label: '減少/増加 (-5)' },
                { value: -10, label: '著しく異常 (-10)' }
            ]
        },
        {
            id: 'litter', label: '排泄の状態', icon: '🚽', options: [
                { value: 0, label: '正常' },
                { value: -5, label: 'やや異常 (-5)' },
                { value: -15, label: '血尿/下痢/便秘 (-15)' }
            ]
        }
    ],

    renderInline(catId) {
        const latestRecord = Store.getLatestRecord(catId);
        const visualScores = latestRecord?.visual_scores || [];
        const totalPenalty = visualScores.reduce((sum, vs) => sum + (vs.penalty || 0), 0);
        const lastChecked = latestRecord?.timestamp;

        return `
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
            <div>
              ${lastChecked
                ? `<span style="font-size:var(--text-sm);color:var(--text-muted)">最終チェック: ${Utils.formatRelative(lastChecked)}</span>`
                : '<span style="font-size:var(--text-sm);color:var(--color-warning)">⚠ 未チェック</span>'}
              ${totalPenalty < 0 ? `<span class="badge badge-danger" style="margin-left:var(--space-2)">減点合計: ${totalPenalty}</span>` : ''}
            </div>
            <button class="btn btn-primary btn-sm" id="btn-visual-check">📋 観察チェック</button>
          </div>
          ${visualScores.length > 0 ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--space-2)">
            ${visualScores.map(vs => {
                    const item = this.ITEMS.find(i => i.id === vs.item_id);
                    const color = vs.penalty === 0 ? 'var(--color-success)' : vs.penalty >= -5 ? 'var(--color-warning)' : 'var(--color-danger)';
                    return `<div class="stat-card" style="border-left:3px solid ${color}">
                  <div style="font-size:var(--text-xs);color:var(--text-muted)">${item?.icon || '📋'} ${item?.label || vs.item_id}</div>
                  <div style="font-size:var(--text-sm);font-weight:var(--font-semibold);color:${color}">${vs.label || (vs.penalty === 0 ? '良好' : vs.penalty + '')}</div>
                </div>`;
                }).join('')}
          </div>` : ''}
        </div>`;
    },

    initEvents(catId) {
        document.getElementById('btn-visual-check')?.addEventListener('click', () => {
            this.showCheckModal(catId);
        });
    },

    showCheckModal(catId) {
        const latestRecord = Store.getLatestRecord(catId);
        const existing = latestRecord?.visual_scores || [];

        const content = `
        <div style="max-height:60vh;overflow-y:auto">
          <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4)">
            各項目を観察して記録してください。ペナルティはスコアに即座に反映されます。
          </p>
          ${this.ITEMS.map(item => {
            const current = existing.find(e => e.item_id === item.id);
            const currentVal = current ? current.penalty : 0;
            return `
              <div class="form-group" style="margin-bottom:var(--space-4)">
                <label style="font-weight:var(--font-semibold)">${item.icon} ${item.label}</label>
                <select class="visual-check-select" data-item-id="${item.id}">
                  ${item.options.map(opt => `<option value="${opt.value}" ${currentVal === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                </select>
              </div>`;
        }).join('')}
          <div class="form-group">
            <label>📝 備考</label>
            <textarea id="visual-check-note" placeholder="気になったこと、観察のメモなど">${latestRecord?.visual_note || ''}</textarea>
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
            const scores = [];
            document.querySelectorAll('.visual-check-select').forEach(sel => {
                const itemDef = this.ITEMS.find(i => i.id === sel.dataset.itemId);
                const penalty = parseInt(sel.value);
                const opt = itemDef.options.find(o => o.value === penalty);
                scores.push({
                    item_id: sel.dataset.itemId,
                    penalty: penalty,
                    label: opt?.label || ''
                });
            });

            const note = document.getElementById('visual-check-note').value.trim();
            const cat = Store.getCat(catId);

            // Save as record
            Store.addRecord({
                cat_id: catId,
                type: 'visual_check',
                visual_scores: scores,
                visual_note: note,
                sos_level: latestRecord?.sos_level || null,
                sos_note: latestRecord?.sos_note || '',
                staff: DriveAPI.getStaffId()
            });

            // Timeline
            const totalPenalty = scores.reduce((sum, s) => sum + s.penalty, 0);
            Timeline.addEvent(catId, 'visual_check', {
                cat_name: cat?.name || '',
                description: `観察チェック実施 (減点合計: ${totalPenalty})`,
                staff: DriveAPI.getStaffId()
            });

            Modal.close();
            // Refresh the page
            App.navigate(window.location.hash);
        });

        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(saveBtn);
        Modal.show({ title: '📋 観察チェック', content, footer: footerEl });
    }
};
