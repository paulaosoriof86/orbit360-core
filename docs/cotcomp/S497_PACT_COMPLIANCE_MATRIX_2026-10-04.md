# CotComp S4.97 — Pact Compliance Matrix

**Date:** 2026-10-04  
**Status:** CLEAN PARENT SOURCE BUILT · FAIL-CLOSED GATES ACTIVE · NO OWNER URL · NO DEPLOYMENT

## Purpose

Convert the agreed recovery rules into machine-enforced conditions so the next Owner review cannot advance merely because a page renders or DOM tests pass.

This matrix is binding for the next CotComp candidate.

| Pact / decision | Enforcement | Current state |
|---|---|---|
| Do not use S4.94/S4.95/S4.96/S4.96B as visual parent | `cotcomp-s497-visual-contract-gate.js` rejects legacy requires/version override selectors | ENFORCED |
| Use S4.10/S4.18 as forensic visual anchor | anchor SHA pinned in gate + clean-parent manifest | ENFORCED |
| Preserve later Owner decisions | clean parent contains “Cotiza y compara con criterio”, seven first-level families, current shell pattern, A&S recommendation, deep vehicle intake | SOURCE PRESENT |
| H1 must use Archivo, not Newsreader | static source gate + screenshot evidence gate | ENFORCED |
| Human photo in hero without distortion | integrated right-side media contract; `object-fit:cover`; screenshot gate rejects distortion/height coupling | ENFORCED |
| No floating 4:3 hero card | static gate rejects `aspect-ratio:4/3` in hero and clean parent uses integrated media region | ENFORCED |
| No repeated family photography | unique family visual keys + screenshot gate rejects repeated visual | ENFORCED |
| Seven visible families without compressed single-row layout | 4-column desktop wrap, 2-column tablet, 1-column mobile | ENFORCED |
| Four-stage journey preserved | exact labels required by static + screenshot gates | ENFORCED |
| Deep intake preserved | Marca → Línea/modelo → Año and grouped fields in stage 2 | SOURCE PRESENT |
| Comparison remains criterion-first | required comparison criteria in static gate | ENFORCED |
| Recomendación A&S remains explainable | required by static + screenshot gates | ENFORCED |
| Replan/change need preserves context | required state evidence: `replan`, `changeNeed` | ENFORCED |
| No production / no real provider transport | manifest false + no-deploy test | ENFORCED |
| No accidental Firebase deployment of clean parent | no `onRequest`, not required/exported by `bootstrap.js` | ENFORCED |
| No Owner URL before visual evidence | clean parent manifest says `ownerReviewUrlAuthorized:false`; screenshot gate only returns true after all evidence passes | ENFORCED |
| Required visual evidence | 1440 / 1024 / 390 / 320 + stage1/2/3/4/replan/changeNeed screenshot SHA | GATE READY · EVIDENCE PENDING |
| CI enforcement on every S4.97 change | `.github/workflows/cotcomp-s497-contract-gate.yml` runs syntax + contract + no-deploy assertions | REGISTERED · EXECUTION RECEIPT NOT YET OBSERVED |
| Official A&S logo exact asset | source parent currently uses a text slot, not final logo bytes | BLOCKING BEFORE OWNER URL |
| Governed hero/family asset bytes packaged and verified | asset map frozen; source paths declared; runtime bytes not yet packaged | BLOCKING BEFORE OWNER URL |
| Pixel/visual compare against golden evidence | evidence registry exists; actual new screenshots not generated yet | BLOCKING BEFORE OWNER URL |

## Current implementation state

Created source-only clean parent:

`functions/cotcomp-clean-parent-s497.js`

Properties:
- no Firebase deployment export;
- no dependency on S4.94/S4.95/S4.96/S4.96B;
- current A&S public-shell pattern;
- integrated dark hero with right-side contextual media slot;
- Archivo 900 H1;
- seven first-level families;
- four-stage product workspace;
- grouped vehicle intake;
- review state;
- criterion-first comparison;
- Recomendación A&S;
- contextual replanning controls.

Created hard gates:

- `functions/cotcomp-s497-visual-contract-gate.js`
- `functions/cotcomp-s497-screenshot-regression-gate.js`
- `functions/cotcomp-clean-parent-s497.test.js`
- `functions/cotcomp-s497-screenshot-regression-gate.test.js`
- `functions/cotcomp-s497-no-deploy.test.js`

Registered commands:

`npm run check:cotcomp:s497`

`npm run test:cotcomp:s497`

Registered CI workflow:

`.github/workflows/cotcomp-s497-contract-gate.yml`

The workflow has read-only repository permission and contains no deployment step, no Firebase command and no secret usage. Its execution receipt has not yet been independently read back, so CI is not being claimed as PASS yet.

## Fail-closed rule

A new Owner-review URL is forbidden if **any** of the following remains true:

1. official logo not wired from governed bytes;
2. hero/family assets not packaged with hashes and role mapping;
3. screenshot evidence missing for any required viewport/state;
4. H1 computed font is not Archivo;
5. hero image is distorted or coupled to workspace height;
6. horizontal overflow occurs;
7. a family visual is repeated unexpectedly;
8. minimum body/control/label size fails;
9. four-stage journey, recommendation or replanning is missing;
10. provider deployment, real transport or production gates differ from false.

## Guarantee boundary

No process can guarantee that software will never contain a defect. What is guaranteed by this recovery design is the **gate behavior**: a candidate that violates the frozen checks must remain blocked and must not be presented as Owner-ready.

The next action is therefore not deployment. It is:
1. package governed visual assets;
2. wire exact official logo;
3. render locally/LAB-isolated without promotion;
4. generate the required visual evidence receipt;
5. run S4.97 gates;
6. only if all PASS, open Owner review.
