# Claude acumulado · V33 auditoría externa focal y trazabilidad durable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones reutilizables:
- Cuando la procedencia no puede demostrarse desde el documento, baseline ni ledger versionado, cambiar materialmente de evidencia antes de otro retry.
- Para Cloud Audit Logs, separar existencia del log, permisos de lectura, exhaustividad/paginación y significado del evento.
- En Firestore, cubrir métodos Data Access de escritura `v1` y `v1beta1`; no depender de nombres genéricos de método ni asumir que `protoPayload.resourceName` siempre identifica un documento dentro de operaciones agregadas.
- Resolver identificadores sensibles en memoria y consultar por path exacto sin persistir IDs, resourceName, principalEmail, caller IP ni logs crudos.
- Una consulta combinada para pocos targets reduce exposición y permite un presupuesto acotado de páginas; si queda `nextPageToken` después del máximo autorizado, fallar como evidencia incompleta.
- `AUDIT_NO_MATCHING_WRITE_ENTRY` no significa `NO_WRITE` cuando Data Access pudo estar deshabilitado, no retenido o no accesible.
- Un evento write solo aporta procedencia técnica. Actor/mecanismo/tiempo deben correlacionarse con una operación conocida y autorizada antes de decidir si el registro es legítimo, residual o requiere revisión humana.
- Prevenir la pérdida de trazabilidad futura registrando actor, motivo, source/batch, timestamp y correlación de auditoría durable en toda alta/actualización operativa.

No enviar a Claude: fingerprints reales, document IDs, PII, credenciales, principalEmail, caller IP, logs crudos ni detalles del backend protegido A&S.
