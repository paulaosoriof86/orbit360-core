# Cierre STOP_RETRY — Gate 7.11 · autorización lifecycle-request

Fecha: 2026-08-02  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block7-canonical-runtime-cumulative-visual-lab-v20260801`

## Estado

`STOP_RETRY` activo.

No existe autorización vigente para otra ejecución. No se debe modificar el request ni disparar runtime hasta reabrir formalmente el lifecycle.

## Regla que activó STOP_RETRY

La etapa `Gate canónico antes de secrets, Firestore y navegador` falló dos veces consecutivas:

1. Run `30756305124`, job `91518930317`:
   - `CANONICAL_LIFECYCLE_REVISION_MISMATCH`;
   - no secretos;
   - no Firestore;
   - no navegador;
   - no escrituras.

2. Run `30756380638`, job `91519136227`:
   - check `AUTHORIZATION` false;
   - no secretos;
   - no Firestore;
   - no navegador;
   - no escrituras.

Conforme al Addendum de causa raíz, después de la segunda falla de la misma etapa se detuvieron los reintentos.

## Causa raíz completa

El engine del preflight exigía literalmente:

`user_proceed_definitive_solutions_no_trial_error_20260801`

Aunque el lifecycle y el request vigentes coincidían en:

`user_continue_next_exact_action_20260802`

El validador no estaba comprobando la integridad del vínculo entre lifecycle y request; estaba comparando contra una autorización histórica. Esto convertía cualquier autorización posterior válida en `AUTHORIZATION=false`.

Clasificación:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

## Corrección aplicada

El engine ahora exige:

- referencia no vacía en lifecycle;
- referencia idéntica en request;
- autorización explícita;
- una sola ejecución;
- request no consumido;
- macroblock sin microautorizaciones.

No acepta una frase histórica fija.

Archivos:

- `tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs`
- `tools/orbit360-validar-authorization-binding-gate711-v20260802.mjs`
- `.github/workflows/orbit360-canonical-runtime-cumulative-visual-lab-v20260801.yml`
- `tools/orbit360-validator-lifecycle-contract-canonical-runtime-cumulative-visual-lab-v20260801.json`

## Estado de la corrección Legal

Se conserva la corrección anterior:

`canonical_store_hydrated → Legal resuelto → write guard → navegación operativa`.

El workflow contiene dos controles estáticos previos a secretos:

1. vínculo exacto de autorización;
2. orden Legal diferido.

## Seguridad e integridad

- Producto modificado: no.
- Datos modificados: no.
- Auth modificado: no.
- Legal owner modificado: no.
- Firestore writes: 0.
- Operational writes: 0.
- Reimportación: no.
- Deploy: no.
- Producción: no.
- Main: no.
- Merge: no.

## Estado del lifecycle

- `status`: `CANONICAL_RUNTIME_CUMULATIVE_VISUAL_LAB_STOP_RETRY`.
- `allowedExecutions`: 0.
- `consumed`: true.
- `additionalExecutionsAllowed`: false.
- `requestCreationAllowed`: false.
- `runtimeRetryAllowed`: false.

## Requisitos para reabrir

Antes de un nuevo request inmutable:

1. `GATE711_AUTHORIZATION_BINDING_STATIC_PASS`.
2. `GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS`.
3. `GO_GATE_CONTRACT` completo sin leer secretos.
4. Autorización nueva y explícita para una única ejecución read-only.
5. Nuevo request inmutable creado una sola vez.

## Impacto Claude

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrón reusable: un validador no debe hardcodear una autorización histórica; debe verificar el vínculo exacto entre el documento de autorización y el request vigente. No compartir identidad LAB, tokens, secretos ni rutas protegidas.

## Impacto Academia

Clasificación: `ACADEMIA_ACTUALIZAR`.

Agregar caso práctico sobre:

- autorización vigente vs. texto histórico;
- diferencia entre fallo de producto y fallo del preflight;
- por qué el preflight debe detenerse antes de secretos;
- cuándo activar `STOP_RETRY`;
- por qué no se crea otro request mientras el lifecycle está cerrado.

## Siguiente acción exacta

No ejecutar runtime. La próxima acción permitida es una auditoría estática read-only del paquete final de preflight y, únicamente después de obtener los dos PASS estáticos y `GO_GATE_CONTRACT`, solicitar o recibir una nueva autorización explícita para crear un request inmutable.
