// Service Worker — Agenda LivinGreen
const CACHE = 'agenda-v1';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// ── Push recibido desde servidor (funciona con app cerrada) ─────────────────
self.addEventListener('push', e => {
    let data = { title: 'LivinGreen', body: 'Tienes una actualización.' };
    try { data = e.data ? e.data.json() : data; } catch {}
    e.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: './images/agenda-logo.jpg',
            badge: './images/agenda-logo.jpg',
            tag: data.tag || 'agenda-notif',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            data: { url: data.url || '/' }
        })
    );
});

// ── Mensaje desde la app (para notificaciones inmediatas dentro de la app) ──
self.addEventListener('message', e => {
    if (!e.data) return;
    if (e.data.type === 'SHOW_NOTIF') {
        const { title, body, tag } = e.data;
        self.registration.showNotification(title, {
            body,
            icon: './images/agenda-logo.jpg',
            badge: './images/agenda-logo.jpg',
            tag: tag || 'agenda-notif',
            vibrate: [200, 100, 200],
            requireInteraction: false
        });
    }
});

// ── Tap en la notificación abre la app ──────────────────────────────────────
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = e.notification.data?.url || './';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            if (list.length) return list[0].focus();
            return clients.openWindow(url);
        })
    );
});
