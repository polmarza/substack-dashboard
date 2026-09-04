// Service worker de la extensión.
//
// No hace las peticiones a Substack él mismo: un service worker es un contexto
// cross-site respecto a substack.com, y la cookie de sesión (HttpOnly) no viaja
// de forma fiable desde ahí — los subdominios responden 301 hacia el dominio
// personalizado y el fetch se rompe con "Failed to fetch".
//
// En su lugar abre una pestaña en segundo plano de cada publicación e inyecta el
// recolector con chrome.scripting. Ahí las peticiones son same-origin desde una
// página real con toda la sesión, exactamente como el recolector de la skill.
//
// Lo recogido se guarda en chrome.storage.local y lo lee el panel de la propia
// extensión (dashboard.html). No hace falta ningún servidor ni sale de este Chrome.
let state = { running: false, lines: [], error: false };
const say = (line, error = false) => {
  state.lines.push(line);
  if (state.lines.length > 40) state.lines.shift();
  if (error) state.error = true;
  return chrome.storage.session.set({ syncState: state });
};

// Espera a que una pestaña termine de cargar (o agota el tiempo).
function waitForComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(onUpdated); reject(new Error('la pestaña no cargó a tiempo')); }, timeoutMs);
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

// Abre una pestaña oculta, ejecuta `fn` dentro de ella y la cierra pase lo que pase.
async function runInTab(url, fn) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForComplete(tab.id);
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn });
    if (!res || res.result === undefined) throw new Error('sin resultado del recolector');
    if (res.result && res.result.__error) throw new Error(res.result.__error);
    return res.result;
  } finally {
    try { await chrome.tabs.remove(tab.id); } catch {}
  }
}

// ---- Se ejecuta DENTRO de la página de la publicación (same-origin, con sesión) ----
async function pageCollect() {
  try {
    const get = async (u) => {
      const r = await fetch(u, { credentials: 'include', headers: { Accept: 'application/json' } });
      const t = await r.text();
      try { return JSON.parse(t); } catch { return { __status: r.status }; }
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const today = new Date().toISOString().slice(0, 10);
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    const subdomain = location.host.split('.')[0];
    const ds = { fetched_at: new Date().toISOString(), host: location.host, subdomain, source: 'extension' };
    ds.publication = await get('/api/v1/publication');
    let posts = [], offset = 0, total = 0;
    do {
      const p = await get(`/api/v1/post_management/published?offset=${offset}&limit=50&order_by=post_date&order_direction=desc`);
      if (p.__status) throw new Error(`published returned ${p.__status}`);
      total = p.total || 0; posts = posts.concat(p.posts || []); offset += 50; await sleep(300);
    } while (posts.length < total && offset < 5000);
    ds.posts = posts.map((p) => { const { draftBylines, publishedBylines, ...rest } = p; return rest; });
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
      const s = (d && d.posts && d.posts[0] && d.posts[0].stats) || {};
      const daily = (s.firstWeekDailyStats || []).map(({ comps, ...day }) => day);
      ds.details[p.id] = { firstWeekDailyStats: daily, referrers: s.referrers, links: s.links, has_more_links: s.has_more_links, comps: s.comps };
      await sleep(350);
    }
    return ds;
  } catch (e) {
    return { __error: String(e && e.message || e) };
  }
}

// ---- Se ejecuta DENTRO de substack.com para recoger las Notas ----
async function pageCollectNotes() {
  try {
    const get = async (u) => (await fetch(u, { credentials: 'include' })).json();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const me = await get('/api/v1/user/profile/self');
    if (!me || !me.id) throw new Error('no session on substack.com');
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
    return { kind: 'notes', fetched_at: new Date().toISOString(), source: 'extension',
             user: { id: me.id, handle: me.handle, name: me.name },
             primary_publication_id: (me.primaryPublication && me.primaryPublication.id) || null, notes: out };
  } catch (e) {
    return { __error: String(e && e.message || e) };
  }
}

// ---- Se ejecuta DENTRO de substack.com para descubrir las publicaciones ----
async function pageProfile() {
  try {
    const me = await (await fetch('/api/v1/user/profile/self', { credentials: 'include' })).json();
    if (!me || !me.id) throw new Error('no session on substack.com');
    return {
      handle: me.handle,
      pubs: (me.publicationUsers || []).filter((pu) => pu.role === 'admin' && pu.publication)
        .map((pu) => ({ id: pu.publication.id, name: pu.publication.name, subdomain: pu.publication.subdomain, custom_domain: pu.publication.custom_domain })),
    };
  } catch (e) {
    return { __error: String(e && e.message || e) };
  }
}

