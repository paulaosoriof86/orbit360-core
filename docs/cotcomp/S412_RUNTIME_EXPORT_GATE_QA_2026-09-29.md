# CotComp S4.12 Runtime / Export Gate QA

**Date:** 2026-09-29  
**Branch head before evidence commit:** `3d4de7db943d3a0495a58a13d68e54907bf446b5`  
**Status:** `LOCAL EXECUTABLE QA PASS / EXPORT OFF / DEPLOY OFF / WRITES OFF`

## Executed local QA

Node.js executed the S4.12 runtime-export ticket and case-access contracts.

Result:

`13 tests / 13 PASS / 0 FAIL / 0 skipped / 0 cancelled`

Syntax:

`4/4 node --check PASS`

## What the tests prove

- runtime export remains hard-off;
- deploy remains hard-off;
- writes remain hard-off;
- target is LAB only: `ays-orbit-360-lab`;
- all proposed public callables preserve App Check;
- proposal reads and selections require case access;
- mutation-sensitive candidates retain replay-protection intent;
- owner runtime authorization is still mandatory;
- even a logically satisfied gate cannot export because the code flag remains false;
- production-like targets fail closed;
- future bootstrap delta is descriptive only;
- case-access records never persist raw tokens;
- case token is bound to one QuoteCase;
- mismatched, invalid, revoked and expired tokens fail closed.

## Evidence boundary

This is local executable evidence for the exact S4.12 source logic mirrored from the branch content.

It is not a deploy, not a GitHub Actions PASS, and not runtime authorization.

## Next gate

The next action is **not deployment**. It is to prepare the staging-export candidate diff that would wire the callables into the LAB function entrypoint while preserving:
- writes off;
- persistence off;
- no provider/rater;
- App Check;
- case access;
- rollback-ready isolated diff.

That candidate must still require explicit owner authorization before being applied.
