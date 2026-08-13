# IMPACTO CLAUDE / PROTOTIPO REUTILIZABLE

Fecha: 2026-08-06

- Patrón reusable detectado: las pruebas visuales largas deben publicar progreso por rol y viewport, tener timeout local y terminar fail-closed.
- Debe compartirse con Claude: Sí, como patrón de QA y estados honestos; no como implementación backend.
- Módulos impactados: harness visual transversal, responsive, multirol y evidencia de capturas.
- Estado UI requerido: no simular PASS cuando una matriz queda incompleta; diferenciar `precheck aprobado`, `matriz incompleta` y `validación final aprobada`.
- Academia impactada: Sí.
- Riesgo si se ignora: pruebas que parecen congeladas, resultados verdes incompletos o regresiones no detectadas.

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

No compartir con Claude:

- service accounts;
- Firebase/Hosting interno;
- rutas de secretos;
- mecanismos de rollback real;
- datos A&S;
- scripts backend protegidos.
