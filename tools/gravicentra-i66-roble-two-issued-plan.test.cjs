'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('./gravicentra-i66-roble-two-issued-plan.cjs');
const stamped='2026-11-22T22:00:00.000Z';
const matcher=(w,v,k)=>{
 const row=C.five.cases.find(c=>c.sourcePdfRawSha256===w.sourcePdfRawSha256);
 if(!row)return false;
 if(k==='holderWitness')return v==='holder-'+row.policy;
 if(k==='initialCertificatePlateWitness')return v==='plate-'+row.policy;
 if(k==='initialCertificateVinWitness')return v==='vin-'+row.policy;
 return false;
};
const fixtures=()=>({
 clientes:C.source.cases.map(c=>({id:'cli-'+c.policy,nombre:'holder-'+c.policy,pais:'GT'})),
 aseguradoras:[{id:'rob',nombre:'SEGUROS EL ROBLE',pais:'GT',activo:true}],
 polizas:C.source.cases.map(c=>({id:'old-'+c.policy,numero:c.policy,pais:'GT',clienteId:'cli-'+c.policy,aseguradoraId:'rob',asesorId:'adv',vigenciaInicio:c.termStart.replace('2026','2025'),vigenciaFin:c.termStart,estado:'Vigente',historial:[]})),
 vehiculos:C.source.cases.map(c=>({id:'veh-'+c.policy,clienteId:'cli-'+c.policy,polizaId:'old-'+c.policy,placa:'plate-'+c.policy,pais:'GT'})),
 asesores:[{id:'adv',activo:true}]
});
test('two source originals pin 24 requerimientos; 0.04/0.08 documentary differences preserved',()=>{
 assert.equal(C.check(),true);
 assert.deepEqual(C.source.cases.map(c=>c.coverScheduleDeltaCents),[4,8]);
 assert.equal(C.source.cases.reduce((n,c)=>n+c.schedule.length,0),24);
});
test('two canonical previous editions and single plate each qualify without fabricated VIN',()=>{
 const r=C.source.cases.map(c=>C.resolve(c,fixtures(),matcher));
 assert.ok(r.every(x=>x.status==='ELIGIBLE_SOURCE_IDENTITY_ONLY'));
 assert.ok(r.every(x=>x.evidence.platePriorCount===1));
});
test('all 24 emitted invoices and cartera, not a synthetic cobro',()=>{
 const f=fixtures();
 for(const c of C.source.cases){
  const m=C.mutation(c,C.resolve(c,f,matcher),stamped),policy=m.creates[0][1];
  assert.deepEqual(m.counts,{creates:27,updates:1,audit:1,receipts:12,portfolio:12,directPayments:0});
  assert.equal(m.creates.length,27);
  assert.equal(m.creates.filter(x=>x[0]==='cobros').length,0);
  assert.equal(m.creates.filter(x=>x[0]==='carteraPrimas').reduce((n,x)=>n+Math.round(x[1].primaTotal*100),0),c.issuedScheduleGrossCents);
  assert.equal(policy.renuevaDe,'old-'+c.policy);
  assert.equal(policy.primaTotal,c.issuerHeader.grossCents/100);
  assert.equal(policy.diferenciaDocumentalCentavos,c.coverScheduleDeltaCents);
  assert.equal(Math.round(policy.sumaAsegurada*100),c.issuedInsuredValueCents);
  assert.equal(Math.round(m.creates.find(x=>x[0]==='vehiculos')[1].sumaAsegurada*100),c.issuedInsuredValueCents);
  assert.ok(m.creates.filter(x=>x[0]==='recibosEsperados').every(x=>Number.isFinite(x[1].gastosEmisionYOtrosDocumentados)));
  assert.equal(m.previous.renovadaPor,policy.id);
 }
});
test('source collision or previous renewal is held per-case; other policy remains available',()=>{
 let f=fixtures(),c=C.source.cases[0];
 f.clientes.push({...f.clientes[0],id:'duplicate'});
 assert.equal(C.resolve(c,f,matcher).status,'CLIENT_HOLDER_NOT_UNIQUE');
 assert.equal(C.resolve(C.source.cases[1],f,matcher).status,'ELIGIBLE_SOURCE_IDENTITY_ONLY');
 f=fixtures();f.polizas[0].renovadaPor='successor';
 assert.equal(C.resolve(c,f,matcher).status,'ALREADY_RENEWED_OR_CANCELLED');
 f=fixtures();f.polizas.push({id:'current',pais:'GT',numero:c.policy,vigenciaInicio:c.termStart,vigenciaFin:c.termEnd});
 assert.equal(C.resolve(c,f,matcher).status,'ISSUED_EDITION_ALREADY_EXISTS');
});
test('wrong risk, wrong source identity and contradictory stored VIN stay fail-closed',()=>{
 let f=fixtures(),c=C.source.cases[0];f.vehiculos[0].placa='WRONG';
 assert.equal(C.resolve(c,f,matcher).status,'ISSUED_RISK_IDENTITY_NOT_UNIQUE');
 f=fixtures();f.vehiculos[0].vin='wrong';
 assert.equal(C.resolve(c,f,matcher).status,'ISSUED_RISK_IDENTITY_NOT_UNIQUE');
 f=fixtures();assert.equal(C.resolve(c,f).status,'CLIENT_HOLDER_NOT_UNIQUE');
});

