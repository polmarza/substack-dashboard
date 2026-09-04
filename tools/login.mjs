// Abre un Chromium con perfil persistente para que inicies sesión en Substack UNA vez.
// Uso: npm run login
import { openBrowser, getProfile } from './common.mjs';

const ctx = await openBrowser({ headless: false });
const page = ctx.pages()[0] ?? (await ctx.newPage());

let profile = await getProfile(page);
if (profile) {
  console.log(`Ya hay sesión iniciada como @${profile.handle}. Nada que hacer.`);
} else {
  await page.goto('https://substack.com/sign-in', { waitUntil: 'domcontentloaded' });
  console.log('Inicia sesión en la ventana que se ha abierto. Espero hasta 10 minutos...');
  const deadline = Date.now() + 10 * 60 * 1000;
  while (!profile && Date.now() < deadline) {
    await page.waitForTimeout(3000);
    try {
      profile = await page.evaluate(async () => {
        const r = await fetch('https://substack.com/api/v1/user/profile/self', { credentials: 'include' });
        return r.status === 200 ? r.json() : null;
      });
    } catch { /* navegación en curso */ }
  }
  if (profile) console.log(`Sesión iniciada como @${profile.handle}. Ya puedes ejecutar: npm run sync`);
  else console.log('No se detectó la sesión a tiempo. Vuelve a ejecutar npm run login.');
}
await ctx.close();
