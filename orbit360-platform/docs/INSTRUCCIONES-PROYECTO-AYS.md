# INSTRUCCIONES DEL PROYECTO — Migración Alianzas y Soluciones (A&S) sobre Orbit 360

> **Este documento es la "instrucción del proyecto" (CLAUDE.md) para el nuevo proyecto de
> personalización de A&S.** Pégalo como `CLAUDE.md` en la raíz del nuevo proyecto. No es el
> prompt de la conversación: es el contrato fijo que cualquier sesión nueva debe leer primero.

---

## 1. Qué es esto
**Orbit 360** es el sistema 360 comercializable para intermediarios de seguros (build greenfield,
white-label, multi-tenant vía `Orbit.tenant`). **A&S es el PRIMER CLIENTE** y se personaliza
**solo por configuración** (logo, paleta, país por defecto, aseguradoras vinculadas, glosario,
tarifas). NO se reescribe código por cliente.

El código vive en `orbit360-platform/` (esa carpeta ES el repo `paulaosoriof86/orbit360-core`).

## 2. Reglas fijas (no negociables)
- Marca **Orbit 360** en el chrome (hay slot de logo del cliente white-label; NO logo A&S fijo).
- Datos siempre **ficticios** en el prototipo. **NO mostrar notas técnicas** (Firebase, demo, etc.) en UI.
- Paleta base: rojo `#C5162E`, grafito `#1E2227`, gris/blanco. Paleta **seleccionable** por cliente.
- Tipos: Manrope (display), Source Sans 3 (texto), JetBrains Mono (mono).
- Fondo oscuro → texto blanco. Moneda por país, **no mezclar**. Producción/metas/comisiones sobre **prima NETA recaudada**.
- **Capa de datos única**: los módulos NUNCA tocan localStorage directo, solo `Orbit.store`. Esto
  permite cambiar a backend sin tocar módulos.

## 3. Arquitectura (para conectar backend e integraciones)
```
index.html        → shell (login white-label, topbar, sidebar dinámico, novedades)
styles/           → tokens.css, base.css, infra.css
data/store.js     → CAPA DE DATOS ÚNICA (hoy localStorage; swappable a backend)
data/seed.js      → datos ficticios demo
core/             → theme, ui, config (NAV+tenant+ROLES+GEO), queries, crmkit, importa, novedades, auth, router, primas, comeng, cat, ia, ciclo, correo
modules/          → inicio, cliente360, polizas, cobros, renovaciones, cancelaciones, comisiones,
                    historial, importar, configuracion, finanzas, calidad, plantillas, ops, leads,
                    aseguradoras, siniestros, academia, marketing, reportes, ia, notificaciones,
                    automatizaciones, equipo, portal, cotizador, comparativo
docs/             → planes, manuales, capacitaciones, handoff, ESTE archivo
```

### Cómo conectar el backend (Firebase u otro)
Toda lectura/escritura pasa por `Orbit.store`. Para migrar a backend **solo se reescribe
`data/store.js`** manteniendo su API:
- `Orbit.store.all(coll)` · `get(coll,id)` · `where(coll,fn)` · `insert(coll,obj)` ·
  `update(coll,id,patch)` · `remove(coll,id)` · `_emit()` (notifica cambios).
- Reemplazar el cuerpo por llamadas a Firestore (`collection().onSnapshot`, `.add`, `.doc().update`).
- Mantener `_emit` para que los módulos se re-rendericen al llegar datos en vivo.
- Las colecciones (clientes, polizas, cobros, comisiones, reclamos, gestiones, negocios, finmovs,
  contenidos, cursos, aseguradoras, asesores, vehiculos, acreedores, facturas) → colecciones Firestore.
**Ningún módulo se toca.** Esa es la razón de la capa única.

