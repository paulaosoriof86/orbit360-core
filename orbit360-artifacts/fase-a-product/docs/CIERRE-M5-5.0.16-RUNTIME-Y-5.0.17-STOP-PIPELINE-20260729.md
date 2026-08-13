# Orbit 360 A&S — cierre M5 5.0.16 runtime y stop-line M5 5.0.17

Fecha: 2026-07-29  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
RC preservada: `ae6bb2a35ce4f03c0353d670218c841e51b57a2461a3ba9e741d8bd7a973fd61`

## Corte ejecutivo

- M1–M4 permanecen cerrados.
- Hosting LAB permanece 25/25, mismatch 0.
- La autorización one-shot de runtime 5.0.16 fue consumida exactamente una vez.
- El runtime 5.0.16 no escribió datos y se detuvo antes de autenticación por timeout de readiness de la política estática de Academia.
- La comparación con el runtime 5.0.14 sobre la misma RC demostró que la política `20260729.2` sí puede cargar e instalarse correctamente.
- Causa raíz del runtime 5.0.16: `ENVIRONMENT_FAILURE` + `PIPELINE_MECHANISM_FAILURE`, no defecto funcional demostrado.
- El bloque estático 5.0.17 falló dos veces en la misma etapa por defectos del mecanismo de validación. Se detuvieron reintentos conforme al contrato metodológico.
- El candidato de gate 5.0.18 existe pero **no fue ejecutado** y no puede ejecutarse hasta rediseñar y verificar el validador en un bloque nuevo.

## 1. M5 5.0.16 — package

Primer package: falló antes de secretos/runtime por autorreferencia del guard `jq`.

Clasificación: `VALIDATOR_STALE` / `PIPELINE_MECHANISM_FAILURE`.

Se corrigió una sola vez el self-scan. Segundo y último package:

```text
Commit: 7dace8b7c720b799ff982095dddc7f1d013df32d
Run: 30466972684
Job: 90627143661
Artifact: 8729954895
Digest: sha256:244dc0324a9f19ff874f68e116b2853085a9709ca28cac4ae869d6f307a6eeff
Conclusion: SUCCESS
```

El package no usó secretos, Firestore ni navegador.

## 2. M5 5.0.16 — runtime one-shot

```text
Authorized base: b89e432ed1c341867097155fa924da5a96b90bdc
Request commit: 8c9e58f8dc5d5b9e49b5d917af81e265ad1ea919
Run: 30467508494
Job: 90628997310
Artifact: 8730208725
Digest: sha256:6ff105b038be0856c8f1912f7506544787dd93c7c8484bfdbd2a480ccd77f28c
```

Primer fallo:

```text
PIPELINE_STEP_TIMEOUT:academia_static_write_policy_ready
```

Etapa: `academia_static_write_policy_ready`.

Seguridad comprobada:

```text
Snapshots before/after: 11/11 + 11/11
Counts stable: true
Digests stable: true
Firestore writes: 0
Operational writes: 0
Network write candidates: 0
Hosting deploy: false
Functions/Rules: false/false
Production/main/merge: false/false/false
Pólizas: false
```

La autorización quedó consumida; no hubo rerun.

## 3. Diagnóstico de causa raíz del timeout

La misma RC `ae6bb2a3…` había superado la política de Academia en el runtime 5.0.14: el owner `20260729.2`, el store base y el store Firestore fueron parseados e instalados correctamente antes del fallo posterior de access owner.

En 5.0.16 el gate expiró antes de que los owners tempranos llegaran a parsearse. `core/backend-lab-loader.js` inserta mediante `document.write` tres SDK externos de Firebase antes de `data/store.js`, de la política estática y del store Firestore. Una demora externa puede bloquear el parser aunque existan requests posteriores precargados por el navegador.

Clasificación:

- `ENVIRONMENT_FAILURE`: latencia/carga externa parser-blocking de Firebase puede retrasar los owners tempranos.
- `PIPELINE_MECHANISM_FAILURE`: el gate usaba un timeout corto de política como proxy del readiness del parser y no distinguía owner no parseado de owner parseado pero política no instalada.

No se modificó `backend-lab-loader`, el store, la política, Auth, Rules ni datos.

## 4. Candidato de gate 5.0.18 — no ejecutado

Se preparó únicamente como candidata de validación:

- `tools/orbit360-m5-runtime-smoke-518-browser-v20260729.mjs`
- `tools/orbit360-m5-runtime-smoke-518-close-v20260729.mjs`

Diseño:

- espera hasta 60.000 ms al owner real del store Firestore + política de Academia;
- budget externo 65.000 ms;
- distingue `ACADEMIA_POLICY_OWNER_NOT_READY` de `ACADEMIA_STATIC_WRITE_POLICY_NOT_INSTALLED_AFTER_OWNER_READY`;
- no llama manualmente `install()`;
- mantiene write guard, snapshots y tres vistas por rol.

