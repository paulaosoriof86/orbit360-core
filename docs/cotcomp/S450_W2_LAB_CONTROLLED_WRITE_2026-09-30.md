# CotComp S4.50 — W2 LAB synthetic controlled-write proof

Date: 2026-09-30

## Authorized scope

Owner authorization permits exactly one controlled W2 proof in `ays-orbit-360-lab` using the physically verified `legacyCompatible` storage mode.

The proof exercises the already deployed canonical owner `orbit360OpsLeadsCommand` with:

- one synthetic `create_business`;
- one synthetic `create_management`;
- exact eight-document journal readback;
- same-request retry with no duplicate/write;
- conflict-deny using the same entity identity and a distinct conflicting request identity;
- exact owned cleanup;
- independent final-absence verification.

## Hard boundaries

- synthetic only;
- no real client/business records;
- no provider delivery;
- no production;
- no proposal persistence;
- no selection persistence;
- no workflow config mutation;
- no IAM mutation;
- no Gravicentra product-module development beyond the CotComp integration contract.

## Expected first-write journal

Under `legacyCompatible`:

1. `tenantId/alianzas-soluciones/negocios/{businessId}`
2. `tenants/alianzas-soluciones/workflowEvents/{businessEventId}`
3. `tenants/alianzas-soluciones/workflowRequests/{businessRequestId}`
4. `tenants/alianzas-soluciones/notificationOutbox/{businessEventId}`
5. `tenantId/alianzas-soluciones/gestiones/{managementId}`
6. `tenants/alianzas-soluciones/workflowEvents/{managementEventId}`
7. `tenants/alianzas-soluciones/workflowRequests/{managementRequestId}`
8. `tenants/alianzas-soluciones/notificationOutbox/{managementEventId}`

Provider isolation must be re-verified immediately before the writes.

Expected mutation accounting if PASS:
- create writes: 8;
- retry writes: 0;
- conflict writes: 0;
- cleanup deletes: 8;
- net persistent documents: 0.

## Release truth

S4.50 proves the physical CotComp → workflow handoff only. It does not mean the full Gravicentra quotation/comparison module is complete, does not activate real-data persistence, and does not release provider notifications or production.
