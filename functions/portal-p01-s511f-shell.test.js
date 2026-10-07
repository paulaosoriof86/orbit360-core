'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=()=>fs.readFileSync(path.join(__dirname,'..','orbit360-platform','portal-p01-lab.html'),'utf8');
const js=()=>fs.readFileSync(path.join(__dirname,'..','orbit360-platform','core','portal-p01-s511f.js'),'utf8');

test('S5.11F shell exposes only read-only first-slice states',()=>{
  const h=html(),s=js();
  assert.match(h,/Portal P-01 · LAB · READ-ONLY/);
  assert.match(h,/Pagos, cambios de póliza, cargas de documentos, siniestros transaccionales, mensajería e IA todavía no están liberados/);
  assert.match(h,/state-login/);
  assert.match(h,/state-unverified/);
  assert.match(h,/state-noaccess/);
  assert.match(h,/state-error/);
  assert.match(h,/state-portal/);
  assert.match(s,/portalP01ReadOnlyS511E/);
  assert.doesNotMatch(s,/requestedClientId\s*:/);
});

test('S5.11F does not expose raw internal account identifiers in visible option labels',()=>{
  const s=js();
  assert.match(s,/o\.textContent='Cuenta '/);
  assert.doesNotMatch(s,/textContent\s*=\s*ref/);
  assert.match(s,/refs\[idx\]/);
});

test('S5.11F separates empty data from technical or permission failures',()=>{
  const h=html(),s=js();
  assert.match(s,/No encontramos seguros vigentes o próximos a renovar para esta cuenta/);
  assert.match(s,/No encontramos documentos disponibles para esta cuenta/);
  assert.match(h,/No pudimos consultar la información/);
  assert.match(h,/Tu acceso a esta cuenta no está disponible/);
});

test('S5.11F keeps unverified email and staff reuse out of successful portal flow',()=>{
  const h=html(),s=js();
  assert.match(h,/Verifica tu correo/);
  assert.match(s,/emailVerified!==true/);
  assert.match(h,/El acceso del equipo interno de A&S no puede utilizarse aquí/);
});

test('S5.11F document list exposes eligibility but no raw storage or direct document URL',()=>{
  const s=js();
  assert.match(s,/secureViewerEligible/);
  assert.match(s,/Visor seguro elegible/);
  assert.doesNotMatch(s,/storagePath|driveFileId|downloadURL|getDownloadURL/);
});