## 4. Migración de datos — PARTE 1 (importadores inteligentes)
La migración se hace con el **Importador inteligente** (módulo Importar + botón "⬇ Importar" en
cada sección). Acepta CSV, Excel (.xlsx), PDF (texto), Word, imagen (OCR). Mapea por sinónimos de
encabezados y escribe al `store` con deduplicación. Botón **"🔄 Iterar / mejorar"** = re-mapeo
manual columna→campo cuando el archivo trae encabezados distintos.

**Orden recomendado de carga:**
1. **Clientes** (o "Base de datos inicial" — detecta la entidad por las columnas).
2. **Aseguradoras** (directorio) — habilitar las vinculadas.
3. **Pólizas** — al importar **Vigente / Por renovar** genera **recibos automáticos según forma de
   pago** y los deja **en cartera (Pendiente)**. **Cancelada / Vencida = histórico** (NO genera
   cartera, pero SÍ cuenta en analítica/estadística/segmentación/campañas).
4. **Vehículos** (auto).
5. **Estados de cuenta de aseguradora** (conciliación): crea recibos faltantes y **aplica los pagos
   reportados como cobrados**; los no reportados quedan en cartera.
6. **Planillas de comisiones** — aplica tarifas % por producto + concilia.
7. **Histórico de movimientos financieros** + **estado bancario** (CxC/CxP). Permite completar mayo y junio.
8. **Bitácora de siniestros** (Orbit Siniestros → 🧠 Importar bitácora): un archivo con varios
   clientes; cada reclamo se vincula por número de póliza y queda en la ficha de cada cliente.

> **Regla de cartera:** solo queda en *cobros pendientes* lo de pólizas **vigentes o por renovar de
> este año**. El resto es histórico para estadística, análisis, campañas de recuperación, estrategia
> y segmentación.

En **producción** el "motor de extracción" se conecta a un extractor real (IA / OCR backend). En el
prototipo usa heurística de mapeo + librerías de parseo en el navegador (SheetJS, pdf.js, mammoth,
Tesseract). La lógica de mapeo y escritura al store ya es real y reutilizable.

## 5. Configuración de A&S (PARTE 2 — personalización)
Hacer todo desde **Configuración** y **Equipo** (sin tocar código):
1. **Logo del cliente** (Config → Subir logo) → aparece en login y cintilla.
2. **Paleta** (popover de paletas en topbar) → rojo A&S por defecto.
3. **País por defecto = Guatemala**; agregar Colombia. **Tasas/impuestos por país**: GT IVA 12%,
   CO IVA 19% (se definen al alta del país).
4. **Aseguradoras**: habilitar las que A&S tiene vinculadas; cargar contactos, accesos (links),
   Drive, datos de facturación.
5. **Usuarios y roles** (Equipo → Nuevo usuario): nombre, **teléfono/WhatsApp**, **correo del
   usuario** (es su login y su bandeja), **multi-rol** (checkboxes), **módulos visibles** por usuario.
   Al guardar se envían credenciales por correo/WA.
6. **Glosario / localización** por país (términos configurables).
7. **Planes comercializables** (Config) — catálogo editable.
8. **Cotizador + Comparativo**: se integran con las **tarifas de A&S** (config por cliente).

## 6. Integraciones (PARTE 3 — dejar listo para implementar)
Se configuran en **Config → Integraciones** y **Automatizaciones**:
- **Make** (orquestador): pegar URL del webhook del escenario. Cada automatización activa envía su
  payload (evento + datos + plantilla) a Make, que ramifica a WhatsApp/correo/Sheets/etc.
- **Outlook / M365 / Gmail**: correo + asociar correos a cliente/póliza/reclamo/gestión.
- **WhatsApp** (Cloud API vía Make, y wa.me para envíos directos).
- **Green API, Google Sheets, Metricool, Mailchimp, redes (FB/IG/LinkedIn/YouTube/TikTok), Canva,
  Gamma, HeyGen, NotebookLM, IA (Gemini/OpenAI/Claude)** — registradas en Config.

