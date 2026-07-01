# Auditoría funcional para Claude — Orbit 360 v1.41 / Fase Backend LAB

Fecha: 2026-06-30  
Estado: ABIERTO / aplicar a prototipo base  
Fuente: revisión visual de Paula + auditoría focalizada de código por ChatGPT durante Fase 2 Store Firestore LAB.  
Objetivo: documentar hallazgos de profundidad funcional, autoadministración, datos vivos, sincronías financieras, analítica, manuales, academia, configuración e inteligencia para que Claude los corrija en el prototipo base sin romper la arquitectura comercializable.

---

## 0. Regla de interpretación

La plataforma no debe considerarse “completa” solo porque renderiza o porque un botón abre una vista. Para Orbit 360, un módulo se considera listo únicamente si cumple:

1. Lee datos vivos desde `Orbit.store`.
2. No usa datos de negocio hardcodeados fuera de `data/seed.js` para demo ficticio.
3. Es autoadministrable: crear, editar, eliminar, cambiar estado, gestionar catálogos/listas desplegables y permisos.
4. Sus KPIs son clicables y muestran detalle explicable.
5. Sus acciones impactan los módulos conectados.
6. Sus flujos alimentan analítica, IA, cotizador, comparativo, academia, marketing, finanzas y reportes.
7. Está preparado para backend multi-tenant sin tocar módulos.
8. No muestra etiquetas técnicas al cliente final, como BETA, NÚCLEO o PRÓX., salvo en modo interno/superadmin/dev.

---

## 1. Validación visual de Paula — modo normal/local

Resultado general: la plataforma abrió, permitió login y navegación. Se validó visualmente Inicio, Pólizas, Cobros, Finanzas y Configuración. No se reportó pantalla blanca ni caracteres raros durante esta validación.

Hallazgos visuales principales:

- El tablón de novedades aparece y visualmente gusta.
- El tablón debe ser clicable y dirigir a la sección donde se gestiona o amplía cada novedad.
- Se debe confirmar que el aviso de Inicio lee datos vivos y no está hardcodeado.
- Se debe confirmar que la plataforma detecta la fecha correcta.
- Desde una póliza no se puede ir directamente a cliente; ese acceso es necesario.
- Desde Cobros y cartera se debe poder aplicar pago y abrir detalle con acceso a cliente y póliza.
- KPIs financieros no despliegan detalles.
- Dashboard financiero está básico y requiere profundidad.
- CxC/CxP no abren detalle, no permiten editar/eliminar/cambiar estado con impacto completo.
- Presupuesto no permite edición/eliminación ni replicación controlada del mes siguiente.
- Liquidaciones no permiten edición suficiente.
- Configuración aparece como próximamente o incompleta pese a que estaba marcada como terminada.
- Paleta de marca se ve incompleta y no permite desplazamiento correcto.
- Usuarios y permisos no permite administración profunda.
- APIs y credenciales está demasiado básico.
- Manuales no funcionan correctamente.
- Academia y cursos se perciben superficiales frente a lo prometido como profundo.
- Falta benchmarking funcional contra plataformas líderes.
- Analítica y metas requieren mucha más profundidad.

---

## 2. Hallazgos técnicos confirmados en código

### 2.1 Fecha hardcodeada — P0

Archivo: `core/ui.js`  
Hallazgo: `Orbit.ui` usa una fecha fija `new Date('2026-06-20')`. Esto afecta `daysFromNow`, renovaciones, vencimientos, aging, seguimientos y alertas temporales.

Requerimiento:

- Reemplazar por fecha real dinámica.
- Permitir fecha simulada solo en modo demo/dev explícito.
- Mostrar mes/año dinámicos en Inicio, Finanzas, Metas y Reportes.
- Registrar prueba visual con fecha actual real.

### 2.2 Novedades con fecha/modal hardcodeado — P0

Archivo: `core/novedades.js`  
Hallazgo: el modal usa `const hoy = '2026-06-21'`. Las novedades se leen desde store, pero la lectura/no lectura se persiste por `localStorage`.

Requerimiento:

- Usar fecha real dinámica.
- La lectura/no lectura debe ser por usuario/tenant cuando haya backend.
- Cada novedad debe tener `targetType`, `targetId`, `ctaLabel`, `route`, `detalleExtendido`, `prioridad`, `vigenciaDesde`, `vigenciaHasta`, `audiencia/roles`.
- En modal y tablón, clic debe abrir detalle o navegar al módulo relacionado.
- Ejemplos: incentivo de pólizas Auto → metas/producción/listado Auto; nuevo producto Salud → Academia/Aseguradoras/material comercial; cierre de mes → Finanzas/CxC/CxP/tareas del cierre.

