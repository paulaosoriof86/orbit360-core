# Auditoría forense — candidato activo Claude 2026-07-04T152321.882

**Fecha de auditoría:** 2026-07-04  
**Candidato auditado:** `Prototype Development Request - 2026-07-04T152321.882.zip`  
**Proyecto:** Orbit 360 A&S  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Método:** auditoría de archivos reales del ZIP + validación sintáctica estática + comparación contra ZIP anterior disponible `Prototype Development Request (89).zip` + revisión focal de importador, pólizas, cobros, Cliente360, Portal, comisiones, finanzas, notificaciones, Academia y documentación.

---

## 1. Veredicto ejecutivo

El candidato activo **sí es una evolución relevante** respecto al ZIP anterior y contiene varias correcciones que deben conservarse:

- importador con fuentes separadas y trazabilidad por hoja/fila;
- país/moneda sin default operativo peligroso en rutas principales del importador;
- planillas de comisión como fuente real del importador;
- documentos de soporte como propuestas/diff, no escritura directa al cliente;
- estado bancario hacia bandeja de conciliación, no hacia `finmovs` directo;
- Academia ampliada hasta v1.123;
- integraciones/marketing del lane ChatGPT-Codex incorporadas en el prototipo.

El candidato es **apto para continuar como base frontend activa**, pero **no debe empalmarse como ZIP completo** porque incluye `data/store.js` de prototipo y no trae los archivos backend LAB protegidos de la rama activa. El empalme debe ser aditivo y controlado.

---

## 2. Inventario del ZIP

Resultado de inventario real:

- **97 archivos** en `orbit360-platform/`.
- **54 archivos JS**.
- **30 módulos** en `modules/`.
- **51 scripts cargados** desde `index.html`.
- Todos los archivos de `modules/*.js` están cargados por `index.html`.
- Todos los módulos declaran `Orbit.modules.<modulo>` correctamente.
- Validación `node --check` sobre los **54 JS**: **0 errores sintácticos**.

Módulos presentes:

```txt
academia, aseguradoras, automatizaciones, calidad, cancelaciones, cliente360,
cobros, comisiones, comparativo, configuracion, correo, cotizador,
cronograma, equipo, finanzas, historial, ia, importar, inicio, insights,
leads, marketing, notificaciones, ops, plantillas, polizas, portal,
renovaciones, reportes, siniestros
```

---

## 3. Comparación contra ZIP anterior disponible

Comparación contra `Prototype Development Request (89).zip`:

- **25 archivos agregados**.
- **2 archivos removidos**.
- **49 archivos modificados**.

Agregados relevantes:

- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `core/notify.js`
- `data/academia-plus.js`
- `docs/AUDITORIA-CANDIDATO-CLAUDE-POST-FIX.md`
- `docs/AUDITORIA-SINCRONIAS.md`
- `docs/BACKEND-AMBIENTES-Y-CACHE.md`
- `docs/BITACORA-CAMBIOS.md`
- `docs/BITACORA-ERRORES.md`
- `docs/PENDIENTES-Y-MEJORAS.md`
- `docs/REPORTE-SMOKE.md`
- `docs/paquete-claude-post-v197/*`
- `tools/orbit360-validate-marketing-integraciones.mjs`

Removidos relevantes:

- `.verify-academia.png`
- `Orbit360-demo-standalone.html`

Cambio importante: el standalone viejo fue movido a `docs/legacy/Orbit360-demo-standalone-NO-USAR.html`, lo cual reduce contaminación del árbol operativo, aunque se recomienda excluirlo del ZIP comercial final.

---

## 4. Backend protegido y empalme

### 4.1 Riesgo principal

El ZIP contiene:

```txt
orbit360-platform/data/store.js
```

pero no contiene los archivos backend LAB protegidos de la rama:

```txt
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
```

Por tanto, si se empalma el ZIP completo, existe riesgo de reemplazar el `store.js` protegido del backend activo y perder el adapter/guard LAB.

### 4.2 Decisión obligatoria

Empalmar solo de forma aditiva:

- revisar `index.html` con diff antes de tocarlo;
- traer `modules/`, `core/`, `styles/`, `docs/` solo después de comparar;
- conservar `data/store.js` de la rama backend activa;
- conservar backend LAB, rules y tools;
- excluir o revisar `docs/legacy/*NO-USAR*` antes de una entrega comercial.

---

## 5. Importador inteligente

### 5.1 Mejoras reales que sí trae el candidato

El candidato mejora el importador de forma importante:

