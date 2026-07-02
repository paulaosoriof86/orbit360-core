# Orbit 360 · Plan de infraestructura maestro

> Registro vivo de **todos** los requisitos de producto para la versión real comercializable.
> Marca: **decisiones de infraestructura primero, render después**. Lo que no está construido se documenta como alcance honesto y se ordena por prioridad — no se "pinta" UI vacía.
> Esta misma plataforma se **adapta para Alianzas** (white-label): por eso theming, logo y textos son configurables y nada de A&S va en el chrome.

---

## 0. Principios de arquitectura (ya implementados)
- **Capa de datos única** (`data/store.js`): los módulos nunca tocan localStorage; mañana se cambia por backend con la misma API.
- **Una fuente de navegación** (`core/config.js` → `Orbit.NAV` + `Orbit.MODULE_META`).
- **CRM Kit** (`core/crmkit.js`) y **queries** (`core/queries.js`) compartidos.
- **Estados honestos** por módulo: `core` (Núcleo) · `beta` · `road` (Próx.).
- **Regla de contraste**: todo fondo oscuro lleva texto claro (topbar, sidebar, login, banners). No excepciones.

## 1. White-label / Theming  ✅ infraestructura
- **Paleta seleccionable por el cliente** (`core/theme.js`): cambia el color primario en todo (incluye login, títulos "comparativos", badges, KPIs). Default = **Rojo Orbit #C5162E** (regla de marca); alternas para clientes white-label (p. ej. Alianzas).
- Persistente por navegador. Neutrales grafito constantes (chrome de marca).
- **Logo personalizable** del cliente en login y topbar (slot). Para demo: Orbit 360.

## 2. Login  ✅ infraestructura
- **Órbita dinámica** (nodos del ecosistema girando alrededor del núcleo), **palette-adaptive** y con **slot de logo**. Versión propia Orbit 360 (no A&S).
- Gate de sesión (demo) + logout en el menú de usuario.

## 3. Operación multipaís  ✅ infraestructura
- Switcher de país (GT / CO …) en topbar; cada país define moneda, formatos y catálogo de aseguradoras. Filtra la operación.

## 4. Importación inteligente (transversal)  ✅ scaffold · ⏳ motor
- **Capa única `core/importa.js`**: drawer/wizard reutilizable por todos los módulos. "Extracción inteligente" que **acepta cualquier formato** (PDF, Excel, CSV, imagen, planilla) y mapea a la entidad destino.
- **Secciones de importación** que deben existir (registradas en config):
  1. **Base de datos inicial** (carga completa al arrancar).
  2. **Clientes** · 3. **Pólizas** · 4. **Vehículos** · 5. **Directorio de aseguradoras**.
  6. **Estados de cuenta** de aseguradoras → habilita **conciliación**.
  7. **Planillas de comisiones**.
  8. **Movimientos / estados de cuenta** en Finanzas (histórico + mensual).
  9. **Calendarización de contenidos** (Marketing).
- Al importar estados de cuenta: **desplegar recibos de pago según forma de pago** y permitir **aplicar pagos por póliza** (doble conciliación pago↔póliza).

## 5. Núcleo CRM  ✅ construido
Cliente 360, Pólizas, Cobros, Renovaciones, Cancelaciones, Comisiones, Historial.
### Pendientes del expediente del cliente (siguiente iteración)
- **Ficha editable** (toda la info), **asesor por cliente** visible y editable.
- **Gestionar renovaciones desde la ficha**.
- **Link de Drive** con documentos del cliente (campo).
- Expediente **completo**: realizar ahí todas las gestiones, **automatizaciones**, **recordatorios**.
- Desplegar **recibos**; aplicar pagos por póliza desde la ficha.

## 6. Ops + Leads  ⏳ road
- **Ops tipo Kanban (Trello) colorido y llamativo**; todo clickeable a detalle.
- **Ops y Leads sincronizados** entre sus listas.
- **Automatización de seguimiento por cadencias** en ambos.

## 7. Aseguradoras  ⏳ beta
- **Ficha editable por aseguradora** (contactos, accesos, clausulados, pólizas ejemplo).
- **Importación de directorio**.
- **Fusión** con la info de aseguradoras del **Cotizador**.
- **Link de Drive** por aseguradora.
- Alimenta a Orbit IA.

## 8. Cotizador + Comparativo  ⏳ integrar (desarrollado aparte)
- El **Cotizador** (con **Comparativo**) está desarrollado por separado; el HTML se compartirá.
- **Decisión recomendada: integrarlo de una vez** como módulo embebido y seguir configurándolo desde la plataforma (evita rework y "no se tuvo en cuenta"). Cuidar de **no romper lo actual**: se integra como ruta/módulo aislado.
- Multicompañía; comparativo lee coberturas (IA) y recomienda. Títulos adaptan a la paleta.

## 9. Finanzas  ⏳ beta
- **Importar estados de cuenta**; ver **movimientos históricos** (si el cliente importa) y **generar movimientos mensuales**.
- **Liquidación de comisiones a cobrar a las aseguradoras**.
- **Liquidación de comisiones a los asesores**.
- **Doble conciliación**: pago aplicado ↔ póliza creada.

## 10. Marketing  ⏳ beta
- **Importar calendarización de contenidos**.
- Interfaz **calendario mensual**, cada día con su contenido y **piezas**.
- Segmentación desde la cartera real → campañas inteligentes.

## 11. Portal del Cliente  ⏳ road
- Portal externo para el cliente final (sus pólizas, recibos, documentos, contacto con su asesor).

## 12. Reportes  ⏳ road
- **Zona de reportes** (exportables) sobre todos los datos del CRM/Finanzas.

## 13. Automatizaciones (transversal)  ⏳
- Cada módulo declara sus automatizaciones (recordatorios de pago/renovación, cadencias de seguimiento, generación de movimientos, etc.). Se centraliza un registro de automatizaciones.

## 14. IA  ⏳ beta
- Un cerebro, tres usuarios (equipo / asesores / clientes), usando repositorio de aseguradoras + biblioteca.

---

## Orden de trabajo sugerido
1. ✅ Fundación (shell, datos, tokens) + **Núcleo CRM**.
2. ✅ **Infraestructura transversal**: theming, login, multipaís, capa de importación (scaffold), modelo de datos extendido, registro de módulos/automatizaciones.
3. ⏳ Expediente del cliente completo (editable + Drive + renovaciones + recibos + automatizaciones).
4. ⏳ **Finanzas** (importación, movimientos, liquidaciones, doble conciliación).
5. ⏳ **Integrar Cotizador + Comparativo**.
6. ⏳ **Ops + Leads** (kanban + cadencias).
7. ⏳ **Aseguradoras** (ficha + directorio + fusión cotizador).
8. ⏳ **Marketing** (calendario + import) · **Reportes** · **Portal del Cliente** · **IA**.

> Todo con datos **ficticios** y secciones no listas marcadas como visión/futuro.

---

# Ronda 2 — adiciones y re-priorización (no reemplaza el plan; lo reorganiza)

> Indicaciones del 21-jun. Se integran sin omitir nada. Primer cliente real = **Alianzas y Soluciones (A&S)**.

## Decisiones de marca / UI (aplicadas)
- **Cintilla superior BLANCA** (mejor para mostrar el logo del cliente). ✅
- **Slot de logo del cliente** en topbar (configurable / white-label). ✅
- **Menú lateral oscuro → letras siempre blancas**; **títulos de módulo con cintilla** (barra de acento). ✅
- **Login sobrio**: órbita sobre fondo gris claro, **anillos exteriores giran**, núcleo = **marca del cliente**, paletas, footer **centrado**. La órbita solo debe **mejorar**, nunca desmejorar; puede variar por tema. ✅
- **Regla de contraste**: todo fondo oscuro → texto blanco (sin excepción).

