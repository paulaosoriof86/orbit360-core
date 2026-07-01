# CAMBIOS-PROTOTIPO.md — Bitácora de mejoras para aplicar a TyA

> Cada entrada describe un cambio hecho en el prototipo CXOrbia DESPUÉS de la migración inicial.
> Úsalo para replicar las mejoras en tu plataforma de TyA ya migrada.
> Formato: archivo · qué cambió · por qué · cómo aplicarlo · cómo probarlo.

---

## Sesión 50 — 2026-06-29

### 1. IA multi-proveedor SIN sesgo (Gemini/ChatGPT/Claude/Endpoint propio)
- **ARCHIVO:** `app/core/automations.js` (objeto `CX.ai`)
- **QUÉ CAMBIÓ:** Se quitó el sesgo a Gemini. `defaults()` ahora arranca sin proveedor preseleccionado (`provider:''`). `PROVIDERS` ahora incluye metadatos de costo/beneficio (`costo`, `fuerte`, `ideal`) y más modelos por proveedor: Gemini (2.0-flash, 1.5-flash, 1.5-flash-8b, 1.5-pro), OpenAI (gpt-4o-mini, gpt-4o, o1-mini), Anthropic (claude-3-5-haiku, claude-3-5-sonnet, claude-3-opus), custom.
- **POR QUÉ:** Cada consultora debe elegir su IA por costo/beneficio, no quedar forzada a Gemini.
- **CÓMO APLICARLO A TyA:** Reemplazar el bloque `CX.ai = {...}` en `core/automations.js` con la versión nueva (incluye `PROVIDERS` enriquecido y `ready()` que valida `provider`).
- **CÓMO PROBARLO:** Configuración → Integraciones → IA: deben aparecer los 4 proveedores con sus modelos. Ninguno preseleccionado por defecto.

### 2. PWA — instalación automática como app + favicon = logo de la consultora
- **ARCHIVOS:** `app/app.js` (funciones nuevas `CX.setFavicon`, `CX.setupPWA`, llamadas en `init()`), `app/sw.js` (nuevo, service worker).
- **QUÉ CAMBIÓ:**
  - `CX.setFavicon()`: pone el logo de la marca como favicon y apple-touch-icon. Si no hay logo, genera un favicon SVG con el color de marca.
  - `CX.setupPWA()`: registra `sw.js`, detecta dispositivo/navegador. En Chrome/Edge/Android captura `beforeinstallprompt` y lo dispara automáticamente al primer gesto del usuario. En iOS Safari muestra una guía discreta (no soporta prompt programático).
- **POR QUÉ:** El usuario pidió descarga/instalación automática como app, sin instrucciones manuales, con el favicon de la consultora.
- **CÓMO APLICARLO A TyA:** Copiar `sw.js` a la raíz de `/app`. Agregar las funciones `CX.setFavicon` y `CX.setupPWA` al inicio de `app.js` y llamarlas en `init()` (después de `CX.applyBrand()`).
- **CÓMO PROBARLO:** Abrir en Chrome → debe aparecer el prompt de instalación al hacer clic. El favicon de la pestaña debe ser el logo cargado en Identidad de Marca.
- **NOTA BACKEND:** Para que el favicon del logo persista en producción, el logo debe servirse desde Storage (no solo localStorage). Anotar para ChatGPT.

### 3. Roles de franquicia: Coordinador/Representante y Aliado/Franquiciado
- **ARCHIVO:** `app/core/config.js` (`CX.ROLES`)
- **QUÉ CAMBIÓ:** Se agregaron 2 roles entre `ops` y `shopper`:
  - `coordinador` (Coordinador / Representante): administra proyectos y HR de su(s) país(es) asignado(s). `scopeCountry:true`.
  - `aliado` (Aliado / Franquiciado): opera proyectos regionales delegados, su país y sus shoppers. `scopeCountry:true`.
