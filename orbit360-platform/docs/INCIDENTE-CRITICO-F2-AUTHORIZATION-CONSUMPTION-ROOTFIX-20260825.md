# INCIDENTE CRÍTICO F2 — CONSUMO PREMATURO DE AUTORIZACIÓN Y CIERRE DE CAUSA RAÍZ

Fecha: 2026-08-25
Proyecto: Orbit 360 / A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR rector: #5 draft/open
Clasificación primaria: `PIPELINE_MECHANISM_FAILURE`
Código raíz: `PIPELINE_MECHANISM_FAILURE:F2_AUTHORIZATION_CONSUMED_BEFORE_PRIVILEGED_RISK_BOUNDARY`

## Hallazgo

El control-plane permitía que `F2_RUNTIME_ATTEMPT_ACCEPT` agotara `allowedExecutions` antes de terminar el preflight y antes de demostrar que se había entrado realmente al riesgo privilegiado autorizado. La regla estaba además formalizada en el writer registry como `oneShotBudgetConsumedBeforeRuntimePreflight:true`.

Esto produjo churn de autorizaciones humanas por defectos del mecanismo. El run `32902848794` consumió una autorización aunque la evidencia registró `runtimeExecuted:false`, `browserExecuted:false`, `secretAccess:false`, `firestoreRead:false` y cero writes. El run `32904415944` sí ejecutó browser/runtime, pero su clasificación causal posterior fue `VALIDATOR_STALE`, no un defecto funcional del producto.

## Rootfix vinculante

1. `F2_RUNTIME_ATTEMPT_ACCEPT` pasa a ser una reserva del intento, no el consumo del one-shot.
2. La reserva conserva `allowedExecutions:1`, `consumed:false` y registra `runtimeAttemptReserved:true`.
3. El consumo irreversible se produce únicamente cuando la evidencia terminal demuestra riesgo privilegiado observado: runtime/browser/secrets/Firestore o evidencia durable de identidad/integridad previa.
4. Un fallo previo al riesgo conserva la misma autorización y request como reutilizables, sin pedir una nueva autorización humana.
5. La reutilización pre-riesgo no es carry-forward ni replay del runtime; el run fallido no se repite y la autorización sigue sin haberse consumido.
6. Si hubo riesgo privilegiado, la autorización sí se consume y `replayAllowed:false` permanece obligatorio.
7. Los runs `32902848794` y `32904415944` quedan como fixtures permanentes de regresión del lifecycle de autorización.

## Contratos actualizados

- `tools/orbit360-f2-authorization-lifecycle-v20260825.mjs`
- `tools/orbit360-continuity-transition-owner-v20260820.mjs`
- `tools/orbit360-f2-validator-semantic-policy-audit-v20260825.mjs`
- `tools/orbit360-control-plane-selftest-v20260824.mjs`
- `orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json`
- `orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json`

## Política nueva permanente

```txt
authorizationReservationDoesNotConsumeOneShot = true
oneShotBudgetConsumedBeforeRuntimePreflight = false
oneShotBudgetConsumedOnlyAfterObservedPrivilegedRisk = true
preRiskMechanismFailurePreservesAuthorization = true
```

## Academia / reutilización

Clasificación: `ACADEMIA_ACTUALIZAR` + `BACKEND_PROTEGIDO_NO_CLAUDE`.

Academia debe enseñar la diferencia entre:
- autorización humana;
- reserva de un intento;
- entrada a riesgo privilegiado;
- consumo real del one-shot;
- replay prohibido;
- reutilización de autorización no consumida por fallo pre-riesgo.

No enviar a Claude detalles internos del owner, rutas sensibles ni infraestructura protegida. El patrón reusable para producto es únicamente el principio de estados honestos y no duplicar una acción humana cuando el sistema no llegó a ejecutar el riesgo autorizado.

## Estado

Rootfix source-only materializado. Producto, candidata y datos A&S permanecen congelados. No autorizar F2 hasta obtener selftest/handshake source-only PASS del mecanismo corregido.
