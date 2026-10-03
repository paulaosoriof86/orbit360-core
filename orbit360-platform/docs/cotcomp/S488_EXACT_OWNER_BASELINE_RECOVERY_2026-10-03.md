# CotComp S4.88 — Exact Owner Baseline Recovery

**Fecha:** 2026-10-03  
**Objetivo:** recuperar el frontend CotComp aprobado sin reconstrucción visual.

## Autoridad visual recuperada

Fuente Library:
- `OWNER_REVIEW_COTCOMP_S4_10_STANDALONE.html`
- `OWNER_REVIEW_COTCOMP_S4_18_STANDALONE.html`

Verificación física:
- ambos archivos = **byte-identical**;
- SHA-256 exacto:
  `a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d`.

La documentación F8 preservada establece:
- S4.10 preserva la experiencia CotComp Owner-approved;
- S4.13/S4.18 no introducen delta visual desde S4.10.

Por tanto S4.88 no interpreta, no aproxima y no rediseña la superficie: la sirve desde el artefacto exacto reconstruido byte-for-byte.

## Recuperación

El HTML exacto se almacena en chunks técnicos únicamente porque el Contents API no soportó de forma fiable una escritura única de ~6 MB desde este entorno.

Runtime:
1. concatena 28 chunks en orden;
2. calcula SHA-256;
3. falla cerrado si el digest no coincide con el baseline;
4. solo entonces sirve el HTML.

El resultado HTTP debe tener el mismo SHA-256 que el standalone aprobado.

## Portafolio que ya existe en el frontend recuperado

La baseline S4.10/S4.18 ya contiene:
- Auto / movilidad;
- Hogar;
- Gastos Médicos / Seguro de salud según país;
- Vida e ingreso;
- Empresa;
- Flotilla / transporte / carga;
- Contrato / obligación / proyecto;
- Revisar póliza existente;
- No estoy seguro.

Esto confirma que la reconstrucción posterior S4.85–S4.87 había reducido/alterado una experiencia que ya era más completa.

## Regla de continuidad

S4.87 queda **REJECTED AS VISUAL PARENT**.

Cualquier trabajo posterior debe:
- usar S4.10/S4.18 exacto como parent visual;
- introducir únicamente deltas explícitamente autorizados;
- comprobar side-by-side / hash / DOM contract según corresponda;
- no recrear por memoria una superficie owner-approved.

## Boundary técnico

La recuperación exacta no abre integración real:
- `providerDeploymentAuthorized=false`;
- `cotcompRealTransportAuthorized=false`;
- no producción;
- no rater/provider real.

El objetivo de S4.88 es recuperar la autoridad visual perdida antes de continuar integración.
