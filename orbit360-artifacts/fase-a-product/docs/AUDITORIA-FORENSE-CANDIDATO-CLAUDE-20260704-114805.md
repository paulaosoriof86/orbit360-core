# Auditoría forense candidato Claude — Orbit 360 A&S — 2026-07-04T114805

Fecha: 2026-07-04
Candidato auditado: `Prototype Development Request - 2026-07-04T114805.866.zip`
SHA256 ZIP: `087135924b1e6eafdc1f696c59a2375c67d2be04917a1e7a5ea6727ca83b894d`
Veredicto: **EMPALME ADITIVO CONTROLADO / requiere fixes menores antes de considerarse cerrado**.

## Baseline vivo

- Repo correcto: `paulaosoriof86/orbit360-core`.
- Rama backend activa: `ays/backend-tenant-lab-v99-20260703`.
- PR: #5 draft, sin merge, sin deploy, sin main.
- Documento maestro: `INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md`.
- Reauditoría previa: candidata `2026-07-04T072304`, paquete `PAQUETE_CLAUDE_ORBIT360_AYS_REAUDITORIA_072304_20260704`.

## Inventario

- Archivos totales: 96.
- `core/*.js`: 20.
- `modules/*.js`: 30.
- `docs/` nivel raíz: 27.
- `tools/`: 1.
- Incluye `data/store.js` demo; no incluye backend LAB protegido ni `firestore.rules`.

## Validaciones ejecutadas

- `node --check` sobre `core/`, `modules/` y `data/`: **OK**.
- `node tools/orbit360-validate-marketing-integraciones.mjs`: **FALLA 1** por expectativa desactualizada del validador: espera literal `Simular`, pero Claude cambió el texto visible a `Probar`. No se detectó `fetch`, `axios`, `XMLHttpRequest`, `apiKey`, `secret`, `token` ni localStorage operativo en marketing/integraciones.
- Smoke visual con navegador real: **no ejecutado en este entorno**. Requiere smoke local/Claude.

## Qué hizo bien Claude

1. **Trazabilidad multihoja:** agregó `copyRowMeta(cells, rec)` y lo llama en previsualización/dry-run/conciliación/importación. Esto corrige el P0 principal de la 072304: la traza ya puede llegar al `rec` final.
2. **Pólizas:** separa `primaNeta`, `primaTotal`, `gastos`, `iva`; no asume estado vigente si falta estado; genera recibos solo si la póliza es Vigente/Por renovar, con país/moneda/forma confiables y sin `requiereValidacion`.
3. **Documentos:** `IMPORT_MAP.documentos` ahora apunta a `parchesPendientes` y genera diff pendiente, en vez de actualizar cliente directo.
4. **Planillas de comisión:** agregó contrato de filas reales con aseguradora, póliza, asesor, prima neta, porcentaje, comisión esperada y comisión pagada; crea registros en `comisiones` con conciliación.
5. **Financiero histórico:** marca como `requiere_validacion` conceptos que parecen cobro/recaudo de cliente para evitar que entren como caja ordinaria.
6. **PWA / UI:** mantiene ajustes de estados PWA y reducción parcial de textos técnicos visibles.
7. **Versionado:** subió `CHANGELOG` a `1.115.0` y documentó la intención del fix.

## Pendientes detectados

### P0-114805-01 — Moneda de hoja aún puede inferirse por país

En `core/importa.js`, la lectura Excel usa:

```js
const paisHoja = detectaPais(sn), monedaHoja = detectaMoneda(sn) || monedaDe(paisHoja), periodoHoja = detectaPeriodo(sn);
```

Esto vuelve a convertir país en moneda autorizada. Según la regla A&S/Orbit, si la moneda no viene explícita en hoja/archivo/fila, puede sugerirse, pero no autorizar escritura. Debe quedar `monedaSugerida` y `requiere_validacion`.

### P0-114805-02 — Clientes todavía pueden quedar con GTQ por defecto

En `IMPORT_MAP.clientes.build`:

```js
rec.pais = normPais(rec.pais); rec.moneda = rec.pais === 'CO' ? 'COP' : 'GTQ';
```

Si el país falta, queda `GTQ`. Debe cambiarse a: país vacío + moneda vacía + `monedaSugerida` solo si hay país confiable + `requiereValidacion` si aplica.

### P1-114805-03 — Inconsistencia `SCOPE.documentos`

Aunque `IMPORT_MAP.documentos` ya escribe `parchesPendientes`, `SCOPE.documentos` dice:

```js
'documentos': { crea: ['clientes'], label: ['Documentos en el expediente abierto'] ... }
```

Debe decir `crea: ['parchesPendientes','documentos']` o solo `['parchesPendientes']`, y el label debe aclarar que son propuestas de cambio, no modificación directa.

### P1-114805-04 — Texto técnico aún visible en panel interno

Persisten términos `LAB`, `pendiente_backend`, `firestore-lab`, `smoke`, `modo demo`, etc. Parte puede ser aceptable si está condicionado a entorno interno, pero no debe verse en UI cliente.

### P1-114805-05 — Fechas fijas operativas/demostrativas

Persisten fechas `2026-01-01`, `2026-04`, `2026-06-24`, `2026-06-26` en `core/integraciones.js`, `core/ui.js`, `modules/portal.js`, `modules/siniestros.js` y ejemplos del importador. Debe separarse claramente seed demo vs flujo operativo.

### P2-114805-06 — Validador marketing/integraciones quedó desactualizado

El candidato cambió el literal `Simular` por `Probar`. El validador viejo debe actualizarse para aceptar el nuevo copy o revisar por `data-lab-cycle` sin exigir texto técnico.

## Decisión de empalme

- Se acepta como **última candidata frontend/baseline para continuar**, porque corrige la mayoría de P0 de la reauditoría 072304.
- El empalme debe ser **aditivo y controlado**, preservando backend LAB, `firestore.rules` y tools backend.
- No debe reemplazarse `data/store.js` backend ni archivos `backend-lab-*`.
- Antes de marcar el empalme como cerrado, aplicar fixes mínimos P0-114805-01/02/03 y actualizar validador.

## Pendientes para Claude / prototipo base

Los puntos P0/P1 anteriores deben documentarse para Claude hasta el próximo paquete. Si ChatGPT/Codex los corrige directamente, deben registrarse también para que Claude los conserve en el prototipo base.