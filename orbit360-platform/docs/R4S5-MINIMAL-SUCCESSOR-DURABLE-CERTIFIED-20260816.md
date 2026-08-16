# Orbit 360 A&S — R4S5 mínima durable certificada — 2026-08-16

## Estado

`R4S5_MINIMAL_SUCCESSOR_DURABLE_CERTIFIED` — **SUCCESS**.

Este checkpoint certifica exclusivamente construcción durable, manifest, comparación R4S4→R4S5 y contratos source/package/static. **No publica R4S5** y no ejecuta HostDime, deploy, browser, runtime, Auth ni acceso a datos reales.

## Baseline y autorización

- Repo: `paulaosoriof86/orbit360-core`.
- Rama: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin merge a `main`.
- Base durable exacta: `orbit360-fase-a-product-r4s4-54f671e64b32.zip`.
- SHA256 R4S4: `f266815e26da04a8c9e86b0db9414ca6c06bedb3cd9371f85e96c8d08e420d4c`.
- Artifact durable R4S4: `9268128540`.
- Source R4S4: `54f671e64b32c7b39100d79e770572a579e79ac7`.
- Rootfix source autorizado: commit `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`.
- Owner autorizado: `core/client-insurer-visual-contract-v20260720.js`.
- SHA256 owner autorizado: `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`.

## Mecanismo

Se reutilizó el patrón de certificación durable de R4S4, evitando construir desde el árbol vivo de la rama:

1. gate canónico source-only;
2. re-prueba del rootfix 430/1375/1900;
3. validación de que `5474a1a9…` contiene un único delta de producto y es el owner autorizado;
4. recuperación del artefacto durable R4S4 exacto;
5. verificación de SHA256 R4S4 y de sus 194 archivos contra manifest;
6. sustitución de un único archivo por el blob rootfix autorizado;
7. reconstrucción determinística del ZIP;
8. descompresión y revalidación independiente del ZIP reconstruido;
9. comparación física y por hash R4S4→R4S5;
10. gate canónico posterior.

El navegador permaneció refrozen y el workflow R4 certificado conservó `ORBIT360_R4_CERTIFIED_SOURCE_ONLY='true'`.

## Certificación

Workflow:
`.github/workflows/orbit360-r4s5-minimal-successor-certify-v20260816.yml`

Constructor:
`tools/orbit360-r4s5-minimal-successor-package-v20260816.mjs`

Run:
- run `31972737482`
- job `95227578912`
- conclusión: `SUCCESS`

R4S5 durable:
- ZIP: `orbit360-fase-a-product-r4s5-5474a1a9af64.zip`
- SHA256 ZIP: `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`
- manifest status: `FASE_A_PRODUCT_R4S5_MINIMAL_SUCCESSOR_CERTIFIED`
- sourceHead/deltaSourceHead: `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`
- baseSourceHead: `54f671e64b32c7b39100d79e770572a579e79ac7`
- archivos de producto: 194
- archivos byte/hash idénticos a R4S4: 193
- archivos de producto modificados: 1
- delta único: `core/client-insurer-visual-contract-v20260720.js`
- owner R4S4 SHA256 previo: `fd597c7dae108070cfb96e169a87aabaf75a57ffcb347532863f2d88631bace0`
- owner R4S5 SHA256: `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`
- `core/queries.js` conserva SHA256 R4S4: `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

Artefactos:
- durable: `9270227820`
- digest del wrapper durable: `9adc9d53c1e1a1d2a2eb15223d63feadb849ac3f2abed0638dcf57b83a1852f4`
- evidencia: `9270227636`
- digest evidencia: `5aa4edb9606b01eaa0fc40ff3ec117a715be10876d876ebb5e23eae38c2ed763`

## Source re-proof

Antes de empaquetar se volvió a ejecutar el gate de composición sintético contractual:
- 430 clientes / 1,375 pólizas / 1,900 cobros;
- `semanticEqual=true`;
- `mismatchCount=0`;
- `all('clientes')` batched: 3 llamadas / 3,705 clones;
- fallback original: 810 llamadas / 1,313,250 clones;
- reducción: 270× llamadas / 354.45× clones;
- Firestore/Auth/operational writes: 0;
- browser/data/deploy/production: false.

La deuda semántica `Histórico` permanece separada y no fue modificada.

## Certificación estática

PASS:
- manifest base exacto;
- árbol físico base exacto;
- manifest sucesor exacto;
- árbol físico sucesor exacto;
- todos los hashes de manifest verificados;
- 193 archivos no-delta hash-exactos;
- owner target hash-exacto;
- `noLabRuntime=true`;
- `noPrivateSecretMaterial=true`;
- browser/runtime/deploy/production=false;
- PII/secrets en evidencia=false.

## Estado de publicación

**R4S5 NO está publicada.**

La versión visible en `https://app.aysseguros.com` continúa siendo R4S4 exacta. No se tocó HostDime ni producción durante esta autorización.

## Avance y siguiente frontera

Gate 3 `POST_GO_LIVE_SMOKE_PASS` continúa abierto. La certificación durable elimina el bloqueo de paquete, pero no sustituye la validación runtime final.

Estado rector:
- readiness funcional: 100%;
- avance técnico: 85%;
- go-live gates: 2/3 = 67%;
- R4S5 durable: certificada/no publicada;
- navegador: congelado/source-only.

Siguiente acción exacta requiere autorización nueva. Debe decidirse separadamente entre:
1. publicar **exactamente esta R4S5 certificada** en HostDime, sin reconstruirla, y luego refreeze; y
2. ejecutar una única matriz read-only sobre la identidad publicada para intentar cerrar `POST_GO_LIVE_SMOKE_PASS`.

No existe autorización vigente para ninguna de esas dos acciones. Sin Auth/datos/Rules/store, reimportación, `main` ni merge.
