# CotComp Callable Policy Candidate · S4.10

**Date:** 2026-09-29  
**Status:** SOURCE-ONLY / RUNTIME EXPORT FORBIDDEN

This file freezes the candidate Cloud Functions callable security options without exporting or deploying any function.

## Policy

- Every public callable requires App Check.
- Draft validation is read-only and does not consume the App Check token.
- Handoff submit is mutation-sensitive; replay-protection token consumption is the candidate setting.
- Proposal reads require verified case access but remain read-only.
- Proposal selection requires verified case access and explicit user choice; replay-protection token consumption is the candidate setting.
- All writes remain disabled in this source cut.

## Why no visible public login

The public CotComp is an acquisition/conversion journey. App Check protects the callable origin. Once a QuoteCase exists, an opaque case-access capability can protect case-specific reads/selections without forcing a visitor to create an account merely to compare options.

Portal/internal operations continue to use Firebase Auth.

## External implementation references

Firebase callable functions automatically receive available App Check tokens from supported client SDKs, and callable endpoints can enforce App Check. Firebase also documents optional App Check replay protection for Node.js callable functions.

Reviewed 2026-09-29:
- https://firebase.google.com/docs/app-check/cloud-functions
- https://firebase.google.com/docs/functions/callable
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

## Gate

This policy is not a deployed function. No file is exported from functions/index.js or bootstrap.js, and RUNTIME_EXPORT_ALLOWED remains false.
