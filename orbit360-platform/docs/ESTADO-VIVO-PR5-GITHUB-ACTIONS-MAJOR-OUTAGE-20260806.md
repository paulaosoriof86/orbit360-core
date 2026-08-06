# Estado vivo PR #5 — diagnóstico estratificado y ejecutor local — 2026-08-06

## Corrección forense

La captura de configuración confirma que `Permitir todas las acciones y flujos de trabajo reutilizables` ya estaba seleccionado. La hipótesis de permisos deshabilitados queda retirada.

El incidente de GitHub Actions fue evidencia externa válida para los fallos de cola y `Service Unavailable`, pero no explica el timeout interno original de la matriz y no se usa como dependencia para continuar.

## Causas separadas

```text
1. DATA_CONTRACT_FAILURE
   asesores legacy bloqueaba readiness
   estado: corregido source-only

2. PIPELINE_MECHANISM_FAILURE
   matriz sin watchdog/evidencia incremental/traps
   estado: corregido 48/48 + 24/24

3. ENVIRONMENT_FAILURE
   cola/Service Unavailable/dispatch degradado de Actions
   estado: proveedor externo; bypass local seleccionado
```

## Producto

```text
GO_GATE_CONTRACT: 28/28 PASS
Auth/membership/tenant/Inicio: PASS
precheck visual: PASS
sourcefix signal-safe: 48/48 PASS
sourcefix cross-runner: 24/24 PASS
matriz completa: pendiente
PASS_VISUAL_POST_AUTH: NO
snapshot final: NOT_VERIFIED_FINAL
Cobros 4.1: pausado
```

## Ruta inmediata sin Actions

Se selecciona el ejecutor local Windows autenticado, usando worktree aislado y el mismo runner v3:

```text
tools/orbit360-launch-local-windows-source-only-v20260806.cmd
tools/orbit360-preflight-local-windows-source-only-v20260806.mjs
tools/orbit360-jq-contract-shim-v20260806.mjs
tools/orbit360-test-jq-contract-shim-v20260806.mjs
```

El preflight local es source-only. No lee el valor de la credencial, no abre navegador, no toca Hosting y no despliega. Comprueba herramientas, HEAD remoto, request anterior consumido, shim de contratos, 24/24 cross-runner, 48/48 signal-safe, Firebase CLI y visibilidad del proyecto LAB.

## Gate de decisión

Solo con `PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT` se crea un nuevo request local-runtime inmutable ligado al HEAD observado.

La ejecución macro posterior incluirá una sola vez:

1. GO_GATE_CONTRACT;
2. restauración del backup v6;
3. backup previo;
4. máximo un deploy Hosting LAB;
5. precheck;
6. matriz Dirección/Operativo/Asesor;
7. snapshot final;
8. rollback signal-safe ante fallo;
9. evidencia sanitizada.

No se crean nuevos canarios Actions y no se reutiliza el request v6 consumido.
