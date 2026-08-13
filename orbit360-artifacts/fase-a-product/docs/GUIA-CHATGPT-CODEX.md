# GUÍA MAESTRA PARA CHATGPT / CODEX — Migración y evolución de Orbit 360

> Documento único con TODO el contexto para construir el backend real de Orbit 360 y la
> personalización de Alianzas y Soluciones (A&S) como primer cliente. Pégalo en el nuevo
> proyecto de ChatGPT y carga los archivos listados en §6.

---

## 0. PRIMERA INSTRUCCIÓN OBLIGATORIA (antes de tocar backend)

> **AUDITORÍA FORENSE DEL PROTOTIPO.** Antes de escribir una sola línea de backend, ChatGPT/Codex
> debe leer TODO el código del prototipo (`orbit360-platform/`) y producir un documento que explique:
> - Todas las **lógicas** (cálculo de prima/IVA/recibos en `core/primas.js`, motor de comisiones en `core/comeng.js`, ciclo Ops↔Leads en `core/ciclo.js`).
> - Todos los **flujos** (ingreso lead → cotiza → negocia → cierra → emite → crea cliente → cadencia; cobro → conciliación; renovación; cancelación → recuperación; siniestro → bitácora).
> - Todas las **sincronizaciones** (cómo `Orbit.store._emit` propaga cambios; qué módulos escuchan).
> - Todas las **funcionalidades** módulo por módulo (28 módulos — ver `docs/AUDITORIA-FORENSE.md`).
> - Todas las **integraciones** previstas (42 — ver `modules/configuracion.js` → addons).
> - El **modelo de datos** (todas las colecciones de `data/seed.js` y su forma).
>
> Solo cuando ese documento esté completo y validado por la dueña del producto, se diseña el backend.
> **Razón:** el backend debe respetar exactamente las lógicas y la capa de datos del prototipo, no reinventarlas.

---

## 1. Qué es Orbit 360
Sistema 360 comercializable para intermediarios de seguros. Greenfield, **white-label**, **multi-tenant**
vía `Orbit.tenant`. **A&S es el primer cliente**, personalizable SOLO por configuración (logo, paleta,
país por defecto, aseguradoras, tarifas, glosario). NO se reescribe código por cliente.

Repo: `paulaosoriof86/orbit360-core` (la carpeta `orbit360-platform/` ES el repo).

## 2. Principio de arquitectura que NO se rompe
**Capa de datos única.** Los módulos nunca tocan `localStorage` directo: solo `Orbit.store`
(`insert/update/remove/all/get/where` + `_emit`). Para el backend: **reimplementa `data/store.js`**
contra Firebase/Postgres/lo que sea, manteniendo la MISMA firma. Los 28 módulos quedan intactos.

```
Hoy:    Orbit.store → localStorage
Backend: Orbit.store → API REST / Firestore (misma firma, mismas colecciones)
```

