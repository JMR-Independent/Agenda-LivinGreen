// ================================================================
// MODULE: business-config.js
// Configuración del negocio: getBC(), branding, temas de fondo
// Depende de: showToast (app.js, resuelve en runtime)
// ================================================================

        // ─── BUSINESS CONFIG SYSTEM ───────────────────────────────────────
        const BUSINESS_CONFIG_KEY = 'rize_business_config';
        const DEFAULT_BUSINESS_CONFIG = {
            name:        'LivinGreen',
            tagline:     'Experience the pleasure of walking on clean carpets',
            website:     'livingreen.life',
            websiteFull: 'https://www.livingreen.life/',
            instagram:   '@livingreen_life',
            phone:       '+1 (385) 482-5694',
            whatsapp:    '+1 (385) 482-5694',
            email:       'info@livingreen.com',
            emoji:       '🌿',
            logo:        null,
            logoDefault: './images/agenda-logo.jpg',
        };
        let _businessConfig = null;
        function getBC() {
            if (!_businessConfig) {
                try {
                    const s = localStorage.getItem(BUSINESS_CONFIG_KEY);
                    _businessConfig = s ? { ...DEFAULT_BUSINESS_CONFIG, ...JSON.parse(s) } : { ...DEFAULT_BUSINESS_CONFIG };
                } catch { _businessConfig = { ...DEFAULT_BUSINESS_CONFIG }; }
            }
            return _businessConfig;
        }
        function saveBusinessConfig() {
            const cfg = {
                name:        document.getElementById('biz-name').value.trim() || getBC().name,
                tagline:     document.getElementById('biz-tagline').value.trim(),
                website:     document.getElementById('biz-website').value.trim(),
                websiteFull: 'https://' + document.getElementById('biz-website').value.trim().replace(/^https?:\/\//,''),
                instagram:   document.getElementById('biz-instagram').value.trim(),
                phone:       document.getElementById('biz-phone').value.trim(),
                whatsapp:    document.getElementById('biz-whatsapp').value.trim(),
                email:       document.getElementById('biz-email').value.trim(),
                emoji:       document.getElementById('biz-emoji').value.trim() || getBC().emoji,
                logo:        getBC().logo,
                logoDefault: getBC().logoDefault,
            };
            localStorage.setItem(BUSINESS_CONFIG_KEY, JSON.stringify(cfg));
            _businessConfig = cfg;
            applyBusinessBranding();
            showToast('✅ Perfil guardado');
        }
        function applyBusinessBranding() {
            const bc = getBC();
            document.title = bc.name + ' - Agendamiento';
            document.documentElement.style.setProperty('--biz-name', `"${bc.name}"`);
            document.querySelectorAll('.biz-logo-dynamic').forEach(el => { el.src = bc.logo || bc.logoDefault; });
            document.querySelectorAll('[data-biz="name"]').forEach(el => { el.textContent = bc.name; });
            const verEl = document.getElementById('biz-name-version');
            if (verEl) verEl.textContent = bc.name + ' v2.1';
            // Update bento home card
            const tagEl = document.getElementById('bento-biz-tagline');
            if (tagEl) tagEl.textContent = bc.tagline;
            const webLabel = document.getElementById('bento-biz-website');
            if (webLabel) webLabel.textContent = bc.website + '/card';
            const igLink = document.getElementById('bento-ig-link');
            if (igLink) igLink.href = 'https://www.instagram.com/' + bc.instagram.replace('@','') + '/';
            const webLink = document.getElementById('bento-web-link');
            if (webLink) webLink.href = bc.websiteFull;
            if (document.getElementById('biz-name')) renderBusinessProfileCard();
        }

        // ─── DIGITAL BUSINESS CARD ───────────────────────────────────────────
        function openBizCardModal() {
            const modal = document.getElementById('biz-card-modal');
            modal.style.display = 'flex';
            drawBizCard();
        }
        function closeBizCardModal() {
            document.getElementById('biz-card-modal').style.display = 'none';
        }

        async function drawBizCard() {
            const canvas = document.getElementById('biz-card-canvas');
            const ctx = canvas.getContext('2d');
            const W = 1050, H = 600;
            canvas.width = W; canvas.height = H;
            const bc = getBC();

            // Background gradient
            const bg = ctx.createLinearGradient(0, 0, W, H);
            bg.addColorStop(0, '#0d1526');
            bg.addColorStop(0.5, '#112038');
            bg.addColorStop(1, '#0d1526');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Top accent bar (green)
            const topBar = ctx.createLinearGradient(0, 0, W, 0);
            topBar.addColorStop(0, '#059669');
            topBar.addColorStop(0.5, '#10a37f');
            topBar.addColorStop(1, '#059669');
            ctx.fillStyle = topBar;
            ctx.fillRect(0, 0, W, 6);

            // Subtle grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

            // Logo circle (left column)
            const logoX = 140, logoY = H / 2, logoR = 80;
            // Circle border
            ctx.beginPath();
            ctx.arc(logoX, logoY, logoR + 3, 0, Math.PI * 2);
            const circleBorder = ctx.createLinearGradient(logoX - logoR, logoY - logoR, logoX + logoR, logoY + logoR);
            circleBorder.addColorStop(0, 'rgba(16,163,127,0.8)');
            circleBorder.addColorStop(1, 'rgba(5,150,105,0.4)');
            ctx.fillStyle = circleBorder;
            ctx.fill();

            // Load and draw logo image
            const logoSrc = bc.logo || bc.logoDefault;
            await new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(logoX, logoY, logoR, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, logoX - logoR, logoY - logoR, logoR * 2, logoR * 2);
                    ctx.restore();
                    resolve();
                };
                img.onerror = () => {
                    // Fallback: draw emoji
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(logoX, logoY, logoR, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(16,163,127,0.2)';
                    ctx.fill();
                    ctx.restore();
                    ctx.font = '56px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(bc.emoji, logoX, logoY);
                    resolve();
                };
                img.src = logoSrc;
            });

            // Right content area
            const contentX = 260;

            // Business name
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.97)';
            ctx.fillText(bc.name, contentX, 180);

            // Divider line
            const divY = 220;
            const divGrad = ctx.createLinearGradient(contentX, divY, W - 40, divY);
            divGrad.addColorStop(0, 'rgba(16,163,127,0.6)');
            divGrad.addColorStop(1, 'rgba(16,163,127,0)');
            ctx.strokeStyle = divGrad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(contentX, divY);
            ctx.lineTo(W - 40, divY);
            ctx.stroke();

            // Contact info grid (2 columns)
            const infoStartY = divY + 36;
            const col1X = contentX;
            const col2X = contentX + Math.round((W - contentX - 40) / 2) + 10;
            const rowH = 46;
            const contacts = [
                { icon: '📞', label: bc.phone,     col: 0, row: 0 },
                { icon: '💬', label: bc.whatsapp,  col: 1, row: 0 },
                { icon: '✉️', label: bc.email,     col: 0, row: 1 },
                { icon: '🌐', label: bc.website,   col: 1, row: 1 },
                { icon: '📸', label: bc.instagram, col: 0, row: 2 },
            ];
            ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            for (const c of contacts) {
                const cx = c.col === 0 ? col1X : col2X;
                const cy = infoStartY + c.row * rowH;
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.icon + '  ' + c.label, cx, cy);
            }

            // Bottom bar
            const botBar = ctx.createLinearGradient(0, H - 44, W, H - 44);
            botBar.addColorStop(0, 'rgba(16,163,127,0.18)');
            botBar.addColorStop(1, 'rgba(16,163,127,0.05)');
            ctx.fillStyle = botBar;
            ctx.fillRect(0, H - 44, W, 44);

            ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌐 ' + bc.websiteFull.replace('https://', ''), W / 2, H - 22);
        }

        function saveBizCardImage() {
            const canvas = document.getElementById('biz-card-canvas');
            const bc = getBC();
            const link = document.createElement('a');
            link.download = bc.name.replace(/\s+/g, '-') + '-tarjeta.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('✅ Imagen guardada');
        }

        function saveBizCardVCard() {
            const bc = getBC();
            const phone = bc.phone.replace(/\D/g, '');
            const whatsapp = bc.whatsapp.replace(/\D/g, '');
            const instagram = bc.instagram.replace('@', '');
            const vcf = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                'FN:' + bc.name,
                'ORG:' + bc.name,
                'TEL;TYPE=CELL:+' + phone,
                'TEL;TYPE=WORK:+' + whatsapp,
                'EMAIL:' + bc.email,
                'URL:' + bc.websiteFull,
                'X-SOCIALPROFILE;type=instagram:https://www.instagram.com/' + instagram + '/',
                'END:VCARD'
            ].join('\r\n');
            const blob = new Blob([vcf], { type: 'text/vcard' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = bc.name.replace(/\s+/g, '-') + '.vcf';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            showToast('✅ Contacto guardado');
        }

        async function shareDigitalCard() {
            const bc = getBC();
            const cardUrl = bc.websiteFull.replace(/\/$/, '') + '/card';
            // Share URL only — WhatsApp/iMessage generate a rich link preview
            // using the OG image (card design). Tapping the preview opens the card page.
            // PNG download is available via "Guardar imagen".
            if (navigator.share) {
                try {
                    await navigator.share({ title: bc.name, url: cardUrl });
                    return;
                } catch(e) { /* fallthrough */ }
            }
            // Fallback: copy URL to clipboard
            try {
                await navigator.clipboard.writeText(cardUrl);
                showToast('🔗 Enlace copiado al portapapeles');
            } catch(e) {
                showToast('📋 ' + cardUrl);
            }
        }
        function triggerLogoUpload() {
            document.getElementById('biz-logo-input').click();
        }
        function handleLogoUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const cfg = { ...getBC(), logo: e.target.result };
                localStorage.setItem(BUSINESS_CONFIG_KEY, JSON.stringify(cfg));
                _businessConfig = cfg;
                renderBusinessProfileCard();
                document.querySelectorAll('.biz-logo-dynamic').forEach(el => { el.src = e.target.result; });
                showToast('✅ Logo actualizado');
            };
            reader.readAsDataURL(file);
        }
        function renderBusinessProfileCard() {
            const bc = getBC();
            const logoEl = document.getElementById('biz-logo-img');
            if (logoEl) logoEl.src = bc.logo || bc.logoDefault;
            const fields = {
                'biz-name': bc.name, 'biz-tagline': bc.tagline, 'biz-website': bc.website,
                'biz-instagram': bc.instagram, 'biz-phone': bc.phone,
                'biz-whatsapp': bc.whatsapp, 'biz-email': bc.email,
            };
            Object.entries(fields).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            });
            const emojiEl = document.getElementById('biz-emoji');
            if (emojiEl) emojiEl.value = bc.emoji;
            // Render saved API key (masked)
            const keyEl = document.getElementById('gemini-api-key');
            if (keyEl && localStorage.getItem('rize_gemini_key')) keyEl.value = localStorage.getItem('rize_gemini_key');
        }

        function saveGeminiKey() {
            const key = (document.getElementById('gemini-api-key').value || '').trim();
            if (!key) { showToast('⚠️ Ingresa una API Key'); return; }
            localStorage.setItem('rize_gemini_key', key);
            localStorage.removeItem('rize_gemini_model');
            _geminiModel = null;
            const masked = key.slice(0,6) + '••••••••' + key.slice(-4);
            showToast('✅ Gemini Key guardada: ' + masked, 3500);
        }
        function saveGroqKey() {
            const key = (document.getElementById('groq-api-key').value || '').trim();
            if (!key) { showToast('⚠️ Ingresa una API Key'); return; }
            localStorage.setItem('rize_groq_key', key);
            const masked = key.slice(0,6) + '••••••••' + key.slice(-4);
            showToast('✅ Groq Key guardada: ' + masked, 3500);
        }
        function saveOpenAITTSKey() {
            const key = (document.getElementById('openai-tts-key').value || '').trim();
            if (!key) return;
            localStorage.setItem('rize_openai_tts_key', key);
            showToast('✅ OpenAI Key guardada');
        }
        // Load saved OpenAI key on init
        document.addEventListener('DOMContentLoaded', ()=>{
            const k=localStorage.getItem('rize_openai_tts_key');
            const el=document.getElementById('openai-tts-key');
            if(k&&el) el.value=k;
        });

        // ─── AI ASSISTANT SYSTEM ─────────────────────────────────────────────
        let _aiHistory = [];
        let _aiThinking = false;
        let _aiWelcomed = false;

        // ── Memoria persistente ───────────────────────────────────────────────
        const AI_MEMORY_KEY = 'rize_ai_memory';
        function getAIMemory() {
            try { const s=localStorage.getItem(AI_MEMORY_KEY); return s?JSON.parse(s):{notes:[],summary:'',total_messages:0}; }
            catch { return {notes:[],summary:'',total_messages:0}; }
        }
        function saveAIMemory(mem) { try{localStorage.setItem(AI_MEMORY_KEY,JSON.stringify(mem));}catch{} }

        // ── System Prompt ──────────────────────────────────────────────────────
        function buildAISystemPrompt() {
            const bc=getBC(); const now=new Date(); const todayStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
            const weekday=now.toLocaleDateString('es',{weekday:'long'});
            const mem=getAIMemory();
            // Servicios
            let svcTxt='(sin configurar)';
            try {
                const cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');
                if(Array.isArray(cfg)&&cfg.length) svcTxt=cfg.map(s=>`${s.name}:$${s.price||s.basePrice||'?'}${s.priceRange?' ('+s.priceRange+')':''}`).join(' | ');
                else {
                    const cfg2=JSON.parse(localStorage.getItem('servicesConfig')||'{}');
                    const lines=Object.entries(cfg2).map(([k,v])=>`${v.name||k}:$${v.price||v.basePrice||'?'}`);
                    if(lines.length) svcTxt=lines.join(' | ');
                }
            } catch {}
            // Citas
            let allApts=[];
            try { allApts=JSON.parse(localStorage.getItem('appointments')||'[]'); } catch {}
            const fmt=a=>`${a.date||a.fecha||''} ${a.time||a.hora||''} | ${a.clientName||a.cliente||a.name||'?'} | ${a.service||a.servicio||a.job||''}${a.price?' $'+a.price:''}${a.city?' ('+a.city+')':''}`;
            const hoy=allApts.filter(a=>(a.date||a.fecha||'').startsWith(todayStr));
            const prox=allApts.filter(a=>(a.date||a.fecha||'')>todayStr).sort((a,b)=>((a.date||a.fecha||'')>(b.date||b.fecha||''))?1:-1).slice(0,10);
            // Stats
            const total=allApts.length;
            const ingresos=allApts.reduce((s,a)=>s+(parseFloat(a.price)||0),0);
            const uniqueNames=new Set();
            allApts.forEach(a=>{const n=(a.clientName||a.cliente||a.name||'').trim().toLowerCase();if(n)uniqueNames.add(n);});
            try{JSON.parse(localStorage.getItem('clientRegistry')||'[]').forEach(c=>{const n=(c.name||'').trim().toLowerCase();if(n)uniqueNames.add(n);});}catch{}
            const nClients=uniqueNames.size;
            // Memoria
            const memBlock=(mem.notes.length>0||mem.summary)
                ?`\nMEMORIA PERSISTENTE: ${mem.summary||''} ${mem.notes.slice(-8).map(n=>n.content).join(' | ')}\n`:'';
            const appCfg = _getAppCfg();
            const agentName = appCfg.agent_name || bc.agentName || 'Asistente';
            const personality = appCfg.agent_personality || '';
            const businessDoc = appCfg.business_doc || '';
            return `Eres ${agentName}${personality ? ' — ' + personality : ''}. Eres un AGENTE COMPLETO con conocimiento general ilimitado y acceso total a la app. Respondes en ${appCfg.language==='en'?'inglés':'español'}.

NEGOCIO: ${bc.name||'—'} | Tel: ${bc.phone||'—'} | Email: ${bc.email||'—'} | Web: ${bc.website||'—'} | IG: ${bc.instagram||'—'}
Slogan: "${bc.tagline||''}"
${businessDoc ? 'CONTEXTO DEL NEGOCIO: ' + businessDoc : ''}

FECHA HOY: ${todayStr} (${weekday})
SERVICIOS: ${svcTxt}
STATS GLOBALES: ${total} citas totales | $${ingresos.toFixed(0)} ingresos acumulados | ${nClients} clientes únicos
HOY (${todayStr}): ${hoy.length?hoy.map(fmt).join(' // '):'sin citas'}
PRÓXIMAS ${prox.length} citas: ${prox.length?prox.map(fmt).join(' // '):'ninguna'}
${memBlock}
APP — ARQUITECTURA:
Archivo único HTML ~20,000 líneas. Stack: Supabase (cloud sync) + IndexedDB (cache) + localStorage (fallback offline). API: Google Gemini (agente IA), Groq Whisper (voz→texto), ElevenLabs TTS. PDF con jsPDF. Offline-first: funciona sin internet.

APP — SECCIONES (viewName para navigate_to/execute_js):
• schedule — Agenda del día: lista de citas, crear/editar/eliminar/reagendar. Máx 3 citas/día. Incluye extractión de citas desde fotos de WhatsApp/Messenger con IA.
• calendar — Calendario semanal: navegar semanas, ver citas por día, marcar días (vacaciones|libre|compromiso|salida|sin-pega), costo de gasolina por día calculado en base a ciudades de las citas.
• history — Registro de clientes: búsqueda, filtros por ciudad, ver perfil completo, editar, eliminar.
• datos — Analíticas: gráfico de ciudades atendidas, tipos de servicio más comunes, ingresos por ciudad, tendencia mensual de ingresos.
• finance — Finanzas: ingresos semanales y mensuales, costo de gasolina acumulado (distancias reales desde Mapleton), rentabilidad por viaje.
• messages — Mensajes: plantillas personalizables para WhatsApp/SMS (confirmación, recordatorio, recibo, cotización).
• settings — Configuración: servicios y precios, perfil del negocio, API keys (Groq, OpenAI TTS), temas de fondo visuales.

APP — ESTRUCTURA DE DATOS (localStorage):
• appointments: [{id, date(YYYY-MM-DD), time(HH:MM), clientName, service, price, city, notes, phone, status, timestamp}]
• clientRegistry: [{id, name, phone, email, city, notes}]
• dayEvents: {"YYYY-MM-DD": "vacaciones"|"libre"|"compromiso"|"salida"|"sin-pega"}
• rize_services_config: [{id, name, price, basePrice, priceRange}]
• rize_business_config: {name, tagline, phone, email, website, instagram, emoji, logo}
• gasPriceHistory: {"fecha": precio_galón} — precios históricos de gasolina en Utah
• rize_ai_memory: {notes:[], summary, total_messages}

APP — FUNCIONES JS GLOBALES DISPONIBLES (usar via execute_js):
• showToast(msg, duration) — notificación flotante (duration ms, default 2200)
• navigateToView(viewName) — navegar desde home/bento con animación de entrada
• showView(viewName) — cambiar vista directamente sin animación (schedule|calendar|history|datos|finance|messages|settings)
• returnToBentoGrid() — ir al home/bento grid
• generateWeeklyCalendar() — recargar el calendario semanal
• loadClientRegistry() — recargar lista de clientes
• loadFinanceData() — recargar finanzas
• loadDatosAnalytics() — recargar analíticas
• loadAppointments() — recargar agenda/schedule
• applyBgTheme(theme) — cambiar tema visual: bosque|midnight|violeta|carbon|oceano|bosque2
• calculateGasCost(cities, dateString) — costo de gasolina para array de ciudades en una fecha
• findOptimalRoute(cities) — ruta óptima desde Mapleton hacia múltiples ciudades
• showConfirm(message, onConfirm, {icon,okLabel,okColor}) — modal de confirmación
• generateReceiptModal() — abrir generador de recibos/facturas
• updateAppointmentCounter() — actualizar contador de citas en la UI
• OfflineDB.getAppointments() — Promise con todas las citas (fuente principal de datos)
• OfflineDB.saveAppointment(apt) — guardar cita en todos los storage
• OfflineDB.deleteAppointment(id) — eliminar cita

APP — CAPACIDADES ESPECIALES:
• Gas cost: calcula costo real de gasolina por ciudad basado en distancias desde Mapleton y precio actual en Utah
• Route optimization: encuentra la ruta más eficiente para múltiples ciudades en un día
• Receipt generation: genera facturas/recibos en PDF con logo del negocio
• Image AI extraction: extrae datos de citas desde fotos de conversaciones de WhatsApp/Messenger
• WhatsApp templates: genera mensajes personalizados para enviar por SMS/WhatsApp
• Business card: genera tarjeta de presentación y vCard descargable
• Themes: 6 temas visuales de fondo (bosque, midnight, violeta, carbon, oceano, bosque2)

REGLAS DEL AGENTE:
- Usa tools para leer/escribir datos de la app. Usa execute_js para acciones en la UI o funciones no cubiertas por tools.
- Confirma ANTES de ejecutar acciones destructivas: delete_appointment, delete_client, update_service_price, execute_js que modifique datos persistentes.
- Para reagendar/actualizar con datos claros: ejecuta directo sin confirmar.
- Para imágenes de WhatsApp/Messenger: extrae el nombre DEL CONTACTO visible en la imagen (no de la lista de citas existente).
- Para preguntas generales (código, ciencias, idiomas, historia, consejos, etc.): responde como experto con conocimiento amplio y detallado.
- Adapta la longitud de respuesta a lo que pide el usuario: breve para saludos/preguntas simples, detallado para análisis, mejoras, o preguntas técnicas.
- Si el usuario pide mejoras a la app, analiza el contexto real del código y da sugerencias concretas y aplicables.`;
        }

        // ── Herramientas (Tool Calling) ──────────────────────────────────────────
        const AI_TOOLS = [
            {type:'function',function:{name:'search_appointments',description:'Busca citas por texto/fecha/cliente.',
                parameters:{type:'object',properties:{query:{type:'string'},limit:{type:'number'}},required:['query']}}},
            {type:'function',function:{name:'get_appointments',description:'Lista citas de un período: today, tomorrow, week, month, fecha específica YYYY-MM-DD, o mes completo YYYY-MM (ej: 2025-02 para febrero 2025).',
                parameters:{type:'object',properties:{period:{type:'string',description:'today|tomorrow|week|month|YYYY-MM-DD|YYYY-MM'}},required:['period']}}},
            {type:'function',function:{name:'get_stats',description:'Ingresos y totales. period: today|week|month|all|YYYY-MM (mes específico, ej: 2025-02 para febrero 2025, 2024-12 para diciembre 2024)',
                parameters:{type:'object',properties:{period:{type:'string',description:'today|week|month|all|YYYY-MM'}},required:['period']}}},
            {type:'function',function:{name:'search_clients',description:'Busca cliente por nombre/tel/email.',
                parameters:{type:'object',properties:{query:{type:'string'}},required:['query']}}},
            {type:'function',function:{name:'add_client',description:'Agrega cliente. Confirma antes.',
                parameters:{type:'object',properties:{name:{type:'string'},phone:{type:'string'},email:{type:'string'},city:{type:'string'},notes:{type:'string'}},required:['name']}}},
            {type:'function',function:{name:'update_client',description:'Actualiza datos de un cliente (teléfono, email, notas, ciudad).',
                parameters:{type:'object',properties:{name:{type:'string',description:'Nombre del cliente a buscar'},phone:{type:'string'},email:{type:'string'},city:{type:'string'},notes:{type:'string'}},required:['name']}}},
            {type:'function',function:{name:'delete_client',description:'Elimina un cliente del registro.',
                parameters:{type:'object',properties:{name:{type:'string',description:'Nombre del cliente'}},required:['name']}}},
            {type:'function',function:{name:'create_appointment',description:'Crea cita. Confirma antes. date=YYYY-MM-DD time=HH:MM. price solo número sin $.',
                parameters:{type:'object',properties:{date:{type:'string'},time:{type:'string'},client_name:{type:'string'},service:{type:'string'},price:{type:'string',description:'Solo número sin $. Ej: "90"'},city:{type:'string'},notes:{type:'string'}},required:['date','time','client_name','service','price']}}},
            {type:'function',function:{name:'delete_appointment',description:'Elimina una cita por nombre del cliente y opcionalmente fecha.',
                parameters:{type:'object',properties:{id:{type:'string'},client_name:{type:'string',description:'Nombre del cliente'},date:{type:'string',description:'Fecha YYYY-MM-DD si hay varias'}},required:['client_name']}}},
            {type:'function',function:{name:'update_appointment',description:'Modifica fecha, hora, servicio, precio, ciudad o notas de una cita. Identifica por client_name y opcionalmente date.',
                parameters:{type:'object',properties:{client_name:{type:'string',description:'Nombre del cliente para encontrar la cita'},date:{type:'string',description:'Fecha actual YYYY-MM-DD para identificar si hay varias'},new_date:{type:'string',description:'Nueva fecha YYYY-MM-DD'},new_time:{type:'string',description:'Nueva hora HH:MM'},new_service:{type:'string'},new_price:{type:'string',description:'Solo número sin $'},new_city:{type:'string'},new_notes:{type:'string'},new_name:{type:'string',description:'Nuevo nombre del cliente si se desea cambiar'}},required:['client_name']}}},
            {type:'function',function:{name:'add_day_event',description:'Marca un día en el calendario. types: vacaciones|libre|compromiso|salida|sin-pega',
                parameters:{type:'object',properties:{date:{type:'string',description:'Fecha YYYY-MM-DD'},event_type:{type:'string',enum:['vacaciones','libre','compromiso','salida','sin-pega']}},required:['date','event_type']}}},
            {type:'function',function:{name:'remove_day_event',description:'Quita el evento/marca de un día del calendario.',
                parameters:{type:'object',properties:{date:{type:'string',description:'Fecha YYYY-MM-DD'}},required:['date']}}},
            {type:'function',function:{name:'get_services',description:'Lista los servicios y precios configurados.',
                parameters:{type:'object',properties:{},required:[]}}},
            {type:'function',function:{name:'update_service_price',description:'Actualiza el precio de un servicio.',
                parameters:{type:'object',properties:{service_name:{type:'string',description:'Nombre del servicio'},price:{type:'number',description:'Nuevo precio en dólares'}},required:['service_name','price']}}},
            {type:'function',function:{name:'navigate_to',description:'Navega a una sección de la app.',
                parameters:{type:'object',properties:{section:{type:'string',enum:['schedule','calendar','clients','finance','history','datos','messages','settings']}},required:['section']}}},
            {type:'function',function:{name:'save_memory_note',description:'Guarda nota para recordar.',
                parameters:{type:'object',properties:{content:{type:'string'},category:{type:'string',enum:['preference','client_info','business_note','general']}},required:['content']}}},
            {type:'function',function:{name:'get_memory',description:'Lee notas guardadas.',
                parameters:{type:'object',properties:{category:{type:'string'}},required:[]}}},
            {type:'function',function:{name:'execute_js',
                description:'Ejecuta JavaScript arbitrario en el contexto de la app. Úsalo para: cambiar tema visual, mostrar notificaciones, navegar, llamar funciones de la app no cubiertas por otras tools, leer datos del DOM, manipular la UI, calcular costos de gasolina, generar recibos, etc. Tiene acceso a window y todas las funciones globales.',
                parameters:{type:'object',properties:{
                    code:{type:'string',description:'Código JS a ejecutar. Accede a window, document y todas las funciones globales de la app (showToast, navigateToView, showView, applyBgTheme, calculateGasCost, findOptimalRoute, OfflineDB, etc.)'},
                    description:{type:'string',description:'Descripción breve de qué hace este código'}
                },required:['code']}}}
        ];

        // ── Ejecutores de herramientas ─────────────────────────────────────────
        async function executeTool(name,args) {
            switch(name){
                case 'search_appointments':  return _toolSearchApts(args);
                case 'get_appointments':     return _toolGetAppts(args);
                case 'get_stats':            return _toolGetStats(args);
                case 'search_clients':       return _toolSearchClients(args);
                case 'add_client':           return _toolAddClient(args);
                case 'update_client':        return _toolUpdateClient(args);
                case 'delete_client':        return _toolDeleteClient(args);
                case 'create_appointment':   return _toolCreateAppt(args);
                case 'delete_appointment':   return _toolDeleteAppt(args);
                case 'update_appointment':   return _toolUpdateAppt(args);
                case 'add_day_event':        return _toolAddDayEvent(args);
                case 'remove_day_event':     return _toolRemoveDayEvent(args);
                case 'get_services':         return _toolGetServices(args);
                case 'update_service_price': return _toolUpdateServicePrice(args);
                case 'navigate_to':          return _toolNavigateTo(args);
                case 'save_memory_note':     return _toolSaveNote(args);
                case 'get_memory':           return _toolGetMem(args);
                case 'execute_js':           return _toolExecuteJs(args);
                default: return {error:'Herramienta desconocida: '+name};
            }
        }
        function _toolExecuteJs(args) {
            try {
                const fn = new Function(args.code);
                const result = fn.call(window);
                if (result && typeof result.then === 'function') {
                    return result
                        .then(r => ({success:true, result: r !== undefined ? String(r).slice(0,1000) : 'Ejecutado correctamente.'}))
                        .catch(e => ({success:false, error: e.message}));
                }
                return {success:true, result: result !== undefined ? String(result).slice(0,1000) : 'Ejecutado correctamente.'};
            } catch(e) {
                return {success:false, error: e.message};
            }
        }
        function _fmtApt(a){return{id:a.id||String(a.timestamp),date:a.date||a.fecha,time:a.time||a.hora,client:a.clientName||a.cliente||a.name,service:a.service||a.servicio||a.job,price:a.price||a.precio,city:a.city,notes:a.notes||a.notas,status:a.status};}
        async function _toolSearchApts(args) {
            const q=(args.query||'').toLowerCase(); const lim=args.limit||10;
            const apts=await OfflineDB.getAppointments();
            const r=apts.filter(a=>JSON.stringify(a).toLowerCase().includes(q)).slice(0,lim);
            return {count:r.length,appointments:r.map(_fmtApt)};
        }
        async function _toolGetAppts(args) {
            const apts=await OfflineDB.getAppointments();
            const today=new Date().toISOString().split('T')[0];
            const tomorrow=new Date(Date.now()+86400000).toISOString().split('T')[0];
            let filtered=apts;
            const p=args.period||'today';
            if(p==='today')      filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(today));
            else if(p==='tomorrow') filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(tomorrow));
            else if(p==='week'){  const wEnd=new Date(Date.now()+7*86400000).toISOString().split('T')[0];
                filtered=apts.filter(a=>{const d=a.date||a.fecha||'';return d>=today&&d<=wEnd;}); }
            else if(p==='month'){ const mEnd=new Date(Date.now()+30*86400000).toISOString().split('T')[0];
                filtered=apts.filter(a=>{const d=a.date||a.fecha||'';return d>=today&&d<=mEnd;}); }
            else if(/^\d{4}-\d{2}-\d{2}$/.test(p)) filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(p));
            else if(/^\d{4}-\d{2}$/.test(p)) filtered=apts.filter(a=>(a.date||a.fecha||'').startsWith(p));
            filtered.sort((a,b)=>((a.date||a.fecha||'')+(a.time||a.hora||''))<((b.date||b.fecha||'')+(b.time||b.hora||''))?-1:1);
            return {count:filtered.length,appointments:filtered.map(_fmtApt)};
        }
        function _toolGetStats(args) {
            const p=args.period||'all'; const now=new Date();
            const todayStr=now.toISOString().split('T')[0];
            const weekAgo=new Date(now-7*86400000).toISOString().split('T')[0];
            const curY=now.getFullYear(), curM=now.getMonth()+1;
            let apts=[]; try{apts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
            try{const dv=JSON.parse(localStorage.getItem('dayEvents')||'[]');dv.forEach(e=>{if(!apts.find(a=>a.id===e.id))apts.push(e);});}catch{}
            const f=apts.filter(a=>{const ds=(a.date||a.fecha||'').slice(0,10);
                if(p==='today')return ds===todayStr;
                if(p==='week')return ds>=weekAgo&&ds<=todayStr;
                if(p==='month'){const[y,m]=ds.split('-').map(Number);return y===curY&&m===curM;}
                if(/^\d{4}-\d{2}$/.test(p)){const[y,m]=p.split('-').map(Number);const[dy,dm]=ds.split('-').map(Number);return dy===y&&dm===m;}
                return true;});
            const rev=f.reduce((s,a)=>s+(parseFloat(a.price||a.precio)||0),0);
            const bySvc={}; f.forEach(a=>{const s=a.service||a.servicio||a.job||'?';bySvc[s]=(bySvc[s]||0)+1;});
            // Clientes únicos: nombres en citas + clientRegistry
            const names=new Set();
            apts.forEach(a=>{const n=(a.clientName||a.cliente||a.name||'').trim().toLowerCase();if(n)names.add(n);});
            try{JSON.parse(localStorage.getItem('clientRegistry')||'[]').forEach(c=>{const n=(c.name||'').trim().toLowerCase();if(n)names.add(n);});}catch{}
            return {period:p,appointments:f.length,revenue:'$'+rev.toFixed(2),unique_clients:names.size,by_service:bySvc};
        }
        function _toolSearchClients(args) {
            const q=(args.query||'').toLowerCase();
            let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
            return {count:c.filter(cl=>JSON.stringify(cl).toLowerCase().includes(q)).length,
                    clients:c.filter(cl=>JSON.stringify(cl).toLowerCase().includes(q)).slice(0,10)};
        }
        function _toolAddClient(args) {
            try{
                let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
                c.push({name:args.name,phone:args.phone||'',email:args.email||'',city:args.city||'',notes:args.notes||'',createdAt:new Date().toISOString(),source:'ai'});
                localStorage.setItem('clientRegistry',JSON.stringify(c));
                return {success:true,message:`Cliente "${args.name}" agregado.`};
            }catch(e){return{success:false,error:e.message};}
        }
        async function _toolCreateAppt(args) {
            try{
                const price=parseFloat(String(args.price||'0').replace(/[^0-9.]/g,''))||0;
                const now=new Date();
                const appt={
                    id:'ai_'+now.getTime(),
                    name:args.client_name,
                    clientName:args.client_name,
                    cliente:args.client_name,
                    time:args.time,
                    hora:args.time,
                    date:args.date,
                    fecha:args.date,
                    job:args.service,
                    service:args.service,
                    servicio:args.service,
                    price:price,
                    precio:price,
                    city:args.city||'',
                    notes:args.notes||'',
                    notas:args.notes||'',
                    address:'',
                    timestamp:now.getTime(),
                    created_at:now.toISOString()
                };
                await OfflineDB.saveAppointment(appt);
                window._cacheLoaded={};
                if(typeof updateAppointmentCounter==='function') updateAppointmentCounter();
                if(typeof generateWeeklyCalendar==='function'&&currentView==='calendar') generateWeeklyCalendar();
                else if(typeof loadAppointments==='function') loadAppointments();
                return {success:true,message:`✅ Cita creada: ${args.client_name} el ${args.date} a las ${args.time} — ${args.service} $${price}`};
            }catch(e){return{success:false,error:e.message};}
        }
        async function _toolDeleteAppt(args) {
            try{
                // Use OfflineDB so we get data from Supabase when online
                const apts = await OfflineDB.getAppointments();
                let match=null;
                // Find by ID first, then by name+date
                if(args.id) match=apts.find(a=>a.id===args.id||String(a.timestamp)===String(args.id));
                if(!match&&args.client_name){
                    const q=args.client_name.toLowerCase();
                    const candidates=apts.filter(a=>(a.name||a.clientName||'').toLowerCase().includes(q));
                    if(args.date) match=candidates.find(a=>(a.date||'').startsWith(args.date));
                    else if(candidates.length===1) match=candidates[0];
                    else if(candidates.length>1) return {success:false,message:`Encontré ${candidates.length} citas para "${args.client_name}". Especifica la fecha (YYYY-MM-DD).`,appointments:candidates.map(a=>({id:a.id||a.timestamp,date:a.date,time:a.time,name:a.name||a.clientName}))};
                }
                if(!match) return {success:false,message:'No encontré ninguna cita con esos datos. Usa search_appointments para buscarla primero.'};
                // Use OfflineDB.deleteAppointment so it handles Supabase + localStorage + IndexedDB
                await OfflineDB.deleteAppointment(match.id||match.timestamp);
                window._cacheLoaded={};
                if(typeof updateAppointmentCounter==='function') updateAppointmentCounter();
                if(typeof generateWeeklyCalendar==='function'&&currentView==='calendar') generateWeeklyCalendar();
                return {success:true,message:`✅ Cita eliminada: ${match.name||match.clientName} el ${match.date} a las ${match.time}`};
            }catch(e){return{success:false,error:e.message};}
        }
        async function _toolUpdateAppt(args) {
            try{
                const apts=await OfflineDB.getAppointments();
                // Find by client_name + optional date, or by id
                let match=null;
                if(args.id) match=apts.find(a=>a.id===args.id||String(a.timestamp)===String(args.id));
                if(!match&&args.client_name){
                    const q=args.client_name.toLowerCase();
                    const candidates=apts.filter(a=>(a.name||a.clientName||'').toLowerCase().includes(q));
                    if(args.date) match=candidates.find(a=>(a.date||'').startsWith(args.date));
                    else if(candidates.length===1) match=candidates[0];
                    else if(candidates.length>1) return {success:false,message:`Encontré ${candidates.length} citas para "${args.client_name}". Especifica la fecha actual.`,appointments:candidates.map(_fmtApt)};
                }
                if(!match) return {success:false,message:'No encontré la cita. Usa search_appointments para verificar.'};
                const appt={...match};
                if(args.new_date)    appt.date=args.new_date;
                if(args.new_time)    { appt.time=args.new_time; appt.hora=args.new_time; }
                if(args.new_name)    { appt.name=args.new_name; appt.clientName=args.new_name; }
                if(args.new_service) { appt.job=args.new_service; appt.service=args.new_service; appt.servicio=args.new_service; }
                if(args.new_price)   { const p=parseFloat(String(args.new_price).replace(/[^0-9.]/g,''))||0; appt.price=p; appt.precio=p; }
                if(args.new_city)    appt.city=args.new_city;
                if(args.new_notes!=null) appt.notes=args.new_notes;
                // Persist: update localStorage + Supabase
                let local=[]; try{local=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
                const idx=local.findIndex(a=>a.id===match.id||String(a.timestamp)===String(match.timestamp));
                if(idx!==-1){local[idx]=appt;localStorage.setItem('appointments',JSON.stringify(local));}
                if(navigator.onLine&&window.supabaseClient&&appt.timestamp){
                    try{await window.supabaseClient.from('appointments').update(appt).eq('timestamp',appt.timestamp);}catch{}
                }
                window._cacheLoaded={};
                if(typeof updateAppointmentCounter==='function') updateAppointmentCounter();
                if(typeof generateWeeklyCalendar==='function'&&currentView==='calendar') generateWeeklyCalendar();
                else if(typeof loadAppointments==='function') loadAppointments();
                return {success:true,message:`✅ Cita actualizada: ${appt.name||appt.clientName} — ${appt.date} a las ${appt.time}`};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolSaveNote(args) {
            const mem=getAIMemory();
            mem.notes.push({content:args.content,category:args.category||'general',date:new Date().toISOString().split('T')[0]});
            if(mem.notes.length>20)mem.notes=mem.notes.slice(-20);
            saveAIMemory(mem); return {success:true,message:'Nota guardada.'};
        }
        function _toolGetMem(args) {
            const mem=getAIMemory(); let notes=mem.notes;
            if(args.category)notes=notes.filter(n=>n.category===args.category);
            return {notes,summary:mem.summary,total:mem.notes.length};
        }
        function _toolUpdateClient(args) {
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
                if(typeof loadClientRegistry==='function') loadClientRegistry();
                return {success:true,message:`✅ Cliente "${c[idx].name}" actualizado.`,client:c[idx]};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolDeleteClient(args) {
            try{
                let c=[]; try{c=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
                const q=(args.name||'').toLowerCase();
                const before=c.length;
                c=c.filter(cl=>!(cl.name||'').toLowerCase().includes(q));
                if(c.length===before) return {success:false,message:`No encontré cliente con nombre "${args.name}".`};
                localStorage.setItem('clientRegistry',JSON.stringify(c));
                if(typeof loadClientRegistry==='function') loadClientRegistry();
                return {success:true,message:`✅ Cliente "${args.name}" eliminado del registro.`};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolAddDayEvent(args) {
            try{
                const validTypes=['vacaciones','libre','compromiso','salida','sin-pega'];
                if(!validTypes.includes(args.event_type)) return {success:false,message:`Tipo inválido. Usa: ${validTypes.join('|')}`};
                let events={}; try{events=JSON.parse(localStorage.getItem('dayEvents')||'{}');}catch{}
                events[args.date]=args.event_type;
                localStorage.setItem('dayEvents',JSON.stringify(events));
                if(navigator.onLine&&typeof saveDayEventToSupabase==='function'){try{saveDayEventToSupabase(args.date,args.event_type);}catch{}}
                if(typeof generateWeeklyCalendar==='function'&&currentView==='calendar') generateWeeklyCalendar();
                const labels={vacaciones:'Vacaciones 🏖',libre:'Día libre ✅',compromiso:'Compromiso 📅',salida:'Salida 🚗','sin-pega':'Sin trabajo 😴'};
                return {success:true,message:`✅ ${args.date} marcado como: ${labels[args.event_type]||args.event_type}`};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolRemoveDayEvent(args) {
            try{
                let events={}; try{events=JSON.parse(localStorage.getItem('dayEvents')||'{}');}catch{}
                if(!events[args.date]) return {success:false,message:`No hay ningún evento marcado el ${args.date}.`};
                delete events[args.date];
                localStorage.setItem('dayEvents',JSON.stringify(events));
                if(navigator.onLine&&typeof deleteDayEventFromSupabase==='function'){try{deleteDayEventFromSupabase(args.date);}catch{}}
                if(typeof generateWeeklyCalendar==='function'&&currentView==='calendar') generateWeeklyCalendar();
                return {success:true,message:`✅ Evento del ${args.date} eliminado.`};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolGetServices(args) {
            try{
                const cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');
                if(!cfg.length) return {services:[],message:'No hay servicios configurados.'};
                return {count:cfg.length,services:cfg.map(s=>({id:s.id,name:s.name,price:s.price||s.basePrice,priceRange:s.priceRange||''}))};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolUpdateServicePrice(args) {
            try{
                const q=(args.service_name||'').toLowerCase();
                let cfg=[]; try{cfg=JSON.parse(localStorage.getItem('rize_services_config')||'[]');}catch{}
                const idx=cfg.findIndex(s=>(s.name||s.id||'').toLowerCase().includes(q));
                if(idx===-1) return {success:false,message:`No encontré servicio "${args.service_name}". Usa get_services para ver la lista.`};
                cfg[idx].price=args.price; cfg[idx].basePrice=args.price;
                localStorage.setItem('rize_services_config',JSON.stringify(cfg));
                if(typeof servicesConfig!=='undefined') try{window.servicesConfig=cfg;}catch{}
                return {success:true,message:`✅ Precio de "${cfg[idx].name}" actualizado a $${args.price}.`};
            }catch(e){return{success:false,error:e.message};}
        }
        function _toolNavigateTo(args) {
            try{
                const labels={schedule:'Agenda',calendar:'Calendario',clients:'Clientes',finance:'Finanzas',history:'Historial',datos:'Analíticas',messages:'Mensajes',settings:'Configuración'};
                if(typeof showView==='function'){showView(args.section);}
                return {success:true,message:`✅ Navegando a ${labels[args.section]||args.section}.`};
            }catch(e){return{success:false,error:e.message};}
        }

        // ── Agent Loop ────────────────────────────────────────────────────────
        const _TOOL_LABELS = {
            search_appointments:'Buscando citas…', get_appointments:'Cargando citas…',
            get_stats:'Calculando estadísticas…', search_clients:'Buscando clientes…',
            execute_js:'Ejecutando acción en la app…',
            add_client:'Agregando cliente…', update_client:'Actualizando cliente…',
            delete_client:'Eliminando cliente…', create_appointment:'Creando cita…',
            delete_appointment:'Eliminando cita…', update_appointment:'Actualizando cita…',
            add_day_event:'Marcando día…', remove_day_event:'Quitando evento…',
            get_services:'Cargando servicios…', update_service_price:'Actualizando precio…',
            navigate_to:'Navegando…', save_memory_note:'Guardando en memoria…', get_memory:'Leyendo memoria…'};

        // ── Gemini model auto-detection ───────────────────────────────────────
        const _GEMINI_CANDIDATES=['gemini-2.5-flash-preview-05-20','gemini-2.5-flash','gemini-2.0-flash-lite','gemini-2.0-flash-exp','gemini-1.5-flash-latest','gemini-1.5-flash-002','gemini-1.5-flash','gemini-1.5-pro'];
        let _geminiModel=localStorage.getItem('rize_gemini_model')||null;
        async function _resolveModel(){
            if(_geminiModel) return _geminiModel;
            const key=localStorage.getItem('rize_gemini_key');
            if(!key) throw new Error('⚠️ API Key no configurada. Ve a Configuración.');
            for(const m of _GEMINI_CANDIDATES){
                const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}?key=${encodeURIComponent(key)}`);
                if(r.ok){_geminiModel=m;localStorage.setItem('rize_gemini_model',m);showToast('✅ Modelo Gemini: '+m,3000);return m;}
            }
            throw new Error('⚠️ No se encontró un modelo Gemini disponible para tu API key.');
        }

        // ── Gemini Native API helpers ─────────────────────────────────────────
        function _toGeminiContents(messages) {
            // Convierte mensajes formato OpenAI → formato nativo Gemini
            let systemText='';
            const contents=[];
            for(const msg of messages){
                if(msg.role==='system'){systemText=msg.content;continue;}
                if(msg.role==='user'){
                    const parts=[];
                    if(typeof msg.content==='string') parts.push({text:msg.content});
                    else if(Array.isArray(msg.content)) msg.content.forEach(item=>{
                        if(item.type==='text') parts.push({text:item.text});
                        if(item.type==='image_url'){
                            const m=item.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
                            if(m) parts.push({inlineData:{mimeType:m[1],data:m[2]}});
                        }
                    });
                    contents.push({role:'user',parts});
                } else if(msg.role==='assistant'){
                    const parts=[];
                    if(msg.content) parts.push({text:msg.content});
                    if(msg.tool_calls) msg.tool_calls.forEach(tc=>{
                        let args={}; try{args=JSON.parse(tc.function.arguments);}catch{}
                        parts.push({functionCall:{name:tc.function.name,args}});
                    });
                    if(parts.length) contents.push({role:'model',parts});
                } else if(msg.role==='tool'){
                    let response={}; try{response=JSON.parse(msg.content);}catch{response={result:msg.content};}
                    const last=contents[contents.length-1];
                    if(last&&last.role==='user'&&last.parts[0]?.functionResponse)
                        last.parts.push({functionResponse:{name:msg.name,response}});
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
            if(!key) throw new Error('⚠️ API Key no configurada. Ve a Configuración.');
            const model=await _resolveModel();
            const body={contents,...(systemText&&{systemInstruction:{parts:[{text:systemText}]}}),...(tools&&{tools:_toGeminiTools(tools),toolConfig:{function_calling_config:{mode:'AUTO'}}}),generationConfig:{maxOutputTokens:2048,temperature:0.6,...genConfig}};
            const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
            if(res.status===429&&attempt<2){
                const wait=4000+attempt*3000;
                _updateThinkingStatus(`Esperando límite de API (${Math.round(wait/1000)}s)…`);
                await new Promise(r=>setTimeout(r,wait));
                return _geminiCall(systemText,contents,tools,genConfig,attempt+1);
            }
            return res;
        }

        async function runAgentLoop(history) {
            await _loadAppAgentConfig(); // garantizar config cargada antes del prompt
            const allMsgs=[{role:'system',content:buildAISystemPrompt()},...history];
            for(let i=0;i<8;i++){
                const {systemText,contents}=_toGeminiContents(allMsgs);
                const res=await _geminiCall(systemText,contents,AI_TOOLS);
                if(!res.ok){const err=await res.json().catch(()=>({}));
                    if(res.status===400) throw new Error('⚠️ Error: '+(err.error?.message||'solicitud inválida'));
                    if(res.status===401||res.status===403) throw new Error('⚠️ API Key inválida. Ve a Configuración.');
                    if(res.status===429) throw new Error('⚠️ Límite de API alcanzado. Espera 1 minuto.');
                    throw new Error('⚠️ Error '+(err.error?.message||res.status));}
                const data=await res.json();
                const parts=data.candidates?.[0]?.content?.parts||[];
                const funcParts=parts.filter(p=>p.functionCall);
                const responseText=parts.filter(p=>p.text).map(p=>p.text).join('');
                if(!funcParts.length){
                    const mem=getAIMemory();mem.total_messages=(mem.total_messages||0)+1;saveAIMemory(mem);
                    return responseText||'(sin respuesta)';
                }
                allMsgs.push({role:'assistant',content:responseText||null,tool_calls:funcParts.map((p,idx)=>({id:'c'+i+'_'+idx,type:'function',function:{name:p.functionCall.name,arguments:JSON.stringify(p.functionCall.args)}}))});
                for(const fp of funcParts){
                    _updateThinkingStatus(_TOOL_LABELS[fp.functionCall.name]||fp.functionCall.name);
                    const result=await executeTool(fp.functionCall.name,fp.functionCall.args);
                    allMsgs.push({role:'tool',tool_call_id:'c'+i,name:fp.functionCall.name,content:JSON.stringify(result)});
                }
                if(i<7) await new Promise(r=>setTimeout(r,300));
            }
            return 'Alcancé el límite de operaciones. Intenta con una pregunta más específica.';
        }

        // callGroqVisionAPI — imagen via Llama Vision (Groq)
        async function callGroqVisionAPI(userText,imageBase64,imageMime='image/jpeg'){
            const groqKey=localStorage.getItem('rize_groq_key');
            if(!groqKey) return null; // sin key → fallback a Gemini
            const models=['meta-llama/llama-4-scout-17b-16e-instruct','llama-3.2-90b-vision-preview','llama-3.2-11b-vision-preview'];
            for(const model of models){
                try{
                    const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{
                        method:'POST',
                        headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},
                        body:JSON.stringify({
                            model,
                            messages:[{role:'user',content:[
                                {type:'text',text:userText},
                                {type:'image_url',image_url:{url:`data:${imageMime};base64,${imageBase64}`}}
                            ]}],
                            max_tokens:1024,temperature:0.2
                        })
                    });
                    if(res.status===404||res.status===400) continue; // modelo no disponible, prueba el siguiente
                    if(!res.ok){const err=await res.json().catch(()=>({}));return '⚠️ Error Groq: '+(err.error?.message||res.status);}
                    const data=await res.json();
                    return data.choices?.[0]?.message?.content||'(sin respuesta)';
                }catch(e){ continue; }
            }
            return null; // todos fallaron → fallback a Gemini
        }

        // callGeminiAPI — visión nativa Gemini
        async function callGeminiAPI(userText,imageBase64=null,imageMime='image/jpeg') {
            const sysPrompt=imageBase64
                ?'Eres el asistente de LivinGreen, empresa de limpieza en Utah. Cuando ves un screenshot de conversación (WhatsApp, Messenger, texto), tu tarea es extraer exactamente los campos del formulario de agendamiento: Nombre completo, Fecha, Hora, Ciudad, Dirección, Tipo de trabajo, Precio, Notas. Lee todos los mensajes visibles. Si un dato no aparece escribe "No especificado". Responde en español listando cada campo claramente.'
                :buildAISystemPrompt();
            const parts=[];
            if(imageBase64) parts.push({inlineData:{mimeType:imageMime,data:imageBase64}});
            parts.push({text:userText});
            const contents=[{role:'user',parts}];
            try{
                const res=await _geminiCall(sysPrompt,contents,null,{maxOutputTokens:imageBase64?1024:800,temperature:0.3});
                if(!res.ok){const err=await res.json().catch(()=>({}));if(res.status===401||res.status===403)return'⚠️ API Key inválida';return'⚠️ Error '+(err.error?.message||res.status);}
                const data=await res.json();
                return data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'(sin respuesta)';
            }catch(e){return'⚠️ Error de conexión: '+e.message;}
        }

        const _BTN_STYLE = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;cursor:pointer;background:transparent;border:none;padding:0;';
        const _ICON_STYLE = 'font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);';

        function _aiCopy(el, text) {
            const copy=()=>{ el.querySelector('span').textContent='✓'; el.querySelector('span').style.color='#10a37f'; setTimeout(()=>{ el.querySelector('span').textContent='⧉'; el.querySelector('span').style.color='rgba(255,255,255,0.7)';},1500); };
            if(navigator.clipboard){ navigator.clipboard.writeText(text).then(copy).catch(copy); }
            else{ try{ const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);copy(); }catch(e){} }
        }

        // ── TTS (iOS PWA compatible) ──────────────────────────────────────────
        const _isIOSPWA=navigator.standalone===true;
        let _ttsAudio=null, _ttsKA=null;
        // ElevenLabs config (stored in localStorage so it's not in source)
        const _ELABS_VOICE='ErXwobaYiN019PkySvjV'; // Antoni – multilingual male
        function _getElabsKey(){ return localStorage.getItem('elabs_key')||''; }

        function _pickVoice(){
            const voices=window.speechSynthesis.getVoices();
            const isEs=v=>/^es/i.test(v.lang);
            return voices.find(v=>/siri voz 1/i.test(v.name))||
                   voices.find(v=>/siri voz/i.test(v.name))||
                   voices.find(v=>isEs(v)&&/siri/i.test(v.name))||
                   voices.find(v=>isEs(v)&&/premium|enhanced/i.test(v.name))||
                   voices.find(v=>isEs(v)&&/jorge|diego|carlos|andr[eé]s/i.test(v.name))||
                   voices.find(v=>isEs(v))||null;
        }
        if(window.speechSynthesis) window.speechSynthesis.onvoiceschanged=()=>{};

        // Unlock iOS audio context synchronously in gesture handler
        function _unlockIOSAudio(){
            try{
                const ctx=new(window.AudioContext||window.webkitAudioContext)();
                const buf=ctx.createBuffer(1,1,22050);
                const src=ctx.createBufferSource();
                src.buffer=buf; src.connect(ctx.destination); src.start(0);
                ctx.resume();
            }catch(e){}
        }

        function _aiSpeak(el, text) {
            const span=el.querySelector('span');
            const isSpeaking=_ttsAudio||(window.speechSynthesis&&window.speechSynthesis.speaking)||_ttsKA;
            if(isSpeaking){
                if(_ttsAudio){_ttsAudio.pause();URL.revokeObjectURL(_ttsAudio.src);_ttsAudio=null;}
                clearInterval(_ttsKA);_ttsKA=null;
                if(window.speechSynthesis)window.speechSynthesis.cancel();
                span.textContent='🔊';span.style.color='rgba(255,255,255,0.7)';return;
            }
            const reset=()=>{_ttsAudio=null;clearInterval(_ttsKA);_ttsKA=null;span.textContent='🔊';span.style.color='rgba(255,255,255,0.7)';};

            const key=_getElabsKey();

            if(_isIOSPWA && key){
                // iOS PWA + ElevenLabs: unlock audio synchronously, then fetch
                _unlockIOSAudio();
                span.textContent='⏳';span.style.color='rgba(255,255,255,0.5)';
                fetch('https://api.elevenlabs.io/v1/text-to-speech/'+_ELABS_VOICE,{
                    method:'POST',
                    headers:{'xi-api-key':key,'Content-Type':'application/json'},
                    body:JSON.stringify({text:text,model_id:'eleven_multilingual_v2',voice_settings:{stability:0.45,similarity_boost:0.75,style:0.3,use_speaker_boost:true}})
                })
                .then(r=>{ if(!r.ok)throw r.status; return r.blob(); })
                .then(blob=>{
                    const url=URL.createObjectURL(blob);
                    _ttsAudio=new Audio(url);
                    _ttsAudio.onended=()=>{URL.revokeObjectURL(url);reset();};
                    _ttsAudio.onerror=reset;
                    span.textContent='⏹';span.style.color='#10a37f';
                    _ttsAudio.play().catch(reset);
                })
                .catch(reset);

            } else if(_isIOSPWA){
                // iOS PWA fallback: Google TTS chunks
                span.textContent='⏹';span.style.color='#10a37f';
                const chunks=text.match(/.{1,190}(?:[.!?;,]|\s|$)/g)||[text];
                let idx=0;
                function playNext(){
                    if(idx>=chunks.length){reset();return;}
                    const chunk=chunks[idx++].trim();
                    if(!chunk){playNext();return;}
                    const url='https://translate.google.com/translate_tts?ie=UTF-8&tl=es-US&client=tw-ob&ttsspeed=0.9&q='+encodeURIComponent(chunk);
                    _ttsAudio=new Audio(url);
                    _ttsAudio.onended=playNext;
                    _ttsAudio.onerror=playNext;
                    _ttsAudio.play().catch(playNext);
                }
                playNext();

            } else {
                // Browser (Safari/Desktop): Web Speech API
                span.textContent='⏹';span.style.color='#10a37f';
                const ss=window.speechSynthesis;
                const utt=new SpeechSynthesisUtterance(text);
                const voice=_pickVoice();
                if(voice){utt.voice=voice;utt.lang=voice.lang;}else{utt.lang='es-US';}
                utt.rate=0.95;utt.pitch=1.0;utt.volume=1.0;
                utt.onend=reset;utt.onerror=reset;
                ss.cancel();ss.resume();ss.speak(utt);
                _ttsKA=setInterval(()=>{ss.pause();ss.resume();},10000);
            }
        }

        function _makeActionBar(text, isUser) {
            const bar=document.createElement('div');
            bar.style.cssText=`display:flex;gap:2px;margin-top:5px;${isUser?'justify-content:flex-end':''}`;
            // Copy button
            const copyEl=document.createElement('div');
            copyEl.style.cssText=_BTN_STYLE;
            copyEl.innerHTML=`<span style="${_ICON_STYLE}">⧉</span>`;
            copyEl.onclick=()=>_aiCopy(copyEl,text);
            bar.appendChild(copyEl);
            // Speak button (assistant only)
            if(!isUser){
                const speakEl=document.createElement('div');
                speakEl.style.cssText=_BTN_STYLE;
                speakEl.innerHTML=`<span style="${_ICON_STYLE}">🔊</span>`;
                speakEl.onclick=()=>_aiSpeak(speakEl,text);
                bar.appendChild(speakEl);
            }
            return bar;
        }

        function _hideEmptyState(){
            const e=document.getElementById('ai-empty-state');
            if(e) e.style.display='none';
        }
        function _addAIBubble(role, text) {
            _hideEmptyState();
            const wrap=document.getElementById('ai-messages'); const isUser=role==='user';
            const row=document.createElement('div'); row.className='ai-msg';
            row.style.cssText=`display:flex;align-items:flex-start;justify-content:${isUser?'flex-end':'flex-start'};margin-bottom:${isUser?'8':'16'}px;gap:10px;`;
            if(!isUser){
                const av=document.createElement('div');
                av.style.cssText='width:28px;height:28px;border-radius:50%;background:rgba(16,163,127,0.18);border:1px solid rgba(16,163,127,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;';
                av.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="#10a37f"><path d="M12 2C12 2 13.2 7.8 16 10.5C18.8 13.2 24 12 24 12C24 12 18.8 10.8 16 13.5C13.2 16.2 12 22 12 22C12 22 10.8 16.2 8 13.5C5.2 10.8 0 12 0 12C0 12 5.2 13.2 8 10.5C10.8 7.8 12 2 12 2Z"/></svg>';
                row.appendChild(av);
            }
            const col=document.createElement('div');
            col.style.cssText=`display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};max-width:78%;`;
            const bubble=document.createElement('div'); bubble.className=isUser?'ai-bubble-user':'ai-bubble-assistant';
            if(isUser) bubble.style.maxWidth='100%';
            bubble.textContent=text; col.appendChild(bubble);
            col.appendChild(_makeActionBar(text,isUser));
            row.appendChild(col); wrap.appendChild(row); wrap.scrollTop=wrap.scrollHeight;
        }

        async function _streamAIBubble(text) {
            _hideEmptyState();
            const wrap=document.getElementById('ai-messages');
            const row=document.createElement('div'); row.className='ai-msg';
            row.style.cssText='display:flex;align-items:flex-start;justify-content:flex-start;margin-bottom:16px;gap:10px;';
            const av=document.createElement('div');
            av.style.cssText='width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-top:2px;';
            av.innerHTML='<img src="./images/agenda-logo.jpg" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            row.appendChild(av);
            const col=document.createElement('div');
            col.style.cssText='display:flex;flex-direction:column;align-items:flex-start;max-width:82%;';
            const bubble=document.createElement('div'); bubble.className='ai-bubble-assistant';
            bubble.textContent=''; col.appendChild(bubble); row.appendChild(col); wrap.appendChild(row);
            // Cursor parpadeante
            const cursor=document.createElement('span');
            cursor.textContent='▋'; cursor.style.cssText='opacity:1;animation:aiCursor 0.7s step-end infinite;color:rgba(255,255,255,0.5);';
            bubble.appendChild(cursor);
            // Velocidad adaptativa según longitud
            const words=text.split(' '); const wl=words.length;
            const delay=wl>200?8:wl>80?13:18;
            for(let i=0;i<words.length;i++){
                bubble.insertBefore(document.createTextNode((i===0?'':' ')+words[i]),cursor);
                wrap.scrollTop=wrap.scrollHeight;
                await new Promise(r=>setTimeout(r,delay));
            }
            cursor.remove();
            col.appendChild(_makeActionBar(text,false));
            wrap.scrollTop=wrap.scrollHeight;
        }

        function _addAIThinking() {
            const wrap=document.getElementById('ai-messages'); const id='ait'+Date.now();
            const row=document.createElement('div'); row.id=id; row.className='ai-msg';
            row.style.cssText='display:flex;align-items:flex-start;justify-content:flex-start;margin-bottom:16px;gap:10px;';
            row.innerHTML=`
                <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;margin-top:2px;">
                    <img src="./images/agenda-logo.jpg" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
                </div>
                <div style="display:flex;flex-direction:column;gap:5px;padding:8px 0;margin-top:2px;">
                    <div style="display:flex;gap:5px;align-items:center;">
                        <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.4);display:inline-block;animation:aiDot 1.1s infinite 0s;"></span>
                        <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.4);display:inline-block;animation:aiDot 1.1s infinite 0.18s;"></span>
                        <span style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.4);display:inline-block;animation:aiDot 1.1s infinite 0.36s;"></span>
                    </div>
                    <span class="ai-thinking-text" style="font-size:11px;color:rgba(255,255,255,0.35);min-height:14px;"></span>
                </div>`;
            wrap.appendChild(row); wrap.scrollTop=wrap.scrollHeight; return id;
        }
        function _updateThinkingStatus(text) { const el=document.querySelector('.ai-thinking-text'); if(el)el.textContent=text; }

        // Prevent body scroll on iOS when chat is open
        // passive:false is required so preventDefault() works on iOS
        function _aiBlockScroll(e){
            if(e.target.closest('#ai-messages')||e.target.closest('#ai-input'))return;
            e.preventDefault();
        }

        function openAIChat() {
            const panel=document.getElementById('ai-chat-panel');
            panel.style.display='flex';
            requestAnimationFrame(()=>{panel.style.transform='translateY(0)';});
            document.getElementById('ai-main-btn').classList.add('ai-open');
            document.getElementById('ai-panel-title').textContent=getBC().name+' IA';
            if(!_aiWelcomed) _aiWelcomed=true;
            // Block ALL touchmove on document except inside messages/input
            document.addEventListener('touchmove',_aiBlockScroll,{passive:false});
            // Also lock body position
            const scrollY=window.scrollY||0;
            document.body.style.position='fixed';
            document.body.style.top='-'+scrollY+'px';
            document.body.style.width='100%';
            document.body.dataset.aiScrollY=scrollY;
            // Adjust panel for iOS keyboard: correct both height AND top offset
            if(window.visualViewport){
                window._aiVVHandler=()=>{
                    panel.style.height=window.visualViewport.height+'px';
                    panel.style.top=window.visualViewport.offsetTop+'px';
                };
                window.visualViewport.addEventListener('resize',window._aiVVHandler);
                window.visualViewport.addEventListener('scroll',window._aiVVHandler);
                window._aiVVHandler();
            }
        }

        function closeAIChat() {
            const panel=document.getElementById('ai-chat-panel');
            if(document.activeElement) document.activeElement.blur();
            panel.style.transform='translateY(100%)';
            panel.style.height=''; panel.style.top='';
            document.getElementById('ai-main-btn').classList.remove('ai-open');
            document.removeEventListener('touchmove',_aiBlockScroll,{passive:false});
            const savedY=parseInt(document.body.dataset.aiScrollY||'0');
            document.body.style.position='';
            document.body.style.top='';
            document.body.style.width='';
            window.scrollTo(0,savedY);
            if(window.visualViewport&&window._aiVVHandler){
                window.visualViewport.removeEventListener('resize',window._aiVVHandler);
                window.visualViewport.removeEventListener('scroll',window._aiVVHandler);
                window._aiVVHandler=null;
            }
            setTimeout(()=>{panel.style.display='none';},320);
        }

        function _resizeImageForAI(base64, mime, maxPx=800) {
            return new Promise(resolve=>{
                const img=new Image();
                img.onload=()=>{
                    const scale=Math.min(1, maxPx/Math.max(img.width,img.height));
                    const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
                    const c=document.createElement('canvas'); c.width=w; c.height=h;
                    c.getContext('2d').drawImage(img,0,0,w,h);
                    resolve(c.toDataURL('image/jpeg',0.82).split(',')[1]);
                };
                img.src=`data:${mime};base64,${base64}`;
            });
        }
        function handleAIFileUpload(event) {
            const file=event.target.files[0]; if(!file) return; event.target.value='';
            _addAIBubble('user','📎 '+file.name); const tid=_addAIThinking();
            if(file.type.startsWith('image/')){
                const reader=new FileReader();
                reader.onload=async(e)=>{
                    const raw=e.target.result.split(',')[1];
                    const base64=await _resizeImageForAI(raw,file.type,800);
                    const prompt='Lee esta imagen con atención. Es un screenshot de conversación (WhatsApp, Messenger, texto, etc.) de un cliente que quiere agendar una limpieza. Extrae exactamente estos campos del formulario de agendamiento:\n\n- Nombre completo del cliente\n- Fecha del servicio (día, mes, año)\n- Hora del servicio\n- Ciudad (Utah: Alpine, American Fork, Bluffdale, Cedar Hills, Cottonwood Heights, Draper, Eagle Mountain, Herriman, Highland, Holladay, Kearns, Lehi, Lindon, Mapleton, Midvale, Millcreek, Murray, North Salt Lake, Orem, Payson, Pleasant Grove, Provo, Riverton, Salem, Salt Lake City, Sandy, Santaquin, Saratoga Springs, South Jordan, South Salt Lake, Spanish Fork, Springville, Taylorsville, West Jordan, West Valley City, Woodland Hills, Woods Cross)\n- Dirección exacta\n- Tipo de trabajo (standard cleaning, deep cleaning, move in/out, etc.)\n- Precio acordado\n- Notas adicionales (instrucciones especiales, acceso, mascotas, etc.)\n\nLee TODOS los mensajes visibles. Si un dato no aparece en la imagen escribe "No especificado". Responde en español listando cada campo.';
                    const reply=(await callGroqVisionAPI(prompt,base64,'image/jpeg')) || (await callGeminiAPI(prompt,base64,'image/jpeg'));
                    document.getElementById(tid)?.remove(); await _streamAIBubble(reply);
                    _aiHistory.push({role:'user',content:'[Imagen: '+file.name+']'});
                    _aiHistory.push({role:'assistant',content:reply});
                };
                reader.readAsDataURL(file);
            } else {
                setTimeout(async()=>{
                    const reply=await callGeminiAPI('Se adjuntó: '+file.name+'. ¿Cómo ayudo?');
                    document.getElementById(tid)?.remove(); await _streamAIBubble(reply);
                },0);
            }
        }

        function toggleAIChat() {
            const panel=document.getElementById('ai-chat-panel');
            panel.style.display==='flex'?closeAIChat():openAIChat();
        }
        function newAIChat() {
            _aiHistory=[];
            _aiWelcomed=false;
            const wrap=document.getElementById('ai-messages');
            wrap.innerHTML='';
            const es=document.createElement('div');
            es.id='ai-empty-state';
            es.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding-bottom:70px;pointer-events:none;';
            es.innerHTML='<img id="ai-logo-img" src="./images/agenda-logo.jpg" style="width:216px;height:216px;object-fit:contain;opacity:0.92;"><p id="ai-empty-text" style="font-family:\'Lora\',Georgia,serif;font-size:27px;font-weight:400;color:rgba(255,255,255,0.82);text-align:center;margin:0;line-height:1.45;letter-spacing:-0.2px;">¿En qué puedo<br>ayudarte hoy?</p>';
            wrap.appendChild(es);
        }

        function _setMicIcon(active){
            const btn=document.getElementById('ai-mic-btn');
            if(btn) btn.style.color=active?'#ff5555':'rgba(255,255,255,0.7)';
            const waveform=document.getElementById('ai-waveform');
            const textarea=document.getElementById('ai-input');
            if(waveform) waveform.classList.toggle('active',active);
            if(textarea){
                textarea.style.display=active?'none':'';
                if(!active && textarea.value){
                    textarea.style.height='auto';
                    textarea.style.height=Math.min(textarea.scrollHeight,130)+'px';
                }
            }
        }
        function startVoiceInput() {
            const btn=document.getElementById('ai-mic-btn');
            if(window._aiRecorder){window._aiRecorder.stop();return;}
            const groqKey=localStorage.getItem('rize_groq_key');
            if(!groqKey||!navigator.mediaDevices||!window.MediaRecorder){
                _startWebSpeech(btn); return;
            }
            navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
                const mimeType=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':
                               MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'';
                const opts=mimeType?{mimeType}:{};
                const recorder=new MediaRecorder(stream,opts);
                const chunks=[];
                window._aiRecorder=recorder;
                _setMicIcon(true);
                recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
                recorder.onstop=async()=>{
                    stream.getTracks().forEach(t=>t.stop());
                    window._aiRecorder=null;
                    _setMicIcon(false);
                    if(!chunks.length)return;
                    const ext=mimeType.includes('mp4')?'mp4':'webm';
                    const blob=new Blob(chunks,{type:mimeType||'audio/webm'});
                    const inputEl=document.getElementById('ai-input');
                    const prevPlaceholder=inputEl.placeholder;
                    inputEl.placeholder='Transcribiendo…';
                    try{
                        const fd=new FormData();
                        fd.append('file',blob,'audio.'+ext);
                        fd.append('model','whisper-large-v3-turbo');
                        fd.append('language','es');
                        fd.append('response_format','json');
                        const res=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',
                            {method:'POST',headers:{'Authorization':'Bearer '+groqKey},body:fd});
                        inputEl.placeholder=prevPlaceholder;
                        if(res.ok){
                            const data=await res.json();
                            const text=(data.text||'').trim();
                            if(text){
                                inputEl.value=text;
                                inputEl.style.height='auto';
                                inputEl.style.height=Math.min(inputEl.scrollHeight,130)+'px';
                                document.getElementById('ai-send-btn').classList.add('active');
                                document.getElementById('ai-send-icon').style.color='#000';
                            }
                        } else { showToast('Error al transcribir'); }
                    }catch(e){inputEl.placeholder=prevPlaceholder;showToast('Error de conexión');}
                };
                recorder.start();
                setTimeout(()=>{if(window._aiRecorder)window._aiRecorder.stop();},60000);
            }).catch(()=>_startWebSpeech(btn));
        }
        function _startWebSpeech(btn) {
            const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
            if(!SR){showToast('Micrófono no disponible');return;}
            const rec=new SR(); rec.lang='es-US'; rec.interimResults=false; rec.maxAlternatives=1;
            _setMicIcon(true);
            rec.onresult=(e)=>{
                const text=e.results[0][0].transcript;
                document.getElementById('ai-input').value=text;
                document.getElementById('ai-send-btn').classList.add('active');
                document.getElementById('ai-send-icon').style.color='#000';
            };
            rec.onend=()=>{ _setMicIcon(false); };
            rec.onerror=()=>{ _setMicIcon(false); };
            rec.start();
        }

        async function _autoSummarize() {
            if(_aiHistory.length<6||_aiThinking) return;
            const recent=_aiHistory.slice(-20);
            const conv=recent.map(h=>`${h.role==='user'?'Usuario':'Asistente'}: ${(h.content||'').slice(0,300)}`).join('\n');
            try{
                const res=await _geminiCall(
                    'Resume esta conversación en 3-4 líneas en español. Destaca: datos de clientes mencionados, citas agendadas, preferencias del usuario, información importante del negocio. Solo el resumen, sin comentarios extra.',
                    [{role:'user',parts:[{text:conv}]}],
                    null,{maxOutputTokens:200,temperature:0.3});
                if(res.ok){
                    const data=await res.json();
                    const summary=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
                    if(summary){const mem=getAIMemory();mem.summary=summary;mem.summary_date=new Date().toISOString().split('T')[0];saveAIMemory(mem);}
                }
            }catch{}
        }

        async function sendAIMessage() {
            const input=document.getElementById('ai-input');
            const text=input.value.trim();
            if(!text||_aiThinking) return;
            input.value=''; input.style.height='auto';
            document.getElementById('ai-send-btn').classList.remove('active');
            document.getElementById('ai-send-icon').style.color='rgba(255,255,255,0.35)';
            _addAIBubble('user',text);
            _aiHistory.push({role:'user',content:text});
            _aiThinking=true; const tid=_addAIThinking();
            try {
                const reply=await runAgentLoop([..._aiHistory]);
                document.getElementById(tid)?.remove();
                await _streamAIBubble(reply);
                _aiHistory.push({role:'assistant',content:reply});
                if(_aiHistory.length>20)_aiHistory=_aiHistory.slice(-20);
                // Auto-resumen cada 15 mensajes — espera 8s para no competir con rate limit
                if(_aiHistory.length%15===0) setTimeout(()=>{if(!_aiThinking)_autoSummarize();},8000);
            } catch(e) {
                document.getElementById(tid)?.remove();
                _addAIBubble('assistant',e.message||'⚠️ Error de conexión.');
                _aiHistory.pop();
            }
            _aiThinking=false;
        }

        function _showAIBar() { const b=document.getElementById('ai-bar'); if(b)b.style.display='flex'; }
        function _hideAIBar() { const b=document.getElementById('ai-bar'); if(b)b.style.display='none'; closeAIChat(); }

        // ─── BACKGROUND THEME SYSTEM ──────────────────────────────────────
        const BG_THEMES = {
            bosque:   { name: 'Bosque',     color: '#1a2332', label: '🌑' },
            midnight: { name: 'Medianoche', color: '#1a237e', label: '🌌' },
            violeta:  { name: 'Violeta',    color: '#2d1b69', label: '🔮' },
            carbon:   { name: 'Carbón',     color: '#2d2d2d', label: '⚫' },
            oceano:   { name: 'Océano',     color: '#0d4f5e', label: '🌊' },
            bosque2:  { name: 'Esmeralda',  color: '#1a3a2a', label: '🌿' },
        };
        function applyBgTheme(theme) {
            Object.keys(BG_THEMES).forEach(t => document.body.classList.remove('bg-' + t));
            if (theme !== 'bosque') document.body.classList.add('bg-' + theme);
            localStorage.setItem('rize_bg_theme', theme);
            // Update carousel cards
            document.querySelectorAll('.bg-swatch').forEach(el => {
                const selected = el.dataset.theme === theme;
                el.style.border = selected ? '2px solid #10a37f' : '2px solid rgba(255,255,255,0.12)';
                const check = el.querySelector('.theme-check');
                if (check) check.style.display = selected ? 'flex' : 'none';
            });
        }
        function initBgTheme() {
            const saved = localStorage.getItem('rize_bg_theme') || 'bosque';
            applyBgTheme(saved);
        }
