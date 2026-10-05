'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('./cotcomp-gravicentra-handoff-contract-s502');

test('S5.02 contract is source-only and cannot write',()=>{
  assert.equal(H.AUTO_READY,false);
  assert.equal(H.RUNTIME_WRITES_ALLOWED,false);
  assert.equal(H.PRODUCTION,false);
});

test('valid GT web handoff maps to existing Ops/Leads create_business command shape',()=>{
  const r=H.buildSourceOnlyHandoff({
    country:'Guatemala',
    family:'vehicle',
    contact:{name:'Persona Demo',whatsapp:'+502 5555 5555',requestManagementConsent:true},
    cotcompRef:{caseId:'case_demo_1',journeyId:'GT_AUTO_MOTO_HYBRID',correlationId:'corr_demo_1'},
    handoffId:'handoff_demo_1234'
  });
  assert.equal(r.readyForServerAdapter,true);
  assert.equal(r.proposedCommand.operation,'create_business');
  assert.equal(r.proposedCommand.tenantId,'alianzas-soluciones');
  assert.equal(r.proposedCommand.payload.pais,'GT');
  assert.equal(r.proposedCommand.payload.canal,'Web CotComp');
  assert.equal(r.proposedCommand.payload.origen,'Web CotComp');
  assert.equal(r.proposedCommand.payload.cotcompRef.correlationId,'corr_demo_1');
  assert.equal(r.userAckAllowed,false);
});

test('request-management consent is mandatory for internal handoff',()=>{
  const r=H.buildSourceOnlyHandoff({
    country:'GT',
    family:'vehicle',
    contact:{name:'Persona Demo',email:'demo@example.com'}
  });
  assert.equal(r.readyForServerAdapter,false);
  assert.ok(r.blockers.includes('MISSING_consents.requestManagement'));
});

test('at least one contact channel is required',()=>{
  const r=H.buildSourceOnlyHandoff({
    country:'CO',
    family:'cargo',
    contact:{name:'Empresa Demo',requestManagementConsent:true}
  });
  assert.equal(r.readyForServerAdapter,false);
  assert.ok(r.blockers.includes('MISSING_contact.channel'));
});

test('partial CotComp ref fails closed',()=>{
  const r=H.buildSourceOnlyHandoff({
    country:'GT',
    family:'vehicle',
    contact:{name:'Persona Demo',whatsapp:'+50255555555',requestManagementConsent:true},
    cotcompRef:{caseId:'case_only'}
  });
  assert.equal(r.readyForServerAdapter,false);
  assert.ok(r.blockers.includes('COTCOMP_REF_INCOMPLETE'));
});

test('server-side advisor routing and durable readback are explicit gates',()=>{
  const r=H.buildSourceOnlyHandoff({
    country:'CO',
    family:'business',
    contact:{name:'Empresa Demo',email:'demo@example.com',requestManagementConsent:true}
  });
  assert.ok(r.serverRequirements.includes('SERVER_SIDE_ADVISOR_ROUTING'));
  assert.ok(r.serverRequirements.includes('DURABLE_READBACK'));
  assert.ok(r.serverRequirements.includes('NOTIFICATION_OUTBOX_READBACK'));
  assert.equal(r.userAckAllowed,false);
});
