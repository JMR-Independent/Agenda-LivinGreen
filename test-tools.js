#!/usr/bin/env node
// ─── TEST SUITE — Agenda LivinGreen Tools ────────────────────────────────────
// Prueba todas las herramientas del agente IA en Node.js con datos simulados.
// Uso: node test-tools.js [gemini_key] [groq_key]

const GEMINI_KEY = process.argv[2] || '';
const GROQ_KEY   = process.argv[3] || '';

// ─── Mock localStorage ────────────────────────────────────────────────────────
const _store = {};
const localStorage = {
    getItem:    k => _store[k] ?? null,
    setItem:    (k,v) => { _store[k] = v; },
    removeItem: k => { delete _store[k]; },
};

// ─── Seed data ────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now()+86400000).toISOString().split('T')[0];
const LAST_MONTH = (() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();

const SEED_APPOINTMENTS = [
    { id:'a1', name:'Maria Garcia',  clientName:'Maria Garcia',  date:TODAY,     time:'09:00', service:'Standard Cleaning', price:120, city:'Draper',   status:'confirmed' },
    { id:'a2', name:'John Smith',    clientName:'John Smith',    date:TODAY,     time:'13:00', service:'Deep Cleaning',     price:200, city:'Lehi',     status:'confirmed' },
    { id:'a3', name:'Ana Torres',    clientName:'Ana Torres',    date:TOMORROW,  time:'10:00', service:'Move Out',          price:280, city:'Orem',     status:'confirmed' },
    { id:'a4', name:'Carlos Ruiz',   clientName:'Carlos Ruiz',   date:LAST_MONTH+'-15', time:'08:00', service:'Standard Cleaning', price:110, city:'Sandy', status:'done' },
    { id:'a5', name:'Lisa Wong',     clientName:'Lisa Wong',     date:LAST_MONTH+'-22', time:'11:00', service:'Deep Cleaning',     price:180, city:'Provo',  status:'done' },
];

const SEED_CLIENTS = [
    { name:'Maria Garcia', phone:'801-555-0101', email:'maria@email.com', city:'Draper',  notes:'Tiene perro', createdAt:'2025-01-15T00:00:00Z' },
    { name:'John Smith',   phone:'801-555-0202', email:'john@email.com',  city:'Lehi',    notes:'',            createdAt:'2025-02-01T00:00:00Z' },
    { name:'Ana Torres',   phone:'801-555-0303', email:'ana@email.com',   city:'Orem',    notes:'Alérgica a químicos fuertes', createdAt:'2025-02-10T00:00:00Z' },
];

const SEED_SERVICES = [
    { id:'standard', name:'Standard Cleaning', price:120, priceRange:'$100-$150' },
    { id:'deep',     name:'Deep Cleaning',      price:200, priceRange:'$180-$250' },
    { id:'moveout',  name:'Move Out Cleaning',  price:280, priceRange:'$250-$350' },
];

const SEED_MEMORY = {
    notes: [
        { content:'El cliente John Smith prefiere servicio los viernes', category:'cliente', date:'2025-03-01' },
        { content:'Zona Draper genera más ingresos que Lehi', category:'negocio', date:'2025-03-02' },
    ],
    summary: 'App usada diariamente. 3 clientes regulares.',
    total_messages: 42
};

localStorage.setItem('appointments',       JSON.stringify(SEED_APPOINTMENTS));
localStorage.setItem('clientRegistry',     JSON.stringify(SEED_CLIENTS));
localStorage.setItem('rize_services_config', JSON.stringify(SEED_SERVICES));
localStorage.setItem('ai_memory',          JSON.stringify(SEED_MEMORY));
localStorage.setItem('dayEvents',          JSON.stringify({}));

// ─── Tool implementations (extraídas del HTML) ────────────────────────────────
function getAIMemory() { try{ return JSON.parse(localStorage.getItem('ai_memory')||'{}'); }catch{ return {notes:[],summary:''}; } }
function saveAIMemory(m) { localStorage.setItem('ai_memory', JSON.stringify(m)); }

function _fmtApt(a) {
    return { id:a.id||String(a.timestamp), date:a.date||a.fecha, time:a.time||a.hora,
             client:a.clientName||a.cliente||a.name, service:a.service||a.servicio||a.job,
             price:a.price||a.precio, city:a.city, notes:a.notes||a.notas, status:a.status };
}

function _toolSearchApts(args) {
    const q=(args.query||'').toLowerCase(); const lim=args.limit||10;
    const apts=JSON.parse(localStorage.getItem('appointments')||'[]');
    const r=apts.filter(a=>JSON.stringify(a).toLowerCase().includes(q)).slice(0,lim);
    return {count:r.length, appointments:r.map(_fmtApt)};
}

function _toolGetAppts(args) {
    const apts=JSON.parse(localStorage.getItem('appointments')||'[]');
    const today=new Date().toISOString().split('T')[0];
    const tomorrow=new Date(Date.now()+86400000).toISOString().split('T')[0];
    let filtered=apts;
    const p=args.period||'today';
    if(p==='today')         filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(today));
    else if(p==='tomorrow') filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(tomorrow));
    else if(p==='week'){    const wEnd=new Date(Date.now()+7*86400000).toISOString().split('T')[0];
        filtered=apts.filter(a=>{const d=a.date||a.fecha||'';return d>=today&&d<=wEnd;}); }
    else if(p==='month'){   const mEnd=new Date(Date.now()+30*86400000).toISOString().split('T')[0];
        filtered=apts.filter(a=>{const d=a.date||a.fecha||'';return d>=today&&d<=mEnd;}); }
    else if(/^\d{4}-\d{2}-\d{2}$/.test(p)) filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(p));
    else if(/^\d{4}-\d{2}$/.test(p))       filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(p));
    filtered.sort((a,b)=>((a.date||'')+(a.time||''))<((b.date||'')+(b.time||''))?-1:1);
    return {count:filtered.length, appointments:filtered.map(_fmtApt)};
}

