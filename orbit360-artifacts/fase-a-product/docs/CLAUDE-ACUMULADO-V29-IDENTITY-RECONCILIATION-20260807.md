# Claude acumulado — v29 Identity Reconciliation
Fecha: 2026-08-07
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

Patrón reusable, sin datos A&S:
- reconciliar diferenciales mediante identidad exacta contra baseline antes de modificar contratos;
- priorizar identificadores fuertes y reutilizar criterios exactos documentados por la fuente de migración;
- mantener separados `exact duplicate` y `probable duplicate`;
- una coincidencia nominal con identificador fuerte distinto debe fallar cerrada;
- hash del document ID y normalización se realizan en memoria; la evidencia persistida solo contiene fingerprints, clasificación y base de decisión;
- referencias demo se leen desde el seed ficticio en runtime/source sin copiar valores reales;
- auditoría externa solo mediante registry explícito, nunca escaneando colecciones por nombres supuestos;
- universe gate se ejecuta únicamente tras resolver completamente el diferencial;
- si altas legítimas cambian el universo esperado, clasificar `VALIDATOR_STALE`; no alterar el contrato para obtener PASS.

No enviar secretos, PII, datos reales, backend protegido ni valores de identidad.
