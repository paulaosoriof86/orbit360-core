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
2. ✅ Infraestructura transversal (theming, login, multipaís, importación scaffold) + **refinamiento UI ronda 2**.
3. ⏳ **Expediente del cliente completo** (editable + automatizaciones + recordatorios + recibos + Drive). ← siguiente
4. ⏳ **Configuración sin código** (marca/branding, usuarios/roles/permisos, países/monedas, add-ons/Make, APIs, planes). ← habilita la autonomía
5. ⏳ **Finanzas** (import estados de cuenta, movimientos históricos + mensuales, liquidaciones empresa/asesores, doble conciliación).
6. ⏳ **Ops + Leads** (kanban Trello configurable, sin prospectos en Ops, enlazados, cadencias).
7. ⏳ **Aseguradoras** (ficha + plantilla + directorio + Drive; fusión con cotizador).
8. ⏳ **Integrar Cotizador + Comparativo** (módulo aislado; tarifas configurables).
9. ⏳ **Marketing** (calendario + import) · **Reportes** · **Portal del Cliente** · **IA**.

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
