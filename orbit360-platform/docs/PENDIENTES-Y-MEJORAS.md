# PENDIENTES Y MEJORAS — Orbit 360 (candidato v1.114 · 2026-07-04)

> Documento puente para **ChatGPT (migración / backend)**. Lista honesta de lo que
> **funciona como prototipo** vs lo que **requiere backend real** o **profundización**.
> No reescribir la lógica del prototipo: respetarla y conectarla. Cada cambio se
> registra en `docs/BITACORA-ERRORES.md`. Adjuntar este archivo como fuente del proyecto.

---

## 0. Estado general (qué SÍ está listo en el prototipo)
- **30 módulos** renderizan sin error de consola (auditoría clic-por-clic v3, ver `AUDITORIA-FORENSE.md`).
- **Capa de datos única** `Orbit.store` (API: `all/get/where/insert/update/remove/_emit`) con re-render en vivo. Swappable a backend sin tocar módulos.
- **White-label**: logo del cliente (topbar + login), paleta seleccionable, nombre de empresa, menú claro/oscuro — todo desde Configuración.
- **Ciclo Ops↔Leads**, primas/recibos por forma de pago, comisiones (aseguradora + asesor), cancelaciones, siniestros, renovaciones, cobros con conciliación — lógica construida.
- **Cláusulas legales** blindantes por país y tipo de usuario (`core/legal.js`), persistentes y firmadas en primer ingreso.
- **Academia** con 10 cursos (formato tarjetas), categorías autoadministrables, quiz configurable/replanteable por IA.
- **Documentos de migración**: `MIGRACION-MAESTRO.md`, `INSTRUCCION-PROYECTO-CHATGPT.md`, `GUIA-CHATGPT-CODEX.md`.

---

## 1. CRÍTICO para la migración (requiere backend real)

### 1.1 Importadores inteligentes — extracción REAL
- **Estado prototipo:** la UI, el mapeo por sinónimos de encabezado, el dedup contra el store y el botón "🔄 Iterar" (re-mapeo columna→campo) están construidos. La **extracción de PDF/imagen es simulada** (no hay OCR/parsing real en navegador sin backend).
- **A implementar:** motor real de extracción server-side — PDF (texto + OCR para escaneados), Excel/CSV (SheetJS), imagen (OCR), Word. Pasar el texto extraído al mapeador existente. Soportar TODOS los importadores (no solo DPI/póliza): clientes/base inicial, aseguradoras (multi-hoja: una hoja por aseguradora con contactos/accesos), pólizas, vehículos (tarjeta de circulación), estados de cuenta, planillas de comisiones, movimientos financieros, estado bancario, bitácora de siniestros (multi-cliente), calendario de marketing.
- **Reglas de negocio del importador de pólizas (ya documentadas, validar en backend):**
  - Póliza Vigente/Por renovar → genera recibos automáticos según forma de pago y cantidad de pagos; quedan en cartera.
  - Póliza Cancelada/Vencida → histórico (NO cartera, SÍ analítica).
  - Recibos: el cliente tiene histórico de **pagados**, no el total. Al crear la póliza, generar la cantidad de recibos por forma de pago y **aplicar** los que estén reportados como pagados; el resto en cartera **solo si la póliza es vigente/por renovar de este año**.
  - Estado de cuenta de aseguradora → crea recibos faltantes + aplica pagos reportados (doble vía de conciliación) + señala desviaciones.
  - Planilla de comisiones → actualiza/crea tarifas % por producto/aseguradora; aplica pago si detecta la póliza o señala que no se aplicó.

### 1.2 Correo (Outlook/Gmail/IMAP-POP3)
- **Estado:** bandeja, lector, redactar, vincular a entidad (cliente/póliza/cobro/gestión/aseguradora), conector configurable y botón de correo asociado en fichas — todo en modo demo sobre el store.
- **A implementar:** conexión real IMAP/POP3 (cualquier proveedor/dominio propio, no solo Outlook), por cuenta **del usuario** (no genérica). Sincronizar correos reales, detección de cliente por remitente, adjuntos del correo → documentos del cliente automáticamente, envío con asunto patrón {cliente}·{póliza}·{gestión}. Notificaciones de entrada.

### 1.3 Integraciones y automatizaciones
- **Estado:** Config→Integraciones y Config→Automatizaciones listas para configurar (tarjetas, selector de motor IA sin sesgo Gemini/ChatGPT/Claude/endpoint, eventos). **No hay wiring real.**
- **A implementar:** webhooks Make por evento (`poliza_emitida`, `pago_aplicado`, `solicitud_gestion`, etc.), WhatsApp Cloud API + Green API, Google (Sheets/Drive/Gmail), Metricool/Mailchimp/redes, Canva/Gamma/HeyGen/NotebookLM. Las plantillas de texto salen de la plataforma; el diseño visual de correo se arma en Make.

