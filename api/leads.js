// api/leads.js — CRUD de leads para la app
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  // GET — listar leads (más recientes primero)
  if (req.method === 'GET') {
    const limit = parseInt(req.query.limit) || 100;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leads: data });
  }

  // POST — crear lead
  if (req.method === 'POST') {
    const { source, title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const { data, error } = await supabase
      .from('leads')
      .insert([{ source: source || 'unknown', title, body: body || '', url: url || '' }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ lead: data });
  }

  // PATCH — marcar como leído(s)
  if (req.method === 'PATCH') {
    const { id, all } = req.body || {};
    let query = supabase.from('leads').update({ read: true });
    if (all) {
      query = query.eq('read', false);
    } else if (id) {
      query = query.eq('id', id);
    } else {
      return res.status(400).json({ error: 'id or all required' });
    }
    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
