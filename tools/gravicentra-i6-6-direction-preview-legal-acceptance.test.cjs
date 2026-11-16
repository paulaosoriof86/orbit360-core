'use strict';
// Authority and evidence tests only. No real authentication, consent or network.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const g=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const copy=v=>JSON.parse(JSON.stringify(v));
const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/core/legal.js'),'utf8');
function owner(){
  const memory=new Map(),user={uid:'test-direction-uid',email:'direction@example.invalid',nombre:'Dirección QA',advisorId:g.ADVISOR,tenantId:g.TENANT};
  const orbit={auth:{user:()=>user},tenant:{get:()=>({paisDefault:'GT',nombre:'Alianzas & Soluciones'})}};
  const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  vm.runInNewContext(source,{window:{Orbit:orbit,location:{origin:g.ORIGIN}},Orbit:orbit,localStorage:storage});
  return{orbit,memory,user};
}
function fixture(){
  const cfg={phase:'PREVIEW',origin:g.ORIGIN,source:'a'.repeat(40)},receiptSha256='b'.repeat(64);
  const receipt={schema:'I6_6_EXPLICIT_DIRECTION_PREVIEW_LEGAL_ACCEPTANCE_V1',decisionId:g.DECISION,sourceBaseHead:g.SOURCE_BASE,
    decision:{status:'EXPLICIT_ACCEPTANCE',response:'Acepto',receivedLocalDate:'2026-11-16',reviewDocumentSha256:g.REVIEW_SHA256},
    subject:{advisorId:g.ADVISOR,role:'direccion',tenantId:g.TENANT,country:'GT'},environment:{phase:'PREVIEW',origin:g.ORIGIN},
    legal:{version:g.VERSION,clauseIds:[...g.CLAUSES],termsProjectionSha256:g.TERMS_SHA256},
    constraints:{ordinaryUiOnly:true,otherActors:false,live:false,futureSourceSuccessors:false,storageSeeding:false,gateBypass:false}};
  const candidate={sourceSha:cfg.source,status:'EXACT_BACKEND_PREVIEW_SIGNED_QA_AUTHORIZED',
    legalAcceptance:{receiptPath:g.RECEIPT,receiptSha256,decisionId:g.DECISION,sourceSha:cfg.source,phase:'PREVIEW',actorRole:'direccion'}};
  return{receipt,receiptSha256,candidate,cfg,sourceParent:g.SOURCE_BASE,actor:{role:'Dirección',advisorId:g.ADVISOR,uid:'test-direction-uid'}};
}
function presentation(){
  const o=owner(),scope='user:'+o.user.email;
  return{origin:g.ORIGIN,actorUid:o.user.uid,advisorId:g.ADVISOR,role:'Dirección',tenantId:g.TENANT,email:o.user.email,scope,gateCount:1,
    version:g.VERSION,type:'interno',country:'GT',clauseIds:[...g.CLAUSES],previousAcceptance:null,checked:false,buttonDisabled:true,
    terms:copy(g.projectCatalog(o.orbit.legal.catalogo()))};
}
test('explicit current Direction decision is limited to the exact Preview source successor and reviewed document',()=>{
  assert.equal(g.validateDecision(fixture()),true);
  const mutations=[
    x=>x.cfg.phase='LIVE',x=>x.cfg.origin='https://app.aysseguros.com',x=>x.sourceParent='c'.repeat(40),
    x=>x.candidate.sourceSha='d'.repeat(40),x=>x.candidate.status='SIGNED_PREVIEW_HOLD',x=>delete x.candidate.legalAcceptance,
    x=>x.candidate.legalAcceptance.receiptSha256='e'.repeat(64),x=>x.candidate.legalAcceptance.sourceSha='f'.repeat(40),
    x=>x.receipt.decision.status='ASSUMED_FROM_GENERAL_WORK_AUTHORIZATION',x=>x.receipt.decision.response='Continúa',
    x=>x.receipt.decision.reviewDocumentSha256='0'.repeat(64),x=>x.receipt.subject.advisorId='ase-carlos-castro',
    x=>x.receipt.environment.phase='LIVE',x=>x.receipt.legal.clauseIds.push('socios'),x=>x.receipt.legal.version='3.0',
    x=>x.receipt.constraints.otherActors=true,x=>x.receipt.constraints.futureSourceSuccessors=true,
    x=>x.receipt.constraints.storageSeeding=true,x=>x.receipt.constraints.gateBypass=true,
    x=>x.actor.role='Operativo',x=>x.actor.advisorId='ase-carlos-castro',x=>x.actor.uid=''
  ];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>g.validateDecision(f));}
});
test('the three reviewed full clauses retain their exact accepted text digest',()=>{
  const o=owner();assert.deepEqual([...o.orbit.legal.clausulasPara('interno')],[...g.CLAUSES]);
  assert.equal(g.digest(g.projectCatalog(o.orbit.legal.catalogo())),g.TERMS_SHA256);
});
test('the ordinary UI cannot be accepted for a wrong actor, country, scope, version or displayed clause',()=>{
  const actor=fixture().actor;assert.equal(g.validatePresentation(presentation(),actor),true);
  const mutations=[
    x=>x.origin='https://other.example',x=>x.actorUid='another-uid',x=>x.advisorId='ase-carlos-castro',
    x=>x.role='Operativo',x=>x.tenantId='another-tenant',x=>x.scope='user:other@example.invalid',
    x=>x.gateCount=0,x=>x.gateCount=2,x=>x.version='2.1',x=>x.type='socio',x=>x.country='CO',
    x=>x.clauseIds.pop(),x=>x.terms[0].blocks[0].paragraph+=' Additional obligation.',
    x=>x.terms[1].metadata='Different legal authority',x=>x.previousAcceptance={version:'2.0'},
    x=>x.checked=true,x=>x.buttonDisabled=false
  ];
  for(const mutate of mutations){const p=presentation();mutate(p);assert.throws(()=>g.validatePresentation(p,actor));}
});
test('acceptance metadata never invents an IP and preserves prior unrelated history',()=>{
  const o=owner(),prior={version:'1.0',aceptado:true,fecha:'2026-01-01',ip:'historical-preserved'};
  o.memory.set('orbit360_legal_aceptaciones',JSON.stringify({'user:another':prior}));
  const scope='user:'+o.user.email,before=Date.now();
  o.orbit.legal.registrar(scope,{tipo:'interno',clausulas:[...g.CLAUSES],acceptanceMethod:'VISIBLE_CHECKBOX_AND_BUTTON',ip:'invented',origin:'https://forged.example',actorUid:'forged'});
  const records=JSON.parse(o.memory.get('orbit360_legal_aceptaciones'));
  assert.deepEqual(records['user:another'],prior);
  assert.equal(g.validateAccepted(records[scope],fixture().actor,scope,before,Date.now()),true);
  assert.equal(records[scope].usuario,'Dirección QA');
  assert.equal(records[scope].ip,null);assert.equal(records[scope].ipSource,'NOT_COLLECTED');
});
test('post-click proof rejects storage from another scope, actor, version, origin or time',()=>{
  const scope='user:direction@example.invalid',actor=fixture().actor,at=Date.parse('2026-11-16T18:30:00.000Z');
  const valid={aceptado:true,version:'2.0',actorUid:actor.uid,scopeId:scope,origin:g.ORIGIN,pais:'GT',tipo:'interno',
    clausulas:[...g.CLAUSES],acceptanceMethod:'VISIBLE_CHECKBOX_AND_BUTTON',ip:null,ipSource:'NOT_COLLECTED',fecha:new Date(at).toISOString()};
  assert.equal(g.validateAccepted(valid,actor,scope,at-1,at+1),true);
  for(const patch of [{aceptado:false},{version:'2.1'},{actorUid:'other'},{scopeId:'user:other'},
    {origin:'https://app.aysseguros.com'},{pais:'CO'},{tipo:'socio'},{clausulas:['socios']},
    {acceptanceMethod:'SYNTHETIC_STORAGE_SEED'},{ip:'186.1.2.3'},{ipSource:'SIMULATED'},
    {fecha:'2026-11-15T18:30:00.000Z'},{fecha:'not-a-date'}])
    assert.throws(()=>g.validateAccepted({...valid,...patch},actor,scope,at-1,at+1));
});
test('signed UI entry points call consent only for Direction Preview and retain ordinary actionability',()=>{
  const helper=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-direction-preview-legal-acceptance.cjs'),'utf8');
  assert.match(helper,/gate\.locator\('#lg-chk'\)\.check\(\)/);assert.match(helper,/gate\.locator\('#lg-ok'\)\.click\(\)/);
  assert.doesNotMatch(helper,/force\s*:\s*true|localStorage\.setItem|legal\.registrar\(|legal\.dismiss\(|addInitScript\(/);
  const payable=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-advisor-payables-signed-uat.cjs'),'utf8');
  assert.match(payable,/if\(!cfg\.live\)\{[\s\S]*?acceptDirectionPreviewLegal\(\{page:direction\.page,actor:actors\[0\],cfg\}\)/);
  const proposal=fs.readFileSync(path.join(__dirname,'gravicentra-i6-6-proposal-application-signed-uat.cjs'),'utf8');
  assert.match(proposal,/if\(cfg\.phase==='PREVIEW'\)\{[\s\S]*?acceptDirectionPreviewLegal\(\{page:direction,actor:actors\[0\]/);
  assert.ok(require('./gravicentra-i6-6-operational-release-candidate.cjs').PINNED_OWNER_PATHS.includes('tools/gravicentra-i6-6-direction-preview-legal-acceptance.cjs'));
});
