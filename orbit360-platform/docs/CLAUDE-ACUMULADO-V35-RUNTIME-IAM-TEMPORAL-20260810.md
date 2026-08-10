# CLAUDE ACUMULADO — V35 RUNTIME IAM TEMPORAL Y REVERSIBLE

Fecha: 2026-08-10

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

Para acceso temporal de mínimo privilegio:

1. separar source preparation de runtime authorization;
2. usar un request de una sola ejecución, inmutable y ligado al parent exacto;
3. ejecutar gate antes de secrets;
4. comprobar primero si el principal ejecutor puede leer/modificar la policy objetivo;
5. detener antes de cualquier write si no puede;
6. capturar policy+etag y digest sanitizado del baseline;
7. añadir un solo binding temporal sobre el recurso de menor alcance;
8. verificar efecto antes de usar la capacidad;
9. ejecutar una lectura estrictamente acotada;
10. retirar el binding en `finally` si el grant llegó a aplicarse;
11. usar la policy más reciente al retirar para preservar cambios concurrentes;
12. verificar que el binding temporal desapareció;
13. persistir solo resultados sanitizados;
14. consumir el request y prohibir replay.

## Anti-patrones

- conceder el rol a nivel proyecto cuando una vista basta;
- crear un rol custom temporal sin necesidad;
- asumir que la cuenta objetivo tiene permiso para modificarse a sí misma;
- reemplazar una policy con un snapshot obsoleto;
- tratar literales de documentación, user-agent o clasificación como APIs operativas;
- reintentar automáticamente un lifecycle IAM.

## Orbit 360 v35

El worker futuro no usa Firebase Admin ni Firestore. La auditoría se resuelve desde Cloud Logging sobre la Log View y deriva fingerprints en memoria. Máximo futuro: 4 lecturas de policy, 1 grant, 1 revoke, 10 páginas de Logging y cero operational writes.

No incluir en entregables Claude secretos, principals reales, IDs de documentos, resource names o logs raw.
