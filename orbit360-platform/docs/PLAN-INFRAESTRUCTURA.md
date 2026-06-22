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
