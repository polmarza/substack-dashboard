// Genera y carga un LaunchAgent para que el servidor del panel arranque al iniciar sesión en macOS.
// Uso:  npm run install-service     |  desinstalar:  npm run uninstall-service
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './common.mjs';

const LABEL = 'com.substack-panel';
const PORT = process.env.PORT || '8787';
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
const uninstall = process.argv.includes('--uninstall');

if (os.platform() !== 'darwin') {
  console.error('Esto solo aplica a macOS. En otros sistemas usa systemd, pm2 o similar.');
  process.exit(1);
}

if (uninstall) {
  try { execFileSync('launchctl', ['unload', plistPath], { stdio: 'ignore' }); } catch {}
  fs.rmSync(plistPath, { force: true });
  console.log(`Servicio eliminado: ${plistPath}`);
  process.exit(0);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${esc(process.execPath)}</string>
    <string>--no-warnings</string>
    <string>${esc(path.join(ROOT, 'tools', 'server.mjs'))}</string>
    <string>${PORT}</string>
  </array>
  <key>WorkingDirectory</key><string>${esc(ROOT)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/${LABEL}.log</string>
  <key>StandardErrorPath</key><string>/tmp/${LABEL}.err</string>
</dict>
</plist>
`;
fs.mkdirSync(path.dirname(plistPath), { recursive: true });
fs.writeFileSync(plistPath, plist);
try { execFileSync('launchctl', ['unload', plistPath], { stdio: 'ignore' }); } catch {}
execFileSync('launchctl', ['load', plistPath]);
console.log(`Servicio instalado: ${plistPath}\nEl panel arrancará solo en http://127.0.0.1:${PORT}/`);
