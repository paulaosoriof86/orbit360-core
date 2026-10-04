# CotComp S4.97 — Rendering/CSS Root-Cause Audit

**Date:** 2026-10-04  
**Status:** ROOT CAUSE CONFIRMED / IMPLEMENTATION HOLD

## 1. Confirmed mechanism failure

The visual regressions were not only bad individual CSS choices. The implementation architecture itself made drift likely.

Observed chain:

### S4.94
`cotcomp-premium-visual-preview-s494.js`
- generates a complete standalone HTML/CSS/JS surface;
- introduces the large photo hero and the seven-card family presentation.

### S4.95
`cotcomp-premium-visual-preview-s495.js`
- calls `S494.html()`;
- injects additional `REFINEMENT_CSS` before the parent `</style>`;
- injects another refinement script before `</body>`.

### S4.96
`cotcomp-premium-journey-preview-s496.js`
- calls `S495.html()`;
- injects another full CSS override block;
- injects another journey script.

### S4.96B
`cotcomp-frontend-recovery-preview-s496b.js`
- again calls `S495.html()`;
- injects another CSS layer;
- injects another recovery script.

This created a composition model based on **cascading visual overrides over an already unapproved parent**.

## 2. Why this failed

### 2.1 Parentage failure
S4.95 was not a promoted visual baseline. Using it as a visual parent made every later “recovery” start from an unresolved composition.

### 2.2 CSS ownership ambiguity
The same selectors were redefined in multiple layers:
- `.hero`
- `.hero-media`
- `.hero h1`
- `.wrap`
- `.workspace`
- `.mode`
- `.pstep`
- `.family`
- `.product-visual`
- form fields / comparison details.

A local fix could visually repair one property while retaining incompatible inherited properties from a lower layer.

### 2.3 JS ownership ambiguity
Multiple parent/child scripts could update the same DOM regions and state.

S4.96 already exposed this as a parent-render race requiring ownership/reconciliation guards.

That was a symptom of the composition architecture, not an isolated bug.

### 2.4 Visual QA was downstream, not structural
Tests often verified:
- selector presence;
- button response;
- text presence;
- route state.

They did not prevent:
- different font family;
- distorted aspect ratio;
- compressed seven-card layout;
- repeated photos;
- degraded hierarchy.

## 3. Specific regression examples

### Hero typography
Recovered satisfactory CotComp:
- Archivo 900 H1.

S4.96B:
- explicit `font-family:'Newsreader',serif`;
- explicit `font-weight:600`.

This was not an accidental browser rendering issue. It was encoded in the candidate.

### Hero image geometry
S4.96B:
- forces `aspect-ratio:4/3`;
- while the visual library contains many native 1672×941 (~16:9) contextual scenes.

The Owner-reported imbalance is consistent with the source implementation.

### Family cards
S4.96B preserved the newer seven-card composition and only adjusted:
- min-height;
- padding;
- gap.

It did not restore the recovered compact multi-row product-selection architecture. The spacing problem was structural, not a one-value polish issue.

## 4. Correct implementation architecture

The next candidate must **not** call:
- `S494.html()`
- `S495.html()`
- `S496.html()`
- `S496B.html()`

for visual composition.

Instead:

### Clean visual parent
Create a clean CotComp surface from:
1. current A&S shell;
2. recovered S4.10/S4.18 product-workspace visual contract;
3. explicit later Owner-authorized deltas.

### Single ownership
One stylesheet/component owns each visual region.

No additive override stack.

### Single state owner
One journey state machine owns:
- stage;
- selected family/route;
- intake page;
- review state;
- comparison state;
- selected alternative;
- handoff mode.

### Data contracts separate from view
Product/country schemas feed the view; they do not redefine page composition.

## 5. Required source structure

Recommended clean boundaries:

- `cotcomp-shell` — A&S public shell only.
- `cotcomp-opening` — headline + bounded human figure.
- `cotcomp-journey-rail` — four-stage navigation/progress.
- `cotcomp-need-selector` — seven visible families + deeper routes.
- `cotcomp-intake` — schema-driven progressive fields.
- `cotcomp-review` — case summary.
- `cotcomp-comparison` — criterion-first alternatives.
- `cotcomp-recommendation` — explainable A&S orientation.
- `cotcomp-replan` — context-preserving modal.
- `cotcomp-handoff` — assisted continuation.

A component may change its own styles/states, not reach into another surface via candidate-version selectors.

## 6. CSS governance

Forbidden in the next clean candidate:
- `body[data-s494...]`
- `body[data-s495...]`
- `body[data-s496...]`
- `body[data-s496b...]`
- version-specific override selectors controlling the same region.

Use semantic component scopes and design tokens instead.

## 7. Visual regression gate

The next candidate must fail before Owner review when:
- H1 computed font family is not Archivo;
- hero figure ratio deviates from its locked breakpoint contract;
- image natural ratio is distorted;
- family-selector geometry exceeds locked spacing/size ranges;
- a family repeats another family’s visual unexpectedly;
- body/label sizes fall below locked minimums;
- lower comparison/recommendation actions are missing;
- any screenshot diff changes a denylisted region outside tolerance.

## 8. Verdict

**ROOT CAUSE CONFIRMED.**

The repeated failures came from:
1. wrong visual parent;
2. layered CSS/JS override architecture;
3. insufficient visual regression gate.

The repair is not another CSS patch.  
The repair is a **clean-parent reconstruction with physical visual locks and incremental functional ports**.

No new Owner-review candidate is authorized yet.
