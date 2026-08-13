# CIERRE VISUAL OBSERVABLE ROOTFIX LAB — 2026-08-05

```text
run: 31063000137
stage: STOP_RETRY_VISUAL_OBSERVABLE_ROOTFIX
classification: DATA_CONTRACT_FAILURE
checkpoint: INICIO_READY_TIMEOUT
preflight: GO_GATE_CONTRACT · 24/24
Hosting deploys: 1
rollback required: true
rollback restored: true
precheck: FAIL_VISUAL_BROWSER_PRECHECK · INICIO_READY_TIMEOUT
matrix: NOT_EXECUTED
Firestore/Auth/operational writes: 0
Functions/Rules deploys: 0
production/main/merge: 0
```

## Causa raíz

Auth, Firebase, la membresía, el vínculo con el tenant, la ruta `inicio` y las siete colecciones canónicas estaban listos. El rootfix declaró la colección legacy `asesores` como dependencia obligatoria de hidratación para `Inicio`.

La evidencia visible fue:

```text
4 de 5 fuentes listas · falta asesores
```

Como `asesores` permaneció en `snapshotErrors`, `wrapModule` mantuvo la pantalla de carga y no permitió ejecutar el render original, aunque el módulo puede funcionar con una lista vacía o una proyección visual de asesores.

Owner exacto:

```text
orbit360-platform/core/visual-runtime-rootfix-v20260805.js
MODULE_DEPS.inicio
hydrationStatus
wrapModule
```

## Solución requerida

1. Separar dependencias canónicas obligatorias y fuentes legacy opcionales.
2. No bloquear `Inicio` por `asesores`.
3. Proyectar asesores desde memberships/Equipo en cliente, sin escritura ni hardcode.
4. Mostrar estado degradado honesto en leaderboard y metas si la proyección opcional no está disponible.
5. Auditar el mismo contrato en Cliente 360, Pólizas, Cobros, Ops, Leads, Conciliaciones y Cancelaciones.

## Frontera del cierre

El workflow source-only opcional de cierre no produjo commit. La causa se cerró directamente mediante el conector, sin nueva solicitud runtime, sin replay y sin acceso adicional a credenciales, Firebase, navegador o Hosting.

Salida: `STOP_RETRY`. El request runtime está consumido y no se autoriza otra ejecución hasta obtener PASS source-only del contrato required/optional de hidratación. Hosting LAB permanece restaurado a la versión previa; el rootfix no está vivo ni aprobado visualmente.
