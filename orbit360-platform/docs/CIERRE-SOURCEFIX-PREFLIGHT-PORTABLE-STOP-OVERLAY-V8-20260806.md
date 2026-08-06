# Cierre sourcefix — Preflight portable y STOP overlay v8

Fecha: 2026-08-06  
Rama de trabajo: `ays/sourcefix-preflight-portable-v8-20260806`  
Rama canónica destino: `ays/backend-tenant-lab-v99-20260703`  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`

## Clasificación de causa raíz

`PIPELINE_MECHANISM_FAILURE`

Dos fallos independientes bloquearon el preflight antes de secretos:

1. El router canónico no propagaba `ORBIT360_REQUEST_FILE` al motor. El motor resolvía una ruta vacía como el directorio raíz del repositorio y producía `EISDIR: illegal operation on a directory, read`.
2. El preflight y el detector del workflow dependían de `jq`, no disponible en el ejecutor local Codex.

## Implementación

- El router valida que el request exista y sea archivo antes de invocar el motor.
- El router propaga explícitamente la ruta del request.
- El router exige una versión fresca registrada y rechaza v8.
- Se añadió un overlay fail-closed que mantiene `STOP_RETRY` activo y declara v8 no reutilizable.
- Se sustituyó `jq` por un guard Node portable compartido entre preflight y workflow.
- El workflow solo reconoce `20260806.9-portable-preflight-runtime` y únicamente en un commit exclusivo del request.
- El request v8 histórico no fue reescrito; queda cerrado mediante overlay y versión esperada diferente.

## Pruebas y evidencia

- Sintaxis Node: PASS.
- Sintaxis Bash: PASS.
- Suite portable source-only: `17/17 PASS`.
- Evidencia: `orbit360-platform/runtime-gate-crm-v20260716/preflight-portable-source-test-sanitized-v20260806.json`.

## Límites observados

- Secretos leídos: 0.
- Firebase/Firestore/Auth: no accedidos.
- Firestore/Auth/operational writes: 0.
- Browser: no ejecutado.
- Hosting LAB deploys: 0.
- Functions/Rules deploys: 0.
- Producción/main/merge: no tocados.

## Estado

`PASS_SOURCE_ONLY_PORTABLE_PREFLIGHT_ROOTFIX`

Esto corrige la causa raíz source-only, pero no constituye `GO_GATE_CONTRACT`, no ejecuta la matriz visual y no desbloquea producción. `PASS_VISUAL_POST_AUTH` continúa pendiente y Cobros 4.1 continúa pausado.

## Siguiente acción exacta

Requiere autorización fresca separada para runtime v9. Tras esa autorización debe crearse primero una activación source-only ligada al HEAD vigente que cierre el overlay, actualice lifecycle y registre la versión v9; después, en un commit exclusivo e inmutable, se crea el request v9. Solo si el preflight produce `GO_GATE_CONTRACT` observable se permite abrir secretos, restaurar Hosting LAB, crear backup, ejecutar máximo un deploy y correr la matriz read-only.
