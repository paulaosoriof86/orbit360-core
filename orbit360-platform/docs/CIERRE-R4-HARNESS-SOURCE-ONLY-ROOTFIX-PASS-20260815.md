# CIERRE R4 · ROOTFIX SOURCE-ONLY DEL HARNESS · PASS · 2026-08-15

Estado: **RECUPERACIÓN DEL MECANISMO CERRADA / BROWSER PRODUCTIVO AÚN CONGELADO / AUTH TODAVÍA SIN CLASIFICAR**.

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR #5: draft/open · sin merge  
Producto certificado R3: intacto  
Rootfix control-plane: `442ca5fc5a6ca6f70e7607daaa108ee0b84d8956`

## Causa que se corrigió

La primera frontera R4 no pudo clasificar producto ni Auth porque el harness permitía operaciones asíncronas sin watchdog de etapa y escribía su evidencia final únicamente al terminar. Node/Chromium permanecieron vivos hasta el timeout externo del job.

Clasificación original:

`PIPELINE_MECHANISM_FAILURE / R4_HARNESS_UNBOUNDED_BROWSER_AWAIT_AND_FINAL_ONLY_EVIDENCE`

No se modificó Auth ni producto para resolverla.

## Implementación

Se modificaron únicamente:

- `tools/orbit360-r4-production-readonly-smoke-v20260815.mjs`;
- `.github/workflows/orbit360-r4-production-readonly-smoke-v20260815.yml`.

El freeze `ORBIT360_R4_SOURCE_ONLY_RECOVERY=true` permaneció activo.

Se incorporó:

1. deadline global interno de 480000 ms;
2. timeouts por stage y wrapper bounded para operaciones browser-side;
3. `currentStage` y checkpoints sanitizados persistidos incrementalmente;
4. evidencia parcial antes y después de manifest, asset Auth, login HTTP, Auth, membership, runtime y grupos rol/ruta;
5. salida terminal ante timeout o señal;
6. cierre de browser bounded;
7. watchdog sintético forced-hang source-only;
8. cálculo del SHA-256 esperado de `orbit360-platform/core/auth.js` desde el source R3 certificado y comparación con el asset servido antes de diagnosticar credenciales.

## Evidencia source-only

Workflow: `Orbit360 R4 Production Readonly Smoke 20260815`  
Run: `31907519696`  
Job: `95067552998`  
Artifact: `9252752191`  
Digest artifact: `sha256:ffcf24398a445fdc13cc80b9ac2d91fa151b5fd7731d5b6510fadf1087a65421`

Resultado: **SUCCESS**.

Pasos:

- canonical source gate: PASS;
- bounded harness source-only: PASS;
- install: skipped;
- protected secret bind: skipped;
- identity resolver: skipped;
- production browser: skipped;
- cleanup: PASS;
- artifact upload: PASS.

El watchdog sintético dejó:

- `status=R4_HARNESS_SOURCE_ONLY_WATCHDOG_PASS`;
- `classification=PASS`;
- `stageTimeoutObserved=true`;
- `evidencePersistedBeforeTimeout=true`;
- timeout forzado: 120 ms;
- `productionTouched=false`;
- `containsPII=false`;
- `containsSecrets=false`;
- `firestoreWrites=0`;
- `authWrites=0`;
- `operationalWrites=0`.

El preflight dejó `PASS_GATE_CONTRACT_SOURCE_FASE_A_OPS_LEADS_CRM`, `secretAccessAuthorized=false`, `runtimeExecuted=false`, `browserExecuted=false`, `deployExecuted=false`, `productionTouched=false`.

## Qué demuestra

Demuestra que el mecanismo ahora puede cortar una operación que no resuelve y persistir la etapa alcanzada antes de perder el control del job.

Demuestra también que la recuperación se validó sin secretos, sin Firebase/Firestore, sin Playwright productivo, sin navegador y sin tocar producción.

## Qué todavía NO demuestra

No demuestra todavía:

- si la credencial del actor productivo es aceptada por Auth HTTP;
- si el mensaje humano fue causado por contraseña, `emailVerified`, membership, tenant, runtime o asset servido;
- PASS funcional de Inicio/Cliente 360/Aseguradoras/Ops/Leads en producción;
- `POST_GO_LIVE_SMOKE_PASS`.

Por tanto, el intento humano de Paula continúa **sin clasificación automática válida** hasta la segunda frontera.

## Gate anti-bucle

No se ejecutará el segundo browser en esta misma iteración.

La siguiente frontera debe reutilizar el mismo harness recuperado, no crear otro parche. Debe detenerse en la primera causa clasificada y sincronizar evidencia antes de cualquier corrección funcional.

Si reaparece la misma familia de fallo del mecanismo, aplica `STOP_RETRY`; no existe tercer intento de esa familia.

## Siguiente acción exacta

En la siguiente iteración: conservar el gate canónico y activar exactamente una segunda frontera productiva read-only. Orden de clasificación:

`manifest -> hash core/auth.js -> login HTTP -> Auth projection -> emailVerified -> membership -> tenant -> runtime -> Dirección/Operativo/Asesor -> rutas`.

Sin cambios de producto, Auth, usuarios, memberships, datos, paquete, HostDime, main ni merge antes de esa evidencia.

## Avance

Permanece hasta cerrar R4:

- funcional: 100%;
- técnico: 75%;
- gates: 67% (2/3).