// ---- Histórico ----
// Cada sincronización es una foto. Guardamos las diferencias que el panel sabe
// dibujar (serie de suscriptores y evolución por post) sin arrastrar los datasets
// enteros, que ocuparían de más muy rápido.
const MAX_SYNCS = 400;      // ~un año sincronizando a diario
const MAX_POINTS = 120;     // puntos guardados por post

async function mergeHistory(pubId, ds) {
  const key = 'hist:' + pubId;
  const prev = (await chrome.storage.local.get(key))[key] || { subscribers: [], syncs: [], posts: {} };

  // La serie que devuelve Substack son siempre 30 días; acumulándola día a día
  // sale un histórico más largo del que la propia API ofrece.
  const days = new Map(prev.subscribers);
  const series = Array.isArray(ds.subscribers_timeseries) ? ds.subscribers_timeseries
    : Array.isArray(ds.emails_timeseries) ? ds.emails_timeseries : [];
  for (const [day, n] of series) days.set(String(day).replace(/\//g, '-'), n);
  const subscribers = [...days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const at = ds.fetched_at;
  const syncs = prev.syncs.filter((s) => s.fetched_at !== at);
  const v = (ds.summary_v2 && ds.summary_v2[30]) || {};
  syncs.push({ id: syncs.length + 1, fetched_at: at,
    subscribers: ds.summary?.totalEmail ?? v.totalSubscribersEnd ?? null,
    views_30d: ds.summary?.views ?? null, open_rate: ds.summary?.openRate ?? null });

  const posts = prev.posts || {};
  for (const p of ds.posts || []) {
    const s = p.stats || {};
    const row = [at, s.views ?? 0, s.opened ?? 0, p.reaction_count ?? 0, p.comment_count ?? 0, s.signups ?? 0];
    const list = (posts[p.id] || []).filter((r) => r[0] !== at);
    list.push(row);
    posts[p.id] = list.slice(-MAX_POINTS);
  }
  const hist = { subscribers, syncs: syncs.slice(-MAX_SYNCS), posts };
  await chrome.storage.local.set({ [key]: hist });
}

// Si borras una publicación en Substack, sus datos también se van de aquí.
async function prune(keep) {
  const all = await chrome.storage.local.get(null);
  const alive = new Set(keep.map((p) => 'ds:' + p.subdomain).concat(keep.map((p) => 'hist:' + p.id)));
  const dead = Object.keys(all).filter((k) => (k.startsWith('ds:') || k.startsWith('hist:')) && !alive.has(k));
  if (dead.length) await chrome.storage.local.remove(dead);
  return dead;
}

async function sync() {
  if (state.running) return;
  state = { running: true, lines: [], error: false };
  await say('Reading your Substack profile…');
  try {
    const prof = await runInTab('https://substack.com/home', pageProfile);
    if (!prof.pubs || !prof.pubs.length) throw new Error('No admin publications found. Sign in at substack.com and try again.');
    await say(`Signed in as @${prof.handle}. ${prof.pubs.length} publications: ${prof.pubs.map((p) => p.subdomain).join(', ')}`);

    for (const pub of prof.pubs) {
      await say(`→ ${pub.subdomain}…`);
      const ds = await runInTab(`https://${pub.subdomain}.substack.com/publish/home`, pageCollect);
      ds.publication_meta = pub;
      await chrome.storage.local.set({ ['ds:' + pub.subdomain]: ds });
      await mergeHistory(pub.id, ds);
      await say(`   ${pub.subdomain}: ${ds.posts.length} posts, ${ds.summary?.totalEmail ?? '?'} subscribers`);
    }

    const removed = await prune(prof.pubs);
    if (removed.length) await say(`   removed: ${removed.length} publication(s) no longer in your account`);

    await say('→ notes…');
    let notes = null;
    try {
      notes = await runInTab('https://substack.com/home', pageCollectNotes);
      await chrome.storage.local.set({ notes });
      await say(`   ${notes.notes.length} notes`);
    } catch (e) {
      await say('   notes: ' + e.message, false);
    }

    // Si las notas fallaron, conservamos lo que ya sabíamos en lugar de borrarlo.
    const old = (await chrome.storage.local.get('index')).index || {};
    await chrome.storage.local.set({ index: {
      updated_at: new Date().toISOString(),
      user: (notes && notes.user) || old.user || { handle: prof.handle },
      primary_publication_id: (notes && notes.primary_publication_id) || old.primary_publication_id || null,
      publications: prof.pubs,
    } });
    await say('Done. The dashboard will reload on its own.');
  } catch (e) {
    await say('Error: ' + (e && e.message || e), true);
  } finally {
    state.running = false;
    await chrome.storage.session.set({ syncState: state });
  }
}

chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'sync') sync(); });
