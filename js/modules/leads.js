// leads.js — módulo de leads para la app LivinGreen
(function() {

  const API = 'https://agenda-livin-green.vercel.app/api/leads';

  const SOURCE_META = {
    reddit:     { emoji: '🔵', label: 'Reddit',      color: 'rgba(255,69,0,0.18)' },
    google:     { emoji: '🔍', label: 'Google',      color: 'rgba(66,133,244,0.18)' },
    facebook:   { emoji: '📣', label: 'Facebook',    color: 'rgba(24,119,242,0.18)' },
    Messenger:  { emoji: '💬', label: 'Messenger',   color: 'rgba(0,176,255,0.18)' },
    nextdoor:   { emoji: '🏘️', label: 'Nextdoor',    color: 'rgba(0,134,70,0.18)' },
    craigslist: { emoji: '📋', label: 'Craigslist',  color: 'rgba(150,75,0,0.18)' },
    unknown:    { emoji: '📌', label: 'Lead',         color: 'rgba(100,100,100,0.18)' },
  };

  function getMeta(source) {
    return SOURCE_META[source] || SOURCE_META.unknown;
  }

  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  }

  function renderCard(lead) {
    const meta = getMeta(lead.source);
    const time = timeAgo(lead.created_at);
    const unreadStyle = lead.read ? '' : 'border-left: 3px solid rgba(16,163,127,0.8);';
    const opacity = lead.read ? '0.55' : '1';

    return `
    <div class="lead-card" data-id="${lead.id}" data-url="${lead.url || ''}"
         onclick="window._leadsModule.openLead('${lead.id}', '${(lead.url||'').replace(/'/g,"\\'")}')">
      <div style="display:flex; align-items:flex-start; gap:10px; opacity:${opacity};">
        <div style="font-size:22px; line-height:1; flex-shrink:0; margin-top:2px;">${meta.emoji}</div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:10px; font-weight:600; color:rgba(16,163,127,0.9); text-transform:uppercase; letter-spacing:0.8px;">${meta.label}</span>
            <span style="font-size:10px; color:rgba(255,255,255,0.35);">${time}</span>
          </div>
          <div style="font-size:13px; font-weight:600; color:rgba(255,255,255,0.92); line-height:1.35; margin-bottom:4px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${lead.title || '—'}</div>
          ${lead.body ? `<div style="font-size:11px; color:rgba(255,255,255,0.45); overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${lead.body}</div>` : ''}
        </div>
        ${!lead.read ? '<div style="width:7px;height:7px;border-radius:50%;background:rgba(16,163,127,0.9);flex-shrink:0;margin-top:4px;box-shadow:0 0 6px rgba(16,163,127,0.6);"></div>' : ''}
      </div>
    </div>`;
  }

  async function loadLeads(filter) {
    const container = document.getElementById('leads-list');
    const badge = document.getElementById('leads-unread-badge');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3);font-size:13px;">Cargando...</div>';

    try {
      const res = await fetch(API);
      const data = await res.json();
      const all = data.leads || [];

      // Unread badge
      const unread = all.filter(l => !l.read).length;
      if (badge) {
        badge.textContent = unread;
        badge.style.display = unread > 0 ? 'flex' : 'none';
      }

      // Update bento badge
      const bentoBadge = document.getElementById('leads-bento-badge');
      if (bentoBadge) {
        bentoBadge.textContent = unread;
        bentoBadge.style.display = unread > 0 ? 'flex' : 'none';
      }

      // Apply filter
      const active = filter || window._leadsFilter || 'all';
      const filtered = all.filter(l => {
        if (active === 'unread') return !l.read;
        if (active === 'reddit') return l.source === 'reddit';
        if (active === 'google') return l.source === 'google';
        if (active === 'facebook') return l.source === 'facebook' || l.source === 'Messenger';
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:60px 20px;">
            <div style="font-size:36px;margin-bottom:12px;">📭</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.4);">No hay leads ${active !== 'all' ? 'en esta categoría' : 'todavía'}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:6px;">El monitor revisa cada 30 minutos</div>
          </div>`;
        return;
      }

      container.innerHTML = filtered.map(renderCard).join('');
    } catch(e) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:rgba(255,100,100,0.7);font-size:13px;">Error cargando leads</div>`;
    }
  }

  async function openLead(id, url) {
    // Marcar como leído
    try {
      await fetch(API, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id })
      });
    } catch(e) {}
    // Actualizar visual
    const card = document.querySelector(`.lead-card[data-id="${id}"]`);
    if (card) card.style.opacity = '0.55';
    // Abrir URL
    if (url) window.open(url, '_blank');
    // Reload para actualizar badge
    loadLeads();
  }

  async function markAllRead() {
    try {
      await fetch(API, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ all: true })
      });
      loadLeads();
    } catch(e) {}
  }

  function setFilter(filter) {
    window._leadsFilter = filter;
    // Actualizar botones activos
    document.querySelectorAll('.leads-filter-btn').forEach(btn => {
      btn.style.background = btn.dataset.filter === filter
        ? 'rgba(16,163,127,0.25)' : 'rgba(255,255,255,0.06)';
      btn.style.color = btn.dataset.filter === filter
        ? 'rgba(16,163,127,1)' : 'rgba(255,255,255,0.5)';
      btn.style.borderColor = btn.dataset.filter === filter
        ? 'rgba(16,163,127,0.4)' : 'rgba(255,255,255,0.1)';
    });
    loadLeads(filter);
  }

  // Exponer globalmente
  window._leadsModule = { loadLeads, openLead, markAllRead, setFilter };

})();
