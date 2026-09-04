// Servidor local: sirve el panel y expone la API de sincronización que usa el botón "Sincronizar".
// Uso: npm start   →  http://127.0.0.1:8787/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, PROFILE_DIR, DATA_DIR } from './common.mjs';
import { openDb, importDataset } from './db.mjs';

const PORT = +(process.argv[2] || 8787);
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
const state = { running: null, log: [], lastResult: null, lastSync: null, lastSource: null, session: 'unknown' };

function refreshLastSync() {
  try { const idx = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf8')); state.lastSync = idx.fetched_at; state.lastSource = idx.source || null; } catch { state.lastSync = null; }
}

// Importa un dataset enviado por la extensión de Chrome: lo guarda en data/, lo mete en la base de datos y actualiza index.json.
function importFromExtension(ds) {
  // Las notas son de la cuenta, no de una publicación: van a su propio archivo.
  if (ds && ds.kind === 'notes') {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, 'notes.json'), JSON.stringify(ds));
    if (ds.primary_publication_id != null) {
      try {
        const f = path.join(DATA_DIR, 'index.json');
        const idx = JSON.parse(fs.readFileSync(f, 'utf8'));
        idx.primary_publication_id = ds.primary_publication_id;
        fs.writeFileSync(f, JSON.stringify(idx, null, 2));
      } catch {}
    }
    return { notes: (ds.notes || []).length };
  }
  const meta = ds.publication_meta || {};
  const sub = String(ds.subdomain || meta.subdomain || '').replace(/[^a-z0-9-]/gi, '');
  if (!sub || !Array.isArray(ds.posts)) throw new Error('dataset inválido');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${sub}.json`), JSON.stringify(ds));
  const db = openDb();
  try { importDataset(db, ds, { id: meta.id ?? ds.publication?.id, name: meta.name ?? ds.publication?.name, subdomain: sub, custom_domain: meta.custom_domain ?? null }); } finally { db.close(); }
  let idx = { publications: [] };
  try { idx = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index.json'), 'utf8')); } catch {}
  const entry = { id: meta.id ?? ds.publication?.id, name: meta.name ?? ds.publication?.name ?? sub, subdomain: sub, custom_domain: meta.custom_domain ?? null, posts: ds.posts.length, subscribers: ds.summary?.totalEmail ?? null, file: `${sub}.json` };
  const i = idx.publications.findIndex(p => p.subdomain === sub);
  if (i >= 0) idx.publications[i] = entry; else idx.publications.push(entry);
  idx.fetched_at = ds.fetched_at; idx.source = 'extension';
  fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(idx, null, 2));
  return { subdomain: sub, posts: ds.posts.length };
}

function readBody(req, limit = 60e6) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('body demasiado grande')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
  });
}
refreshLastSync();

function run(name, script, args = []) {
  if (state.running) return false;
  state.running = name; state.log = []; state.lastResult = null;
  const child = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'tools', script), ...args], { cwd: ROOT, env: { ...process.env, NODE_NO_WARNINGS: '1' } });
  const push = (chunk) => { for (const line of String(chunk).split(/\r?\n/)) if (line.trim()) { state.log.push(line); if (state.log.length > 200) state.log.shift(); } };
  child.stdout.on('data', push); child.stderr.on('data', push);
  child.on('close', (code) => {
    if (name === 'sync' && code === 0) {
      state.running = 'build';
      const b = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'tools', 'build.mjs')], { cwd: ROOT });
      b.stdout.on('data', push); b.stderr.on('data', push);
      b.on('close', (c2) => { state.running = null; state.lastResult = c2 === 0 ? 'ok' : 'error'; refreshLastSync(); if (c2 === 0) state.session = 'ok'; });
      return;
    }
    if (name === 'sync' && code !== 0) state.session = state.log.some(l => /No hay sesión/.test(l)) ? 'none' : state.session;
    if (name === 'login' && code === 0) state.session = state.log.some(l => /Sesión iniciada|Ya hay sesión/.test(l)) ? 'ok' : state.session;
    state.running = null; state.lastResult = code === 0 ? 'ok' : 'error';
  });
  return true;
}

// Comprobación de sesión en segundo plano al arrancar (abre Chrome en modo headless unos segundos).
function checkSession() {
  if (!fs.existsSync(PROFILE_DIR)) { state.session = 'none'; return; }
  const child = spawn(process.execPath, ['--no-warnings', '--input-type=module', '-e',
    `import { openBrowser, getProfile } from '${path.join(ROOT, 'tools', 'common.mjs').replace(/\\/g, '/')}';
     const ctx = await openBrowser({ headless: true }); const page = ctx.pages()[0] ?? await ctx.newPage();
     const p = await getProfile(page); await ctx.close(); console.log(p ? 'SESSION_OK ' + p.handle : 'SESSION_NONE');`], { cwd: ROOT });
  let out = ''; child.stdout.on('data', d => out += d);
  child.on('close', () => { state.session = /SESSION_OK/.test(out) ? 'ok' : 'none'; });
}
checkSession();

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS }); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (url.pathname === '/api/import' && req.method === 'POST') {
    return readBody(req).then(body => {
      const r = importFromExtension(JSON.parse(body));
      state.lastResult = 'ok'; refreshLastSync();
      return json(res, 200, r);
    }).catch(e => json(res, 400, { error: e.message }));
  }
  if (url.pathname === '/api/status') return json(res, 200, { running: state.running, log: state.log.slice(-30), lastResult: state.lastResult, lastSync: state.lastSync, lastSource: state.lastSource, session: state.session });
  if (url.pathname === '/api/sync' && req.method === 'POST') {
    const only = (url.searchParams.get('only') || '').split(',').filter(Boolean);
    return json(res, run('sync', 'sync.mjs', only) ? 202 : 409, { running: state.running });
  }
  if (url.pathname === '/api/login' && req.method === 'POST') return json(res, run('login', 'login.mjs') ? 202 : 409, { running: state.running });
  if (url.pathname === '/api/build' && req.method === 'POST') return json(res, run('build', 'build.mjs') ? 202 : 409, { running: state.running });
  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/dashboard.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Panel Substack en http://127.0.0.1:${PORT}/`));
