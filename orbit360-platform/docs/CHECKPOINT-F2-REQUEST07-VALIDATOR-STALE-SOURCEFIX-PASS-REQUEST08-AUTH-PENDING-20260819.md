# CHECKPOINT F2 — Request07 consumido · VALIDATOR_STALE corregido · Request08 requiere autorización fresca

Fecha: 2026-08-19  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único F2: `f2-productive-acceptance-exact-successor-v20260818`

## Estado canónico

F1 permanece `CLOSED_PASS`.

F2 SOURCE sucesor permanece `CLOSED_PASS` sobre la candidata exacta:
- artifact: `9385306424`;
- source: `b94b2ae86d26586a68d33be9edba8715e956b02e`;
- ZIP SHA256: `81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4`;
- manifest SHA256: `cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef`;
- 194 archivos;
- delta de producto certificado: `core/queries.js`.

## Request07 — consumido una sola vez

Request07 fue creado y ejecutado exactamente una vez:
- request commit: `696b3700687f758fdd9c629a2268caa857aa377a`;
- run: `32311320804`;
- job: `96254728198`;
- evidence artifact: `9386546905`;
- replay: prohibido;
- Request08: no creado.

Pasaron antes del stop:
- request inmutable y boundary SOURCE;
- gate canónico: `GO_F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY`;
- descarga y rehash de la candidata exacta;
- provider autorizado;
- identidad protegida read-only;
- snapshot de integridad previo;
- snapshot posterior y comparación de integridad.

Integridad Request07:
- counts before/after: idénticos;
- digests before/after: idénticos;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- deploy/publicación/producción: 0.

## Clasificación de causa raíz

El browser runner se detuvo antes de activar el runtime funcional con:
`F2_BROWSER_MANIFEST_IDENTITY_MISMATCH`.

Aunque la salida original lo clasificó como `DATA_CONTRACT_FAILURE`, la causa raíz demostrada es:

`VALIDATOR_STALE:F2_BROWSER_MANIFEST_IDENTITY_EXPECTATION_BOUND_TO_PREDECESSOR`

El runner y su self-test todavía esperaban la candidata histórica `9345207863 / 29caae...`, mientras el workflow había descargado y verificado correctamente `9385306424 / b94b2ae...`.

Por ello Request07 no demuestra un defecto funcional ni un fallo de datos de la candidata sucesora. El producto queda congelado.

## Corrección del owner/validador

Se corrigieron juntos los owners acoplados:
- `tools/orbit360-f2-productive-acceptance-runtime-browser-readonly-v20260818.mjs` — commit `280822a1b0f820dd91dfda678a20632c8bcc0ad8`;
- `tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs` — commit `0f5b287b6faec3eccd1bccbd541a04a6dc73fd1a`.

Ambos resuelven ahora artifact/source/manifest desde el Request inmutable y eliminan el acoplamiento a la candidata predecesora.

El source-check inerte cerró PASS:
- trigger commit: `e080059a3d7c50e2024a47b4f52d1c7da3cc9633`;
- evidence commit: `1b9344944f3691ac40eb7face6d33c7034e0dd37`;
- status: `F2_REQUEST07_VALIDATOR_STALE_SOURCEFIX_PASS`;
- evidence: `orbit360-platform/runtime-gate-crm-v20260716/f2-request07-validator-stale-sourcefix-check-v20260819.json`;
- browser/runtime/secrets/Firestore read/writes/deploy/producción: 0.

## Carriles

- A — frontend/producto/UX: `FROZEN_ROOTFIX_CERTIFIED_SOURCE_CLOSED_PASS`.
- B — backend/security/gates: `REQUEST07_CONSUMED_VALIDATOR_STALE_SOURCEFIX_PASS_REQUEST08_FRESH_AUTH_PENDING`.
- C — datos reales A&S: `UNTOUCHED_ZERO_CHANGES`.

## Progreso

Ruta inmediata a producción: `50%` mientras F2 runtime/browser no cierre PASS.  
Al cierre terminal PASS de F2: `80%`.  
F3 go-live controlado: `20%` final y autorización independiente.

Programa integral: `25%` según el método vigente de fases cerradas.

## Reuso / Academia

Clasificación reusable: `REPLICABLE_CLAUDE_INMEDIATO` + `ACADEMIA_ACTUALIZAR`.

Patrones a preservar:
1. El scope del observer es read-only y cero-runtime aunque el target observado use browser/runtime/secrets autorizados.
2. La identidad de candidata en runners/self-tests debe provenir del Request inmutable; no hardcodear artifact/source históricos.
3. Un mismatch causado por expectativa obsoleta del validador es `VALIDATOR_STALE`, no debe convertirse en reimportación ni corrección del producto.
4. Request consumido no se reejecuta; después de corregir el validador se requiere autorización humana fresca para un request nuevo.

## Frontera exacta siguiente

No reejecutar Request07. No crear Request08 sin autorización fresca.

Siguiente autorización requerida:

`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST08 / EXACT_ARTIFACT_9385306424`

Continúan prohibidos en esa autorización: Firestore/Auth/membership/data/operational writes, password reset, reimportación, rebuild de candidata, deploy, publicación, producción, main y merge.
