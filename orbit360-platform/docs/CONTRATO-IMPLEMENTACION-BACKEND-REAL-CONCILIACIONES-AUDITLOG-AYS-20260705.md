# Contrato implementación backend real — Conciliaciones + auditLog

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** diseño de implementación; no activado.

---

## 1. Objetivo

Diseñar la fase backend real para persistir `conciliaciones` y `auditLog` en entorno LAB controlado, conservando la API de `Orbit.store` y sin aplicar pagos.

Este documento no implementa escritura productiva, no modifica reglas, no despliega, no autoriza datos reales y no activa aplicación controlada de pagos.

---

## 2. Alcance permitido de la primera fase

Permitido solo después de runner local y revisión visual aprobados:

```txt
persistir propuestas de conciliación
persistir cambios de estado de conciliación
persistir eventos auditLog asociados
emitir cambios vía _emit/onSnapshot
mantener tenant isolation
```

No permitido en esta fase:

```txt
aplicar pagos
marcar recibos pagados
crear cobros aplicados
modificar cartera
modificar producción
modificar comisiones
escribir finmovs
mezclar GTQ y COP
subir documentos reales
activar Storage real
merge a main
deploy
```

---

## 3. Condiciones previas obligatorias

Antes de activar cualquier persistencia real:

1. Ejecutar runner acumulado local:

```powershell
./tools/orbit360-run-validaciones-acumuladas-ays.ps1
```

2. Ejecutar revisión visual/operativa por roles:

```txt
Cliente / Portal
Asesor
Cobros / Finanzas
Dirección / Admin
```

3. Confirmar que no hay errores de sintaxis, copy crítico ni promesa de aplicación directa de pagos.

4. Confirmar que `index.html` conserva:

```txt
core/backend-lab-loader.js
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
```

5. Confirmar autorización explícita de Paula para activar persistencia LAB.

---

## 4. API que debe conservarse

La implementación debe conservar exactamente la API pública de `Orbit.store`:

```txt
all
get
where
insert
update
remove
_emit
```

También puede conservar extensiones ya existentes si no rompen compatibilidad:

```txt
find
on
pref
setPref
init
reseed
raw
```

Ningún módulo debe llamar Firestore directo. Los módulos siguen usando `Orbit.store`.

---

## 5. Colecciones de esta fase

Colecciones autorizadas para persistencia LAB controlada:

```txt
conciliaciones
auditLog
```

Colecciones explícitamente no autorizadas para writes en esta fase:

```txt
cobros
recibos
carteraItems
polizas
produccion
comisiones
finmovs
documentosSoporte
pagosReportados
```

Cualquier relación con pagos reportados o documentos queda solo referenciada, no mutada.

---

## 6. Modelo `conciliaciones`

Campos mínimos:

```txt
tenantId
id
estado_bandeja
estado_revision
fuente
archivo
fila
pais
moneda
periodo
clienteId
polizaId
reciboId
pagoReportadoId
documentoId
monto
score
accion_propuesta
bloqueos
responsable
createdAt
updatedAt
source_ref
```

Reglas:

- `tenantId` obligatorio.
- `pais` y `moneda` obligatorios para avanzar a validación.
- Si falta país/moneda/periodo: `REQUIERE_VALIDACION` o bloqueo equivalente.
- `score` no autoriza escritura en cobros.
- `estado_bandeja=VALIDADA` no significa pago aplicado.
- `estado_bandeja=APLICADA` queda bloqueado en esta fase.

---

## 7. Estados permitidos

Permitidos:

```txt
PROPUESTA
EN_REVISION
VALIDADA
RECHAZADA
BLOQUEADA
ANULADA
REQUIERE_VALIDACION
```

Bloqueado en esta fase:

```txt
APLICADA
```

Motivo: aplicar implica mutar cobros, recibos, cartera, producción y auditLog final; pertenece a fase posterior autorizada.

---

## 8. Modelo `auditLog`

Campos mínimos:

```txt
tenantId
event_id
entity
entity_id
action
actor_id
actor_role
before
after
source_ref
created_at
request_id
```

Reglas:

- Cada transición de conciliación debe registrar auditoría.
- No guardar secretos.
- No guardar payload documental completo.
- `before/after` deben ser metadata segura, no filas reales completas.
- `entity` debe ser `conciliaciones` en esta fase.

---

## 9. Transiciones permitidas

```txt
PROPUESTA -> EN_REVISION
EN_REVISION -> VALIDADA
EN_REVISION -> RECHAZADA
PROPUESTA -> BLOQUEADA
EN_REVISION -> BLOQUEADA
VALIDADA -> ANULADA
RECHAZADA -> PROPUESTA solo con auditoría y autorización
```

Transiciones bloqueadas:

```txt
VALIDADA -> APLICADA
PROPUESTA -> APLICADA
EN_REVISION -> APLICADA
```

---

## 10. Seguridad tenant

Reglas:

- Todo path debe incluir tenant.
- Solo tenant permitido en LAB: `alianzas-soluciones`.
- Prohibido escribir si `tenantId` falta o no coincide.
- Prohibido leer/escribir fuera del prefijo tenant.
- `_emit` debe emitir solo para el tenant activo.
- `onSnapshot` debe filtrar por tenant.

---

## 11. Readiness antes de activar

Debe existir reporte OK de:

```txt
VALIDACIONES-ACUMULADAS-AYS
REVISION-ROLES-AYS
```

Debe documentarse:

```txt
fecha
commit head
usuario que ejecutó
resultado
bloqueos
capturas o notas de revisión visual
```

---

## 12. Criterios de bloqueo

Bloquear implementación si:

- falla runner acumulado;
- falla revisión visual por roles;
- aparece copy de pago aplicado sin conciliación real;
- se intenta escribir en `cobros`, `recibos`, `carteraItems`, `produccion`, `finmovs` o `comisiones`;
- falta tenant;
- hay datos reales en código;
- hay secretos o credenciales;
- hay intento de deploy/merge.

---

## 13. Entregables de implementación futura

Cuando se autorice la fase, los entregables deberán ser:

```txt
plan de cambios exacto
diff de archivos protegidos si aplica
backup local
validación de API Orbit.store
reporte de runner acumulado
reporte visual por roles
reporte de persistencia LAB
rollback documentado
```

---

## 14. Estado

Contrato creado. No hay implementación activa, no hay writes reales, no hay deploy y no hay merge.