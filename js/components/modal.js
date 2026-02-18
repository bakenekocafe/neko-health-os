// ============================================================
// 猫の健康管理OS - Modal Component
// ============================================================

const Modal = {
    // ── Show Modal ──
    show({ title, content, footer, size = '', onClose }) {
        this.close(); // close any existing

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.id = 'modal-backdrop';

        const sizeClass = size === 'lg' ? 'modal-lg' : '';
        backdrop.innerHTML = `
      <div class="modal ${sizeClass}" role="dialog">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        ${footer ? `<div class="modal-footer" id="modal-footer"></div>` : ''}
      </div>
    `;

        document.body.appendChild(backdrop);

        const bodyEl = document.getElementById('modal-body');
        if (typeof content === 'string') {
            bodyEl.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            bodyEl.appendChild(content);
        }

        if (footer) {
            const footerEl = document.getElementById('modal-footer');
            if (typeof footer === 'string') {
                footerEl.innerHTML = footer;
            } else if (footer instanceof HTMLElement) {
                footerEl.appendChild(footer);
            }
        }

        // Close handlers
        document.getElementById('modal-close-btn').addEventListener('click', () => {
            this.close();
            if (onClose) onClose();
        });

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                this.close();
                if (onClose) onClose();
            }
        });

        // Escape key
        this._escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                if (onClose) onClose();
            }
        };
        document.addEventListener('keydown', this._escHandler);
    },

    // ── Close Modal ──
    close() {
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) backdrop.remove();
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    },

    // ── Confirm Dialog ──
    confirm({ title, message, confirmText = '確認', cancelText = 'キャンセル', danger = false }) {
        return new Promise((resolve) => {
            const footerEl = document.createElement('div');
            footerEl.style.display = 'flex';
            footerEl.style.gap = '0.75rem';
            footerEl.style.justifyContent = 'flex-end';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = cancelText;
            cancelBtn.addEventListener('click', () => { this.close(); resolve(false); });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
            confirmBtn.textContent = confirmText;
            confirmBtn.addEventListener('click', () => { this.close(); resolve(true); });

            footerEl.appendChild(cancelBtn);
            footerEl.appendChild(confirmBtn);

            this.show({
                title,
                content: `<p style="color:var(--text-secondary)">${message}</p>`,
                footer: footerEl,
                onClose: () => resolve(false)
            });
        });
    }
};
