// Empaqueta la extensión para subirla a la Chrome Web Store.
// Uso:  npm run package
//
// Copia solo los archivos que la extensión necesita —nada de fuentes, notas ni
// basura del sistema— y los comprime. Se hace con una lista explícita en vez de
// «comprime la carpeta» para que un archivo suelto no acabe publicado sin querer.
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { ROOT } from './common.mjs';

const run = promisify(execFile);
const EXT = path.join(ROOT, 'extension');
const OUT = path.join(ROOT, 'store');

const FILES = [
  'manifest.json',
  'background.js',
  'popup.html', 'popup.js',
  'dashboard.html', 'dashboard.js', 'dashboard-boot.js', 'shape.js',
  'icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png',
  '_locales/en/messages.json',
  '_locales/es/messages.json',
];

const manifest = JSON.parse(await fs.readFile(path.join(EXT, 'manifest.json'), 'utf8'));

// Lo que el manifiesto declara tiene que existir, y lo que existe tiene que estar
// en la lista: un desajuste en cualquiera de los dos sentidos rompe el paquete.
const declared = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon || {}),
  ...Object.values(manifest.icons || {}),
].filter(Boolean);
for (const f of new Set(declared)) {
  if (!FILES.includes(f)) throw new Error(`el manifiesto declara ${f} y no está en la lista del paquete`);
}
const onDisk = (await fs.readdir(EXT)).filter((f) => !f.startsWith('.') && f !== 'icon.svg');
const missing = onDisk.filter((f) => f !== '_locales' && !FILES.includes(f));
if (missing.length) throw new Error(`hay archivos en extension/ fuera de la lista: ${missing.join(', ')}`);

const stage = path.join(OUT, '.stage');
await fs.rm(stage, { recursive: true, force: true });
for (const f of FILES) {
  const dst = path.join(stage, f);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(path.join(EXT, f), dst);
}

const name = `dashboard-for-substack-${manifest.version}.zip`;
const zip = path.join(OUT, name);
await fs.rm(zip, { force: true });
// -X descarta los atributos extendidos de macOS, que Google rechaza como archivos ocultos.
await run('zip', ['-r', '-X', '-q', zip, '.'], { cwd: stage });
await fs.rm(stage, { recursive: true, force: true });

const { size } = await fs.stat(zip);
const { stdout } = await run('unzip', ['-Z1', zip]);
console.log(`store/${name} — ${(size / 1024).toFixed(0)} KB, ${stdout.trim().split('\n').length} archivos`);
console.log(stdout.trim().split('\n').map((f) => '  ' + f).join('\n'));
