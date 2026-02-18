// ============================================================
// 猫の健康管理OS - SOS Bypass Component
// ============================================================

const SOS = {
    renderInline(catId, latestRecord) {
        const activeLevel = latestRecord?.sos_level || null;

        return `
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4)">
        現場スタッフの直感に基づく緊急度判定。AIや数値では検出できない異変を即座に反映します。
      </p>

      <div class="sos-group" id="sos-group-${catId}">
        <button class="btn-sos btn-sos-1 ${activeLevel === 1 ? 'active' : ''}" data-level="1" data-cat-id="${catId}">
          <div>Lv.1</div>
          <div style="font-size:var(--text-xs);font-weight:normal;margin-top:4px">-20点</div>
        </button>
        <button class="btn-sos btn-sos-2 ${activeLevel === 2 ? 'active' : ''}" data-level="2" data-cat-id="${catId}">
          <div>Lv.2</div>
          <div style="font-size:var(--text-xs);font-weight:normal;margin-top:4px">-50点 + 通知</div>
        </button>
        <button class="btn-sos btn-sos-3 ${activeLevel === 3 ? 'active' : ''}" data-level="3" data-cat-id="${catId}">
          <div>Lv.3</div>
          <div style="font-size:var(--text-xs);font-weight:normal;margin-top:4px">上限20</div>
        </button>
      </div>

      ${activeLevel ? `
      <div class="alert ${activeLevel >= 2 ? 'alert-danger' : 'alert-warning'}" style="margin-top:var(--space-4)">
        <span>${activeLevel === 3 ? '🚨' : '⚠️'}</span>
        <div>
          <strong>SOS Lv.${activeLevel} 発動中</strong>
          ${latestRecord.sos_note ? `<div style="margin-top:4px">${Utils.escapeHtml(latestRecord.sos_note)}</div>` : ''}
          <div style="font-size:var(--text-xs);margin-top:4px;color:var(--text-muted)">
            記録: ${Utils.formatDateTime(latestRecord.timestamp)} by ${Utils.escapeHtml(latestRecord.staff_id || '')}
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" id="btn-sos-clear-${catId}">解除</button>
      </div>` : ''}
    `;
    },

    initEvents(catId) {
        const group = document.getElementById(`sos-group-${catId}`);
        if (!group) return;

        group.querySelectorAll('.btn-sos').forEach(btn => {
            btn.addEventListener('click', () => {
                const level = parseInt(btn.dataset.level);
                this.activate(catId, level);
            });
        });

        const clearBtn = document.getElementById(`btn-sos-clear-${catId}`);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear(catId));
        }
    },

    activate(catId, level) {
        const cat = Store.getCat(catId);
        if (!cat) return;

        // Show note dialog for Lv.2+
        if (level >= 2) {
            const content = `
        <div class="alert ${level === 3 ? 'alert-danger' : 'alert-warning'}" style="margin-bottom:var(--space-4)">
          <span>${level === 3 ? '🚨' : '⚠️'}</span>
          <div>
            <strong>SOS Lv.${level} を発動します</strong>
            <div style="font-size:var(--text-sm);margin-top:4px">
              ${level === 2 ? 'スコアに -50 のペナルティが加算され、通知が送信されます。' : 'スコア上限が 20 に制限され、通知が送信されます。'}
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>状況メモ（任意）</label>
          <textarea id="sos-note" placeholder="気になる症状や状況を記録..."></textarea>
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

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.textContent = '発動する';
            confirmBtn.addEventListener('click', () => {
                const note = document.getElementById('sos-note').value;
                this.doActivate(catId, level, note);
                Modal.close();
                App.navigate(window.location.hash);
            });

            footerEl.appendChild(cancelBtn);
            footerEl.appendChild(confirmBtn);

            Modal.show({
                title: `🚨 SOS Lv.${level} - ${cat.name}`,
                content,
                footer: footerEl
            });
        } else {
            this.doActivate(catId, level, '');
            App.navigate(window.location.hash);
        }
    },

    doActivate(catId, level, note) {
        const cat = Store.getCat(catId);
        Store.addRecord({
            cat_id: catId,
            sos_level: level,
            sos_note: note,
            date: Utils.today()
        });

        const eventType = `sos_lv${level}`;
        Timeline.addEvent(catId, eventType, {
            cat_name: cat.name,
            note,
            description: `SOS Lv.${level} が発動されました`,
            staff: DriveAPI.getStaffId()
        });

        // Fire notification for Lv.2+
        if (level >= 2) {
            Notifications.checkAll();
        }
    },

    clear(catId) {
        const cat = Store.getCat(catId);
        Store.addRecord({
            cat_id: catId,
            sos_level: null,
            sos_note: '',
            date: Utils.today()
        });
        Timeline.addEvent(catId, 'cat_updated', {
            cat_name: cat.name,
            description: 'SOS が解除されました',
            staff: DriveAPI.getStaffId()
        });
        App.navigate(window.location.hash);
    }
};
