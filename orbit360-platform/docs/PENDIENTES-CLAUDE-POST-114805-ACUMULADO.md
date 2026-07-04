# Pendientes Claude acumulados post candidata 2026-07-04T114805

Fecha: 2026-07-04
Estado: documento vivo hasta que Paula pida el próximo paquete Claude.

## Cerrados o mejorados por la candidata 114805

- Trazabilidad de filas: `copyRowMeta` ya existe y se invoca en los puntos principales del importador.
- Pólizas: no genera cartera si faltan estado/país/moneda/forma confiables.
- Prima: separa neta, gastos, IVA y total.
- Documentos: se movió a `parchesPendientes` con diff pendiente.
- Planillas de comisión: ya tienen campos de comisión esperada/pagada y conciliación.
- Financiero histórico: marca posibles recaudos/cobros como `requiere_validacion`.

## Mejoras backend realizadas por ChatGPT/Codex que Claude debe conservar

- Pipeline de empalme ahora corre auditorías de importador antes de plan/preview/diff.
- Se creó contrato canónico de fuentes de migración A&S.
- Se creó validador de manifest contra contrato canónico.
- Se alineó el validador principal de manifest con el contrato canónico.
- Se creó prevalidación unificada de fuente separada.

Archivos backend/documentación que Claude debe respetar:

```txt
tools/orbit360-generar-contrato-fuentes-ays.mjs
tools/orbit360-validar-manifest-contra-contrato-fuentes-ays.mjs
tools/orbit360-prevalidar-fuente-ays.mjs
tools/orbit360-validar-manifest-fuente-ays.mjs
orbit360-platform/docs/CONTRATO-CANONICO-FUENTES-MIGRACION-AYS-20260704.md
```

## P0 abiertos para corregir antes de cerrar empalme

### P0-01 — Moneda de hoja no debe inferirse por país

Archivo: `core/importa.js`

Cambiar:

```js
const monedaHoja = detectaMoneda(sn) || monedaDe(paisHoja)
```

Por lógica equivalente a:

```js
const monedaHoja = detectaMoneda(sn)
const monedaSugeridaHoja = monedaDe(paisHoja)
```

La moneda sugerida puede mostrarse, pero no debe escribirse como moneda autorizada si no viene explícita.

### P0-02 — Clientes no deben default a GTQ si falta país

Archivo: `core/importa.js`, `IMPORT_MAP.clientes.build`.

Debe eliminarse:

```js
rec.moneda = rec.pais === 'CO' ? 'COP' : 'GTQ'
```

Si no hay país confiable: `pais=''`, `moneda=''`, `requiereValidacion=true`. Si hay país confiable puede existir `monedaSugerida`, pero no escritura automática salvo que la fuente traiga moneda explícita o una regla de cliente lo autorice.

### P0-03 — `SCOPE.documentos` inconsistente

Archivo: `core/importa.js`.

Cambiar:

```js
'documentos': { crea: ['clientes'] ... }
```

Por:

```js
'documentos': { crea: ['parchesPendientes'], label: ['Propuestas de cambio documentales'], no: ['Clientes directos','Pólizas directas'] }
```

## P1 abiertos

### P1-04 — UI técnica visible

Revisar paneles internos y cliente para que no aparezcan `LAB`, `backend`, `demo`, `mock`, `smoke`, `Firebase`, `Firestore`, `localStorage`, credenciales ni estados técnicos salvo rol superadmin técnico o entorno local.

### P1-05 — Fechas fijas

Separar fechas de seed/demo de fechas operativas. En flujos reales usar `Orbit.ui.today()` o configuración tenant.

### P1-06 — Validador marketing/integraciones desactualizado

Actualizar `tools/orbit360-validate-marketing-integraciones.mjs` para no exigir literal `Simular`; debe validar atributo/flujo (`data-lab-cycle`) o copy comercial como `Probar`.

## P2 seguimiento

- Excluir `docs/legacy/*NO-USAR*` del paquete comercial final.
- Smoke visual real clic por clic pendiente en navegador no bloqueado.
- Documentar cualquier fix directo de ChatGPT/Codex para que Claude lo conserve.

## Estado para Paula

La candidata 114805 es mejor que la 072304 y puede usarse como baseline frontend más reciente para continuar, pero el cierre técnico exige corregir los P0 anteriores antes de marcarla como completamente empalmada.