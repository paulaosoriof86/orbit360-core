# orbit360-core

Repositorio de Orbit 360.

Fuentes operativas vigentes:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/docs/DECISION-RELEASE-EXCEPCION-CONTROLADA-2-CLIENTES-20260810.md`;
4. `orbit360-platform/docs/CIERRE-BLOCK1-UNIVERSE-EXCEPCION-CONTROLADA-PASS-20260810.md`;
5. `orbit360-platform/docs/CIERRE-ANTIBUCLE-MATRIZ-VISUAL-BLOCK1-RUN31502845695-20260811.md`;
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
Último runtime visual: run 31502845695 · STOP_RETRY seguro
Clasificación corregida: VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE
Rootfix anti-bucle source-only: PASS
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

## Último runtime visual · 2026-08-11

```text
run: 31502845695
job: 93816961022
resultado: STOP_RETRY
safety backup: PASS
baseline restore: PASS
Hosting LAB deploys: 1
precheck: PASS · INICIO_READY_PASS
rollback: PASS
snapshot: VERIFIED_UNCHANGED
Firestore/Auth/operational writes: 0
Functions/Rules: 0
producción/main/merge: 0
```

El runner reportó inicialmente `FUNCTIONAL_DEFECT`, pero la investigación de causa raíz demostró tres familias del instrumento:

1. el umbral de 30 s usaba latencia del canal Node/Playwright en vez del intervalo del observer dentro del navegador;
2. el burger móvil se probaba antes de readiness del Router/Inicio;
3. Cliente 360 detalle se ejercía escribiendo hash directamente y sin diagnóstico del owner Router/params/DOM.

No se modificó producto ni datos para resolver esos hallazgos.

## Rootfix anti-bucle source-only

Owner de implementación:

`tools/orbit360-block1-final-native-matrix-v20260811.mjs`

Binding canónico:

`tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs`

Fixture sintético:

`tools/fixtures/orbit360-block1-visual-antibucle-fixture-v20260811.mjs`

Owners vigentes:

```text
acceso: Orbit.access.can
scope clientes: Orbit.access.filter/withScope
rendimiento: browserObserverElapsedMs
detalle Cliente 360: rendered-row-user-flow-plus-route-param-dom
menú móvil: router-ready-before-burger
overlay primera contraseña: test-harness-remove-only
```

Evidencia source:

```text
run 31505449540: PASS owner + fixture + gate source
run 31505520202: PASS con runtime contract futuro alineado
runtime/secrets/Firebase/Hosting/browser/writes: 0
```

## Siguiente acción exacta

El request del run `31502845695` está consumido y no se reutiliza.

La siguiente ejecución runtime requiere autorización humana fresca y un único request nuevo, todavía inexistente:

`.github/orbit360-requests/block1-final-visual-antibucle-v20260811-authorization.json`

Versión:

`20260811.block1-final-visual-antibucle`

Será parent-bound, inmutable y one-shot; `GO_GATE_CONTRACT` antes de secretos; baseline `visual-matrix-corrected-backup-31135532118`; máximo un deploy Hosting LAB; Dirección desktop, Operativo tablet y Asesor móvil; snapshot final idéntico; cero escrituras; rollback ante cualquier STOP.

Si reaparece la misma familia, `STOP_RETRY` inmediato: no se crea otro request ni otro parche.

Solo con `PASS_VISUAL_POST_AUTH` se cierra Block 1 y se pasa al barrido focal de blockers Cobros/Pólizas.

## Cierres que no se reabren

- Auth/membership/multirol salvo regresión demostrada;
- Pólizas write PASS histórico;
- Vehículos write PASS histórico;
- Recibos/cartera write PASS histórico;
- reconciliación retained26;
- universe con excepción controlada;
- IAM diagnostics v34–v37.

No ejecutar producción, main, merge, Functions, Rules o reimportación sin autorización explícita y gate correspondiente.
