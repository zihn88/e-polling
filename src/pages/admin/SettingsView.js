/**
 * SettingsView.js — Pengaturan Identitas Desa, Tata Cara Pemilihan, dan Catatan Privasi.
 */
import { apiCall } from '../../services/api.js';
import { renderErrorState, showToast } from '../../components/ui.js';
import { esc } from '../../utils/format.js';

export async function renderSettingsView(container) {
  const res = await apiCall('admin.settings.get');
  if (!res.ok) {
    if (res.code === 'UNAUTHORIZED') { location.hash = '#/admin/login'; return; }
    container.innerHTML = renderErrorState(res.message, 'retry-settings');
    return;
  }

  const s = res.data || {};

  container.innerHTML = `
    <div class="admin-topbar">
      <div>
        <h1>Pengaturan Aplikasi</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.9rem;">Atur identitas desa dan informasi yang tampil pada halaman publik.</p>
      </div>
    </div>

    <div class="card" style="max-width:720px;">
      <form id="settings-form">
        <div class="form-group">
          <label class="form-label">Nama Desa</label>
          <input type="text" name="village_name" class="form-control" value="${esc(s.village_name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">URL Logo Desa (opsional)</label>
          <input type="url" name="village_logo_url" class="form-control" value="${esc(s.village_logo_url || '')}" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label class="form-label">Tata Cara Pemilihan (pisahkan langkah dengan baris baru)</label>
          <textarea name="voting_instructions" class="form-control" style="min-height:110px;">${esc(s.voting_instructions || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Catatan Privasi & Transparansi</label>
          <textarea name="privacy_notice" class="form-control">${esc(s.privacy_notice || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-primary" id="btn-save-settings">Simpan Pengaturan</button>
      </form>
    </div>
  `;

  const form = container.querySelector('#settings-form');
  const btn = container.querySelector('#btn-save-settings');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
    const saveRes = await apiCall('admin.settings.save', {
      village_name: form.village_name.value.trim(),
      village_logo_url: form.village_logo_url.value.trim(),
      voting_instructions: form.voting_instructions.value.trim(),
      privacy_notice: form.privacy_notice.value.trim()
    });
    btn.disabled = false;
    btn.textContent = 'Simpan Pengaturan';
    if (saveRes.ok) {
      showToast('Pengaturan berhasil disimpan.', 'success');
    } else {
      showToast(saveRes.message, 'danger');
    }
  });
}
