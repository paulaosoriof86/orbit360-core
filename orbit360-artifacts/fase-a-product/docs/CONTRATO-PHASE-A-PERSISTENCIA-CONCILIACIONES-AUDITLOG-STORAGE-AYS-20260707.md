# Contrato Phase A — Persistencia de conciliaciones, auditLog y Storage/adjuntos — Orbit 360 A&S

**Fecha:** 2026-07-07  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open, sin merge, sin deploy  
**Estado:** contrato backend/documentación. No implementa writes productivos.

---

## 0. Decisión del bloque

Este bloque aterriza Phase A sin tocar archivos protegidos ni simular producción. Define cómo debe persistirse una conciliación real en LAB/backend futuro, cómo debe auditarse cada transición y cómo deben manejarse adjuntos/soportes sin convertirlos automáticamente en cobros confirmados.

No se modificó:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
orbit360-platform/index.html
```

---

## 1. Objetivo funcional

Permitir que Orbit 360 guarde, revise y audite propuestas de conciliación provenientes de fuentes separadas, manteniendo una frontera clara entre:

```txt
reportado → conciliado → autorizado → confirmado
```

Regla principal:

```txt
Una conciliación validada NO aplica pago por sí sola.
Un soporte adjunto NO confirma cobro.
Un banco NO crea cartera.
Un estado de cuenta de cliente NO equivale a pago realizado.
Una planilla de comisión NO crea cobro confirmado.
```

---

## 2. Colecciones canónicas de Phase A

### 2.1 `conciliaciones`

Colección de propuestas y decisiones de conciliación.

Campos mínimos:

```txt
id
tenantId
pais
moneda
periodo
fuenteTipo
fuenteId
manifestId
archivoId
hoja
fila
bloque
entidadObjetivo
estado
score
scoreDetalle
relacionesPropuestas
efectosPropuestos
bloqueos
requiereValidacion
idempotencyKey
correlationId
createdAt
createdBy
updatedAt
updatedBy
```

Estados permitidos:

```txt
propuesta
en_revision
validada
rechazada
requiere_validacion
autorizada_para_confirmar
confirmada
revertida
```

Estados bloqueantes:

```txt
requiere_validacion
rechazada
revertida
```

### 2.2 `auditLog`

Bitácora inmutable de acciones. Debe registrar toda transición sensible.

Campos mínimos:

```txt
id
tenantId
actorId
actorEmail
actorRol
accion
coleccion
entityId
beforeHash
afterHash
beforeSummary
afterSummary
motivo
fuenteTipo
fuenteId
manifestId
archivoId
correlationId
idempotencyKey
createdAt
ipHash
userAgentHash
```

Reglas:

```txt
No guardar secretos.
No guardar payload real completo si contiene datos sensibles.
Usar resúmenes/hashes para trazabilidad.
Cada confirmación de cobro debe tener auditLog previo y posterior.
Cada reversión debe referenciar la acción original.
```

### 2.3 `documentosAdjuntos`

Metadata de soportes y archivos vinculados. El binario vive en Storage/Drive, no en Firestore como payload bruto.

Campos mínimos:

```txt
id
tenantId
pais
moneda
periodo
tipoDocumento
fuenteTipo
fuenteId
archivoNombreOriginal
mimeType
sizeBytes
checksum
storageProvider
storagePath
storageStatus
linkedEntityType
linkedEntityId
relacionesPropuestas
estadoRevision
createdAt
createdBy
```

Estados permitidos:

```txt
recibido
pendiente_revision
extraido
propuesto
validado
rechazado
archivado
```

Regla:

```txt
Un documento soporte solo propone datos. No crea ni modifica clientes, pólizas, cobros, cartera, producción o comisiones sin diff, validación y auditLog.
```

### 2.4 `storageRefs`

Opcional, para separar metadata de seguridad/acceso.

Campos mínimos:

```txt
id
tenantId
documentoAdjuntoId
provider
bucket
path
accessMode
expiresAt
createdAt
createdBy
```

Reglas:

```txt
No exponer rutas privadas en UI cliente.
No usar nombres de cliente/póliza en paths públicos.
Preferir IDs opacos por tenant/fuente/documento.
```

---

## 3. Efectos permitidos por tipo de fuente

| Fuente | Puede proponer | No puede hacer automáticamente |
|---|---|---|
| `estado_cuenta_bancario` | relación depósito ↔ recibo/póliza/cobro | crear cobro confirmado, producción, cartera o cliente |
| `estado_cuenta_cliente` | pagos pendientes, diferencias, soportes por revisar | marcar pago realizado |
| `planilla_comisiones` | comisión esperada vs pagada, drift de tarifa | crear cartera o confirmar recaudo |
| `cobros_realizados` | cobro real si viene de fuente autorizada y completa | mezclar monedas o saltar validación |
| `financiero_historico` | análisis financiero y trazabilidad | crear cartera, cobros o producción |
| `documentos_soporte` | datos sugeridos, adjuntos, OCR y diff | modificar cliente/póliza sin confirmación |

---

## 4. Reglas de autorización para confirmar cobros

Para pasar de `validada` a `confirmada`, se requiere:

```txt
1. tenantId correcto.
2. país y moneda explícitos.
3. fuente permitida para confirmar cobro.
4. recibo/cobro/póliza existente y relacionable.
5. póliza Vigente o Por renovar si impacta cartera actual.
6. monto, moneda, fecha y periodo consistentes.
7. no duplicidad por idempotencyKey.
8. adjunto o referencia aceptada cuando aplique.
9. actor con rol autorizado.
10. auditLog antes/después.
```

Si falta país, moneda, periodo o fuente confiable:

```txt
estado = requiere_validacion
bloqueos incluye REQUIERE_VALIDACION
no se genera recibo
no se confirma cobro
no se actualiza cartera
no se actualiza producción
```

---

## 5. Aplicación controlada futura

El ejecutor real de aplicación controlada NO queda construido en este bloque. Cuando se autorice, deberá usar dos pasos:

### Paso A — Confirmar conciliación

```txt
conciliaciones.estado: validada → autorizada_para_confirmar
```

Sin tocar cartera ni producción.

### Paso B — Confirmar cobro

```txt
autorizada_para_confirmar → confirmada
```

Solo entonces puede proponer updates controlados en:

```txt
cobros
recibos
carteraItems
cobroReciboRelaciones
produccion/recaudo derivado
comisiones derivadas sobre prima neta recaudada
```

Cada update debe tener:

```txt
correlationId
idempotencyKey
auditLog
beforeHash
afterHash
motivo
actor
```

---

## 6. Storage / adjuntos reales

### 6.1 Ruta recomendada

```txt
tenants/{tenantId}/sources/{fuenteTipo}/{periodo}/{fuenteId}/documents/{documentoAdjuntoId}
```

No usar nombres reales de clientes, pólizas o aseguradoras en el path.

### 6.2 Reglas de carga

```txt
- validar tamaño y tipo MIME;
- calcular checksum;
- guardar metadata en documentosAdjuntos;
- vincular por IDs internos;
- usar URLs firmadas/temporales para acceso;
- bloquear acceso cross-tenant;
- registrar auditLog de carga, lectura sensible, reemplazo y eliminación lógica.
```

### 6.3 Relación con Portal

Cuando el cliente reporta un pago con adjunto:

```txt
pagosReportados.estado = recibido / pendiente_revision
documentosAdjuntos.estadoRevision = pendiente_revision
conciliaciones puede recibir propuesta posterior
cobro NO queda confirmado hasta validación autorizada
```

---

## 7. Caso especial junio/julio 2026

Junio y julio 2026 deben tratarse como caso de conciliación por cortes distintos:

```txt
- planillas pueden reflejar pagos aplicados de periodos anteriores;
- estados de cuenta cliente pueden mostrar pendientes, no pagos realizados;
- financiero histórico puede no contener junio/julio;
- banco puede tener depósitos no relacionados todavía;
- no se deben inferir cobros desde una sola fuente.
```

Requiere vista o reporte de conciliación por fuente:

```txt
archivo → hoja → fila/bloque → país → moneda → periodo → entidad propuesta → estado → bloqueo
```

---

## 8. Impacto en Academia

Debe documentarse en Academia para roles:

```txt
Cobros
Operaciones
Administración
Dirección/Superadmin
Auditoría/migración
Portal cliente
```

Lecciones afectadas:

```txt
- Estados honestos: reportado, conciliado, autorizado, confirmado.
- Adjuntos y soportes: solo proponen datos.
- Conciliación junio/julio 2026.
- País/moneda y REQUIERE_VALIDACION.
- Qué puede y qué no puede hacer cada fuente.
```

Evaluación sugerida:

```txt
Caso 1: cliente adjunta comprobante en portal.
Caso 2: banco muestra depósito sin póliza relacionada.
Caso 3: planilla de comisión refleja pago aplicado.
Caso 4: financiero histórico tiene ingreso genérico.
Caso 5: falta moneda o país en archivo.
```

---

## 9. Pendientes técnicos siguientes

```txt
1. Diseñar adapter LAB de persistencia `conciliaciones` + `auditLog` sin tocar store protegido hasta fase autorizada.
2. Diseñar contrato de reglas Storage/Firestore para `documentosAdjuntos` y `storageRefs`.
3. Preparar validador estático de contrato sin modificar tools existentes.
4. Ejecutar runner local de conciliaciones pendiente.
5. Profundizar Academia fuente en `data/academia-plus.js` y `data/seed.js` cuando Claude tenga capacidad o cuando se autorice empalme fuente.
```

---

## 10. Estado final del bloque

```txt
Phase A aterrizada como contrato.
No hay writes reales nuevos.
No hay cambio en backend protegido.
No hay deploy.
No hay merge.
No hay datos reales.
```
