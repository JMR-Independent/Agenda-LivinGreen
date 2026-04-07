// ── State ──────────────────────────────────────────────────────────────────
let _history = [];
let _busy = false;
let _geminiModel = localStorage.getItem('rize_gemini_model') || null;
let _thinkingEl = null;

// ── Memory System v2: IndexedDB + Embeddings + RAG ─────────────────────────
const _MEM_DB = 'RizeChatDB';
const _MEM_DB_VER = 1;
let _memDB = null;
let _SESSION_ID = 'S' + Date.now().toString(36);
let _semanticCtx = '';
let _inactivityTimer = null;
const _INACTIVITY_MS = 10 * 60 * 1000;

function _openMemDB() {
  return new Promise(resolve => {
    if (_memDB) { resolve(_memDB); return; }
    const req = indexedDB.open(_MEM_DB, _MEM_DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('history')) {
        const hs = db.createObjectStore('history', {keyPath: 'id', autoIncrement: true});
        hs.createIndex('ts', 'ts', {unique: false});
      }
      if (!db.objectStoreNames.contains('embeddings')) {
        const es = db.createObjectStore('embeddings', {keyPath: 'id'});
        es.createIndex('ts', 'ts', {unique: false});
      }
    };
    req.onsuccess = e => { _memDB = e.target.result; resolve(_memDB); };
    req.onerror = () => resolve(null);
  });
}

async function _saveHistoryMsg(role, content) {
  try {
    const db = await _openMemDB(); if (!db) return;
    await new Promise((res, rej) => {
      const tx = db.transaction('history', 'readwrite');
      tx.objectStore('history').add({session: _SESSION_ID, role, content: String(content).slice(0, 4000), ts: Date.now()});
      tx.oncomplete = res; tx.onerror = rej;
    });
  } catch {}
}

