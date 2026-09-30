# CotComp S4.47 · Canonical S4.20 Leads/Ops owner alignment in LAB

**Date:** 2026-09-30  
**Status:** `OWNER ALIGNMENT DEPLOY PASS BY PHYSICAL SOURCE READBACK / PRE+POST QA PASS / APP-DATA WRITES 0 / W2 NOT EXECUTED / PROVIDER DELIVERY 0 / REAL DATA 0 / PRODUCTION UNTOUCHED`

## Authorization

Owner authorized replacing only the stale LAB Leads/Ops owner runtime:

`d0a1e116186bba860d34ec540e8abba81830b553`

with canonical S4.20:

`73e09a4404cb4298dc34c9c38e26ad1f960d3170`

for function:

`orbit360OpsLeadsCommand`

in project:

`ays-orbit-360-lab`.

## Pre-deploy physical guard

Before deployment the workflow independently downloaded the active Gen2 source archive and required:

`deployedOwnerBlob=d0a1e116186bba860d34ec540e8abba81830b553`

The old runtime was ACTIVE and had no deployed `cotcompRef` support.

## Source QA before deployment

Pre-deploy:
- tests: 318
- pass: 318
- fail: 0

The authorized repository source owner blob was independently verified as:

`73e09a4404cb4298dc34c9c38e26ad1f960d3170`.

## Deployment

Workflow:
`36788222356 = SUCCESS`

Authorized source SHA:
`5ecb1f429e30a4f832a2f370988ad9480b910705`

The Firebase CLI command returned exit code `1`.

S4.47 does not infer deployment status from that exit code and does not attribute a cause because the redirected deploy log was not retained in the sanitized evidence package.

Instead, S4.47 requires post-deploy physical source readback.

## Post-deploy physical source readback

Observed function:
- name: `orbit360OpsLeadsCommand`
- state: `ACTIVE`
- runtime: `nodejs22`
- entry point: `orbit360OpsLeadsCommand`
- revision: `orbit360opsleadscommand-00002-nop`
- update time: `2026-09-30T22:56:39.004069740Z`

Source archive physically downloaded from the active Gen2 deployment.

Observed Git-compatible owner blob:

`73e09a4404cb4298dc34c9c38e26ad1f960d3170`

Result:

`exactOwnerBlobMatch=true`

Also physically present:
- `cotcompRef`
- `sanitizeCotcompRef`

Therefore:

`workflowOwnerRuntimeVerified=true`.

## QA after deployment

Post-deploy:
- tests: 318
- pass: 318
- fail: 0

## Evidence identity

Source artifact:
`11129959326`

GitHub upload digest:
`sha256:992419bd883487010046dc6da7d2381174d7acd8278b4c162d99674bb7cd9e84`

Source tar digest:
`sha256:2fbf38dfb8dfccb60d0be3732b4606343b032946ab38433bdf0c7430a98139ce`

Evidence artifact:
`11130254166`

GitHub upload digest:
`sha256:7bef89577862efe69831174bccd7fb5a5112d1dc38eec4d3383b72ba228ed40b`

Post-deploy source archive digest:
`sha256:dcf73a2b8b7002fadd7bfecfdc958729c56fca6b502c3e37e007cb649cec144e`

## Data / execution boundaries

S4.47:
- application-data reads = 0
- application-data writes = 0
- W2 execution = false
- provider delivery = false
- real data = false
- production touched = false

## W2 impact

The blocker:

`DEPLOYED_OWNER_MISSING_S420_COTCOMPREF_SCHEMA`

is now closed for the primary LAB runtime.

This does **not** authorize W2.

Remaining W2 blockers:
- provider-delivery isolation proof;
- notification-outbox journal/cleanup harness;
- synthetic workflow cleanup proof;
- explicit Owner W2 authorization;
- explicit W2 execution/deploy authorization.

## Next safe block

S4.48 can proceed source-only/read-only:
- verify LAB owner runtime configuration relevant to notification/outbox side effects;
- freeze provider-delivery isolation contract;
- build W2 synthetic journal/readback/retry/cleanup harness with execution OFF.

No W2 writes are authorized by S4.47.
