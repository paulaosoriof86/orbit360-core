# Cierre causa raíz — Cliente 360 · frontera síncrona de lectura

Fecha: 2026-07-31  
Clasificación: `FUNCTIONAL_DEFECT`  
Estado: `STATIC_GREEN / HOSTING_PENDING`

## Síntoma

Tras publicar el fix de optional-shape, el run Hosting LAB `30659154509` cerró:

- gate canónico PASS;
- static 39/39 PASS;
- Hosting LAB deploy 1/1 PASS;
- paridad remota 6/6 PASS;
- hidratación exacta PASS;
- visual read-only FAIL en `direction_semantics` esperando `#rp-v910-policy`.

Artifact `8804600413` · digest `sha256:c520c7765bb183c6a3216749891e820e78d554401df740ce07e0335315c051d5`.

No hubo Rules, Functions, Storage, escrituras Firestore, Cobros, producción, main ni merge.

## Diagnóstico estructural read-only

Run `30659730127` · artifact `8804672882` · digest `sha256:ab8e5c77d5672c989338cb0e65a8354079aaf535354a0d50a95154e1c74416e9`.

Evidencia:

- 1293/1293 recibos alineados cliente ↔ póliza;
- 673/673 cartera alineada;
- Dirección con acceso correcto;
- cliente de muestra existente y visible;
- owners query/client/policies vigentes;
- proyección Recibos `ready=true`;
- `#c360-body` no alcanzaba a crearse;
- page error repetido: `Cannot read properties of undefined (reading 'map')`.

`DATA_CONTRACT_FAILURE`, permisos y owner drift quedaron descartados.

## Causa raíz final

`CLIENT360_ASYNC_CANONICAL_PROJECTION_RACES_SYNCHRONOUS_DETAIL_RENDER`

La proyección de clientes normalizaba arrays opcionales mediante `applyAll()`, pero sus hooks de `hashchange`, sesión y canonical-view ejecutaban `setTimeout(applyAll, 0)`.

El router podía invocar `Cliente360.render()` y `detalle()` en el mismo ciclo antes de ese timer. `detalle()` consume `r.cli`, proveniente de `q.clienteResumen`, y el read-model tomaba el cliente crudo con `Orbit.store.get('clientes', clientId)`. Por tanto una fila válida sin `etiquetas` podía llegar a `c.etiquetas.map(...)` antes de ser proyectada.

El store LAB fue auditado read-only y `all()`/`get()` comparten las mismas referencias; no existe un problema de clonación del adaptador.

## Reproducción roja contractual

Se amplió `tools/orbit360-test-client360-policy-vehicle-readmodel-v1199c-20260731.mjs` para exigir proyección síncrona del cliente antes de devolver `r.cli`.

Run rojo `30660079725`:

- gate canónico PASS;
- sintaxis PASS;
- contrato read-model FAIL;
- deploy 0;
- browser 0;
- writes 0.

## Fix funcional

Commit: `b164b3590a41d6ff5ff12766ab1885e50ac24f78`  
Owner: `modules/policy-receipts-v1199-detail-guard.js`  
Blob: `696acb7d762edba97fdf2e65ace4a09818704034`.

Cambio:

```text
rawCli = Orbit.store.get('clientes', clientId)
→ cli = Orbit.clientProjection.project(rawCli) en la misma llamada
→ solo entonces se construye/cachea q.clienteResumen
```

La proyección devuelve copia visual canónica; no modifica backend, no reimporta y no llama insert/update/remove.

## Evidencia verde

Run `30660261652` · artifact `8804859413` · digest `sha256:36e014c8651956bff6104bd1c3fc5fd04cf97a00cd9dbc6b3f6112939c85ad7f`.

Resultados:

- gate canónico 9.1.0 PASS;
- visual projection 39/39 PASS;
- `synchronousClientShape=true`;
- indexed summary PASS;
- policy aliases PASS;
- vehicle aliases PASS;
- Póliza full-page PASS;
- Vehículo full-page PASS;
- no `undefined` / `NaN` PASS;
- writes 0;
- browser 0;
- deploy 0;
- producción false.

## Regla reusable

Una proyección visual requerida para evitar excepciones no puede depender únicamente de eventos asíncronos. La frontera de lectura consumida por el renderer debe garantizar sincrónicamente el contrato mínimo del view-model.

## Siguiente acción

Publicar una sola vez el fix `b164b359…` en Hosting LAB y ejecutar, en la misma corrida, paridad → hidratación → Cliente360/Recibos Dirección/Operativo/Asesor.

No avanzar a Cobros hasta runtime `ok:true` y revisión visual humana única.
