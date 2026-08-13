# Academia Orbit 360 — Cliente 360 y campos opcionales · 2026-07-31

## Lección reusable

Un dato opcional ausente no es un error de backend ni debe impedir abrir una ficha. Los módulos de lectura deben distinguir entre:

- campo requerido ausente → calidad / `REQUIERE_VALIDACION` cuando corresponda;
- campo opcional ausente → forma segura y honesta (`[]`, cadena vacía o estado visual pendiente);
- relación inexistente → estado vacío explícito, nunca excepción del renderer.

## Caso Cliente 360

`etiquetas` es opcional. El encabezado de Cliente 360 usa una colección visual de etiquetas, por lo que el contrato canónico debe garantizar siempre un array aunque la fuente no incluya ese campo.

La proyección canónica no puede declarar una fila “ya normalizada” mirando solo campos escalares. Su firma debe incluir también los shapes opcionales que utiliza la UI.

## Diferencia metodológica

Este caso no fue:

- `DATA_CONTRACT_FAILURE`: 1293/1293 recibos y 673/673 cartera conservaron relaciones correctas;
- `VALIDATOR_STALE`: la captura de navegador encontró una excepción real de la UI;
- `PIPELINE_MECHANISM_FAILURE`: gate, navegador y captura read-only funcionaron.

Fue `FUNCTIONAL_DEFECT` porque una ausencia válida provocaba `undefined.map()` y bloqueaba toda la ficha.

## Patrón para roles

Dirección, Operativo y Asesor deben recibir la misma forma canónica segura; los scopes deciden qué registros pueden ver, no si un registro incompleto puede renderizarse.

## Patrón para importadores

Los importadores variables no deben inventar etiquetas faltantes. La proyección visual normaliza la forma a `[]`; la ausencia original continúa siendo trazable y no se escribe al backend solo para satisfacer un componente.

## Gate

Los validadores deben probar shapes opcionales además de conteos y relaciones. Un gate que valida solo número de clientes/pólizas/recibos puede pasar aunque una ficha se rompa por un campo opcional.

## Clasificación para Claude

`REPLICABLE_CLAUDE_ACUMULADO`

Enviar únicamente el patrón reusable: render seguro de arrays opcionales + firma de idempotencia que incluya shape. No enviar datos reales, IDs, evidencia sensible ni detalles de backend LAB.
