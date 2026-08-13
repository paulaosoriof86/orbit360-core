# BITÁCORA — PIPELINE VISUAL OBSERVABLE V2

Fecha: 2026-08-05

## Necesidad

Ejecutar una prueba observable post-Auth con backup, un deploy exclusivo de Hosting LAB, precheck y matriz por rol.

## Esperado

GitHub Actions debía crear un run al recibir el request inmutable y ejecutar primero el gate canónico.

## Resultado

No se creó ningún run para cuatro transportes controlados. No se ejecutó el gate, no se accedió a secretos y no se tocó Hosting.

## Clasificación

```text
PIPELINE_MECHANISM_FAILURE
```

## Causa raíz

El mecanismo push-path de Actions no registró ni despachó el workflow nuevo o sus relays en la rama no fusionada. La evidencia permite afirmar que el producto no comenzó; no permite atribuir el fallo a Auth, datos o frontend.

## Implementación disponible

- overlay required/optional de hidratación;
- validación source-only 24/24;
- lifecycle y engine 2.7.5;
- runner contractual único;
- backup, deploy, precheck, matriz, rollback y sellado definidos.

## Estado

```text
runtime authorization: reserved, unconsumed
Hosting LAB: previous restored version
PASS_VISUAL_POST_AUTH: pending
retry current push mechanism: prohibited
```

## Siguiente acción

Exponer un dispatch de Actions soportado para el runner ya versionado, sin crear otro request ni solicitar de nuevo la autorización.
