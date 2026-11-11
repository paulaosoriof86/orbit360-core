# G6 — Firebase LAB public assets, read-only release-source boundary

Objective: observe the **currently publicly served** four key assets and compare actual HTTP response bytes to the G4 assembled source manifest. This probe does not read Firebase administrative release versions or modify Hosting.

Historical evidence: GitHub Portal S5.11F run `37666530245` completed at 2026-10-07 18:24:34 UTC; Siniestros S5.12D run `37667921282` completed at 18:36:36 UTC. On 13 October the accessible Siniestros assets reported `Last-Modified: Wed, 07 Oct 2026 18:36:29 GMT`, while both Portal endpoints returned HTTP 404. The timing is consistent with Hosting content replacement but is **not** proof of the exact Firebase release ID.

## Tests and interpretation
- All four expected paths are read without authentication, user data or mutation.
- Checks exact Git blob SHA-1 and SHA-256 against immutable source manifest, retaining only hashes and headers in sanitized receipt.
- `HOLD_PORTAL_MISSING_SINIESTROS_MATCH`: two Portal assets 404 and two Siniestros assets have exact matching bytes; repair needed, release prohibited.
- `HOLD_DRIFT_DETECTED`: live public asset mismatch; re-audit before proposing any deploy.
- `INCONCLUSIVE_REMOTE`: network probe could not establish reality.
- `FOUR_ASSETS_MATCH_SOURCE_ONLY`: four public paths match, **not** proof of authenticated Portal, release integrity or production suitability.

**Never turn a source CI PASS into permission to release.** A complete baseline/rollback of Firebase Hosting must be established through an authorized admin read of release/version manifests, plus owner approval before any deployment. This PR remains Draft. No credential retrieval, no Firebase CLI, no merge.

This readback runs with the G4 source-only workflow. The JSON artifact distinguishes the workflow execution status from the live state classification.
