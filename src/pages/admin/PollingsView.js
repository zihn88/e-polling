/**
 * PollingsView.js — Manajemen Periode Polling (Buat, Edit, Buka, Tutup, Pengaturan Publikasi Hasil).
 */
import { apiCall } from '../../services/api.js';
import { openModal, renderEmptyState, renderErrorState, showToast } from '../../components/ui.js';
import { esc, formatDateTime, pollingStatusBadge, toDatetimeLocalValue, visibilityLabel } from '../../utils/format.js';

export async function renderPollingsView(container, { forceRefresh = false } = {}) {
  const res = await apiCall('admin.pollings.list', {}, { forceRefresh });
  if (!res.ok) {
    if (res.code === 'UNAUTHORIZED') { location.hash = '#/admin/login'; return; }
    container.innerHTML = renderErrorState(res.message, 'retry-pollings');
    return;
  }

  const pollings = res.data || [];

  container.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Manajemen Periode Polling</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Atur jadwal pemilihan, status buka/tutup, dan visibilitas hasil.</p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" id="btn-add-polling">+ Buat Periode Polling</button>
    </div>

    ${pollings.length === 0
      ? renderEmptyState('Belum Ada Periode Polling', 'Klik tombol "+ Buat Periode Polling" untuk memulai.')
      : `
        <div class="card">
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Judul & Desa</th>
                  <th>Jadwal</th>
                  <th>Status</th>
                  <th>Publikasi Hasil</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${pollings.map((p) => `
                  <tr>
                    <td>
                      <strong>${esc(p.title)}</strong>
                      <div style="font-size:0.82rem;color:var(--text-subtle);">${esc(p.village_name)}</div>
                    </td>
                    <td style="font-size:0.84rem;">
                      ${esc(formatDateTime(p.start_at))}<br/>
                      s.d. ${esc(formatDateTime(p.end_at))}
                    </td>
                    <td>${pollingStatusBadge(p.status)}</td>
                    <td style="font-size:0.85rem;">${esc(visibilityLabel(p.result_visibility))}</td>
                    <td>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button type="button" class="btn btn-outline btn-sm" data-edit-pol="${esc(p.polling_id)}">Edit</button>
                        ${p.status !== 'ACTIVE'
                          ? `<button type="button" class="btn btn-primary btn-sm" data-status-pol="${esc(p.polling_id)}" data-next-status="ACTIVE">Buka</button>`
                          : `<button type="button" class="btn btn-danger btn-sm" data-status-pol="${esc(p.polling_id)}" data-next-status="CLOSED">Tutup</button>`}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `}
  `;

  const openPollingForm = (existing = null) => {
    const defaultStart = existing ? toDatetimeLocalValue(existing.start_at) : toDatetimeLocalValue(new Date().toISOString());
    const defaultEnd = existing
      ? toDatetimeLocalValue(existing.end_at)
      : toDatetimeLocalValue(new Date(Date.now() + 7 * 86400_000).toISOString());

    openModal({
      title: existing ? 'Edit Periode Polling' : 'Buat Periode Polling Baru',
      bodyHtml: `
        <div id="pol-form-err"></div>
        <form id="pol-form" novalidate>
          <div class="form-group">
            <label class="form-label">Judul Pemilihan *</label>
            <input type="text" name="title" class="form-control" value="${esc(existing?.title || '')}" placeholder="Contoh: Pemilihan Kandidat BPD 2026" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nama Desa *</label>
            <input type="text" name="village_name" class="form-control" value="${esc(existing?.village_name || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi Singkat</label>
            <textarea name="description" class="form-control">${esc(existing?.description || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Waktu Mulai *</label>
              <input type="datetime-local" name="start_at" class="form-control" value="${esc(defaultStart)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Waktu Berakhir *</label>
              <input type="datetime-local" name="end_at" class="form-control" value="${esc(defaultEnd)}" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status Polling</label>
              <select name="status" class="form-control">
                ${['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CLOSED'].map((st) => `
                  <option value="${st}" ${(existing?.status || 'DRAFT') === st ? 'selected' : ''}>${st}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Publikasi Hasil</label>
              <select name="result_visibility" class="form-control">
                <option value="HIDDEN" ${existing?.result_visibility === 'HIDDEN' ? 'selected' : ''}>Tersembunyi</option>
                <option value="LIVE" ${existing?.result_visibility === 'LIVE' ? 'selected' : ''}>Tampil Selama Polling</option>
                <option value="AFTER_END" ${(!existing || existing.result_visibility === 'AFTER_END') ? 'selected' : ''}>Tampil Setelah Selesai</option>
              </select>
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn btn-outline" id="pol-cancel">Batal</button>
        <button type="button" class="btn btn-primary" id="pol-save">Simpan Periode</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#pol-form');
        const errBox = root.querySelector('#pol-form-err');
        const saveBtn = root.querySelector('#pol-save');

        root.querySelector('#pol-cancel')?.addEventListener('click', close);
        saveBtn?.addEventListener('click', async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Menyimpan...';
          errBox.innerHTML = '';

          const resSave = await apiCall('admin.pollings.save', {
            polling_id: existing?.polling_id || '',
            title: form.title.value.trim(),
            village_name: form.village_name.value.trim(),
            description: form.description.value.trim(),
            start_at: form.start_at.value ? new Date(form.start_at.value).toISOString() : '',
            end_at: form.end_at.value ? new Date(form.end_at.value).toISOString() : '',
            status: form.status.value,
            result_visibility: form.result_visibility.value
          });

          if (resSave.ok) {
            close();
            showToast('Periode polling berhasil disimpan.', 'success');
            await renderPollingsView(container, { forceRefresh: true });
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan Periode';
            errBox.innerHTML = `<div class="alert alert-danger">${esc(resSave.message)}</div>`;
          }
        });
      }
    });
  };

  container.querySelector('#btn-add-polling')?.addEventListener('click', () => openPollingForm(null));

  container.querySelectorAll('[data-edit-pol]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = pollings.find((x) => x.polling_id === btn.dataset.editPol);
      if (p) openPollingForm(p);
    });
  });

  container.querySelectorAll('[data-status-pol]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const resSt = await apiCall('admin.pollings.setStatus', {
        polling_id: btn.dataset.statusPol,
        status: btn.dataset.nextStatus
      });
      if (resSt.ok) {
        showToast(`Status polling diubah menjadi ${btn.dataset.nextStatus}.`, 'success');
        await renderPollingsView(container, { forceRefresh: true });
      } else {
        showToast(resSt.message, 'danger');
        btn.disabled = false;
      }
    });
  });
}
