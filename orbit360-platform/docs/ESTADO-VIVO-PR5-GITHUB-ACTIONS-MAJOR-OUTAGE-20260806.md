# Estado vivo PR #5 — diagnóstico estratificado y ejecutor local — 2026-08-06

La secuencia tuvo tres causas separadas: `DATA_CONTRACT_FAILURE` de readiness ya corregido; `PIPELINE_MECHANISM_FAILURE` de la matriz ya corregido con 48/48 y 24/24; y `ENVIRONMENT_FAILURE` posterior de GitHub Actions, que se excluye de la ruta crítica mediante el ejecutor local Windows.

La captura de configuración demuestra que Actions permitía todos los workflows. Auth tampoco es la causa actual: `GO_GATE_CONTRACT 28/28`, Auth, membership, tenant, Inicio y precheck obtuvieron PASS.

Estado pendiente: matriz completa, snapshot final y `PASS_VISUAL_POST_AUTH`. El request v6 está consumido y no se reutiliza. Cobros 4.1 continúa pausado.

Ruta inmediata:

```text
tools/orbit360-launch-local-windows-source-only-v20260806.cmd
tools/orbit360-preflight-local-windows-source-only-v20260806.mjs
```

El preflight usa worktree aislado, verifica HEAD remoto, herramientas, shim de contratos, 24/24 + 48/48, Firebase CLI, visibilidad LAB y presencia de credencial sin leerla. No abre navegador, no despliega y no toca datos.

Solo con `PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT` corresponde crear un nuevo request local-runtime inmutable ligado al HEAD observado y ejecutar un único bloque macro de recuperación Hosting + matriz completa.
