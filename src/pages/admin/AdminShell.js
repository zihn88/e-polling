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
  { key: 'dashboard', label: 'Dashboard', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>' },
  { key: 'pollings', label: 'Periode Polling', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
  { key: 'candidates', label: 'Kandidat', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { key: 'votes', label: 'Data Suara', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
  { key: 'reports', label: 'Laporan & Ekspor', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>' },
  { key: 'audit', label: 'Audit Log', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { key: 'settings', label: 'Pengaturan', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' }
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
              ${item.icon}
              <span>${esc(item.label)}</span>
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

  // Berikan respons visual instan (< 16ms) saat berpindah ke menu baru yang belum ter-cache
  viewEl.style.opacity = '0.65';
  try {
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
  } finally {
    viewEl.style.opacity = '1';
    viewEl.classList.remove('view-enter');
    void viewEl.offsetWidth;
    viewEl.classList.add('view-enter');
  }
}
