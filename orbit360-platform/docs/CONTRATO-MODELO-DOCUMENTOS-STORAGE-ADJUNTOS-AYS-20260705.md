# Contrato backend — Documentos + Storage futuro + adjuntos

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** contrato/modelo agregado; sin Storage real y sin archivos reales.

---

## 1. Objetivo

Definir el modelo backend plan-only para documentos soporte, adjuntos del Portal Cliente y preparación futura de Storage.

Este contrato no sube archivos, no guarda binarios, no crea clientes, no crea pólizas, no crea cobros, no aplica pagos, no modifica cartera, no actualiza producción y no activa Storage.

---

## 2. Restricciones fijas

- No datos reales en código.
- No archivos reales en repo.
- No base64, binarios, OCR completo ni payload documental.
- No Storage writes.
- No Firestore writes.
- No `Orbit.store` writes reales.
- Documentos soporte solo proponen datos.
- Adjuntos de pago reportado no equivalen a pago aplicado.
- Documento no crea ni modifica clientes/pólizas/cobros sin confirmación y diff.
- Documento no modifica cartera.
- Documento no actualiza producción.
- No deploy.
- No merge.

---

## 3. Fuentes permitidas

Fuentes válidas para modelo documental:

```txt
documentos_soporte
portal_cliente_adjuntos
pagos_reportados_cliente
configuracion_catalogo
```

Reglas:

- `documentos_soporte` puede crear propuesta documental.
- `portal_cliente_adjuntos` puede asociar soporte al reporte de pago o gestión.
- `pagos_reportados_cliente` puede relacionar adjunto con pago reportado.
- `configuracion_catalogo` puede definir tipos documentales permitidos.
- `finmovs`, `financiero_historico` y `estado_cuenta_bancario` no crean entidades desde documentos.

---

## 4. Colecciones previstas

```txt
documentosSoporte
documentoRelaciones
documentoPropuestas
storagePlan
auditLog
```

Todas deben conservar `tenantId` y `source_ref`.

---

## 5. Modelo `documentosSoporte`

Campos mínimos:

```txt
tenantId
documento_id
tipo_documento
estado_documento
pais
moneda
periodo
storage_ref
source_ref
original_filename
mime_type
size_bytes
hash_sha256
uploaded_by
created_at
updated_at
```

Reglas:

- No guardar binario ni base64 en repo.
- `storage_ref` es referencia futura, no archivo real en esta fase.
- Debe conservar hash para deduplicación y trazabilidad.
- Si falta país/moneda confiable: `REQUIERE_VALIDACION`.
- Si el documento trae datos sensibles, solo se proponen cambios con diff.

---

## 6. Modelo `documentoRelaciones`

Campos mínimos:

```txt
tenantId
documento_id
relacion_tipo
entity_type
entity_id
relacion_estado
source_ref
created_at
updated_at
```

Relaciones previstas:

```txt
cliente
poliza
recibo
pago_reportado
conciliacion
cobro
gestion
aseguradora
vehiculo
siniestro
```

Reglas:

- Relacionar no equivale a escribir o modificar la entidad relacionada.
- Un adjunto de pago reportado puede relacionarse con `pago_reportado` y futura `conciliacion`.
- La relación debe conservar fuente y auditoría.

---

## 7. Modelo `documentoPropuestas`

Campos mínimos:

```txt
tenantId
propuesta_id
documento_id
propuesta_tipo
target_collection
target_id
campos_propuestos
estado_propuesta
diff_required
confirmation_required
source_ref
created_at
updated_at
```

Reglas:

- Toda propuesta sensible requiere `diff_required=true` y `confirmation_required=true`.
- Estados posibles:

```txt
PROPUESTA
PENDIENTE_CONFIRMACION
REQUIERE_VALIDACION
APROBADA
RECHAZADA
BLOQUEADA
```

- Propuesta aprobada no debe ejecutarse automáticamente en esta fase.
- No crear clientes/pólizas/cobros/recibos/cartera desde propuesta sin proceso posterior autorizado.

---

## 8. Modelo `storagePlan`

Campos mínimos:

```txt
tenantId
storage_plan_id
documento_id
bucket_scope
path_template
can_upload_now
can_store_binary_now
retention_policy
access_policy
source_ref
created_at
updated_at
```

Reglas:

