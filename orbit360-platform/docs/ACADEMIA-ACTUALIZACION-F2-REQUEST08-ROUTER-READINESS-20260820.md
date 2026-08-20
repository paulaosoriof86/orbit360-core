# Academia Orbit 360 — actualización F2 Request08 Router Readiness

Fecha: 2026-08-20
Clasificación Claude: REPLICABLE_CLAUDE_INMEDIATO

## Aprendizaje reusable
Un runtime puede tener autenticación, store y tenant correctos y aun no estar listo para pruebas visuales. Product App no debe declarar started/routerStarted únicamente porque invocó Router.init(); debe esperar una señal observable de montaje real. En este caso, #host debía estar renderizado antes de exponer readiness.

## Diferenciar causas
- FUNCTIONAL_DEFECT: el producto declara readiness antes del montaje efectivo.
- VALIDATOR_STALE: el test espera una candidata, selector o contrato histórico que ya no representa el producto.
- DATA_CONTRACT_FAILURE: los datos/identidad no cumplen el contrato; no aplica cuando integridad y bindings pasan.
- PIPELINE_MECHANISM_FAILURE: el producto/gate pasan pero falla transporte, persistencia o workflow; ejemplo: rebase bloqueado por evidencia no restaurada.

## Patrón preventivo
1. Gate canónico antes de secretos/runtime.
2. Readiness debe estar vinculado a una condición real del owner, no a la mera llamada de inicialización.
3. Source validation debe rehashar el artifact completo y probar el rootfix específico.
4. Separar scope del observer del scope del target: observar un runtime no concede runtime.
5. Si una etapa falla dos veces, congelar reintentos y corregir causa raíz del mecanismo.

## Estado de esta actualización
Artifact 9387820198; SOURCE run 32316010103; 194/194 rehash PASS; inicioFiniteRootfixPass=true; routerReadinessRootfixPass=true; runtime/browser/secrets/writes/deploy/producción=0 en SOURCE.
