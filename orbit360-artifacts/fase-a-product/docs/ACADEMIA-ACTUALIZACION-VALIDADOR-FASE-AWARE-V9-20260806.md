# Academia — actualización validador fase-aware v9 — 2026-08-06

## Aprendizaje operativo

Un gate puede detenerse aunque el producto y sus correctivos estén bien cuando el validador compara el sistema contra una fase anterior.

Caso v9:

```text
producto: no ejecutado
request exclusivo: detectado
Windows compatibility: 7/7 PASS
signal-safe: 48/48 PASS
cross-runner: 24/24 PASS
validador de overlay: 14/17 STOP
```

## Diferencia obligatoria

### Defecto funcional

El producto, datos, permisos o navegación incumplen el comportamiento esperado.

### VALIDATOR_STALE

La implementación cambió legítimamente de fase, pero el test conserva expectativas de la fase anterior.

En v9, el test exigía que el overlay continuara cerrado por el STOP v8, aun después de existir una autorización fresca que lo cambió a `AUTHORIZED_FRESH_REQUEST_ONLY`.

## Regla incorporada

El validador debe reconocer explícitamente la fase y luego aplicar límites distintos:

- `STOP_RETRY`: runtime, secretos y Hosting bloqueados.
- `AUTHORIZED_FRESH_REQUEST_ONLY`: solo un request fresco e inmutable puede abrir el gate; producción, Functions, Rules y escrituras permanecen bloqueadas.

Nunca se debe debilitar una regla para hacer pasar el test. La corrección debe conservar:

```text
requestReusable: false
replayAllowed: false
producción: false
writes: false
```

## Evidencia

```text
run source-only: 31133118442
PASS_SOURCE_ONLY_PHASE_AWARE_PREFLIGHT_VALIDATOR
17/17 PASS
secretos/Firebase/Hosting/browser/deploy/writes: 0
```

## Aplicación por rol

- Dirección: distingue bloqueo del producto de bloqueo del control-plane.
- Operativo: no reintenta runtime cuando falla source-only.
- Asesor: no percibe cambios ni interrupciones porque el STOP ocurrió antes del entorno LAB.
- Equipo técnico: actualiza owner, lifecycle, overlay, workflow, prueba, evidencia y Academia en el mismo cierre.
