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

## 10. Pendientes conocidos (estado a v0.94)
**Listo y verificado:** importadores inteligentes (clientes, pólizas con recibos automáticos,
vehículos, aseguradoras, bitácora siniestros, estados de cuenta con conciliación real, movimientos,
calendario), re-mapeo manual (Iterar), cuotas en crear/editar/renovar, comparativo de renovación
multi-aseguradora, Equipo multi-rol + correo + módulos por usuario, automatizaciones editables,
cancelaciones→ficha+Ops, CxC/CxP autoadministrables, Academia visor interactivo + edición de
curso/lección, Orbit IA, correo interno, notificaciones WA.

**Pendiente (para próxima capacidad):**
1. **Cotizador (#122)** — reconstruir con la lógica/UI del HTML real de A&S (sin tarifas hardcoded;
   tarifas configurables por cliente; aseguradoras desde `Orbit.store`). **Readjuntar el HTML al inicio.**
2. **Comparativo de cotizaciones (#123)** — reconstruir igual al HTML de A&S, acepta varios PDFs de
   propuestas, con historial.
3. **Cursos por módulo/rol profundos (#129)** y **generación IA de curso interactivo (#131)**.
4. **Portal del cliente (#139)** — reportar pagos→Ops, gestiones en Ops, documentos visibles, Aprende.
5. **KPIs con modal de detalle (#142)** — desglose de registros al clicar cada KPI.
6. Verificar a fondo: campaña de actualización en Calidad de datos; emojis/pines en nueva plantilla;
   reflejo del logo en login; edición/creación de planes en Config; sincronía movimientos↔Finanzas.
