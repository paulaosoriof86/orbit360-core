# CotComp S4.97 — Forensic Visual Baseline Audit

Status: IMPLEMENTATION HOLD

## Objective
Identify the exact visual baseline Paula approved for CotComp before any new UI changes.

## Why
S4.96B used S4.95 as visual parent. Project governance shows CotComp was still pending Owner review, so S4.95 cannot be treated as a canonical visual parent without evidence.

## Audit scope
For each relevant candidate S4.87–S4.95 capture:
- exact commit / parent;
- available screenshots and runtime;
- Owner feedback;
- hero font, image, ratio, crop and layout;
- workspace geometry;
- family-card spacing;
- typography scale;
- product visual;
- comparison/recommendation;
- lower action blocks;
- responsive behavior.

## Required outputs before coding
1. Exact BASELINE_VISUAL_ID.
2. Desktop/mobile golden screenshots.
3. Visual contract: typography, spacing, colors, geometry, assets, crop.
4. Asset map by family and state.
5. Allowlist for functional deltas from S4.96.
6. Denylist for visual areas that cannot change.
7. Automated screenshot-regression gate.
8. Side-by-side compare-to-approved report.

## Method after audit
- start from the exact approved visual baseline;
- remove conflicting override layers instead of adding more CSS patches;
- port one functional delta at a time;
- capture deterministic screenshots after each delta;
- fail closed on any change outside the allowlist;
- do not ask Owner to review until internal visual, functional and regression gates pass.

## Current status
- S4.96: visual regression; logic only may be reused.
- S4.96B: HOLD; invalid as visual parent.
- production untouched.
- providerDeploymentAuthorized=false.
- cotcompRealTransportAuthorized=false.
