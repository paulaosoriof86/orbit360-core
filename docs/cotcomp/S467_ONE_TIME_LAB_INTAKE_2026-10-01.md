# CotComp S4.67 — One-time LAB intake for first real W5 submission

Date: 2026-10-01

## Objective

Provide Paula with a private one-time LAB form that can create exactly one legitimate real `GT_AUTO_MOTO_HYBRID` QuoteCase with the participant's own request-management consent.

This does **not** release general CotComp persistence.

## Channel

Function:
`cotcompPilotIntakeS467`

Project:
`ays-orbit-360-lab`

Region:
`us-central1`

Journey:
`GT_AUTO_MOTO_HYBRID`

## Bearer-link security

The private link uses a high-entropy bearer value in the URL fragment.

Important properties:
- URL fragments are not sent to the server in the HTTP request;
- the server stores only the SHA-256 of the bearer;
- the raw bearer is not committed to Git;
- the page validates the fragment client-side before enabling submit;
- POST sends the bearer in a custom header over HTTPS;
- the intake can be consumed once only;
- the link expires after 2026-10-08 Guatemala time.

## Minimum data collected

Only:
- vehicle brand;
- line/model;
- participant name;
- WhatsApp;
- email;
- explicit request-management/contact consent.

Not collected:
- health data;
- payment data;
- insurer credentials;
- government identification;
- marketing consent.

Marketing is persisted as false.

## One-time write

On one valid submission, one Firestore transaction:
1. creates one real QuoteCase under the canonical CotComp QuoteCase path;
2. marks the S4.67 intake state as used.

The QuoteCase is:
- country GT;
- source PUBLIC_WEB;
- intent COTIZAR;
- product candidate AUTO;
- status SUBMITTED;
- not synthetic;
- not selected;
- general persistence release false.

## Safety boundaries

- LAB only;
- max one real QuoteCase from this channel;
- no general persistence release;
- no provider/rater;
- no production;
- no issuance/binding/payment;
- no health data;
- no third-party browser assets;
- no analytics;
- no raw bearer in Git.

## Next action after user submission

After the participant submits successfully:
1. re-run bounded W5 discovery;
2. derive case/actor/consent SHA-256 commitments;
3. require the next controlled execution authorization according to the frozen W5 gate;
4. execute W1-W4 and mandatory rollback.
