# CotComp S4.66 — Authorized W5 controlled real-data pilot

Date: 2026-10-01

## Owner-authorized scope

- project: `ays-orbit-360-lab`;
- country: Guatemala;
- journey: `GT_AUTO_MOTO_HYBRID`;
- W1-W4;
- one QuoteCase / one data subject;
- at most 8 pre-existing QuoteCase records scanned to find one eligible case;
- one execution;
- success disposition: `ROLLBACK_TO_BEFORE_STATE`;
- no health data;
- no provider/rater;
- no production;
- no issuance, binding or payment.

## Privacy and evidence

The pilot may read one eligible real QuoteCase after a bounded discovery query.

Evidence output must contain:
- SHA-256 commitment to the selected QuoteCase path;
- SHA-256 commitment to the runtime service-account actor;
- SHA-256 commitment to the request-management consent evidence;
- digests and counts only.

No contact name, email, phone, raw case id, raw actor identity or raw consent selector may be written to the evidence artifact.

## W1

Validate the existing real QuoteCase only.

No W1 write is needed because the real case already exists.

## W2

Create only two temporary LAB workflow projections:
- business;
- management.

They contain generic pilot display text and CotComp linkage only.

No notification outbox is created and no provider delivery is permitted.

## W3

Create two controlled proposal versions linked to the real case.

The proposal values are explicitly pilot-only and are not obtained from a provider/rater.

Verify:
- V1 creation;
- retry 0 writes;
- changed-payload conflict deny;
- V2 atomic supersession;
- retry 0 writes;
- conflict deny;
- V2 current/validated eligibility.

## W4

Create one temporary ComparisonSet linked to the current pilot proposal.

Important semantic guard:
the project has request-management consent, but that is **not** evidence that the actual customer explicitly selected an insurance alternative.

Therefore the W4 real-data pilot must prove that canonical Selection persistence is blocked when `explicitUserChoice=false`.

Expected:
- `EXPLICIT_USER_CHOICE_REQUIRED`;
- Selection writes = 0;
- real QuoteCase patch = 0.

This preserves the frozen truth that a broker/Owner authorization cannot be misrepresented as an end-user insurance selection.

## Rollback

Delete exactly all temporary W2/W3/W4 pilot-owned documents.

The original real QuoteCase must remain byte-semantically equivalent by digest.

Expected final state:
- all pilot documents absent;
- real QuoteCase digest unchanged;
- no persistent pilot data.

## No eligible case behavior

If no real QuoteCase satisfies all of the following within the bounded discovery set:
- exact GT Auto/Moto journey;
- request-management consent true;
- required contact fields present;
- required vehicle fields present;
- not synthetic;
- not already selected;
- eligible active status;

the pilot must stop with:
`BLOCKED_NO_ELIGIBLE_REAL_CASE`

and execute zero writes.
