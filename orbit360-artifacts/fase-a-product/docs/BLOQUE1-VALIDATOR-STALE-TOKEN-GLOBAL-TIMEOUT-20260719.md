# Bloque 1 · VALIDATOR_STALE por token global ambiguo

Fecha: 2026-07-19

## Fuente

- Run oficial: `29671215628`.
- HEAD probado: `d7e10052298dc3cf4f7202f81ad202163848ed41`.
- Gate: `block1-client360-insurers-lab-v20260717`.
- Contrato funcional: `1.0.27`.

## Clasificación

`VALIDATOR_STALE`

## Primera falla

El preflight ejecutó 974 controles: 973 pasaron y uno falló antes de Firebase, navegador y gate funcional.

```text
RUNTIME_GRAPH_NO_RETIRED_REF:
tools/orbit360-gate-runtime-crm-v20260716.mjs:
const deadline = Date.now() + 60000
```

## Causa raíz

El registro trataba una cadena genérica de presupuesto temporal como referencia retirada global. El preflight buscaba esa cadena en todos los archivos del grafo, aunque el gate conjunto la utiliza legítimamente para observar `DOMContentLoaded`.

La regla global era demasiado amplia: identificaba una duración, no un mecanismo retirado.

## Corrección

- Congelar producto, backend protegido, datos y validadores funcionales.
- Retirar solo el literal ambiguo de la lista global efectiva.
- Conservar todas las referencias retiradas específicas de archivos, owners y mecanismos.
- Mantener intacto el gate de roles responsivos 1.0.27.
- Ejecutar el gate oficial una sola vez después de `GO_GATE_CONTRACT`.

## Evidencia preservada

- 414 clientes.
- 26 aseguradoras.
- 7 asesores.
- Dirección desktop aprobada en el run anterior.
- Cliente 360, directorio, ficha y conocimiento de Aseguradoras aprobados en Dirección.
- Sin cambios en `Orbit.store`, Auth, Router, reglas, CSS responsivo ni datos.

## Claude

`REPLICABLE_CLAUDE_ACUMULADO`: los tokens globales de retiro deben describir mecanismos o artefactos específicos; no deben usar literales genéricos reutilizables en etapas vigentes.

## Academia

Explicar la diferencia entre un defecto funcional y un falso negativo causado por una regla global demasiado amplia en el preflight.
