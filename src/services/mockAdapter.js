/**
 * Local Mock Adapter — 100% mengikuti kontrak API & 7 tabel Google Spreadsheet GAS.
 * Digunakan otomatis saat APP_CONFIG.API_URL belum diisi (untuk demo, uji fungsional,
 * uji keamanan, uji database kosong, dan audit performa di lokal).
 *
 * Catatan: Kredensial demo lokal ONLY untuk mode simulasi browser/test: admin / admin123.
 * Pada produksi GAS, password disimpan salted-hashed di sheet ADMINS dan tidak ada di frontend.
 */

const STORAGE_KEY = 'epolling_bpd_local_db_v1';
const VOTER_SIM_IP_KEY = 'epolling_bpd_sim_ip';

const memStorage = new Map();

function getStorage() {
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: (k) => (memStorage.has(k) ? memStorage.get(k) : null),
    setItem: (k, v) => memStorage.set(k, String(v)),
    removeItem: (k) => memStorage.delete(k)
  };
}

function nowIso() {
  return new Date().toISOString();
}

function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

async function sha256Hex(text) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(String(text));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback deterministik untuk environment tanpa SubtleCrypto
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function createInitialSeed(emptyMode = false) {
  const ts = nowIso();
  const base = {
    SETTINGS: {
      village_name: 'Desa Sukamaju',
      village_logo_url: '',
      voting_instructions: '1. Baca profil, visi, dan misi setiap kandidat BPD dengan saksama.\n2. Klik tombol "Pilih Kandidat" pada kandidat pilihan Anda.\n3. Periksa kembali pilihan pada layar konfirmasi, lalu tekan "Konfirmasi Suara".\n4. Satu jaringan/IP hanya dapat memberikan satu suara pada setiap periode pemilihan.',
      privacy_notice: 'Sistem ini merupakan e-polling publik tanpa login pemilih. Pembatasan suara diterapkan per jaringan/IP per periode pemilihan dan tidak menjamin satu orang satu suara secara mutlak.'
    },
    ADMINS: [
      {
        admin_id: 'adm_demo_01',
        username: 'admin',
        password_plain_sim: 'admin123',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        created_at: ts,
        updated_at: ts
      }
    ],
    POLLING: [],
    CANDIDATES: [],
    VOTE_RESTRICTIONS: [],
    VOTES: [],
    AUDIT_LOGS: []
  };

  if (emptyMode) return base;

  const start = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const end = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const polId = 'pol_bpd_2026';

  base.POLLING.push({
    polling_id: polId,
    title: 'Pemilihan Kandidat BPD Periode 2026–2032',
    village_name: 'Desa Sukamaju',
    description: 'Pemungutan suara publik secara elektronik untuk menjaring aspirasi masyarakat dalam pemilihan calon anggota Badan Permusyawaratan Desa (BPD).',
    start_at: start,
    end_at: end,
    status: 'ACTIVE',
    result_visibility: 'LIVE',
    created_at: ts,
    updated_at: ts
  });

  base.CANDIDATES.push(
    {
      candidate_id: 'cnd_01',
      polling_id: polId,
      candidate_number: 1,
      candidate_name: 'H. Ahmad Suryadi, S.Sos',
      photo_file_id: '',
      photo_url: '',
      profile: 'Tokoh masyarakat Dusun Krajan, mantan Ketua Karang Taruna dan aktif dalam forum musyawarah desa selama 12 tahun.',
      vision: 'Mewujudkan tata kelola pemerintahan desa yang transparan, partisipatif, dan berkeadilan.',
      mission: '1. Mengawal transparansi APBDes.\n2. Membuka forum aspirasi warga rutin setiap bulan.\n3. Mendorong penguatan BUMDes dan UMKM lokal.',
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts
    },
    {
      candidate_id: 'cnd_02',
      polling_id: polId,
      candidate_number: 2,
      candidate_name: 'Hj. Siti Rahmawati, S.Pd',
      photo_file_id: '',
      photo_url: '',
      profile: 'Pendidik dan penggerak PKK Desa Sukamaju dengan fokus pada pemberdayaan perempuan, posyandu, dan pendidikan anak desa.',
      vision: 'Desa Sukamaju yang sehat, cerdas, inklusif, dan berdaya saing.',
      mission: '1. Memperkuat program kesehatan ibu & anak.\n2. Mengadvokasi anggaran pendidikan & literasi desa.\n3. Mengembangkan ekonomi kreatif keluarga.',
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts
    },
    {
      candidate_id: 'cnd_03',
      polling_id: polId,
      candidate_number: 3,
      candidate_name: 'Budi Santoso, S.T',
      photo_file_id: '',
      photo_url: '',
      profile: 'Praktisi infrastruktur pedesaan dan penggiat pertanian berkelanjutan di Dusun Mekarsari.',
      vision: 'Pembangunan infrastruktur desa merata dan pertanian modern berbasis teknologi.',
      mission: '1. Memastikan kualitas pembangunan jalan & irigasi desa.\n2. Mendukung digitalisasi layanan administrasi desa.\n3. Mendorong program ketahanan pangan desa.',
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts
    }
  );

  base.AUDIT_LOGS.push({
    log_id: genId('log'),
    admin_id: 'adm_demo_01',
    action: 'POLLING_CREATED',
    target_type: 'POLLING',
    target_id: polId,
    description: 'Inisialisasi data demo Pemilihan BPD Periode 2026–2032.',
    created_at: ts
  });

  return base;
}

