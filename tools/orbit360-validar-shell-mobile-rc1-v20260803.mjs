import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cssPath = path.join(root, 'orbit360-platform', 'styles', 'base.css');
const result = {
  ok: false,
  validator: 'orbit360-validar-shell-mobile-rc1-v20260803',
  classification: 'FUNCTIONAL_DEFECT',
  owner: 'Shell/Topbar responsive',
  checks: [],
  errors: []
};

function check(id, condition, detail) {
  result.checks.push({ id, ok: Boolean(condition), detail });
  if (!condition) result.errors.push(id);
}

try {
  const css = fs.readFileSync(cssPath, 'utf8');
  const canonicalStart = css.indexOf('SHELL RESPONSIVE CANÓNICO');
  const canonical = canonicalStart >= 0 ? css.slice(canonicalStart) : '';

  check('css_exists', Boolean(css), 'styles/base.css disponible');
  check('canonical_owner', canonicalStart >= 0, 'fix ubicado en el owner compartido base.css; no bridge por tenant');
  check('mobile_breakpoint', /@media\(max-width:560px\)/.test(canonical), 'breakpoint móvil explícito');
  check('single_height_token', /:root\s*\{--topbar-h:104px\}/.test(canonical), 'una sola fuente de altura móvil');
  check('topbar_height', /\.topbar\s*\{[\s\S]*height:var\(--topbar-h\);[\s\S]*min-height:var\(--topbar-h\)/.test(canonical), 'topbar usa el token canónico');
  check('topbar_wrap', /flex-wrap:wrap/.test(canonical) && /overflow:visible/.test(canonical), 'topbar admite dos filas sin recorte');
  check('search_second_row', /\.tb-search\s*\{[\s\S]*display:flex;[\s\S]*order:99;[\s\S]*flex:0 0 100%/.test(canonical), 'buscador ocupa la segunda fila');
  check('shell_offset', /#shell\s*\{padding-top:var\(--topbar-h\)\}/.test(canonical), 'contenido inicia después del topbar real');
  check('sidebar_offset', /#sidebar\s*\{top:var\(--topbar-h\);height:calc\(100vh - var\(--topbar-h\)\)/.test(canonical), 'menú móvil comparte el mismo offset');
  check('overlay_offset', /\.sb-overlay\s*\{top:var\(--topbar-h\)\}/.test(canonical), 'overlay comparte el mismo offset');
  check('tenant_neutral', !/Alianzas|A&S|alianzas-soluciones/i.test(canonical), 'sin hardcode del primer tenant');
  check('balanced_braces', (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length, 'llaves CSS balanceadas');

  result.ok = result.errors.length === 0;
} catch (error) {
  result.errors.push('validator_exception');
  result.exception = String(error && (error.stack || error.message) || error);
}

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(result.ok ? 0 : 1);
