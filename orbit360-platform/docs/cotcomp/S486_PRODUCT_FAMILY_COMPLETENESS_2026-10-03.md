# CotComp S4.86 — Product-family completeness

**Fecha:** 2026-10-03  
**Estado esperado:** LAB / fixture-only / Owner review candidate  
**Contrato provider-side:** `gravicentra-quote-authority-v1`

## Objetivo

Cerrar la brecha detectada en S4.85: una UX técnicamente multiproducto no debe parecer comercialmente limitada a Vehículo, Empresa y Carga.

La entrada pública de referencia debe mostrar siete familias:

1. Vehículo / movilidad.
2. Hogar.
3. Salud / gastos médicos.
4. Vida / ingreso.
5. Empresa.
6. Transporte / carga.
7. Otros / no sé cuál necesito.

## Regla schema-driven

La presencia visual de una familia no autoriza a CotComp a inventar:
- preguntas de suscripción;
- reglas de elegibilidad;
- coberturas;
- tarifas;
- primas;
- impuestos;
- fraccionamiento;
- disponibilidad por aseguradora.

Cuando el fixture no contiene un schema autoritativo para una familia, la superficie debe enrutar a orientación asistida.

## Preservaciones

S4.86 conserva:
- el patrón Owner-approved de vehículo: Marca searchable → Modelo searchable dependiente → Año;
- `No encuentro mi marca` / `No encuentro mi línea / modelo`;
- ausencia de scaffolding técnico S4.80A;
- no PII;
- no QuoteCase write;
- no provider/rater;
- no transporte real.

## Release boundary

`providerDeploymentAuthorized=false`  
`cotcompRealTransportAuthorized=false`

El despliegue de S4.86 en LAB es únicamente una candidata UX para revisión Owner. No cambia el gate independiente:

`GRAVICENTRA_MANIFEST_QUOTE_PROPOSAL_SELECTION_LAB_TRANSPORT_PASS_REQUIRED`.
