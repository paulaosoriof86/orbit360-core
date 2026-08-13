# Academia — lifecycle de dos fases y consumo automático de STOP

Fecha: 2026-08-07

## Objetivo pedagógico

Distinguir una activación source-only validada de una autorización runtime efectiva. Un PASS estático no debe convertirse implícitamente en permiso para secretos, navegador o deploy.

## Regla de dos fases

### Fase A — source-only

Valida código, contratos, portabilidad, transporte, watchdog, gates y límites. Sus capacidades runtime son todas `false`. No existe request activo.

### Fase B — runtime-pending

Solo después del PASS source-only se ejecuta una transición explícita. El lifecycle pasa a:

- status `AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST`;
- phase `VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION`;
- capacidades exactas: secrets/read/runtime/browser/deploy permitidos según autorización; writes/Functions/Rules/production prohibidos;
- un solo request futuro, sin replay.

Después de esta transición se crea el único commit exclusivo del request. El request no sustituye el lifecycle: ambos deben coincidir.

## Diferencia entre defecto funcional y validador obsoleto

En v13 el producto no llegó a ejecutarse. `CANONICAL_LIFECYCLE_PHASE_MISMATCH` fue un `VALIDATOR_STALE` del control-plane: guard, router y engine no estaban usando el mismo estado de lifecycle.

No se debe corregir el producto para satisfacer un validador desalineado. Primero se congela runtime y se repara owner, lifecycle, guard, workflow, pruebas y documentación.

## STOP_RETRY

Todo STOP consume el request de una sola ejecución, incluso si ocurre antes de secretos. El consumidor automático debe:

- allowedExecutions → 0;
- consumed → true;
- authorizationFrozen → true;
- replayAllowed → false;
- lifecycle/overlay → STOP_RETRY;
- runtime/browser/Hosting → false.

Esto evita que un fallo de gate deje una autorización residual reutilizable.

## Evidencia del patrón

Source-only PASS: request↔lifecycle 12/12; transición/STOP 31/31; transporte 12/12; capture watchdog 17/17; signal-safe 48/48; cross-runner 24/24; Windows 7/7. Cero secretos, Firebase, Hosting, navegador, deploy o escrituras.
