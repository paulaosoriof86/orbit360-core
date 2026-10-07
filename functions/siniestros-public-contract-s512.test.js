'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./siniestros-public-contract-s512');

test('public status map covers every internal state without inventing extra states',()=>{
  assert.deepEqual(Object.keys(s.PUBLIC_STATE),s.INTERNAL_STATES);
  for(const state of s.INTERNAL_STATES)assert.equal(s.publicState(state).ok,true);
  assert.equal(s.publicState('Otro').ok,false);
});

test('public claim projection excludes raw internal structures',()=>{
  const r=s.publicClaimProjection({
    id:'r1',numero:'SIN-1',tipo:'Colisión',ramo:'Vehículos',fecha:'2026-10-07',
    estado:'En análisis',montoAprobado:0,
    bitacora:[{secret:'x'}],docs:['raw.pdf'],clienteId:'cli1',polizaId:'p1'
  });
  assert.equal(r.ok,true);
  assert.equal(r.value.publicStatus.code,'UNDER_REVIEW');
  assert.equal(Object.prototype.hasOwnProperty.call(r.value,'bitacora'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value,'docs'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value,'clienteId'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value,'polizaId'),false);
});

test('reporting or assistance does not imply coverage/eligibility',()=>{
  const r=s.assistanceTruth({requestCreated:true,coverageVerified:false,eligibilityVerified:false});
  assert.equal(r.requestCreated,true);
  assert.equal(r.coverageConfirmed,false);
  assert.equal(r.eligibilityConfirmed,false);
  assert.match(r.safeMessage,/sujetas a validación/);
});

test('document request requires claim scope and reason',()=>{
  assert.equal(s.documentRequestAllowed({claimExists:true,customerScopeResolved:true,requestReason:'Fotos del daño'}).ok,true);
  assert.equal(s.documentRequestAllowed({claimExists:true,customerScopeResolved:false,requestReason:'Fotos'}).ok,false);
  assert.equal(s.documentRequestAllowed({claimExists:true,customerScopeResolved:true,requestReason:''}).ok,false);
});

test('public contract remains source-only and forbids public writes/uploads',()=>{
  assert.equal(s.POLICY.sourceOnly,true);
  assert.equal(s.POLICY.publicWriteAllowed,false);
  assert.equal(s.POLICY.directBrowserFirestoreWriteAllowed,false);
  assert.equal(s.POLICY.publicDocumentUploadAllowed,false);
  assert.equal(s.POLICY.coverageConfirmationFromReportAllowed,false);
  assert.equal(s.POLICY.rawInternalBitacoraAllowed,false);
});


test('assistance channel keeps insurer directory data separate from coverage truth',()=>{
  const r=s.assistanceChannelProjection({
    insurer:{emergencia:'+502 5555 1111',ultimaRevision:'2026-09-01'},
    aysWhatsapp:'+502 5614 9048',
    aysEmail:'info@aysseguros.com'
  });
  assert.equal(r.ays.whatsapp,'+502 5614 9048');
  assert.equal(r.ays.email,'info@aysseguros.com');
  assert.equal(r.insurer.emergencyContactRegistered,true);
  assert.equal(r.insurer.verifiedCurrent,false);
  assert.equal(r.truth.insurerContactIsDirectoryDataNotCoverageConfirmation,true);
  assert.equal(r.truth.insurerContactFreshnessMustBeValidated,true);
});


test('S5.12a public insurer channel requires review date and official evidence',()=>{
  assert.deepEqual(
    s.channelFreshnessStatus({emergencyContact:'1800-TEST',lastReviewedAt:'',officialEvidenceVerified:false}),
    {publishable:false,code:'REVIEW_DATE_REQUIRED'}
  );
  assert.deepEqual(
    s.channelFreshnessStatus({emergencyContact:'1800-TEST',lastReviewedAt:'2026-10-07',officialEvidenceVerified:false}),
    {publishable:false,code:'OFFICIAL_EVIDENCE_REQUIRED'}
  );
  const ok=s.channelFreshnessStatus({emergencyContact:'1800-TEST',lastReviewedAt:'2026-10-07',officialEvidenceVerified:true});
  assert.equal(ok.publishable,true);
  assert.equal(ok.code,'CURRENT_CHANNEL_VALIDATED');
});

