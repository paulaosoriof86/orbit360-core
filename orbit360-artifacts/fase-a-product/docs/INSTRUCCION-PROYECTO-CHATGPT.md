# INSTRUCCIÓN DE PROYECTO — Orbit 360 / Alianzas y Soluciones (versión ChatGPT <8000)

> Pega ESTE texto como "Instrucción del proyecto" en ChatGPT (cabe en 8000 chars).
> El detalle completo va en archivos adjuntos (ver §FUENTES). NO reescribas la lógica del prototipo:
> respétala y conéctala a backend.

## QUÉ ES
Orbit 360 = sistema 360 comercializable para intermediarios de seguros. Build greenfield, **white-label, multi-tenant** (`Orbit.tenant`). **A&S es el primer cliente**, se personaliza SOLO por configuración (logo, paleta, país, aseguradoras, tarifas, glosario). NO se reescribe código por cliente. El código vive en `orbit360-platform/` (repo `paulaosoriof86/orbit360-core`).

## PASO 1 OBLIGATORIO — AUDITORÍA FORENSE
Antes de tocar backend, lee TODO el código y escribe `docs/AUDITORIA-FORENSE-BACKEND.md` explicando: lógicas (primas, comisiones, ciclo Ops↔Leads), flujos (lead→cotiza→emite→cliente; cobro→conciliación; renovación; cancelación; siniestro), sincronizaciones (`Orbit.store._emit`), funcionalidades de los 28 módulos, integraciones y el modelo de datos (colecciones de `seed.js`). No diseñes backend hasta validar ese documento conmigo.

## REGLAS FIJAS
- Marca Orbit 360 en el chrome; slot de logo del cliente (NO logo A&S fijo).
- Capa de datos ÚNICA: los módulos NUNCA tocan localStorage/DOM global; solo `Orbit.store`.
- Datos del prototipo = ficticios. Los reales se IMPORTAN, no se hardcodean.
- Moneda por país, no mezclar. Producción/metas/comisiones sobre prima NETA recaudada.
- Genérico multipaís: nada fijo a GT/CO; tasas/IVA por país configurable.

## ARQUITECTURA
```
index.html  → shell (login, topbar, sidebar, novedades)
styles/     → tokens.css, base.css, infra.css
data/store.js → CAPA ÚNICA (hoy localStorage; swappable a backend)
data/seed.js  → demo ficticio
core/   → theme, ui, config(NAV+tenant+ROLES+GEO), crmkit, importa, primas, comeng, cat, ia, ciclo, correo, auth, router
modules/→ 28 módulos (inicio, cliente360, polizas, cobros, renovaciones, cancelaciones, comisiones, historial, importar, configuracion, finanzas, calidad, plantillas, ops, leads, aseguradoras, siniestros, academia, marketing, reportes, ia, notificaciones, automatizaciones, equipo, portal, cotizador, comparativo, cronograma)
docs/   → planes, manuales, capacitaciones, handoff
```
**Backend:** solo se reescribe `data/store.js` manteniendo su API exacta: `all/get/where/insert/update/remove/_emit`. Cada colección = colección Firestore, prefijada por `tenantId`. `_emit` dispara re-render en vivo. **Ningún módulo se toca.**

## MIGRACIÓN — PARTE 1 (importadores)
Importador inteligente (módulo Importar + botón en cada sección). Acepta CSV/Excel/PDF/Word/imagen(OCR), mapea por sinónimos de encabezado, escribe al store con dedup. Botón "🔄 Iterar" = re-mapeo manual columna→campo. Orden de carga:
1. Clientes (o "Base inicial" — detecta entidad por columnas)
2. Aseguradoras (habilitar vinculadas)
3. Pólizas → si Vigente/Por renovar genera recibos automáticos por forma de pago, en cartera; Cancelada/Vencida = histórico (no cartera, sí analítica)
4. Vehículos
5. Estados de cuenta aseguradora → crea faltantes + APLICA pagos reportados (conciliación)
6. Planillas de comisiones → tarifas % por producto
7. Movimientos financieros + estado bancario (CxC/CxP)
8. Bitácora siniestros (multi-cliente, vincula por nº póliza)

**Regla de cartera:** solo pólizas vigentes/por renovar de este año quedan en cobros pendientes; el resto es histórico.

## MIGRACIÓN — PARTE 2 (config A&S, sin código)
Configuración + Equipo: logo, paleta, país por defecto GT + agregar CO (IVA GT 12% / CO 19%), aseguradoras vinculadas (contactos, accesos, Drive, facturación), usuarios (correo del usuario = login + bandeja, teléfono/WA, multi-rol, módulos visibles; credenciales por correo/WA al crear), glosario por país, planes, tarifas del cotizador.