## Personalización inteligente (clave del producto)
- **Logo, usuarios y permisos** = configurables y personalizables (roles por módulo, metas por asesor, estructura por equipo/país).
- **Auto-branding por IA**: si el cliente entrega su **manual de identidad / logo / preferencias**, la plataforma adapta **tipografía, colores corporativos y visual**. Disponible en el **plan con personalización**.
- **Planes**: `Personalizado` (white-label completo, auto-branding, configuración avanzada) vs `Estándar` (plantillas predefinidas). El motor es el mismo; cambia el nivel de configuración habilitado.
- **Autonomía total en administración/config**: una vez en versión final, configurar NO debe depender de iteración con el desarrollador. Todo desde un panel de Configuración sin código.

## Configuración → Integraciones / Add-ons / APIs
- **Add-ons** activables: **Make** (automatizaciones), y futuros conectores.
- **Configuración de APIs** por cliente con **seguridad correcta**: secrets cifrados, scopes mínimos, visibilidad por rol, nunca expuestos en el front. (En backend real; en demo solo la UI de gestión.)
- Registro central de **automatizaciones por módulo** (cadencias, recordatorios, generación de movimientos).

## Reglas de negocio confirmadas (documentadas para no repetir)
- **Moneda por país, aislada**: cada país configurado maneja su moneda y **no se mezcla en ninguna sección** (totales, KPIs, tablas). Las vistas globales muestran por país o normalizan explícitamente, nunca suman monedas distintas en crudo.
- **Ops ≠ Leads**: en **Ops** NO aparecen prospectos (eso vive en **Leads**). Ops = gestiones operativas (cotizaciones, inspecciones, emisiones, renovaciones, modificaciones, otras gestiones admin). **Ops y Leads enlazados** en sus flujos (una gestión nace de un lead y mantiene sincronía).
- **Ops kanban estilo Trello**: colorido, columnas (**filas/listas**) **personalizables por el cliente**, tarjetas con asesor/producto/canal/aseguradora/prioridad/fecha/checklist, todo **clickeable a detalle**. Referencia: tablero real A&S (Gestiones Admin, Cotizaciones, Inspecciones, Emisiones, Renovaciones/Modificaciones…). *Sin la columna de Seguimiento Prospectos* (va a Leads).

## Cotizador + Comparativo (caso A&S) — timing de integración
- Están en **otro index** pero comparten la **misma base de datos** que el desarrollo actual de A&S. Código **largo** y **adaptado a A&S** (tarifas de aseguradoras → no genérico, sí **configurable por cliente**).
- **Cuándo integrar**: **cuando la base comercializable esté lista (1.0)**. Se integra como **módulo aislado** (su propia ruta) para no contaminar el núcleo. Luego se adapta a A&S.
- **Aseguradoras (caso A&S)**: la info de aseguradoras de A&S **vendrá del cotizador/comparativo** (de ahí dependen). En el **producto comercializable** el módulo Aseguradoras queda **configurado y editable** (ficha + plantilla de contactos, plataformas, repositorio, **Drive**); para A&S se alimentará desde la herramienta de cotizador/comparativo en un **proyecto adicional**.
- **A&S no requiere migración**: estaba en fase inicial; con los **importadores** se re-arranca desde cero cargando su base (incl. export de **SIGA / CRM**).

## Re-priorización (lo más crítico primero)
1. ✅ Fundación + Núcleo CRM.

---

# Ronda 4 — Finanzas avanzada, Novedades y Renovación inteligente (21-jun)

## Finanzas (complementos)
- **Importación histórica A&S**: ingresos por **comisiones** y por **financiamiento**; egresos por **comisiones**, **gastos fijos** y demás de operación.
- **Presupuesto**: sección dedicada (ingresos esperados vs reales, egresos por categoría, gastos fijos).
- **Cruce pago↔liquidación de asesores**: los pagos a asesores se cruzan con su liquidación, **modificable**.
- **Asesor ve solo lo suyo**, incluyendo **su liquidación de comisiones**.
- **Dashboard financiero** para toma de decisiones: **comparativo intermensual e interanual**; permite **fijar metas a partir de la realidad financiera y comercial**.
- **Base prima NETA (no total)**: producción real, cumplimiento, metas de recaudo y metas financieras se calculan sobre **prima neta**.
- **Ajustes por no devengado**: la producción (asesor/aseguradora/empresa) **descuenta primas netas no devengadas** por cancelación. El asesor puede ver sus **ajustes de producción** en sus cancelaciones.

## Metas
- Creación de metas **mensuales por asesor**, **de la empresa** y/o **por aseguradora** (mensual o anual, para cumplimiento de **incentivos**).
- Todas sobre **prima neta**; derivan metas de recaudo y financieras.

## Novedades / Incentivos (todo el equipo)
- Cualquiera del equipo crea **novedades** (incentivos, novedades de producto, avisos).
- Aparecen en **ventana grande al ingresar** (nuevo ingreso) y en un **tablón de novedades** con **contador** (no leídas).

## Renovación inteligente
- Al **renovar** una póliza: poder **modificar datos** (No. de póliza, **aseguradora**, etc.) — a veces renuevan con nosotros pero **con otra aseguradora**.
- **Comparativo de renovación**: cargar **propuesta de renovación vs propuesta actual** de la misma aseguradora → herramienta **inteligente con análisis crítico** para enviar al cliente (qué cambia, recomendaciones).

## Responsive
- **Todas las secciones responsive** (móvil/tablet/desktop). Verificar en cada módulo.

## Re-priorización (continuación)
2. ✅ Infraestructura transversal (theming, login, multipaís, importación scaffold) + **refinamiento UI ronda 2**.
3. ⏳ **Expediente del cliente completo** (editable + automatizaciones + recordatorios + recibos + Drive). ← siguiente
4. ⏳ **Configuración sin código** (marca/branding, usuarios/roles/permisos, países/monedas, add-ons/Make, APIs, planes). ← habilita la autonomía
5. ⏳ **Finanzas** (import estados de cuenta, movimientos históricos + mensuales, liquidaciones empresa/asesores, doble conciliación).
6. ⏳ **Ops + Leads** (kanban Trello configurable, sin prospectos en Ops, enlazados, cadencias).
7. ⏳ **Aseguradoras** (ficha + plantilla + directorio + Drive; fusión con cotizador).
8. ⏳ **Integrar Cotizador + Comparativo** (módulo aislado; tarifas configurables).
9. ⏳ **Marketing** (calendario + import) · **Reportes** · **Portal del Cliente** · **IA**.

---

# Ronda 5 — Ops/Leads ciclo completo, integraciones, Academia, Marketing, Cronograma (21-jun)
> Capturado del feedback con capturas (Trello + plataforma A&S antigua). NADA se omite. Prioridad para 1.0.

## Fixes UI inmediatos
- **Menú interno de la ficha (tabs) se desborda**: hacerlo scrollable con indicador / wrap / flechas; que se vea que hay más después de "Comisiones". (Ya es `.ficha-tabs` con overflow-x; falta affordance visible — degradado/flecha "más".)
- **Quitar notas técnicas** que el usuario no debe ver (en ficha y en todo el sistema). Revisar textos "demo/laboratorio/Firestore/técnico".
- **Títulos de listas de Leads y Ops más llamativos**: con **emojis y colores** por lista.

