# Cierre sourcefix cross-runner y causa externa GitHub Actions — 2026-08-06

## Corrección de diagnóstico

La hipótesis de que Actions estaba deshabilitado o restringido en el repositorio queda retirada. La configuración muestra `Permitir todas las acciones y flujos de trabajo reutilizables` ya seleccionada.

## Causa raíz confirmada

```text
ENVIRONMENT_FAILURE
GITHUB_ACTIONS_MAJOR_OUTAGE_ACTIVE
incidentId: qcvjkzcs7j74
status: investigating
impact: critical
componentStatus: major_outage
```

GitHub Status reporta workflows fallando o demorados, jobs en cola por periodos prolongados, timeouts, capacidad restringida de runners alojados, webhooks retrasados y errores en la API de Actions.

## Avance visible

- Timeout portable Node añadido.
- Runner v3 compatible con Linux/macOS y bloqueado sin autorización.
- Prueba cross-runner local: `PASS_VISUAL_MATRIX_CROSS_RUNNER_SOURCE`, 24/24.
- Sourcefix signal-safe conservado: 48/48.
- Canarios Ubuntu: runs creados, 0 steps, cola prolongada.
- Canarios macOS/control-plane: sin despacho observable.
- Síntomas consistentes con el incidente oficial activo.

## Estado funcional honesto

- Auth, membership, tenant e Inicio: PASS en precheck.
- Matriz completa Dirección/Operativo/Asesor: no completada.
- Snapshot final: no verificado.
- `PASS_VISUAL_POST_AUTH`: NO.
- Cobros observados: 7.
- Cobros 4.1: pausado.

## Restricciones cumplidas

Cero secretos, Firebase, Firestore/Auth/operational writes, navegador, Hosting, deploy, Functions, Rules, producción, main o merge.

## Siguiente acción exacta

No cambiar permisos ni crear más canarios mientras GitHub Status permanezca `investigating/major_outage`. Cuando el incidente pase a `monitoring` o `resolved` y exista capacidad observable, ejecutar exactamente una validación source-only cross-runner. Solo con PASS solicitar una autorización runtime nueva ligada al HEAD vigente y ejecutar recuperación Hosting + matriz completa con runner v3.
