/**
 * PublicLayout.js — Shell navigasi halaman publik (Beranda, Kandidat, Hasil, Admin).
 * Navigasi SPA ringan tanpa reload halaman.
 */
import { isLocalMockMode } from '../../config.js';
import { esc } from '../../utils/format.js';

export function renderPublicShell({ activeRoute, settings, polling, contentHtml }) {
  const villageName = polling?.village_name || settings?.village_name || 'Desa';
  const logoUrl = settings?.village_logo_url || '';
  const initials = villageName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'BP';

  return `
    ${isLocalMockMode() ? `
      <div class="mode-banner">
        Mode Simulasi Lokal aktif (belum terhubung ke URL GAS produksi). Login Admin Demo: <strong>admin</strong> / <strong>admin123</strong>.
      </div>
    ` : ''}
    <header class="navbar">
      <div class="container navbar-inner">
        <a href="#/" class="brand">
          ${logoUrl
            ? `<img src="${esc(logoUrl)}" alt="Logo ${esc(villageName)}" class="brand-logo" />`
            : `<span class="brand-logo" aria-hidden="true">${esc(initials)}</span>`}
          <span>
            E-Polling BPD
            <span class="brand-sub">${esc(villageName)}</span>
          </span>
        </a>
        <nav class="nav-links" aria-label="Navigasi Publik">
          <a href="#/" class="nav-link ${activeRoute === '/' ? 'active' : ''}">Beranda</a>
          <a href="#/kandidat" class="nav-link ${activeRoute === '/kandidat' ? 'active' : ''}">Daftar Kandidat</a>
          <a href="#/hasil" class="nav-link ${activeRoute === '/hasil' ? 'active' : ''}">Hasil Polling</a>
          <a href="#/ketentuan" class="nav-link ${activeRoute === '/ketentuan' ? 'active' : ''}">Ketentuan</a>
          <a href="#/admin/login" class="nav-link">Admin</a>
        </nav>
      </div>
    </header>
    <main class="public-main">
      <div class="container view-enter" id="public-content">
        ${contentHtml}
      </div>
    </main>
    <footer class="public-footer">
      <div class="container">
        <strong>E-Polling Pemilihan Kandidat BPD — ${esc(villageName)}</strong>
        <p style="margin:6px 0 0;">
          ${esc(settings?.privacy_notice || 'Sistem polling publik tanpa akun pemilih. Pembatasan berbasis IP diterapkan per periode pemilihan dan tidak menjamin satu orang satu suara secara mutlak.')}
          <a href="#/ketentuan" style="margin-left:6px;font-weight:600;">Baca Ketentuan &amp; Pernyataan Lengkap &rarr;</a>
        </p>
      </div>
    </footer>
  `;
}
