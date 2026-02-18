// ============================================================
// 猫の健康管理OS - Approval Component
// ============================================================

const Approval = {
  renderInline(catId, approval) {
    if (!approval) {
      return `
        <div style="display:flex;align-items:center;justify-content:space-between">
          <p style="color:var(--text-muted);font-size:var(--text-sm)">再承認サイクルが設定されていません</p>
          <button class="btn btn-sm btn-primary" id="btn-setup-approval-${catId}">設定する</button>
        </div>
      `;
    }

    const daysSince = Utils.daysSince(approval.confirmed_at);
    const isOverdue = daysSince >= approval.reapproval_cycle_days;
    const daysRemaining = approval.reapproval_cycle_days - daysSince;

    return `
      <div class="approval-status ${isOverdue ? 'overdue' : 'current'}">
        <span style="font-size:1.5rem">${isOverdue ? '⚠️' : '✅'}</span>
        <div style="flex:1">
          <div style="font-weight:var(--font-semibold)">
            ${isOverdue ? '再承認が必要です' : '承認済み'}
          </div>
          ${approval.care_plan ? `
          <div style="font-size:var(--text-sm);color:var(--text-primary);background:var(--bg-glass);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-top:var(--space-2);line-height:1.5">
            📋 <strong>管理方針:</strong> ${Utils.escapeHtml(approval.care_plan)}
          </div>` : ''}
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">
            前回承認: ${Utils.formatDate(approval.confirmed_at)}
            / 周期: ${approval.reapproval_cycle_days}日
            / ${isOverdue ? `${Math.abs(daysRemaining)}日超過` : `残り${daysRemaining}日`}
          </div>
          ${approval.approved_by ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">承認者: ${Utils.escapeHtml(approval.approved_by)}</div>` : ''}
        </div>
      </div>

      <div class="approval-actions">
        <button class="btn btn-success" id="btn-continue-approval-${catId}">
          🔄 継続承認
        </button>
        <button class="btn btn-warning" id="btn-modify-approval-${catId}">
          ✏️ 内容変更
        </button>
      </div>
    `;
  },

  initEvents(catId) {
    // Setup
    const setupBtn = document.getElementById(`btn-setup-approval-${catId}`);
    if (setupBtn) {
      setupBtn.addEventListener('click', () => this.showSetupDialog(catId));
    }

    // Continue
    const contBtn = document.getElementById(`btn-continue-approval-${catId}`);
    if (contBtn) {
      contBtn.addEventListener('click', () => this.continuationApproval(catId));
    }

    // Modify
    const modBtn = document.getElementById(`btn-modify-approval-${catId}`);
    if (modBtn) {
      modBtn.addEventListener('click', () => this.showModifyDialog(catId));
    }
  },

  showSetupDialog(catId) {
    const content = `
      <div class="form-group">
        <label>健康管理方針 <span style="color:var(--color-danger)">*</span></label>
        <textarea id="approval-care-plan" placeholder="例: 腎臓病のため療法食を継続。週1回の体重計測と水分摂取量の観察を行う。" required style="min-height:80px"></textarea>
        <div class="form-hint">日々の健康管理で何を実施するかを記載してください</div>
      </div>
      <div class="form-group">
        <label>再承認周期（日）</label>
        <select id="approval-cycle">
          <option value="7">7日</option>
          <option value="14" selected>14日</option>
          <option value="30">30日</option>
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

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '設定する';
    saveBtn.addEventListener('click', () => {
      const carePlan = document.getElementById('approval-care-plan').value.trim();
      if (!carePlan) { alert('健康管理方針は必須です'); return; }
      const cycle = parseInt(document.getElementById('approval-cycle').value);
      Store.add('approvals', {
        cat_id: catId,
        type: 'continuation',
        confirmed_at: Utils.now(),
        reapproval_cycle_days: cycle,
        approved_by: DriveAPI.getStaffId(),
        care_plan: carePlan
      });
      Modal.close();
      App.navigate(window.location.hash);
    });

    footerEl.appendChild(cancelBtn);
    footerEl.appendChild(saveBtn);

    Modal.show({ title: '📋 再承認サイクル設定', content, footer: footerEl });
  },

  continuationApproval(catId) {
    const cat = Store.getCat(catId);
    const existing = Store.getApprovalForCat(catId);
    if (!existing) return;

    Store.add('approvals', {
      cat_id: catId,
      type: 'continuation',
      confirmed_at: Utils.now(),
      reapproval_cycle_days: existing.reapproval_cycle_days,
      approved_by: DriveAPI.getStaffId(),
      care_plan: existing.care_plan || ''
    });

    Timeline.addEvent(catId, 'approval_continued', {
      cat_name: cat.name,
      description: `継続承認: ${existing.care_plan || '管理方針の継続'}`,
      staff: DriveAPI.getStaffId()
    });

    Notifications.resolveByType(catId, 'approval_overdue');
    App.navigate(window.location.hash);
  },

  showModifyDialog(catId) {
    const cat = Store.getCat(catId);
    const existing = Store.getApprovalForCat(catId);
    const currentPlan = existing?.care_plan || '';

    const content = `
      <div class="alert alert-info" style="margin-bottom:var(--space-4)">
        <span>ℹ️</span>
        <div>管理方針の変更は代表の承認が必要です。変更理由は必須です。</div>
      </div>
      ${currentPlan ? `
      <div class="form-group">
        <label>現在の管理方針</label>
        <div style="font-size:var(--text-sm);color:var(--text-secondary);background:var(--bg-glass);border-radius:var(--radius-md);padding:var(--space-3);border:1px solid var(--border-subtle)">
          ${Utils.escapeHtml(currentPlan)}
        </div>
      </div>` : ''}
      <div class="form-group">
        <label>新しい管理方針 <span style="color:var(--color-danger)">*</span></label>
        <textarea id="modify-care-plan" placeholder="変更後の管理方針を記載..." required style="min-height:80px">${Utils.escapeHtml(currentPlan)}</textarea>
      </div>
      <div class="form-group">
        <label>再承認周期（日）</label>
        <select id="modify-cycle">
          <option value="7" ${existing?.reapproval_cycle_days === 7 ? 'selected' : ''}>7日</option>
          <option value="14" ${existing?.reapproval_cycle_days === 14 ? 'selected' : ''}>14日</option>
          <option value="30" ${existing?.reapproval_cycle_days === 30 ? 'selected' : ''}>30日</option>
        </select>
      </div>
      <div class="form-group">
        <label>変更理由 <span style="color:var(--color-danger)">*</span></label>
        <textarea id="modify-summary" placeholder="なぜ管理方針を変更するのか..." required></textarea>
      </div>
      <div class="form-group">
        <label>承認者（代表名）</label>
        <input type="text" id="modify-approver" placeholder="代表名を入力" value="${DriveAPI.getStaffName()}">
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
    saveBtn.className = 'btn btn-warning';
    saveBtn.textContent = '変更を承認';
    saveBtn.addEventListener('click', () => {
      const newPlan = document.getElementById('modify-care-plan').value.trim();
      const summary = document.getElementById('modify-summary').value.trim();
      if (!newPlan) { alert('管理方針は必須です'); return; }
      if (!summary) { alert('変更理由は必須です'); return; }

      Store.add('approvals', {
        cat_id: catId,
        type: 'modification',
        confirmed_at: Utils.now(),
        reapproval_cycle_days: parseInt(document.getElementById('modify-cycle').value),
        approved_by: document.getElementById('modify-approver').value.trim() || DriveAPI.getStaffId(),
        care_plan: newPlan,
        change_summary: summary,
        approved_at: Utils.now()
      });

      Timeline.addEvent(catId, 'modification_approved', {
        cat_name: cat.name,
        description: `管理方針変更: ${summary}`,
        staff: DriveAPI.getStaffId()
      });

      Notifications.resolveByType(catId, 'approval_overdue');
      Modal.close();
      App.navigate(window.location.hash);
    });

    footerEl.appendChild(cancelBtn);
    footerEl.appendChild(saveBtn);

    Modal.show({ title: `✏️ 管理方針の変更 - ${cat.name}`, content, footer: footerEl, size: 'lg' });
  }
};
