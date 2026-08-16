# Orbit 360 A&S — R4S6 minimal successor durable certified

Fecha: 2026-08-16  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open · sin merge  
Publicación durante todo el bloque: R4S5 exacta, sin cambios.

## Autorización consumida

Se autorizó exclusivamente construir y certificar una sucesora mínima de la R4S5 pública exacta source `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`, incorporando únicamente:

- `core/client-insurer-visual-contract-v20260720.js` SHA256 `5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f`
- `modules/cliente360.js` SHA256 `5ac3f042add37ea45582cc88c670c5bcff139937dac406d9561e25f1b9962f9e`

provenientes del rootfix source-only commit `395f15d9c2e1fac2949763947834b88a9b521207`.

No autorizados y no ejecutados: HostDime, publicación, deploy, browser, runtime, secretos de aplicación, Auth, datos reales, Rules, store, main ni merge.

## Base exacta

R4S5 durable usada como única base física:

- artifact `9270227820`
- ZIP `orbit360-fase-a-product-r4s5-5474a1a9af64.zip`
- SHA256 `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`
- source `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`
- manifest `FASE_A_PRODUCT_R4S5_MINIMAL_SUCCESSOR_CERTIFIED`
- 194 archivos.

El artifact base se recuperó durablemente y se exigió un único ZIP interno con SHA256 exacto antes de construir la sucesora.

## Re-prueba source-only antes del paquete

Antes de sustituir archivos dentro del árbol de paquete se reejecutó el gate source-only del rootfix con fixture representativo:

- 430 clientes
- 1,375 pólizas
- 1,900 cobros
- 900 comisiones
- 7 asesores
- 30 aseguradoras
- payloads anidados representativos.

Resultado: `R4S5_CLIENT360_DEEP_CLONE_COMPOSITION_ROOTFIX_SOURCE_PASS`.

Se preservaron:
- `semanticEqual=true`
- `projectedClientsEqual=true`
- `renderedHtmlEqual=true`
- reducción de filas clonadas `75.43%`
- reducción de bytes clonados `75.78%`
- invalidación por `polizas` probada
- Firestore/Auth/operational writes `0/0/0`.

## R4S6 durable certificada

Workflow: `.github/workflows/orbit360-r4s6-minimal-successor-certify-v20260816.yml`  
Run: `31975982349`  
Job: `95235438739`  
Conclusión: **SUCCESS**.

Identidad exacta de producto:

- ZIP `orbit360-fase-a-product-r4s6-395f15d9c2e1.zip`
- ZIP SHA256 `00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c`
- source/semantic rootfix `395f15d9c2e1fac2949763947834b88a9b521207`
- manifest `FASE_A_PRODUCT_R4S6_MINIMAL_SUCCESSOR_CERTIFIED`
- fileCount `194`
- changedProductFileCount `2`
- unchangedFileCount `192`
- unexpectedProductDeltas `0`.

Deltas exactos R4S5 → R4S6:

1. `core/client-insurer-visual-contract-v20260720.js`
   - R4S5 SHA256 `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`
   - R4S6 SHA256 `5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f`
   - R4S5 bytes `39992`
   - R4S6 bytes `43985`

2. `modules/cliente360.js`
   - R4S5 SHA256 `665f3499a4eb6a1eafa723543a73bdd7057de344b2daf61776b6701ff3e3fbd9`
   - R4S6 SHA256 `5ac3f042add37ea45582cc88c670c5bcff139937dac406d9561e25f1b9962f9e`
   - R4S5 bytes `129473`
   - R4S6 bytes `130474`.

Los otros 192 archivos permanecen byte/hash exactos respecto de R4S5.

## Artifacts durables

Producto durable:
- artifact `9271052165`
- wrapper digest `sha256:ef1df64d11024c36f759ea445c7583c97f59ab36781205a78e199ce31899b86e`.

Evidencia:
- artifact `9271052034`
- wrapper digest `sha256:741f5cbe2ba8d6999b22314d57cee79a38e0e8a1f368f2fe70d62a3b83f245ee`.

La evidencia contiene preflight canónico, re-prueba source-only, certificación, manifest R4S6, SHA256 del ZIP y comparación estática R4S5→R4S6.

## Certificación estática

PASS:
- base manifest exacto
- base physical tree exacto
- successor manifest exacto
- successor physical tree exacto
- todos los hashes del manifest verificados
- 192 archivos no delta exactos
- 2 hashes objetivo exactos
- `noLabRuntime=true`
- `noPrivateSecretMaterial=true`
- gate canónico PASS antes y después.

Seguridad/alcance:
- browserExecuted=false
- runtimeExecuted=false
- deployExecuted=false
- productionTouched=false
- secretAccess=false
- dataAccess=false
- Firestore/Auth/operational writes=0
- store protegido sin modificación
- main/merge no ejecutados.

El token efímero de GitHub Actions se utilizó únicamente con permisos `actions:read` / `contents:read` para recuperar el artifact base; no se accedió a secretos de aplicación.

## Estado de publicación

**R4S6 NO está publicada.**

La única versión pública sigue siendo R4S5 exacta:
- artifact `9270227820`
- ZIP SHA256 `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`
- source `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`.

Browser/smoke continúa `SOURCE_ONLY=true`. No se consumió ninguna nueva matriz.

## Carriles

- A frontend/UX: R4S6 durable certificada con rootfix Cliente 360.
- B backend/Auth/store: congelado, sin cambios.
- C datos reales/migración: congelado, sin reimportación ni escritura.

Claude: `REPLICABLE_CLAUDE_ACUMULADO` — patrón reusable de sucesor mínimo a partir de artifact durable y deltas exactos certificados.

Academia: `ACADEMIA_ACTUALIZAR` — separar source proof, package lineage, static identity, publicación y runtime; una certificación durable no equivale a despliegue.

## Siguiente acción exacta

Requiere autorización separada: publicar exclusivamente la R4S6 durable exacta artifact `9271052165`, ZIP `orbit360-fase-a-product-r4s6-395f15d9c2e1.zip`, SHA256 `00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c`, sustituyendo controladamente la R4S5 pública; luego verificar identidad pública estática y refreeze source-only. Sin browser/runtime bajo esa autorización.
