// Genera dashboard.html con los datos de data/*.json incrustados (funciona abriéndolo en local, sin servidor).
// Uso: npm run build
import fs from 'node:fs/promises';
import path from 'node:path';
import fsSync from 'node:fs';
import { ROOT, DATA_DIR } from './common.mjs';
import { openDb, history, DB_PATH } from './db.mjs';

const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf8'));
const db = fsSync.existsSync(DB_PATH) ? openDb() : null;
const pubs = [];
for (const p of index.publications) {
  if (!p.file) continue;
  const d = JSON.parse(await fs.readFile(path.join(DATA_DIR, p.file), 'utf8'));
  const host = p.custom_domain || `${p.subdomain}.substack.com`;
  const posts = d.posts.map(post => {
    const s = post.stats || {};
    const det = d.details?.[post.id] || {};
    return {
      id: post.id, title: post.title, subtitle: post.subtitle || null, slug: post.slug, type: post.type,
      audience: post.audience, date: post.post_date, url: `https://${host}/p/${post.slug}`,
      cover: post.cover_image || null,
      reactions: post.reaction_count ?? 0, comments: post.comment_count ?? 0,
      views: s.views ?? 0, opens: s.opens ?? 0, opened: s.opened ?? 0, open_rate: s.open_rate ?? 0,
      clicks: s.clicks ?? 0, clicked: s.clicked ?? 0, ctr: s.click_through_rate ?? 0,
      sent: s.sent ?? 0, delivered: s.delivered ?? 0, shares: s.shares ?? 0,
      signups: s.signups ?? 0, subscribes: s.subscribes ?? 0, unsubscribes: s.unsubscribes ?? 0,
      signups_1d: s.signups_within_1_day ?? 0, unsubs_1d: s.unsubscribes_within_1_day ?? 0,
      referrers: det.referrers?.sources || [], links: det.links || [],
      daily: (det.firstWeekDailyStats || []).map(x => ({ dt: x.dt, views: x.views, cum: x.cumulative_views, signups: x.signups })),
      comps: det.comps ? {
        views: det.comps.avg_views, open_rate: det.comps.avg_open_rate, ctr: det.comps.avg_click_through_rate,
        likes: det.comps.avg_likes, comments: det.comps.avg_comments, signups: det.comps.avg_signups, n: det.comps.n_comp_posts,
      } : null,
    };
  });
  pubs.push({
    id: p.id, name: p.name, subdomain: p.subdomain, host, fetched_at: d.fetched_at,
    counts: d.counts, summary: d.summary, summary_v2: d.summary_v2,
    subscribers_ts: Array.isArray(d.subscribers_timeseries) ? d.subscribers_timeseries : Array.isArray(d.emails_timeseries) ? d.emails_timeseries : [],
    growth_sources: (d.growth_sources?.sourceMetrics || []).map(src => {
      const m = (name) => (src.metrics || []).find(x => x.name === name)?.total ?? 0;
      return { label: src.sourceName || src.source, category: src.category || null, subscribers: m('Subscribers'), traffic: m('Traffic'),
        children: (src.children || []).map(c => { const mm = (name) => (c.metrics || []).find(x => x.name === name)?.total ?? 0; return { label: (c.sourceName || c.source || '').slice(0, 80), href: c.href || null, subscribers: mm('Subscribers'), traffic: mm('Traffic') }; }) };
    }),
    growth_totals: Object.fromEntries((d.growth_sources?.totals || []).map(t => [t.name, t.total])),
    growth_events: d.growth_events?.pubEvents || [],
    attribution: d.network_attribution?.rows || [],
    geo: (Array.isArray(d.geo) ? d.geo : []).map(r => ({ code: r.location, value: r.value })).filter(r => r.code && r.value > 0),
    geo_total: d.geo_total?.global?.total ?? null,
    history: db ? history(db, p.id) : null,
    posts,
  });
}
db?.close();
// Las notas viven en su propio archivo porque pertenecen a la cuenta, no a una publicación.
let notes = null;
try { notes = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'notes.json'), 'utf8')); } catch {}
const payload = { generated_at: new Date().toISOString(), user: index.user, publications: pubs, notes: notes?.notes || null };
const template = await fs.readFile(path.join(ROOT, 'tools', 'template.html'), 'utf8');
const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
const html = template.replace('/*__DATA__*/null', json);
await fs.writeFile(path.join(ROOT, 'dashboard.html'), html);
console.log(`dashboard.html generado: ${pubs.length} publicaciones, ${pubs.reduce((a, p) => a + p.posts.length, 0)} posts`);
