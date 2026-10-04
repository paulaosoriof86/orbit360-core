# CotComp S4.96B — Frontend Recovery LAB Review Gate

**Fecha:** 2026-10-04  
**Función:** `cotcompFrontendRecoveryPreviewS496B`  
**URL LAB:** https://us-central1-ays-orbit-360-lab.cloudfunctions.net/cotcompFrontendRecoveryPreviewS496B  
**Visual parent:** S4.95 integrated surface  
**Logic source:** governed S4.96 journey/intake only  
**Deployed source commit:** `a230a472c36d6aa01a406cd7383fd125c4a31f02`  
**Workflow:** `37214847237` — SUCCESS  
**Estado:** READY FOR OWNER REVIEW / NOT OWNER PASS

## Recovery decisions

S4.96 visual output is rejected and has no visual-parent authority.

S4.96B restores S4.95 as the surface parent and only ports the functional assets required from S4.96:
- canonical four-stage journey;
- progressive intake;
- country/product-specific capture;
- back/forward state;
- comparison stage gating;
- explicit alternative choice semantics;
- no real provider transport.

## Visual recovery implemented

- hero image moved to a bounded editorial card; it no longer inherits content/form height;
- hero headline returns to the S4.95 editorial family;
- product scene uses a bounded ~4:3 card independent of intake height;
- route scenes remain family-specific;
- assisted mode no longer forces one consultative/Priscila photo across all products;
- raw internal status labels are replaced with user-facing wording;
- field labels/body scale increased;
- intake is progressive instead of one dense long form;
- comparison cards and actions receive stronger hierarchy;
- lower utility strip is replaced in the final stage by three designed action cards:
  - Ver las diferencias clave;
  - Entender la recomendación;
  - Continuar con un asesor.

## Runtime defect found and corrected

The S4.95/S4.94 async parent renderer could overwrite the S4.96B-owned form after initial load. The first live browser audit caught this because the old reduced vehicle form reappeared.

Root fix:
- every journey stage now writes an explicit stage-ownership marker;
- a reconciliation observer restores the current governed stage if the parent renderer mutates the form;
- startup reconciliation checks the same ownership at multiple settle points.

Final browser regression on build `a230a472c36d6aa01a406cd7383fd125c4a31f02`:
- initial stage ownership: PASS;
- vehicle progressive intake 1/3: PASS;
- next/back with preserved values: PASS;
- bounded product visual: PASS;
- seven family scenes visually distinct in tested run: PASS;
- assisted mode does not collapse Vehicle/Empresa to the same photo: PASS;
- raw internal states absent: PASS;
- review/comparison reachable: PASS;
- three lower action cards visible: PASS;
- hero bounded rather than stretched: PASS.

## Gates

- `providerDeploymentAuthorized=false`
- `cotcompRealTransportAuthorized=false`
- production untouched;
- fixture/LAB only;
- browser QA PASS does not equal Owner PASS.

## Next decision

Owner reviews S4.96B visually and functionally. Any further change is a delta over this recovery candidate and must not reintroduce S4.96 visual regression or alter the locked journey/domain rules.
