# CotComp · S4.80 · LAB dropdown UX integration preview

**Fecha:** 2026-10-03  
**Estado inicial:** `DEVELOPED / ZERO-PERSISTENCE / LAB PREVIEW`

## Objective

Validate the user-facing Marca → Línea/Modelo → Año interaction before changing the real CotComp intake.

This preview intentionally contains:
- no personal data;
- no QuoteCase creation;
- no consent;
- no provider/rater;
- no insurer eligibility;
- no production behavior.

## Interaction

1. Choose public vehicle class:
   - Automóvil / SUV / Pickup;
   - Motocicleta.
2. Search/select Marca.
3. Search/select dependent Línea/Modelo.
4. Select Año.
5. Press `Validar selección`.
6. The page resolves the canonical catalog identity using S4.79 and explicitly states that nothing was saved.

## UX safety

If a vehicle is not present, the future journey must offer:
`No encuentro mi vehículo`

That path maps to:
`OTHER_REQUIRES_REVIEW`

No fuzzy or alias candidate is silently selected.

## Architecture

The preview calls the already deployed same-origin LAB catalog endpoint:
`/cotcompVehicleCatalogS479`.

It does not duplicate the catalog or make Firestore calls.

## Release truth

S4.80 can be declared deployed only after:
- accumulated QA remains PASS;
- function-only LAB deploy succeeds;
- physical GET returns the expected controls;
- no PII fields are present;
- POST is rejected;
- production remains untouched.

The preview is not the real public CotComp intake.