- `normPais()` ya **no devuelve GT por defecto**; devuelve vacío si no reconoce país.
- `monedaDe(pais)` queda como sugerencia, no como escritura automática.
- `finmovShape()` marca `requiereValidacion` si falta país/moneda explícita.
- Excel multihoja conserva hoja, país, moneda sugerida, periodo, bloque y fila.
- Excluye hojas soporte por nombre: dashboard, resumen, presupuesto, análisis, producción, metas, etc.
- `documentos` ya no escribe directo en clientes; crea `parchesPendientes` con diff.
- `estados-banco` escribe a `conciliacionBanco`, no a `finmovs`.
- `financiero-historico` excluye títulos/subtotales/totales y marca conceptos de cobro/recaudo como `requiere_validacion`.
- `planillas-comision` existe en `IMPORT_MAP` con comisión esperada vs pagada, diferencia, país, moneda, periodo y validación.
- `SCOPE` declara qué puede crear cada fuente y qué queda bloqueado.
- Hay dry-run y reporte descargable del importador.

### 5.2 Pendientes del importador

Pendientes que siguen abiertos:

1. `applyImport()` todavía escribe en `Orbit.store` cuando el usuario confirma. Para prototipo está bien, pero backend real debe tener dry-run/manifest/validación antes de escritura.
2. `applyConciliacion()` puede aplicar pagos por estado de cuenta cruzando principalmente por póliza y monto. Para producción debe incorporar score de confianza por recibo/cuota/periodo/cliente/aseguradora/país/moneda.
3. El copy de conciliación dice “se crearán al confirmar” en algunos casos; para backend real debe decir “se propondrán / quedarán para validación” cuando no exista aprobación LAB real.
4. Las planillas de comisión ya tienen estructura, pero falta que el flujo visual conecte claramente: fila real → propuesta → validación → impacto en cobros/comisiones/liquidaciones.
5. El importador depende de librerías CDN para Excel/PDF/OCR/Word en prototipo; producción debe mover extracción pesada a backend/servicio seguro.

---

## 6. Pólizas, recibos y cartera

### 6.1 Lo que está correcto

- El motor `core/primas.js` calcula desglose: prima neta, gastos de emisión, gastos financieros, otros, IVA y prima total.
- `core/importa.js` genera recibos desde póliza solo si se cumple:

```txt
estado Vigente o Por renovar
cliente vinculado
país
moneda
forma de pago
prima neta > 0
sin requiereValidacion
```

- Pólizas históricas o incompletas no generan cartera.

### 6.2 Pendientes visuales/UX

- `modules/polizas.js` sigue mostrando en tabla principalmente `p.prima` y un KPI de “Prima vigente” con `GTQ` fijo.
- Falta mostrar de forma visible en pólizas: prima neta, gastos, IVA/impuestos, total, recibos generados, fuente y estado de validación.
- La lista de estados del filtro aún no incluye todos los históricos requeridos: `Anulada` y `Rechazada`.
- Debe quedar visible que cartera activa no es todo lo pendiente histórico, sino recibos pendientes de pólizas vigentes/por renovar del año actual.

---

## 7. Cobros, Portal y Cliente360

### 7.1 Lo que está correcto

- `modules/cobros.js` permite aplicar pago, registrar método, factura opcional y conciliación.
- `modules/portal.js` permite que el cliente reporte pago y adjunte soporte; queda actividad y gestión para validación.
- `modules/cliente360.js` tiene pestañas de pólizas, cobros, recibos, comisiones, historial y documentos.

### 7.2 Pendientes

- Cobros mantiene KPIs y aging con `GTQ` fijo aunque `q.carteraGlobal()` ya devuelve moneda por país.
- Portal debe reforzar visualmente estados: reportado, en revisión, aplicado, conciliado, rechazado/bloqueado.
- Cliente360 debe mostrar trazabilidad de importación/conciliación: archivo, hoja, fila, periodo, país, moneda, usuario/proceso y diff si aplica.
- Los soportes/facturas deben poder verse desde Cliente360 y Portal, no solo quedar como nombre.

---

## 8. Comisiones y finanzas

### 8.1 Lo que está correcto

- `core/comisiones-eng.js` calcula comisión de aseguradora sobre prima neta y comisión del vendedor según configuración.
- `modules/comisiones.js` ya trae pestaña de conciliación.
- `core/queries.js` conserva la regla de que recaudo comercial no crea `finmovs`; `postRecaudo()` queda como firma de compatibilidad sin escribir a finanzas.
- `modules/finanzas.js` tiene lógica amplia de movimientos, cierres, CxC/CxP, liquidaciones y presupuesto.

### 8.2 Pendientes

- Comisiones muestra KPIs y detalle con `GTQ` fijo en varias zonas.
- Conciliación de comisiones aún necesita integración más clara con filas reales importadas desde planillas y con diferencias por periodo, país y moneda.
- Finanzas tiene muchas zonas con `GTQ` fijo; debe heredar país/moneda o separar vistas por país.
- Liquidaciones deben cruzarse con planillas y cartera sin duplicar recaudos como movimientos financieros.

---

## 9. Academia