El candidato no fue ejecutado.

## 5. M5 5.0.17 — verificación estática

### Intento 1

```text
Commit: 0200c6869d7bdac4cb1033d44859cca7a19b6162
Run: 30468755916
Job: 90633243156
```

Causa: el engine nuevo escribió su resumen propio pero no refrescó `preflight-sanitizado.json`; el router leyó evidencia vieja de Block 1.

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

### Intento 2 — final

```text
Commit: 30946e1fc383a2b4c6f21d69c7dabae90bb796a0
Run: 30469008976
Job: 90634085203
Artifact: 8730790811
Digest: sha256:30f4c1147f5493364252ab20d0a70b5cde90785dd30a7a6ef08c07aac334ec03
Checks: 17/19
```

Fallaron únicamente:

```text
ENV_TRIGGER_PROVEN
NO_MANUAL_POLICY_INSTALL
```

Ambos son falsos positivos del engine:

1. `ENV_TRIGGER_PROVEN` buscaba una representación textual distinta; el loader real sí ejecuta `document.write('<script src="' + src + '">...')` y carga los tres SDK Firebase.
2. `NO_MANUAL_POLICY_INSTALL` usó una búsqueda substring de `._writePolicy=` que también coincide con la comparación estricta `._writePolicy==='function'`; el candidato no asigna `_writePolicy` ni llama manualmente a la instalación.

Clasificación del segundo intento: `VALIDATOR_STALE` sobre un `PIPELINE_MECHANISM_FAILURE` ya abierto.

## 6. Regla de dos fallos aplicada

La misma etapa estática 5.0.17 falló dos veces.

Por contrato:

```text
sameStageFailedTwice: true
retriesStopped: true
thirdAttemptForbidden: true
productFrozen: true
runtimeFrozen: true
firestoreFrozen: true
```

No se crea otro parche 5.0.17, no se ejecuta 5.0.18 y no se solicita todavía otra autorización runtime.

## 7. Carriles

### Carril A — frontend / UX / Academia

No se modificó producto visual. La revisión visual continúa bloqueada hasta un runtime completo `ok:true`.

### Carril B — backend / seguridad / Auth / Orbit.store

RC, backend y datos permanecen intactos. Los cambios de este corte fueron exclusivamente control-plane/gates y evidencia. Cero escrituras en el runtime autorizado.

### Carril C — datos reales / migración A&S

Baseline preservado:

```text
414 clientes
26 aseguradoras
7 asesores
GT 398 / CO 16
Persona 391 / Empresa 23
missing currency 0
target-only 0/0
```

No hubo reimportación ni mutación de datos.

## 8. Claude

`REPLICABLE_CLAUDE_ACUMULADO`:

- distinguir owner parse/load readiness de owner installed readiness;
- no usar un timeout corto como proxy de recursos parser-blocking externos;
- no “arreglar” producto desde un gate llamando `install()` manualmente;
- validar asignaciones con análisis sintáctico/regex precisa, no substring que confunda `===` con `=`;
- los detectores de fuente deben comprobar semántica/estructura y no una única forma de comillas;
- selectores `jq` Unicode deben usar acceso seguro;
- tras dos fallos de la misma etapa, detener intentos y corregir el mecanismo.

`BACKEND_PROTEGIDO_NO_CLAUDE`:

- implementación Firebase/LAB;
- rutas y loaders backend;
- workflows operativos;
- artifacts;
- secretos;
- datos reales A&S.

## 9. Academia

`ACADEMIA_ACTUALIZAR`:

- diferencia entre `ENVIRONMENT_FAILURE`, `PIPELINE_MECHANISM_FAILURE`, `VALIDATOR_STALE` y `FUNCTIONAL_DEFECT`;
- un navegador puede precargar recursos posteriores aunque el parser esté bloqueado por un script externo;
- comparar dos ejecuciones de la misma RC ayuda a separar producto de entorno/pipeline;
- una autorización one-shot se consume aunque el fallo sea de entorno/pipeline;
- snapshots y digests antes/después demuestran cero mutación;
- validadores deben evitar falsos positivos de representación textual y operadores `===`.

## 10. Estado y siguiente acción exacta

Estado:

`M5_POLICY_READINESS_517_STOPPED_AFTER_TWO_STATIC_PIPELINE_FAILURES`

Siguiente acción exacta:

> Abrir un **nuevo bloque controlado de rediseño del validador**, sin runtime, navegador, Firestore, secretos ni deploy. Ese bloque debe sustituir los dos predicados defectuosos por validaciones no ambiguas, registrar lifecycle/preflight/workflow juntos y pasar una nueva verificación estática. Solo después podrá pedirse una nueva autorización explícita para ejecutar una vez el candidato 5.0.18.

Hasta entonces permanecen bloqueados: runtime, revisión visual, producción y Pólizas.
