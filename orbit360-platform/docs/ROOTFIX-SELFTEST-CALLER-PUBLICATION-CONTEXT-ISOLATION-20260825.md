# ROOTFIX — AISLAMIENTO DE CONTEXTO DEL CALLER EN SELFTEST DE CONTROL-PLANE — 2026-08-25

## Estado

`SOURCE_ONLY_ROOTFIX / PIPELINE_MECHANISM_FAILURE / NO_RUNTIME`

## Incidente

- Run: `32882463214`
- Job: `97915006473`
- PR técnico: `#107`, cerrado sin merge.
- Etapa: `CONTROL_PLANE_HARDENING_CLOSE`, antes de publicación canónica.
- Clasificación: `PIPELINE_MECHANISM_FAILURE`.
- Código de causa raíz: `SELFTEST_CALLER_PUBLICATION_CONTEXT_LEAK`.

El selftest conductual había pasado de forma autónoma en run `32882294356`, pero la revalidación independiente ejecutada dentro de `CONTROL_PLANE_HARDENING_CLOSE` falló durante la transición scratch `F2_RUNTIME_AUTHORIZATION_PERSIST`.

## Causa raíz

El step de cierre exporta variables de la publicación real, entre ellas `ORBIT360_PUBLICATION_CLASS=CONTROL_PLANE_CLOSE`. El behavioral selftest y sus procesos hijos heredaban ese contexto completo. Después de cerrar sintéticamente el control-plane en su worktree aislado, el mismo selftest simula F2 para probar autorización, materialización, aceptación, gate y STOP_RETRY.

La publicación scratch de esa simulación seguía recibiendo la clase externa `CONTROL_PLANE_CLOSE`. El publication transaction owner aplicaba entonces una restricción de superficie perteneciente al caller real sobre una transición F2 sintética. El resultado dependía del contexto desde el que se invocaba el selftest, aunque el producto, el contrato y el código probado fueran idénticos.

## Rootfix

Archivo:

`tools/orbit360-control-plane-publication-preflight-v20260825.mjs`

Regla nueva:

- cuando `selftestMode=true`, una `publicationClass` heredada del caller no restringe transiciones sintéticas que están fuera de la publicación canónica real;
- cuando el scratch está en el estado sintético de cierre, se conserva la validación especial de superficie y limpieza de evidencia del selftest;
- cuando `selftestMode=false`, todas las restricciones reales por clase (`CONTROL_PLANE_CLOSE`, `CONTROL_PLANE_REGRESSION`, `F2_AUTH_ACCEPT`, `F2_TERMINAL`) permanecen activas sin relajación.

El cambio no autoriza runtime, no abre F2 y no reduce los controles de publicación real.

## Invariante reusable

Un selftest crítico debe ser hermético respecto de variables operativas del caller que no formen parte explícita de su contrato. El mismo HEAD y el mismo estado canónico no pueden producir PASS o FAIL únicamente porque el caller exporte una clase de publicación destinada a otra transición.

Esta regla debe reutilizarse en futuros módulos y gates para evitar contaminación ambiental entre harness, owner y runtime simulado.

## Evidencia de seguridad del incidente

El run `32882463214` falló antes de la mutación/publicación del cierre. No se ejecutaron:

- F2 runtime;
- browser;
- secretos;
- Firestore read/write;
- Auth writes;
- operational writes;
- deploy;
- producción;
- main;
- merge.

La candidata `9504702901` no fue modificada.

## Academia

Actualizar el patrón reusable de Academia para distinguir:

- defecto funcional;
- validador stale;
- contaminación de contexto del caller en un harness;
- aislamiento hermético de pruebas;
- diferencia entre una simulación scratch y una publicación canónica real.

## Claude

Clasificación: `BACKEND_PROTEGIDO_NO_CLAUDE`.

No enviar este rootfix como candidata frontend/UX. Su valor reusable se documenta como patrón de arquitectura y metodología, sin exponer secretos ni datos reales.

## Siguiente gate

Debido a que cambió el mecanismo después del handshake `32882294356`, ese handshake queda histórico para cierre. Se requiere un `CONTROL_PLANE_SELFTEST` fresco sobre el nuevo HEAD y, solo si publica un nuevo handshake PASS, un nuevo `CONTROL_PLANE_HARDENING_CLOSE` intent-only.
