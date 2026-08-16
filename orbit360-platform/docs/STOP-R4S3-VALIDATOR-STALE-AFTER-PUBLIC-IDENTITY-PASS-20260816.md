# STOP R4S3 · Public identity PASS · validator stale before browser

Fecha: 2026-08-16  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge a main

## R4S3 publicada e identidad exacta confirmada

Paquete: `orbit360-fase-a-product-r4s3-294ed22bdb56.zip`  
SHA256: `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`  
Source: `294ed22bdb564585b71fc59cefa1d04cdfa6b120`  
Archivos: 194  
Delta único: `core/access-scope.js`  
SHA256 público `core/access-scope.js`: `624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f`.

Verificación pública exacta: run `31960492114`, job `95197609260`, artifact `9267096364`, digest `sha256:eb7d4de014b16f204540b2caaf2f748976baff19c3548759823d35b20745d0b9` → PASS. Gate canónico antes y después PASS. Sin browser, secretos, datos ni writes.

## STOP previo a matriz

Se inició únicamente la preparación source-only del harness refrozenado. Run `31960626429`, job `95197948801`, artifact `9267131403`, digest `sha256:218df1c34a7d008a1569db3a7c0ae2eae17ff54d203e5fe2429ee311cb3230e6`.

Pasaron:
- gate canónico;
- sintaxis del harness/wrapper;
- self-test del wrapper certificado (`R4_CERTIFIED_VALIDATOR_ROOTFIX_SOURCE_PASS`).

Falló antes de browser:
- etapa `Validate team-own scoped relational access regression source-only`;
- error exacto `FILTER_PATCH_FAILED`;
- archivo owner `tools/orbit360-r4-team-scope-relational-index-regression-v20260816.mjs`;
- clasificación `VALIDATOR_STALE / TEAM_SCOPE_REGRESSION_NOT_IDEMPOTENT_AFTER_ROOTFIX_APPLIED`.

Causa raíz: la regresión versionada fue diseñada para recibir el source R4S2 previo al rootfix y aplicar un candidato temporal. R4S3 ya contiene exactamente ese rootfix. `patchSource()` intenta volver a aplicar el patrón histórico; como el source ya está corregido, `patched === source` y la regresión lanza `FILTER_PATCH_FAILED` en lugar de validar directamente el estado ya aplicado.

Esto no constituye un fallo del producto R4S3. La identidad pública R4S3 ya fue verificada byte a byte. Tampoco se obtuvo evidencia nueva de Auth/runtime porque esas etapas no fueron alcanzadas.

## Seguridad y consumo de frontera

- browser ejecutado: no;
- secretos leídos: no;
- identidad protegida resuelta: no;
- runtime ejecutado: no;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- segunda ejecución automática: no;
- matriz final autorizada consumida: no;
- workflow permanece `ORBIT360_R4_CERTIFIED_SOURCE_ONLY=true`.

## Siguiente acción exacta

STOP. No reintentar ni ejecutar browser.

Con nueva autorización explícita de continuidad únicamente: hacer la regresión versionada current-state-aware/idempotente para que reconozca el rootfix R4S3 ya aplicado y valide su semántica/rendimiento sin intentar parchearlo otra vez; ejecutar gate canónico + una sola regresión source-only. Solo con PASS se puede activar la única matriz productiva final read-only todavía no consumida.

Sin reimportación, cambios Auth/datos, main ni merge.