- **POR QUÉ:** Modelo de franquicia: la consultora da acceso a representantes/coordinadores de otros países para administrar proyectos/HR de un país específico.
- **CÓMO APLICARLO A TyA:** Agregar los 2 objetos al array `CX.ROLES` en `core/config.js`.
- **PENDIENTE (próxima sesión):** Implementar el filtrado real por `scopeCountry` (que el coordinador solo vea su país), la asignación de país por usuario en Usuarios & Permisos, y la auditoría de quién gestionó cada acción.
- **CÓMO PROBARLO:** Usuarios & Permisos → al crear/editar usuario, los 2 roles nuevos aparecen en el selector.

### 4. Documentos enviables a TyA (no son código — son guías)
- `CXOrbia - Comparativo de Modelos de IA.html` — cuadro comparativo costo/beneficio de Gemini/ChatGPT/Claude/Endpoint propio, en formato Orbia. Imprimible a PDF.
- `CXOrbia - Guía Maestra de Migración a TyA.html` — actualizada con creación de base de datos NUEVA + documentación obligatoria.

---

### 5. Login white-label: logo del cliente + banderitas + "Desarrollado por CXOrbia"
- **ARCHIVOS:** `app/app.js` (`showLogin`), `app/styles/layout.css`
- **QUÉ CAMBIÓ:** El login ahora muestra el logo del cliente (reemplaza el de CXOrbia SOLO en el login, NO en el sidebar). Si el cliente es franquicia/representante, muestra banderitas de sus países (`CX.BRAND.countries` o los países configurados). Footer "Desarrollado por CXOrbia" con logo pequeño cuando hay marca de cliente.
- **POR QUÉ:** Que el login se sienta del cliente (franquicia), conservando crédito a CXOrbia abajo.
- **CÓMO APLICARLO A TyA:** Reemplazar `showLogin()` en `app.js` y agregar las clases `.login-flags` y `.login-poweredby` en `layout.css`.
- **NOTA:** Para las banderitas por país de la franquicia, setear `CX.BRAND.countries = ['GT','HN']` en la config del tenant.

### 6. P0 — Mis Visitas y Mis Beneficios filtran SOLO por shopper autenticado
- **ARCHIVOS:** `app/modules/misvisitas.js`, `app/modules/beneficios.js`
- **QUÉ CAMBIÓ:** Las tarjetas activas de Mis Visitas (asignada/agendada/realizada) ahora salen de `visitsForShopper(shopperId)`, no de todo el proyecto. Mis Beneficios filtra las liquidaciones por las visitas del shopper autenticado.
- **POR QUÉ:** Bug crítico del resumen de ChatGPT (P0.1, P0.2): un shopper podía ver/actuar sobre visitas y beneficios que no eran suyos.
- **CÓMO APLICARLO A TyA:** Reemplazar el encabezado de ambos módulos (las primeras ~8 líneas donde se define `base`/`all`).
- **NOTA BACKEND:** El filtro usa `shopperId`. Confirmar que cada visita/liquidación migrada tenga el `shopperId` correcto (no solo nombre). Los aliases de nombre son solo para histórico, no para permisos.

---

### 7. Login: banderitas + "Desarrollado por CXOrbia" siempre visibles
- **ARCHIVO:** `app/app.js` (`showLogin`)
- **QUÉ CAMBIÓ:** Las banderitas de países y el footer "Desarrollado por CXOrbia" ahora se muestran siempre (antes solo con logo de cliente cargado).
- **CÓMO APLICARLO A TyA:** Ya incluido en el `showLogin` reemplazado.

### 8. Logo del cliente en topbar y propuestas (white-label)
- **ARCHIVOS:** `app/core/topbar.js` (`renderLogo`, ya existía), `app/modules/comercial.js` (encabezado de propuesta)
- **QUÉ CAMBIÓ:** La propuesta generada ahora muestra el logo del cliente en el membrete. El topbar ya tiene slot de logo (`#tbClientLogo`) que se llena con `CX.BRAND.logo`.
- **DÓNDE SE CONFIGURA EL WHITE-LABEL:** Configuración → 🎨 Marca (Identidad de Marca) → subir logo. Aplica a: topbar, login, propuestas y documentos.
- **CÓMO APLICARLO A TyA:** Reemplazar el encabezado de propuesta en `comercial.js`.

