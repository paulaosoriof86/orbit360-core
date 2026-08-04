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

## Correctivo requerido

Crear RC1.1 incremental desde RC1 y:

1. reconocer de forma explícita el host canónico y su alias firebaseapp;
2. normalizar toda navegación directa al runtime real A&S;
3. bloquear fail-closed cualquier modo demo en el host canónico;
4. añadir smoke browser real sobre la URL sin parámetros;
5. exigir store Firestore, autenticación Firebase, conteos reales y cero semillas visibles;
6. mantener datos, backend y RC1 histórica intactos;
7. documentar el patrón para Cloud/Claude y Academia.

## Estado

```text
RC1 desplegada: sí, pero visualmente inválida para operación
Firestore real: preservado
escrituras inesperadas: no detectadas
root fix source-only: en preparación
deploy correctivo: no autorizado todavía
```