## Ops + Leads — CICLO COMPLETO (rediseñar fichas Lead/Ops)
**Listas editables/personalizables** en Ops y Leads: agregar, quitar, **reordenar**, con **automatizaciones** por lista.
Flujo del ciclo (vincula y sincroniza en vivo, comparte datos que luego hereda Cliente 360 al convertir):
1. **Ingreso**: se crea prospecto en **Ops** (usual: entra pidiendo cotización) o en **Leads** (manifestó interés sin datos completos para cotizar).
2. **Ops · Cotización**: cuando ya se cotizó, **desaparece de Ops** y queda en **Leads** durante negociación.
3. **Leads · negociación**: continúa seguimiento en la lista que corresponda; al entrar a **Propuesta** se **automatizan seguimientos por cadencia**. Listas/tareas de Leads **editables**.
4. **Cierre en Leads**: seleccionar si pasa a **Inspección** o **Emisión** → reaparece en **Ops** **sin desaparecer de Leads**. Leads tiene listas espejo de **Inspecciones** y **Emisiones** (el asesor NO ve Ops, pero debe saber la etapa).
5. **Emisión**: en Ops, al emitir **desaparece** (se crea el cliente con toda la info; la póliza se agrega manual o importando documentos). En Leads puede aparecer en **Cierre** durante el mes en curso y luego **archivarse** (auto o manual).
- **Sincronización en vivo** Ops↔Leads para gestiones del mismo cliente (Cotizando↔Cotizando, Inspecciones, Emisiones, Gestiones Admin, Modificaciones). En **clientes activos** se refleja en su **Día/tareas activas** y en la **ficha del cliente**.
- **Permisos/roles**: el **asesor NO ve Ops** (interno del equipo) pero ve **todo lo de sus gestiones** vía Leads. **Cada usuario puede tener varios roles** y elegir **qué tablero ver según el rol** (un interno también puede ser asesor y querer ver solo sus metas/clientes/gestiones).
- **Fichas Lead/Ops** (diseñar la mejor versión, no copiar la actual): práctica, útil, que facilite automatización, sincronización, vínculos y seguimiento. Campos tipo: etapa, cliente vinculado, país, producto, ramo/subramo, aseguradora, asesor, canal, tipo de gestión, seguimiento, resultado, prioridad, vencimiento, próxima acción, responsable, etiquetas, checklist, adjuntos/Drive, N.º póliza, N.º cotización, tel WA, correo, descripción, notas internas. Eventos para automatización (al mover columna, al cambiar resultado, al registrar vencimiento, al faltar documentos, al marcar inspección, al emitir póliza…).
- **Al convertir** a cliente: heredar datos iniciales + **cadencia automática de envío de encuestas de satisfacción**.

## Solicitar gestión desde la ficha del cliente
- Botón **"Solicitar gestión"** en la ficha (y en pólizas/renovaciones): el usuario **selecciona tipo** (solicitar condiciones de renovación a aseguradora, cancelar, sustituir vehículo, cambiar propietario, modificar datos…), **crea otro si no existe**, agrega **nota**, y **aparece en Ops** en la lista correcta (Gestiones Admin, Renovaciones/Modif., etc.) **asociada al cliente/póliza**.

## Renovaciones (ampliar)
- Desde la ficha (renovaciones) **solicitar propuestas de renovación**: con la **misma aseguradora**, con **otras en general**, o con **otras seleccionando cuáles**.
- **Renovación inteligente**: el comparativo debe comparar la **propuesta de renovación actual vs propuesta de renovación de la misma aseguradora Y/O de otras**. (Hoy solo simula misma aseguradora — ampliar a multi-aseguradora.)

## Calidad de datos (ampliar)
- **Edición rápida inline** del dato faltante en la misma lista; al completar lo pendiente, el cliente **desaparece de la lista**.

## Finanzas (ampliar)
- Importadores para **movimientos, presupuesto, liquidaciones** (sobre todo etapa inicial), no solo banco. Opción de **mostrar/ocultar el importador**.
- **Metas**: de **recaudo**, de **ventas** y de **producción** (tres tipos).

## WhatsApp
- No solo API: también **abrir WhatsApp Web** (wa.me) como opción.

## Integraciones / APIs a evaluar (Configuración → Integraciones)
- **Correo**: **Outlook** (corporativo — PRIORITARIO; explorar **utilidad de gestión de correos** y asociación de correos a gestiones/clientes), **Gmail**.
- **Mensajería**: **Green API** (WhatsApp), WhatsApp Web.
- **Datos/Hojas**: **Google Sheets**.
- **IA/Contenido**: agentes de IA varios, **Canva, Gamma, NotebookLM, HeyGen**.
- **Marketing/Redes**: **Facebook, Instagram, LinkedIn, YouTube, TikTok, Metricool, Mailchimp** (o similares) para campañas.
- Todas con seguridad correcta (secrets cifrados, scopes, por rol).
- **Aprovechar Outlook**: bandeja/gestión de correos dentro de la plataforma, vincular hilos a clientes/gestiones, crear gestión desde un correo.

## Academia (para 1.0) — `Orbit Academia`
- **Inducción**, **capacitación técnica**, **certificaciones**, **piezas comerciales** (propias y de aseguradoras), **recursos adicionales**.
- **Instructivo/onboarding** de cómo funciona el sistema (puede vivir en Configuración o Academia).
- **Videos embebidos**; mensajes con **formato y emojis**.

## Marketing (para 1.0) — `Orbit Marketing`
- **Calendario** que dentro de **cada día** contenga la **ficha con el/los contenidos por red, piezas** y asociados.
- Segmentación, medición, estadísticas, automatización de producción/generación de contenidos y publicación.
- Integraciones de redes (ver arriba).

## Otros para 1.0
- **Reportes** (`Orbit Reportes`), **Orbit IA**, **Portal del Cliente** (lenguaje de marca por sección: "Orbit Reportes", portal propio, etc.).
- **Localización por país**: normalizar **términos técnicos y comunes** distintos por país (glosario configurable por tenant) para clientes en otros países.
- **Cronograma de actividades** tipo **calendario por día/semana/mes** — evaluar agregarlo en **Inicio**, donde también se **agreguen tareas por día**.
- **Multi-rol por usuario**: selector de "ver como" (rol activo) que cambia el tablero/visibilidad.
- **Videos embebidos + formato + emojis** en Academia y Notificaciones.

## Estado de implementación de Ronda 5
- **HECHO (v0.9)**: fixes UI ficha/tabs ("hay más") + quitar notas técnicas; ciclo Ops/Leads completo (sincronía en vivo, cadencias, emisión→cliente, listas espejo); multi-rol "ver como"; solicitar gestión desde ficha.
- **HECHO (v0.10)**: catálogos configurables (`Orbit.cat`) con "➕ Otro" en todos los desplegables; **listas Ops/Leads editables** (crear/renombrar/recolor/reordenar/eliminar); país con bandera en tarjetas; responsable por defecto+seleccionable; nota bajo checklist; **notificaciones WA/correo** (solicitar/resolver gestión); **solicitud del cliente** (proxy del Portal) + **adjuntos**; seguimientos manuales en Mi Día (WA); cadencias = WA→correo; ficha cliente: quitar import estado de cuenta, pólizas/vehículos abren detalle; CRM (pólizas/cobros/cancelaciones) abren detalle; **acuerdo de confidencialidad** en primer ingreso.
- **HECHO (v0.11)**: **Orbit Insights** — analítica real en 5 vistas (Resumen · Producción · Cartera/aging · Pipeline/embudo · Renovaciones), respeta país, micro-gráficos sin librerías.

