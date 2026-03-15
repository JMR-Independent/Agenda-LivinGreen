// api/push-subscribe.js — guarda la suscripción push del usuario en Supabase
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('push-subscribe error:', e);
    return res.status(500).json({ error: e.message });
  }
}
