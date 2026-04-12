// api/leads.js — CRUD de leads usando Supabase tabla
import { createClient } from '@supabase/supabase-js';

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = db();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leads: data });
  }

  if (req.method === 'POST') {
    const { source, title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const { data, error } = await supabase
      .from('leads')
      .insert([{ source: source || 'unknown', title, body: body || '', url: url || '' }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ lead: data });
  }

  if (req.method === 'PATCH') {
    const { id, all } = req.body || {};
    let q = supabase.from('leads').update({ read: true });
    if (all)      q = q.eq('read', false);
    else if (id)  q = q.eq('id', id);
    else return res.status(400).json({ error: 'id or all required' });
    const { error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