### 2.3 Inicio parcialmente vivo, pero con metas y mes hardcodeados — P0

Archivo: `modules/inicio.js`  
Hallazgo: Inicio sí consulta `carteraGlobal`, `primaVigenteGlobal`, `renovacionesProximas`, `cobrosVencidos`, `leaderboard`, clientes y pólizas desde `Orbit.store`, pero usa valores fijos para metas (`820000`, `760000`) y texto fijo “Junio 2026”.

Requerimiento:

- Las metas deben venir de una colección/entidad autoadministrable: `metas`.
- El mes debe ser dinámico.
- El avance ideal debe calcularse contra días transcurridos del mes.
- Cada KPI debe abrir detalle: cartera al día, pendiente, vencida, renovaciones, prima vigente, recaudo aplicado.
- Avance por asesor debe ser clicable y mostrar detalle por asesor: producción, recaudo, renovaciones, cartera, aseguradoras, ramos, clientes, cumplimiento vs ideal.

### 2.4 Normalización de monedas debe revisarse — P0

Archivo: `core/queries.js`  
Hallazgo: algunas funciones normalizan COP dividiendo por 1000 para mezclar totales con GTQ. Esto contradice la regla de no mezclar monedas sin conversión explícita.

Requerimiento:

- Mostrar totales por país/moneda.
- Si se requiere consolidado, usar tasa explícita configurable por país y fecha.
- Indicar siempre moneda y tipo de cambio aplicado.
- No usar divisiones aproximadas fijas dentro de lógica de negocio.

### 2.5 Finanzas tiene mezcla de lógica real y demo hardcodeado — P0

Archivo: `modules/finanzas.js`

Hallazgos:

- Movimientos sí tienen CRUD básico.
- CxC/CxP se deriva de `finmovs`, pero la fila solo cambia estado; no abre detalle completo.
- Presupuesto usa arrays hardcodeados de ingresos/egresos y no lee completamente `presupuesto` del store.
- Hay una función `resumen()` con movimientos de ejemplo hardcodeados.
- Crear mes copia partidas de presupuesto, pero no resuelve arrastre de CxC/CxP, ni replica presupuesto editable con control.
- KPIs financieros carecen de detalle profundo.
- Liquidación empresa/asesores existe visualmente, pero requiere flujo contable/operativo completo.

Requerimiento de rediseño funcional:

- Finanzas debe ser un módulo profundo, no solo render con tablas.
- Todo KPI debe abrir modal/drawer con desglose, filtros por periodo/país/moneda/asesor/aseguradora/ramo, comparativo mensual e interanual, gráfico + tabla exportable y acciones.
- CxC debe permitir crear, editar, eliminar, cambiar estado, adjuntar factura y asociar cobro/factura/aseguradora/póliza/planilla.
- CxP debe permitir crear, editar, eliminar, cambiar estado, programar pago, adjuntar soporte y asociar liquidación/asesor/proveedor.
- Si una CxC no se recauda en el mes, debe arrastrarse automáticamente al siguiente mes.
- Si una CxP no se paga en el mes, debe arrastrarse automáticamente al siguiente mes.
- Los estados deben impactar movimientos: CxC esperada → facturada → recaudada → finmov ingreso → conciliación; CxP pendiente → programada → pagada → finmov egreso → conciliación.
- No duplicar movimientos si el estado cambia varias veces.
- Debe existir trazabilidad/auditoría por cambio.

### 2.6 Flujo de comisiones, CxC y CxP — P0

Requerimiento de flujo:

1. Se carga planilla de comisiones de aseguradora.
2. Se concilia contra pólizas/cobros/comisiones.
3. Se crea o actualiza CxC por aseguradora/periodo.
4. Se puede cargar factura de la CxC y cambiar estado a facturado.
5. Al recibir pago, pasa a recaudado y genera movimiento financiero.
6. La liquidación de comisiones de asesores se calcula contra prima neta recaudada y planilla conciliada.
7. Se genera CxP por asesor/periodo/lote.
8. Al pagar asesores, se genera movimiento egreso y se marca liquidación como pagada.
9. Todo debe alimentar analítica, metas, reportes y dashboard financiero.

