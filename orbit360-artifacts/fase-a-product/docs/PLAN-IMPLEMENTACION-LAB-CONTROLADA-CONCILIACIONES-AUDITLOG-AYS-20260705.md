# Plan exacto — Implementación LAB controlada Conciliaciones + auditLog

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** plan exacto; implementación no ejecutada.

---

## 1. Objetivo

Preparar la implementación LAB controlada de persistencia para `conciliaciones` y `auditLog`, sin tocar todavía archivos protegidos ni activar writes reales.

Este plan existe para que la fase posterior sea ordenada, reversible y verificable.

---

## 2. Condición de entrada

No iniciar implementación hasta tener:

```txt
runner acumulado OK
revisión visual/operativa por roles OK
autorización explícita de Paula
commit head registrado
backup local previo
```

Comandos previos:

```powershell
./tools/orbit360-run-validaciones-acumuladas-ays.ps1
./tools/orbit360-preparar-revision-roles-ays.ps1
```

---

## 3. Archivos candidatos de implementación futura

Archivo principal posible:

```txt
orbit360-platform/data/store-firestore-lab.local.js
```

Archivos que podrían requerir lectura, pero no reemplazo bruto:

```txt
orbit360-platform/data/store.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/index.html
```

Regla:

```txt
No reemplazar archivos completos sin diff revisable.
```

---

## 4. Cambios funcionales esperados en fase autorizada

Solo en LAB controlado:

```txt
insert/update/remove para conciliaciones vía Orbit.store
insert auditLog por transición de estado
onSnapshot filtrado por tenant para conciliaciones
auditLog metadata-only
_emit por colección y tenant
bloqueo de estados APLICADA/PAGADO/PAGO_APLICADO
bloqueo de writes a cobros, recibos, carteraItems, produccion, comisiones y finmovs
```

---

## 5. Secuencia de implementación autorizada

### Paso 1 — Backup local

Crear backup local de archivos protegidos:

```txt
data/store-firestore-lab.local.js
data/store.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
index.html
```

### Paso 2 — Preflight

Ejecutar:

```powershell
./tools/orbit360-preflight-implementacion-lab-conciliaciones-auditlog-ays.ps1
```

Debe confirmar:

```txt
rama correcta
archivos protegidos presentes
index conserva loader/init/store/storeLAB/guard
runner acumulado existe
readiness existe
sin autorización falsa
```

### Paso 3 — Patch mínimo

Aplicar patch mínimo únicamente sobre adapter LAB, manteniendo API:

```txt
all
get
where
insert
update
remove
_emit
on
```

### Paso 4 — Validación estática

Ejecutar:

```powershell
./tools/orbit360-run-validaciones-acumuladas-ays.ps1
```

### Paso 5 — Revisión visual/operativa

Ejecutar checklist por roles:

```txt
Cliente / Portal
Asesor
Cobros / Finanzas
Dirección / Admin
```

### Paso 6 — Reporte de persistencia LAB

Documentar:

```txt
fecha
commit head
archivos tocados
diff resumido
resultado runner
resultado revisión visual
bloqueos
rollback disponible
```

---

## 6. Preflight mínimo requerido

Debe bloquear si:

```txt
rama no es ays/backend-tenant-lab-v99-20260703
PR no está draft/open
index no conserva backend LAB
faltan archivos protegidos
se detecta intento de deploy/merge
se detecta datos reales en payload
se detecta estado APLICADA permitido
se detecta write a cobros/cartera/produccion/finmovs/comisiones
```

---

## 7. Rollback

Rollback mínimo:

```txt
restaurar backup local de store-firestore-lab.local.js
restaurar cualquier archivo protegido tocado
re-ejecutar runner acumulado
registrar reporte de rollback
no hacer deploy
no hacer merge
```

Si el error es visual/copy:

```txt
revertir solo módulo afectado
mantener backend protegido
re-ejecutar revisión por roles
```

---

## 8. Criterios para pasar a siguiente fase

Solo pasar a aplicación controlada futura si:

```txt
persistencia de conciliaciones OK
auditLog de transición OK
no se toca cobros/recibos/cartera/producción/finmovs/comisiones
roles visuales OK
runner acumulado OK
Paula autoriza siguiente fase
```

---

## 9. Criterios que bloquean todo avance

```txt
pago reportado aparece como aplicado
VALIDADA aparece como pagada
estado APLICADA queda habilitado
se escribe en cobros/cartera/producción
se mezclan monedas
se pierde tenant isolation
se rompe Orbit.store API
se toca main
se intenta deploy
```

---

## 10. Academia y manuales

Cuando se active la persistencia LAB, Academia debe explicar:

```txt
propuesta de conciliación
validación de propuesta
validada no es aplicada
auditLog por transición
pago aplicado pertenece a fase posterior autorizada
```

---

## 11. Estado

Plan creado. No se tocó `store-firestore-lab.local.js`, no se implementó persistencia real, no se ejecutó deploy, no se hizo merge y no se cargaron datos reales.