test('S5.12a missing insurer emergency contact never becomes publishable',()=>{
  assert.deepEqual(
    s.channelFreshnessStatus({emergencyContact:'',lastReviewedAt:'2026-10-07',officialEvidenceVerified:true}),
    {publishable:false,code:'NO_DIRECTORY_CHANNEL'}
  );
});


test('S5.12a public resolver falls back to A&S when insurer channel is stale',()=>{
  const r=s.resolvePublicAssistanceChannels({
    insurer:{emergencia:'2225-7500',ultimaRevision:''},
    aysWhatsapp:'+502 5614 9048',
    aysEmail:'info@aysseguros.com',
    officialEvidenceVerified:false
  });
  assert.equal(r.channels.length,2);
  assert.equal(r.insurerChannel,null);
  assert.equal(r.insurerChannelStatus,'REVIEW_DATE_REQUIRED');
  assert.equal(r.truth.requestChannelDoesNotConfirmCoverage,true);
});

test('S5.12a public resolver exposes insurer channel only after full freshness gate',()=>{
  const r=s.resolvePublicAssistanceChannels({
    insurer:{emergencia:'1789',ultimaRevision:'2026-10-07'},
    aysWhatsapp:'+502 5614 9048',
    aysEmail:'info@aysseguros.com',
    officialEvidenceVerified:true
  });
  assert.equal(r.insurerChannel.value,'1789');
  assert.equal(r.insurerChannel.validated,true);
  assert.equal(r.insurerChannelStatus,'CURRENT_CHANNEL_VALIDATED');
});


test('S5.12B validated registry includes only evidence-backed channels',()=>{
  const sry=s.validatedChannelRegistrySummary();
  assert.equal(sry.country,'GT');
  assert.equal(sry.reviewedAt,'2026-10-07');
  assert.equal(sry.count,8);
  assert.equal(s.validatedGtChannel('ASEGURADORA GENERAL').channel,'1757');
  assert.equal(s.validatedGtChannel('MAPFRE').channel,'2328-5060 / 2375-5060');
  assert.equal(s.validatedGtChannel('SEGUROS EL ROBLE').channel,'1797');
  assert.equal(s.validatedGtChannel('SEGUROS BANTRAB').channel,'2410-2696');
});

test('S5.12B stale or semantically unverified directory values are excluded from validated registry',()=>{
  assert.equal(s.validatedGtChannel('SEGUROS BAM'),null);
  assert.equal(s.validatedGtChannel('SEGUROS COLUMNA'),null);
  assert.equal(s.validatedGtChannel('SEGUROS UNIVERSALES'),null);
});

test('S5.12B registry stores evidence source, review date and scope',()=>{
  for(const row of Object.values(s.VALIDATED_GT_CHANNELS)){
    assert.match(row.sourceUrl,/^https:\/\//);
    assert.equal(row.reviewedAt,'2026-10-07');
    assert.ok(row.scope);
    assert.ok(row.type);
    assert.ok(row.channel);
  }
});


test('S5.12B GT public assistance resolver only exposes validated insurer registry rows',()=>{
  const ok=s.resolveValidatedGtAssistance({
    insurerName:'SEGUROS EL ROBLE',
    aysWhatsapp:'+502 5614 9048',
    aysEmail:'info@aysseguros.com'
  });
  assert.equal(ok.insurerChannelStatus,'CURRENT_CHANNEL_VALIDATED');
  assert.equal(ok.insurerChannel.value,'1797');
  assert.equal(ok.insurerChannel.validated,true);
  assert.equal(ok.fallbackChannels.length,2);
  assert.equal(ok.truth.coverageConfirmed,false);
  assert.equal(ok.truth.eligibilityConfirmed,false);

  const stale=s.resolveValidatedGtAssistance({
    insurerName:'SEGUROS UNIVERSALES',
    aysWhatsapp:'+502 5614 9048',
    aysEmail:'info@aysseguros.com'
  });
  assert.equal(stale.insurerChannel,null);
  assert.equal(stale.insurerChannelStatus,'NO_VALIDATED_INSURER_CHANNEL');
  assert.equal(stale.fallbackChannels.length,2);
});
