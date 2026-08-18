# CHECKPOINT F1 — SOURCE-ONLY BOOTSTRAP ATTRIBUTION

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: `F1_IN_PROGRESS_SOURCE_ONLY`

## Clasificación vigente

`FUNCTIONAL_DEFECT / R4_RUNTIME_ACTIVATION_TRIGGER_FAILED`

STOP_RETRY permanece activo. No se autoriza un nuevo runtime/browser/deploy/candidata para diagnosticar.

## Evidencia recuperada sin nueva ejecución

Run existente `32155605314`, job `95771954009`:

- manifest PASS;
- auth asset PASS;
- custom-token submit/http PASS;
- auth projection PASS;
- membership read PASS;
- `runtime-activation-trigger` inició y falló 109 ms después;
- error exterior: `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`;
- cero Firestore/Auth/operational writes;
- no deploy/rebuild.

La evidencia raw no contiene el error interno del bootstrap. El run fue ejecutado sobre `ee3a1898...`, antes de incorporar el observer de `6d68495e...`; por ello el detalle interno no puede recuperarse de esa ejecución sin inventarlo.

## Atribución source-only confirmada

### 1. Owner exterior

`orbit360-platform/core/product-app-p0.js`

`productAppP0.activate()` llama una sola vez:

`backendProductReadOnlyBootstrapP0.start(...)`

Si el resultado no cumple `ok===true`, `ready===true`, `writeAuthorized===false`, convierte el detalle en el error exterior `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`.

### 2. Owner del estado interno

`orbit360-platform/core/backend-product-readonly-bootstrap-p0.js`

El bootstrap es fail-closed. Captura las excepciones internas, conserva el mensaje en `status.errors`, cambia la fase a `blocked` y devuelve `{ok:false, ready:false, status}`. No relanza la causa. Sus transiciones útiles son:

- `environment`;
- `authentication`;
- `membership`;
- `planning`;
- `attaching`;
- `waiting-snapshots`;
- `installing`;
- `ready-read-only`;
- `blocked`.

Por ello el run viejo solo pudo conservar el genérico exterior.

### 3. Paridad con el paquete publicado

El archivo `backend-product-readonly-bootstrap-p0.js` en el source head certificado de R4S9C `861326906558f03d9c8c2e7f34adfb4979a17d73` tiene SHA de contenido `bd6e68d9aec9bd7a1c7868e2bab659790e288c36`, idéntico al archivo actual inspeccionado en la rama. La atribución se realiza, por tanto, sobre el owner realmente presente en el paquete publicado, no sobre una variante posterior imaginaria.

### 4. Observer source actual

`tools/orbit360-r4-role-route-attribution-wrapper-v20260816.mjs` en `6d68495e...`:

- intercepta únicamente `backendProductReadOnlyBootstrapP0.start()`;
- llama `originalOwner.start.apply(originalOwner,args)` exactamente una vez;
- no contiene llamada standalone adicional a `Orbit.backendProductReadOnlyBootstrapP0.start()`;
- captura solo `phase`, `errors`, `assignedRoleCount`, `countryCount`, `collectionCount`, `ready`, `writeAuthorized`;
- excluye tenantId/email/uid;
- restaura el owner original en `finally`;
- transforma el fallo exterior en `R4_PRODUCT_BOOTSTRAP_OBSERVED_FAILURE` sin segundo bootstrap;
- dispone de `--self-test-only`, que termina antes de ejecutar el wrapper browser;
- declara browser/secrets/data/deploy/writes en cero en el self-test.

## Hallazgo causal de esta subfase

La causa específica interna todavía NO está demostrada. Solo están demostrados:

1. el límite exacto del fallo: dentro de `backendProductReadOnlyBootstrapP0.start()`;
2. que el wrapper anterior perdió el detalle porque `productAppP0.activate()` lo reemplazó por `PRODUCT_READONLY_BOOTSTRAP_NOT_READY`;
3. que la ejecución existente no contiene suficiente información para inferir cuál transición interna falló;
4. que el observer actual está diseñado para cerrar esa brecha con una única observación y sin retry.

No se adjudica todavía el defecto a membership, environment, planning, snapshots o store sin evidencia.

## Progreso F1

Subfases internas congeladas:

- F1.1 límite/owner + observer source: 25% — **CERRADO**;
- F1.2 obtener fase/error interno sanitizado con mecanismo válido y de una sola ejecución: 25% — pendiente;
- F1.3 rootfix únicamente en owner demostrado + source/static/synthetic: 25% — pendiente;
- F1.4 cierre de atribución y autorización de única frontera real posterior: 25% — pendiente.

F1 interno: **25%**.
Ruta inmediata a producción: **20% cerrado**; F1 no suma global hasta quedar 100%.
Programa integral: **10% cerrado**; F1 no suma global hasta quedar 100%.

## Seguridad / impacto

- nuevo browser/runtime: 0;
- secretos: 0;
- data reads nuevos: 0;
- Firestore writes: 0;
- Auth writes: 0;
- operational writes: 0;
- deploy: 0;
- rebuild/candidata: 0;
- main/merge: 0.

## Siguiente acción exacta

Ejecutar o materializar únicamente el `--self-test-only` del observer en un carril que no enlace provider/browser/secrets/runtime; validar que produce `R4_ROLE_ROUTE_ATTRIBUTION_SELFTEST_PASS` con todos los checks de single-invocation/allowlist/restore y cero operaciones externas. Después, y solo después, definir el mecanismo de una única observación runtime que permita recuperar `bootstrapObservation.phase/errors` sin violar STOP_RETRY. No reutilizar ni re-run del request consumido `32155605314`.