/**
 * Reusable UI Components (Toast, Modal, Empty/Error/Skeleton States, Bar Chart).
 */
import { esc } from '../utils/format.js';

export function showToast(message, type = 'default', durationMs = 3600) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type !== 'default' ? 'toast-' + type : ''}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, durationMs);
}

export function openModal({ title, bodyHtml, footerHtml = '', onMount = null }) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal-box" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-header">
          <h2>${esc(title)}</h2>
          <button type="button" class="modal-close" data-modal-close aria-label="Tutup">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;

  const close = () => closeModal();
  root.querySelector('[data-modal-close]')?.addEventListener('click', close);
  root.querySelector('[data-modal-backdrop]')?.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-modal-backdrop')) close();
  });
  if (onMount) onMount(root, close);
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

export function renderEmptyState(title, message, actionHtml = '') {
  return `
    <div class="state-box">
      <h3>${esc(title)}</h3>
      <p>${esc(message)}</p>
      ${actionHtml}
    </div>
  `;
}

export function renderErrorState(message, retryId = 'btn-retry') {
  return `
    <div class="state-box">
      <h3>Terjadi Kesalahan</h3>
      <p>${esc(message || 'Koneksi atau server belum merespons.')}</p>
      <button type="button" class="btn btn-primary" id="${esc(retryId)}">Coba Lagi</button>
    </div>
  `;
}

export function renderSkeletonCards(count = 3) {
  return `
    <div class="candidate-grid">
      ${Array.from({ length: count }).map(() => `
        <div class="card">
          <div class="skeleton" style="height:170px;margin-bottom:14px;"></div>
          <div class="skeleton" style="height:20px;width:70%;margin-bottom:10px;"></div>
          <div class="skeleton" style="height:14px;width:100%;margin-bottom:6px;"></div>
          <div class="skeleton" style="height:14px;width:85%;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderBarChart(candidates, totalValid) {
  if (!candidates || candidates.length === 0) {
    return renderEmptyState('Belum Ada Kandidat', 'Belum ada data kandidat untuk ditampilkan pada grafik.');
  }
  if (!totalValid) {
    return renderEmptyState('Belum Ada Suara Sah', 'Belum ada suara masuk pada periode pemilihan ini.');
  }

  const sorted = [...candidates].sort((a, b) => b.votes - a.votes || a.candidate_number - b.candidate_number);
  return `
    <div class="chart-list">
      ${sorted.map((c) => `
        <div>
          <div class="chart-row-head">
            <span><strong>No. ${esc(c.candidate_number)}</strong> — ${esc(c.candidate_name)}</span>
            <span><strong>${esc(c.votes)}</strong> suara (${esc(c.percentage)}%)</span>
          </div>
          <div class="chart-track">
            <div class="chart-fill" style="width:${Math.min(100, Math.max(0, Number(c.percentage) || 0))}%"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