- `can_upload_now=false`.
- `can_store_binary_now=false`.
- `can_write_storage_now=false`.
- La ruta futura debe incluir `tenantId`.
- Acceso privado por defecto.
- No exponer URL pública de documentos sensibles.

---

## 9. Estados documentales

Estados mínimos para documentos:

```txt
RECIBIDO
CLASIFICADO
PROPUESTA
REQUIERE_VALIDACION
VALIDADO_CON_CONFIRMACION
RECHAZADO
ARCHIVADO
BLOQUEADO
```

Reglas:

- `RECIBIDO`: soporte recibido, sin validación.
- `CLASIFICADO`: tipo identificado.
- `PROPUESTA`: datos propuestos sin escritura.
- `REQUIERE_VALIDACION`: falta país, moneda, periodo, entidad o confianza.
- `VALIDADO_CON_CONFIRMACION`: listo para proceso posterior autorizado.
- `BLOQUEADO`: no debe avanzar.

---

## 10. Reglas de pago reportado con adjunto

Cuando cliente reporta pago con adjunto:

- crear relación documental futura con `pago_reportado`;
- dejar estado visible: pendiente de revisión/conciliación;
- no marcar recibo pagado;
- no crear cobro;
- no modificar cartera;
- no generar producción;
- permitir conciliación futura desde Cobros/Conciliaciones.

---

## 11. Reglas de creación de entidades desde documentos

Prohibido crear o modificar directamente sin confirmación y diff:

```txt
clientes
polizas
recibos
cobros
carteraItems
produccion
finmovs
```

Los documentos pueden sugerir:

- datos faltantes de cliente;
- datos de póliza emitida;
- datos de recibo;
- datos de vehículo;
- datos de pago reportado;
- relación con aseguradora;
- evidencia para conciliación.

---

## 12. Trazabilidad obligatoria

Debe conservar:

```txt
source_ref
original_filename
hash_sha256
pais
moneda
periodo
file
sheet
row
block
page
```

Reglas:

- Si el origen es Excel, conservar archivo, hoja, fila y bloque cuando aplique.
- Si el origen es PDF/imagen, conservar archivo, página y hash.
- Si falta país/moneda/periodo, bloquear escritura y marcar `REQUIERE_VALIDACION`.
- Todo cambio futuro debe tener `auditLog`.

---

## 13. Seguridad y privacidad

Reglas:

- Documentos privados por defecto.
- No publicar URLs directas sensibles.
- No guardar secretos ni credenciales.
- No guardar binarios/base64 en repo.
- No exponer información sensible en UI cliente salvo contexto permitido.
- Storage real requiere fase posterior con reglas, roles, permisos, auditoría y smoke.

---

## 14. Validador agregado

```txt
tools/orbit360-validar-modelo-documentos-storage-adjuntos-ays.mjs
```

Uso previsto:

```txt
node tools/orbit360-validar-modelo-documentos-storage-adjuntos-ays.mjs --model ruta/modelo-documentos.json --tenant alianzas-soluciones
```

El validador bloquea:

- Storage real activo;
- payload/base64/binario;
- OCR completo o texto documental real en contrato;
- creación de cliente/póliza/cobro desde documento;
- adjunto aplicando pago;
- documento modificando cartera;
- documento actualizando producción;
- ausencia de diff/confirmación;
- ruta Storage sin tenant;
- secretos o credenciales.

---

## 15. Tests sintéticos agregados

```txt
tools/orbit360-test-validar-modelo-documentos-storage-adjuntos-ays.mjs
```

Casos cubiertos:

- modelo válido;
- Storage activo ahora;
- base64/payload documental;
- documento creando cliente;
- adjunto aplicando pago;
- documento modificando cartera;
- documento actualizando producción;
- propuesta sin diff;
- Storage path sin tenant.

---

## 16. Impacto en Academia y manuales

Debe actualizarse cuando corresponda:

- diferencia entre documento soporte, adjunto, propuesta, dato validado y escritura real;
- adjunto de pago reportado no significa pago aplicado;
- documentos solo proponen datos hasta confirmación;
- Storage privado y trazabilidad;
- reglas de no crear clientes/pólizas/cobros desde documentos sin diff;
- flujo Portal Cliente → Documento adjunto → Pago reportado → Conciliación.

---

## 17. Estado

Contrato y tooling agregados en rama. No se ejecutó localmente. No hay subida de archivos, Storage real, creación de entidades, aplicación de pagos, modificación de cartera ni producción.