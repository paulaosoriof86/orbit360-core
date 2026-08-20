#!/usr/bin/env node
'use strict';
// Compatibility entry point only. The canonical continuity truth is ordinal-independent.
// Legacy callers must validate the current ledger instead of re-certifying Request11.
if(!process.env.ORBIT360_CONTINUITY_OUT && process.env.ORBIT360_F2_INVARIANT_OUT){
  process.env.ORBIT360_CONTINUITY_OUT=process.env.ORBIT360_F2_INVARIANT_OUT;
}
await import('./orbit360-f2-continuity-invariant-v20260820.mjs');
