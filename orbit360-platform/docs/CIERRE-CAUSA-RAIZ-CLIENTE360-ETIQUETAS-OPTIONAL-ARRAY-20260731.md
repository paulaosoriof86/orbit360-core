# Cierre de causa raíz — Cliente 360 · arrays opcionales · 2026-07-31

## Clasificación

`FUNCTIONAL_DEFECT`

Causa raíz:

`CLIENT_CANONICAL_PROJECTION_SIGNATURE_OMITS_OPTIONAL_ARRAY_SHAPE_AND_LEAVES_STALE_SUMMARY`

## Síntoma observado

Después del deploy autorizado del fix owner-drift de Recibos/Cartera, Hosting LAB, paridad e hidratación pasaron, pero la revisión visual read-only no podía montar `#rp-v910-policy`.

El diagnóstico estructural confirmó que:

- la ruta efectiva era `cliente360` con `c` + `t=recibos`;
- Dirección tenía acceso al módulo y al cliente de muestra;
- los owners query/client/policies de la proyección 9.1.0 estaban vigentes;
- la proyección estaba `ready:true`;
- no había full-page de Póliza/Vehículo interceptando la ruta;
- `#c360-body` nunca llegaba a crearse.

La captura de excepción mostró:

`Cannot read properties of undefined (reading 'map')`

## Datos descartados como causa

La integridad referencial fue comprobada read-only:

- recibosEsperados: 1293/1293 alineados cliente ↔ póliza;
- carteraPrimas: 673/673 alineados cliente ↔ póliza;
- clienteId faltante: 0;
- polizaId faltante: 0;
- cliente de recibo diferente al cliente canónico de la póliza: 0.

Por tanto `DATA_CONTRACT_FAILURE` queda descartado.

## Causa funcional exacta

`modules/cliente360.js` consume `c.etiquetas.map(...)` en el encabezado de la ficha. `etiquetas` es un campo opcional válido para clientes migrados.

El owner reusable `core/client-canonical-view-projection-v20260716.js` ya proyectaba `etiquetas` a `[]`, pero su firma de idempotencia no incluía ese array. Una fila podía conservar la marca temporal de “ya proyectada” aunque la forma opcional estuviera incompleta; además el resumen de Cliente 360 podía permanecer cacheado hasta un nuevo evento de store.

## Fix

Commit funcional: `cf82e29276f49e757dcbd24bc53f67c0de8efa9c`

Owner: `core/client-canonical-view-projection-v20260716.js`

Cambios:

- `shapeRevision = 20260731.1-optional-arrays`;
- firma canónica incluye presencia/contenido de `etiquetas` y `alertasCalidad`;
- nuevo marker temporal obliga una reproyección controlada una sola vez;
- cuando cambia el shape se emite evento read-only `orbit:store:emit` para invalidar resúmenes visuales cacheados;
- revalidación también en `hashchange`, sesión y vista canónica hidratada;
- no se llama insert/update/remove ni se reimportan clientes.

## Evidencia

Run estático: `30657011319`

Artifact: `8803627636`

Digest: `sha256:916fa43f1f50f9c1b5962e1bba3a2267ecf57c79277593fb5f99bf28e44661f3`

Resultado:

- gate canónico 9.1.0: PASS;
- contrato visual static: 39/39 PASS;
- CLIENT_OPTIONAL_ARRAY_SHAPE: PASS;
- CLIENT_PROJECTION_FORCES_NEW_MARKER: PASS;
- CLIENT_PROJECTION_INVALIDATES_SUMMARY_CACHE: PASS;
- CLIENT_PROJECTION_ZERO_BACKEND_WRITES: PASS;
- owner drift lifecycle: PASS;
- firestore writes: 0;
- operational writes: 0;
- deploy: 0;
- production: false.

## Estado

`STATIC_GREEN · HOSTING_PENDING`

El deploy Hosting anterior ya fue consumido 1/1 antes de descubrir esta causa. Este nuevo fix todavía no está publicado en LAB.
