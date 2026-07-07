# Bitácora de errores · Orbit 360 (prototipo)

> Auditoría clic-por-clic del prototipo (Claude). El backend LAB (ChatGPT/Codex) mantiene su propia bitácora.

## 2026-07-04 · Reauditoría 072304 — P0/P1 RESUELTOS (candidato v1.115)
- **P0-01** Trazabilidad no llegaba a `rec` → `copyRowMeta` en applyImport/dryRun/conciliarRows. RESUELTO (verificado: `_numeroFila` en finmov).
- **P0-02** Moneda autocompletada por país → solo moneda explícita se escribe; `monedaSugerida` aparte; sin moneda → `requiere_validacion`. RESUELTO.
- **P0-03** Planilla de comisión sin contrato → contrato real (esperada/pagada/país/moneda/periodo); tarifas solo con diff confirmado. RESUELTO.
- **P0-04** Documentos tocaban `clientes` → ahora `parchesPendientes` con diff + confirmación. RESUELTO.
- **P1-05** Fechas fijas operativas → cierre relativo a fecha viva; vigencia IA relativa. RESUELTO (seeds tenant demo permitidos).
- **P1-06** Textos técnicos visibles → suavizados (Pendiente de conexión / Estado de integraciones / Probar / sin cuenta conectada). RESUELTO.
- **P1-07** Histórico permitía recaudos como caja → conceptos de cobro/recaudo bloqueados a `requiere_validacion`. RESUELTO.


> Formato por entrada: fecha · módulo · síntoma · esperado · causa · archivo/función · fix · impacto · estado · aplica a prototipo base.

## 2026-07-03 · Auditoría v1.111 (base 1.0)

### Recorrido runtime (30 rutas del NAV)
- **Resultado**: 0 pantallas en blanco, 0 errores de consola, todos los módulos renderizan con contenido.
- Rutas verificadas: inicio, cronograma, ops, leads, aseguradoras, cotizador, comparativo, cliente360, polizas, cobros, renovaciones, cancelaciones, siniestros, historial, comisiones, importar, calidad, plantillas, reportes, ia, academia, insights, correo, automatizaciones, notificaciones, marketing, portal, finanzas, equipo, configuracion.

### Hallazgos corregidos
| # | Módulo | Síntoma | Esperado | Causa | Archivo/función | Fix | Estado | Aplica base |
|---|---|---|---|---|---|---|---|---|
| 1 | Importar (hub) | Nota técnica visible "Demo: motor simulado; en producción se conecta el extractor real" | Sin notas técnicas en UI (P9) | Texto de scaffolding | `modules/importar.js` render | Reemplazado por copy de usuario | RESUELTO | SÍ |
| 2 | Importador (pasos 2 y 3) | Notas "usa el extractor de backend en producción" / "En producción se conecta el extractor real (IA)" | Sin notas técnicas (P9) | Texto de scaffolding | `core/importa.js` step2/step3 | Reemplazado por copy de usuario | RESUELTO | SÍ |
| 3 | Configuración → APIs | Nota "(demo: solo la UI de gestión)" | Sin notas técnicas (P9) | Texto de scaffolding | `modules/configuracion.js` apis() | Eliminada | RESUELTO | SÍ |

### Verificaciones de higiene
- **`localStorage` directo en `modules/`**: 0 ocurrencias (todo vía `Orbit.store`). ✔
- **Datos ficticios**: seed sin datos reales; sin hardcode A&S en código. ✔
- **Monedas por país**: Finanzas normaliza/serie por país; no mezcla GTQ/COP. ✔

### Pendientes/observaciones abiertas (no bloqueantes)
- Notas técnicas legítimas permanecen en **documentación de handoff** (`docs/handoff-migracion-as.html`, `docs/manual-maestro.html`, `docs/MIGRACION-MAESTRO.md`) — es documentación, no UI de usuario. ABIERTO/N-A.
- Casing de `tipo` en finmovs importados (`Ingreso/Egreso`) vs. filtro de Finanzas (`ingreso/egreso`): los movimientos importados no suman en totales hasta normalizar el casing. **RESUELTO en v1.112** — `finmovShape()` emite la forma real del seed (tipo minúsculas, `valor`, `periodo`, `dia`, `clase`, `pais`/`moneda`, `estado`); verificado que suman en Finanzas. · aplica base: SÍ.
- Catálogo financiero y cierre por **país** (hoy por tenant): mejora opcional. ABIERTO.
