# Claude acumulado — v28

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`.

## Reutilizable
- Resolución de evidencia sanitizada unidireccional mediante `listDocuments()`/IDs, hash en memoria y lectura focal posterior.
- Field masks/proyecciones técnicas para limitar datos leídos cuando solo se requiere procedencia.
- Uso de metadata de snapshot (`createTime`/`updateTime`) como señal objetiva adicional sin exponer PII.
- Gate compuesto condicionado: provenance primero; universe contract después únicamente con adjudicación completa.
- Perfil phase-aware nuevo del mismo gate/owner para corregir `VALIDATOR_STALE` sin relajar el contrato.
- Universe gate que diferencia `PASS_DATA_CONTRACT` de `VALIDATOR_STALE` cuando existen altas objetivamente legítimas que superan el baseline; nunca cambia el baseline para hacer pasar la prueba.

## No enviar / protegido
No incluye secretos, credenciales, datos reales, IDs de documentos, fingerprints operativos, backend protegido, Auth, Rules, Orbit.store ni importadores productivos. El tenant A&S solo aparece en la configuración/runtime local del producto y no como patrón reusable.

## Temporal retiro
El perfil v28 es un control de cierre del Block 1; no debe convertirse en dependencia funcional de módulos ni quedar como mecanismo permanente de negocio.
