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
  locale: 'en-US',
});
// ?lang=en: el repositorio está en inglés, así que las imágenes también.
await page.goto('file://' + DEMO + '?lang=en', { waitUntil: 'load' });
await page.waitForTimeout(600);

// Resalta un elemento con un recuadro rojo y una etiqueta, para que en el README se vea
// de un vistazo qué distingue una captura de la siguiente. Solo afecta a la imagen.
const annotate = async (selector, text) => {
  await page.evaluate(({ selector, text }) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('no encuentro ' + selector);
    const r = el.getBoundingClientRect();
    const RED = '#e5484d', pad = 5, add = (styles, txt) => {
      const n = document.createElement('div');
      n.className = '__annot';
      if (txt) n.textContent = txt;
      Object.assign(n.style, { position: 'fixed', zIndex: '9999', pointerEvents: 'none' }, styles);
      document.body.appendChild(n);
    };
    add({
      left: (r.left - pad) + 'px', top: (r.top - pad) + 'px',
      width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px',
      border: `3px solid ${RED}`, borderRadius: '10px',
      boxShadow: `0 0 0 4px ${RED}22`, boxSizing: 'border-box',
    });
    // A la derecha, no debajo: debajo del conmutador hay contenido y la etiqueta lo taparía.
    add({
      left: (r.right + pad + 3) + 'px', top: (r.top + r.height / 2 - 7) + 'px',
      width: '0', height: '0', borderTop: '7px solid transparent',
      borderBottom: '7px solid transparent', borderRight: `9px solid ${RED}`,
    });
    add({
      left: (r.right + pad + 12) + 'px', top: (r.top - pad) + 'px',
      height: (r.height + pad * 2) + 'px', display: 'flex', alignItems: 'center',
      background: RED, color: '#fff', padding: '0 13px', borderRadius: '8px',
      font: '600 13px/1.2 system-ui, -apple-system, sans-serif', whiteSpace: 'nowrap',
      boxShadow: '0 2px 10px rgba(0,0,0,.25)', boxSizing: 'border-box',
    }, text);
  }, { selector, text });
};
const clearAnnotations = () => page.evaluate(() => document.querySelectorAll('.__annot').forEach(n => n.remove()));

// El panel abre en la publicación principal; para las demás vistas se usa el menú.
const goTo = async (idx) => {
  if (idx === -2) { await page.click('#notesbtn'); }      // Notas es su propio botón
  else { await page.click('#navbtn'); await page.click(`#navmenu button[data-idx="${idx}"]`); }
  await page.waitForTimeout(400);
};

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('  →', path.join('docs', name));
};

// 1. Comparativa, métricas absolutas
await goTo(-1);
await annotate('#mode button[data-mode="abs"]', 'Mode: absolute figures');
await shot('comparison-absolute.png');
await clearAnnotations();

// 2. Comparativa, métricas relativas: mismo dato, normalizado por audiencia
await page.click('#mode button[data-mode="rel"]');
await annotate('#mode button[data-mode="rel"]', 'Mode: normalised by audience');
await shot('comparison-relative.png');
await clearAnnotations();

// 3. Vista general de una publicación: tarjetas, suscriptores, fuentes y vistas por post
await page.click('#mode button[data-mode="abs"]');
await goTo(0);
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

// 5. Mapa de suscriptores por país
await page.evaluate(() => { const b = document.querySelector('#detail-close'); if (b) b.click(); });
await page.evaluate(() => {
  const c = document.querySelector('#geo-map').closest('.card');
  window.scrollTo({ top: Math.max(0, c.getBoundingClientRect().top + window.scrollY - 24) });
});
await shot('subscribers-map.png');

// 6. Notas: rendimiento de la parte social de Substack
await goTo(-2);
await page.evaluate(() => window.scrollTo(0, 0));
await shot('notes.png');

await browser.close();
console.log('Capturas listas en docs/ (datos ficticios).');
