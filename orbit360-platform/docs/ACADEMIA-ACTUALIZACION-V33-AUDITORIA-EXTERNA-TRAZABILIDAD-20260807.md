# Academia Orbit360 · V33 auditoría externa y pérdida de trazabilidad

- Diferenciar `DATA_CONTRACT_FAILURE` por falta de trazabilidad durable de un defecto funcional.
- Un `createTime` demuestra temporalidad, no legitimidad, actor ni mecanismo.
- Una ausencia de coincidencia solo excluye la fuente realmente comparada; no autoriza inferir origen.
- Las escrituras documentales de Firestore (`BatchWrite`, `Commit`, `CreateDocument`, `DeleteDocument`, `UpdateDocument`, `Write`) generan Data Access audit logs cuando ese tipo de auditoría está disponible; deben contemplarse `v1` y `v1beta1`.
- Firestore audit logs se consultan con `protoPayload.serviceName="firestore.googleapis.com"`; habilitar/configurar la auditoría usa el servicio `datastore.googleapis.com`.
- Cloud Audit Logs es evidencia externa autoritativa solo cuando el tipo de log requerido existía, estaba retenido y es consultable. Cero resultados con Data Access deshabilitado/no retenido/no accesible no prueba cero escrituras.
- `entries.list` puede devolver `nextPageToken` incluso cuando una página viene vacía. Un gate debe continuar dentro de su presupuesto o fallar como consulta incompleta; nunca declarar exhaustividad ignorando paginación.
- No asumir que `protoPayload.resourceName` de una operación agregada como `Commit` identifica siempre el documento. Un probe focal puede resolver el document path en memoria y filtrar el audit entry por la presencia exacta de ese path, sin persistirlo.
- Los probes de auditoría deben ser focales: máximo dos targets, filtros por Data Access + serviceName + métodos + ventana + path, y salida sanitizada de actor/mecanismo sin PII, principalEmail, IP, resourceName o logs crudos.
- Encontrar un evento write demuestra procedencia técnica parcial, no legitimidad. Debe correlacionarse con una operación conocida/autorizada antes de clasificar el registro como alta válida o residual.
- Si no existe fuente autoritativa, debe declararse pérdida estructural de trazabilidad y escalarse a adjudicación humana controlada. No se arregla reimportando, cambiando el contrato ni buscando en fuentes de dominio prohibidas.
- Prevención reusable: toda alta/actualización operativa debe registrar actor, motivo, source/batch, timestamp y correlación de auditoría durable.
