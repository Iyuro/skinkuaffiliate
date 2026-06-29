// ============ STATE ============
// Semua variabel global aplikasi disimpan di sini supaya mudah dilacak.
let otpToken = null;
let resendInterval = null;
let authToken = localStorage.getItem('aa_auth');
let allData = [], loadedFiles = [], currentTab = 'all', aiMode = 'analyst', chatHistory = [];
// rawRows: semua creator_rows mentah dari semua file (BELUM di-merge), dipakai buat grafik trend.
// Tiap item: {file_id, name, gmv, sampel_diminta, sampel_terkirim, video_sampel, ..., uploaded_at}
let rawRows = [];
let exclusiveData = [];
let efTags = [];
let pages = { kreator: 1, perform: 1, ghost: 1, rekomen: 1 };
const PAGE_SIZE = 20, DASH_SIZE = 5;
let settings = { apiKey: localStorage.getItem('aa_apikey') || '', model: 'gpt-4o-mini', roiPerform: 3, gmvOrganic: 100000 };
let isSyncing = false; // true selagi fetch/sync ke Supabase berlangsung, dipakai buat nampilin indikator loading
