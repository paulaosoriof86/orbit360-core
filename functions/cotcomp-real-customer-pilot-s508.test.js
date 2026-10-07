'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-real-customer-pilot-s508');
const page=require('./cotcomp-s508-private-page');

test('S5.08 scope and hard boundaries are frozen',()=>{
  assert.equal(s.PROJECT_ID,'ays-orbit-360-lab');
  assert.equal(s.TENANT_ID,'alianzas-soluciones');
  assert.equal(s.RETENTION,'RETAIN_IF_VALID_BUSINESS_RECORD');
  assert.match(s.TOKEN_SHA256,/^[a-f0-9]{64}$/);
  assert.ok(Date.parse(s.EXPIRES_AT)>Date.parse('2026-10-07T00:00:00Z'));
});

test('S5.08 validates minimized participant fields',()=>{
  const v=s.normalize({
    brand:'Toyota',lineModel:'Yaris',name:'Persona invitada',
    whatsapp:'+502 5555 0000',email:'',note:'Revisar opciones',
    adultConfirmed:true,requestManagementConsent:true
  });
  assert.deepEqual(s.validate(v),[]);
  assert.ok(s.validate({...v,adultConfirmed:false}).includes('ADULT_REQUIRED'));
  assert.ok(s.validate({...v,requestManagementConsent:false}).includes('CONSENT_REQUIRED'));
  assert.throws(()=>s.normalize({...v,dpi:'123'}),/FIELDS/);
});

test('S5.08 requires at least one contact channel',()=>{
  const v=s.normalize({brand:'Toyota',lineModel:'Yaris',name:'Persona invitada',whatsapp:'',email:'',note:'',adultConfirmed:true,requestManagementConsent:true});
  assert.ok(s.validate(v).includes('CONTACT_REQUIRED'));
});

test('S5.08 designated advisor rule is Paula + active GT advisor',()=>{
  const row={nombre:'Paula Andrea Osorio Franco',activo:true,roles:['Asesor'],paises:['GT']};
  assert.equal(s.isPaula(row),true);
  assert.equal(s.isPaula({...row,activo:false}),false);
  assert.equal(s.isPaula({...row,paises:['CO']}),false);
});

test('S5.08 stable ids are deterministic and non-PII',()=>{
  assert.deepEqual(s.ids(),s.ids());
  assert.match(s.ids().businessId,/^s508_neg_[a-f0-9]{20}$/);
  assert.match(s.ids().requestId,/^s508_req_[a-f0-9]{20}$/);
});

test('Private page carries consent/privacy truth and no false insurance claim',()=>{
  const h=page.html({tokenHash:s.TOKEN_SHA256,privacyEmail:'info@aysseguros.com'});
  assert.match(h,/asignado a Paula Osorio/);
  assert.match(h,/No cotiza con una aseguradora/);
  assert.match(h,/Marketing está desactivado/);
  assert.match(h,/12 meses/);
  assert.match(h,/info@aysseguros\.com/);
  assert.match(h,/mayor de 18 años/);
  assert.match(h,/no confirma cobertura, cotización, emisión ni contratación/i);
});
