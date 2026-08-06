# Estado vivo PR #5 — GitHub Actions major outage — 2026-08-06

## Corrección de diagnóstico

La captura de configuración confirma que `Permitir todas las acciones y flujos de trabajo reutilizables` ya estaba seleccionada. Queda retirada la hipótesis de Actions deshabilitado o restringido por configuración del repositorio.

## Causa raíz externa confirmada

```text
ENVIRONMENT_FAILURE
GITHUB_ACTIONS_MAJOR_OUTAGE_ACTIVE
incidentId: qcvjkzcs7j74
status: investigating
impact: critical
component: Actions
componentStatus: major_outage
```

GitHub Status reporta workflows fallando o demorados, jobs en cola durante periodos prolongados, timeouts, capacidad restringida de runners alojados, webhooks retrasados y errores en llamadas a la API de Actions.

La evidencia del proyecto es consistente:

- canario Ubuntu #1: run 31122714301, 0 steps;
- canario Ubuntu #2: run 31124256674, 0 steps;
- canarios macOS/control-plane: sin despacho observable;
- código Orbit ejecutado en estos intentos: no.

## Producto

```text
GO_GATE_CONTRACT: 28/28 PASS
Auth/membership/tenant/Inicio: PASS
precheck visual: PASS
sourcefix signal-safe: 48/48 PASS
sourcefix cross-runner: 24/24 PASS
matriz completa: pendiente
PASS_VISUAL_POST_AUTH: NO
snapshot final: NOT_VERIFIED_FINAL
Cobros 4.1: pausado
```

## Acción exacta

Mientras el incidente permanezca `investigating/major_outage`:

- no cambiar permisos;
- no crear nuevos canarios;
- no consumir autorizaciones runtime;
- conservar runner v3 y evidencias.

Cuando GitHub Status pase a `monitoring` o `resolved` y exista capacidad observable:

1. ejecutar exactamente un source-only cross-runner;
2. exigir 24/24 y conservar 48/48;
3. cerrar sin merge;
4. emitir autorización runtime nueva ligada al HEAD vigente;
5. ejecutar recuperación Hosting + matriz completa;
6. con PASS, continuar hacia producción.
