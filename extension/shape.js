// Da forma a los datos crudos de la API de Substack para lo que espera el panel.
//
// Este archivo es la única fuente: `tools/build.mjs` lo importa tal cual, y
// `tools/make_extension_dashboard.py` lo copia a `extension/shape.js` quitando los
// `export` (una página de extensión no puede cargar módulos con CSP `script-src 'self'`
// sin type=module, y así el mismo código sirve en los dos sitios).
//
// No usa nada de Node ni del navegador a propósito: entra JSON, sale JSON.

// Un dataset crudo (lo que devuelve el recolector) → la publicación que pinta el panel.
function shapePublication(meta, d, hist) {
  const subdomain = meta.subdomain || d.subdomain;
  const host = meta.custom_domain || `${subdomain}.substack.com`;
  const posts = (d.posts || []).map((post) => {
    const s = post.stats || {};
    const det = (d.details && d.details[post.id]) || {};
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
      referrers: (det.referrers && det.referrers.sources) || [], links: det.links || [],
      daily: (det.firstWeekDailyStats || []).map((x) => ({ dt: x.dt, views: x.views, cum: x.cumulative_views, signups: x.signups })),
      comps: det.comps ? {
        views: det.comps.avg_views, open_rate: det.comps.avg_open_rate, ctr: det.comps.avg_click_through_rate,
        likes: det.comps.avg_likes, comments: det.comps.avg_comments, signups: det.comps.avg_signups, n: det.comps.n_comp_posts,
      } : null,
    };
  });
  return {
    id: meta.id, name: meta.name || subdomain, subdomain, host, fetched_at: d.fetched_at,
    counts: d.counts, summary: d.summary, summary_v2: d.summary_v2,
    subscribers_ts: Array.isArray(d.subscribers_timeseries) ? d.subscribers_timeseries
      : Array.isArray(d.emails_timeseries) ? d.emails_timeseries : [],
    growth_sources: ((d.growth_sources && d.growth_sources.sourceMetrics) || []).map((src) => {
      const m = (name) => { const x = (src.metrics || []).find((y) => y.name === name); return x ? x.total : 0; };
      return {
        label: src.sourceName || src.source, category: src.category || null, subscribers: m('Subscribers'), traffic: m('Traffic'),
        children: (src.children || []).map((c) => {
          const mm = (name) => { const x = (c.metrics || []).find((y) => y.name === name); return x ? x.total : 0; };
          return { label: (c.sourceName || c.source || '').slice(0, 80), href: c.href || null, subscribers: mm('Subscribers'), traffic: mm('Traffic') };
        }),
      };
    }),
    growth_totals: Object.fromEntries((((d.growth_sources || {}).totals) || []).map((t) => [t.name, t.total])),
    growth_events: (d.growth_events && d.growth_events.pubEvents) || [],
    attribution: (d.network_attribution && d.network_attribution.rows) || [],
    geo: (Array.isArray(d.geo) ? d.geo : []).map((r) => ({ code: r.location, value: r.value })).filter((r) => r.code && r.value > 0),
    geo_total: (d.geo_total && d.geo_total.global && d.geo_total.global.total) ?? null,
    history: hist || null,
    posts,
  };
}

// `entries` es [{ meta, dataset, history }] en el orden en que se quieran mostrar.
function shapePayload(entries, notes, primaryPublicationId, user) {
  const publications = entries.map((e) => shapePublication(e.meta, e.dataset, e.history));
  return {
    generated_at: new Date().toISOString(),
    user: user || (notes && notes.user) || null,
    publications,
    primary_publication_id: primaryPublicationId ?? (notes && notes.primary_publication_id) ?? null,
    notes: (notes && notes.notes) || null,
  };
}
