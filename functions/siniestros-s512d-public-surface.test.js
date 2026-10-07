'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const r=require('./siniestros-public-resolver-s512d');

const html=()=>fs.readFileSync(path.join(__dirname,'..','orbit360-platform','siniestros-asistencia-lab.html'),'utf8');
const client=()=>fs.readFileSync(path.join(__dirname,'..','orbit360-platform','core','siniestros-s512d-public.js'),'utf8');

test('S5.12D resolver returns only validated registry channel plus A&S fallbacks',()=>{
  const ok=r.publicResolved('SEGUROS EL ROBLE');
  assert.equal(ok.insurerChannelStatus,'CURRENT_CHANNEL_VALIDATED');
  assert.equal(ok.insurerChannel.value,'1797');
  assert.equal(ok.insurerChannel.validated,true);
  assert.equal(ok.fallbackChannels.length,2);
  assert.equal(ok.truth.coverageConfirmed,false);
  assert.equal(ok.truth.eligibilityConfirmed,false);

  const stale=r.publicResolved('SEGUROS UNIVERSALES');
  assert.equal(stale.insurerChannel,null);
  assert.equal(stale.insurerChannelStatus,'NO_VALIDATED_INSURER_CHANNEL');
  assert.equal(stale.fallbackChannels.length,2);
});

test('S5.12D public surface preserves Safety-first and truth boundaries',()=>{
  const h=html(),c=client();
  assert.match(h,/Primero seguridad/);
  assert.match(h,/Solicitar asistencia/);
  assert.match(h,/Avisar o reportar/);
  assert.match(h,/Presentar una reclamación/);
  assert.match(h,/Consultar o dar seguimiento/);
  assert.match(h,/Reportar no confirma cobertura/);
  assert.match(c,/No mostraremos un número interno no verificado/);
  assert.match(c,/No significan que la cobertura o elegibilidad estén confirmadas/);
});

test('S5.12D UI consumes resolver and does not contain stale insurer directory numbers',()=>{
  const c=client();
  assert.match(c,/siniestrosPublicResolverS512D/);
  assert.doesNotMatch(c,/2225-7500|2279-9989|2208-0700/);
});

test('S5.12D endpoint origin allowlist is LAB only',()=>{
  assert.equal(r.ALLOWED_ORIGINS.has('https://ays-orbit-360-lab.web.app'),true);
  assert.equal(r.ALLOWED_ORIGINS.has('https://ays-orbit-360-lab.firebaseapp.com'),true);
  assert.equal(r.ALLOWED_ORIGINS.has('https://example.com'),false);
});
