// api/send-morning-brief.js — cron diario 9 AM Mountain Time
// Vercel cron: "0 15 * * *"  (15:00 UTC = 9:00 AM MDT)
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:admin@livingreen.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Permitir llamada manual (GET) o desde cron de Vercel
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Calcular la fecha de mañana en Mountain Time
    const now = new Date();
    // UTC-6 MDT (verano) / UTC-7 MST (invierno) — detectar por mes
    const mtnOffset = isDST(now) ? -6 : -7;
    const mtnNow = new Date(now.getTime() + mtnOffset * 3600000);
    const tomorrow = new Date(mtnNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = n => String(n).padStart(2, '0');
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    // Obtener citas de mañana (usar gte/lt para compatibilidad con date y text)
    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;

    const { data: appointments, error: aptError } = await supabase
      .from('appointments')
      .select('*')
      .gte('date', tomorrowStr)
      .lt('date', nextDayStr)
      .order('time', { ascending: true });

    if (aptError) throw aptError;

    // Construir el mensaje
    let title, body;
    if (!appointments || appointments.length === 0) {
      title = '📅 LivinGreen — Mañana libre';
      body = 'No tienes trabajos programados para mañana.';
    } else {
      const total = appointments.reduce((s, a) => s + parseFloat(a.price || 0), 0);
      const list = appointments.slice(0, 3).map(a => {
        const time = a.time || a.hora || '';
        const client = a.clientName || a.cliente || 'Cliente';
        const city = a.city || '';
        return `${time} ${client}${city ? ' — ' + city : ''}`;
      }).join('\n');
      const extra = appointments.length > 3 ? `\n+${appointments.length - 3} más` : '';
      title = `📅 Mañana: ${appointments.length} trabajo${appointments.length > 1 ? 's' : ''} · $${total.toFixed(0)}`;
      body = list + extra;
    }

    // Obtener todas las suscripciones
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: 'No subscriptions' });
    }

    // Enviar a todas
    const payload = JSON.stringify({ title, body, tag: 'morning-brief', url: '/' });
    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      ))
    );

    // Eliminar suscripciones expiradas (410 Gone)
    const expired = results
      .map((r, i) => r.status === 'rejected' && r.reason?.statusCode === 410 ? subs[i].endpoint : null)
      .filter(Boolean);
    if (expired.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return res.status(200).json({ ok: true, sent, tomorrow: tomorrowStr, jobs: appointments?.length || 0 });
  } catch (e) {
    console.error('send-morning-brief error:', e);
    return res.status(500).json({ error: e.message });
  }
}

function isDST(date) {
  // EE.UU.: DST comienza 2do domingo de marzo, termina 1er domingo de noviembre
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return date.getTimezoneOffset() < Math.max(jan, jul);
}
