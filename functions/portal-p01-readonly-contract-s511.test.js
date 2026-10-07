'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const p=require('./portal-p01-readonly-contract-s511');

function identity(overrides={}){return Object.assign({subject:'cust-auth-1',provider:'firebase-customer-auth',emailVerified:true,status:'active'},overrides);}
function grant(overrides={}){return Object.assign({grantId:'g1',tenantId:'alianzas-soluciones',identitySubject:'cust-auth-1',clientIds:['cli-1'],status:'active',expiresAt:'2027-01-01T00:00:00Z'},overrides);}

test('P-01 is external-customer read-only and forbids staff/browser client scope shortcuts',()=>{
  assert.equal(p.POLICY.sourceOnly,true);
  assert.equal(p.POLICY.externalCustomerIdentityRequired,true);
  assert.equal(p.POLICY.staffSessionReuseAllowed,false);
  assert.equal(p.POLICY.directBrowserClientIdAllowed,false);
  assert.equal(p.POLICY.writeOperationsAllowed,false);
});

test('identity and grant fail closed',()=>{
  assert.equal(p.validatePortalIdentity(identity()).ok,true);
  assert.ok(p.validatePortalIdentity(identity({emailVerified:false})).errors.includes('IDENTITY_EMAIL_NOT_VERIFIED'));
  assert.equal(p.validateAccessGrant(grant(),'cust-auth-1','2026-10-07T00:00:00Z').ok,true);
  assert.ok(p.validateAccessGrant(grant({tenantId:'other'}),'cust-auth-1','2026-10-07T00:00:00Z').errors.includes('GRANT_TENANT_DENY'));
  assert.ok(p.validateAccessGrant(grant({expiresAt:'2026-01-01T00:00:00Z'}),'cust-auth-1','2026-10-07T00:00:00Z').errors.includes('GRANT_EXPIRED'));
});

test('browser cannot choose clientId',()=>{
  const r=p.resolveClientScope({identity:identity(),grant:grant(),requestedClientId:'cli-1',nowIso:'2026-10-07T00:00:00Z'});
  assert.equal(r.ok,false);
  assert.equal(r.code,'BROWSER_CLIENT_ID_DENY');
});

test('server resolves one or more client resources from grant',()=>{
  const r=p.resolveClientScope({identity:identity(),grant:grant({clientIds:['cli-1','cli-2','cli-1']}),nowIso:'2026-10-07T00:00:00Z'});
  assert.deepEqual(r,{ok:true,tenantId:'alianzas-soluciones',clientIds:['cli-1','cli-2']});
});

test('projection is read-only and excludes transactional portal features',()=>{
  const r=p.buildReadOnlyProjection({
    client:{id:'cli-1',nombre:'Cliente Demo',pais:'GT',tipo:'Persona'},
    policies:[
      {id:'p1',numero:'POL-1',ramo:'Vehículos',estado:'Vigente',aseguradoraId:'a1',inicio:'2026-01-01',vence:'2027-01-01'},
      {id:'p2',numero:'POL-2',ramo:'Daños',estado:'Cancelada',aseguradoraId:'a2'}
    ],
    insurersById:{a1:{nombre:'Aseguradora 1'},a2:{nombre:'Aseguradora 2'}},
    documents:[{id:'d1',clienteId:'cli-1',nombre:'Carátula',tipo:'Póliza',fecha:'2026-01-01',storagePath:'secure/path'}]
  });
  assert.equal(r.readOnly,true);
  assert.equal(r.policies.length,1);
  assert.equal(r.policies[0].policyRef,'p1');
  assert.equal(r.documents.length,1);
  assert.equal(r.documents[0].secureViewerEligible,true);
  assert.deepEqual(r.excluded,{payments:true,claimsTransactions:true,uploads:true,policyChanges:true,messaging:true,ai:true});
  assert.equal(Object.prototype.hasOwnProperty.call(r,'cobros'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(r,'reclamos'),false);
});

test('document projection never exposes raw storage url/path',()=>{
  const d=p.documentProjection({id:'d1',nombre:'Carátula',tipo:'Póliza',fecha:'2026-01-01',storagePath:'secret/path',url:'https://example.test/raw'});
  assert.equal(d.secureViewerEligible,true);
  assert.equal(Object.prototype.hasOwnProperty.call(d,'storagePath'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(d,'url'),false);
});


test('current Firestore rules must not be reused as external customer authorization',()=>{
  const fs=require('node:fs');
  const path=require('node:path');
  const rules=fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8');
  assert.match(rules,/isTenantMember\(tenantId\)/);
  assert.doesNotMatch(rules,/CustomerAccessGrant|portalCustomerAccessGrant|PortalIdentity/);
  assert.equal(p.POLICY.staffSessionReuseAllowed,false);
  assert.equal(p.POLICY.directBrowserClientIdAllowed,false);
});


test('P-01 external customer access must go through a backend projection',()=>{
  assert.equal(p.BACKEND_CONTRACT.transport,'firebase_callable');
  assert.equal(p.BACKEND_CONTRACT.auth,'firebase_auth_external_customer');
  assert.equal(p.BACKEND_CONTRACT.grantCollection,'portalCustomerAccessGrants');
  assert.equal(p.BACKEND_CONTRACT.grantLookup,'server_side');
  assert.equal(p.BACKEND_CONTRACT.dataAccess,'admin_sdk_server_side');
  assert.equal(p.BACKEND_CONTRACT.browserFirestoreRead,false);
  assert.equal(p.BACKEND_CONTRACT.browserFirestoreWrite,false);
  assert.equal(p.BACKEND_CONTRACT.customerAsTenantMember,false);
  assert.equal(p.BACKEND_CONTRACT.projection,'allowlisted_read_only_dto');
  assert.equal(p.BACKEND_CONTRACT.failClosed,true);
});
