// Capturas para la ficha de la Chrome Web Store, a partir del panel de demostración.
// Uso:  npm run store-shots
//
// La Store exige 1280x800 exactos (o 640x400) y admite hasta cinco. Estas salen del
// mismo HTML que ve el usuario, con datos ficticios: la ficha no puede enseñar las
// estadísticas reales de nadie. También genera el mosaico promocional de 440x280.
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { ROOT } from './common.mjs';

const DEMO = path.join(ROOT, 'demo', 'dashboard.html');
const OUT = path.join(ROOT, 'store', 'screenshots');

if (!fs.existsSync(DEMO)) {
  console.error('Falta demo/dashboard.html. Ejecuta antes: python3 tools/make_demo.py demo');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,          // la Store quiere 1280x800 reales, no el doble
  colorScheme: 'light',
  locale: 'en-US',
});
await page.goto('file://' + DEMO + '?lang=en', { waitUntil: 'load' });
await page.waitForTimeout(600);

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name) });   // sin fullPage: recorta a 1280x800
  console.log('  →', path.join('store/screenshots', name));
};
const goTo = async (idx) => {
  if (idx === -2) await page.click('#notesbtn');
  else { await page.click('#navbtn'); await page.click(`#navmenu button[data-idx="${idx}"]`); }
  await page.waitForTimeout(400);
};

// 1. Lo primero que ve alguien al abrir el panel.
await goTo(0);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('1-overview.png');

// 2. El detalle de un post, que es la razón de usarlo.
await page.click('#posts tbody tr[data-id]');
await page.waitForTimeout(400);
await page.evaluate(() => {
  const r = document.querySelector('#posts tbody tr.selected');
  window.scrollTo({ top: Math.max(0, r.getBoundingClientRect().top + window.scrollY - 120) });
});
await shot('2-post-detail.png');

// 3. La comparativa entre publicaciones, en métricas relativas.
await page.evaluate(() => { const b = document.querySelector('#detail-close'); if (b) b.click(); });
await goTo(-1);
await page.click('#mode button[data-mode="rel"]');
await page.evaluate(() => window.scrollTo(0, 0));
await shot('3-comparison.png');

// 4. El mapa de suscriptores por país.
await page.click('#mode button[data-mode="abs"]');
await goTo(0);
await page.evaluate(() => {
  const c = document.querySelector('#geo-map').closest('.card');
  window.scrollTo({ top: Math.max(0, c.getBoundingClientRect().top + window.scrollY - 16) });
});
await shot('4-map.png');

// 5. El analizador, que es lo que la diferencia de un panel cualquiera.
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('#analyzebtn');
await shot('5-analyze.png');

// Mosaico promocional: 440x280, solo marca. Se dibuja aquí para no arrastrar otra herramienta.
const tile = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
await tile.setContent(`<!doctype html><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
         background: #fcfcfb; font-family: -apple-system, system-ui, sans-serif; color: #0b0b0b; }
  .ico { width: 68px; height: 68px; border-radius: 15px; background: #ff6719; color: #fff;
         display: flex; align-items: center; justify-content: center; font-size: 46px; font-weight: 700; }
  h1 { margin: 0; font-size: 23px; letter-spacing: -.01em; }
  p { margin: 0; font-size: 13px; color: #52514e; }
</style><div class="ico">S</div><h1>Dashboard for Substack</h1>
<p>Your stats, in your browser. Nowhere else.</p>`);
await tile.waitForTimeout(200);
await tile.screenshot({ path: path.join(OUT, 'promo-440x280.png') });
console.log('  →', path.join('store/screenshots', 'promo-440x280.png'));

await browser.close();
console.log('Listas en store/screenshots/ (datos ficticios).');
