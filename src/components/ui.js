/**
 * Reusable UI Components (Toast, Modal, Empty/Error/Skeleton States,
 * Animated Bar Chart, Ultra-Fast Number Counter).
 */
import { esc } from '../utils/format.js';

const REDUCED_MOTION = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function showToast(message, type = 'default', durationMs = 3400) {
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

/**
 * Ultra-fast smooth number counter (140 ms) untuk elemen .kpi-value[data-count].
 * Tidak memblokir interaksi, dan langsung melompat ke angka akhir jika prefers-reduced-motion aktif.
 */
export function animateCounters(root = document) {
  if (!root || REDUCED_MOTION()) return;
  const els = root.querySelectorAll('[data-count]');
  const duration = 140;

  els.forEach((el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target) || target <= 0) return;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  });
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
    <div class="state-box view-enter">
      <h3>${esc(title)}</h3>
      <p>${esc(message)}</p>
      ${actionHtml}
    </div>
  `;
}

export function renderErrorState(message, retryId = 'btn-retry') {
  return `
    <div class="state-box view-enter">
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
  const topVotes = sorted[0]?.votes || 0;

  return `
    <div class="chart-list">
      ${sorted.map((c) => {
        const isLeader = topVotes > 0 && c.votes === topVotes;
        const pct = Math.min(100, Math.max(0, Number(c.percentage) || 0));
        return `
          <div>
            <div class="chart-row-head">
              <span>
                <strong>No. ${esc(c.candidate_number)}</strong> — ${esc(c.candidate_name)}
                ${isLeader ? `<span class="badge badge-info" style="margin-left:6px;padding:2px 8px;font-size:0.7rem;">Tertinggi</span>` : ''}
              </span>
              <span><strong>${esc(c.votes)}</strong> suara (${esc(c.percentage)}%)</span>
            </div>
            <div class="chart-track">
              <div class="chart-fill ${isLeader ? 'is-leader' : ''}" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