La candidata trae avances grandes de Academia:

- `data/academia-plus.js` agregado.
- `modules/academia.js` ampliado.
- Bitácora documenta v1.118 a v1.123.
- Incluye rutas y contenido para módulos, productos, liderazgo, servicio, comercial, operación, marketing, cliente y superadmin/IT.

Pendientes:

- asegurar que las rutas Administrativo/Operativo y Cliente nuevo incluyan explícitamente pólizas, recibos, cobros, conciliación, soportes, reportar pago, validación y estados del Portal.
- asegurar progreso/certificados/evaluaciones por usuario en backend real cuando Auth/store real esté listo.
- evitar que Academia desplace el backend crítico.

---

## 10. Textos técnicos visibles y copy comercializable

### 10.1 Mejoras

- El candidato redujo textos técnicos en UI visible.
- Configuración de integraciones usa “Pendiente de conexión” en lugar de estados técnicos crudos en varias zonas.
- Login ya no trae credenciales precargadas.

### 10.2 Pendientes

Persisten textos técnicos o internos en zonas que deben revisarse antes de entrega a cliente:

- `modules/academia.js` incluye recurso “Capacitación técnica interna” con subtítulo “Demo, backend, migración, soporte”. Debe quedar visible solo para Dirección/Admin/IT interno.
- `modules/automatizaciones.js` todavía muestra conceptos de conexión técnica de Make y URLs. Es correcto para Superadmin/IT, pero no debe aparecer para cliente final ni roles no autorizados.
- `modules/configuracion.js` muestra campos de conexión; debe seguir marcado como conexión segura/pendiente, no como activa real.
- `core/integraciones-lab-mock.js` y panel de pruebas deben estar excluidos de UI cliente y roles no técnicos.

---

## 11. Versión/documentación

Hay una inconsistencia documental que Claude debe corregir:

- `docs/AUDITORIA-CANDIDATO-CLAUDE-POST-FIX.md` identifica el candidato como v1.114.
- `docs/REPORTE-SMOKE.md` identifica base congelada v1.117.
- `docs/BITACORA-CAMBIOS.md` llega hasta v1.123 por Academia.
- `docs/PENDIENTES-Y-MEJORAS.md` todavía dice candidato v1.114.

Decisión: la base activa debe documentarse como candidata `2026-07-04T152321.882` con avances acumulados hasta Academia v1.123 y base frontend congelada v1.117. Claude debe unificar esta nomenclatura en README/CHANGELOG/bitácoras/pendientes.

---

## 12. Pendientes prioritarios para Claude

### P0 — debe corregir/conservar antes de nuevo candidato

1. Conservar mejoras del importador: no default GT/GTQ, trazabilidad, `SCOPE`, `parchesPendientes`, `conciliacionBanco`, `planillas-comision`.
2. Corregir/actualizar la documentación de versión: v1.114/v1.117/v1.123.
3. Eliminar `GTQ` fijo en KPIs/agrupados de Pólizas, Cobros, Comisiones y Finanzas; usar moneda del país activo o separar por país.
4. Pólizas debe mostrar prima neta/gastos/IVA/total y no solo prima.
5. Cobros/Portal/Cliente360 deben mostrar estados de validación y conciliación con trazabilidad.
6. Importador debe presentar propuestas/validación, no aplicación productiva cuando backend real no está activo.
7. Mantener paneles técnicos solo para roles técnicos.
8. No tocar backend protegido.

### P1 — siguiente mejora relevante

1. Conectar visualmente planillas de comisión con Comisiones/Finanzas/Liquidaciones.
2. Crear vista de conciliación por aseguradora y por periodo.
3. Reforzar Portal Cliente con facturas/soportes visibles y estado de validación.
4. Academia: evaluaciones aplicadas sobre importación, pólizas, cobros, planillas y portal.
5. Reportes: agregar reportes exportables de cartera, recibos, conciliaciones y comisiones por país/moneda.

---

## 13. Reglas de empalme recomendadas para ChatGPT/Codex

1. No empalmar ZIP completo.
2. Inventariar candidato.
3. Comparar archivo por archivo contra rama `ays/backend-tenant-lab-v99-20260703`.
4. Preservar backend protegido.
5. Traer mejoras del importador con diff manual.
6. Revisar `index.html` por cache-busters y scripts nuevos sin editar a ciegas.
7. Validar `node --check` sobre todos los JS.
8. Ejecutar preflight/plan/preview/diff antes de cualquier integración.
9. No subir datos reales.
10. No merge, no deploy.

---

## 14. Estado final de esta auditoría

- Auditoría del candidato activo realizada sobre archivos reales.
- No se aceptó resumen de Claude sin verificar archivos.
- El candidato activo es útil y debe conservarse como base frontend, con empalme seguro.
- Se requiere paquete Claude actualizado antes de pedir nuevo candidato.
