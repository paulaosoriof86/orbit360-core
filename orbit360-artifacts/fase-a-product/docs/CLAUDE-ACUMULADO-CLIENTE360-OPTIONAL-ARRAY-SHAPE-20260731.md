# Claude acumulado — Cliente 360 optional-array shape · 2026-07-31

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## Patrón reusable

Los renderers no deben depender de que campos opcionales provenientes de importadores variables existan siempre. Para arrays visuales como etiquetas, alertas o adjuntos:

- forma canónica ausente → `[]`;
- firma de idempotencia debe incluir el shape del array;
- una marca de “ya proyectado” no sustituye la comprobación del contrato vigente;
- si cambia el shape, invalidar caches visuales sin escribir backend;
- relaciones vacías deben mostrarse de forma honesta, no provocar excepciones.

## No enviar a Claude

- datos reales A&S;
- IDs de clientes/pólizas/recibos;
- credenciales;
- detalles de Firebase/Rules;
- rutas o mecanismos protegidos de backend.

El patrón se empalma selectivamente sobre el baseline aprobado; no reemplaza módulos completos.
