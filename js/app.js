// ============================================================
// 猫の健康管理OS - App (Router + Init)
// ============================================================

const App = {
  isLoggedIn: false,

  async init() {
    try {
      // Load settings
      const settings = JSON.parse(localStorage.getItem('neko_settings') || '{}');

      // Configure Drive (with timeout protection)
      if (settings.driveClientId && settings.driveApiKey) {
        DriveAPI.configure(settings.driveClientId, settings.driveApiKey);
        try {
          await Promise.race([
            DriveAPI.init(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Drive init timeout')), 5000))
          ]);
        } catch (e) {
          console.warn('[App] Drive init skipped:', e.message);
        }
      }

      // Init Store
      await Store.init();

      // Check if we have a logged-in user
      const savedUser = localStorage.getItem('neko_user');
      if (savedUser) {
        DriveAPI.userProfile = JSON.parse(savedUser);
        this.isLoggedIn = true;
      }
    } catch (e) {
      console.error('[App] Init error:', e);
    }

    // Show login or app (always runs, even on error)
    if (this.isLoggedIn) {
      this.showApp();
    } else {
      this.showLogin();
    }
  },

  showLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-screen">
        <div class="login-card animate-fadeIn">
          <div class="logo-icon">🐈</div>
          <h1>猫の健康管理OS</h1>
          <p>猫の健康管理を一元化するシステム</p>
          <button class="btn btn-google" id="btn-google-login">
            <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right:8px">
              <path fill="#4285F4" d="M17.64 9.20c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.85 2.08-1.82 2.72v2.26h2.94c1.73-1.59 2.68-3.94 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.47 0 4.53-.82 6.04-2.18l-2.94-2.26c-.82.54-1.86.86-3.1.86-2.38 0-4.4-1.6-5.12-3.76H.88v2.34C2.38 15.96 5.44 18 9 18z"/>
              <path fill="#FBBC05" d="M3.88 10.66c-.18-.54-.28-1.12-.28-1.66 0-.58.1-1.14.28-1.68V4.98H.88C.32 6.1 0 7.52 0 9c0 1.48.32 2.9.88 4.02l3-2.36z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.52.46 3.46 1.36l2.58-2.58C13.52.88 11.46 0 9 0 5.44 0 2.38 2.04.88 4.98l3 2.34c.72-2.16 2.74-3.74 5.12-3.74z"/>
            </svg>
            Googleでログイン
          </button>
          <div class="divider" style="margin:var(--space-6) 0"></div>
          <button class="btn btn-secondary" id="btn-demo-login">デモモードで開始</button>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-4)">
            デモモードではGoogle Drive連携なしでローカル動作します
          </p>
        </div>
      </div>
    `;

    // Google login
    document.getElementById('btn-google-login').addEventListener('click', async () => {
      try {
        const profile = await DriveAPI.signIn();
        localStorage.setItem('neko_user', JSON.stringify(profile));
        this.isLoggedIn = true;
        await Store.init();
        this.showApp();
      } catch (e) {
        console.error('Login error:', e);
        alert('Google ログインに失敗しました。デモモードをお試しください。');
      }
    });

    // Demo login
    document.getElementById('btn-demo-login').addEventListener('click', () => {
      const demoUser = { email: 'demo@neko-health.local', name: 'デモスタッフ' };
      DriveAPI.userProfile = demoUser;
      localStorage.setItem('neko_user', JSON.stringify(demoUser));
      this.isLoggedIn = true;
      this.showApp();
    });
  },

  showApp() {
    const app = document.getElementById('app');
    const user = DriveAPI.userProfile || { name: 'ゲスト', email: '' };
    const initials = (user.name || '?').charAt(0);
    const activeNotifCount = Store.getActiveNotifications().length;
    const activeIncidentCount = Store.getActiveIncidents().length;

    app.innerHTML = `
      <button class="hamburger" id="hamburger-btn">☰</button>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <span class="logo-icon">🐈</span>
            <div>
              <div>健康管理OS</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);font-weight:normal">v2.2</div>
            </div>
          </div>
        </div>
        <nav class="sidebar-nav">
          <a href="#/" class="nav-item" data-route="dashboard">
            <span>📊</span> ダッシュボード
          </a>
          <a href="#/cat/new" class="nav-item" data-route="cat-new">
            <span>➕</span> 新規登録
          </a>
          <a href="#/incidents" class="nav-item" data-route="incidents">
            <span>🏠</span> インシデント
            ${activeIncidentCount > 0 ? `<span class="nav-badge">${activeIncidentCount}</span>` : ''}
          </a>
          <a href="#/timeline" class="nav-item" data-route="timeline">
            <span>📜</span> タイムライン
          </a>
          <a href="#/notifications" class="nav-item" data-route="notifications">
            <span>🔔</span> 通知
            ${activeNotifCount > 0 ? `<span class="nav-badge">${activeNotifCount}</span>` : ''}
          </a>
          <div style="flex:1"></div>
          <a href="#/settings" class="nav-item" data-route="settings">
            <span>⚙️</span> 設定
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">${initials}</div>
            <div>
              <div class="user-name">${Utils.escapeHtml(user.name || '')}</div>
              <div class="user-role">${Utils.escapeHtml(user.email || '')}</div>
            </div>
          </div>
        </div>
      </aside>
      <main class="main-content" id="main-content"></main>
      <div id="toast-container" class="toast-container"></div>
    `;

    // Hamburger menu
    document.getElementById('hamburger-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Close sidebar on content click (mobile)
    document.getElementById('main-content').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
    });

    // Route & render
    window.addEventListener('hashchange', () => this.navigate(window.location.hash));
    this.navigate(window.location.hash || '#/');

    // Check notifications
    Notifications.checkAll();
  },

  navigate(hash) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    // Parse route
    const route = hash.replace('#', '') || '/';
    const parts = route.split('/').filter(Boolean);

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const routeName = parts[0] || 'dashboard';

    // Route matching
    if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
      this.setActiveNav('dashboard');
      Dashboard.render(mainContent);
    }
    else if (parts[0] === 'cat' && parts[1] === 'new') {
      this.setActiveNav('cat-new');
      CatForm.render(mainContent);
    }
    else if (parts[0] === 'cat' && parts[2] === 'edit') {
      CatForm.render(mainContent, parts[1]);
    }
    else if (parts[0] === 'cat' && parts[1]) {
      CatDetail.render(mainContent, parts[1]);
      // Init sub-component events
      setTimeout(() => {
        Weight.initEvents(parts[1]);
        SOS.initEvents(parts[1]);
        Approval.initEvents(parts[1]);
      }, 50);
    }
    else if (parts[0] === 'incidents') {
      this.setActiveNav('incidents');
      Incident.render(mainContent);
    }
    else if (parts[0] === 'timeline') {
      this.setActiveNav('timeline');
      this.renderTimelinePage(mainContent);
    }
    else if (parts[0] === 'notifications') {
      this.setActiveNav('notifications');
      this.renderNotificationsPage(mainContent);
    }
    else if (parts[0] === 'settings') {
      this.setActiveNav('settings');
      this.renderSettingsPage(mainContent);
    }
    else {
      this.setActiveNav('dashboard');
      Dashboard.render(mainContent);
    }

    // Scroll to top
    mainContent.scrollTo(0, 0);
  },

  setActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });
  },

  // ── Timeline Page ──
  renderTimelinePage(container) {
    let mode = 'all';
    let searchQuery = '';
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📜 統合タイムライン</h1>
        <p class="page-subtitle">すべてのイベント履歴</p>
      </div>
      <div class="timeline-toolbar" style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-4)">
        <div class="tabs" id="timeline-page-tabs">
          <button class="tab active" data-mode="all">すべて</button>
          <button class="tab" data-mode="key">重要イベントのみ</button>
        </div>
        <input type="text" id="timeline-search" placeholder="🔍 検索（猫名、イベント種別...）" style="flex:1;min-width:200px;max-width:400px">
      </div>
      <div id="timeline-container"></div>
    `;

    const renderTL = () => {
      let events = Store.getFullTimeline(mode === 'key').slice(0, 200);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        events = events.filter(e => {
          const catName = (e.data?.cat_name || '').toLowerCase();
          const desc = (e.data?.description || '').toLowerCase();
          const type = (e.event_type || '').toLowerCase();
          return catName.includes(q) || desc.includes(q) || type.includes(q);
        });
      }
      Timeline.renderTimeline(events.slice(0, 100), document.getElementById('timeline-container'));
    };

    renderTL();

    document.querySelectorAll('#timeline-page-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#timeline-page-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        mode = tab.dataset.mode;
        renderTL();
      });
    });

    document.getElementById('timeline-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderTL();
    });
  },

  // ── Notifications Page ──
  renderNotificationsPage(container) {
    const allNotifs = Store.getAll('notifications').sort((a, b) => new Date(b.fired_at) - new Date(a.fired_at));
    const active = allNotifs.filter(n => n.status === 'active');
    const acknowledged = allNotifs.filter(n => n.status === 'acknowledged');
    const resolved = allNotifs.filter(n => n.status === 'resolved');

    const typeLabels = {
      sos_lv2: { icon: '⚠️', label: 'SOS Lv.2', severity: 'warning' },
      sos_lv3: { icon: '🚨', label: 'SOS Lv.3', severity: 'danger' },
      weight_unmeasured: { icon: '⚖️', label: '体重未計測', severity: 'warning' },
      floor_incident: { icon: '🏠', label: 'フロアインシデント', severity: 'danger' },
      approval_overdue: { icon: '📋', label: '再承認期限超過', severity: 'info' }
    };

    // 通知の詳細説明を生成
    const getNotifDetail = (n) => {
      const d = n.data || {};
      switch (n.type) {
        case 'sos_lv2':
          return {
            desc: `スタッフの直感で緊急度 Lv.2 が発動されました。スコアに −50 のペナルティが加算されています。`,
            note: d.note || '',
            action: '猫の状態を直接確認し、必要に応じて獣医に相談してください。',
            catId: n.cat_id
          };
        case 'sos_lv3':
          return {
            desc: `最高レベルの緊急SOS (Lv.3) が発動されました。スコア上限が 20 に制限されています。`,
            note: d.note || '',
            action: '⚠️ 直ちに獣医への受診を検討してください。',
            catId: n.cat_id
          };
        case 'weight_unmeasured':
          return {
            desc: `体重が ${d.days !== null && d.days !== undefined ? d.days + '日間' : '一度も'} 計測されていません。8日以上で −10 のペナルティが発生します。`,
            note: '',
            action: '猫の詳細画面から「⚖️ 体重を記録」してください。',
            catId: n.cat_id
          };
        case 'floor_incident':
          return {
            desc: `${d.floor_id ? 'フロア ' + d.floor_id + ' で' : ''}${d.type ? '「' + d.type + '」の' : ''}インシデントが発生しています。疑い猫のスコアにペナルティが加算されています。`,
            note: '',
            action: 'インシデント管理ページで詳細を確認し、解決処理を行ってください。',
            catId: null,
            linkHash: '#/incidents'
          };
        case 'approval_overdue': {
          const approvalTypeLabel = d.approval_type === 'modification' ? '管理方針の変更承認' : '管理方針の継続承認';
          const cycleLabel = d.cycle_days ? `${d.cycle_days}日周期` : '';
          const approverLabel = d.approved_by ? `承認者: ${d.approved_by}` : '';
          const confirmedLabel = d.confirmed_at ? `前回承認: ${Utils.formatDate(d.confirmed_at)}` : '';

          let descParts = [`「${approvalTypeLabel}」の再承認期限を`];
          if (d.days_overdue !== undefined) descParts.push(`${d.days_overdue}日超過しています。`);
          else descParts.push('超過しています。');
          if (cycleLabel) descParts.push(`（${cycleLabel}）`);

          let metaLine = [confirmedLabel, approverLabel].filter(Boolean).join(' / ');

          return {
            desc: descParts.join(''),
            carePlan: d.care_plan || '',
            note: d.change_summary || '',
            meta: metaLine,
            action: '猫の詳細画面から「🔄 継続承認」または「✏️ 管理方針の変更」を行ってください。',
            catId: n.cat_id,
            linkHash: n.cat_id ? `#/cat/${n.cat_id}` : null
          };
        }
        default:
          return { desc: '', note: '', action: '', catId: null };
      }
    };

    const renderNotifList = (notifs, showActions = false) => {
      if (notifs.length === 0) return '<p style="color:var(--text-muted);font-size:var(--text-sm)">なし</p>';
      return notifs.slice(0, 50).map(n => {
        const info = typeLabels[n.type] || { icon: '🔔', label: n.type, severity: 'info' };
        const detail = getNotifDetail(n);
        const catName = n.data?.cat_name || '';
        const catLink = detail.catId ? `<a href="#/cat/${detail.catId}" class="notif-cat-link" style="color:var(--accent-primary);text-decoration:none;font-weight:var(--font-semibold)">${Utils.escapeHtml(catName)}</a>` : '';
        const genericLink = detail.linkHash ? `<a href="${detail.linkHash}" style="color:var(--accent-primary);text-decoration:none;font-size:var(--text-xs)">→ 詳細を開く</a>` : '';

        return `
          <div class="notification-item" style="flex-direction:column;align-items:stretch;gap:var(--space-3);padding:var(--space-5);border-left:3px solid var(--color-${info.severity})">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <div class="notif-icon ${info.severity}" style="flex-shrink:0">${info.icon}</div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
                  <span style="font-weight:var(--font-semibold);font-size:var(--text-base)">${info.label}</span>
                  ${catLink ? `<span style="font-size:var(--text-sm)">— ${catLink}</span>` : ''}
                  <span class="badge badge-${info.severity}" style="margin-left:auto">${Utils.formatRelative(n.fired_at)}</span>
                </div>
              </div>
            </div>
            <div style="padding-left:48px">
              <div style="font-size:var(--text-sm);color:var(--text-secondary);line-height:1.6;margin-bottom:var(--space-2)">
                ${detail.desc}
              </div>
              ${detail.carePlan ? `
              <div style="font-size:var(--text-sm);color:var(--text-primary);background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2);line-height:1.5">
                📋 <strong>管理方針:</strong> ${Utils.escapeHtml(detail.carePlan)}
              </div>` : ''}
              ${detail.note ? `
              <div style="font-size:var(--text-sm);color:var(--text-primary);background:var(--bg-glass);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2);font-style:italic">
                📝 "${Utils.escapeHtml(detail.note)}"
              </div>` : ''}
              ${detail.meta ? `
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2)">
                📌 ${Utils.escapeHtml(detail.meta)}
              </div>` : ''}
              <div style="font-size:var(--text-xs);color:var(--accent-primary);margin-bottom:var(--space-2)">
                💡 ${detail.action} ${genericLink}
              </div>
              ${showActions ? `
              <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2)">
                <button class="btn btn-sm btn-secondary btn-ack-notif" data-id="${n.id}">👁️ 確認して対応中</button>
                <button class="btn btn-sm btn-success btn-resolve-notif" data-id="${n.id}">✅ 解決済みにする</button>
              </div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    };

    // 確認済みのレンダリング（次アクション付き）
    const renderAcknowledgedList = (notifs) => {
      if (notifs.length === 0) return '<p style="color:var(--text-muted);font-size:var(--text-sm)">なし</p>';
      return notifs.map(n => {
        const info = typeLabels[n.type] || { icon: '🔔', label: n.type, severity: 'info' };
        const catName = n.data?.cat_name || '';
        const catLink = n.cat_id ? `<a href="#/cat/${n.cat_id}" style="color:var(--accent-primary);text-decoration:none;font-weight:var(--font-semibold)">${Utils.escapeHtml(catName)}</a>` : '';
        return `
          <div class="notification-item" style="flex-direction:column;align-items:stretch;gap:var(--space-3);padding:var(--space-5);border-left:3px solid var(--color-${info.severity})">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <div class="notif-icon ${info.severity}" style="flex-shrink:0">${info.icon}</div>
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
                  <span style="font-weight:var(--font-semibold)">${info.label}</span>
                  ${catLink ? `<span style="font-size:var(--text-sm)">— ${catLink}</span>` : ''}
                  <span class="badge badge-muted" style="margin-left:auto">${Utils.formatRelative(n.fired_at)}</span>
                </div>
              </div>
            </div>
            <div style="padding-left:48px">
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2)">
                <div style="font-size:var(--text-xs);color:var(--color-warning);font-weight:var(--font-semibold);margin-bottom:var(--space-1)">📌 次アクション</div>
                <div style="font-size:var(--text-sm);color:var(--text-primary);line-height:1.6">${Utils.escapeHtml(n.next_action || '(未記入)')}</div>
              </div>
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2)">
                👁️ 対応者: ${Utils.escapeHtml(n.acknowledged_by || '')} / ${n.acknowledged_at ? Utils.formatRelative(n.acknowledged_at) : ''}
              </div>
              <div style="display:flex;gap:var(--space-2)">
                <button class="btn btn-sm btn-success btn-resolve-notif" data-id="${n.id}">✅ 解決済みにする</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🔔 通知管理</h1>
        <p class="page-subtitle">確認済み = 次アクションを記録して対応中 / 解決済み = 対応完了（クローズ）</p>
      </div>

      <h2 style="font-size:var(--text-lg);font-weight:var(--font-semibold);margin-bottom:var(--space-4)">
        🔴 アクティブ (${active.length})
      </h2>
      <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">未対応の通知。確認して次アクションを記録してください。</p>
      ${renderNotifList(active, true)}

      ${acknowledged.length > 0 ? `
      <div class="divider"></div>
      <h2 style="font-size:var(--text-lg);font-weight:var(--font-semibold);margin-bottom:var(--space-4);color:var(--color-warning)">
        📌 確認済み — 対応中 (${acknowledged.length})
      </h2>
      <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3)">次アクションが記録済み。対応完了したら「解決済み」にしてください。</p>
      ${renderAcknowledgedList(acknowledged)}` : ''}

      ${resolved.length > 0 ? `
      <div class="divider"></div>
      <h2 style="font-size:var(--text-lg);font-weight:var(--font-semibold);margin-bottom:var(--space-4);color:var(--text-muted)">
        ✅ 解決済み — クローズ (${resolved.length})
      </h2>
      ${renderNotifList(resolved.slice(0, 20))}` : ''}
    `;

    // Acknowledge button → open modal for next action
    container.querySelectorAll('.btn-ack-notif').forEach(btn => {
      btn.addEventListener('click', () => {
        const notifId = btn.dataset.id;

        const content = `
          <div class="form-group">
            <label>対応者名 <span style="color:var(--color-danger)">*</span></label>
            <input type="text" id="ack-staff-name" placeholder="例: 田中" required>
            <div class="form-hint">対応するスタッフの名前を入力してください</div>
          </div>
          <div class="form-group">
            <label>次アクション <span style="color:var(--color-danger)">*</span></label>
            <textarea id="ack-next-action" placeholder="例: 明日の朝に体重計測を実施する&#10;例: 獣医に連絡し、来週中に受診予約を入れる&#10;例: 飲水量の記録を開始する" required style="min-height:100px"></textarea>
            <div class="form-hint">この通知に対して次に何をするかを具体的に記載してください</div>
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
        saveBtn.textContent = '確認して対応中';
        saveBtn.addEventListener('click', () => {
          const nextAction = document.getElementById('ack-next-action').value.trim();
          const staffName = document.getElementById('ack-staff-name').value.trim();
          if (!staffName) { alert('対応者名は必須です'); return; }
          if (!nextAction) { alert('次アクションは必須です'); return; }
          Notifications.acknowledge(notifId, nextAction, staffName);
          Modal.close();
          this.renderNotificationsPage(container);
        });

        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(saveBtn);

        Modal.show({ title: '👁️ 確認 — 次アクションの記録', content, footer: footerEl });
      });
    });

    // Resolve button
    container.querySelectorAll('.btn-resolve-notif').forEach(btn => {
      btn.addEventListener('click', () => {
        Notifications.resolve(btn.dataset.id);
        this.renderNotificationsPage(container);
      });
    });
  },

  // ── Settings Page ──
  renderSettingsPage(container) {
    const settings = Store.getSettings();

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">⚙️ 設定</h1>
      </div>

      <div class="card mb-6">
        <div class="card-header"><h3 class="card-title">🔐 Google Drive 接続</h3></div>
        <div style="padding:var(--space-6)">
          <div class="form-group">
            <label>OAuth クライアントID</label>
            <input type="text" id="setting-client-id" value="${Utils.escapeHtml(settings.driveClientId || '')}" placeholder="xxxx.apps.googleusercontent.com">
            <p class="form-hint">GCP コンソール → API とサービス → 認証情報 で作成</p>
          </div>
          <div class="form-group">
            <label>API キー</label>
            <input type="text" id="setting-api-key" value="${Utils.escapeHtml(settings.driveApiKey || '')}" placeholder="AIza...">
          </div>
          <button class="btn btn-primary" id="btn-save-drive-settings">保存して再接続</button>
        </div>
      </div>

      <div class="card mb-6">
        <div class="card-header"><h3 class="card-title">📦 データ管理</h3></div>
        <div style="padding:var(--space-6)">
          <div style="display:flex;gap:var(--space-4);flex-wrap:wrap">
            <button class="btn btn-secondary" id="btn-export-all">📥 全データエクスポート</button>
            <button class="btn btn-secondary" id="btn-import-all">📤 データインポート</button>
            <button class="btn btn-secondary" id="btn-print-report">🖨️ レポート印刷</button>
            <input type="file" id="import-file" accept=".json" hidden>
          </div>
          <p class="form-hint mt-4">エクスポートしたJSONファイルは監査パックとしても使用できます</p>
        </div>
      </div>

      <div class="card mb-6">
        <div class="card-header"><h3 class="card-title">👤 アカウント</h3></div>
        <div style="padding:var(--space-6)">
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-4)">
            ログイン中: ${Utils.escapeHtml(DriveAPI.userProfile?.name || '—')} (${Utils.escapeHtml(DriveAPI.userProfile?.email || '—')})
          </p>
          <button class="btn btn-danger" id="btn-logout">ログアウト</button>
        </div>
      </div>
    `;

    // Drive settings
    document.getElementById('btn-save-drive-settings').addEventListener('click', () => {
      Store.saveSettings({
        driveClientId: document.getElementById('setting-client-id').value.trim(),
        driveApiKey: document.getElementById('setting-api-key').value.trim()
      });
      alert('保存しました。ページを再読み込みして接続を確認してください。');
    });

    // Export
    document.getElementById('btn-export-all').addEventListener('click', () => {
      const data = Store.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neko-health-os-backup_${Utils.today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import
    const importFile = document.getElementById('import-file');
    document.getElementById('btn-import-all').addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (confirm('既存データを上書きしてインポートしますか？')) {
            Store.importAll(data);
            alert('インポート完了しました');
            this.showApp();
          }
        } catch (err) {
          alert('無効なJSONファイルです');
        }
      };
      reader.readAsText(file);
    });

    // Print report
    document.getElementById('btn-print-report')?.addEventListener('click', () => {
      const cats = Store.getCats();
      const allScores = Scoring.calculateAllScores();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html><head><title>猫の健康管理OS レポート</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h1 { font-size: 1.5em; border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { font-size: 1.1em; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 0.85em; }
          th { background: #f5f5f5; }
          .score { font-weight: bold; font-size: 1.1em; }
          .footer { margin-top: 30px; font-size: 0.75em; color: #999; }
        </style></head><body>
        <h1>🐈 猫の健康管理OS — レポート</h1>
        <p>出力日時: ${new Date().toLocaleString('ja-JP')}</p>
        <p>登録猫数: ${cats.length}</p>
        <table>
          <tr><th>名前</th><th>ステータス</th><th>スコア</th><th>W_risk</th><th>年齢</th><th>FIV</th><th>FeLV</th><th>持病</th></tr>
          ${allScores.map(({ cat, score }) => `
            <tr>
              <td>${cat.name}</td>
              <td>${Utils.statusLabel(cat.status)}</td>
              <td class="score">${score.S_final ?? '-'}</td>
              <td>${score.W_risk ?? '-'}</td>
              <td>${Utils.calculateAge(cat) ?? '-'}歳</td>
              <td>${cat.fiv_status === 'positive' ? '陽性' : cat.fiv_status === 'negative' ? '陰性' : '-'}</td>
              <td>${cat.felv_status === 'positive' ? '陽性' : cat.felv_status === 'negative' ? '陰性' : '-'}</td>
              <td>${(cat.chronic_conditions || []).map(c => c.condition_name).join(', ') || '-'}</td>
            </tr>
          `).join('')}
        </table>
        <div class="footer">猫の健康管理OS v2.2 — ${DriveAPI.userProfile?.name || 'スタッフ'}</div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      if (confirm('ログアウトしますか？')) {
        DriveAPI.signOut();
        localStorage.removeItem('neko_user');
        this.isLoggedIn = false;
        this.showLogin();
      }
    });
  }
};

// ── Start ──
document.addEventListener('DOMContentLoaded', () => App.init());
