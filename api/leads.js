// api/leads.js — CRUD de leads usando Supabase Storage (sin DDL)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'leads';
const FILE = 'leads.json';

async function readLeads() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) return [];
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
}

async function writeLeads(leads) {
  const body = JSON.stringify(leads);
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${FILE}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — listar leads
  if (req.method === 'GET') {
    const leads = await readLeads();
    return res.status(200).json({ leads: leads.slice(0, 200) });
  }

  // POST — crear lead
  if (req.method === 'POST') {
    const { source, title, body, url } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const leads = await readLeads();
    const newLead = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      source: source || 'unknown',
      title,
      body: body || '',
      url: url || '',
      read: false,
      created_at: new Date().toISOString()
    };
    leads.unshift(newLead);
    // Mantener solo los últimos 500
    if (leads.length > 500) leads.splice(500);
    await writeLeads(leads);
    return res.status(201).json({ lead: newLead });
  }

  // PATCH — marcar como leído
  if (req.method === 'PATCH') {
    const { id, all } = req.body || {};
    const leads = await readLeads();
    if (all) {
      leads.forEach(l => { l.read = true; });
    } else if (id) {
      const lead = leads.find(l => l.id === id);
      if (lead) lead.read = true;
    } else {
      return res.status(400).json({ error: 'id or all required' });
    }
    await writeLeads(leads);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
