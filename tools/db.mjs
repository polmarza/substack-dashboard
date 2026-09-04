// Base de datos local SQLite (node:sqlite, sin dependencias). Guarda un histórico por sincronización.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './common.mjs';

export const DB_PATH = path.join(DATA_DIR, 'substack.sqlite');

export function openDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS publications (
      id INTEGER PRIMARY KEY, subdomain TEXT NOT NULL UNIQUE, name TEXT, custom_domain TEXT, last_sync TEXT
    );
    CREATE TABLE IF NOT EXISTS syncs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, publication_id INTEGER NOT NULL, fetched_at TEXT NOT NULL,
      subscribers INTEGER, paid_subscribers INTEGER, views_30d INTEGER, open_rate REAL, posts_published INTEGER, drafts INTEGER,
      UNIQUE(publication_id, fetched_at)
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY, publication_id INTEGER NOT NULL, title TEXT, slug TEXT, type TEXT, audience TEXT, post_date TEXT, url TEXT
    );
    CREATE TABLE IF NOT EXISTS post_stats (
      sync_id INTEGER NOT NULL, post_id INTEGER NOT NULL, fetched_at TEXT NOT NULL,
      views INTEGER, opens INTEGER, opened INTEGER, open_rate REAL, clicks INTEGER, clicked INTEGER, ctr REAL,
      sent INTEGER, delivered INTEGER, shares INTEGER, signups INTEGER, subscribes INTEGER, unsubscribes INTEGER,
      reactions INTEGER, comments INTEGER,
      PRIMARY KEY (sync_id, post_id)
    );
    CREATE TABLE IF NOT EXISTS subscriber_series (
      publication_id INTEGER NOT NULL, day TEXT NOT NULL, subscribers INTEGER, PRIMARY KEY (publication_id, day)
    );
    CREATE INDEX IF NOT EXISTS idx_post_stats_post ON post_stats(post_id, fetched_at);
  `);
  return db;
}

// Inserta un dataset descargado (el JSON de data/<subdominio>.json) como una sincronización.
export function importDataset(db, ds, meta) {
  const pubId = meta?.id ?? ds.publication?.id ?? ds.publication_meta?.id;
  if (!pubId) throw new Error(`Sin id de publicación para ${ds.subdomain}`);
  const subdomain = ds.subdomain ?? meta?.subdomain ?? String(ds.host || '').split('.')[0];
  const host = meta?.custom_domain || `${subdomain}.substack.com`;
  const tx = db.prepare('BEGIN'); tx.run();
  try {
    db.prepare(`INSERT INTO publications (id, subdomain, name, custom_domain, last_sync) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, custom_domain = excluded.custom_domain, last_sync = excluded.last_sync`)
      .run(pubId, subdomain, meta?.name ?? ds.publication?.name ?? subdomain, meta?.custom_domain ?? null, ds.fetched_at);
    const s = ds.summary || {}, v = ds.summary_v2?.[30] || {};
    const r = db.prepare(`INSERT OR IGNORE INTO syncs (publication_id, fetched_at, subscribers, paid_subscribers, views_30d, open_rate, posts_published, drafts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(pubId, ds.fetched_at, s.totalEmail ?? v.totalSubscribersEnd ?? null, v.paidSubscribersEnd ?? null, s.views ?? null, s.openRate ?? null, ds.counts?.published ?? null, ds.counts?.drafts ?? null);
    if (r.changes === 0) { db.prepare('COMMIT').run(); return { skipped: true }; }
    const syncId = Number(r.lastInsertRowid);
    const upPost = db.prepare(`INSERT INTO posts (id, publication_id, title, slug, type, audience, post_date, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug, audience = excluded.audience, url = excluded.url`);
    const insStat = db.prepare(`INSERT OR REPLACE INTO post_stats (sync_id, post_id, fetched_at, views, opens, opened, open_rate, clicks, clicked, ctr, sent, delivered, shares, signups, subscribes, unsubscribes, reactions, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of ds.posts || []) {
      const st = p.stats || {};
      upPost.run(p.id, pubId, p.title ?? null, p.slug ?? null, p.type ?? null, p.audience ?? null, p.post_date ?? null, `https://${host}/p/${p.slug}`);
      insStat.run(syncId, p.id, ds.fetched_at, st.views ?? 0, st.opens ?? 0, st.opened ?? 0, st.open_rate ?? 0, st.clicks ?? 0, st.clicked ?? 0, st.click_through_rate ?? 0,
        st.sent ?? 0, st.delivered ?? 0, st.shares ?? 0, st.signups ?? 0, st.subscribes ?? 0, st.unsubscribes ?? 0, p.reaction_count ?? 0, p.comment_count ?? 0);
    }
    const series = Array.isArray(ds.subscribers_timeseries) ? ds.subscribers_timeseries : Array.isArray(ds.emails_timeseries) ? ds.emails_timeseries : [];
    const insDay = db.prepare('INSERT OR REPLACE INTO subscriber_series (publication_id, day, subscribers) VALUES (?, ?, ?)');
    for (const [day, n] of series) insDay.run(pubId, String(day).replace(/\//g, '-'), n);
    db.prepare('COMMIT').run();
    return { syncId, posts: (ds.posts || []).length };
  } catch (e) { db.prepare('ROLLBACK').run(); throw e; }
}

// Histórico para el panel: serie larga de suscriptores y evolución de cada post entre sincronizaciones.
export function history(db, pubId) {
  const subscribers = db.prepare('SELECT day, subscribers FROM subscriber_series WHERE publication_id = ? ORDER BY day').all(pubId).map(r => [r.day, r.subscribers]);
  const syncs = db.prepare('SELECT id, fetched_at, subscribers, views_30d, open_rate FROM syncs WHERE publication_id = ? ORDER BY fetched_at').all(pubId);
  const rows = db.prepare(`SELECT ps.post_id, ps.fetched_at, ps.views, ps.opened, ps.reactions, ps.comments, ps.signups FROM post_stats ps
    JOIN posts p ON p.id = ps.post_id WHERE p.publication_id = ? ORDER BY ps.fetched_at`).all(pubId);
  const posts = {};
  for (const r of rows) (posts[r.post_id] ??= []).push([r.fetched_at, r.views, r.opened, r.reactions, r.comments, r.signups]);
  return { subscribers, syncs, posts };
}
