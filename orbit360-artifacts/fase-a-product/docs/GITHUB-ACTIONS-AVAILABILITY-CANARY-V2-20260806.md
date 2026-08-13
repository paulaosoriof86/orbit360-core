# GitHub Actions availability canary v2

Fecha: 2026-08-06 12:06 GT  
PR temporal: #24  
Run: `31124256674`  
Job: `92691463076`

## Objetivo

Comprobar, sin riesgo, si GitHub Actions podía asignar runner, ejecutar `actions/checkout@v4`, validar sintaxis y completar la prueba source-only 48/48 del watchdog y rollback signal-safe.

## Alcance

- un solo cambio no funcional en el workflow source-only;
- cero secretos;
- cero Firebase, Firestore o Auth;
- cero navegador;
- cero Hosting o deploy;
- cero producción, main o merge.

## Resultado

```txt
run: completed / failure
job: completed / cancelled
steps: 0
logs: no disponibles
checkout: no ejecutado
validación 48/48 en Actions: no ejecutada
cola observada: 949 segundos
```

El PR #24 se cerró sin merge al alcanzar el mismo umbral de control aplicado al canario anterior. GitHub propagó posteriormente el cierre como `failure/cancelled` sin crear logs ni ejecutar steps.

## Clasificación

```txt
ENVIRONMENT_FAILURE
RUNNER_QUEUE_UNAVAILABLE
```

Este resultado no contradice el sourcefix local `PASS_VISUAL_MATRIX_TIMEOUT_SIGNAL_SAFE_SOURCE 48/48`; el validador nunca se ejecutó dentro de Actions.

## Regla de repetición

El canario #23 falló en la misma etapa con 930 segundos de cola y cero steps. El canario #24 repitió la misma familia con 949 segundos y cero steps.

Por la regla `STOP_RETRY`, no se crea un tercer canario ni se abre recuperación hasta recibir evidencia externa nueva de que la capacidad de runners de GitHub Actions se restableció.

## Estado protegido

```txt
secrets: 0
Firestore reads/writes: 0/0
Auth/operational writes: 0/0
browser/Hosting/deploy: 0
Functions/Rules: 0
production/main/merge: 0
```

## Siguiente acción exacta

Mantener el gate congelado. No ejecutar otro canario, recovery ni matriz. Retomar únicamente ante evidencia externa nueva y verificable de recuperación de GitHub Actions; después requerir una autorización explícita nueva ligada al HEAD vigente.
