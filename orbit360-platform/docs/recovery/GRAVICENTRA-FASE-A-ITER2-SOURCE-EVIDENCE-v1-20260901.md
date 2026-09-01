# Gravicentra Insurance Fase A — Iteración 2 Source Materialization Evidence

Fecha: 2026-09-01  
Rama: `recovery/fase-a-clean-20260831`  
Base HEAD: `04bf4a17ab0fcca33452bb9b97a39c4b67dba4e1`  
Gate: **ITERATION 2 — IN_PROGRESS / SOURCE_MATERIALIZED**

## Frontera respetada

- No build.
- No Firebase Preview.
- No deploy.
- No producción.
- No cambios de datos.
- Corte operativo permanece `2026-07-31`.
- No se reabre Iteración 1 (`PASS 15/15`).

## Causa raíz materializada

`firebase.json` sirve `orbit360-platform`, por lo que `orbit360-platform/index.html` es el entrypoint físico productivo. El HEAD base lo componía con `backend-lab-*`, `store-firestore-lab.local.js`, `data/seed.js`, el store localStorage `data/store.js`, y `core/auth.js` de línea LAB. Esa mezcla violaba la frontera productiva y convertía el source servido en una composición distinta del lineage aprobado.

La Iteración 2 reconstituye el mismo entrypoint físico sin LAB/seed/demo-auth y enlaza directamente los owners productivos ya presentes en el clean tree.

## Source materializado

1. `orbit360-platform/index.html`
   - marca visible `Gravicentra Insurance`;
   - un solo entrypoint servido;
   - sin `backend-lab-*`, `store-firestore-lab*`, `data/seed.js`, `data/store.js` ni `core/auth.js`;
   - auth productivo: `core/auth-product-runtime-p0.js`;
   - read authority: `data/store-firestore-product-readonly-p0.js`;
   - hydration productiva required/optional;
   - owners de Aseguradoras OP2, Ops/Leads, Cobros y relaciones alcanzables;
   - startup arranca únicamente por `Orbit.productAppP0.init()`; no inicializa store/router desde seed.

2. `orbit360-platform/core/product-app-p0.js`
   - conserva el owner/path del startup productivo;
   - elimina el override de `30000 ms` y el wait de host de `120000 ms`;
   - bounded failure timeout de required hydration: `20000 ms`;
   - router inicia después de auth + membership + read authority + tenant context;
   - PWA/service worker no forma parte de la condición de éxito;
   - novedades se difieren fuera del primer render.

3. `orbit360-platform/data/store-firestore-product-operational-p0.js`
   - write facade separado; el store read-only continúa siendo autoridad de lectura;
   - Firestore modular usando la misma sesión Firebase;
   - tenant únicamente desde membership autenticada;
   - superficie de colecciones explícita;
   - `Orbit.access` obligatorio y fail-closed;
   - control de record scope cuando existe;
   - credenciales sensibles de Aseguradoras se bloquean para que permanezcan en su owner seguro;
   - no LAB, URL tenant, seed, localStorage ni fallback;
   - proyección optimista temporal solo mientras llega el snapshot autoritativo; no es baseline/overlay de release.

4. `tools/verify-gravicentra-i2-clean-source.js`
   - verificador determinista del gate source/reachability/startup/write-contract.

## Estado

Este documento **no declara PASS**. El commit solo materializa el source. El gate debe cerrarse después de readback exacto del commit y ejecución satisfactoria del verificador contra ese árbol. Iteración 3 continúa prohibida hasta entonces.
