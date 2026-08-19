# Orbit 360 — F2 Request07 authorization boundary prepared

Fecha: 2026-08-19  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open  
Gate único: `f2-productive-acceptance-exact-successor-v20260818`

## Estado cerrado antes de Request07

La candidata sucesora del rootfix de Request06 está cerrada SOURCE-only:

- artifact: `9385306424`
- source: `b94b2ae86d26586a68d33be9edba8715e956b02e`
- ZIP SHA256: `81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4`
- manifest SHA256: `cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef`
- manifest status: `FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED`
- archivos: `194`
- SOURCE run PASS: `32310630524`
- SOURCE evidence artifact: `9386304228`
- SOURCE seal run PASS: `32310872702`
- lifecycle SOURCE: `CLOSED_PASS`
- lifecycle runtime: `F2_RUNTIME_PENDING_FRESH_AUTHORIZATION`

La evidencia SOURCE verificó `194/194` archivos, `fullRehashPass:true`, `inicioFiniteRootfixPass:true`, las siete rutas F2 y las superficies integradas Vehículos + Recibos/cartera. No hubo secretos, Firestore/data access, browser, runtime, writes, deploy, publicación ni producción.

## Causas raíz cerradas

1. `FUNCTIONAL_DEFECT:F2_UNDEFINED_NAN_VISIBLE:desktopDirection:inicio` — corregido en `core/queries.js` mediante degradación finita para `metaPrima` opcional.
2. `VALIDATOR_STALE:F2_GATE_OWNERS_PINNED_PREDECESSOR` — cerrado mediante rebind del mismo gate a artifact `9385306424`.
3. `CANONICAL_LIFECYCLE_REVISION_MISMATCH` — cerrado mediante composición lifecycle profile-aware; v1 permanece default y F2 usa `phase-capability-contract-v2-source-rebind`.
4. Los fallos de transporte/observabilidad detectados durante el rebind quedaron corregidos sin tocar producto ni datos.

## Frontera exacta preparada

La siguiente ejecución posible es:

`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST07 / EXACT_ARTIFACT_9385306424`

La autorización anterior de Request06 está consumida y no se reutiliza. **Request07 no existe todavía y no se emitirá sin autorización humana fresca.**

### Alcance que se habilitaría únicamente después del gate GO

- lectura del artifact exacto y revalidación de hashes;
- acceso al secret/provider estrictamente después del gate canónico GO;
- Firestore read-only;
- resolución de identidad protegida;
- custom token efímero;
- navegador/runtime;
- matriz Dirección desktop / Operativo tablet / Asesor móvil;
- Inicio, Cliente360, Aseguradoras, Ops, Leads, Pólizas, Cobros;
- Vehículos y Recibos/cartera como superficies integradas;
- cross-tenant denial;
- legal idempotente;
- Service Worker/cache;
- integridad before/after.

### Continúa prohibido

- Firestore writes;
- Auth writes o password reset;
- membership writes;
- data/operational writes;
- reimportaciones;
- package rebuild;
- rules redeploy;
- Hosting/Functions deploy;
- publicación o producción;
- `main` o merge.

## Estado de carriles

- Carril A — producto: `FROZEN_ROOTFIX_CERTIFIED_SOURCE_CLOSED_PASS`.
- Carril B — pipeline/runtime: `FRESH_AUTHORIZATION_REQUIRED_REQUEST07`.
- Carril C — datos: `UNTOUCHED_ZERO_CHANGES`.

## Ruta a producción

La ruta inmediata permanece en `50%` mientras F2 runtime/browser no cierre PASS. Si Request07 termina PASS y F2 se sella, la ruta sube a `80%`. El `20%` final corresponde a F3 go-live controlado, con autorización independiente para producción/deploy.

## Siguiente acción exacta

Esperar autorización humana fresca para `F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST07 / EXACT_ARTIFACT_9385306424`. Solo después crear un único request inmutable, ejecutar el gate canónico antes de secrets/Firebase/browser y consumir su evidencia terminal. No crear Request08 ni repetir Request06/Request07 a ciegas.