## 3. Cómo MEJORAR el prototipo a partir de documentación
1. La dueña del producto entrega documentación nueva (capturas, PDFs de pólizas, reglas de negocio).
2. Se actualiza el **prototipo** (`orbit360-platform/`) primero — es la fuente de verdad de UX y lógica.
3. Cada cambio se verifica con recarga real (ver `docs/PROMPT-SIGUIENTE-SESION.md`, metodología #126).
4. Se versiona el `?v=` de `index.html` para evitar caché.
5. Se entrega ZIP y se sube a GitHub.

## 4. Cómo ACTUALIZAR la plataforma A&S desde mejoras del prototipo
1. El prototipo evoluciona en su repo. A&S es un **deploy** con su `store.js` (backend) + su tenant.
2. Para actualizar A&S: **reemplaza `modules/`, `core/`, `styles/`** con los del ZIP nuevo.
   **CONSERVA** tu `data/store.js` (ya conectado a backend) y tu configuración de tenant.
3. Como los módulos solo hablan con `Orbit.store`, no se rompe la conexión al backend.
4. Datos (clientes, pólizas) viven en el backend, no en `seed.js` (que es solo demo).

## 5. Etapas de backend (orden sugerido)
1. **Auth real** (reemplazar `core/auth.js` demo por OAuth/JWT). Crear usuarios con correo del usuario
   (no genérico) + credenciales por correo/WA al crear.
2. **`store.js` → backend** (Firestore/Postgres). Mantener firma. Migrar colecciones de `seed.js` como esquema.
3. **Importadores reales** (`core/importa.js`): hoy parsea CSV/TSV/TXT/Excel/PDF/imagen en cliente con
   heurística + IA opcional. En backend, mover extracción pesada (OCR, PDF grande) a servidor con el
   proveedor de IA elegido. Mapeo a colecciones ya está definido en `IMPORT_MAP`.
4. **Integraciones** (§7): conectar las credenciales que la UI ya captura y persiste.
5. **IA** (§8): enrutar `Orbit.ia` al proveedor elegido por el cliente.

## 6. FUENTES A CARGAR en el proyecto de ChatGPT
- El **ZIP completo** de `orbit360-platform/` (código + docs).
- `docs/manual-maestro.html` — documento maestro de todos los módulos.
- `docs/AUDITORIA-FORENSE.md` — qué hace cada módulo.
- `docs/AUDITORIA-AUTOADMINISTRABLE.md` — qué es configurable.
- `docs/INSTRUCCIONES-PROYECTO-AYS.md` — contrato del proyecto (pegar como instrucción del proyecto).
- `docs/capacitacion-tecnica-interna.html` — pasos de migración.
- PDFs reales de A&S (pólizas GT/CO, cotizaciones, tarifas, directorio aseguradoras) para entrenar
  importadores y cotizador/comparativo.
- Bases reales a importar (clientes, pólizas, cobros) en CSV/Excel.

## 7. Integraciones (la UI ya captura credenciales; falta conectar backend)
Make, Outlook/M365, Gmail/Workspace, IMAP/POP3, WhatsApp Cloud API, Green API, Telegram, SMS,
Google Drive/Calendar/Sheets/Docs/Meet/Contacts/Forms, Looker, Metricool, Meta (FB/IG), LinkedIn,
TikTok, YouTube, web, Mailchimp, Canva, Gamma, HeyGen, Adobe, CapCut, Zapier, n8n, Notion, Slack,
Teams, Trello, OneDrive, FEL GT (SAT), DIAN CO, Open Banking, y los 3 motores de IA + NotebookLM/Perplexity.
Cada una tiene tarjeta en Config → Integraciones con API key / webhook / OAuth / endpoint + Probar.

## 8. Motor de IA — recomendación REAL (sin sesgo)
La extracción de PDFs de seguros (cotizador/comparativo) es el caso más exigente.
- **Claude (Anthropic):** mejor comprensión de documentos complejos y extracción estructurada; no inventa. **Recomendado para A&S** por garantía de calidad. Costo alto.
- **GPT-4o/4.1 (OpenAI):** muy fiable en JSON estructurado y function-calling; buena visión. Equilibrio. Costo medio.
- **Gemini (Google):** mejor costo y OCR de volumen; **Flash es inconsistente en extracción matizada** de seguros (experiencia real de la dueña). Pro mejora pero sube el costo.
- **Decisión de producto:** el prototipo ofrece **los 3 + endpoint propio, sin preseleccionar**
  (Config → Automatizaciones → Motor de IA + "📊 Comparar modelos"). Cada cliente elige calidad vs costo.
  **A&S: usar Claude o GPT-4** por la garantía que necesita.
- **Para el trabajo técnico** (mantener el repo, backend): **ChatGPT con Codex** es buena opción operativa.

## 9. PROMPT DE LA PRIMERA CONVERSACIÓN (pegar en ChatGPT/Codex)
```
Voy a construir el backend de Orbit 360, un CRM 360 para intermediarios de seguros, a partir de un
prototipo HTML/JS funcional que te adjunto (ZIP de orbit360-platform/). Primer cliente: Alianzas y
Soluciones (A&S).

PASO 1 (obligatorio, no lo saltes): haz una AUDITORÍA FORENSE del prototipo. Lee todo el código y
escribe un documento que explique todas las lógicas (primas, comisiones, ciclo Ops↔Leads), flujos,
sincronizaciones (Orbit.store._emit), funcionalidades de los 28 módulos, integraciones previstas y el
modelo de datos (colecciones de seed.js). Apóyate en docs/AUDITORIA-FORENSE.md y docs/manual-maestro.html.
No diseñes backend hasta que yo valide ese documento.

PASO 2: propón el esquema de base de datos respetando las colecciones del prototipo y la firma de
Orbit.store (insert/update/remove/all/get/where). Mantén la capa de datos única: los módulos no cambian.

PASO 3: plan de migración por etapas (auth, store→backend, importadores, integraciones, IA),
conservando store.js del cliente y su tenant al actualizar módulos.

Reglas: marca Orbit 360 (white-label, slot de logo del cliente), datos del cliente reales en backend,
moneda por país sin mezclar, producción/comisiones sobre prima NETA recaudada. No reinventes la lógica:
respétala tal como está en el prototipo.
```

## 10. Documento maestro
`docs/manual-maestro.html` es el documento maestro (12 secciones, todos los módulos). Cárgalo como
referencia canónica. De él derivan los manuales por rol y la capacitación interna.
