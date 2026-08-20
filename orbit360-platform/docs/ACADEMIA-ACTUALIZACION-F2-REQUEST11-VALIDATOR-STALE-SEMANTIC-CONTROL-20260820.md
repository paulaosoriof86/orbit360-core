# Academia — F2 Request11: validar semántica, no adyacencia literal

Fecha: 2026-08-20.

## Caso real de aprendizaje
Request11 ejecutó una sola vez y falló antes del gate con `VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_MISSING`.

La revisión del código demostró que el probe cross-tenant estaba correctamente enlazado. El error estaba en el self-test, que buscaba una cadena textual contigua. Una asignación legítima de observabilidad insertada entre la llamada y su aserción rompió el literal sin romper la seguridad.

## Patrón obligatorio
1. Ante un fallo pre-gate, identificar la aserción exacta antes de tocar producto.
2. Contrastar el criterio del validador con la semántica real del owner.
3. Si el comportamiento correcto existe pero cambió la forma textual, clasificar `VALIDATOR_STALE`.
4. Reemplazar checks frágiles de adyacencia por invariantes semánticos específicos.
5. Preservar explícitamente los controles de seguridad: path canónico, argumento real, operación denegada y captura de la observación.
6. Sellar el request fallido como consumido/no replayable.
7. Antes de un sucesor runtime, ejecutar source-only `preflight + coherence + synthetic`.
8. El synthetic debe validar el ordinal siguiente sin convertirse en autorización ni ejecución real.

## Diferencia clave
- `FUNCTIONAL_DEFECT`: el comportamiento del producto incumple el contrato.
- `VALIDATOR_STALE`: el producto/owner cumple, pero el instrumento de validación representa una versión anterior del contrato o de su forma de implementación.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de ejecución/evidencia impide observar o cerrar correctamente el resultado.

En Request11 coexistieron dos hallazgos, pero con causalidad distinta:
- causa primaria: `VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_LITERAL_ADJACENCY_STALE`;
- defecto secundario de evidencia: `PIPELINE_MECHANISM_FAILURE — EARLY_FAILURE_EVIDENCE_DEPENDS_ON_LATE_ENV_EXPORT`.

## Regla reusable
Los validators de Orbit 360 deben comprobar **contratos observables y semánticos**, no depender de que dos expresiones permanezcan textualmente adyacentes. Cualquier cambio del owner que altere el patrón de detección exige actualizar owner + validator + workflow + evidencia + documentación + Academia en el mismo cierre metodológico.

## Alcance
Este aprendizaje es reusable y corresponde a `ACADEMIA_ACTUALIZAR` + `REPLICABLE_CLAUDE_ACUMULADO`. No contiene secretos, PII ni datos reales.
