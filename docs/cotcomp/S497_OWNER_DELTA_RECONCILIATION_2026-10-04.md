# CotComp S4.97 — Owner Delta Reconciliation

**Date:** 2026-10-04  
**Status:** FROZEN SPEC / NO UI IMPLEMENTATION YET  
**Purpose:** reconcile the recovered S4.10/S4.18 satisfactory visual lineage with later explicit Owner decisions, without treating later rejected candidates as parents.

## 1. Precedence rule

The S4.10/S4.18 artifact is the **forensic recovery anchor** for product-workspace geometry, typography roles, spacing density, stage architecture, comparison hierarchy and contextual replanning.

Later explicit Owner decisions remain authoritative deltas when they do not require inheriting the rejected S4.95/S4.96/S4.96B composition.

Therefore this is **not a blind rollback**.

## 2. Later Owner decisions that remain binding

### OD-01 — Public headline
Keep:
- “Cotiza y compara”
- “con criterio”

This replaces the historical opening copy only as content. It does not authorize a different typography role.

**Typography lock:** H1 uses the A&S display role proven in the satisfactory CotComp and preserved major surfaces: **Archivo 900**, not Newsreader.

### OD-02 — Human photography in the opening
Keep a human/contextual photograph in the CotComp opening.

This is an authorized later delta, but it must not recreate the rejected stretched marketing hero.

Required composition:
- photograph is a bounded contextual figure;
- explicit fixed aspect ratio at each breakpoint;
- `object-fit:cover`;
- asset-specific `object-position`;
- independent from form/workspace height;
- no width/height coupling to the intake below;
- no full-height stretch caused by parent grid;
- no repeated use of the same image as route/assistance fallback.

The approved A&S surface pattern is text + contextual figure, not uncontrolled background stretching.

### OD-03 — Current A&S public shell
Keep the current A&S navigation/shell and country context.

The CotComp product workspace must sit inside that shell without becoming a separate SaaS dashboard or a detached marketing page.

### OD-04 — Seven visible families
Keep seven first-level visible families:
1. Vehículo / Movilidad
2. Hogar
3. Salud / Gastos médicos
4. Vida / Ingreso
5. Empresa
6. Transporte / Carga
7. Otros / No sé cuál necesito

Historical routes that are still functionally required remain available beneath the seven-family surface:
- Contrato / obligación / proyecto;
- Revisar póliza existente.

They must not be deleted simply because they are not first-level cards.

### OD-05 — Rich dimensional icons
Keep the improved dimensional icon language.

Do not regress to flat line icons.

### OD-06 — Recomendación A&S
Keep a visible Recomendación A&S after comparable alternatives exist.

It must:
- explain trade-offs;
- not silently rank;
- not declare a universal winner;
- distinguish recommendation/orientation from explicit user selection.

### OD-07 — Multi-product intake
Keep country/product-specific intake depth and progressive disclosure.

The historical compact visual density is the visual authority; S4.96 domain depth is a portable functional delta.

### OD-08 — Vehicle pattern
Keep searchable:
Marca → Línea/modelo → Año

This is part of Auto intake, not the whole intake.

### OD-09 — Journey continuity
Keep the four stages:
1. Lo que necesitas
2. Tus datos
3. Revisar opciones
4. Comparar y continuar

Back/forward must reconcile the actual state, not only the stepper.

## 3. Reconciled opening contract

The next opening must combine:

### From recovered visual lineage
- Archivo 900 H1;
- editorial A&S spacing/density;
- clear kicker;
- compact context/continuation information;
- product workspace visually dominant;
- no oversized decorative hero that pushes the journey down.

### From later Owner decisions
- “Cotiza y compara con criterio”;
- contextual human photograph;
- current A&S shell.

### Proposed structural contract
Desktop:
- content width aligned to A&S site container;
- two-column opening;
- copy column ~52–58%;
- image figure ~42–48%;
- figure bounded and no taller than the copy block;
- workspace begins immediately after opening with controlled overlap/continuity only if the approved shell supports it.

This is a **contract**, not yet an implementation.

## 4. Reconciled family-selection contract

Do not reuse the rejected seven equal cards stretched across one row.

Desktop:
- compact multi-row grid;
- preferred layout: 4 + 3 or responsive `repeat(auto-fit,minmax(...))`;
- 12–16px gap;
- consistent card height;
- dimensional icon on the left/top according to available width;
- label + descriptor with enough internal padding;
- selected state clear but not oversized.

Tablet/mobile:
- 2 columns where readable;
- 1 column at narrow mobile;
- no horizontal squeeze;
- targets >=44px.

## 5. Reconciled product-visual contract

The right/contextual visual cannot be a single fallback photo reused everywhere.

Visual resolver must be explicit:
`country × family × subtype/context × journeyMode → approved/candidate asset`

Fallback priority:
1. exact family/subtype asset;
2. family asset;
3. neutral A&S orientation asset;
4. no image + designed contextual panel.

Never fall back to an unrelated repeated human photo.

## 6. Asset governance

Library-first.

Every asset used in the next candidate must have:
- stable asset ID/path;
- provenance/status;
- role;
- family/context;
- aspect ratio;
- crop rule;
- object-position;
- allowed breakpoints;
- repeat policy.

No asset becomes APPROVED solely because it exists in the library.

## 7. Lower hierarchy contract

The recovered comparison model is the authority:
- criterion-first comparison;
- explicit differences;
- clear orientation/recommendation block;
- explicit decision action;
- contextual replanning.

Later “utility boxes” cannot replace this hierarchy.

Any lower informational blocks must have a real action or explanatory purpose; no decorative dead cards.

## 8. Typography roles

- **Archivo:** H1, H2/H3, stage titles, important numerical/decision headings.
- **Instrument Sans:** body, fields, UI, navigation, labels.
- **IBM Plex Mono:** kicker, stage micro-labels, statuses/technical microcopy only.
- **Newsreader:** optional editorial supporting voice only where explicitly justified; never the CotComp H1 or functional UI.

Minimum targets for the next candidate:
- body/UI primary: >=14px desktop;
- form controls: >=15px;
- labels: >=12px;
- stage/section headings: materially larger than body and visually separated;
- no 10–11px copy for primary user information.

## 9. Implementation strategy after audit closure

Do not inherit S4.94/S4.95/S4.96/S4.96B visual CSS.

Build a clean CotComp visual parent from:
- exact recovered product-workspace contract;
- current A&S shell;
- the Owner-authorized deltas in this document.

Port functional changes individually:
1. shell/opening;
2. family selector;
3. stage 1;
4. stage 2 intake;
5. stage 3 review;
6. stage 4 compare/recommend;
7. assisted handoff;
8. responsive.

After each step:
- deterministic screenshot;
- compare to golden reference + authorized delta spec;
- fail on unintended visual drift.

## 10. Current gate

No new Owner-review URL until:
- exact asset map is frozen;
- golden reference pack is registered;
- screenshot regression mechanism is ready;
- clean parent strategy is implemented without inherited override stack.

Production remains untouched.
