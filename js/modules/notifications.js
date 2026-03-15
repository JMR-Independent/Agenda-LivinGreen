// ================================================================
// MODULE: notifications.js
// Push notifications + sincronización bidireccional con chat PWA (cookies)
// ================================================================

        // ─── NOTIFICATIONS SYSTEM ────────────────────────────────────────

        let _swReg = null;

        // VAPID public key para push server-side
        const _VAPID_PUBLIC = 'BJlOfuYgIa6-mzl4MXIDMPOsBF1FGPKw0LxocOf7uWU3qzB0YW1wexZzpe987nSIkyoF_cDZqK0CDP9f8SS3t8E';

        async function initNotifications() {
            if (!('Notification' in window)) return;
            // Register SW
            if ('serviceWorker' in navigator) {
                try {
                    _swReg = await navigator.serviceWorker.register('./sw.js');
                } catch(e) { console.warn('SW register failed', e); }
            }
            // Request permission if not decided
            if (Notification.permission === 'default') {
                const perm = await Notification.requestPermission();
                localStorage.setItem('notif_permission', perm);
                updateNotifToggleUI();
            }
            if (Notification.permission !== 'granted') return;
            // Subscribe to server-side push (needed for background notifications)
            _subscribeToPush();
        }

        async function _subscribeToPush() {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (!reg.pushManager) return;
                // Check if already subscribed
                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    // Convert VAPID public key to Uint8Array
                    const raw = atob(_VAPID_PUBLIC.replace(/-/g,'+').replace(/_/g,'/'));
                    const key = new Uint8Array(raw.split('').map(c => c.charCodeAt(0)));
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: key
                    });
                }
                // Save subscription to server
                await fetch('/api/push-subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub.toJSON())
                });
            } catch(e) {
                console.warn('Push subscribe failed:', e);
            }
        }

        function updateNotifToggleUI() {
            const btn = document.getElementById('notif-toggle-btn');
            const status = document.getElementById('notif-status-text');
            if (!btn || !status) return;
            const granted = Notification.permission === 'granted';
            btn.textContent = granted ? 'Activadas ✓' : 'Activar notificaciones';
            btn.style.background = granted ? 'rgba(16,163,127,0.2)' : 'rgba(16,163,127,0.15)';
            btn.style.borderColor = granted ? 'rgba(16,163,127,0.7)' : 'rgba(16,163,127,0.4)';
            btn.style.color = granted ? '#10a37f' : 'rgba(16,163,127,0.9)';
            status.textContent = granted ? 'Recibirás el resumen de citas cada mañana a las 9 AM.' : 'Toca el botón para activar.';
        }

        async function requestNotifPermission() {
            if (!('Notification' in window)) { alert('Tu navegador no soporta notificaciones.'); return; }
            if (Notification.permission === 'denied') {
                alert('Las notificaciones están bloqueadas. Ve a Configuración del navegador → Notificaciones y actívalas para esta página.');
                return;
            }
            await initNotifications();
            updateNotifToggleUI();
        }

        // Init on load
        window.addEventListener('load', () => {
            if (localStorage.getItem('notif_permission') === 'granted' || Notification.permission === 'granted') {
                initNotifications();
            }
            updateNotifToggleUI();
        });

        // ── Bidirectional sync with chat PWA via cookies ───────────────────────
        function _lg_cookieRead(){
            try{
                const jar=Object.fromEntries(document.cookie.split('; ').filter(Boolean).map(c=>{const i=c.indexOf('=');return [c.slice(0,i),c.slice(i+1)];}));
                const n=parseInt(jar['lg_n']||'0');if(!n)return null;
                let s='';for(let i=0;i<n;i++)s+=decodeURIComponent(jar[`lg_d${i}`]||'');
                return s?JSON.parse(s):null;
            }catch{return null;}
        }
        function _lg_cookieWrite(data){
            try{
                const s=JSON.stringify({...data,_ts:Date.now()});
                const cs=3800,n=Math.ceil(s.length/cs);
                const exp='; max-age=86400; path=/; SameSite=Lax';
                for(let i=0;i<30;i++) document.cookie=`lg_d${i}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                document.cookie=`lg_n=${n}${exp}`;
                for(let i=0;i<n;i++) document.cookie=`lg_d${i}=${encodeURIComponent(s.slice(i*cs,(i+1)*cs))}${exp}`;
            }catch(e){console.warn('lg_cookieWrite:',e);}
        }
        function _lg_mergeApts(a,b){
            const m=new Map();
            [...a,...b].forEach(x=>{const id=x.id||String(x.timestamp||'');if(!id)return;const ex=m.get(id);if(!ex||(x.timestamp||0)>=(ex.timestamp||0))m.set(id,x);});
            return Array.from(m.values()).sort((a,b)=>((a.date||'')+(a.time||''))<((b.date||'')+(b.time||''))?-1:1);
        }
        function _lg_mergeCli(a,b){
            const m=new Map();
            [...a,...b].forEach(c=>{const k=(c.name||'').toLowerCase().trim();if(!k)return;const ex=m.get(k);if(!ex||(c.createdAt||c.updatedAt||'')>=(ex.createdAt||ex.updatedAt||''))m.set(k,c);});
            return Array.from(m.values());
        }
        function _lg_fullSync(showFeedback=false){
            try{
                const remote=_lg_cookieRead();
                let lApts=[],lCli=[];
                try{lApts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
                try{lCli=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
                let apts=lApts,cli=lCli,svc,biz,events;
                if(remote){
                    apts=_lg_mergeApts(lApts,remote.appointments||[]);
                    cli=_lg_mergeCli(lCli,remote.clientRegistry||[]);
                    const rNewer=(remote._ts||0)>parseInt(localStorage.getItem('_lg_last_sync')||'0');
                    svc=rNewer?(remote.rize_services_config||JSON.parse(localStorage.getItem('rize_services_config')||'[]')):JSON.parse(localStorage.getItem('rize_services_config')||'[]');
                    biz=rNewer?(remote.rize_business_config||JSON.parse(localStorage.getItem('rize_business_config')||'{}')):JSON.parse(localStorage.getItem('rize_business_config')||'{}');
                    const lEv=JSON.parse(localStorage.getItem('dayEvents')||'{}');
                    events={...(remote.dayEvents||{}),...lEv};
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
                const now2=new Date();
                const _ld=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const cut=_ld(new Date(now2.getTime()-90*86400000)),fut=_ld(new Date(now2.getTime()+365*86400000));
                _lg_cookieWrite({appointments:apts.filter(a=>{const d=a.date||a.fecha||'';return d>=cut&&d<=fut;}),clientRegistry:cli,rize_services_config:svc,rize_business_config:biz,dayEvents:events});
                if(showFeedback&&typeof showToast==='function') showToast(`Sincronizado ✓ — ${apts.length} citas, ${cli.length} clientes`);
                if(typeof loadAppointments==='function') loadAppointments();
                if(typeof loadClientRegistry==='function') loadClientRegistry();
            }catch(e){console.warn('lg_fullSync:',e);if(showFeedback&&typeof showToast==='function') showToast('Error al sincronizar');}
        }
        window.addEventListener('load', ()=>_lg_fullSync());
        document.addEventListener('visibilitychange', ()=>_lg_fullSync());

