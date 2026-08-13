# CHANGELOG complementario · Orbit 360 v1.88

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Prototipo vigente:** `Prototype Development Request - 2026-07-03T000030.492.zip`  
**Estado:** complemento de continuidad para alinear `CHANGELOG.md`, `docs/BITACORA-CAMBIOS.md`, pendientes Claude y backend/Codex.

---

## [1.88.0] — 2026-07-03 · Academia: profundización Marketing + Portal

### Added / Changed
- Curso Marketing: pasa de 2 a 4 lecciones, de 3 a 9 secciones y de 2 a 4 preguntas de quiz.
- Curso Portal: pasa de 2 a 4 lecciones, de 3 a 9 secciones y de 1 a 3 preguntas de quiz.
- `seed.__v` sube a 35 para resembrar cursos actualizados.
- Se confirma que el visor `verCurso → lessonBody` renderiza secciones ricas, videos y quiz interactivo.
- Videos HeyGen se mantienen como producción externa: la usuaria genera el video y pega URL embed en la lección.

### Archivos fuente del prototipo
- `data/seed.js`
- `index.html`

---

## [1.87.0] — 2026-07-03 · Config fiscal multi-tenant

### Added / Changed
- `tenant.paisesCfg` se consolida como fuente única para país, moneda, IVA/impuesto y gastos de emisión.
- Defaults documentados: GT IVA 12%, GTQ y gastos de emisión; CO IVA 19% y COP.
- `agregarPais` escribe en `tenant.paisesCfg` y mantiene compatibilidad con `pref('paises')`.
- Se documenta que el multi-tenant profundo real pertenece al backend: aislamiento por tenant, provisioning, reglas y seguridad.

### Archivos fuente del prototipo
- `core/config.js`
- `modules/configuracion.js`

---

## [1.86.0] — 2026-07-03 · Facturas a aseguradoras + visor Academia confirmado

### Added / Changed
- Finanzas → Liquidación empresa incorpora emisión de factura de comisiones por aseguradora.
- Usa datos fiscales de aseguradora: NIT, razón social, dirección fiscal y patrón de concepto.
- Calcula comisión devengada sobre prima neta recaudada.
- Calcula IVA/impuesto por país configurado.
- Imprime/PDF.
- Registrar emitida crea CxC / ingreso con `estado: facturado`.
- Se confirma visor Academia en flujo real.

### Regla financiera corregida
- La factura emitida a aseguradora **sí genera CxC de comisiones**.
- Puede quedar como ingreso facturado/CxC dentro de Finanzas.
- **No debe contarse como ingreso real recaudado/caja/banco** hasta pasar a `estado: recaudado` o conciliarse contra banco/caja.
- Pago de póliza por cliente **no crea `finmov`** como ingreso de caja/banco.
- Reportes y KPIs deben separar `facturado` vs `recaudado`.

### Pendientes de cierre
- Idempotencia.
- Número correlativo.
- Anulación/reversión.
- Auditoría.
- Enlace con statement/planilla.
- Estado `facturado → recaudado`.
- Enlace con banco al momento de recaudo.
- País/moneda sin mezclar GTQ/COP.

### Archivos fuente del prototipo
- `modules/finanzas.js`
- `data/seed.js`

---

## [1.85.0] — 2026-07-03 · Academia: visor unificado

### Changed / Fixed
- `verLeccion` delega en `lessonBody(l)`.
- Corrige normalización de videos YouTube/Vimeo.
- Corrige render de `secciones` para evitar contenido vacío.
- Reduce duplicación de lógica de render.

---

## [1.84.0] — 2026-07-03 · Conciliación de statements / planillas de comisión

### Added
- `Orbit.comeng.conciliarStatement(filas?)` compara comisión esperada vs registrada/pagada.
- Soporta conciliación con planilla importada.
- Soporta recomputar sin archivo para detectar desviaciones por tarifa o dato.
- Comisiones agrega pestaña de conciliación con KPIs y tabla clicable.
- Importador de planilla de comisión se enlaza al flujo.

---

## [1.83.0] — 2026-07-03 · Regla recaudo de póliza ≠ finmov

### Fixed / Business rule
- Pago aplicado por cliente a recibo/póliza no crea `finmov`.
- Afecta cartera, recibos, metas de recaudo y producción recaudada.
- Revierte regresión de `Orbit.q.postRecaudo` que escribía en `finmovs`.
- Conserva firma para no romper Cobros, Cliente360 e Importador.

---

## [1.82.0] — 2026-07-03 · Insights: concentración por aseguradora

### Added
- Agrega alerta/recomendación si una aseguradora concentra ≥35% de prima vigente.
- Mantiene análisis crítico con variación interanual, tasa de recaudo, tasa de cancelación, vencimientos, asesor líder y composición.

---

## [1.81.0] — 2026-07-03 · Presupuesto con fecha de pago

### Added
- Presupuesto captura `fechaPago`.
- Tabla muestra pagado, atrasado o en tiempo.
- Base para notificaciones de pago de gastos.

---

## [1.80.0] — 2026-07-03 · Finanzas profundo

### Added / Changed
- Metas visibles como pestaña.
- Real vs ideal por empresa, asesor y aseguradora.
- Semáforos de cumplimiento.
- Motor de sugerencia inteligente de metas.
- Dashboard financiero más analítico con tablas y comparativos reales.

---

## Instrucción obligatoria para Claude

Actualizar el `CHANGELOG.md` principal para incorporar v1.56–v1.88 o, mínimo, una entrada consolidada v1.88 que remita a `docs/BITACORA-CAMBIOS.md` y a este archivo.

Debe registrar cada cambio con:

- fecha,
- módulo,
- necesidad,
- esperado,
- causa raíz si aplica,
- archivo/función,
- fix o mejora aplicada,
- impacto en el prototipo comercializable,
- estado,
- prioridad,
- si aplica al prototipo base Orbit 360.

---

## Pendientes P0 asociados

1. Empalmar `index.html v1287` con backend LAB sin eliminar:
   - `core/backend-lab-loader.js`
   - `core/backend-lab-init.js`
   - `data/store-firestore-lab.local.js`
   - `core/auth-firebase.config.local.js`
2. Eliminar `localStorage` directo de `index.html` y `modules/configuracion.js`.
3. No hardcodear A&S; todo por `Orbit.tenant` / configuración / backend.
4. Mantener seed 100% ficticio.
5. Separar facturado vs recaudado en Finanzas, KPIs y reportes.
6. Ejecutar smoke demo + LAB antes de migrar datos reales de Alianzas.
