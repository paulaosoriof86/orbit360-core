# CIERRE R3 · STOP_RETRY · Academia transitive root cause · 2026-08-14

Estado: `STOP_RETRY` activo.
Rama: `ays/backend-tenant-lab-v99-20260703`.
PR #5: draft/open, sin merge.
Último runtime HEAD: `dc5822d2b6561460edbd36c29e58951666a1000a`.
Último run: `31834590862`.
Job: `94877929891`.

## Lo que permanece cerrado

- R1 observabilidad.
- R2 required/optional: 7/7 required, 430 clientes, 30 aseguradoras, store `ready-read-only`.
- Auth/membership.
- Tenant-context productivo.
- Router `inicio` renderizado.
- 0 writes, 0 deploy, producción intacta.

## Segundo fallo de la misma familia

Familia:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_BOOTSTRAP_INCLUDES_LAB_ONLY_ACADEMIA_STATIC_CONTENT`

En `31834590862` el bootstrap productivo ya NO solicitó `operationalAcademy`. Esa exclusión directa fue efectiva. Sin embargo, el dynamic closure volvió a incluir y ejecutar:

`data/academia-v1230-operational-directory-v20260722.js`

El mismo owner volvió a producir `pageError: lecciones` al intentar usar `insert/update` contra el store productivo read-only.

## Causa raíz demostrada

El padre transitivo es:

`core/academia-static-content-write-policy-v20260729.js`

Evidencia del propio source:

- encabezado: `Academia static content write policy · LAB only`;
- `OPERATIONAL_OWNER_SRC='data/academia-v1230-operational-directory-v20260722.js?...'`;
- `ensureOperationalDirectoryOwner()` crea e inserta ese script;
- `ensureOperationalDirectoryOwner()` se invoca globalmente al cargar la policy;
- la policy solo instala su wrapper sobre el store si detecta LAB, pero la carga del owner ocurre antes e independientemente de esa condición.

El mecanismo de empaquetado productivo todavía copia esa policy porque la clasificación `hasLabToken()` depende del nombre/ruta y el filename de la policy no contiene `lab`.

Por tanto:

1. la composición productiva contiene una policy semánticamente LAB-only;
2. esa policy reinyecta el mismo owner estático;
3. el gate source-only anterior produjo un falso PASS de seguridad de composición porque no tenía registrada esta incompatibilidad semántica.

## Clasificación

Primaria de control:

`VALIDATOR_STALE / PRODUCT_LAB_ONLY_STATIC_POLICY_NOT_REGISTERED`

Causa raíz de pipeline:

`PIPELINE_MECHANISM_FAILURE / PRODUCT_TRANSITIVE_LAB_ONLY_STATIC_POLICY_INCLUDED`

## Regla aplicada

Misma familia falló dos veces.

- `STOP_RETRY` activo.
- No tercer browser.
- No secrets.
- No nuevo deploy.
- No HostDime.
- No producción.
- No reimportación.
- No modificación de store productivo para permitir writes.

## Siguiente acción exacta

Solo source-only:

1. congelar producto/runtime;
2. corregir registro/validador/composición para declarar incompatibles con product read-only:
   - `core/academia-static-content-write-policy-v20260729.js`;
   - `data/academia-v1230-operational-directory-v20260722.js`;
3. ejecutar únicamente gate de composición + dynamic closure, sin secrets/browser;
4. exigir ausencia de ambos archivos del artifact y del dependency closure;
5. exigir que sigan presentes entrypoint, Cliente 360, Aseguradoras, Ops, Leads, tenant bridge y owners productivos requeridos;
6. detener y sincronizar documentación después de esa evidencia source-only.

Cualquier browser posterior requiere una nueva frontera explícitamente autorizada después del cierre de causa raíz. No se autoriza un tercer retry automático de esta familia.

## Avance

- readiness funcional: 100%;
- avance técnico global: 50%;
- gates finales: 0/3;
- R3: required PASS / tenant-context PASS / router PASS / product-safe closure FAIL / ZIP pendiente.
