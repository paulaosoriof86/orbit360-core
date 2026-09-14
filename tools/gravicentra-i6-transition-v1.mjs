import fs from 'node:fs';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const AUTH='artifacts/orbit360-recovery/release-control/I6_EXPLICIT_AUTHORIZATION_RECEIPT_20260914.json';
const V4='artifacts/orbit360-recovery/project-sources-v2/v4/05_MANIFIESTO_FUENTES_EVERGREEN_V4.json';
const RECEIPT='artifacts/orbit360-recovery/release-control/I6_PROJECT_SOURCES_V4_TRANSITION_RECEIPT_20260914.json';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

for(const p of [CONTROL,AUTH,V4]) need(fs.existsSync(p),'I6_TRANSITION_REQUIRED_FILE_MISSING:'+p);
const C=read(CONTROL),A=read(AUTH),M=read(V4);
need(C.status==='PRODUCTION_ACCEPTED','I6_TRANSITION_REQUIRES_PRODUCTION_ACCEPTED');
need(C.gateState?.gates?.I5?.status==='PASS','I6_TRANSITION_REQUIRES_I5_PASS');
need(C.environmentState?.dataCutoff==='2026-07-31','I6_TRANSITION_BASELINE_CUTOFF_DRIFT');
need(C.environmentState?.augustRefresh==='HOLD','I6_TRANSITION_AUGUST_NOT_HOLD');
need(A.schemaVersion==='gravicentra-i6-explicit-authorization-receipt-v1','I6_TRANSITION_AUTH_SCHEMA_INVALID');
need(A.authorization?.decision==='AUTHORIZED_BY_OWNER','I6_TRANSITION_AUTH_DECISION_INVALID');
need(A.authorization?.dataMutationAuthorized===false,'I6_TRANSITION_AUTH_DATA_OVERREACH');
need(A.authorization?.augustRefreshApplyAuthorized===false,'I6_TRANSITION_AUTH_AUGUST_OVERREACH');
need(A.authorization?.perBlockApplyStillRequiresExplicitAuthorizationAfterDryRun===true,'I6_TRANSITION_PER_BLOCK_AUTH_MISSING');
need(A.baselineRelease?.sourceSha===C.certifiedCandidate?.sourceSha,'I6_TRANSITION_SOURCE_BINDING_MISMATCH');
need(A.baselineRelease?.buildId===C.certifiedCandidate?.buildId,'I6_TRANSITION_BUILD_BINDING_MISMATCH');
need(Number(A.baselineRelease?.artifactId)===Number(C.certifiedCandidate?.artifactId),'I6_TRANSITION_ARTIFACT_BINDING_MISMATCH');
need(M.packageId==='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4'&&M.version===4,'I6_TRANSITION_V4_MANIFEST_INVALID');

const ps=C.projectSources||{};
const i6=C.i6Execution||{};
const gate=C.gateState?.gates?.I6||{};

if(ps.activeVersion===3&&ps.staticSourceUpdateRequired===false&&i6.authorized===false&&gate.status==='HOLD_PENDING_EXPLICIT_AUTHORIZATION'){
  C.projectSources.staticSourceUpdateRequired=true;
  C.projectSources.reason='Permanent postproduction rule change: Fase A Post-Salida I6 requires Evergreen V4 composed of the five immutable V3 sources plus the I6 addendum.';
  C.projectSources.pendingPackage='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4';
  C.projectSources.pendingManifestPath=V4;
  C.nextAction='PROJECT_SOURCES_V4_REQUIRED_FLAG_RECORDED_THEN_ACTIVATE_V4_AND_I6_0';
  write(CONTROL,C);
  console.log('TRANSITION_PHASE=MARK_V4_REQUIRED');
  process.exit(0);
}

