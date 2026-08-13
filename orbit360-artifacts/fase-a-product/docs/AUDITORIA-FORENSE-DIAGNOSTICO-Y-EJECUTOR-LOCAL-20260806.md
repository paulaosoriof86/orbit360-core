# Auditoría forense — diagnóstico y ejecutor local — 2026-08-06

## Alcance

Auditoría read-only/source-only para separar fallos funcionales, mecanismo de pipeline y entorno proveedor, y definir una ruta de ejecución que no dependa de GitHub Actions.

Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open  
RC: `RC-AYS-LAB-CANONICA-01`

## Veredicto ejecutivo

No existe una única causa raíz para toda la secuencia. Existen tres capas distintas:

### 1. Defecto funcional previo — corregido en fuente

```text
DATA_CONTRACT_FAILURE
legacy asesores bloqueaba readiness de Inicio
```

Se corrigió mediante contrato required/optional transversal. Validación source-only: 24/24 PASS.

### 2. Defecto del mecanismo de matriz — corregido en fuente

```text
PIPELINE_MECHANISM_FAILURE
FULL_MATRIX_PROCESS_TIMEOUT_NO_INCREMENTAL_EVIDENCE
```

El runner anterior no tenía watchdog por rol, evidencia incremental ni traps signal-safe. GitHub canceló el proceso y se omitieron sealing y rollback.

Correctivos cerrados:

```text
signal-safe: 48/48 PASS
cross-runner portable: 24/24 PASS
watchdog por rol/checkpoint
persistencia incremental
TERM/INT/HUP/EXIT
rollback y persistencia exactamente una vez
timeout portable Node
Linux/macOS/Windows local preparados
```

### 3. Falla externa posterior — confirmada por proveedor

```text
ENVIRONMENT_FAILURE
GITHUB_ACTIONS_MAJOR_OUTAGE_ACTIVE
incidentId: qcvjkzcs7j74
```

La configuración del repositorio ya permitía todas las acciones y workflows reutilizables. La hipótesis de permisos deshabilitados queda retirada.

Los canarios Ubuntu #23 y #24 sí crearon runs, pero permanecieron sin steps y agotaron la cola. Esta es la evidencia interna más fuerte de indisponibilidad del proveedor. Los intentos posteriores sin run son consistentes con webhooks/dispatch degradados, pero no se usan por sí solos para inferir permisos de cuenta.

## Hallazgos de control metodológico

1. El outage de Actions explica la cola, Service Unavailable y dispatch degradado posteriores; no explica por sí solo el timeout interno de la matriz original.
2. Auth no es causa del bloqueo actual: `GO_GATE_CONTRACT 28/28`, Auth/membership/tenant/Inicio y precheck obtuvieron PASS.
3. No corresponde reimportar datos, cambiar Rules, modificar Auth o reconstruir readiness.
4. El request v6 está consumido, con `allowedExecutions=0` y `replayAllowed=false`; no se reutiliza.
5. Hosting LAB conserva como última operación confirmada el deploy v6; el backup `visual-matrix-corrected-backup-31116830824` existe y el rollback no fue ejecutado.
6. La matriz completa y snapshot final siguen pendientes; `PASS_VISUAL_POST_AUTH=NO`.
7. Cobros 4.1 continúa pausado; siete cobros observados no equivalen a conciliación completa.

## Alternativas auditadas

### GitHub Actions hosted runner

No viable durante el incidente activo.

### Self-hosted runner registrado en Actions

No elimina completamente el riesgo actual: GitHub informa errores/rate limiting al registrar runners autohospedados durante el incidente.

### GitHub Codespaces

Servicio separado y potencialmente operativo, pero no existe evidencia vigente de que tenga los secretos LAB necesarios. Requeriría aprovisionar credenciales nuevas y no es la ruta más corta.

### Ejecutor local Windows autenticado — seleccionado

Existe evidencia histórica de ejecución local exitosa con:

- repositorio local Orbit 360;
- Git/Node/npm/Git Bash;
- Firebase CLI autenticado;
- acceso al proyecto `ays-orbit-360-lab`;
- credencial de servicio LAB;
- Playwright y navegador;
- worktrees aislados;
- gates y validación visual.

Esta ruta no depende de GitHub Actions ni de runners alojados.

## Implementación preparada

```text
tools/orbit360-preflight-local-windows-source-only-v20260806.mjs
tools/orbit360-launch-local-windows-source-only-v20260806.cmd
tools/orbit360-jq-contract-shim-v20260806.mjs
tools/orbit360-test-jq-contract-shim-v20260806.mjs
tools/orbit360-local-bin-v20260806/jq
```

El preflight:

- localiza herramientas;
- trae el HEAD remoto sin cambiar la rama de trabajo;
- crea worktree temporal;
- verifica que el request anterior esté consumido;
- ejecuta el shim de contratos;
- ejecuta 24/24 cross-runner y conserva 48/48 signal-safe;
- verifica Firebase CLI y visibilidad de LAB;
- confirma presencia de credencial sin leer su valor;
- elimina el worktree;
- genera evidencia sanitizada;
- no abre navegador, no despliega y no toca datos.

## Gate de decisión

Solo con:

```text
PASS_LOCAL_WINDOWS_SOURCE_ONLY_PREFLIGHT
```

se prepara un nuevo request local runtime, inmutable y ligado al HEAD remoto observado.

Ese único bloque macro posterior cubrirá:

1. GO_GATE_CONTRACT antes de credenciales;
2. validación de credencial LAB;
3. restauración del backup v6 a live;
4. backup previo del estado restaurado;
5. máximo un deploy Hosting LAB de la candidata vigente;
6. precheck;
7. matriz Dirección desktop, Operativo tablet y Asesor móvil;
8. evidencia incremental y snapshot final;
9. rollback signal-safe ante fallo;
10. persistencia sanitizada en la rama canónica.

## Límites

Hasta nueva autorización explícita:

```text
secrets: false
Firestore reads/writes: 0
Auth writes: 0
browser: false
Hosting: false
deploy: false
production/main/merge: false
```

## Siguiente acción exacta

Ejecutar una sola vez el launcher local source-only. No crear otro canario Actions. Con PASS, emitir una única autorización macro local-runtime ligada al HEAD observado y ejecutar recuperación + matriz sin microautorizaciones.
