/**
 * AdminLoginPage.js — Halaman Login Administrator.
 */
import { isLocalMockMode } from '../../config.js';
import { apiCall } from '../../services/api.js';
import { store } from '../../state/store.js';
import { showToast } from '../../components/ui.js';
import { esc } from '../../utils/format.js';

export function mountAdminLoginPage(appEl) {
  if (store.getAdminToken()) {
    location.hash = '#/admin/dashboard';
    return;
  }

  appEl.innerHTML = `
    <div style="min-height:100vh;display:grid;place-items:center;padding:20px;background:var(--bg);">
      <div class="card" style="width:100%;max-width:420px;padding:28px;">
        <div style="margin-bottom:20px;">
          <a href="#/" style="font-size:0.85rem;">&larr; Kembali ke Halaman Publik</a>
          <h1 style="margin:10px 0 4px;font-size:1.45rem;">Login Administrator</h1>
          <p style="margin:0;color:var(--text-muted);font-size:0.9rem;">E-Polling Pemilihan Kandidat BPD</p>
        </div>

        ${isLocalMockMode() ? `
          <div class="alert alert-info" style="font-size:0.84rem;">
            <strong>Mode Simulasi Lokal:</strong> gunakan <code>admin</code> / <code>admin123</code>.
          </div>
        ` : ''}

        <div id="login-error"></div>

        <form id="admin-login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="adm-user">Username</label>
            <input id="adm-user" name="username" class="form-control" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="adm-pass">Password</label>
            <input id="adm-pass" name="password" type="password" class="form-control" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:6px;" id="btn-login-submit">
            Masuk ke Dashboard
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('admin-login-form');
  const errBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('btn-login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;
    if (!username || !password) {
      errBox.innerHTML = `<div class="alert alert-danger">Username dan password wajib diisi.</div>`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memverifikasi...';
    errBox.innerHTML = '';

    const res = await apiCall('admin.login', { username, password }, { requiresAuth: false });
    if (res.ok) {
      store.setAdminSession(res.data);
      showToast(`Selamat datang, ${res.data.admin.username}`, 'success');
      location.hash = '#/admin/dashboard';
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk ke Dashboard';
      errBox.innerHTML = `<div class="alert alert-danger">${esc(res.message)}</div>`;
    }
  });
}