const originalAdapter=require('./gravicentra-i66-roble-issued-original.cjs');
const originalPlate=c=>'P-'+c.policy.slice(3);
const originalVin=c=>'TSTVIN00'+c.policy.replace(/\D/g,'');
const originalMatcher=(w,v,k)=>{
 const c=C.five.cases.find(x=>x.sourcePdfRawSha256===w.sourcePdfRawSha256);
 return k==='holderWitness'?v==='holder-'+c.policy:
  k==='initialCertificatePlateWitness'?v===originalPlate(c):
  k==='initialCertificateVinWitness'?v===originalVin(c):false;
};
function originalFixture(c){
 const single=c.schedule.length===1,roble832=c.policy==='91-8323091';
 const h=single?[278180,13909,0,42500,40151,374740]:[220000,11000,29634,roble832?35000:40000,roble832?35476:36076,c.issuedGrossCents];
 const money=n=>(n/100).toFixed(2),day=x=>x.split('-').reverse().join('/');
 const rows=c.schedule.map((r,i)=>{
  const parts=single?[278180,56409,0,40151]:[i?18333:18337,roble832?(i?3834:3826):4250,i?2470:2464,roble832?2956:3006];
  return [r.requirement,day(r.due),...parts.map(money),money(r.grossCents)].join(' ');
 }).join('\n');
 return `Placa : ${originalPlate(c)}\nChasis : ${originalVin(c)}\fGuatemala, 09/09/2026\f`+
  `E N D O S O D E R E N O V A C I O N\nPRIMA QZ ${money(h[0])}\nGTOS. EMISION QZ ${money(h[1])}\nRECARGO QZ ${money(h[2])}\nASISTO QZ ${money(h[3])}\nIVA......... QZ ${money(h[4])}\nTOTAL QZ ${money(h[5])}\n`+
  `póliza No. ${c.policy}\nemitida a nombre de:\nholder-${c.policy}\f`+
  `POLIZA ${c.policy} DE SEGUROS EL ROBLE\nEMITIDA A FAVOR DE: holder-${c.policy}\nINCISO 1 ENDOSO No. ${c.endorsement} SUMA ASEGURADA\n:Q. 57000.00\n`+
  `MARCA.... TEST MODEL  DEDUCIBLE\nTIPO..... AUTOMOVIL CHASSIS...... ${originalVin(c)}\nMODELO... 2015 PLACAS: ${originalPlate(c)} MOTOR........ TESTMOTOR  PRIMA PERIODO\n`+
  `PROPIETARIO: DIFFERENT_OWNER\nVigencia de este inciso: del ${day(c.termStart).replaceAll('/','-')} al ${day(c.termEnd).replaceAll('/','-')}\f`+
  `ANEXO DE PAGOS FRACCIONADOS QUETZALES\nOperación No. ${c.endorsement} Vigencia: desde ${day(c.termStart)} hasta ${day(c.termEnd)}\n${rows}\n`;
}
const newCases=()=>originalAdapter.remainingCases().map(c=>originalAdapter.parseText(c,originalFixture(c),originalMatcher));
function newFixture(c){
 const f={clientes:[{id:'holder',pais:'GT',nombre:'holder-'+c.policy,asesorId:'adv'}],
  aseguradoras:[{id:'rob',nombre:'SEGUROS EL ROBLE',pais:'GT',activo:true}],asesores:[{id:'adv',activo:true,pais:'GT'}],polizas:[],vehiculos:[]};
 if(!c.allowAbsentPredecessor){
  f.polizas.push({id:'prior',pais:'GT',numero:c.policy,clienteId:'holder',aseguradoraId:'rob',asesorId:'adv',
   vigenciaInicio:c.termStart.replace('2026','2025'),vigenciaFin:c.termStart,estado:'Vigente',historial:[]});
  f.vehiculos.push({id:'old-risk',pais:'GT',polizaId:'prior',clienteId:'holder',placa:'DIFFERENT_OLD_PLATE'});
 }
 return f;
}
test('remaining 25: contractual insured is separate from vehicle owner, original financial lines exact',()=>{
 const cases=newCases();assert.equal(cases.reduce((n,c)=>n+c.schedule.length,0),25);
 assert.equal(cases.reduce((n,c)=>n+c.issuedScheduleGrossCents,0),1042552);
 assert.ok(cases.every(c=>c.originalProof.contractHolderVerified&&c.originalProof.contractOwnerDistinct));
 const c=originalAdapter.remainingCases()[1],text=originalFixture(c);
 assert.throws(()=>originalAdapter.parseText(c,text.replace('EMITIDA A FAVOR DE: holder-'+c.policy,'EMITIDA A FAVOR DE: OTHER_INSURED'),originalMatcher),/ISSUED_CONTRACT_HOLDER_CONFLICT/);
 assert.throws(()=>originalAdapter.parseText(c,text.replace('INCISO 1 ENDOSO No.','INCISO 2 ENDOSO No. 999999\nINCISO 1 ENDOSO No.'),originalMatcher),/ISSUED_MULTIPLE_RISKS_HOLD/);
 assert.throws(()=>originalAdapter.parseText(c,text.replace('280.57','280.58'),originalMatcher));
 assert.throws(()=>originalAdapter.parseBytes(c,Buffer.from('%PDF-invalid')),/ISSUER_ORIGINAL_BYTES_DRIFT/);
});
test('new issuer risk can differ from historic risk without changing or copying the historic vehicle',()=>{
 for(const c of newCases()){
  const f=newFixture(c),before=JSON.stringify(f),r=C.resolve(c,f,originalMatcher);
  assert.equal(r.status,'ELIGIBLE_SOURCE_IDENTITY_ONLY');
  const m=C.mutation(c,r,stamped),vehicle=m.creates.find(([k])=>k==='vehiculos')[1],policy=m.creates.find(([k])=>k==='polizas')[1];
  assert.equal(vehicle.placa,c.originalRisk.placa);assert.equal(vehicle.vin,c.originalRisk.vin);
  assert.equal(vehicle.sourceVehicleId,undefined);assert.equal(vehicle.versionOfVehicleId,undefined);
  assert.equal(JSON.stringify(f),before,'all prior source documents remain immutable');
  assert.equal(m.creates.filter(([k])=>k==='cobros').length,0);
  assert.equal(m.counts.receipts,c.schedule.length);assert.equal(m.counts.portfolio,c.schedule.length);
  assert.equal(policy.issuerOperation,'RENOVACION');
  if(c.allowAbsentPredecessor){assert.equal(policy.renuevaDe,undefined);assert.equal(m.previous,null);assert.equal(policy.externalRenewalWithoutCanonicalPredecessor,true);}
  else assert.equal(policy.renuevaDe,'prior');
 }
});
test('new source risk rejects overlapping, other-holder and orphan risk records, preserves historical versions',()=>{
 const c=newCases()[0],f=newFixture(c);
 const past={id:'historic',pais:'GT',clienteId:'holder',vigenciaInicio:'2024-01-01',vigenciaFin:c.termStart};
 f.polizas.push(past);f.vehiculos.push({id:'same-risk-history',pais:'GT',clienteId:'holder',polizaId:past.id,placa:originalPlate(c)});
 assert.equal(C.resolve(c,f,originalMatcher).status,'ELIGIBLE_SOURCE_IDENTITY_ONLY');
 past.vigenciaFin=c.termEnd;
 assert.equal(C.resolve(c,f,originalMatcher).status,'ISSUED_RISK_CURRENT_POLICY_OR_HOLDER_CONFLICT');
 past.vigenciaFin=c.termStart;f.vehiculos[1].clienteId='other-holder';
 assert.equal(C.resolve(c,f,originalMatcher).status,'ISSUED_RISK_CURRENT_POLICY_OR_HOLDER_CONFLICT');
 f.vehiculos[1].clienteId='holder';f.vehiculos[1].polizaId='missing-parent';
 assert.equal(C.resolve(c,f,originalMatcher).status,'ISSUED_RISK_CURRENT_POLICY_OR_HOLDER_CONFLICT');
});
test('source-original path does not relax holder, current edition, predecessor, cancellation or advisor identity',()=>{
 const c=newCases()[0];let f=newFixture(c);
 f.clientes.push({...f.clientes[0],id:'duplicate'});assert.equal(C.resolve(c,f,originalMatcher).status,'CLIENT_HOLDER_NOT_UNIQUE');
 f=newFixture(c);f.polizas=[];assert.equal(C.resolve(c,f,originalMatcher).status,'PREDECESSOR_NOT_UNIQUE');
 f=newFixture(c);f.polizas[0].estado='Cancelada';assert.equal(C.resolve(c,f,originalMatcher).status,'ALREADY_RENEWED_OR_CANCELLED');
 f=newFixture(c);f.asesores[0].activo=false;assert.equal(C.resolve(c,f,originalMatcher).status,'DOCUMENTARY_ADVISOR_UNVERIFIED');
 f=newFixture(c);f.polizas.push({...f.polizas[0],id:'current',vigenciaInicio:c.termStart,vigenciaFin:c.termEnd});
 assert.equal(C.resolve(c,f,originalMatcher).status,'ISSUED_EDITION_ALREADY_EXISTS');
 f=newFixture(c);assert.equal(C.resolve({...c,originalVerified:false},f,originalMatcher).status,'ISSUED_ORIGINAL_NOT_VERIFIED');
 f=newFixture(c);f.polizas[0].numeroPoliza='91-9999999';assert.equal(C.resolve(c,f,originalMatcher).status,'POLICY_NUMBER_FIELDS_CONFLICT');
});