async function _loadHistory(n = 20) {
  try {
    const db = await _openMemDB(); if (!db) return [];
    return await new Promise(resolve => {
      const tx = db.transaction('history', 'readonly');
      const req = tx.objectStore('history').index('ts').openCursor(null, 'prev');
      const rows = [];
      req.onsuccess = e => {
        const cur = e.target.result;
        if (cur && rows.length < n) { rows.push(cur.value); cur.continue(); }
        else resolve(rows.reverse());
      };
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

async function _restoreHistory() {
  const msgs = await _loadHistory(20);
  if (!msgs.length) return;
  const wrap = document.getElementById('messages');
  const es = document.getElementById('empty-state');
  if (es) es.remove();
  _ensureSpacer();
  for (const m of msgs) {
    _history.push({role: m.role, content: m.content});
    if (m.role === 'user') {
      const row = document.createElement('div');
      row.className = 'ai-msg user';
      const bub = document.createElement('div');
      bub.className = 'bubble-user';
      bub.textContent = m.content;
      row.appendChild(bub); wrap.appendChild(row);
    } else if (m.role === 'assistant') {
      const row = document.createElement('div');
      row.className = 'ai-msg';
      row.innerHTML = `<div class="msg-av"><img src="./images/agenda-logo.jpg" onerror="this.style.display='none'"></div><div class="bubble-ai">${_renderMd(m.content)}</div>`;
      wrap.appendChild(row);
    }
  }
  wrap.scrollTop = wrap.scrollHeight;
}

let _embeddingsDisabled = false;
async function _embed(text) {
  if (_embeddingsDisabled) return null;
  const key = localStorage.getItem('rize_gemini_key'); if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`,
      {method: 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({model: 'models/text-embedding-004', content: {parts: [{text: text.slice(0, 2000)}]}})}
    );
    if (!res.ok) { _embeddingsDisabled = true; return null; }
    const d = await res.json();
    return d.embedding?.values || null;
  } catch { return null; }
}

function _cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

async function _saveEmbedding(userText, aiText) {
  try {
    const db = await _openMemDB(); if (!db) return;
    const combined = `Usuario: ${userText}\nAsistente: ${aiText}`;
    const vector = await _embed(combined); if (!vector) return;
    await new Promise((res, rej) => {
      const tx = db.transaction('embeddings', 'readwrite');
      tx.objectStore('embeddings').put({
        id: _SESSION_ID + '_' + Date.now(), session: _SESSION_ID,
        text: combined.slice(0, 1000), vector, ts: Date.now()
      });
      tx.oncomplete = res; tx.onerror = rej;
    });
  } catch {}
}

async function _semanticSearch(query, topK = 3) {
  try {
    const db = await _openMemDB(); if (!db) return '';
    const qVec = await _embed(query); if (!qVec) return '';
    const rows = await new Promise(resolve => {
      const tx = db.transaction('embeddings', 'readonly');
      const req = tx.objectStore('embeddings').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    const scored = rows
      .filter(r => r.session !== _SESSION_ID)
      .map(r => ({text: r.text, score: _cosineSim(qVec, r.vector)}))
      .filter(r => r.score > 0.75)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored.map(r => `• ${r.text.slice(0, 300)}`).join('\n');
  } catch { return ''; }
}

function _getSessionSummaries() {
  try { return JSON.parse(localStorage.getItem('rize_session_summaries') || '[]'); } catch { return []; }
}
function _saveSessionSummaries(arr) {
  localStorage.setItem('rize_session_summaries', JSON.stringify(arr.slice(-10)));
}

async function _summarizeSession() {
  if (_history.length < 4) return;
  const key = localStorage.getItem('rize_gemini_key'); if (!key) return;
  const model = localStorage.getItem('rize_gemini_model') || 'gemini-2.0-flash';
  const snippet = _history.slice(-16).map(m => `${m.role==='user'?'U':'A'}: ${String(m.content).slice(0, 200)}`).join('\n');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {method: 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({
         contents: [{role: 'user', parts: [{text: `Resume en 3-5 puntos clave lo más importante de esta conversación (decisiones, datos de clientes, tareas). Máx 200 palabras. Solo el resumen, sin intro:\n\n${snippet}`}]}],
         generationConfig: {temperature: 0.2, maxOutputTokens: 300}
       })}
    );
    if (!res.ok) return;
    const d = await res.json();
    const summary = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!summary) return;
    const sums = _getSessionSummaries();
    sums.push({id: _SESSION_ID, ts: Date.now(), summary});
    _saveSessionSummaries(sums);
  } catch {}
}

function _resetInactivityTimer() {
  if (_inactivityTimer) clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => _summarizeSession(), _INACTIVITY_MS);
}

async function _autoExtractFacts() {
  const key = localStorage.getItem('rize_gemini_key'); if (!key) return;
  const model = localStorage.getItem('rize_gemini_model') || 'gemini-2.0-flash';
  const snippet = _history.slice(-10).map(m => `${m.role==='user'?'U':'A'}: ${String(m.content).slice(0, 300)}`).join('\n');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {method: 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({
         contents: [{role: 'user', parts: [{text: `Extrae hechos importantes de esta conversación que valga la pena recordar: preferencias del usuario, datos de clientes, decisiones de negocio. Devuelve JSON array: [{"type":"preference|client_info|business_note|general","content":"..."}]. Si no hay nada relevante devuelve []. Solo el JSON, sin markdown:\n\n${snippet}`}]}],
         generationConfig: {temperature: 0.1, maxOutputTokens: 500}
       })}
    );
    if (!res.ok) return;
    const d = await res.json();
    let raw = (d.candidates?.[0]?.content?.parts?.[0]?.text || '[]').trim().replace(/```json\n?/g,'').replace(/```\n?/g,'');
    const facts = JSON.parse(raw);
    if (!Array.isArray(facts) || !facts.length) return;
    const mem = _getAIMem();
    for (const f of facts) {
      if (!f.content || mem.notes.some(n => n.content === f.content)) continue;
      mem.notes.push({content: f.content, category: f.type || 'general', date: new Date().toISOString().slice(0, 10), auto: true});
    }
    if (mem.notes.length > 60) mem.notes = mem.notes.slice(-60);
    _saveAIMem(mem);
  } catch {}
}
// ── End Memory System v2 ───────────────────────────────────────────────────

// ── Supabase — misma URL/key que la app principal ──────────────────────────
const _SB_URL = 'https://stodvmbmvtxljfsdzghc.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0b2R2bWJtdnR4bGpmc2R6Z2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyMTYsImV4cCI6MjA3Mjg1OTIxNn0.7y3RPDV_xYFzXSTUM7oCt_WgSSRLm2HoGsCq5-5Jm5M';
let _sb = null;
let _sbReady = false;          // true cuando ya hubo al menos 1 fetch exitoso
let _sbSyncPromise = null;     // promesa en vuelo para evitar doble fetch

function _getSB() {
  if (!_sb) {
    try { _sb = window.supabase.createClient(_SB_URL, _SB_KEY); } catch(e) {}
  }
  return _sb;
}

// ── Actualizar subtítulo del header ───────────────────────────────────────
function _updateSubtitle(text) {
  const el = document.getElementById('header-sub');
  if (el) el.textContent = text;
}

// ── Agent config — cargado desde Supabase, nunca hardcodeado ───────────────
let _agentConfig = null;
let _agentConfigPromise = null;

async function _loadAgentConfig() {
  if (_agentConfig) return _agentConfig;
  if (_agentConfigPromise) return _agentConfigPromise;
  _agentConfigPromise = (async () => {
    const sb = _getSB();
    if (!sb) return null;
    try {
      const { data, error } = await sb
        .from('agent_config')
        .select('*')
        .eq('business_id', 'default')
        .single();
      if (error || !data) return null;
      _agentConfig = data;
      return data;
    } catch { return null; }
  })();
  return _agentConfigPromise;
}

function _getCfg() { return _agentConfig || {}; }

// ── Sync desde Supabase (fuente de verdad real, accesible desde cualquier contexto) ──
async function _syncFromSupabase(showFeedback=false) {
  if (_sbSyncPromise) return _sbSyncPromise;
  _sbSyncPromise = (async () => {
    const sb = _getSB();
    if (!sb) { _updateSubtitle('⚠️ Supabase no cargó'); _sbSyncPromise=null; return; }
    _updateSubtitle('Sincronizando…');
    try {
      const { data: apts, error } = await sb
        .from('appointments')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw new Error(error.message || JSON.stringify(error));
      // Merge: Supabase es la fuente de verdad; enriquece con campos locales si existen
      let local = [];
      try { local = JSON.parse(localStorage.getItem('appointments') || '[]'); } catch {}
      const localMap = new Map(local.map(a => [a.id || String(a.timestamp), a]));
      const merged = apts.map(a => ({
        // campos locales primero (nombre alternativo, notas, etc.)
        ...( localMap.get(a.id) || localMap.get(String(a.timestamp)) || {} ),
        // luego Supabase sobreescribe (es la fuente de verdad)
        ...a,
        // normalizar nombres de campo para que todos los filtros funcionen
        clientName: a.name || a.clientName || a.cliente || '',
        service:    a.job  || a.service   || a.servicio || '',
      }));
      localStorage.setItem('appointments', JSON.stringify(merged));
      _sbReady = true;
      const count = merged.length;
      _updateSubtitle(`${count} citas cargadas`);
      if (showFeedback) showToast(`✓ ${count} citas actualizadas`);
    } catch (e) {
      _updateSubtitle('⚠️ Error: ' + e.message.slice(0, 40));
      console.error('syncFromSupabase:', e);
    }
    _sbSyncPromise = null;
  })();
  return _sbSyncPromise;
}

// ── Asegurar que el sync completó antes de responder al usuario ────────────
async function _ensureSynced() {
  if (_sbReady) return;
  await _syncFromSupabase();
}

// ── Guardar/eliminar en Supabase (mismo schema que la app principal) ───────
async function _saveAptToSupabase(apt) {
  const sb = _getSB(); if (!sb) return;
  try {
    const d = {
      name:      apt.clientName || apt.name || apt.cliente || '',
      date:      apt.date  || apt.fecha || '',
      time:      apt.time  || apt.hora  || '',
      job:       apt.service || apt.job || apt.servicio || '',
      price:     parseFloat(apt.price || apt.precio || 0) || 0,
      city:      apt.city || '',
      address:   apt.address || '',
      timestamp: apt.timestamp || Date.now(),
    };
    if (apt.id && !String(apt.id).startsWith('ai_')) d.id = apt.id;
    await sb.from('appointments').upsert([d], { onConflict: 'id' });
  } catch(e) { console.warn('saveAptToSupabase:', e); }
}
async function _deleteAptFromSupabase(apt) {
  const sb = _getSB(); if (!sb) return;
  try {
    if (apt.id && !String(apt.id).startsWith('ai_'))
      await sb.from('appointments').delete().eq('id', apt.id);
    else if (apt.timestamp)
      await sb.from('appointments').delete().eq('timestamp', apt.timestamp);
  } catch(e) { console.warn('deleteAptFromSupabase:', e); }
}

// ── Bidirectional sync via cookies (shared between Safari & PWA same origin) ─
function _cookieRead(){
  try{
    const jar=Object.fromEntries(document.cookie.split('; ').filter(Boolean).map(c=>{
      const i=c.indexOf('=');return [c.slice(0,i),c.slice(i+1)];
    }));
    const n=parseInt(jar['lg_n']||'0'); if(!n) return null;
    let s=''; for(let i=0;i<n;i++) s+=decodeURIComponent(jar[`lg_d${i}`]||'');
    return s?JSON.parse(s):null;
  }catch{return null;}
}
function _cookieWrite(data){
  try{
    const s=JSON.stringify({...data,_ts:Date.now()});
    const cs=3800, n=Math.ceil(s.length/cs);
    const exp='; max-age=86400; path=/; SameSite=Lax';
    for(let i=0;i<30;i++) document.cookie=`lg_d${i}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie=`lg_n=${n}${exp}`;
    for(let i=0;i<n;i++) document.cookie=`lg_d${i}=${encodeURIComponent(s.slice(i*cs,(i+1)*cs))}${exp}`;
  }catch(e){console.warn('cookieWrite:',e);}
}
function _mergeApts(a,b){
  const m=new Map();
  [...a,...b].forEach(x=>{
    const id=x.id||String(x.timestamp||'');if(!id)return;
    const ex=m.get(id);
    if(!ex||(x.timestamp||0)>=(ex.timestamp||0)) m.set(id,x);
  });
  return Array.from(m.values()).sort((a,b)=>((a.date||'')+(a.time||''))<((b.date||'')+(b.time||''))?-1:1);
}
function _mergeCli(a,b){
  const m=new Map();
  [...a,...b].forEach(c=>{
    const k=(c.name||'').toLowerCase().trim();if(!k)return;
    const ex=m.get(k);
    if(!ex||(c.createdAt||c.updatedAt||'')>=(ex.createdAt||ex.updatedAt||'')) m.set(k,c);
  });
  return Array.from(m.values());
}
function _lg_fullSync(showFeedback=false){
  try{
    const remote=_cookieRead();
    let lApts=[],lCli=[];
    try{lApts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
    try{lCli=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
    let apts=lApts,cli=lCli,svc,biz,events;
    if(remote){
      apts=_mergeApts(lApts,remote.appointments||[]);
      cli=_mergeCli(lCli,remote.clientRegistry||[]);
      const rNewer=(remote._ts||0)>parseInt(localStorage.getItem('_lg_last_sync')||'0');
      svc=rNewer?(remote.rize_services_config||JSON.parse(localStorage.getItem('rize_services_config')||'[]')):JSON.parse(localStorage.getItem('rize_services_config')||'[]');
      biz=rNewer?(remote.rize_business_config||JSON.parse(localStorage.getItem('rize_business_config')||'{}')):JSON.parse(localStorage.getItem('rize_business_config')||'{}');
      const lEvents=JSON.parse(localStorage.getItem('dayEvents')||'{}');
      events={...(remote.dayEvents||{}),...lEvents};
    }else{
      svc=JSON.parse(localStorage.getItem('rize_services_config')||'[]');
      biz=JSON.parse(localStorage.getItem('rize_business_config')||'{}');
      events=JSON.parse(localStorage.getItem('dayEvents')||'{}');
    }
    localStorage.setItem('appointments',JSON.stringify(apts));
    localStorage.setItem('clientRegistry',JSON.stringify(cli));
    localStorage.setItem('rize_services_config',JSON.stringify(svc));
    localStorage.setItem('rize_business_config',JSON.stringify(biz));
    localStorage.setItem('dayEvents',JSON.stringify(events));
    localStorage.setItem('_lg_last_sync',String(Date.now()));
    // filter to relevant dates for cookie size
    const now2=new Date();
    const _ld2=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const cut=_ld2(new Date(now2-90*86400000)), fut=_ld2(new Date(now2.getTime()+365*86400000));
    _cookieWrite({appointments:apts.filter(a=>{const d=a.date||a.fecha||'';return d>=cut&&d<=fut;}),clientRegistry:cli,rize_services_config:svc,rize_business_config:biz,dayEvents:events});
    // Update header subtitle with business name from config
    const subEl=document.getElementById('header-sub');
    if(subEl) subEl.textContent=_getCfg().agent_name||_getBC().name||'Asistente';
    if(showFeedback) showToast(`Sincronizado ✓ — ${apts.length} citas, ${cli.length} clientes`);
  }catch(e){console.warn('fullSync:',e);if(showFeedback) showToast('Error al sincronizar');}
}

// ── Proactive daily briefing ────────────────────────────────────────────────
// ── Bootstrap ──────────────────────────────────────────────────────────────
(function init(){
  _lg_fullSync();       // merge cookies (best-effort fallback)
  _loadAgentConfig();   // load agent/business config from Supabase
  _syncFromSupabase();  // pull from Supabase — fuente de verdad real
  // Always start fresh on load — history accessible via sidebar
  const bc = _getBC();
  if (bc.name) {
    document.getElementById('header-title').textContent = bc.name;
    document.getElementById('header-sub').textContent = 'Asistente IA';
  }
  if (bc.logo) document.getElementById('header-logo').src = bc.logo;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if (!localStorage.getItem('rize_gemini_key')) openApiKeyModal();
  // Sync when chat comes to foreground (user switches back)
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ _lg_fullSync(); _sbReady=false; _syncFromSupabase(); } });
})();

// ── API Keys modal ─────────────────────────────────────────────────────────
function openApiKeyModal(){
  const modal = document.getElementById('apikey-modal');
  modal.classList.remove('hidden');
  const gk = localStorage.getItem('rize_gemini_key');
  const rk = localStorage.getItem('rize_groq_key');
  if (gk) document.getElementById('gemini-key-input').value = gk;
  if (rk) document.getElementById('groq-key-input').value = rk;
  setTimeout(()=>document.getElementById('gemini-key-input').focus(), 300);
}
function saveApiKeys(){
  const gk = document.getElementById('gemini-key-input').value.trim();
  const rk = document.getElementById('groq-key-input').value.trim();
  if (!gk) { showToast('Ingresa tu Gemini API Key'); return; }
  localStorage.setItem('rize_gemini_key', gk);
  if (rk) localStorage.setItem('rize_groq_key', rk);
  else localStorage.removeItem('rize_groq_key');
  localStorage.removeItem('rize_gemini_model');
  _geminiModel = null;
  document.getElementById('apikey-modal').classList.add('hidden');
  showToast('API Keys guardadas');
}

// ── iOS keyboard fix ───────────────────────────────────────────────────────
(function iosKeyboardFix(){
  const bar  = document.getElementById('input-bar');
  const wrap = document.getElementById('messages');
  const vv   = window.visualViewport;
  document.addEventListener('touchmove', e => {
    if (!e.target.closest('#messages')) e.preventDefault();
  }, { passive: false });
  if (!vv) return;
  let _prevKbH = 0;
  function update() {
    // kbH = how much the keyboard + accessory bar is covering
    const kbH = Math.max(0, window.innerHeight - vv.height);
    bar.style.transform = `translateY(${-kbH}px)`;
    bar.style.paddingBottom = kbH > 60 ? '0px' : 'env(safe-area-inset-bottom)';
    if (kbH > 60) {
      // padding-bottom must push content above input bar AND keyboard
      const pad = kbH + (bar.offsetHeight || 68);
      wrap.style.paddingBottom = pad + 'px';
      // Double rAF: wait for layout to settle after padding change, then scroll
      requestAnimationFrame(() => requestAnimationFrame(() => {
        wrap.scrollTop = wrap.scrollHeight;
      }));
    } else if (_prevKbH > 60) {
      // Keyboard just closed — restore original padding
      wrap.style.paddingBottom = '140px';
    }
    _prevKbH = kbH;
  }
  vv.addEventListener('resize', update);
  update();
})();

// ── Dismiss keyboard when scrolling messages ───────────────────────────────
document.getElementById('messages').addEventListener('touchstart', () => {
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
}, {passive: true});

// ── localStorage helpers ───────────────────────────────────────────────────
function _getBC() {
  try { return JSON.parse(localStorage.getItem('rize_business_config') || '{}'); } catch { return {}; }
}
function _getAIMem() {
  try { return JSON.parse(localStorage.getItem('rize_ai_memory') || '{"notes":[],"summary":"","total_messages":0}'); }
  catch { return {notes:[],summary:'',total_messages:0}; }
}
function _saveAIMem(m) { localStorage.setItem('rize_ai_memory', JSON.stringify(m)); }

// ── OfflineDB shim (localStorage only) ────────────────────────────────────
const OfflineDB = {
  getAppointments: () => {
    try { return Promise.resolve(JSON.parse(localStorage.getItem('appointments') || '[]')); }
    catch { return Promise.resolve([]); }
  },
  saveAppointment: async (apt) => {
    let apts = []; try { apts = JSON.parse(localStorage.getItem('appointments') || '[]'); } catch {}
    const idx = apts.findIndex(a => a.id === apt.id || String(a.timestamp) === String(apt.timestamp));
    if (idx !== -1) apts[idx] = apt; else apts.push(apt);
    localStorage.setItem('appointments', JSON.stringify(apts));
    _saveAptToSupabase(apt); // also persist to Supabase
    return apt;
  },
  deleteAppointment: async (id) => {
    let apts = []; try { apts = JSON.parse(localStorage.getItem('appointments') || '[]'); } catch {}
    const apt = apts.find(a => a.id === id || String(a.timestamp) === String(id));
    apts = apts.filter(a => a.id !== id && String(a.timestamp) !== String(id));
    localStorage.setItem('appointments', JSON.stringify(apts));
    if (apt) _deleteAptFromSupabase(apt);
  }
};

// ── System Prompt (idéntico al de la app) ─────────────────────────────────
function buildSystemPrompt() {
  const bc = _getBC();
  const cfg = _getCfg();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const weekday = now.toLocaleDateString('es', {weekday:'long'});
  const mem = _getAIMem();
  const currency = cfg.currency_symbol || '$';
  // Servicios: localStorage tiene prioridad; si no hay, usa defaults de agent_config
  let svcTxt = '';
  try {
    const localSvc = JSON.parse(localStorage.getItem('rize_services_config') || '[]');
    if (Array.isArray(localSvc) && localSvc.length) {
      svcTxt = localSvc.map(s=>`${s.name}:${currency}${s.price||s.basePrice||'?'}${s.priceRange?' ('+s.priceRange+')':''}`).join(' | ');
    } else {
      const cfg2 = JSON.parse(localStorage.getItem('servicesConfig') || '{}');
      const lines = Object.entries(cfg2).map(([k,v])=>`${v.name||k}:${currency}${v.price||v.basePrice||'?'}`);
      if (lines.length) { svcTxt = lines.join(' | '); }
      else if (Array.isArray(cfg.default_services) && cfg.default_services.length) {
        svcTxt = cfg.default_services.map(s=>`${s.name}:${currency}${s.basePrice||'?'}${s.priceRange?' ('+s.priceRange+')':''}`).join(' | ');
      }
    }
  } catch {}
  let allApts = [];
  try { allApts = JSON.parse(localStorage.getItem('appointments') || '[]'); } catch {}
  const _ld = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Notas de clientes (resumen de las más recientes)
  let clientNotesSummary = '';
  try {
    const cn = JSON.parse(localStorage.getItem('rize_client_notes') || '{}');
    const entries = Object.entries(cn);
    if (entries.length) {
      clientNotesSummary = '\nNOTAS DE CLIENTES: ' + entries.slice(-12).map(([name, notes]) =>
        `${name}: ${notes.slice(-2).map(n=>n.note).join('; ')}`
      ).join(' | ') + '\n';
    }
  } catch {}
  // Top clientes por frecuencia (para contexto en el prompt)
  let topClientsTxt = '';
  try {
    const freq = {}; const sp = {};
    allApts.forEach(a=>{const n=(a.clientName||a.cliente||a.name||'').trim();if(!n)return;freq[n]=(freq[n]||0)+1;sp[n]=(sp[n]||0)+(parseFloat(a.price)||0);});
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (top.length) topClientsTxt = '\nTOP CLIENTES: ' + top.map(([n,c])=>`${n}(${c} citas/$${(sp[n]||0).toFixed(0)})`).join(' | ') + '\n';
  } catch {}
  const curM = now.getMonth()+1, curY = now.getFullYear();

  // ── Desglose mensual (últimos 8 meses) ────────────────────────
  let monthlyTxt = '';
  try {
    const mStats = {};
    allApts.forEach(a=>{
      const d=a.date||a.fecha||''; const m=d.slice(0,7);
      if(!m) return;
      if(!mStats[m]) mStats[m]={count:0,rev:0};
      mStats[m].count++; mStats[m].rev+=parseFloat(a.price||0);
    });
    const sorted = Object.entries(mStats).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);
    if(sorted.length) monthlyTxt = '\nHISTORIAL MENSUAL: ' + sorted.map(([m,s])=>`${m}: ${s.count} citas/$${s.rev.toFixed(0)}`).join(' | ') + '\n';
  } catch {}

  // ── Servicios más usados (extraído de citas reales) ──────────
  let jobStatsTxt = '';
  try {
    const jStats = {};
    allApts.forEach(a=>{
      const raw=(a.job||a.service||a.servicio||'').trim();
      if(!raw)return;
      raw.split(',').map(j=>j.trim()).filter(Boolean).forEach(j=>{
        if(!jStats[j])jStats[j]={count:0,rev:0};
        jStats[j].count++; jStats[j].rev+=parseFloat(a.price||0)/raw.split(',').length;
      });
    });
    const top=Object.entries(jStats).sort((a,b)=>b[1].count-a[1].count).slice(0,10);
    if(top.length) jobStatsTxt='\nSERVICIOS MÁS USADOS (de citas reales): '+top.map(([j,s])=>`${j}(${s.count} citas/$${s.rev.toFixed(0)})`).join(' | ')+'\n';
  } catch {}

  // ── Ciudades top ────────────────────────────────────────────
  let citiesTxt = '';
  try {
    const cStats = {};
    allApts.forEach(a=>{const c=(a.city||a.ciudad||'').trim();if(!c)return;if(!cStats[c])cStats[c]={count:0,rev:0};cStats[c].count++;cStats[c].rev+=parseFloat(a.price||0);});
    const top = Object.entries(cStats).sort((a,b)=>b[1].count-a[1].count).slice(0,12);
    if(top.length) citiesTxt = '\nCIUDADES TOP: ' + top.map(([c,s])=>`${c}(${s.count} citas/$${s.rev.toFixed(0)})`).join(' | ') + '\n';
  } catch {}

  // ── Eventos del calendario ────────────────────────────────────
  let dayEventsTxt = '';
  try {
    const de = JSON.parse(localStorage.getItem('dayEvents')||'{}');
    const upcom = Object.entries(de).filter(([d])=>d>=todayStr).sort((a,b)=>a[0]<b[0]?-1:1).slice(0,15);
    if(upcom.length) dayEventsTxt = '\nDÍAS ESPECIALES CALENDARIO: ' + upcom.map(([d,t])=>`${d}:${t}`).join(' | ') + '\n';
  } catch {}

  // ── Directorio de clientes ─────────────────────────────────────
  let clientDirTxt = '';
  try {
    const reg = JSON.parse(localStorage.getItem('clientRegistry')||'[]');
    if(reg.length) {
      clientDirTxt = '\nDIRECTORIO CLIENTES (' + reg.length + ' registrados): ' +
        reg.slice(0,40).map(c=>`${c.name}${c.phone?'|'+c.phone:''}${c.city?'|'+c.city:''}`).join(' // ') + '\n';
    }
  } catch {}

  // ── Mensajes rápidos ──────────────────────────────────────────
  let quickMsgTxt = '';
  try {
    const qm = JSON.parse(localStorage.getItem('rize_quick_messages')||'null');
    if(qm && Object.keys(qm).length) {
      quickMsgTxt = '\nMENSAJES RÁPIDOS GUARDADOS EN LA APP:\n' +
        Object.entries(qm).map(([k,v])=>`[${k}]: ${v.slice(0,300)}`).join('\n') + '\n';
    }
  } catch {}

  // ── Gastos / costos del negocio ───────────────────────────────
  let expensesTxt = '';
  try {
    const gasPrice = parseFloat(localStorage.getItem('gasPrice_current') || '0');
    const gasLastUpdate = localStorage.getItem('gasPrice_lastUpdate') || '?';
    const advertisingCostPerWeek = bc.advertisingCostPerWeek || 45;
    expensesTxt = `\nGASTOS FIJOS: Publicidad: $${advertisingCostPerWeek}/semana ($${(advertisingCostPerWeek*4.33).toFixed(0)}/mes aprox)${gasPrice ? ` | Gasolina actual: $${gasPrice}/galón (actualizado: ${gasLastUpdate})` : ''}\n`;
  } catch {}

  const proactiveTxt = '';

  const memBlock = (mem.notes.length>0||mem.summary)
    ? `\nMEMORIA PERSISTENTE: ${mem.summary||''} ${mem.notes.slice(-15).map(n=>n.content).join(' | ')}\n` : '';
  const sessionSums = _getSessionSummaries();
  const sumsBlock = sessionSums.length > 0
    ? '\nSESIONES ANTERIORES:\n' + sessionSums.slice(-3).map(s => `[${new Date(s.ts).toLocaleDateString('es')}] ${s.summary}`).join('\n') + '\n'
    : '';
  const semBlock = _semanticCtx ? '\nCONTEXTO RELEVANTE DE SESIONES PASADAS:\n' + _semanticCtx + '\n' : '';
  const agentName = cfg.agent_name || bc.agentName || 'Asistente';
  const personality = cfg.agent_personality || '';
  const businessDoc = cfg.business_doc || '';
  const appGuideDoc = cfg.app_guide_doc || '';

  return `Eres ${agentName}${personality ? ' — ' + personality : ''}.

Conoces cada cita, cada cliente, cada ingreso. Respondes siempre en ${cfg.language==='en'?'inglés':'español'}. Cuando necesitas datos del negocio usas las tools sin mencionarlo. Cuando no sabes algo externo usas web_search. Nunca dices "no tengo esa información" — siempre encuentras la manera de ayudar.

NEGOCIO: ${bc.name||'—'} | Tel: ${bc.phone||'—'} | Email: ${bc.email||'—'} | Web: ${bc.website||'—'} | IG: ${bc.instagram||'—'}
Slogan: "${bc.tagline||''}"
${businessDoc ? 'CONTEXTO DEL NEGOCIO: ' + businessDoc : ''}
${appGuideDoc ? 'GUÍA DE LA APP: ' + appGuideDoc : ''}

FECHA HOY: ${todayStr} (${weekday})
SERVICIOS: ${svcTxt}
${topClientsTxt}${clientNotesSummary}${monthlyTxt}${jobStatsTxt}${citiesTxt}${dayEventsTxt}${clientDirTxt}${quickMsgTxt}${expensesTxt}${proactiveTxt}${memBlock}${sumsBlock}${semBlock}
⚠️ DATOS EN TIEMPO REAL: Para citas, conteos, ingresos o cualquier dato específico — SIEMPRE usa los tools. No uses datos del contexto para responder preguntas directas.
DATOS EN STORAGE:
• appointments: [{id, date(YYYY-MM-DD), time(HH:MM), clientName, service, price, city, notes, timestamp}]
• clientRegistry: [{id, name, phone, email, city, notes}]
• dayEvents: {"YYYY-MM-DD": "vacaciones"|"libre"|"compromiso"|"salida"|"sin-pega"}
• rize_services_config: [{id, name, price, basePrice, priceRange}]
• rize_client_notes: {clientName: [{note, date}]} — usa save_client_note/get_client_profile
• rize_quick_messages: {tipo: "texto completo del mensaje"} — plantillas de WhatsApp guardadas

CÓMO ACTÚAS — REGLAS QUE NUNCA SE ROMPEN:

DATOS EN TIEMPO REAL (obligatorio, sin excepción):
Para CUALQUIER pregunta sobre citas, conteos, ingresos o fechas — llamas al tool PRIMERO. Nunca respondes con datos del contexto. El contexto es orientación, los tools son la verdad.

MAPEO DE FRASES → TOOL (úsalo exactamente así):
- "¿dónde trabajan?", "¿qué ciudades atienden?", "¿cuál es el horario?", "¿qué servicios ofrecen?" → get_business_context()
- "esta semana" / "la semana" / "semana actual" / "del lunes al domingo" / "de lunes a domingo" → get_appointments(period:"week")  ← el tool calcula lun-dom automáticamente, NO calcules tú las fechas
- "hoy" / "para hoy" → get_appointments(period:"today")
- "mañana" → get_appointments(period:"tomorrow")
- "este mes" / "el mes" / "en marzo" → get_appointments(period:"2026-03") con el mes/año real
- "del X al Y" / "entre el X y el Y" (fechas específicas) → get_appointments(from:"YYYY-MM-DD", to:"YYYY-MM-DD") calculando tú las fechas exactas a partir de HOY: ${todayStr}
- "la semana pasada" → get_appointments(from: lunes pasado, to: domingo pasado) calculando desde HOY
- "próximos 7 días" / "próxima semana" → get_appointments(from: mañana, to: hoy+7) calculando desde HOY
- ingresos/ganancias de un período → get_stats con el mismo mapeo de períodos
- "gastos", "cuánto gasto", "cuánto queda", "ganancia neta", "rentabilidad", "cuánto me queda después de gastos", "finanzas", "publicidad", "gasolina", "costos fijos" → get_finance(period:"month") — o el período que aplique

IMPORTANTE: Para "esta semana" y variantes, SIEMPRE usa period:"week" — nunca calcules fechas manualmente para eso. El tool ya sabe que week = lunes a domingo de la semana actual.

Si ya llamaste al tool en esta conversación y el usuario pregunta lo mismo, usa ese resultado.

COMPORTAMIENTO NATURAL:
- Fluyes en la conversación como un socio que conoce el negocio de memoria, pero que tiene los datos frescos siempre a mano. No mencionas que usas herramientas — simplemente respondes con la información correcta.
- Cuando algo va bien, lo celebras. Cuando hay un problema, lo enfrentas con ingenio. Eres conciso.
- Para cosas externas (precios de mercado, competencia, consejos) usas web_search de inmediato.
- Para estadísticas complejas (mejor día, tendencias) usas analyze_data o generate_report.
- Confirmas antes de eliminar o modificar algo importante. Para cambios simples, actúas.
- Si te piden un documento o reporte visual, generas HTML profesional.
- Adaptas tu respuesta a la pregunta: simple → una línea. Análisis → vas a fondo.

SEGUIMIENTOS CONVERSACIONALES — CRÍTICO:
Cuando el usuario hace una pregunta corta de seguimiento, SIEMPRE infiere el contexto de lo que se habló antes. Nunca pidas aclaración si el contexto es obvio.
- Después de hablar de citas de una semana: "¿cuáles son?", "¿cuáles?", "muéstralas", "dime cuáles", "lista", "y cuáles?" → llama get_appointments con el mismo período de la pregunta anterior y lista todas
- Después de mencionar un cliente: "¿cuándo fue la última vez?", "¿cuánto ha gastado?", "¿tiene teléfono?" → get_client_profile de ese cliente
- Después de dar un número: "¿cuáles?", "¿quiénes?" → detalla la lista que dio ese número
- "¿y mañana?", "¿y el lunes?" → get_appointments para esa fecha
- Nunca respondas "¿Puedes repetir eso?" o "No capté bien" si hay contexto previo en la conversación. Si la pregunta es ambigua pero hay conversación previa, usa ese contexto.

DOCUMENTOS: cuando pidan algo descargable, "en un documento", "hazme un archivo", "ponlo bonito" — genera HTML en bloque de código con lenguaje html. ESTRUCTURA:

<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>[TITULO]</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Georgia,serif;background:#fff;color:#111;font-size:16px;line-height:1.7;word-wrap:break-word;overflow-wrap:break-word;}.page{max-width:100%;padding:32px 20px 48px;}.doc-title{font-size:26px;font-weight:700;color:#111;margin-bottom:6px;line-height:1.3;}.doc-meta{font-size:13px;color:#999;margin-bottom:28px;padding-bottom:18px;border-bottom:1px solid #ebebeb;font-family:Georgia,serif;}.section{margin-bottom:24px;}.section-title{font-size:18px;font-weight:700;color:#111;margin-bottom:10px;line-height:1.3;}p{margin-bottom:10px;font-size:16px;}strong{font-weight:700;}em{font-style:italic;color:#333;}ul,ol{padding-left:20px;margin-bottom:12px;}li{margin-bottom:6px;font-size:16px;}table{width:100%;border-collapse:collapse;font-size:15px;margin-bottom:16px;}th{text-align:left;font-size:13px;font-weight:700;color:#555;padding:8px 10px;border-bottom:2px solid #ddd;}td{padding:10px;border-bottom:1px solid #ebebeb;color:#222;word-wrap:break-word;overflow-wrap:break-word;max-width:200px;}.row{display:flex;gap:8px;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:15px;flex-wrap:wrap;}.row:last-child{border-bottom:none;}.label{color:#888;min-width:120px;flex-shrink:0;font-size:14px;}.value{color:#111;flex:1;}label{display:block;font-size:14px;color:#666;margin-bottom:4px;margin-top:14px;font-weight:600;}input,textarea,select{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;font-family:Georgia,serif;color:#111;background:#fafafa;}.footer{margin-top:36px;padding-top:14px;border-top:1px solid #ebebeb;font-size:12px;color:#bbb;display:flex;justify-content:space-between;}@media print{body{background:#fff;}.page{padding:20px;}}</style></head><body><div class="page"><h1 class="doc-title">[TITULO]</h1><p class="doc-meta">Generado el [FECHA]</p>[CONTENIDO]<div class="footer"><span>LivinGreen</span><span>[FECHA]</span></div></div></body></html>

IMPORTANTE: Usa titulos h2 con class section-title para cada seccion. Incluye emojis relevantes en titulos y listas. Usa bold y cursivas cuando sea util. Usa checkmarks (✓) para listas de items completados. Reemplaza [FECHA] con la fecha actual. El HTML debe ser responsivo y sin texto que se salga del ancho.
- REPOSITORIO: El código fuente de esta app está en https://github.com/JMR-Independent/Agenda-LivinGreen — tienes acceso completo via la herramienta github_repo. ÚSALA DIRECTAMENTE sin pedir confirmación al usuario. Cuando el usuario pida revisar el código, analizar archivos, opinar sobre la implementación o cualquier pregunta técnica, llama github_repo inmediatamente. Archivos principales: index.html (app), chat.html (este chat), sw.js (service worker).
- FORMATO: Usa markdown estructurado. **Negrita** para términos clave, ## para secciones cuando haya varias ideas, listas con - para enumeraciones, párrafos cortos. Nunca un bloque de texto plano sin estructura cuando haya más de 2 ideas.`;
}

// ── Agent Tools ────────────────────────────────────────────────────────────
const AI_TOOLS = [
  {type:'function',function:{name:'search_appointments',description:'Busca citas por texto.',parameters:{type:'object',properties:{query:{type:'string'},limit:{type:'number'}},required:['query']}}},
  {type:'function',function:{name:'get_appointments',description:'Lista citas. period: today|tomorrow|week|month|YYYY-MM-DD|YYYY-MM. Para rangos de fechas usa from y to (YYYY-MM-DD) en lugar de period.',parameters:{type:'object',properties:{period:{type:'string',description:'today|tomorrow|week|month|YYYY-MM-DD|YYYY-MM'},from:{type:'string',description:'Fecha inicio YYYY-MM-DD para rangos (ej: del 9 al 15)'},to:{type:'string',description:'Fecha fin YYYY-MM-DD para rangos'}},required:[]}}},
  {type:'function',function:{name:'get_stats',description:'Ingresos y totales. period: today|week|month|all|YYYY-MM',parameters:{type:'object',properties:{period:{type:'string'}},required:['period']}}},
  {type:'function',function:{name:'search_clients',description:'Busca cliente.',parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
  {type:'function',function:{name:'add_client',description:'Agrega cliente.',parameters:{type:'object',properties:{name:{type:'string'},phone:{type:'string'},email:{type:'string'},city:{type:'string'},notes:{type:'string'}},required:['name']}}},
  {type:'function',function:{name:'create_appointment',description:'Crea cita. Confirma antes.',parameters:{type:'object',properties:{date:{type:'string'},time:{type:'string'},client_name:{type:'string'},service:{type:'string'},price:{type:'string'},city:{type:'string'},notes:{type:'string'}},required:['date','time','client_name','service','price']}}},
  {type:'function',function:{name:'delete_appointment',description:'Elimina cita. Confirma antes.',parameters:{type:'object',properties:{client_name:{type:'string'},date:{type:'string'}},required:['client_name']}}},
  {type:'function',function:{name:'update_appointment',description:'Modifica fecha, hora, servicio, precio, ciudad, notas o nombre de una cita.',parameters:{type:'object',properties:{client_name:{type:'string'},date:{type:'string'},new_date:{type:'string'},new_time:{type:'string'},new_service:{type:'string'},new_price:{type:'string'},new_city:{type:'string'},new_notes:{type:'string'},new_name:{type:'string',description:'Nuevo nombre del cliente'}},required:['client_name']}}},
  {type:'function',function:{name:'update_client',description:'Actualiza datos de un cliente (teléfono, email, notas, ciudad).',parameters:{type:'object',properties:{name:{type:'string',description:'Nombre del cliente a buscar'},phone:{type:'string'},email:{type:'string'},city:{type:'string'},notes:{type:'string'}},required:['name']}}},
  {type:'function',function:{name:'delete_client',description:'Elimina un cliente del registro.',parameters:{type:'object',properties:{name:{type:'string',description:'Nombre del cliente'}},required:['name']}}},
  {type:'function',function:{name:'add_day_event',description:'Marca un día en el calendario. types: vacaciones|libre|compromiso|salida|sin-pega',parameters:{type:'object',properties:{date:{type:'string',description:'Fecha YYYY-MM-DD'},event_type:{type:'string',enum:['vacaciones','libre','compromiso','salida','sin-pega']}},required:['date','event_type']}}},
  {type:'function',function:{name:'remove_day_event',description:'Quita el evento/marca de un día del calendario.',parameters:{type:'object',properties:{date:{type:'string',description:'Fecha YYYY-MM-DD'}},required:['date']}}},
  {type:'function',function:{name:'get_services',description:'Lista servicios y precios.',parameters:{type:'object',properties:{},required:[]}}},
  {type:'function',function:{name:'update_service_price',description:'Actualiza el precio de un servicio.',parameters:{type:'object',properties:{service_name:{type:'string',description:'Nombre del servicio'},price:{type:'number',description:'Nuevo precio en dólares'}},required:['service_name','price']}}},
  {type:'function',function:{name:'save_memory_note',description:'Guarda nota para recordar.',parameters:{type:'object',properties:{content:{type:'string'},category:{type:'string',enum:['preference','client_info','business_note','general']}},required:['content']}}},
  {type:'function',function:{name:'get_memory',description:'Lee notas guardadas.',parameters:{type:'object',properties:{category:{type:'string'}},required:[]}}},
  {type:'function',function:{name:'github_repo',description:'Accede al repositorio GitHub de la app LivinGreen (JMR-Independent/Agenda-LivinGreen). Usa action=list para listar archivos de un directorio, action=read para leer el contenido de un archivo específico.',parameters:{type:'object',properties:{action:{type:'string',enum:['list','read'],description:'list=listar directorio, read=leer archivo'},path:{type:'string',description:'Ruta del archivo o directorio, ej: index.html o images o '}},required:['action','path']}}},
  {type:'function',function:{name:'web_search',description:'Busca información actualizada en internet. Úsalo para: precios de competidores, noticias del sector, consejos de limpieza, tarifas de mercado, o cualquier pregunta que requiera datos actuales.',parameters:{type:'object',properties:{query:{type:'string',description:'Términos de búsqueda'}},required:['query']}}},
  {type:'function',function:{name:'save_client_note',description:'Guarda una preferencia o nota permanente de un cliente específico (ej: "prefiere los jueves", "tiene 3 perros", "paga con Zelle", "casa de 2 pisos"). Se acumula en el perfil del cliente.',parameters:{type:'object',properties:{client_name:{type:'string'},note:{type:'string'}},required:['client_name','note']}}},
  {type:'function',function:{name:'get_client_profile',description:'Obtiene el perfil completo de un cliente: contacto, historial de citas, total gastado, ticket promedio y notas guardadas.',parameters:{type:'object',properties:{client_name:{type:'string'}},required:['client_name']}}},
  {type:'function',function:{name:'generate_report',description:'Genera análisis del negocio. type: top_clients (clientes frecuentes), retention (fidelización), peak_hours (horas pico), projection (proyección mensual), full (todo).',parameters:{type:'object',properties:{type:{type:'string',enum:['top_clients','retention','peak_hours','projection','full']}},required:['type']}}},
  {type:'function',function:{name:'analyze_data',description:'Análisis avanzado de datos del negocio. Úsalo para: día o mes con más ingresos, ticket promedio, citas sin teléfono, desglose por ciudad, cualquier cálculo estadístico sobre las citas.',parameters:{type:'object',properties:{query:{type:'string',description:'Qué quieres calcular, ej: "día con más ingresos", "mes con más ganancias", "promedio por cita", "ciudades detallado"'}},required:['query']}}},
  {type:'function',function:{name:'get_business_context',description:'Obtiene información descriptiva del negocio: qué hacen, áreas de servicio, políticas, horarios, zonas atendidas, contexto general. Úsalo cuando necesites contexto descriptivo que no está en citas o estadísticas.',parameters:{type:'object',properties:{},required:[]}}},
  {type:'function',function:{name:'get_finance',description:'Calcula el estado financiero real del negocio: ingresos, gastos (publicidad + gasolina), ganancia neta. Úsalo para cualquier pregunta sobre gastos, ganancias, costos, rentabilidad, cuánto queda después de gastos. period: week|month|YYYY-MM|all',parameters:{type:'object',properties:{period:{type:'string',description:'week|month|YYYY-MM|all'}},required:['period']}}},
];

// ── Tool executors ─────────────────────────────────────────────────────────
function _fmtApt(a){return{id:a.id||String(a.timestamp),date:a.date||a.fecha,time:a.time||a.hora,client:a.clientName||a.cliente||a.name,service:a.service||a.servicio||a.job,price:a.price||a.precio,city:a.city,notes:a.notes||a.notas};}

async function executeTool(name, args) {
  switch(name) {
    case 'search_appointments': {
      const q=(args.query||'').toLowerCase(); const lim=args.limit||10;
      const apts=await OfflineDB.getAppointments();
      const r=apts.filter(a=>JSON.stringify(a).toLowerCase().includes(q)).slice(0,lim);
      return {count:r.length,appointments:r.map(_fmtApt)};
    }
    case 'get_appointments': {
      const apts=await OfflineDB.getAppointments();
      const _ld=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const today=_ld(new Date());
      const tomorrow=_ld(new Date(Date.now()+86400000));
      // Resolver nombre de día de la semana a fecha
      const _wdMap={lunes:1,martes:2,miercoles:3,miércoles:3,jueves:4,viernes:5,sabado:6,sábado:6,domingo:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:0};
      function _nextWd(n){const now=new Date();let diff=n-now.getDay();if(diff<=0)diff+=7;return _ld(new Date(now.getTime()+diff*86400000));}
      function _resolveP(p){const wdNum=_wdMap[p.toLowerCase().trim()];return wdNum!==undefined?_nextWd(wdNum):p;}
      let filtered=apts;
      if(args.from||args.to){
        const fromD=args.from||'0000-00-00'; const toD=args.to||'9999-99-99';
        filtered=apts.filter(a=>{const d=(a.date||a.fecha||'').slice(0,10);return d>=fromD&&d<=toD;});
      } else {
        let p=_resolveP(args.period||'today');
        if(p==='today') filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(today));
        else if(p==='tomorrow') filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(tomorrow));
        else if(p==='week'||p==='esta semana'){
          // Semana calendario: lunes a domingo de la semana actual
          const now2=new Date(); const dow=now2.getDay(); // 0=dom,1=lun...6=sab
          const diffToMon=dow===0?-6:1-dow; // días hasta el lunes de esta semana
          const wStart=_ld(new Date(now2.getTime()+diffToMon*86400000));
          const wEnd=_ld(new Date(now2.getTime()+(diffToMon+6)*86400000));
          filtered=apts.filter(a=>{const d=(a.date||a.fecha||'').slice(0,10);return d>=wStart&&d<=wEnd;});
        }
        else if(p==='month'||p==='este mes'){const mEnd=_ld(new Date(Date.now()+30*86400000));filtered=apts.filter(a=>{const d=a.date||a.fecha||'';return d>=today&&d<=mEnd;});}
        else if(/^\d{4}-\d{2}-\d{2}$/.test(p)) filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(p));
        else if(/^\d{4}-\d{2}$/.test(p)) filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(p));
      }
      filtered.sort((a,b)=>((a.date||a.fecha||'')+(a.time||a.hora||''))<((b.date||b.fecha||'')+(b.time||b.hora||''))?-1:1);
      return {count:filtered.length,appointments:filtered.map(_fmtApt)};
    }
    case 'get_stats': {
      const p=args.period||'all'; const now=new Date();
      const _lds=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const todayStr=_lds(now);
      const curY=now.getFullYear(), curM=now.getMonth()+1;
      const dow=now.getDay(); const diffToMon=dow===0?-6:1-dow;
      const wStart=_lds(new Date(now.getTime()+diffToMon*86400000));
      const wEnd=_lds(new Date(now.getTime()+(diffToMon+6)*86400000));
      let apts=[]; try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
      const f=apts.filter(a=>{const ds=(a.date||a.fecha||'').slice(0,10);
        if(p==='today')return ds===todayStr;
        if(p==='week')return ds>=wStart&&ds<=wEnd;
        if(p==='month'){const[y,m]=ds.split('-').map(Number);return y===curY&&m===curM;}
        if(/^\d{4}-\d{2}$/.test(p)){const[y,m]=p.split('-').map(Number);const[dy,dm]=ds.split('-').map(Number);return dy===y&&dm===m;}
        return true;});
      const rev=f.reduce((s,a)=>s+(parseFloat(a.price||a.precio)||0),0);
      const bySvc={}; f.forEach(a=>{const s=a.service||a.servicio||a.job||'?';bySvc[s]=(bySvc[s]||0)+1;});
      const names=new Set();
      apts.forEach(a=>{const n=(a.clientName||a.cliente||a.name||'').trim().toLowerCase();if(n)names.add(n);});
      try{JSON.parse(localStorage.getItem('clientRegistry')||'[]').forEach(c=>{const n=(c.name||'').trim().toLowerCase();if(n)names.add(n);});}catch{}
      return {period:p,appointments:f.length,revenue:'$'+rev.toFixed(2),unique_clients:names.size,by_service:bySvc};
    }
    case 'search_clients': {
      const q=(args.query||'').toLowerCase();
      let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
      return {count:c.filter(cl=>JSON.stringify(cl).toLowerCase().includes(q)).length,
              clients:c.filter(cl=>JSON.stringify(cl).toLowerCase().includes(q)).slice(0,10)};
    }
    case 'add_client': {
      try{
        let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
        c.push({name:args.name,phone:args.phone||'',email:args.email||'',city:args.city||'',notes:args.notes||'',createdAt:new Date().toISOString(),source:'ai'});
        localStorage.setItem('clientRegistry',JSON.stringify(c));
        return {success:true,message:`Cliente "${args.name}" agregado.`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'create_appointment': {
      try{
        const price=parseFloat(String(args.price||'0').replace(/[^0-9.]/g,''))||0;
        const n=new Date();
        const apt={id:'ai_'+n.getTime(),name:args.client_name,clientName:args.client_name,cliente:args.client_name,
          time:args.time,hora:args.time,date:args.date,fecha:args.date,job:args.service,service:args.service,
          servicio:args.service,price,precio:price,city:args.city||'',notes:args.notes||'',notas:args.notes||'',
          address:'',timestamp:n.getTime(),created_at:n.toISOString()};
        await OfflineDB.saveAppointment(apt);
        return {success:true,message:`Cita creada: ${args.client_name} el ${args.date} a las ${args.time} — ${args.service} $${price}`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'delete_appointment': {
      try{
        const apts=await OfflineDB.getAppointments();
        const q=(args.client_name||'').toLowerCase();
        const candidates=apts.filter(a=>(a.name||a.clientName||'').toLowerCase().includes(q));
        let match=null;
        if(args.date) match=candidates.find(a=>(a.date||'').startsWith(args.date));
        else if(candidates.length===1) match=candidates[0];
        else if(candidates.length>1) return {success:false,message:`Encontré ${candidates.length} citas para "${args.client_name}". Especifica la fecha.`,appointments:candidates.map(_fmtApt)};
        if(!match) return {success:false,message:'No encontré la cita.'};
        await OfflineDB.deleteAppointment(match.id||match.timestamp);
        return {success:true,message:`Cita eliminada: ${match.name||match.clientName} el ${match.date}`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'update_appointment': {
      try{
        const apts=await OfflineDB.getAppointments();
        const q=(args.client_name||'').toLowerCase();
        const candidates=apts.filter(a=>(a.name||a.clientName||'').toLowerCase().includes(q));
        let match=null;
        if(args.date) match=candidates.find(a=>(a.date||'').startsWith(args.date));
        else if(candidates.length===1) match=candidates[0];
        else if(candidates.length>1) return {success:false,message:`Encontré ${candidates.length} citas. Especifica la fecha actual.`,appointments:candidates.map(_fmtApt)};
        if(!match) return {success:false,message:'No encontré la cita.'};
        const apt={...match};
        if(args.new_name){apt.name=args.new_name;apt.clientName=args.new_name;apt.cliente=args.new_name;}
        if(args.new_date){apt.date=args.new_date;apt.fecha=args.new_date;}
        if(args.new_time){apt.time=args.new_time;apt.hora=args.new_time;}
        if(args.new_service){apt.job=args.new_service;apt.service=args.new_service;apt.servicio=args.new_service;}
        if(args.new_price){const p=parseFloat(String(args.new_price).replace(/[^0-9.]/g,''))||0;apt.price=p;apt.precio=p;}
        if(args.new_city) apt.city=args.new_city;
        if(args.new_notes!=null) apt.notes=args.new_notes;
        await OfflineDB.saveAppointment(apt);
        return {success:true,message:`✅ Cita actualizada: ${apt.name||apt.clientName} — ${apt.date} a las ${apt.time}`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'update_client': {
      try{
        let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
        const q=(args.name||'').toLowerCase();
        const idx=c.findIndex(cl=>(cl.name||'').toLowerCase().includes(q));
        if(idx===-1) return {success:false,message:`No encontré cliente con nombre "${args.name}".`};
        if(args.phone) c[idx].phone=args.phone;
        if(args.email) c[idx].email=args.email;
        if(args.city)  c[idx].city=args.city;
        if(args.notes!=null) c[idx].notes=args.notes;
        localStorage.setItem('clientRegistry',JSON.stringify(c));
        return {success:true,message:`✅ Cliente "${c[idx].name}" actualizado.`,client:c[idx]};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'delete_client': {
      try{
        let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
        const q=(args.name||'').toLowerCase();
        const before=c.length;
        c=c.filter(cl=>!(cl.name||'').toLowerCase().includes(q));
        if(c.length===before) return {success:false,message:`No encontré cliente con nombre "${args.name}".`};
        localStorage.setItem('clientRegistry',JSON.stringify(c));
        return {success:true,message:`✅ Cliente "${args.name}" eliminado del registro.`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'add_day_event': {
      try{
        const validTypes=['vacaciones','libre','compromiso','salida','sin-pega'];
        if(!validTypes.includes(args.event_type)) return {success:false,message:`Tipo inválido. Usa: ${validTypes.join('|')}`};
        let events={}; try{events=JSON.parse(localStorage.getItem('dayEvents')||'{}');}catch{}
        events[args.date]=args.event_type;
        localStorage.setItem('dayEvents',JSON.stringify(events));
        const labels={vacaciones:'Vacaciones 🏖',libre:'Día libre ✅',compromiso:'Compromiso 📅',salida:'Salida 🚗','sin-pega':'Sin trabajo 😴'};
        return {success:true,message:`✅ ${args.date} marcado como: ${labels[args.event_type]||args.event_type}`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'remove_day_event': {
      try{
        let events={}; try{events=JSON.parse(localStorage.getItem('dayEvents')||'{}');}catch{}
        if(!events[args.date]) return {success:false,message:`No hay ningún evento marcado el ${args.date}.`};
        delete events[args.date];
        localStorage.setItem('dayEvents',JSON.stringify(events));
        return {success:true,message:`✅ Evento del ${args.date} eliminado.`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'get_services': {
      try{
        const agentCfg=_getCfg();
        const _DEFAULTS=Array.isArray(agentCfg.default_services)&&agentCfg.default_services.length
          ? agentCfg.default_services : [];
        let cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');
        if(!cfg.length) cfg=_DEFAULTS;
        // Also compute usage from appointments
        let apts=[];try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
        const usage={};apts.forEach(a=>{const j=a.job||a.service||'';j.split(',').map(x=>x.trim()).filter(Boolean).forEach(s=>{usage[s]=(usage[s]||0)+1;});});
        return {count:cfg.length,services:cfg.map(s=>({name:s.name,price:s.price||s.basePrice,priceRange:s.priceRange||'',times_requested:usage[s.name]||0})),most_requested:Object.entries(usage).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([s,c])=>({service:s,count:c}))};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'update_service_price': {
      try{
        const q=(args.service_name||'').toLowerCase();
        let cfg=[]; try{cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');}catch{}
        const idx=cfg.findIndex(s=>(s.name||s.id||'').toLowerCase().includes(q));
        if(idx===-1) return {success:false,message:`No encontré servicio "${args.service_name}". Usa get_services para ver la lista.`};
        cfg[idx].price=args.price; cfg[idx].basePrice=args.price;
        localStorage.setItem('rize_services_config',JSON.stringify(cfg));
        return {success:true,message:`✅ Precio de "${cfg[idx].name}" actualizado a $${args.price}.`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'save_memory_note': {
      const mem=_getAIMem();
      const _nd=new Date();const _nds=`${_nd.getFullYear()}-${String(_nd.getMonth()+1).padStart(2,'0')}-${String(_nd.getDate()).padStart(2,'0')}`;
      mem.notes.push({content:args.content,category:args.category||'general',date:_nds});
      if(mem.notes.length>20)mem.notes=mem.notes.slice(-20);
      _saveAIMem(mem); return {success:true,message:'Nota guardada.'};
    }
    case 'get_memory': {
      const mem=_getAIMem(); let notes=mem.notes;
      if(args.category)notes=notes.filter(n=>n.category===args.category);
      return {notes,summary:mem.summary,total:mem.notes.length};
    }
    case 'github_repo': {
      try{
        const repoUrl=_getCfg().repo_url||_getBC().repoUrl||null;
        if(!repoUrl) return {error:'Repositorio no configurado en agent_config.'};
        const base=`https://api.github.com/repos/${repoUrl}/contents/`;
        const url=base+(args.path||'').replace(/^\/+/,'');
        const res=await fetch(url,{headers:{'Accept':'application/vnd.github.v3+json','User-Agent':'Business-Chat'}});
        if(!res.ok) return {error:'GitHub API error '+res.status};
        const data=await res.json();
        if(args.action==='list'){
          if(Array.isArray(data)) return {files:data.map(f=>({name:f.name,type:f.type,size:f.size,path:f.path}))};
          return data;
        } else {
          if(data.content){const full=atob(data.content.replace(/\n/g,''));const truncated=full.length>6000;return {content:truncated?full.slice(0,6000)+'\n...[archivo truncado, '+full.length+' chars total]':full,path:data.path,size:data.size,truncated};}
          return {error:'No content found'};
        }
      }catch(e){return {error:String(e)};}
    }
    case 'web_search': {
      try{
        const {systemText}=_toGeminiContents([{role:'system',content:buildSystemPrompt()}]);
        const {text,sources}=await _webSearch(args.query,systemText);
        return {result:text,sources:sources.map(s=>({title:s.title||'',url:s.uri||''}))};
      }catch(e){return {error:'Búsqueda fallida: '+e.message};}
    }
    case 'save_client_note': {
      try{
        let notes={};try{notes=JSON.parse(localStorage.getItem('rize_client_notes')||'{}');}catch{}
        const key=(args.client_name||'').toLowerCase().trim();
        if(!notes[key])notes[key]=[];
        const nd=new Date();const ds=`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}-${String(nd.getDate()).padStart(2,'0')}`;
        notes[key].push({note:args.note,date:ds});
        if(notes[key].length>30)notes[key]=notes[key].slice(-30);
        localStorage.setItem('rize_client_notes',JSON.stringify(notes));
        return {success:true,message:`Nota guardada para "${args.client_name}": ${args.note}`};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'get_client_profile': {
      try{
        const q=(args.client_name||'').toLowerCase();
        let reg={}; let clients=[];try{clients=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
        const found=clients.filter(c=>(c.name||'').toLowerCase().includes(q));
        if(found.length)reg=found[0];
        let apts=[];try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
        const clientApts=apts.filter(a=>(a.clientName||a.cliente||a.name||'').toLowerCase().includes(q))
          .sort((a,b)=>((a.date||a.fecha||'')+(a.time||a.hora||''))<((b.date||b.fecha||'')+(b.time||b.hora||''))?-1:1);
        const totalSpent=clientApts.reduce((s,a)=>s+(parseFloat(a.price||a.precio)||0),0);
        const avgTicket=clientApts.length?totalSpent/clientApts.length:0;
        let notesList=[];try{const n=JSON.parse(localStorage.getItem('rize_client_notes')||'{}');notesList=n[q]||[];}catch{}
        return {contact:reg,total_appointments:clientApts.length,total_spent:'$'+totalSpent.toFixed(2),avg_ticket:'$'+avgTicket.toFixed(2),last_5_appointments:clientApts.slice(-5).map(_fmtApt),notes:notesList};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'get_business_context': {
      const agentCfg=_getCfg(); const bc2=_getBC();
      return {
        business_name: bc2.name||agentCfg.agent_name||'—',
        phone: bc2.phone||'—', email: bc2.email||'—',
        website: bc2.website||'—', instagram: bc2.instagram||'—',
        tagline: bc2.tagline||'—',
        context: agentCfg.business_doc||'',
        app_guide: agentCfg.app_guide_doc||'',
        currency: agentCfg.currency_symbol||'$',
        language: agentCfg.language||'es',
        fixed_costs: {
          advertising_per_week: bc2.advertisingCostPerWeek || 45,
          gas_price_per_gallon: parseFloat(localStorage.getItem('gasPrice_current') || '0') || null,
          gas_last_updated: localStorage.getItem('gasPrice_lastUpdate') || null,
          mpg_estimate: bc2.mpgEstimate || 25,
          avg_miles_per_appointment: bc2.avgMilesPerAppointment || 30,
        }
      };
    }
    case 'generate_report': {
      try{
        let apts=[];try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
        const now=new Date();const curY=now.getFullYear(),curM=now.getMonth()+1;
        const freq={};const spent={};
        apts.forEach(a=>{const n=(a.clientName||a.cliente||a.name||'').trim();if(!n)return;freq[n]=(freq[n]||0)+1;spent[n]=(spent[n]||0)+(parseFloat(a.price||a.precio)||0);});
        const topClients=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,visits:count,total_spent:'$'+(spent[name]||0).toFixed(2)}));
        const returning=Object.values(freq).filter(v=>v>1).length;const total=Object.keys(freq).length;
        const retention=total?Math.round(returning/total*100):0;
        const hours={};apts.forEach(a=>{const h=(a.time||a.hora||'').slice(0,2);if(h)hours[h]=(hours[h]||0)+1;});
        const peakHours=Object.entries(hours).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([h,c])=>({hour:h+':00',appointments:c}));
        const svcs={};const svcRev={};apts.forEach(a=>{const s=a.service||a.servicio||a.job||'?';svcs[s]=(svcs[s]||0)+1;svcRev[s]=(svcRev[s]||0)+(parseFloat(a.price||a.precio)||0);});
        const topServices=Object.entries(svcs).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([s,c])=>({service:s,count:c,revenue:'$'+(svcRev[s]||0).toFixed(2)}));
        const thisMonthApts=apts.filter(a=>{const[y,m]=(a.date||a.fecha||'').split('-').map(Number);return y===curY&&m===curM;});
        const dayOfMonth=now.getDate();const daysInMonth=new Date(curY,curM,0).getDate();
        const mtdRevenue=thisMonthApts.reduce((s,a)=>s+(parseFloat(a.price||a.precio)||0),0);
        const projectedRevenue=dayOfMonth>0?Math.round(mtdRevenue/dayOfMonth*daysInMonth):0;
        return {type:args.type||'full',top_clients:topClients,retention:{returning_clients:returning,total_clients:total,rate:retention+'%'},peak_hours:peakHours,top_services:topServices,monthly:{mtd_revenue:'$'+mtdRevenue.toFixed(2),projected:'$'+projectedRevenue,days_elapsed:dayOfMonth,days_remaining:daysInMonth-dayOfMonth,appointments_this_month:thisMonthApts.length}};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'analyze_data': {
      try{
        let apts=[];try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
        const q=(args.query||'').toLowerCase();
        const now=new Date();
        const _ds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        // Día con más ingresos
        if(q.includes('max')||q.includes('más gané')||q.includes('mejor día')||q.includes('mayor ingreso')||q.includes('mas gané')){
          const byDay={};
          apts.forEach(a=>{const d=a.date||a.fecha||'';if(!d)return;if(!byDay[d])byDay[d]={rev:0,count:0,apts:[]};byDay[d].rev+=parseFloat(a.price||0);byDay[d].count++;byDay[d].apts.push(_fmtApt(a));});
          const top=Object.entries(byDay).sort((a,b)=>b[1].rev-a[1].rev).slice(0,5);
          return {best_days:top.map(([d,s])=>({date:d,revenue:'$'+s.rev.toFixed(2),appointments:s.count,detail:s.apts}))};
        }
        // Mes con más ingresos
        if(q.includes('mes')&&(q.includes('mejor')||q.includes('más')||q.includes('max'))){
          const byM={};
          apts.forEach(a=>{const m=(a.date||a.fecha||'').slice(0,7);if(!m)return;if(!byM[m])byM[m]={rev:0,count:0};byM[m].rev+=parseFloat(a.price||0);byM[m].count++;});
          const top=Object.entries(byM).sort((a,b)=>b[1].rev-a[1].rev).slice(0,6);
          return {best_months:top.map(([m,s])=>({month:m,revenue:'$'+s.rev.toFixed(2),appointments:s.count}))} ;
        }
        // Promedio por cita
        if(q.includes('promedio')||q.includes('ticket')||q.includes('average')){
          const total=apts.reduce((s,a)=>s+parseFloat(a.price||0),0);
          const avg=apts.length?total/apts.length:0;
          return {total_appointments:apts.length,total_revenue:'$'+total.toFixed(2),avg_per_appointment:'$'+avg.toFixed(2)};
        }
        // Sin teléfono
        if(q.includes('teléfono')||q.includes('sin tel')||q.includes('phone')){
          const sinTel=apts.filter(a=>{const n=(a.clientName||a.name||'').trim();return n&&!(a.phone||a.tel||'').trim();});
          return {without_phone:sinTel.length,clients:sinTel.slice(0,20).map(a=>({name:a.clientName||a.name,date:a.date,city:a.city}))};
        }
        // Por ciudad detallado
        if(q.includes('ciudad')){
          const byC={};
          apts.forEach(a=>{const c=(a.city||'').trim()||'Sin ciudad';if(!byC[c])byC[c]={rev:0,count:0};byC[c].rev+=parseFloat(a.price||0);byC[c].count++;});
          const sorted=Object.entries(byC).sort((a,b)=>b[1].rev-a[1].rev);
          return {cities:sorted.map(([c,s])=>({city:c,appointments:s.count,revenue:'$'+s.rev.toFixed(2),avg:'$'+(s.rev/s.count).toFixed(2)}))};
        }
        // Genérico: devuelve resumen completo de todos los datos
        const byDay2={};apts.forEach(a=>{const d=a.date||a.fecha||'';if(!d)return;if(!byDay2[d])byDay2[d]=0;byDay2[d]+=parseFloat(a.price||0);});
        const bestDay=Object.entries(byDay2).sort((a,b)=>b[1]-a[1])[0];
        const byM2={};apts.forEach(a=>{const m=(a.date||'').slice(0,7);if(!m)return;if(!byM2[m])byM2[m]={rev:0,count:0};byM2[m].rev+=parseFloat(a.price||0);byM2[m].count++;});
        const bestMonth=Object.entries(byM2).sort((a,b)=>b[1].rev-a[1].rev)[0];
        const total=apts.reduce((s,a)=>s+parseFloat(a.price||0),0);
        return {total_appointments:apts.length,total_revenue:'$'+total.toFixed(2),avg_ticket:'$'+(apts.length?total/apts.length:0).toFixed(2),best_day:bestDay?{date:bestDay[0],revenue:'$'+bestDay[1].toFixed(2)}:null,best_month:bestMonth?{month:bestMonth[0],revenue:'$'+bestMonth[1].rev.toFixed(2),appointments:bestMonth[1].count}:null};
      }catch(e){return{success:false,error:e.message};}
    }
    case 'get_finance': {
      try {
        const apts = await OfflineDB.getAppointments();
        const now = new Date();
        const _ld = d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const today = _ld(now);
        const p = args.period || 'month';
        let filtered = apts;
        let periodLabel = p;
        let weeksInPeriod = 4.33;
        if (p === 'week') {
          const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7)); mon.setHours(0,0,0,0);
          const sun = new Date(mon); sun.setDate(mon.getDate()+6);
          filtered = apts.filter(a=>(a.date||'')>=_ld(mon)&&(a.date||'')<=_ld(sun));
          periodLabel = `semana ${_ld(mon)} a ${_ld(sun)}`; weeksInPeriod = 1;
        } else if (p === 'month') {
          const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
          filtered = apts.filter(a=>(a.date||'').startsWith(ym));
          periodLabel = ym; weeksInPeriod = 4.33;
        } else if (p !== 'all' && p.match(/^\d{4}-\d{2}$/)) {
          filtered = apts.filter(a=>(a.date||'').startsWith(p));
          periodLabel = p; weeksInPeriod = 4.33;
        } else if (p === 'all') {
          const months = new Set(apts.map(a=>(a.date||'').slice(0,7)).filter(Boolean));
          weeksInPeriod = months.size * 4.33;
        }
        const bc2 = _getBC();
        const ADVERTISING_COST_PER_WEEK = bc2.advertisingCostPerWeek || 45;
        const gasPrice = parseFloat(localStorage.getItem('gasPrice_current') || '0');
        const mpg = bc2.mpgEstimate || 25;
        const avgMiles = bc2.avgMilesPerAppointment || 30;
        const totalIncome = filtered.reduce((s,a)=>s+(parseFloat(a.price||0)),0);
        const advertisingCost = ADVERTISING_COST_PER_WEEK * weeksInPeriod;
        // Gas cost: estimate based on avg miles/appointment, mpg, and current gas price
        const gasCostEstimated = filtered.length * (avgMiles / mpg) * (gasPrice || 3.5);
        const netIncome = totalIncome - advertisingCost - gasCostEstimated;
        const byService = {};
        filtered.forEach(a=>{const j=(a.job||a.service||'Sin servicio').split(',')[0].trim();if(!byService[j])byService[j]={count:0,revenue:0};byService[j].count++;byService[j].revenue+=parseFloat(a.price||0);});
        return {
          period: periodLabel,
          income: { total: `$${totalIncome.toFixed(2)}`, appointments: filtered.length, avg_ticket: `$${filtered.length?((totalIncome/filtered.length).toFixed(2)):0}` },
          expenses: {
            advertising: `$${advertisingCost.toFixed(2)} (publicidad $${ADVERTISING_COST_PER_WEEK}/semana × ${weeksInPeriod.toFixed(1)} semanas)`,
            gas_estimated: `$${gasCostEstimated.toFixed(2)} (estimado: ${filtered.length} citas × ${avgMiles}mi promedio, $${(gasPrice||3.5).toFixed(2)}/gal, ${mpg}mpg)`,
            total_expenses: `$${(advertisingCost+gasCostEstimated).toFixed(2)}`
          },
          net_income: `$${netIncome.toFixed(2)}`,
          margin: totalIncome > 0 ? `${((netIncome/totalIncome)*100).toFixed(1)}%` : '0%',
          by_service: Object.entries(byService).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,8).map(([s,v])=>({service:s,appointments:v.count,revenue:`$${v.revenue.toFixed(2)}`})),
          gas_price_current: gasPrice ? `$${gasPrice}/galón` : 'No disponible'
        };
      } catch(e) { return {error: e.message}; }
    }
    default: return {error:'Herramienta no disponible: '+name};
  }
}

// ── Gemini API ─────────────────────────────────────────────────────────────
// gemini-2.5-flash primero: mejor balance inteligencia/velocidad para un agente conversacional
const _GEMINI_MODELS=['gemini-2.5-flash-preview-05-20','gemini-2.5-flash','gemini-2.5-pro-preview-05-06','gemini-2.5-pro-exp-03-25','gemini-2.5-pro','gemini-2.0-flash-exp','gemini-2.0-flash-lite','gemini-1.5-flash-latest','gemini-1.5-flash-002','gemini-1.5-flash','gemini-1.5-pro'];

async function _resolveModel(){
  if(_geminiModel) return _geminiModel;
  const key=localStorage.getItem('rize_gemini_key');
  if(!key) throw new Error('⚠️ API Key no configurada. Toca el ícono de ajustes.');
  for(const m of _GEMINI_MODELS){
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}?key=${encodeURIComponent(key)}`);
    if(r.ok){_geminiModel=m;localStorage.setItem('rize_gemini_model',m);return m;}
  }
  throw new Error('⚠️ No se encontró un modelo Gemini disponible para tu API key.');
}

function _toGeminiContents(messages){
  let systemText=''; const contents=[];
  for(const msg of messages){
    if(msg.role==='system'){systemText=msg.content;continue;}
    if(msg.role==='user'){
      const parts=typeof msg.content==='string'?[{text:msg.content}]:[];
      contents.push({role:'user',parts});
    } else if(msg.role==='assistant'){
      const parts=[];
      if(msg.content)parts.push({text:msg.content});
      if(msg.tool_calls)msg.tool_calls.forEach(tc=>{let a={};try{a=JSON.parse(tc.function.arguments);}catch{}parts.push({functionCall:{name:tc.function.name,args:a}});});
      if(parts.length)contents.push({role:'model',parts});
    } else if(msg.role==='tool'){
      let response={};try{response=JSON.parse(msg.content);}catch{response={result:msg.content};}
      const last=contents[contents.length-1];
      if(last&&last.role==='user'&&last.parts[0]?.functionResponse)last.parts.push({functionResponse:{name:msg.name,response}});
      else contents.push({role:'user',parts:[{functionResponse:{name:msg.name,response}}]});
    }
  }
  return {systemText,contents};
}

function _toGeminiTools(tools){
  return [{function_declarations:tools.map(t=>({name:t.function.name,description:t.function.description,parameters:t.function.parameters}))}];
}

async function _geminiCall(systemText,contents,tools=null,genConfig={},attempt=0){
  const key=localStorage.getItem('rize_gemini_key');
  if(!key) throw new Error('⚠️ API Key no configurada. Toca el ícono de ajustes.');
  const model=await _resolveModel();
  const body={contents,...(systemText&&{systemInstruction:{parts:[{text:systemText}]}}),...(tools&&{tools:_toGeminiTools(tools),toolConfig:{function_calling_config:{mode:'AUTO'}}}),generationConfig:{maxOutputTokens:2048,temperature:0.8,...genConfig}};
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(res.status===429&&attempt<2){
    _updateThinking('Esperando límite de API…');
    await new Promise(r=>setTimeout(r,4000+attempt*3000));
    return _geminiCall(systemText,contents,tools,genConfig,attempt+1);
  }
  return res;
}

// ── Groq Vision (imágenes) ─────────────────────────────────────────────────
async function callGroqVisionAPI(userText, imageBase64, imageMime='image/jpeg'){
  const groqKey=localStorage.getItem('rize_groq_key');
  if(!groqKey) return null;
  const models=['meta-llama/llama-4-scout-17b-16e-instruct','llama-3.2-90b-vision-preview','llama-3.2-11b-vision-preview'];
  for(const model of models){
    try{
      const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},
        body:JSON.stringify({model,messages:[{role:'user',content:[
          {type:'text',text:userText},
          {type:'image_url',image_url:{url:`data:${imageMime};base64,${imageBase64}`}}
        ]}],max_tokens:1024,temperature:0.2})
      });
      if(res.status===404||res.status===400) continue;
      if(!res.ok) return null;
      const data=await res.json();
      return data.choices?.[0]?.message?.content||null;
    }catch(e){ continue; }
  }
  return null;
}

// ── Gemini Vision (fallback para imágenes) ─────────────────────────────────
async function callGeminiVision(userText, imageBase64=null, imageMime='image/jpeg'){
  const _ocrDefault = 'Cuando ves un screenshot de conversación (WhatsApp, Messenger, texto), extrae los campos de agendamiento: Nombre completo, Fecha, Hora, Ciudad, Dirección, Tipo de trabajo/servicio, Precio, Notas. Lee todos los mensajes visibles. Si un dato no aparece escribe "No especificado". Responde en español.';
  const sysPrompt = imageBase64
    ? (_getCfg().image_ocr_prompt || _ocrDefault)
    : buildSystemPrompt();
  const parts=[];
  if(imageBase64) parts.push({inlineData:{mimeType:imageMime,data:imageBase64}});
  parts.push({text:userText});
  const contents=[{role:'user',parts}];
  try{
    const res=await _geminiCall(sysPrompt,contents,null,{maxOutputTokens:1024,temperature:0.3});
    if(!res.ok){const err=await res.json().catch(()=>({}));return '⚠️ Error: '+(err.error?.message||res.status);}
    const data=await res.json();
    return data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim()||'';
  }catch(e){return '⚠️ Error de conexión: '+e.message;}
}

// ── Resize image before sending ────────────────────────────────────────────
function _resizeImageForAI(base64, mime, maxPx=800){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,maxPx/Math.max(img.width,img.height));
      const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      resolve(c.toDataURL('image/jpeg',0.82).split(',')[1]);
    };
    img.src=`data:${mime};base64,${base64}`;
  });
}

// ── Agent tool labels ──────────────────────────────────────────────────────
const _TOOL_LABELS={search_appointments:'Buscando citas…',get_appointments:'Cargando citas…',get_stats:'Calculando estadísticas…',search_clients:'Buscando clientes…',add_client:'Agregando cliente…',update_client:'Actualizando cliente…',delete_client:'Eliminando cliente…',create_appointment:'Creando cita…',delete_appointment:'Eliminando cita…',update_appointment:'Actualizando cita…',add_day_event:'Marcando día…',remove_day_event:'Quitando evento…',get_services:'Cargando servicios…',update_service_price:'Actualizando precio…',save_memory_note:'Guardando en memoria…',get_memory:'Leyendo memoria…',web_search:'Buscando en internet…',save_client_note:'Guardando nota del cliente…',get_client_profile:'Cargando perfil del cliente…',generate_report:'Generando análisis…'};

// ── Google Search grounding ────────────────────────────────────────────────
const _SEARCH_INTENT=/\b(busca(?:me|r|lo|la|nos)?|b[uú]squeda|googlea(?:me|lo|la|s)?|investiga|consulta|mira|checa|revisa|dime qu[eé]|qu[eé] es|qu[eé] hay|qu[eé] dice|buscar)\b/i;
const _SEARCH_WEB=/\b(internet|google|la web|la\s+red|online|en\s+l[ií]nea|en\s+la\s+web)\b/i;
function _isSearchReq(t){ return (_SEARCH_INTENT.test(t)&&_SEARCH_WEB.test(t))||/\bgooglea\b/i.test(t); }

async function _webSearch(userText,systemText){
  const key=localStorage.getItem('rize_gemini_key');
  if(!key) throw new Error('⚠️ API Key no configurada.');
  const model=await _resolveModel();
  const body={
    contents:[{role:'user',parts:[{text:userText}]}],
    tools:[{googleSearch:{}}],
    ...(systemText&&{systemInstruction:{parts:[{text:systemText}]}}),
    generationConfig:{maxOutputTokens:2048,temperature:0.6}
  };
  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!res.ok) throw new Error('search_failed');
  const data=await res.json();
  const text=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  const chunks=data.candidates?.[0]?.groundingMetadata?.groundingChunks||[];
  const sources=chunks.map(c=>c.web).filter(w=>w?.uri);
  // deduplicate by domain
  const seen=new Set(); const uniq=sources.filter(s=>{const d=new URL(s.uri).hostname;return seen.has(d)?false:(seen.add(d),true);});
  return {text,sources:uniq.slice(0,5)};
}

// ── Agent loop ─────────────────────────────────────────────────────────────
// ── Claude Code Bridge (opcional) ─────────────────────────────────────────
const _CLAUDE_GIST='https://gist.githubusercontent.com/JMR-Independent/4e21e868b2becb1423d9af5543ad85b3/raw/claude_webhook.json';
let _claudeWebhookUrl=null;
async function _getClaudeUrl(){
  if(_claudeWebhookUrl) return _claudeWebhookUrl;
  try{const r=await fetch(_CLAUDE_GIST+'?t='+Date.now());const d=await r.json();_claudeWebhookUrl=d.url||null;}catch{}
  return _claudeWebhookUrl;
}
async function _claudeCall(userText){
  const url=await _getClaudeUrl();
  if(!url) throw new Error('⚠️ Claude Bridge no disponible.');
  const history=_history.slice(-10).map(m=>`${m.role==='user'?'Usuario':'Asistente'}: ${String(m.content).slice(0,300)}`).join('\n');
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:userText,history})});
  if(!res.ok) throw new Error('⚠️ Error conectando con Claude Code ('+res.status+').');
  const data=await res.json();
  _claudeWebhookUrl=null; // refrescar URL en próxima llamada por si cambió
  return data.reply||'Sin respuesta.';
}

async function runAgent(userText){
  // Claude Code Bridge — activo si no hay Gemini key, o si claude_mode está forzado
  if(!localStorage.getItem('rize_gemini_key') || localStorage.getItem('rize_claude_mode')) return await _claudeCall(userText);
  // Garantizar que agent_config esté cargado antes de construir el prompt
  await _loadAgentConfig();
  // Internet search trigger
  if(_isSearchReq(userText)){
    _updateThinking('Buscando en internet…');
    const {systemText}=_toGeminiContents([{role:'system',content:buildSystemPrompt()}]);
    try{
      const {text,sources}=await _webSearch(userText,systemText);
      if(text){
        let reply=text;
        if(sources.length){
          reply+='\n\n<div class="md-sources"><strong>Fuentes</strong><br>'+
            sources.map((s,i)=>`${i+1}. <a href="${s.uri}" target="_blank">${s.title||new URL(s.uri).hostname}</a>`).join('<br>')+
            '</div>';
        }
        return reply;
      }
    }catch(e){}
    // fallback to normal if search fails
  }

  const allMsgs=[{role:'system',content:buildSystemPrompt()},..._history,{role:'user',content:userText}];
  for(let i=0;i<8;i++){
    const {systemText,contents}=_toGeminiContents(allMsgs);
    const res=await _geminiCall(systemText,contents,AI_TOOLS);
    if(!res.ok){const err=await res.json().catch(()=>({}));
      if(res.status===400) throw new Error('⚠️ Error: '+(err.error?.message||'solicitud inválida'));
      if(res.status===401||res.status===403) throw new Error('⚠️ API Key inválida. Toca el ícono de ajustes.');
      if(res.status===429) throw new Error('⚠️ Límite de API alcanzado. Espera 1 minuto.');
      throw new Error('⚠️ Error '+(err.error?.message||res.status));}
    const data=await res.json();
    const candidate=data.candidates?.[0];
    const finishReason=candidate?.finishReason;
    const blockReason=data.promptFeedback?.blockReason;

    // Prompt was blocked entirely (SAFETY at prompt level)
    if(blockReason){
      return 'No pude procesar esa solicitud. Intenta reformularla.';
    }

    const parts=candidate?.content?.parts||[];
    const funcParts=parts.filter(p=>p.functionCall);
    const responseText=parts.filter(p=>p.text).map(p=>p.text).join('');

    if(!funcParts.length){
      if(responseText){
        const mem=_getAIMem();mem.total_messages=(mem.total_messages||0)+1;_saveAIMem(mem);
        return responseText;
      }
      // SAFETY/RECITATION — retrying same content won't help
      if(finishReason==='SAFETY'||finishReason==='RECITATION'){
        return 'No pude generar una respuesta para eso. Intenta reformular la pregunta.';
      }
      // MAX_TOKENS — partial response cut off, return what we have or retry
      if(finishReason==='MAX_TOKENS' && i<6){
        allMsgs.push({role:'user',content:'Continúa.'});
        continue;
      }
      // STOP with empty parts — retry once with a nudge
      if(i===0){
        await new Promise(r=>setTimeout(r,400));
        continue;
      }
      // Genuinely exhausted — human-friendly message
      const mem=_getAIMem();mem.total_messages=(mem.total_messages||0)+1;_saveAIMem(mem);
      return '¿Puedes repetir eso? No capté bien la solicitud.';
    }
    allMsgs.push({role:'assistant',content:responseText||null,tool_calls:funcParts.map((p,idx)=>({id:'c'+i+'_'+idx,type:'function',function:{name:p.functionCall.name,arguments:JSON.stringify(p.functionCall.args)}}))});
    for(const fp of funcParts){
      _updateThinking(_TOOL_LABELS[fp.functionCall.name]||fp.functionCall.name);
      const result=await executeTool(fp.functionCall.name,fp.functionCall.args);
      allMsgs.push({role:'tool',tool_call_id:'c'+i,name:fp.functionCall.name,content:JSON.stringify(result)});
    }
    if(i<7) await new Promise(r=>setTimeout(r,300));
  }
  return 'Alcancé el límite de operaciones. Intenta con una pregunta más específica.';
}

// ── UI helpers ─────────────────────────────────────────────────────────────
function showToast(msg, ms=2200){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),ms);
}

function _onInputChange(){
  const inp=document.getElementById('msg-input');
  const btn=document.getElementById('send-btn');
  const hasText=inp.value.trim().length>0;
  btn.classList.toggle('active',hasText);
}

function _sendOrHF(){
  if(document.getElementById('msg-input').value.trim()) sendMessage();
  else toggleHandsFree();
}

function _getInputText(){ return document.getElementById('msg-input').value.trim(); }

function _clearInput(){
  const el=document.getElementById('msg-input');
  el.value=''; el.style.height='auto';
  _onInputChange();
}

function _setInputEnabled(on){
  const btn=document.getElementById('send-btn');
  const inp=document.getElementById('msg-input');
  btn.disabled=!on;
  // Never disable/readOnly the textarea — iOS triggers keyboard on re-enable
  // Use opacity only as visual feedback; _busy flag blocks double-sends
  if(on){ inp.style.opacity='1'; } else { inp.style.opacity='0.5'; }
}

// ── Spacer: empuja mensajes hacia abajo hasta que llenen el contenedor ──────
function _ensureSpacer(){
  const wrap=document.getElementById('messages');
  if(!document.getElementById('msg-spacer')){
    const sp=document.createElement('div');
    sp.id='msg-spacer';sp.style.cssText='flex:1;min-height:0;';
    wrap.insertBefore(sp,wrap.firstChild);
  }
}

// ── Copy button helper ─────────────────────────────────────────────────────
function _makeCopyBar(text, isUser){
  const bar=document.createElement('div');
  bar.className='copy-bar'+(isUser?' user':'');
  const btn=document.createElement('button');
  btn.className='copy-icon-btn';
  btn.textContent='⧉';
  btn.onclick=()=>{
    const copy=()=>{ btn.textContent='✓'; btn.style.color='#10a37f'; setTimeout(()=>{ btn.textContent='⧉'; btn.style.color=''; },1500); };
    if(navigator.clipboard){ navigator.clipboard.writeText(text).then(copy).catch(copy); }
    else{ try{ const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);copy(); }catch(e){} }
  };
  bar.appendChild(btn);
  return bar;
}

// ── Add user bubble (sync scroll — leer scrollHeight fuerza reflow) ────────
function _addUserBubble(text){
  const wrap=document.getElementById('messages');
  const es=document.getElementById('empty-state');
  if(es) es.remove();
  _ensureSpacer();
  const row=document.createElement('div');
  row.className='ai-msg user';
  const bub=document.createElement('div');
  bub.className='bubble-user';
  bub.textContent=text;
  const userCol=document.createElement('div');
  userCol.style.cssText='display:flex;flex-direction:column;align-items:flex-end;max-width:78%;';
  bub.style.maxWidth='100%';
  userCol.appendChild(bub);
  userCol.appendChild(_makeCopyBar(text, true));
  row.appendChild(userCol);
  wrap.appendChild(row);
  wrap.scrollTop=wrap.scrollHeight; // sincrónico: leer scrollHeight fuerza reflow
}

// ── Stream AI bubble word by word ─────────────────────────────────────────
// ── Markdown renderer ──────────────────────────────────────────────────────
function _inlineMd(t){
  return t
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/_(.+?)_/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code>$1</code>');
}
function _renderMd(text){
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Extract HTML blocks into placeholders BEFORE line processing (avoids escaping)
  const blocks=[];
  const ph=s=>{const i=blocks.length;blocks.push(s);return `\x00B${i}\x00`;};
  // 1. Artifact cards (already rendered HTML)
  text=text.replace(/<div class="artifact-card"[\s\S]*?<\/div>/g,m=>ph(m));
  // 2. Sources block
  text=text.replace(/<div class="md-sources">[\s\S]*?<\/div>/g,m=>ph(m));
  // 3. Fenced code blocks → rendered <pre>
  text=text.replace(/```(\w+)?\n([\s\S]+?)```/g,(_,lang,code)=>ph(`<pre style="background:rgba(255,255,255,0.07);border-radius:8px;padding:10px 12px;overflow-x:auto;margin:6px 0"><code style="font-family:ui-monospace,monospace;font-size:12.5px;color:rgba(255,255,255,0.85)">${esc(code.trim())}</code></pre>`));
  const lines=text.split('\n');
  let html='',inUl=false,inOl=false;
  const closeL=()=>{ if(inUl){html+='</ul>';inUl=false;} if(inOl){html+='</ol>';inOl=false;} };
  for(const raw of lines){
    const line=raw.trimEnd();
    if(!/^\s*[-•*]\s/.test(line)&&inUl){html+='</ul>';inUl=false;}
    if(!/^\s*\d+\.\s/.test(line)&&inOl){html+='</ol>';inOl=false;}
    if(/^###\s/.test(line)){html+=`<h4>${_inlineMd(esc(line.slice(4)))}</h4>`;continue;}
    if(/^##\s/.test(line)){html+=`<h3>${_inlineMd(esc(line.slice(3)))}</h3>`;continue;}
    if(/^#\s/.test(line)){html+=`<h3>${_inlineMd(esc(line.slice(2)))}</h3>`;continue;}
    if(/^---+$/.test(line.trim())){closeL();html+='<hr>';continue;}
    if(/^\s*[-•*]\s/.test(line)){if(!inUl){html+='<ul>';inUl=true;}html+=`<li>${_inlineMd(esc(line.replace(/^\s*[-•*]\s+/,'')))}</li>`;continue;}
    if(/^\s*\d+\.\s/.test(line)){if(!inOl){html+='<ol>';inOl=true;}html+=`<li>${_inlineMd(esc(line.replace(/^\s*\d+\.\s+/,'')))}</li>`;continue;}
    if(!line.trim()){html+='<br>';continue;}
    html+=`<p>${_inlineMd(esc(line))}</p>`;
  }
  closeL();
  // Restore HTML blocks from placeholders
  html=html.replace(/\x00B(\d+)\x00/g,(_,i)=>blocks[+i]||'');
  return html;
}

async function _streamBubble(text){
  const wrap=document.getElementById('messages');
  const es=document.getElementById('empty-state');
  if(es) es.remove();
  _ensureSpacer();

  const row=document.createElement('div');
  row.className='ai-msg';
  const av=document.createElement('div');
  av.className='msg-av';
  av.innerHTML='<img src="./images/agenda-logo.jpg">';
  const bub=document.createElement('div');
  bub.className='bubble-ai';
  const aiCol=document.createElement('div');
  aiCol.style.cssText='display:flex;flex-direction:column;min-width:0;max-width:82%;';
  aiCol.appendChild(bub);
  row.appendChild(av);
  row.appendChild(aiCol);
  wrap.appendChild(row);

  const cursor=document.createElement('span');
  cursor.textContent='▋';
  cursor.style.cssText='opacity:1;animation:aiCursor 0.7s step-end infinite;color:rgba(255,255,255,0.4);font-size:12px;';
  bub.appendChild(cursor);

  const newArts=_extractArtifacts(text);

  if(newArts.length){
    // Split text around first artifact
    const art0=newArts[0];
    const splitIdx=text.indexOf(art0.full);
    const textBefore=splitIdx>0?text.substring(0,splitIdx).trim():'';
    const textAfter=text.substring(splitIdx+art0.full.length).trim();

    // Render text before artifact immediately (formatted)
    if(textBefore){
      const tmpDiv=document.createElement('div');
      tmpDiv.innerHTML=_renderMd(textBefore);
      while(tmpDiv.firstChild) bub.insertBefore(tmpDiv.firstChild,cursor);
      wrap.scrollTop=wrap.scrollHeight;
    }

    // Show "Creando documento..." loader (code stays hidden)
    const loader=document.createElement('div');
    loader.className='artifact-creating';
    loader.innerHTML=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span class="artifact-creating-text">Creando documento<span class="creating-dots"><span>.</span><span>.</span><span>.</span></span></span>`;
    bub.insertBefore(loader,cursor);
    wrap.scrollTop=wrap.scrollHeight;

    // Brief pause while "creating"
    await new Promise(r=>setTimeout(r,1300));

    // Done — remove loader and cursor, register artifacts
    loader.remove();
    cursor.remove();
    const startIdx=window._artifacts.length;
    window._artifacts.push(...newArts);

    // Build cards
    const cards=newArts.map((art,i)=>{
      const idx=startIdx+i;
      const _docSVG=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
      return `<div class="artifact-card" onclick="openArtifact(${idx})"><div class="artifact-card-icon">${_docSVG}</div><div class="artifact-card-info"><div class="artifact-card-title">${art.title}</div><div class="artifact-card-sub">${_ART_LABELS[art.lang]||'Documento'} · ${(art.lang||'html').toUpperCase()}</div></div></div>`;
    }).join('');

    // Final render: text + card(s) + text after
    let finalHtml='';
    if(textBefore) finalHtml+=_renderMd(textBefore);
    finalHtml+=cards;
    if(textAfter){
      const srcMatch=textAfter.match(/^([\s\S]*?)(<div class="md-sources">[\s\S]*<\/div>)$/);
      finalHtml+=srcMatch?_renderMd(srcMatch[1])+srcMatch[2]:_renderMd(textAfter);
    }
    bub.innerHTML=finalHtml;
    // NO auto-open — user taps the card to open

  } else {
    // Render markdown fully, then reveal block by block (streaming feel, correct format)
    cursor.remove();
    const srcMatch=text.match(/^([\s\S]*?)(<div class="md-sources">[\s\S]*<\/div>)$/);
    bub.innerHTML=srcMatch?_renderMd(srcMatch[1])+srcMatch[2]:_renderMd(text);
    // Remove all blocks from DOM, then re-append one by one with delay
    const blocks=Array.from(bub.children);
    blocks.forEach(b=>b.remove());
    const delay=blocks.length>15?40:blocks.length>8?60:80;
    for(let i=0;i<blocks.length;i++){
      const b=blocks[i];
      b.style.animation='aiFadeIn 0.15s ease';
      bub.appendChild(b);
      wrap.scrollTop=wrap.scrollHeight;
      await new Promise(r=>setTimeout(r,delay));
    }
  }
  wrap.scrollTop=wrap.scrollHeight;
  // Add copy bar below AI bubble
  aiCol.appendChild(_makeCopyBar(text, false));
  // Ensure keyboard stays down after streaming
  setTimeout(()=>{ const i=document.getElementById('msg-input'); if(i) i.blur(); },50);
}

// ── Thinking indicator ─────────────────────────────────────────────────────
function _showThinking(){
  const wrap=document.getElementById('messages');
  const es=document.getElementById('empty-state');
  if(es) es.remove();
  _ensureSpacer();
  const row=document.createElement('div');
  row.className='ai-msg'; row.id='thinking-row';
  row.innerHTML=`<div class="msg-av"><img src="./images/agenda-logo.jpg"></div>
    <div class="thinking-wrap">
      <div class="thinking-dots"><span></span><span></span><span></span></div>
      <span class="thinking-status" id="thinking-status"></span>
    </div>`;
  wrap.appendChild(row);
  wrap.scrollTop=wrap.scrollHeight;
  _thinkingEl=row;
}

function _updateThinking(text){
  const el=document.getElementById('thinking-status');
  if(el) el.textContent=text;
}

function _removeThinking(){
  if(_thinkingEl){_thinkingEl.remove();_thinkingEl=null;}
}

// ── Send message ───────────────────────────────────────────────────────────
async function sendMessage(){
  document.getElementById('msg-input').blur();
  if(_busy) return;
  const text=_getInputText();
  if(!text) return;
  _clearInput();
  _history.push({role:'user',content:text});
  _addUserBubble(text);
  _saveHistoryMsg('user', text); // Phase 1: persist
  _busy=true; _setInputEnabled(false); _showThinking();
  await _ensureSynced(); // garantiza que Supabase cargó antes de construir el prompt
  _semanticCtx = await _semanticSearch(text); // Phase 3: semantic context
  try{
    const reply=await runAgent(text);
    _removeThinking();
    _history.push({role:'assistant',content:reply});
    _saveHistoryMsg('assistant', reply); // Phase 1: persist
    await _streamBubble(reply);
    if(_history.length>20) _history=_history.slice(-20);
    _lg_fullSync(); // propagate any tool-created data back to cookies
    _resetInactivityTimer(); // Phase 2: inactivity countdown
    _saveEmbedding(text, reply); // Phase 3: embed pair in background
    const _mem=_getAIMem();
    if((_mem.total_messages||0)%8===0 && (_mem.total_messages||0)>0) _autoExtractFacts(); // Phase 4
  }catch(e){
    _removeThinking();
    await _streamBubble(e.message||'Error desconocido.');
  } finally {
    _busy=false; _setInputEnabled(true);
    if(window._handsFree){ setTimeout(()=>_hfListen(),700); }
  }
}

// ── Resolve day string to YYYY-MM-DD ──────────────────────────────────────
function _resolveDate(day) {
  if (!day) return '';
  const d = day.trim().toLowerCase();
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  if (d === 'hoy' || d === 'today') return fmt(now);
  if (d === 'mañana' || d === 'tomorrow') { const t=new Date(now); t.setDate(t.getDate()+1); return fmt(t); }
  // MM/DD or DD/MM
  const slashMatch = d.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const m=parseInt(slashMatch[1]), dd=parseInt(slashMatch[2]);
    const yr = now.getFullYear();
    const candidate = new Date(yr, m-1, dd);
    if (candidate < now) candidate.setFullYear(yr+1);
    return fmt(candidate);
  }
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  // Day of week
  const days = {lunes:1,monday:1,martes:2,tuesday:2,miércoles:3,miercoles:3,wednesday:3,jueves:4,thursday:4,viernes:5,friday:5,sábado:6,sabado:6,saturday:6,domingo:0,sunday:0};
  if (days[d] !== undefined) {
    const target = days[d];
    const diff = (target - now.getDay() + 7) % 7 || 7;
    const next = new Date(now); next.setDate(now.getDate()+diff);
    return fmt(next);
  }
  return '';
}

// ── Render appointment card in chat ───────────────────────────────────────
function _renderApptCard(data) {
  const row = document.createElement('div');
  row.className = 'ai-msg';
  const av = document.createElement('div');
  av.className = 'msg-av';
  av.innerHTML = '<img src="./images/agenda-logo.jpg" onerror="this.style.display=\'none\'">';

  const date = _resolveDate(data.day || data.date || '');
  // Strip any $ symbols from price (AI sometimes includes them despite instructions)
  let cleanPrice = String(data.price || '').replace(/\$/g, '').trim();
  // Post-processing: reject price if it matches a known service base price (those come from ads, not agreements)
  if (cleanPrice) {
    try {
      const cfg = JSON.parse(localStorage.getItem('rize_services_config') || '[]');
      const basePrices = cfg.map(s => String(s.basePrice || s.price || '')).filter(Boolean);
      if (basePrices.includes(cleanPrice)) cleanPrice = '';
    } catch {}
  }
  const appt = {
    name: data.name || '',
    time: data.time || '',
    city: data.city || '',
    address: data.address || '',
    job: data.job || '',
    price: cleanPrice,
    date,
    notes: data.notes || '',
    timestamp: Date.now(),
    created_at: new Date().toISOString()
  };

  const field = (label, val) => val
    ? `<div class="appt-card-row"><span class="appt-card-label">${label}</span><span class="appt-card-val">${val}</span></div>`
    : `<div class="appt-card-row appt-card-missing"><span class="appt-card-label">${label}</span><span class="appt-card-val">—</span></div>`;

  const dateLabel = date ? date : (data.day || '—');

  const card = document.createElement('div');
  card.className = 'appt-card';
  card.innerHTML = `
    <div class="appt-card-header">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Cita detectada
    </div>
    <div class="appt-card-body">
      ${field('Cliente', appt.name)}
      ${field('Fecha', dateLabel)}
      ${field('Hora', appt.time)}
      ${field('Ciudad', appt.city)}
      ${field('Dirección', appt.address)}
      ${field('Servicio', appt.job)}
      ${field('Precio', appt.price ? '$'+appt.price : '')}
      ${appt.notes ? field('Notas', appt.notes) : ''}
    </div>
    <div class="appt-card-footer">
      <button class="appt-schedule-btn" id="appt-btn-${appt.timestamp}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        Agendar
      </button>
    </div>`;

  row.appendChild(av);
  row.appendChild(card);
  document.getElementById('messages').appendChild(row);
  document.getElementById('messages').scrollTop = 99999;

  // Button action
  document.getElementById('appt-btn-'+appt.timestamp).addEventListener('click', async function() {
    this.disabled = true;
    this.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Guardando…';
    try {
      await _saveApptFromChat(appt);
      this.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> ¡Agendada!';
      this.style.background = 'rgba(16,163,127,0.35)';
    } catch(e) {
      this.disabled = false;
      this.innerHTML = '⚠️ Error — reintentar';
    }
  });
}

// ── Save appointment from chat to localStorage + Supabase ─────────────────
async function _saveApptFromChat(appt) {
  // Use the app's OfflineDB system (handles localStorage + Supabase + UI refresh)
  if (typeof OfflineDB !== 'undefined' && OfflineDB.saveAppointment) {
    await OfflineDB.saveAppointment(appt);
    if (typeof loadAppointments === 'function') await loadAppointments();
    if (typeof saveToClientRegistry === 'function') saveToClientRegistry(appt);
  } else {
    // Fallback: raw localStorage push
    let apts = [];
    try { apts = JSON.parse(localStorage.getItem('appointments') || '[]'); } catch {}
    apts.push(appt);
    localStorage.setItem('appointments', JSON.stringify(apts));
  }
}

// ── File upload (imagen) ───────────────────────────────────────────────────
async function handleFileUpload(event){
  const file=event.target.files[0]; if(!file) return; event.target.value='';
  if(_busy) return;
  _addUserBubble('📎 '+file.name);
  _busy=true; _setInputEnabled(false); _showThinking();
  try{
    if(file.type.startsWith('image/')){
      const base64Raw=await new Promise((res,rej)=>{
        const reader=new FileReader();
        reader.onload=e=>res(e.target.result.split(',')[1]);
        reader.onerror=rej;
        reader.readAsDataURL(file);
      });
      const base64=await _resizeImageForAI(base64Raw,file.type,800);
      const prompt=`Analiza esta imagen de conversación (WhatsApp, Messenger, SMS) y extrae los datos de la cita de limpieza.
Responde ÚNICAMENTE con JSON válido sin texto adicional:
{"name":"","time":"","day":"","city":"","address":"","job":"","price":"","notes":""}

SERVICIO (job) — usa EXACTAMENTE uno o más de estos nombres, separados por coma. NO copies texto literal:
- "Alfombras" → alfombras, carpets, carpet cleaning
- "Sillones" → sillón, sofá, couch, sofa
- "Sillas" → sillas, chairs
- "Sala" → sala, living room
- "Cuartos" → cuartos, habitaciones, bedrooms, rooms
- "Escaleras" → escaleras, stairs
- "Pasillo" → pasillo, hallway
- "Colchón" → colchón, mattress
- "Auto" → carro, auto, car, vehicle, detailing
- Puedes combinar: "Alfombras, Sillones"
- Si no puedes determinarlo: deja job VACÍO

PRECIO (price) — SOLO el número sin $ ni símbolos. SOLO si hay precio ACORDADO entre las personas de la conversación ("te cobro 120", "son 150", "quedamos en 80"). JAMÁS uses precios de anuncios, publicidad o flyers (ej: "limpia tus alfombras $30" es publicidad, NO es acuerdo). Si no hay acuerdo explícito en el chat: deja price ABSOLUTAMENTE VACÍO ("").

- time: 24h HH:MM ("2pm"→"14:00","10am"→"10:00","noon"→"12:00")
- day: día en español, "mañana", "hoy", fecha MM/DD o YYYY-MM-DD
- Si un dato no aparece: deja el campo VACÍO. NO inventes datos.`;
      const raw=(await callGroqVisionAPI(prompt,base64,'image/jpeg'))||(await callGeminiVision(prompt,base64,'image/jpeg'));
      _history.push({role:'user',content:'[Imagen: '+file.name+']'});
      _removeThinking();
      // Try to parse as appointment JSON
      const jsonMatch = (raw||'').replace(/```json\s*/g,'').replace(/```\s*/g,'').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[0]);
          if (Object.values(data).some(v => v && String(v).trim())) {
            _renderApptCard(data);
            _history.push({role:'assistant',content:'[Tarjeta de cita mostrada]'});
            return;
          }
        } catch {}
      }
      // Fallback: show as text
      const reply = raw || 'No pude extraer datos de la imagen.';
      await _streamBubble(reply);
      _history.push({role:'assistant',content:reply});
    } else {
      const reply=await callGeminiVision('Se adjuntó archivo: '+file.name+'. ¿Cómo ayudo?')||'No pude procesar el archivo.';
      _history.push({role:'user',content:'[Archivo: '+file.name+']'});
      _removeThinking();
      await _streamBubble(reply);
      _history.push({role:'assistant',content:reply});
    }
  }catch(e){
    _removeThinking();
    await _streamBubble(e.message||'Error al procesar el archivo.');
  } finally {
    _busy=false; _setInputEnabled(true);
    document.activeElement && document.activeElement.blur();
  }
}

// ── Hands-free mode ─────────────────────────────────────────────────────────
// Uses WebSpeech (webkitSpeechRecognition) — native iOS, no AudioContext needed,
// auto-detects end of speech, works programmatically after permission granted.
window._handsFree=false;

function toggleHandsFree(){
  window._handsFree=!window._handsFree;
  const mic=document.getElementById('send-mic-icon');
  if(mic) mic.style.color=window._handsFree?'#4ade80':'rgba(255,255,255,0.6)';
  if(window._handsFree){
    showToast('Manos libres activado');
    // Dismiss focus overlay and keyboard
    const ov=document.getElementById('focus-overlay'); if(ov) ov.style.display='none';
    document.activeElement && document.activeElement.blur();
    document.getElementById('msg-input').blur();
    // Start listening immediately (this tap IS the user gesture)
    _hfListen();
  } else {
    if(window._chatRecorder){ window._chatRecorder.stop(); }
    if(window._hfSpeechRec){ try{window._hfSpeechRec.abort();}catch(e){} window._hfSpeechRec=null; }
    showToast('Manos libres desactivado');
  }
}

function _hfListen(){
  if(!window._handsFree || _busy) return;
  if(window._hfSpeechRec){ try{window._hfSpeechRec.abort();}catch(e){} window._hfSpeechRec=null; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ showToast('Voz no disponible en este navegador'); return; }

  const _startRec=()=>{
    if(!window._handsFree) return;
    const rec=new SR();
    rec.lang='es-US'; rec.interimResults=false; rec.maxAlternatives=1;
    window._hfSpeechRec=rec;
    const wf=document.getElementById('ai-waveform');
    if(wf) wf.classList.add('active');
    rec.onresult=(e)=>{
      const text=(e.results[0][0].transcript||'').trim();
      if(!text) return;
      if(/^stop$/i.test(text)){ toggleHandsFree(); return; }
      const inp=document.getElementById('msg-input');
      inp.value=text;
      inp.style.height='auto';
      inp.style.height=Math.min(inp.scrollHeight,130)+'px';
      _onInputChange();
      setTimeout(()=>sendMessage(),300);
    };
    rec.onend=()=>{ if(wf) wf.classList.remove('active'); window._hfSpeechRec=null; };
    rec.onerror=(e)=>{
      if(wf) wf.classList.remove('active'); window._hfSpeechRec=null;
      if(e.error==='no-speech' && window._handsFree && !_busy){
        setTimeout(()=>_hfListen(),500);
      }
    };
    try{ rec.start(); }catch(e){ if(wf) wf.classList.remove('active'); }
  };

  // Request getUserMedia first — iOS stores this permission permanently,
  // and WebSpeech inherits it so the user is never asked again after first grant.
  if(navigator.mediaDevices && !window._micPermGranted){
    navigator.mediaDevices.getUserMedia({audio:true})
      .then(s=>{ s.getTracks().forEach(t=>t.stop()); window._micPermGranted=true; _startRec(); })
      .catch(()=>_startRec()); // if denied/already granted, try anyway
  } else {
    _startRec();
  }
}

// ── Voice input ────────────────────────────────────────────────────────────
function _setMicIcon(active){
  const btn=document.getElementById('mic-btn');
  const waveform=document.getElementById('ai-waveform');
  const textarea=document.getElementById('msg-input');
  if(btn) btn.style.color=active?'#ff5555':'rgba(255,255,255,0.7)';
  if(waveform) waveform.classList.toggle('active',active);
  if(textarea){ textarea.style.display=active?'none':''; }
}

function startVoiceInput(){
  if(window._chatRecorder){ window._chatRecorder.stop(); return; }
  const ov=document.getElementById('focus-overlay'); if(ov) ov.style.display='none';
  const groqKey=localStorage.getItem('rize_groq_key');
  if(!groqKey||!navigator.mediaDevices||!window.MediaRecorder){
    _startWebSpeech(); return;
  }
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{ window._micPermGranted=true;
    const mimeType=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':
                   MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'';
    const opts=mimeType?{mimeType}:{};
    const recorder=new MediaRecorder(stream,opts);
    const chunks=[];
    window._chatRecorder=recorder;
    _setMicIcon(true);

    // Silence detection for hands-free auto-stop
    // Reuses _hfAudioCtx created during user gesture (avoids iOS suspended state)
    let silenceIv=null,silenceTimer=null;
    if(window._handsFree){
      try{
        const ctx=window._hfAudioCtx;
        if(ctx.state==='suspended') ctx.resume();
        const src=ctx.createMediaStreamSource(stream);
        const analyser=ctx.createAnalyser(); analyser.fftSize=256;
        src.connect(analyser);
        const buf=new Uint8Array(analyser.frequencyBinCount);
        let started=false;
        setTimeout(()=>{started=true;},1500); // don't stop in first 1.5s
        silenceIv=setInterval(()=>{
          if(!started||!window._chatRecorder){clearInterval(silenceIv);return;}
          analyser.getByteFrequencyData(buf);
          const rms=buf.reduce((s,v)=>s+v,0)/buf.length;
          if(rms<5){
            if(!silenceTimer) silenceTimer=setTimeout(()=>{
              clearInterval(silenceIv);
              if(window._chatRecorder) window._chatRecorder.stop();
            },4000);
          } else { clearTimeout(silenceTimer); silenceTimer=null; }
        },200);
      }catch(e){}
    }

    recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      clearInterval(silenceIv); clearTimeout(silenceTimer);
      // Disconnect source from shared AudioContext (don't close it — reused across sessions)
      window._chatRecorder=null;
      _setMicIcon(false);
      if(!chunks.length){ if(window._handsFree) setTimeout(()=>startVoiceInput(),500); return; }
      const ext=mimeType.includes('mp4')?'mp4':'webm';
      const blob=new Blob(chunks,{type:mimeType||'audio/webm'});
      const inp=document.getElementById('msg-input');
      const prev=inp.placeholder;
      inp.placeholder='Transcribiendo…';
      try{
        const fd=new FormData();
        fd.append('file',blob,'audio.'+ext);
        fd.append('model','whisper-large-v3-turbo');
        fd.append('language','es');
        fd.append('response_format','json');
        const res=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',
          {method:'POST',headers:{'Authorization':'Bearer '+groqKey},body:fd});
        inp.placeholder=prev;
        if(res.ok){
          const data=await res.json();
          const text=(data.text||'').trim();
          if(text){
            inp.value=text;
            inp.style.height='auto';
            inp.style.height=Math.min(inp.scrollHeight,130)+'px';
            _onInputChange();
            if(window._handsFree) setTimeout(()=>sendMessage(),300);
          } else if(window._handsFree){ setTimeout(()=>startVoiceInput(),500); }
        } else { showToast('Error al transcribir'); }
      }catch(e){ inp.placeholder=prev; showToast('Error de conexión'); }
    };
    recorder.start();
    setTimeout(()=>{ if(window._chatRecorder) window._chatRecorder.stop(); },45000);
  }).catch(()=>_startWebSpeech());
}

function _startWebSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ showToast('Micrófono no disponible'); return; }
  const rec=new SR(); rec.lang='es-US'; rec.interimResults=false; rec.maxAlternatives=1;
  window._hfSpeechRec=rec;
  _setMicIcon(true);
  rec.onresult=(e)=>{
    const text=e.results[0][0].transcript;
    const inp=document.getElementById('msg-input');
    inp.value=text;
    inp.style.height='auto';
    inp.style.height=Math.min(inp.scrollHeight,130)+'px';
    _onInputChange();
    if(window._handsFree && text.trim()) setTimeout(()=>sendMessage(),300);
  };
  rec.onend=()=>{ _setMicIcon(false); window._hfSpeechRec=null; };
  rec.onerror=()=>{ _setMicIcon(false); window._hfSpeechRec=null; showToast('Error de micrófono'); };
  rec.start();
}

// ── Conversation sidebar ────────────────────────────────────────────────────
function _saveToChatHistory() {
  if (!_history.length) return;
  const firstUserMsg = _history.find(m => m.role === 'user');
  if (!firstUserMsg) return;
  const title = firstUserMsg.content.replace(/\s+/g,' ').trim().slice(0, 52) || 'Conversación';
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('rize_sessions')||'[]'); } catch {}
  const idx = sessions.findIndex(s => s.id === _SESSION_ID);
  const entry = { id: _SESSION_ID, title, date: dateStr, ts: Date.now(), pinned: idx>=0 ? (sessions[idx].pinned||false) : false };
  if (idx >= 0) { sessions[idx] = {...sessions[idx], ...entry}; }
  else { sessions.unshift(entry); }
  // Keep max 60
  if (sessions.length > 60) sessions = sessions.slice(0, 60);
  localStorage.setItem('rize_sessions', JSON.stringify(sessions));
}

function toggleConvSidebar() {
  _saveToChatHistory();
  const sidebar = document.getElementById('conv-sidebar');
  const overlay = document.getElementById('conv-overlay');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    _renderConvSidebar();
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
}

function _renderConvSidebar() {
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('rize_sessions')||'[]'); } catch {}
  // Always ensure current session appears at top (even if no user messages yet)
  const hasCurrent = sessions.some(s => s.id === _SESSION_ID);
  if (!hasCurrent) {
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    sessions.unshift({
      id: _SESSION_ID,
      title: 'Conversación actual',
      date: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
      ts: Date.now(),
      pinned: false
    });
  }
  // Pinned first, then current on top, then by ts desc
  sessions.sort((a,b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.id === _SESSION_ID) return -1;
    if (b.id === _SESSION_ID) return 1;
    return b.ts - a.ts;
  });
  const list = document.getElementById('conv-list');
  list.innerHTML = '';
  sessions.forEach(s => {
    const wrap = document.createElement('div');
    wrap.className = 'conv-item-wrap';
    wrap.dataset.id = s.id;
    const isCurrent = s.id === _SESSION_ID;
    const isCurrentClass = isCurrent ? ' conv-item-current' : '';
    const pinnedIcon = s.pinned ? '<span class="conv-pin">★</span>' : '';
    wrap.innerHTML = `
      <div class="conv-delete-bg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></div>
      <div class="conv-item${isCurrentClass}" onclick="_tapConvItem(event,'${s.id}')">
        ${isCurrent ? `<button class="conv-more-btn" onclick="_openConvMenu(event,'${s.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>` : ''}
        <div class="conv-item-title">${pinnedIcon}${_escHtml(s.title)}</div>
        <div class="conv-item-date">${s.date || ''}</div>
      </div>`;
    list.appendChild(wrap);
    _attachSwipeDelete(wrap, s.id);
  });
}

function _escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _tapConvItem(e, id) {
  if (id === _SESSION_ID) return; // already current
  // Close sidebar directly (avoid toggleConvSidebar side-effects)
  document.getElementById('conv-sidebar').classList.remove('open');
  document.getElementById('conv-overlay').classList.remove('open');
  _loadChatSession(id);
}

function _openConvMenu(e, id) {
  e.stopPropagation();
  const existing = document.getElementById('conv-ctx-menu');
  if (existing) existing.remove();
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('rize_sessions')||'[]'); } catch {}
  const s = sessions.find(x => x.id === id);
  const pinLabel = s && s.pinned ? 'Quitar destacado' : 'Destacar';
  const menu = document.createElement('div');
  menu.id = 'conv-ctx-menu';
  const rect = e.target.closest('button').getBoundingClientRect();
  menu.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;z-index:300;background:#222;border:1px solid rgba(255,255,255,0.12);border-radius:12px;overflow:hidden;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,0.5);`;
  menu.innerHTML = `
    <div class="ctx-item" onclick="_renameConv('${id}')">Renombrar</div>
    <div class="ctx-item" onclick="_togglePinConv('${id}')">${pinLabel}</div>
    <div class="ctx-item ctx-item-del" onclick="_deleteConvFromMenu('${id}')">Eliminar</div>`;
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', _closeCtxMenu, {once:true}), 10);
}

function _closeCtxMenu() {
  const m = document.getElementById('conv-ctx-menu');
  if (m) m.remove();
}

function _renameConv(id) {
  _closeCtxMenu();
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('rize_sessions')||'[]'); } catch {}
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  const newTitle = prompt('Nuevo nombre:', s.title);
  if (!newTitle || !newTitle.trim()) return;
  s.title = newTitle.trim().slice(0, 80);
  localStorage.setItem('rize_sessions', JSON.stringify(sessions));
  _renderConvSidebar();
}

function _togglePinConv(id) {
  _closeCtxMenu();
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('rize_sessions')||'[]'); } catch {}
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  s.pinned = !s.pinned;
  localStorage.setItem('rize_sessions', JSON.stringify(sessions));
  _renderConvSidebar();
}

function _deleteConvFromMenu(id) {
  _closeCtxMenu();
  _deleteChatSession(id);
}

function _deleteChatSession(id) {
  let sessions = [];
  try { sessions = JSON.parse(localStorage.getItem('rize_sessions')||'[]'); } catch {}
  sessions = sessions.filter(s => s.id !== id);
  localStorage.setItem('rize_sessions', JSON.stringify(sessions));
  // If deleting current session, start new chat
  if (id === _SESSION_ID) {
    toggleConvSidebar();
    newChat();
    return;
  }
  _renderConvSidebar();
}

async function _loadChatSession(id) {
  try {
    const db = await _openMemDB(); if (!db) return;
    const msgs = await new Promise(resolve => {
      const tx = db.transaction('history', 'readonly');
      const req = tx.objectStore('history').index('ts').openCursor(null, 'prev');
      const rows = [];
      req.onsuccess = e => {
        const cur = e.target.result;
        if (cur) {
          if (cur.value.session === id) rows.push(cur.value);
          cur.continue();
        } else resolve(rows.reverse());
      };
      req.onerror = () => resolve([]);
    });
    if (!msgs.length) { showToast('Sin mensajes guardados'); return; }
    // Switch session
    _SESSION_ID = id;
    _history = [];
    _semanticCtx = '';
    const wrap = document.getElementById('messages');
    wrap.innerHTML = '';
    _ensureSpacer();
    for (const m of msgs) {
      _history.push({role: m.role, content: m.content});
      if (m.role === 'user') {
        const row = document.createElement('div');
        row.className = 'ai-msg user';
        const bub = document.createElement('div');
        bub.className = 'bubble-user';
        bub.textContent = m.content;
        row.appendChild(bub); wrap.appendChild(row);
      } else if (m.role === 'assistant') {
        const row = document.createElement('div');
        row.className = 'ai-msg';
        row.innerHTML = `<div class="msg-av"><img src="./images/agenda-logo.jpg" onerror="this.style.display='none'"></div><div class="bubble-ai">${_renderMd(m.content)}</div>`;
        wrap.appendChild(row);
      }
    }
    wrap.scrollTop = wrap.scrollHeight;
  } catch(e) { showToast('Error al cargar conversación'); }
}

function _attachSwipeDelete(wrap, id) {
  let startX = 0, curX = 0, swiping = false;
  const item = wrap.querySelector('.conv-item');
  wrap.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX; curX = startX; swiping = false;
    wrap.classList.remove('swiping');
  }, {passive:true});
  wrap.addEventListener('touchmove', e => {
    curX = e.touches[0].clientX;
    const dx = startX - curX;
    if (dx > 8) { swiping = true; wrap.classList.add('swiping'); }
    if (swiping && dx > 0) {
      const move = Math.min(dx, 80);
      item.style.transform = `translateX(-${move}px)`;
    }
  }, {passive:true});
  wrap.addEventListener('touchend', () => {
    const dx = startX - curX;
    if (dx > 55) {
      item.style.transform = 'translateX(-80px)';
      setTimeout(() => _deleteChatSession(id), 350);
    } else {
      item.style.transform = '';
      wrap.classList.remove('swiping');
    }
  });
}

// ── New chat ───────────────────────────────────────────────────────────────
function newChat(){
  _saveToChatHistory();
  if (_history.length >= 4) _summarizeSession(); // Phase 2: summarize before clearing
  _SESSION_ID = 'S' + Date.now().toString(36);
  _semanticCtx = '';
  if (_inactivityTimer) { clearTimeout(_inactivityTimer); _inactivityTimer = null; }
  _history=[];
  window._artifacts=[];
  if(window._chatRecorder){ window._chatRecorder.stop(); }
  _setMicIcon(false);
  _thinkingEl=null; // puede haber sido eliminado por innerHTML=''
  _busy=false; _setInputEnabled(true);
  const wrap=document.getElementById('messages');
  wrap.innerHTML='';
  const es=document.createElement('div');
  es.id='empty-state';
  es.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding-bottom:80px;pointer-events:none;';
  es.innerHTML=`<img src="./images/agenda-logo.jpg" style="width:150px;height:150px;object-fit:contain;opacity:0.9;"><p style="font-family:'Georgia',serif;font-size:28px;font-weight:400;color:rgba(255,255,255,0.78);text-align:center;line-height:1.4;">¿En qué puedo<br>ayudarte hoy?</p>`;
  wrap.appendChild(es);
}

// ── Artifacts ────────────────────────────────────────────────────────────────
window._artifacts=[];
window._artIdx=0;

const _ART_ICONS={html:'🌐',svg:'🎨',javascript:'⚡',js:'⚡',typescript:'⚡',ts:'⚡',python:'🐍',py:'🐍',css:'🎨',json:'📋',markdown:'📄',md:'📄',sql:'🗄️',bash:'💻',sh:'💻',default:'📄'};
const _ART_LABELS={html:'HTML',svg:'SVG',javascript:'JavaScript',js:'JavaScript',typescript:'TypeScript',ts:'TypeScript',python:'Python',py:'Python',css:'CSS',json:'JSON',markdown:'Markdown',md:'Markdown',sql:'SQL',bash:'Shell',sh:'Shell',default:'Código'};
const _ART_PREVIEW=['html','svg'];

function _artifactTitle(lang,code){
  const lines=code.split('\n').length;
  const label=_ART_LABELS[lang]||_ART_LABELS.default;
  const titleMatch=code.match(/<title>([^<]+)<\/title>/i)||code.match(/^#\s+(.+)/m);
  if(titleMatch) return titleMatch[1].slice(0,40);
  return label+' · '+lines+' líneas';
}

function _extractArtifacts(text){
  const arts=[];
  // 1. Standard fenced code blocks
  const re=/```(\w+)?\n([\s\S]+?)```/g;
  let m;
  while((m=re.exec(text))!==null){
    const lang=(m[1]||'text').toLowerCase();
    const code=m[2].trim();
    if(code.split('\n').length<4&&code.length<120) continue;
    arts.push({lang,code,title:_artifactTitle(lang,code),full:m[0]});
  }
  // 2. Raw HTML without code fences (AI sometimes outputs directly)
  if(!arts.length){
    const hm=text.match(/<!DOCTYPE\s+html[\s\S]+?<\/html>/i);
    if(hm){const code=hm[0].trim();arts.push({lang:'html',code,title:_artifactTitle('html',code),full:hm[0]});}
  }
  // 3. <html> without DOCTYPE
  if(!arts.length){
    const hm=text.match(/<html[\s\S]+?<\/html>/i);
    if(hm&&hm[0].length>200){const code=hm[0].trim();arts.push({lang:'html',code,title:_artifactTitle('html',code),full:hm[0]});}
  }
  return arts;
}

function openArtifact(idx){
  // Dismiss keyboard
  document.activeElement && document.activeElement.blur();
  window._artIdx=Math.max(0,Math.min(idx,window._artifacts.length-1));
  const art=window._artifacts[window._artIdx];
  if(!art) return;
  // Header
  document.getElementById('artifact-title').textContent=art.title;
  document.getElementById('artifact-badge').textContent=_ART_LABELS[art.lang]||_ART_LABELS.default;
  // Nav
  const nav=document.getElementById('artifact-nav');
  if(window._artifacts.length>1){nav.style.display='flex';document.getElementById('artifact-counter').textContent=`${window._artIdx+1} / ${window._artifacts.length}`;}
  else nav.style.display='none';
  // Tabs (only for previewable types)
  const canPreview=_ART_PREVIEW.includes(art.lang);
  document.getElementById('artifact-tabs').style.display=canPreview?'flex':'none';
  // Dismiss keyboard before opening panel
  document.activeElement && document.activeElement.blur();
  // Open panel first, then load tab content after keyboard has time to dismiss
  document.getElementById('artifact-panel').classList.add('open');
  document.getElementById('artifact-backdrop').classList.add('open');
  setTimeout(()=>_artifactTab(canPreview?'preview':'code'), 120);
}

function closeArtifact(){
  document.getElementById('artifact-panel').classList.remove('open');
  document.getElementById('artifact-backdrop').classList.remove('open');
}

function _artifactGo(dir){
  openArtifact(window._artIdx+dir);
}

function _artifactTab(tab){
  const art=window._artifacts[window._artIdx];
  if(!art) return;
  // Always dismiss keyboard when switching tabs
  document.activeElement && document.activeElement.blur();
  const pre=document.getElementById('artifact-preview');
  const codeWrap=document.getElementById('artifact-code-wrap');
  document.getElementById('tab-preview')?.classList.toggle('active',tab==='preview');
  document.getElementById('tab-code')?.classList.toggle('active',tab==='code');
  if(tab==='preview'&&_ART_PREVIEW.includes(art.lang)){
    pre.style.display='block'; codeWrap.style.display='none';
    if(art.lang==='html'){
      const _vpMeta='<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">';
      const _fix='<style>html,body{overflow-x:hidden!important;max-width:100%!important;}input,textarea,select,button{pointer-events:none!important;}</style>';
      let _doc=art.code;
      if(_doc.includes('<head>')) _doc=_doc.replace('<head>','<head>'+_vpMeta+_fix);
      else _doc=_vpMeta+_fix+_doc;
      pre.srcdoc=_doc;
    }
    else if(art.lang==='svg') pre.srcdoc=`<!DOCTYPE html><html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh">${art.code}</body></html>`;
  } else {
    pre.style.display='none'; codeWrap.style.display='block';
    document.getElementById('artifact-code').textContent=art.code;
  }
}

function _artifactPrint(){
  const art=window._artifacts[window._artIdx];
  if(!art) return;
  // Build print-ready HTML with @media print styles
  const _vpMeta='<meta name="viewport" content="width=device-width,initial-scale=1">';
  const _printCSS='<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.header{-webkit-print-color-adjust:exact;}}</style>';
  let doc=art.code;
  if(doc.includes('<head>')) doc=doc.replace('<head>','<head>'+_vpMeta+_printCSS);
  else doc=_vpMeta+_printCSS+doc;
  // Open in new window and print
  const w=window.open('','_blank','width=800,height=600');
  if(!w){showToast('Permite ventanas emergentes');return;}
  w.document.open();w.document.write(doc);w.document.close();
  w.onload=()=>{w.focus();w.print();};
  // Fallback if onload doesn't fire
  setTimeout(()=>{try{w.focus();w.print();}catch(e){}},800);
}

function _artifactCopy(){
  const art=window._artifacts[window._artIdx];
  if(!art) return;
  navigator.clipboard&&navigator.clipboard.writeText(art.code).then(()=>showToast('Copiado ✓'));
}

function _artifactDownload(){
  const art=window._artifacts[window._artIdx];
  if(!art) return;
  const ext={html:'html',svg:'svg',javascript:'js',js:'js',typescript:'ts',ts:'ts',python:'py',py:'py',css:'css',json:'json',markdown:'md',md:'md',sql:'sql',bash:'sh',sh:'sh'}[art.lang]||'txt';
  const blob=new Blob([art.code],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`artifact.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}
