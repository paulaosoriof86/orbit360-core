import fs from 'node:fs';
import {createHash} from 'node:crypto';
const P={
 ledger:'artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json',
 registry:'artifacts/orbit360-recovery/release-control/I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
 control:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',
 masterPlan:'artifacts/orbit360-recovery/release-control/I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'
};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const gitBlobSha=p=>{
 const b=Buffer.from(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'));
 return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
};
const need=(v,c)=>{if(!v)throw new Error(c);};
const led=read(P.ledger),reg=read(P.registry),cp=read(P.control),plan=read(P.masterPlan);
const findings=Array.isArray(led.findings)?led.findings:[];
const inv=Array.isArray(reg.inventory)?reg.inventory:[];
const ids=a=>a.map(x=>String(x.id||'')).sort();
const ledIds=ids(findings),invIds=ids(inv);
need(ledIds.length===new Set(ledIds).size,'CONTINUITY_LEDGER_DUPLICATE_ID');
need(invIds.length===new Set(invIds).size,'CONTINUITY_REGISTER_DUPLICATE_ID');
need(JSON.stringify(ledIds)===JSON.stringify(invIds),'CONTINUITY_REGISTER_LEDGER_SET_MISMATCH');
need(reg.inventoryCount===inv.length,'CONTINUITY_INVENTORY_COUNT_MISMATCH');
need(plan.schema==='GRAVICENTRA_I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_V1'&&String(plan.status||'').startsWith('FROZEN_ACTIVE'),'CONTINUITY_MASTER_PLAN_INVALID');
const baselinePlanIds=(plan.noLossContract?.baselineRequiredFindingIds||[]).map(String);
need(baselinePlanIds.length===Number(plan.noLossContract?.baselineFindingCount||0),'CONTINUITY_MASTER_PLAN_BASELINE_COUNT_MISMATCH');
for(const id of baselinePlanIds)need(ledIds.includes(id),'CONTINUITY_MASTER_PLAN_BASELINE_FINDING_LOST:'+id);
for(const id of (plan.noLossContract?.criticalMustNeverDisappearIds||[]).map(String)){
 need(ledIds.includes(id),'CONTINUITY_MASTER_PLAN_CRITICAL_FINDING_LOST:'+id);
 need(invIds.includes(id),'CONTINUITY_MASTER_PLAN_CRITICAL_REGISTER_LOST:'+id);
}
for(const required of ['B4-003-R15-09-PHASEA-ENDORSEMENT-CERTIFICATE-ANNEX-CLOSURE','B4-003-R16-01-OPERATIVO-ASSIGNABLE-ADVISOR-ROSTER-HYDRATION','B4-004','B4-005','B4-006','B4-007']){
 need(baselinePlanIds.includes(required),'CONTINUITY_MASTER_PLAN_REQUIRED_SCOPE_MISSING:'+required);
}
const byLed=new Map(findings.map(x=>[String(x.id),x]));
for(const row of inv){
 const f=byLed.get(String(row.id));
 need(!!f,'CONTINUITY_REGISTER_UNKNOWN_ID:'+row.id);
 need(String(row.status||'')===String(f.status||''),'CONTINUITY_STATUS_DRIFT:'+row.id);
}
need(String(reg.expectedLedgerNextBlobSha||'')===gitBlobSha(P.ledger),'CONTINUITY_REGISTER_LEDGER_BLOB_BINDING_DRIFT');
const b4003Parent=byLed.get('B4-003');
need(!!b4003Parent,'CONTINUITY_B4_003_PARENT_MISSING');
if(cp.currentB4?.findingStatus!=null) need(String(cp.currentB4.findingStatus)===String(b4003Parent.status||''),'CONTINUITY_B4_003_PARENT_STATUS_DRIFT');
if(cp.i65ForensicRemediationPlan?.b4?.findingStatus!=null) need(String(cp.i65ForensicRemediationPlan.b4.findingStatus)===String(b4003Parent.status||''),'CONTINUITY_B4_003_PLAN_PARENT_STATUS_DRIFT');
for(const row of inv.filter(x=>String(x.id||'').startsWith('B4-003-'))){
 if(/PASS.*PRESERVE|CLOSED_PASS|VISUAL_EVIDENCE_PASS/.test(String(row.status||''))) need(row.blocking!==true,'CONTINUITY_PASS_FINDING_STILL_BLOCKING:'+row.id);
}
if(/MACHINE_PASS_PENDING_PAULA_VISUAL/.test(String(b4003Parent.status||''))){
 const stale=inv.filter(x=>String(x.id||'').startsWith('B4-003-')&&x.blocking===true&&/(SOURCE_FIXED|DATA_APPLIED).*PENDING_(CONTRACT|EXACT_PREVIEW)/.test(String(x.status||'')));
 need(stale.length===0,'CONTINUITY_MACHINE_PASS_WITH_STALE_CHILD_STATE:'+stale.map(x=>x.id).join(','));
}
if(/PARTIAL_PASS|REJECTED|REMEDIATION_REQUIRED/.test(String(b4003Parent.status||''))){
 const openCurrent=inv.filter(x=>String(x.targetGate||'')==='B4-003'&&x.blocking===true&&/OPEN_|REJECTED|REMEDIATION_REQUIRED/.test(String(x.status||'')));
 need(openCurrent.length>0,'CONTINUITY_HUMAN_REJECTION_WITHOUT_OPEN_CHILD_FINDING');
}
const attention=new Set((reg.attentionIds||[]).map(String));
for(const id of attention){
 const row=inv.find(x=>String(x.id)===id);
 need(!!row,'CONTINUITY_ATTENTION_UNKNOWN:'+id);
 need(!!row.owner,'CONTINUITY_OWNER_MISSING:'+id);
 need(!!row.targetGate,'CONTINUITY_TARGET_GATE_MISSING:'+id);
 need(!!row.closureCondition,'CONTINUITY_CLOSURE_CONDITION_MISSING:'+id);
}
const critical=(reg.criticalCurrentReviewIds||[]).map(String);
for(const id of critical)need(byLed.has(id),'CONTINUITY_CRITICAL_FINDING_MISSING:'+id);
const currentNext=String(cp.nextAction||cp.currentB4?.nextAction||'').toUpperCase();
const openBlockingB4003=inv.filter(x=>x.blocking===true&&String(x.targetGate)==='B4-003'&&attention.has(String(x.id)));
if(/B4[_-]?004/.test(currentNext)){
 need(openBlockingB4003.length===0,'CONTINUITY_B4_004_BLOCKED_BY:'+openBlockingB4003.map(x=>x.id).join(','));
 const human=String(cp.currentB4?.humanVisualStatus||cp.b4VisualAcceptanceControl?.currentB4003HumanStatus||'');
 need(/PASS/.test(human),'CONTINUITY_B4_004_REQUIRES_B4_003_HUMAN_PASS');
}
if(/PRODUCTION|LIVE|B4[_-]?007/.test(currentNext)){
 const prelive=inv.filter(x=>attention.has(String(x.id))&&String(x.targetGate)!=='POST_PRODUCTION_FROZEN');
 need(prelive.length===0,'CONTINUITY_LIVE_BLOCKED_BY_OPEN_ATTENTION:'+prelive.slice(0,20).map(x=>x.id).join(','));
}
for(const required of ['B1-EMAIL-DELIVERY-001','B2-R46-TEAM-RESET-INVITATION-DELIVERY-STILL-UNRESOLVED-R5','B3-CARRY-INSURER-TARIFF-KNOWLEDGE-20260929','B3-CARRY-RENEWAL-COMPARATIVE-ENGINE-20260929','B4-CARRY-PORTAL-IMPORT-EMAIL-TRACEABILITY-R6']){
 need(byLed.has(required),'CONTINUITY_REQUIRED_CROSS_GATE_CARRY_MISSING:'+required);
}
console.log(JSON.stringify({status:'PASS',schema:'GRAVICENTRA_FINDING_CONTINUITY_GUARD_V1',ledgerCount:findings.length,inventoryCount:inv.length,attentionCount:attention.size,criticalCount:critical.length,openBlockingB4003:openBlockingB4003.map(x=>x.id),nextAction:cp.nextAction},null,2));
