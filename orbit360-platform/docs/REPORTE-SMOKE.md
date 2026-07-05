# Reporte de smoke · Orbit 360 · candidata activa 2026-07-04T193658.630 (v1.126)

**Fecha:** 2026-07-04 · datos ficticios del seed. Smoke visual/prototipo local (no backend/Firestore/LAB/datos reales).
- ✅ App carga sin errores de consola.
- ✅ **Moneda por país** verificada: país GT muestra `Q` (GTQ), país CO muestra `$` (COP) en KPIs de Pólizas, Cobros, Comisiones, Finanzas, Inicio, Insights, Leads, Renovaciones, Siniestros, Portal; vista global (TODOS) normaliza con tasa declarada (`queries.js`) sin suma cruda.
- ✅ Academia v1.125 con lecciones "Paso a paso"; `CONTENT_V=3` actualiza contenido conservando progreso.
- ✅ Backend protegido intacto.

---

# Reporte de smoke · Orbit 360 · candidato v1.117 (CONGELADA · base frontend aprobada)

**Fecha:** 2026-07-04 · datos ficticios del seed.
> **Smoke visual/prototipo local de Claude.** No corresponde a smoke backend, Firestore, LAB real ni carga de datos reales. Valida render, navegación y lógica del prototipo en el navegador; la validación de backend/Firestore la ejecuta el lane de ChatGPT/Codex.

- ✅ App carga sin errores de consola (verificado en navegador local).
- ✅ Las 6 correcciones 134907 confirmadas (ver bloque v1.117 abajo).
- ✅ Backend protegido intacto — no se ejecutó ni tocó backend/Firestore/LAB.
- ⚠ Recorrido masivo de 30 rutas excede el timeout del evaluador; verificado por lotes + auditoría runtime previa (0 pantallas en blanco / 0 errores).

---

## Alcance del smoke (aclaración)
> **Smoke visual/prototipo local de Claude.** No corresponde a smoke backend, Firestore, LAB real ni carga de datos reales. Valida render, navegación y lógica del prototipo en el navegador; la validación de backend/Firestore la ejecuta el lane de ChatGPT/Codex.

# Reporte de smoke · Orbit 360 · candidato v1.117

**Fecha:** 2026-07-04 · datos ficticios del seed. Smoke visual/prototipo local (no backend/Firestore/LAB).
- ✅ App carga sin errores de consola.
- ✅ **P0-134907-01** `clientes.fields` mapea `moneda` (moneda/divisa/currency); con moneda explícita se respeta, sin ella queda `''` + `requiere_validacion` (no GTQ).
- ✅ **P0-134907-02** `estados-banco` → colección `conciliacionBanco` (`estado:'pendiente_conciliacion'`), NO escribe `finmovs`/cobros/clientes/pólizas. Copy: "Se cargará para conciliación bancaria. No crea cobros ni movimientos financieros hasta que se valide."
- ✅ **P1-134907-03** Copy de documentos: "propone cambios para revisión/aprobación; no modifica clientes ni pólizas directamente".
- ✅ **P1-134907-04** Sin "diff" en UI (label → "Propuestas de actualización del expediente (pendientes de aprobación)").
- ✅ **P1-134907-05** Panel: estados técnicos mapeados (Pendiente de conexión / Pendiente de configuración / Sin estado / Probando…).
- ✅ Backend protegido intacto.

---

# Reporte de smoke · Orbit 360 · candidato v1.116

**Fecha:** 2026-07-04 · datos ficticios del seed.
- ✅ App carga sin errores de consola.
- ✅ **P0-01/P0-02** Cliente importado sin país → `pais:''`, `moneda:''`, `requiereValidacion:true`, `monedaSugerida` aparte (NO se asume GTQ). Verificado en vivo.
- ✅ **P0-03** `SCOPE.documentos` = `parchesPendientes` (no crea clientes/pólizas directos).
- ✅ **Regla** `Listado producción 2025-2026` excluida por `HOJA_SOPORTE` (verificado con y sin tilde).
- ✅ **P1-04** Panel sin "LAB" visible (→ "Prueba", solo en modo prueba interno).
- ✅ Backend protegido intacto (no se tocó `data/store.js`, loaders/guards, `firestore.rules`, tools `orbit360-*`).

---

# Reporte de smoke · Orbit 360 · candidato v1.115

