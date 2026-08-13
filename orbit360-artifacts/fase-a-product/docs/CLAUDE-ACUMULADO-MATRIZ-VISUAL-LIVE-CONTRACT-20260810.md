# CLAUDE ACUMULADO — MATRIZ VISUAL ALINEADA AL CONTRATO VIVO

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`
Fecha: 2026-08-10

Patrones reutilizables:

1. Un test de visibilidad debe usar el mismo owner de autorización que usa el router/producto. No usar un helper de menor nivel como blocker si el producto gobierna con una capa compuesta de rol + extras + restricciones + scope.
2. Un deep-link dentro de la misma ruta base no se valida únicamente esperando que la ruta base esté ready. Debe exigir navegación exacta y el DOM específico del destino.
3. El tiempo de render no debe sumar nuevamente una hidratación completada antes de la navegación. Registrar hidratación y render por checkpoints separados.
4. Los estados de seguridad legítimos de primera sesión —por ejemplo cambio obligatorio de contraseña— deben normalizarse únicamente dentro del harness si impiden una prueba read-only; nunca desactivarse en el producto.
5. Los targets de un rol deben provenir de la proyección/filtrado efectivo o de elementos realmente renderizados, no del primer registro raw del store.
6. Ante acceso denegado, la prueba correcta es fail-closed del router; no exigir el mismo módulo a todos los roles.

No replicar datos A&S, fingerprints, credenciales, IDs, tenant, screenshots privados o backend protegido.
