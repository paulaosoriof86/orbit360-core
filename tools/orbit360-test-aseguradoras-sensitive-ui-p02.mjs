import fs from 'node:fs';

const file = 'orbit360-platform/modules/aseguradoras-p02-sensitive.js';
const code = fs.readFileSync(file, 'utf8');

function assert(condition, message) { if (!condition) throw new Error(message); }

assert(code.includes('requestCredential'), 'El patch debe consultar credenciales por el contrato seguro');
assert(code.includes('requestAccountNumber'), 'El patch debe consultar cuentas por el contrato seguro');
assert(code.includes('copySensitive'), 'El patch debe auditar las copias');
assert(code.includes('👁 Mostrar'), 'Debe ofrecer Mostrar bajo demanda');
assert(code.includes('⧉ Usuario') && code.includes('⧉ Clave'), 'Debe ofrecer copia separada de usuario y clave');
assert(code.includes('Acceso restringido por rol'), 'Debe representar el bloqueo por rol');
assert(code.includes('Conexión segura pendiente') || code.includes('Credencial no disponible'), 'Debe mantener estado honesto sin backend');
assert(!code.includes('localStorage'), 'El patch no debe persistir en localStorage');
assert(!code.includes('sessionStorage'), 'El patch no debe persistir en sessionStorage');
assert(!/store\.insert\([^\n]*password/i.test(code), 'No debe insertar contraseñas en el store');
assert(!/store\.update\([^\n]*(password|pass|contras)/i.test(code), 'No debe actualizar contraseñas en el store');
assert(code.includes('30000'), 'El revelado debe ser temporal');

console.log('OK orbit360-test-aseguradoras-sensitive-ui-p02');
