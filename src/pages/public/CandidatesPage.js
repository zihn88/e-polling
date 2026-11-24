/**
 * CandidatesPage.js — Daftar Kandidat, Modal Detail Kandidat, Konfirmasi Pilihan,
 * Perlindungan Klik Ganda (button lock + UUID idempotency key), dan Notifikasi Suara.
 */
import { apiCall } from '../../services/api.js';
import { openModal, renderEmptyState, renderErrorState, showToast } from '../../components/ui.js';
import { esc, uuid } from '../../utils/format.js';
import { renderPublicShell } from './PublicLayout.js';

function candidateInitials(name) {
  return String(name || '?').split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

export async function mountCandidatesPage(appEl) {
  const res = await apiCall('public.bootstrap');

  if (!res.ok) {
    appEl.innerHTML = renderPublicShell({
      activeRoute: '/kandidat',
      settings: {},
      polling: null,
      contentHtml: renderErrorState(res.message, 'retry-cands')
    });
    document.getElementById('retry-cands')?.addEventListener('click', () => {
      apiCall('public.bootstrap', {}, { forceRefresh: true }).then(() => mountCandidatesPage(appEl));
    });
    return;
  }

  const { settings, polling, windowStatus, candidates, alreadyVoted } = res.data;

  if (!polling) {
    appEl.innerHTML = renderPublicShell({
      activeRoute: '/kandidat',
      settings,
      polling: null,
      contentHtml: renderEmptyState('Belum Ada Periode Pemilihan', 'Daftar kandidat akan muncul saat periode pemilihan tersedia.')
    });
    return;
  }

  const canVoteNow = windowStatus.canVote && !alreadyVoted;

  const bannerHtml = alreadyVoted
    ? `<div class="alert alert-success"><strong>Suara Anda telah tercatat.</strong> Anda sudah memberikan suara pada periode pemilihan ini. <a href="#/hasil">Lihat hasil polling &rarr;</a></div>`
    : !windowStatus.canVote
      ? `<div class="alert alert-warning"><strong>Pemungutan suara tidak tersedia:</strong> ${esc(windowStatus.message)}</div>`
      : `<div class="alert alert-info">Silakan pelajari profil, visi, dan misi setiap kandidat sebelum menekan tombol <strong>Pilih</strong>.</div>`;

  const gridHtml = candidates.length === 0
    ? renderEmptyState('Belum Ada Kandidat Aktif', 'Panitia belum menambahkan kandidat aktif untuk periode pemilihan ini.')
    : `
      <div class="candidate-grid">
        ${candidates.map((c) => `
          <article class="candidate-card">
            <div class="candidate-photo-wrap">
              ${c.photo_url
                ? `<img src="${esc(c.photo_url)}" alt="Foto ${esc(c.candidate_name)}" class="candidate-photo" loading="lazy" />`
                : `<div class="candidate-photo-placeholder">${esc(candidateInitials(c.candidate_name))}</div>`}
              <span class="candidate-num">No. ${esc(c.candidate_number)}</span>
            </div>
            <div class="candidate-body">
              <h2 class="candidate-name">${esc(c.candidate_name)}</h2>
              <p class="candidate-profile">${esc(c.profile || 'Belum ada ringkasan profil.')}</p>
              <div class="candidate-actions">
                <button type="button" class="btn btn-outline btn-sm" data-detail-id="${esc(c.candidate_id)}">Lihat Profil</button>
                <button type="button" class="btn btn-primary btn-sm" data-vote-id="${esc(c.candidate_id)}" ${canVoteNow ? '' : 'disabled'}>
                  ${alreadyVoted ? 'Sudah Memilih' : 'Pilih'}
                </button>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
      <div>
        <h1 style="margin:0;font-size:1.5rem;">Daftar Kandidat BPD</h1>
        <p style="margin:4px 0 0;color:var(--text-muted);">${esc(polling.title)} — ${esc(polling.village_name)}</p>
      </div>
      <a href="#/" class="btn btn-outline btn-sm">&larr; Kembali ke Beranda</a>
    </div>
    ${bannerHtml}
    ${gridHtml}
  `;

  appEl.innerHTML = renderPublicShell({ activeRoute: '/kandidat', settings, polling, contentHtml });

  const openDetail = (candidate) => {
    openModal({
      title: `Kandidat No. ${candidate.candidate_number} — ${candidate.candidate_name}`,
      bodyHtml: `
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
          <div style="width:120px;height:120px;border-radius:12px;overflow:hidden;flex-shrink:0;background:var(--surface-alt);">
            ${candidate.photo_url
              ? `<img src="${esc(candidate.photo_url)}" alt="${esc(candidate.candidate_name)}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<div class="candidate-photo-placeholder" style="font-size:1.8rem;">${esc(candidateInitials(candidate.candidate_name))}</div>`}
          </div>
          <div style="flex:1;min-width:200px;">
            <span class="badge badge-info">Nomor Urut ${esc(candidate.candidate_number)}</span>
            <h3 style="margin:8px 0 6px;">${esc(candidate.candidate_name)}</h3>
            <p style="margin:0;color:var(--text-muted);font-size:0.9rem;">${esc(candidate.profile || '-')}</p>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <strong style="display:block;margin-bottom:4px;">Visi</strong>
          <p style="margin:0;color:var(--text-muted);white-space:pre-line;">${esc(candidate.vision || 'Belum diisi.')}</p>
        </div>
        <div>
          <strong style="display:block;margin-bottom:4px;">Misi</strong>
          <p style="margin:0;color:var(--text-muted);white-space:pre-line;">${esc(candidate.mission || 'Belum diisi.')}</p>
        </div>
      `,
      footerHtml: `
        <button type="button" class="btn btn-outline" id="modal-back-btn">Kembali</button>
        ${canVoteNow ? `<button type="button" class="btn btn-primary" id="modal-pick-btn">Pilih Kandidat Ini</button>` : ''}
      `,
      onMount: (root, close) => {
        root.querySelector('#modal-back-btn')?.addEventListener('click', close);
        root.querySelector('#modal-pick-btn')?.addEventListener('click', () => {
          close();
          openConfirmVote(candidate);
        });
      }
    });
  };

  const openConfirmVote = (candidate) => {
    // 1 transaction_id unik per niat konfirmasi (idempotency key)
    const txId = uuid();
    let submitting = false;

    openModal({
      title: 'Konfirmasi Pilihan Anda',
      bodyHtml: `
        <div class="alert alert-warning" style="margin-bottom:14px;">
          Pastikan pilihan Anda sudah benar. Setelah dikonfirmasi, suara <strong>tidak dapat diubah</strong>.
        </div>
        <div style="padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--surface-alt);">
          <div style="font-size:0.82rem;color:var(--text-subtle);">Kandidat yang Anda Pilih</div>
          <div style="font-size:1.15rem;font-weight:800;margin-top:4px;">
            No. ${esc(candidate.candidate_number)} — ${esc(candidate.candidate_name)}
          </div>
        </div>
        <div id="vote-error-slot" style="margin-top:12px;"></div>
      `,
      footerHtml: `
        <button type="button" class="btn btn-outline" id="btn-cancel-vote">Batal</button>
        <button type="button" class="btn btn-primary" id="btn-confirm-vote">Konfirmasi Suara</button>
      `,
      onMount: (root, close) => {
        const cancelBtn = root.querySelector('#btn-cancel-vote');
        const confirmBtn = root.querySelector('#btn-confirm-vote');
        const errSlot = root.querySelector('#vote-error-slot');

        cancelBtn?.addEventListener('click', () => {
          if (!submitting) close();
        });

        confirmBtn?.addEventListener('click', async () => {
          if (submitting) return; // Proteksi klik ganda frontend (backend tetap enforce idempotency & LockService)
          submitting = true;
          confirmBtn.disabled = true;
          cancelBtn.disabled = true;
          confirmBtn.textContent = 'Menyimpan Suara...';
          errSlot.innerHTML = '';

          const voteRes = await apiCall('public.vote', {
            polling_id: polling.polling_id,
            candidate_id: candidate.candidate_id,
            transaction_id: txId
          });

          if (voteRes.ok) {
            close();
            showToast(voteRes.data?.message || 'Suara berhasil direkam!', 'success', 5000);
            await mountCandidatesPage(appEl);
          } else {
            submitting = false;
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            confirmBtn.textContent = 'Konfirmasi Suara';
            errSlot.innerHTML = `<div class="alert alert-danger" style="margin:0;">${esc(voteRes.message)}</div>`;
          }
        });
      }
    });
  };

  appEl.querySelectorAll('[data-detail-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = candidates.find((x) => x.candidate_id === btn.dataset.detailId);
      if (c) openDetail(c);
    });
  });

  appEl.querySelectorAll('[data-vote-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canVoteNow) return;
      const c = candidates.find((x) => x.candidate_id === btn.dataset.voteId);
      if (c) openConfirmVote(c);
    });
  });
}
