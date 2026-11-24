/**
 * ResultsPage.js — Halaman Hasil Polling Publik (menghormati result_visibility: HIDDEN / LIVE / AFTER_END).
 */
import { apiCall } from '../../services/api.js';
import { animateCounters, renderBarChart, renderEmptyState, renderErrorState } from '../../components/ui.js';
import { esc, formatDateTime, pollingStatusBadge } from '../../utils/format.js';
import { renderPublicShell } from './PublicLayout.js';

export async function mountResultsPage(appEl, { forceRefresh = false } = {}) {
  // Ambil bootstrap dari cache (0 network call jika sudah dimuat!) + results
  const [bootRes, res] = await Promise.all([
    apiCall('public.bootstrap'),
    apiCall('public.results', {}, { forceRefresh })
  ]);

  const settings = bootRes.ok ? bootRes.data.settings : {};

  if (!res.ok) {
    appEl.innerHTML = renderPublicShell({
      activeRoute: '/hasil',
      settings,
      polling: null,
      contentHtml: renderErrorState(res.message, 'retry-results')
    });
    document.getElementById('retry-results')?.addEventListener('click', () => {
      mountResultsPage(appEl, { forceRefresh: true });
    });
    return;
  }

  const { visible, message, polling, tally } = res.data;

  if (!visible || !tally) {
    appEl.innerHTML = renderPublicShell({
      activeRoute: '/hasil',
      settings,
      polling,
      contentHtml: renderEmptyState(
        'Hasil Polling Belum Dipublikasikan',
        message || 'Hasil pemilihan belum tersedia untuk publik saat ini.',
        `<a href="#/kandidat" class="btn btn-primary">Kembali ke Daftar Kandidat</a>`
      )
    });
    return;
  }

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      <div>
        <h1 style="margin:0;font-size:1.5rem;">Hasil Perolehan Suara</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);">${esc(polling.title)} — ${esc(polling.village_name)}</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        ${pollingStatusBadge(polling.status)}
        <button type="button" class="btn btn-outline btn-sm" id="btn-refresh-results">Segarkan Hasil</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Suara Sah</div>
        <div class="kpi-value" data-count="${esc(tally.total_valid_votes)}">${esc(tally.total_valid_votes)}</div>
        <div class="kpi-sub">Suara terverifikasi valid</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Jumlah Kandidat</div>
        <div class="kpi-value" data-count="${esc(tally.candidates.length)}">${esc(tally.candidates.length)}</div>
        <div class="kpi-sub">Kandidat pada periode ini</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Periode Pemilihan</div>
        <div class="kpi-value" style="font-size:1rem;line-height:1.4;">${esc(formatDateTime(polling.start_at))}</div>
        <div class="kpi-sub">s.d. ${esc(formatDateTime(polling.end_at))}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h2 class="card-title">Grafik Perolehan Suara</h2></div>
      ${renderBarChart(tally.candidates, tally.total_valid_votes)}
    </div>

    <div class="card">
      <div class="card-header"><h2 class="card-title">Tabel Rekapitulasi Kandidat</h2></div>
      ${tally.candidates.length === 0
        ? renderEmptyState('Belum Ada Data Kandidat', 'Belum ada kandidat terdaftar pada periode ini.')
        : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>No. Urut</th>
                  <th>Nama Kandidat</th>
                  <th>Jumlah Suara</th>
                  <th>Persentase</th>
                </tr>
              </thead>
              <tbody>
                ${tally.candidates.map((c) => `
                  <tr>
                    <td><strong>${esc(c.candidate_number)}</strong></td>
                    <td>${esc(c.candidate_name)}</td>
                    <td><strong>${esc(c.votes)}</strong></td>
                    <td>${esc(c.percentage)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
    </div>
  `;

  appEl.innerHTML = renderPublicShell({ activeRoute: '/hasil', settings, polling, contentHtml });
  animateCounters(appEl);

  document.getElementById('btn-refresh-results')?.addEventListener('click', (e) => {
    e.currentTarget.disabled = true;
    e.currentTarget.textContent = 'Memuat...';
    mountResultsPage(appEl, { forceRefresh: true });
  });
}
