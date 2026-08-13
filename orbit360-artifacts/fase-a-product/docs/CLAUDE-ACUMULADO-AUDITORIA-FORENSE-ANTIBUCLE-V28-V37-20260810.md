# CLAUDE ACUMULADO — AUDITORÍA FORENSE ANTI-BUCLE V28–V37

Fecha: 2026-08-10
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

1. Un gate activo debe tener una sola fuente ejecutable de verdad para versión, owner, lifecycle, engine y estado.
2. No hardcodear generaciones cerradas en un router canónico cuando esas generaciones ya son evidencia histórica.
3. Registry, lifecycle, preflight, workflow y documentación deben derivar del mismo contrato versionado.
4. Si dos iteraciones no producen avance funcional visible, detener y diagnosticar el mecanismo antes de crear otra generación.
5. Antes de abrir runtime para investigar permisos, preparar una matriz source-only de capacidades requeridas, mecanismo primario, alternativas y condición de STOP.
6. Separar principal técnico, principal administrador y permiso temporal; no autoelevar cuentas técnicas.
7. Un fallo de observabilidad no se corrige modificando producto o datos.
8. La documentación viva no puede seguir apuntando a rutas históricas ya superadas.

## Hallazgo Orbit 360

El registry canónico principal quedó históricamente en una versión anterior mientras el entrypoint y extensiones evolucionaron. El patrón reusable es consolidar nuevamente un solo contrato rector y tratar las generaciones antiguas como evidence-only.

## No replicar

- fingerprints reales del tenant;
- identidades IAM;
- datos A&S;
- secrets/credentials;
- rutas temporales específicas ya retiradas.
