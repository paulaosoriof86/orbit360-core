# ROOTFIX — CONTRATO STDOUT ÚNICO DEL TRANSITION OWNER — 2026-08-25

## Estado

`SOURCE_ONLY_ROOTFIX / DATA_CONTRACT_FAILURE / NO_RUNTIME`

## Incidente

- Run: `32883497886`
- Job: `97918379840`
- PR técnico: `#109`, cerrado sin merge.
- Etapa: `CONTROL_PLANE_HARDENING_CLOSE`.
- Cierre lógico: PASS en memoria del runner.
- Publicación PREPARE: PASS para commit `9742830dd3dd96cf2526b2bfdd0427114c8c518c`.
- Publicación remota: NO ejecutada; la rama canónica permaneció en `2f9f846a4acfc6f478c586404b94d33d437f3f2a`.
- Clasificación: `DATA_CONTRACT_FAILURE`.
- Código de causa raíz: `TRANSITION_OWNER_STDOUT_MULTI_JSON`.

## Evidencia causal

El cierre produjo correctamente:

- behavioral selftest PASS dentro del caller real de cierre;
- revisiones proyectadas `43/37` en el worktree del runner;
- convergence PASS;
- terminal truth PASS;
- independent readback PASS;
- composite invariant PASS;
- documentation discovery PASS;
- publication transaction PREPARED con diff-check, commit-tree, remote CAS y push dry-run PASS.

El workflow falló al inicio del step de publicación con código shell `1`, antes de ejecutar el subcomando `--publish-validated`.

La causa es que `tools/orbit360-continuity-transition-owner-v20260824.mjs` ejecutaba la proyección hija con `stdio:'inherit'`. La proyección imprimía su propio JSON en stdout y el owner imprimía después su JSON terminal. Por tanto, el archivo capturado por `tee` contenía varios documentos JSON. Al ejecutar `jq -r '.ledgerRevision'`, el resultado contenía más de una línea y el guard numérico del workflow fallaba.

## Rootfix

Archivo canónico:

`tools/orbit360-continuity-transition-owner-v20260824.mjs`

Cambios:

1. las proyecciones hijas se ejecutan con stdout capturado/silenciado y stderr conservado para diagnóstico;
2. cuando el owner canónico delega una transición F2 al owner `v20260820`, captura la salida completa del delegado, conserva stderr y reemite únicamente el último documento JSON válido;
3. el owner canónico mantiene una sola salida JSON machine-readable por invocación exitosa.

No se crea un owner paralelo. El owner `v20260824` continúa siendo la única interfaz física del workflow y el `v20260820` permanece como implementación delegada F2.

## Invariante reusable

Toda interfaz de transición consumida por automatización debe cumplir:

`ONE_INVOCATION -> ONE_MACHINE_READABLE_JSON_ON_STDOUT`

Las herramientas hijas pueden emitir diagnóstico por stderr, pero no deben contaminar el canal de datos del owner. El caller no debe depender de que `jq` elija accidentalmente el último de varios documentos.

## Seguridad

El incidente no publicó el cierre y no ejecutó:

- autorización F2;
- request runtime;
- provider;
- browser;
- secretos;
- Firestore read/write;
- Auth writes;
- operational writes;
- deploy;
- producción;
- main;
- merge.

La candidata `9504702901` permaneció intacta.

## Academia

Actualizar el patrón reusable para enseñar la separación entre stdout como canal de datos y stderr como canal diagnóstico, y cómo un `DATA_CONTRACT_FAILURE` del CLI puede bloquear un pipeline aunque la lógica de negocio y los validadores hayan pasado.

## Claude

Clasificación: `BACKEND_PROTEGIDO_NO_CLAUDE`.

## Siguiente gate

Como el mecanismo cambió después del handshake `32883293338`, ese handshake queda histórico para el próximo cierre. Se requiere un selftest/handshake fresco sobre el nuevo HEAD y después un único `CONTROL_PLANE_HARDENING_CLOSE` nuevo. No se reabre ni se reejecuta PR #109.
