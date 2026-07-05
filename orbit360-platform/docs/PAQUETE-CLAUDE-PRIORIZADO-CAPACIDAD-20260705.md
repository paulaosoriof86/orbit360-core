# Paquete Claude priorizado — Capacidad semanal limitada

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Candidata base:** `Prototype Development Request - 2026-07-05T062855.313.zip`  
**Objetivo:** pedir a Claude una candidata correctiva pequeña y priorizada, enfocada solo en P0/P1.  
**Regla:** no tocar backend ChatGPT/Codex.

---

## 1. Prompt corto para Claude

```txt
Necesito una candidata correctiva pequeña y priorizada de Orbit 360 A&S usando como base la candidata vigente `Prototype Development Request - 2026-07-05T062855.313.zip`.

IMPORTANTE: tengo poca capacidad semanal, así que NO hagas rediseño amplio ni agregues funcionalidades grandes. Prioriza únicamente P0/P1 de copy, estados honestos y coherencia operativa.

NO TOCAR backend protegido, Firestore, Auth, reglas, store real ni scripts ChatGPT/Codex. No reemplaces `data/store.js` ni el `index.html` híbrido ya empalmado por ChatGPT/Codex. Entrega cambios frontend/documentales quirúrgicos.

P0 obligatorio:
1. Eliminar o reescribir textos técnicos visibles para usuario: backend, LAB, mock, localStorage, Firestore/Firebase, credenciales, smoke, conexión real si no existe.
2. Corregir copy de pagos/cobros para que no parezca que se aplican pagos o producción sin backend real.
3. Alinear Cobros, Portal, Cliente360, Inicio, Conciliaciones e Integraciones con estas reglas:
   - pago reportado no es cobro aplicado;
   - conciliación validada no aplica pago por sí sola;
   - cobros/recaudos no son finmovs;
   - estado bancario solo propone conciliación;
   - producción/metas/comisiones son sobre prima neta recaudada;
   - cartera no se modifica sin conciliación/aprobación;
   - si falta país/moneda/estado, usar REQUIERE_VALIDACION;
   - no sumar GTQ y COP en crudo.
4. Mantener estados visibles honestos para cliente y equipo: Reportado, Pendiente de revisión, Propuesta de conciliación, Validado para revisión, Conciliado, Cobro confirmado, Requiere validación, Bloqueado.
5. Actualizar lo mínimo indispensable en Academia/manuales para que no enseñen “aplicar pago” como si fuera productivo.

P1 si alcanza:
- Mejorar Portal Cliente para adjuntos de pago reportado con mensaje: “Recibimos tu reporte. Está pendiente de revisión/conciliación.”
- Integraciones/Marketing: mostrar “Pendiente de conexión segura” o “Pendiente de configuración”, no conexión real.
- Academia: mini lección de diferencia entre pago reportado, conciliación, cobro aplicado y finmov.

NO hacer ahora:
- backend real;
- Firestore/Auth/reglas;
- nuevos importadores reales;
- carga de datos reales;
- deploy/merge;
- rediseño visual amplio;
- nuevas integraciones reales;
- reestructuración general.

Entrega una candidata ZIP con cambios acotados y un resumen exacto de archivos tocados, por qué y qué pendiente queda.
```

---

## 2. Archivos que Claude debe revisar primero

```txt
modules/conciliaciones.js
modules/cobros.js
modules/portal.js
modules/cliente360.js
modules/inicio.js
modules/insights.js
modules/automatizaciones.js
modules/configuracion.js
modules/marketing.js
modules/academia.js
docs/capacitacion-crm.html
docs/cliente360.md
docs/manual-maestro.html
```

---

## 3. Cambios esperados por archivo

### `modules/conciliaciones.js`

- Quitar copy visible que mencione backend.
- Cambiar “listas p/ backend” por “listas para revisión técnica”.
- Cambiar modal de aplicación controlada para que diga que la propuesta queda pendiente de proceso autorizado posterior.
- No prometer que el pago se aplica desde la bandeja.

### `modules/cobros.js`

- Reemplazar botones o labels que sugieran aplicación directa por revisión/conciliación.
- Mantener estados honestos.
- Separar “Reportado por cliente” de “Cobro confirmado”.
- No usar “Pagado” como equivalente automático de conciliado/productivo.

### `modules/portal.js`

- Cuando cliente reporte pago, mostrar estado claro: pendiente de revisión/conciliación.
- Si hay adjunto, dejarlo como soporte del reporte; no como pago aplicado.

### `modules/cliente360.js`

- Revisar tablas/tarjetas de cobros para no mostrar “Todo aplicado” si no hay backend real.
- Reemplazar “pago aplicado a póliza” por estado honesto de conciliación/cobro confirmado.

### `modules/inicio.js` / `modules/insights.js`

- Evitar que KPIs digan “cobros aplicados” o “recaudo aplicado” si son datos demo/propuesta.
- Usar “recaudo confirmado” solo si el seed lo representa claramente; si no, “recaudo registrado demo”.

### `modules/configuracion.js`, `modules/marketing.js`, `modules/automatizaciones.js`

- Reemplazar términos técnicos visibles por lenguaje seguro.
- No mostrar integración como conectada/productiva.
- Usar “Pendiente de conexión segura” o “Pendiente de configuración”.

### `modules/academia.js` y docs/manuales

- Quitar instrucciones que enseñen aplicar pago como estado final real.
- Enseñar diferencia: pago reportado, conciliación, cobro confirmado, finmov.

---

## 4. Backend protegido que Claude no debe tocar

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

Tampoco debe reescribir los contratos backend recientes:

```txt
orbit360-platform/docs/CONTRATO-MODELO-CLIENTES-ASESOR-PORTAL-CALIDAD-AYS-20260705.md
orbit360-platform/docs/CONTRATO-MODELO-POLIZAS-RECIBOS-CARTERA-AYS-20260705.md
orbit360-platform/docs/CONTRATO-MODELO-COBROS-PAGOS-CONCILIACION-AYS-20260705.md
orbit360-platform/docs/CHECKLIST-SMOKE-VISUAL-CONCILIACIONES-AYS-20260705.md
```

---

## 5. Criterios de aceptación de la candidata Claude

Aceptar candidata solo si:

- no toca backend protegido;
- no agrega datos reales;
- no muestra textos técnicos visibles a cliente;
- no presenta pagos reportados como pagados/aplicados;
- no presenta conciliación validada como pago aplicado;
- no presenta integraciones como reales si no están conectadas;
- mantiene módulos navegables;
- no rompe sintaxis JS;
- entrega resumen de archivos tocados.

Bloquear candidata si:

- pisa backend ChatGPT/Codex;
- reemplaza `data/store.js` o index híbrido sin control;
- reintroduce copy técnico visible;
- dice “pago aplicado” sin backend real;
- crea datos reales o simula productivo;
- mezcla cobros con `finmovs`;
- borra rutas/módulos actuales.

---

## 6. Nota para Paula / ChatGPT al recibir la candidata

Cuando Claude entregue ZIP:

1. Auditar ZIP real, no aceptar resumen.
2. Validar sintaxis JS.
3. Buscar textos técnicos visibles.
4. Buscar `pago aplicado`, `backend`, `LAB`, `mock`, `localStorage`, `Firebase`, `Firestore`, `credenciales`.
5. Confirmar que no tocó backend protegido.
6. Solo después decidir empalme controlado.