### 1.4 IA real (multi-proveedor)
- **Estado:** capa `Orbit.ia` con selector global + por módulo; en prototipo usa `window.claude.complete` cuando está disponible, si no devuelve mock.
- **A implementar:** conectar al proveedor elegido por el cliente. Para extracción de PDFs de seguros con garantía de calidad: **Claude o GPT-4** (Gemini Flash es más económico para volumen/OCR pero menos fiable en extracción estructurada). Recomendación A&S: Claude o GPT-4 para extracción; cualquiera para texto.

---

## 2. PROFUNDIZACIÓN (mejora de contenido, no bloquea backend)

### 2.1 Cotizador / Comparativo
- **Estado:** versión compacta funcional, vinculada a Orbit Aseguradoras (no a tarifas del HTML viejo), con historial. Cotizador → cotiza, imprime por aseguradora, deriva a comparativo. Comparativo standalone que admite carga de PDFs.
- **Pendiente de profundizar (para A&S se hará con sus tarifas reales):** listas desplegables marca→línea→modelo de vehículo; campos por ramo (auto vs gastos médicos vs otros) que cambian según producto; impresión en el formato exacto de cada aseguradora con sus colores/logo; extracción IA real de PDFs cargados al comparativo con edición previa.

### 2.2 Academia
- **Estado:** 10 cursos en formato tarjetas, categorías CRUD, quiz IA configurable.
- **Pendiente:** recursos **embebidos en grande** (video YouTube/archivo, PDF/imagen como visor, no descarga); cursos profundos por **rol** (completo, sin-finanzas, marketing, administrativo, operativo, asesor) habilitables por tipo de usuario; tiempo de lectura/video calculado por contenido; crear curso con IA desde varios adjuntos; manuales por rol en formato documento Orbit (plantilla del demo).

### 2.3 Dashboard financiero
- **Pendiente:** más tablas de datos concretos y comparativos interanual/intermensual reales (no solo gráficas); CxC/CxP con detalle clic + edición de estado que refleje en movimientos; ingresos por financiamiento separados de operativos con control de deuda; crear mes/presupuesto con semáforos de cumplimiento.

### 2.4 Insights
- **Pendiente:** comparativos interanual/intermensual por asesor/ramo/aseguradora/general con tabla + gráfica; top de clientes clasificado (ramo, aseguradora, asesor, nuevos/antiguos, volumen, nº pólizas); análisis crítico que se regenere con IA real; selector país/periodo plenamente funcional.

### 2.5 Manuales
- **Pendiente:** set completo por rol (super admin, admin, marketing, operativo, asesor) + técnico (backend/migración/soporte), en formato documento Orbit (plantilla `manual-maestro.html`), en plataforma (Academia) y exportable a PDF. Selección de quién ve cada manual.

---

## 3. AJUSTES FINOS / UI (rápidos, hot-fix en chat o backend)
- KPIs clicables con modal de detalle: auditados sin error; revisar **profundidad** del detalle módulo a módulo (algunos abren resumen genérico).
- Portal del cliente: pólizas/pagos/documentos con detalle completo; cargar y reportar soporte de pago → crea ítem en Ops; notificaciones clicables; "Aprende" con recursos abribles; glosario propio (no el de Academia interna).
- Buscador del topbar: búsqueda global por nombre/póliza/placa.
- Cobros/renovaciones/recibos desde cualquier menú → abrir **detalle**, no la ficha del cliente en resumen.
- Logo del cliente: ya parametrizado (topbar + login). En versión comercializable se entrega **sin** logo (slot vacío "Tu logo aquí"); A&S lo carga en Configuración.

---

## 4. CÓMO TRABAJAR LOS PENDIENTES (regla para ChatGPT)
1. **Backend primero** (sección 1): reescribe `data/store.js` a Firestore manteniendo su API exacta; no toques módulos. Conecta auth, storage, Make e IA por etapas (ver `GUIA-CHATGPT-CODEX.md`).
2. **Profundización** (sección 2): mejora de contenido/UI sin romper la firma de `Orbit.store`; reutiliza helpers (`K.kpis`, `K.banner`, `drawer-back`); alcance mínimo.
3. Tras cada cambio: recargar, verificar 0 errores de consola, registrar en `docs/BITACORA-ERRORES.md` (módulo, síntoma, causa, archivo/función, fix, fecha, estado).
4. **La bitácora es la fuente que vuelve a Claude** para mejorar el prototipo base. Todo lo que el prototipo deba mejorar se documenta ahí.

## 5. ACTUALIZAR A&S CUANDO MEJORE EL PROTOTIPO
Claude entrega ZIP nuevo → reemplaza `modules/` + `core/` + `styles/`, **conserva tu `data/store.js` (backend) y tu `Orbit.tenant`**. Como los módulos solo hablan con `Orbit.store`, la mejora entra sin tocar datos reales. Si cambia el esquema, `CHANGELOG.md` trae nota de migración.
