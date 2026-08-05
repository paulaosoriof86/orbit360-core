# Cierre STOP_RETRY — Microbloque 2.1 `GO_LAB_CANDIDATE_VISIBLE`

Fecha operativa: 2026-08-04 22:18 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5` draft/open

## Decisión

```text
STOP_RETRY_DEFINITIVE_CONTROL_PLANE
```

La autorización del Microbloque 2.1 quedó consumida. No se emite un tercer request, no se crea otro workflow y no se modifica nuevamente el control plane dentro de esta familia de fallo.

## Resultado operativo

No se obtuvo URL LAB. Los dos intentos se detuvieron en el preflight canónico antes de secretos.

```text
Functions desplegadas: 0
Hosting preview desplegado: no
rutas abiertas: 0
snapshot before: no
snapshot after: no
secretos leídos: no
Firestore leído: no
Firestore writes: 0
Auth writes: 0
Rules: no
reimportación: no
producción: no
main: no
merge: no
```

La expresión “rolled back” publicada por el workflow no representa un rollback de recursos reales: no existían Functions ni Hosting nuevos que retirar.

## Intento 1

```text
run: 30974443335
request commit: ee2f4890883ac9b8c1d8829ae7a40757d747d2ce
preflight: VALIDATOR_STALE
checks: 26/28
fallos:
- REQUEST_ACTIVE
- VIDEO_LAYOUTFREE_HARNESS
```

Causa: el engine interno todavía validaba request v1 y tokens del arnés v5.

El producto se congeló y se corrigieron motor, lifecycle, registro, workflow, documentación, Academia y acumulado Claude como una unidad.

## Intento 2

```text
run: 30974745085
request commit: 5236b7f91a85ba20d2f5baed625f503b32db7dfe
preflight: VALIDATOR_STALE
fallo: CANONICAL_PREFLIGHT_ENTRYPOINT
error: CANONICAL_LIFECYCLE_REVISION_MISMATCH
```

El request exacto y la comparación contra el baseline pasaron. El outer router rechazó el lifecycle antes de ejecutar el engine corregido.

## Causa raíz de segundo nivel

Clasificación primaria:

```text
VALIDATOR_STALE
```

Clasificación secundaria:

```text
PIPELINE_MECHANISM_FAILURE
```

Owner exacto:

```text
tools/orbit360-validar-gate-contracts-v20260717.mjs
```

El router canónico define:

```text
CANONICAL_LIFECYCLE_COMPOSITION = phase-capability-contract-v1
```

Y exige que:

```text
lifecycle.validatorLifecycleRevision === CANONICAL_LIFECYCLE_COMPOSITION
```

La corrección anterior utilizó incorrectamente `validatorLifecycleRevision` para declarar la generación del arnés:

```text
isolated-context-direct-url-v6
```

Ese valor describe el mecanismo visual, pero no puede sustituir el identificador de composición canónica. Debía conservarse `phase-capability-contract-v1` y declararse la versión del arnés en un campo independiente.

El engine corregido no llegó a ejecutarse. Por tanto, este resultado no demuestra un defecto de Orbit 360, de las rutas, de los datos ni de las cuatro Functions.

## Hallazgo adicional de evidencia

El JSON de decisión escribió:

```text
functionsVerified: 4
```

pero los pasos reales del job y el comentario del PR demuestran:

```text
Functions verificadas: 0/4
```

Causa: el generador de decisión usa un literal fijo. Ese campo queda invalidado como evidencia y no se corrige ahora por `STOP_RETRY`. No produjo impacto operativo porque el workflow nunca alcanzó el deploy.

## Estado preservado

Continúan válidos:

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
run funcional 30962756387: 18/18 PASS
run sintético 30971707956: 8/8 PASS
clientes: 430
aseguradoras: 30
```

El source baseline funcional permanece:

```text
548cffa50cddfd93ad2118f5a06e9bb420699bde
```

No se perdió información, no se reimportó ninguna fuente y no se creó una candidata nueva.

## Regla STOP_RETRY aplicada

Quedan prohibidos dentro de esta autorización y esta familia:

- tercer request;
- tercer run LAB;
- otro parche al preflight;
- otro workflow visual;
- tocar módulos o producto;
- acceder a secretos;
- desplegar Functions o Hosting;
- reabrir los 18 escenarios funcionales.

## Solución estructural requerida

La siguiente intervención debe ser exclusivamente source-only y rediseñar la composición del control plane:

1. conservar `validatorLifecycleRevision = phase-capability-contract-v1`;
2. declarar `visualHarnessRevision = isolated-context-direct-url-v6` por separado;
3. hacer que registro, router, lifecycle, engine, workflow y request compartan ambos conceptos;
4. ejecutar un test estático que atraviese outer router e inner engine juntos;
5. validar que el JSON de decisión use outputs reales y no literales;
6. cerrar ese test con evidencia sin secretos, Firebase, navegador o deploy.

Solo después de un PASS estático observable podrá solicitarse una autorización nueva para un futuro Microbloque 2.1. La autorización actual no puede reutilizarse.

## Carriles

### A — Frontend y UX

Producto congelado; no se observó regresión ni se abrió navegador.

### B — Backend y seguridad

Los controles fail-closed funcionaron: dos preflights bloquearon secretos y deploy. El defecto está en la composición del validador, no en los dominios backend.

### C — Datos reales

Cero lecturas y cero escrituras. Baseline 430/30 preservado sin reimportación.

## Claude y Academia

```text
REPLICABLE_CLAUDE_ACUMULADO:
- separar composición del lifecycle y versión del arnés;
- probar outer router + inner engine como unidad;
- usar outputs reales en evidencias.

BACKEND_PROTEGIDO_NO_CLAUDE:
- Auth;
- service account;
- Firebase;
- rutas y datos tenant;
- Functions reales.

ACADEMIA_ACTUALIZAR:
- un validador puede fallar en dos niveles;
- el fail-closed correcto no equivale a fallo de producto;
- STOP_RETRY impide continuar parcheando tras dos fallos de la misma etapa.
```

## Siguiente acción exacta

```text
NO_EJECUTAR_RUNTIME
DISEÑAR_Y_VALIDAR_SOURCE_ONLY_LA_COMPOSICION_CANONICA_DEL_PREFLIGHT
```

Esta siguiente acción no está autorizada como ejecución LAB y no incluye un nuevo request.
