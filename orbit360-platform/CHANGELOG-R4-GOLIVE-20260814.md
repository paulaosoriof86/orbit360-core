# CHANGELOG R4 GO-LIVE · 2026-08-14 / 2026-08-15

## R4 prepublish · 2026-08-14

Autorización recibida para backup/rollback, publicación en `app.aysseguros.com` y E2E productivo usando únicamente el paquete R3 certificado.

### Package integrity

- ZIP: `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256: `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- source head: `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`;
- rebuild: no.

## Publicación manual · 2026-08-15

Paula cargó y extrajo el paquete exacto en `/home/ayssegur/public_html/app.aysseguros.com`. `https://app.aysseguros.com` mostró el login y el manifest publicado coincidió con R3, fileCount 194.

## R4 browser frontier #1

Run `31903805595`, job `95058471779`: pre-browser PASS; browser cancelado por timeout.

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

## Rootfix bounded observability

Rootfix `442ca5fc5a6ca6f70e7607daaa108ee0b84d8956`.

Run `31907519696`, job `95067552998`: SUCCESS source-only; gate/watchdog/evidencia incremental PASS, global deadline 480000 ms, secrets/browser/data skipped, writes 0.

## R4 browser frontier #2 · diagnóstico posteriormente superado

Run `31907938110`, job `95068560384`.

PASS antes del fallo: gate, identidad protegida, resolver read-only, 1 actor elegible, roles requeridos, target 200, login visible, manifest R3 exacto, writes 0.

El smoke pidió `/core/auth.js` y recibió HTTP 500. En ese momento se clasificó como `ENVIRONMENT_FAILURE / R4_PUBLISHED_AUTH_ASSET_MISMATCH`.

**Estado posterior:** este diagnóstico queda SUPERADO por `VALIDATOR_STALE`, porque el ZIP R3 productivo certificado no contiene `/core/auth.js`; usa `core/auth-product-runtime-p0.js`.

## HTTP-only #1 / #2 y cPanel · evidencia histórica, no blocker vigente

Se ejecutaron dos diagnósticos HTTP y se revisó cPanel/Imunify360. Esas pruebas mostraron respuestas Apache/edge sobre rutas que luego se demostró que no pertenecen al contrato productivo del R3 o que estaban siendo interceptadas por la capa de protección de sondas automatizadas.

Conclusión corregida: no usar estas pruebas como evidencia de fallo de Auth ni como razón para escalar a HostDime. HostDime deja de ser blocker vigente.

## Verificación del artefacto durable R3 · causa de VALIDATOR_STALE

Se recuperó el artefacto durable original del run `31836094541`, artifact `9232555925`.

Contrato real del paquete:

- ZIP SHA256 `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- fileCount 194;
- `index.html`: 16893 bytes, SHA256 `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4e`;
- `core/auth-product-runtime-p0.js`: 4211 bytes, SHA256 `d0bb399fe0e1dd102a03950673044eda5bc8d181e4e98cf477d22d141aa7b3a8`;
- `core/auth.js`: ausente deliberadamente;
- `core/auth-password-change-v20260805.js`: ausente deliberadamente;
- `core/user-credential-selfservice-v20260805.js`: ausente deliberadamente;
- `noLabRuntime=true`.

El navegador público sirvió el `index.html` con exactamente los mismos 16893 bytes y SHA256 del R3 certificado.

## Rootfix del contrato productivo del smoke

Se incorporaron:

- `tools/orbit360-r4-certified-product-contract-v20260815.json`;
- `tools/orbit360-r4-certified-product-smoke-wrapper-v20260815.mjs`;
- `.github/workflows/orbit360-r4-certified-product-readonly-smoke-v20260815.yml`.

Rootfix `ecf32a1bcfd44930c21d9486521d9350e7b29710`.

Run source-only `31913262279`, job `95081379432`: PASS; auth productivo correcto ligado al contrato, browser/secrets skipped.

Primer runtime del wrapper falló por resolución de Playwright desde `/tmp`: `PIPELINE_MECHANISM_FAILURE / R4_WRAPPER_TEMP_MODULE_RESOLUTION`. Se refrozenó y se corrigió el wrapper para ejecutar desde el workspace; source-only `31913408750`, job `95081724782`: PASS.

## Auth productivo certificado · PASS

Run `31913440282`, job `95081796256`, artifact `9254297455`, digest `sha256:e15e4291dc4a4b69f686876b7b684070a7fbf3c8a3e72a62debc24780bb6f8f9`.

PASS:

- manifest R3 exacto;
- `auth-product-runtime-p0.js` HTTP 200 + SHA exacto;
- login HTTP 200;
- signedIn true;
- emailVerified true;
- membership available/active;
- tenant correcto;
- 5 roles, roles requeridos presentes;
- runtime/router/tenant-context iniciados;
- store `ready-read-only`, writes disabled;
- required missing=0 / failed=0;
- cero page/console/http/write errors;
- cero Firestore/Auth/operational writes.

Por tanto, contraseña/Auth/membership/tenant dejan de ser blockers.

## Legal gate del smoke · rootfix read-only

El smoke antiguo hacía tres `locator.count()` separados y luego aceptaba el acuerdo, lo que podía persistir `localStorage`. `core/legal.js` crea gate/checkbox/botón de forma síncrona.

Wrapper rootfix `33be633ce2cd224dd439b18667883107e02a7f0e`: una sola observación DOM; no acepta ni persiste el gate. Source-only run `31913599070`, job `95082162945`: PASS.

## Datos productivos privilegiados · PASS

Run `31913640208`, job `95082253916`, artifact `9254361388`, digest `sha256:5cfd0f7c898369cd18e5076ccadda1411a493abc25dca0836ec897532d73144a`.

PASS antes del siguiente bloqueo:

- legal observado read-only;
- snapshot privilegiado;
- **430 clientes**;
- **30 aseguradoras**;
- tenant/store read-only;
- Dirección/inicio;
- writes 0.

El siguiente fallo fue timeout del grupo Dirección antes de completar las rutas.

## Timing causal del rol Dirección

Probe V2 run `31914094501`, job `95083352658`, artifact `9254467374`, digest `sha256:6c806cab2c93d3c17e67ac8fc4b1efe3b82a3ae44fa264b46ec765077f613fe0`.

Medición:

- `Orbit.session.set('Dirección')`: 5918.2 ms;
- `orbit:session`: 5917.9 ms;
- `hashchange`: ~0.1 ms;
- `Inicio.render`: no fue la causa;
- `Orbit.access.filter('clientes', 430, 'cliente360')`: **38271.7 ms**;
- resultado: 430/430, scope `all`;
- cero errores y cero writes.

Clasificación:

`FUNCTIONAL_DEFECT / R4_ACCESS_SCOPE_FILTER_PERFORMANCE_BLOCK`

## Causa raíz de access.filter

`filter()` llamaba `canView()` por cada registro. Cada iteración recomputaba rol, módulo, países, scope y actor/asesor. `actorAdvisor()` llama `store.get('asesores', id)`; en el store productivo read-only, `get()` usa `all()`, y `all()` clona la colección antes de buscar.

Para 430 clientes Dirección=`all`, la regresión reprodujo **1720 `store.get()` / 1720 clones** antes de devolver los mismos 430 registros.

## Fast-path reusable de acceso · aplicado en source

Regresión source-only run `31914352570`, job `95083946747`, artifact `9254514939`, digest `sha256:40d5227a2350f47d3facbd63e268e05fd6120ec45a56ef3a2184e132e9426b77`.

Equivalencia PASS en:

- Dirección scope all;
- Dirección con país GT;
- Asesor own;
- Operativo team;
- módulo denegado;
- colección sensible non-admin.

Dirección 430:

- baseline count 430;
- candidato count 430;
- `store.get()` **1720 -> 4**;
- reducción 430×.

Commit funcional aplicado mediante Contents API CAS:

`df4c217c34722c03215f88b62f6865ab41c2a9f3` — `fix: bound access filter invariant context once`.

Ese commit cambia únicamente `orbit360-platform/core/access-scope.js`. `canView()`, `canAccessRecord()` y API pública permanecen intactos.

## Post-aplicación · PASS

Run `31914479350`, job `95084243046`, artifact `9254545415`, digest `sha256:768b8770da3f798c93b1c2331a713a81aa7670aba6808c81205cbab4e869e0e0`.

- materialized source = candidato esperado desde R3;
- syntax PASS;
- Dirección 430 -> 430;
- `store.get()` 1720 -> 4;
- Asesor own 144;
- Operativo team 287;
- browser/secrets/data/deploy/rebuild false.

Clasificación de cierre source:

`FUNCTIONAL_DEFECT_ROOTFIX_APPLIED_SOURCE_PASS`

## Estado y siguiente acción

El browser R4 permanece congelado source-only. El ZIP R3 que está publicado sigue intacto y **no contiene este fix**.

No se altera el R3 publicado en sitio. El siguiente bloque requiere autorización explícita para generar una **sucesora mínima e inmutable** del R3 cuyo único delta de producto sea `orbit360-platform/core/access-scope.js` desde `df4c217c34722c03215f88b62f6865ab41c2a9f3`; todos los demás archivos deben ser byte-idénticos al R3 y el nuevo manifest debe certificarse antes de cualquier publicación.

Avance permanece 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