function _toolGetStats(args) {
    const p=args.period||'all'; const now=new Date();
    const todayStr=now.toISOString().split('T')[0];
    const weekAgo=new Date(now-7*86400000).toISOString().split('T')[0];
    const curY=now.getFullYear(), curM=now.getMonth()+1;
    let apts=[]; try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
    try{const dv=JSON.parse(localStorage.getItem('dayEvents')||'[]');
        if(Array.isArray(dv)) dv.forEach(e=>{if(!apts.find(a=>a.id===e.id))apts.push(e);});}catch{}
    const f=apts.filter(a=>{const ds=(a.date||a.fecha||'').slice(0,10);
        if(p==='today')return ds===todayStr;
        if(p==='week')return ds>=weekAgo&&ds<=todayStr;
        if(p==='month'){const[y,m]=ds.split('-').map(Number);return y===curY&&m===curM;}
        if(/^\d{4}-\d{2}$/.test(p)){const[y,m]=p.split('-').map(Number);const[dy,dm]=ds.split('-').map(Number);return dy===y&&dm===m;}
        return true;});
    const rev=f.reduce((s,a)=>s+(parseFloat(a.price||a.precio)||0),0);
    const bySvc={}; f.forEach(a=>{const s=a.service||a.servicio||a.job||'?';bySvc[s]=(bySvc[s]||0)+1;});
    const names=new Set();
    apts.forEach(a=>{const n=(a.clientName||a.cliente||a.name||'').trim().toLowerCase();if(n)names.add(n);});
    try{JSON.parse(localStorage.getItem('clientRegistry')||'[]').forEach(c=>{const n=(c.name||'').trim().toLowerCase();if(n)names.add(n);});}catch{}
    return {period:p, appointments:f.length, revenue:'$'+rev.toFixed(2), unique_clients:names.size, by_service:bySvc};
}

function _toolSearchClients(args) {
    const q=(args.query||'').toLowerCase();
    let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
    const r=c.filter(cl=>JSON.stringify(cl).toLowerCase().includes(q)).slice(0,10);
    return {count:r.length, clients:r};
}

function _toolAddClient(args) {
    try{
        let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
        c.push({name:args.name,phone:args.phone||'',email:args.email||'',city:args.city||'',notes:args.notes||'',createdAt:new Date().toISOString(),source:'ai'});
        localStorage.setItem('clientRegistry',JSON.stringify(c));
        return {success:true,message:`Cliente "${args.name}" agregado.`};
    }catch(e){return{success:false,error:e.message};}
}