## ✅ CHECKLIST MAESTRO 1.0 (nada se omite — fuente de verdad de cobertura)
Estado: ✅ hecho · 🟡 parcial · ⏳ pendiente · 🧩 placeholder honesto en NAV
- ✅ Núcleo CRM (Clientes 360, Pólizas, Cobros, Renovaciones, Cancelaciones, Comisiones, Historial)
- ✅ **Modelo de póliza + motor de primas/recibos** (`core/primas.js`): desglose (neta/expedición/g.financieros/otros/IVA/total), tasas por país (IVA GT 12%·CO 19%), recibos por forma de pago (contado=1; fraccionado=N con recargo), renovable sí/no, drawer enriquecido
- ✅ Ciclo Ops ↔ Leads (kanban editable, sincronía, cadencias, emisión→cliente, multi-rol)
- ✅ Solicitar gestión (equipo) + Solicitud del cliente (proxy) + adjuntos + notificaciones WA/correo
- ✅ Confidencialidad (gate primer ingreso, persistente)
- ✅ Orbit Insights (analítica)
- 🟡 Mi Día (dashboard + seguimientos manuales) — falta **Cronograma calendario día/semana/mes + tareas por día**
- 🟡 Importación inteligente (scaffold) — falta motor real de extracción/mapeo
- 🟡 Calidad de datos (lista) — falta **edición inline rápida que desaparece al completar**
- 🧩 **Finanzas** (importar movimientos/presupuesto/liquidaciones/estados de cuenta, metas recaudo/ventas/producción, doble conciliación, dashboard intermensual/interanual sobre prima NETA) — placeholder
- 🧩 **Aseguradoras** (ficha editable, contactos/accesos/clausulados, pólizas ejemplo, Drive, fusión con cotizador, alimenta IA) — placeholder
- 🧩 **Cotizador + Comparativo** (multicompañía; comparativo IA con análisis crítico; tarifas configurables) — se **integra como módulo aislado** cuando la base 1.0 esté lista; viene de la herramienta de A&S
- 🧩 **Orbit IA** (un cerebro, tres usuarios: equipo/asesores/clientes, sobre repositorio aseguradoras + biblioteca) — placeholder
- 🧩 **Orbit Academia** (inducción, capacitación, certificaciones, piezas, recursos, instructivos, **video embebido**) — placeholder
- 🧩 **Orbit Marketing** (calendario con ficha por día: contenidos/piezas/redes, segmentación, stats, automatización) — placeholder
- 🧩 **Reportes** (exportables, filtros, programados por correo) — placeholder
- 🧩 **Portal del Cliente** (sus pólizas/recibos/documentos/contacto + **solicitar gestiones que entran a Ops y notifican** — hoy simulado con el botón 🙋 en la ficha) — placeholder
- 🧩 **Notificaciones WhatsApp** (centro de mensajería WA web + API, plantillas, encuestas) — base hecha (notify), falta centro dedicado
- ⏳ **Integraciones** (Config): **Outlook prioritario**, Gmail, Green API, Sheets, Canva, Gamma, NotebookLM, HeyGen, redes, Metricool, Mailchimp
- ⏳ **Localización por país** (glosario de términos configurable por tenant)
- ⏳ **Equipo y permisos** + **Configuración** self-service (catálogos, metas, branding, módulos activos)
- ⏳ **Renovaciones multi-aseguradora** (hoy comparativo simula misma aseguradora)
- ⏳ **Responsive global** (revisar todos los módulos)

### Sobre la "Solicitud del cliente" (cómo opera hoy vs 1.0)
- **Hoy**: botón 🙋 en la ficha del cliente que crea la gestión en Ops con origen "Solicitud del cliente" y dispara notificación al asesor (WA/correo). Es el **proxy** mientras no exista el Portal.
- **En 1.0**: el **Portal del Cliente** (módulo `portal`) expondrá esa misma acción al cliente final autenticado; usará el mismo motor (`Orbit.ciclo.solicitarGestion(..., desdeCliente=true)`), por lo que entrará a Ops y notificará igual. No hay rework: el botón actual ya llama al mismo flujo.

> **Definición de "1.0 comercializable" (cuando aviso para arrancar A&S)**: pasos 3 y 4 completos + Finanzas operativa + Ops/Leads + Aseguradoras configurables. Cotizador se integra después, ya sobre A&S.

---

# Expediente del cliente completo (paso en curso) + modelo de Configuración

## Alcance del expediente (ficha del asegurado)
Secciones, todas dentro de la ficha 360 (pestañas):
- **Información del cliente** (editable): identificación, contacto, **contacto alterno** si difiere del asegurado, asesor, segmento, canal, **link a Drive del expediente** (interno), notas.
- **Pólizas** + **detalle por póliza**; cuando es **vehículo**, datos de vehículo (placa, marca/línea, año, uso, color, VIN, motor, suma asegurada).
- **Vehículos** (pestaña dedicada).
- **Cobros** y **Recibos y pagos**: recibos por **forma de pago**, **aplicar pago** (concilia recibo↔póliza).
- **Renovaciones** (gestión desde la ficha).
- **Cancelaciones**, **cartera pendiente**, **indicadores**.
- **Comisiones**: split **vendedor / empresa**, **visibles según rol** (empresa = interno, configurable).
- **Historial**, **automatizaciones**, **recordatorios**.
- **Importación**: clientes, pólizas y **detalles por importación de documentos**.
- **Cargue de archivos** por cliente (clientes importantes acceden a su material).

## Visibilidad Portal del Cliente vs Interno (configurable)
- **Interno (no ve el cliente)**: Drive del expediente, comisiones, notas internas, automatizaciones.
- **Cliente sí ve (en su Portal)**: pólizas, recibos/estado de pagos, documentos compartidos, contacto con asesor.
- Cada campo/sección lleva un **flag de visibilidad** configurable.

## Modelo de Configuración (dos niveles)
1. **Configuración del cliente (self-service, según plan contratado)**: marca/branding (plan Personalizado), usuarios/roles/permisos, metas, países/monedas, plantillas, add-ons (Make), APIs, visibilidad de campos del portal.
2. **Configuración interna (nuestra, para personalizar)**: **selección de módulos activos por cliente**, plan contratado, límites, white-label avanzado, provisioning. No visible para el cliente.

> Implementación técnica: un objeto `Orbit.tenant` (config del cliente) define `modulosActivos[]`, `plan`, `branding`, `paises[]`, `roles{}` y `portalVisibility{}`. El sidebar/router ya leen de config → bastará filtrar por `modulosActivos`. Documentado para no repetir.

---

# 🔴 RONDA 7 — Analítica profunda, comisiones por asesor, automatizaciones, academia, correo y siniestros (PRIORIZADA)
Feedback 22-jun (con capturas de la versión "lab" A&S como REFERENCIA de profundidad analítica — replicar la estructura/indicadores con MEJOR nivel gráfico, NO el chrome).

## R7.0 · Contexto cliente: **Alianzas y Soluciones (A&S)** es el primer cliente
- La plataforma base debe quedar lista para personalizar A&S **solo por configuración** (branding, países GT, ramos/aseguradoras locales: El Roble, G&T, Mapfre, Universales, La Ceiba, La General, Ficohsa, Bantrab, AseGuate…). No hardcodear A&S en el core.

## R7.1 · Inicio — aligerar visual ✅
- Título (banner oscuro) + panel "Metas del mes" oscuro seguidos = sobrecarga. **Metas del mes pasa a card claro** con acentos rojos; mantener los dials.

## R7.2 · Comisiones por asesor (modelo flexible) — CRÍTICO
- Cada asesor puede tener **% diferente** calculado sobre **prima neta**, **o** una **comisión FIJA** (monto) para algún asesor en particular. Configurable en Tarifas/Equipo.
- `comeng` extendido: `asesor.comModo = 'variable'|'fijo'`, `comValor`. La comisión del vendedor sigue siendo participación sobre la comisión de la aseguradora **o** monto fijo.

## R7.3 · Comisiones: visibilidad por rol + sección en ficha del cliente
- El **módulo Comisiones** sigue siendo solo del **área administrativa** (como está).
- **Nueva sección de comisiones en la ficha del cliente** que **el asesor sí ve**, con **solo lo que le compete** (su comisión por las pólizas de ese cliente; oculta la comisión empresa).

## R7.4 · KPIs clicables en TODAS las secciones
- Cada tarjeta KPI (Inicio, Insights, Pólizas, Cobros, Comisiones, Cancelaciones, ficha…) debe ser **clicable** y **desplegar detalle** (lista/modal con los registros que componen el indicador). Patrón reutilizable.

