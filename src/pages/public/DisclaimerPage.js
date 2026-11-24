/**
 * DisclaimerPage.js — Halaman Ketentuan dan Pernyataan (Disclaimer) E-Polling.
 * Performance-First: menggunakan cache public.bootstrap jika tersedia (0 request tambahan saat pindah menu).
 */
import { apiCall } from '../../services/api.js';
import { renderPublicShell } from './PublicLayout.js';

const DISCLAIMER_ITEMS = [
  {
    num: 1,
    title: 'Netralitas Penyelenggara',
    paragraphs: [
      'E-Polling ini diselenggarakan oleh warga Dusun Grogol secara independen dan netral, tanpa maksud, tujuan, maupun kepentingan untuk mengunggulkan, mendukung, mempromosikan, menjatuhkan, atau merugikan seseorang dalam proses penjaringan aspirasi kandidat Badan Permusyawaratan Desa (BPD) Tahun 2026.'
    ]
  },
  {
    num: 2,
    title: 'Tujuan Penyelenggaraan E-Polling',
    paragraphs: [
      'E-Polling ini diselenggarakan sebagai sarana partisipasi masyarakat untuk mengetahui aspirasi, persepsi, dan kecenderungan pilihan warga Dusun Grogol terhadap tokoh-tokoh yang dipandang memiliki potensi, kapasitas, dan kemampuan untuk mewakili wilayah sebagai anggota BPD.'
    ]
  },
  {
    num: 3,
    title: 'Bukan Pemilihan Resmi',
    paragraphs: [
      'E-Polling ini bukan merupakan bagian dari mekanisme resmi pencalonan, pemilihan, maupun penetapan anggota BPD dan tidak memiliki kekuatan hukum atau kewenangan organisasi dalam menentukan hasil pemilihan anggota BPD.'
    ]
  },
  {
    num: 4,
    title: 'Keterwakilan Khusus Wilayah Dusun Grogol',
    paragraphs: [
      'E-Polling ini secara khusus diselenggarakan untuk menghimpun aspirasi warga Dusun Grogol sebagai salah satu keterwakilan wilayah. Hasilnya hanya menggambarkan partisipasi responden dari Dusun Grogol dan tidak dimaksudkan untuk mewakili seluruh wilayah Desa Masangan.'
    ]
  },
  {
    num: 5,
    title: 'Independensi Penyelenggara',
    paragraphs: [
      'Warga Dusun Grogol selaku penyelenggara melaksanakan E-Polling secara independen sebagai bentuk inisiatif partisipasi masyarakat, tanpa mengatasnamakan kepentingan pribadi, kelompok, calon, maupun pihak tertentu.'
    ]
  },
  {
    num: 6,
    title: 'Tidak Menentukan Kelayakan Kandidat',
    paragraphs: [
      'Pencantuman nama seseorang dalam E-Polling tidak berarti bahwa yang bersangkutan telah memenuhi persyaratan administratif, hukum, maupun ketentuan lain untuk menjadi calon anggota BPD. Penilaian kelayakan tetap mengikuti ketentuan dan mekanisme resmi yang berlaku.'
    ]
  },
  {
    num: 7,
    title: 'Tidak Mengandung Pernyataan Kesediaan',
    paragraphs: [
      'Nama tokoh yang tercantum dalam E-Polling tidak dapat ditafsirkan sebagai pernyataan bahwa yang bersangkutan telah menyatakan kesediaan, memberikan persetujuan, atau secara resmi mencalonkan diri sebagai anggota BPD.'
    ]
  },
  {
    num: 8,
    title: 'Bukan Bentuk Kampanye Politik Praktis',
    paragraphs: [
      'E-Polling ini tidak dimaksudkan sebagai sarana kampanye politik praktis, propaganda, pembentukan kelompok dukungan, atau aktivitas lain yang dapat menimbulkan persaingan tidak sehat di tengah masyarakat.'
    ]
  },
  {
    num: 9,
    title: 'Hasil Berdasarkan Partisipasi Responden',
    paragraphs: [
      'Hasil E-Polling merupakan akumulasi pilihan warga yang berpartisipasi melalui sistem yang disediakan dan tidak secara otomatis menggambarkan pendapat seluruh masyarakat Dusun Grogol.'
    ]
  },
  {
    num: 10,
    title: 'Tidak Menggunakan Metode Survei Ilmiah',
    paragraphs: [
      'E-Polling ini merupakan partisipasi terbuka berbasis digital dan tidak menggunakan metode pengambilan sampel ilmiah yang representatif. Oleh karena itu, hasilnya tidak dapat dianggap sebagai survei ilmiah yang mewakili keseluruhan populasi warga Dusun Grogol.'
    ]
  },
  {
    num: 11,
    title: 'Tidak Menjamin Hasil Pemilihan',
    paragraphs: [
      'Tokoh yang memperoleh suara terbanyak dalam E-Polling tidak serta-merta menjadi calon resmi, calon terkuat, maupun pihak yang dipastikan akan terpilih sebagai anggota BPD keterwakilan Dusun Grogol.'
    ]
  },
  {
    num: 12,
    title: 'Menghormati Seluruh Tokoh dan Kandidat',
    paragraphs: [
      'Penyelenggara menghormati seluruh tokoh yang namanya tercantum maupun tidak tercantum dalam E-Polling. Jumlah suara yang diperoleh bukan merupakan ukuran mutlak atas kehormatan, keilmuan, integritas, pengabdian, maupun kapasitas kepemimpinan seseorang.'
    ]
  },
  {
    num: 13,
    title: 'Tidak Bermaksud Membentuk Opini Negatif',
    paragraphs: [
      'E-Polling ini tidak diselenggarakan untuk membangun persepsi negatif, menciptakan persaingan yang tidak sehat, memecah belah masyarakat, atau menimbulkan konflik antarpendukung tokoh tertentu.'
    ]
  },
  {
    num: 14,
    title: 'Menjunjung Persaudaraan dan Persatuan',
    paragraphs: [
      'Seluruh warga diharapkan tetap menjaga kerukunan, persaudaraan, gotong royong, dan semangat kebersamaan. Perbedaan pilihan hendaknya tidak menjadi alasan untuk menimbulkan perselisihan atau merusak hubungan sosial antarwarga.'
    ]
  },
  {
    num: 15,
    title: 'Larangan Manipulasi Suara',
    paragraphs: [
      'Peserta E-Polling dilarang melakukan manipulasi hasil, penggunaan bot, penyalahgunaan sistem, atau tindakan lain yang bertujuan memengaruhi perolehan suara secara tidak wajar. Penyelenggara berhak melakukan pemeriksaan dan penanganan terhadap indikasi penyalahgunaan berdasarkan bukti yang tersedia.'
    ]
  },
  {
    num: 16,
    title: 'Ketentuan Satu HP, Satu Pilihan',
    paragraphs: [
      'Setiap HP/perangkat hanya diperkenankan memberikan satu kali pilihan dalam E-Polling. Setiap peserta diharapkan menggunakan hak partisipasinya secara jujur dan bertanggung jawab serta tidak melakukan pengulangan polling melalui perangkat maupun cara lain untuk memengaruhi hasil secara tidak wajar.'
    ]
  },
  {
    num: 17,
    title: 'Hasil E-Polling Bersifat Dinamis',
    paragraphs: [
      'Perolehan suara dapat berubah selama E-Polling berlangsung sesuai dengan partisipasi responden. Hasil sementara tidak dapat dijadikan dasar untuk menyimpulkan hasil akhir maupun keputusan resmi pemilihan anggota BPD.'
    ]
  },
  {
    num: 18,
    title: 'Hak Koreksi dan Klarifikasi',
    paragraphs: [
      'Tokoh yang namanya tercantum dalam E-Polling atau pihak yang berkepentingan dapat menyampaikan koreksi, klarifikasi, maupun keberatan kepada penyelenggara. Setiap permintaan akan ditinjau secara objektif dan proporsional.'
    ]
  },
  {
    num: 19,
    title: 'Hak Penyelenggara E-Polling',
    paragraphs: [
      'Warga Dusun Grogol selaku penyelenggara berhak melakukan perbaikan teknis, penyesuaian informasi, penundaan, penghentian sementara, maupun penutupan E-Polling apabila ditemukan gangguan sistem, indikasi penyalahgunaan, atau keadaan lain yang dapat memengaruhi keandalan penyelenggaraan.'
    ]
  },
  {
    num: 20,
    title: 'Menghormati Mekanisme Resmi Pemilihan BPD',
    paragraphs: [
      'Penyelenggara sepenuhnya menghormati ketentuan peraturan perundang-undangan, kewenangan pemerintah desa, panitia pemilihan, serta mekanisme resmi pengisian anggota BPD sesuai ketentuan yang berlaku.'
    ]
  },
  {
    num: 21,
    title: 'Penegasan Tujuan dan Tanggung Jawab',
    paragraphs: [
      'E-Polling ini merupakan sarana partisipasi digital yang diinisiasi oleh warga Dusun Grogol untuk memberikan gambaran terbatas mengenai aspirasi, persepsi, dan kecenderungan pilihan warga terhadap sejumlah tokoh yang dipandang potensial menjadi wakil wilayah di BPD Tahun 2026.',
      'Hasil E-Polling tidak boleh ditafsirkan sebagai hasil pemilihan resmi, mandat seluruh masyarakat, dukungan institusional, atau ukuran mutlak legitimasi kepemimpinan seseorang.',
      'Penyelenggara berkomitmen melaksanakan E-Polling secara netral, transparan, bertanggung jawab, serta tetap menghormati martabat seluruh tokoh dan menjaga persatuan masyarakat Dusun Grogol.'
    ]
  }
];

