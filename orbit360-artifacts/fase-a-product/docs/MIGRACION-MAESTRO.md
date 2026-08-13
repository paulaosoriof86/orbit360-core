# 🚀 DOCUMENTO MAESTRO DE MIGRACIÓN — Orbit 360 → versión productiva (A&S)

> **Este es el documento ÚNICO y autoritativo para migrar Orbit 360 del prototipo a producción.**
> Reemplaza/consolida los docs fragmentados anteriores. Si hay conflicto, manda éste.
> Estado del prototipo al escribir: **v1.34+** (build greenfield en `orbit360-platform/`).

---

## 0. Cómo usar este documento

1. Crea el proyecto nuevo (Claude o ChatGPT/Codex).
2. Sube las **FUENTES** de la §4 (en ese orden).
3. Pega el **PROMPT DE PRIMERA CONVERSACIÓN** de la §5 — palabra por palabra.
4. La primera tarea del asistente SIEMPRE es la **auditoría forense** (§6) antes de tocar backend.
5. Conecta backend por **FASES** (§7). No saltes fases.

---

## 1. Qué es Orbit 360 (contexto que el asistente DEBE entender)

- **Producto:** sistema 360 inteligente e integral para **intermediarios de seguros** (corredurías/brokers). Centraliza captación, venta, administración, cobro, finanzas, atención, marketing, capacitación y portal del cliente.
- **Versión comercializable**, white-label, **multi-tenant** (configurable por cliente vía `Orbit.tenant`).
- **Primer cliente = Alianzas y Soluciones (A&S)**. A&S se personaliza **SOLO por configuración** (logo, paleta, países, aseguradoras, catálogos) cuando la base esté en 1.0. **No se bifurca el código por cliente.**
- **NO** es CXOrbia (mystery shopping / CX) — son productos distintos, no mezclar.
- **Marca del chrome = Orbit 360.** Hay un slot de logo del cliente (white-label), no se reemplaza la marca Orbit por A&S.

## 2. Reglas fijas (no negociables)

- Datos siempre **ficticios** en el prototipo. **Nunca** mostrar notas técnicas en UI (Firebase, demo, laboratorio, Firestore, etc.).
- Paleta base: rojo `#C5162E`, grafito `#1E2227`, gris/blanco; azul solo acento. Paleta **seleccionable** por cliente.
- Tipos: Manrope (display), Source Sans 3 (texto), JetBrains Mono (mono).
- Fondo oscuro → texto **siempre blanco**. Moneda por país, **no mezclar**. Producción/metas/comisiones siempre sobre **prima NETA recaudada**.
- **Capa de datos única:** los módulos NUNCA tocan `localStorage` directo, solo `Orbit.store`. Esto permite cambiar a backend **sin tocar los módulos** (clave de la migración).
- **100% autoadministrable:** todo (marca, países, catálogos, aseguradoras, roles/módulos por usuario, integraciones, automatizaciones, cursos, manuales, plantillas) se edita desde la plataforma, sin tocar código.

## 3. Arquitectura del build (qué hace cada pieza)

```
orbit360-platform/
├── index.html            Shell: login white-label, topbar, sidebar dinámico, novedades.
│                         Carga TODOS los .js con ?vNNNN (cache-busting — ver §8).
├── styles/  tokens.css · base.css · infra.css
├── data/
│   ├── store.js          ★ CAPA DE DATOS ÚNICA. API: all/get/where/insert/update/remove
│   │                       + _emit (sincronía en vivo). AQUÍ se conecta el backend.
│   └── seed.js           Datos ficticios (relacionales). __v fuerza re-siembra.
├── core/
│   ├── theme.js          Theming / applyBrand (logo, paleta).
│   ├── ui.js             Helpers de UI (esc, money, badges…).
│   ├── config.js         NAV + Orbit.tenant + PLANES + ROLES + GEO + Orbit.cat (catálogos).
│   ├── primas.js         Cálculo de prima y generación de recibos (cuotas, prorrateo).
│   ├── queries.js        Consultas derivadas sobre el store.
│   ├── crmkit.js         Piezas CRM compartidas (KPIs clicables con detalle…).
│   ├── importa.js        ★ IMPORTADOR INTELIGENTE transversal (CSV/XLS/PDF/Word/imagen→OCR).
│   ├── ia.js             ★ Capa de IA (proveedor configurable) + extracción de PDF.
│   ├── ciclo.js          Motor Ops↔Leads + sesión multi-rol + gestiones + bitácora.
│   ├── legal.js          Cláusulas legales blindantes (v2.0) + gate + registro + imprimir.
│   ├── novedades.js      Novedades/incentivos.
│   ├── auth.js           Gate de sesión + login + dispara cláusulas legales.
│   └── router.js         Ruteo por hash + montaje de módulos + applyBrand.
└── modules/              inicio, cronograma, ops, leads, aseguradoras, cotizador,
                          comparativo, cliente360, polizas, cobros, renovaciones,
                          cancelaciones, siniestros, historial, comisiones, finanzas,
                          marketing, academia, insights, portal, ia(asistente),
                          notificaciones, automatizaciones, equipo, configuracion,
                          reportes, calidad, plantillas, importar, correo, legal(si aplica).
```