if(ps.activeVersion===3&&ps.staticSourceUpdateRequired===true&&i6.authorized===false&&gate.status==='HOLD_PENDING_EXPLICIT_AUTHORIZATION'){
  need(ps.pendingPackage==='GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4','I6_TRANSITION_PENDING_PACKAGE_INVALID');
  need(ps.pendingManifestPath===V4,'I6_TRANSITION_PENDING_MANIFEST_INVALID');
  const priorReason=ps.reason;
  C.projectSources={
    activePackage:'GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4',
    activeVersion:4,
    canonicalRoot:'artifacts/orbit360-recovery/project-sources-v2/v4',
    manifestPath:V4,
    staticSourceUpdateRequired:false,
    reason:null,
    operationalStateChangesDoNotRequireReplacement:true,
    notificationRequiredWhenFlagTrue:true,
    compositionModel:'IMMUTABLE_RETAINED_V3_PLUS_V4_ADDENDUM',
    retainedPreviousSources:5,
    addedSources:1,
    lastTransition:{
      fromPackage:'GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V3',
      toPackage:'GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4',
      cause:priorReason,
      userAction:'KEEP_5_EXISTING_V3_SOURCES_AND_ADD_ONLY_V4_I6_ADDENDUM'
    }
  };
  C.gateState.currentTransition='I6_POSTSALIDA_COMPLETION_AND_CONTROLLED_REFRESH';
  C.gateState.gates.I6={
    status:'IN_PROGRESS_I6_0_BASELINE',
    activeSubgate:'I6.0',
    dataMutationAuthorized:false
  };
  C.i6Execution={
    ...C.i6Execution,
    authorized:true,
    authorizedAt:A.authorization.authorizedAt,
    authorizationReceiptPath:AUTH,
    activeSubgate:'I6.0',
    dryRunPrepared:false,
    dataMutationAuthorized:false,
    productMutationAuthorized:false,
    sourceDataApplyAuthorized:false,
    requiresDryRun:true,
    requiresDiff:true,
    requiresDeduplication:true,
    requiresExplicitAuthorization:true,
    requiresAudit:true,
    requiresRollback:true,
    perBlockApplyRequiresExplicitAuthorization:true
  };
  C.postI5Governance={
    ...(C.postI5Governance||{}),
    i6GuardPath:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
    i6ExecutorPath:'.github/workflows/gravicentra-recovery-i6-postsalida.yml'
  };
  C.governanceSyncChecklist={
    ...(C.governanceSyncChecklist||{}),
    evergreenProjectSourcePackageV4Prepared:true,
    evergreenProjectSourceV4CompositionPinned:true,
    evergreenProjectSourceV4TransitionRecorded:true,
    i6ExecutorStateGated:true,
    i6AuthorizationReceiptMaterialized:true
  };
  C.nextAction='I6_0_READONLY_BASELINE_SNAPSHOT_ROLLBACK_AND_INVENTORY';
  const receipt={
    schemaVersion:'gravicentra-i6-project-sources-v4-transition-receipt-v1',
    status:'PASS',
    productBrand:'Gravicentra Insurance',
    operationalAuthority:CONTROL,
    authorizationReceiptPath:AUTH,
    fromPackage:'GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V3',
    toPackage:'GRAVICENTRA_PROJECT_SOURCES_EVERGREEN_V4',
    compositionModel:'IMMUTABLE_RETAINED_V3_PLUS_V4_ADDENDUM',
    retainedSourceCount:5,
    addedSourceCount:1,
    projectSourceUserAction:'KEEP_5_EXISTING_V3_SOURCES_AND_ADD_ONLY_V4_I6_ADDENDUM',
    i6OpenedSubgate:'I6.0',
    dataMutationAuthorized:false,
    augustRefreshAuthorized:false,
    operationalWritesExecuted:0,
    augustDataTouched:false
  };
  write(CONTROL,C);
  write(RECEIPT,receipt);
  console.log('TRANSITION_PHASE=ACTIVATE_V4_AND_I6_0');
  process.exit(0);
}

if(ps.activeVersion===4&&i6.authorized===true&&gate.status==='IN_PROGRESS_I6_0_BASELINE'){
  console.log('TRANSITION_PHASE=NOOP_ALREADY_ACTIVE');
  process.exit(0);
}

throw new Error('I6_TRANSITION_UNEXPECTED_STATE:'+JSON.stringify({activeVersion:ps.activeVersion,staticSourceUpdateRequired:ps.staticSourceUpdateRequired,i6Authorized:i6.authorized,i6Status:gate.status}));
