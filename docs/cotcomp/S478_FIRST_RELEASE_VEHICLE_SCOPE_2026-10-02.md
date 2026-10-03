# CotComp · S4.78 · First-release GT vehicle scope + blocker classification

**Fecha:** 2026-10-02  
**Estado inicial:** `SOURCE-ONLY / RELEASE SCOPE DEFINED / DELIVERY SURFACE PENDING`

## Objective

Resolve the first S4.77 hard blocker without pretending that every SAT vehicle type belongs in the first public GT Auto/Moto journey.

## Evidence-based first-release scope

### AUTO_LIGHT
Public label:
`Automóvil / SUV / Pickup`

SAT types:
- `AUTOMOVIL`
- `CAMIONETA`
- `PICK UP`

Evidence basis:
- real Yaris quote corpus demonstrates Automóvil;
- real CX-5/CRV quote corpus demonstrates Camioneta/SUV-type risks;
- preserved Gravisentra quotation material explicitly distinguishes Automóvil / SUV / Pick Up.

### MOTO
Public label:
`Motocicleta`

SAT type:
- `MOTO`

Evidence basis:
- real Pulsar quote corpus;
- preserved Gravisentra quotation material includes Motocicleta.

All other SAT types remain:
`OTHER_REQUIRES_REVIEW`

They are not silently rejected as uninsurable; they route to hybrid/consultative handling.

## Alias blocker reclassification

Reviewed aliases are valuable, but **not a hard release blocker** because:
- exact SAT options remain searchable;
- compact search already surfaces CRV→CR-V candidates;
- CX-5 search surfaces the available SAT trim candidates;
- absent models such as Pulsar can use `OTHER_REQUIRES_REVIEW`.

Therefore:
- alias review = non-blocking enhancement;
- silent alias merge remains forbidden.

## Hard blocker after S4.78

Only:
`CATALOG_DELIVERY_SURFACE_REQUIRED`

The W5 Corolla 2006 Proposal evidence gap remains independent:
`MATCHING_REAL_PROPOSAL_EVIDENCE_REQUIRED_FOR_W5_COROLLA_2006`.

## Boundaries

No deployment, app-data access, provider/rater or production.
