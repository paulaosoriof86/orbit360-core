import { transformIndex, validateIndex } from './orbit360-integrar-aseguradoras-p02-index.mjs';

function assert(condition, message) { if (!condition) throw new Error(message); }

const fixture = `<!DOCTYPE html>
<html><body>
<script src="core/backend-lab-loader.js?v=lab"></script>
<script src="core/backend-lab-init.js?v=lab"></script>
<script src="data/store.js?v1"></script>
<script src="data/store-firestore-lab.local.js?v=lab"></script>
<script src="core/legal.js?v1291"></script>
<script src="core/auth.js?v1295-labfix-20260703"></script>
<script src="modules/aseguradoras.js?v1291"></script>
</body></html>`;

const first = transformIndex(fixture);
assert(first.pre.valid, 'El fixture debe pasar preflight');
assert(first.changed, 'La primera transformación debe insertar scripts');
assert(first.post.valid && first.post.integrated, 'El resultado debe quedar integrado y válido');
assert(first.text.includes('core/aseguradoras-sensitive-p02.js?v=p02-20260710'), 'Debe insertar contrato P0.2');
assert(first.text.includes('modules/aseguradoras-p02-sensitive.js?v=p02-20260710'), 'Debe insertar patch P0.2');
assert(first.text.indexOf('core/aseguradoras-sensitive-p02.js') < first.text.indexOf('modules/aseguradoras.js'), 'El contrato debe cargar antes del módulo');
assert(first.text.indexOf('modules/aseguradoras-p02-sensitive.js') > first.text.indexOf('modules/aseguradoras.js'), 'El patch debe cargar después del módulo');
assert(first.text.includes('core/backend-lab-loader.js') && first.text.includes('data/store-firestore-lab.local.js'), 'Debe conservar marcadores backend protegidos');

const second = transformIndex(first.text);
assert(second.post.valid && second.post.integrated, 'La segunda transformación debe seguir válida');
assert(second.changed === false, 'El integrador debe ser idempotente');

const duplicate = first.text.replace('</body>', '  <script src="core/aseguradoras-sensitive-p02.js?v=p02-20260710"></script>\n</body>');
const duplicateValidation = validateIndex(duplicate, { requireIntegrated: true });
assert(!duplicateValidation.valid && duplicateValidation.errors.includes('CORE_TAG_DUPLICADO'), 'Debe bloquear tags duplicados');

const mojibake = fixture.replace('<html>', '<html>\uFFFD');
assert(!validateIndex(mojibake).valid, 'Debe bloquear replacement character de mojibake');

const missingProtected = fixture.replace('<script src="core/backend-lab-loader.js?v=lab"></script>\n', '');
const missingValidation = validateIndex(missingProtected);
assert(!missingValidation.valid && missingValidation.errors.some(error => error.includes('backend-lab-loader.js')), 'Debe bloquear pérdida de marcador protegido');

console.log('OK orbit360-test-integrar-aseguradoras-p02-index');
