// api/facebook-lead.js — recibe eventos de Facebook desde n8n y manda push notification
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:admin@livingreen.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tipo, nombre, mensaje, link, source } = req.body || {};

  if (!tipo) return res.status(400).json({ error: 'Missing fields' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get all push subscriptions
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions found' });
    }

    // Build notification payload
    const emoji = tipo === 'Mensaje Messenger' ? '💬' : '📣';
    const payload = JSON.stringify({
      title: `${emoji} Lead Facebook — LivinGreen`,
      body: `${nombre}: ${mensaje}`,
      tag: `fb-lead-${Date.now()}`,
      url: link || 'https://www.facebook.com/LivinGreen',
      icon: 'https://agenda-livin-green.vercel.app/images/agenda-logo.jpg',
      badge: 'https://agenda-livin-green.vercel.app/images/facebook-badge.png',
      source: 'facebook'
    });

    // Send to all subscriptions
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

    console.log(`Push leads: ${sent} sent, ${failed} failed`);
    return res.status(200).json({ ok: true, sent, failed });

  } catch (e) {
    console.error('facebook-lead push error:', e);
    return res.status(500).json({ error: e.message });
  }
}
