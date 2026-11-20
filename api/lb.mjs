// MUHBİR arkadaş sıralaması: ekip kodu başına tek bir JSON (Vercel Blob, özel depo)
// GET  /api/lb?c=EKIP          → { c, week, players: [...] }
// POST /api/lb {c,pid,n,win,hits,wk} → güncel tablo
import { get, put } from '@vercel/blob';

const weekNo = (t = Date.now()) => Math.floor((t / 86400000 + 3) / 7);   // pazartesi başlar
const okCrew = (c) => typeof c === 'string' && /^[A-Z0-9]{5,8}$/.test(c);
const okPid = (p) => typeof p === 'string' && /^[a-z0-9]{6,16}$/.test(p);
const clean = (n) => String(n || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 14) || 'Oyuncu';

async function readCrew(c) {
  const r = await get(`crew/${c}.json`, { access: 'private', useCache: false }).catch((e) => { if (/not.?found/i.test(String(e && e.message))) return null; throw e; });
  if (!r) return { data: { c, players: {} }, etag: null };
  const txt = await new Response(r.stream).text();
  let data; try { data = JSON.parse(txt); } catch (_) { data = { c, players: {} }; }
  return { data, etag: r.blob && r.blob.etag ? r.blob.etag : null };
}
function view(data, me) {
  const wk = weekNo();
  const players = Object.entries(data.players || {}).map(([pid, p]) => ({ id: pid.slice(0, 4), me: pid === me ? 1 : 0, n: p.n, g: p.g | 0, w: p.w | 0, h: p.h | 0, wk: p.wkN === wk ? p.wk | 0 : 0, at: Math.floor((p.at || 0) / 1000) }))
    .sort((a, b) => b.w - a.w || (b.w / Math.max(1, b.g)) - (a.w / Math.max(1, a.g)) || b.h - a.h).slice(0, 50);
  return { c: data.c, week: wk, players };
}
function send(res, code, obj) { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); }
async function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let t = ''; for await (const c of req) { t += c; if (t.length > 4000) throw new Error('büyük'); } return JSON.parse(t || '{}');
}
export default async function handler(req, res) {
  try {
    const u = new URL(req.url || '/', 'http://x');
    if (req.method === 'GET') {
      const c = String(u.searchParams.get('c') || '').toUpperCase();
      if (!okCrew(c)) return send(res, 400, { error: 'kod' });
      const { data } = await readCrew(c); return send(res, 200, view(data, String(u.searchParams.get('p') || '')));
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'yöntem' });
    let b; try { b = await bodyOf(req); } catch (_) { return send(res, 400, { error: 'veri' }); }
    const c = String(b.c || '').toUpperCase(), pid = String(b.pid || '');
    if (!okCrew(c) || !okPid(pid)) return send(res, 400, { error: 'veri' });
    const win = b.win ? 1 : 0, hits = Math.max(0, Math.min(20, b.hits | 0)), wkp = Math.max(0, Math.min(100, b.wk | 0)), wk = weekNo();
    for (let tries = 0; tries < 4; tries++) {
      const { data, etag } = await readCrew(c);
      data.players = data.players || {};
      if (Object.keys(data.players).length >= 60 && !data.players[pid]) return send(res, 409, { error: 'dolu' });
      const p = data.players[pid] || { n: '', g: 0, w: 0, h: 0, wk: 0, wkN: wk, at: 0 };
      const now = Date.now();
      if (now - (p.at || 0) < 15000) return send(res, 200, view(data, pid));   // aynı oyunu iki kez yazma
      p.n = clean(b.n); p.g++; p.w += win; p.h += hits; if (p.wkN !== wk) { p.wkN = wk; p.wk = 0; } p.wk += wkp; p.at = now;
      data.players[pid] = p; data.c = c;
      try {
        await put(`crew/${c}.json`, JSON.stringify(data), { access: 'private', contentType: 'application/json', addRandomSuffix: false, ...(etag ? { ifMatch: etag } : { allowOverwrite: true }), cacheControlMaxAge: 60 });
        return send(res, 200, view(data, pid));
      } catch (e) { if (tries === 3) throw e; await new Promise((r) => setTimeout(r, 120 + Math.random() * 200)); }
    }
  } catch (e) { return send(res, 500, { error: 'sunucu', m: String((e && e.message) || e).slice(0, 120) }); }
}