**Fecha:** 2026-07-04
**Entorno:** navegador real (preview), datos ficticios del seed.
**Objetivo:** validar carga sin errores y fixes de la reauditoría 072304 (P0/P1).

## Carga inicial
- ✅ App carga (login white-label → app); sin errores de consola.

## Fixes reauditoría (camino real)
- ✅ **P0-01** Trazabilidad llega al registro: finmov importado conserva `_numeroFila`/hoja/periodo (`copyRowMeta` en applyImport/dryRun/conciliarRows).
- ✅ **P0-02** País GT sin moneda explícita → `estado:'requiere_validacion'`, `moneda:''`, `monedaSugerida:'GTQ'` (no se asume). Pólizas idem.
- ✅ **P0-03** Planilla de comisión: contrato con esperada vs pagada; tarifas solo con **diff confirmado** (checkbox + columna % actual/nuevo).
- ✅ **P0-04** Documentos → `parchesPendientes` con diff; nunca modifican cliente directo.
- ✅ **P1-07** Concepto "Pago cliente REC-99" en histórico → `requiere_validacion` (no entra a caja).
- ✅ **P1-06** Sin "Pendiente de backend"/"modo demo"/"Simular"/"Diagnóstico" en UI cliente.
- ✅ **P1-05** Cierre financiero relativo a fecha viva; vigencia de ejemplo IA relativa a hoy.

## Limitaciones
- Recorrido masivo de 30 rutas excede el timeout del evaluador; se verificó por lotes + auditoría runtime previa (0 blancos/errores).
- OCR/PDF/Word: prototipo con CDN; producción = extractor backend (documentado).

## Veredicto
✅ Candidato v1.115 apto para el pipeline de empalme aditivo (preflight/plan/preview/diff).

---

# Reporte de smoke · Orbit 360 · candidato v1.114

**Fecha:** 2026-07-04
**Entorno:** navegador real (preview), datos ficticios del seed.
**Objetivo:** validar que la app carga sin errores y que los fixes P0/P1/P2 funcionan clic por clic.

## Carga inicial
- ✅ App carga: login white-label (marca Orbit 360, slot de logo del cliente = tenant demo) e ingreso.
- ✅ Sin errores de consola en la carga (`get_webview_logs` limpio).
- ✅ Topbar: marca Orbit 360 + logo cliente en slot white-label; selector de país y rol operativos.

## Navegación de módulos
- ✅ Rutas verificadas renderizan con contenido (sin pantalla en blanco): inicio, importar, finanzas, pólizas, cliente360, portal, configuración; y por auditoría previa las 30 rutas del NAV.
- ✅ Importar: hub muestra tipos por grupo, incluye "Importar histórico financiero (GT/CO)".

## Fixes del importador (camino real)
- ✅ **P0-02/P1-02** `financiero-historico`: CSV con fila `TOTALES` → se **excluye** (aparece en el resumen); banner "🔒 Alcance de esta fuente" visible en pasos 1 y 2.
- ✅ **P0-03** finmov sin columna país → se crea con `pais=''`, `moneda=''`, `estado:'requiere_validacion'`, `requiereValidacion:true`. **No** se asumió GT/GTQ.
- ✅ **P0-06** `docs-aseguradora` abre en **modo documental**; `documentos` sin expediente abierto **no crea clientes** (conteo de clientes sin cambios).
- ✅ Reporte de importación descargable (CSV) incluye alcance, estado del archivo y hojas procesadas/excluidas.

## UI comercializable
- ✅ **P1-05** Login sin credenciales demo precargadas (placeholders "tu.correo@empresa.com" / "Contraseña").
- ✅ **P1-07** Selector de paleta ya no dice "White-label para Alianzas".
- ✅ **P1-06** Campos de fecha (portal/cliente360/correo) usan fecha viva.
- ✅ **P2-01** PWA: lógica de 3 estados (instalada/iOS/otros) en `core/pwa.js`.

## Limitaciones del smoke
- El recorrido masivo de las 30 rutas en una sola pasada excede el límite de tiempo del evaluador del entorno; se verificó por lotes y con la auditoría runtime previa (v1.111) que confirmó 0 pantallas en blanco y 0 errores en las 30 rutas.
- OCR/PDF/Word dependen de librerías CDN en el prototipo; en producción el extractor debe ser backend (documentado, sin error técnico en UI).

## Veredicto
✅ Candidato v1.114 apto para pasar al pipeline de empalme (preflight, plan, preview, diff, empalme aditivo) de ChatGPT/Codex.