export async function mountDisclaimerPage(appEl) {
  // Ambil metadata branding dari cache jika sudah ada (instan, tanpa blocking jika gagal)
  let settings = {};
  let polling = null;
  try {
    const bootRes = await apiCall('public.bootstrap');
    if (bootRes.ok && bootRes.data) {
      settings = bootRes.data.settings || {};
      polling = bootRes.data.polling || null;
    }
  } catch { /* tetap render halaman disclaimer */ }

  const contentHtml = `
    <div style="max-width:860px;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
        <span class="badge badge-info">Disclaimer &amp; Ketentuan Resmi</span>
        <a href="#/" class="btn btn-outline btn-sm">&larr; Kembali ke Beranda</a>
      </div>

      <section class="card" style="padding:28px;margin-bottom:20px;border-top:4px solid var(--primary);">
        <div style="text-align:center;padding-bottom:20px;margin-bottom:22px;border-bottom:1px solid var(--border);">
          <h1 style="margin:0 0 6px;font-size:clamp(1.3rem,2.6vw,1.7rem);letter-spacing:0.01em;">
            KETENTUAN DAN PERNYATAAN E-POLLING
          </h1>
          <div style="font-weight:700;color:var(--primary-text);font-size:1.05rem;">
            PEMILIHAN KANDIDAT BPD TAHUN 2026
          </div>
          <div style="color:var(--text-muted);font-size:0.92rem;font-weight:600;margin-top:2px;">
            KETERWAKILAN DUSUN GROGOL
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:18px;">
          ${DISCLAIMER_ITEMS.map((item) => `
            <article style="padding-bottom:16px;border-bottom:1px solid var(--border);">
              <h2 style="margin:0 0 8px;font-size:1.02rem;color:var(--text);display:flex;gap:8px;align-items:baseline;">
                <span style="color:var(--primary);font-weight:800;">${item.num}.</span>
                <span>${item.title}</span>
              </h2>
              ${item.paragraphs.map((p) => `
                <p style="margin:0 0 8px;color:var(--text-muted);text-align:justify;">${p}</p>
              `).join('')}
            </article>
          `).join('')}
        </div>
      </section>

      <section class="card" style="padding:28px;background:#f0fdfa;border-color:#99f6e4;">
        <h2 style="margin:0 0 14px;font-size:1.2rem;color:var(--primary-text);text-align:center;">
          PERNYATAAN PENUTUP
        </h2>
        <p style="margin:0 0 12px;font-weight:600;color:var(--text);text-align:justify;">
          E-Polling Pemilihan Kandidat BPD Tahun 2026 Keterwakilan Dusun Grogol diselenggarakan secara independen oleh warga Dusun Grogol sebagai ruang partisipasi digital untuk menghimpun aspirasi dan mengetahui kecenderungan pilihan masyarakat.
        </p>
        <p style="margin:0 0 12px;color:var(--text-muted);text-align:justify;">
          E-Polling ini bersifat netral, tidak mengikat, dan bukan merupakan bagian dari mekanisme pemilihan resmi anggota BPD. Penyelenggara tidak memiliki kepentingan untuk memenangkan atau menjatuhkan kandidat mana pun.
        </p>
        <p style="margin:0 0 12px;color:var(--text-muted);text-align:justify;">
          Hasil E-Polling tidak dapat dijadikan dasar tunggal untuk menilai kelayakan, kapasitas, legitimasi, maupun peluang terpilihnya seseorang sebagai anggota BPD.
        </p>
        <p style="margin:0 0 16px;color:var(--text-muted);text-align:justify;">
          Setiap warga diharapkan berpartisipasi secara jujur, objektif, dan bertanggung jawab dengan tetap mengedepankan kerukunan, persaudaraan, serta penghormatan terhadap perbedaan pilihan.
        </p>

        <div style="background:var(--primary);color:#fff;padding:14px 18px;border-radius:10px;text-align:center;font-weight:800;letter-spacing:0.02em;margin-bottom:16px;">
          PERBEDAAN PILIHAN BUKAN ALASAN UNTUK MEMUTUS PERSAUDARAAN.
        </div>

        <p style="margin:0 0 20px;color:var(--text-muted);text-align:center;">
          Mari menjaga kebersamaan, menghormati setiap aspirasi, dan mengedepankan kepentingan masyarakat Dusun Grogol.
        </p>

        <div style="text-align:center;padding-top:14px;border-top:1px solid #99f6e4;">
          <div style="font-size:0.82rem;color:var(--text-subtle);font-weight:700;letter-spacing:0.06em;">PENYELENGGARA</div>
          <div style="font-size:1.05rem;font-weight:800;color:var(--primary-text);margin-top:4px;">WARGA DUSUN GROGOL</div>
        </div>

        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:22px;">
          <a href="#/kandidat" class="btn btn-primary">Lihat Daftar Kandidat</a>
          <a href="#/hasil" class="btn btn-outline">Lihat Hasil Polling</a>
        </div>
      </section>
    </div>
  `;

  appEl.innerHTML = renderPublicShell({ activeRoute: '/ketentuan', settings, polling, contentHtml });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
