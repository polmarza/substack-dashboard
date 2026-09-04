// Descarga posts, estadísticas y resúmenes de todas las publicaciones que administras.
// Uso: npm run sync            (todas)
//      npm run sync -- my-newsletter other-newsletter   (solo esas)
import fs from 'node:fs/promises';
import path from 'node:path';
import { openBrowser, getProfile, DATA_DIR } from './common.mjs';
import { openDb, importDataset } from './db.mjs';

const only = process.argv.slice(2);
const ctx = await openBrowser({ headless: true });
const page = ctx.pages()[0] ?? (await ctx.newPage());

const profile = await getProfile(page);
if (!profile) {
  console.error('No hay sesión. Ejecuta primero: npm run login');
  await ctx.close();
  process.exit(1);
}
await fs.mkdir(DATA_DIR, { recursive: true });
const db = openDb();

const pubs = (profile.publicationUsers || [])
  .filter(pu => pu.role === 'admin' && pu.publication)
  .map(pu => ({ id: pu.publication.id, name: pu.publication.name, subdomain: pu.publication.subdomain, custom_domain: pu.publication.custom_domain }))
  .filter(p => only.length === 0 || only.includes(p.subdomain));

console.log(`Sesión: @${profile.handle}. Publicaciones: ${pubs.map(p => p.subdomain).join(', ')}`);

// Se ejecuta DENTRO de la página de la publicación (mismo origen, cookies incluidas).
async function collect() {
  const get = async (u) => {
    const r = await fetch(u, { credentials: 'include' });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { __status: r.status, __text: t.slice(0, 300) }; }
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const ds = { fetched_at: new Date().toISOString(), host: location.host, subdomain: location.host.split('.')[0] };
  ds.publication = await get('/api/v1/publication');
  let posts = [], offset = 0, total = 0;
  do {
    const p = await get(`/api/v1/post_management/published?offset=${offset}&limit=50&order_by=post_date&order_direction=desc`);
    total = p.total || 0; posts = posts.concat(p.posts || []); offset += 50; await sleep(300);
  } while (posts.length < total && offset < 5000);
  ds.posts = posts.map(p => { const { draftBylines, publishedBylines, ...rest } = p; return rest; });
  ds.counts = await get('/api/v1/post_management/counts');
  ds.summary = await get('/api/v1/publish-dashboard/summary');
  ds.summary_v2 = {};
  for (const r of [7, 30, 365]) { ds.summary_v2[r] = await get(`/api/v1/publish-dashboard/summary-v2?range=${r}`); await sleep(200); }
  ds.subscribers_timeseries = await get('/api/v1/publication/stats/emails/timeseries');
  ds.growth_sources = await get(`/api/v1/publication/stats/growth/sources?from_date=${yearAgo}&to_date=${today}&order_by=users&order_direction=desc`);
  ds.growth_events = await get(`/api/v1/publication/stats/growth/events?from_date=${yearAgo}&to_date=${today}`);
  ds.network_attribution = await get('/api/v1/publication/stats/network_attribution');
  ds.geo = await get('/api/v1/publication/stats/audience_insights/location?metric=free%20signups&granularity=global');
  ds.geo_total = await get('/api/v1/publication/stats/audience_insights/location/total');
  ds.details = {};
  for (const p of ds.posts) {
    const d = await get(`/api/v1/post_management/detail/${p.id}?offset=0&limit=1`);
    const s = d?.posts?.[0]?.stats || {};
    const daily = (s.firstWeekDailyStats || []).map(({ comps, ...day }) => day);
    ds.details[p.id] = { firstWeekDailyStats: daily, referrers: s.referrers, links: s.links, has_more_links: s.has_more_links, comps: s.comps };
    await sleep(350);
  }
  return ds;
}

const index = { fetched_at: new Date().toISOString(), user: { id: profile.id, handle: profile.handle, name: profile.name }, publications: [] };
for (const pub of pubs) {
  process.stdout.write(`→ ${pub.subdomain} ... `);
  try {
    await page.goto(`https://${pub.subdomain}.substack.com/publish/home`, { waitUntil: 'domcontentloaded' });
    const ds = await page.evaluate(collect);
    ds.publication_meta = pub;
    const file = path.join(DATA_DIR, `${pub.subdomain}.json`);
    await fs.writeFile(file, JSON.stringify(ds));
    importDataset(db, ds, pub);
    index.publications.push({ ...pub, posts: ds.posts.length, subscribers: ds.summary?.totalEmail ?? null, file: path.basename(file) });
    console.log(`${ds.posts.length} posts, ${ds.summary?.totalEmail ?? '?'} suscriptores`);
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    index.publications.push({ ...pub, error: e.message });
  }
}

// Las notas cuelgan de la cuenta, no de una publicación, así que se piden una sola vez
// desde substack.com. Substack no da las vistas de una nota; sí reacciones, restacks y respuestas.
process.stdout.write('→ notas ... ');
try {
  await page.goto('https://substack.com/home', { waitUntil: 'domcontentloaded' });
  const notes = await page.evaluate(async () => {
    const get = async (u) => (await fetch(u, { credentials: 'include' })).json();
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const me = await get('/api/v1/user/profile/self');
    let cursor = null, out = [], pages = 0;
    do {
      const j = await get(`/api/v1/reader/feed/profile/${me.id}` + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''));
      for (const it of j.items || []) {
        const c = it.comment;
        if (!c || c.user_id !== me.id) continue;
        out.push({ id: c.id, date: c.date, body: c.body || '', reactions: c.reaction_count || 0,
                   restacks: c.restacks || 0, replies: c.children_count || 0,
                   attachments: (c.attachments || []).length,
                   url: `https://substack.com/@${me.handle}/note/c-${c.id}`,
                   publication_id: c.publication_id || null });
      }
      cursor = j.nextCursor; pages++;
      await sleep(350);
    } while (cursor && pages < 40);
    return { kind: 'notes', fetched_at: new Date().toISOString(), user: { id: me.id, handle: me.handle, name: me.name }, notes: out };
  });
  await fs.writeFile(path.join(DATA_DIR, 'notes.json'), JSON.stringify(notes));
  index.notes = notes.notes.length;
  console.log(`${notes.notes.length} notas`);
} catch (e) {
  console.log(`ERROR: ${e.message}`);
}

await fs.writeFile(path.join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2));
await ctx.close();
db.close();
console.log(`Listo. Datos en ${DATA_DIR}`);
