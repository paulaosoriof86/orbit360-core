# Hipótesis retirada y causa raíz confirmada — GitHub Actions — 2026-08-06

## Corrección obligatoria

La hipótesis `ACCOUNT_OR_REPOSITORY_ACTIONS_DISABLED_OR_RESTRICTED` queda retirada.

Evidencia nueva:

- La configuración del repositorio muestra `Permitir todas las acciones y flujos de trabajo reutilizables` ya seleccionada.
- No se requiere cambiar ni guardar permisos de Actions.
- GitHub Status reporta un incidente crítico activo de GitHub Actions, componente en `major_outage`.

## Causa raíz vigente

```text
ENVIRONMENT_FAILURE
GITHUB_ACTIONS_MAJOR_OUTAGE_ACTIVE
incidentId: qcvjkzcs7j74
```

GitHub reporta que los workflows pueden fallar o demorarse al iniciar, los jobs pueden permanecer en cola hasta expirar, la capacidad de runners alojados está restringida, los webhooks pueden retrasarse y algunas llamadas a la API de Actions pueden fallar.

Esto coincide con la evidencia Orbit 360:

- dos runs Ubuntu creados sin steps y cancelados después de cola prolongada;
- canarios macOS y control-plane sin despacho observable;
- cero ejecución de código del producto en esos intentos.

## Estado del producto

```text
Auth/membership/tenant/Inicio: PASS
precheck visual: PASS
sourcefix signal-safe: 48/48 PASS
sourcefix cross-runner: 24/24 PASS
matriz completa: pendiente
PASS_VISUAL_POST_AUTH: NO
Cobros 4.1: pausado
```

## Acción durante el incidente

- No cambiar permisos del repositorio.
- No crear más canarios equivalentes.
- No consumir otra autorización runtime.
- Mantener runner v3 y evidencias listos.
- Verificar la recuperación oficial de GitHub Actions.

## Reanudación exacta

Cuando GitHub Status pase a `monitoring` o `resolved` y exista capacidad observable:

1. ejecutar exactamente un control-plane source-only;
2. exigir 24/24 cross-runner y conservar 48/48 signal-safe;
3. cerrar el control-plane sin merge;
4. emitir una autorización runtime nueva ligada al HEAD canónico vigente;
5. ejecutar recuperación Hosting + matriz completa con runner v3;
6. con `PASS_VISUAL_POST_AUTH`, continuar hacia bootstrap productivo read-only, activación del tenant, migración controlada, release candidate y go-live;
7. retomar Cobros 4.1 después del cierre visual.

No abrir otra auditoría general ni repetir los runs anteriores.
