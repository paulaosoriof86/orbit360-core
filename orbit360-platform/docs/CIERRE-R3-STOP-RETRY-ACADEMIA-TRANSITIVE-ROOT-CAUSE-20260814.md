# CIERRE R3 · STOP_RETRY · Academia transitive root cause · 2026-08-14

Estado: `STOP_RETRY` histórico de browser preservado; causa raíz transitiva **CERRADA SOURCE-ONLY**.
Rama: `ays/backend-tenant-lab-v99-20260703`.
PR #5: draft/open, sin merge.
Último runtime HEAD: `dc5822d2b6561460edbd36c29e58951666a1000a`.
Último runtime run: `31834590862`.
Último source-only HEAD: `fc281a6865f5b5ae75d01f9deb01b4da04baa305`.
Último source-only run: `31835646012`.

## Lo que permanece cerrado

- R1 observabilidad.
- R2 required/optional: 7/7 required, 430 clientes, 30 aseguradoras, store `ready-read-only`.
- Auth/membership.
- Tenant-context productivo.
- Router `inicio` renderizado en la última evidencia runtime.
- 0 writes, 0 deploy, producción intacta.

## Segundo fallo de la misma familia · antecedente

Familia:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

En `31834590862` el bootstrap productivo ya NO solicitó `operationalAcademy`. Esa exclusión directa fue efectiva. Sin embargo, el dynamic closure volvió a incluir y ejecutar:

`data/academia-v1230-operational-directory-v20260722.js`

El mismo owner volvió a producir `pageError: lecciones` al intentar usar `insert/update` contra el store productivo read-only.

## Causa raíz demostrada

El padre transitivo era:

`core/academia-static-content-write-policy-v20260729.js`

Evidencia del propio source:

- encabezado: `Academia static content write policy · LAB only`;
- `OPERATIONAL_OWNER_SRC='data/academia-v1230-operational-directory-v20260722.js?...'`;
- `ensureOperationalDirectoryOwner()` crea e inserta ese script;
- `ensureOperationalDirectoryOwner()` se invoca globalmente al cargar la policy;
- la policy solo instala su wrapper sobre el store si detecta LAB, pero la carga del owner ocurre antes e independientemente de esa condición.

El mecanismo de empaquetado productivo copiaba esa policy porque la clasificación anterior `hasLabToken()` dependía del nombre/ruta y el filename de la policy no contiene `lab`.

Clasificación de control:

`VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED`

Causa raíz de pipeline:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED`

## Regla STOP_RETRY aplicada

La familia de browser falló dos veces.

- no tercer browser automático;
- no secrets durante la corrección de causa raíz;
- no deploy;
- no HostDime;
- no producción;
- no reimportación;
- no modificación de store productivo para permitir writes.

## Corrección source-only

Se actualizó el builder productivo y el validador de clausura para registrar como incompatibles con product-readonly:

- `core/academia-static-content-write-policy-v20260729.js`;
- `data/academia-v1230-operational-directory-v20260722.js`.

El workflow existente quedó temporalmente congelado con `ORBIT360_R3_SOURCE_ONLY_ROOTFIX=true`, de forma que solo podía ejecutar gate + build + clausura dinámica; instalación, secretos, identidad, browser y package quedaron deshabilitados.

### Control negativo

Run `31835518503`, HEAD `8c061f999263983145326f8d55c323b06160d9e9`:

- gate source-only FAIL esperado;
- nuevas assertions detectaron que el artefacto vigente aún contenía la incompatibilidad;
- instalación, secretos, identidad, browser y ZIP: `skipped`.

### Evidencia de cierre

Run `31835646012`, HEAD `fc281a6865f5b5ae75d01f9deb01b4da04baa305`:

- gate contractual source: PASS;
- build productivo: PASS;
- entrypoint source: PASS;
- dynamic closure: PASS;
- instalación runtime: `skipped`;
- secrets/identity: `skipped`;
- browser/render: `skipped`;
- ZIP: `skipped`;
- `secretAccess=false`;
- `browserExecuted=false`;
- `deployExecuted=false`;
- `productionTouched=false`.

Clausura final:

```text
staticRootCount=115
dependencyClosureCount=193
dynamicDependencyCount=78
missing=0
dynamicMissing=0
knownMissing=0
tenantRefsMissing=0
parityFailures=0
forbiddenIncluded=0
semanticForbiddenIncluded=0
discoveredSemanticForbidden=0
noLabRuntime=true
```

La clausura ya no contiene ni descubre ninguno de los dos archivos incompatibles. El entrypoint conserva DOM funcional, assets completos, product tenant bridge, product router bootstrap y pre-auth store fail-closed.

## Cierre de clasificaciones

- `VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED` → **CLOSED**.
- `PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED` → **CLOSED_SOURCE_ONLY**.

El `STOP_RETRY` de browser permanece como antecedente y prohíbe interpretar una futura ejecución como “tercer retry automático”.

## Siguiente acción exacta

Cualquier navegador posterior requiere una **nueva frontera explícitamente autorizada de aceptación post-causa-raíz**.

Solo con esa autorización:

1. retirar únicamente el freeze source-only del workflow existente;
2. mantener congelados R1/R2/Auth/membership/tenant-context/store/router;
3. ejecutar una única validación sobre la composición ya certificada;
4. exigir tenant-context PASS, 7/7 required, 430/30, route `inicio`, host render, cero pageErrors, cero local HTTP failures y cero writes;
5. únicamente con PASS crear manifest + SHA256 + ZIP durable en el mismo run;
6. si aparece un fallo nuevo, clasificar su familia antes de cualquier otra acción.

## Avance

- readiness funcional: 100%;
- avance técnico global: 50%;
- gates finales: 0/3;
- R3: required PASS / tenant-context PASS / router PASS histórico / product-safe closure PASS source-only / clean render pendiente / ZIP pendiente.
