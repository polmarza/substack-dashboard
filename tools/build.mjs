// Genera dashboard.html con los datos de data/*.json incrustados (funciona abriéndolo en local, sin servidor).
// Uso: npm run build
import fs from 'node:fs/promises';
import path from 'node:path';
import fsSync from 'node:fs';
import { ROOT, DATA_DIR } from './common.mjs';
import { openDb, history, DB_PATH } from './db.mjs';
import { shapePayload } from './shape.mjs';

const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf8'));
const db = fsSync.existsSync(DB_PATH) ? openDb() : null;
const entries = [];
for (const p of index.publications) {
  if (!p.file) continue;
  entries.push({
    meta: p,
    dataset: JSON.parse(await fs.readFile(path.join(DATA_DIR, p.file), 'utf8')),
    history: db ? history(db, p.id) : null,
  });
}
db?.close();
// Las notas viven en su propio archivo porque pertenecen a la cuenta, no a una publicación.
let notes = null;
try { notes = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'notes.json'), 'utf8')); } catch {}
const payload = shapePayload(entries, notes, index.primary_publication_id, index.user);
const template = await fs.readFile(path.join(ROOT, 'tools', 'template.html'), 'utf8');
const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
const html = template.replace('/*__DATA__*/null', json);
await fs.writeFile(path.join(ROOT, 'dashboard.html'), html);
const pubs = payload.publications;
console.log(`dashboard.html generado: ${pubs.length} publicaciones, ${pubs.reduce((a, p) => a + p.posts.length, 0)} posts`);
