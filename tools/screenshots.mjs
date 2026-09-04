// Captura las imágenes del README a partir del panel de demostración (datos ficticios).
// Uso:  python3 tools/make_demo.py demo  &&  node tools/screenshots.mjs
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { ROOT } from './common.mjs';

const DEMO = path.join(ROOT, 'demo', 'dashboard.html');
const OUT = path.join(ROOT, 'docs');

if (!fs.existsSync(DEMO)) {
  console.error('Falta demo/dashboard.html. Ejecuta antes: python3 tools/make_demo.py demo');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1400, height: 1180 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
});
await page.goto('file://' + DEMO, { waitUntil: 'load' });
await page.waitForTimeout(600);

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('  →', path.join('docs', name));
};

// 1. Comparativa, métricas absolutas (vista por defecto)
await shot('comparison-absolute.png');

// 2. Comparativa, métricas relativas: mismo dato, normalizado por audiencia
await page.click('#mode button[data-mode="rel"]');
await shot('comparison-relative.png');

// 3. Vista general de una publicación: tarjetas, suscriptores, fuentes y vistas por post
await page.click('#mode button[data-mode="abs"]');
await page.click('#tabs .tab[data-idx="0"]');
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('publication-overview.png');

// 4. El detalle desplegado bajo el post pulsado
await page.click('#posts tbody tr[data-id]');
await page.waitForTimeout(400);
await page.evaluate(() => {
  const r = document.querySelector('#posts tbody tr.selected');
  window.scrollTo({ top: Math.max(0, r.getBoundingClientRect().top + window.scrollY - 200) });
});
await shot('post-detail.png');

await browser.close();
console.log('Capturas listas en docs/ (datos ficticios).');
