# Gravicentra Insurance — cierre causal Aseguradoras y corrección del mecanismo de sucesor

Fecha: 2026-09-09  
Rama rectora: `recovery/fase-a-clean-20260831`  
Alcance: I4A -> retorno causal a I2/I3.  
Naturaleza: evidencia operativa mutable; no sustituye las Fuentes Evergreen V3 ni el Control Plane.

## 1. Estado previo que se conserva

La release I3 anterior permanece como evidencia física certificada mientras se recertifica el sucesor. No se parchea su artifact y no se modifica producción.

- Source certificado anterior: `96f6962b8519a032c2f54b50d2796fa2545de1e4`.
- Build anterior: `gi-i3-96f6962b8519-57f234755dc1`.
- I3 anterior: run `34307974287`, readback exacto.
- Producción tocada por recovery: false.
- Datos tocados por recovery: false.
- Writes operativos del recovery: 0.
- Corte de datos I0-I5: 2026-07-31.
- Agosto: HOLD hasta `PRODUCTION_ACCEPTED`.

## 2. Evidencia causal de Aseguradoras

La infraestructura Preview dejó de ser el bloqueo causal cuando el callable aislado quedó activo y con readback exacto en run `34410467076`. El callable canónico de producción permaneció sin mutación.

El I4A posterior dejó Aseguradoras como único fallo funcional relevante del probe privilegiado. Los diagnósticos read-only separaron las capas:

1. Run `34416486645`: el `credentialRef` estaba presente, con formato válido y disponible localmente, pero el reveal por el provider seguro falló en Dirección, SuperAdmin, AdminTenant y Operativo.
2. Run `34416753493`: para el mismo ref, `status` directo del callable devolvió disponible y `reveal` directo devolvió `ok=true` y valor presente. El valor nunca se imprimió ni persistió. La misma operación a través de `Orbit.secureResources.revealCredential` terminó `no_disponible`.
3. El contrato físico `orbit360-platform/core/product-tenant-runtime-context-bridge-p0.js` exporta `Orbit.productTenantRuntimeContextP0` con `status()` y `resolveTenant()`.
4. El provider `orbit360-platform/core/product-insurer-credential-provider-p0.js` intentaba consultar `Orbit.productTenantRuntimeContextBridgeP0.context()`, objeto que el bridge cargado no exporta.

Conclusión causal: el backend, Secret Manager, IAM, roles y el `credentialRef` no son la causa del fallo observado. El defecto está en el resolver de tenant del provider frontend de Aseguradoras.

## 3. Sucesor mínimo

Se creó el source sucesor físico:

- Source SHA: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- Tree SHA: `d6e6857c9cd48d20db6000db02cbba3a00f26018`.
- Parent: `d1009f4af146dcf8fd0d10ace15abe6b2d083825`.

Su diff causal contiene exactamente dos archivos:

- `orbit360-platform/core/product-insurer-credential-provider-p0.js`: usa el objeto realmente exportado `Orbit.productTenantRuntimeContextP0`, exige `status().ready === true` y obtiene `tenantId` sin URL fallback ni tenant hardcodeado.
- `tools/orbit360-recovery-i2-insurer-preview-backend-contract-test.mjs`: agrega la regresión que exige el export canónico y prohíbe reintroducir `productTenantRuntimeContextBridgeP0`.

No cambia `index.html`, service worker, backend, Firestore, reglas, Storage ni datos.

## 4. Por qué vuelve a I2/I3

La regla congelada se mantiene: cualquier cambio de source posterior a un build I3 certificado genera source SHA nuevo y obliga nueva recertificación I2 -> I3 -> Preview -> I4A. El artifact certificado anterior no se modifica.

No se reabre I1 ni se rediscover lineage. Las 15 capabilities siguen vinculadas por `CAPABILITY_LINEAGE_LOCK.json` y la evidencia no afectada se preserva.

## 5. Defectos de mecanismo detectados y corrección

La investigación descubrió riesgos de desincronización del executor que no deben repetirse:

