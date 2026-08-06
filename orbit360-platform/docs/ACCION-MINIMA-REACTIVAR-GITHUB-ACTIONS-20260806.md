# Acción mínima para reactivar GitHub Actions — 2026-08-06

## Diagnóstico confirmado

- Orbit 360: canarios Ubuntu crearon run pero no recibieron runner.
- Orbit 360: failover macOS no creó run.
- `demoCXOrbia`: control-plane externo con workflow preexistente en rama base tampoco creó run.
- El bloqueo está fuera del código de Orbit y antes de asignar runner.

## Única intervención manual necesaria

En GitHub:

1. Abrir `paulaosoriof86/orbit360-core`.
2. Entrar a `Settings`.
3. En el menú izquierdo abrir `Actions` → `General`.
4. En `Actions permissions`, seleccionar `Allow all actions and reusable workflows`.
5. Confirmar que las acciones creadas por GitHub estén permitidas, especialmente `actions/checkout`.
6. Guardar.
7. Si aparece el mensaje `GitHub Actions is currently disabled for this repository` o `for your account`, tomar captura; en ese caso el restablecimiento requiere revisión de GitHub Support.

La misma verificación debe hacerse en `demoCXOrbia` solo si Orbit continúa sin crear run después de guardar.

## Reanudación automática preparada

Una vez habilitado Actions:

1. reabrir un único control-plane source-only;
2. exigir 24/24 cross-runner y conservar 48/48 signal-safe;
3. cerrar sin merge;
4. emitir autorización runtime nueva ligada al HEAD vigente;
5. ejecutar recuperación Hosting + matriz completa con runner v3;
6. continuar hacia producción únicamente con `PASS_VISUAL_POST_AUTH`.

No crear canarios paralelos ni repetir los runs anteriores.
