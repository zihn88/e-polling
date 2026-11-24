/**
 * ReportsView.js — Laporan Resmi Rekapitulasi Hasil Polling (Lihat, Cetak / Ekspor PDF, Ekspor Excel/CSV).
 */
import { apiCall } from '../../services/api.js';
import { store } from '../../state/store.js';
import { renderBarChart, renderEmptyState, renderErrorState } from '../../components/ui.js';
import { downloadCsv, esc, formatDateTime } from '../../utils/format.js';

export async function renderReportsView(container) {
  const polRes = await apiCall('admin.pollings.list');
  const pollings = polRes.ok ? (polRes.data || []) : [];
  if (!store.selectedPollingId && pollings.length > 0) {
    store.selectedPollingId = (pollings.find((p) => p.status === 'ACTIVE') || pollings[0]).polling_id;
  }

  const pollingId = store.selectedPollingId;
  if (!pollingId) {
    container.innerHTML = `
      <div class="admin-topbar"><h1>Laporan Hasil Pemilihan</h1></div>
      ${renderEmptyState('Belum Ada Periode Polling', 'Buat periode polling terlebih dahulu untuk menghasilkan laporan.')}
    `;
    return;
  }

  const res = await apiCall('admin.reports.get', { polling_id: pollingId });
  if (!res.ok) {
    if (res.code === 'UNAUTHORIZED') { location.hash = '#/admin/login'; return; }
    container.innerHTML = renderErrorState(res.message, 'retry-rep');
    return;
  }

  const { generated_at, village_name, polling, tally } = res.data;

  container.innerHTML = `
    <div class="admin-topbar no-print">
      <div>
        <h1>Laporan Rekapitulasi Hasil</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Cetak laporan resmi, simpan sebagai PDF, atau ekspor ke Excel (CSV).</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select id="rep-polling-select" class="form-control" style="width:auto;min-width:220px;">
          ${pollings.map((p) => `<option value="${esc(p.polling_id)}" ${p.polling_id === pollingId ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}
        </select>
        <button type="button" class="btn btn-outline btn-sm" id="btn-export-csv">Ekspor Excel (CSV)</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-print-report">Cetak / Simpan PDF</button>
      </div>
    </div>

    <div class="card" id="printable-report">
      <div style="border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:20px;">
        <div style="font-size:0.85rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">
          Panitia Pemilihan Badan Permusyawaratan Desa (BPD)
        </div>
        <h2 style="margin:4px 0;font-size:1.4rem;">${esc(polling.title)}</h2>
        <div style="color:var(--text-muted);font-size:0.9rem;">
          Desa: <strong>${esc(village_name)}</strong> &bull;
          Periode: ${esc(formatDateTime(polling.start_at))} s.d. ${esc(formatDateTime(polling.end_at))} &bull;
          Status: <strong>${esc(polling.status)}</strong>
        </div>
        <div style="color:var(--text-subtle);font-size:0.82rem;margin-top:4px;">
          Waktu Pembuatan Laporan: ${esc(formatDateTime(generated_at))}
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Suara Valid</div>
          <div class="kpi-value">${esc(tally.total_valid_votes)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Suara Dikoreksi (Void)</div>
          <div class="kpi-value">${esc(tally.total_voided_votes)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Jumlah Kandidat</div>
          <div class="kpi-value">${esc(tally.candidates.length)}</div>
        </div>
      </div>

      <h3 style="margin:20px 0 12px;">Tabel Perolehan Suara</h3>
      <div class="table-wrap" style="margin-bottom:24px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>No. Urut</th>
              <th>Nama Kandidat</th>
              <th>Jumlah Suara Sah</th>
              <th>Persentase</th>
            </tr>
          </thead>
          <tbody>
            ${tally.candidates.length === 0
              ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Belum ada kandidat.</td></tr>`
              : tally.candidates.map((c) => `
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

      <h3 style="margin:20px 0 12px;">Grafik Perolehan Suara</h3>
      ${renderBarChart(tally.candidates, tally.total_valid_votes)}
    </div>
  `;

  container.querySelector('#rep-polling-select')?.addEventListener('change', (e) => {
    store.selectedPollingId = e.target.value;
    renderReportsView(container);
  });

  container.querySelector('#btn-print-report')?.addEventListener('click', () => {
    window.print();
  });

  container.querySelector('#btn-export-csv')?.addEventListener('click', () => {
    const safeTitle = String(polling.title || 'laporan-bpd').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadCsv(
      `rekap-${safeTitle}.csv`,
      ['Nomor Urut', 'Nama Kandidat', 'Status', 'Jumlah Suara Sah', 'Persentase (%)'],
      tally.candidates.map((c) => [c.candidate_number, c.candidate_name, c.status, c.votes, c.percentage])
    );
  });
}
