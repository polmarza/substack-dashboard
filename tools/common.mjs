import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROFILE_DIR = path.join(ROOT, '.profile');
export const DATA_DIR = path.join(ROOT, 'data');

export async function openBrowser({ headless }) {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    channel: 'chrome',
  });
}

// Devuelve el perfil del usuario (con sus publicaciones) o null si no hay sesión.
export async function getProfile(page) {
  await page.goto('https://substack.com/home', { waitUntil: 'domcontentloaded' });
  return page.evaluate(async () => {
    const r = await fetch('/api/v1/user/profile/self', { credentials: 'include' });
    if (r.status !== 200) return null;
    return r.json();
  });
}
