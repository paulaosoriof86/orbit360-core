# PENDIENTES Y MEJORAS — Orbit 360 (actualizado a v1.73 auditada)

> Actualizado por ChatGPT/Codex el 2026-07-01, a partir del ZIP Claude `Prototype Development Request - 2026-07-01T180428.510.zip`.
> Este documento reemplaza el estado anterior v1.41. La regla vigente es separar: **Claude = UX/prototipo/módulos**; **ChatGPT/Codex = backend/Auth/Firestore/tenant/integraciones**.

## 0. Estado general de la base v1.73
- 30 módulos presentes.
- 17 archivos core presentes; se agrega `core/notify.js`.
- 49 archivos JS revisados con `node --check`, sin error de sintaxis.
- `BITACORA-CAMBIOS.md` declara avances hasta v1.73, pero `CHANGELOG.md` estaba en v1.55 y este documento seguía en v1.41.
- La nueva base visual no trae `data/store-firestore-lab.local.js`; al instalarla en el repo backend debe preservarse/reinyectarse el backend protegido.

## 1. Pendientes previos que quedan CERRADOS o sustancialmente avanzados en la base v1.73

### Cerrados / funcionalmente atendidos para prototipo
- **Cotizador:** ya incorpora marca → línea → modelo y opción “➕ Otro…” inline, sin prompt nativo. Queda pendiente backend/tarifas reales por cliente.
- **Reportes:** ya tiene agrupación, filtro por año, exportación y programación persistida en `reportes_prog`.
- **Comisiones:** ya tiene filtros por año/estado, export CSV y alternancia Liquidada ↔ Devengada.
- **Historial:** KPIs funcionales que filtran el feed por tipo; dejó de ser módulo delgado.
- **Calidad de datos:** edición inline y cola de completitud operativa.
- **Plantillas:** ya persiste en `Orbit.store('plantillas')`; queda solo comentario legacy, no acceso funcional directo.
- **Cobros:** navegación cruzada y conciliación por recibo más completa.
- **Portal:** avanza con reportar pago, documentos, notificaciones y solicitudes hacia Ops; requiere pulido de fechas vivas y detalle de autoservicio.
- **Aseguradoras:** ficha editable con contactos, accesos, cuentas, documentos, ramos/comisiones y vinculación activa/inactiva. Falta ajustar experiencia de grilla por modo cliente.
- **Pólizas:** KPIs filtrables por estado; alta manual y desde importador inteligente.
- **Marketing:** estados/responsable/aprobación y flujo idea→programado→publicado→medido.
- **Siniestros:** bitácora y analítica de tiempos; quedan fechas quemadas en operaciones de bitácora.
- **Renovaciones:** campaña segmentada por asesor/ramo.
- **Insights:** filtros país+asesor+mes y comparativos más sólidos.

### Parcialmente atendidos
- **Finanzas:** se profundizó presupuesto/metas/CxC/CxP/financiación, pero `resumen()` todavía pinta movimientos literales en un array local. Debe leer `finmovs` o una vista derivada del store.
- **Fechas vivas:** existe `Orbit.ui.today()`, pero aún hay fechas fijas en operaciones de `core/ciclo.js`, `modules/portal.js`, `modules/siniestros.js` y algunos formularios de `modules/cliente360.js`.
- **Sin `localStorage` en módulos:** casi cerrado, pero queda acceso directo en `modules/configuracion.js` para subir/quitar logo.

## 2. Pendientes abiertos — PAQUETE CLAUDE
Ver detalle completo en `docs/PAQUETE-CLAUDE-PENDIENTES-V173-20260701.md`.

### P0
1. `modules/configuracion.js` todavía usa `localStorage` directo para logo.
2. Fechas operativas quemadas siguen en `core/ciclo.js`, `modules/portal.js`, `modules/siniestros.js`, `modules/cliente360.js`.
3. Documentación de versión/pending desincronizada.

### P1
1. Ocultar etiquetas técnicas por defecto en modo cliente.
2. Separar vista operativa de aseguradoras vinculadas vs catálogo inactivo.
3. Finanzas debe leer movimientos desde `finmovs`, no array local.
4. Eliminar comentario CXOrbia en archivo funcional.
5. Entregar/verificar render visual real tras saneamiento.

## 3. Pendientes abiertos — PAQUETE BACKEND CHATGPT/CODEX
Ver detalle completo en `docs/PAQUETE-BACKEND-CODEX-V173-20260701.md`.

### P0
1. Instalar base visual nueva sin perder backend protegido.
2. Actualizar Firestore LAB a la API expandida de `Orbit.store`.
3. Ampliar `ORBIT_LAB_COLLECTIONS` con colecciones usadas por v1.73.
4. Rehacer smoke runtime Fase 7 con arnés confiable; Fase 7B no cerró por falta de POST.

### P1
1. Persistencia de `pref/setPref` por tenant.
2. Config multi-cliente/feature flags/roles/aseguradoras por tenant.

## 4. Regla de actualización ágil desde ahora
Cuando Claude entregue un ZIP nuevo:
1. Tratar el ZIP como base visual más reciente.
2. Auditar continuidad: mejoras, roturas, pendientes, datos hardcodeados y reglas de arquitectura.
3. Actualizar este documento y los paquetes separados Claude/backend.
4. Instalar preservando backend protegido: no reemplazar ciegamente `data/store.js`, `data/store-firestore-lab.local.js`, docs backend ni hook de `index.html`.
5. Correr smoke contractual antes de continuar backend.

## 5. Estado
- Estado del documento: ACTUALIZADO.
- Estado de base v1.73: USABLE COMO BASE VISUAL NUEVA, con P0 de saneamiento pendiente antes de empalme backend definitivo.
