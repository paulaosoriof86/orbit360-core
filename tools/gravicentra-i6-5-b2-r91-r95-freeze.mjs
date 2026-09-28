import fs from 'node:fs';

const CP=process.env.CONTROL||'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const LOCK=process.env.B2_LOCK||'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B2_EXECUTION_LOCK_20260920.json';
const FINDINGS=process.env.FINDINGS||'artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json';
const PROOF=process.env.B2_R91_R95_PROOF_FILE;
const RECEIPT=process.env.R91_R95_RECEIPT||'artifacts/orbit360-recovery/release-control/I6_5_B2_R91_R95_RUNTIME_PROOF_20260928.json';
if(!PROOF)throw new Error('R91_R95_PROOF_FILE_REQUIRED');
const c=JSON.parse(fs.readFileSync(CP,'utf8')),b=JSON.parse(fs.readFileSync(LOCK,'utf8')),l=JSON.parse(fs.readFileSync(FINDINGS,'utf8')),e=JSON.parse(fs.readFileSync(PROOF,'utf8'));
const need=(v,m)=>{if(!v)throw new Error(m);};
need(e.status==='PASS','R91_R95_EVIDENCE_NOT_PASS');
for(const k of ['r91','r92','r93','r94','r95'])need(e[k]?.status==='PASS','R91_R95_COMPONENT_NOT_PASS:'+k);
need(e.r91?.firmSupportUploaded===true&&e.r91?.managementAttachmentLinked===true&&e.r91?.directRenewalIdempotent===true&&e.r91?.reloadPass===true,'R91_INCOMPLETE');
need(e.r92?.validatedTariffApplied===true&&e.r92?.unvalidatedInventedCharge===false,'R92_INCOMPLETE');
need(e.r93?.canonicalModal===true&&e.r93?.requestCreated===true&&e.r93?.externalNotificationSuppressed===true&&e.r93?.reloadPass===true,'R93_INCOMPLETE');
need(e.r94?.syntheticUploadRuntimePass===true&&e.r94?.providerProbeRuntimePass===true,'R94_INCOMPLETE');
need(e.r95?.legacyFolderClearlyLabeled===true&&e.r95?.canonicalUploadSemantics===true&&e.r95?.historicalFieldOptional===true,'R95_INCOMPLETE');
need(e.boundaries?.syntheticWritesOnly===true&&e.boundaries?.realBusinessMutation===false&&e.boundaries?.productionHosting===false&&e.boundaries?.b3===false&&e.boundaries?.reimport===false,'R91_R95_BOUNDARY_INVALID');
need(e.cleanup?.pending===true&&Array.isArray(e.cleanup.targets)&&e.cleanup.targets.length,'R91_R95_CLEANUP_TARGETS_MISSING');
need(b.preview?.sourceSha===e.exactPreview?.sourceSha&&b.preview?.buildId===e.exactPreview?.buildId&&b.preview?.url===e.exactPreview?.url,'R91_R95_EXACT_PREVIEW_DRIFT');
need(Array.isArray(b.nextRequiredProof)&&b.nextRequiredProof[0]==='R91_R92_R93_R94_R95_EXACT_PREVIEW_RUNTIME','R91_R95_CURSOR_CHANGED');

