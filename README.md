# orbit360-core

Repositorio de Orbit 360.

Fuentes operativas vigentes:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/AUDITORIA-FORENSE-DIAGNOSTICO-Y-EJECUTOR-LOCAL-20260806.md`;
4. estado vivo del PR #5.

RC activa: `RC-AYS-LAB-CANONICA-01`.

## Estado confirmado

```text
GO_GATE_CONTRACT: 28/28 PASS
Auth/membership/tenant/Inicio: PASS
precheck visual: PASS
signal-safe sourcefix: 48/48 PASS
cross-runner portable: 24/24 PASS
matriz completa: pendiente
PASS_VISUAL_POST_AUTH: NO
```

El request v6 está consumido y no se reutiliza. El timeout interno fue un `PIPELINE_MECHANISM_FAILURE` corregido. Los fallos posteriores de GitHub Actions se excluyen de la ruta crítica mediante el ejecutor local Windows.

Ruta inmediata:

```text
tools/orbit360-launch-local-windows-source-only-v20260806.cmd
tools/orbit360-preflight-local-windows-source-only-v20260806.mjs
```

El preflight usa worktree aislado, verifica HEAD remoto, herramientas, shim de contratos, 24/24 + 48/48, Firebase CLI, visibilidad LAB y presencia de credencial sin leerla. No abre navegador, no despliega y no toca datos.

Solo con `PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT` corresponde crear un nuevo request local-runtime inmutable y ejecutar un único bloque macro de recuperación Hosting + matriz completa.

## Cobros

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

No reutilizar requests consumidos ni ejecutar producción, main, merge, Rules, reimportación o despliegues sin autorización explícita y gate correspondiente.
