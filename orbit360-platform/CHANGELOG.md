# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield, commits directos a `main`.

## [0.8.0] — 2026-06-21 · Ops + Leads, Finanzas avanzada, Novedades, Renovación IA
### Added — Ops + Leads (`modules/ops.js`, `modules/leads.js`)
- **Orbit Ops**: kanban operativo (Gestiones Admin, Cotizaciones, Inspecciones, Emisiones, Renovaciones/Modif.), **sin prospectos**, listas personalizables, tarjetas clickeables, enlace a Leads.
- **Orbit Leads**: pipeline por etapa con **probabilidad**, **cadencias** y pronóstico ponderado; convierte a cliente.
- Seed: colecciones `leads`, `gestiones`, `novedades` (`__v=9`).
### Added — Finanzas avanzada
- **Dashboard**: comparativo intermensual e interanual, salud financiera, fijar metas desde datos.
- **Presupuesto**: ingresos (comisiones + financiamiento) y egresos (comisiones + gastos fijos + operación), ppto vs real.
- **Metas**: por asesor/empresa/aseguradora, mensual/anual, sobre **prima NETA**; deriva recaudo.
- **Producción neta** con **ajuste por no devengado** (cancelaciones).
- **Liquidación asesores**: el asesor ve **solo su** liquidación; pagos cruzables/ajustables.
### Added — Novedades / Incentivos (`core/novedades.js`)
- Tablón con **contador** de no leídas (campana), **modal grande al ingresar** (1/día), publicación por todo el equipo.
### Added — Renovación inteligente (Cliente 360)
- **Renovar** modificando N.º de póliza, **aseguradora**, prima, producto (renovación con otra aseguradora).
- **Comparativo IA**: renovación vs actual con análisis crítico y recomendación; cargar propuesta y enviar al cliente.

## [0.7.0] — 2026-06-21 · Finanzas + Calidad de datos + Plantillas
### Added — Orbit Finanzas (`modules/finanzas.js`, `#/finanzas`)
- **Movimientos**: KPIs (recaudo, comisión a cobrar, a pagar asesores, vencida), tabla, importar histórico, generar cierre mensual.
- **Liquidación empresa**: comisión a **cobrar a cada aseguradora** (prima neta recaudada), conciliable contra planilla.
- **Liquidación asesores**: % fijo/variable por asesor sobre **prima neta recaudada** (no sobre venta); a pagar / pendiente / liquidar.
- **Conciliación bancaria**: doble conciliación (depósito↔recaudo y pago↔póliza); importar estado bancario.
### Added — Importación
- KIND **`estados-banco`** (estado de cuenta bancario, cualquier formato) con detección.
- **Planillas de comisiones** ahora con detección: pagos no aplicados y validación de liquidación por asesor.
### Added — Calidad de datos (`modules/calidad.js`, `#/calidad`)
- Reporte de **expedientes incompletos**, prioridad **teléfono › dirección › resto**, foco en **póliza vigente**; campaña de actualización por **WhatsApp** (con tel) o **correo** (sin WA, con email). `seed __v=8` con clientes incompletos.
### Added — Plantillas de mensajes (`modules/plantillas.js`, `#/plantillas`)
- Plantillas WhatsApp/correo (propuesta, prima pendiente, actualización de datos, renovación, bienvenida) con variables; editables y persistentes.
### Added — Configuración interna
- **Planes comercializables**: importar catálogo o **crear plan**; editable por acuerdos/promos. Asignación de plan configura funcionalidades.

## [0.6.0] — 2026-06-21 · Configuración (sin código) + detección en cartera
### Added — Configuración (dos niveles)
- **`Orbit.tenant`** (config.js): fuente única de la cuenta — `plan`, `modulosActivos[]`, `branding`, `paises[]`, `addons`, `portalVisibility`, `apis`. Persistente.
- **`Orbit.PLANES`** (Estándar / Profesional / Personalizado) y **`Orbit.ROLES`** (Dirección, Admin, Finanzas, Asesor, Asistente).
- **Módulo Configuración** (`modules/configuracion.js`, `#/configuracion`):
  - *Self-service del cliente* (según plan): Marca (logo, paleta, menú claro/oscuro, auto-branding IA por manual de marca), Usuarios y permisos (roles, comisión, metas), Países y monedas (multipaís, no se mezclan), Integraciones (Make, Drive, WhatsApp), APIs (cifradas, scopes, por rol), Plan.
  - *Interna (Orbit)*: banner privado, asignación de plan y **selección de módulos activos por cliente** → el sidebar se ajusta solo.