## R7.5 · Insights — analítica profunda, crítica y EN VIVO (rehacer ampliando)
Referencia (capturas lab) — implementar con mejor nivel gráfico y vinculado a datos reales en vivo:
- **Vistas**: Resumen · **Metas del mes** · Cumplimiento · Recaudo · Cartera · **Devengado** · **Top clientes** (por volumen/cantidad/riesgo, con **modal de detalle** del cliente) · **Vencidas** (oportunidad de recuperación) · **Análisis crítico** (diagnóstico + alertas + recomendaciones por área).
- **Producción NUEVA vs RENOVADA** con **metas separadas** para cada tipo; % cumplimiento.
- **Comparativos**: **interanual** (2025 vs 2026, mismos meses, var %), **intermensual** (vs mes anterior), con criterios cruzables: **aseguradora, producto, ramo, asesor, país**.
- KPIs con detalle; **tarjetas clicables**; gráficas: barras comparativas por mes, dona de composición de cartera, comparativo por aseguradora con var% y tendencia, producción por asesor (nuevas/renov), tabla asesor × aseguradora.
- **Análisis crítico**: alertas (caída de PN vs período, tasa de cancelación sobre umbral, recaudo, vencimientos próximos) + **recomendaciones accionables por área** (renovaciones, cobros, cancelaciones). Todo desde datos reales, en vivo.
- KPIs de negocio sugeridos (de lo general a lo particular): PN y prima total (mes/acumulado), # pólizas nuevas/renovadas, ticket promedio, tasa de renovación, tasa de cancelación/fuga, recaudo % y aging, comisión devengada/liquidada, concentración top-10, producción por asesor vs meta, mix por ramo/aseguradora, var interanual/intermensual.

## R7.6 · Ficha de PÓLIZA — checklist consolidado de TODAS las observaciones (varias iteraciones)
Estado por ítem: ✅ hecho · 🟡 parcial · ⏳ pendiente. (Reúne lo dicho en los mensajes con capturas SIGA y el CRM actual.)
- ✅ **Desglose de prima** = Prima Neta + Gastos de emisión/expedición + Gastos adicionales/asistencias (Otros) + Recargo por fraccionamiento (Gastos financieros) + IVA = **Prima Total**; **cambia por país** (IVA GT 12% / CO 19%).
- ✅ **Recibos según forma de pago**: tarjeta de crédito / Visa Cuotas al **contado = 1 recibo**; **fraccionado = N recibos** según el fraccionamiento elegido, con recargo prorrateado.
- ✅ **Auto-cálculo al crear/editar prima manual**: Gastos de emisión **GT = 5% de prima neta** + IVA, **calculados automáticamente y modificables**.
- ✅ **Sin lenguaje mexicano de SIGA** ni campos inútiles (folio, ejecutivo, agente, CIS, carpeta).
- ✅ **Editar póliza** (drawer) — administrable; ramo/subramo en desplegable **por país** (reconstruido v0.15 tras el undo).
- ✅ **Qué cubre la póliza según tipo**: vehículo / inmueble / grupo familiar / contrato; en vehículo, **abrir el detalle completo** (reconstruido v0.15). *(Datos transversales.)*
- ✅ **Endosos / sustitución de vehículo / cambio de propietario / inclusión de beneficiario** (manual · importar · crear inteligente) → **historial de la póliza** (reconstruido v0.15).
- ✅ **Estados Pagado vs Conciliado** definidos; **aplicar pago** con **fecha de envío a gestión** (default hoy, editable) + **carga de factura** que fija la **fecha real** del pago de la aseguradora (conciliación adicional).
- ✅ **Cancelaciones con detalle** (póliza, motivo, tiempo activa, comisión generada, acción de recuperación).
- ✅ **Comisión aseguradora (%/ramo+producto) y vendedor (modelo flexible)** calculadas y editables; importables desde planilla.
- ⏳ **Acceso al Drive de la aseguradora desde la ficha de póliza y desde Leads** para descargar formularios/documentos requeridos para emisión → dirige al **módulo Aseguradoras** (centraliza documentación/acceso). *(pendiente — depende de módulo Aseguradoras)*
- ⏳ **Gestión documental**: documentos de la póliza (factura, endoso, PDF) se cargan al **Drive en la carpeta del cliente**; si no se mapea, **crear carpeta con nombre completo del cliente** y **etiquetar**. *(pendiente)*
- ⏳ **Importador de pólizas que cruza y complementa sin duplicar** (por n.º póliza/placa/identificación) y **señala lo no leído** para completar manual. *(pendiente — motor real)*
- ⏳ **Reportes/Insights/Metas con producción NUEVA vs RENOVADA** (afecta cómo se lee la póliza en analítica). *(pendiente — R7.5)*
- ⏳ **Siniestros/reclamos asociados a la póliza** (bitácora + correos). *(pendiente — R7.10)*
- ⏳ **Editar en TODAS las secciones** según permisos (no solo póliza). *(pendiente — patrón global)*

> Nota: parte de lo ✅ se revirtió en un *undo* y se reconstruyó; confirmar en cada release que la ficha de póliza conserve editar + qué cubre + endosos/historial + aplicar pago con factura.

## R7.6-bis · Ficha de póliza — pendientes específicos a aplicar ya
- Acceso a **Drive aseguradora / formularios de emisión** desde la ficha y desde Leads.
- **Carga de documentos** a la ficha con destino Drive del cliente (carpeta mapeada o creada + etiquetada).
- **Siniestros** vinculados.

## R7.7 · Automatizaciones (módulo) — **Make** + herramientas creativas
- Integración **Make** (escenarios/automatizaciones). Conectores y disparadores desde eventos de Orbit (gestión creada, póliza emitida, cobro vencido…).
- **Herramientas de creación** de imágenes, **infografías** y **recursos** para Academia/Marketing (generación asistida).

## R7.8 · Academia — herramientas de capacitación
- Crear **bloques de capacitación** con **avances** y **temáticas**; herramientas tipo LMS (módulos, progreso, certificación, piezas, video embebido, recursos). Se alimenta de documentos comerciales por aseguradora (interalimenta IA/Importador).

## R7.9 · Integración de CORREO (Outlook prioritario, luego Gmail) — CLAVE
- Bandeja integrada; **asociar correos a módulos**: cliente, póliza, **reclamo/siniestro**, gestión, aseguradora. Guardar hilos y respuestas de la aseguradora.
- Diseñar como **capa transversal** (como el importador): `Orbit.correo` con vinculación por entidad. Funcional y asociable desde cada ficha.

## R7.10 · Siniestros / Reclamos
- **Importador inteligente de reclamos** + carga de **bitácora de reclamos** que envía la aseguradora (o registro manual del reclamo del cliente; correos de respuesta).
- **Sección Siniestros en la ficha del cliente**: estado del reclamo, aseguradora, póliza, bitácora cronológica, correos asociados, documentos.

## R7.11 · Módulo Financiero y Marketing (alto interés)
- **Finanzas**: movimientos, liquidaciones (empresa + asesores), import de estados de cuenta/planillas, **doble conciliación** pago↔póliza y comisión↔planilla, metas de recaudo/ventas/producción, dashboards mes/intermensual/interanual sobre prima NETA.
- **Marketing**: calendario real (día con piezas), creación/automatización de contenidos, segmentación desde la cartera real, stats.

> Orden de ataque R7: (1) Inicio visual ✅ → (2) Comisiones por asesor ✅ → (3) KPIs clicables ✅ Insights → (4) Insights profundo ✅ → (5) Finanzas → (6) Siniestros + Correo → (7) Marketing/Academia/Automatizaciones.

---

# 🔴 RONDA 8 — Módulo FINANCIERO inteligente (basado en Excel real de movimientos) + profundizar analíticas
Referencia: libro "Movimientos Ing y Eg" — 38 hojas mensuales GT/Col (Nov-24→May-26) + Salarios + Presupuesto + Análisis + Dashboard + Listado producción.

