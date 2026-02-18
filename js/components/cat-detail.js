// ============================================================
// 猫の健康管理OS - Cat Detail Component
// ============================================================

const CatDetail = {
    render(container, catId) {
        const cat = Store.getCat(catId);
        if (!cat) {
            container.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>猫が見つかりません</h3><a href="#/" class="btn btn-primary mt-4">ダッシュボードに戻る</a></div>`;
            return;
        }

        const score = Scoring.calculateScore(cat);
        const wBreakdown = Scoring.getWRiskBreakdown(cat);
        const ageYears = Utils.calculateAge(cat);
        const latestWeight = Store.getLatestWeight(cat.id);
        const weightDays = latestWeight ? Utils.daysSince(latestWeight.timestamp) : null;
        const weightStatus = Utils.weightStatus(weightDays);
        const approval = Store.getApprovalForCat(cat.id);
        const approvalOverdue = approval ? Utils.daysSince(approval.confirmed_at) >= approval.reapproval_cycle_days : false;
        const recentWeights = Store.getRecentWeights(cat.id, 30);
        const latestRecord = Store.getLatestRecord(cat.id);

        container.innerHTML = `
      <!-- Header -->
      <div class="detail-header animate-fadeIn">
        ${cat.photo_base64
                ? `<img class="detail-photo" src="${cat.photo_base64}" alt="${Utils.escapeHtml(cat.name)}" id="detail-photo">`
                : `<div class="detail-photo" id="detail-photo" style="background:var(--bg-glass);display:flex;align-items:center;justify-content:center;font-size:3rem;cursor:pointer">🐱</div>`
            }
        <div class="detail-info">
          <h1 class="detail-name">${Utils.escapeHtml(cat.name)}</h1>
          <div class="detail-badges">
            <span class="badge ${Utils.statusBadgeClass(cat.status)}">${Utils.statusLabel(cat.status)}</span>
            ${cat.fiv_status === 'positive' ? '<span class="badge badge-danger">FIV+</span>' : ''}
            ${cat.felv_status === 'positive' ? '<span class="badge badge-danger">FeLV+</span>' : ''}
            ${score.active_sos ? `<span class="badge badge-danger">SOS Lv.${score.active_sos}</span>` : ''}
            ${approvalOverdue ? '<span class="badge badge-warning">⚠ 再承認期限超過</span>' : ''}
          </div>
          <div class="detail-meta">
            ${cat.management_id ? `<span class="detail-meta-item">🏷️ #${Utils.escapeHtml(cat.management_id)}</span>` : ''}
            <span class="detail-meta-item">🧬 ${Utils.sexLabel(cat.sex)} / ${Utils.neuteredLabel(cat.neutered_status)}</span>
            ${ageYears !== null ? `<span class="detail-meta-item">🎂 ${ageYears}歳${cat.birth_date_precision === 'estimated' ? '（推定）' : cat.birth_date_precision === 'unknown' ? '（不明）' : ''}</span>` : ''}
            ${cat.microchip_id ? `<span class="detail-meta-item">💉 ${Utils.escapeHtml(cat.microchip_id)}</span>` : ''}
          </div>
        </div>
        <div class="detail-actions">
          <a href="#/cat/${catId}/edit" class="btn btn-secondary">✏️ 編集</a>
          <button class="btn btn-secondary" id="btn-export-audit">📦 監査パック</button>
        </div>
      </div>

      <!-- Score Section -->
      ${score.S_final !== null ? `
      <div class="score-section animate-fadeIn" style="animation-delay:100ms">
        <div class="score-ring score-ring-lg">
          ${Utils.createScoreRing(score.S_final, 120)}
          <span class="score-value" style="color:${Utils.scoreColor(score.S_final)};font-size:var(--text-4xl)">${score.S_final}</span>
        </div>
        <div class="score-breakdown">
          <div class="score-breakdown-item">
            <span class="score-breakdown-label">ビジュアル減点 × W_risk</span>
            <span class="score-breakdown-value" style="color:var(--color-danger)">-${score.penalties.visual_weighted}</span>
          </div>
          <div class="score-breakdown-item">
            <span class="score-breakdown-label">SOSペナルティ</span>
            <span class="score-breakdown-value" style="color:var(--color-danger)">-${score.penalties.sos}</span>
          </div>
          <div class="score-breakdown-item">
            <span class="score-breakdown-label">タスクペナルティ</span>
            <span class="score-breakdown-value" style="color:var(--color-danger)">-${score.penalties.task}</span>
          </div>
          <div class="score-breakdown-item">
            <span class="score-breakdown-label">S_calc</span>
            <span class="score-breakdown-value">${score.S_calc}</span>
          </div>
          ${score.active_sos === 3 ? `
          <div class="score-breakdown-item" style="background:var(--color-danger-soft)">
            <span class="score-breakdown-label">SOS Lv.3 上限適用</span>
            <span class="score-breakdown-value" style="color:var(--color-danger)">min(${score.S_calc}, 20) = ${score.S_final}</span>
          </div>` : ''}
        </div>
        <div class="w-risk-display">
          <div class="w-risk-value">${score.W_risk}</div>
          <div class="w-risk-label">W_risk</div>
          <div style="margin-top:var(--space-3);font-size:var(--text-xs);color:var(--text-muted)">
            年齢: ${wBreakdown.age.value} ${wBreakdown.age.isMax ? '★' : ''}<br>
            感染症: ${wBreakdown.infection.value} ${wBreakdown.infection.isMax ? '★' : ''}<br>
            持病: ${wBreakdown.chronic.value} ${wBreakdown.chronic.isMax ? '★' : ''}
          </div>
        </div>
      </div>
      ` : `
      <div class="alert alert-info mb-6">
        <span>ℹ️</span>
        <div>トライアル中・譲渡済のため、スコアリングは停止中です</div>
      </div>
      `}

      <!-- Detail Sections Grid -->
      <div class="detail-sections">
        <!-- Weight Section -->
        <div class="detail-section">
          <div class="detail-section-header">
            <span class="detail-section-title">⚖️ 体重管理</span>
            <span class="badge ${weightStatus.class}">${latestWeight ? `${weightDays}日前` : '未計測'} ${weightStatus.label}</span>
          </div>
          <div class="detail-section-body" id="weight-section">
            ${Weight.renderInline(cat.id, latestWeight, recentWeights)}
          </div>
        </div>

        <!-- SOS Section -->
        <div class="detail-section">
          <div class="detail-section-header">
            <span class="detail-section-title">🚨 直感バイパス (SOS)</span>
            ${latestRecord?.sos_level ? `<span class="badge badge-danger">Lv.${latestRecord.sos_level} 発動中</span>` : ''}
          </div>
          <div class="detail-section-body" id="sos-section">
            ${SOS.renderInline(cat.id, latestRecord)}
          </div>
        </div>

        <!-- Infection Status -->
        <div class="detail-section">
          <div class="detail-section-header">
            <span class="detail-section-title">🔬 感染症ステータス</span>
          </div>
          <div class="detail-section-body">
            <div style="display:flex;gap:var(--space-4)">
              <div class="stat-card" style="flex:1">
                <div class="stat-label">FIV</div>
                <div style="margin-top:var(--space-2)">
                  <span class="badge ${Utils.infectionBadge(cat.fiv_status)}">${Utils.infectionLabel(cat.fiv_status)}</span>
                </div>
                ${cat.test_date_fiv ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">検査日: ${Utils.formatDate(cat.test_date_fiv)}</div>` : ''}
              </div>
              <div class="stat-card" style="flex:1">
                <div class="stat-label">FeLV</div>
                <div style="margin-top:var(--space-2)">
                  <span class="badge ${Utils.infectionBadge(cat.felv_status)}">${Utils.infectionLabel(cat.felv_status)}</span>
                </div>
                ${cat.test_date_felv ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">検査日: ${Utils.formatDate(cat.test_date_felv)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Chronic Conditions -->
        <div class="detail-section">
          <div class="detail-section-header">
            <span class="detail-section-title">💊 持病</span>
            <span class="badge badge-muted">${(cat.chronic_conditions || []).length}件</span>
          </div>
          <div class="detail-section-body">
            ${(cat.chronic_conditions || []).length > 0 ? `
            <div class="condition-list">
              ${cat.chronic_conditions.map(c => `
                <div class="condition-item">
                  <div>
                    <div class="condition-name">${Utils.escapeHtml(c.condition_name)}</div>
                    <div class="condition-meta">${c.diagnosed_at ? Utils.formatDate(c.diagnosed_at) + '〜' : ''} / ${c.managed_by === 'hospital' ? '病院管理' : '施設内管理'}</div>
                  </div>
                  <span class="badge ${Utils.severityBadge(c.severity_level)}">${Utils.severityLabel(c.severity_level)}</span>
                </div>
              `).join('')}
            </div>` : '<p style="color:var(--text-muted);font-size:var(--text-sm)">登録されている持病はありません</p>'}
          </div>
        </div>

        <!-- Approval Section -->
        <div class="detail-section detail-full-width">
          <div class="detail-section-header">
            <span class="detail-section-title">📋 再承認管理</span>
          </div>
          <div class="detail-section-body" id="approval-section">
            ${Approval.renderInline(cat.id, approval)}
          </div>
        </div>

        <!-- Timeline Section -->
        <div class="detail-section detail-full-width">
          <div class="detail-section-header">
            <span class="detail-section-title">📜 タイムライン</span>
            <div class="tabs" id="detail-timeline-tabs">
              <button class="tab active" data-mode="key">Key Events</button>
              <button class="tab" data-mode="all">すべて</button>
            </div>
          </div>
          <div class="detail-section-body" id="detail-timeline"></div>
        </div>
      </div>
    `;

        // Event bindings
        this.bindEvents(container, cat, catId);

        // Initial timeline render
        this.renderCatTimeline(catId, true);
    },

    bindEvents(container, cat, catId) {
        // Photo full-screen
        const photo = document.getElementById('detail-photo');
        if (photo) {
            photo.addEventListener('click', () => {
                const overlay = document.createElement('div');
                overlay.className = 'cat-id-overlay';
                overlay.innerHTML = `
          <div class="cat-id-card">
            ${cat.photo_base64
                        ? `<img src="${cat.photo_base64}" alt="${Utils.escapeHtml(cat.name)}">`
                        : `<div style="width:300px;height:300px;border-radius:var(--radius-2xl);background:var(--bg-glass);display:flex;align-items:center;justify-content:center;font-size:8rem;margin:0 auto var(--space-6)">🐱</div>`
                    }
            <h2>${Utils.escapeHtml(cat.name)}</h2>
            <p>${Utils.escapeHtml(cat.feature_memo || '')}</p>
          </div>
        `;
                overlay.addEventListener('click', () => overlay.remove());
                document.body.appendChild(overlay);
            });
        }

        // Audit export
        document.getElementById('btn-export-audit')?.addEventListener('click', () => {
            const pack = Store.exportAuditPack(catId);
            if (pack) {
                const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_${cat.name}_${Utils.today()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        });

        // Timeline tabs
        document.getElementById('detail-timeline-tabs')?.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#detail-timeline-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderCatTimeline(catId, tab.dataset.mode === 'key');
            });
        });
    },

    renderCatTimeline(catId, keyOnly = true) {
        const tlContainer = document.getElementById('detail-timeline');
        if (!tlContainer) return;
        const events = Store.getTimelineForCat(catId, keyOnly).slice(0, 50);
        Timeline.renderTimeline(events, tlContainer);
    }
};
