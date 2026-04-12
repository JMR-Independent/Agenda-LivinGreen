// api/facebook-lead.js — recibe leads de cualquier fuente y manda push notification
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:admin@livingreen.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const SOURCE_CONFIG = {
  'Messenger':    { emoji: '💬', label: 'Facebook Messenger' },
  'reddit':       { emoji: '🔵', label: 'Reddit' },
  'craigslist':   { emoji: '📋', label: 'Craigslist' },
  'google':       { emoji: '🔍', label: 'Google Alerts' },
  'nextdoor':     { emoji: '🏘️', label: 'Nextdoor' },
  'facebook':     { emoji: '📣', label: 'Facebook' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tipo, nombre, mensaje, link, source } = req.body || {};

  if (!tipo) return res.status(400).json({ error: 'Missing fields' });

  // Determinar fuente y emoji dinámicamente
  const src = source || (tipo === 'Mensaje Messenger' ? 'Messenger' : 'facebook');
  const cfg = SOURCE_CONFIG[src] || { emoji: '📣', label: src };
  const notifTitle = `${cfg.emoji} Lead ${cfg.label} — LivinGreen`;

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: notifTitle,
      body: `${nombre}: ${mensaje}`,
      tag: `lead-${src}-${Date.now()}`,
      url: link || 'https://www.facebook.com/LivinGreen',
      icon: 'https://agenda-livin-green.vercel.app/images/agenda-logo.jpg',
      badge: 'https://agenda-livin-green.vercel.app/images/facebook-badge.png',
      source: src
    });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Guardar lead en base de datos
    try {
      await supabase.from('leads').insert([{
        source: src,
        title: `${nombre}`,
        body: mensaje || '',
        url: link || ''
      }]);
    } catch (dbErr) {
      console.warn('Lead DB save skipped:', dbErr.message);
    }

    console.log(`Push [${src}]: ${sent} sent, ${failed} failed`);
    return res.status(200).json({ ok: true, sent, failed });

  } catch (e) {
    console.error('push error:', e);
    return res.status(500).json({ error: e.message });
  }
}
