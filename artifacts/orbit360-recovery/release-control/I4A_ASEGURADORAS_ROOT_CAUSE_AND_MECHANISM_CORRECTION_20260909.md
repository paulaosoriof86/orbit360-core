# Gravicentra Insurance — cierre causal Aseguradoras y corrección del mecanismo de sucesor

Fecha: 2026-09-09  
Rama rectora: `recovery/fase-a-clean-20260831`  
Alcance: I4A -> retorno causal a I2/I3 -> regreso a I4A.  
Naturaleza: evidencia operativa mutable; no sustituye las Fuentes Evergreen V3 ni el Control Plane.

## 1. Estado previo que se conserva

La release I3 anterior permaneció como evidencia física certificada mientras se recertificó el sucesor. No se parcheó su artifact y no se modificó producción.

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

Conclusión causal: backend, Secret Manager, IAM, roles y `credentialRef` no eran la causa. El defecto estaba en el resolver de tenant del provider frontend de Aseguradoras.

## 3. Sucesor mínimo

Se creó el source sucesor físico:

- Source SHA: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- Tree SHA: `d6e6857c9cd48d20db6000db02cbba3a00f26018`.

Su diff causal contiene exactamente dos archivos:

- `orbit360-platform/core/product-insurer-credential-provider-p0.js`: usa el objeto realmente exportado `Orbit.productTenantRuntimeContextP0`, exige `status().ready === true` y obtiene `tenantId` sin URL fallback ni tenant hardcodeado.
- `tools/orbit360-recovery-i2-insurer-preview-backend-contract-test.mjs`: agrega la regresión que exige el export canónico y prohíbe reintroducir `productTenantRuntimeContextBridgeP0`.

No cambia `index.html`, service worker, backend, Firestore, reglas, Storage ni datos.

## 4. Por qué volvió a I2/I3

La regla congelada se mantuvo: un cambio de source posterior a un build I3 certificado genera source SHA nuevo y obliga recertificación I2 -> I3 -> Preview -> I4A. El artifact certificado anterior no se modifica.

Esto no fue una desincronización ni una reapertura de I1. Fue la recertificación obligatoria del único cambio causal de producto hallado dentro de I4A. Las 15 capabilities siguieron vinculadas por `CAPABILITY_LINEAGE_LOCK.json` y la evidencia no afectada se preservó.

## 5. Defectos de mecanismo detectados y corregidos

Durante esa recertificación se encontraron riesgos del executor:

- I2 e I3 usaban checkout de control con `fetch-depth: 50`.
- I2/I3 dependían de ejecución manual aun existiendo intents exactos.
- I3 podía consumir `certifiedCandidate` anterior en lugar del `nextCandidate`.
- El guard central vigilaba una lista cerrada de workflows/tools.
- El workflow diagnóstico temporal podía permanecer como executor adicional.

Corrección materializada:

- `CONTROL_PLANE.json` es la única autoridad mutable.
- I2 e I3 aceptan su `I*_EXECUTION_INTENT.json` exacto como trigger automático; `workflow_dispatch` queda como escape explícito.
- Los intents son no autoritativos y deben coincidir con source/tree y estado del Control Plane.
- Checkouts de control I2/I3 usan `fetch-depth: 0`.
- En ciclo sucesor, I3 consume `nextCandidate`, no la release anterior.
- El guard central vigila workflows `gravicentra-*`, tools `gravicentra-*`, `release-control/**` y fuentes V3.
- Sigue prohibido fan-out por cambios generales, self-patch del harness y executors I4A paralelos.
- El diagnóstico temporal fue retirado del árbol activo; sus runs permanecen como evidencia.

## 6. Documentación y Fuentes Evergreen V3

Las seis Fuentes Evergreen V3 no requieren reemplazo por este cambio. Sus reglas ya ordenan un solo Control Plane, executors state-gated, ausencia de hardcodes, guard central, recertificación I2/I3 ante cambio de source, preservación de lineage y actualización de fuentes estáticas solo ante cambios normativos permanentes.

`projectSources.staticSourceUpdateRequired` permanece `false`. La información mutable de este incidente vive en `CONTROL_PLANE.json`, `CAPABILITY_STATUS_LEDGER.json`, este registro y la evidencia física de GitHub Actions.

## 7. Prueba física inicial del mecanismo corregido

