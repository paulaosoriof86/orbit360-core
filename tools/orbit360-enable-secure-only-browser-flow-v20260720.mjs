import { readFileSync, writeFileSync } from 'node:fs';

const path = process.argv[2] || 'orbit360-platform/core/insurer-directory-import-v1202.js';
let source = readFileSync(path, 'utf8');

const buttonMarker = 'data-secure-only';
const handlerMarker = "const secureOnly = back.querySelector('[data-secure-only]');";

if (!source.includes(buttonMarker)) {
  const anchor = '<button class="btn ghost" data-close>Cerrar</button></div></div>`;';
  const replacement = '${result && result.securePayloadCount > 0 ? \'<button class="btn primary" data-secure-only>Guardar únicamente accesos seguros</button>\' : \'\'}<button class="btn ghost" data-close>Cerrar</button></div></div>`;';
  if (!source.includes(anchor)) throw new Error('SECURE_ONLY_BUTTON_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, replacement);
}

if (!source.includes(handlerMarker)) {
  const anchor = "    const approve = back.querySelector('[data-approve]');";
  const handler = `    const secureOnly = back.querySelector('[data-secure-only]');
    if (secureOnly) secureOnly.onclick = async () => {
      const reason = clean(await U().prompt('Motivo de la carga segura de accesos:', { title: 'Confirmar accesos seguros' }));
      if (!reason) return;
      const phrase = clean(await U().prompt('Escribe exactamente: ' + CONFIRM_PHRASE, { title: 'Confirmación reforzada' }));
      secureOnly.disabled = true;
      secureOnly.textContent = 'Guardando accesos de forma segura…';
      const applied = await applySecureOnly(result, { approved: true, phrase, reason });
      if (!applied.ok) {
        secureOnly.disabled = false;
        secureOnly.textContent = 'Guardar únicamente accesos seguros';
        return toast('No se aplicó: ' + (applied.errors || []).join(', '));
      }
      const done = uiState && uiState.options && uiState.options.onDone;
      close();
      toast(applied.imported + ' acceso(s) guardados de forma segura. No se modificó el directorio.');
      if (done) done(applied);
      else if (Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.render) Orbit.modules.aseguradoras.render(document.getElementById('host'));
    };
`;
  if (!source.includes(anchor)) throw new Error('SECURE_ONLY_HANDLER_ANCHOR_NOT_FOUND');
  source = source.replace(anchor, handler + anchor);
}

writeFileSync(path, source);

const checks = [
  'data-secure-only',
  handlerMarker,
  'Guardar únicamente accesos seguros',
  'No se modificó el directorio',
  'applySecureOnly(result'
];
for (const check of checks) {
  if (!source.includes(check)) throw new Error('SECURE_ONLY_VALIDATION_FAILED:' + check);
}

const secureOnlyBlock = source.slice(source.indexOf('async function applySecureOnly'), source.indexOf('applySecureOnly.__secureOnlyV20260720'));
if (/S\(\)\.(insert|update)\(['"]aseguradoras['"]/.test(secureOnlyBlock)) {
  throw new Error('SECURE_ONLY_WRITES_DIRECTORY');
}

process.stdout.write('GO_SECURE_ONLY_BROWSER_FLOW\n');
