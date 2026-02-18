// ============================================================
// 猫の健康管理OS - Utility Functions
// ============================================================

const Utils = {
  // ── ID Generation ──
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  },

  // ── Date Helpers ──
  today() {
    return new Date().toISOString().split('T')[0];
  },

  now() {
    return new Date().toISOString();
  },

  daysBetween(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return null;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diff = Math.abs(d2 - d1);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  daysSince(dateStr) {
    if (!dateStr) return null;
    return this.daysBetween(dateStr, this.today());
  },

  hoursSince(isoStr) {
    if (!isoStr) return null;
    const diff = Date.now() - new Date(isoStr).getTime();
    return diff / (1000 * 60 * 60);
  },

  // ── Age Calculation ──
  calculateAge(cat) {
    if (cat.birth_date && cat.birth_date_precision !== 'unknown') {
      const birth = new Date(cat.birth_date);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return Math.max(0, age);
    }
    if (cat.estimated_age_years !== null && cat.estimated_age_years !== undefined) {
      return cat.estimated_age_years;
    }
    return null;
  },

  // ── Formatting ──
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  },

  formatDateTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return `${this.formatDate(isoStr)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  formatRelative(isoStr) {
    if (!isoStr) return '';
    const hours = this.hoursSince(isoStr);
    if (hours < 1) return '数分前';
    if (hours < 24) return `${Math.floor(hours)}時間前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}日前`;
    if (days < 30) return `${Math.floor(days / 7)}週間前`;
    return this.formatDate(isoStr);
  },

  // ── Score Color ──
  scoreColor(score) {
    if (score >= 80) return 'var(--score-excellent)';
    if (score >= 60) return 'var(--score-good)';
    if (score >= 40) return 'var(--score-caution)';
    if (score >= 20) return 'var(--score-warning)';
    return 'var(--score-danger)';
  },

  scoreLevel(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'caution';
    if (score >= 20) return 'warning';
    return 'critical';
  },

  // ── Score Ring SVG ──
  createScoreRing(score, size = 80) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = this.scoreColor(score);
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
                stroke="var(--border-subtle)" stroke-width="4" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none"
                stroke="${color}" stroke-width="4"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                stroke-linecap="round" style="transition: stroke-dashoffset 0.8s ease;" />
      </svg>
    `;
  },

  // ── Status Label ──
  statusLabel(status) {
    const map = { facility: '施設内', trial: '外泊・トライアル', adopted: '正式譲渡' };
    return map[status] || status;
  },

  statusBadgeClass(status) {
    const map = { facility: 'badge-success', trial: 'badge-warning', adopted: 'badge-info' };
    return map[status] || 'badge-muted';
  },

  sexLabel(sex) {
    const map = { male: '♂ オス', female: '♀ メス', unknown: '不明' };
    return map[sex] || sex;
  },

  neuteredLabel(ns) {
    const map = { intact: '未手術', neutered: '去勢済', spayed: '避妊済', unknown: '不明' };
    return map[ns] || ns;
  },

  infectionLabel(status) {
    const map = { negative: '陰性(−)', positive: '陽性(+)', unknown: '未検査' };
    return map[status] || status;
  },

  infectionBadge(status) {
    if (status === 'positive') return 'badge-danger';
    if (status === 'negative') return 'badge-success';
    return 'badge-muted';
  },

  severityLabel(sev) {
    const map = { mild: '軽度', moderate: '中等度', severe: '重度' };
    return map[sev] || sev;
  },

  severityBadge(sev) {
    const map = { mild: 'badge-info', moderate: 'badge-warning', severe: 'badge-danger' };
    return map[sev] || 'badge-muted';
  },

  // ── Weight Helpers ──
  weightStatus(daysSince) {
    if (daysSince === null) return { label: '未計測', class: 'badge-danger', level: 'danger' };
    if (daysSince <= 3) return { label: '正常', class: 'badge-success', level: 'normal' };
    if (daysSince <= 7) return { label: '注意', class: 'badge-warning', level: 'caution' };
    return { label: '未計測警告', class: 'badge-danger', level: 'danger' };
  },

  weightDeviation(current, previous) {
    if (!current || !previous) return null;
    const diff = Math.abs(current - previous);
    const pct = diff / previous;
    if (diff >= 0.30 || pct >= 0.08) return { level: 'warning', label: '警告', diff, pct };
    if (diff >= 0.15 || pct >= 0.05) return { level: 'caution', label: '注意', diff, pct };
    return null;
  },

  // ── Sanitize HTML ──
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ── Debounce ──
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
};