function loadDb() {
  const st = getStorage();
  const raw = st.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch { /* re-seed */ }
  }
  const seed = createInitialSeed(false);
  st.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveDb(db) {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetLocalMockDb({ empty = false } = {}) {
  const db = createInitialSeed(empty);
  saveDb(db);
  return db;
}

export function setSimulatedClientIp(ip) {
  getStorage().setItem(VOTER_SIM_IP_KEY, ip);
}

function getSimulatedClientIp() {
  return getStorage().getItem(VOTER_SIM_IP_KEY) || '203.0.113.10';
}

function evaluatePollingWindow(polling) {
  if (!polling) return { canVote: false, reasonCode: 'NO_POLLING', message: 'Belum ada periode polling yang tersedia.' };
  const now = Date.now();
  const startMs = polling.start_at ? new Date(polling.start_at).getTime() : 0;
  const endMs = polling.end_at ? new Date(polling.end_at).getTime() : 0;

  if (polling.status === 'DRAFT') return { canVote: false, reasonCode: 'POLLING_NOT_STARTED', message: 'Polling belum dibuka.' };
  if (polling.status === 'CLOSED') return { canVote: false, reasonCode: 'POLLING_CLOSED', message: 'Polling telah ditutup oleh administrator.' };
  if (polling.status === 'COMPLETED' || (endMs && now > endMs)) return { canVote: false, reasonCode: 'POLLING_ENDED', message: 'Periode polling sudah berakhir.' };
  if (polling.status === 'SCHEDULED' || (startMs && now < startMs)) return { canVote: false, reasonCode: 'POLLING_NOT_STARTED', message: 'Polling belum dimulai.' };
  if (polling.status !== 'ACTIVE') return { canVote: false, reasonCode: 'POLLING_INACTIVE', message: 'Polling saat ini tidak aktif.' };
  return { canVote: true, reasonCode: 'ACTIVE', message: 'Polling sedang berlangsung.' };
}

function getPrimaryPublicPolling(db) {
  if (!db.POLLING.length) return null;
  const active = db.POLLING.find((p) => p.status === 'ACTIVE');
  if (active) return active;
  const scheduled = db.POLLING.find((p) => p.status === 'SCHEDULED');
  if (scheduled) return scheduled;
  const nonDraft = db.POLLING.filter((p) => p.status !== 'DRAFT').sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return nonDraft[0] || null;
}

function computeTally(db, pollingId) {
  const cands = db.CANDIDATES.filter((c) => c.polling_id === pollingId);
  const votes = db.VOTES.filter((v) => v.polling_id === pollingId);
  const counts = {};
  let totalValid = 0;
  let totalVoided = 0;

  for (const v of votes) {
    if (v.status === 'VALID') {
      totalValid++;
      counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
    } else {
      totalVoided++;
    }
  }

  const list = cands
    .filter((c) => c.status !== 'ARCHIVED' || counts[c.candidate_id] > 0)
    .map((c) => {
      const vc = counts[c.candidate_id] || 0;
      return {
        candidate_id: c.candidate_id,
        candidate_number: Number(c.candidate_number),
        candidate_name: c.status === 'ARCHIVED' ? `${c.candidate_name} (Diarsipkan)` : c.candidate_name,
        photo_url: c.photo_url || '',
        status: c.status,
        votes: vc,
        percentage: totalValid > 0 ? Number(((vc / totalValid) * 100).toFixed(2)) : 0
      };
    })
    .sort((a, b) => a.candidate_number - b.candidate_number);

  return {
    total_votes_recorded: votes.length,
    total_valid_votes: totalValid,
    total_voided_votes: totalVoided,
    candidates: list
  };
}

function addAudit(db, adminId, action, targetType, targetId, description) {
  db.AUDIT_LOGS.unshift({
    log_id: genId('log'),
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    description,
    created_at: nowIso()
  });
}

function requireAdmin(db, token) {
  if (!token || !token.startsWith('mock_tok_')) {
    throw { code: 'UNAUTHORIZED', message: 'Sesi tidak valid. Silakan login kembali.' };
  }
  const adminId = token.replace('mock_tok_', '');
  const admin = db.ADMINS.find((a) => a.admin_id === adminId && a.status === 'ACTIVE');
  if (!admin) throw { code: 'FORBIDDEN', message: 'Akses administrator ditolak.' };
  return admin;
}

// Simulasi script lock untuk menguji konkurensi paralel
let lockChain = Promise.resolve();
function withLock(fn) {
  const next = lockChain.then(fn, fn);
  lockChain = next.catch(() => {});
  return next;
}

export async function executeMockAction(action, payload = {}, token = '', options = {}) {
  const start = performance.now();
  const clientIp = options.overrideIp || getSimulatedClientIp();

  const run = async () => {
    const db = loadDb();

    if (action === 'public.bootstrap') {
      const polling = getPrimaryPublicPolling(db);
      const windowStatus = evaluatePollingWindow(polling);
      const candidates = polling
        ? db.CANDIDATES.filter((c) => c.polling_id === polling.polling_id && c.status === 'ACTIVE')
            .sort((a, b) => a.candidate_number - b.candidate_number)
        : [];
      let alreadyVoted = false;
      if (polling) {
        const voterHash = await sha256Hex(`${clientIp}|LOCAL_SECRET|${polling.polling_id}`);
        alreadyVoted = db.VOTE_RESTRICTIONS.some(
          (r) => r.polling_id === polling.polling_id && r.voter_key_hash === voterHash && r.status === 'COMMITTED'
        );
      }
      return {
        settings: db.SETTINGS,
        polling,
        windowStatus,
        candidates,
        alreadyVoted,
        ipVerificationMode: 'SIMULATED_PROXY'
      };
    }

    if (action === 'public.vote') {
      return withLock(async () => {
        const freshDb = loadDb();
        const { polling_id, candidate_id, transaction_id } = payload;
        if (!polling_id || !candidate_id || !transaction_id) {
          throw { code: 'VALIDATION_ERROR', message: 'Data pemungutan suara tidak lengkap.' };
        }
        const polling = freshDb.POLLING.find((p) => p.polling_id === polling_id);
        const win = evaluatePollingWindow(polling);
        if (!win.canVote) throw { code: win.reasonCode, message: win.message };

        const cand = freshDb.CANDIDATES.find(
          (c) => c.candidate_id === candidate_id && c.polling_id === polling_id && c.status === 'ACTIVE'
        );
        if (!cand) throw { code: 'INVALID_CANDIDATE', message: 'Kandidat tidak ditemukan atau tidak aktif.' };

        // Idempotency check
        const dupTx = freshDb.VOTES.find((v) => v.transaction_id === transaction_id && v.polling_id === polling_id);
        if (dupTx) {
          return { recorded: true, idempotentReplay: true, message: 'Suara Anda sudah berhasil direkam sebelumnya.' };
        }

        const voterHash = await sha256Hex(`${clientIp}|LOCAL_SECRET|${polling_id}`);
        const dupVoter = freshDb.VOTE_RESTRICTIONS.find(
          (r) => r.polling_id === polling_id && r.voter_key_hash === voterHash && r.status === 'COMMITTED'
        );
        if (dupVoter) {
          throw { code: 'ALREADY_VOTED', message: 'Anda sudah memberikan suara pada periode pemilihan ini.' };
        }

        const ts = nowIso();
        // Terpisah total: VOTE_RESTRICTIONS tanpa candidate_id; VOTES tanpa voter_key_hash
        freshDb.VOTE_RESTRICTIONS.push({
          restriction_id: genId('rst'),
          polling_id,
          voter_key_hash: voterHash,
          created_at: ts,
          status: 'COMMITTED'
        });

        freshDb.VOTES.push({
          vote_id: genId('vot'),
          polling_id,
          candidate_id,
          transaction_id,
          created_at: ts,
          status: 'VALID'
        });

        saveDb(freshDb);
        return { recorded: true, idempotentReplay: false, message: 'Terima kasih! Suara Anda berhasil direkam.' };
      });
    }

    if (action === 'public.results') {
      const polling = payload.polling_id
        ? db.POLLING.find((p) => p.polling_id === payload.polling_id)
        : getPrimaryPublicPolling(db);
      if (!polling) return { visible: false, reason: 'NO_POLLING', message: 'Belum ada periode polling.', polling: null, tally: null };
      const isEnded = polling.status === 'COMPLETED' || polling.status === 'CLOSED' || Date.now() > new Date(polling.end_at).getTime();
      if (polling.result_visibility === 'HIDDEN') {
        return { visible: false, reason: 'HIDDEN', message: 'Hasil polling disembunyikan oleh panitia.', polling, tally: null };
      }
      if (polling.result_visibility === 'AFTER_END' && !isEnded) {
        return { visible: false, reason: 'AFTER_END', message: 'Hasil polling akan dipublikasikan setelah masa pemilihan berakhir.', polling, tally: null };
      }
      return { visible: true, polling, tally: computeTally(db, polling.polling_id) };
    }

    if (action === 'admin.login') {
      const username = String(payload.username || '').trim();
      const password = String(payload.password || '');
      const found = db.ADMINS.find(
        (a) => a.username.toLowerCase() === username.toLowerCase() && a.status === 'ACTIVE' && a.password_plain_sim === password
      );
      if (!found) throw { code: 'INVALID_CREDENTIALS', message: 'Username atau password salah.' };
      addAudit(db, found.admin_id, 'ADMIN_LOGIN', 'ADMIN', found.admin_id, 'Administrator berhasil login.');
      saveDb(db);
      return {
        token: `mock_tok_${found.admin_id}`,
        admin: { admin_id: found.admin_id, username: found.username, role: found.role }
      };
    }

    // Semua endpoint admin.* wajib autentikasi
    const admin = requireAdmin(db, token);

    if (action === 'admin.logout') {
      addAudit(db, admin.admin_id, 'ADMIN_LOGOUT', 'ADMIN', admin.admin_id, 'Administrator logout.');
      saveDb(db);
      return { loggedOut: true };
    }

    if (action === 'admin.dashboard') {
      const pollings = [...db.POLLING].sort((a, b) => b.created_at.localeCompare(a.created_at));
      let selected = payload.polling_id ? pollings.find((p) => p.polling_id === payload.polling_id) : null;
      if (!selected) selected = pollings.find((p) => p.status === 'ACTIVE') || pollings[0] || null;
      const tally = selected ? computeTally(db, selected.polling_id) : { total_votes_recorded: 0, total_valid_votes: 0, total_voided_votes: 0, candidates: [] };
      const uniqueVoterKeys = selected
        ? db.VOTE_RESTRICTIONS.filter((r) => r.polling_id === selected.polling_id && r.status === 'COMMITTED').length
        : 0;
      return {
        pollings,
        selectedPolling: selected,
        kpis: {
          totalCandidates: tally.candidates.length,
          totalVotesRecorded: tally.total_votes_recorded,
          totalValidVotes: tally.total_valid_votes,
          uniqueVoterKeys
        },
        candidateStats: tally.candidates,
        recentActivities: db.AUDIT_LOGS.slice(0, 8)
      };
    }

    if (action === 'admin.pollings.list') {
      return [...db.POLLING].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    if (action === 'admin.pollings.save') {
      const title = String(payload.title || '').trim();
      const village_name = String(payload.village_name || '').trim();
      if (!title || !village_name) throw { code: 'VALIDATION_ERROR', message: 'Judul polling dan nama desa wajib diisi.' };
      if (!payload.start_at || !payload.end_at || new Date(payload.start_at) >= new Date(payload.end_at)) {
        throw { code: 'VALIDATION_ERROR', message: 'Waktu berakhir harus lebih besar dari waktu mulai.' };
      }
      const status = String(payload.status || 'DRAFT').toUpperCase();
      if (status === 'ACTIVE' && db.POLLING.some((p) => p.status === 'ACTIVE' && p.polling_id !== payload.polling_id)) {
        throw { code: 'CONFLICT', message: 'Sudah ada polling lain yang berstatus ACTIVE.' };
      }
      const ts = nowIso();
      if (payload.polling_id) {
        const idx = db.POLLING.findIndex((p) => p.polling_id === payload.polling_id);
        if (idx === -1) throw { code: 'NOT_FOUND', message: 'Polling tidak ditemukan.' };
        db.POLLING[idx] = {
          ...db.POLLING[idx],
          title,
          village_name,
          description: String(payload.description || '').trim(),
          start_at: new Date(payload.start_at).toISOString(),
          end_at: new Date(payload.end_at).toISOString(),
          status,
          result_visibility: String(payload.result_visibility || 'AFTER_END').toUpperCase(),
          updated_at: ts
        };
        addAudit(db, admin.admin_id, 'POLLING_UPDATED', 'POLLING', payload.polling_id, `Memperbarui polling: ${title}`);
        saveDb(db);
        return db.POLLING[idx];
      }
      const rec = {
        polling_id: genId('pol'),
        title,
        village_name,
        description: String(payload.description || '').trim(),
        start_at: new Date(payload.start_at).toISOString(),
        end_at: new Date(payload.end_at).toISOString(),
        status,
        result_visibility: String(payload.result_visibility || 'AFTER_END').toUpperCase(),
        created_at: ts,
        updated_at: ts
      };
      db.POLLING.unshift(rec);
      addAudit(db, admin.admin_id, 'POLLING_CREATED', 'POLLING', rec.polling_id, `Membuat polling baru: ${title}`);
      saveDb(db);
      return rec;
    }

    if (action === 'admin.pollings.setStatus') {
      const idx = db.POLLING.findIndex((p) => p.polling_id === payload.polling_id);
      if (idx === -1) throw { code: 'NOT_FOUND', message: 'Polling tidak ditemukan.' };
      const status = String(payload.status || '').toUpperCase();
      if (status === 'ACTIVE' && db.POLLING.some((p) => p.status === 'ACTIVE' && p.polling_id !== payload.polling_id)) {
        throw { code: 'CONFLICT', message: 'Sudah ada polling lain yang berstatus ACTIVE.' };
      }
      db.POLLING[idx].status = status;
      db.POLLING[idx].updated_at = nowIso();
      addAudit(db, admin.admin_id, status === 'ACTIVE' ? 'POLLING_OPENED' : 'POLLING_CLOSED', 'POLLING', payload.polling_id, `Mengubah status polling menjadi ${status}`);
      saveDb(db);
      return db.POLLING[idx];
    }

    if (action === 'admin.candidates.list') {
      return db.CANDIDATES
        .filter((c) => (!payload.polling_id || c.polling_id === payload.polling_id))
        .sort((a, b) => a.candidate_number - b.candidate_number);
    }

    if (action === 'admin.candidates.save') {
      const polling_id = String(payload.polling_id || '').trim();
      const candidate_number = Number(payload.candidate_number);
      const candidate_name = String(payload.candidate_name || '').trim();
      if (!polling_id) throw { code: 'VALIDATION_ERROR', message: 'Periode polling wajib dipilih.' };
      if (!candidate_number || candidate_number < 1) throw { code: 'VALIDATION_ERROR', message: 'Nomor urut tidak valid.' };
      if (candidate_name.length < 2) throw { code: 'VALIDATION_ERROR', message: 'Nama kandidat wajib diisi.' };

      const dup = db.CANDIDATES.find(
        (c) =>
          c.polling_id === polling_id &&
          c.status !== 'ARCHIVED' &&
          Number(c.candidate_number) === candidate_number &&
          c.candidate_id !== payload.candidate_id
      );
      if (dup) throw { code: 'DUPLICATE_NUMBER', message: `Nomor urut ${candidate_number} sudah digunakan pada periode ini.` };

      const ts = nowIso();
      if (payload.candidate_id) {
        const idx = db.CANDIDATES.findIndex((c) => c.candidate_id === payload.candidate_id);
        if (idx === -1) throw { code: 'NOT_FOUND', message: 'Kandidat tidak ditemukan.' };
        db.CANDIDATES[idx] = {
          ...db.CANDIDATES[idx],
          candidate_number,
          candidate_name,
          photo_file_id: payload.photo_file_id ?? db.CANDIDATES[idx].photo_file_id,
          photo_url: payload.photo_file_id || db.CANDIDATES[idx].photo_url,
          profile: String(payload.profile || '').trim(),
          vision: String(payload.vision || '').trim(),
          mission: String(payload.mission || '').trim(),
          status: String(payload.status || 'ACTIVE').toUpperCase(),
          updated_at: ts
        };
        addAudit(db, admin.admin_id, 'CANDIDATE_UPDATED', 'CANDIDATE', payload.candidate_id, `Memperbarui kandidat #${candidate_number} ${candidate_name}`);
        saveDb(db);
        return db.CANDIDATES[idx];
      }

      const rec = {
        candidate_id: genId('cnd'),
        polling_id,
        candidate_number,
        candidate_name,
        photo_file_id: payload.photo_file_id || '',
        photo_url: payload.photo_file_id || '',
        profile: String(payload.profile || '').trim(),
        vision: String(payload.vision || '').trim(),
        mission: String(payload.mission || '').trim(),
        status: String(payload.status || 'ACTIVE').toUpperCase(),
        created_at: ts,
        updated_at: ts
      };
      db.CANDIDATES.push(rec);
      addAudit(db, admin.admin_id, 'CANDIDATE_CREATED', 'CANDIDATE', rec.candidate_id, `Menambah kandidat #${candidate_number} ${candidate_name}`);
      saveDb(db);
      return rec;
    }

    if (action === 'admin.candidates.archive') {
      const idx = db.CANDIDATES.findIndex((c) => c.candidate_id === payload.candidate_id);
      if (idx === -1) throw { code: 'NOT_FOUND', message: 'Kandidat tidak ditemukan.' };
      db.CANDIDATES[idx].status = 'ARCHIVED';
      db.CANDIDATES[idx].updated_at = nowIso();
      addAudit(db, admin.admin_id, 'CANDIDATE_ARCHIVED', 'CANDIDATE', payload.candidate_id, `Mengarsipkan kandidat ${db.CANDIDATES[idx].candidate_name}`);
      saveDb(db);
      return db.CANDIDATES[idx];
    }

    if (action === 'admin.candidates.uploadPhoto') {
      const { mimeType, base64Data } = payload;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(mimeType).toLowerCase())) {
        throw { code: 'VALIDATION_ERROR', message: 'Format foto harus JPG, PNG, atau WEBP.' };
      }
      if (!base64Data) throw { code: 'VALIDATION_ERROR', message: 'Data foto kosong.' };
      return { photo_file_id: base64Data, photo_url: base64Data };
    }

    if (action === 'admin.votes.summary') {
      const pollingId = payload.polling_id || (getPrimaryPublicPolling(db)?.polling_id || '');
      if (!pollingId) {
        return { polling_id: '', tally: { total_votes_recorded: 0, total_valid_votes: 0, total_voided_votes: 0, candidates: [] }, restrictionsStats: { committed: 0, rollback: 0 }, transactions: [] };
      }
      const tally = computeTally(db, pollingId);
      const transactions = db.VOTES
        .filter((v) => v.polling_id === pollingId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 100)
        .map((v) => ({ vote_id: v.vote_id, transaction_id: v.transaction_id, created_at: v.created_at, status: v.status }));
      const rst = db.VOTE_RESTRICTIONS.filter((r) => r.polling_id === pollingId);
      return {
        polling_id: pollingId,
        tally,
        restrictionsStats: {
          committed: rst.filter((r) => r.status === 'COMMITTED').length,
          rollback: rst.filter((r) => r.status !== 'COMMITTED').length
        },
        transactions
      };
    }

    if (action === 'admin.votes.void') {
      const reason = String(payload.reason || '').trim();
      if (reason.length < 5) throw { code: 'VALIDATION_ERROR', message: 'Alasan koreksi minimal 5 karakter.' };
      const idx = db.VOTES.findIndex((v) => v.vote_id === payload.vote_id);
      if (idx === -1) throw { code: 'NOT_FOUND', message: 'Data suara tidak ditemukan.' };
      if (db.VOTES[idx].status === 'VOIDED') throw { code: 'CONFLICT', message: 'Suara sudah berstatus VOIDED.' };
      db.VOTES[idx].status = 'VOIDED';
      addAudit(db, admin.admin_id, 'VOTE_VOIDED', 'VOTE', payload.vote_id, `Koreksi suara menjadi VOIDED. Alasan: ${reason}`);
      saveDb(db);
      return { vote_id: payload.vote_id, status: 'VOIDED' };
    }

    if (action === 'admin.votes.verifyIntegrity') {
      const pollingId = payload.polling_id;
      const votes = db.VOTES.filter((v) => v.polling_id === pollingId);
      const restrictions = db.VOTE_RESTRICTIONS.filter((r) => r.polling_id === pollingId && r.status === 'COMMITTED');
      const txSet = new Set(votes.map((v) => v.transaction_id));
      const voterSet = new Set(restrictions.map((r) => r.voter_key_hash));
      const duplicateTransactions = votes.length - txSet.size;
      const duplicateVoterKeys = restrictions.length - voterSet.size;
      return {
        polling_id: pollingId,
        consistent: votes.length === restrictions.length && duplicateTransactions === 0 && duplicateVoterKeys === 0,
        totalVotesRows: votes.length,
        totalCommittedRestrictions: restrictions.length,
        duplicateTransactions,
        duplicateVoterKeys,
        checkedAt: nowIso()
      };
    }

    if (action === 'admin.reports.get') {
      const polling = db.POLLING.find((p) => p.polling_id === payload.polling_id) || db.POLLING[0];
      if (!polling) throw { code: 'NOT_FOUND', message: 'Belum ada periode polling untuk dibuat laporan.' };
      return {
        generated_at: nowIso(),
        village_name: polling.village_name || db.SETTINGS.village_name,
        polling,
        tally: computeTally(db, polling.polling_id)
      };
    }

    if (action === 'admin.auditLogs.list') {
      const page = Math.max(1, Number(payload.page || 1));
      const limit = Math.min(100, Math.max(5, Number(payload.limit || 25)));
      let list = [...db.AUDIT_LOGS];
      if (payload.action) list = list.filter((l) => l.action === payload.action);
      const startIdx = (page - 1) * limit;
      return {
        items: list.slice(startIdx, startIdx + limit),
        pagination: { page, limit, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / limit)) }
      };
    }

    if (action === 'admin.settings.get') {
      return { ...db.SETTINGS };
    }

    if (action === 'admin.settings.save') {
      const allowed = ['village_name', 'village_logo_url', 'voting_instructions', 'privacy_notice'];
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(payload, k)) {
          db.SETTINGS[k] = String(payload[k] || '').trim();
        }
      }
      addAudit(db, admin.admin_id, 'SETTINGS_UPDATED', 'SETTINGS', 'GLOBAL', 'Pengaturan aplikasi diperbarui.');
      saveDb(db);
      return { ...db.SETTINGS };
    }

    throw { code: 'UNKNOWN_ACTION', message: `Action tidak dikenali: ${action}` };
  };

  try {
    const data = await run();
    return {
      ok: true,
      code: 'SUCCESS',
      message: 'OK',
      data,
      meta: { ts: nowIso(), cached: false, execMs: Math.round((performance.now() - start) * 100) / 100 }
    };
  } catch (err) {
    return {
      ok: false,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Terjadi kesalahan.',
      data: null,
      meta: { ts: nowIso(), execMs: Math.round((performance.now() - start) * 100) / 100 }
    };
  }
}
