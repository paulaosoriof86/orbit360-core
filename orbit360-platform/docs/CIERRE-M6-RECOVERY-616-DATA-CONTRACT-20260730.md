# CIERRE M6 6.1.6 — DATA CONTRACT DEL BOOTSTRAP

Fecha: 2026-07-30  
Gate: `block6-go-live-product-v20260730`  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Resultado 6.1.6

Run `30526024340` · artifact `8752755957` · digest `sha256:607f737ecab80bfad280aa64c9297fcba6c68df6dc9dc60f8dc8e57976ffa619`.

El deploy de Firestore Rules read-only + Hosting pasó; Hosting readiness pasó; el smoke esperó correctamente 60 s pero el producto no llegó a `started`. El bloque ejecutó rollback automático con éxito.

Estado final seguro:

- producción funcional: no live;
- Firestore: deny-all;
- Hosting: rollback neutro;
- Storage: diferido fail-closed;
- conteos/digests before/after: estables;
- Firestore data writes: 0;
- operational writes: 0;
- network write candidates: 0.

## Clasificación

`DATA_CONTRACT_FAILURE`

Causa raíz:

`RUNTIME_COLLECTION_MANIFEST_EXCEEDS_CANONICAL_MIGRATION_AND_POLICY`

## Mecanismo demostrado

El generador productivo declaraba:

`clientes`, `aseguradoras`, `gestiones`, `notificaciones`.

Sin embargo, el baseline canónico promovido en M4 para M6 contiene únicamente `clientes` y `aseguradoras`. Además, `notificaciones` no tiene política en `COLLECTION_POLICY`.

La secuencia era determinista:

1. el query planner recibía `notificaciones`;
2. la política no encontraba módulo para esa colección y devolvía una propuesta no autorizada;
3. el planner la convertía en plan inválido;
4. el store productivo registraba `attach-error`;
5. como los listeners válidos todavía no habían emitido su primer snapshot asíncrono, `_attachSnapshots()` devolvía `false`;
6. el bootstrap terminaba `ok:false` sin instalar el store productivo;
7. `productAppP0` nunca llegaba a `started=true`.

Esto coincide con la evidencia del smoke 6.1.6: `productAppPresent=true`, `productStarted=false`, store no-ready y status vacío.

## Fix

- `tools/orbit360-m6-generate-product-runtime-config-v20260730.mjs`: manifiesto exacto `['clientes','aseguradoras']`.
- `orbit360-platform/core/product-app-runtime-p0.js`: fallback alineado al mismo baseline mínimo.
- El generador ahora reporta `collectionCount: 2`, lista explícita y contrato `m4_clients_insurers_only`.
- No se creó `gestiones`, `notificaciones` ni ninguna migración nueva para satisfacer el gate.
- Auth, Rules, datos y Storage no fueron alterados por la corrección.

## Evidencia estática

6.1.7 PASS:

- run inicial de remediación: `30526897555`;
- paquete completo 6.1.8: run `30527278135`;
- job productivo 6.1.8: `skipped`;
- cero secretos, Firebase, browser, Rules, deploy o producción durante la validación.

El preflight 6.1.7 valida además que:

- runtime = exactamente `clientes` + `aseguradoras`;
- ambas colecciones existen en la política;
- `gestiones`/`notificaciones` no se promueven;
- el mecanismo fail-closed se conserva;
- recovery 6.1.8 está preparado;
- el request 6.1.8 está ausente.

## Estado

`ROOT_CAUSE_CLOSED_STATIC_PASS`

M6 permanece fail-closed hasta una nueva autorización explícita de recovery 6.1.8.
