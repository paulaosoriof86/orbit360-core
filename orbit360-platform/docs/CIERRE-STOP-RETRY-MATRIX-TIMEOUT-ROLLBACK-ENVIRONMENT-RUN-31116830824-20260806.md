# CIERRE STOP_RETRY — MATRIZ TIMEOUT Y ROLLBACK BLOQUEADO POR ENTORNO

Fecha: 2026-08-06 10:50 GT  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Contrato: `2.7.8`  
Run principal: `31116830824`  
PR transporte: #20  
Rama: `ays/backend-tenant-lab-v99-20260703`

## Bloque

Bloque 2.7 — matriz visual corregida post-Auth LAB.

## Carriles

- Carril A — UX/Academia: precheck visual aprobado; matriz multirol no completada.
- Carril B — backend/seguridad: contrato, Auth observable, membership y Hosting LAB ejecutados dentro de límites autorizados.
- Carril C — datos A&S: una lectura de membership; cero escrituras y cero reimportación.

## Fuente/base

- HEAD autorizado: `86249253b6a69ead228a5dc1baec71aa82702e13`.
- Lifecycle padre exclusivo: `fed4daad7621ccf68bc958df6b41d2714761b2fe`.
- Request hijo exclusivo: `0a53acd815e10c3283d899b11bac61c88bcd3bff`.
- Transporte exclusivo: `26e8297747acdac7e4a819a53607f2bc8882f33d`.

## Avance visible

1. Cuatro prerequisitos source-only aprobados: 39/39, 18/18, 24/24 y 24/24.
2. `GO_GATE_CONTRACT`: 28/28 PASS antes de secretos.
3. Backup Hosting creado: `visual-matrix-corrected-backup-31116830824`.
4. Único deploy Hosting LAB autorizado: PASS.
5. Precheck observable: `PASS_VISUAL_BROWSER_PRECHECK / INICIO_READY_PASS`.
6. Auth dentro de la plataforma, membership ready/tenant-bound, ruta Inicio, rootfix cargado y cero errores de consola.

## Primer fallo real

```txt
CLASIFICACION: PIPELINE_MECHANISM_FAILURE
ETAPA: FULL_VISUAL_MATRIX
CHECKPOINT: FULL_MATRIX_PROCESS_TIMEOUT_NO_INCREMENTAL_EVIDENCE
```

El proceso Node de la matriz permaneció activo hasta el timeout de 45 minutos. GitHub canceló externamente `bash`, `node` y `headless_shell`. El runner no tenía:

- watchdog por rol/viewport menor que el timeout global;
- evidencia durable incremental antes y después de cada rol;
- `trap` de `TERM/INT/EXIT` para rollback y persistencia cuando la cancelación es externa;
- presupuesto reservado de rollback fuera del tiempo de matriz.

La cancelación omitió `stop()`, sellado final, consumo automático del request y rollback.

## Rollback

El backup existe y la restauración estaba autorizada, pero no pudo ejecutarse:

- run `31119868662`, PR #21: cancelado antes de steps porque el timeout de 15 minutos se consumió en cola;
- run `31120848942`, PR #22: fallo en `Set up job`; GitHub devolvió `Service Unavailable` al resolver `actions/checkout@v4` tras reintentos.

La misma familia de entorno/setup falló dos veces. Se aplicó `STOP_RETRY`; no se crea un tercer workflow.

## Estado de Hosting

```txt
BACKUP: PASS
DEPLOY HOSTING LAB: 1 PASS
ROLLBACK: NO EJECUTADO
HOSTING LAB RESTAURADO: NO
ULTIMA OPERACION CONFIRMADA: DEPLOY V6 RELEASE COMPLETE
```

No se afirma que Hosting esté restaurado. El último estado comprobable es la versión v6 desplegada.

## Integridad y límites

- Firestore reads: 1.
- Firestore writes: 0.
- Auth writes: 0.
- Operational writes: 0.
- Functions deploys: 0.
- Rules deploys: 0.
- Reimportación: 0.
- Producción/main/merge: 0.
- Capturas publicadas: 0.
- Integridad final: `NOT_VERIFIED_FINAL`.
- `PASS_VISUAL_POST_AUTH`: NO.

## Estado final

- request v6: consumido;
- lifecycle: `STOP_RETRY_MATRIX_TIMEOUT_ROLLBACK_ENVIRONMENT`;
- `allowedExecutions`: 0;
- replay: prohibido;
- Cobros 4.1: pausado;
- PR #5: permanece draft/open y sin merge.

## Causa raíz y solución

La causa raíz no es Auth, membership, datos, hidratación ni Inicio: todos alcanzaron PASS observable. La causa raíz está en el mecanismo de ejecución de la matriz y su manejo de cancelación externa.

Solución source-only antes de cualquier reapertura:

1. watchdog por rol y viewport;
2. checkpoints y JSON incremental por cada etapa;
3. artefactos parciales persistidos durante la ejecución;
4. `trap TERM INT EXIT` fail-closed;
5. rollback idempotente signal-safe;
6. presupuesto separado: matriz < timeout del job, dejando margen explícito para rollback y sellado;
7. prueba sintética que mate el proceso y demuestre rollback/persistencia.

## Siguiente acción exacta

No crear otro run runtime ni rollback. Corregir y probar source-only el watchdog, la evidencia incremental y el rollback signal-safe. Solo después, y cuando GitHub Actions esté estable, solicitar una nueva autorización controlada de recuperación y matriz.
