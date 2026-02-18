// ============================================================
// 猫の健康管理OS - Cat Form Component
// ============================================================

const CatForm = {
    editingCat: null,

    render(container, catId = null) {
        this.editingCat = catId ? Store.getCat(catId) : null;
        const cat = this.editingCat || {};
        const isEdit = !!this.editingCat;

        container.innerHTML = `
      <div class="page-header flex items-center justify-between">
        <div>
          <h1 class="page-title">${isEdit ? '✏️ 個体情報編集' : '🐱 新規登録'}</h1>
          <p class="page-subtitle">${isEdit ? cat.name + ' の情報を編集' : '新しい猫を登録します'}</p>
        </div>
        <a href="${isEdit ? '#/cat/' + catId : '#/'}" class="btn btn-secondary">← 戻る</a>
      </div>

      <form id="cat-form" class="animate-fadeIn">
        <!-- Photo + Basic Info -->
        <div class="card mb-6">
          <div class="card-header"><h3 class="card-title">📸 識別情報</h3></div>
          <div style="display:flex;gap:var(--space-6);flex-wrap:wrap;padding:var(--space-6)">
            <div>
              <div class="photo-upload" id="photo-upload">
                ${cat.photo_base64
                ? `<img src="${cat.photo_base64}" alt="写真">`
                : `<div class="upload-placeholder"><div class="icon">📷</div><div>写真を追加</div></div>`
            }
              </div>
              <input type="file" id="photo-input" accept="image/*" hidden>
            </div>
            <div style="flex:1;min-width:280px">
              <div class="form-row">
                <div class="form-group">
                  <label>名前 <span style="color:var(--color-danger)">*</span></label>
                  <input type="text" id="cat-name" value="${Utils.escapeHtml(cat.name || '')}" required placeholder="例: ミケ">
                </div>
                <div class="form-group">
                  <label>管理ID</label>
                  <input type="text" id="cat-management-id" value="${Utils.escapeHtml(cat.management_id || '')}" placeholder="例: CAT-001">
                </div>
              </div>
              <div class="form-group">
                <label>マイクロチップID（15桁）</label>
                <input type="text" id="cat-microchip" value="${Utils.escapeHtml(cat.microchip_id || '')}" maxlength="15" placeholder="392XXXXXXXXXXXX">
              </div>
              <div class="form-group">
                <label>特徴メモ</label>
                <textarea id="cat-features" placeholder="例: 右耳に切り込み、額にM字模様">${Utils.escapeHtml(cat.feature_memo || '')}</textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Biological Profile -->
        <div class="card mb-6">
          <div class="card-header"><h3 class="card-title">🧬 生物学的属性</h3></div>
          <div style="padding:var(--space-6)">
            <div class="form-row">
              <div class="form-group">
                <label>性別</label>
                <select id="cat-sex">
                  <option value="unknown" ${cat.sex === 'unknown' ? 'selected' : ''}>不明</option>
                  <option value="male" ${cat.sex === 'male' ? 'selected' : ''}>オス</option>
                  <option value="female" ${cat.sex === 'female' ? 'selected' : ''}>メス</option>
                </select>
              </div>
              <div class="form-group">
                <label>不妊手術</label>
                <select id="cat-neutered">
                  <option value="unknown" ${cat.neutered_status === 'unknown' ? 'selected' : ''}>不明</option>
                  <option value="intact" ${cat.neutered_status === 'intact' ? 'selected' : ''}>未手術</option>
                  <option value="neutered" ${cat.neutered_status === 'neutered' ? 'selected' : ''}>去勢済</option>
                  <option value="spayed" ${cat.neutered_status === 'spayed' ? 'selected' : ''}>避妊済</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>生年月日の精度</label>
                <select id="cat-birth-precision">
                  <option value="unknown" ${(cat.birth_date_precision || 'unknown') === 'unknown' ? 'selected' : ''}>不明</option>
                  <option value="exact" ${cat.birth_date_precision === 'exact' ? 'selected' : ''}>正確</option>
                  <option value="estimated" ${cat.birth_date_precision === 'estimated' ? 'selected' : ''}>推定</option>
                </select>
              </div>
              <div class="form-group" id="birth-date-group" style="display:${cat.birth_date_precision === 'unknown' ? 'none' : 'block'}">
                <label>生年月日</label>
                <input type="date" id="cat-birth-date" value="${cat.birth_date || ''}">
              </div>
              <div class="form-group" id="estimated-age-group" style="display:${cat.birth_date_precision === 'unknown' ? 'block' : 'none'}">
                <label>推定年齢（歳）</label>
                <input type="number" id="cat-estimated-age" value="${cat.estimated_age_years ?? ''}" min="0" max="30" step="1">
              </div>
            </div>
          </div>
        </div>

        <!-- Infection Status -->
        <div class="card mb-6">
          <div class="card-header"><h3 class="card-title">🔬 感染症ステータス</h3></div>
          <div style="padding:var(--space-6)">
            <div class="form-row">
              <div class="form-group">
                <label>FIV</label>
                <select id="cat-fiv">
                  <option value="unknown" ${cat.fiv_status === 'unknown' ? 'selected' : ''}>未検査</option>
                  <option value="negative" ${cat.fiv_status === 'negative' ? 'selected' : ''}>陰性(−)</option>
                  <option value="positive" ${cat.fiv_status === 'positive' ? 'selected' : ''}>陽性(+)</option>
                </select>
              </div>
              <div class="form-group">
                <label>FIV 検査日</label>
                <input type="date" id="cat-fiv-date" value="${cat.test_date_fiv || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>FeLV</label>
                <select id="cat-felv">
                  <option value="unknown" ${cat.felv_status === 'unknown' ? 'selected' : ''}>未検査</option>
                  <option value="negative" ${cat.felv_status === 'negative' ? 'selected' : ''}>陰性(−)</option>
                  <option value="positive" ${cat.felv_status === 'positive' ? 'selected' : ''}>陽性(+)</option>
                </select>
              </div>
              <div class="form-group">
                <label>FeLV 検査日</label>
                <input type="date" id="cat-felv-date" value="${cat.test_date_felv || ''}">
              </div>
            </div>
          </div>
        </div>

        <!-- Chronic Conditions -->
        <div class="card mb-6">
          <div class="card-header">
            <h3 class="card-title">💊 持病管理</h3>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-add-condition">＋ 追加</button>
          </div>
          <div style="padding:var(--space-6)" id="conditions-container">
            ${(cat.chronic_conditions || []).map((c, i) => this.renderConditionRow(c, i)).join('')}
          </div>
        </div>

        <!-- Status -->
        <div class="card mb-6">
          <div class="card-header"><h3 class="card-title">🏷️ ステータス</h3></div>
          <div style="padding:var(--space-6)">
            <div class="form-group">
              <label>現在のステータス</label>
              <select id="cat-status">
                <option value="facility" ${(cat.status || 'facility') === 'facility' ? 'selected' : ''}>施設内</option>
                <option value="trial" ${cat.status === 'trial' ? 'selected' : ''}>外泊・トライアル</option>
                <option value="adopted" ${cat.status === 'adopted' ? 'selected' : ''}>正式譲渡</option>
              </select>
              <p class="form-hint">トライアル中はスコア・タスク・通知が停止し、記録のみ保存されます</p>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div style="display:flex;gap:var(--space-4);justify-content:flex-end">
          <a href="${isEdit ? '#/cat/' + catId : '#/'}" class="btn btn-secondary btn-lg">キャンセル</a>
          <button type="submit" class="btn btn-primary btn-lg">${isEdit ? '保存する' : '登録する'}</button>
        </div>
      </form>
    `;

        // Events
        this.bindEvents(container, isEdit, catId);
    },

    renderConditionRow(condition = {}, index = 0) {
        return `
      <div class="condition-row form-row" data-index="${index}" style="align-items:end;margin-bottom:var(--space-4);padding-bottom:var(--space-4);border-bottom:1px solid var(--border-subtle)">
        <div class="form-group">
          <label>疾患名</label>
          <input type="text" class="cond-name" value="${Utils.escapeHtml(condition.condition_name || '')}" placeholder="例: 慢性腎臓病">
        </div>
        <div class="form-group">
          <label>重症度</label>
          <select class="cond-severity">
            <option value="mild" ${condition.severity_level === 'mild' ? 'selected' : ''}>軽度 (mild)</option>
            <option value="moderate" ${condition.severity_level === 'moderate' ? 'selected' : ''}>中等度 (moderate)</option>
            <option value="severe" ${condition.severity_level === 'severe' ? 'selected' : ''}>重度 (severe)</option>
          </select>
        </div>
        <div class="form-group">
          <label>診断日</label>
          <input type="date" class="cond-date" value="${condition.diagnosed_at || ''}">
        </div>
        <div class="form-group">
          <label>管理元</label>
          <select class="cond-managed">
            <option value="hospital" ${condition.managed_by === 'hospital' ? 'selected' : ''}>病院</option>
            <option value="inhouse" ${condition.managed_by === 'inhouse' ? 'selected' : ''}>施設内</option>
          </select>
        </div>
        <button type="button" class="btn btn-sm btn-danger btn-remove-condition" style="margin-bottom:var(--space-5)">✕</button>
      </div>
    `;
    },

    bindEvents(container, isEdit, catId) {
        // Photo upload
        const photoUpload = document.getElementById('photo-upload');
        const photoInput = document.getElementById('photo-input');
        photoUpload.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                // Resize image to save space
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 400;
                    let w = img.width, h = img.height;
                    if (w > maxSize || h > maxSize) {
                        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                        else { w = (w / h) * maxSize; h = maxSize; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                    photoUpload.innerHTML = `<img src="${base64}" alt="写真">`;
                    photoUpload.dataset.photo = base64;
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        // Birth precision toggle
        document.getElementById('cat-birth-precision').addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('birth-date-group').style.display = val === 'unknown' ? 'none' : 'block';
            document.getElementById('estimated-age-group').style.display = val === 'unknown' ? 'block' : 'none';
        });

        // Add condition
        let condIndex = (this.editingCat?.chronic_conditions || []).length;
        document.getElementById('btn-add-condition').addEventListener('click', () => {
            const condContainer = document.getElementById('conditions-container');
            condContainer.insertAdjacentHTML('beforeend', this.renderConditionRow({}, condIndex++));
            this.bindRemoveCondition();
        });
        this.bindRemoveCondition();

        // Form submit
        document.getElementById('cat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save(isEdit, catId);
        });
    },

    bindRemoveCondition() {
        document.querySelectorAll('.btn-remove-condition').forEach(btn => {
            btn.onclick = () => btn.closest('.condition-row').remove();
        });
    },

    save(isEdit, catId) {
        // Collect conditions
        const conditions = [];
        document.querySelectorAll('.condition-row').forEach(row => {
            const name = row.querySelector('.cond-name').value.trim();
            if (name) {
                conditions.push({
                    condition_name: name,
                    severity_level: row.querySelector('.cond-severity').value,
                    diagnosed_at: row.querySelector('.cond-date').value || null,
                    managed_by: row.querySelector('.cond-managed').value
                });
            }
        });

        const photoEl = document.getElementById('photo-upload');
        const oldStatus = this.editingCat?.status;
        const newStatus = document.getElementById('cat-status').value;

        const catData = {
            ...(isEdit ? { id: catId } : {}),
            name: document.getElementById('cat-name').value.trim(),
            management_id: document.getElementById('cat-management-id').value.trim(),
            microchip_id: document.getElementById('cat-microchip').value.trim(),
            feature_memo: document.getElementById('cat-features').value.trim(),
            photo_base64: photoEl.dataset.photo || this.editingCat?.photo_base64 || '',
            sex: document.getElementById('cat-sex').value,
            neutered_status: document.getElementById('cat-neutered').value,
            birth_date_precision: document.getElementById('cat-birth-precision').value,
            birth_date: document.getElementById('cat-birth-date').value || null,
            estimated_age_years: document.getElementById('cat-estimated-age').value
                ? parseInt(document.getElementById('cat-estimated-age').value) : null,
            fiv_status: document.getElementById('cat-fiv').value,
            felv_status: document.getElementById('cat-felv').value,
            test_date_fiv: document.getElementById('cat-fiv-date').value || null,
            test_date_felv: document.getElementById('cat-felv-date').value || null,
            chronic_conditions: conditions,
            status: newStatus
        };

        if (!catData.name) {
            alert('名前は必須です');
            return;
        }

        const saved = Store.saveCat(catData);

        // Timeline events
        if (isEdit) {
            Timeline.addEvent(saved.id, 'cat_updated', {
                cat_name: saved.name,
                description: '個体情報が更新されました',
                staff: DriveAPI.getStaffId()
            });
            // Status change is Key Event
            if (oldStatus && oldStatus !== newStatus) {
                Timeline.addEvent(saved.id, 'status_changed', {
                    cat_name: saved.name,
                    description: `ステータス: ${Utils.statusLabel(oldStatus)} → ${Utils.statusLabel(newStatus)}`,
                    from: oldStatus,
                    to: newStatus,
                    staff: DriveAPI.getStaffId()
                });
            }
        } else {
            Timeline.addEvent(saved.id, 'cat_registered', {
                cat_name: saved.name,
                description: '新規個体が登録されました',
                staff: DriveAPI.getStaffId()
            });
        }

        window.location.hash = `#/cat/${saved.id}`;
    }
};