// Execute the actual protected entrypoint against an isolated transactional
// store: preflight cannot write, apply rechecks CAS, and the old risk survives.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function isolatedStore(f){
 const base='tenants/'+C.tenant,entries=new Map(),clone=x=>JSON.parse(JSON.stringify(x));
 for(const [collection,rows] of Object.entries(f))for(const row of rows){
  const {id,...data}=row;entries.set(base+'/data/'+collection+'/items/'+id,{data:clone(data),version:1});
 }
 function reference(p,filters=[],fields=null,max=Infinity){
  return {path:p,id:p.split('/').at(-1),
   collection:n=>reference(p+'/'+n),doc:id=>reference(p+'/'+id),
   where:(field,operator,value)=>reference(p,[...filters,{field,operator,value}],fields,max),
   select:(...selected)=>reference(p,filters,selected,max),limit:n=>reference(p,filters,fields,n),
   _query:{filters,fields,max}};
 }
 function snapshot(ref,fields){
  const entry=entries.get(ref.path);const data=entry?(fields?Object.fromEntries(fields.filter(k=>Object.hasOwn(entry.data,k)).map(k=>[k,entry.data[k]])):entry.data):undefined;
  return {id:ref.id,ref,exists:!!entry,updateTime:{seconds:entry?.version||0,nanoseconds:0},
   data:()=>data?clone(data):undefined,get:k=>data?.[k]};
 }
 function read(ref){
  if(ref.path.split('/').length%2===0)return snapshot(ref);
  const {filters,fields,max}=ref._query;
  const docs=[...entries.keys()].filter(p=>p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1)
   .filter(p=>filters.every(({field,operator,value})=>operator==='in'?value.includes(entries.get(p).data[field]):entries.get(p).data[field]===value))
   .slice(0,max).map(p=>snapshot(reference(p),fields));
  return {docs,size:docs.length,empty:docs.length===0};
 }
 const db={collection:n=>reference(n),runTransaction:async(fn,options)=>{
  const mutations=[];const tx={get:async ref=>read(ref),getAll:async(...refs)=>refs.map(ref=>snapshot(ref)),
   create:(ref,data)=>{assert.notEqual(options?.readOnly,true,'preflight attempted a write');mutations.push({ref,data,create:true});},
   update:(ref,data)=>{assert.notEqual(options?.readOnly,true,'preflight attempted a write');mutations.push({ref,data,create:false});}};
  const result=await fn(tx);
  for(const m of mutations){const old=entries.get(m.ref.path);if(m.create)assert.equal(old,undefined);else assert.ok(old);
   entries.set(m.ref.path,{data:clone(m.create?m.data:{...old.data,...m.data}),version:(old?.version||0)+1});}
  return result;
 }};
 return {db,entries,base,clone};
}
async function executeProtected(c,state,mode,expected={},identityMatcher=originalMatcher,identityRequest){
 const logs=[],errors=[],outputs=[],env={GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',
  GITHUB_REF:'refs/heads/recovery/fase-a-clean-20260831',GCLOUD_PROJECT:C.project,
  GI_I66_BULK_PROTECTED_ENV:'gravicentra-live-data-writes',GITHUB_RUN_ID:'ISOLATED_TEST',GITHUB_OUTPUT:'/test/output',
  GI_I66_TWO_EXPECTED_B64:Buffer.from(JSON.stringify(expected)).toString('base64url')};
 const processMock={argv:['node','writer',mode],env,exitCode:0};
 const firestore=Object.assign(()=>state.db,{FieldValue:{serverTimestamp:()=>({seconds:1,nanoseconds:0})}});
 const modules={
  'firebase-admin':{initializeApp:()=>{},credential:{applicationDefault:()=>({})},firestore},
  'google-auth-library':{GoogleAuth:class{async getClient(){return {getRequestHeaders:async()=>({})};}}},
  './gravicentra-i66-roble-two-issued-plan.cjs':{...C,cases:[c],match:identityMatcher,
   resolve:(c,a)=>C.resolve(c,a,identityMatcher),
   resolveExisting:(c,a,m=identityMatcher,corrected=false)=>C.resolveExisting(c,a,m,corrected),originals:{load:async()=>c}},
  '../artifacts/orbit360-recovery/release-control/I6_6_20261123_PROTECTED_SOURCE_BULK_REFRESH_REQUEST.json':{readonlyIdentityReadback:identityRequest},
  'node:fs':{appendFileSync:(p,text)=>outputs.push(text)}
 };
 const source=fs.readFileSync(path.join(__dirname,'gravicentra-i66-roble-two-issued-protected.cjs'),'utf8');
 await vm.runInNewContext(source,{require:name=>Object.hasOwn(modules,name)?modules[name]:require(name),
  Buffer,process:processMock,console:{log:x=>logs.push(x),error:x=>errors.push(x)}});
 const line=logs.find(x=>x.startsWith('I66_ROBLE_TWO_24_'+mode.toUpperCase()+'='));
 return {exitCode:processMock.exitCode,report:line?JSON.parse(line.slice(line.indexOf('=')+1)):null,logs,errors,outputs};
}
test('protected writer CAS commits the source-defined risk and 12 obligations while preserving the old risk exactly',async()=>{
 const c=newCases()[1],state=isolatedStore(newFixture(c)),before=JSON.stringify([...state.entries]);
 const preflight=await executeProtected(c,state,'preflight');assert.equal(preflight.exitCode,0);
 assert.equal(JSON.stringify([...state.entries]),before,'real protected preflight is read-only');
 assert.equal(preflight.report.totals.eligible,1);
 const digest=preflight.report.results[0].beforeDigest,oldRisk=state.clone(state.entries.get(state.base+'/data/vehiculos/items/old-risk').data);
 const applied=await executeProtected(c,state,'apply',{[c.policy]:digest});
 assert.equal(applied.exitCode,0,applied.errors.join('\n'));assert.equal(applied.report.totals.committed,1);
 assert.equal(applied.report.results[0].readback.receipts,12);assert.equal(applied.report.results[0].readback.portfolio,12);
 assert.equal(applied.report.results[0].readback.payments,0);assert.equal(applied.report.results[0].readback.historicalVehiclesPreserved,1);
 assert.deepEqual(state.entries.get(state.base+'/data/vehiculos/items/old-risk').data,oldRisk);
 const committed=JSON.stringify([...state.entries]),replay=await executeProtected(c,state,'apply',{[c.policy]:digest});
 assert.equal(replay.exitCode,0,replay.errors.join('\n'));assert.equal(replay.report.totals.alreadyApplied,1);
 assert.equal(replay.report.results[0].status,'ALREADY_APPLIED_READBACK_PASS');assert.equal(replay.report.totals.writes,0);
 const readback=await executeProtected(c,state,'readback');assert.equal(readback.exitCode,0,readback.errors.join('\n'));
 assert.equal(readback.report.totals.alreadyApplied,1);assert.equal(readback.report.totals.writes,0);
 assert.ok(readback.logs.some(x=>x.includes('ALL_ISSUED_CASES_READBACK_PASS')));
 assert.equal(JSON.stringify([...state.entries]),committed,'replay and independent readback preserve every record');
});