- Guard central run `34420740721`: SUCCESS.
- I2 del sucesor run `34420740707`: SUCCESS completo.
- I3 run `34420928503`: intent exacto, guard y checkout del sucesor SUCCESS; el log registró `SOURCE_SHA=1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- Acceso a Firebase Hosting existente: PASS antes de cualquier build/deploy.

Esto probó que el mecanismo de autoridad/lineage ya no reconstruía el `certifiedCandidate` anterior cuando existía un `nextCandidate` causal.

## 8. Fallo del primer I3 sucesor y clasificación

El run `34420928503` falló antes de materializar el paquete y antes de desplegar Preview por un defecto del executor: `Path(...).read()` no existe para `pathlib.Path`.

Clasificación: `I3_EXECUTOR_PACKAGE_PREP_PATH_READ_METHOD_ERROR`.

El fix quedó en commit `bf964736f2f7d87d64e7a39e3f5c30f28946e955`, cambiando únicamente `read()` por `read_text()` en `.github/workflows/gravicentra-recovery-i3-preview-v2.yml`.

No se generó otro source de producto. El mismo `1e6a6ca3...` se preservó. El fallo del executor se resolvió dentro de I3.

## 9. Reintento controlado I3-R2

El reintento usó exactamente el mismo source y tree ya aprobados en I2:

- Source: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`.
- Tree: `d6e6857c9cd48d20db6000db02cbba3a00f26018`.
- Intent: `I3-SUCCESSOR-ASEGURADORAS-TENANT-RUNTIME-20260909-R2`.

## 10. Cierre físico I3 del sucesor

El reintento final fue run `34423252469` y cerró SUCCESS de extremo a extremo:

- intent no autoritativo exacto: PASS;
- Control Plane guard: PASS;
- checkout del sucesor exacto: PASS;
- preflight de dependencias: PASS;
- paquete frontend/backend inmutable: PASS;
- Hosting Preview aislado: PASS;
- readback exacto: `202/202` archivos;
- source: `1e6a6ca3d259d0e5e644f716a2f71c6e0107efc4`;
- build: `gi-i3-1e6a6ca3d259-57f234755dc1`;
- Preview: `https://ays-orbit-360-lab--gi-i3-34423252469-ybf4i1dw.web.app`;
- artifact: `10131707259`;
- artifact digest: `sha256:6a5975b3fd1e02332989fb91d4e723153b981af839d27227721a0bf2986a804f`;
- hosted payload digest: `7c47fe1b87e4f6ee3cea571d406d60f4de14ea5fddd7cdec3867c01ab852eb37`;
- backend source digest: `b317ee5d6c7346bdb0abfa6bb71b5f246cd7647ed7272551065c2053f497f805`;
- producción tocada: false;
- datos tocados: false;
- writes operativos: 0.

El guard central del mismo HEAD fue run `34423252383`: SUCCESS.

Por tanto I3 del sucesor está físicamente recertificado y el gate activo retorna a I4A.

## 11. Freeze del mecanismo

A partir de este cierre, el mecanismo operativo vigente queda identificado como `GRAVICENTRA_RECOVERY_MECHANISM_V3_20260909` y estado `FROZEN` en `CONTROL_PLANE.json`.

La regla de no-retroceso queda explícita: I2/I3 solo vuelven a activarse si aparece un source de producto nuevo distinto del certificado y existe una causa reproducible que exige ese cambio. Un fallo de executor, QA sin cambio de source, documentación, IAM, cuotas o conversación no autoriza por sí mismo volver a I2/I3.

Las capacidades no afectadas conservan su lineage y evidencia. Los bugs se resuelven dentro del gate activo. No se crean iteraciones o metodologías paralelas.

El detalle rector del freeze queda materializado en `artifacts/orbit360-recovery/release-control/MECHANISM_FREEZE_V3_20260909.md`.

## 12. Estado de salida

- I0: PASS.
- I1: PASS.
- I2 sucesor: PASS, run `34420740707`.
- I3 sucesor: PASS, run `34423252469`.
- I4A: IN_PROGRESS.
- I4B: PENDING.
- I5: PENDING.
- Porcentaje certificado hacia producción: 57.1%.

Siguiente acción única: ejecutar I4A autoritativo sobre el Preview certificado del sucesor y cerrar solo la evidencia faltante, sin reabrir capacidades no afectadas.
