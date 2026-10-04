// Tylko dla `npm start` na macOS: lokalny Electron.app (node_modules) przedstawia się jako „Upright” z naszą ikoną,
// zamiast „Electron” w powiadomieniach, pytaniach o kamerę i Monitorze aktywności. Nic w repo się nie zmienia;
// po `npm install` skrypt po prostu zrobi to ponownie. Zbudowana aplikacja (npm run dist:mac) ma to z electron-buildera.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

if (process.platform !== 'darwin') process.exit(0);
const app = path.resolve('node_modules/electron/dist/Electron.app');
const plist = path.join(app, 'Contents/Info.plist');
if (!existsSync(plist)) process.exit(0);
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'ignore' });
try {
  for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
    try { run('plutil', ['-replace', key, '-string', 'Upright', plist]); } catch { run('plutil', ['-insert', key, '-string', 'Upright', plist]); }
  }
  // Ikona: .icns z assets/icon.png (sips + iconutil są w każdym macOS).
  const tmp = path.join(os.tmpdir(), 'upright.iconset');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp);
  for (const s of [16, 32, 128, 256, 512]) {
    run('sips', ['-z', String(s), String(s), 'assets/icon.png', '--out', path.join(tmp, `icon_${s}x${s}.png`)]);
    run('sips', ['-z', String(s * 2), String(s * 2), 'assets/icon.png', '--out', path.join(tmp, `icon_${s}x${s}@2x.png`)]);
  }
  run('iconutil', ['-c', 'icns', tmp, '-o', path.join(app, 'Contents/Resources/electron.icns')]);
  rmSync(tmp, { recursive: true, force: true });
  // Zmiana Info.plist unieważnia podpis – podpisujemy lokalnie od nowa (ad-hoc), inaczej Apple Silicon nie uruchomi aplikacji.
  run('codesign', ['--force', '--deep', '--sign', '-', app]);
  run('touch', [app]); // macOS odświeża nazwę i ikonę
} catch (e) {
  console.warn('[dev-brand] pominięto:', e.message);
}
