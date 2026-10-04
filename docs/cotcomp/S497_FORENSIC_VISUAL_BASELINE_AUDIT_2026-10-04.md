# CotComp S4.97 — Forensic Visual Baseline Audit

**Date:** 2026-10-04  
**Status:** FORENSIC RECOVERY ANCHOR IDENTIFIED / IMPLEMENTATION HOLD  
**Production:** untouched  
**providerDeploymentAuthorized:** false  
**cotcompRealTransportAuthorized:** false

## 1. Objective

Identify the exact CotComp visual lineage that Paula had already found satisfactory, distinguish it from later unapproved visual experiments, and prevent another candidate from being built on an invalid visual parent.

## 2. Root governance finding

S4.96B used S4.95 as visual parent. That was not a defensible recovery parent.

The project governance requires:
- exact parent identity;
- compare-to-approved;
- no automatic promotion of WORKBENCH / PASS FOR OWNER REVIEW candidates;
- fail-closed when parentage is wrong;
- physical visual contract, not preservation by intention.

Therefore:
- S4.95 is excluded as visual authority;
- S4.96 and S4.96B are excluded as visual authority;
- their functional work may only be ported later as explicit allowlisted deltas.

## 3. Recovered historical lineage

### S4.3
Owner findings had identified:
- compressed mobile rather than true responsive behavior;
- weak/malformed journey-progress controls;
- insufficient dimensional visual language;
- cards dominating the composition;
- compressed mobile comparison;
- competing CTA hierarchy.

S4.3 corrected responsive behavior, dimensional route icons, criterion-first mobile comparison and CTA hierarchy.

### S4.4
Owner findings then focused on:
- CotComp kicker alignment;
- route/product icons still too flat;
- Change Need and Replan restarting instead of preserving context.

S4.4 preserved the four-stage hierarchy and strengthened dimensional icons plus contextual replanning.

### S4.5
Owner explicitly reopened CotComp visual hierarchy only for stages 2, 3 and 4.

S4.5 added:
- premium visual grouping in stage 2;
- priority emphasis;
- stronger proposal cards and truth cues in stage 3;
- criterion icons, visual difference flags and stronger explainable orientation in stage 4.

### S4.6 — decisive Owner evidence
The S4.6 handoff states that the **CotComp visual structure was preserved because Owner considered it satisfactory**.

This is the strongest recovered evidence of a satisfactory Owner visual structure in the lineage.

### S4.7
S4.7 corrected hidden ranking and explicit user choice while declaring the visual preserved.

Exact standalone:
- file: `OWNER_REVIEW_COTCOMP_S4_7_STANDALONE.html`
- SHA-256: `60d6cd67618da09b3a892cd87738ae304266b29d907662e2145f311e33929fd9`

### S4.10
S4.10 added/normalized only contract-required public fields:
- GT Auto: brand + line/model;
- GT Health: exact DOBs;
- CO Transport: shipment/program choice, transport mode and conditional mode detail.

Exact standalone:
- file: `OWNER_REVIEW_COTCOMP_S4_10_STANDALONE.html`
- SHA-256: `a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d`

Forensic physical comparison S4.7 → S4.10:
- CotComp HTML section is byte-equivalent at the section level;
- CotComp visual style blocks are unchanged;
- the differences are in scripts/data contracts, not the visual surface.

Exact CotComp section SHA:
`758dcf6871fb3e3e03844f736ee0a99c5d0d76d1ed4a124b65e90abbe9a07928`

Combined CotComp visual CSS lock SHA:
`94a23c292fb6f271aaccf1ab6fe47b0506082de1d724c9688510a3be663fafbb`

### S4.13
The recovered S4.13 standalone is physically byte-identical to S4.10.

Exact standalone:
- file: `OWNER_REVIEW_COTCOMP_S4_13_STANDALONE.html`
- SHA-256: `a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d`

Physical `cmp`: PASS / identical bytes.

## 4. Forensic recovery decision

### FORENSIC_VISUAL_RECOVERY_ANCHOR
`OWNER_REVIEW_COTCOMP_S4_10_STANDALONE.html`

SHA-256:
`a7f1be79cdb6d8144f608dc559d69ebc38bb6347a03ad2733eac2bb914a4673d`

Equivalent exact artifact:
`OWNER_REVIEW_COTCOMP_S4_13_STANDALONE.html`

This is **not** being relabeled as a formal promoted Owner PASS. The master documentation still treated CotComp as Owner-review pending.

It is designated instead as:
`FORENSIC RECOVERY ANCHOR / OWNER-SATISFACTORY VISUAL LINEAGE`

Reason:
1. S4.6 records Owner satisfaction with the CotComp visual structure.
2. S4.7 preserves that visual while fixing comparison semantics.
3. S4.10 preserves the exact visual section/styles while adding contract-required data fields.
4. S4.13 is byte-identical to S4.10.
5. Later large marketing-hero experiments do not have stronger visual authority and were subsequently rejected/reworked.

## 5. Exact visual contract recovered from the anchor

### Surface architecture
CotComp is a **product workspace**, not a marketing landing hero followed by a form.

Public opening:
- kicker: `COTIZAR Y COMPARAR · {country}`
- H1: `Empecemos por lo que quieres proteger.`
- explanatory copy beside a compact dark continuation/eligibility card;
- four-stage workspace below.

