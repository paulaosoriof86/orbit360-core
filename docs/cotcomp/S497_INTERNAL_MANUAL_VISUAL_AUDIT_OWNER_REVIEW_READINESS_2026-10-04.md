# CotComp S4.97 — Internal Manual Visual Audit and Owner Review Readiness

**Date:** 2026-10-04  
**Scope:** S4.97 clean parent, source-only LAB candidate  
**Result:** **PASS FOR OWNER REVIEW CANDIDATE / NOT PRODUCTION APPROVAL**

## Evidence basis

- audited source commit before readiness bookkeeping: `cfbcd2f9cbccf5359f8f0f2659225e2665f203a8`;
- Contract Gate run: `37251478642` / run #62 — **SUCCESS**;
- Visual Evidence run: `37251478643` / run #52 — **SUCCESS**;
- visual artifact: `11320378856`;
- artifact digest: `sha256:4fdd844a364aae88af10c82ba2d1d5909c8a7404a06593379677454726fc0a0b`;
- forensic anchor SHA-256: `a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d`.

This audit is an internal release-readiness review. It does **not** replace Owner approval of the candidate visuals and does **not** approve production.

## Manual visual findings

### Opening / shell — PASS

- H1 remains **Archivo 900**.
- “Cotiza y compara con criterio” remains the public headline.
- Human photography is integrated inside the dark editorial hero rather than placed in a floating 4:3 card.
- Desktop hero is physically **390px** at 1440 and 1024 widths, inside the frozen 350–390px contract.
- The hero image uses `object-fit: cover`, shows no measured distortion and is not coupled to workspace height.
- At 1024px the full navigation is hidden before crowding; country context and advisor action remain visible.
- No horizontal overflow was detected at 1440, 1024, 390 or 320.

### Product workspace — PASS

- Four stages remain visible and coherent: Lo que necesitas → Tus datos → Revisar opciones → Comparar y continuar.
- Seven first-level families remain visible.
- Desktop family layout is 4 + 3; narrow mobile is one column.
- Family visual positions remain unique; no primary visual repetition was detected.
- The recovered compact product-workspace hierarchy remains visually dominant over decorative content.

### Intake depth and progressive disclosure — PASS

- Vehicle flow preserves searchable **Marca → Línea/modelo → Año**.
- Brand and model are dependent comboboxes with keyboard selection.
- Model year starts unselected; the UI does not invent a year.
- Missing brand/model routes to assisted review without forcing an approximate value.
- Health spouse DOB is hidden by default and appears only after explicit spouse inclusion.
- Dynamic dependent DOB fields respond to the declared child count and start blank.
- Colombia transport exposes specialized operational fields with human-readable public labels.
- “Otros” preserves the deeper contract/obligation route.
- Back navigation preserves compatible entered data and synchronizes the visible stage.

### Review / comparison / recommendation — PASS

- S4.97 does not claim that visual examples are real quotations.
- Visual comparison fixtures contain no fabricated premium, deductible or coverage amounts.
- Real comparability remains fail-closed until validated proposals exist.
- Criterion-first comparison is preserved.
- “Recomendación A&S” remains explanatory and distinct from explicit user choice.
- Context-preserving replanning remains available.

## Automated receipt highlights

- Desktop hero height: 390px at 1440 and 1024.
- H1: Archivo / weight 900 at all tested breakpoints.
- No horizontal overflow at all four required breakpoints.
- Minimum primary body text: 14.5px.
- Minimum control text: 15px.
- Minimum label text: 12px.
- Vehicle combobox search, dependency, keyboard selection, explicit year and assisted fallback: PASS.
- GT health progressive disclosure: PASS.
- CO transport specialized intake: PASS.
- Other → Contract route: PASS.
- State preservation on back navigation: PASS.

## Security / authority boundary — unchanged

- `providerDeploymentAuthorized=false`
- `cotcompRealTransportAuthorized=false`
- `production=false`
- no insurer/provider rater is called by S4.97;
- no production deployment is authorized;
- visual fixtures are source-only presentation evidence.

## Release decision

The internal audit authorizes creation of a **LAB-only Owner Review candidate** that wraps the S4.97 clean parent without converting S4.97 itself into a deployable parent.

The next candidate must:
1. deploy only to `ays-orbit-360-lab`;
2. preserve provider/real-transport/production gates as false;
3. expose GET only;
4. keep the S4.79 read-only vehicle catalog as the only live LAB catalog dependency;
5. pass physical readback before its URL is sent to the Owner;
6. remain blocked from production until explicit Owner approval and subsequent release gates.