### 9. Finanzas: CxC/CxP clickeables con detalle, editar y cambiar estado
- **ARCHIVOS:** `app/core/finanzas-core.js` (`editCx`, `delCx`), `app/modules/finanzas.js` (modal detalle CxP)
- **QUÉ CAMBIÓ:** Cada cuenta por pagar/cobrar es clickeable → modal con saldo editable, estado (pendiente/parcial/pagada/programada), nota, eliminar. Muestra shopper/acreedor y visita vinculada.
- **POR QUÉ:** La usuaria reportó que CxC/CxP no tenían detalle ni opción de editar/cambiar estado.
- **CÓMO APLICARLO A TyA:** Agregar `editCx`/`delCx` a `finanzas-core.js` y el bloque `data-cxdet` en `finanzas.js`.

---

### 10. IA real (CX.ai.ask) + docs entregables ChatGPT
- **ARCHIVO:** `app/core/automations.js` (`CX.ai.ask`)
- **QUÉ CAMBIÓ:** Se implementó `CX.ai.ask(prompt)` con fetch REAL a Gemini/OpenAI/Anthropic/custom según el proveedor configurado. Antes el método se invocaba en 6 módulos (importador, marca, academia, correo, crm, set-up) pero NO existía → al conectar una key, fallaba. Ahora es funcional: con key conectada usa IA real con el documento/prompt; sin key, los módulos caen a su heurística.
- **POR QUÉ:** Raíz de #163 (IA no hardcodeada). El análisis IA, set-up, importador y generación ahora son reales al conectar el proveedor.
- **CÓMO APLICARLO A TyA:** Reemplazar el bloque `CX.ai = {...}` en `core/automations.js` (ya incluye `ask`).
- **DOCS NUEVOS:** `RESUMEN-PARA-CHATGPT-BACKEND.md`, `PENDIENTES-PROTOTIPO.md`, `CHECKLIST-VALIDACION-PROTOTIPO.md` en `app/docs/` (los 4 entregables que exige el resumen de ChatGPT).

---

### 11. Login: banderitas solo de países configurados + Manuales completos en Academia
- **ARCHIVOS:** `app/app.js` (banderitas), `app/core/manuales-data.js` (nuevo), `app/modules/academia.js` (botón + lector), `app/index.html` (cargar script)
- **QUÉ CAMBIÓ:**
  - Login: las banderitas ahora muestran SOLO los países configurados del tenant (`CX.BRAND.countries`) o los de los proyectos reales — no todos los de LatAm.
  - Academia → botón **📖 Manuales**: biblioteca de manuales completos legibles in-app, navegables por secciones. Manual Maestro (Super Admin, todo el sistema) + manuales por rol (admin, ops, coordinador, shopper, cliente). Autoadministrable (crear/editar).
- **CÓMO APLICARLO A TyA:** Copiar `core/manuales-data.js`, cargarlo en `index.html` antes de academia, y aplicar los cambios de `academia.js` (botón acadManuales + openManuales/readManual) y `app.js` (banderitas).
- **NOTA:** Para que el login muestre solo TUS países: Configuración → Países, o setear `CX.BRAND.countries`.

---

### 12. Login: banderitas como chips (Windows no renderiza emoji de bandera)
- **ARCHIVOS:** `app/app.js` (flagsRow), `app/styles/layout.css` (.cflag)
- **QUÉ CAMBIÓ:** Las banderitas emoji (🇬🇹) no se renderizan en Windows (muestran "GT"). Se reemplazaron por chips estilizados con el código de país y tooltip con el nombre — se ven igual en todo dispositivo.
- **CÓMO APLICARLO A TyA:** Reemplazar flagsRow en `app.js` y agregar `.login-flags .cflag` en `layout.css`.

---

