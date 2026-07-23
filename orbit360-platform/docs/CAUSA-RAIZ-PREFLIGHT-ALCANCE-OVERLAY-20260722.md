# CAUSA RAÍZ — PREFLIGHT CON ALCANCE ACUMULATIVO

**Fecha:** 2026-07-22  
**Gate:** `block1-client360-insurers-lab-v20260717`  
**Contrato de producto:** 1.0.38  
**Clasificación:** `VALIDATOR_STALE` + `PIPELINE_MECHANISM_FAILURE`

## Evidencia

La primera validación estática, run `29971750026`, se detuvo antes del motor porque el lifecycle todavía describía el transformador de dry-run retirado.

La segunda validación, run `29971998354`, sí llegó al motor:

```text
846 PASS
15 FAIL
861 total
```

Los fallos no correspondían al patch funcional 1.0.38. Provenían de:

- owners globales de extensiones históricas que no pertenecían al gate activo;
- contratos PWA y runtime 20260717 heredados por acumulación;
- checks de workflow escritos para una fase runtime;
- publicación de evidencia con un nombre válido pero distinto del esperado por el motor antiguo.

En ambos runs:

```text
dataAccess=false
secretAccess=false
writes=false
runtime=false
browser=false
deploy=false
```

## Causa raíz

El motor anterior hacía tres uniones acumulativas:

1. todos los `canonicalOwners` del registro y sus extensiones;
2. todos los `runtimeVersionContracts` históricos del gate base;
3. los nuevos owners y contratos declarados por el overlay.

Por ello, un `STATIC_PREFLIGHT` de directorio operativo terminaba validando bridges, Academias, PWA, Service Worker y gate runtime de revisiones anteriores.

El problema no se resuelve actualizando uno por uno esos 15 tokens. Eso convertiría contratos ajenos en dependencias artificiales del gate actual.

## Corrección estructural

El overlay activo puede declarar:

```text
replaceCanonicalOwners=true
replaceRequiredFiles=true
replaceRuntimeVersionContracts=true
```

Cuando esas banderas están activas:

- sus owners son el alcance canónico completo del preflight;
- sus archivos requeridos sustituyen los heredados;
- sus contratos de versión sustituyen los del runtime histórico;
- las extensiones continúan disponibles para sus propios gates, pero no bloquean este;
- el workflow publica la evidencia canónica y declara `static_preflight`;
- el motor no transforma archivos ni toca producto o datos.

## Separación de responsabilidades

```text
Producto 1.0.38:
  usuario y cuenta operativos
  contraseña protegida

Preflight:
  valida únicamente el overlay activo

Arquitectura:
  preserva owners base, PWA, Router, Legal y Access

Dry-run de datos:
  permanece bloqueado hasta GO estático
```

## Predicado de cierre

```text
GO_GATE_CONTRACT
canonicalOwnerScope=overlay_replace
runtimeContractScope=overlay_replace
operational-directory contract=PASS
architecture=GO_STATIC_ARCHITECTURE
sourceTransformed=false
dataAccess=false
secretAccess=false
writes=false
runtime=false
browser=false
deploy=false
```

Este cierre no autoriza Firestore, bóveda, aplicación de datos, Hosting, Functions, Rules, producción, M2 ni merge.
