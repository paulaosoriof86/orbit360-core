import fs from 'node:fs';

const CP=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const LOCK=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const FINDINGS=process.env.FINDINGS||'artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json';
const PROOF=process.env.B2_R77_R81_PROOF_FILE;
const RECEIPT=process.env.R77_R81_RECEIPT||'artifacts/orbit360-recovery/release-control/I6_5_B2_R77_R81_DRIVE_DURABLE_PROOF_20260928.json';
if(!PROOF)throw new Error('R77_R81_PROOF_FILE_REQUIRED');
const c=JSON.parse(fs.readFileSync(CP,'utf8'));
const b=JSON.parse(fs.readFileSync(LOCK,'utf8'));
const l=JSON.parse(fs.readFileSync(FINDINGS,'utf8'));
const e=JSON.parse(fs.readFileSync(PROOF,'utf8'));
const need=(v,m)=>{if(!v)throw new Error(m);};
need(e.status==='PASS','R77_R81_EVIDENCE_NOT_PASS');
need(e.r77?.status==='PASS'&&e.r77?.rawFileStored===true&&e.r77?.canonicalDocumentRef===true&&e.r77?.durableManagementLink===true&&e.r77?.firestoreReadback===true,'R77_MACHINE_PROOF_INCOMPLETE');
need(e.r81?.status==='PASS'&&e.r81?.rawFileStored===true&&e.r81?.canonicalDocumentRef===true&&e.r81?.durableClientLink===true&&e.r81?.firestoreReadback===true,'R81_MACHINE_PROOF_INCOMPLETE');
need(e.reload?.clientLinked===true&&e.reload?.managementLinked===true&&e.reload?.clientDriveRead===true&&e.reload?.managementDriveRead===true&&e.reload?.clientContentMatch===true&&e.reload?.managementContentMatch===true,'R77_R81_RELOAD_READBACK_INCOMPLETE');
need(e.boundaries?.syntheticOnly===true&&e.boundaries?.realClientMutation===false&&e.boundaries?.productionHosting===false&&e.boundaries?.b3===false&&e.boundaries?.reimport===false,'R77_R81_BOUNDARY_INVALID');
need(e.cleanup?.pending===true&&e.cleanup?.targets?.clientId&&e.cleanup?.targets?.managementId&&e.cleanup?.targets?.clientDocumentRef&&e.cleanup?.targets?.managementDocumentRef,'R77_R81_CLEANUP_TARGETS_MISSING');
need(b.preview?.sourceSha===e.exactPreview?.sourceSha&&b.preview?.buildId===e.exactPreview?.buildId&&b.preview?.url===e.exactPreview?.url,'R77_R81_EXACT_PREVIEW_DRIFT');
need(Array.isArray(b.nextRequiredProof)&&b.nextRequiredProof[0]==='R77_R81_SYNTHETIC_B2_DRIVE_UPLOAD_AND_DURABLE_READBACK','R77_R81_CURSOR_CHANGED');

const ids=['B2-R77-MANAGEMENT-ATTACHMENT-METADATA-ONLY-R15','B2-R81-CLIENT-DOCUMENTARY-IMPORT-FALSE-PERSISTENCE-R15'];
for(const id of ids){
  const f=(l.findings||[]).find(x=>x.id===id);
  need(f,'FINDING_MISSING_'+id);
  f.status='MACHINE_RUNTIME_PASS_CLEANUP_PENDING';
  f.closureState='MACHINE_PROOF_PASS_CLEANUP_PENDING';
  f.machineProof={
    status:'PASS',
    runId:Number(process.env.GITHUB_RUN_ID||e.runId||0),
    exactPreviewSourceSha:e.exactPreview.sourceSha,
    exactPreviewBuildId:e.exactPreview.buildId,
    exactPreviewUrl:e.exactPreview.url,
    artifactId:Number(process.env.PROOF_ARTIFACT_ID||0),
    artifactDigest:String(process.env.PROOF_ARTIFACT_DIGEST||''),
    durableReloadReadback:true,
    rawDriveFile:true,
    cleanupPending:true
  };
}
const receipt={
  schema:'GRAVICENTRA_I6_5_B2_R77_R81_DRIVE_DURABLE_PROOF_20260928_V1',
  recordedAt:new Date().toISOString(),
  repository:'paulaosoriof86/orbit360-core',
  branch:process.env.GITHUB_REF_NAME||'recovery/fase-a-clean-20260831',
  block:'B2',
  status:'MACHINE_RUNTIME_PASS_CLEANUP_PENDING',
  findings:ids,
  exactPreview:e.exactPreview,
  runtime:{
    r77:e.r77,
    r81:e.r81,
    reload:e.reload,
    writes:e.writes,
    pageErrors:e.pageErrors||[],
    consoleErrors:e.consoleErrors||[]
  },
  cleanup:{pending:true,targets:e.cleanup.targets},
  boundaries:e.boundaries,
  artifact:{id:Number(process.env.PROOF_ARTIFACT_ID||0),digest:String(process.env.PROOF_ARTIFACT_DIGEST||'')},
  nextRequiredProof:'R91_R92_R93_R94_R95_EXACT_PREVIEW_RUNTIME'
};
fs.writeFileSync(RECEIPT,JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync(FINDINGS,JSON.stringify(l,null,2)+'\n');

b.r77r81DriveDurableProof={
  status:'PASS_CLEANUP_PENDING',
  runId:Number(process.env.GITHUB_RUN_ID||e.runId||0),
  receiptPath:RECEIPT,
  exactPreview:e.exactPreview,
  r77:e.r77,
  r81:e.r81,
  reload:e.reload,
  cleanup:{pending:true,targets:e.cleanup.targets},
  artifact:{id:Number(process.env.PROOF_ARTIFACT_ID||0),digest:String(process.env.PROOF_ARTIFACT_DIGEST||'')}
};
b.nextRequiredProof=b.nextRequiredProof.slice(1);
b.paulaVisualDecision='R75_R76_R78_R79_R80_R88_PASS_R77_R81_MACHINE_PASS_CLEANUP_PENDING_R91_R95_RUNTIME_PENDING';
fs.writeFileSync(LOCK,JSON.stringify(b,null,2)+'\n');

c.i65ForensicRemediationPlan.mechanismSyncStatus='B2_R77_R81_MACHINE_RUNTIME_PASS_CLEANUP_PENDING';
c.i65ForensicRemediationPlan.b2={
  ...(c.i65ForensicRemediationPlan.b2||{}),
  status:b.status,
  r77R81MachineRuntimePass:true,
  r77R81ProofRunId:Number(process.env.GITHUB_RUN_ID||e.runId||0),
  r77R81ProofArtifactId:Number(process.env.PROOF_ARTIFACT_ID||0),
  r77R81CleanupPending:true,
  paulaVisualDecision:b.paulaVisualDecision,
  boundaryNote:'R77/R81 synthetic Drive upload, canonical documentRef linkage, durable Firestore persistence, reload and Drive binary readback PASS on the exact B2 Preview. Synthetic QA files/rows remain explicitly pending cleanup after R91-R95 and R82 per frozen proof order. No LIVE, no B3, no reimport.'
};
c.canonicalAccumulationControl={...(c.canonicalAccumulationControl||{}),nextAction:'B2_R91_R95_EXACT_PREVIEW_RUNTIME'};
fs.writeFileSync(CP,JSON.stringify(c,null,2)+'\n');
console.log('B2_R77_R81_FREEZE=PASS_CLEANUP_PENDING');
