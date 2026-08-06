# Estado vivo PR #5 — sourcefix signal-safe

Fecha: 2026-08-06 11:03 GT

## Identidad

- Rama: `ays/backend-tenant-lab-v99-20260703`.
- HEAD al cierre sourcefix: `dfed1369f65a01155dc6bfa7e4236f6e85d62570`.
- PR #5: draft/open, sin merge.
- Producción/main/merge: no autorizados.

## Estado funcional observado

- Auth, membership, tenant, Inicio y precheck: PASS en run `31116830824`.
- Matriz multirol: no completada.
- `PASS_VISUAL_POST_AUTH`: NO.
- snapshot final: `NOT_VERIFIED_FINAL`.

## Hosting LAB

- backup existente: `visual-matrix-corrected-backup-31116830824`;
- deploy v6: 1 PASS;
- rollback: no ejecutado;
- último estado confirmado: versión v6 viva;
- no afirmar restauración a versión previa.

## Sourcefix de causa raíz

```txt
PASS_VISUAL_MATRIX_TIMEOUT_SIGNAL_SAFE_SOURCE
48/48 PASS
```

Implementado:

- watchdog por rol;
- watchdog por checkpoint inactivo;
- presupuesto global acotado;
- evidencia durable incremental;
- traps TERM/INT/HUP/EXIT;
- rollback y persistencia exactamente una vez;
- runner v2 bloqueado por defecto sin autorización;
- tiempo reservado para recuperación.

## Límites del bloque

- secrets: 0;
- Firestore reads/writes: 0/0;
- Auth writes: 0;
- operational writes: 0;
- browser: 0;
- Hosting/deploy: 0;
- Functions/Rules: 0;
- reimportación: 0;
- producción/main/merge: 0.

## Estado de autorización

- request v6: consumido;
- allowedExecutions: 0;
- replayAllowed: false;
- lifecycle: `STOP_RETRY_SOURCEFIX_PASS_PENDING_EXPLICIT_RECOVERY_AUTHORIZATION`;
- runtime/browser/deploy/secrets: no autorizados.

## Siguiente acción exacta

Verificar disponibilidad estable de GitHub Actions. Después, únicamente con autorización explícita nueva e inmutable ligada al HEAD vigente, preparar una recuperación controlada de Hosting y la matriz supervisada usando exclusivamente el runner v2. No reutilizar los runs `31116830824`, `31119868662` ni `31120848942`.
