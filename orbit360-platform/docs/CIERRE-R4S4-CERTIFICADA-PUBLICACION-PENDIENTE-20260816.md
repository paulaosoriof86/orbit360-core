# CIERRE R4S4 · CERTIFICADA · PUBLICACIÓN PENDIENTE

Fecha: 2026-08-16  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge

## 1. Auth

Auth productivo continúa certificado PASS por la última matriz real: login HTTP 200, signed-in, emailVerified, membership activa, tenant correcto, roles requeridos y store read-only. Auth no es el blocker vigente y no fue modificado.

## 2. Rootfix Cliente 360

Único delta funcional autorizado:

- `orbit360-platform/core/queries.js`
- commit `54f671e64b32c7b39100d79e770572a579e79ac7`
- SHA256 `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`

Validación source-only run `31963555214`, job `95205101103`, artifact `9267857434` → PASS.

Boundedness:
- allCalls 4
- getCalls 0
- whereCalls 0
- cloneRows 4,605
- Map 430/430
- semántica equivalente
- mismatch 0
- único delta de producto verificado.

## 3. Validador/harness R4 corregido

Clasificación cerrada:

`VALIDATOR_STALE_SECONDARY / CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION`

Corrección source-only:
- owner: `tools/orbit360-r4-role-route-attribution-wrapper-v20260816.mjs`
- gate: `tools/orbit360-r4-role-route-attribution-gate-v20260816.mjs`
- workflow productivo continúa `SOURCE_ONLY=true`.

Run `31964177636`, job `95206611728`, artifact `9268029944` → SUCCESS.

PASS:
- gate canónico primero;
- grupo acumulativo 90 s eliminado del harness compuesto;
- activación por rol con stage independiente;
- cada ruta con stage independiente;
- budgets independientes;
- route readiness timeout ya no se silencia;
- clasificación activation vs route separada;
- evidencia parcial de rol preservada;
- regresión team/own PASS;
- watchdog PASS;
- browser/secrets/identity/install skipped;
- cero writes.

## 4. R4S4 mínima certificada

Certificación run `31964568216`, job `95207631956` → SUCCESS.

Paquete:
- `orbit360-fase-a-product-r4s4-54f671e64b32.zip`
- SHA256 `f266815e26da04a8c9e86b0db9414ca6c06bedb3cd9371f85e96c8d08e420d4c`
- base exacta: R4S3 SHA256 `1ab5f3ea7f59cd0c2eb2bb1f5c0596a4bf3ca241f42016f74bf095ccbaf0f78e`
- source base `294ed22bdb564585b71fc59cefa1d04cdfa6b120`
- source delta `54f671e64b32c7b39100d79e770572a579e79ac7`
- 194 archivos de producto
- 1 único delta: `core/queries.js`
- 193 archivos byte-idénticos a R4S3
- durable artifact `9268128540`, digest `sha256:f285598bc09d567f5e63483db02ce91d4c382c58b606efe45c061e34508eb02d`
- evidence artifact `9268128341`, digest `sha256:b0c82bb4ab904994b88544fb9252229dba58283c9c22dc48b2fd545c2132c22d`
- manifest status `FASE_A_PRODUCT_R4S4_MINIMAL_SUCCESSOR_CERTIFIED`.

La certificación no accedió secretos/datos, no ejecutó browser/deploy y no tocó producción.

## 5. Producción vigente

Hasta evidencia posterior a extracción, `app.aysseguros.com` continúa clasificada como R4S3 publicada/verificada. No se presume R4S4 publicada por existir el ZIP certificado.

R4S3 queda como rollback exacto.

## 6. Siguiente secuencia ya autorizada

1. Publicar exclusivamente el ZIP R4S4 certificado en el document root de `app.aysseguros.com`, preservando rollback R4S3.
2. Verificar identidad pública exacta R4S4 y SHA de `core/queries.js`.
3. Ejecutar gate canónico.
4. Ligar contrato del smoke a R4S4 y exigir source-only PASS del harness corregido.
5. Ejecutar exactamente una matriz productiva read-only: Dirección desktop, Operativo tablet, Asesor móvil; Inicio, Cliente 360, Aseguradoras, Ops y Leads; 430 clientes, 30 aseguradoras; Auth/runtime/scopes; cero writes.
6. Refreeze inmediato.
7. Solo con `POST_GO_LIVE_SMOKE_PASS` cerrar 3/3 y habilitar visualización humana/pruebas E2E live.

Ante fallo: STOP sin segundo intento automático.

Sin reimportación, Auth/data changes, main ni merge.
