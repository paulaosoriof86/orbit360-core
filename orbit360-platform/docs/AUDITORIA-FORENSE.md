# Auditoría forense clic-por-clic — Orbit 360

**Método (real, no declarativo):** se montó cada módulo en un host de prueba y se hizo
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