## MIGRACIÓN — PARTE 3 (integraciones)
Config → Integraciones + Automatizaciones: Make (webhook), Outlook/M365/Gmail (IMAP/POP3), WhatsApp Cloud API, Green API, Sheets, Drive, Metricool, Mailchimp, redes, Canva, Gamma, HeyGen, NotebookLM, IA. Las plantillas de texto salen de la plataforma; el diseño visual de correo se arma en Make. Enviar póliza al cliente = evento `poliza_emitida` → plantilla con {nombre}{poliza}{link} → WhatsApp/correo vía Make.

## ETAPAS BACKEND (prompts detallados en GUIA-CHATGPT-CODEX.md)
1. store.js → Firestore (misma API)  2. auth.js → Firebase Auth  3. documentos → Storage/Drive  4. Automatizaciones → webhooks Make  5. Orbit.ia → proveedor IA.

## MOTOR IA (sin sesgo)
La plataforma ofrece Gemini / ChatGPT / Claude / Endpoint propio, ninguno preseleccionado (Config→Automatizaciones→Motor IA + "Comparar modelos"). Para extracción de PDFs de seguros con garantía: **Claude o GPT-4** superan a Gemini Flash; Gemini es más rentable para volumen/OCR. A&S: usar Claude o GPT-4.

## CORRECCIÓN DE ERRORES (bitácora puente)
Reporta cada bug en dos vías: en mi chat (corrección en caliente) y en el repo. ChatGPT mantiene `docs/BITACORA-ERRORES.md` por entrada: módulo, síntoma, causa raíz, archivo/función, fix, fecha, estado. **Esta bitácora es la fuente que se le pasa a Claude para mejorar el prototipo base.** ChatGPT DEBE documentar ahí todo lo que el prototipo deba mejorar.

Reglas para ChatGPT al corregir: (1) no tocar la firma de `Orbit.store`; (2) no parches frágiles ni hardcode; reutilizar helpers (drawer-back, K.kpis, K.banner); (3) tras cada cambio recargar y verificar render sin error de consola; (4) alcance mínimo, no rediseñar lo que funciona; (5) registrar en BITACORA-ERRORES.md.

## ACTUALIZAR A&S CUANDO MEJORE EL PROTOTIPO
1. Claude entrega ZIP nuevo. 2. Reemplaza `modules/`, `core/`, `styles/`; CONSERVA tu `data/store.js` (backend) y tu tenant. 3. Como los módulos solo hablan con `Orbit.store`, la mejora entra sin tocar datos reales. 4. Si cambia el esquema, CHANGELOG.md trae nota de migración → aplícala en Firestore. 5. Registra qué versión base tienes.

## ENTREGA
No hay push directo: cada versión = ZIP de `orbit360-platform/`. Subir la última versión completa al repo, o Codex con el ZIP ("descomprime en raíz y push a main"). Versionado `?v=N` en index.html evita caché.

## FUENTES A SUBIR AL PROYECTO (adjuntar como archivos)
1. ZIP de `orbit360-platform/` (código base).
2. `docs/GUIA-CHATGPT-CODEX.md` (prompts de backend por etapa + comparativa IA).
3. `docs/INSTRUCCIONES-PROYECTO-AYS.md` (versión larga, referencia).
4. `docs/PLAN-INFRAESTRUCTURA.md` (plan maestro, todas las rondas).
5. `docs/manual-maestro.html` (documento maestro de módulos).
6. `docs/AUDITORIA-FORENSE.md` y `docs/AUDITORIA-AUTOADMINISTRABLE.md`.
7. `docs/capacitacion-tecnica-interna.html` (backend/migración/soporte).
8. `CHANGELOG.md` + `README.md`.
9. Tus Excel/PDF reales (clientes, pólizas, recibos, movimientos, comisiones) — para importar.

## PROMPT 1ª CONVERSACIÓN (pegar en ChatGPT tras adjuntar fuentes)
"Construye el backend de Orbit 360 (CRM de seguros) a partir del prototipo adjunto. PASO 1: auditoría forense (no la saltes) → docs/AUDITORIA-FORENSE-BACKEND.md. PASO 2: esquema Firestore respetando las colecciones del prototipo y la API de Orbit.store. PASO 3: plan por etapas (store→backend, auth, storage, Make, IA) conservando store.js y tenant del cliente al actualizar módulos. Reglas: marca Orbit 360 white-label, datos reales en backend, moneda por país, comisiones sobre prima neta. No reinventes la lógica: respétala."
