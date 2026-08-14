# Cierre R2 · Required/Optional PASS + nuevo gap de asset dinamico · 2026-08-14

## Estado

- Repo: `paulaosoriof86/orbit360-core`
- Rama: `ays/backend-tenant-lab-v99-20260703`
- PR: #5 draft/open, sin merge.
- HEAD ejecutado R2: `8816f1e1119150f993a79fd56de33c104c29ecec`.
- Workflow: `Orbit360 Fase A Product Local Synthetic 20260814`.
- Run: `31822262972`.
- Job: `94838064587`.
- Produccion/deploy: 0.
- Firestore/Auth/operational writes: 0.

## Resultado del rootfix R2

La familia diagnosticada en R1 queda corregida.

El runtime materializa el contrato desde `orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js` y el owner aditivo `core/product-hydration-required-optional-p0.js` aplica readiness por required/optional sin modificar el store base.

Required canonicamente adjuntas:

`clientes, polizas, cobros, aseguradoras, vehiculos, recibosEsperados, carteraPrimas`

Evidencia runtime:

- bootstrap: `environment -> authentication -> membership -> planning -> attaching -> waiting-snapshots -> installing -> ready-read-only`;
- `productApp.started=true`;
- `routerStarted=true`;
- store `ready=true`, `status=ready-read-only`;
- `requiredMissing=[]`;
- `requiredFailed=[]`;
- clientes=430;
- aseguradoras=30;
- `notificaciones` ya no es dependencia hard;
- optional legacy degradado no bloquea;
- asesores permanece optional/proyectable;
- cero escrituras.

La clasificacion `DATA_CONTRACT_FAILURE / PRODUCT_RUNTIME_COLLECTION_POLICY_MISMATCH` queda CERRADA.

## Por que el workflow global termino FAIL

Despues de que Product App y store ya estaban listos, el harness espero `#host` visible durante 15 s y vencio.

El router canonico no renderiza inmediatamente al retornar `router.init()`: primero ejecuta `loadRuntimeContracts(start)` y carga contratos con `import()` dinamico. La evidencia del mismo run registra un 404 local de un JS bajo `/core/` durante esa fase.

El builder productivo sincroniza referencias estaticas del entrypoint, pero no garantiza todos los assets descubiertos dinamicamente por `core/router.js`. En source existen, entre otros:

- `core/session-multirol-visibility-v20260716.js`;
- `core/client-canonical-view-projection-v20260716.js`;
- `data/tenant-runtime-config-index.js`, que a su vez declara `data/tenant-alianzas-soluciones-insurers-p10.js`.

Por tanto, el bloqueo vigente cambia de familia a:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_DYNAMIC_RUNTIME_ASSET_GAP`

No se lanza un tercer synthetic dentro de R2.

## Progreso

- Readiness funcional de la candidata: 100%.
- Iteraciones tecnicas completadas: 2/4 = 50%.
- Gates finales de go-live cerrados: 0/3 = 0%.

R2 cuenta como iteracion cerrada porque su rootfix objetivo quedo demostrado; G1 no cierra porque existe un nuevo blocker de ensamblaje previo al paquete durable.

## Siguiente accion exacta · R3

R3 absorbe el gap dinamico porque ya es la iteracion de paquete durable:

1. derivar desde `core/router.js` y `data/tenant-runtime-config-index.js` todos los assets runtime dinamicos requeridos por la candidata canónica;
2. incorporarlos al builder de forma reproducible, sin hardcodear datos ni secretos;
3. extender el source gate para detectar assets dinamicos faltantes antes de secrets/browser;
4. ejecutar una sola prueba local de render sobre el mismo flujo, ahora esperando señal real del router/render y no un selector prematuro;
5. solo con PASS, materializar el ZIP durable definitivo con manifest y hashes en la misma frontera R3;
6. no HostDime, no produccion y no deploy hasta que el paquete durable quede certificado.

Si el mismo `PRODUCT_DYNAMIC_RUNTIME_ASSET_GAP` falla dos veces, aplicar `STOP_RETRY` antes de cualquier tercer intento.
