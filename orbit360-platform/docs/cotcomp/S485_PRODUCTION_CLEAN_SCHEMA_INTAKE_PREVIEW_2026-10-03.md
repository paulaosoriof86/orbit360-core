# CotComp S4.85 — Production-clean schema-driven intake preview

**Fecha:** 2026-10-03  
**Contrato provider-side:** `gravicentra-quote-authority-v1`  
**Ambiente:** LAB / fixture-only  
**Objetivo:** demostrar una UX de intake adaptable y multiproducto sin conectar transporte real.

## Qué demuestra

- entrada need-oriented;
- múltiples recorridos/productos con un renderer común;
- campos definidos por schema fixture con forma compatible al consumer S4.84;
- condiciones de captura progresiva;
- componente vehicular Owner-approved preservado: Marca searchable → Modelo searchable dependiente → Año separado;
- fallback accionable a revisión asistida;
- limpieza de scaffolding S4.80A: sin `Validar selección`, sin `Selección validada`, sin copy de persistencia técnica.

## Qué NO demuestra

- no Manifest real;
- no Quote real;
- no Proposal real;
- no Selection transport real;
- no provider/rater;
- no persistencia;
- no producción;
- no autorización de deployment provider-side.

## Release truth

`providerDeploymentAuthorized=false`  
`cotcompRealTransportAuthorized=false`

El preview puede desplegarse como superficie UX fixture-only en `ays-orbit-360-lab`. La integración CotComp ↔ Gravicentra continúa fail-closed hasta LAB transport PASS del contrato Manifest/Quote/Proposal/Selection.
