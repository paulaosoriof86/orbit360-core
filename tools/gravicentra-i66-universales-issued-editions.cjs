'use strict';
// Documentary create discriminator inside the existing source-bulk owner.
// No separate transport, environment, payment owner, or vehicle mutation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {normalizeSource,sourceAliases,moneyCents}=require('./gravicentra-i66-source-bulk-plan.cjs');
const KIND='ISSUED_MEDICAL_EDITION_CREATE',TENANT='alianzas-soluciones',PROJECT='ays-orbit-360-lab';
const FILE='artifacts/orbit360-recovery/source-batches/I6_6_UNIVERSALES_TWO_ISSUED_MEDICAL_22_20261124.json';
const PIN='84265751defc79ce50523da0e43205d1f773f2533c748ff9a1c6a3fba308ccec';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const str=x=>String(x??'').trim(),norm=x=>str(x).normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const stable=x=>x&&typeof x==='object'?(typeof x.toJSON==='function'?stable(x.toJSON()):Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,stable(x[k])]))):x;
const hash=x=>sha(JSON.stringify(stable(x)));
const stop=reason=>({status:'HOLD',reason,writes:0});
const items=(db,name)=>db.collection('tenants').doc(TENANT).collection('data').doc(name).collection('items');
const audit=(db,id)=>db.collection('tenants').doc(TENANT).collection('operationalRequests').doc(id);
function load(){
 const bytes=fs.readFileSync(path.join(__dirname,'..',FILE));assert.equal(sha(bytes),PIN,'MEDICAL_DOCUMENTARY_MANIFEST_DRIFT');
 const m=JSON.parse(bytes),authority=fs.readFileSync(path.join(__dirname,'..',m.authorityPath));
 assert.equal(crypto.createHash('sha1').update('blob '+authority.length+'\0').update(authority).digest('hex'),m.authorityBlob);
 assert.equal(m.schema,'GI_I66_UNIVERSALES_TWO_ISSUED_MEDICAL_22_V1');assert.equal(m.cases.length,2);
 assert.deepEqual(m.cases.map(c=>c.policy).sort(),['04-05-01-12289-4','04-05-01-15590-0']);
 assert.equal(m.cases.reduce((n,c)=>n+c.pendingRows.length,0),22);
 assert.equal(m.cases.reduce((n,c)=>n+c.pendingGrossCents,0),1122994);
 const sourceBytes=fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json'));
 assert.equal(sha(sourceBytes),m.source302Sha256);const source=JSON.parse(sourceBytes);
 for(const c of m.cases){
  assert.equal(c.riskKind,'MEDICAL');assert.equal(c.monthlyInstallments,12);assert.equal(c.coverageActiveInferred,false);
  assert.equal(c.header.netCents+c.header.expensesCents+c.header.ivaCents,c.header.grossCents);
  assert.equal(c.pendingRows.reduce((n,r)=>n+r.grossCents,0),c.pendingGrossCents);
  for(const r of c.pendingRows){const found=source.rows.filter(x=>x.caseId===r.caseId);assert.equal(found.length,1);
   assert.deepEqual([found[0].policy,found[0].requirement,found[0].due,found[0].grossCents,found[0].state],
    [c.policy,r.requirement,r.due,r.grossCents,'PENDING']);}
  if(c.policy==='04-05-01-12289-4'){
   assert.equal(c.storedPolicyState,'SIN COBERTURA');assert.equal(c.coverageStatusLiteral,'SIN COBERTURA');
   assert.equal(c.possibleCancellationDate,'2026-11-30');assert.equal(c.cancellationExecuted,false);
  }else assert.equal(c.storedPolicyState,'Emitida');
 }
 return m;
}
const manifest=load();
function numberRelation(value,c){
 const v=str(value),parts=c.policy.split('-'),serial=Number(parts[3]);
 let m=/^(\d{2})[ -]+(\d{2})[ -]+(\d{2})[ -]+(\d{1,6})[ -]+(\d+)$/.exec(v);
 if(m&&m.slice(1,4).join('-')==='04-05-01'&&Number(m[4])===serial)return Number(m[5])===Number(parts[4])?'EXACT':'OTHER_ENDORSEMENT';
 m=/^(\d{1,6})[ -]+(\d+)$/.exec(v);
 if(m&&Number(m[1])===serial)return Number(m[2])===Number(parts[4])?'EXACT_SHORT':'OTHER_ENDORSEMENT';
 if(/^\d{1,6}$/.test(v)&&Number(v)===serial)return 'BARE_UNVERIFIED';
 return '';
}
const numberFields=['numero','numeroPoliza','polizaNumero'];
const holderMatches=(c,row)=>[row.nombre,row.nombreCompleto,row.razonSocial].some(v=>str(v)&&sha(c.sourcePdfSha256+'|'+norm(v))===c.holderWitness);
function operation(c,clientId,insurerId){return 'gi_i66_medical_'+sha([TENANT,PIN,c.policy,c.termStart,c.termEnd,clientId,insurerId].join('|')).slice(0,28);}
function targets(c,op){const pid='pol_'+op;return [['polizas',pid],...c.pendingRows.flatMap(r=>{
 const id='rec_'+op+'_'+r.requirement;return [['recibosEsperados',id],['carteraPrimas','car_'+id]];}),['actividades','act_'+op]];}
