# Academia Orbit360 · V33 auditoría externa y pérdida de trazabilidad

- Diferenciar `DATA_CONTRACT_FAILURE` por falta de trazabilidad durable de un defecto funcional.
- Un `createTime` demuestra temporalidad, no legitimidad, actor ni mecanismo.
- Una ausencia de coincidencia solo excluye la fuente realmente comparada; no autoriza inferir origen.
- Cloud Audit Logs es evidencia externa autoritativa solo cuando el tipo de log requerido existe y es consultable; cero resultados con Data Access deshabilitado no prueba cero escrituras.
- Los probes de auditoría deben ser focales: resolver IDs en memoria, consultar solo el recurso objetivo y sanitizar actor/mecanismo sin persistir PII, principalEmail, IP, resourceName o logs crudos.
- Si no existe fuente autoritativa, debe declararse pérdida estructural de trazabilidad y escalarse a adjudicación humana controlada. No se arregla reimportando, cambiando el contrato ni buscando en fuentes de dominio prohibidas.
- Prevención reusable: toda alta/actualización operativa debe registrar actor, motivo, source/batch, timestamp y correlación de auditoría durable.
