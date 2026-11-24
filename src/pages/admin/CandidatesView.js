/**
 * CandidatesView.js — CRUD Kandidat (Tambah, Edit, Upload Foto tervalidasi, Nonaktifkan, Arsipkan).
 */
import { apiCall } from '../../services/api.js';
import { store } from '../../state/store.js';
import { openModal, renderEmptyState, renderErrorState, showToast } from '../../components/ui.js';
import { esc } from '../../utils/format.js';

export async function renderCandidatesView(container, { forceRefresh = false } = {}) {
  let polRes;
  let cRes;

  // Jalankan paralel jika selectedPollingId sudah diketahui (pangkas waktu muat 50%!)
  if (store.selectedPollingId) {
    [polRes, cRes] = await Promise.all([
      apiCall('admin.pollings.list', {}, { forceRefresh }),
      apiCall('admin.candidates.list', { polling_id: store.selectedPollingId }, { forceRefresh })
    ]);
  } else {
    polRes = await apiCall('admin.pollings.list', {}, { forceRefresh });
  }

  if (!polRes.ok) {
    if (polRes.code === 'UNAUTHORIZED') { location.hash = '#/admin/login'; return; }
    container.innerHTML = renderErrorState(polRes.message, 'retry-cand-pol');
    return;
  }

  const pollings = polRes.data || [];
  if (!store.selectedPollingId && pollings.length > 0) {
    store.selectedPollingId = (pollings.find((p) => p.status === 'ACTIVE') || pollings[0]).polling_id;
  }

  const pollingId = store.selectedPollingId;
  let candidates = [];
  if (pollingId) {
    if (!cRes) {
      cRes = await apiCall('admin.candidates.list', { polling_id: pollingId }, { forceRefresh });
    }
    if (!cRes.ok) {
      container.innerHTML = renderErrorState(cRes.message, 'retry-cands-admin');
      return;
    }
    candidates = cRes.data || [];
  }

  container.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Manajemen Kandidat</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Kelola kandidat, nomor urut, foto, profil, visi, dan misi.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${pollings.length ? `
          <select id="cand-polling-select" class="form-control" style="width:auto;min-width:220px;">
            ${pollings.map((p) => `<option value="${esc(p.polling_id)}" ${p.polling_id === pollingId ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}
          </select>
        ` : ''}
        <button type="button" class="btn btn-primary btn-sm" id="btn-add-cand" ${pollingId ? '' : 'disabled'}>+ Tambah Kandidat</button>
      </div>
    </div>

    ${!pollingId
      ? renderEmptyState('Belum Ada Periode Polling', 'Buat periode polling terlebih dahulu sebelum menambahkan kandidat.')
      : candidates.length === 0
        ? renderEmptyState('Belum Ada Kandidat', 'Tambahkan kandidat pertama untuk periode pemilihan ini.')
        : `
          <div class="card">
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Kandidat</th>
                    <th>Profil Singkat</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${candidates.map((c) => `
                    <tr>
                      <td><strong>#${esc(c.candidate_number)}</strong></td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                          ${c.photo_url
                            ? `<img src="${esc(c.photo_url)}" alt="${esc(c.candidate_name)}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" />`
                            : `<div style="width:40px;height:40px;border-radius:8px;background:var(--primary-soft);color:var(--primary-text);display:grid;place-items:center;font-weight:700;">${esc(c.candidate_number)}</div>`}
                          <strong>${esc(c.candidate_name)}</strong>
                        </div>
                      </td>
                      <td style="max-width:300px;color:var(--text-muted);">${esc((c.profile || '-').slice(0, 90))}</td>
                      <td>
                        <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : c.status === 'INACTIVE' ? 'badge-warning' : 'badge-neutral'}">
                          ${esc(c.status)}
                        </span>
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button type="button" class="btn btn-outline btn-sm" data-edit-cand="${esc(c.candidate_id)}">Edit</button>
                          ${c.status !== 'ARCHIVED'
                            ? `<button type="button" class="btn btn-outline btn-sm" style="color:var(--danger);" data-archive-cand="${esc(c.candidate_id)}">Arsipkan</button>`
                            : ''}
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

  const openCandidateForm = (existing = null) => {
    let uploadedFileId = existing?.photo_file_id || '';
    const nextNum = existing
      ? existing.candidate_number
      : (candidates.reduce((m, c) => Math.max(m, Number(c.candidate_number) || 0), 0) + 1);

    openModal({
      title: existing ? `Edit Kandidat #${existing.candidate_number}` : 'Tambah Kandidat Baru',
      bodyHtml: `
        <div id="cand-form-err"></div>
        <form id="cand-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nomor Urut *</label>
              <input type="number" min="1" name="candidate_number" class="form-control" value="${esc(nextNum)}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select name="status" class="form-control">
                <option value="ACTIVE" ${(!existing || existing.status === 'ACTIVE') ? 'selected' : ''}>Aktif</option>
                <option value="INACTIVE" ${existing?.status === 'INACTIVE' ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nama Lengkap *</label>
            <input type="text" name="candidate_name" class="form-control" value="${esc(existing?.candidate_name || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Foto Kandidat (JPG/PNG/WEBP, maks. 2 MB)</label>
            <input type="file" id="cand-photo-input" accept="image/jpeg,image/png,image/webp" class="form-control" />
            <div id="cand-photo-preview" style="margin-top:8px;">
              ${existing?.photo_url ? `<img src="${esc(existing.photo_url)}" alt="Preview" style="width:72px;height:72px;border-radius:8px;object-fit:cover;border:1px solid var(--border);" />` : ''}
            </div>
            <div id="cand-photo-status" class="form-help">${uploadedFileId ? 'Foto sudah tersimpan.' : 'Opsional — unggah foto atau isi URL foto di bawah.'}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Atau URL Foto Langsung (opsional)</label>
            <input type="url" id="cand-photo-url-manual" class="form-control" value="${esc(uploadedFileId && uploadedFileId.startsWith('http') ? uploadedFileId : '')}" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label class="form-label">Profil Singkat</label>
            <textarea name="profile" class="form-control">${esc(existing?.profile || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Visi</label>
            <textarea name="vision" class="form-control">${esc(existing?.vision || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Misi</label>
            <textarea name="mission" class="form-control">${esc(existing?.mission || '')}</textarea>
          </div>
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn btn-outline" id="cand-cancel">Batal</button>
        <button type="button" class="btn btn-primary" id="cand-save">Simpan Kandidat</button>
      `,
      onMount: (root, close) => {
        const form = root.querySelector('#cand-form');
        const errBox = root.querySelector('#cand-form-err');
        const saveBtn = root.querySelector('#cand-save');
        const photoInput = root.querySelector('#cand-photo-input');
        const photoStatus = root.querySelector('#cand-photo-status');
        const photoPreview = root.querySelector('#cand-photo-preview');
        const photoManual = root.querySelector('#cand-photo-url-manual');

        root.querySelector('#cand-cancel')?.addEventListener('click', close);

        photoInput?.addEventListener('change', () => {
          const file = photoInput.files?.[0];
          if (!file) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            photoStatus.innerHTML = `<span style="color:var(--danger);font-weight:600;">Format tidak didukung. Gunakan JPG, PNG, atau WEBP.</span>`;
            photoInput.value = '';
            return;
          }
          if (file.size > 2 * 1024 * 1024) {
            photoStatus.innerHTML = `<span style="color:var(--danger);font-weight:600;">Ukuran foto melebihi 2 MB.</span>`;
            photoInput.value = '';
            return;
          }
          const reader = new FileReader();
          photoStatus.textContent = 'Mengunggah foto ke Google Drive...';
          saveBtn.disabled = true;
          reader.onload = async () => {
            photoPreview.innerHTML = `<img src="${reader.result}" alt="Preview" style="width:72px;height:72px;border-radius:8px;object-fit:cover;border:1px solid var(--border);" />`;
            const up = await apiCall('admin.candidates.uploadPhoto', {
              mimeType: file.type,
              fileName: file.name,
              base64Data: reader.result
            });
            saveBtn.disabled = false;
            if (up.ok) {
              uploadedFileId = up.data.photo_file_id;
              photoStatus.innerHTML = `<span style="color:var(--success);font-weight:600;">Foto berhasil diunggah ke Google Drive!</span>`;
            } else {
              photoStatus.innerHTML = `<span style="color:var(--danger);font-weight:600;">Gagal unggah foto: ${esc(up.message)}</span>`;
              showToast(`Gagal unggah foto: ${up.message}`, 'danger', 5000);
            }
          };
          reader.readAsDataURL(file);
        });

        saveBtn?.addEventListener('click', async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Menyimpan...';
          errBox.innerHTML = '';

          const manualUrl = photoManual ? photoManual.value.trim() : '';
          const finalPhotoId = manualUrl || uploadedFileId;

          const res = await apiCall('admin.candidates.save', {
            candidate_id: existing?.candidate_id || '',
            polling_id: pollingId,
            candidate_number: Number(form.candidate_number.value),
            candidate_name: form.candidate_name.value.trim(),
            photo_file_id: finalPhotoId,
            profile: form.profile.value.trim(),
            vision: form.vision.value.trim(),
            mission: form.mission.value.trim(),
            status: form.status.value
          });

          if (res.ok) {
            close();
            showToast('Data kandidat berhasil disimpan.', 'success');
            await renderCandidatesView(container, { forceRefresh: true });
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Simpan Kandidat';
            errBox.innerHTML = `<div class="alert alert-danger">${esc(res.message)}</div>`;
          }
        });
      }
    });
  };

  container.querySelector('#cand-polling-select')?.addEventListener('change', (e) => {
    store.selectedPollingId = e.target.value;
    renderCandidatesView(container);
  });

  container.querySelector('#btn-add-cand')?.addEventListener('click', () => openCandidateForm(null));

  container.querySelectorAll('[data-edit-cand]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = candidates.find((x) => x.candidate_id === btn.dataset.editCand);
      if (c) openCandidateForm(c);
    });
  });

  container.querySelectorAll('[data-archive-cand]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = candidates.find((x) => x.candidate_id === btn.dataset.archiveCand);
      if (!c) return;
      openModal({
        title: 'Arsipkan Kandidat?',
        bodyHtml: `<p>Kandidat <strong>${esc(c.candidate_name)}</strong> akan diarsipkan dan tidak lagi tampil untuk dipilih. <strong>Data suara historis tetap dipertahankan</strong> demi integritas hasil.</p>`,
        footerHtml: `
          <button type="button" class="btn btn-outline" id="arch-cancel">Batal</button>
          <button type="button" class="btn btn-danger" id="arch-confirm">Ya, Arsipkan</button>
        `,
        onMount: (root, close) => {
          root.querySelector('#arch-cancel')?.addEventListener('click', close);
          root.querySelector('#arch-confirm')?.addEventListener('click', async (e) => {
            e.currentTarget.disabled = true;
            const res = await apiCall('admin.candidates.archive', { candidate_id: c.candidate_id });
            if (res.ok) {
              close();
              showToast('Kandidat berhasil diarsipkan.', 'success');
              await renderCandidatesView(container, { forceRefresh: true });
            } else {
              showToast(res.message, 'danger');
              e.currentTarget.disabled = false;
            }
          });
        }
      });
    });
  });
}
