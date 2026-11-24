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
async function executeProtected(c,state,mode,expected={},identityMatcher=originalMatcher){
 const logs=[],errors=[],outputs=[],env={GITHUB_REPOSITORY:'paulaosoriof86/orbit360-core',
  GITHUB_REF:'refs/heads/recovery/fase-a-clean-20260831',GCLOUD_PROJECT:C.project,
  GI_I66_BULK_PROTECTED_ENV:'gravicentra-live-data-writes',GITHUB_RUN_ID:'ISOLATED_TEST',GITHUB_OUTPUT:'/test/output',
  GI_I66_TWO_EXPECTED_B64:Buffer.from(JSON.stringify(expected)).toString('base64url')};
 const processMock={argv:['node','writer',mode],env,exitCode:0};
 const firestore=Object.assign(()=>state.db,{FieldValue:{serverTimestamp:()=>({seconds:1,nanoseconds:0})}});
 const modules={
  'firebase-admin':{initializeApp:()=>{},credential:{applicationDefault:()=>({})},firestore},
  'google-auth-library':{GoogleAuth:class{async getClient(){return {getRequestHeaders:async()=>({})};}}},
  './gravicentra-i66-roble-two-issued-plan.cjs':{...C,cases:[c],resolve:(c,a)=>C.resolve(c,a,identityMatcher),originals:{load:async()=>c}},
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
test('external issued renewal uses one obligation and the canonical holder advisor without inventing a predecessor',async()=>{
 const c=newCases()[2],state=isolatedStore(newFixture(c)),preflight=await executeProtected(c,state,'preflight');
 assert.equal(preflight.report.results[0].expectedReceipts,1);assert.equal(preflight.report.results[0].updates,0);
 const applied=await executeProtected(c,state,'apply',{[c.policy]:preflight.report.results[0].beforeDigest});
 assert.equal(applied.exitCode,0,applied.errors.join('\n'));
 assert.equal(applied.report.results[0].readback.externalRenewal,1);assert.equal(applied.report.totals.writes,6);
 assert.equal(applied.report.results[0].readback.receipts,1);assert.equal(applied.report.results[0].readback.payments,0);
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