- I2 e I3 usaban checkout de control con `fetch-depth: 50`, insuficiente para garantizar ancestry completa.
- I2/I3 dependían de ejecución manual aunque ya existe un patrón más seguro de intent exacto y no autoritativo.
- El guard en modo I3 exportaba `certifiedCandidate`, lo que podía reconstruir la release anterior durante una recertificación de sucesor.
- El guard central vigilaba una lista cerrada de workflows/tools, de modo que un instrumento diagnóstico nuevo podía quedar fuera de la vigilancia inmediata.
- El workflow diagnóstico temporal de Aseguradoras debía dejar de existir como executor activo al cumplir su función.

Corrección materializada para el sucesor:

- `CONTROL_PLANE.json` continúa como única autoridad mutable.
- I2 e I3 aceptan únicamente su `I*_EXECUTION_INTENT.json` exacto como trigger automático; `workflow_dispatch` se conserva solo como escape explícito.
- Los intents son no autoritativos y deben coincidir con `nextCandidate.sourceSha/sourceTree` y con el estado del Control Plane.
- Los checkouts de control I2/I3 usan `fetch-depth: 0`.
- Durante `I2_IN_PROGRESS` o `I3_IN_PROGRESS`, el guard exige y exporta `nextCandidate`; I3 no puede consumir la release anterior.
- El guard central vigila por glob todos los workflows `gravicentra-*`, tools `gravicentra-*`, todo `release-control/**` y las fuentes V3.
- Sigue prohibido el fan-out por cambios generales de producto.
- Sigue prohibido el self-patch del harness QA.
- El diagnóstico temporal se retira del árbol activo; sus runs permanecen como evidencia.

## 6. Documentación y Fuentes Evergreen V3

Las seis Fuentes Evergreen V3 no requieren reemplazo por este cambio. Sus reglas ya ordenan un solo Control Plane, executors state-gated, ausencia de hardcodes, guard central, recertificación I2/I3 ante cambio de source, preservación de lineage y actualización de fuentes estáticas solo ante cambios normativos permanentes.

Por eso `projectSources.staticSourceUpdateRequired` permanece `false`. La información mutable de este incidente y de su sucesor vive en `CONTROL_PLANE.json`, `CAPABILITY_STATUS_LEDGER.json`, este registro y la evidencia física de GitHub Actions.

## 7. Prueba física del mecanismo corregido

La corrección no se consideró válida solo por estar escrita. Se ejecutó sobre el mismo HEAD y quedó probada físicamente:

- Guard central run `34420740721`: SUCCESS.
- I2 del sucesor run `34420740707`: SUCCESS completo.
- En I3 run `34420928503`, el intent exacto, el guard y el checkout del sucesor terminaron SUCCESS y el propio log registró `SOURCE_SHA=1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- El acceso al Firebase Hosting existente también pasó antes de cualquier build/deploy.

Esto prueba que el mecanismo de autoridad/lineage ya no reconstruye el `certifiedCandidate` anterior cuando existe un `nextCandidate` causal.

## 8. Fallo del primer I3 sucesor y clasificación

El run `34420928503` no cerró I3. Falló antes de materializar el paquete y antes de desplegar Preview por un defecto del executor: el bloque Python usó `Path(...).read()`, método inexistente para `pathlib.Path`.

Clasificación: `I3_EXECUTOR_PACKAGE_PREP_PATH_READ_METHOD_ERROR`.

El error exacto fue `AttributeError: 'PosixPath' object has no attribute 'read'`. El fix quedó materializado en commit `bf964736f2f7d87d64e7a39e3f5c30f28946e955`, cambiando únicamente `read()` por `read_text()` en `.github/workflows/gravicentra-recovery-i3-preview-v2.yml`.

No se generó un nuevo source de producto, no se alteró `1e6a6ca3...`, no se desplegó Preview, no se tocó producción y no hubo writes operativos.

El detalle operativo queda además en `I3_SUCCESSOR_EXECUTOR_FAILURE_AND_RERUN_20260909.md`.

## 9. Reintento controlado I3-R2

El reintento usa el mismo source y tree ya aprobados en I2:

- Source: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- Tree: `d6e6857c9cd48d20db6000db02cbba3a00f26018`.
- Intent: `I3-SUCCESSOR-ASEGURADORAS-TENANT-RUNTIME-20260909-R2`.

El reintento no puede declararse PASS hasta demostrar materialización de paquete, Hosting Preview aislado, readback byte-a-byte exacto y evidencia sellada. Si vuelve a fallar por executor, se corrige dentro de I3; no se abre una iteración nueva ni se modifica producto sin causa nueva probada.
