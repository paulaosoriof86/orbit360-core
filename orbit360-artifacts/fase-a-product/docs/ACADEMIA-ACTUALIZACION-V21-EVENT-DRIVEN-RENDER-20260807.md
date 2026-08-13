# Academia Orbit 360 — actualización v21 — 2026-08-07

## Lección incorporada

Un timeout de un validador no prueba por sí solo un defecto funcional. Si la aplicación ejecuta una tarea síncrona larga, un mecanismo de polling que corre dentro de la misma página puede no tener oportunidad de observar estados intermedios. Al recuperar el event loop, la interfaz puede estar lista aunque el polling haya expirado.

## Patrón enseñado por rol técnico

1. Separar `required hydration` de `render completion`.
2. Validar hidratación requerida antes de navegar.
3. Armar la observación de finalización antes de cambiar la ruta.
4. Preferir una señal event-driven (`MutationObserver`/evento explícito) para observar finalización de render cuando un long-task puede bloquear polling.
5. Persistir métricas de producto tanto en PASS como en STOP antes de clasificar.
6. Distinguir:
   - página lista al recuperar ejecución => `VALIDATOR_STALE`;
   - página realmente no lista => `FUNCTIONAL_DEFECT`.
7. Un catch exterior nunca debe sobrescribir una clasificación especializada ya determinada.
8. El artefacto que se prueba source-only debe ser exactamente el artefacto que ejecuta runtime.

## Control de cambio

Cliente 360 permanece congelado durante v21. El cambio pertenece a validator/control-plane, no a UX ni a datos. La Academia debe enseñar que corregir el producto cuando el defecto pertenece al validador genera regresiones y oculta la causa raíz.

## Seguridad y gates

La transición a runtime solo puede ocurrir después de PASS source, con request nuevo e inmutable y `GO_GATE_CONTRACT` antes de secretos. Runtime continúa read-only respecto de datos operativos y debe cerrar snapshot idéntico, cero writes y rollback ante cualquier STOP.
