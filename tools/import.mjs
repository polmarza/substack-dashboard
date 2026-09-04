// Importa a la base de datos los JSON ya descargados en data/ (útil la primera vez o tras una descarga manual).
import fs from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from './common.mjs';
import { openDb, importDataset, DB_PATH } from './db.mjs';

const index = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'index.json'), 'utf8'));
const db = openDb();
for (const p of index.publications) {
  if (!p.file) continue;
  const ds = JSON.parse(await fs.readFile(path.join(DATA_DIR, p.file), 'utf8'));
  const r = importDataset(db, ds, p);
  console.log(`${p.subdomain}: ${r.skipped ? 'ya importado' : r.posts + ' posts importados'}`);
}
db.close();
console.log(`Base de datos: ${DB_PATH}`);