**Principio de oro de la migración:** el backend se conecta **solo en `data/store.js`** (y, para llamadas reales de IA, en `core/ia.js` e integraciones en `core/config.js`/Configuración). Los ~30 módulos NO se tocan porque solo hablan con `Orbit.store`.

## 4. FUENTES A CARGAR en el proyecto nuevo (en este orden)

> Sube **el ZIP completo de `orbit360-platform/`** como base. Además, ten a mano estos documentos guía (ya están dentro de `orbit360-platform/docs/`):

**A. Código (obligatorio) — el ZIP completo:**
- `orbit360-platform/` entero (index.html + styles/ + data/ + core/ + modules/ + docs/).

**B. Documentos guía (dentro de docs/):**
1. `docs/MIGRACION-MAESTRO.md` ← **este documento** (léelo primero).
2. `docs/PLAN-INFRAESTRUCTURA.md` ← plan maestro con todas las rondas de feedback.
3. `docs/AUDITORIA-FORENSE.md` + `docs/AUDITORIA-AUTOADMINISTRABLE.md` ← estado verificado módulo por módulo.
4. `docs/manual-maestro.html` ← documento maestro funcional (qué hace cada módulo).
5. `docs/manual-integraciones.html` ← integraciones y su configuración.
6. `docs/capacitacion-crm.html` + `docs/capacitacion-tecnica-interna.html` ← capacitación.
7. `CHANGELOG.md` + `README.md` ← historial y arquitectura.

**C. Insumos de A&S (los aporta la usuaria cuando la base esté en 1.0):**
- HTML real del **Cotizador + Comparativo** de A&S (lógica/tarifas reales — se integran como módulo aislado, tarifas configurables).
- **Logo** y **paleta** de A&S; **listado de aseguradoras** vinculadas y sus tarifas/plantillas.
- **Base inicial real** (clientes, pólizas, recibos) en Excel/CSV/PDF → se carga con el **importador inteligente** (ver §6, paso final).

## 5. PROMPT DE PRIMERA CONVERSACIÓN (pégalo tal cual)

```
Eres el ingeniero a cargo de migrar "Orbit 360" del prototipo a producción.
Orbit 360 es un sistema 360 integral para intermediarios de seguros, white-label
y multi-tenant. Primer cliente: Alianzas y Soluciones (A&S), que se personaliza
SOLO por configuración (no se bifurca el código).

ANTES DE ESCRIBIR UNA SOLA LÍNEA DE BACKEND:
1) Lee docs/MIGRACION-MAESTRO.md completo. Es la fuente de verdad.
2) Haz una AUDITORÍA FORENSE del prototipo (ver §6 de ese doc): recorre CADA módulo
   (los ~30 de /modules) y CADA core (/core), y documenta en un archivo
   AUDITORIA-FORENSE-MIGRACION.md: qué hace, qué datos lee/escribe en Orbit.store,
   qué flujos y sincronizaciones tiene, qué botones/KPIs, y qué está hardcoded vs vivo.
   NO asumas: ábrelo, léelo y verifícalo.
3) Solo cuando entiendas TODO, propón el plan de backend por FASES (§7) y espera mi OK.

REGLAS FIJAS (no negociables):
- Los módulos NUNCA tocan almacenamiento directo: solo Orbit.store. El backend se
  conecta SOLO en data/store.js (y core/ia.js para IA real, Configuración para integraciones).
  NO reescribas los módulos.
- Mantén la API de Orbit.store idéntica (all/get/where/insert/update/remove + _emit)
  para no romper los módulos. Cambia la IMPLEMENTACIÓN (a backend), no la INTERFAZ.
- Datos ficticios fuera; nunca muestres notas técnicas en UI.
- Todo debe quedar 100% autoadministrable desde la plataforma.
- Marca del chrome = Orbit 360; A&S va en el slot de logo white-label.
- Producción/metas/comisiones SIEMPRE sobre prima neta recaudada. Moneda por país, no mezclar.

DOCUMENTA todo lo que detectes que el prototipo deba mejorar (en MEJORAS-DETECTADAS.md)
para traerlo de vuelta y aplicarlo de forma ordenada.

Empieza por el paso 1 y 2. No toques backend hasta tener mi OK al plan.
```

## 6. AUDITORÍA FORENSE (primera tarea, obligatoria)

