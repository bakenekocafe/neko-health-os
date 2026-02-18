// ============================================================
// 猫の健康管理OS - Weight Component
// ============================================================

const Weight = {
    renderInline(catId, latestWeight, recentWeights) {
        const prevWeight = recentWeights && recentWeights.length >= 2 ? recentWeights[recentWeights.length - 2] : null;
        const deviation = latestWeight && prevWeight ? Utils.weightDeviation(latestWeight.weight, prevWeight.weight) : null;

        return `
      <div class="weight-latest">
        ${latestWeight ? `
          <span class="weight-latest-value">${latestWeight.weight}</span>
          <span class="weight-latest-unit">kg</span>
          ${deviation ? `
            <span class="weight-latest-change" style="color:var(--color-${deviation.level === 'warning' ? 'danger' : 'warning'})">
              ${deviation.level === 'warning' ? '⚠️' : '⚡'} ${deviation.label}
              (${deviation.diff.toFixed(2)}kg / ${(deviation.pct * 100).toFixed(1)}%)
            </span>
          ` : ''}
        ` : `
          <span style="color:var(--text-muted)">まだ計測データがありません</span>
        `}
      </div>

      ${recentWeights && recentWeights.length > 0 ? `
        <div class="weight-chart" id="weight-chart-${catId}">
          <canvas id="weight-canvas-${catId}"></canvas>
        </div>
      ` : ''}

      <div style="margin-top:var(--space-4)">
        <button class="btn btn-primary" id="btn-record-weight-${catId}">⚖️ 体重を記録</button>
      </div>
    `;
    },

    // ── Draw Weight Chart ──
    drawChart(canvasId, weights) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || weights.length === 0) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 32;
        canvas.height = rect.height - 32;

        const w = canvas.width;
        const h = canvas.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };

        const values = weights.map(r => r.weight);
        const minVal = Math.min(...values) - 0.3;
        const maxVal = Math.max(...values) + 0.3;
        const range = maxVal - minVal || 1;

        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (h - padding.top - padding.bottom) * (i / 4);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();

            const val = maxVal - (range * i / 4);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(1), padding.left - 8, y + 4);
        }

        // Line chart
        const points = weights.map((r, i) => ({
            x: padding.left + (w - padding.left - padding.right) * (i / Math.max(weights.length - 1, 1)),
            y: padding.top + (h - padding.top - padding.bottom) * (1 - (r.weight - minVal) / range)
        }));

        // Area fill
        const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        ctx.beginPath();
        ctx.moveTo(points[0].x, h - padding.bottom);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Line
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Dots
        points.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = i === points.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.5)';
            ctx.fill();
            if (i === points.length - 1) {
                ctx.strokeStyle = '#6366f1';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // Date labels
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        const labelInterval = Math.max(1, Math.floor(weights.length / 5));
        weights.forEach((r, i) => {
            if (i % labelInterval === 0 || i === weights.length - 1) {
                const date = r.timestamp?.split('T')[0] || r.date;
                ctx.fillText(date?.substring(5) || '', points[i].x, h - 8);
            }
        });
    },

    // ── Record Weight Dialog ──
    showRecordDialog(catId) {
        const cat = Store.getCat(catId);
        if (!cat) return;

        const content = `
      <div class="form-group">
        <label>体重 (kg)</label>
        <input type="number" id="weight-input" step="0.01" min="0" max="30" placeholder="例: 4.50" autofocus>
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
        saveBtn.textContent = '記録する';
        saveBtn.addEventListener('click', () => {
            const val = parseFloat(document.getElementById('weight-input').value);
            if (isNaN(val) || val <= 0) {
                alert('有効な体重を入力してください');
                return;
            }

            // Check if weight was previously unmeasured for 8+ days
            const prevWeight = Store.getLatestWeight(catId);
            const wasMissing = !prevWeight || Utils.daysSince(prevWeight.timestamp) >= 8;

            Store.addRecord({
                cat_id: catId,
                weight: val,
                date: Utils.today()
            });

            Timeline.addEvent(catId, 'weight_recorded', {
                cat_name: cat.name,
                description: `体重: ${val}kg`,
                weight: val,
                staff: DriveAPI.getStaffId()
            });

            // If was unmeasured, add resolution event
            if (wasMissing) {
                Timeline.addEvent(catId, 'weight_unmeasured_resolved', {
                    cat_name: cat.name,
                    description: '体重未計測が解消されました'
                });
                Notifications.resolveByType(catId, 'weight_unmeasured');
            }

            Modal.close();
            // Re-render the page
            App.navigate(window.location.hash);
        });

        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(saveBtn);

        Modal.show({
            title: `⚖️ ${cat.name} の体重記録`,
            content,
            footer: footerEl
        });

        setTimeout(() => document.getElementById('weight-input')?.focus(), 100);
    },

    // ── Init event listeners after render ──
    initEvents(catId) {
        const btn = document.getElementById(`btn-record-weight-${catId}`);
        if (btn) {
            btn.addEventListener('click', () => this.showRecordDialog(catId));
        }
        // Draw chart
        const recentWeights = Store.getRecentWeights(catId, 30);
        if (recentWeights.length > 0) {
            setTimeout(() => this.drawChart(`weight-canvas-${catId}`, recentWeights), 100);
        }
    }
};
