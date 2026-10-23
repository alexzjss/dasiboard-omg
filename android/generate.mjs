// Gera o projeto Gradle do TWA a partir de android/twa-manifest.json (sem interação, sem rede obrigatória).
// Uso: node generate.mjs <dirSaida> [versionName] [versionCode]
//
// O TwaGenerator baixa os ícones via HTTP(S) (não aceita file://). Para não depender do site já
// estar publicado, servimos ../public em um servidor HTTP local e apontamos iconUrl/maskableIconUrl
// para ele. Os ícones vêm, portanto, do próprio checkout (public/icons/*).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '..', 'public');
const [outArg, versionName, versionCode] = process.argv.slice(2);
if (!outArg) {
  console.error('Uso: node generate.mjs <dirSaida> [versionName] [versionCode]');
  process.exit(2);
}
const outDir = path.resolve(outArg);

const MIME = { '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.resolve(publicDir, '.' + rel);
  if (!file.startsWith(publicDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

try {
  const json = JSON.parse(fs.readFileSync(path.join(here, 'twa-manifest.json'), 'utf8'));
  for (const key of ['iconUrl', 'maskableIconUrl']) {
    if (!json[key]) continue;
    const p = new URL(json[key]).pathname; // ex.: /icons/icon-512.png
    if (!fs.existsSync(path.join(publicDir, p))) throw new Error(`Ícone ausente no repositório: public${p}`);
    json[key] = base + p;
  }
  if (versionName) json.appVersion = versionName;
  if (versionCode) json.appVersionCode = Number(versionCode);

  const manifest = new TwaManifest(json);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  await new TwaGenerator().createTwaProject(outDir, manifest, new ConsoleLog('generate'));
  console.log(`Projeto gerado em ${outDir} (versão ${manifest.appVersionName} / code ${manifest.appVersionCode})`);
} finally {
  server.closeAllConnections?.();
  server.close();
}
process.exit(0);
