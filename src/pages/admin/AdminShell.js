/**
 * AdminShell.js — Persistent Sidebar Shell untuk Dashboard Administrator.
 * Performance-First: perpindahan menu hanya memperbarui #admin-view tanpa rebuild shell.
 */
import { apiCall, invalidateCache } from '../../services/api.js';
import { store } from '../../state/store.js';
import { showToast } from '../../components/ui.js';
import { esc } from '../../utils/format.js';
import { renderDashboardView } from './DashboardView.js';
import { renderCandidatesView } from './CandidatesView.js';
import { renderPollingsView } from './PollingsView.js';
import { renderVotesView } from './VotesView.js';
import { renderReportsView } from './ReportsView.js';
import { renderAuditLogsView } from './AuditLogsView.js';
import { renderSettingsView } from './SettingsView.js';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pollings', label: 'Periode Polling' },
  { key: 'candidates', label: 'Kandidat' },
  { key: 'votes', label: 'Data Suara' },
  { key: 'reports', label: 'Laporan & Ekspor' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'settings', label: 'Pengaturan' }
];

export async function mountAdminSection(appEl, section = 'dashboard') {
  if (!store.getAdminToken()) {
    location.hash = '#/admin/login';
    return;
  }

  const validSection = NAV_ITEMS.some((i) => i.key === section) ? section : 'dashboard';

  // Render shell hanya jika belum terpasang di DOM (zero shell re-init saat pindah menu!)
  if (!appEl.querySelector('.admin-shell')) {
    const admin = store.adminSession?.admin || { username: 'Admin', role: 'ADMIN' };
    appEl.innerHTML = `
      <div class="admin-shell">
        <aside class="admin-sidebar" aria-label="Menu Administrator">
          <div class="admin-brand">
            <strong>Admin E-Polling BPD</strong>
            <span>${esc(admin.username)} (${esc(admin.role)})</span>
          </div>
          ${NAV_ITEMS.map((item) => `
            <button type="button" class="admin-nav-btn" data-admin-nav="${item.key}">
              ${esc(item.label)}
            </button>
          `).join('')}
          <div class="admin-sidebar-footer">
            <a href="#/" class="admin-nav-btn" style="text-decoration:none;">Halaman Publik</a>
            <button type="button" class="admin-nav-btn" id="btn-admin-logout" style="color:#fca5a5;">Keluar</button>
          </div>
        </aside>
        <main class="admin-main">
          <div id="admin-view"></div>
        </main>
      </div>
    `;

    appEl.querySelectorAll('[data-admin-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.adminNav;
        if (location.hash !== `#/admin/${target}`) {
          location.hash = `#/admin/${target}`;
        }
      });
    });

    appEl.querySelector('#btn-admin-logout')?.addEventListener('click', async () => {
      await apiCall('admin.logout');
      store.clearAdminSession();
      invalidateCache();
      showToast('Anda telah keluar.', 'default');
      location.hash = '#/admin/login';
    });
  }

  // Update active nav state secara instan (< 5 ms)
  appEl.querySelectorAll('[data-admin-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.adminNav === validSection);
  });

  const viewEl = appEl.querySelector('#admin-view');
  if (!viewEl) return;

  switch (validSection) {
    case 'dashboard':
      await renderDashboardView(viewEl);
      break;
    case 'pollings':
      await renderPollingsView(viewEl);
      break;
    case 'candidates':
      await renderCandidatesView(viewEl);
      break;
    case 'votes':
      await renderVotesView(viewEl);
      break;
    case 'reports':
      await renderReportsView(viewEl);
      break;
    case 'audit':
      await renderAuditLogsView(viewEl);
      break;
    case 'settings':
      await renderSettingsView(viewEl);
      break;
  }
}
