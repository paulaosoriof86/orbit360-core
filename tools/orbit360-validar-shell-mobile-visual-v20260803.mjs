import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const css = [
  'orbit360-platform/styles/tokens.css',
  'orbit360-platform/styles/base.css',
  'orbit360-platform/styles/infra.css'
].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

const outputDir = path.join(root, 'artifacts', 'shell-mobile-rc1');
fs.mkdirSync(outputDir, { recursive: true });

const cases = [
  { route: 'cliente360', icon: '👥', title: 'Cliente 360', crumb: 'CRM · Base de asegurados' },
  { route: 'polizas', icon: '📄', title: 'Pólizas', crumb: 'CRM · Gestión de pólizas' },
  { route: 'leads', icon: '🎯', title: 'Leads', crumb: 'Comercial · Oportunidades' }
];

const results = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
    <header class="topbar">
      <button class="tb-burger" aria-label="Menú">☰</button>
      <div class="brand"><span class="brand-mark"></span><span class="brand-text"><span class="brand-name">Orbit<b>360</b></span><span class="brand-sub">Insurance OS</span></span></div>
      <div class="tb-spacer"></div>
      <div class="tb-switch"><span>🌎</span><select><option>Guatemala</option></select></div>
      <div class="tb-ico"><span>🔔</span></div>
      <div class="tb-user"><span class="av">AS</span></div>
      <div class="tb-search"><span>🔍</span><input placeholder="Buscar clientes, pólizas, cobros…"></div>
    </header>
    <div id="shell"><nav id="sidebar"></nav><div class="sb-overlay"></div><main id="main"><div id="host"></div></main></div>
  </body></html>`, { waitUntil: 'domcontentloaded' });

  for (const item of cases) {
    await page.locator('#host').evaluate((host, current) => {
      host.innerHTML = `<div class="page"><div class="mod-band"><div class="mb-left"><div class="mb-ico">${current.icon}</div><div class="mb-tt"><h2>${current.title}</h2><div class="mb-crumb">${current.crumb}</div></div></div></div><div class="card pad">Contenido de validación del shell compartido.</div></div>`;
      document.body.dataset.route = current.route;
    }, item);

    const metrics = await page.evaluate(() => {
      const topbar = document.querySelector('.topbar').getBoundingClientRect();
      const search = document.querySelector('.tb-search');
      const band = document.querySelector('.mod-band').getBoundingClientRect();
      const shellStyle = getComputedStyle(document.querySelector('#shell'));
      const sidebarStyle = getComputedStyle(document.querySelector('#sidebar'));
      const overlayStyle = getComputedStyle(document.querySelector('.sb-overlay'));
      return {
        topbarTop: topbar.top,
        topbarBottom: topbar.bottom,
        topbarHeight: topbar.height,
        searchDisplay: getComputedStyle(search).display,
        bandTop: band.top,
        shellPaddingTop: Number.parseFloat(shellStyle.paddingTop || '0'),
        sidebarTop: Number.parseFloat(sidebarStyle.top || '0'),
        overlayTop: Number.parseFloat(overlayStyle.top || '0'),
        clear: band.top >= topbar.bottom
      };
    });

    const ok = metrics.clear &&
      metrics.topbarHeight >= 103 &&
      metrics.searchDisplay === 'flex' &&
      metrics.shellPaddingTop >= metrics.topbarHeight &&
      metrics.sidebarTop >= metrics.topbarHeight &&
      metrics.overlayTop >= metrics.topbarHeight;
    results.push({ ...item, ok, metrics });
    await page.screenshot({ path: path.join(outputDir, `mobile-${item.route}.png`), fullPage: false });
  }
} finally {
  await browser.close();
}

const report = {
  ok: results.every(item => item.ok),
  validator: 'orbit360-validar-shell-mobile-visual-v20260803',
  viewport: '390x844',
  backend: 'not_used',
  secrets: 'not_used',
  writes: 0,
  deploy: false,
  results
};
fs.writeFileSync(path.join(outputDir, 'shell-mobile-visual.json'), JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(report.ok ? 0 : 1);
