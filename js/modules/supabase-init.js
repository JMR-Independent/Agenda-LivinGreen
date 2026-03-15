// ================================================================
// MODULE: supabase-init.js
// Configuración de Supabase y carga de agent config
// Debe cargarse DESPUÉS del CDN de supabase (@supabase/supabase-js)
// y ANTES de app.js
// ================================================================

// Supabase Configuration
const SUPABASE_URL = 'https://stodvmbmvtxljfsdzghc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0b2R2bWJtdnR4bGpmc2R6Z2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyMTYsImV4cCI6MjA3Mjg1OTIxNn0.7y3RPDV_xYFzXSTUM7oCt_WgSSRLm2HoGsCq5-5Jm5M';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Exponemos también en window para compatibilidad con referencias explícitas
window.supabaseClient = supabaseClient;

// ── Agent config desde Supabase (personalidad, contexto negocio, servicios) ──
let _appAgentCfg = null;
let _appAgentCfgPromise = null;
async function _loadAppAgentConfig() {
  if (_appAgentCfg) return _appAgentCfg;
  if (_appAgentCfgPromise) return _appAgentCfgPromise;
  _appAgentCfgPromise = (async () => {
    try {
      const { data, error } = await supabaseClient
        .from('agent_config').select('*').eq('business_id','default').single();
      if (!error && data) { _appAgentCfg = data; return data; }
    } catch {}
    return null;
  })();
  return _appAgentCfgPromise;
}
function _getAppCfg() { return _appAgentCfg || {}; }
