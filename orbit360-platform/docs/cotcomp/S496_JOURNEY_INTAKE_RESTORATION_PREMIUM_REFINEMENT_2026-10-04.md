# S4.96 · Journey & Intake Restoration + Premium Refinement

**Fecha:** 2026-10-04  
**Estado:** `LAB CANDIDATE / GOVERNANCE-REBASed / NO PRODUCTION`

## Governance inputs
- A&S `COTCOMP_CANONICAL_CONTEXT_v1.0_2026-10-04`
- A&S `COTCOMP_LOCK_MATRIX_v1.0_2026-10-04`
- A&S `COTCOMP_COUNTRY_PRODUCT_INTAKE_MATRIX_v1.0_2026-10-04`
- A&S `COTCOMP_PREFLIGHT_CHANGE_CONTROL_v1.0_2026-10-04`
- Gravicentra↔CotComp authority handoff 2026-10-03

## Working parent
- S4.95 function: `cotcompPremiumVisualPreviewS495`
- branch: `ays/cotcomp-s495-premium-refinement-lab-20261004`
- parent HEAD observed before branch: `42a5442d399a5c7b4c6051575adbabf2132d5b00`
- owner state: REWORK / NO PASS

## Delta

### Cambia
- Hero becomes contained editorial composition; H1 uses Archivo.
- Product visual resolver remains deterministic when switching family/mode.
- Priscila scene is retained for consultative “Otros” rather than replacing every assisted product visual.
- Canonical four-stage journey restored:
  1. Lo que necesitas
  2. Tus datos
  3. Revisar opciones
  4. Comparar y continuar
- Back and reached-step navigation derive from actual state.
- Opening details/recommendation no longer advances journey.
- Country-aware intake restored for GT/CO.
- GT Auto/Moto, GT Gastos Médicos, CO Transporte and CO RC Profesional reuse existing functional truth.
- Public schemas for Hogar/Vida/Empresa/other remain at their real maturity.
- Comparison/details/recommendation hierarchy refined.

### No cambia
- A&S public shell.
- Seven visual families.
- Brand → Línea/modelo → Año UX.
- Cotizar + comparar as one public product.
- Gravicentra business authority.
- No silent weighting.
- Explicit Selection semantics.
- Provider and real transport gates.
- Production.

## Release
- `providerDeploymentAuthorized=false`
- `cotcompRealTransportAuthorized=false`
- `production=false`
- no real writes
- no provider/rater calls

## Owner acceptance oracle
REWORK if any:
- hero remains visually disproportionate;
- product image disappears during family/mode changes;
- back leaves stepper ahead;
- intake collapses to generic 3-field forms;
- “Otros” behaves as quote product;
- details/recommendation advance journey;
- automatic maturity is implied where not supported;
- production or real transport changes.
