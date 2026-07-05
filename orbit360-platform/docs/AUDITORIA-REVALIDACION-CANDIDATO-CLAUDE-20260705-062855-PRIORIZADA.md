# Auditoría priorizada — Candidata Claude vigente 062855.313

**Fecha:** 2026-07-05  
**Candidata auditada:** `Prototype Development Request - 2026-07-05T062855.313.zip`  
**SHA256 local:** `25b7c4ba54f1c3da2303e2881e636036db4d2f531b9b554f21789749f2fe9623`  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama protegida:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Objetivo:** reauditar antes de entregar paquete Claude con prioridad crítica por baja capacidad semanal.

---

## 1. Resultado ejecutivo

La candidata actual puede seguir como base visual/frontend. No encontré error crítico de sintaxis JavaScript en los 55 archivos `.js` auditados localmente.

Sí quedan pendientes críticos de copy/UX y consistencia operativa que Claude debe priorizar, porque pueden hacer que un usuario crea que hay backend real, pago aplicado, conexión real o producción real cuando todavía son estados de propuesta/revisión.

---

## 2. Validaciones realizadas

- Inventario ZIP: 98 archivos.
- Sintaxis JS: `node --check` sobre 55 archivos `.js`; sin errores.
- Búsqueda de `localStorage` en módulos: sin uso operativo directo nuevo; solo comentarios en `configuracion.js` y `plantillas.js`.
- Búsqueda de copy técnico visible en módulos/core/index.
- Búsqueda de copy de pagos aplicados, pagado, cobro aplicado, backend, LAB, mock y credenciales.

---

## 3. Hallazgos P0 para Claude

### P0-CLAUDE-01 — Eliminar textos técnicos visibles en UI cliente

**Problema:** hay textos visibles o semi-visibles que mencionan `backend`, `LAB`, `mock`, `localStorage`, credenciales o conexión técnica.

**Archivos observados:**

```txt
modules/conciliaciones.js
modules/configuracion.js
modules/marketing.js
modules/automatizaciones.js
modules/academia.js
core/integraciones-panel.js
core/integraciones.js
core/importa.js
```

**Corrección esperada:** reemplazar el lenguaje técnico por lenguaje comercial/operativo:

- `backend` → `validación segura`, `conexión pendiente`, `proceso controlado`, `etapa técnica interna`.
- `LAB`/`mock` → no mostrar en UI cliente.
- `credenciales` → `parámetros de conexión` o `acceso seguro`, según contexto.
- `Pendiente backend` → `Pendiente de conexión segura`.

**Regla:** no ocultar estados; hacerlos honestos sin tecnicismos.

---

### P0-CLAUDE-02 — Corregir copy de pagos para que no parezca aplicado/productivo

**Problema:** siguen apareciendo textos como `Pago aplicado`, `aplicar pago`, `pagado`, `cobros aplicados`, `Todo aplicado`, `Pagado + factura`, o similares en módulos de cliente/cobros/inicio/manuales.

**Archivos observados:**

```txt
modules/automatizaciones.js
modules/cliente360.js
modules/cobros.js
modules/inicio.js
modules/insights.js
modules/portal.js
docs/capacitacion-crm.html
docs/cliente360.md
docs/manual-maestro.html
```

**Corrección esperada:** separar estados así:

```txt
Pago reportado
Pendiente de revisión
Propuesta de conciliación
Validado para revisión
Conciliado
Cobro confirmado
Requiere validación
Bloqueado
```

**Regla:** `reportado` no es `cobrado`; `validado` no es `pagado`; `conciliación validada` no aplica pago por sí sola.

---

### P0-CLAUDE-03 — Alinear Cobros, Portal, Cliente360 e Inicio con contratos backend nuevos

**Problema:** el frontend debe reflejar las reglas ya documentadas por ChatGPT/Codex para clientes, pólizas, recibos, cartera, cobros y conciliación.

**Prioridad:** no reescribir backend; solo ajustar UI/copy/estados/demo ficticio.

**Reglas que debe conservar:**

- Cobros/recaudos no son `finmovs`.
- Estado bancario solo propone conciliación.
- Pago reportado queda pendiente de aprobación/conciliación.
- Producción/metas/comisiones = prima neta recaudada.
- No modificar cartera sin conciliación/aprobación.
- No sumar GTQ y COP en crudo.
- Si falta país/moneda/estado: `REQUIERE_VALIDACION`.

---

### P0-CLAUDE-04 — No tocar backend protegido ni reemplazar `index.html` completo

**Problema:** el ZIP incluye `data/store.js`; al entregar nueva candidata no debe pisar backend LAB ni el index híbrido ya empalmado.

**No tocar ni reemplazar:**

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

**Regla:** entregar solo cambios de módulos/core/frontend/docs necesarios para UX/copy. No cambiar contrato `Orbit.store`.

---

## 4. Hallazgos P1 para Claude

### P1-CLAUDE-01 — Actualizar Academia/manuales con reglas nuevas

Actualizar contenido de Academia/manuales para explicar:

- diferencia entre cliente, póliza, recibo, cartera, cobro, pago reportado, conciliación, finmov y producción;
- pago reportado desde portal no equivale a cobro aplicado;
- producción sobre prima neta recaudada;
- documentos soporte solo proponen datos;
- estado bancario solo propone conciliación;
- casos de junio/julio 2026 como conciliación especial.

### P1-CLAUDE-02 — Revisar Integraciones/Marketing para no simular conexión real

Si una integración no está conectada realmente, mostrar:

```txt
Pendiente de conexión segura
Pendiente de configuración
Listo para revisión técnica
```

No mostrar como conectado/productivo si no lo está.

### P1-CLAUDE-03 — Revisar Portal Cliente con adjuntos de pago reportado

El portal debe permitir estado honesto del pago reportado y adjunto, pero no debe prometer aplicación automática. Debe quedar claro para el cliente:

```txt
Recibimos tu reporte. Está pendiente de revisión/conciliación.
```

---

## 5. No crítico / no pedir a Claude ahora

Por capacidad limitada, no pedir todavía:

- rediseño visual amplio;
- nuevas secciones profundas de Academia no críticas;
- nuevas integraciones reales;
- backend, Firestore, Auth, reglas o store;
- nuevos importadores reales;
- deploy, merge o producción;
- carga de datos reales.

---

## 6. Veredicto

**Veredicto:** candidata aceptable como base frontend, pero Claude debe enfocar su poca capacidad en P0 de copy/UX operativo y consistencia con backend documentado.

**Pedir a Claude:** candidata correctiva pequeña, quirúrgica, sin tocar backend protegido, priorizada en Cobros/Portal/Cliente360/Inicio/Conciliaciones/Integraciones/Academia mínima.