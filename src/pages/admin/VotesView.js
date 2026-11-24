/**
 * VotesView.js — Manajemen Suara, Statistik Pembatasan (tanpa korelasi IP↔kandidat),
 * Cek Integritas Data, dan Koreksi Resmi (Void) yang tercatat di Audit Log.
 */
import { apiCall } from '../../services/api.js';
import { store } from '../../state/store.js';
import { openModal, renderEmptyState, renderErrorState, showToast } from '../../components/ui.js';
import { esc, formatDateTime } from '../../utils/format.js';

export async function renderVotesView(container, { forceRefresh = false } = {}) {
  const polRes = await apiCall('admin.pollings.list');
  const pollings = polRes.ok ? (polRes.data || []) : [];
  if (!store.selectedPollingId && pollings.length > 0) {
    store.selectedPollingId = (pollings.find((p) => p.status === 'ACTIVE') || pollings[0]).polling_id;
  }

  const pollingId = store.selectedPollingId;
  const res = pollingId
    ? await apiCall('admin.votes.summary', { polling_id: pollingId }, { forceRefresh })
    : { ok: true, data: { tally: { total_votes_recorded: 0, total_valid_votes: 0, total_voided_votes: 0, candidates: [] }, restrictionsStats: { committed: 0, rollback: 0 }, transactions: [] } };

  if (!res.ok) {
    if (res.code === 'UNAUTHORIZED') { location.hash = '#/admin/login'; return; }
    container.innerHTML = renderErrorState(res.message, 'retry-votes');
    return;
  }

  const { tally, restrictionsStats, transactions } = res.data;

  container.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Manajemen Suara & Integritas</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Data pilihan suara dipisahkan secara ketat dari identitas pembatas pemilih.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${pollings.length ? `
          <select id="votes-polling-select" class="form-control" style="width:auto;min-width:220px;">
            ${pollings.map((p) => `<option value="${esc(p.polling_id)}" ${p.polling_id === pollingId ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}
          </select>
        ` : ''}
        <button type="button" class="btn btn-outline btn-sm" id="btn-verify-integrity" ${pollingId ? '' : 'disabled'}>Cek Integritas</button>
      </div>
    </div>

    <div id="integrity-result-slot"></div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Suara Masuk</div>
        <div class="kpi-value">${esc(tally.total_votes_recorded)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Suara Valid</div>
        <div class="kpi-value" style="color:var(--success);">${esc(tally.total_valid_votes)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Suara Dikoreksi (Void)</div>
        <div class="kpi-value" style="color:var(--danger);">${esc(tally.total_voided_votes)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pembatas Tercatat</div>
        <div class="kpi-value">${esc(restrictionsStats.committed)}</div>
        <div class="kpi-sub">Rollback: ${esc(restrictionsStats.rollback)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Log Transaksi Suara (100 Terbaru — Tanpa Identitas Pemilih)</h2>
      </div>
      ${transactions.length === 0
        ? renderEmptyState('Belum Ada Transaksi Suara', 'Transaksi suara yang masuk akan tampil di sini.')
        : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Vote ID</th>
                  <th>Transaction ID</th>
                  <th>Waktu Transaksi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map((t) => `
                  <tr>
                    <td><code>${esc(t.vote_id)}</code></td>
                    <td><code style="font-size:0.8rem;">${esc(t.transaction_id)}</code></td>
                    <td>${esc(formatDateTime(t.created_at))}</td>
                    <td><span class="badge ${t.status === 'VALID' ? 'badge-success' : 'badge-danger'}">${esc(t.status)}</span></td>
                    <td>
                      ${t.status === 'VALID'
                        ? `<button type="button" class="btn btn-outline btn-sm" style="color:var(--danger);" data-void-id="${esc(t.vote_id)}">Koreksi (Void)</button>`
                        : `<span style="color:var(--text-subtle);font-size:0.82rem;">Dikoreksi</span>`}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
    </div>
  `;

  container.querySelector('#votes-polling-select')?.addEventListener('change', (e) => {
    store.selectedPollingId = e.target.value;
    renderVotesView(container);
  });

  container.querySelector('#btn-verify-integrity')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Memeriksa...';
    const check = await apiCall('admin.votes.verifyIntegrity', { polling_id: pollingId });
    btn.disabled = false;
    btn.textContent = 'Cek Integritas';
    const slot = container.querySelector('#integrity-result-slot');
    if (check.ok) {
      const d = check.data;
      slot.innerHTML = `
        <div class="alert ${d.consistent ? 'alert-success' : 'alert-warning'}">
          <strong>${d.consistent ? 'Integritas Data Konsisten' : 'Perlu Pemeriksaan Integritas'}</strong> —
          Baris Suara: ${esc(d.totalVotesRows)}, Pembatas Committed: ${esc(d.totalCommittedRestrictions)},
          Duplikasi Transaksi: ${esc(d.duplicateTransactions)}, Duplikasi Pembatas: ${esc(d.duplicateVoterKeys)}.
        </div>
      `;
    } else {
      showToast(check.message, 'danger');
    }
  });

  container.querySelectorAll('[data-void-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const voteId = btn.dataset.voidId;
      openModal({
        title: 'Koreksi Suara (Void)',
        bodyHtml: `
          <p style="margin-top:0;color:var(--text-muted);">Tindakan ini menandai suara <code>${esc(voteId)}</code> sebagai <strong>VOIDED</strong> dan wajib disertai alasan resmi yang tercatat pada Audit Log.</p>
          <div class="form-group">
            <label class="form-label">Alasan Koreksi (min. 5 karakter) *</label>
            <textarea id="void-reason" class="form-control" placeholder="Contoh: Berita acara panitia nomor ..."></textarea>
          </div>
          <div id="void-err"></div>
        `,
        footerHtml: `
          <button type="button" class="btn btn-outline" id="void-cancel">Batal</button>
          <button type="button" class="btn btn-danger" id="void-confirm">Konfirmasi Void</button>
        `,
        onMount: (root, close) => {
          root.querySelector('#void-cancel')?.addEventListener('click', close);
          root.querySelector('#void-confirm')?.addEventListener('click', async (e) => {
            const reason = root.querySelector('#void-reason').value.trim();
            if (reason.length < 5) {
              root.querySelector('#void-err').innerHTML = `<div class="alert alert-danger">Alasan minimal 5 karakter.</div>`;
              return;
            }
            e.currentTarget.disabled = true;
            const resVoid = await apiCall('admin.votes.void', { vote_id: voteId, reason });
            if (resVoid.ok) {
              close();
              showToast('Suara berhasil dikoreksi dan tercatat di Audit Log.', 'success');
              await renderVotesView(container, { forceRefresh: true });
            } else {
              root.querySelector('#void-err').innerHTML = `<div class="alert alert-danger">${esc(resVoid.message)}</div>`;
              e.currentTarget.disabled = false;
            }
          });
        }
      });
    });
  });
}
