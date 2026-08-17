# Orbit 360 A&S — R4S7 mínima durable certificada

Fecha: 2026-08-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Publicación vigente sin cambios: R4S6 exacta.

## Alcance autorizado

Construir y certificar exclusivamente una sucesora mínima de la R4S6 pública exacta:
- base source: `395f15d9c2e1fac2949763947834b88a9b521207`;
- base artifact: `9271052165`;
- base ZIP: `orbit360-fase-a-product-r4s6-395f15d9c2e1.zip`;
- base ZIP SHA256: `00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c`;
- único delta de producto: `core/client-insurer-visual-contract-v20260720.js`;
- delta source/rootfix commit: `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`;
- owner SHA256 autorizado: `573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390`.

No se autorizó ni ejecutó publicación, HostDime, browser, runtime, matriz, secretos, Auth, datos, Rules, store, main ni merge.

## Gate source/package/static

Workflow:
`.github/workflows/orbit360-r4s7-minimal-successor-certify-v20260817.yml`.

Constructor/certificador:
`tools/orbit360-r4s7-minimal-successor-package-v20260817.mjs`.

Run: `32026657493`  
Job: `95377368584`  
Resultado: `SUCCESS`.

El gate canónico pasó antes y después de la construcción.

Antes del empaquetado se reprobó el rootfix source-only con la secuencia Dirección scope → Cliente360 batch → enhancer visual:
- `semanticEqual=true`;
- `countsEqual=true`;
- `topLevelIsolation=true`;
- clientes nativeAll: `5 → 1`;
- filas cliente clonadas: `2150 → 430`;
- bytes cliente: `62312910 → 12462582`;
- reducción calls/rows/bytes: `80% / 80% / 80%`;
- reducción temporal de la repetición en este run: `67.64%`;
- invalidación `clientes/polizas/cobros/*/threshold`: PASS;
- protected store modified: false;
- `modules/cliente360.js` modified: false;
- browser/runtime/data/secrets: false;
- Firestore/Auth/operational writes: `0/0/0`.

## Identidad R4S7 certificada

ZIP:
`orbit360-fase-a-product-r4s7-ce9792e3e4e3.zip`

SHA256 del ZIP interno:
`4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`

Manifest status:
`FASE_A_PRODUCT_R4S7_MINIMAL_SUCCESSOR_CERTIFIED`

Manifest source:
`ce9792e3e4e37b298d2eda6f65983c683d66a3a3`

File count: `194`.

Comparación R4S6 → R4S7:
- changedProductFileCount: `1`;
- unchangedFileCount: `193`;
- unexpectedProductDeltas: `0`;
- delta exacto: `core/client-insurer-visual-contract-v20260720.js`;
- SHA base del owner: `5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f`;
- SHA R4S7 del owner: `573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390`;
- `modules/cliente360.js` permanece SHA256 `5ac3f042add37ea45582cc88c670c5bcff139937dac406d9561e25f1b9962f9e`;
- `core/queries.js` permanece SHA256 `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

El ZIP fue creado, hasheado, descomprimido nuevamente y validado contra el manifest antes de certificarlo. Los 193 archivos no objetivo quedaron byte-idénticos a R4S6.

## Artifacts

Evidence artifact:
- ID `9287313659`;
- digest `sha256:edd2d46bf585509fdab5031a05bdd9b6b26cd6ef712b48e739631fa84a140caa`.

Durable artifact:
- ID `9287314053`;
- artifact name `orbit360-r4s7-minimal-successor-durable-32026657493`;
- wrapper digest `sha256:20d04e459e143f7ec21bd3db28576a1a3dc6e7ad4342bcad0011800cee787c1d`;
- contiene exclusivamente `orbit360-fase-a-product-r4s7-ce9792e3e4e3.zip` como paquete de publicación;
- expiración del artifact GitHub: 2026-08-31.

## Estado

R4S7 queda **durable certificada, no publicada**.

R4S6 continúa siendo la identidad pública exacta y rollback inmediato mientras no se autorice publicación de R4S7.

Gate 3 continúa abierto: la certificación source/package/static no sustituye la matriz runtime final.

## Siguiente frontera

Con autorización separada: publicar exclusivamente la R4S7 durable exacta `artifact 9287314053`, ZIP `orbit360-fase-a-product-r4s7-ce9792e3e4e3.zip`, SHA256 `4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`, verificar identidad pública estática exacta y refreeze source-only inmediato. Browser/runtime/matriz requieren una autorización posterior independiente.