function _toolSaveNote(args) {
    const mem=getAIMemory();
    if(!mem.notes) mem.notes=[];
    mem.notes.push({content:args.content,category:args.category||'general',date:new Date().toISOString().split('T')[0]});
    if(mem.notes.length>20) mem.notes=mem.notes.slice(-20);
    saveAIMemory(mem);
    return {success:true, message:'Nota guardada.'};
}

function _toolGetMem(args) {
    const mem=getAIMemory(); let notes=mem.notes||[];
    if(args.category) notes=notes.filter(n=>n.category===args.category);
    return {notes, summary:mem.summary, total:mem.notes?.length||0};
}

function _toolGetServices() {
    try{
        const cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');
        if(!cfg.length) return {services:[],message:'No hay servicios configurados.'};
        return {count:cfg.length, services:cfg.map(s=>({id:s.id,name:s.name,price:s.price||s.basePrice,priceRange:s.priceRange||''}))};
    }catch(e){return{success:false,error:e.message};}
}

function _toolUpdateServicePrice(args) {
    try{
        const q=(args.service_name||'').toLowerCase();
        let cfg=[]; try{cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');}catch{}
        const idx=cfg.findIndex(s=>(s.name||s.id||'').toLowerCase().includes(q));
        if(idx===-1) return {success:false,message:`No encontré servicio "${args.service_name}".`};
        cfg[idx].price=args.price; cfg[idx].basePrice=args.price;
        localStorage.setItem('rize_services_config',JSON.stringify(cfg));
        return {success:true,message:`Precio de "${cfg[idx].name}" actualizado a $${args.price}.`};
    }catch(e){return{success:false,error:e.message};}
}

function _toolAddDayEvent(args) {
    try{
        const validTypes=['vacaciones','libre','compromiso','salida','sin-pega'];
        if(!validTypes.includes(args.event_type)) return {success:false,message:`Tipo inválido. Usa: ${validTypes.join('|')}`};
        let events={}; try{events=JSON.parse(localStorage.getItem('dayEvents')||'{}');}catch{}
        events[args.date]=args.event_type;
        localStorage.setItem('dayEvents',JSON.stringify(events));
        return {success:true,message:`${args.date} marcado como: ${args.event_type}`};
    }catch(e){return{success:false,error:e.message};}
}

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed=0, failed=0, warnings=0;

function test(name, fn) {
    try {
        const result = fn();
        const ok = result !== false;
        if(ok) { console.log(`  ✅ ${name}`); passed++; }
        else   { console.log(`  ❌ ${name}`); failed++; }
        return result;
    } catch(e) {
        console.log(`  ❌ ${name} — ERROR: ${e.message}`);
        failed++;
        return null;
    }
}

async function testGroup(name, fn) {
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`  ${name}`);
    console.log(`${'─'.repeat(55)}`);
    await fn();
}

function assert(condition, label) {
    if(!condition) throw new Error(label || 'assertion failed');
    return true;
}

// ─── API test helper ──────────────────────────────────────────────────────────
async function testAPI(name, fn) {
    process.stdout.write(`  ⏳ ${name}... `);
    try {
        const result = await fn();
        console.log(`✅ OK`);
        if(result) console.log(`     ${JSON.stringify(result).slice(0,120)}`);
        passed++;
        return result;
    } catch(e) {
        console.log(`❌ ${e.message}`);
        failed++;
        return null;
    }
}