### 13. Banderitas reales + estados honestos en Integraciones + Manual de Integraciones
- **ARCHIVOS:** `app/app.js` (flagsRow con `<img>` flagcdn), `app/styles/layout.css` (.cflag con img), `app/modules/integraciones.js` (estados honestos)
- **QUÉ CAMBIÓ:**
  - Banderitas del login: ahora usan imágenes reales de banderas (flagcdn.com) con fallback a código de país — antes eran emoji que Windows no renderiza.
  - Integraciones: "Probar conexión" ahora dice "Prueba simulada · validación real en backend"; guardar dice "configurado · pendiente de validación en backend" (honestidad de estados que exige el resumen V53 de ChatGPT — no prometer conexión real sin backend).
- **DOC NUEVO:** `CXOrbia - Manual de Integraciones.html` — qué hace cada integración, cómo configurarla y su valor agregado, con estados (funciona/requiere backend/según plan).
- **CÓMO APLICARLO A TyA:** Reemplazar flagsRow en app.js, .cflag en layout.css, y el configModal de integraciones.js.

---

### 14. CRM↔Propuestas: propuestas vinculadas a la ficha del cliente
- **ARCHIVOS:** `app/modules/comercial.js` (CX.propStore + guardar al exportar/enviar), `app/modules/crm.js` (sección Propuestas en Ficha 360)
- **QUÉ CAMBIÓ:** Al exportar/enviar una propuesta queda guardada y vinculada al cliente con estado (borrador/enviada/aceptada/rechazada) e historial. En la Ficha 360 de la Cuenta aparece la sección 📄 Propuestas: clic para ver detalle, cambiar estado, retomar en Costos o eliminar.
- **POR QUÉ:** #159 — trazabilidad comercial completa: las propuestas no se pierden, son retomables y editables desde la ficha.
- **CÓMO APLICARLO A TyA:** Agregar `CX.propStore` al inicio de `comercial.js`, hookear propPdf/propSend, y la sección Propuestas + handler propRow en `crm.js`.

---

### 15. CRM↔Proyectos vinculado + tareas con navegación cruzada
- **ARCHIVOS:** `app/modules/proyectos.js` (vínculo a cuenta CRM al guardar), `app/modules/crm.js` (tareas con campo "vincular a módulo" + navegación)
- **QUÉ CAMBIÓ:**
  - #157: al guardar un proyecto con cliente, se vincula a la Cuenta del CRM (`cu.proyectos[]`) — trazabilidad bidireccional.
  - #158: al crear una tarea en el CRM puedes vincularla a un módulo (Proyecto/Propuesta/Visita/Postulación); en el dashboard la tarea muestra un chip clickeable que navega a ese módulo.
- **CÓMO APLICARLO A TyA:** Aplicar el bloque de vínculo en el save de `proyectos.js` y el campo `actLink2`/chip `crm-goto` en `crm.js`.
- **BLOQUE CRM COMPLETO:** #155 (Ficha 360), #156 (clientes desde CRM), #157 (proyectos), #158 (tareas), #159 (propuestas) — todo cerrado.

---

