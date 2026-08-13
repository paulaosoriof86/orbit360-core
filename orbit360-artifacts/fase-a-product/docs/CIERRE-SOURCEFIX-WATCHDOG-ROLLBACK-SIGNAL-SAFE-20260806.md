# CIERRE SOURCE-ONLY — WATCHDOG Y ROLLBACK SIGNAL-SAFE

Fecha: 2026-08-06 11:03 GT  
Gate: `block2.7-visual-matrix-corrected-post-auth-lab-v20260805`  
Contrato base: `2.7.8`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## Clasificación

- causa primaria corregida: `PIPELINE_MECHANISM_FAILURE`;
- entorno de rollback previo: `ENVIRONMENT_FAILURE`;
- alcance de este bloque: source-only;
- runtime, secretos, Firebase, navegador, Hosting, datos y producción: no ejecutados.

## Causa raíz confirmada

El proceso de matriz escribía checkpoints incrementales, pero el runner no los supervisaba. Un child process podía permanecer activo hasta agotar el timeout global. Cuando GitHub enviaba una cancelación externa, el shell terminaba sin pasar por `stop()`, por lo que no se garantizaban rollback, persistencia ni sellado.

## Implementación

1. `orbit360-supervise-visual-matrix-signal-safe-v20260806.mjs`
   - watchdog por rol;
   - watchdog por inactividad de checkpoints;
   - presupuesto global de matriz;
   - terminación `SIGTERM` y escalamiento `SIGKILL`;
   - evidencia durable y atómica ante cada transición.
2. `orbit360-runtime-signal-safe-lib-v20260806.sh`
   - traps `TERM`, `INT`, `HUP` y `EXIT`;
   - rollback exactamente una vez;
   - persistencia exactamente una vez.
3. `orbit360-run-visual-matrix-corrected-post-auth-runtime-only-v2-v20260806.sh`
   - bloqueado por defecto con `SOURCE_ONLY_NOT_AUTHORIZED`;
   - estado durable antes y después de backup/deploy;
   - matriz limitada a 20 minutos y wrapper externo de 22 minutos;
   - ocho minutos reservados para rollback;
   - supervisor obligatorio antes de aceptar PASS.
4. Validador sintético reproducible y workflow source-only sin secretos.

## Evidencia

```txt
PASS_VISUAL_MATRIX_TIMEOUT_SIGNAL_SAFE_SOURCE
48/48 PASS
```

La prueba sintética demostró:

- un rol detenido termina en `ROLE_TIMEOUT_DIRECCION`;
- el supervisor sale fail-closed;
- una señal `TERM` produce código 143;
- rollback: 1 llamada;
- persistencia: 1 llamada;
- Firestore/Auth/operational writes: 0;
- secrets/Firebase/browser/deploy/production: 0.

## Estado protegido

- request v6: consumido;
- allowedExecutions: 0;
- replay: prohibido;
- lifecycle: continúa congelado;
- Hosting LAB: no restaurado; último estado confirmado = deploy v6 vivo;
- `PASS_VISUAL_POST_AUTH`: NO;
- Cobros 4.1: pausado.

## Siguiente acción exacta

No ejecutar matriz ni crear otro rollback con la autorización consumida. Verificar primero disponibilidad estable de GitHub Actions y preparar una autorización nueva, inmutable y no superpuesta para recuperación controlada de Hosting y posterior matriz supervisada. El nuevo bloque debe usar exclusivamente el runner v2 y no puede reutilizar los runs `31116830824`, `31119868662` o `31120848942`.