// ─── TESTS ────────────────────────────────────────────────────────────────────
async function runTests() {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('   AGENDA LIVINGREEN — Test Suite');
    console.log('══════════════════════════════════════════════════════');

    // ── 1. get_appointments ────────────────────────────────────────────────
    testGroup('get_appointments', () => {
        test('today → 2 citas', () => {
            const r = _toolGetAppts({period:'today'});
            return assert(r.count === 2, `esperaba 2, got ${r.count}`);
        });
        test('tomorrow → 1 cita', () => {
            const r = _toolGetAppts({period:'tomorrow'});
            return assert(r.count === 1, `esperaba 1, got ${r.count}`);
        });
        test('week → incluye hoy y mañana', () => {
            const r = _toolGetAppts({period:'week'});
            return assert(r.count >= 2);
        });
        test('YYYY-MM (mes pasado) → 2 citas', () => {
            const r = _toolGetAppts({period: LAST_MONTH});
            return assert(r.count === 2, `esperaba 2, got ${r.count}`);
        });
        test('YYYY-MM-DD (fecha exacta hoy) → 2 citas', () => {
            const r = _toolGetAppts({period: TODAY});
            return assert(r.count === 2);
        });
        test('ordenadas por hora', () => {
            const r = _toolGetAppts({period:'today'});
            return assert(r.appointments[0].time === '09:00');
        });
        test('campos mapeados correctamente', () => {
            const r = _toolGetAppts({period:'today'});
            const a = r.appointments[0];
            return assert(a.client && a.service && a.price !== undefined && a.city);
        });
    });

    // ── 2. get_stats ───────────────────────────────────────────────────────
    testGroup('get_stats', () => {
        test('today → revenue $320', () => {
            const r = _toolGetStats({period:'today'});
            return assert(r.revenue === '$320.00', `got ${r.revenue}`);
        });
        test('today → 2 appointments', () => {
            const r = _toolGetStats({period:'today'});
            return assert(r.appointments === 2);
        });
        test('all → 5 appointments', () => {
            const r = _toolGetStats({period:'all'});
            return assert(r.appointments === 5, `got ${r.appointments}`);
        });
        test('all → revenue $890', () => {
            const r = _toolGetStats({period:'all'});
            return assert(r.revenue === '$890.00', `got ${r.revenue}`);
        });
        test('YYYY-MM mes pasado → 2 citas + $290', () => {
            const r = _toolGetStats({period: LAST_MONTH});
            return assert(r.appointments === 2 && r.revenue === '$290.00', `got ${r.appointments} / ${r.revenue}`);
        });
        test('by_service desglosa correctamente', () => {
            const r = _toolGetStats({period:'all'});
            return assert(r.by_service['Standard Cleaning'] === 2);
        });
        test('unique_clients incluye clientRegistry', () => {
            const r = _toolGetStats({period:'all'});
            return assert(r.unique_clients >= 3);
        });
    });

    // ── 3. search_appointments ─────────────────────────────────────────────
    testGroup('search_appointments', () => {
        test('búsqueda por nombre parcial "garcia"', () => {
            const r = _toolSearchApts({query:'garcia'});
            return assert(r.count === 1);
        });
        test('búsqueda por ciudad "draper"', () => {
            const r = _toolSearchApts({query:'draper'});
            return assert(r.count === 1);
        });
        test('búsqueda por servicio "deep"', () => {
            const r = _toolSearchApts({query:'deep'});
            return assert(r.count === 2, `got ${r.count}`);
        });
        test('búsqueda sin resultados → count 0', () => {
            const r = _toolSearchApts({query:'xyzabc123'});
            return assert(r.count === 0);
        });
    });

    // ── 4. search_clients ──────────────────────────────────────────────────
    testGroup('search_clients', () => {
        test('buscar "maria" → 1 cliente', () => {
            const r = _toolSearchClients({query:'maria'});
            return assert(r.count === 1);
        });
        test('buscar "draper" por ciudad → 1 resultado', () => {
            const r = _toolSearchClients({query:'draper'});
            return assert(r.count === 1);
        });
        test('buscar "" → todos los clientes', () => {
            const r = _toolSearchClients({query:''});
            return assert(r.count === 3);
        });
        test('incluye notas en búsqueda', () => {
            const r = _toolSearchClients({query:'perro'});
            return assert(r.count === 1);
        });
    });

    // ── 5. add_client ──────────────────────────────────────────────────────
    testGroup('add_client', () => {
        test('agrega cliente nuevo', () => {
            const r = _toolAddClient({name:'Test User', phone:'555-9999', city:'Provo'});
            return assert(r.success);
        });
        test('cliente persiste en registry', () => {
            const r = _toolSearchClients({query:'Test User'});
            return assert(r.count === 1);
        });
        test('source marcado como "ai"', () => {
            const r = _toolSearchClients({query:'Test User'});
            return assert(r.clients[0].source === 'ai');
        });
    });

    // ── 6. get_services ────────────────────────────────────────────────────
    testGroup('get_services', () => {
        test('devuelve 3 servicios', () => {
            const r = _toolGetServices();
            return assert(r.count === 3);
        });
        test('incluye nombre y precio', () => {
            const r = _toolGetServices();
            return assert(r.services[0].name && r.services[0].price);
        });
    });

    // ── 7. update_service_price ────────────────────────────────────────────
    testGroup('update_service_price', () => {
        test('actualiza precio de Standard Cleaning a $130', () => {
            const r = _toolUpdateServicePrice({service_name:'standard', price:130});
            return assert(r.success);
        });
        test('precio actualizado persiste', () => {
            const r = _toolGetServices();
            const svc = r.services.find(s=>s.id==='standard');
            return assert(svc.price === 130, `got ${svc.price}`);
        });
        test('servicio inexistente → error claro', () => {
            const r = _toolUpdateServicePrice({service_name:'xyz', price:99});
            return assert(!r.success && r.message.includes('No encontré'));
        });
    });

    // ── 8. save_memory / get_memory ───────────────────────────────────────
    testGroup('save_memory_note / get_memory', () => {
        test('guarda nota nueva', () => {
            const r = _toolSaveNote({content:'Prueba de nota', category:'test'});
            return assert(r.success);
        });
        test('nota recuperable con get_memory', () => {
            const r = _toolGetMem({});
            return assert(r.notes.some(n=>n.content==='Prueba de nota'));
        });
        test('filtro por categoría funciona', () => {
            const r = _toolGetMem({category:'test'});
            return assert(r.notes.length >= 1 && r.notes.every(n=>n.category==='test'));
        });
        test('summary preservado', () => {
            const r = _toolGetMem({});
            return assert(r.summary && r.summary.length > 0);
        });
    });

    // ── 9. add_day_event ──────────────────────────────────────────────────
    testGroup('add_day_event', () => {
        test('marca día como libre', () => {
            const r = _toolAddDayEvent({date:'2026-03-20', event_type:'libre'});
            return assert(r.success);
        });
        test('tipo inválido → error', () => {
            const r = _toolAddDayEvent({date:'2026-03-21', event_type:'festivo'});
            return assert(!r.success);
        });
        test('persiste en localStorage', () => {
            const events = JSON.parse(localStorage.getItem('dayEvents')||'{}');
            return assert(events['2026-03-20'] === 'libre');
        });
    });

    // ── 10. API — Gemini ──────────────────────────────────────────────────
    await testGroup('API — Gemini (chat)', async () => {
        if(!GEMINI_KEY) {
            console.log('  ⚠️  Sin API key — pasa como argumento: node test-tools.js TU_GEMINI_KEY TU_GROQ_KEY');
            warnings++;
        } else {
            await testAPI('listado de modelos disponibles', async () => {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
                if(!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const models = data.models?.map(m=>m.name).filter(n=>n.includes('flash')||n.includes('pro'));
                return {available_models: models?.slice(0,5)};
            });

            await testAPI('llamada básica a Gemini', async () => {
                const candidates = ['gemini-2.5-flash','gemini-2.0-flash-lite','gemini-1.5-flash'];
                let lastErr;
                for(const model of candidates) {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({
                            contents:[{role:'user',parts:[{text:'Responde SOLO con la palabra: FUNCIONA'}]}],
                            generationConfig:{maxOutputTokens:10}
                        })
                    });
                    if(res.status===404||res.status===400){ lastErr=`${model}: HTTP ${res.status}`; continue; }
                    if(!res.ok){ const e=await res.json().catch(()=>{}); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
                    return {model, response: text.trim()};
                }
                throw new Error(lastErr||'Ningún modelo disponible');
            });
        }
    });

    // ── 11. API — Groq (voice) ─────────────────────────────────────────────
    await testGroup('API — Groq (transcripción voz)', async () => {
        if(!GROQ_KEY) {
            console.log('  ⚠️  Sin API key de Groq');
            warnings++;
        } else {
            await testAPI('modelos disponibles en Groq', async () => {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers:{'Authorization':'Bearer '+GROQ_KEY}
                });
                if(!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const vision = data.data?.filter(m=>m.id.includes('vision')||m.id.includes('llama-4')).map(m=>m.id);
                const whisper = data.data?.filter(m=>m.id.includes('whisper')).map(m=>m.id);
                return {vision_models: vision, whisper_models: whisper};
            });
        }
    });

    // ─── Resumen ──────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log(`  RESULTADO: ${passed} pasaron  |  ${failed} fallaron  |  ${warnings} advertencias`);
    console.log('══════════════════════════════════════════════════════\n');

    if(failed > 0) process.exit(1);
}

runTests().catch(e => { console.error('Error inesperado:', e); process.exit(1); });
