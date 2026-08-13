# Cierre rootfix bootstrap segmentado Block 1 — 2026-08-11

## Bloque
Block 1 — Cliente 360 + Aseguradoras. Gate `block1-client360-insurers-lab-v20260717`, contrato `1.0.41`.

## Insumo nuevo
Runtime `31507467271`, job `93832609938`, HEAD `df9ea2ec9afcbaa33e07200247fdd7834b926fec`.

## Clasificación
`PIPELINE_MECHANISM_FAILURE`.

## Evidencia del STOP
- request parent-bound: PASS;
- gate canónico antes de secretos: PASS;
- sourcefix anti-bucle previo: PASS;
- `GO_GATE_CONTRACT_BLOCK1_FINAL_VISUAL`: PASS;
- safety backup: PASS;
- baseline restore: PASS;
- máximo un deploy Hosting LAB: cumplido, deploys = 1;
- precheck: `INICIO_READY_PASS`;
- Dirección desktop: 0 fallos, 0 warnings;
- Operativo tablet: 0 fallos, 0 warnings;
- Asesor móvil: no inició autenticación; el STOP ocurrió en `ASESOR_PAGE_GOTO`;
- snapshot: `VERIFIED_UNCHANGED`;
- rollback: success;
- Firestore/Auth/operational writes: 0;
- Functions/Rules/reimport/producción/main/merge: 0.

## Causa raíz
El harness inicializaba cada rol mediante un `page.goto(..., waitUntil:'domcontentloaded', timeout:45000)` monolítico. El HTML de LAB carga SDK externos mediante `document.write`; una demora en un recurso externo puede impedir `DOMContentLoaded` aunque el documento principal y el formulario inicial ya hayan empezado a llegar. Como el `page.goto` estaba antes del `try/finally` del rol, el tercer contexto podía abortar sin cierre propio y sin registrar respuesta principal o `requestfailed` que permitiera distinguir documento, SDK o readiness.

No existe evidencia de defecto funcional de Dirección, Operativo, Cliente 360, Aseguradoras, Auth o scope derivada de este STOP. Tampoco existe evidencia suficiente para atribuirlo a un recurso externo específico; por eso no se reclasifica como `ENVIRONMENT_FAILURE` puro.

## Rootfix source-only
Implementación owner: `tools/orbit360-block1-final-native-matrix-v20260811.mjs`.

Nuevo contrato:
- owner bootstrap: `document-commit-login-form-firebase-readiness-segmented`;
- navegación inicial espera `commit`, no `DOMContentLoaded`;
- checkpoints independientes para documento principal, formulario de login, SDK Firebase, Auth y readiness;
- `requestfailed` sanitizado y HTTP principal observables;
- cierre del browser context garantizado si el bootstrap falla antes de `testRole`;
- clasificación HTTP >= 400 del documento como `ENVIRONMENT_FAILURE`;
- timeouts de bootstrap/SDK como `PIPELINE_MECHANISM_FAILURE` con evidencia de recursos fallidos;
- prueba sintética source-only: documento commit 120 ms, formulario 180 ms, recurso externo 60 s y antiguo límite DOMContentLoaded 45 s; el contrato segmentado debe PASS sin navegador/red/runtime.

## Pruebas
Source run `31511172569`: PASS.
- gate canónico: PASS;
- universe: PASS vigente;
- sintaxis/owners: PASS;
- fixture anti-bucle previo: PASS;
- nuevo `bootstrapSyntheticPass`: PASS mediante `ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY=1`;
- secretos/Firebase/browser/Hosting/runtime/writes: 0.

## Contrato runtime futuro
Request nuevo y no reutilizable:
`.github/orbit360-requests/block1-final-visual-bootstrap-segmented-v20260811-authorization.json`

Versión:
`20260811.block1-final-visual-bootstrap-segmented`

Workflow:
`.github/workflows/orbit360-block1-final-visual-runtime-bootstrap-segmented-v20260811.yml`

El runtime futuro exige `bootstrapSyntheticPass:true` y los owners segmentados antes de secretos. Mantiene un solo request, un solo intento, máximo un deploy Hosting LAB, rollback ante STOP, snapshot idéntico, cero writes y producción/main/merge prohibidos.

## Carriles
A — frontend/UX: producto no modificado; Dirección y Operativo demostraron PASS en runtime anterior; Asesor pendiente únicamente de nueva ejecución completa.

B — backend/control-plane: rootfix del harness + contrato source/runtime segmentado.

C — datos: snapshot invariante; no reimportación ni mutaciones.

## Claude / Academia
`REPLICABLE_CLAUDE_ACUMULADO`: separar navegación de documento, dependencias externas y readiness; no usar `DOMContentLoaded` como condición indivisible en pruebas con loaders síncronos externos.

`ACADEMIA_ACTUALIZAR`: distinguir `FUNCTIONAL_DEFECT`, `ENVIRONMENT_FAILURE` y `PIPELINE_MECHANISM_FAILURE`; un timeout del harness no demuestra por sí solo un defecto del producto.

## Estado
`SOURCE_PASS_AWAITING_FRESH_EXCLUSIVE_REQUEST`.

No repetir run `31507467271`, no reutilizar request anterior y no ejecutar runtime sin autorización humana fresca.