**Enviar la póliza al cliente con plantilla (automatización):**
Evento `poliza_emitida` en Automatizaciones → plantilla `¡Bienvenido/a {nombre}! Tu póliza {poliza}
fue emitida. Aquí tu acceso al portal: {link}` → canal WhatsApp/correo (vía Make). Las **plantillas
de texto** salen de la plataforma; el **diseño visual HTML** del correo se arma en Make. Para
WhatsApp es texto plano con variables.

## 7. Flujo de corrección de errores (mientras se recupera capacidad)
Cuando encuentres un error y mi capacidad esté agotada:
1. **Repórtalo en dos vías**: aquí en el chat (para corrección en caliente) y en la iteración del
   proyecto (queda registrado).
2. Pídele al **proyecto AyS** (Codex/otro) que **abra una bitácora de errores** en
   `docs/BITACORA-ERRORES.md` con este formato por entrada:
   ```
   ## [fecha] Módulo: <nombre>
   - Síntoma: <qué pasa, en qué pantalla, con qué pasos>
   - Esperado: <qué debería pasar>
   - Captura: <archivo>
   - Estado: ABIERTO / EN PROGRESO / RESUELTO
   - Notas técnicas: <archivo/función sospechosa si se sabe>
   ```
3. El lunes (capacidad recuperada) me dices "lee docs/BITACORA-ERRORES.md y corrige los ABIERTOS".
4. **Recomendación para que el proyecto AyS haga ajustes seguros:**
   - NUNCA tocar `Orbit.store` desde un módulo (solo su API).
   - Tras CADA cambio de módulo JS: **recargar la página completa** y verificar el render real
     (no confiar en la versión en memoria).
   - Verificar visualmente antes de entregar ZIP.
   - Mantener el patrón de cada módulo (drawer-back para modales, K.kpis/K.banner del crmkit).
   - No introducir datos hardcodeados: todo desde `Orbit.store`.

## 8. Entrega / repositorio
- **No hay push directo.** Cada versión se entrega como **ZIP de `orbit360-platform/`**.
- Subir SOLO la última versión completa (un commit que reemplaza todo) al repo
  `paulaosoriof86/orbit360-core`, **o** usar Codex adjuntando el ZIP ("descomprime en la raíz y push a main").
- El repo es **nuevo y limpio** (Orbit 360), NO el de la plataforma antigua de Alianzas.
- **Qué subir al repo (GitHub):** todo el contenido de `orbit360-platform/`.
- **Qué subir como "instrucción del proyecto":** este archivo como `CLAUDE.md`.

## 9. Cómo continuar en un chat nuevo
Decir: *"Continúa Orbit 360. Lee docs/PLAN-INFRAESTRUCTURA.md, CHANGELOG.md y
docs/INSTRUCCIONES-PROYECTO-AYS.md, y sigue con los pendientes priorizados."*

## 10. Pendientes conocidos (estado a v1.09 — TODO el plan completado)
**Listo y verificado (142/142 todos):** importadores inteligentes (clientes, pólizas con recibos
automáticos por forma de pago, vehículos, aseguradoras, bitácora siniestros multi-cliente, estados
de cuenta con conciliación real, movimientos, calendario), re-mapeo manual (Iterar), cuotas en
crear/editar/renovar, comparativo de renovación multi-aseguradora, Equipo multi-rol + correo +
módulos por usuario, automatizaciones editables, cancelaciones→ficha+Ops, CxC/CxP autoadministrables,
Academia (visor interactivo, editar/borrar curso, categorías, reordenar lecciones, videos, markdown),
Orbit IA, correo interno, notificaciones WA, **Cotizador** (marca→línea cascada, cliente/asesor,
multi-ramo, historial, impresión por aseguradora, derivación a comparativo), **Comparativo**
standalone (datos del riesgo con marca→línea, PDF, manual, historial), KPIs con modal de detalle,
cursos profundos por módulo, importación→historial vivo, logo white-label, editar planes, auto-branding.

