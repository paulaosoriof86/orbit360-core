# CotComp S4.84 — Provider-side contract consumer · source-only

**Fecha:** 2026-10-03  
**Contrato proveedor:** `gravicentra-quote-authority-v1`  
**Estado esperado del gate:** source-only / schema-driven / multiproduct / real transport fail-closed

## Autoridad

Gravicentra conserva autoridad sobre:
- aseguradora;
- producto/plan;
- elegibilidad;
- reglas/tarifas;
- premium breakdown;
- impuestos;
- fraccionamiento/financiamiento;
- fuentes y bindings;
- versiones/vigencias;
- Proposal y facts normalizados.

CotComp conserva autoridad sobre:
- journey público;
- captura progresiva;
- UX/presentación;
- Comparison UX;
- explicit user choice;
- analítica de funnel.

## Multiproducto / schema-driven

CotComp no define formularios rígidos por ramo. Consume `intakeSchemas` versionados entregados por Gravicentra y resuelve el esquema más específico por:

`country + lineOfBusiness + productId + riskType + insurerId + planId`.

Si no existe un esquema compatible, el estado correcto es:

`REQUIRES_PROVIDER_SCHEMA`

No existe fallback silencioso a Auto ni a un formulario genérico que invente requisitos.

Los campos, condiciones, opciones y referencias de conocimiento se proyectan desde schema provider-side. CotComp puede controlar presentación, progresividad y accesibilidad, pero no convertir esos metadatos en una segunda base de reglas de negocio.

## Knowledge

El consumer conserva referencias autorizadas (`knowledgeRefs`) y no replica el corpus documental. La base de conocimiento de aseguradoras permanece compartida conceptualmente y gobernada por Gravicentra según rol/capacidad.

## Financial truth

CotComp:
- no suma ni recalcula importes;
- no aplica defaults tributarios;
- no aplica defaults financieros;
- no completa primas ausentes;
- no llama directamente a aseguradoras/rater;
- no convierte `MISSING` en `NOT_COVERED`;
- no realiza ranking silencioso;
- no recalcula Proposal histórica.

## Selection

SelectionHandoff requiere `explicitUserChoice=true` y conserva:

`USER_SELECTED_FOR_CONTINUATION != ISSUED != BOUND != CONFIRMED`.

## Release boundary

Para S4.84:
- `providerDeploymentAuthorized=false`;
- `cotcompRealTransportAuthorized=false`;
- transporte permitido: `FIXTURE_SOURCE_ONLY`;
- runtime real: fail-closed hasta LAB transport PASS.

El siguiente gate después de este source-only proof deberá consumir el transporte Manifest/Quote/Proposal/Selection entregado por Gravicentra y probarlo en LAB antes de autorizar integración real.
