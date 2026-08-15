# CIERRE R4 · VALIDATOR_STALE → AUTH PASS → ACCESS FILTER ROOTFIX SOURCE PASS

Fecha: 2026-08-15  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open · sin merge  
Producción publicada: `https://app.aysseguros.com`

## 1. Corrección del diagnóstico

El supuesto bloqueo de HostDime/Apache sobre `core/auth.js` queda **superado**.

Se recuperó el artefacto durable original R3 del run `31836094541`, artifact `9232555925`, y se comprobó el contrato real del ZIP certificado:

- ZIP SHA256 `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- fileCount 194;
- `index.html` 16893 bytes, SHA256 `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4e`;
- auth productivo `core/auth-product-runtime-p0.js`, 4211 bytes, SHA256 `d0bb399fe0e1dd102a03950673044eda5bc8d181e4e98cf477d22d141aa7b3a8`;
- `core/auth.js` no pertenece al paquete productivo;
- `core/auth-password-change-v20260805.js` no pertenece al paquete productivo;
- `core/user-credential-selfservice-v20260805.js` no pertenece al paquete productivo;
- `noLabRuntime=true`.

El `index.html` público coincide byte a byte con el entrypoint R3. Por tanto, el smoke anterior mezclaba contrato LAB con artefacto productivo.

Clasificación correcta:

`VALIDATOR_STALE`

## 2. Rootfix del smoke productivo

Se añadieron contrato/wrapper/workflow ligados al paquete real.

Rootfix: `ecf32a1bcfd44930c21d9486521d9350e7b29710`.

Source-only run `31913262279`, job `95081379432`: PASS.

Un primer runtime del wrapper falló por resolver Playwright desde `/tmp`; se clasificó como `PIPELINE_MECHANISM_FAILURE` y se corrigió para ejecutar desde `tools/` dentro del workspace. Source-only run `31913408750`, job `95081724782`: PASS.

## 3. Auth/runtime productivo · PASS

Run `31913440282`, job `95081796256`, artifact `9254297455`.

Demostrado:

- manifest R3 exacto;
- auth productivo HTTP 200 + hash exacto;
- login HTTP 200;
- signedIn;
- emailVerified;
- membership disponible y activa;
- tenant correcto;
- roles requeridos presentes;
- runtime/router/tenant-context iniciados;
- store `ready-read-only`;
- write disabled;
- required missing/failed = 0;
- cero escrituras.

Auth, contraseña, membership y HostDime dejan de ser blockers.

## 4. Legal gate del smoke

El harness fue corregido para observar el gate legal sin aceptarlo ni persistir `localStorage`.

Rootfix `33be633ce2cd224dd439b18667883107e02a7f0e`. Source-only run `31913599070`, job `95082162945`: PASS.

## 5. Datos productivos · PASS

Run `31913640208`, job `95082253916`, artifact `9254361388`:

- 430 clientes;
- 30 aseguradoras;
- snapshot privilegiado PASS;
- Dirección/inicio PASS;
- tenant/store read-only PASS;
- cero writes.

El siguiente timeout ocurrió dentro del grupo Dirección.

## 6. Timing causal

Probe V2 `31914094501`, job `95083352658`, artifact `9254467374`.

- `session.set('Dirección')` 5918.2 ms;
- `orbit:session` 5917.9 ms;
- `hashchange` ~0.1 ms;
- `Inicio.render` no fue causa;
- `Orbit.access.filter('clientes', 430, 'cliente360')` 38271.7 ms;
- salida 430/430, scope `all`;
- cero errors/writes.

Clasificación:

`FUNCTIONAL_DEFECT / R4_ACCESS_SCOPE_FILTER_PERFORMANCE_BLOCK`

## 7. Causa raíz

`Orbit.access.filter()` llamaba `canView()` por registro. Ese camino repetía resolución de rol/módulo/país/scope/actor. `actorAdvisor()` usa `store.get('asesores', id)` y el store productivo implementa `get()` sobre `all()`, que clona la colección antes de buscar.

Regresión sintética equivalente sobre 430 clientes Dirección=`all`:

- baseline: 1720 llamadas `store.get()`;
- fast-path: 4 llamadas;
- resultado: 430 antes / 430 después;
- reducción: 430×.

## 8. Rootfix reusable aplicado

Commit funcional:

`df4c217c34722c03215f88b62f6865ab41c2a9f3`

Único archivo funcional cambiado:

`orbit360-platform/core/access-scope.js`

El nuevo `filter()` resuelve una vez el contexto invariante y usa fast-path para `scope=all`; para `own`/`team` precalcula owner/equipo una sola vez. `canView()`, `canAccessRecord()` y la API pública permanecen sin cambios.

Regresión source-only `31914352570`, job `95083946747`: PASS en Dirección all, Dirección país GT, Asesor own, Operativo team, módulo denegado y colección sensible.

## 9. Post-aplicación · PASS

Run `31914479350`, job `95084243046`, artifact `9254545415`, digest `sha256:768b8770da3f798c93b1c2331a713a81aa7670aba6808c81205cbab4e869e0e0`.

- source materializado = candidato esperado desde baseline R3;
- syntax PASS;
- Dirección: 430/430;
- `store.get`: 1720→4;
- Asesor own: 144;
- Operativo team: 287;
- cero browser/secrets/data/deploy/rebuild.

Clasificación:

`FUNCTIONAL_DEFECT_ROOTFIX_APPLIED_SOURCE_PASS`

## 10. Estado de producción y siguiente gate

El ZIP R3 publicado sigue intacto y no contiene el rootfix. El browser R4 está congelado source-only.

No se parchea el R3 publicado en sitio porque rompería su inmutabilidad/manifiesto.

La siguiente acción requiere autorización explícita para generar una sucesora mínima e inmutable de R3 cuyo único delta de producto sea `core/access-scope.js` desde `df4c217c34722c03215f88b62f6865ab41c2a9f3`.

Antes de publicación, la sucesora debe demostrar:

- todos los demás archivos byte-idénticos a R3;
- manifest y SHA nuevos;
- fileCount esperado;
- no LAB runtime;
- no secretos;
- gates source/static PASS.

Publicación y browser final requieren autorización posterior/expresa. No main, merge ni reimportación.

Avance certificado permanece: **100% funcional / 75% técnico / 67% gates** hasta `POST_GO_LIVE_SMOKE_PASS`.
