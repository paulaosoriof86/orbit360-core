# CotComp S4.87 — Approved visual convergence

**Fecha:** 2026-10-03  
**Estado esperado:** LAB / fixture-only / Owner visual review candidate  
**Visual parent:** promoted S3 baseline SHA `50aa4190ae22ad13760f893b9bf37415abe35fb7327e034f66dc565b9b2cbf1d`  
**Provider contract:** `gravicentra-quote-authority-v1`

## Objetivo

Converger la UX multiproducto ya validada en S4.86 con la superficie visual de Cotizador/Comparador contenida en la página A&S promovida en F7.

S4.87 no rediseña la web ni crea una identidad nueva. Reutiliza como referencia visual:
- fondo marfil `#F4F1EA`;
- acento A&S `#E4002B`;
- texto principal `#12110F`;
- tipografía funcional/display de la superficie promovida;
- kicker editorial;
- chrome de espacio de trabajo;
- riel lateral de recorrido;
- tabs `Cotización en línea` / `Con acompañamiento`;
- progreso en 7 macro pasos;
- jerarquía de cards, bordes, radios y estados.

## Funcionalidad preservada

- 7 familias de entrada:
  1. Vehículo / movilidad.
  2. Hogar.
  3. Salud / gastos médicos.
  4. Vida / ingreso.
  5. Empresa.
  6. Transporte / carga.
  7. Otros / no sé cuál necesito.
- patrón vehicular Owner-approved Marca → Modelo → Año;
- fallback `No encuentro...`;
- schema-driven;
- no schema inventado para Hogar/Salud/Vida/Otros;
- orientación asistida cuando falta schema autoritativo.

## Truth / release

Esta superficie no autoriza transporte real.

Se mantienen:
- `providerDeploymentAuthorized=false`;
- `cotcompRealTransportAuthorized=false`;
- no PII;
- no QuoteCase write;
- no provider/rater;
- no producción.

## Criterio de cierre

S4.87 solo puede cerrarse visualmente con revisión Owner explícita.  
PASS técnico/físico no equivale a promoción visual.