- **Sidebar dinámico**: filtra por `tenant.modulosActivos`; `router.rebuildSidebar()` en caliente.
### Added — Importación de estados de cartera
- **Detección** en estados de cuenta (cualquier formato): **recibos no creados** y **pagos no aplicados**; conciliación **no-duplicante**.

## [0.5.0] — 2026-06-21 · Ficha rediseñada + campos + importación en ficha
### Changed
- **Ficha cliente rediseñada**: header con chips de contacto, KPIs con acento e ícono, **menú interno tipo píldoras con íconos** (ya no se corta), bandera de país.
### Added
- **Campos extendidos** (editables, cascada): país → departamento → ciudad, dirección, canal, **contacto alterno (check)**, fecha de nacimiento, sexo (segmentación). `seed __v=7`.
- **Importar al expediente** (`importa.openFor`): multi-archivo, vincula al cliente, asocia vehículo a póliza/cliente; tipos **facturas** y **documentos** (DPI/RTU/patente).
- **Comisiones**: % por asesor, fija/variable; nota de base (prima neta, sobre recaudada).
- **WhatsApp** en renovaciones y ficha. **Sidebar claro/oscuro** con auto-contraste. **FIX** deep-link abre la pestaña correcta.

## [0.4.0] — 2026-06-21 · UI ronda 2 + Expediente del cliente
### Changed (refinamiento UI)
- **Topbar blanca** con **slot de logo del cliente** (white-label).
- **Sidebar**: títulos de grupo con **cintilla** (barra de acento) + texto blanco de mayor contraste.
- **Header de módulo tipo banda** (oscuro, ícono + título + descriptor rojo + features) vía `K.banner`/`K.bannerFor` y registro `Orbit.MODULE_TITLES` (personalizable por plantilla). Aplicado a CRM global, Inicio, Importa.
- **Login**: órbita sobre fondo claro y sobrio, **ambos anillos giran** (con dots), núcleo = marca del cliente, **footer centrado** con texto blanco corregido.
- Ícono de Inicio: **🌅** (sol) en lugar de asterisco.
### Added (Expediente del cliente)
- **Vehículos** (pestaña + datos por póliza de auto: placa, marca/línea, año, uso, color, VIN, motor, suma asegurada) — `seed __v=6` con colección `vehiculos`.
- **Recibos y pagos**: recibos por forma de pago + **aplicar pago** (concilia recibo↔póliza).
- **Comisiones**: split **vendedor/empresa** con **visibilidad por rol** (empresa interna, configurable).
- **Contacto alterno** + Drive link editables en la ficha.
- Queries `vehiculosDe`, `vehiculoDePoliza`.
- Docs: PLAN actualizado (Expediente + modelo de Configuración en dos niveles + visibilidad Portal).

## [0.3.0] — 2026-06-21 · Infraestructura transversal (white-label)
### Added
- **Theming / paleta seleccionable** (`core/theme.js`): 6 paletas, cambia el color primario en toda la plataforma y el login. Default Rojo Orbit. Persistente. Picker en topbar (🎨) y en login.
- **Login white-label** (`core/auth.js` + markup en `index.html` + `styles/infra.css`): órbita dinámica animada, palette-adaptive, slot de logo del cliente, gate de sesión demo + logout.
- **Operación multipaís**: `Orbit.PAISES` + switcher en topbar (Todos / GT / CO).
- **Importación inteligente** (`core/importa.js` + `modules/importar.js`): drawer/wizard reutilizable (cargar → extracción → confirmar) que acepta cualquier formato; hub con 9 secciones (base inicial, clientes, pólizas, vehículos, directorio aseguradoras, estados de cuenta, planillas comisiones, movimientos finanzas, calendario marketing). Estados de cuenta despliegan recibos por forma de pago y permiten aplicar pagos por póliza.
- **Cliente 360**: ficha **editable** (modal: nombre, contacto, asesor, segmento, Drive link, notas), **link de Drive**, hook de importación, **gestionar renovaciones** desde la ficha.
- **Config**: nav nuevos (Importación inteligente, Reportes, Portal del Cliente) + metadata; `seed __v=5` con `driveLink`.
- **Docs**: `docs/PLAN-INFRAESTRUCTURA.md` (plan maestro con todos los requisitos).