const identityDiagnostic=require('./gravicentra-i66-financial-identity-readback.cjs');
function identityFixture(){
 const c=newCases().find(c=>c.policy==='91-4140843'),f=newFixture(c),targets=[];
 for(const [serial,suffix] of [['12289','4'],['15590','0'],['10738','6']]){
  const policy='04-05-01-'+serial+'-'+suffix,holder='PRIVATE_UNIVERSALES_HOLDER_'+serial,pdfSha='a'.repeat(64);
  targets.push({policy,sourceDriveId:'pdf-'+serial,sourcePdfSha256:pdfSha,
   holderWitness:C.sha(pdfSha+'|'+holder.replace(/[^A-Z0-9]/g,'')),sourceKind:'ISSUED_ORIGINAL',
   ...(serial==='12289'?{coverageStatusLiteral:'SIN COBERTURA',coverageStatusSourceDriveId:'source-status',coverageStatusSourceSha256:'b'.repeat(64)}:{})});
  f.clientes.push({id:'cli-'+serial,pais:'GT',nombre:holder,asesorId:'adv',email:'PRIVATE_EMAIL'});
 }
 f.aseguradoras.push({id:'uni',pais:'GT',nombre:'SEGUROS UNIVERSALES',activo:true});
 f.polizas.push({id:'uni-12289',numero:'04 05 01 012289 4',numeroPoliza:'04-05-01-12289-4',pais:'GT',moneda:'GTQ',clienteId:'cli-12289',aseguradoraId:'uni',vigenciaInicio:'2026-10-01',vigenciaFin:'2027-09-30',estado:'SIN COBERTURA',privateComment:'PRIVATE_POLICY_COMMENT'});
 f.polizas.push({id:'uni-15590',numero:'15590',polizaNumero:'04-05-01-15590-0',pais:'GT',moneda:'GTQ',clienteId:'cli-15590',aseguradoraId:'uni',vigenciaInicio:'2026-10-01',vigenciaFin:'2027-09-30'});
 f.polizas.push({id:'conflicting-risk-parent',numero:'91-0001111',pais:'GT',moneda:'GTQ',clienteId:'holder',aseguradoraId:'rob',vigenciaInicio:c.termStart,vigenciaFin:c.termEnd,estado:'Vigente'});
 f.vehiculos.push({id:'conflicting-risk',pais:'GT',clienteId:'holder',polizaId:'conflicting-risk-parent',placa:originalPlate(c),vin:'PRIVATE_RISK_VIN',email:'PRIVATE_VEHICLE_EMAIL'});
 return {c,f,request:{schema:'GI_I66_SOURCE_IDENTITY_READBACK_V1',enabled:true,writes:0,riskPolicy:c.policy,documentaryTargets:targets}};
}
test('readonly identity probe locates aliases and actual risk parent, preserves every matcher result and omits private values',async()=>{
 const {c,f,request}=identityFixture(),state=isolatedStore(f),before=JSON.stringify([...state.entries]);
 const baseline=await executeProtected(c,state,'preflight'),probe=await executeProtected(c,state,'preflight',{},originalMatcher,request);
 assert.equal(probe.exitCode,0,probe.errors.join('\n'));assert.deepEqual(probe.report.results,baseline.report.results);
 assert.deepEqual(probe.report.totals,baseline.report.totals);assert.equal(probe.report.totals.eligible,0);
 const d=probe.report.readonlyIdentityReadbacks[0];assert.equal(d.writes,0);assert.equal(d.noEligibilityEffect,true);
 assert.match(d.preimageDigest,/^[a-f0-9]{64}$/);assert.match(d.reportSha256,/^[a-f0-9]{64}$/);
 const renewal=d.documentaryTargets.find(t=>t.sourcePolicy==='04-05-01-12289-4');
 assert.equal(renewal.coverageStatusLiteral,'SIN COBERTURA');assert.equal(renewal.editions[0].state,'SIN COBERTURA');
 assert.equal(renewal.editions[0].numberRelations.numero,'EXACT_FULL_NUMBER');
 assert.equal(renewal.holderMatches[0].id,'cli-12289');assert.equal(renewal.editions[0].clientExists,true);
 assert.equal(d.riskCase.risks[0].parent.id,'conflicting-risk-parent');
 assert.equal(d.riskCase.risks[0].conflictInExistingMatcher,true);assert.equal(d.riskCase.risks[0].parentEndsNoLaterThanIssuedStart,false);
 assert.match(d.riskCase.risks[0].parent.documentSha256,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(d).includes('PRIVATE_'));assert.ok(!JSON.stringify(d).includes(originalPlate(c)));
 assert.equal(JSON.stringify([...state.entries]),before,'diagnostic and protected preflight perform zero writes');
});
test('diagnostic does not turn a short number, other endorsement, wrong holder, missing parent or invalid request into eligibility',async()=>{
 assert.equal(identityDiagnostic.numberRelation('15590','04-05-01-15590-0'),'SHORT_NUMBER_UNVERIFIED');
 assert.equal(identityDiagnostic.numberRelation('012289-4','04-05-01-12289-4'),'SHORT_NUMBER_WITH_ENDORSEMENT_UNVERIFIED');
 assert.equal(identityDiagnostic.numberRelation('12289-3','04-05-01-12289-4'),'SHORT_NUMBER_OTHER_ENDORSEMENT');
 assert.equal(identityDiagnostic.numberRelation('04 05 01 015590 1','04-05-01-15590-0'),'OTHER_ENDORSEMENT');
 assert.equal(identityDiagnostic.numberRelation('04 05 01 015590','04-05-01-15590-0'),'ENDORSEMENT_ABSENT_UNVERIFIED');
 assert.equal(identityDiagnostic.numberRelation('04 15 01 015590 0','04-05-01-15590-0'),'');
 const {c,f,request}=identityFixture();f.clientes.find(h=>h.id==='cli-12289').nombre='WRONG_HOLDER';
 f.vehiculos[0].polizaId='missing-parent';const state=isolatedStore(f);
 const probe=await executeProtected(c,state,'preflight',{},originalMatcher,request),d=probe.report.readonlyIdentityReadbacks[0];
 assert.equal(d.documentaryTargets[0].holderMatches.length,0);assert.equal(d.documentaryTargets[0].editions[0].holderWitnessMatches,false);
 assert.equal(d.riskCase.risks[0].parent.exists,false);assert.equal(probe.report.totals.eligible,0);
 const bad=await executeProtected(c,state,'preflight',{},originalMatcher,{...request,writes:1});
 assert.deepEqual(bad.report.results,probe.report.results);assert.equal(bad.report.readonlyIdentityReadbacks[0].status,'READONLY_DIAGNOSTIC_HOLD');
 const applied=await executeProtected(c,state,'apply',{},originalMatcher,request);
 assert.equal(applied.report.readonlyIdentityReadbacks,undefined);assert.equal(applied.report.totals.writes,0);
});
test('existing workflow readonly marker overrides all six protected jobs even if every eligibility output is true',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/gravicentra-i66-insurer-source-bulk-protected.yml'),'utf8');
 assert.match(workflow,/GI_I66_BULK_MODE:.*I66_ROBLE_0043_READBACK.*case-readback/);
 assert.match(workflow,/if: contains\(github\.event\.head_commit\.message, 'I66_ROBLE_TWO_24_CAS'\)/);
 const jobs=[...workflow.matchAll(/^  (protected-[a-z0-9-]+):\n([\s\S]*?)(?=^  [a-z0-9-]+:|$(?![\s\S]))/gm)];
 assert.equal(jobs.length,6,'new protected jobs must retain the read-only boundary');
 const outputs={readonly:'true',ready:'true',gyt_ready:'true',issued_ready:'true',d01_ready:'true',d03_ready:'true',series_ready:'true',two_ready:'true'};
 for(const [_,name,block] of jobs){
  const condition=block.match(/^    if: (.+)$/m)?.[1];assert.ok(condition,name+' condition');
  assert.ok(condition.includes("needs.preflight.outputs.readonly != 'true'"),name+' lacks read-only guard');
  const evaluate=new Function('needs','return '+condition);
  assert.equal(evaluate({preflight:{outputs}}),false,name+' cannot run in diagnostic readback');
  assert.equal(evaluate({preflight:{outputs:{...outputs,readonly:'false'}}}),true,name+' normal gate remains intact');
 }
 const judge=workflow.split('name: Verify exact counts before protected financial writes')[1].split("node - <<'JS'\n")[1].split('\n          JS')[0];
 const lines=[],STOP=Symbol('exit'),plan={status:'BULK_SOURCE_CASE_READBACK_ONLY_NO_WRITES',readOnly:true,caseId:'ROBLE_NOV20_0043',inputRows:1,writes:0,chunks:[],readyCount:999};
 const context={require:n=>n==='node:fs'?{readFileSync:()=>JSON.stringify(plan),appendFileSync:(p,t)=>lines.push(t)}:require(n),
  process:{env:{GI_I66_BULK_PLAN_OUT:'/test/plan',GITHUB_OUTPUT:'/test/output'},exit:n=>{assert.equal(n,0);throw STOP;}},console:{log:()=>{}}};
 assert.throws(()=>vm.runInNewContext(judge,context),e=>e===STOP);assert.deepEqual(lines,['ready=false\nreadonly=true\n']);
 plan.readOnly=false;lines.length=0;assert.throws(()=>vm.runInNewContext(judge,context));assert.deepEqual(lines,[]);
});
test('focal financial census reads actual shared reader and preserves all parents, receipts and payments without broadening eligibility',async()=>{
 const {c,f,request}=identityFixture();request.financialPolicyIds=[...identityDiagnostic.financialPolicyIds];
 const oldPolicy=request.financialPolicyIds[2],riskPolicy=request.financialPolicyIds[0];
 for(const id of request.financialPolicyIds)f.polizas.push({id,numero:id===oldPolicy?'AUTO-45580':'91-9998888',
  pais:'GT',moneda:'GTQ',clienteId:'holder',aseguradoraId:'rob',vigenciaInicio:'2025-07-21',vigenciaFin:'2026-07-21',
  primaTotal:299.94,frecuencia:'Mensual'});
 f.recibosEsperados=[{id:'rec_fin_old',polizaId:oldPolicy,clienteId:'holder',fechaLimite:'2026-04-21',
  periodoInicioFuente:'2026-04-21',primaTotal:299.94,monto:'299.94',privateHolder:'PRIVATE_FINANCIAL_HOLDER',
  numeroReciboFuente:'PRIVATE_REFERENCE_NAME',paymentEvidenceType:'PRIVATE_FINANCIAL_NOTE'}];
 f.carteraPrimas=[{id:'car_fin_old',reciboId:'rec_fin_old',policyId:riskPolicy,fechaLimite:'2026-04-21',primaTotal:299.94,
  carteraActiva:true,saldo:299.94,privateAccount:'PRIVATE_ACCOUNT'}];
 f.cobros=[{id:'cob_fin_old',reciboEsperadoId:'rec_fin_old',monto:299.94,fechaPago:'2026-04-30',confirmado:true,
  sourceRows:[{file:'CUSTOMER_PRIVATE_FILENAME.pdf',row:2,sha256:'c'.repeat(64)}]}];
 const state=isolatedStore(f),before=JSON.stringify([...state.entries]),baseline=await executeProtected(c,state,'preflight');
 const probe=await executeProtected(c,state,'preflight',{},originalMatcher,request);assert.equal(probe.exitCode,0,probe.errors.join('\n'));
 assert.deepEqual(probe.report.results,baseline.report.results);assert.deepEqual(probe.report.totals,baseline.report.totals);
 const d=probe.report.readonlyIdentityReadbacks[0];assert.equal(d.financial.complete,true);assert.equal(d.financial.writes,0);
 assert.deepEqual(d.financial.censusCounts,{recibosEsperados:1,carteraPrimas:1,cobros:1});
 assert.match(d.financial.financialCensusSha256,/^[a-f0-9]{64}$/);
 const target=d.financial.targets.find(t=>t.policy.id===oldPolicy);assert.equal(target.policy.exists,true);
 assert.deepEqual(target.counts,{recibosEsperados:1,carteraPrimas:1,cobros:1});
 const receipt=target.records.find(r=>r.collection==='recibosEsperados');
 assert.equal(receipt.dates.periodoInicioFuente,'2026-04-21');assert.equal(receipt.amounts.primaTotal.value,299.94);
 assert.equal(receipt.amounts.monto.type,'string');assert.equal(receipt.amounts.monto.value,'299.94');
 assert.match(receipt.references.numeroReciboFuente.valueSha256,/^[a-f0-9]{64}$/);
 assert.equal(target.records.find(r=>r.collection==='carteraPrimas').ids.policyId,riskPolicy,'contradictory parent aliases stay visible');
 assert.ok(d.financial.sourceCandidates.length>14,'pinned source and covered next-edition row stay distinguishable');
 assert.equal(JSON.stringify([...state.entries]),before);assert.ok(!JSON.stringify(d).includes('PRIVATE_'));
 const applied=await executeProtected(c,state,'apply',{},originalMatcher,request);
 assert.equal(applied.report.readonlyIdentityReadbacks,undefined);assert.equal(applied.report.totals.writes,0);
});
test('focal read rejects an expanded policy scope, incomplete census, and altered source digest',()=>{
 const {request}=identityFixture();request.financialPolicyIds=[...identityDiagnostic.financialPolicyIds];
 assert.throws(()=>identityDiagnostic.validate({...request,financialPolicyIds:[...request.financialPolicyIds,'six-qa-parent']}),/COUNT/);
 assert.throws(()=>identityDiagnostic.validate({...request,financialPolicyIds:request.financialPolicyIds.map((x,i)=>i===0?'six-qa-parent':x)}),/SCOPE_DRIFT/);
 assert.throws(()=>identityDiagnostic.financialReport(request,{complete:false},{candidates:[]},[],()=>({})),/COMPLETE_CENSUS/);
 assert.throws(()=>identityDiagnostic.financialReport(request,{complete:true,sourceSha256:'d'.repeat(64)},{candidates:[]},[],()=>({})));
});
test('new statement census projects the existing snapshot only; positive paid facts and duplicate/zero exclusions stay separate',async()=>{
 const {c,f,request}=identityFixture();request.financialPolicyIds=[...identityDiagnostic.financialPolicyIds];
 request.newStatementSource={...identityDiagnostic.newStatementSource};
 f.aseguradoras.push({id:'mapfre',pais:'GT',nombre:'MAPFRE SEGUROS GUATEMALA',activo:true});
 f.polizas.push({id:'pol_statement_match',numero:'SCIN 4394',pais:'GT',moneda:'GTQ',clienteId:'holder',aseguradoraId:'mapfre',
  vigenciaInicio:'2026-09-01',vigenciaFin:'2027-04-01',estado:'Vigente',frecuencia:'Mensual'});
 f.polizas.push({id:'pol_statement_other_insurer',numero:'SCIN-4394',pais:'GT',clienteId:'holder',aseguradoraId:'rob'});
 f.polizas.push({id:'pol_statement_other_product',numero:'AUTO-4394',pais:'GT',clienteId:'holder',aseguradoraId:'mapfre'});
 f.recibosEsperados=[{id:'rec_statement',polizaId:'pol_statement_match',clienteId:'holder',primaTotal:379.63,
  numeroReciboFuente:'139187477',cuota:'3/7',secuencia:3,fechaVencimientoContractual:'2026-11-01',privateNote:'PRIVATE_UNPUBLISHED'}];
 f.carteraPrimas=[{id:'car_statement',reciboId:'rec_statement',polizaId:'pol_statement_match',primaTotal:379.63,carteraActiva:true}];
 f.cobros=[{id:'cob_statement',reciboId:'rec_statement',polizaId:'pol_statement_match',monto:379.63,
  fechaPago:'2026-11-04',paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT',conciliado:true,
  invoiceNumber:'E5886356-3528738277',applicationDate:'2026-11-04',invoiceSeries:'PRIVATE_INVOICE_NOTE'}];
 const state=isolatedStore(f),before=JSON.stringify([...state.entries]),baseline=await executeProtected(c,state,'preflight');
 const probe=await executeProtected(c,state,'preflight',{},originalMatcher,request);
 assert.equal(probe.exitCode,0,probe.errors.join('\n'));assert.deepEqual(probe.report.results,baseline.report.results);
 assert.deepEqual(probe.report.totals,baseline.report.totals);assert.equal(JSON.stringify([...state.entries]),before);
 const d=probe.report.readonlyIdentityReadbacks[0].financial;
 assert.equal(d.newStatementSource.sourceFacts,56);assert.equal(d.newStatementSource.noEligibilityEffect,true);
 assert.equal(d.newStatementSource.matchingPolicyEditions,2);assert.equal(d.writes,0);
 const target=d.targets.find(x=>x.policy.id==='pol_statement_match');assert.ok(target);
 assert.equal(target.newStatementMatches.length,2);
 assert.deepEqual(target.newStatementMatches.map(x=>x.sourceRequirement),['139187477','139187476']);
 assert.deepEqual(target.counts,{recibosEsperados:1,carteraPrimas:1,cobros:1});
 assert.equal(target.records.find(x=>x.collection==='cobros').states.applicationState,'APPLIED_DIRECT');
 assert.equal(target.records.find(x=>x.collection==='cobros').invoiceReferences.invoiceNumber,'E5886356-3528738277');
 assert.equal(target.records.find(x=>x.collection==='cobros').dates.applicationDate,'2026-11-04');
 assert.match(target.records.find(x=>x.collection==='cobros').invoiceReferences.invoiceSeries.valueSha256,/^[a-f0-9]{64}$/);
 assert.ok(!JSON.stringify(d).includes('PRIVATE_'));assert.ok(!d.targets.some(x=>/other_insurer|other_product/.test(x.policy.id)));
 const replay=await executeProtected(c,state,'preflight',{},originalMatcher,request);
 assert.deepEqual(replay.report.readonlyIdentityReadbacks,probe.report.readonlyIdentityReadbacks);
 assert.equal(JSON.stringify([...state.entries]),before);
 const bad=structuredClone(request);bad.newStatementSource.sha256='f'.repeat(64);
 assert.throws(()=>identityDiagnostic.validate(bad),/SOURCE_SCOPE_DRIFT/);
 const badPath=structuredClone(request);badPath.newStatementSource.path='../../private';
 assert.throws(()=>identityDiagnostic.validate(badPath),/SOURCE_SCOPE_DRIFT/);
 const badCensus=structuredClone(request);delete badCensus.financialPolicyIds;
 assert.throws(()=>identityDiagnostic.validate(badCensus),/CENSUS_REQUIRED/);
});
test('the 56-fact supplement preserves the reviewed33, all source hashes, currencies and commission component boundaries',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const bytes=fs.readFileSync(path.join(__dirname,'..',identityDiagnostic.newStatementSource.path)),s=JSON.parse(bytes);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),identityDiagnostic.newStatementSource.sha256);
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(s.facts.slice(0,33))).digest('hex'),
  '391663cf8fb425bd5157558b40b4a04d749fa4c38d9f913002a85f2a63c8047e');
 assert.equal(s.sources.length,10);assert.equal(s.facts.length,56);assert.equal(s.isolatedRows.length,22);
 assert.equal(s.facts.filter(f=>f.state==='COMMISSION_ANCHOR').length,20);
 assert.equal(s.facts.filter(f=>f.state==='COMMISSION_ANCHOR'&&f.grossCents===null).length,11);
 assert.equal(s.facts.filter(f=>f.state==='PAID').reduce((n,f)=>n+f.grossCents,0),730803);
 assert.equal(s.facts.filter(f=>f.state==='PENDING').reduce((n,f)=>n+f.grossCents,0),2230053);
 assert.equal(s.facts.filter(f=>f.currency==='USD').length,1);
 assert.equal(s.facts.find(f=>f.currency==='USD').grossCents,21495);
 assert.ok(s.sources.every(x=>x.fullContractualSequenceAttested===false));
 assert.equal(new Set(s.facts.map(f=>f.sourceFactId)).size,56);
 for(const f of s.facts){
  const original=s.sources.find(x=>x.sourceId===f.sourceId);assert.ok(original);
  assert.equal(f.sourceSha256,original.sha256);assert.equal(f.sourceDriveId,original.driveFileId);
  assert.equal(f.currency,original.currency);assert.match(f.sourceRowSha256,/^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(f,'holder'),false);assert.equal(Object.hasOwn(f,'email'),false);
 }
 for(const req of ['37260363','39470706']){
  assert.equal(s.facts.filter(f=>f.requirement===req).length,1);
  const component=s.isolatedRows.find(f=>f.requirement===req);assert.ok(component);
  assert.match(component.reason,/NO_SECOND_PAYMENT/);
 }
 assert.match(s.facts.find(f=>f.requirement==='37260364').knownPreservationBoundary,/NO_SECOND_COBRO/);
 assert.equal(s.facts.find(f=>f.requirement==='39470706').grossCents,null,'do not derive first gross from annual/12');
 assert.equal(s.facts.find(f=>f.requirement==='39470707').grossCents,76440,'second payment amount is explicit insurer source');
 assert.equal(s.isolatedRows.filter(f=>f.reason==='ZERO_AMOUNT_IS_NOT_PAYMENT_PROOF').length,12);
});
test('additional insurer witnesses retain currency, missing-country, product symbol and bare-number boundaries',()=>{
 const {f,request}=identityFixture();request.financialPolicyIds=[...identityDiagnostic.financialPolicyIds];
 request.newStatementSource={...identityDiagnostic.newStatementSource};
 f.aseguradoras.push({id:'gyt',nombre:'SEGUROS G&T',pais:'GT'},{id:'unknown',nombre:'OTHER INSURER',pais:'GT'});
 f.polizas.push(
  {id:'vime_gtq',numero:'VIME-18154',aseguradoraId:'gyt',pais:'GT',moneda:'GTQ'},
  {id:'tlg_usd',numero:'TLG$-7529',aseguradoraId:'gyt',pais:'GT',moneda:'USD'},
  {id:'tlg_wrong_currency',numero:'TLG$-7529',aseguradoraId:'gyt',pais:'GT',moneda:'GTQ'},
  {id:'tlg_wrong_symbol',numero:'TLG-7529',aseguradoraId:'gyt',pais:'GT',moneda:'USD'},
  {id:'same_number_other_insurer',numero:'VIME-18154',aseguradoraId:'unknown',pais:'GT',moneda:'GTQ'},
  {id:'uni603_bare_country_missing',numero:'603',aseguradoraId:'uni',moneda:'GTQ'},
  {id:'uni603_other_product',numero:'AUTO-603',aseguradoraId:'uni',pais:'GT',moneda:'GTQ'});
 const found=identityDiagnostic.statementPolicyMatches(request,f),get=id=>found.find(x=>x.policy.id===id);
 assert.ok(get('vime_gtq'));assert.ok(get('tlg_usd'));
 assert.equal(get('tlg_usd').matches[0].policyCurrencyMatchesSource,true);
 assert.equal(get('tlg_wrong_currency').matches[0].policyCurrencyMatchesSource,false);
 assert.equal(get('tlg_wrong_currency').matches[0].sourceCurrency,'USD');
 assert.equal(get('tlg_wrong_symbol'),undefined);assert.equal(get('same_number_other_insurer'),undefined);
 assert.equal(get('uni603_other_product'),undefined);
 const bare=get('uni603_bare_country_missing');assert.ok(bare);
 assert.ok(bare.matches.every(x=>x.policyCountryMatchesSource===false&&x.numberRelations.numero==='BARE_NUMBER_UNVERIFIED'));
 assert.deepEqual(bare.matches.map(x=>x.sourceRequirement),['39460326','39460327']);
});
test('a paid historical Cobro with closed portfolio remains pending application during the expanded read-only census',async()=>{
 const {c,f,request}=identityFixture();request.financialPolicyIds=[...identityDiagnostic.financialPolicyIds];
 request.newStatementSource={...identityDiagnostic.newStatementSource};
 f.aseguradoras.push({id:'gyt',nombre:'SEGUROS G&T',pais:'GT'});
 f.polizas.push({id:'historical_gyt',numero:'VIME-18154',aseguradoraId:'gyt',pais:'GT',moneda:'GTQ',clienteId:'holder'});
 f.recibosEsperados=[{id:'historical_receipt',polizaId:'historical_gyt',pais:'GT',moneda:'GTQ',primaTotal:538.35,
  paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION',saldo:0,carteraActiva:false,numeroReciboFuente:'E-994147961'}];
 f.carteraPrimas=[{id:'historical_portfolio',reciboId:'historical_receipt',polizaId:'historical_gyt',pais:'GT',saldo:0,carteraActiva:false}];
 f.cobros=[{id:'historical_payment',reciboId:'historical_receipt',polizaId:'historical_gyt',pais:'GT',monto:538.35,
  fechaPago:'2026-10-01',paymentState:'PAID_DIRECT',applicationState:'PENDING_APPLICATION',
  paymentEvidenceType:'LEGACY_CENDOSO_FECHA_REAL_PAGADO',applicationEvidenceVerified:false,conciliado:false}];
 const state=isolatedStore(f),before=JSON.stringify([...state.entries]);
 const probe=await executeProtected(c,state,'preflight',{},originalMatcher,request);assert.equal(probe.exitCode,0,probe.errors.join('\n'));
 const d=probe.report.readonlyIdentityReadbacks[0].financial,t=d.targets.find(t=>t.policy.id==='historical_gyt');
 assert.equal(d.writes,0);assert.equal(t.counts.cobros,1);assert.equal(JSON.stringify([...state.entries]),before);
 const payment=t.records.find(r=>r.collection==='cobros');
 assert.equal(payment.states.applicationState,'PENDING_APPLICATION');assert.equal(payment.flags.conciliado,false);
 assert.equal(payment.flags.applicationEvidenceVerified,false);assert.match(payment.documentSha256,/^[a-f0-9]{64}$/);
 assert.equal(t.newStatementMatches[0].sourceRequirement,'E-994147961');
});
test('private diagnostics are preserved in the existing artifact report while eligibility-plan bytes remain untouched',()=>{
 const report={status:'BULK_SOURCE_CASE_READBACK_ONLY_NO_WRITES',readOnly:true,readyCount:0,writes:0,chunks:[]};
 const original=JSON.stringify(report),files=new Map([['/test/gi-i66-bulk-preflight.json',original],['/test/gi-i66-bulk-plan.json',original]]);
 const fakeFs={readFileSync:p=>{assert.equal(p,'/test/gi-i66-bulk-preflight.json');return Buffer.from(files.get(p));},
  writeFileSync:(p,t,o)=>{assert.equal(p,'/test/gi-i66-bulk-preflight.json');assert.equal(o.mode,0o600);files.set(p,t);}};
 const d={writes:0,diagnosticOnly:true,noEligibilityEffect:true},execution={sourceSha:'a'.repeat(40),runId:'123'};
 identityDiagnostic.appendEvidence(fakeFs,'/test',[d],execution);
 const out=JSON.parse(files.get('/test/gi-i66-bulk-preflight.json'));
 const {privateReadonlyIdentityReadbacks,...same}=out;assert.deepEqual(same,report);
 assert.equal(privateReadonlyIdentityReadbacks.originalSourceReportSha256,C.sha(original));
 assert.deepEqual(privateReadonlyIdentityReadbacks.execution,execution);
 assert.equal(files.get('/test/gi-i66-bulk-plan.json'),original);
 const committed=JSON.stringify({...report,status:'COMMITTED',writes:1});files.set('/test/gi-i66-bulk-preflight.json',committed);
 assert.throws(()=>identityDiagnostic.appendEvidence(fakeFs,'/test',[d],execution));
 assert.equal(files.get('/test/gi-i66-bulk-preflight.json'),committed);
 assert.throws(()=>identityDiagnostic.appendEvidence(fakeFs,'../elsewhere',[d],execution),/ROOT_REQUIRED/);
 // The normal 302-row owner emits this exact status when generic updates are
 // zero; a separate issued-identity preflight may still be eligible. Attaching
 // private diagnostics must not abort that owner's signed output transport.
 const normal={status:'BULK_SOURCE_NO_ELIGIBLE_ROWS_DIAGNOSTIC_HOLD',inputRows:302,
  readyCount:0,unchangedCount:214,exceptionCount:88,chunks:[],writes:0};
 const normalBytes=JSON.stringify(normal),planBytes=files.get('/test/gi-i66-bulk-plan.json');
 files.set('/test/gi-i66-bulk-preflight.json',normalBytes);
 identityDiagnostic.appendEvidence(fakeFs,'/test',[d],execution);
 const {privateReadonlyIdentityReadbacks:normalEvidence,...unchangedNormal}=JSON.parse(files.get('/test/gi-i66-bulk-preflight.json'));
 assert.deepEqual(unchangedNormal,normal);assert.equal(normalEvidence.originalSourceReportSha256,C.sha(normalBytes));
 assert.equal(files.get('/test/gi-i66-bulk-plan.json'),planBytes);
 for(const inconsistent of [{...normal,readyCount:1},{...normal,writes:1},{...normal,status:'COMMITTED'}]){
  const bytes=JSON.stringify(inconsistent);files.set('/test/gi-i66-bulk-preflight.json',bytes);
  assert.throws(()=>identityDiagnostic.appendEvidence(fakeFs,'/test',[d],execution));
  assert.equal(files.get('/test/gi-i66-bulk-preflight.json'),bytes);
  assert.equal(files.get('/test/gi-i66-bulk-plan.json'),planBytes);
 }
});
test('protected writer rejects a changed parent after preflight and a source requirement already in use',async()=>{
 const c=newCases()[0],state=isolatedStore(newFixture(c)),preflight=await executeProtected(c,state,'preflight');
 const holder=state.entries.get(state.base+'/data/clientes/items/holder');holder.data.unrelatedFreshChange=true;holder.version++;
 const before=JSON.stringify([...state.entries]);const changed=await executeProtected(c,state,'apply',{[c.policy]:preflight.report.results[0].beforeDigest});
 assert.equal(changed.exitCode,1);assert.ok(changed.report.results[0].reason.startsWith('TWO_CAS_PREIMAGE_CHANGED'));
 assert.equal(JSON.stringify([...state.entries]),before);
 const duplicateState=isolatedStore(newFixture(c));duplicateState.entries.set(duplicateState.base+'/data/recibosEsperados/items/used',
  {data:{numeroReciboFuente:c.schedule[0].requirement,polizaId:'another'},version:1});
 const duplicate=await executeProtected(c,duplicateState,'preflight');
 assert.equal(duplicate.report.results[0].reason,'ISSUER_REQUIREMENT_ALREADY_USED');assert.equal(duplicate.report.totals.writes,0);
});
test('4140843 cannot create a replacement when its observed existing edition is missing',async()=>{
 const c=newCases()[2],state=isolatedStore(newFixture(c)),preflight=await executeProtected(c,state,'preflight');
 assert.equal(preflight.report.results[0].reason,'EXISTING_POLICY_HOLDER_INSURER_NOT_UNIQUE');
 assert.equal(preflight.report.totals.eligible,0);assert.equal(preflight.report.totals.writes,0);
});
test('new compatible policy with missing country after preflight cannot become a hidden duplicate',async()=>{
 const c=newCases()[0],state=isolatedStore(newFixture(c)),preflight=await executeProtected(c,state,'preflight');
 state.entries.set(state.base+'/data/polizas/items/orphan-country',{data:{numeroPoliza:c.policy,
  vigenciaInicio:c.termStart,vigenciaFin:c.termEnd,clienteId:'holder',aseguradoraId:'rob'},version:1});
 const before=JSON.stringify([...state.entries]);
 const applied=await executeProtected(c,state,'apply',{[c.policy]:preflight.report.results[0].beforeDigest});
 assert.equal(applied.exitCode,1);assert.equal(applied.report.results[0].reason,'COMPATIBLE_POLICY_COUNTRY_UNVERIFIED');
 assert.equal(applied.report.totals.writes,0);assert.equal(JSON.stringify([...state.entries]),before);
});
test('original two cases retain their operation IDs and successful zero-write replay/readback',async()=>{
 for(const c of C.source.cases){
  const state=isolatedStore(fixtures()),preflight=await executeProtected(c,state,'preflight',{},matcher);
  const applied=await executeProtected(c,state,'apply',{[c.policy]:preflight.report.results[0].beforeDigest},matcher);
  assert.equal(applied.exitCode,0,applied.errors.join('\n'));assert.equal(applied.report.results[0].readback.receipts,12);
  const before=JSON.stringify([...state.entries]);
  const replay=await executeProtected(c,state,'apply',{},matcher),readback=await executeProtected(c,state,'readback',{},matcher);
  assert.equal(replay.exitCode,0,replay.errors.join('\n'));assert.equal(replay.report.totals.alreadyApplied,1);
  assert.equal(readback.exitCode,0,readback.errors.join('\n'));assert.equal(readback.report.totals.alreadyApplied,1);
  assert.equal(JSON.stringify([...state.entries]),before);
 }
});
test('a committed transaction followed by failed readback retains its actual write count and reports HOLD',async()=>{
 const c=newCases()[0],state=isolatedStore(newFixture(c)),preflight=await executeProtected(c,state,'preflight');
 const run=state.db.runTransaction;
 state.db.runTransaction=async(fn,options)=>{
  const result=await run(fn,options);
  if(!options?.readOnly&&result.result?.status==='COMMITTED'){
   const created=[...state.entries].find(([key])=>key.includes('/recibosEsperados/items/'))[1];
   created.data.monto+=1;created.version++;
  }
  return result;
 };
 const applied=await executeProtected(c,state,'apply',{[c.policy]:preflight.report.results[0].beforeDigest});
 assert.equal(applied.exitCode,1);assert.equal(applied.report.results[0].status,'COMMITTED_READBACK_HOLD');
 assert.equal(applied.report.totals.writes,29);assert.equal(applied.report.totals.committed,0);
 assert.equal(applied.report.totals.committedWithReadbackHold,1);
 assert.ok(applied.errors.some(x=>x.includes('I66_TWO_COMMITTED_READBACK_INCOMPLETE')));
});

function existingFixture(){
 const c=newCases()[2],t=C.existingIdentityTarget,f=newFixture(c);
 f.polizas.push({id:t.policyId,numero:t.storedNumber,pais:'GT',moneda:'GTQ',clienteId:'holder',
  aseguradoraId:'rob',asesorId:'adv',vigenciaInicio:c.termStart,vigenciaFin:c.termEnd,estado:'Vigente',
  frecuencia:'Pago Único',primaTotal:3747.40,primaNeta:2781.80,originalPrivateField:'PRESERVE_PRIVATE'});
 f.polizas.push({id:'prior-truncated',numero:t.storedNumber,pais:'GT',clienteId:'holder',aseguradoraId:'rob',
  asesorId:'adv',vigenciaInicio:'2025-09-10',vigenciaFin:c.termStart,estado:'Renovada'});
 f.vehiculos.push({id:t.vehicleId,polizaId:t.policyId,clienteId:'holder',pais:'GT',placa:originalPlate(c)});
 f.vehiculos.push({id:'prior-risk',polizaId:'prior-truncated',clienteId:'holder',pais:'GT',placa:originalPlate(c)});
 const common={polizaId:t.policyId,clienteId:'holder',aseguradoraId:'rob',asesorId:'adv',moneda:'GTQ',
  primaTotal:3747.40,numeroReciboFuente:'1/1',serie:'1/1',polizaNumero:t.storedNumber,
  fechaLimite:t.operationalDate,estadoOperativo:'futuro_pendiente',exigibilidad:'futura',sourceRef:null,
  sourceRefsI65:[{unmodifiedSource:'ORIGINAL_SOURCE_REFERENCE'}]};
 f.recibosEsperados=[{...common,id:t.receiptId,primaNeta:2781.80,fechaPagoReportada:''}];
 f.carteraPrimas=[{...common,id:t.portfolioId,reciboId:t.receiptId}];
 return {c,t,f};
}
test('4140843 corrects exactly three existing records, preserves operational date and 1/1, no new risk/obligation/payment',async()=>{
 const {c,t,f}=existingFixture(),state=isolatedStore(f),before=JSON.stringify([...state.entries]);
 const pre=await executeProtected(c,state,'preflight');assert.equal(pre.exitCode,0,pre.errors.join('\n'));
 assert.equal(pre.report.totals.eligible,1,JSON.stringify(pre.report));assert.equal(JSON.stringify([...state.entries]),before);
 assert.equal(pre.report.results[0].updates,3);assert.equal(pre.report.results[0].additions,0);
 const oldParents=new Map([...state.entries].filter(([key])=>!key.includes('/recibosEsperados/')&&!key.includes('/carteraPrimas/')&&
  !key.endsWith('/polizas/items/'+t.policyId)).map(([key,value])=>[key,state.clone(value.data)]));
 const applied=await executeProtected(c,state,'apply',{[c.policy]:pre.report.results[0].beforeDigest});
 assert.equal(applied.exitCode,0,JSON.stringify({report:applied.report,errors:applied.errors}));
 assert.equal(applied.report.totals.committed,1);assert.equal(applied.report.totals.writes,4);
 const read=applied.report.results[0].readback;assert.equal(read.receiptsCreated,0);assert.equal(read.payments,0);
 assert.equal(read.preservedGrossCents,374740);assert.equal(read.priorPoliciesPreserved,1);
 for(const [key,data] of oldParents)assert.deepEqual(state.entries.get(key).data,data);
 const policy=state.entries.get(state.base+'/data/polizas/items/'+t.policyId).data;
 assert.equal(policy.numero,c.policy);assert.equal(policy.vehiculoId,t.vehicleId);
 assert.equal(policy.originalPrivateField,'PRESERVE_PRIVATE');assert.equal(policy.renuevaDe,undefined);
 for(const [collection,id] of [['recibosEsperados',t.receiptId],['carteraPrimas',t.portfolioId]]){
  const r=state.entries.get(state.base+'/data/'+collection+'/items/'+id).data;
  assert.equal(r.numeroReciboFuente,'5574011');assert.equal(r.serie,'1/1');assert.equal(r.fechaLimite,'2026-09-25');
  assert.equal(r.fechaVencimientoContractual,'2026-10-10');assert.equal(r.primaTotal,3747.40);
  assert.deepEqual(r.sourceRefsI65,[{unmodifiedSource:'ORIGINAL_SOURCE_REFERENCE'}]);
  assert.equal(r.issuedIdentityCorrection.previousReceiptReference,'1/1');
 }
 const committed=JSON.stringify([...state.entries]),replay=await executeProtected(c,state,'apply',{}),readback=await executeProtected(c,state,'readback');
 assert.equal(replay.exitCode,0,replay.errors.join('\n'));assert.equal(readback.exitCode,0,readback.errors.join('\n'));
 assert.equal(replay.report.totals.alreadyApplied,1);assert.equal(replay.report.totals.writes,0);
 assert.equal(JSON.stringify([...state.entries]),committed);assert.equal([...state.entries.keys()].filter(k=>k.includes('/cobros/items/')).length,0);
});
test('4140843 rejects mismatched identity, source, financial aliases and every payment signal',async()=>{
 const changes=[
  f=>{f.polizas[0].numeroPoliza='91-9999999';},f=>{f.polizas[0].moneda='USD';},
  f=>{f.polizas[0].vigenciaFin='2028-09-10';},f=>{f.polizas[0].clienteId='other';},
  f=>{f.polizas[0].asesorId='other';},f=>{f.polizas[0].primaNeta=2781.81;},
  f=>{f.polizas[0].vehiculoId='other';},f=>{f.vehiculos[0].vin='CONTRADICTS_ORIGINAL';},
  f=>{f.vehiculos[0].placaFuente='OTHER';},f=>{f.recibosEsperados[0].montoTotal=3747.41;},
  f=>{f.recibosEsperados[0].numeroReciboFuente='5574012';},f=>{f.recibosEsperados[0].serie='2/2';},
  f=>{f.recibosEsperados[0].numeroReciboAseguradora='5574012';},f=>{f.carteraPrimas[0].conciliado='true';},
  f=>{f.recibosEsperados[0].fechaVencimientoContractual='2026-09-25';},
  f=>{f.carteraPrimas[0].reciboId='another';},f=>{f.carteraPrimas[0].policyId='another';},
  ...['fechaPago','fechaPagoReportada','cobroId','paymentState','applicationState','directOrInferred','reportado']
   .flatMap(key=>['recibosEsperados','carteraPrimas'].map(collection=>f=>{f[collection][0][key]='CONTRADICTORY';})),
  ...['conciliado','conciliadoPago','inferredPaid','reportedPaid','confirmado']
   .flatMap(key=>['recibosEsperados','carteraPrimas'].map(collection=>f=>{f[collection][0][key]=true;}))
 ];
 for(const change of changes){const {c,f}=existingFixture();change(f);const state=isolatedStore(f),before=JSON.stringify([...state.entries]);
  const pre=await executeProtected(c,state,'preflight');assert.equal(pre.report.totals.eligible,0,change.toString());
  assert.equal(pre.report.totals.writes,0);assert.equal(JSON.stringify([...state.entries]),before);}
});
test('4140843 CAS rechecks all parents, orphans, requirements and payment links before any update',async()=>{
 const changes=[
  ({state,t})=>{const r=state.entries.get(state.base+'/data/recibosEsperados/items/'+t.receiptId);r.data.comment='changed';r.version++;},
  ({state})=>state.entries.set(state.base+'/data/polizas/items/country-missing',{data:{numero:'91-4140843',vigenciaInicio:'2026-09-10',vigenciaFin:'2027-09-10'},version:1}),
  ({state,t})=>state.entries.set(state.base+'/data/cobros/items/new-payment',{data:{reciboId:t.receiptId,polizaId:t.policyId,monto:3747.40},version:1}),
  ({state})=>state.entries.set(state.base+'/data/recibosEsperados/items/used-requirement',{data:{numeroReciboFuente:'5574011',polizaId:'other'},version:1}),
  ({state})=>state.entries.set(state.base+'/data/cobros/items/used-payment-reference',{data:{referenciaCobro:'5574011'},version:1}),
  ({state})=>state.entries.set(state.base+'/data/recibosEsperados/items/orphan',{data:{fechaLimite:'2026-10-10',primaTotal:3747.40},version:1})
 ];
 for(const change of changes){const {c,t,f}=existingFixture(),state=isolatedStore(f),pre=await executeProtected(c,state,'preflight');
  assert.equal(pre.report.totals.eligible,1);change({state,t});const before=JSON.stringify([...state.entries]);
  const apply=await executeProtected(c,state,'apply',{[c.policy]:pre.report.results[0].beforeDigest});
  assert.equal(apply.exitCode,1);assert.equal(apply.report.totals.writes,0);assert.equal(JSON.stringify([...state.entries]),before);}
});
test('4140843 independent readback rejects tampering or a newly competing requirement',async()=>{
 for(const change of ['postimage','audit','duplicate']){
  const {c,t,f}=existingFixture(),state=isolatedStore(f),pre=await executeProtected(c,state,'preflight');
  const apply=await executeProtected(c,state,'apply',{[c.policy]:pre.report.results[0].beforeDigest});assert.equal(apply.exitCode,0);
  if(change==='postimage')state.entries.get(state.base+'/data/carteraPrimas/items/'+t.portfolioId).data.primaTotal+=1;
  if(change==='audit')state.entries.get(state.base+'/operationalRequests/'+C.existingOperation(c)).data.sourcePdfSha256='0'.repeat(64);
  if(change==='duplicate')state.entries.set(state.base+'/data/recibosEsperados/items/duplicate',{data:{numeroReciboFuente:'5574011'},version:1});
  const before=JSON.stringify([...state.entries]),readback=await executeProtected(c,state,'readback');
  assert.equal(readback.exitCode,1);assert.equal(readback.report.totals.writes,0);assert.equal(JSON.stringify([...state.entries]),before);
 }
});