const storedTargets=rows=>rows.map(([collection,id])=>({collection,id}));
const storedCreates=rows=>rows.map(([collection,data])=>({collection,data}));
function rollback(c,identity){return {deleteCreatedTargets:storedTargets(targets(c,identity.operation)),prior:identity.prior?{
 id:identity.prior.id,renovadaPorWasPresent:Object.hasOwn(identity.prior,'renovadaPor'),
 renovadaPor:identity.prior.renovadaPor??null}:null};}
async function readSnapshot(db,tx){
 const caps={polizas:5000,clientes:1000,aseguradoras:1000,asesores:400,recibosEsperados:15000,carteraPrimas:15000,cobros:15000,actividades:15000};
 const out={complete:true};
 await Promise.all(Object.entries(caps).map(async([name,max])=>{
  const s=await tx.get(items(db,name).limit(max+1));assert.ok(s.size<=max,'MEDICAL_COMPLETE_CENSUS_TRUNCATED');
  out[name]=s.docs.map(d=>({...d.data(),id:d.id}));
 }));return out;
}
function assess(c,s){
 if(!s?.complete||!['polizas','clientes','aseguradoras','asesores','recibosEsperados','carteraPrimas','cobros','actividades']
  .every(k=>Array.isArray(s[k])))return stop('MEDICAL_COMPLETE_CENSUS_REQUIRED');
 const clients=s.clientes.filter(p=>p.pais==='GT'&&holderMatches(c,p));
 const insurers=s.aseguradoras.filter(p=>p.pais==='GT'&&p.activo!==false&&/universales/i.test(str(p.nombre||p.razonSocial)));
 if(clients.length!==1||insurers.length!==1)return stop('MEDICAL_CLIENT_INSURER_NOT_UNIQUE');
 const client=clients[0],insurer=insurers[0],advisors=s.asesores.filter(a=>a.id===client.asesorId&&a.activo!==false&&
  (!str(a.pais)||a.pais==='GT')&&
  (!Object.hasOwn(a,'paises')||Array.isArray(a.paises)&&a.paises.includes('GT')));
 if(advisors.length!==1)return stop('MEDICAL_ADVISOR_COUNTRY_UNVERIFIED');
 const advisor=advisors[0],op=operation(c,client.id,insurer.id),ids=targets(c,op);
 if([client,insurer,advisor].some(p=>str(p.tenantId)&&p.tenantId!==TENANT))return stop('MEDICAL_PARENT_TENANT_CONFLICT');
 const family=s.polizas.filter(p=>numberFields.some(k=>numberRelation(p[k],c))||p.documentRef===c.sourcePdfId||p.issuerDocumentSha256===c.sourcePdfSha256);
 if(family.some(p=>!['GT','CO'].includes(p.pais)))return stop('MEDICAL_POLICY_COUNTRY_UNVERIFIED');
 if(family.some(p=>p.pais==='GT'&&(!str(p.vigenciaFin)||p.vigenciaFin>=c.termStart)))return stop('MEDICAL_CURRENT_OR_COMPETING_EDITION_EXISTS');
 const prior=c.expectedPredecessorId?s.polizas.find(p=>p.id===c.expectedPredecessorId):null;
 if(c.expectedPredecessorId){
  if(!prior||prior.pais!=='GT'||prior.moneda!=='GTQ'||str(prior.tenantId)&&prior.tenantId!==TENANT||
   prior.clienteId!==client.id||prior.aseguradoraId!==insurer.id||
   prior.asesorId!==advisor.id||prior.vigenciaInicio!==c.expectedPredecessor.termStart||prior.vigenciaFin!==c.expectedPredecessor.termEnd||
   prior.estado!==c.expectedPredecessor.policyStatePreserved||norm(prior.numero)!==norm(c.expectedPredecessor.number)||
   numberFields.some(k=>str(prior[k])&&norm(prior[k])!==norm(c.expectedPredecessor.number))||str(prior.renovadaPor)||
   s.polizas.some(p=>p.renuevaDe===prior.id))return stop('MEDICAL_PREDECESSOR_IDENTITY_OR_LINK_CONFLICT');
 }else if(family.length)return stop('MEDICAL_NEW_POLICY_HAS_OTHER_NUMBER_EDITION');
 const sourceRefs=new Set(c.pendingRows.map(r=>r.requirement)),sourceCases=new Set(c.pendingRows.map(r=>r.caseId));
 const sourceDates=new Set(c.pendingRows.map(r=>r.due)),sourceAmounts=new Set(c.pendingRows.map(r=>r.grossCents));
 const policies=new Map(s.polizas.map(p=>[p.id,p])),receipts=new Map(s.recibosEsperados.map(r=>[r.id,r]));
 for(const collection of ['recibosEsperados','carteraPrimas','cobros'])for(const r of s[collection]){
  if([...sourceAliases,'numeroRecibo','referenciaAseguradora'].some(k=>sourceRefs.has(str(r[k])))||
   ['sourceId','sourceRef','evidenceId','sourceCaseId'].some(k=>sourceCases.has(str(r[k]))))return stop('MEDICAL_REQUIREMENT_ALREADY_USED');
  const parents=[r.polizaId,r.policyId].map(str).filter(Boolean),linked=[r.reciboId,r.receiptId,r.reciboEsperadoId].map(str).filter(Boolean);
  const inherited=linked.flatMap(id=>{const x=receipts.get(id);return x?[x.polizaId,x.policyId].map(str).filter(Boolean):[];});
  const orphan=![...parents,...inherited].length||[...parents,...inherited].some(id=>!policies.has(id));
  const relations=['polizaNumero','numeroPoliza','policyNumber','policyNumberSource','numeroPolizaFuente'].map(k=>numberRelation(r[k],c));
  const dates=['fechaVencimientoContractual','fechaVencimiento','vence','fechaLimite','periodoInicioFuente'].map(k=>str(r[k])).filter(Boolean);
  const dated=dates.some(v=>sourceDates.has(v));
  const amount=['primaTotal','monto','montoTotal','grossAmount','amount'].some(k=>sourceAmounts.has(moneyCents(r[k])));
  if(relations.some(x=>x==='EXACT'||x==='EXACT_SHORT')||relations.includes('BARE_UNVERIFIED')&&
   (orphan||!dates.length||dates.some(v=>v>=c.termStart)))return stop('MEDICAL_EXISTING_FINANCIAL_NUMBER_CONFLICT');
  if(orphan&&dated&&amount)return stop('MEDICAL_ORPHAN_FINANCIAL_IDENTITY');
 }
 if(ids.some(([col,id])=>s[col].some(r=>r.id===id)))return stop('MEDICAL_CANONICAL_TARGET_OCCUPIED');
 const before={manifestSha256:PIN,originalSha256:c.sourcePdfSha256,statementSha256:manifest.currentStatement.sha256,
  holderHash:hash(client),insurerHash:hash(insurer),advisorHash:hash(advisor),priorHash:prior?hash(prior):null,
  targetIds:storedTargets(ids),targetsAbsent:true};
 return {status:'ELIGIBLE',operation:op,client,insurer,advisor,prior,before,beforeHash:hash(before)};
}
function mutations(c,identity,at){
 assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(at)&&Number.isFinite(Date.parse(at)),'MEDICAL_COMMIT_DATE_INVALID');
 assert.equal(identity.status,'ELIGIBLE');const {operation:op,client,insurer,advisor,prior}=identity,pid='pol_'+op;
 const common={tenantId:TENANT,pais:'GT',moneda:'GTQ',clienteId:client.id,aseguradoraId:insurer.id,asesorId:advisor.id,
  operationId:op,sourceDocumentRef:c.sourcePdfId,issuerDocumentSha256:c.sourcePdfSha256,createdAt:at,updatedAt:at};
 const document={fileId:c.sourcePdfId,documentRef:c.sourcePdfId,sha256:c.sourcePdfSha256,
  driveUrl:'https://drive.google.com/open?id='+c.sourcePdfId,nombre:'Póliza emitida de Gastos Médicos',polizaId:pid,clienteId:client.id};
 const sourceEvidence={manifestSha256:PIN,authorityBlob:manifest.authorityBlob,statementAsOf:manifest.currentStatement.asOf,
  statementDriveId:manifest.currentStatement.driveFileId,statementSha256:manifest.currentStatement.sha256,
  originalPremiumPreserved:true,pendingAmountsAreSeparateSourceFacts:true,paymentInference:false};
 const policy={...common,id:pid,numero:c.policy,numeroPoliza:c.policy,polizaNumero:c.policy,estado:c.storedPolicyState,
  ramo:c.branchLabel,producto:c.product,tipoRiesgo:c.riskKind,vigenciaInicio:c.termStart,vigenciaFin:c.termEnd,
  vigenciaFinConvention:c.termEndConvention,fechaEmision:c.issuedDate,frecuencia:'Mensual',cuotas:12,
  primaNeta:c.header.netCents/100,gastosEmision:c.header.expensesCents/100,iva:c.header.ivaCents/100,
  primaTotal:c.header.grossCents/100,prima:c.header.grossCents/100,primaTotalDocumentalOriginal:c.header.grossCents/100,
  saldoPendienteDocumental:c.pendingGrossCents/100,fechaCorteSaldoDocumental:manifest.currentStatement.asOf,
  maximoVitalicio:c.maximumLifetimeCents/100,documentRef:c.sourcePdfId,documentos:[document],adjuntos:[document],
  sourceEvidence,coverageActiveInferred:false,issuerOperation:c.operation,
  ...(prior?{renuevaDe:prior.id}:{}),historial:[{fecha:at.slice(0,10),tipo:'documento_emitido',operationId:op,
   t:'Póliza emitida registrada',d:'Documento original y requerimientos pendientes de la aseguradora'}]};
 if(c.coverageStatusLiteral)Object.assign(policy,{estadoCobertura:c.coverageStatusLiteral,
  advertenciaCoberturaFuente:{literal:c.coverageStatusLiteral,asOf:manifest.coverageWarning.asOf,
   documentRef:manifest.coverageWarning.driveFileId,sha256:manifest.coverageWarning.sha256,
   fechaPosibleAnulacion:c.possibleCancellationDate,anulacionEjecutada:false}});
 const creates=[['polizas',policy]];
 for(const r of c.pendingRows){
  const id='rec_'+op+'_'+r.requirement,late=r.due<at.slice(0,10);
  const receipt={...common,id,polizaId:pid,polizaNumero:c.policy,secuencia:r.sequence,numeroCuota:r.sequence,
   cuota:r.sequence+'/12',serie:r.sequence+'/12',numeroReciboFuente:r.requirement,
   fechaVencimientoContractual:r.due,fechaVencimiento:r.due,vence:r.due,fechaLimite:r.due,
   primaTotal:r.grossCents/100,monto:r.grossCents/100,montoTotal:r.grossCents/100,
   estado:late?'Vencido':'Pendiente',estadoOperativo:late?'pendiente_vencido':'futuro_pendiente',
   exigibilidad:late?'exigible':'futura',carteraActiva:true,conciliado:false,fechaPago:null,
   sourceCaseId:r.caseId,sourceEvidence,documentRef:c.sourcePdfId,receiptKey:TENANT+'|'+pid+'|'+r.requirement};
  creates.push(['recibosEsperados',receipt],['carteraPrimas',{...receipt,id:'car_'+id,reciboId:id,
   carteraTipo:'cartera_activa',estadoConciliacionSaldo:'pendiente_conciliacion',saldoConciliado:false}]);
 }
 creates.push(['actividades',{...common,id:'act_'+op,polizaId:pid,tipo:prior?'renovacion':'poliza_emitida',
  fecha:at.slice(0,10),titulo:'Póliza de Gastos Médicos emitida registrada',
  detalle:c.pendingRows.length+' requerimientos pendientes documentados',documentRef:c.sourcePdfId}]);
 const priorPatch=prior?{renovadaPor:pid}:null;
 assert.equal(creates.length,c.pendingRows.length*2+2);assert.ok(creates.every(([k])=>!['vehiculos','cobros'].includes(k)));
 return {creates,priorPatch,technicalWrites:creates.length+(prior?1:0)+1};
}
async function verifySources(c){
 const {GoogleAuth}=require('google-auth-library');const headers=await(await new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']}).getClient()).getRequestHeaders();
 const refs=[{driveFileId:c.sourcePdfId,sha256:c.sourcePdfSha256},manifest.currentStatement,
  ...(c.coverageStatusLiteral?[manifest.coverageWarning]:[])];
 for(const r of refs){const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(r.driveFileId)+'?alt=media&supportsAllDrives=true',
   {headers,signal:AbortSignal.timeout(25000)});assert.ok(response.ok,'MEDICAL_PINNED_DOCUMENT_UNAVAILABLE');
  const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length<5000000&&bytes.subarray(0,5).toString()==='%PDF-');
  assert.equal(sha(bytes),r.sha256,'MEDICAL_PINNED_DOCUMENT_BYTES_CHANGED');}
 return true;
}
async function enrichPlan(db,source,base,verifyDocument=verifySources){
 if(source.bytesSha256!==manifest.source302Sha256)return base;
 let plan={...base,chunks:[...base.chunks],exceptions:[...base.exceptions],documentaryDiagnostics:[]};
 for(const c of manifest.cases){
  const selected=c.pendingRows.map(r=>plan.exceptions.find(x=>x.caseId===r.caseId));
  if(!selected.every(e=>e?.code==='POLICY_EDITION_MISSING'))continue;
  let decision;
  try{assert.equal(await verifyDocument(c),true,'MEDICAL_DOCUMENT_BYTES_NOT_VERIFIED');
   decision=await db.runTransaction(async tx=>assess(c,await readSnapshot(db,tx)),{readOnly:true});
  }catch(error){decision=stop(/^[A-Z0-9_]+$/.test(error.message)?error.message:'MEDICAL_DOCUMENT_OR_CENSUS_HOLD');}
  if(decision.status!=='ELIGIBLE'){plan.documentaryDiagnostics.push({policy:c.policy,...decision});continue;}
  const rows=c.pendingRows.map(r=>({...normalizeSource(source.data.rows.find(x=>x.caseId===r.caseId)),operationKind:KIND}));
  const chunk={operationKind:KIND,policy:c.policy,operation:decision.operation,documentaryManifestSha256:PIN,
   before:decision.before,beforeHash:decision.beforeHash,rows,count:rows.length,sequence:plan.chunks.length+1};
  chunk.sourcePlanSha256=hash(chunk);plan.chunks.push(chunk);
  const ids=new Set(rows.map(r=>r.caseId));plan.exceptions=plan.exceptions.filter(e=>!ids.has(e.caseId));
  plan.readyCount+=rows.length;plan.exceptionCount-=rows.length;
  plan.documentaryDiagnostics.push({policy:c.policy,status:'ELIGIBLE',beforeHash:decision.beforeHash,
   creates:rows.length*2+2,priorUpdates:decision.prior?1:0,auditCreates:1,receipts:rows.length,
   pendingGrossCents:c.pendingGrossCents,originalGrossCents:c.header.grossCents,policyState:c.storedPolicyState,
   vehicles:0,payments:0,writes:0});
 }
 assert.equal(plan.readyCount+plan.unchangedCount+plan.exceptionCount,plan.inputRows);return plan;
}
async function verifyInside(tx,db,c,a){
 assert.ok(a.exists,'MEDICAL_AUDIT_MISSING');const data=a.data();
 assert.equal(data.schema,'GI_I66_DOCUMENTARY_MEDICAL_CREATE_AUDIT_V1');assert.equal(data.status,'COMMITTED');
 assert.equal(data.manifestSha256,PIN);assert.equal(data.policy,c.policy);assert.equal(data.originalSha256,c.sourcePdfSha256);
 assert.equal(data.source302Sha256,manifest.source302Sha256);assert.equal(data.operation,operation(c,data.parents.client.id,data.parents.insurer.id));
 const snapshot=await readSnapshot(db,tx),expectedIds=targets(c,data.operation);
 assert.equal(data.creates.length,expectedIds.length);assert.equal(data.beforeHash,hash(data.before));
 // Preserve Firestore Timestamp instances while removing only our own rows
 // from the verification snapshot. A structured clone loses their toJSON.
 const old={...snapshot};
 for(const [collection,id] of expectedIds){
  const found=snapshot[collection].filter(r=>r.id===id);assert.equal(found.length,1,'MEDICAL_POSTIMAGE_MISSING');
  old[collection]=old[collection].filter(r=>r.id!==id);
 }
 if(data.parents.prior){
  const p=snapshot.polizas.find(p=>p.id===data.parents.prior.id);assert.ok(p);
  assert.equal(hash(p),hash({...data.parents.prior,...data.priorPatch}),'MEDICAL_PREDECESSOR_POSTIMAGE_DRIFT');
  old.polizas=old.polizas.map(p=>p.id===data.parents.prior.id?data.parents.prior:p);
 }
 const identity=assess(c,old);assert.equal(identity.status,'ELIGIBLE','MEDICAL_READBACK_IDENTITY_OR_DUPLICATE_HOLD');
 assert.equal(identity.beforeHash,data.beforeHash);assert.equal(identity.operation,data.operation);
 const projected=mutations(c,identity,data.createdAt);
 assert.equal(hash(storedCreates(projected.creates)),hash(data.creates));assert.equal(hash(projected.priorPatch),hash(data.priorPatch));
 assert.equal(hash(rollback(c,identity)),hash(data.rollback),'MEDICAL_ROLLBACK_POSTIMAGE_DRIFT');
 for(const [collection,row] of projected.creates){const found=snapshot[collection].find(r=>r.id===row.id);
  assert.equal(hash(found),hash(row),'MEDICAL_EXACT_POSTIMAGE_MISMATCH');}
 return {policy:c.policy,operation:data.operation,receipts:c.pendingRows.length,portfolio:c.pendingRows.length,
  policyCreates:1,activityCreates:1,priorUpdates:data.parents.prior?1:0,payments:0,vehicles:0,
  pendingGrossCents:c.pendingGrossCents,originalGrossCents:c.header.grossCents,policyState:c.storedPolicyState,
  beforeHash:data.beforeHash,sourceManifestSha256:PIN,originalRunId:data.runId};
}
async function applyChunk(db,chunk,gate,verifyDocument=verifySources){
 assert.equal(gate.environment,'gravicentra-live-data-writes');assert.equal(gate.reviewerEvidence,true);
 assert.equal(gate.repository,'paulaosoriof86/orbit360-core');assert.equal(gate.ref,'refs/heads/recovery/fase-a-clean-20260831');
 assert.equal(gate.project,PROJECT);assert.equal(gate.sourceManifestSha256,manifest.source302Sha256);
 assert.equal(chunk.operationKind,KIND);assert.equal(chunk.documentaryManifestSha256,PIN);
 const c=manifest.cases.find(c=>c.policy===chunk.policy);assert.ok(c,'MEDICAL_CASE_SCOPE');
 assert.equal(chunk.rows.length,c.pendingRows.length);assert.equal(chunk.count,c.pendingRows.length);
 assert.equal(hash({...chunk,sourcePlanSha256:undefined}),chunk.sourcePlanSha256,'MEDICAL_SIGNED_CHUNK_DRIFT');
 const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json')));
 const expected=c.pendingRows.map(r=>({...normalizeSource(source.rows.find(x=>x.caseId===r.caseId)),operationKind:KIND}));
 assert.equal(hash(chunk.rows),hash(expected),'MEDICAL_SOURCE_ROWS_CHANGED');
 assert.equal(await verifyDocument(c),true,'MEDICAL_DOCUMENT_BYTES_NOT_VERIFIED');
 let outcome,preparedWrites=0;
 try{outcome=await db.runTransaction(async tx=>{
  const a=await tx.get(audit(db,chunk.operation));
  if(a.exists){const proof=await verifyInside(tx,db,c,a);assert.equal(proof.beforeHash,chunk.beforeHash);
   return {status:'ALREADY_APPLIED_READBACK_PASS',writes:0,proof};}
  const s=await readSnapshot(db,tx),identity=assess(c,s);
  if(identity.status!=='ELIGIBLE')return {...identity,technicalWrites:0};
  assert.equal(identity.operation,chunk.operation);assert.equal(identity.beforeHash,chunk.beforeHash,'MEDICAL_PARENT_CAS_CHANGED');
  assert.equal(hash(identity.before),hash(chunk.before));
  const at=new Date().toISOString(),projected=mutations(c,identity,at);
  preparedWrites=projected.technicalWrites;
  for(const [collection,row] of projected.creates)tx.create(items(db,collection).doc(row.id),row);
  if(identity.prior)tx.update(items(db,'polizas').doc(identity.prior.id),projected.priorPatch);
  tx.create(audit(db,identity.operation),{schema:'GI_I66_DOCUMENTARY_MEDICAL_CREATE_AUDIT_V1',status:'COMMITTED',
   operation:identity.operation,policy:c.policy,manifestSha256:PIN,source302Sha256:manifest.source302Sha256,
   originalSha256:c.sourcePdfSha256,before:identity.before,beforeHash:identity.beforeHash,
   parents:{client:identity.client,insurer:identity.insurer,advisor:identity.advisor,prior:identity.prior},
   creates:storedCreates(projected.creates),priorPatch:projected.priorPatch,
   rollback:rollback(c,identity),
   createdAt:at,runId:process.env.GITHUB_RUN_ID});
  return {status:'COMMITTED_REQUIRES_READBACK',technicalWrites:projected.technicalWrites,priorUpdates:identity.prior?1:0};
 });}catch(error){
  if(!preparedWrites)return {status:'HOLD',reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'MEDICAL_TRANSACTION_HOLD',technicalWrites:0};
  try{const proof=await db.runTransaction(async tx=>verifyInside(tx,db,c,await tx.get(audit(db,chunk.operation))),{readOnly:true});
   return {status:'APPLIED_READBACK_PASS',technicalWrites:preparedWrites,priorUpdates:proof.priorUpdates,proof,recoveredAfterTransactionError:true};
  }catch{return {status:'WRITE_OUTCOME_INDETERMINATE',reason:'MEDICAL_TRANSACTION_OUTCOME_NOT_CERTIFIED',
   technicalWrites:null,attemptedTechnicalWrites:preparedWrites,writeOutcomeIndeterminate:true};}
 }
 if(outcome.status!=='COMMITTED_REQUIRES_READBACK')return outcome;
 try{const proof=await db.runTransaction(async tx=>verifyInside(tx,db,c,await tx.get(audit(db,chunk.operation))),{readOnly:true});
  return {...outcome,status:'APPLIED_READBACK_PASS',proof};
 }catch(error){return {...outcome,status:'COMMITTED_READBACK_HOLD',reason:'MEDICAL_POSTIMAGE_READBACK_HOLD'};}
}
module.exports={KIND,FILE,PIN,manifest,load,numberRelation,holderMatches,operation,targets,readSnapshot,assess,mutations,
 verifySources,enrichPlan,applyChunk,verifyInside,hash};
