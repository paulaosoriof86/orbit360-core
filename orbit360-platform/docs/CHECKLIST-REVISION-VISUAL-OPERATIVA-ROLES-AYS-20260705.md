# Checklist revisión visual y operativa por roles — Orbit 360 A&S

**Fecha:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** checklist y tooling agregados; pendiente ejecución local/navegador.

---

## 1. Objetivo

Validar por rol que el empalme frontend/copy y los contratos backend recientes se vean de forma honesta, sin simular producción ni backend real.

No autoriza:

- merge;
- deploy;
- datos reales;
- Storage real;
- Firestore writes reales;
- aplicación controlada de pagos;
- modificación de cartera;
- producción real.

---

## 2. Preparación local sugerida

Ejecutar primero el validador estático:

```powershell
./tools/orbit360-preparar-revision-roles-ays.ps1
```

El helper ejecuta:

```txt
node tools/orbit360-validar-revision-roles-ays.mjs
```

Genera reporte en `_orbit360_reports` y copia el resumen al portapapeles cuando PowerShell lo permite.

---

## 3. Rol Cliente / Portal

Validar:

- Portal abre sin bloqueo.
- Pago reportado muestra estado honesto.
- El mensaje debe decir que el reporte queda pendiente de revisión/conciliación.
- El adjunto se presenta como soporte, no como pago aplicado.
- No debe mostrar “pago aplicado” ni “pagado” por solo reportar.
- No debe permitir correo como opción del cliente si no está definido.
- No debe exponer textos técnicos de backend, LAB, Firebase, Firestore o Storage.

Criterio de bloqueo:

```txt
Cliente ve un pago reportado como pagado/aplicado sin conciliación.
```

---

## 4. Rol Asesor

Validar:

- Cliente360 abre.
- Pólizas abre.
- Cobros visibles no se confunden con movimientos financieros.
- Cartera se muestra como pendiente/confirmada según estado, no desde banco sin conciliación.
- Calidad de datos debe mostrar datos faltantes como solicitud/validación, no como escritura automática.
- Documentos soporte solo deben verse como evidencia/propuesta.

Criterio de bloqueo:

```txt
Asesor puede crear/modificar cliente, póliza, cobro o cartera desde documento sin diff/confirmación.
```

---

## 5. Rol Cobros / Finanzas

Validar:

- Conciliaciones abre.
- La bandeja indica que no aplica pagos ni modifica cobros.
- Las propuestas tienen estados honestos.
- Validada no significa pagada.
- Banco/estado de cuenta solo propone conciliación.
- Pago reportado no se convierte automáticamente en cobro confirmado.
- Cobros/recaudos no se presentan como `finmovs`.

Criterio de bloqueo:

```txt
Bandeja de conciliaciones permite o promete aplicar pagos de forma directa.
```

---

## 6. Rol Dirección / Admin

Validar:

- Inicio muestra recaudo confirmado y cobros confirmados.
- Producción/metas/comisiones se entienden sobre prima neta recaudada.
- No suma GTQ y COP en crudo.
- Integraciones aparecen como pendientes de conexión/configuración si no están conectadas.
- No muestra conexión real si no existe.
- Selector país está visible.
- No hay copy técnico visible al usuario final.

Criterio de bloqueo:

```txt
Dirección ve integración o producción como real/productiva cuando solo está pendiente o demo.
```

---

## 7. Backend protegido

Confirmar que siguen presentes y sin reemplazo bruto:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

---

## 8. Textos que bloquean si aparecen en UI cliente

```txt
pago aplicado
recaudo aplicado
cobros aplicados
todo aplicado
sin conexión real
listas p/ backend
credenciales técnicas
Firestore/Firebase visible al cliente
LAB visible al cliente
mock visible al cliente
```

Notas:

- En documentación técnica interna pueden existir términos técnicos.
- En UI cliente/operativa deben evitarse.

---

## 9. Resultado esperado

Aceptar revisión visual solo si:

- cliente ve estado honesto de pagos reportados;
- asesor no escribe entidades desde documentos sin diff;
- cobros no aplica pagos desde conciliaciones;
- dirección no ve integraciones ni producción como reales si no lo son;
- backend protegido sigue intacto;
- no hay textos técnicos visibles a cliente.

---

## 10. Pendiente posterior

Después de esta revisión visual/operativa, siguen pendientes:

- ejecución local acumulada de validadores;
- adapter Firestore LAB real para conciliaciones/auditLog;
- persistencia real aprobada;
- aplicación controlada de pagos con auditoría;
- manuales y Academia actualizados por rol.