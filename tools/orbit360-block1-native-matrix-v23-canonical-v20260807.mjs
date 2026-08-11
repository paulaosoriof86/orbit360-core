#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runFinalNativeMatrix,
  syntheticBootstrapNavigationContract,
  MATRIX_SCHEMA,
  GATE_ID,
  BLOCKING_ROUTES,
  NONBLOCKING_LEDGER,
  SOURCE_CONTRACT as IMPLEMENTATION_SOURCE_CONTRACT
} from './orbit360-block1-final-native-matrix-v20260811.mjs';
import { V23_RENDER_SIGNAL_VERSION } from './orbit360-event-driven-render-observer-v23.mjs';

export const V23_CANONICAL_CONTRACT_VERSION='1.0.41';
export const V23_CANONICAL_RUNTIME_SCHEMA='orbit360-block1-client360-insurers-native-matrix-v23-canonical-1.0.41';
export const SOURCE_CONTRACT=Object.freeze({
  schemaVersion:V23_CANONICAL_RUNTIME_SCHEMA,
  implementationSchemaVersion:MATRIX_SCHEMA,
  gateId:GATE_ID,
  contractVersion:V23_CANONICAL_CONTRACT_VERSION,
  nativeSource:true,
  generatedFromPriorArtifact:false,
  textualTransform:false,
  sourceSurgery:false,
  sharedImplementationImport:'tools/orbit360-block1-final-native-matrix-v20260811.mjs',
  sharedRenderObserver:'tools/orbit360-event-driven-render-observer-v23.mjs',
  renderSignalVersion:V23_RENDER_SIGNAL_VERSION,
  blockingRoutes:[...BLOCKING_ROUTES],
  nonblockingLedger:[...NONBLOCKING_LEDGER],
  roleScopedTargets:true,
  accessOwner:'Orbit.access.can',
  clientScopeOwner:'Orbit.access.filter/withScope',
  sameRouteDetailOwner:'rendered-row-user-flow-plus-route-param-dom',
  routePerformanceOwner:'browserObserverElapsedMs',
  mobileMenuOwner:'router-ready-before-burger',
  bootstrapNavigationOwner:IMPLEMENTATION_SOURCE_CONTRACT.bootstrapNavigationOwner,
  bootstrapInitialWaitUntil:IMPLEMENTATION_SOURCE_CONTRACT.bootstrapInitialWaitUntil,
  bootstrapContextCloseOnFailure:IMPLEMENTATION_SOURCE_CONTRACT.bootstrapContextCloseOnFailure,
  ephemeralSecurityOverlayTreatment:'test-harness-remove-only',
  implementationSourceContract:IMPLEMENTATION_SOURCE_CONTRACT
});

const EVIDENCE=process.env.ORBIT360_VISUAL_EVIDENCE||process.env.ORBIT360_MATRIX_EVIDENCE||'orbit360-platform/runtime-gate-crm-v20260716/block1-final-visual-matrix-sanitized-v20260810.json';
function persist(value){fs.mkdirSync(path.dirname(path.resolve(EVIDENCE)),{recursive:true});fs.writeFileSync(path.resolve(EVIDENCE),JSON.stringify(value,null,2)+'\n','utf8');}

if(process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY==='1'){
  const bootstrapSynthetic=syntheticBootstrapNavigationContract();
  console.log(JSON.stringify({
    status:'PASS_V23_NATIVE_MATRIX_IMPORT',
    classification:'SOURCE_ARTIFACT_VALIDATED',
    sourceContract:SOURCE_CONTRACT,
    bootstrapSyntheticPass:bootstrapSynthetic.ok===true,
    bootstrapSynthetic,
    externalRuntimeDependenciesLoaded:false,
    firebaseAccess:false,
    browserExecuted:false,
    hostingTouched:false,
    writes:0,
    ok:bootstrapSynthetic.ok===true
  }));
}else if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=await runFinalNativeMatrix();
  output.implementationStage=output.stage;
  output.stage=output.ok===true?'PASS_BLOCK1_NATIVE_VISUAL_MATRIX':'FAIL_BLOCK1_NATIVE_VISUAL_MATRIX';
  output.schemaVersion=V23_CANONICAL_RUNTIME_SCHEMA;
  output.implementationSchemaVersion=MATRIX_SCHEMA;
  output.contractVersion=V23_CANONICAL_CONTRACT_VERSION;
  output.canonicalRuntimeArtifact='tools/orbit360-block1-native-matrix-v23-canonical-v20260807.mjs';
  output.sharedImplementationImport='tools/orbit360-block1-final-native-matrix-v20260811.mjs';
  output.nativeSource=true;
  output.generatedFromPriorArtifact=false;
  output.textualTransform=false;
  persist(output);
  console.log(JSON.stringify(output,null,2));
  process.exitCode=output.ok?0:42;
}
