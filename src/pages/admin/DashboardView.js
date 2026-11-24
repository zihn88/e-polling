/**
 * DashboardView.js — Dashboard Utama Administrator (1 request teragregasi).
 */
import { apiCall, prefetchInBackground, seedCache } from '../../services/api.js';
import { store } from '../../state/store.js';
import { renderBarChart, renderEmptyState, renderErrorState } from '../../components/ui.js';
import { esc, formatDateTime, pollingStatusBadge } from '../../utils/format.js';

export async function renderDashboardView(container, { forceRefresh = false } = {}) {
  const queryPayload = store.selectedPollingId ? { polling_id: store.selectedPollingId } : {};
  const res = await apiCall('admin.dashboard', queryPayload, { forceRefresh });

  if (!res.ok) {
    if (res.code === 'UNAUTHORIZED' || res.code === 'SESSION_EXPIRED') {
      location.hash = '#/admin/login';
      return;
    }
    container.innerHTML = renderErrorState(res.message, 'retry-dash');
    container.querySelector('#retry-dash')?.addEventListener('click', () => renderDashboardView(container, { forceRefresh: true }));
    return;
  }

  const { pollings, selectedPolling, kpis, candidateStats, recentActivities } = res.data;
  // Pre-seed cache agar klik balik ke Dashboard maupun ke Periode Polling langsung 0 ms!
  if (Array.isArray(pollings)) {
    seedCache('admin.pollings.list', {}, pollings);
  }
  if (selectedPolling) {
    if (!store.selectedPollingId) {
      store.selectedPollingId = selectedPolling.polling_id;
    }
    seedCache('admin.dashboard', { polling_id: selectedPolling.polling_id }, res.data);
  }

  // Hangatkan cache menu admin lainnya secara diam-diam di background (tidak memblokir UI)
  const pid = store.selectedPollingId;
  const bgTasks = [
    ['admin.auditLogs.list', { page: 1, limit: 20, action: '' }],
    ['admin.settings.get', {}]
  ];
  if (pid) {
    bgTasks.unshift(
      ['admin.candidates.list', { polling_id: pid }],
      ['admin.votes.summary', { polling_id: pid }],
      ['admin.reports.get', { polling_id: pid }]
    );
  }
  prefetchInBackground(bgTasks);

  const pollingSelector = pollings.length > 0
    ? `
      <select id="dash-polling-select" class="form-control" style="width:auto;min-width:240px;">
        ${pollings.map((p) => `
          <option value="${esc(p.polling_id)}" ${selectedPolling && p.polling_id === selectedPolling.polling_id ? 'selected' : ''}>
            ${esc(p.title)} (${esc(p.status)})
          </option>
        `).join('')}
      </select>
    `
    : '';

  container.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Dashboard Utama</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Ringkasan statistik pemilihan kandidat BPD secara real-time.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${pollingSelector}
        <button type="button" class="btn btn-outline btn-sm" id="btn-refresh-dash">Segarkan</button>
      </div>
    </div>

    ${!selectedPolling
      ? renderEmptyState(
          'Belum Ada Periode Polling',
          'Buat periode pemilihan pertama Anda melalui menu Periode Polling untuk mulai menerima suara.',
          `<a href="#/admin/pollings" class="btn btn-primary">Buat Periode Polling</a>`
        )
      : `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Kandidat</div>
            <div class="kpi-value">${esc(kpis.totalCandidates)}</div>
            <div class="kpi-sub">Terdaftar pada periode ini</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Suara Sah</div>
            <div class="kpi-value">${esc(kpis.totalValidVotes)}</div>
            <div class="kpi-sub">Dari ${esc(kpis.totalVotesRecorded)} total transaksi</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Identitas Pembatas Unik</div>
            <div class="kpi-value">${esc(kpis.uniqueVoterKeys)}</div>
            <div class="kpi-sub">Hash jaringan unik tercatat</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Status Polling</div>
            <div style="margin-top:8px;">${pollingStatusBadge(selectedPolling.status)}</div>
            <div class="kpi-sub" style="margin-top:8px;">
              ${esc(formatDateTime(selectedPolling.start_at))}<br/>s.d. ${esc(formatDateTime(selectedPolling.end_at))}
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h2 class="card-title">Statistik Per Kandidat</h2></div>
            ${renderBarChart(candidateStats, kpis.totalValidVotes)}
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Aktivitas Terbaru</h2>
              <a href="#/admin/audit" style="font-size:0.85rem;">Lihat Semua &rarr;</a>
            </div>
            ${recentActivities.length === 0
              ? renderEmptyState('Belum Ada Aktivitas', 'Log aktivitas administrator akan tampil di sini.')
              : `
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${recentActivities.map((a) => `
                    <div style="padding-bottom:10px;border-bottom:1px solid var(--border);font-size:0.88rem;">
                      <div style="display:flex;justify-content:space-between;gap:8px;">
                        <strong>${esc(a.action)}</strong>
                        <span style="color:var(--text-subtle);font-size:0.78rem;">${esc(formatDateTime(a.created_at))}</span>
                      </div>
                      <div style="color:var(--text-muted);margin-top:2px;">${esc(a.description)}</div>
                    </div>
                  `).join('')}
                </div>
              `}
          </div>
        </div>
      `}
  `;

  container.querySelector('#dash-polling-select')?.addEventListener('change', (e) => {
    store.selectedPollingId = e.target.value;
    renderDashboardView(container);
  });

  container.querySelector('#btn-refresh-dash')?.addEventListener('click', () => {
    renderDashboardView(container, { forceRefresh: true });
  });
}
