# Claude acumulado — v21 event-driven render observability — 2026-08-07

## REPLICABLE_CLAUDE_ACUMULADO

Patrón reusable, sin datos A&S ni secretos:

- separar readiness de datos y completion de render;
- armar observador antes de navegación;
- usar señal event-driven para completion cuando polling puede quedar bloqueado por long-tasks;
- persistir métricas del módulo también en rutas de timeout/STOP;
- clasificar timeout post-ready como `VALIDATOR_STALE` y timeout realmente no-ready como `FUNCTIONAL_DEFECT`;
- preservar clasificaciones especializadas frente a catches exteriores genéricos;
- compilar/importar exactamente el artefacto que runtime ejecutará;
- fixtures sintéticos que simulan long-task y demuestran cero polling durante completion.

## BACKEND_PROTEGIDO_NO_CLAUDE

No enviar a Claude:
- workflows runtime registrados y lifecycle/overlay exactos;
- rutas de credenciales o secretos;
- IDs de proyecto/tenant reales;
- snapshots, digests o evidencia operativa A&S;
- adaptadores Firestore/Auth/store/importador/Rules protegidos.

## TENANT_AYS_ONLY / SECRETO_DATO_REAL

No hay cambios de tenant ni datos reales en v21. Cualquier evidencia runtime futura se mantiene sanitizada y fuera del paquete reusable.
