# Cierre parcial R3 · Dynamic graph PASS + tenant runtime context blocker · 2026-08-14

## Estado de la frontera

- Repo: `paulaosoriof86/orbit360-core`.
- Rama: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open, sin merge.
- HEAD ejecutado: `6d4f5b9142167d9c0cf2a36ccd8bf55f342b10b5`.
- Workflow: `Orbit360 Fase A Product Local Synthetic 20260814`.
- Run: `31823597463`.
- Job: `94842408061`.
- Deploy: 0.
- Produccion tocada: no.
- ZIP durable: no creado; el paso de package fue correctamente omitido al fallar el render proof.

## Lo que R3 SI cerro

La familia anterior `PIPELINE_MECHANISM_FAILURE / PRODUCT_DYNAMIC_RUNTIME_ASSET_GAP` queda cerrada.

El source gate R3 completo el grafo local de dependencias antes de secretos/browser:

- static roots: 115;
- dependency closure: 199;
- dependencias dinamicas: 84;
- `missing=[]`;
- `dynamicMissing=[]`;
- `knownMissing=[]`;
- `tenantRefsMissing=[]`;
- `parityFailures=[]`;
- `forbiddenIncluded=[]`.

La clausura incluye, entre otros, los contratos del router, `data/tenant-runtime-config-index.js`, `data/tenant-alianzas-soluciones-insurers-p10.js` y el resumen sanitizado de conocimiento de aseguradoras. No hubo 404 local en el render proof R3.

## Estado funcional preservado

Durante el render proof R3 permanecieron certificados:

- Product App iniciado;
- router iniciado;
- store `ready-read-only`;
- 7/7 required adjuntas;
- required missing=0;
- required failed=0;
- clientes=430;
- aseguradoras=30;
- cero escrituras Firestore/Auth/operacionales;
- cero deploy;
- produccion intacta.

## Nuevo blocker demostrado

El router cargo correctamente:

1. multirol runtime;
2. client canonical projection;
3. tenant insurer config core;
4. tenant runtime config index.

El quinto contrato —configuracion activa de aseguradoras del tenant— quedo:

```text
src: ""
status: no-source
ready: false
```

El archivo tenant SI existe y SI fue incluido en el artifact. El problema no es de asset.

`core/router.js` resuelve el tenant activo solo desde `OrbitBackend.tenantId/tenant` o `Orbit.tenant.get()`. En runtime productivo read-only, la autoridad autenticada disponible esta en `Orbit.auth.productUser.tenantId` y en el store productivo `_productStatus().tenantId`, pero el router no recibe esa proyeccion. Por ello consulta el indice tenant con identificador vacio y no obtiene `insurerConfigSrc`.

Clasificacion vigente:

`FUNCTIONAL_DEFECT / PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING`

## Observacion secundaria no clasificada aun

El mismo render proof registro `pageErrors=["lecciones"]`.

No existe evidencia suficiente para atribuirlo a Academia ni a una escritura concreta. No se modifica Academia por inferencia. Antes del siguiente navegador se debe obtener stack/source sanitizado para clasificarlo con evidencia.

## Regla de siguiente intento

No se ejecuta otro browser en esta frontera.

Siguiente accion exacta:

1. preparar un bridge productivo aditivo y reusable que proyecte el tenant autenticado desde `Orbit.auth.productUser.tenantId` y/o el store productivo hacia el hook que el router ya consume, sin hardcode A&S y sin usar `tenantHint` como autoridad;
2. preparar observabilidad de `pageerror` con stack/source sanitizado sin disparar navegador durante la preparacion;
3. source-gate ambos cambios antes de secretos;
4. ejecutar UNA sola segunda prueba R3;
5. si tenant config queda ready, router renderiza y no hay page error bloqueante, crear en la misma ejecucion manifest + SHA256 + ZIP durable;
6. si vuelve a fallar la misma familia `PRODUCT_TENANT_RUNTIME_CONTEXT_BRIDGE_MISSING`, aplicar `STOP_RETRY` sin tercer intento.

## Progreso

- Readiness funcional: 100%.
- Plan tecnico global: 50% — R1 y R2 cerrados; R3 parcial, no cerrado.
- Gates finales: 0% — paquete durable aun no certificado.
- R3 interno: grafo dinamico PASS; render FAIL; ZIP no creado.
