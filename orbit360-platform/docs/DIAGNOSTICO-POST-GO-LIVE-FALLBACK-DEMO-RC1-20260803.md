# Diagnóstico post go-live — fallback demo en host canónico

Fecha: 2026-08-03

## Clasificación

```text
FUNCTIONAL_DEFECT
VALIDATOR_STALE
PIPELINE_MECHANISM_FAILURE
```

## Evidencia observable

La URL canónica `ays-orbit-360-lab.web.app/#/cliente360` renderiza datos ficticios del seed: usuario `admin@demo.com`, 20 clientes, 43 pólizas y nombres de demostración.

## Causa raíz

`core/backend-lab-loader.js` solo reconocía como host autorizado el patrón temporal:

```text
ays-orbit-360-lab--orbit360-ays-lab-*.web.app
```

No reconocía el host canónico:

```text
ays-orbit-360-lab.web.app
```

Al ingresar directamente al host canónico sin query parameters:

1. el loader no normalizaba la URL;
2. `backend-lab-init.js` no activaba Firebase;
3. `data/store-firestore-lab.local.js` retornaba sin instalar el store real;
4. `core/auth.js` entraba en modo demo;
5. `Orbit.store.init(Orbit.SEED)` cargaba `data/seed.js` como fuente visible.

Los datos reales permanecen en Firestore; el defecto está en la selección del runtime y la fuente renderizada.

## Defecto del smoke anterior

`tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs` validó:

- paridad byte a byte de activos;
- presencia textual de módulos;
- conteos y digests de Firestore mediante Admin SDK;
- release y rollback de Hosting.

No ejecutó navegador ni comprobó:

- URL canónica sin parámetros;
- `OrbitBackend.mode`;
- owner real de `Orbit.store`;
- autenticación Firebase activa;
- ausencia de `admin@demo.com` y seeds;
- conteo renderizado de 430 clientes.

Por ello emitió un falso PASS aunque la shell pública seguía en modo demo.

## Owner exacto

```text
runtime owner: orbit360-platform/core/backend-lab-loader.js
auth fallback: orbit360-platform/core/auth.js
source fallback: orbit360-platform/data/seed.js
validator owner: tools/orbit360-gravicentra-rc1-go-live-helper-v20260803.mjs
```

## Root fix source-only implementado

Se creó una candidata incremental, sin alterar RC1 histórica:

```text
branch: release/gravicentra-insurance-rc1-1-real-data-runtime-20260803
base: 27cb7dfcda8568280ebef15993a953364304f29b
fix commit: 1eb7daea580c0807d867a663086defc021435993
archivo de producto: orbit360-platform/core/backend-lab-loader.js
```

La misma corrección quedó sincronizada en la rama viva:

```text
working branch commit: 6296bedb2370494e93f4c4a2e87b14bf704dd536
```

El loader v1.112 ahora:

1. reconoce `ays-orbit-360-lab.web.app`;
2. reconoce `ays-orbit-360-lab.firebaseapp.com`;
3. conserva los previews autorizados;
4. normaliza la URL directa al runtime Firestore de A&S;
5. declara `noFallback:true` y `noSeedAsSource:true`;
6. no contiene credenciales demo;
7. preserva el comportamiento local del prototipo.

## Validación nueva

Se agregó un validador sin secretos:

```text
tools/orbit360-canonical-host-runtime-failclosed-test-v20260803.mjs
.github/workflows/orbit360-canonical-host-runtime-failclosed-static-v20260803.yml
```

Debe comprobar:

- redirect canónico correcto;
- cero caída hacia scripts demo antes de normalizar;
- modo `firestore-lab` en URL normalizada;
- tenant `alianzas-soluciones`;
- Firebase SDK y configuración reservada solicitados;
- alias firebaseapp y previews preservados;
- localhost sin cambios;
- cero secretos, Firestore o deploy durante el test.

El smoke posterior al deploy deberá ser de navegador y fallar ante cualquier `admin@demo.com`, seed ficticio o conteo renderizado distinto del real.

## Cloud / Claude / Academia

```text
clasificación owner runtime: BACKEND_PROTEGIDO_NO_CLAUDE
patrón reusable fail-closed: REPLICABLE_CLAUDE_ACUMULADO
caso de falso PASS del smoke: ACADEMIA_ACTUALIZAR
datos reales, IDs y credenciales: excluidos
```

## Estado

```text
RC1 desplegada: sí, pero visualmente inválida para operación
Firestore real: preservado
escrituras inesperadas: no detectadas
RC1.1 source-only: implementada
validación estática: en ejecución
deploy correctivo: no ejecutado
producción modificada por este root fix: no
```
