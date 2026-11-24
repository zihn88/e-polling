/**
 * AuditLogsView.js — Daftar Audit Log Administrator dengan paginasi & filter.
 */
import { apiCall } from '../../services/api.js';
import { renderEmptyState, renderErrorState } from '../../components/ui.js';
import { esc, formatDateTime } from '../../utils/format.js';

export async function renderAuditLogsView(container, { page = 1, actionFilter = '' } = {}) {
  const res = await apiCall('admin.auditLogs.list', { page, limit: 20, action: actionFilter });
  if (!res.ok) {
    if (res.code === 'UNAUTHORIZED') { location.hash = '#/admin/login'; return; }
    container.innerHTML = renderErrorState(res.message, 'retry-audit');
    return;
  }

  const { items, pagination } = res.data;

  container.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Audit Log Aktivitas</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Rekam jejak seluruh aktivitas administrator tanpa menyimpan data rahasia.</p>
      </div>
      <select id="audit-action-filter" class="form-control" style="width:auto;min-width:200px;">
        <option value="">Semua Aktivitas</option>
        ${['ADMIN_LOGIN', 'ADMIN_LOGOUT', 'CANDIDATE_CREATED', 'CANDIDATE_UPDATED', 'CANDIDATE_ARCHIVED', 'POLLING_CREATED', 'POLLING_UPDATED', 'POLLING_OPENED', 'POLLING_CLOSED', 'VOTE_VOIDED', 'SETTINGS_UPDATED'].map((act) => `
          <option value="${act}" ${actionFilter === act ? 'selected' : ''}>${act}</option>
        `).join('')}
      </select>
    </div>

    <div class="card">
      ${items.length === 0
        ? renderEmptyState('Belum Ada Log Aktivitas', 'Belum ada aktivitas yang cocok dengan filter.')
        : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Admin ID</th>
                  <th>Aksi</th>
                  <th>Target</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((l) => `
                  <tr>
                    <td style="white-space:nowrap;">${esc(formatDateTime(l.created_at))}</td>
                    <td><code>${esc(l.admin_id)}</code></td>
                    <td><span class="badge badge-neutral">${esc(l.action)}</span></td>
                    <td>${esc(l.target_type)} ${l.target_id ? `<code>${esc(l.target_id)}</code>` : ''}</td>
                    <td>${esc(l.description)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
            <span style="font-size:0.85rem;color:var(--text-subtle);">Halaman ${pagination.page} dari ${pagination.totalPages} (${pagination.total} entri)</span>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="audit-prev" ${pagination.page <= 1 ? 'disabled' : ''}>&larr; Sebelumnya</button>
              <button type="button" class="btn btn-outline btn-sm" id="audit-next" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Berikutnya &rarr;</button>
            </div>
          </div>
        `}
    </div>
  `;

  container.querySelector('#audit-action-filter')?.addEventListener('change', (e) => {
    renderAuditLogsView(container, { page: 1, actionFilter: e.target.value });
  });
  container.querySelector('#audit-prev')?.addEventListener('click', () => {
    renderAuditLogsView(container, { page: Math.max(1, page - 1), actionFilter });
  });
  container.querySelector('#audit-next')?.addEventListener('click', () => {
    renderAuditLogsView(container, { page: page + 1, actionFilter });
  });
}
