#!/usr/bin/env node
'use strict';
// SINGLE_STATE_COMPATIBILITY_NO_MUTATION
// Retired compatibility entrypoint. Current state is read only from the canonical ledger.
console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_COMPATIBILITY_NO_MUTATION',stateMutation:false,projectionWrites:0,canonicalLedger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',containsPII:false,containsSecrets:false},null,2));
