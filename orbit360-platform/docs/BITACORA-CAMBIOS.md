# Bitácora de cambios · Orbit 360 (prototipo comercializable)

> Registro cronológico de cambios del **prototipo** (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora. Formato: versión · fecha · qué cambió · archivos.

## v1.115 — 2026-07-04 · Reauditoría 072304: trazabilidad real, moneda no autocompletada, comisiones, documentos, textos
> Sin tocar backend/LAB, `data/store.js` backend, Firestore, ni deploy. Sin datos reales.
- **P0-01 Trazabilidad a `rec`** (`core/importa.js`): helper `copyRowMeta(cells, rec)` llamado en `applyImport`, `dryRun`, `conciliarRows` y el flujo scoped → `_origenHoja/_paisHoja/_monedaHoja/_periodoHoja/_bloqueOrigen/_numeroFila` llegan al registro final (`finmovs`). Verificado: `_numeroFila` presente en el finmov creado.
- **P0-02 Moneda no autocompletada**: `finmovShape` y pólizas separan `moneda` (solo **explícita** de fila/hoja) de `monedaSugerida` (`monedaDe(pais)`, no se escribe). País reconocido pero sin moneda explícita → `requiere_validacion`. Verificado: GT sin moneda → `requiere_validacion`, `monedaSugerida:GTQ`.
- **P0-03 Contrato real de planillas de comisión**: campos aseguradora/póliza/recibo/asesor/ramo/producto/**primaNeta**/**comEsperada**/**comPagada**/pais/moneda/periodo; conciliación esperada vs pagada (`difComision`); falta país/moneda/periodo/aseguradora → `requiere_validacion`. Tarifas **solo** se aplican con **diff confirmado** (checkbox "Aplicar estos % al tarifario" + columna % actual vs nuevo con Δ).
- **P0-04 Documentos → parches con diff**: `documentos` escribe a `parchesPendientes` (nunca a `clientes` directo). Con expediente abierto genera un parche con el **diff** (campo: actual→propuesto) pendiente de confirmación; sin expediente, no hace nada.
- **P1-05 Fechas fijas**: cierre financiero por defecto **relativo** a la fecha viva (2 meses atrás) en `modules/finanzas.js`; `core/config.js` `cierreFinanciero:{}`; vigencia de ejemplo en `core/ia.js` relativa a hoy. (Seeds de `core/integraciones.js` son tenant demo aislado — permitido.)
- **P1-06 Textos técnicos**: "Pendiente de backend"→"Pendiente de conexión" (configuración ×5); "backend del tenant" removido; panel "Diagnóstico…"→"Estado de integraciones", "🧪 Simular"→"▶ Probar"; marketing "backend seguro"→"conexión"; correo "modo demo"→"sin cuenta conectada".
- **P1-07 Financiero histórico**: conceptos ingreso que parecen cobro/recaudo de cliente (pago cliente/recibo/póliza/prima/cuota/recaudo/abono) → `requiere_validacion` (no entran a caja). Verificado: "Pago cliente REC-99" bloqueado.
- Cache-bust: `importa.js`→`?v1305`, `config.js`/`ia.js`→`?v1305`, `finanzas.js`/`configuracion.js`/`correo.js`/`marketing.js`→`?v1305`.


## v1.114 — 2026-07-04 · Candidato corregido · auditoría ampliada A&S (P0/P1/P2)
> No se tocó backend/LAB, `data/store.js` backend, Firestore, ni se hizo deploy. Sin datos reales. A&S solo desde config/tenant demo. Detalle de estado P0/P1 en `docs/BITACORA-ERRORES.md`; smoke en `docs/REPORTE-SMOKE.md`.

**Importador (`core/importa.js`, `modules/importar.js`)**
- **P0-02** Excel multihoja con trazabilidad por fila: `_origenHoja/_paisHoja/_monedaHoja/_periodoHoja/_bloqueOrigen/_numeroFila`. Cada hoja infiere país/moneda/periodo de su nombre (sin asumir GT). Resumen de hojas procesadas/excluidas en el paso 2 y en el reporte CSV.
- **P1-02** Exclusión de **hojas soporte** por patrón de nombre (dashboard, resumen, presupuesto, análisis, producción, metas…) antes de mapear, con conteo y motivo.
- **P0-03** `normPais()` devuelve `''` cuando no reconoce país (antes: GT). `finmovShape` usa país de fila→hoja; sin país/moneda confiables marca `estado:'requiere_validacion'` y `requiereValidacion:true`. **No se asume GTQ.**
- **P0-04** Pólizas: nuevos campos `pais`/`moneda`; estado sin evidencia → `Requiere validación` (no `Vigente`). `afterInsert` genera recibos/cartera **solo** si Vigente/Por renovar **y** país+moneda+forma de pago confiables **y** sin `requiereValidacion`.
- **P1-04** Pólizas separan `primaNeta`/`gastos`/`iva`/`primaTotal`; si no se puede determinar la neta → `requiere_validacion` (producción/comisiones deben usar neta recaudada).
- **P0-05** `tarifasDetect()` lee **filas reales** (aseguradora/ramo/producto/%/base) del archivo; sin aseguradora reconocida y % válido, `tarifasConfiables=false` → **no** actualiza tarifas (referencia). Nuevo contrato `IMPORT_MAP['planillas-comision']` → colección `comisiones`.
- **P0-06** `docs-aseguradora` forzado a **modo documental** (solo almacena; SCOPE `crea:[]`). Todo tipo visible tiene contrato o queda documental/bloqueado.
- **P1-01** Ejemplo y descripción de `movimientos-finanzas` aclara que pagos de clientes NO van a caja (van a cobros/conciliación).
- **P1-03** `documentos` sin expediente abierto (scope) **no crea ni modifica clientes**: avisa y requiere abrir el expediente.

**UI comercializable**
- **P1-05** (`index.html`, `core/auth.js`) Login sin credenciales demo (`admin@demo.com`/`demo123`) → placeholders. (`core/integraciones-panel.js`) textos "demo/LAB" suavizados a lenguaje de usuario (sin tocar lógica ni contratos).
- **P1-06** Fechas quemadas operativas → fecha viva: `modules/portal.js`, `modules/cliente360.js` (×2), `core/correo.js` (×2).
- **P1-07** (`core/theme.js`) "White-label para Alianzas" → "Se aplica a toda la plataforma y al login". A&S solo desde tenant demo (slot white-label).
- **P2-01** (`core/pwa.js`) 3 estados: instalada (`✓ App instalada`, verde, auto-oculta), iOS (guía Compartir→Agregar a inicio), otros navegadores (`⬇ Instalar como app`).

**Verificado en vivo**: financiero-histórico excluye `TOTALES`; finmov sin país → `requiere_validacion` sin GT/GTQ; documentos = documental y no crea clientes; app carga sin errores de consola.
- Cache-bust: `importa.js`→`?v1304`, `config.js`/`finanzas.js`→`?v1300`, `theme.js`/`auth.js`/`correo.js`/`pwa.js`/`cliente360.js`/`portal.js`→`?v1304`, `configuracion.js`→`?v1301`.


## v1.113 — 2026-07-03 · Cierre opcionales: reporte de exclusiones descargable + cierre/catálogo por país
- **Reporte de importación descargable (CSV)**: nuevo botón **⬇ Reporte** en el paso 2 del importador. Exporta tipo de fuente, archivo, alcance (crea/actualiza y bloqueado), **estado del archivo** (`listo`/`requiere_validacion`/`sin_datos`), resumen dry-run (crear/actualizar/omitir/total) y el **detalle de filas excluidas con su motivo**. Trazabilidad completa de cada importación. Verificado: botón presente tras cargar archivo.
- **Cierre financiero por país** (`periodoEstado(ym, pais)`): `tenant.cierreFinanciero` admite ahora override por país `{ cerradoHasta:'2026-04', CO:{cerradoHasta:'2026-02'} }` con fallback al cierre global. El badge de estado del mes en Finanzas usa el país activo. Verificado: con CO cerrado hasta feb, marzo-2026 muestra "Referencia" (mientras el global GT lo daría "Cerrado").
- **Catálogo financiero por país** (`catFin`): admite `catalogoFinanciero.{GT|CO}.{ingresos,egresos}` con fallback al catálogo global del tenant. Backward-compatible con el catálogo plano existente.
- Reglas respetadas: sin backend/`store.js`, sin datos reales, sin hardcode A&S, sin notas técnicas.
- Con esto se cierran los opcionales pendientes del paquete A&S; el prototipo queda listo para el carril de backend.
- Cache-bust: `importa.js` → `?v1303`, `finanzas.js` → `?v1303`.
- Archivos: `core/importa.js`, `modules/finanzas.js`, `index.html`.


## v1.112 — 2026-07-03 · Fix: movimientos importados ahora suman en Finanzas (forma real de finmovs)
- **Bug corregido** (pendiente #1 de la auditoría): los builds del importador para finmovs producían `{ monto, tipo:'Ingreso', clasificacion, fecha }`, forma que **no coincide** con la del seed que lee Finanzas (`{ tipo:'ingreso'|'egreso', clase, pais, moneda, periodo, dia, valor, estado }`), por lo que los movimientos importados **no sumaban** en KPIs/dashboard.
- **Solución**: nuevo normalizador `finmovShape(rec, clase)` en `core/importa.js` que emite la forma real del seed (deriva `periodo`/`dia` de la fecha, `valor` absoluto, `tipo` en minúsculas, `pais`/`moneda` sin mezclar, `estado` recaudado/pagado, y `saldo_inicial`/`referencia` para saldo anterior). Aplicado a las 3 fuentes finmovs: `movimientos-finanzas`, `estados-banco`, `financiero-historico` (mutando `rec`, que es lo que consume `applyImport`).
- Verificado por importación real: CSV con fila `TOTALES` (excluida) + comisión GT 3.500 → el movimiento se crea con forma correcta y el total de ingresos GT del mes pasa de 15.503 a 19.003 (+3.500).
- Actualizado `docs/BITACORA-ERRORES.md`: el hallazgo del casing/forma queda **RESUELTO**.
- Cache-bust: `importa.js` → `?v1302`.
- Archivos: `core/importa.js`, `index.html`, `docs/BITACORA-ERRORES.md`.


## v1.111 — 2026-07-03 · Auditoría clic-por-clic (base 1.0) + limpieza de notas técnicas (P9)
- **Auditoría runtime de las 30 rutas del NAV**: navegación programática módulo por módulo → **0 pantallas en blanco, 0 errores de consola**; todos los `#host` con contenido. (Ver `docs/BITACORA-ERRORES.md`.)
- **Higiene de datos (checklist del paquete)**: `localStorage` directo en `modules/` = **0** (todo pasa por `Orbit.store`). Sin `Firestore/Firebase/localhost` en UI de módulos.
- **P9 · Notas técnicas visibles eliminadas**: quitadas de la UI las menciones "Demo: motor simulado / en producción se conecta el extractor real" (Importar hub y pasos del importador) y "(demo: solo la UI de gestión)" (Configuración → APIs). Reemplazadas por copy orientado al usuario. Verificado en vivo.
- Reglas respetadas: sin backend/`store.js`, sin datos reales, sin hardcode A&S.
- Cache-bust: `importa.js`, `importar.js`, `configuracion.js` → `?v1301`.
- Archivos: `core/importa.js`, `modules/importar.js`, `modules/configuracion.js`, `index.html`, `docs/BITACORA-ERRORES.md` (nuevo).


## v1.110 — 2026-07-03 · Estados de cierre por periodo (paquete A&S · P5)
- **`tenant.cierreFinanciero.cerradoHasta`** (nuevo, default `2026-04`): último periodo consolidado, configurable por tenant (sin hardcode A&S).
- **`periodoEstado(ym)`** en Finanzas clasifica cada mes: `≤ cerradoHasta` → **🔒 Cerrado**; mes siguiente → **◷ Referencia** (requiere conciliación manual, no es cierre); meses posteriores pasados → **✎ Captura y conciliación**; mes actual/futuro → **● Abierto / en validación** ("no se cierra sin planillas, estados de cuenta o respaldo").
- **UI**: badge de estado junto al título de Movimientos + nota explicativa (oculta cuando el mes está cerrado). Verificado cambiando de mes: abril=Cerrado, mayo=Referencia, junio=Captura, julio=Abierto — exactamente los cortes del paquete.
- No-destructivo; sin backend/`store.js`, sin datos reales, sin notas técnicas.
- Con esto quedan implementadas del paquete A&S: **P1, P2, P4, P5, P6, P7** (importador con alcance/guarda/saldo/histórico + catálogo financiero + cierres). Pendiente opcional: catálogo/cierre por **país** (hoy por tenant) y reporte de exclusiones descargable.
- Cache-bust: `config.js` y `finanzas.js` → `?v1300`.
- Archivos: `core/config.js`, `modules/finanzas.js`, `index.html`.


## v1.109 — 2026-07-03 · Catálogo financiero editable por tenant (paquete A&S · P6)
- **`tenant.catalogoFinanciero`** (nuevo en DEFAULT): `{ ingresos, egresos, especiales }` — precargado con las clases del seed (para no romper movimientos existentes) más las categorías sugeridas del paquete (honorarios, reintegros, aportes, tecnología, administración, impuestos, bancos…). Heredable, por tenant, sin hardcode A&S.
- **Finanzas lee del catálogo**: `catFin('ingreso'|'egreso')` reemplaza los arrays fijos `CLASES_ING/EGR`; el alta/edición de movimiento y el presupuesto usan las categorías del tenant (fallback a los valores previos si no hay catálogo).
- **Editor "⚙ Categorías"** en la barra de Movimientos: agrega/quita categorías por grupo (💰 Ingresos / 💸 Egresos / 🔖 Especiales), persiste en `tenant.catalogoFinanciero`. Verificado: agregar "Consultoría" persiste y aparece de inmediato en el dropdown de alta de ingreso.
- No-destructivo; sin backend/`store.js`, sin datos reales, sin notas técnicas.
- **Pendiente del paquete que queda**: P5 (cierres mayo/junio/julio como referencia/captura/abierto) y catálogo por **país** (hoy es por tenant; puede extenderse a por-país si se requiere).
- Cache-bust: `config.js` → `?v1299`, `finanzas.js` → `?v1299`.
- Archivos: `core/config.js`, `modules/finanzas.js`, `index.html`.


## v1.108 — 2026-07-03 · Importador: fuente dedicada `financiero-historico` (P4) + alcance primero (P1)
- **Fuente `financiero-historico`** (nueva tarjeta en Importar → Finanzas): carga movimientos financieros históricos GT/CO. En `build`: **excluye filas no-movimiento** (títulos, subtotales, `TOTALES`/`Total general`, dashboards, presupuestos, producción) marcándolas `_excluir` con motivo; **separa país/moneda** (GTQ/COP, sin mezclar); trata **saldo anterior** como `SaldoInicial`/`referencia`/`requiereValidacion` (no suma). Las filas excluidas se **omiten** en `applyImport` y aparecen listadas como "excluida: …" en el resumen dry-run. Verificado con CSV real (TOTALES y Subtotal excluidos; comisión GT y nómina CO reconocidas).
- **P1 alcance-primero (satisfecho)**: el flujo ya obliga a elegir el **tipo de fuente** (tarjeta del hub Importar) antes de procesar, y el nuevo **banner "🔒 Alcance de esta fuente"** (v1.107) declara en el paso 1 qué crea/actualiza y qué queda bloqueado, antes de subir el archivo. La guarda `scopeGuard` impide escrituras fuera del alcance. Queda como mejora opcional cambiar el tipo dentro del propio drawer.
- Reglas respetadas: sin backend/`store.js`, sin datos reales, sin hardcode A&S, sin notas técnicas en UI.
- Cache-bust: `importa.js` → `?v1299`, `importar.js` → `?v1299`.
- Archivos: `core/importa.js`, `modules/importar.js`, `index.html`.


## v1.107 — 2026-07-03 · Importador: alcance por fuente + guarda anti-inferencia + regla de saldo anterior (paquete A&S P1/P2/P4/P7)
- **Alcance visible por fuente** (`core/importa.js`): cada tipo de importación muestra un **banner "🔒 Alcance de esta fuente"** en el paso 1 y 2 con lo que **crea/actualiza** y lo que **NO crea (bloqueado)**. Ej.: movimientos-finanzas / estados-banco → crean solo `finmovs`, **bloquean** clientes, pólizas, cobros y cartera. Verificado: el banner aparece y lista los bloqueos.
- **Guarda anti-inferencia cruzada** (`scopeGuard`): `applyImport` rechaza escribir en cualquier colección fuera del alcance declarado de la fuente (defensa además de que cada fuente ya escribía solo a su colección). Si se intenta, avisa "⛔ Bloqueado por alcance".
- **Regla de SALDO ANTERIOR** (build de `movimientos-finanzas`): conceptos "saldo anterior/inicial" ya **no** se cargan como ingreso/egreso operativo — se marcan `tipo:'SaldoInicial'`, `signo:0`, `estado:'referencia'`, `requiereValidacion:true`. Finanzas filtra estrictamente `ingreso`/`egreso`, por lo que estos **no suman** en totales (verificado por lectura del filtro).
- **Pendientes del importador (abiertos, documentados)**: (a) selector de tipo de fuente como **primer paso obligatorio** con lista de tipos del paquete (clientes/polizas/cobros_realizados/planilla_aseguradora/estado_cuenta/financiero_historico/siniestros/documentos_soporte/configuracion_catalogo); (b) modo **financiero_historico** dedicado con detección de hojas mensuales por país/mes/año y exclusión de títulos/subtotales/dashboards; (c) reporte de exclusiones y estados por archivo (listo/requiere_validacion/bloqueado/superado); (d) catálogo financiero editable por tenant. Estos quedan para la próxima sesión.
- Reglas respetadas: sin tocar backend/`data/store.js`, sin datos reales, sin hardcode A&S, sin notas técnicas en UI.
- Cache-bust: `importa.js` → `?v1298`.
- Archivos: `core/importa.js`, `index.html`.


## v1.106 — 2026-07-03 · Localización cableada en módulos internos (cobros, cliente360) + fix fecha congelada
- **Cobros · detalle del recibo** (`modules/cobros.js`): helper `TT(k)` resuelve por el país del cliente del recibo; el crumb "Recibo", el título "Desglose del recibo", "Prima neta" y "Total del recibo" ahora usan `Orbit.termino()`. Verificado: con override CO `recibo→Comprobante` / `prima_neta→Prima neta base`, el detalle refleja ambos.
- **Cliente360 · alta de cliente**: el label del campo de identificación usa `Orbit.termino('id_fiscal')` (NIT/RFC/RUC/… según país) en vez del texto fijo "DPI/Cédula/NIT".
- **Fix fecha congelada**: el endoso tenía `value="2026-06-22"` quemado; ahora `Orbit.ui.today()` (fecha viva).
- No-destructivo: sin overrides, los términos por defecto quedan idénticos.
- **Pendiente menor**: cablear encabezados de tablas analíticas de comisiones (país mixto — requiere criterio); el resto de localización queda cerrado.
- Cache-bust: `cobros.js`, `cliente360.js` → `?v1298`.
- Archivos: `modules/cobros.js`, `modules/cliente360.js`, `index.html`.


## v1.105 — 2026-07-03 · Marketing historial de eventos + responsive global (endurecimiento)
- **Marketing · historial de eventos por contenido**: la ficha de contenido ahora muestra **🧾 Historial de eventos** (leído de `Orbit.integraciones.list({entidad:'contenidos', entidadId})`) con evento (pieza/programación/guardado/sync), estado (badge) y fecha-hora. Se **refresca en vivo** al Crear pieza / Programar. Verificado: al emitir, los eventos aparecen al instante.
- **Responsive global (endurecimiento)** en `styles/base.css`: tablas `.tbl` con scroll horizontal ≤900px (no desbordan el viewport); Configuración `.cfg-wrap`/`.cfg-side` pasan a columna con navegación horizontal ≤820px; portal `.pt-cards` compactas y formularios a 1 col ≤560px; **calendario de marketing** con scroll horizontal (min-width 560px) en vez de aplastar 7 columnas ≤640px; drawers `max-width:96vw`; `.page{overflow-x:hidden}`. Verificado a ~390px: sin desbordes horizontales.
- Cache-bust: `marketing.js` → `?v1298`, `base.css` → `?v1298`.
- Archivos: `modules/marketing.js`, `styles/base.css`, `index.html`.


## v1.104 — 2026-07-03 · Localización por país: editor de glosario + cableado en portal
- **Editor de glosario** en Configuración → Países y monedas: selector de país (entre los activos del tenant) + 17 campos (póliza, recibo, prima, prima neta, cliente, asegurado, aseguradora, comisión, ramo, vigencia, deducible, siniestro, cobro, tomador, **id fiscal**, corredor, gestión). Cada campo muestra el valor por defecto como placeholder; vacío = usa default. Botones **Guardar** (escribe `tenant.glosario[pais]`) y **Restablecer a defaults**. Verificado: guardar GT `poliza→Contrato` hace que `Orbit.termino('poliza','GT')` devuelva "Contrato"; restablecer vuelve a "Póliza".
- **Cableado en Portal del Cliente** (`modules/portal.js`): helper `TT(k)` resuelve por el país del cliente activo; labels de detalle de póliza (N.º de póliza, prima total), recibo (título, póliza, prima neta) ahora usan `Orbit.termino()`. Así el cliente ve la terminología de su país.
- No-destructivo: sin overrides, todos los textos quedan idénticos.
- **Pendiente localización**: cablear términos en más módulos internos (cliente360, cobros, comisiones, aseguradoras) — el editor y el helper ya están listos para ello.
- Cache-bust: `configuracion.js` y `portal.js` → `?v1298`.
- Archivos: `modules/configuracion.js`, `modules/portal.js`, `index.html`.


## v1.103 — 2026-07-03 · Localización por país: base `Orbit.termino()` + glosario por tenant
- **Nuevo helper `Orbit.termino(clave, pais)`** en `core/config.js`: resuelve términos de seguros con prioridad `tenant.glosario[pais]` → `tenant.glosario['*']` → `Orbit.TERMINOS[pais]` → `Orbit.TERMINOS['*']` → la clave literal. Todo override es **opcional y no-destructivo**: sin config usa los defaults, así que ningún texto existente cambia.
- **`Orbit.TERMINOS`** con defaults por país para las claves clave (poliza, recibo, prima, prima_neta, cliente, asegurado, aseguradora, comision, ramo, vigencia, deducible, siniestro, cobro, tomador, **id_fiscal**, corredor, gestion). Ej.: `id_fiscal` = NIT (GT/CO), RFC (MX), RUC (PA), Cédula jurídica (CR); `corredor` varía (Corredor / Intermediario / Agente).
- **`tenant.glosario: {}`** añadido al DEFAULT (heredable), para que cada cliente sobreescriba términos por país desde Configuración (editor de glosario = pendiente de UI).
- **Alcance de esta entrega**: base transversal lista y probada de forma aislada. **Pendiente (próxima sesión)**: (a) editor de glosario en Configuración → Localización; (b) cablear `Orbit.termino()` en los textos de módulos (póliza, recibo, prima, id fiscal, comisión) y en el portal del cliente.
- Cache-bust: `config.js` → `?v1297`.
- Archivos: `core/config.js`, `index.html`.


## v1.102 — 2026-07-03 · Reportes: análisis IA (lectura ejecutiva + acciones sugeridas) · CL-009
- **Nuevo botón 🤖 Analizar con IA** en cada reporte: arma un resumen en vivo (totales por columna numérica + concentración por la principal dimensión categórica) y pide a **`Orbit.ia.complete`** (IA centralizada) una **lectura ejecutiva** (qué pasa y por qué importa) + **3 acciones concretas priorizadas**, renderizadas en un panel. Con **timeout de resguardo (15s)** y **fallback determinista** (lectura + acciones calculadas de los datos) cuando la IA no está conectada — nunca se queda colgado.
- Respeta el contrato: única llamada al modelo vía `Orbit.ia.complete`; si `Orbit.ia.disponible()` es falso, usa el análisis automático y lo indica en el panel.
- Verificado por camino real: panel genera análisis real del reporte de Producción (1.2k chars, secciones Lectura/Acciones); 0 errores.
- Cache-bust: `reportes.js` → `?v1297`.
- Archivos: `modules/reportes.js`, `index.html`.


## v1.101 — 2026-07-03 · FUSIÓN con lane ChatGPT/Codex (Integraciones + Marketing) + rebase v1.98–v1.100
- **Base adoptada**: `ORBIT360-PLATFORM-FUSIONADO-CHATGPT-CODEX-POST-V197` (mi v1.97 + trabajo real de ChatGPT/Codex). **Conservado sin tocar**: `core/integraciones.js` (contratos `emit/configurar/status/list/resumen/diagnostico/openPanel/ensureLabMock/labMock/mark`), `core/integraciones-panel.js` y `core/integraciones-lab-mock.js` (se cargan on-demand desde `integraciones.js`), `modules/marketing.js` conectado a eventos (`marketing_sync_sheets/generar_pieza/programar_publicacion/contenido_creado`), `modules/automatizaciones.js` (banner "Automatizaciones & Integraciones"), `tools/orbit360-validate-marketing-integraciones.mjs`.
- **Rebasado encima (aditivo, sin borrar contratos)**: mis 3 archivos post-v1.97 — `modules/renovaciones.js` (v1.98 comparativo multi-aseguradora + solicitar propuestas), `modules/configuracion.js` (v1.99 Outlook + estados tenant-wide; ya puentea a `Orbit.integraciones.configurar/mark` que ahora EXISTE de verdad), `modules/academia.js` (v1.100 rutas por rol + certificado imprimible).
- **index.html**: base fusionada (con `core/integraciones.js?v1296`, `marketing.js?v1296`) + cache-bump de los 3 rebasados a `?v1297`.
- Verificación pendiente en esta entrega: `Orbit.integraciones` presente y funciones de marketing/mis-features operativas (ver resumen).
- Archivos tocados en la fusión: `modules/renovaciones.js`, `modules/configuracion.js`, `modules/academia.js`, `index.html`, `docs/BITACORA-CAMBIOS.md` (los demás provienen de la base fusionada).


## v1.100 — 2026-07-03 · Academia: rutas de aprendizaje por rol + certificado imprimible (CL-008)
- **Ruta por rol** (nuevo toggle 📚 Catálogo / 🧭 Ruta por rol): para el rol activo (o cualquiera vía selector) arma una **secuencia curada** de cursos ordenada por categoría (Inducción→Técnico→Producto→Comercial→…), con pasos numerados, barra de progreso por curso, **avance %/completados/certificados** de la ruta y botón **▶ Continuar ruta** (salta al primer curso pendiente). Reusa `destinatarios`/`progreso`/`certificado` — sin nuevo modelo de datos. El asesor ve su ruta (8 cursos) distinta de Dirección (10).
- **Certificado imprimible** (`verCertificado`): botón 🏅 en cursos completados (catálogo + ruta) → documento de certificado (empresa/tenant, nombre del usuario, curso, categoría, **folio** y fecha viva) con Imprimir/PDF. Antes `certificado` era solo un flag sin documento.
- Verificado por camino real: toggle de vista, selector de rol (10↔8 cursos), certificado renderiza "Certificado de finalización"; KPIs con valores; 0 errores.
- Cache-bust: `academia.js` → `?v1294`.
- Archivos: `modules/academia.js`, `index.html`.


## v1.99 — 2026-07-03 · Integraciones tenant-wide + Outlook (CL-001/CL-006)
- **Estados claros por integración** (`integEstado`): cada tarjeta muestra badge **No configurado / Pendiente de backend**. En demo/LAB **nunca** se presenta como conexión real (regla CL-001): guardar parámetros deja la integración en *Pendiente de backend*, no "conectada".
- **Modal Outlook dedicado** (Microsoft 365): cuenta del usuario, tipo de buzón (personal/compartido), **permisos** (leer bandeja + asociar correos a clientes/pólizas/gestiones · enviar en nombre del usuario · guardar adjuntos como documentos del cliente), **patrón de asunto** `{cliente} · {poliza} · {gestion}`, y Client ID/Tenant OAuth. El resto de integraciones mantiene el modal genérico (API key/endpoint/cuenta).
- **Puente al contrato del lane backend**: al guardar se llama `Orbit.integraciones.configurar(id, data)` y `Orbit.integraciones.mark(id, estado)` **si existen** (fuente de verdad tenant-wide); si no, respaldo en el **store del tenant** (`Orbit.store.setPref`, no localStorage crudo). **No** se crea un `core/integraciones.js` propio para no chocar con el del lane ChatGPT/Codex.
- Quitada la nota técnica "quedan en este navegador" y el "Conectado" simulado en la tabla de APIs.
- Verificado por camino real: modal Outlook guarda cuenta/permisos/patrón en store del tenant; lista muestra estados; 0 errores.
- Cache-bust: `configuracion.js` → `?v1294`.
- Archivos: `modules/configuracion.js`, `index.html`.
- ⚠️ **Entrega/merge**: mi ZIP **no** incluye `core/integraciones.js` / `-panel.js` / `-lab-mock.js` (viven en el lane ChatGPT/Codex). Al consolidar, **conservar** esos archivos — no subir mi ZIP como reemplazo total si borra los del backend.


## v1.98 — 2026-07-03 · Renovaciones: solicitar propuestas + comparativo MULTI-aseguradora
- **Nuevo `solicitarPropuestas(polizaId)`** (botón 📋 Propuestas en cada tarjeta de renovación): antes solo existía la campaña por lote (WhatsApp) y no había comparativo — solo "simulaba la misma". Ahora abre un comparativo real con **elección de alcance**: 🔁 Solo la misma / 🏛️ Comparar con otras / ☑️ Seleccionar aseguradoras.
- **Comparativo multi-aseguradora**: tabla con **prima estimada** por aseguradora (proyección determinista y estable — las tarifas oficiales se integran luego con el cotizador), **Δ vs prima actual** (color) y **comisión estimada** con el **% vigente por aseguradora/ramo** (`Orbit.comeng.pctAseguradora`). Ordenada por prima; se elige la ganadora con radio. Moneda del país, **sin mezclar** (candidatas filtradas por país del cliente).
- **Acciones**: 📧 Enviar comparativo al cliente (correo + actividad en su expediente) y ✅ Registrar propuesta → crea gestión en **Ops · Renovaciones / Modif.** enlazada a cliente/póliza con checklist, notifica al asesor, y registra actividad. Todo con fecha viva.
- Verificado por camino real: 6 aseguradoras comparadas, scope Seleccionar con candidatas, registrar → gestión creada en la lista correcta enlazada a la póliza (fecha de hoy); 0 errores.
- Cache-bust: `renovaciones.js` → `?v1294`.
- Archivos: `modules/renovaciones.js`, `index.html`.


## v1.97 — 2026-07-03 · Ciclo Ops↔Leads: fechas vivas (fin de fechas congeladas) + auditoría
- **Defecto real corregido**: `core/ciclo.js` tenía `'2026-06-20'` (y `'2026-06-27'`, `'2026-06-22'`) **hardcodeado** en todos los flujos que CREAN datos — negocios, gestiones, actividades, bitácoras y clientes nacían con fecha congelada, violando la regla de "fechas vivas". Sustituido por helpers locales `today()` / `stamp()` / `inDays(n)` derivados de `Orbit.ui.today()/now()` (ancla real). 5 timestamps, 3 vencimientos (+7d), 1 próximo toque (+2d) y 12 fechas migrados.
- **Auditoría del ciclo (sin cambios necesarios, confirmado sólido)**: registro único `negocio` proyectado a ambos tableros; `setEtapa` con automatizaciones (nº cotización, cadencia al pasar a Propuesta); `decidirCierre` → reaparece en Ops (Inspección/Emisión); `emitir` crea cliente heredando datos + cadencia de encuestas; `solicitarGestion` desde ficha/portal → Ops asociada a cliente/póliza (tipo seleccionable + crear nuevo + adjuntos + nota); listas editables/reordenables por tablero; sync en vivo (`orbit:ciclo`). **Rol Asesor NO ve Ops** (excluido en `ROLES.Asesor.modulos`; ve su trabajo por Leads) — verificado.
- Verificado por camino real: gestión y cliente creados hoy (2026-07-03), bitácora con hora real; 0 errores.
- Cache-bust: `ciclo.js` → `?v1294`.
- Archivos: `core/ciclo.js`, `index.html`.


## v1.96 — 2026-07-03 · Finanzas CxC unificado (incluye facturas de comisión emitidas)
- **Inconsistencia corregida**: desde v1.89 las facturas de comisión viven en la colección `facturas` (fuera de `finmovs`), así que **no contaban** en el KPI/tab "Por cobrar (CxC)" — solo aparecían en su tabla aparte de Liq. empresa. Ahora el tab **CxC/CxP** suma las facturas `por_cobrar` al **KPI "Por cobrar"** (monto + nº de partidas), las lista en la tarjeta **Cuentas por cobrar** (fila 🧾 con nº y nº de comisiones) y las incluye en el **drill** de CxC.
- **Interacción coherente**: clic en fila de factura → **ver documento** (`verFactura`); clic en fila de movimiento → editar / cambiar estado (como antes). Moneda respetada por país (`norm`).
- Verificado por camino real: emitir factura → aparece en CxC con su número, la fila abre el visor; 0 errores.
- Cache-bust: `finanzas.js` → `?v1294`.
- Archivos: `modules/finanzas.js`, `index.html`.


## v1.95 — 2026-07-03 · Facturas CxC: ver / reimprimir factura emitida
- **Nuevo `verFactura(facId)`**: reabre una factura ya emitida como **documento de solo lectura** reconstruido desde el store (emisor, facturar-a, base/IVA/total, estado, y — si cobrada — banco/ref/fecha del cobro), con **Imprimir / PDF**. Antes solo se podía imprimir en el momento de emitir; ahora se reimprime/reenvía cuando haga falta.
- Botón **🖨 Ver** añadido en cada fila de la tabla de facturas de comisión (CxC), junto a Registrar cobro / Anular.
- Verificado por camino real: emitir → 🖨 Ver abre el documento con número/total/impresión; 0 errores.
- Cache-bust: `finanzas.js` → `?v1293`.
- Archivos: `modules/finanzas.js`, `index.html`.


## v1.94 — 2026-07-03 · Cierre P0 paquete V188 (CHANGELOG alineado + limpieza)
- **P0.1 — `CHANGELOG.md` realineado**: estaba en [1.55.0] mientras la bitácora iba en v1.93. Añadida **entrada consolidada [1.93.0]** que cubre v1.56→v1.93 agrupada por área (Contabilidad/Finanzas, Arquitectura, Módulos), remitiendo a la bitácora para el detalle.
- **P0.7 — sin duplicados**: verificado (sin `.bak/.old/.tmp`, sin `index-copy/dev`, sin `orbit360-platform` anidado). Eliminado artefacto suelto `.verify-academia.png`.
- **Estado P0 V188**: P0.1 ✅ · P0.2 ✅ (regla recaudo≠finmov) · P0.3 ✅ (factura CxC + trazabilidad v1.92) · P0.4 ✅ (sin localStorage en módulos) · P0.5 ✅ (seed + identidad ficticia v1.93) · P0.6 ✅ (sin notas técnicas en UI) · P0.7 ✅.
- Archivos: `CHANGELOG.md`, `docs/BITACORA-CAMBIOS.md`.


## v1.93 — 2026-07-03 · P0.5 identidad de sesión ficticia (sin nombres reales en el chrome)
- **"Paula Osorio" seguía hardcodeado** como usuario logueado en el chrome: `index.html` (topbar `<b>Paula Osorio</b>` + avatar "PO", estáticos — nada los sobrescribía) y `core/auth.js` (nombre por defecto del login, 2 ocurrencias). El seed ya se había saneado (v1.89 → "Valeria Morán"), pero la **identidad de sesión** no.
- **Reemplazado por director ficticio**: **"Andrea Beltrán"** · avatar "AB" · Dirección. Distinto del asesor demo (Valeria Morán) para no confundir roles. Migración suave: si la sesión persistida traía el nombre viejo, se actualiza al ficticio.
- Verificado en vivo: topbar "Andrea Beltrán"/"AB", 0 ocurrencias de "Paula" en el render, 0 errores. Sin notas técnicas (Firebase/Firestore/LAB) visibles en módulos.
- Cache-bust: `auth.js` → `?v1292`.
- Archivos: `index.html`, `core/auth.js`.


## v1.92 — 2026-07-03 · P0.3 factura de comisión: trazabilidad (enlace planilla + respaldo bancario)
- **Enlace factura ↔ comisiones (planilla/statement)**: al emitir, `facturaAseg()` guarda `comisionIds[]` — snapshot de las comisiones devengadas (no liquidadas) de esa aseguradora que la factura factura. La tabla de CxC muestra **"cubre N com."** bajo el número. Da trazabilidad: qué líneas de comisión respalda cada factura (sin entidad `statements` persistida, el set de comisiones ES la planilla).
- **Enlace factura ↔ banco (respaldo del cobro)**: `facturaAccion(id,'cobrar')` ahora abre un modal (`cobrarFacturaModal`) que captura **banco/cuenta**, **referencia/N.º de depósito** y **fecha de cobro**. Se guardan en la factura (`cobro:{banco,ref,fecha}`) y en el `finmov` `recaudado` (`banco`, `refBanco`); el `finmov` deriva su periodo de la **fecha de cobro** (base caja). La tabla de CxC muestra banco·ref bajo el badge "cobrada". La bitácora de la factura registra el ref.
- **Regla intacta**: emitir factura = CxC sin `finmov`; el `finmov` (dinero real) solo nace al cobrar; anular revierte el `finmov`. Verificado por camino real (emit→por_cobrar, comisionIds=2, cobro con banco/ref→`finmov` recaudado con `refBanco`, moneda sin mezclar), 0 errores.
- Cache-bust: `finanzas.js` → `?v1292`.
- Archivos: `modules/finanzas.js`, `index.html`.


## v1.91 — 2026-07-03 · P1-08 modelo de comisión de asesor unificado (Finanzas ↔ comeng)
- **`comisionAsesor()` en Finanzas** usaba una fórmula simple (`a.comPct × baseRecaudada / 100`) que **contradecía el motor** `Orbit.comeng`. Ahora calcula con **`comeng.comVendedorDe(comisiónAseg, baseNeta, asesorId)`** por cada cuota, respetando el **modo del asesor**: `comision` (% sobre la comisión de la aseguradora), `neta` (% sobre prima neta recaudada) o `fijo` (monto), más su `shareCom`. Un solo modelo entre Equipo/Configuración, el core y Finanzas.
- Verificado en vivo (v1.291): ase003 (modo `neta` 10%) → a pagar = 10% de la base neta recaudada (coincide con `comeng`), la pestaña Liq. asesores renderiza (5.6k chars), 0 errores. La tabla ahora expone `modo` además del %.
- Archivos: `modules/finanzas.js`, `index.html`.

## v1.90 — 2026-07-03 · P1-01 IA centralizada en Orbit.ia.complete
- **Punto único de llamada al modelo**: nuevo `Orbit.ia.complete(prompt, modulo)` + `Orbit.ia.disponible()` en `core/ia.js`. Es el ÚNICO sitio que invoca `window.claude.complete`; enruta al proveedor configurado (por módulo o global vía `proveedorDe`) y devuelve `null` si no hay motor → cada módulo aplica su fallback local.
- **Módulos migrados** (ya no llaman `window.claude.complete` directo): `core/importa.js` (aiExtract), `modules/marketing.js` (generar mes + copy con IA), `modules/academia.js` (iaText/iaQuiz/iaQuizFromDoc + crear curso con IA), `modules/configuracion.js` (auto-branding por manual). Total ~10 llamadas + guards centralizados.
- Verificado en vivo (v1.290): `Orbit.ia.complete('test')` devuelve respuesta del modelo sin recursión, `disponible()=true`, y marketing/academia/configuracion/importar montan sin errores. (Se corrigió una recursión que el reemplazo masivo introdujo momentáneamente en el propio wrapper.)
- Para migración: el backend solo cambia el interior de `Orbit.ia.complete` para enrutar a Gemini/OpenAI/Claude según `cfg`; los módulos no se tocan.
- Archivos: `core/ia.js`, `core/importa.js`, `modules/marketing.js`, `modules/academia.js`, `modules/configuracion.js`, `index.html`.

## v1.89 — 2026-07-03 · P0/P1 de la auditoría ChatGPT v1287 (contabilidad, seed, localStorage)
- **P0-01 + P1-02 — Factura a aseguradora = CxC, NO caja hasta cobro**: `facturaAseg()` ya no crea `finmov` al emitir. Emite a la colección `facturas` con estado `por_cobrar`, número **secuencial por año** (`FAC-AAAA-####`, no aleatorio), e **idempotente por aseguradora+periodo** (no duplica). El `finmov` real (ingreso `recaudado`) se crea **solo al pulsar "💵 Registrar cobro"** en la nueva lista de facturas (Liq. empresa), con acciones cobrar/anular y bitácora. Verificado en vivo: emitir no crea finmov, idempotente, cobrar sí crea finmov.
- **P0-02 — Sin `localStorage` ejecutable en módulos**: los botones inline de subir/quitar logo en `configuracion.js` usaban `localStorage.setItem/removeItem`; ahora usan `Orbit.store.setPref('logo', …)` + `Orbit.tenant`. Grep confirma 0 `localStorage.setItem/removeItem` en el módulo.
- **P0-04 — Seed sin nombres reales**: `Paula Osorio` (asesor demo `ase001` + autor de novedad) → **`Valeria Morán`** (ficticio comercial). 2 reemplazos. NIT/DPI/cédula se mantienen como tipos documentales ficticios. `seed.__v` → 36.
- **P1-04 — `agregarPais` con dedupe**: si el código de país ya existe, **actualiza** (país + `tenant.paisesCfg`); si no, inserta. Antes hacía `push` ciego (duplicaba). Toast diferenciado agregar/actualizar.
- Verificado en vivo (v1.289): ase001='Valeria Morán', sin Paula, sin localStorage ejecutable, dedupe OK. 0 errores.
- **NO tocado** (respetando separación de la auditoría): backend LAB, `Orbit.store` API, Auth/Firestore/reglas. Sin datos reales nuevos. Sin `localStorage` ejecutable nuevo.
- Archivos: `modules/finanzas.js`, `modules/configuracion.js`, `data/seed.js`, `index.html`.

## v1.88 — 2026-07-03 · Academia: profundización de cursos delgados (Marketing + Portal)
- **Auditoría de profundidad por datos** (secciones/quizzes por curso): los cursos sólidos ya eran cur2 (17 secc.), cur3 (12), cur_master (12), cur6 (9). cur1 Inducción usa `texto` largo (4591 chars/lección) — profundo aunque con 0 `secciones`. Los delgados eran **cur8 Marketing** (2 lecc./3 secc.) y **cur9 Portal** (2 lecc./3 secc.).
- **cur8 Marketing profundizado**: 2→**4 lecciones**, 3→**9 secciones**, quiz 2→**4 preguntas**. Nuevas lecciones: "Estrategia por embudo y segmento" (TOFU/MOFU/BOFU, segmentación por perfil, estacionalidad) y "Medición: qué mirar y cómo mejorar" (métricas que importan, del contenido al pipeline, iterar con datos).
- **cur9 Portal profundizado**: 2→**4 lecciones**, 3→**9 secciones**, quiz 1→**3 preguntas**. Nuevas lecciones: "Reportar pagos y reclamos paso a paso" (reportar pago con comprobante, abrir reclamo, notificaciones) y "Tu expediente y tu asesor" (completar expediente, hablar con el asesor, protección de datos).
- `seed.__v` → 35 (re-siembra los cursos actualizados). Verificado en vivo: cur8 4/9/4, cur9 4/9/3, 0 errores. El visor (`verCurso`→`lessonBody`) los renderiza con secciones de barra de color + quiz interactivo.
- **Videos HeyGen**: son producción de contenido externo — la usuaria genera el video en HeyGen y pega el enlace embed en la lección (editar lección → tipo video → URL); el visor ya lo embebe a pantalla grande. No es tarea de código.
- Archivos: `data/seed.js`, `index.html`.

## v1.87 — 2026-07-03 · Config fiscal multi-tenant: fuente única paisesCfg
- **Config fiscal por país como FUENTE ÚNICA multi-tenant** (`tenant.paisesCfg`): IVA, moneda y gastos de emisión por país, con defaults GT (IVA 12% · gastos 5%) y CO (IVA 19%). La leen la **factura a aseguradoras** (Finanzas), el motor de primas y la creación de pólizas — antes había dos fuentes (`pref('paises')` vs el hardcode de facturaAseg). `agregarPais` en Configuración ahora escribe en `tenant.paisesCfg` (además de `pref('paises')` por compatibilidad). Verificado en vivo: GT 12%/5%, CO 19%, 0 errores.
- **Nota #266**: Configuración ya es profunda para multi-tenant a nivel prototipo (white-label, roles y permisos, módulos activos por cliente, planes editables/importables, países con tasas, catálogo de integraciones con credenciales por tenant, IA multi-proveedor). El resto de "SaaS multi-tenant profundo" (aislamiento de datos por tenant, DB/colecciones por cliente, provisioning automático) es **backend** — documentado para ChatGPT/Codex, no toca el prototipo.
- Archivos: `core/config.js`, `modules/configuracion.js`, `index.html`.

## v1.86 — 2026-07-03 · Facturas a aseguradoras + visor Academia confirmado
- **Facturas a aseguradoras** (Finanzas → Liq. empresa → 🧾 Factura): genera el documento de factura de comisiones por aseguradora usando sus **datos fiscales** (NIT, razón social, dirección fiscal, patrón de concepto con `{mes}`/`{aseguradora}`), calcula base (comisión devengada = prima neta recaudada), **IVA por país configurado** (GT 12% / CO 19% / tenant), y total. Imprime/PDF. "Registrar emitida" crea el ingreso `finmovs` estado `facturado` (CxC real — coherente con la regla recaudo≠finmov: la comisión facturada SÍ es ingreso real de la empresa). Es **control de facturación, NO reemplazo fiscal** (alimenta el sistema fiscal / factura electrónica). Avisa si la aseguradora no tiene datos de facturación. Verificado en vivo: documento + total + emisión→CxC, 0 errores.
- **Visor de Academia CONFIRMADO por flujo de UI real**: abrir curso → `verCurso` (visor a pantalla completa `ac-viewer`) renderiza secciones ricas (`.acv-sec`) + 5 lecciones navegables en el panel lateral, 0 errores. Hallazgo: el visor en vivo (`verCurso`) **ya usaba `lessonBody`** (renderer correcto con secciones + video normalizado); el cambio v1.85 a `verLeccion` unificó **código muerto** (`verLeccion`/`abrirViejo` no se invocan) — inofensivo. El video de YouTube se normaliza correctamente en `lessonBody` (usado por el visor real).
- Archivos: `modules/finanzas.js`, `index.html`.

## v1.85 — 2026-07-03 · Academia: visor unificado (fix video YouTube + secciones ricas)
- **BUG raíz del visor de lecciones** (`verLeccion`): duplicaba la lógica de render con dos fallos — (1) los videos de YouTube en formato `watch?v=`/`youtu.be` NO se normalizaban a `/embed/` (causa del "error 153 / no reproduce"); (2) la rama `lectura` mostraba `l.texto` plano e **ignoraba `l.secciones`**, por lo que los cursos del seed (que usan `secciones`) se veían vacíos ("Contenido pendiente").
- **Fix**: `verLeccion` ahora delega el cuerpo a **`lessonBody(l)`** — el renderizador completo y ya probado que maneja iframeSrc, video (normaliza YouTube/Vimeo + `<video>` para archivos subidos), lectura con secciones de barra de color, y quiz interactivo. Un solo path, sin duplicación. Verificado: 0 errores JS de carga.
- Nota: la profundización de los 14 cursos (contenido lección por lección + videos HeyGen reales) sigue como frente para sesión dedicada; este cambio corrige que el contenido YA existente se vea correctamente en el visor.
- Archivos: `modules/academia.js`, `index.html`.

## v1.84 — 2026-07-03 · Motor de conciliación de planillas/statements de comisión
- **`Orbit.comeng.conciliarStatement(filas?)`**: compara la comisión **esperada** (recomputada con las tarifas vigentes por ramo/producto de cada aseguradora, vía `calcSobre`) contra la **registrada/pagada**. Dos modos: (A) con statement importado `[{aseguradoraId, polizaId|polizaNumero, montoPagado}]` → concilia contra lo realmente pagado; (B) sin archivo → recomputa cada registro `comisiones` y detecta **drift** de tarifa o error de dato. Devuelve filas con desviación (monto y %) + totales.
- **Comisiones → pestaña 🔄 Conciliación**: KPIs (esperada / registrada-pagada / desviación con dirección "pagan de menos/más" / nº con desviación) + tabla de pólizas con desviación (base, esperado, registrado, desviación, %) clicable a la póliza. Botón "📄 Importar planilla" abre el importador de planillas-comisión.
- Verificado en vivo (v1.283): 90 registros conciliados (esperado=registrado en seed limpio, 0 desviaciones = coherente), y **prueba de detección**: al duplicar una comisión, "con desviación" pasó 0→1; al restaurar, vuelve a cuadrar. 0 errores.
- Archivos: `core/comisiones-eng.js`, `modules/comisiones.js`, `index.html`.

## v1.83 — 2026-07-03 · Regla de negocio recaudo≠finmov (paquete v1.81 ChatGPT) + prevención de regresión
- **CORRECCIÓN de regla contable** (del paquete v1.81): el pago aplicado por el cliente a un recibo/póliza **NO es movimiento financiero real** de la empresa — es **recaudo comercial**. Afecta cartera, recibos, metas de recaudo y producción recaudada (todo derivado de `cobros`), **NO** la colección `finmovs`. A `finmovs` solo van ingresos/egresos reales (comisión recibida, factura cobrada, liquidación pagada por aseguradora, pago a asesor, gasto).
- **Revertido `Orbit.q.postRecaudo`** (introducido en v1.78): ya **no escribe en finmovs** (era una regresión respecto a esta regla). Se conserva la firma para no romper llamadas (Cobros, Cliente360, Importador). Regla aplicada al **prototipo base multi-tenant**, no solo A&S. Verificado en vivo: aplicar pago no incrementa finmovs, 0 errores.
- Integrado el paquete v1.81 al plan (pendientes abiertos): motor de planillas/commission statements, facturas a aseguradoras (control factura electrónica), config SaaS multi-tenant profunda + portal mejorado, Academia profunda. Se trabajarán con verificación por código real y sin regresión.
- Archivos: `core/queries.js`, `index.html`.

## v1.82 — 2026-07-03 · Insights: análisis crítico con concentración por aseguradora
- **Insights → Análisis crítico**: añadido hallazgo de **concentración por aseguradora** (alerta + recomendación de diversificar si una aseguradora ≥35% de la prima vigente), a la par del dashboard de Finanzas. Ya tenía var. interanual, tasa de recaudo, tasa de cancelación, vencimientos ≤30d, asesor líder y composición de cartera. El hallazgo de concentración es condicional (solo si supera umbral). Verificado en vivo: alertas + recomendaciones renderizan, 0 errores.
- Archivos: `modules/insights.js`, `index.html`.

## v1.81 — 2026-07-02 · Presupuesto con fecha de pago (en tiempo / atrasado)
- **Presupuesto**: al crear/editar una partida ahora se captura **Fecha de pago** (`fechaPago`). La tabla muestra el estado: ✅ pagado (real ≥ presupuesto), ⏰ atrasado (fecha vencida sin pagar) o 🕓 en tiempo, con la fecha. Base para las notificaciones de pago de gastos.
- Verificado en vivo (v1.280): columna Pago en la tabla + campo Fecha de pago en el editor. 0 errores.
- Archivos: `modules/finanzas.js`, `index.html`.

## v1.80 — 2026-07-02 · Finanzas PROFUNDO: dashboard analítico + metas real vs ideal + sugeridor inteligente
- **Requerimiento documentado** en `docs/REQ-FINANZAS-PROFUNDO.md` (pedido repetido de la usuaria, para no perder el nivel de detalle).
- **Metas ahora es pestaña visible** (`🎯 Metas`): antes la función `metas()` existía pero NO estaba en el tab bar ni en el dispatch — por eso no se veía. Añadida a TABS + dispatch.
- **Metas profundas (real vs ideal)**: cumplimiento con **% + semáforos** 🟢≥100 / 🟡≥70 / 🔴<70 en tres niveles — **empresa** (ventas prima neta + recaudo), **por asesor** (meta/real/recaudo/avance/tendencia vs mes anterior) y **por aseguradora** (meta/real/% del total). Medición mensual real con datos vivos (`primaNetaMes`, `recaudoMes`).
- **Motor de sugerencia inteligente** (`metasSugerir`): calcula meta de ventas = promedio 3 meses × crecimiento (+10%) y meta de recaudo = índice histórico recaudo/venta; coherencia con presupuesto de ingresos (aviso si supera 1.5×); sugiere Y establece por empresa y por asesor (editable). Recalcula mes a mes.
- **Metas establecidas alimentan Inicio e Insights**: verificado que ambos leen la misma colección `metas` (empresa por tipo prima/recaudo).
- **Dashboard analítico de lo general a lo particular**: KPIs + **análisis crítico** (hallazgos reales: líder de producción, menor índice de recaudo, concentración por aseguradora, var. interanual, brecha de cobranza) + gráfico intermensual **con tabla numérica de respaldo** (ingresos/egresos/resultado/Δ MoM) + comparativo **interanual** + **tabla de producción por vendedor** (prima, % del total, recaudo, índice, comisión) + **tabla por aseguradora** (prima, % del total, pólizas).
- **Fix**: Finanzas abre en el **último mes con datos** (no en un mes vacío).
- Verificado en vivo (v1.279): metas con semáforos + tablas asesor/aseguradora, sugeridor calcula y establece, dashboard con análisis crítico + tablas de respaldo/vendedor/aseguradora. 0 errores.
- Archivos: `modules/finanzas.js`, `docs/REQ-FINANZAS-PROFUNDO.md`, `index.html`.

## v1.79 — 2026-07-02 · Auditoría de salud de render (28/28) + limpieza de código muerto
- **Auditoría clic-por-clic / salud de render de los 28 módulos** (documentada en `docs/AUDITORIA-FORENSE.md`): `router.go(route)` real + espera del render async + captura de `window.onerror`. **Resultado: 0 errores JS en los 28**, todos con contenido real del store. Se descartó el clic-masivo a ciegas (contaminaba DOM/store con navegaciones en cascada). Flujos interactivos clave verificados aparte (ver AUDITORIA-SINCRONIAS.md).
- **Código muerto eliminado** en `finanzas.js`: además de `resumen()` (v1.78), se borraron las 1ª declaraciones duplicadas de `dashboard()` y `presupuesto()` + sus helpers `finRow`/`presupTabla` — contenían arrays HARDCODEADOS y nunca se invocaban (hoisting: ganan las versiones vivas que leen del store). −89 líneas. Verificado que dashboard/presupuesto vivos siguen renderizando (16 590 / 4 035 chars).
- Nota documentada: `finanzas` abre en el mes actual; con pocos movimientos en el seed la pestaña Movimientos se ve corta (dato vivo, no fallo).
- Archivos: `modules/finanzas.js`, `docs/AUDITORIA-FORENSE.md`, `index.html`.

## v1.78 — 2026-07-02 · Auditoría de sincronías cruzadas + fix pago→Finanzas
- **Auditoría real de sincronías** (nuevo doc `docs/AUDITORIA-SINCRONIAS.md` para ChatGPT): se enumeraron todos los `store.update(...)` de core+módulos y se barrió la **clase de bug de referencia viva** (releer un campo tras `update()`, que muta el objeto en sitio). Contenida: `ciclo.js#openGestion` (L465) y `cliente360.js#editarPoliza` (L1196) ya capturan el cambio ANTES del update; el único roto era `siniestros.js` (corregido en v1.77).
- **FIX sync pago→Finanzas**: aplicar el pago de un recibo NO posteaba recaudo a `finmovs`, así que "Ingresos/recaudo del mes" de Finanzas no reflejaba pagos aplicados. Nuevo helper **`Orbit.q.postRecaudo(cobro, fecha, metodo)`** (core/queries.js) que inserta un `finmovs` ingreso `recaudado` (clase "Recaudo de primas"), **idempotente** (id `fmv_cob_<cobroId>`). Cableado en `cobros.js` (pago rápido), `cliente360.js` (aplicar pago) e `importa.js` (conciliación de estado de cuenta). Verificado en vivo: finmov creado, periodo por fecha, e idempotente al re-aplicar (recaudados 199→200→200).
- **Datos hardcodeados eliminados**: `finanzas.js#resumen()` (array de movimientos literal) era **código muerto** (el dispatch usa `movimientos()`, que lee del store) → eliminada. Pendiente documentado: 2 duplicados muertos más (`dashboard`/`presupuesto` 1ª declaración) para limpieza por ChatGPT.
- Flujos cruzados verificados OK: cancelación→Leads/Ops/cliente, lead→cliente, renovación→póliza/recibos, comisiones→liquidación, correo/notify.
- Archivos: `core/queries.js`, `modules/cobros.js`, `modules/cliente360.js`, `core/importa.js`, `modules/finanzas.js`, `docs/AUDITORIA-SINCRONIAS.md`, `index.html`.

## v1.77 — 2026-07-02 · Revisión PROFUNDA Portal→Siniestro (bug real corregido)
- **Verificación por camino de código REAL** (no `insert` simulado): se ejecutó el flujo verdadero — clic en "Solicitar gestión" del Portal → drawer → tipo "Reclamo / Siniestro" → botón "Enviar solicitud". Confirmado en DOM: crea `reclamos` (+1), `gestiones` (+1, enlazada por `reclamoId`) y `actividades` (+1). Aparece renderizado en **módulo Siniestros**, **Cliente 360 → Siniestros** (número SIN-2026-#### visible), **Historial** y **Ops** (gestión enlazada).
- **BUG REAL detectado y corregido** en `modules/siniestros.js` (cambio de estado del siniestro): el store devuelve **referencias vivas**, y `S().update('reclamos', id, patch)` mutaba el objeto `r` en sitio. El handler usaba `if (nuevoEst !== r.estado)` **dos veces** — la 2ª, tras el update, ya veía `r.estado` cambiado y evaluaba falso, por lo que **NO se creaba la actividad de Historial ni se actualizaba la gestión de Ops**. Se captura `const cambioEstado` ANTES del update y se usa en ambos puntos.
- **Reflejo Siniestros→Ops/Historial (paso 8 del caso obligatorio)**: al cambiar el estado del siniestro ahora (a) inserta actividad en Historial con `reclamoId`, y (b) actualiza la(s) gestión(es) de Ops enlazadas (nota "[fecha] Siniestro SIN-#### → Estado" y, si Pagado/Rechazado, estado→Resuelta). **Cerrar la gestión NO borra el reclamo** (verificado).
- **Fechas quemadas eliminadas**: los timestamps de bitácora `'2026-06-24 '` en `siniestros.js` (2 sitios) → `Orbit.ui.today()`.
- Verificado en vivo con recarga real (v1.274): `{reclamoEstado:Pagado, actividadHistorial:true, gestionNotaActualizada:true, gestionResuelta:true, reclamoNoBorrado:true}`.
- Archivos: `modules/siniestros.js`, `index.html` (bump caché).

## v1.76 — 2026-07-02 · Portal→Siniestro canónico + badges ocultos + saneo refs ajenas
- **Portal → Siniestro CANÓNICO (P0.3)**: al reportar "Reclamo / Siniestro" desde el Portal del cliente, `modules/portal.js` ahora inserta un registro real en la colección `reclamos` (con `numero` SIN-AAAA-####, póliza/aseguradora heredadas, estado `Reportado`, bitácora inicial y `reclamoId`), además de crear la gestión en Ops y la actividad en Historial (ahora enlazada con `reclamoId`). **Verificado en vivo**: el reclamo aparece en el módulo **Siniestros** (lee de `reclamos`) y en la ficha **Cliente 360 → Siniestros** (filtra por `clienteId`). Prioridad Alta para siniestros. Fecha viva (`Orbit.ui.today()`), sin literal `2026-06-30`.
- **Cerrar gestión NO borra el siniestro (P0.3)**: verificado — `core/ciclo.js` no ejecuta `remove('reclamos', …)` al resolver/cerrar una gestión; el reclamo persiste como entidad independiente.
- **Badges técnicos ocultos por DEFAULT (P0.2)**: `Orbit.tenant.DEFAULT.hideTechnicalBadges = true` — el producto arranca comercializable (sin NÚCLEO/BETA/PRÓX/ROAD). Se añadió **merge de claves nuevas** del DEFAULT sobre el tenant persistido, para que instalaciones previas hereden la clave sin pisar lo que el cliente ya configuró. Toggle interno/demo sigue en Configuración → Marca. **Verificado**: activar oculta los 27 badges del sidebar.
- **Saneo de referencias ajenas (P0.6)**: `data/seed.js` — el enfoque de Marketing "CX / Mystery" y la pieza "Mystery Shopping…" se reemplazaron por "Servicio al cliente"; `modules/automatizaciones.js` — comentario "Inspirado en CXOrbia" → texto neutro. **Verificado**: 0 referencias CX/Mystery en los contenidos vivos de Marketing. `seed.__v` → 34 (re-siembra). Los docs internos (PLAN/MIGRACION) mantienen la nota de deslinde "NO es CXOrbia" a propósito.
- Archivos: `modules/portal.js`, `core/config.js`, `data/seed.js`, `modules/automatizaciones.js`, `index.html` (bump caché).

## v1.75 — 2026-07-02 · Calendario VIVO: el demo sigue la fecha real
- **CAUSA RAÍZ del "sigue en junio / no calcula días"**: tanto `core/ui.js` (NOW) como `data/seed.js` (NOW) estaban clavados en `2026-06-20`. Toda la data semilla se genera relativa a esa ancla, por eso el tablero mostraba "JUNIO 2026 · 10 días" aunque el sistema estuviera en julio.
- **Fix**: ambas anclas ahora usan `new Date()` (fecha real del sistema); `__v` de la semilla subido a 33 para re-sembrar coherente con hoy. El backend puede fijar una fecha con `Orbit.tenant.demoDate='YYYY-MM-DD'`.
- **Verificado en vivo (2026-07-02)**: encabezado "Julio 2026", "Quedan 29 días", cobros vencidos/renovaciones/prima recalculados desde la fecha real (19 vencidos, 5 renov ≤45d, prima Q1.029.346). 0 errores.
- Nota: al re-sembrar (`__v=33`) la data ficticia de demostración se regenera a la fecha actual; los datos son ficticios por diseño.

## v1.74 — 2026-07-01 · Datos vivos: metas sin literales quemados (auditoría profunda)
- **Auditoría línea-por-línea de inicio.js**: confirmado que TODOS los KPIs derivan del store (`carteraGlobal`, `primaVigenteGlobal`, `renovacionesProximas`, `cobrosVencidos`, `leaderboard`, clientes/pólizas, seguimientos de `Orbit.ciclo`). Verificado en vivo: al insertar un cobro vencido el badge pasó 11→12; el tablero reacciona a cambios de datos. La sensación de "fijo" venía de la data semilla estática, no de valores quemados.
- **Único literal real corregido**: las metas caían a `820000`/`760000` cuando la colección `metas` estaba vacía. Ahora la **meta de empresa = suma de metas por asesor** (dato real del store) y **recaudo = 85%** de esa meta; en Finanzas idéntico; el input de "Crear meta" prefill con la suma real. Verificado: la meta reacciona a cambios de `asesor.metaPrima` (730.000 derivado en vivo, 0 errores).
- Barrido de literales en todos los módulos (`val: <número/porcentaje>`): sin KPIs con valores quemados. Datos vivos garantizados.

## v1.73 — 2026-07-01 · §4 Pólizas: KPIs filtrables (cartera vs histórico) — §4 COMPLETO
- **modules/polizas.js**: los 4 KPIs ahora **filtran la tabla por estado** (`filtrarEstado`): Vigentes/Prima→Vigente, Por renovar, Canceladas→histórico. Ya existía: alta manual (`nuevaPoliza`), creación desde documento importado (kind `polizas` del importador inteligente), buscador por póliza/cliente/placa/vehículo, filtros por ramo/aseguradora/asesor/estado, filas que abren el detalle. Verificado (4 KPIs clicables, filtro por estado, 0 errores).
- **§4 del paquete V99 COMPLETO**: Cliente360, Pólizas, Cobros, Renovaciones, Cancelaciones, Siniestros, Marketing, Portal, Importadores, Insights — todos profundizados y verificados en vivo.

## v1.72 — 2026-07-01 · §4 Insights: filtro por asesor
- **modules/insights.js**: nuevo **filtro global por asesor** (`asesorSel`/`aseOK`) que afecta pólizas, vigentes, cobros y comisiones en todas las vistas; selector "👥 Todos los asesores" en la barra de controles junto al de país. Ya existía: selector de país y mes con re-render en vivo (store.on), comparativo general→particular (asesor/ramo/aseguradora) con drill por mes y fila, tabla de respaldo, análisis crítico con recomendaciones. Verificado (filtros país+asesor+mes en vivo, 0 errores).

## v1.71 — 2026-07-01 · §4 Renovaciones: campaña segmentada
- **modules/renovaciones.js**: la Campaña de renovación por lote suma **filtros por asesor y por ramo** (segmentación); al filtrar, re-selecciona el lote y recalcula el conteo. Ya existía: pipeline por tramos (vencidas/≤15d/≤30d/≤60d), envío WhatsApp+correo con propuesta IA, traza en el historial de cada cliente, tarjetas que abren la póliza. Verificado (filtros presentes y funcionales, 0 errores).

## v1.70 — 2026-07-01 · §4 Siniestros: analítica de tiempos
- **modules/siniestros.js**: dos KPIs nuevos de tiempo — **⏱ Días abiertos (prom.)** de reclamos en proceso (rojo si >30) y **✅ Días a pago (prom.)** de reclamos pagados (derivado de la bitácora de estados). Los estados ya se gestionan por reclamo con bitácora fechada. Verificado (KPIs de tiempo presentes, 0 errores).

## v1.69 — 2026-07-01 · §4 Marketing: estados + responsable/aprobador
- **modules/marketing.js**: la ficha de contenido suma **Responsable** (asesor asignado) y **Aprobación** (Pendiente/Aprobado/Rechazado), y el estado incorpora **Medido** (idea→programado→publicado→medido). Confirmado el flujo existente: generar mes con IA estratégica, reprogramar atrasados automáticamente, stats por pieza publicada. Verificado (ficha con responsable/aprobador, 4 estados, 0 errores).

## v1.68 — 2026-07-01 · §4 Cancelaciones: analítica por causal clicable
- **modules/cancelaciones.js**: las barras de "Motivos de cancelación" ahora son **clicables** (`filtrarMotivo`) → filtran la tabla por esa causal. Confirmado el flujo ya existente: recuperación comercial → **Negocio en Leads** con etapa mapeada + responsable (asesorId) + próximo toque en Cronograma; "Recuperada" → **gestión de reemisión en Ops**; toda acción deja actividad en el expediente del cliente/excliente. Verificado (5 causales clicables, 0 errores).

## v1.67 — 2026-07-01 · §4 Portal productivo: notificaciones con detalle
- **modules/portal.js**: las notificaciones de la campana ahora son **clicables** → abren un detalle completo (`verNotifDetalle`) con icono, título, fecha, tipo y cuerpo completo. Confirmado que **Aprende abre cursos** (`verCursoPortal`, 2 tarjetas clicables) y el glosario del cliente funciona. Verificado en vivo (0 errores).

## v1.66 — 2026-07-01 · §4 Importadores: resumen pre-escritura + dedupe visible
- **core/importa.js**: nueva `dryRun(kind)` que simula la escritura SIN tocar el store y calcula **crear nuevos / actualizar / omitir** + **errores por fila** (faltan campos clave, duplicado dentro del archivo). Se muestra en el paso 2 del importador como tarjeta "🔎 Resumen antes de guardar" con los 3 contadores y la lista de avisos por fila. Aclara que la dedup actualiza en vez de duplicar. Verificado (importador carga y abre, 0 errores).

## v1.65 — 2026-07-01 · Notificación al cliente desde la plataforma (pedido usuaria)
- **Nuevo `core/notify.js`** (`Orbit.notify.cliente` / `Orbit.notify.pedir`): capa transversal para avisar al cliente por WhatsApp (wa.me) o correo (compositor Orbit), con selector de canal + preview editable y **traza automática en el expediente** (actividades). `_deliver` es swappable por el backend para envío real.
- **Cableado en flujos clave**:
  - **Pago aplicado** (cliente360): checkbox "📲 Avisar al cliente" al aplicar pago → mensaje de confirmación con póliza/cuota/monto.
  - **Respuesta de gestión** (ciclo): al marcar una gestión Resuelta que involucra a un cliente, ofrece avisarle la resolución.
  - **Comparativo**: botón "📲 Enviar al cliente" → resumen de opciones + recomendación.
  - **Cotizador**: botón "📲 Enviar al cliente" por cotización → prima total/neta + adjunto.
- Todos registran el envío como actividad en el historial del cliente (canal, asunto, fecha viva). Verificado en vivo (helper, 2 canales, registro en expediente, 0 errores).

## v1.64 — 2026-07-01 · P0-04 fechas vivas en flujos operativos + P0-06 config backend-ready
- **P0-06 (cerrado por composición)**: Configuración backend-ready — sin prompts (v1.60), sin localStorage directo (v1.61: `Orbit.tenant` para marca/paleta/país, `Orbit.store.pref` para integraciones/planes/logo/países), `agregarPais` es modal. El backend persiste vía `Orbit.tenant` + `Orbit.store.pref`. **Bloque 1 de saneamiento (P0-01…P0-06) completo.**
- **core/ui.js**: nuevo `Orbit.ui.today()` → fecha YYYY-MM-DD derivada del ancla (`NOW`), dinámica; en modo real usa fecha del sistema.
- **Fechas operativas quemadas eliminadas**: reemplazados los literales `'2026-06-24'/'2026-06-20'/'2026-06-22'` por `Orbit.ui.today()` en los flujos que CREAN datos — academia (progreso/certificado), cliente360 (emisión/edición/renovación de póliza + recibos + actividades), cobros (recordatorio lote), comparativo (guardar historial), portal (reportar pago/subir doc/solicitar/aviso), renovaciones (lote), siniestros (crear/actualizar reclamo). El seed demo conserva sus fechas (documentado).
- Criterio P0-04: no se crean nuevas actividades/pólizas/recibos con fecha fija; el mes mostrado deriva de la fecha viva. Verificado (today()=fecha dinámica, 7 módulos montan, 0 errores).

## v1.63 — 2026-07-01 · Verificación Portal → Ops (bandeja única con responsable)
- **Verificado en vivo**: desde el Portal del cliente, **Reportar pago** (con soporte) y **Solicitar gestión** crean una gestión en Ops (lista "Gestiones Admin") vía `Orbit.ciclo.crearGestion`, con **responsable asignado** (ej. Ana Lemus) y actividad en el expediente del cliente. Notificaciones WhatsApp+correo cableadas al responsable en cambios/notas. **Subir documento** guarda en el expediente del cliente. Bandeja única: todas las solicitudes (cliente + equipo) confluyen en Ops. 0 errores.

## v1.62 — 2026-07-01 · P0-05 moneda por país sin mezcla opaca
- **core/queries.js**: `norm(m,cur)` ahora es **país-aware** — cuando hay un país activo (`Orbit.pais` GT/CO) NO convierte (montos nativos en su moneda); solo en la vista global mixta (`TODOS`) normaliza con una **tasa declarada** (`TC_COP_GTQ=1000`). Los agregados globales (`carteraGlobal`, `primaVigenteGlobal`, `leaderboard`) ahora **filtran por país** cuando hay uno activo, y `carteraGlobal` devuelve `moneda`. Nuevo helper `monedaPais()`.
- Criterio P0-05 cumplido: al filtrar Colombia todo en COP, Guatemala en GTQ; global usa tasa declarada. Verificado en vivo (CO→COP nativo, GT→GTQ, mixto→/1000, 0 errores).

## v1.61 — 2026-07-01 · P0-02 sin localStorage directo en módulos
- **store.js**: nueva capa KV `Orbit.store.pref(key, def)` / `setPref(key, val)` (persistida en `db.__prefs`, backend-swappable, con guarda para `db` null). Los módulos ya no tocan `localStorage`.
- **Migrados a pref/setPref**: `ia.js` (config IA), `plantillas.js` (migración legacy), `notificaciones.js` (wa_log), `cotizador.js` (historial), `automatizaciones.js` (cfg + log), `configuracion.js` (integraciones, planes, logo, países). `grep localStorage modules/*.js` = solo un comentario.
- Criterio P0-02 cumplido: persistencia funcional pasa por la capa de datos única; el backend hereda `pref/setPref` sin tocar módulos. Verificado en vivo (roundtrip OK, 6 módulos montan, 0 errores).

## v1.60 — 2026-07-01 · Saneamiento Bloque 1 (P0-01, P0-03)
- **P0-01 · core/ui.js**: nuevos helpers `Orbit.ui.confirm / prompt / alert / toast` (modales/drawers Orbit, promesa-based, tono danger auto para acciones destructivas). Verificado (confirm resuelve true/false).
- **P0-01 · empaquetado**: `Orbit360-demo-standalone.html` movido a `docs/legacy/Orbit360-demo-standalone-NO-USAR.html` — fuera del árbol operativo para no contaminar backend/auditorías. La app abre desde `index.html` canónico.
- **P0-03 · diálogos nativos eliminados**: reemplazados TODOS los `alert()/confirm()/prompt()` visibles al usuario en módulos y `core/ciclo.js` por helpers Orbit. `grep` en `modules/` y `ciclo.js` devuelve **cero** nativos. Archivos: academia, configuracion, finanzas, cliente360, comparativo, correo, cronograma, aseguradoras, plantillas, automatizaciones, calidad, notificaciones, ciclo, index.html (logout). agregarPais pasó de 5 prompts a un modal único.
- Criterio de aceptación cumplido: acciones destructivas mantienen confirmación con modal Orbit; sin cuadros nativos del navegador. Verificado en vivo, 0 errores de consola, 10 módulos montan.

## v1.59 — 2026-07-01 · Finanzas: botones demo → funcionales (#221)
- **finanzas.js**: los 2 botones placeholder `alert('Demo:…')` ahora son reales — **"+ Crear meta"** abre `crearMeta()` (mes+tipo+ámbito empresa/asesor+valor → upsert a la colección `metas`, alimenta Insights y el avance de empresa) y **"Generar mes"** llama a `crearMes()`. La meta de empresa en la vista lee la colección `metas` del mes (fallback base). Verificado (meta persiste, 0 errores).
- Nota: los `confirm()` nativos restantes (borrar curso/lección/aseguradora/plantilla, cerrar sesión) se conservan — funcionan correctamente; su reemplazo por modal Orbit queda como pulido cosmético futuro.

## v1.58 — 2026-07-01 · Reportes detalle + Cotizador "Otro" inline
- **reportes.js (#216)**: filas de todos los reportes ahora **clicables** → abren el registro origen (cartera → drawer de recibo; producción/comisiones/renovaciones/siniestros/cancelaciones → ficha del cliente). Builder de IDs paralelo alineado con el filtro de año. Verificado (46 filas clicables, 0 errores).
- **cotizador.js (#218)**: opción "➕ Otro…" en marca/línea/modelo con entrada de texto inline (sin prompt nativo) → no queda atado al catálogo. Verificado en vivo.
- **comisiones (#217)**: confirmado selector año/estado + toggle de estado (Liquidada↔Devengada) + CSV ya operativos (v1.52); comparativo inter vía Insights.

## v1.57 — 2026-07-01 · Cobros: conciliar factura post-pago (#219)
- **cobros.js**: botón "📄 Cargar factura y conciliar" en el drawer del recibo cuando está Pagado pero sin conciliar (`conciliarFactura`). Sube factura, registra fecha real de pago, pasa a Conciliado y deja actividad en el historial del cliente. Verificado en vivo (0 errores).

## v1.50 — 2026-07-01 · Lote auditoría migración (parte 1)
- **router.js**: `badgeHtml` respeta el flag `Orbit.tenant.get().hideTechnicalBadges` → oculta NÚCLEO/BETA/PRÓX. del sidebar en modo cliente/implementación (verificado: 27→0→27).
- **configuracion.js**: toggle "Ocultar etiquetas técnicas" en la pestaña Marca (autoadministrable), reconstruye el sidebar al cambiar.
- **inicio.js**: "Avance por asesor" ahora clickeable → abre Orbit Insights (analítica de metas). mesKey ya era dinámico (`U.monthKey()`).
- **Verificados sin cambio (reporte de caché v1.55)**: Finanzas detalle de movimiento abre y permanece (drawer con selector de estado + eliminar, 0 parpadeo); Historial KPIs ya clickeables (filtrarTipo); Plantillas "Usar" es drawer (no alert nativo), editor con título + eliminar.

## v1.49 — 2026-07-01
- **store.js**: se expone `Orbit.store._emit(collection)` como método **público** (antes privado). Permite a la capa backend emitir eventos de cambio manualmente sin tocar internals. API pública confirmada: `all, get, where, find, insert, update, remove, on, _emit, init, reseed, raw`.
- **Docs nuevos**: MEJORAS-DETECTADAS.md, BITACORA-ERRORES.md, BITACORA-CAMBIOS.md, REPORTE-SMOKE.md (solicitados por el doc de pendientes del backend 2026-07-01).

## v1.48 — 2026-07-01
- **calidad.js**: edición inline (`editarInline`) — botón "✏ Completar" abre solo los campos faltantes del cliente; al guardar, el registro sale de la lista de incompletos (re-render). Toast de confirmación con conteo restante.

## v1.47 — 2026-07-01
- **cotizador.js**: 3er nivel de vehículo marca→línea→**modelo/versión** (`VEH_MODELOS` + trims genéricos de fallback). Paridad con Comparativo.

## v1.46 — 2026-07-01
- **insights.js**: vista Metas lee colección editable `metas`; botón "✨ Sugerir metas del próximo mes" (tendencia 3m +10%, upsert a `metas`).

## v1.45 — 2026-07-01
- **cobros.js**: quick-pay "💳 Pagar" desde tabla (`aplicarPago` reutilizable); nº póliza y cliente enlazados; drawer con Ver cliente / Ver póliza. **Fix**: la tabla no refrescaba tras aplicar pago (re-render apuntaba a `mod-host` inexistente → `host`).

## v1.44 — 2026-07-01
- **finanzas.js**: KPIs con desglose (`drillKey`/`drillModal`); CxC/CxP abren movimiento completo (ver/editar/eliminar/estado) y arrastran mes a mes; Presupuesto editable (`editarPresup`/`replicarPresup`) desde store, sin arrays quemados.

## v1.42–1.43 — 2026-07-01
- **auth.js**: `applyBrand()` también al mostrar login (logo del cliente antes de entrar).
- **infra.css**: franja del logo en login blanca a sangre + cintilla roja.
- **ui.js**: `now()`/`monthLabel()` dinámicos (se elimina "Junio 2026" quemado).
- **index.html**: login sin badge técnico ni "Tu logo aquí"; slot centrado.

> Historial anterior (v0.1–v1.41): ver CHANGELOG.md.