**Ajustes finos opcionales (no bloquean migración):** extracción IA real de PDF en cotizador/comparativo
(hoy estima), dropdowns marca/línea más extensos por país, integración Canva/Metricool real (hoy stub),
embed nativo de Word (usar Drive /preview o convertir a PDF).

---

## 11. PROMPT para ChatGPT/Codex — corrección inmediata + documentar para mejorar el prototipo
> Pega este texto como **instrucción del proyecto en ChatGPT/Codex** (el repo de A&S). Garantiza que
> ChatGPT corrija sin romper y que documente para que Claude mejore el prototipo base.

```
Eres el ingeniero de mantenimiento de Orbit 360 (repo de Alianzas y Soluciones). Reglas innegociables:

1. ARQUITECTURA: los módulos NUNCA tocan localStorage ni el DOM global directo. Solo leen/escriben
   vía Orbit.store (all/get/where/insert/update/remove). Para conectar backend solo se reescribe
   data/store.js manteniendo esa API. No cambies la firma de Orbit.store.
2. NO PARCHES FRÁGILES: no dupliques lógica, no hardcodees datos, no rompas el patrón de cada módulo
   (modales = drawer-back; KPIs = Orbit.kpi / K.kpis; banners = K.banner). Reutiliza helpers existentes.
3. VERIFICA SIEMPRE: tras cada cambio de un .js, recarga la página completa y comprueba que el módulo
   renderiza sin error de consola ANTES de dar por bueno el cambio. No afirmes que algo funciona sin verlo.
4. ALCANCE MÍNIMO: corrige solo lo reportado. No rediseñes ni "mejores" lo que funciona.
5. DOCUMENTA PARA EL PROTOTIPO BASE: por cada bug que corrijas, añade una entrada a
   docs/BITACORA-ERRORES.md con: módulo, síntoma, causa raíz, archivo/función, fix aplicado, fecha y
   estado. Esta bitácora es la fuente que se le pasa a Claude para mejorar el prototipo comercializable.
6. DATOS FICTICIOS: si tocas seed.js, mantén datos ficticios (este repo es de A&S; los reales se
   importan, no se hardcodean).

Cuando te reporte un problema: (a) localiza el archivo y la función, (b) explícame en 2 líneas la causa,
(c) aplica el fix mínimo, (d) recarga y verifica, (e) registra en docs/BITACORA-ERRORES.md, (f) confírmame
qué archivos cambiaste para subir al repo.
```

### Prompt corto para reportar un problema puntual a ChatGPT
```
Bug en Orbit 360, módulo <X>: <qué hago> → <qué pasa> (esperaba <qué debería pasar>).
Captura: <adjunta>. Corrige el fix mínimo sin romper el patrón del módulo ni Orbit.store, recarga y
verifica que el módulo renderiza, y registra el fix en docs/BITACORA-ERRORES.md.
```

