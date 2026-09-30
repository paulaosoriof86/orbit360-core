'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const c=require('./cotcomp-workflow-extension-contract');

test('schema extension is source-only and cannot mutate owner source',()=>{
  assert.equal(c.RUNTIME_ENABLED,false);
  assert.equal(c.APPLY_TO_OWNER_SOURCE_ALLOWED,false);
  assert.equal(c.WRITES_ENABLED,false);
});

test('target owner is the live canonical Gravicentra workflow owner',()=>{
  assert.equal(c.TARGET_OWNER.branch,'recovery/fase-a-clean-20260831');
  assert.equal(c.TARGET_OWNER.path,'functions/ops-leads-domain.js');
  assert.equal(c.TARGET_OWNER.reviewedBlobSha,'73e09a4404cb4298dc34c9c38e26ad1f960d3170');
});

test('minimal schema delta adds cotcompRef only and changes no auth/storage/stages',()=>{
  assert.deepEqual(c.REQUIRED_SCHEMA_DELTA.business,['cotcompRef']);
  assert.deepEqual(c.REQUIRED_SCHEMA_DELTA.management,['cotcompRef']);
  assert.equal(c.REQUIRED_SCHEMA_DELTA.authChanges,false);
  assert.equal(c.REQUIRED_SCHEMA_DELTA.storagePathChanges,false);
  assert.equal(c.REQUIRED_SCHEMA_DELTA.workflowStageChanges,false);
});

test('runtime config requires tenant-configured owner and channels',()=>{
  const bad=c.validateRuntimeConfig({});
  assert.equal(bad.ok,false);
  assert.ok(bad.missing.includes('ownerAdvisorId'));
  const ok=c.validateRuntimeConfig({
    ownerAdvisorId:'adv_paula',
    ownerUserUid:'uid_paula',
    notificationChannels:['in_app','whatsapp','email']
  });
  assert.equal(ok.ok,true);
  assert.equal(ok.value.hardcodedAdvisorListAllowed,false);
  assert.equal(ok.value.advisorSelectorSource,'TENANT_TEAM_ROLES_CONFIG');
});

function sample(){
  return {
    runtimeConfig:{ownerAdvisorId:'adv_owner',ownerUserUid:'uid_owner',notificationChannels:['in_app','whatsapp','email']},
    leadBusinessId:'neg_1',opsManagementId:'ges_1',
    caseId:'qcase_1',journeyId:'GT_AUTO_MOTO_HYBRID',correlationId:'corr_1',
    quoteCasePath:'tenants/alianzas-soluciones/cotcomp/quoteCases/items/qcase_1',
    country:'GT',product:'AUTO',contactName:'Paula'
  };
}

test('lead and ops carry the same nested CotComp correlation',()=>{
  const r=c.buildProjectionPayloads(sample());
  assert.equal(r.ok,true);
  assert.equal(r.business.cotcompRef.caseId,r.management.cotcompRef.caseId);
  assert.equal(r.business.cotcompRef.journeyId,r.management.cotcompRef.journeyId);
  assert.equal(r.business.cotcompRef.correlationId,r.management.cotcompRef.correlationId);
  assert.equal(r.business.cotcompRef.role,'LEAD_PROJECTION');
  assert.equal(r.management.cotcompRef.role,'OPS_QUOTATION_PROJECTION');
});

test('projection uses current workflow stage but preserves lead_recibido intake semantics',()=>{
  const r=c.buildProjectionPayloads(sample());
  assert.equal(r.business.etapa,'cotizando');
  assert.equal(r.business.cotcompRef.intakeStatus,'lead_recibido');
  assert.equal(r.management.lista,'Cotizaciones');
});

test('initial assignment is tenant-configured owner decision, not hardcoded list',()=>{
  const r=c.buildProjectionPayloads(sample());
  assert.equal(r.assignment.initialAdvisorId,'adv_owner');
  assert.equal(r.assignment.assignmentStatus,'PENDING_OWNER_DECISION');
  assert.equal(r.assignment.ownerActionRequired,true);
  assert.equal(r.assignment.advisorSelectorSource,'TENANT_TEAM_ROLES_CONFIG');
  assert.equal(r.assignment.reassignmentCreatesNewBusiness,false);
  assert.equal(r.assignment.reassignmentCreatesNewManagement,false);
});

test('notifications remain release-gated',()=>{
  const r=c.buildProjectionPayloads(sample());
  assert.equal(r.notifications.firstRecipientUserUid,'uid_owner');
  assert.deepEqual(r.notifications.channels,['in_app','whatsapp','email']);
  assert.equal(r.notifications.deliveryIsReleaseGated,true);
});

test('owner patch plan is descriptive only',()=>{
  const p=c.ownerPatchPlan();
  assert.equal(p.applyNow,false);
  assert.ok(p.exactIntent.includes('no auth behavior change'));
  assert.ok(p.exactIntent.includes('no unrelated module change'));
});
