// ============================================================
// 猫の健康管理OS - Dashboard Component
// ============================================================

const Dashboard = {
    currentFilter: 'all',
    searchQuery: '',

    render(container) {
        const allScores = Scoring.calculateAllScores();
        const facilityCats = allScores.filter(s => s.cat.status === 'facility');
        const trialCats = allScores.filter(s => s.cat.status === 'trial');
        const adoptedCats = allScores.filter(s => s.cat.status === 'adopted');
        const activeNotifs = Store.getActiveNotifications();
        const activeIncidents = Store.getActiveIncidents();

        // Stats
        const avgScore = facilityCats.length > 0
            ? Math.round(facilityCats.reduce((s, c) => s + (c.score.S_final || 0), 0) / facilityCats.length)
            : 0;
        const criticalCount = facilityCats.filter(c => c.score.S_final !== null && c.score.S_final < 40).length;

        container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🐈 ダッシュボード</h1>
        <p class="page-subtitle">全 ${allScores.length} 頭の健康状態を管理</p>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">施設内</div>
          <div class="stat-value">${facilityCats.length}<span style="font-size:var(--text-sm);color:var(--text-muted)"> 頭</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">平均スコア</div>
          <div class="stat-value" style="color:${Utils.scoreColor(avgScore)}">${avgScore}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">要注意</div>
          <div class="stat-value" style="color:var(--color-danger)">${criticalCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">通知</div>
          <div class="stat-value" style="color:${activeNotifs.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${activeNotifs.length}</div>
        </div>
      </div>

      ${activeIncidents.length > 0 ? `
      <div class="alert alert-danger mb-6">
        <span>🚨</span>
        <div>
          <strong>アクティブなフロアインシデント: ${activeIncidents.length}件</strong>
          <div style="font-size:var(--text-xs);margin-top:4px">
            ${activeIncidents.map(i => `${i.floor_id || 'フロア'} - ${i.type || 'インシデント'}`).join(' / ')}
          </div>
        </div>
        <a href="#/incidents" class="btn btn-sm btn-danger" style="margin-left:auto">詳細</a>
      </div>` : ''}

      <!-- Toolbar -->
      <div class="dashboard-toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="名前・管理IDで検索..." id="dash-search" value="${Utils.escapeHtml(this.searchQuery)}">
        </div>
        <div class="filter-group">
          <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">すべて</button>
          <button class="filter-btn ${this.currentFilter === 'facility' ? 'active' : ''}" data-filter="facility">施設内</button>
          <button class="filter-btn ${this.currentFilter === 'trial' ? 'active' : ''}" data-filter="trial">トライアル</button>
          <button class="filter-btn ${this.currentFilter === 'adopted' ? 'active' : ''}" data-filter="adopted">譲渡済</button>
        </div>
        <button class="btn btn-primary" id="btn-add-cat">＋ 新規登録</button>
      </div>

      <!-- Cat Grid -->
      <div class="cat-grid" id="cat-grid"></div>
    `;

        // Render cat cards
        this.renderCards(allScores);

        // Event listeners
        document.getElementById('dash-search').addEventListener('input', Utils.debounce((e) => {
            this.searchQuery = e.target.value;
            this.renderCards(allScores);
        }, 200));

        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentFilter = btn.dataset.filter;
                container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCards(allScores);
            });
        });

        document.getElementById('btn-add-cat').addEventListener('click', () => {
            window.location.hash = '#/cat/new';
        });
    },

    renderCards(allScores) {
        const grid = document.getElementById('cat-grid');
        if (!grid) return;

        let filtered = allScores;

        // Filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(s => s.cat.status === this.currentFilter);
        }

        // Search
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.cat.name?.toLowerCase().includes(q) ||
                s.cat.management_id?.toLowerCase().includes(q) ||
                s.cat.microchip_id?.includes(q)
            );
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="icon">🐱</div>
          <h3>${this.searchQuery ? '検索結果がありません' : '猫が登録されていません'}</h3>
          <p>${this.searchQuery ? '検索条件を変更してください' : '「＋ 新規登録」から猫を追加しましょう'}</p>
        </div>
      `;
            return;
        }

        grid.innerHTML = filtered.map((item, idx) => {
            const { cat, score } = item;
            const ageYears = Utils.calculateAge(cat);
            const latestWeight = Store.getLatestWeight(cat.id);
            const weightDays = latestWeight ? Utils.daysSince(latestWeight.timestamp) : null;
            const weightStatus = Utils.weightStatus(weightDays);
            const scoreLevel = score.S_final !== null ? Utils.scoreLevel(score.S_final) : 'muted';

            return `
        <div class="cat-card animate-fadeIn" data-cat-id="${cat.id}" data-score-level="${scoreLevel}" style="animation-delay:${idx * 60}ms">
          <div class="cat-card-top">
            ${cat.photo_base64
                    ? `<img class="cat-card-photo" src="${cat.photo_base64}" alt="${Utils.escapeHtml(cat.name)}">`
                    : `<div class="cat-card-photo-placeholder">🐱</div>`}
            <div class="cat-card-info">
              <div class="cat-card-name">${Utils.escapeHtml(cat.name || '名前未設定')}</div>
              <div class="cat-card-meta">
                <span class="badge ${Utils.statusBadgeClass(cat.status)}">${Utils.statusLabel(cat.status)}</span>
                ${cat.management_id ? `<span>#${Utils.escapeHtml(cat.management_id)}</span>` : ''}
              </div>
            </div>
            <div class="cat-card-score">
              ${score.S_final !== null ? `
                <div class="score-ring score-ring-sm">
                  ${Utils.createScoreRing(score.S_final, 48)}
                  <span class="score-value" style="color:${Utils.scoreColor(score.S_final)}">${score.S_final}</span>
                </div>
              ` : `<span class="badge badge-muted">—</span>`}
            </div>
          </div>
          <div class="cat-card-details">
            <div class="cat-card-detail">
              <div class="cat-card-detail-label">年齢</div>
              <div class="cat-card-detail-value">${ageYears !== null ? `${ageYears}歳` : '—'}</div>
            </div>
            <div class="cat-card-detail">
              <div class="cat-card-detail-label">体重</div>
              <div class="cat-card-detail-value">${latestWeight ? `${latestWeight.weight}kg` : '—'}</div>
            </div>
            <div class="cat-card-detail">
              <div class="cat-card-detail-label">W_risk</div>
              <div class="cat-card-detail-value" style="color:${score.W_risk > 1.0 ? 'var(--color-warning)' : ''}">${score.W_risk || '—'}</div>
            </div>
          </div>
        </div>
      `;
        }).join('');

        // Card click
        grid.querySelectorAll('.cat-card').forEach(card => {
            card.addEventListener('click', () => {
                const catId = card.dataset.catId;
                window.location.hash = `#/cat/${catId}`;
            });
        });
    }
};