## R8.1 · Modelo de datos financiero (genérico, comercializable)
- **Movimientos** por **mes + país**: INGRESOS (concepto, pagador, día, clasificación, valor, IVA, observaciones, estado) y EGRESOS (concepto, beneficiario, clasificación, valor, **pendiente**, observaciones, estado).
- **Clasificaciones de ingreso**: Comisiones de aseguradora, Incentivos, **Financiamiento/Préstamos** (separado de operativo), Otros.
- **Clasificaciones de egreso**: Comisiones a asesores, Gastos fijos (contabilidad, CRM, internet, office, nómina/salarios), Marketing/publicidad, Operación/asistencias, **Devolución de préstamos**.
- **Estados**: ingreso → *esperado / facturado / recaudado*; egreso → *presupuestado / pendiente / pagado*. Lo no pagado en el mes pasa como **cuenta por pagar** al siguiente; lo no recaudado como **cuenta por cobrar**.

## R8.2 · Cuentas por cobrar / por pagar (devengado)
- **Ingresos esperados**: al **cargar la planilla de comisiones del mes** (ya facturada, pendiente de recaudo) → opción de **agregarla como ingreso esperado** automáticamente; cambiar estado esperado→recaudado.
- **Egresos pendientes**: al generar la **liquidación de comisiones a asesores** → opción de **agregar como egreso pendiente por pago**; cambiar estado; saldo no pagado = cuenta por pagar del próximo mes.
- Tablero de **CxC / CxP** con antigüedad y estados editables.

## R8.3 · Control de financiamientos (deuda) — separado de operativo
- **Ingresos por financiación** se registran **aparte** de los ingresos operativos (no inflan producción/utilidad operativa).
- Los **egresos hechos con ese dinero** sí cuentan como egresos normales.
- **Control de deuda por acreedor**: la deuda **aumenta** con cada ingreso de financiación y **disminuye** con los egresos de **devolución de préstamo** a ese acreedor. Saldo de deuda vivo por acreedor.

## R8.4 · Presupuesto vs real + semáforos
- Cumplimiento del **presupuesto** medible y reportable **dinámicamente**: %, **semáforos** (verde/ámbar/rojo), **alertas** por categoría desviada.
- Presupuesto mensual de egresos (contabilidad, CRM, internet, office, publicidad, salarios) importable.

## R8.5 · Dashboard financiero (selector mes + país)
- **Selector de mes y país** (igual que Insights).
- **Comparativo interanual e intermensual** (ingresos, egresos, utilidad operativa, recaudo) — central en el dashboard.
- Ingresos operativos vs financiación, margen, recaudo/producción, gasto fijo/ingreso.

## R8.6 · Análisis crítico financiero con IA (Gemini)
- Diagnóstico inteligente a partir de resultados financieros + **sugerencias de metas** (ventas, recaudo, total, por asesor), **estrategias de medios**, **segmentación**, **estrategias comerciales**.
- Capa `Orbit.ia` (Gemini, económica) — también para extracción/import, comparativos y redacción. Configurable por tenant.

## R8.7 · Importador inteligente financiero
- **Histórico de movimientos** + **estados de cuenta** + **planillas de comisiones** → mapeo por tipo, cruce y de-duplicación; al importar planilla, ofrecer crear ingreso esperado / al liquidar, egreso pendiente.

## R8.8 · Profundizar TODAS las analíticas (de lo general a lo particular) — pendiente recurrente
- **Cartera**: por asesor / aseguradora / producto / ramo (hoy muy general).
- **Comparativos**: además de anual, **por mes** y con detalle por concepto.
- **Top clientes**: por ramo, aseguradora, asesor, nuevos/antiguos, cantidad de pólizas, volumen — con modal.
- **Renovaciones**: por aseguradora / asesor / ramo.
- **Análisis crítico dinámico** en todas.
- **Gráficas**: salir del gris/negro — usar paleta de marca (rojo/grafito/acentos) con buen contraste.

---

# 🔴 RONDA 9 — Correo en topbar, detalles clicables, Finanzas editable, Insights profundo (PRIORIZADA · 23-jun)
Feedback con capturas. **Confirmación al usuario: TODO lo de Insights/comparativos/cartera/top/renovaciones de rondas previas SIGUE pendiente y documentado (R7.5, R8.8); la versión actual de Insights quedó simple y debe rehacerse al nivel solicitado, NO está completa.**

## R9.1 · Correo — accesos, sincronización real y vínculos
- **Abrir correo desde el TOPBAR** (junto a la campana de notificaciones); hoy está muy abajo en el menú. Es herramienta diaria.
- **Notificaciones de correo**: badge de no leídos en topbar + aviso en Mi Día.
- **Funcionalidad completa tipo Outlook/Gmail** según el proveedor elegido y **sincronizar todos los correos actuales**.
- **No exclusivo de dominio Outlook**: soportar **IMAP/POP3** con distintos proveedores y **dominios propios**.
- **Vincular correo a cliente DESDE el correo** de forma explícita (hoy parece automático); permitir asociación manual.
- **Vincular también a PÓLIZA / GESTIÓN / RECLAMO / ASEGURADORA**; **crear gestión desde un correo**.
- **Correo desde la ficha del cliente**: botón en el **panel superior** de la ficha (junto a WA y a "gestión"/historial). Al redactar, **asociar a póliza** y poner **nombre en el asunto** para enviar a la aseguradora y **relacionar automáticamente**.
- **Ventajas del correo vinculado** (a implementar/comunicar): hilo completo por cliente/póliza/reclamo; trazabilidad y auditoría; adjuntar respuestas de la aseguradora a un siniestro; crear gestión/CxC desde un correo; plantillas; **envío por lote** de cobros/renovaciones; cadencias automáticas.

## R9.2 · Detalles clicables (BUG recurrente — alta prioridad)
- **KPIs sin clic** en varias secciones → todos deben abrir detalle.
- **Renovaciones, Cobros y Cartera, Cancelaciones**: al seleccionar un registro **abre la ficha del cliente (Resumen)** en vez del **detalle** del registro. Debe abrir el detalle (recibo, renovación, cancelación) — patrón ya hecho en algunos, falta en estos.
- **Recibos**: en NINGUNA sección muestran detalle; siempre devuelven al resumen del cliente. Falta drawer de recibo + aplicar pago con fecha + adjuntar factura.
- **Orbit Historial**: muestra movimientos pero **no muestra clientes**; el detalle lleva al cliente en Resumen. Debe abrir el detalle de la interacción / entidad correcta.
- Regla global: **todo registro es clicable y abre su propio detalle** (no el resumen del cliente por defecto).

## R9.3 · Comisiones — es CRM, no analítica; y configuración mal ubicada
- La sección **Comisiones del CRM** se volvió una **analítica tipo Insights** y **perdió el listado y el detalle** (antes mostraba listado, faltaba el detalle). Debe volver a ser **sección CRM con listado + detalle clicable** (devengado/liquidado por cuota, por asesor, por aseguradora).
- La **configuración de comisión por asesor** (% / fijo) que quedó dentro de Comisiones **debe vivir en Configuración / Equipo y permisos**, NO en el CRM de comisiones. (Bug: al entrar a "comisiones asesores" desapareció el menú lateral y quedó solo la config.)

## R9.4 · Importador del expediente — documental Y/O inteligente (faltan ambos claros)
- Al importar al expediente, **elegir el modo**: **Documental** (conservar el archivo para visualizarlo después) **o Inteligente** (extraer info y mandarla a donde corresponde: datos del cliente, póliza, vehículo, estado de cuenta, pago aplicado con factura…). Necesita **ambos**.
- **Falta la sección DOCUMENTAL** en el expediente para **visualizar los documentos** cargados del cliente (repositorio por cliente, con etiquetas y vínculo al Drive).