### 2.7 Cobros aplica pago, pero no completa sincronía financiera — P0

Archivo: `modules/cobros.js`  
Hallazgo: aplicar pago actualiza el cobro y crea actividad, pero no se evidencia generación completa de movimiento financiero ni sincronía de CxC/CxP. El detalle permite ver póliza, pero falta acceso directo a cliente.

Requerimiento:

- En detalle de cobro agregar CTAs: Ver cliente, Ver póliza, Aplicar pago, Adjuntar factura/soporte, Ver movimiento financiero asociado.
- Aplicar pago debe actualizar cobro, crear actividad, crear/actualizar movimiento financiero, crear/actualizar comisión devengada/liquidable, disparar automatización `pago_aplicado` y actualizar dashboards/metas/analítica.
- Desde la tabla de cobros, tener acción rápida “Aplicar pago” sin depender únicamente del drawer.

### 2.8 Pólizas requiere navegación a cliente desde detalle — P1

Archivo: `modules/polizas.js`  
Hallazgo: tabla abre `cliente360.verPoliza(id)` y muestra cliente como celda, pero Paula evidenció que estando en póliza no puede ir al cliente.

Requerimiento:

- En detalle de póliza agregar CTA “Ver cliente”.
- En tabla, permitir clic independiente en cliente sin que el click de fila lo impida.
- Mantener acceso a cobros, renovaciones, documentos, vehículo, aseguradora y asesor desde la póliza.

### 2.9 Configuración incompleta para comercialización — P0

Archivo: `modules/configuracion.js`  
Hallazgo: existe estructura de configuración por tabs, marca, usuarios, países, integraciones, APIs, planes e interna. Sin embargo, visualmente aparece insuficiente y parte como próximamente. No cumple todavía el nivel de autoadministración necesario.

Requerimiento mínimo:

- Configuración debe ser el centro de autoadministración integral.
- Debe administrar marca, logo, favicon, PWA, paleta, tipografías, usuarios, roles, permisos, módulos visibles, países, monedas, impuestos, glosario, aseguradoras, contactos, accesos, productos, tarifas, documentos, planes comercializables, integraciones, APIs, automatizaciones, legales/NDA, manuales y academia.
- La elección de paleta debe permitir scroll y aplicar a toda la plataforma.
- Usuarios y permisos debe permitir CRUD completo.
- Las etiquetas BETA/NÚCLEO/PRÓX. no deben mostrarse al cliente final.

### 2.10 Add-ons, APIs y credenciales demasiado básicos — P0

Requerimiento:

- Crear catálogo comercial de add-ons con nombre, utilidad, valor agregado, beneficios, requisitos, pasos de configuración, costo/plan, responsable técnico, estado de conexión, prueba de conexión, riesgos/alcance de datos y manual relacionado.
- No exponer credenciales en front. En prototipo puede simularse UI, pero el texto debe ser de usuario, no notas técnicas visibles.

### 2.11 PWA, favicon y auto-branding — P1

Archivo: `core/pwa.js`  
Hallazgo: existe lógica para manifest dinámico, favicon/apple-touch-icon desde logo del cliente, `beforeinstallprompt` e instalación. Falta validación visual completa por navegador/dispositivo y sincronía con auto-branding.

Requerimiento:

- Verificar en Chrome/Edge/Android/iOS.
- El acceso directo debe usar favicon/logo del cliente si está cargado.
- La app debe sugerir instalación automáticamente cuando el navegador lo permita.
- Al cambiar logo/paleta, debe refrescar manifest/favicons.
- Auto-branding debe aplicar a login, topbar, sidebar, módulos, documentos, manuales, Academia, correos y PDFs.

### 2.12 Manuales no funcionan correctamente — P0

Archivo: `modules/academia.js`  
Hallazgo: el lector de manuales intenta abrir varios HTML en `docs/`. En validación local, la capacitación técnica no cargó.

Requerimiento:

- Garantizar que todos los manuales existan dentro del ZIP final en `docs/`.
- Cargar manuales en iframe o visor interno sin pantalla rota.
- Exportar a PDF.
- Manuales en formato Orbit 360 por rol: Dirección/superadmin, Administración, Finanzas, Operaciones/CRM, Asesor, Marketing, Configuración, Integraciones, Add-ons, Automatizaciones, Backend/migración/soporte.
- Cada add-on/integración debe tener manual de beneficio, configuración y operación.

