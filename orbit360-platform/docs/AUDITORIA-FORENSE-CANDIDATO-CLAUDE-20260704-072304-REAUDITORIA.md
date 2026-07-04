# Reauditoría forense candidato Claude — Orbit 360 A&S — 2026-07-04T072304

Fecha: 2026-07-04
Candidato: `Prototype Development Request - 2026-07-04T072304.566.zip`
Veredicto: `REQUIERE_REVISION_CLAUDE` / no empalmar todavía.

## Baseline vivo usado

- Candidata anterior auditada: `2026-07-03T202245.322`.
- Paquete ampliado Claude: `PAQUETE_CLAUDE_ORBIT360_AYS_AUDITORIA_AMPLIADA_20260704`.
- PR backend protegido: #5, rama `ays/backend-tenant-lab-v99-20260703`.

## Checks ejecutados

- Archivos totales: 96.
- Core JS: 20.
- Módulos JS: 30.
- Tools: 1.
- Nuevo archivo: `docs/AUDITORIA-CANDIDATO-CLAUDE-POST-FIX.md`.
- `node --check` sobre JS core/modules/store: OK.
- Smoke visual en sandbox: no ejecutable por bloqueo del entorno; Claude debe ejecutar smoke real.

## Mejoras verificadas

- Login sin credenciales demo precargadas.
- Versionado/documentación más alineados como v1.114.
- PWA con estados instalada/iOS/otros.
- `docs-aseguradora` en modo documental.
- Pólizas incorporan campos país/moneda/prima neta/prima total/gastos/IVA.
- Hojas soporte excluidas por nombre antes de mapear movimientos.

## P0 abiertos

### P0-01 — Trazabilidad multihoja no llega al registro final

El Excel agrega metadatos al array de fila (`_origenHoja`, `_paisHoja`, `_monedaHoja`, `_periodoHoja`, `_bloqueOrigen`, `_numeroFila`), pero `applyImport`, `dryRun` y `conciliarRows` construyen `rec` copiando solo columnas mapeadas por índice. Como los metadatos no están en `idx`, no llegan a `rec` ni a `finmovShape`.

Corrección requerida: helper `copyRowMeta(cells, rec)` usado en `applyImport`, `dryRun`, `conciliarRows` y reporte.

### P0-02 — País/moneda siguen autocompletándose

Persisten usos de `monedaDe(pais)` como moneda autorizada en `finmovShape`, pólizas y metadata de hoja. Si hay país pero no moneda explícita, debe quedar `REQUIERE_VALIDACION`. Puede existir `monedaSugerida`, pero no escritura autorizada.

### P0-03 — Planillas de comisión sin contrato real completo

`planillas-comision` declara alcance `comisiones`, pero no exige país/moneda/periodo ni diferencia comisión esperada vs pagada. También mezcla importación genérica con actualización de tarifas (`tarifasDetect`). Debe leer filas reales y generar registros de comisión/conciliación, no simular tarifas ni actualizar tarifarios sin diff confirmado.

## P1 abiertos

- Documentos: sin expediente bloquea, pero con expediente todavía puede actualizar `clientes` directo; debe ir a `documentos` o `parchesPendientes` y aplicar diff con confirmación.
- Fechas fijas: persisten `2026-04`, `2026-06-24`, `2026-01-01` y fechas operativas en módulos. Deben venir de `Orbit.ui.today()`, tenant config o seed demo aislado.
- UI técnica visible: `Pendiente de backend`, `backend del tenant`, `LAB`, `Simular`, `modo demo`, `Diagnóstico de integraciones por tenant`.
- Financiero histórico: aún permite conceptos de ingreso que podrían ser recaudos/cobros de cliente sin bloqueo semántico suficiente.

## Riesgo backend

El ZIP trae `data/store.js` demo y no trae backend LAB ni tools nuevos de ChatGPT/Codex. Cualquier empalme debe preservar backend protegido, `firestore.rules` y scripts `tools/orbit360-*`.

## Decisión

No empalmar todavía. Claude debe corregir los P0/P1 o ChatGPT/Codex deberá aplicar fixes mínimos documentados para Claude si Claude no alcanza por capacidad.