## R9.5 · Recibos del expediente — organizar por póliza (ya pedido, confirmar en plan)
- En la ficha del cliente, **Recibos y pagos** debe tener **selector de póliza** (No. de póliza, aseguradora, identificador del vehículo/bien) para no mezclar recibos de varias pólizas. (Pendiente #63 — confirmado.)

## R9.6 · Finanzas — todo editable, con detalle, dinámico (rehacer profundo)
- **Liquidaciones**: el listado muestra datos pero **no abre detalle** ni permite **editar**; debe poder verse qué se cobra/paga, **seleccionar** una partida y editarla.
- **Conciliación dinámica**: al **conciliar la planilla de la aseguradora** y los **estados de cuenta**, las liquidaciones deben actualizarse desde **cualquier** sección que cargue la info; si cargo desde Liq. empresa la planilla de comisiones, **avisar si hay desviación** vs la liquidación para corregir/revisar.
- **Conciliación bancaria**: conciliar con los **movimientos del mes**.
- **Ingresos por financiamiento**: hoy aparece la sección pero **no hay por dónde registrarlos** ni cómo se **descuentan**. Debe haber alta/edición y control total de deuda.
- **CxC desde planilla de comisiones**: generar la cuenta por cobrar al cargar la planilla y **registrar el movimiento de ingreso al cambiar estado**. Hoy **no hay opción de editar nada**.
- **Dashboard financiero** está **demasiado genérico** → necesita **tablas, gráficas, comparativos mes/año y análisis** detallado.
- **Movimientos**: falta **agregar ingresos, egresos, saldos bancarios al corte**; distinguir por **sub-secciones** (Ingresos / Egresos / Saldos), con **semáforos, avances y dinamismo** (hoy es listado fijo).
- **Crear el siguiente mes** en Movimientos y en Presupuesto (no existe).
- **Revisar la hoja Excel entregada**: era mucho más descriptiva por sección → **complementar y mejorar** con eso, sin perder lo bueno y manteniendo **datos ficticios**.
- **Editar en todas las sub-secciones** de Finanzas.

## R9.7 · Insights — sigue simple; rehacer al nivel ya solicitado (R7.5 + R8.8)
- **Comparativo sigue demasiado simple** — falta todo lo pedido: interanual + intermensual, por **asesor/ramo/aseguradora/producto/general**, de lo general a lo particular, con tablas, gráficas y análisis crítico dinámico.
- **Top clientes**, **Cartera** y **Renovaciones** con desglose por aseguradora/asesor/ramo/producto/nuevos-antiguos/volumen/cantidad — con modal de detalle.
- Confirmar: **todo Insights de rondas previas está pendiente** (no se perdió), la versión actual NO cumple el nivel.

## R9.8 · Sidebar — opción de color GRIS
- Agregar al selector de color del sidebar una variante **gris** (además de oscuro/rojo actuales).

## R9.9 · Integraciones de marketing/contenido + correo↔aseguradora + facturación por aseguradora
- **Integraciones** ahora incluyen (Config › Integraciones): **Correo (Outlook/IMAP/POP3)**, **Metricool**, **Facebook/Instagram**, **LinkedIn**, **Página web**, **Canva**, **Gamma**, **HeyGen**, **IA (Gemini)**, **Mailchimp**, **Google Sheets** (además de Make, Drive, WhatsApp). ✅ catálogo agregado.
- **Automatización de contenidos y publicación**: el flujo "generar contenido → pieza → publicar/medir" se arma con **Make (orquesta) + IA/Gemini (genera texto) + Canva/Gamma/HeyGen (piezas) + Metricool (programa, publica y mide en redes y pauta)**. Mailchimp para correo masivo. Documentar como receta en Marketing/Automatizaciones (R7.7).
- **Correo vinculable a ASEGURADORA**: además de cliente/póliza/gestión/reclamo, poder vincular correos a una **aseguradora** (info de personal, procesos, procedimientos, productos, piezas). (Suma a R9.1.)
- **Facturación por aseguradora**: en cada ficha de aseguradora guardar **patrones y datos de facturación** — **NIT**, **patrón de concepto**, razón social, dirección fiscal, notas — para no tener que buscar PDFs de facturas antiguas al facturar. El importador documental puede extraer estos datos de una factura previa. (Suma a R78 Aseguradoras.)

> Orden sugerido R9 (alto impacto, sin parchar a ciegas): (1) detalles clicables en Cobros/Cartera/Renovaciones/Cancelaciones/Historial + recibo drawer + KPIs clicables → (2) Comisiones vuelve a CRM con listado+detalle, config a Equipo → (3) Correo a topbar + ficha cliente (botón superior) + IMAP/POP3 + vínculos múltiples → (4) Finanzas editable/detalle/sub-secciones/crear mes/dashboard profundo → (5) Insights profundo de verdad → (6) Aseguradoras → (7) Importador inteligente+documental + sección documental del expediente → (8) Siniestros → (9) sidebar gris (rápido).

---

# 🔴 RONDA 10 — Roles, aprendizaje por rol, confidencialidad, automatizaciones, manuales y capacitación (25-jun)

## R10.1 · Roles ampliados + selección de módulos por rol
- Crear usuarios **comercial / administrativo / marketing / operativo / asesor / dirección** con acceso a los módulos de su rol y **selección manual de módulos visibles** por usuario (override). En Equipo y permisos: por rol, qué módulos ve.
- La visibilidad de módulos por rol alimenta también qué bloque de aprendizaje y qué navegación ve cada quien.

## R10.2 · Paleta adicional suave (estilo Orbia) + elegir tipografía
- Añadir (NO sustituir) una **paleta suave/clara** tipo Orbia manteniendo identidad Orbit; las paletas deben cambiar **también el fondo de los títulos/banners**, no solo líneas/letras. Selector de **tipografía** (Manrope, Segoe/corporativa, etc.).

## R10.3 · Módulo de Automatizaciones (evaluar Orbia, adaptar a Orbit)
- Inspirado en CXOrbia: **Automatizaciones por evento** (evento → destino → canal → plantilla → webhook propio), webhook de Make por tenant, integraciones (Outlook/Gmail/Sheets/WhatsApp Cloud vía Make), **asistente IA (Gemini)** con API key + toggle, **alertas de pendientes** (escanear y notificar) y **registro de disparos**. Adaptar eventos a seguros (gestión creada, pago vencido, póliza emitida, renovación próxima, siniestro, solicitud de cliente…).

## R10.4 · Confidencialidad (doble vía) en primer ingreso
- **Portal del cliente**: al abrir por primera vez, cláusula de confidencialidad **mutua** (nosotros↔cliente) a aceptar y almacenar.
- **Usuarios internos**: al primer ingreso, cláusula amplia (resguardo de datos de clientes/empresa, uso interno de recursos). Persistente por usuario.

## R10.5 · Aprendizaje por tipo de usuario (Academia)
- Varios **bloques de aprendizaje según rol**: completo (dirección), sin finanzas (operativo/comercial), solo marketing/comunicación, solo administrativo, operativo completo, asesor. **Habilitable por tipo de usuario**.
- Bloque por defecto en Academia con **control de avances + recursos inteligentes** (videos embebidos, imágenes, infografías) — sirve de demo de utilidad. Recursos creables manual o con IA, iterables.

## R10.6 · Capacitación TÉCNICA interna (no visible al cliente)
- Módulo interno (solo equipo): manejo de la plataforma, **cómo mostrar el demo**, configuración técnica (bases de datos, backend, automatizaciones, integraciones), **migración de información** por cliente, soporte, y **adaptación por plan** (transversal con usuarios → avanzados → 100% personalizables por módulo) + soporte posterior.

## R10.7 · Manuales + documento maestro + guiones HeyGen
- Generar al final: **manual completo** de la plataforma y **uno por módulo** (PDF + interactivo) + **documento maestro** para producir recursos de aprendizaje.
- **Guion de capacitación por módulo** para videos con **HeyGen** (audio + avatar). Entregar prompts/guiones por módulo.

## R10.8 · Acceso del cliente al portal + embebido en web
- Definir ingreso del cliente: **link embebido en la página web** de la empresa + **link directo al portal del cliente**. Patrón de usuario/contraseña autogenerado (correo/identificación + contraseña temporal por WhatsApp/correo). Real en migración A&S.
- Al crear usuario: enviar credenciales/bienvenida por **correo y WhatsApp**; crear su **comisión, correo de plataforma (conectable), teléfono**.

## R10.9 · Demo interactivo ampliado (cliente y socios)
- Actualizar el demo interactivo inicial para **mostrar beneficios y bondades reales** del prototipo actual (ya no genérico).

> Nota de continuidad: el usuario prefiere **permanecer en este chat** para no perder contexto ni plan. Mantener snips al día.

## ⚠️ BUGS PENDIENTES (lote 25-jun) — corregir sin falta, por lotes
- ✅ Importador: selector de archivo ahora abre (v0.68). Scroll ya no salta en ficha cliente/finanzas (v0.68).
- **KPIs clicables faltan**: Inicio, Leads, Aseguradoras, Cliente360 (todas las pestañas), CRM general, Finanzas, Marketing, Academia, Insights (varias vistas). Patrón único de KPI clicable → drawer de detalle.
- **Correo interno**: símbolo de correo en ficha cliente/calidad abre Outlook del PC; debe abrir el redactor de la plataforma (window.__orbitCompose). Bandeja/redactar del tab Correos no funcionan.
- **Botones que no cargan**: actividad reciente "ver todo"; resumen no clicable; siniestros en ficha; comisiones ficha sin detalle; renovaciones "renovar"/"comparar"/"cargar propuesta"/"enviar al cliente"; cotizador "+aseguradora"; configuración (subir logo, subir manual, agregar país, configurar integración); reportes "programar por correo"; calidad "campaña de actualización"; plantillas (sin pines/emojis); portal (varios botones, notificaciones, adjuntar en solicitud, aprende sin detalle).
- **Cotizador/Comparativo**: datos requeridos por **ramo** (auto/GM/otros) con desplegables marca/línea/modelo; cargar PDFs en cotizador; historial de cotizador y de comparativo (seleccionar→ver/editar/convertir/pedir inspección-emisión); derivar a comparativo desde cotización; comparativo más rico (como el actual). Vincular SIEMPRE a Orbit Aseguradoras.
- **Conciliación**: al aplicar pago "por conciliar" → cargar factura para conciliar/complementar; dónde se concilia.
- **Reportes**: exportar también Excel/PDF; ampliar columnas (asesor en comisiones); administración para crear/editar reportes y verlos por aseguradora/asesor.
- **Finanzas**: KPIs detalle; importadores abrir selector; dashboard profundo (tablas+comparativos reales, no solo gráficas); CxC/CxP detalle; financiación crear acreedor + abono muestra todos; import histórico actualiza CxC/CxP/financiación/presupuesto; liquidación asesor con **recibo imprimible** + detalle; scroll submenú.
- **Nuevo cliente**: ventana de creación con datos completos + creación inteligente cargando varios documentos.
- **Orbit IA**: módulo con detalle, apoyo en cualquier módulo o sobre cliente/cotización/póliza/concepto.
- **Notificaciones WA**: módulo faltante; notificaciones del portal clicables.
- **Novedades**: editor amplio con emojis/formato; ítem clicable a detalle.
- **Importadores**: opción ITERAR visible en todos; siniestros "importar bitácora" abre "importar clientes" (corregir kind); definir dónde importar bitácora (crea/actualiza reclamo).
- **Multitenant/branding**: logo en topbar+login cambia al subir; confirmar.

## Estado al cierre de sesión · v0.86 (25 Jun 2026)

### ✅ Completado en esta sesión (v0.83–v0.86)
- Correo interno (no mailto) · Orbit IA módulo · Notificaciones WA módulo
- Cotizador: campos dinámicos por ramo, historial tab, wiring ramo→re-render
- Cobros: aplicar pago con modal real (fecha + factura + conciliación automática)
- Cobros: filtro por póliza en ficha cliente (tabCobros)
- Insights: comparativo profundo con tabla 12 meses clicable, drill-down, nueva vs renovada
- Academia: bug backticks + curso null + rol filter corregidos
- Automatizaciones: ruta añadida al NAV
- Reportes: Excel + PDF además de CSV
- 8 roles con módulos predeterminados · Paletas suave+coral · Tipografía selector
- Responsive global · Editor novedades con emojis · Logo uploader real

### 🔲 Pendiente v0.87 (todo #121)
1. Cotizador: guardar en historial al cotizar; PDF upload de propuestas
2. Conciliación Finanzas: widget estado bancario vs recibos pagados
3. Póliza: editar asesor directo + sustitución vehículo desde endosos
4. Demo interactivo: actualizar HTML+PDF con módulos v0.86
5. Academia: 14 cursos por módulo con contenido profundo
6. Handoff A&S: actualizar docs/handoff-migracion-as.html con v0.86+

### Para retomar
```
"Continua Orbit 360 v0.86. Lee orbit360-platform/docs/PLAN-INFRAESTRUCTURA.md 
y CHANGELOG.md. Retoma desde pendientes del todo #121."
```

---

## Estado al cierre de sesión · v1.47 (1 Jul 2026)
> Sesión enfocada en cerrar los hallazgos P0 de la auditoría forense y la profundización opcional. **La usuaria YA migró**; lo que se traslada al backend son estas **mejoras** del prototipo (referencia de lógica/UX, no reescritura).

### ✅ Completado (v1.42 → v1.47)
- **v1.42–1.43 · Login + fecha**: franja blanca del logo a sangre + cintilla roja; `applyBrand()` se ejecuta también al mostrar el login (el logo del cliente ya aparece antes de entrar); `Orbit.ui.now()/monthLabel()` dinámicos (se eliminó "Junio 2026" quemado); Inicio lee metas de la colección `metas`. PWA (manifest+favicon dinámicos del logo, `beforeinstallprompt`) cableada — validar en hosting real.
- **v1.44 · Finanzas profundo (audit §2.5)**: KPIs clicables con **desglose** (`drillKey`/`drillModal`) en Movimientos, CxC/CxP y Presupuesto; **CxC/CxP** abren el movimiento completo (ver/editar/eliminar/cambiar estado) y arrastran mes a mes; **Presupuesto editable** (`+ Partida`, editar/eliminar, **Replicar mes anterior**) leyendo/escribiendo la colección `presupuesto` (se quitaron arrays quemados).
- **v1.45 · Cobros (navegación cruzada)**: botón **💳 Pagar** directo desde la tabla (modal `aplicarPago` reutilizable); nº de póliza y nombre de cliente enlazados; drawer del recibo con **Ver cliente** / **Ver póliza**. **Bug corregido**: la tabla no se refrescaba tras aplicar pago (re-render apuntaba a `mod-host` inexistente → `host`).
- **v1.46 · Metas inteligentes (Insights)**: la vista Metas lee la colección editable `metas` del mes (empresa: prima/recaudo/nueva/renovada) con fallback por asesor; **✨ Sugerir metas del próximo mes** (promedio 3 meses +10 %, ajustable, upsert a `metas`). Comparativo general→particular (asesor/ramo/aseguradora + drill por mes/fila) verificado en vivo.
- **v1.47 · Cotizador**: 3er nivel **marca→línea→modelo** (`VEH_MODELOS` + fallback de trims). El Comparativo ya lo tenía (incluido en su PDF). Academia ya embebe recursos en grande (iframe 62–74vh, imágenes 100%).

### 🔲 Pendiente (no bloquea migración — profundización)
1. Cotizador: guardar cotización en historial al cotizar; PDF upload de propuestas; plantilla de impresión visual por aseguradora (logo/color).
2. Finanzas: conciliación bancaria con estado de cuenta real (widget cruce recibos↔depósitos).
3. Academia: completar los 14 cursos con contenido profundo + videos HeyGen.
4. Demo interactivo + handoff HTML: regenerar con módulos v1.47.
5. Unificar las 3 fuentes de metas (campo `asesor.metaPrima`, colección `metas`, `cat.metas`) en un solo modelo al pasar a backend.

### Para retomar (actualizado)
```
"Continúa Orbit 360 v1.47. Lee orbit360-platform/docs/PLAN-INFRAESTRUCTURA.md 
(Estado al cierre v1.47) y CHANGELOG.md. Sigue con los pendientes de profundización."
```
