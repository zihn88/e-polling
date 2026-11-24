/**
 * HomePage.js — Halaman Beranda Polling Publik.
 */
import { apiCall, prefetchInBackground } from '../../services/api.js';
import { renderEmptyState, renderErrorState } from '../../components/ui.js';
import { esc, formatDateTime, pollingStatusBadge } from '../../utils/format.js';
import { renderPublicShell } from './PublicLayout.js';

export async function mountHomePage(appEl) {
  const res = await apiCall('public.bootstrap');

  if (!res.ok) {
    appEl.innerHTML = renderPublicShell({
      activeRoute: '/',
      settings: {},
      polling: null,
      contentHtml: renderErrorState(res.message, 'retry-home')
    });
    document.getElementById('retry-home')?.addEventListener('click', () => {
      apiCall('public.bootstrap', {}, { forceRefresh: true }).then(() => mountHomePage(appEl));
    });
    return;
  }

  const { settings, polling, windowStatus, candidates, alreadyVoted } = res.data;
  // Prefetch hasil polling secara diam-diam agar klik menu "Hasil Polling" instan (< 15 ms)
  if (polling) {
    prefetchInBackground([['public.results', {}]]);
  }

  if (!polling) {
    appEl.innerHTML = renderPublicShell({
      activeRoute: '/',
      settings,
      polling: null,
      contentHtml: renderEmptyState(
        'Belum Ada Pemilihan BPD Aktif',
        'Panitia belum membuka periode pemilihan kandidat BPD saat ini. Silakan periksa kembali nanti.'
      )
    });
    return;
  }

  const instructions = String(settings?.voting_instructions || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const statusBanner = alreadyVoted
    ? `<div class="alert alert-success"><strong>Anda sudah memberikan suara</strong> pada periode pemilihan ini. Terima kasih atas partisipasi Anda.</div>`
    : !windowStatus.canVote
      ? `<div class="alert alert-warning"><strong>Status Polling:</strong> ${esc(windowStatus.message)}</div>`
      : '';

  const contentHtml = `
    <section class="hero">
      <div>${pollingStatusBadge(polling.status)}</div>
      <h1>${esc(polling.title)}</h1>
      <p>${esc(polling.description || 'Gunakan hak suara Anda secara bijak untuk memilih kandidat BPD terbaik bagi kemajuan desa.')}</p>
      <div class="hero-meta">
        <span><strong>Desa:</strong> ${esc(polling.village_name)}</span>
        <span><strong>Mulai:</strong> ${esc(formatDateTime(polling.start_at))}</span>
        <span><strong>Berakhir:</strong> ${esc(formatDateTime(polling.end_at))}</span>
        <span><strong>Kandidat Aktif:</strong> ${esc(candidates.length)}</span>
      </div>
      <div class="hero-actions">
        <a href="#/kandidat" class="btn btn-white">
          ${windowStatus.canVote && !alreadyVoted ? 'Mulai Memilih Kandidat' : 'Lihat Daftar Kandidat'}
        </a>
        <a href="#/hasil" class="btn btn-outline-light">Lihat Hasil Polling</a>
      </div>
    </section>

    ${statusBanner}

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h2 class="card-title">Tata Cara Pemilihan</h2></div>
        ${instructions.length
          ? `<div style="display:flex;flex-direction:column;gap:10px;color:var(--text-muted);">
              ${instructions.map((step) => `<div>${esc(step)}</div>`).join('')}
            </div>`
          : `<p style="color:var(--text-muted);margin:0;">Pilih kandidat pada halaman Daftar Kandidat, lalu konfirmasi pilihan Anda.</p>`}
      </div>

      <div class="card">
        <div class="card-header"><h2 class="card-title">Informasi & Kerahasiaan</h2></div>
        <ul style="margin:0;padding-left:18px;color:var(--text-muted);display:flex;flex-direction:column;gap:8px;">
          <li>Pemilih tidak perlu membuat akun atau login.</li>
          <li>Pilihan kandidat disimpan terpisah dari data pembatasan pemilih untuk menjaga kerahasiaan suara.</li>
          <li>Suara yang sudah dikonfirmasi tidak dapat diubah kembali.</li>
          <li>${esc(settings?.privacy_notice || 'Pembatasan berbasis IP tidak menjamin satu orang satu suara secara mutlak.')}</li>
        </ul>
      </div>
    </div>
  `;

  appEl.innerHTML = renderPublicShell({ activeRoute: '/', settings, polling, contentHtml });
}
