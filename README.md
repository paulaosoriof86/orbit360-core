# orbit360-core

Repositorio de Orbit 360.

Fuentes operativas vigentes:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/DECISION-RELEASE-EXCEPCION-CONTROLADA-2-CLIENTES-20260810.md`;
4. `orbit360-platform/docs/CIERRE-BLOCK1-UNIVERSE-EXCEPCION-CONTROLADA-PASS-20260810.md`;
5. `orbit360-platform/docs/CIERRE-SOURCEFIX-MATRIZ-VISUAL-BLOCK1-POST-UNIVERSE-20260810.md`;
6. estado vivo del PR #5 + HEAD de `ays/backend-tenant-lab-v99-20260703`;
7. lifecycle/evidencia sanitizada más reciente del gate activo.

RC activa: `RC-AYS-LAB-CANONICA-01`.

## Estado rector actual

```text
Bloque activo: Block 1 — Cliente 360 + Aseguradoras
Gate único: block1-client360-insurers-lab-v20260717
Contrato vivo: 1.0.41
Universe release: PASS con 2 excepciones controladas de procedencia
PASS_VISUAL_POST_AUTH: NO
Matriz visual anterior: STOP_RETRY + rollback PASS + snapshot VERIFIED_UNCHANGED
Matriz visual corregida source-only: PASS
Lifecycle: SOURCE_PASS_AWAITING_FRESH_EXCLUSIVE_REQUEST
Producción/main/merge: NO autorizados
```

## Universe y datos

```text
clientes raw: 430
clientes baseline contractual: 414
retained26 diferidos: 14
excepciones controladas de procedencia: 2
aseguradoras raw: 30
aseguradoras efectivas: 26
asesores: 7
```

Decisión gobernante:

`RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS`

Los dos clientes no se borran, ocultan, fusionan, reimportan ni modifican. Conservan sus relaciones. La procedencia pendiente es deuda post-go-live y no bloquea por sí sola la ruta productiva.

Impacto read-only demostrado para ambos: 3 pólizas, 1 vehículo, 12 recibos esperados, 10 registros de cartera y 0 cobros. Writes 0.

## IAM / auditoría externa

v34–v37 permanecen cerrados e históricos. No continuar IAM/Logging para resolver los dos clientes y no autoelevar la cuenta LAB.

## Matriz visual Block 1

Primera ejecución final post-universe:

```text
run: 31447187977
resultado: STOP_RETRY
clasificación corregida: VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE
safety backup: PASS
baseline restore: PASS
Hosting LAB deploys: 1
precheck: PASS · INICIO_READY_PASS
rollback: PASS
snapshot: VERIFIED_UNCHANGED
Firestore/Auth/operational writes: 0
producción/main/merge: 0
```

Causas del harness cerradas source-only:

- modal obligatorio de primera contraseña interceptaba clicks del test;
- matriz usaba `Orbit.session.canSee` en vez del owner real del router `Orbit.access.can`;
- deep-links del mismo módulo podían completar `already-ready` antes del query string;
- target de detalle se tomaba del store raw en vez de la proyección/filtrado efectivo;
- el umbral de 30 s sumaba hidratación pre-navegación al tiempo de render.

Correctivo vivo:

```text
implementation: tools/orbit360-block1-final-native-matrix-v20260810.mjs
canonical binding: tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs
source run: 31448149299 · PASS
workflow armado para request fresco: 31448254999 · PASS source
```

Owner de acceso: `Orbit.access.can`.
Owner de scope de clientes: `Orbit.access.filter/withScope`.
Deep-links: hash exacto + DOM objetivo.
Rendimiento: `renderObserverWaitMs`; hidratación previa es checkpoint separado.
Overlay de contraseña: normalización exclusiva del harness, sin desactivar seguridad del producto.

## Siguiente acción exacta

La ejecución `31447187977` está consumida y no puede reproducirse.

Se requiere una autorización humana fresca para crear un request nuevo, exclusivo, parent-bound e inmutable:

`.github/orbit360-requests/block1-final-visual-corrected-after-sourcefix-authorization.json`

Ese request habilitará una sola matriz corregida de Dirección desktop, Operativo tablet y Asesor móvil sobre `inicio`, `cliente360` y `aseguradoras`, con safety backup, baseline `visual-matrix-corrected-backup-31135532118`, máximo un deploy Hosting LAB, snapshot final idéntico, cero escrituras y rollback ante cualquier STOP.

Solo con `PASS_VISUAL_POST_AUTH` se cierra Block 1 y se continúa a RC acumulativa/aceptación. Producción sigue requiriendo autorización explícita posterior.

## Cierres que no se reabren

- Auth/membership/multirol salvo regresión demostrada;
- Pólizas write PASS histórico;
- Vehículos write PASS histórico;
- Recibos/cartera write PASS histórico;
- reconciliación retained26;
- universe con excepción controlada;
- IAM diagnostics v34–v37.

No ejecutar producción, main, merge, Functions, Rules o reimportación sin autorización explícita y gate correspondiente.