### 2.13 Academia: IA/archivos embebidos todavía no es inteligencia completa — P0

Archivo: `modules/academia.js`  
Hallazgo: hay edición de lecciones, tipos video/lectura/quiz/recurso y adjuntos embebidos. Pero la lectura real de archivos para IA es limitada: texto plano funciona; PDF/DOCX/imagen no se extraen realmente en front.

Requerimiento:

- Al agregar lección con archivo, debe guardarse/embeberse, extraerse texto, alimentar IA, generar resumen/lección/quiz/glosario/recursos/objetivos/evaluación y quedar asociado como fuente consultable.
- Implementar extracción backend para PDF, Word, imagen/OCR y enlaces de Drive.
- Cursos por rol deben ser profundos, no superficiales.
- Cursos iniciales de seguros deben cubrir conceptos de seguros, pólizas, recibos, comisiones, siniestros, renovaciones, venta consultiva, operación por país, cumplimiento y confidencialidad.
- La Academia debe interalimentarse con documentos de aseguradoras, marketing, cotizador/comparativo y Orbit IA.

### 2.14 Analítica e Insights requieren profundidad — P0

Requerimiento:

- Analítica debe ir de general a particular: empresa, país, asesor, aseguradora, ramo/producto, cliente/segmento, marketing, finanzas, cartera/cobros y comisiones.
- Cada sección debe mostrar KPIs clicables, gráficos, tablas, comparativos intermensuales, comparativos interanuales, % avance vs meta, % avance vs ideal por día del mes, semáforos, análisis crítico por IA y recomendaciones accionables.
- Debe incluir analítica de marketing: calendario, campañas, canal, contenido, leads generados, conversión a negocios/pólizas, costo por lead/costo por adquisición si hay pauta, ranking de contenidos.
- Dashboard de metas necesita profundidad por asesor, aseguradora y ramo.

### 2.15 Metas inteligentes — P0

Requerimiento:

- Crear sección de asignación de metas mensuales/anuales.
- Metas deben calcularse de forma inteligente con promedio histórico mensual, objetivo de crecimiento, gastos fijos y variables, recaudo requerido, rentabilidad esperada, cartera pendiente, capacidad del asesor, campañas/estacionalidad.
- Metas deben existir para ventas/prima neta, recaudo, comisiones, renovaciones, retención, cartera vencida y marketing.
- Las metas se reflejan en Inicio, Finanzas, Analítica, Equipo y Reportes.

### 2.16 Autoadministración transversal — P0

Requerimiento:

Todos los módulos deben revisarse con matriz CRUD: crear, editar, eliminar, cambiar estado, duplicar cuando aplique, importar, exportar, adjuntar documento, abrir detalle, navegar a entidades relacionadas, configurar listas desplegables, permisos por rol, historial/auditoría e impacto en módulos conectados.

Módulos a auditar: Inicio, Cronograma, Ops, Leads, Aseguradoras, Cotizador, Comparativo, Clientes 360, Pólizas, Cobros y cartera, Renovaciones, Cancelaciones, Siniestros, Historial y actividades, Comisiones, Importar, Marketing, Notificaciones, Correo, Academia, Reportes/Analítica, Portal cliente, Automatizaciones, Finanzas, Calidad, Plantillas, Configuración, Equipo y permisos.

---

## 3. Benchmark funcional inicial — plataformas líderes

Fuentes revisadas:

- Vertafore AMS360: gestión de agencia con cliente/póliza, billing/invoicing, payment tracking, reconciliación, comisiones, reportes financieros, integraciones, IA y workflows conectados.
- HawkSoft: agency management con pólizas, tareas, documentos, analytics/reporting, trust accounting, comisiones, carrier downloads, API/integraciones y comunicaciones.

Lectura para Orbit 360:

- El estándar de mercado no es solo CRM. El valor está en que CRM, pólizas, contabilidad/finanzas, comisiones, documentos, comunicaciones, automatizaciones, analítica e IA estén conectados en flujos reales.
- No basta con pantallas aisladas. Cada acción debe actualizar entidades relacionadas y analítica.

