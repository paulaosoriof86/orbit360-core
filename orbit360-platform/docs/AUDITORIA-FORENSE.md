# Auditoría forense clic-por-clic — Orbit 360

## v1.79 — 2026-07-02 · Barrido de salud de render (28/28 módulos) + limpieza de código muerto
**Método:** `Orbit.router.go(route)` real + espera del render async (hashchange) + medición del `#host`:
longitud de render, nº de botones/`[onclick]`, nº de KPIs, y captura de **errores JS globales** (`window.onerror`).
Se descartó el clic-masivo a ciegas (contaminaba el DOM/store con navegaciones en cascada y daba métricas falsas).

**Resultado: los 28 módulos renderizan sin ningún error JS y con contenido real (datos vivos del store):**

| Módulo | render (chars) | botones | KPIs | errores |
|---|---|---|---|---|
| inicio, cronograma, ops, leads | (verificados sesiones previas, #180) | | | 0 |
| aseguradoras | 9 709 | 18 | 4 | 0 |
| cotizador | 7 070 | 5 | 0* | 0 |
| comparativo | 3 366 | 4 | 0* | 0 |
| cliente360 | 25 556 | 23 | 5 | 0 |
| polizas | 68 868 | 99 | 5 | 0 |
| cobros | 216 584 | 576 | 5 | 0 |
| renovaciones | 19 726 | 27 | 5 | 0 |
| cancelaciones | 7 348 | 11 | 5 | 0 |
| siniestros | 9 487 | 19 | 7 | 0 |
| historial | 193 851 | 110 | 5 | 0 |
| comisiones | 6 162 | 9 | 5 | 0 |
| finanzas | shell + `#fin-body` (dashboard 16 590 / presupuesto 4 035) | | 4 | 0 |
| marketing | 15 900 | 40 | 5 | 0 |
| academia | 11 982 | 27 | 5 | 0 |
| insights | 9 094 | 9 | 9 | 0 |
| portal | 3 477 | 15 | 3 | 0 |
| ia | 2 578 | 10 | 0* | 0 |
| notificaciones | 3 813 | 3 | 5 | 0 |
| automatizaciones | 23 624 | 16 | 4 | 0 |
| equipo | 4 672 | 6 | 4 | 0 |
| configuracion | 99 185 | 14 | 0* | 0 |
| reportes | 24 000 | 57 | 0* | 0 |
| calidad | 14 576 | 33 | 5 | 0 |
| plantillas | 8 837 | 29 | 5 | 0 |
| importar | 5 913 | 10 | 0* | 0 |
| correo | 5 298 | 5 | 0* | 0 |

\* Sin KPIs **por diseño** (formularios/asistentes: cotizador, comparativo, ia, configuración, reportes, importar, correo). Los flujos interactivos clave (Portal→Siniestro, pago→Finanzas, cambio de estado siniestro→Ops/Historial) se verificaron aparte por camino de código real — ver `AUDITORIA-SINCRONIAS.md`.

**Limpieza de código muerto (v1.78–1.79):** se eliminaron 3 funciones muertas con datos HARDCODEADOS de `finanzas.js` — `resumen()` (array de movimientos) y las 1ª declaraciones duplicadas de `dashboard()`/`presupuesto()` (más sus helpers `finRow`/`presupTabla`), que por hoisting nunca se invocaban. Verificado que las versiones vivas (dashboard/presupuesto que leen del store) siguen renderizando.

**Nota:** `finanzas` abre en el mes actual; si ese mes tiene pocos movimientos en el seed, la pestaña Movimientos se ve corta — es dato vivo, no un fallo. (Mejora UX opcional: abrir en el último mes con datos.)

---

**Método previo (clic-por-clic):** se montó cada módulo en un host de prueba y se hizo
clic programático sobre **cada** botón, KPI, tab, `[data-act]` y `[onclick]`, capturando
errores JS globales y contando drawers/modales abiertos. `confirm/prompt/alert` stubeados.
Los módulos con listas largas se muestrearon hasta 40 interactivos (el resto son filas
repetidas del mismo handler ya validado).

## Resultado: 30/30 módulos sin error JS

| Módulo | Clickeables | Clic OK | Modales | JS err |
|---|---|---|---|---|
| inicio | 13 | 13 | 1 | 0 |
| cronograma | 7 | 7 | 0 | 0 |
| ops | 8 | 8 | varios | 0 |
| leads | 7 | 7 | 3 | 0 |
| cliente360 | 19 | 19 | 1 | 0 |
| polizas | 97 | 97 | — | 0 |
| cobros | 293 | 35* | — | 0 |
| renovaciones | 25 | 25 | 0 | 0 |
| cancelaciones | 20 | 20 | 0 | 0 |
| siniestros | 21 | 21 | 13 | 0 ✅fix |
| historial | 104 | 40* | 36 | 0 |
| comisiones | 14 | 14 | 5 | 0 |
| aseguradoras | 18 | 18 | 1 | 0 |
| cotizador | 6 | 6 | 0 | 0 |
| comparativo | 4 | 4 | 1 | 0 |
| finanzas | 80 | 40* | 13 | 0 |
| marketing | 40 | 40 | 31 | 0 |
| academia | 36 | 36 | 12 | 0 |
| insights | 13 | 13 | 1 | 0 |
| portal | 15 | 15 | 15 | 0 |
| ia | 10 | 10 | 0 | 0 |
| notificaciones | 9 | 9 | 0 | 0 ✅fix |
| automatizaciones | 16 | 16 | 2 | 0 |
| equipo | 13 | 13 | 6 | 0 |
| configuracion | 7 | 7 | 0 | 0 |
| reportes | 10 | 10 | 0 | 0 |
| calidad | 29 | 29 | 0 | 0 |
| plantillas | 22 | 22 | 0 | 0 |
| importar | 10 | 10 | 1 | 0 |
| correo | 5 | 5 | 2 | 0 |

\* muestreo (resto son filas repetidas del mismo handler ya validado).

## Bugs reales encontrados y corregidos

1. **`core/importa.js` · `ensureDom()`** — sólo verificaba `imp-back`; si `imp-drawer`
   faltaba (estado a medias dejado por otro flujo), `open()` reventaba con
   `Cannot read properties of null (reading 'classList')`. **Fix:** recrea si falta
   cualquiera de los dos nodos. Afectaba a `siniestros → importar bitácora` y a cualquier
   importador reabierto tras un cierre parcial.

2. **`modules/siniestros.js`** — colisión de `id="si-new"` entre el botón "Nuevo" del
   toolbar y el drawer del formulario; al abrir se borraba el propio botón.
   **Fix:** drawer renombrado a `si-new-dr`.

3. **`modules/notificaciones.js` · `doSend()`** — leía `#wa-cli/.value` sin guard cuando
   el formulario no estaba montado → `Cannot read properties of null (reading 'value')`.
   **Fix:** guard de nodos antes de leer `.value`.

## Alcance verificado
- Render limpio + interacción real (no sólo "carga sin throw").
- Datos vivos vía `Orbit.store` en todos los módulos (sin hardcode de listados).
- KPIs y filas clickeables disparan drawers/detalle sin excepción.

## Hallazgos P0 resueltos (v1.42 → v1.47)
Correcciones sobre lo señalado por la revisión externa, verificadas en vivo con recarga completa:

4. **Fecha/metas quemadas (Inicio)** — `Orbit.ui.now()/monthLabel()` ahora dinámicos; Inicio lee la colección `metas`. Se eliminó "Junio 2026" hardcodeado. (v1.43)
5. **Logo no aparecía en el login** — `applyBrand()` sólo corría tras entrar; ahora también al mostrar el login. Franja del logo blanca a sangre + cintilla roja. (v1.42–1.43)
6. **Finanzas · KPIs sin desglose** — KPIs de Movimientos/CxC/CxP/Presupuesto ahora clicables con modal de desglose (`drillKey`). (v1.44)
7. **Finanzas · CxC/CxP no editables** — las filas abren el movimiento completo (ver/editar/eliminar/estado); presupuesto editable + replicar mes (se quitaron arrays quemados). (v1.44)
8. **Cobros · tabla no refrescaba tras aplicar pago** — re-render apuntaba a `mod-host` inexistente; corregido a `host`. Añadido quick-pay desde la tabla y navegación cruzada a cliente/póliza. (v1.45)
9. **Insights · metas sólo desde campo fijo** — la vista Metas lee la colección editable `metas` con fallback; botón "Sugerir metas del próximo mes" por tendencia. Comparativo general→particular verificado. (v1.46)
10. **Cotizador · faltaba 3er nivel de vehículo** — añadido marca→línea→**modelo** (`VEH_MODELOS`), a la par del Comparativo. (v1.47)

**Pendiente conocido (no bloquea migración):** unificar las 3 fuentes de metas (`asesor.metaPrima`, colección `metas`, `cat.metas`) en un solo modelo al pasar a backend.