## [0.2.0] — 2026-06-20 · CRM vistas globales
### Added — núcleo CRM completo (vistas por cartera)
- **CRM Kit** (`core/crmkit.js`): piezas compartidas (page head, KPI row, celdas cliente/asesor/aseguradora, barra de filtros con wiring) para módulos delgados y consistentes.
- **Pólizas** (`modules/polizas.js`, `#/polizas`): cartera completa con KPIs, filtros (búsqueda en vivo, ramo, aseguradora, asesor, estado) y tabla enlazada a Cliente 360.
- **Cobros y cartera** (`modules/cobros.js`, `#/cobros`): KPIs de cartera, **aging** de vencidos (1–30/31–60/61–90/90+), tabla con conciliación pago↔póliza.
- **Renovaciones** (`modules/renovaciones.js`, `#/renovaciones`): tablero kanban por urgencia (vencidas/≤15/16–45/46–90 d) con prima en juego.
- **Cancelaciones** (`modules/cancelaciones.js`, `#/cancelaciones`): motivos, valor perdido y tasa de fuga.
- **Comisiones** (`modules/comisiones.js`, `#/comisiones`): generada vs liquidada con cortes por asesor / aseguradora / periodo.
- **Historial** (`modules/historial.js`, `#/historial`): feed cronológico de la cartera agrupado por día, con KPIs por tipo.
- **Queries** (`core/queries.js`): nuevas agregaciones `agingVencido()`, `comisionesPor(campo)`, `norm()`.
- Docs: `docs/crm-vistas-globales.md`.

## [0.1.0] — 2026-06-20 · Fundación + CRM Cliente 360
### Added — Paso 1: Shell + capa de datos + tokens
- **Shell** (`index.html`): topbar (marca Orbit 360, búsqueda, badge demo, usuario), sidebar agrupado y host de contenido. Responsive con sidebar colapsable en móvil.
- **Tokens** (`styles/tokens.css`): paleta de marca (rojo #C5162E, grafito #1E2227), tipografías (Manrope / Source Sans 3 / JetBrains Mono), escalas de radio, sombra y espaciado.
- **Base** (`styles/base.css`): componentes compartidos — KPIs, tablas, badges, botones, tabs, avatares, drawer, controles de formulario.
- **Capa de datos** (`data/store.js`): API única (`all/get/where/find/insert/update/remove/on`) sobre localStorage, swappable a backend. Versión de seed con re-siembra.
- **Seed ficticio** (`data/seed.js`): universo relacional determinista — 5 asesores, 6 aseguradoras, 20 clientes, pólizas, cobros, comisiones, actividades y cancelaciones.
- **Core**: `ui.js` (formato moneda/fecha, avatares, badges de estado), `config.js` (navegación + metadatos de módulos), `queries.js` (agregaciones de negocio), `router.js` (sidebar + router por hash con query params).

### Added — CRM · Cliente 360 (núcleo de oro)
- **Lista de cartera**: KPIs (clientes, pólizas activas, prima vigente, por renovar), filtros (búsqueda en vivo, tipo, país, segmento, asesor), tabla con asesor, pólizas, prima, estado de cartera y barra de salud.
- **Ficha 360 (el "cerebro")**: encabezado con datos de contacto, asesor, segmento, score de salud, y banda KPI (pólizas vigentes, prima anual, cartera al día/vencida, comisión generada).
- **Desglose** por pestañas:
  - *Resumen*: próximas acciones, distribución de cartera por ramo, actividad reciente.
  - *Pólizas*: detalle por ramo/producto/aseguradora/vigencia/estado.
  - *Cobros y cartera*: cuotas con estado y bandera de **conciliación** (pago ↔ póliza).
  - *Renovaciones*: línea de tiempo por póliza con días a vencer.
  - *Comisiones*: por periodo, base, %, monto y estado (devengada/liquidada).
  - *Historial*: timeline + alta de interacción (escribe en la capa de datos).
- **Deep-link**: `#/cliente360?c=<id>` desde Inicio y desde la lista.

### Added — Orbit Inicio (Mi Día)
- Metas del mes (diales prima/recaudo), KPIs de cartera, avance por asesor (leaderboard) y prioridades (renovaciones próximas + cobros vencidos), todo derivado del CRM.

### Notes
- Los módulos no construidos muestran una pantalla de estado honesta con su alcance objetivo.
- Pendiente backend real: reimplementar `store` manteniendo la API.