### Typography
- H1: Archivo, weight 900.
- Major stage/section headings: Archivo.
- UI/body: inherited A&S / Instrument Sans system.
- Technical micro-labels only: IBM Plex Mono.
- No Newsreader H1 in the CotComp recovery anchor.

### Opening geometry
`.s42-wrap`
- max-width: 1240px;
- centered;
- responsive padding.

`.s42-hero`
- two-column grid;
- `1.15fr / minmax(320px,.65fr)`;
- 36px gap;
- no photographic hero panel;
- no full-width black marketing hero.

`.s42-hero h1`
- Archivo 900;
- `clamp(34px,4.7vw,66px)`;
- line-height .93;
- max-width 16ch.

### Four-stage shell
`.s42-shell`
- 220px journey rail + flexible stage area;
- radius 26px;
- dark rail / light stage;
- responsive collapse below 980px.

The journey is:
1. Lo que necesitas.
2. Tus datos.
3. Revisar opciones.
4. Comparar y continuar.

### Need selection
Desktop:
- 3 columns;
- 12px gap;
- route cards min-height 108px;
- padding 16px;
- icon + text horizontal composition.

Mobile:
- one column;
- compact card geometry;
- dimensional route icon retained.

This is materially different from the later seven equal horizontal cards used in S4.94–S4.96B.

### Data groups
- grouped white surfaces, radius 18px;
- 18px internal padding;
- 14px group gap;
- two-column field grid on desktop;
- 14px field gap;
- readable labels and controls;
- stage-2 premium icon hierarchy from S4.5;
- priority group has distinct visual emphasis.

### Proposal review
- pipeline communicates validation state;
- proposal cards are differentiated by status;
- truth cues remain visually separate;
- proposal card hierarchy was strengthened in S4.5.

### Comparison and recommendation/orientation
- comparison is criterion-first;
- dark comparison header;
- differences marked as differences, never universal winners;
- orientation panel is a dark editorial explanation block;
- explicit decision actions follow comparison;
- no hidden ranking.

### Responsive contract
Recovered CSS explicitly governs:
- <=980px;
- <=650px;
- <=360px;
with route, rail, field, pipeline, comparison and CTA transformations.

## 6. Exact visual block hashes

- `f7-s4-1-cotcomp-catalog-rework`:
  `b07da11b9535b6610e6faca813d625bea059a0ed6c8ba1749010fa67c6872e44`
- `f7-s4-2-cotcomp-hierarchy-adapter`:
  `d23da6fd91b2ed71cf7b4ba419087319701f15374be9379cab7f23544329bd36`
- `f7-s4-2-1-copy-nav-truth-fix`:
  `aed070c1993690ae28fabb322adc0cf4084b116b8b0366d37cf221fa1604b28c`
- `f7-s4-3-mobile-visual-language-rework`:
  `170d90293356c45d0443a36cd32900cdd776a8b6bd8431202192fecd1984573d`
- `f7-s4-4-desktop-polish-contextual-replan`:
  `9b04a0e0838166c162a7a133754c09fd06e8f5db25cf6fa3dbd4697d44b3fdf9`
- `f7-s4-5-visual-elevation`:
  `73fbc75175fee6dea279591e36a6d81120c7a41df6f495853c6670f47f6691c8`
- `f7-s4-cotcomp-workspace`:
  `28ab271b5e13e5bb58f73e1e5f24f3d3d8575283d17c054377d4ea196c31d5c4`

## 7. Later visual experiments excluded from recovery authority

The later S4.93–S4.96B direction introduced a different large marketing/photo hero and a different workspace composition.

Owner feedback subsequently identified:
- missing/poor hero photography;
- hero typography mismatch;
- stretched/distorted images;
- repeated imagery;
- weak lower hierarchy;
- small text;
- excessive/incorrect card spacing;
- loss of approved frontend composition.

Therefore those iterations remain evidence of rejected/rework directions, not recovery parents.

## 8. Functional deltas allowed for later port

Only after the exact anchor is restored:

- deeper country × product intake from the governed matrix;
- correct back/forward state;
- progressive disclosure where compatible with the anchor;
- vehicle searchable Brand → Line/model → Year;
- schema-driven field completion;
- explicit choice semantics;
- comparison gating;
- contextual assisted handoff;
- route-specific imagery only if it does not replace the anchor composition without a new visual gate.

## 9. Denylist for the next candidate

The next candidate may **not**:
- introduce another large marketing/photo hero;
- change the H1 font away from the recovered anchor;
- replace the 4-stage product workspace architecture;
- turn need selection into seven equal horizontal cards without an Owner gate;
- add visual CSS override stacks from S4.94–S4.96B;
- make cards the dominant composition;
- shrink field labels/body below the recovered responsive contract;
- alter stage 2/3/4 premium hierarchy outside an explicit allowlist;
- reuse one fallback photo across multiple families/states;
- expose internal technical language.

## 10. Remaining forensic task before new implementation

Still required before a new candidate:
1. Produce deterministic golden screenshots from the exact S4.10/S4.13 artifact at required breakpoints.
2. Store those screenshots with exact artifact SHA.
3. Build automated pixel/screenshot regression against those golden references.
4. Create a minimal clean implementation parent from the exact anchor — not from S4.95/S4.96/S4.96B.
5. Port functional deltas incrementally with screenshot diff after each delta.

Until items 1–3 are complete:
**NO NEW OWNER REVIEW CANDIDATE.**