### 16. Asignar responsable + Soporte notifica + Importador Excel real (SheetJS)
- **ARCHIVOS:** `app/core/automations.js` (store de asignaciones #167), `app/modules/midia.js` (bloque pendientes), `app/modules/soporte.js` (botón asignar + notifica solicitante), `app/index.html` + `app/modules/importador.js` (SheetJS)
- **QUÉ CAMBIÓ:**
  - #167: `CX.automations.asignar()` — asigna un responsable a cualquier ítem de gestión interna; notifica al responsable y aparece en Mi Día hasta resolverse. Botón "📌 Asignar responsable" en el detalle de soporte.
  - #173: al cambiar el estado de un ticket, se notifica al solicitante (datos vivos).
  - #160: los importadores AI y HR ahora leen Excel real (.xlsx) con SheetJS — convierte a CSV automáticamente.
- **CÓMO APLICARLO A TyA:** Copiar el store de asignaciones a `automations.js`, el bloque en `midia.js`, los handlers en `soporte.js`, el `<script>` de SheetJS en `index.html` y los handlers de archivo en `importador.js`.

---

### 17. Reportes: exportación CSV real
- **ARCHIVO:** `app/modules/operacion-extra.js` (módulo informes)
- **QUÉ CAMBIÓ:** "⤓ Excel" ahora exporta un CSV real (descarga del archivo con BOM UTF-8) extrayendo la tabla del reporte; "⤓ PDF" usa window.print. Antes solo mostraban un toast.
- **CÓMO APLICARLO A TyA:** Reemplazar los handlers rptPdf/rptXls en el openReport de `operacion-extra.js`.

---

### 18. Ficha 360 hub Orbit360 + Marketing IA con criterios
- **ARCHIVOS:** `app/modules/crm.js` (fichaHub con pestañas), `app/modules/marketing.js` (genMonth)
- **QUÉ CAMBIÓ:**
  - #155+: la Ficha 360 de la cuenta es ahora un hub con pestañas navegables (Resumen, Oportunidades, Proyectos, Propuestas, Contactos, Correos, Documentos, Timeline); cada dato es clickeable; registrar/vincular correos, subir documentos, editar cuenta, crear contactos. "Convertir en Cliente" solo aparece si aún no es cliente.
  - #177: "Generar mes con IA" del Marketing ahora pide criterios estratégicos: nº piezas, periodicidad, objetivo del embudo (TOFU/MOFU/BOFU/reclutamiento), tono, herramienta (Gemini/ChatGPT/Canva/HeyGen), CTA, temáticas, hashtags y enlace WhatsApp.
- **CÓMO APLICARLO A TyA:** Reemplazar la función `fichaHub` y el handler `[data-cuenta]` en `crm.js`; reemplazar `genMonth` en `marketing.js`.

---

### 19. Manuales: visor a pantalla completa (Orbit360 style)
- **ARCHIVO:** `app/modules/academia.js` (`readManual`)
- **QUÉ CAMBIÓ:** El manual ya NO abre en modal — se abre a pantalla completa en el área del módulo, estilo Orbit360: barra superior oscura con título + progreso, sidebar de secciones navegable, contenido amplio, botón Imprimir/PDF. Admin puede agregar y editar secciones (WYSIWYG) o eliminarlas.
- **CÓMO APLICARLO A TyA:** Reemplazar la función `readManual` en `academia.js`.

---

### 20. Academia: Crear manual completo + Crear curso con IA real
- **ARCHIVO:** `app/modules/academia.js` (`crearManual`, handler `aiGo`)
- **QUÉ CAMBIÓ:**
  - #189/#190: "Crear manual" ahora abre ficha completa: título, icono, visibilidad por rol (quién lo ve), descripción, contenido inicial desde idea/texto o recurso subido, y opción de estructurar con IA en secciones.
  - #191: botón "Crear con IA" de cursos ahora genera un curso real con `CX.ai.ask` (4-6 lecciones + quiz), editable e iterable. Sin key avisa que configure IA.
- **CÓMO APLICARLO A TyA:** Añadir `crearManual` y reemplazar el handler `aiGo` en `academia.js`.

---

### 21. Documentos → "Recursos del proyecto": visor pantalla completa + generación IA
- **ARCHIVO:** `app/modules/documentos.js`
- **QUÉ CAMBIÓ:** Renombrado a "Recursos del proyecto" (incluye documentos, videos, imágenes, checklists). El visor abre a PANTALLA COMPLETA en el área del módulo (no modal): barra superior, descargar, imprimir. Botón "✨ Generar con IA" crea instructivo, checklist de visita, escenario o protocolo desde idea/texto/documento base (con CX.ai.ask). El upload ya tiene selector de tipo.
- **CÓMO APLICARLO A TyA:** Reemplazar `viewer`, el header y añadir handler `docIA` en `documentos.js`.

---

### 22. FIX crítico manuales + temas grises + más paletas
- **ARCHIVOS:** `app/modules/academia.js` (bug `const m=`), `app/core/config.js` (label menú + 4 temas nuevos), `app/styles/layout.css` (rail gris)
- **QUÉ CAMBIÓ:**
  - 🔴 FIX CRÍTICO: los manuales no abrían porque al insertar `crearManual` se borró la línea `const m=(CX.manualesData.all()).find(...)` de `readManual` → `m` quedaba indefinido. Restaurada. Verificado con clic real: el Manual Maestro abre a pantalla completa.
  - Menú "Documentos" → "Recursos del proyecto".
  - 4 temas nuevos: Corporativo gris oscuro (letras blancas), Corporativo gris claro (letras negras), Índigo, Teal. Tipografía ya seleccionable en Identidad de Marca (10 fuentes).
- **CÓMO APLICARLO A TyA:** Reemplazar `readManual` en academia.js, `CX.THEMES`+label en config.js, y agregar los bloques `[data-rail="graydark"]`/`[data-rail="graylight"]` en layout.css.

---

### 23. Recursos + Academia: embebido inline completo
- **ARCHIVOS:** `app/modules/documentos.js` (IA en edición), `app/modules/academia.js` (tipo lección "documento")
- **QUÉ CAMBIÓ:**
  - #195: editar un recurso ahora permite "✨ Mejorar/generar con IA" dentro de la ficha (instrucción + CX.ai.ask, iterable). Los recursos subidos ya se embeben inline (PDF/imagen/video) en el visor a pantalla completa.
  - #196: nueva lección tipo "📄 Documento" — sube PDF/imagen y se embebe inline en la lección (iframe PDF / img), igual que en Recursos.
- **CÓMO APLICARLO A TyA:** Añadir el botón edIA en documentos.js y el tipo "doc" en el modal de nueva lección de academia.js.

---

### 24. Importador: iterar/refinar el análisis con IA
- **ARCHIVO:** `app/modules/importador.js`
- **QUÉ CAMBIÓ:** #192 — en el preview del análisis IA, botón "✏️ Iterar/refinar": el usuario da una instrucción (corregir mapeo de columnas, separar entidades, normalizar fechas, excluir filas) y reanaliza con CX.ai.ask respetando el ajuste. Antes el análisis era un solo paso sin corrección.
- **CÓMO APLICARLO A TyA:** Añadir el botón aiIter en el step 2 de drawAI en importador.js.

---

### 25. Finanzas pago por shopper + cuestionario interno sincroniza estado
- **ARCHIVOS:** `app/core/data.js` (payVisits), `app/modules/cuestionario-shopper.js`
- **QUÉ CAMBIÓ:**
  - #168 (parte): pago de lote genera un movimiento de egreso POR SHOPPER ("Honorario · Nombre" con su lote y visita), no un consolidado "Pago lote".
  - #198: el cuestionario INTERNO (en plataforma), al enviarse, actualiza automáticamente el estado de la visita a "cuestionario" + submit, sin acción manual — distinto del cuestionario externo/hoja colaborativa que sí requiere marcar manual.
- **CÓMO APLICARLO A TyA:** Reemplazar payVisits en data.js y el handler #qSubmit en cuestionario-shopper.js.

---

## Cómo aplicar estos cambios a TyA (proceso general)

1. **Si TyA corre desde el repo de GitHub:** haz pull de los archivos listados arriba (o reemplázalos manualmente). El backend (Firebase) NO se toca — estos cambios son solo de frontend.
2. **Archivos tocados esta sesión:** `core/automations.js`, `core/config.js`, `app.js`, `sw.js` (nuevo).
3. **Verifica** que la app cargue sin errores de consola tras reemplazar.
4. **Avísale a ChatGPT** (backend) los puntos marcados como NOTA BACKEND para que ajuste lo necesario (ej. servir el logo desde Storage).

---

## Pendientes 🔴 priorizados (próximas sesiones)

Ver `PENDIENTES-PROTOTIPO.md` para la lista completa. Top de impacto para TyA:
1. **IA real no hardcodeada** — que análisis/set-up/hoja de ruta usen el modelo conectado con el documento adjunto (no respuestas simuladas).
2. **Finanzas profundo** — CxC/CxP editables con detalle por shopper, impuestos por país, importador inteligente de movimientos.
3. **Postulaciones** — todos los botones + sincronía bidireccional sin duplicación.
4. **P0 shopper** — Mis Beneficios / Mis Visitas filtran solo por shopper autenticado.
5. **Academia** — cursos profundos + manuales visibles + recursos que se embeben.
