'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('./cotcomp-public-inbound-adapter-s503');

test('S5.03 is source-only, no runtime export or writes',()=>{
  assert.equal(A.RUNTIME_EXPORT_ALLOWED,false);
  assert.equal(A.EXECUTION_ENABLED,false);
  assert.equal(A.WRITES_ENABLED,false);
  assert.equal(A.PRODUCTION,false);
  assert.equal(A.POLICY.directFirestoreFromBrowser,false);
  assert.equal(A.POLICY.internalCallableExposedToPublic,false);
});

test('App Check is mandatory for public inbound',()=>{
  const r=A.validateRequest({data:{
    country:'GT',family:'vehicle',
    contact:{name:'Persona Demo',whatsapp:'+50255555555',requestManagementConsent:true}
  }});
  assert.equal(r.ok,false);
  assert.ok(r.errors.includes('APP_CHECK_REQUIRED'));
});

test('valid request remains blocked until advisor routing is resolved',()=>{
  const request={
    app:{appId:'demo-app'},
    data:{
      country:'GT',family:'vehicle',
      contact:{name:'Persona Demo',whatsapp:'+50255555555',requestManagementConsent:true}
    }
  };
  const p=A.buildServerPlan(request,{});
  assert.equal(p.validation.ok,true);
  assert.equal(p.ok,false);
  assert.equal(p.routing.code,'ADVISOR_ROUTING_REQUIRED');
  assert.equal(p.proposedCommand,null);
  assert.equal(p.userSuccessCopyAllowed,false);
});

test('configured advisor routing produces only a proposed internal command',()=>{
  const request={
    app:{appId:'demo-app'},
    data:{
      country:'CO',family:'cargo',
      contact:{name:'Empresa Demo',email:'demo@example.com',requestManagementConsent:true}
    }
  };
  const p=A.buildServerPlan(request,{
    resolveAdvisor:()=>({advisorId:'advisor_demo_01',strategy:'COUNTRY_CONFIG'})
  });
  assert.equal(p.ok,true);
  assert.equal(p.nextServerOperation,'CREATE_BUSINESS_VIA_INTERNAL_DOMAIN');
  assert.equal(p.proposedCommand.operation,'create_business');
  assert.equal(p.proposedCommand.payload.asesorId,'advisor_demo_01');
  assert.equal(p.writesEnabled,false);
  assert.equal(p.userSuccessCopyAllowed,false);
});

test('request-management consent is mandatory',()=>{
  const r=A.validateRequest({
    app:{appId:'demo-app'},
    data:{country:'GT',family:'vehicle',contact:{name:'Persona Demo',email:'demo@example.com'}}
  });
  assert.equal(r.ok,false);
  assert.ok(r.errors.includes('MISSING_consents.requestManagement'));
});

test('unsafe extra browser keys are dropped from sanitized context',()=>{
  const s=A.safeContext({
    country:'GT',
    family:'vehicle',
    contact:{name:'Persona Demo',email:'demo@example.com',requestManagementConsent:true,secret:'x'},
    rawToken:'should-not-pass',
    adminRole:'superadmin',
    asesorId:'browser-should-not-route'
  });
  assert.equal(Object.prototype.hasOwnProperty.call(s,'rawToken'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(s,'adminRole'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(s,'asesorId'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(s.contact,'secret'),false);
});

test('oversized public payload fails closed',()=>{
  const r=A.validateRequest({
    app:{appId:'demo-app'},
    data:{
      country:'GT',family:'vehicle',
      contact:{name:'Persona Demo',email:'demo@example.com',requestManagementConsent:true},
      junk:'x'.repeat(30*1024)
    }
  });
  assert.ok(r.errors.includes('PAYLOAD_TOO_LARGE'));
});

test('execution assertion always blocks in S5.03',()=>{
  assert.throws(()=>A.assertExecutionClosed(),/COTCOMP_PUBLIC_INBOUND_EXECUTION_DISABLED/);
});
