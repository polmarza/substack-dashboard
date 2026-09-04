// Service worker: recorre tus publicaciones (rol admin), descarga posts + estadísticas con la sesión de Chrome
// y las envía al servidor local del panel. La lógica de descarga es la misma que tools/sync.mjs.
const SERVER = 'http://127.0.0.1:8787';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let state = { running: false, lines: [], error: false };
const say = (line, error = false) => { state.lines.push(line); if (state.lines.length > 40) state.lines.shift(); if (error) state.error = true; return chrome.storage.session.set({ syncState: state }); };

async function get(base, path) {
  const r = await fetch(base + path, { credentials: 'include', headers: { 'Accept': 'application/json' } });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { __status: r.status, __text: t.slice(0, 300) }; }
}

async function collect(sub) {
  const base = `https://${sub}.substack.com`;
  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const ds = { fetched_at: new Date().toISOString(), host: `${sub}.substack.com`, subdomain: sub, source: 'extension' };
  ds.publication = await get(base, '/api/v1/publication');
  let posts = [], offset = 0, total = 0;
  do {
    const p = await get(base, `/api/v1/post_management/published?offset=${offset}&limit=50&order_by=post_date&order_direction=desc`);
    if (p.__status) throw new Error(`published devolvió ${p.__status}`);
    total = p.total || 0; posts = posts.concat(p.posts || []); offset += 50; await sleep(300);
  } while (posts.length < total && offset < 5000);
  ds.posts = posts.map(p => { const { draftBylines, publishedBylines, ...rest } = p; return rest; });
  ds.counts = await get(base, '/api/v1/post_management/counts');
  ds.summary = await get(base, '/api/v1/publish-dashboard/summary');
  ds.summary_v2 = {};
  for (const r of [7, 30, 365]) { ds.summary_v2[r] = await get(base, `/api/v1/publish-dashboard/summary-v2?range=${r}`); await sleep(200); }
  ds.subscribers_timeseries = await get(base, '/api/v1/publication/stats/emails/timeseries');
  ds.growth_sources = await get(base, `/api/v1/publication/stats/growth/sources?from_date=${yearAgo}&to_date=${today}&order_by=users&order_direction=desc`);
  ds.growth_events = await get(base, `/api/v1/publication/stats/growth/events?from_date=${yearAgo}&to_date=${today}`);
  ds.network_attribution = await get(base, '/api/v1/publication/stats/network_attribution');
  ds.geo = await get(base, '/api/v1/publication/stats/audience_insights/location?metric=free%20signups&granularity=global');
  ds.geo_total = await get(base, '/api/v1/publication/stats/audience_insights/location/total');
  ds.details = {};
  let i = 0;
  for (const p of ds.posts) {
    const d = await get(base, `/api/v1/post_management/detail/${p.id}?offset=0&limit=1`);
    const s = d?.posts?.[0]?.stats || {};
    const daily = (s.firstWeekDailyStats || []).map(({ comps, ...day }) => day);
    ds.details[p.id] = { firstWeekDailyStats: daily, referrers: s.referrers, links: s.links, has_more_links: s.has_more_links, comps: s.comps };
    if (++i % 10 === 0) await say(`   ${sub}: ${i}/${ds.posts.length} posts`);
    await sleep(350);
  }
  return ds;
}

async function sync() {
  if (state.running) return;
  state = { running: true, lines: [], error: false };
  await say('Comprobando sesión de Substack…');
  try {
    const ping = await fetch(`${SERVER}/api/status`).then(r => r.json()).catch(() => null);
    if (!ping) throw new Error('No encuentro el servidor del panel en 127.0.0.1:8787. Arranca "npm start".');
    const me = await get('https://substack.com', '/api/v1/user/profile/self');
    if (me.__status) throw new Error(`Sin sesión de Substack en este Chrome (HTTP ${me.__status}). Inicia sesión en substack.com y repite.`);
    const pubs = (me.publicationUsers || []).filter(pu => pu.role === 'admin' && pu.publication)
      .map(pu => ({ id: pu.publication.id, name: pu.publication.name, subdomain: pu.publication.subdomain, custom_domain: pu.publication.custom_domain }));
    await say(`Sesión de @${me.handle}. ${pubs.length} publicaciones: ${pubs.map(p => p.subdomain).join(', ')}`);
    for (const pub of pubs) {
      await say(`→ ${pub.subdomain}…`);
      const ds = await collect(pub.subdomain);
      ds.publication_meta = pub;
      const r = await fetch(`${SERVER}/api/import?subdomain=${encodeURIComponent(pub.subdomain)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ds) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`El servidor rechazó ${pub.subdomain}: ${j.error || r.status}`);
      await say(`   ${pub.subdomain}: ${ds.posts.length} posts, ${ds.summary?.totalEmail ?? '?'} suscriptores`);
    }
    await say('→ notas…');
    try {
      const meAcc = await get('https://substack.com', '/api/v1/user/profile/self');
      let cursor = null, out = [], pages = 0;
      do {
        const j = await get('https://substack.com', `/api/v1/reader/feed/profile/${meAcc.id}` + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''));
        for (const it of j.items || []) {
          const c = it.comment;
          if (!c || c.user_id !== meAcc.id) continue;
          out.push({ id: c.id, date: c.date, body: c.body || '', reactions: c.reaction_count || 0,
                     restacks: c.restacks || 0, replies: c.children_count || 0,
                     attachments: (c.attachments || []).length,
                     url: `https://substack.com/@${meAcc.handle}/note/c-${c.id}`,
                     publication_id: c.publication_id || null });
        }
        cursor = j.nextCursor; pages++;
        await sleep(350);
      } while (cursor && pages < 40);
      const payload = { kind: 'notes', fetched_at: new Date().toISOString(), source: 'extension',
                        user: { id: meAcc.id, handle: meAcc.handle, name: meAcc.name },
                        primary_publication_id: (meAcc.primaryPublication && meAcc.primaryPublication.id) || null, notes: out };
      await fetch(`${SERVER}/api/import?subdomain=notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await say(`   ${out.length} notas`);
    } catch (e) {
      await say('   notas: ' + e.message, false);
    }
    await say('Generando el panel…');
    await fetch(`${SERVER}/api/build`, { method: 'POST' });
    await say('Listo. El panel se recargará solo.');
  } catch (e) {
    await say('Error: ' + e.message, true);
  } finally {
    state.running = false;
    await chrome.storage.session.set({ syncState: state });
  }
}

chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'sync') sync(); });
