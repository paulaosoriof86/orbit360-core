# Acumulado Claude — patrón reusable v24 · structured evidence handoff

Fecha: 2026-08-07  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable

**Separar stdout humano de la autoridad machine-readable de un gate.**

Cuando un productor ya persiste evidencia JSON versionada:
- el consumidor debe leer ese artefacto estructurado;
- debe invalidar o eliminar evidencia previa antes de la nueva ejecución;
- debe exigir evidencia recreada/fresca;
- debe validar identidad, versión, fase, owner, artefacto y capacidades;
- debe fallar cerrado ante ausencia, JSON inválido, stale o mismatch;
- stdout/stderr pueden conservarse como diagnóstico, pero nunca decidir PASS/GO mediante heurísticas de líneas, regex o slices.

## Caso v24

Un gate canónico PASS imprimía JSON pretty/multilínea. El wrapper tomaba solamente la última línea `}` y concluía erróneamente que no existía PASS. El rootfix reemplaza el parse de stdout por lectura del JSON sanitizado persistido.

## Replicable

- contratos de evidencia estructurada;
- fixtures de stale/missing/invalid/mismatch;
- separación producer/consumer;
- fail-closed;
- validación de capacidades y scope sin tocar producto.

## No compartir

No incluir secretos, service accounts, PII, datos A&S ni implementaciones protegidas de store/Auth/Rules/backend.

## Relación con patrones anteriores

Complementa v23:
- v23: artefacto runtime nativo + observabilidad compartida por API;
- v24: handoff estructurado entre productor del gate y consumidor del resultado.

Ambos reducen falsos STOP y evitan modificar producto para compensar defectos del pipeline.
