// Service Worker — Agenda LivinGreen
const CACHE = 'agenda-v1';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Message from main thread to show a notification
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
    if (e.data.type === 'SCHEDULE_NOTIF') {
        const { title, body, tag, delay } = e.data;
        setTimeout(() => {
            self.registration.showNotification(title, {
                body,
                icon: './images/agenda-logo.jpg',
                badge: './images/agenda-logo.jpg',
                tag: tag || 'agenda-notif',
                vibrate: [200, 100, 200],
                requireInteraction: false
            });
        }, delay);
    }
});

// Tap on notification opens the app
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            if (list.length) return list[0].focus();
            return clients.openWindow('./');
        })
    );
});