El asistente debe, **módulo por módulo** (no en bloque, no por conclusiones):
- Abrir el archivo, listar sus funciones, sus lecturas/escrituras a `Orbit.store`.
- Probar (mentalmente o en vivo) botones, KPIs clicables, flujos y sincronizaciones.
- Marcar qué es **dato vivo** vs **hardcoded** y reportar cualquier resto hardcoded.
- Confirmar que los **importadores inteligentes** alimentan correctamente cada colección
  (clientes, pólizas→recibos, estados de cuenta→conciliación, planillas, bitácora de
  siniestros, directorio de aseguradoras, movimientos, base inicial).
- Resultado: `AUDITORIA-FORENSE-MIGRACION.md` con hallazgo por hallazgo.

**Carga de la base real de A&S** (último paso de la auditoría/arranque): usar el importador
inteligente de la plataforma para subir los archivos reales (Excel/CSV/PDF). Verificar que:
clientes se crean sin duplicar; pólizas generan recibos según forma de pago; vigentes quedan
en cartera y canceladas/antiguas NO generan cartera pero SÍ cuentan en analítica.

## 7. CONEXIÓN DE BACKEND POR FASES

> Recomendado: **Supabase** o **Firebase/Firestore** (tiempo real encaja con `_emit`).
> El objetivo es reemplazar la implementación de `data/store.js` por llamadas al backend,
> conservando su API.

- **Fase 1 — Auth real.** Sustituir `core/auth.js` (gate demo) por login real (email/clave,
  OAuth). Roles y módulos por usuario ya existen en config: mapearlos al usuario autenticado.
- **Fase 2 — Persistencia (store).** Implementar `Orbit.store` contra el backend:
  `all/get/where` → consultas; `insert/update/remove` → escrituras; `_emit` → suscripción en
  vivo (realtime/snapshots). **Mantener la firma idéntica.** Migrar el seed como datos iniciales
  del tenant demo (NO en producción del cliente).
- **Fase 3 — Multi-tenant.** Aislar datos por `tenant` (RLS en Supabase / reglas en Firestore).
  `Orbit.tenant` define marca, países, catálogos, aseguradoras, planes.
- **Fase 4 — IA real.** En `core/ia.js`, conectar el proveedor elegido (ver §9) por API key
  guardada en Configuración. Mantener el fallback local para cuando no haya key.
- **Fase 5 — Integraciones.** Cablear las tarjetas de Configuración (WhatsApp Cloud API/Green
  API, Outlook/Gmail IMAP/OAuth, Make, Sheets/Drive, Metricool, Mailchimp, redes, Canva, Gamma,
  HeyGen, NotebookLM) a sus endpoints reales. Las credenciales ya persisten en `Orbit.tenant`.
- **Fase 6 — Archivos.** Subir documentos/recibos/logos a almacenamiento real (Storage/S3) y
  guardar URLs (hoy se usan data URLs en demo).
- **Fase 7 — Despliegue.** Hosting (Vercel/Netlify/Firebase Hosting), dominio, HTTPS, backups,
  y panel de monitoreo. Quitar cualquier dato ficticio del tenant productivo.

## 8. Nota de caché (importante para verificar cambios)

`index.html` versiona los `<script>` y `<link>` con `?vNNNN`. Al actualizar el build, **subir
ese número** fuerza al navegador a recargar los archivos nuevos (si no, sirve los cacheados y
"parece que no cambió nada"). En desarrollo: Ctrl+Shift+R. El seed re-siembra cambiando `__v`.

## 9. Recomendación de proveedor de IA (sin sesgo)

La plataforma soporta **multi-proveedor sin preselección** (Gemini / ChatGPT / Claude / endpoint
propio), configurable en Configuración→Automatizaciones, con tabla comparativa costo/beneficio.
Criterio sugerido para A&S:
- **Extracción de PDF/documentos** (cotizaciones, pólizas, DPI): usar un modelo con buena lectura
  estructurada. La extracción local (pdf.js) ya funciona; el proveedor mejora el mapeo fino.
- **Redacción/mensajería y análisis crítico:** cualquiera de los tres sirve; elegir por costo.
- **Importante:** la calidad de extracción se valida con los **PDF reales de A&S** antes de fijar
  proveedor. No casarse con uno: la capa `core/ia.js` permite cambiarlo sin tocar módulos.

## 10. Ciclo de mejora prototipo ↔ producción

- Las mejoras de UX/flujo se siguen prototipando aquí (rápido, visual).
- En producción, el asistente mantiene `MEJORAS-DETECTADAS.md` y aplica los cambios respetando
  la separación módulos/`store`.
- Cada entrega del prototipo se versiona (ZIP) y su CHANGELOG indica qué cambió, para que el
  equipo de producción lo replique de forma ordenada.

---

_Documento generado para el proyecto Orbit 360. Las cláusulas legales (core/legal.js) deben ser
revisadas por asesoría jurídica antes de su uso definitivo._
