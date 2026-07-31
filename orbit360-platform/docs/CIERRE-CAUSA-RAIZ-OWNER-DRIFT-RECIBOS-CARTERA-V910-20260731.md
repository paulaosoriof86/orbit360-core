# CIERRE DE CAUSA RAÍZ — OWNER DRIFT EN PROYECCIÓN RECIBOS/CARTERA 9.1.0

Fecha: 2026-07-31  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Alcance: LAB read-only projection / sin datos / sin producción

## Síntoma

Después de publicar el owner full-page v1.199c, Póliza y Vehículo pasaron en runtime, pero la pestaña `Recibos y pagos` no montó `#rp-v910-policy` aunque la hidratación de `recibosEsperados=1293` y `carteraPrimas=673` era correcta.

## Clasificación

`FUNCTIONAL_DEFECT`

Causa raíz:

`PROJECTION_QUERY_RENDER_ONE_SHOT_WRAPPERS_LOSE_EFFECTIVE_OWNERSHIP_AFTER_LATE_OWNER_COMPOSITION`

La proyección 9.1.0 conservaba booleanos `wrappedQuery` y `wrappedClient`. Esos flags demostraban que el wrapper había sido instalado alguna vez, pero no que siguiera formando parte del owner efectivo después de que otros wrappers legítimos de Cliente 360 / read-model / scope fueran compuestos.

El defecto es de lifecycle/composición, no de datos, Firestore, Rules, Recibos ni cartera.

## Evidencia rojo

Run estático: `30654020185`  
Artifact: `8802490537`  
Digest: `sha256:f0c6a306a52fe0f2455816bbcee971065c7c841dd69e5cd530ecfdbb8c963ba1`

Resultado:

- 33/34 PASS;
- único fallo: `PROJECTION_OWNER_DRIFT_LIFECYCLE`;
- lifecycle exit 41;
- browser 0;
- deploy 0;
- writes 0.

La prueba sintética instala un owner tardío de query y renderer. El código anterior no recuperaba ownership.

## Fix

Owner protegido:

`core/backend-lab-receipts-portfolio-projection-v910.js`

Commit funcional:

`f651413cf7718daf3e795bc850b1e11760a01efe`

Cambios:

1. Query y renderer se verifican por identidad del owner actual, no por booleano histórico.
2. Si un owner legítimo queda arriba, la proyección envuelve el owner vigente sin descartarlo.
3. El resumen queda marcado idempotentemente para evitar aplicar cartera/salud dos veces ante wrappers anidados.
4. Reconciliación event-driven en `hashchange`, `orbit:session` y `orbit:lab:canonical-view-hydrated`.
5. Store API, semántica Recibos/Cartera y separación Cobros/finmovs permanecen intactas.
6. Cero escrituras de datos.

## Validator stale detectado durante cierre

El primer verde funcional hizo pasar `PROJECTION_OWNER_DRIFT_LIFECYCLE`, pero el validador textual esperaba literalmente `Orbit.q.carteraPrimasDe` y el owner refactorizado usa el alias local equivalente `q.carteraPrimasDe`.

Clasificación: `VALIDATOR_STALE`.

Se corrigió exclusivamente el validador; el owner funcional no volvió a modificarse.

## Evidencia verde

Run: `30654285383`  
Artifact: `8802592917`  
Digest: `sha256:90e68e2106c6900103a99dadc132d5d7751e20c50a0d792baa5454db5af2131`

Resultado:

- visual projection static: PASS;
- `PROJECTION_OWNER_DRIFT_LIFECYCLE`: PASS;
- lifecycle exit 0;
- gate canónico 9.1.0: PASS;
- browser 0;
- deploy 0;
- Firestore writes 0;
- operational writes 0;
- production false.

## Estado de Hosting

El Hosting autorizado previamente se consumió antes de descubrir esta causa raíz. Ese deploy sí publicó v1.199c y pasó paridad/hidratación, pero **no contiene todavía el commit funcional `f651413c…` de owner drift**.

Por tanto, este cierre es `STATIC_GREEN / HOSTING_PENDING_NEW_EXPLICIT_AUTHORIZATION`.

No reutilizar la autorización anterior.
