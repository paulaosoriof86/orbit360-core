# CLAUDE ACUMULADO — CONTRATO DE BASELINE EN VALIDADORES — V12

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

## Patrón reusable
La autorización de un runtime debe validar el baseline contra un lifecycle vigente y versionado, no contra nombres históricos incrustados en el validador.

El request y el lifecycle deben coincidir en versión esperada, gate, rama, proyecto, tenant, canal de baseline, script de restauración y límites de ejecución. El request debe ser nuevo, exclusivo, de una sola ejecución y sin replay. Las capacidades no autorizadas permanecen denegadas.

## Antipatrón detectado
El guard conservaba campos específicos de una versión anterior del baseline. Cuando el lifecycle avanzó a un baseline posterior válido, el guard rechazó el request antes del gate.

## Corrección reusable
El preflight entrega el lifecycle al guard y el guard compara ambos contratos por igualdad exacta. Los tests deben cubrir contrato válido, canal distinto, script distinto, versión distinta, lifecycle detenido, request consumido y capacidad no permitida.

Este patrón es exclusivamente arquitectónico y de validación; no contiene información sensible ni datos operativos reales.