const ids=[
'B2-R91-RENEWAL-FIRM-SUPPORT-NO-CANONICAL-DRIVE-UPLOAD-R21',
'B2-R92-RENEWAL-TARIFF-COSTS-NOT-AUTO-DERIVED-R21',
'B2-R93-RENEWAL-ISSUANCE-MODAL-CRASH-SEMANTIC-VISUAL-R21',
'B2-R94-PREVIEW-DOCUMENT-UPLOAD-GUARD-MISLEADING-UX-R21',
'B2-R95-CLIENT-DRIVE-LEGACY-VS-CANONICAL-SEMANTICS-R21'
];
for(const id of ids){
  const f=(l.findings||[]).find(x=>x.id===id);need(f,'FINDING_MISSING_'+id);
  f.status='MACHINE_RUNTIME_PASS_PENDING_FINAL_PAULA_VISUAL';
  f.closureState='NOT_CLOSED';
  f.machineProof={status:'PASS',runId:Number(process.env.GITHUB_RUN_ID||e.runId||0),exactPreviewSourceSha:e.exactPreview.sourceSha,exactPreviewBuildId:e.exactPreview.buildId,exactPreviewUrl:e.exactPreview.url,artifactId:Number(process.env.PROOF_ARTIFACT_ID||0),artifactDigest:String(process.env.PROOF_ARTIFACT_DIGEST||''),cleanupPending:true};
}
const receipt={
  schema:'GRAVICENTRA_I6_5_B2_R91_R95_RUNTIME_PROOF_20260928_V1',recordedAt:new Date().toISOString(),
  repository:'paulaosoriof86/orbit360-core',branch:process.env.GITHUB_REF_NAME||'recovery/fase-a-clean-20260831',block:'B2',
  status:'MACHINE_RUNTIME_PASS_PENDING_FINAL_PAULA_VISUAL',findings:ids,exactPreview:e.exactPreview,
  runtime:{r91:e.r91,r92:e.r92,r93:e.r93,r94:e.r94,r95:e.r95,pageErrors:e.pageErrors||[],consoleErrors:e.consoleErrors||[]},
  cleanup:{pending:true,targets:e.cleanup.targets},boundaries:e.boundaries,
  artifact:{id:Number(process.env.PROOF_ARTIFACT_ID||0),digest:String(process.env.PROOF_ARTIFACT_DIGEST||'')},
  nextRequiredProof:'R82_CROSS_MODULE_DELETE_FINAL_AUDIT'
};
fs.writeFileSync(RECEIPT,JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync(FINDINGS,JSON.stringify(l,null,2)+'\n');
b.r91r95RuntimeProof={status:'PASS_CLEANUP_PENDING_FINAL_PAULA_VISUAL',runId:Number(process.env.GITHUB_RUN_ID||e.runId||0),receiptPath:RECEIPT,exactPreview:e.exactPreview,r91:e.r91,r92:e.r92,r93:e.r93,r94:e.r94,r95:e.r95,cleanup:{pending:true,targets:e.cleanup.targets},artifact:{id:Number(process.env.PROOF_ARTIFACT_ID||0),digest:String(process.env.PROOF_ARTIFACT_DIGEST||'')}};
b.nextRequiredProof=b.nextRequiredProof.slice(1);
b.paulaVisualDecision='R75_R76_R78_R79_R80_R88_R77_R81_MACHINE_PASS_R91_R95_MACHINE_PASS_R82_AUDIT_PENDING';
fs.writeFileSync(LOCK,JSON.stringify(b,null,2)+'\n');
c.i65ForensicRemediationPlan.mechanismSyncStatus='B2_R91_R95_MACHINE_RUNTIME_PASS_R82_PENDING';
c.i65ForensicRemediationPlan.b2={...(c.i65ForensicRemediationPlan.b2||{}),r91R95MachineRuntimePass:true,r91R95ProofRunId:Number(process.env.GITHUB_RUN_ID||e.runId||0),r91R95ProofArtifactId:Number(process.env.PROOF_ARTIFACT_ID||0),r91R95CleanupPending:true,paulaVisualDecision:b.paulaVisualDecision,boundaryNote:'R91-R95 exact Preview runtime PASS. Synthetic QA rows/files remain pending ordered cleanup after R82. No LIVE, no B3, no reimport.'};
c.canonicalAccumulationControl={...(c.canonicalAccumulationControl||{}),nextAction:'B2_R82_CROSS_MODULE_DELETE_FINAL_AUDIT'};
fs.writeFileSync(CP,JSON.stringify(c,null,2)+'\n');
console.log('B2_R91_R95_FREEZE=PASS_R82_PENDING');