| Área | Estándar esperado en plataformas líderes | Estado Orbit observado | Pendiente Orbit |
|---|---|---|---|
| Cliente/póliza | Datos centralizados, búsqueda, relación cliente-póliza-documentos | Existe base, falta navegación completa desde póliza/cobros | CTAs cruzados y detalle profundo |
| Finanzas/accounting | Billing, invoicing, tracking, reconciliation, producer commissions, reportes | Finanzas renderiza, pero superficial y con hardcodes | Flujo CxC/CxP/liquidación/conciliación completo |
| Comisiones | Cálculo y estados vinculados a prima recaudada | Parcial | Conciliar planilla, crear CxC/CxP y liquidar asesores |
| Reportes/BI | KPIs, tendencias mensuales/trimestrales/anuales, salud financiera | Básico | Analítica general→particular con tablas/gráficos/IA |
| Automatización | Workflows, carrier downloads, propuestas, renovaciones, comunicaciones | UI parcial | Wiring real y eventos con Make/backend |
| Documentos | Gestión documental por cliente/póliza y operación | Parcial | Visores, adjuntos, Drive/Storage, auditoría |
| Portal/app | Acceso cliente/asesor, móvil, instalable | PWA existe, validar | Instalación y branding por cliente |
| Integraciones/API | Conectores con carriers, CRMs, marketing, contabilidad | Catálogo visual | Configuración profunda, pruebas y manuales |
| IA | Email, conciliación, análisis, extracción, recomendaciones | Mock/parcial | IA real, fuentes, embeddings, trazabilidad |

---

## 4. Requerimiento transversal de datos e inteligencia

Toda información cargada en el sistema debe alimentar el modelo de datos, Orbit IA, cotizador, comparativo, academia, aseguradoras/productos, marketing, finanzas, analítica/reportes, portal cliente y automatizaciones.

Regla: ningún módulo debe ser isla. Cada acción debe tener impacto claro en entidades relacionadas.

Ejemplos:

- Aseguradora/producto/tarifa/documentos → Cotizador, comparativo, academia, IA, marketing.
- Póliza emitida → cobros, comisiones, actividades, calendario, renovaciones, documentos, portal, automatización de bienvenida.
- Pago aplicado → Cobro, comisión, finanzas, cartera, actividad, analítica, WhatsApp/correo.
- Planilla comisión → CxC, factura, comisión empresa, liquidación asesor, finanzas, reportes.
- Campaña marketing → leads, negocios, conversión, costo, analítica, contenidos y calendario.
- Curso/Manual → permisos por rol, academia, onboarding, IA y soporte.

---

## 5. Prioridad de trabajo para Claude

### P0 — Antes de decir “completo”

1. Fecha dinámica global y eliminación de hardcodes de negocio.
2. Novedades clicables, con detalle y rutas.
3. Finanzas profundo: CxC/CxP, presupuesto, liquidaciones, movimientos, conciliación y KPIs con detalle.
4. Configuración profunda y autoadministrable.
5. Manuales funcionales y exportables.
6. Academia profunda con archivos como fuentes reales.
7. Analítica y metas inteligentes.
8. Matriz CRUD/autoadministración en todos los módulos.
9. Navegación cruzada entre cliente, póliza, cobro, aseguradora, asesor y finanzas.
10. Documentar cada cambio en CHANGELOG/BITÁCORAS.

### P1 — Mejoras comerciales

1. Benchmarking ampliado con Applied Epic, Vertafore AMS360, EZLynx, HawkSoft, AgencyBloc, Salesforce Financial Services Cloud y CRMs/ERPs relevantes.
2. Documento comparativo Orbit 360 vs mercado en formato Orbit.
3. Paquetes comerciales de add-ons y servicios.
4. Manuales por rol y por integración.
5. PWA por cliente validada en navegadores/dispositivos.

---

## 6. Instrucción para Claude

Claude debe trabajar sobre el prototipo base Orbit 360, no sobre una bifurcación de A&S.

No debe:

- hardcodear A&S
- tocar `data/store.js` de backend
- hacer que módulos usen `localStorage` directo para datos operativos
- marcar módulo como completo solo por renderizar
- mostrar notas técnicas al usuario final
- mostrar BETA/NÚCLEO/PRÓX. al cliente final

Debe:

- corregir prototipo base
- documentar cada cambio
- mantener white-label
- mantener `Orbit.store`
- validar visualmente cada módulo
- entregar ZIP completo actualizado
- indicar si cambió esquema de datos

---

## 7. Estado

ABIERTO — aplicar al prototipo base Orbit 360.  
Mientras Claude trabaja esta profundización, ChatGPT continúa backend Firestore/Auth/Storage/Make/IA por etapas conservando `data/store.js` y sin perder cambios locales.
