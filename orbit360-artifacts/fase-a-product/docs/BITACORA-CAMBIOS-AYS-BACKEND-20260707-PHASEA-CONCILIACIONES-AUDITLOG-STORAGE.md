# Bitácora — Phase A conciliaciones, auditLog y Storage/adjuntos — 2026-07-07

## Resumen

Se avanzó Phase A con documentación técnica de contrato para persistencia de conciliaciones, `auditLog` y Storage/adjuntos, sin tocar backend protegido ni simular writes productivos.

Archivo creado:

```txt
orbit360-platform/docs/CONTRATO-PHASE-A-PERSISTENCIA-CONCILIACIONES-AUDITLOG-STORAGE-AYS-20260707.md
```

Commit del contrato:

```txt
6eaa25da1641dd35aa55bd61b08f0cda4ad64cc8
```

---

## Necesidad

El plan vivo pedía continuar backend Phase A con:

```txt
persistencia real de conciliaciones
auditLog
Storage/adjuntos reales
aplicación controlada de pagos/cobros confirmados
validadores de fuentes separadas
```

Antes de implementar adaptadores o writes, se requería fijar contrato para evitar regresiones metodológicas:

```txt
validada ≠ confirmada
adjunto ≠ cobro confirmado
banco ≠ cobro aplicado
estado cliente ≠ pago realizado
financiero histórico ≠ cartera/producción
planilla comisión ≠ recaudo confirmado
```

---

## Qué quedó documentado

### 1. Colecciones canónicas

```txt
conciliaciones
auditLog
documentosAdjuntos
storageRefs
```

### 2. Estados honestos

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

### 3. Reglas de autorización

Para confirmar cobros se exige:

```txt
tenantId correcto
país y moneda explícitos
fuente autorizada
recibo/cobro/póliza relacionable
póliza Vigente o Por renovar cuando impacta cartera actual
monto, moneda, fecha y periodo consistentes
no duplicidad por idempotencyKey
actor autorizado
auditLog antes/después
```

### 4. Storage/adjuntos

Se definió metadata, ruta opaca por tenant/fuente/documento, uso de checksum, URLs temporales y prohibición de usar nombres reales en paths públicos.

### 5. Portal cliente

Se confirmó que un pago reportado por portal queda como:

```txt
pagosReportados.estado = recibido / pendiente_revision
documentosAdjuntos.estadoRevision = pendiente_revision
```

No confirma cobro hasta validación autorizada.

---

## Qué NO se modificó

```txt
index.html
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

No se hizo:

```txt
deploy
merge
carga de datos reales
write productivo
aplicación de cobros
modificación de cartera/producción/comisiones
```

---

## Impacto comercializable

Este contrato vuelve el backend más comercializable porque separa claramente:

```txt
propuesta técnica
revisión operativa
validación autorizada
confirmación de cobro
afectación de cartera/producción/comisiones
```

Sirve para A&S y para cualquier tenant futuro, sin hardcodear datos ni lógicas privadas.

---

## Impacto en Academia

Debe actualizarse la matriz viva de Academia con:

```txt
ruta/curso: Cobros y conciliación; Auditoría/migración; Portal cliente
roles: Cobros, Operaciones, Administración, Dirección/Superadmin, Cliente portal
qué aprender: reportado/conciliado/autorizado/confirmado; adjuntos solo proponen; fuentes separadas
flujo cambiado: pago reportado con soporte → revisión → conciliación → autorización → confirmación
estado honesto: validada no aplica pago; soporte no confirma cobro
requiere evaluación: sí, casos de fuente y moneda/país faltante
sincronización fuente: data/academia-plus.js y data/seed.js pendiente
```

---

## Estado

```txt
CERRADO COMO CONTRATO/DOCUMENTACIÓN.
Pendiente implementar adapter LAB real y validadores cuando corresponda.
Pendiente ejecución local runner/smoke visual.
Pendiente profundización formal de Academia en fuente.
```
