# PROMPT PARA LA SIGUIENTE SESIÓN — Orbit 360

> Copia y pega ESTE texto completo como primer mensaje de la próxima conversación.
> Garantiza que no se pierda contexto, pendientes ni profundidad.

---

## MENSAJE DE ARRANQUE (pegar tal cual)

Continúa el proyecto **Orbit 360**. Lee primero, en este orden:
1. `orbit360-platform/docs/PLAN-INFRAESTRUCTURA.md` (fuente de verdad, todas las rondas)
2. `orbit360-platform/CHANGELOG.md`
3. `CLAUDE.md` (raíz)
4. `orbit360-platform/docs/PROMPT-SIGUIENTE-SESION.md` (este archivo — tiene el plan vivo)

El código vive en `orbit360-platform/`. Retoma los pendientes **#151–#159** en el orden de prioridad de abajo. **Metodología obligatoria (#126):** tras CADA cambio de un módulo .js, recargar la página (`show_html`) y verificar el render real con `eval_js` ANTES de afirmar que funciona y antes de entregar ZIP. No afirmar mejoras sin verlas renderizadas.

---

## ESTADO ACTUAL (al cierre de esta sesión)

- Versión: **v1.18+** (logo en topbar con ancho flexible ya corregido — #150 hecho).
- 150 de 159 ítems del plan completados.
- Build limpio greenfield, white-label, multi-tenant vía `Orbit.tenant`. Primer cliente = Alianzas y Soluciones (A&S), se personaliza SOLO por configuración.
- Capa de datos única: `Orbit.store` (swappable a backend). Los módulos NUNCA tocan localStorage directo.

## PENDIENTES (orden de prioridad para migración)

**#150 ✅ HECHO** — Bug logo (slot ancho flexible en `styles/base.css`, `.tb-logo .slot:has(img)`).

**#155 (PRIORIDAD 1) — Doc profundo de instrucciones ChatGPT/Codex.** Un solo documento con TODO el contexto: instrucción de proyecto, cómo mejorar el prototipo desde documentación, cómo actualizar la plataforma A&S desde mejoras del prototipo, fuentes a cargar, prompt de 1ra conversación, documento maestro a cargar. **Incluir como PRIMERA instrucción de migración (#159): que ChatGPT/Codex haga una AUDITORÍA FORENSE del prototipo** — entender TODAS las lógicas, flujos, sincronizaciones, funcionalidades e integraciones ANTES de tocar el backend. Base ya existente: `docs/INSTRUCCIONES-PROYECTO-AYS.md` y `docs/DESPLIEGUE-Y-CODEX.md` — ampliarlos/fusionarlos, no duplicar.

**#157 (PRIORIDAD 2) — IA multi-proveedor SIN SESGO.** En Configuración → Automatizaciones: selector con tarjetas para **Gemini / ChatGPT (OpenAI) / Claude (Anthropic) / Endpoint propio**, cada una con indicador de costo 💲 e "ideal de uso". **Ninguno preseleccionado.** Botón "📊 Comparar modelos" → tabla costo/beneficio. Persistir la elección en `Orbit.tenant.branding` o `Orbit.tenant.ia`. La capa `Orbit.ia` (ya existe) debe leer el proveedor elegido. (Ver guía de fiabilidad real más abajo.)

**#156 (PRIORIDAD 3) — Integraciones listas para configurar.** Confirmar que CADA integración tenga en Config su tarjeta con campos REALES (API key / webhook / OAuth / endpoint) que **persisten en Orbit.tenant**, botón Conectar/Probar y estado. Lista: Make, Outlook/Gmail (IMAP/POP3 + OAuth), WhatsApp Cloud API, Green API, Google Sheets/Drive, Metricool, Mailchimp, redes (FB/IG/LinkedIn/TikTok/YouTube), Canva, Gamma, HeyGen, NotebookLM, e IA (los 3 proveedores + endpoint). Documentar para migración.

**#158 — Academia: botón "📖 Manuales" + lector in-app.** Abre `docs/manual-maestro.html` y los per-rol DENTRO de la plataforma (iframe/visor), no como descarga.

**#153 — Academia profunda.** Completar los 14 cursos (por módulo + por rol) con lecciones profundas reales (no esqueleto), recursos embebidos (PDF/imagen/video), quizzes. Confirmar que editar categorías / agregar-quitar cursos / crear lecciones / quizzes / todas las opciones inteligentes funcionan tras recarga.

**#154 — Importadores end-to-end.** Verificar extracción real de cada kind con archivo real: clientes, pólizas→recibos, estados de cuenta→conciliación, planillas comisión, bitácora siniestros (multi-cliente: se carga en Importar → bitacora-reclamos, registra en la ficha de cada cliente del archivo), directorio aseguradoras, movimientos finanzas. Confirmar mapeo correcto a colecciones. OCR de imagen usa Tesseract (lento); PDF usa pdf.js; con key IA conectada la extracción es precisa.

**#151 — Auditoría forense completa (documentar hallazgo por hallazgo).** Recorrer en vivo (eval_js) cada módulo: inicio, cronograma, ops, leads, aseguradoras, cotizador, comparativo, cliente360, polizas, cobros, renovaciones, cancelaciones, siniestros, historial, comisiones, finanzas, marketing, academia, insights, portal, ia, notificaciones, automatizaciones, equipo, configuracion, reportes, calidad, plantillas. Comprobar: render sin error JS, KPIs clicables con detalle, botones, flujos y sincronía. **Escribir un doc `docs/AUDITORIA-FORENSE.md` con cada hallazgo**, no solo conclusiones.

**#152 — Auditoría "autoadministrable".** Confirmar que TODA sección permite crear/editar/eliminar desde la plataforma (catálogos, listas Ops/Leads, cursos, planes, países + tasas/impuestos, aseguradoras, automatizaciones, plantillas, reportes, integraciones). **Listar explícitamente lo que NO sea autoadministrable y completarlo.** No afirmar "100% autoadministrable" sin esta lista verificada.

## REGLAS FIJAS (no negociables)
- Marca **Orbit 360** en el chrome (NO logo A&S); slot de logo del cliente white-label.
- NO mezclar mystery shopping / CX (eso es CXOrbia, otro producto).
- Datos siempre ficticios. NO mostrar notas técnicas (Firebase, demo, Firestore) en UI.
- Paleta base rojo #C5162E, grafito #1E2227; paleta seleccionable. Tipos Manrope/Source Sans 3/JetBrains Mono.
- Fondo oscuro → texto blanco. Moneda por país, no mezclar. Producción/metas/comisiones sobre prima NETA recaudada.
- Entregables: ZIP de `orbit360-platform/` (la usuaria sube la última versión a GitHub `paulaosoriof86/orbit360-core`).

## ARQUITECTURA RÁPIDA
- `index.html` shell · `styles/` (tokens/base/infra) · `data/` (store.js, seed.js) · `core/` (theme, ui, config, router, auth, ciclo, crmkit, importa, primas, novedades, ia, pwa) · `modules/` (28 módulos) · `docs/`.
- `Orbit.store`: insert/update/all/get/where + _emit (sincronía en vivo).
- `Orbit.applyBrand()` pinta logo/nombre en topbar+login (se llama en `router.init`).

---

## GUÍA DE FIABILIDAD DE MOTORES IA (información real, para responder a la clienta y construir #157)

Contexto: la extracción del cotizador/comparativo (leer PDFs de propuestas de aseguradoras y mapear coberturas/montos) es el caso de uso más exigente. La clienta ha tenido buenos resultados extrayendo con Claude y resultados flojos con Gemini.

**Fiabilidad para extracción de documentos de seguros (PDF/imagen → datos estructurados):**
- **Claude (Anthropic, 3.5/3.7 Sonnet):** muy fuerte en comprensión de documentos largos y extracción estructurada cuidadosa; tiende a no "inventar" y a respetar el layout. Es lo que la clienta ya validó como bueno. Costo medio-alto.
- **GPT-4o / GPT-4.1 (OpenAI):** muy sólido en extracción estructurada, function-calling y salida JSON fiable; buena visión/OCR. Comparable a Claude para este caso. Costo medio.
- **Gemini (Google, Flash/Pro):** excelente costo y multimodal nativo; **Flash** es barato pero menos consistente en extracción matizada de seguros (coincide con la experiencia floja de la clienta). **Gemini Pro** mejora bastante pero sube el costo. Mejor para volumen/OCR masivo que para precisión fina.

**Recomendación honesta (no sesgada):**
- Para **garantía de calidad de extracción** (cotizador/comparativo de A&S): **Claude o GPT-4-class**, no Gemini Flash.
- Para **volumen/costo** (importaciones masivas, OCR de muchos documentos): **Gemini** es muy rentable, validando muestras.
- En el producto comercial: **ofrecer los 3 + endpoint propio sin preseleccionar** (#157), con nota de "ideal de uso" y costo, para que cada cliente elija según su prioridad (calidad vs costo). A&S puede quedarse con Claude/GPT por la garantía de calidad que necesita.
- Para el trabajo técnico de migración/backend: **ChatGPT con Codex** es buena opción operativa para mantener el repo; Claude para diseño/UX y lógica fina. No son excluyentes.

---

## CÓMO REANUDAR
Pega el "MENSAJE DE ARRANQUE" de arriba. Yo retomo en **#155** (doc instrucciones) → **#157** (IA multi-proveedor) → **#156** (integraciones) → **#158** (manuales in-app) → **#153/#154** (academia + importadores) → **#151/#152** (auditorías documentadas).