## 12. PROMPTS de conexión a BACKEND (por etapas) — para ChatGPT/Codex
**Etapa 1 — Base de datos (Firestore):**
```
Reescribe data/store.js para usar Firebase Firestore manteniendo EXACTA la API actual
(all/get/where/insert/update/remove/_emit). Cada "colección" del store = colección Firestore
(clientes, polizas, cobros, comisiones, reclamos, gestiones, negocios, finmovs, contenidos, cursos,
aseguradoras, asesores, vehiculos, acreedores, facturas, documentos, actividades). Usa onSnapshot
para que _emit dispare el re-render en vivo. NO toques ningún módulo. Incluye config multi-tenant:
prefija las colecciones por tenantId (Orbit.tenant).
```
**Etapa 2 — Autenticación y usuarios:**
```
Conecta core/auth.js a Firebase Auth. El login white-label usa el correo del usuario (campo email de
asesores). Al crear un usuario en Equipo, crea su cuenta Auth y envía credenciales por correo/WA
(vía Make). Respeta roles y módulos visibles por usuario (canSee). Mantén la cláusula de
confidencialidad en primer ingreso (persistente en el perfil del usuario).
```
**Etapa 3 — Almacenamiento de documentos (Drive/Storage):**
```
Conecta la carga de documentos (importador documental, expediente cliente, lecciones Academia,
docs de aseguradora) a Firebase Storage o Google Drive. Reemplaza los data URL por URLs reales.
Estructura: carpeta por cliente (nombre completo); si no existe, créala y etiqueta el documento.
```
**Etapa 4 — Automatizaciones e integraciones (Make):**
```
Conecta el módulo Automatizaciones a webhooks de Make: cada evento activo (poliza_emitida,
cobro_vence, solicitud_gestion, etc.) envía {evento, datos, plantilla} al webhook. Make ramifica a
WhatsApp (Cloud API), correo (Outlook/Gmail) y Sheets. El diseño visual del correo se arma en Make;
la plataforma envía la plantilla de texto con variables {nombre} {poliza} {link}...
```
**Etapa 5 — IA (Gemini/OpenAI):**
```
Conecta Orbit.ia y window.claude.complete a tu proveedor de IA (Gemini económico recomendado).
Lo usan: extracción del importador inteligente, comparativo, análisis crítico de Insights/Finanzas,
redacción de mensajes, generación de cursos y copy de marketing. Mantén el fallback si la IA falla.
```

## 13. Cómo actualizar A&S cuando MEJORE el prototipo base
1. Aquí (Claude) evoluciona `orbit360-platform/` y entrega el ZIP nuevo.
2. La lógica de negocio vive en `modules/` y `core/`; tu personalización de A&S vive en **datos y
   configuración** (Orbit.tenant, paleta, logo, catálogos, aseguradoras, tarifas), NO en el código.
3. Para actualizar A&S: reemplaza `modules/` y `core/` y `styles/` con los del ZIP nuevo. **Conserva**
   tu `data/store.js` (ya conectado a backend) y tu configuración de tenant. Como los módulos solo
   hablan con `Orbit.store`, la mejora entra sin tocar tus datos reales.
4. Si una mejora cambia el ESQUEMA de datos, el ZIP traerá una nota de migración en CHANGELOG.md
   (ej: "polizas ahora tiene campo X"). Aplica esa migración en tu Firestore.
5. Registra en tu repo qué versión base del prototipo tienes (ej: "base v1.09") para saber qué traer.

## 14. ¿Migrar en ChatGPT o Claude?
- **Claude (aquí):** evoluciona el prototipo, ve el render, diseña. Ideal para nuevas funciones y UX.
- **ChatGPT/Codex:** edita y hace push al repo de A&S, conecta backend, corrige incidencias con la
  bitácora. No "ve" el render, pero es rápido para código y despliegue.
- **Recomendado:** híbrido. Funciones nuevas y rediseños → Claude. Conexión backend, integraciones y
  fixes técnicos urgentes → ChatGPT/Codex con la bitácora de errores como puente entre ambos.

## 15. Documento maestro y fuentes a cargar en el proyecto nuevo
Carga como fuentes/conocimiento del proyecto A&S (ChatGPT o Claude):
1. **Este archivo** (`INSTRUCCIONES-PROYECTO-AYS.md`) como instrucción/CLAUDE.md.
2. `docs/PLAN-INFRAESTRUCTURA.md` — plan maestro con todas las rondas de feedback.
3. `CHANGELOG.md` — qué se construyó por versión (incluye notas de migración de esquema).
4. `README.md` — arquitectura del build.
5. `docs/capacitacion-tecnica-interna.html` — backend, integraciones, soporte, planes.
6. El **ZIP del prototipo** (`orbit360-platform/`) como base de código.
7. Tus **Excel reales** (clientes, pólizas, recibos, movimientos) — para importar, NO para hardcodear.

