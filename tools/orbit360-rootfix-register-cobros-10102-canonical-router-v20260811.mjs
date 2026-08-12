#!/usr/bin/env node
'use strict';
import fs from 'node:fs';

const file='tools/orbit360-validar-gate-contracts-v20260717.mjs';
let s=fs.readFileSync(file,'utf8');
function once(anchor,replacement,code){const n=s.split(anchor).length-1;if(n!==1)throw new Error(`${code}:${n}`);s=s.replace(anchor,replacement);}
if(!s.includes("const COBROS_10102_GATE_ID = 'block10.10-cobros-full-ledger-write-lab-v20260805';")){
  once("const VISUAL_LEGACY_GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';\n", "const VISUAL_LEGACY_GATE_ID = 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805';\nconst COBROS_10102_GATE_ID = 'block10.10-cobros-full-ledger-write-lab-v20260805';\nconst COBROS_10102_RUNTIME_PROFILE = 'cobros-10102-runtime';\n", 'ANCHOR_CONSTANT');
  once("  [VISUAL_LEGACY_GATE_ID]: {\n", "  [COBROS_10102_GATE_ID]: {\n    contractVersion: '10.10.2',\n    lifecycle: 'tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-lab-v20260805.json',\n    engine: 'tools/orbit360-validar-gate-contracts-engine-cobros-full-ledger-write-v20260811.mjs',\n    defaultRequest: '.github/orbit360-requests/cobros-full-ledger-write-lab-v20260811.json',\n    sourcePhase: 'STATIC_PREFLIGHT_PASS'\n  },\n  [VISUAL_LEGACY_GATE_ID]: {\n", 'ANCHOR_GATE_CONFIG');
  once("const PHASE_PROFILES = Object.freeze({\n", "const COBROS_10102_RUNTIME_CONFIG = Object.freeze({\n  contractVersion: '10.10.2',\n  lifecycle: 'tools/orbit360-validator-lifecycle-contract-cobros-full-ledger-write-runtime-v20260811.json',\n  engine: 'tools/orbit360-validar-gate-contracts-engine-cobros-full-ledger-write-v20260811.mjs',\n  defaultRequest: '.github/orbit360-requests/cobros-full-ledger-write-lab-v20260811.json',\n  sourcePhase: ''\n});\n\nconst PHASE_PROFILES = Object.freeze({\n  STATIC_PREFLIGHT_PASS: {secrets:false,firestoreRead:false,writes:false,runtime:false,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n  COBROS_FULL_LEDGER_WRITE_RUNTIME: {secrets:true,firestoreRead:true,writes:true,runtime:true,browser:false,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false},\n", 'ANCHOR_PHASE_PROFILES');
  once("const config = GATE_ID === BLOCK1_GATE_ID && gateProfile === V33_RUNTIME_PROFILE ? BLOCK1_V33_RUNTIME_CONFIG\n", "const config = GATE_ID === COBROS_10102_GATE_ID && gateProfile === COBROS_10102_RUNTIME_PROFILE ? COBROS_10102_RUNTIME_CONFIG\n  : GATE_ID === BLOCK1_GATE_ID && gateProfile === V33_RUNTIME_PROFILE ? BLOCK1_V33_RUNTIME_CONFIG\n", 'ANCHOR_CONFIG_SELECTOR');
  fs.writeFileSync(file,s,'utf8');
}
console.log(JSON.stringify({status:'PASS_COBROS_10102_ROUTER_ROOTFIX_APPLIED',file,gateId:'block10.10-cobros-full-ledger-write-lab-v20260805',ok:true}));
