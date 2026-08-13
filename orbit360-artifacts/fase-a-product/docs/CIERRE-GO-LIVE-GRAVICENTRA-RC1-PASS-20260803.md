# Cierre de salida a producción — Gravicentra Insurance RC1

Fecha: 2026-08-03  
Resultado: `GO_LIVE_PASS`  
Clasificación: `PRODUCTION_SMOKE_PASS`

## Candidata desplegada

```text
releaseBranch: release/gravicentra-insurance-rc1-20260803
releaseCommit: 27cb7dfcda8568280ebef15993a953364304f29b
baselineProductHead: 267f7231b46d65b80c167f54567a67503b6a6793
```

La candidata fue desplegada directamente desde la rama release sellada. El HEAD documental de trabajo no se utilizó como artefacto productivo.

## Ejecución

```text
run: 30871137290
job: 91873219826
artifact: 8877919718
artifact digest: sha256:d50778c48d17190e104d621eed91e55d778be0182d2a6027ea88656712f66cd4
request commit: 8da3b31d12eb6ea526c813d1608b36342f57b3ea
```

Todas las etapas cerraron `success`:

1. contrato canónico antes de credenciales;
2. autorización macro inmutable;
3. verificación de RC1 y delta permitido;
4. snapshot inicial y anclas de rollback;
5. deploy exclusivo de Firebase Hosting;
6. smoke productivo focalizado;
7. evidencia sanitizada y limpieza de temporales.

El paso de rollback quedó `skipped` porque el smoke obtuvo PASS.

## Release de Hosting

```text
release nueva: sites/ays-orbit-360-lab/releases/1785809638578000
version nueva: sites/ays-orbit-360-lab/versions/5fcc5758b2004b03
fecha release: 2026-08-04T02:13:58.578Z

ancla anterior preservada: sites/ays-orbit-360-lab/versions/1e827fa406538a21
```

## Smoke productivo

```text
assetsExactlyRc1: true
dataCountsComplete: true
dataUnchanged: true
modulesPresent: true
hostingReadable: true
newReleaseObserved: true
priorAnchorPreserved: true
rollbackAnchorAvailable: true
```

Módulos comprobados en la publicación:

- Cliente 360;
- Aseguradoras;
- Pólizas;
- Cobros;
- Ops;
- Leads.

Los activos públicos seleccionados coincidieron byte a byte con RC1, incluidos `index.html`, `styles/base.css`, configuración, adaptador del store y los seis módulos requeridos.

## Datos reales preservados

Conteos operativos:

```text
clientes: 430
aseguradoras: 30
pólizas: 1,373
vehículos: 1,032
recibos esperados: 1,294
cartera: 673
cobros: 5
asesores: 7
```

Conteos canónicos:

```text
clientes: 430
aseguradoras: 30
pólizas: 1,375
vehículos: 1,033
recibos esperados: 1,294
cartera: 673
cobros: 7
```

Los digests before/after fueron idénticos para todas las colecciones verificadas.

## Seguridad y exclusiones

```text
Firestore writes: 0
Auth writes: 0
Operational writes: 0
reimportación: no
Functions desplegadas: no
Rules aplicadas: no
main tocado: no
merge ejecutado: no
rollback ejecutado: no
```

La autorización quedó consumida y sellada en:

`tools/orbit360-gravicentra-insurance-rc1-go-live-consumption-v20260803.json`

No puede reutilizarse para otra ejecución.

## Causa raíz del bucle y cierre metodológico

El retraso no provenía de una candidata ausente, datos incompletos ni módulos faltantes. La candidata existía y estaba validada. El bucle fue causado por contratos y probes obsoletos que se interpretaban como fallos del producto. Se corrigieron los owners del pipeline, se congeló RC1 y se prohibió repetir Gate 7.11, predeploy y auditorías generales.

El macrobloque final demuestra que la ruta correcta era:

```text
candidata sellada
→ contrato antes de capacidades
→ snapshot y rollback
→ deploy Hosting único
→ smoke focalizado
→ mantener por PASS
```

## Cloud / Claude / Academia

```text
core actualizado: sí
documentación profunda: sí
patrones CL-110 a CL-114: documentados
enviado a Cloud/Claude: no
incorporado externamente: no
```

El go-live de A&S no queda bloqueado por el envío externo. El patrón reusable deberá enviarse después de forma sanitizada, sin workflows operativos, IDs internos, anclas de rollback, datos reales ni credenciales.

## Estado final

```text
GRAVICENTRA_INSURANCE_RC1_LIVE
PRODUCTION_SMOKE_PASS
ROLLBACK_NOT_REQUIRED
```
