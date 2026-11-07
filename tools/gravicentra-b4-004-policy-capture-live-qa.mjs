/* B4-004 LIVE focal mode of the existing B4 proof runner. Never an entrypoint.
 * The real owners, facade, callable, authorization and readback remain unchanged.
 * Only synthetic record identities/marker are adapted at the QA boundary.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const need=(v,c)=>{if(!v)throw Error('CAPTURE_QA_'+c);};
const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
const digest=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(stable(v))).digest('hex');
const clone=v=>JSON.parse(JSON.stringify(v));
const command='orbit360ProductOperationalCommand';
const identityKeys=new Set(['id','clienteId','clientId','polizaId','policyId','reciboId','receiptId','vehiculoId','vehicleId','registroId','auditoriaRef']);

export function fixturePlan(run){
 need(/^[0-9]+_[0-9]+$/.test(run),'RUN_REQUIRED');
 const rows={advisor:['asesores','advisor'],insurer:['aseguradoras','insurer'],client:['clientes','client'],clientActivity:['actividades','client_activity'],policy:['polizas','policy'],receipt:['recibosEsperados','receipt'],portfolio:['carteraPrimas','portfolio'],vehicle:['vehiculos','vehicle'],policyActivity:['actividades','policy_activity'],receiptActivity:['actividades','receipt_activity'],advisorAudit:['auditoria','advisor_audit']};
 return Object.fromEntries(Object.entries(rows).map(([k,[collection,suffix]])=>[k,{collection,id:'b4004qa_live_capture_'+run+'_'+suffix}]));
}

export function verifyIdentityOnly(before,after,mapping){
 const walk=(a,b,path,root=false)=>{
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object'){
   const key=path.split('.').at(-1);
   const parts=key==='receiptKey'&&typeof a==='string'?a.split('|'):[];
   const receiptKey=parts.length===3&&[parts[0],mapping[parts[1]]||parts[1],parts[2]].join('|')===b;
   need(a===b||receiptKey||(identityKeys.has(key)&&typeof a==='string'&&mapping[a]===b),'BUSINESS_PAYLOAD_CHANGED:'+path);return;
  }
  need(Array.isArray(a)===Array.isArray(b),'SHAPE_CHANGED:'+path);
  const ak=Object.keys(a),bk=Object.keys(b);
  need(bk.every(k=>ak.includes(k)||(root&&k==='__syntheticQa'&&b[k]===true))&&ak.every(k=>bk.includes(k)),'KEY_CHANGED:'+path);
  for(const k of ak)walk(a[k],b[k],path?path+'.'+k:k,false);
 };
 walk(before,after,'',true);need(after.__syntheticQa===true,'MARKER_REQUIRED');return true;
}

// Read-only preflight of the real form and its real validator. Only fixed
// field names and safe error codes leave the browser; no actor/client values.
export function capturePolicyFormValidation(expected){
 const form=document.getElementById('policy-v1199');
 if(!form)return{ok:false,errorCodes:['policy_form_missing'],missingFields:[],selectionMatches:false};
 const value=k=>String(form.querySelector('[data-'+k+']')?.value??'').trim();
 const required=['client','advisor','insurer','currency','number','status','renewable','ramo','product','start','end','frequency','installments','payment-form','conduct','net','commission-insurer','commission-seller'];
 const missingFields=required.filter(k=>!value(k));
 const raw={tenantId:Orbit.access.tenantId(),clienteId:value('client'),asesorId:value('advisor'),pais:value('country'),moneda:value('currency'),aseguradoraId:value('insurer'),numero:value('number'),estado:value('status'),ramo:value('ramo'),producto:value('product'),subramo:value('product'),renovable:value('renewable')==='yes',vigenciaInicio:value('start'),vigenciaFin:value('end'),frecuencia:value('frequency'),cuotas:Number(value('installments')),formaPago:value('payment-form'),conducto:value('conduct'),primaNeta:Number(value('net')),gastosEmision:Number(value('issue')),otros:Number(value('other')),recargoFinPct:Number(value('surcharge')),comAseguradoraPct:Number(value('commission-insurer')),comVendedorPct:Number(value('commission-seller'))};
 const check=Orbit.policyReceipts.validatePolicy(Orbit.policyReceipts.preparePolicy(raw,null,'capture-qa-readonly-validation'),'');
 const errorCodes=(check.errors||[]).map(x=>String(x).split(':')[0]).map(x=>/^[a-z_]+$/.test(x)?x:'unmapped_validation_error');
 const selectionMatches=raw.clienteId===expected.clientId&&raw.asesorId===expected.advisorId&&raw.aseguradoraId===expected.insurerId&&raw.producto===expected.product&&raw.pais==='GT'&&raw.moneda==='USD';
 const economicsMatch=raw.primaNeta===1000&&raw.comAseguradoraPct===10&&raw.comVendedorPct===60&&raw.frecuencia==='Contado'&&raw.cuotas===1;
 return{ok:check.ok===true&&missingFields.length===0&&selectionMatches&&economicsMatch,errorCodes,missingFields,selectionMatches,economicsMatch};
}

export function policyFormErrorDiagnostic(text){
 const message=String(text||'').trim();if(!message)return null;
 const known={'Selecciona el producto o subramo.':'producto_requerido','Selecciona el ramo.':'ramo_requerido','Ingresa el número real de póliza.':'numero_poliza_requerido','Ingresa el inicio de vigencia.':'vigencia_inicio_requerida','Ingresa el fin de vigencia.':'vigencia_fin_requerida','La fecha final debe ser posterior a la inicial.':'vigencia_invalida','La prima neta debe ser mayor que cero.':'prima_neta_requerida','Completa ambos porcentajes de comisión entre 0 y 100; no se sustituye una tarifa pendiente por cero.':'commission_values_required'};
 const errorCodes=Object.entries(known).filter(([label])=>message.includes(label)).map(([,code])=>code);
 return{visibleError:true,errorCodes:errorCodes.length?errorCodes:['unmapped_form_error'],messageSha256:digest(message)};
}

export function assertCaptureInput(input,plan,tenantId){
 need(input?.tenantId===tenantId&&input.activeRole==='Dirección','REQUEST_ACTOR_CONTEXT');
 need(Array.isArray(input.mutations)&&input.mutations.length>=1&&input.mutations.length<=5&&!input.metaPreviewQa,'REQUEST_SHAPE');
 const allowed=new Map(Object.values(plan).map(x=>[x.collection+'|'+x.id,x]));
 const seen=new Set();
 for(const m of input.mutations){
  const key=m.collection+'|'+m.id;
  need(allowed.has(key)&&m.collection!=='aseguradoras'&&!seen.has(key),'FOREIGN_OR_DUPLICATE_TARGET');seen.add(key);
  need(['insert','update'].includes(m.action)&&m.payload?.__syntheticQa===true,'NON_SYNTHETIC_OR_DELETE');
  need(m.payload.id===m.id&&m.payload.tenantId===tenantId,'PAYLOAD_IDENTITY');
  if(m.collection==='asesores')need(!m.payload.authUid&&!m.payload.uid&&!m.payload.userId,'AUTH_LINK_FORBIDDEN');
  for(const field of ['clienteId','clientId','polizaId','policyId','reciboId','receiptId','vehiculoId','vehicleId','asesorId','advisorId','aseguradoraId']){
   if(m.payload[field])need(Object.values(plan).some(x=>x.id===m.payload[field]),'FOREIGN_REFERENCE:'+field);
  }
 }
 return true;
}

export function assertCleanupFixture(row,fixture,tenantId,actorUid){
 need(row&&row.id===fixture.id&&row.tenantId===tenantId&&row.__syntheticQa===true&&row.ownerUid===actorUid,'CLEANUP_PROVENANCE');
 need(!row.authUid&&!row.uid&&!row.userId,'CLEANUP_AUTH_LINK');return true;
}

export function receiptIdentity(input,tenantId,actorUid){
 const normalized=input.mutations.map(m=>({action:m.action,collection:m.collection,id:m.id,payload:m.payload}));
 const payloadDigest=digest(normalized),requestId=input.requestId||'op_'+digest(tenantId+'|'+actorUid+'|'+payloadDigest).slice(0,32);
 return{payloadDigest,requestId,eventId:'opevt_'+digest(tenantId+'|'+requestId).slice(0,28)};
}

export function policyActivityMatches(activity,policy,plan){
 // The canonical activity owner links by client and operation, not polizaId.
 return activity?.id===plan.policyActivity.id&&activity.clienteId===plan.client.id&&activity.asesorId===plan.advisor.id&&activity.pais==='GT'&&!!policy.operationId&&activity.operacionId===policy.operationId&&activity.titulo==='Póliza creada: '+policy.numero;
}

export function assertCleanupReceipt(event,request,call,tenantId,actorUid){
 need(event&&request&&call.originalReceiptAbsence===true&&call.response?.ok===true&&call.response.serverOwned===true,'CLEANUP_RECEIPT_MISSING');
 const r=call.response;
 const expected=receiptIdentity(call.input,tenantId,actorUid);
 need(r.requestId===expected.requestId&&r.eventId===expected.eventId,'CLEANUP_DERIVED_IDS');
 need(event.eventId===r.eventId&&event.requestId===r.requestId&&event.tenantId===tenantId&&event.actorUid===actorUid&&event.activeRole==='direccion','CLEANUP_EVENT_BINDING');
 need(request.status==='committed'&&request.result?.eventId===r.eventId&&request.result?.requestId===r.requestId&&request.payloadDigest===event.payloadDigest,'CLEANUP_REQUEST_BINDING');
 // The backend hashes normalized mutations: action/collection/id/payload only.
 const normalized=call.input.mutations.map(m=>({action:m.action,collection:m.collection,id:m.id,payload:m.payload}));
 need(event.payloadDigest===digest(normalized)&&event.mutationCount===normalized.length,'CLEANUP_PAYLOAD_DIGEST');return true;
}

/* Self-contained function serialized by Playwright. No backend/role overrides. */
export function installCaptureIdentityAdapter(config){
 const O=globalThis.Orbit,S=O&&O.store;
 const fail=c=>{throw Error('CAPTURE_QA_'+c);};
 if(!S||S.__productOperationalWriteP0!==true||globalThis.__giCaptureQa)fail('ADAPTER_CONTEXT');
 const copy=v=>JSON.parse(JSON.stringify(v));
 const ids=config.plan,keys=new Set(['id','clienteId','clientId','polizaId','policyId','reciboId','receiptId','vehiculoId','vehicleId','registroId','auditoriaRef']);
 const map={},records=[],auxiliary=[],counts={};let phase='idle';
 const originals={};for(const k of ['batchDurable','insertDurable','updateDurable','insert','update','remove','removeDurable'])originals[k]=S[k];
 const slots={
  'client-create':{clientes:['insert','client'],actividades:['insert','clientActivity']},
  'policy-create':{polizas:['insert','policy'],recibosEsperados:['insert','receipt'],carteraPrimas:['insert','portfolio'],vehiculos:['insert','vehicle'],actividades:['insert','policyActivity']},
  'receipt-edit':{recibosEsperados:['update','receipt'],carteraPrimas:['update','portfolio'],actividades:['insert','receiptActivity']},
  'advisor-commission':{asesores:['update','advisor']}
 };
 function adapt(mutations,kind){
  const rules=slots[phase];if(!rules)fail('PHASE_NOT_OPEN');
  if(counts[kind+'|'+phase])fail('REPEATED_WRITE');
  const before=copy(mutations),used=new Set();
  for(const m of mutations){
   const rule=rules[m.collection];if(!rule||m.action!==rule[0]||used.has(m.collection)||!m.payload||!m.id)fail('MUTATION_NOT_DECLARED');used.add(m.collection);
   const target=ids[rule[1]].id;
   if(m.action==='update'&&m.id!==target)fail('FOREIGN_UPDATE');
   if(m.action==='insert'&&String(m.id).startsWith('b4003qa_')&&m.id!==target)fail('FOREIGN_INSERT');
   if(map[m.id]&&map[m.id]!==target)fail('IDENTITY_COLLISION');map[m.id]=target;
  }
  const required=Object.keys(rules).filter(x=>x!=='vehiculos');if(required.some(x=>!used.has(x))||used.size!==mutations.length)fail('BATCH_INCOMPLETE');
  const rewrite=v=>{if(!v||typeof v!=='object')return;for(const k of Object.keys(v)){if(keys.has(k)&&typeof v[k]==='string'&&map[v[k]])v[k]=map[v[k]];else if(k==='receiptKey'&&typeof v[k]==='string'){const parts=v[k].split('|');if(parts.length!==3)fail('RECEIPT_KEY_SHAPE');v[k]=[parts[0],map[parts[1]]||parts[1],parts[2]].join('|');}else if(v[k]&&typeof v[k]==='object')rewrite(v[k]);}};
  for(const m of mutations){m.id=map[m.id]||m.id;rewrite(m.payload);m.payload.__syntheticQa=true;}
  counts[kind+'|'+phase]=1;records.push({kind,phase,before,after:copy(mutations),mapping:copy(map)});return mutations;
 }
 S.batchDurable=function(mutations,options){adapt(mutations,'batchDurable');return originals.batchDurable.call(S,mutations,options);};
 S.insertDurable=function(collection,payload){
  if(phase!=='advisor-commission'||collection!=='auditoria'||counts.advisorAudit||payload.asesorId!==ids.advisor.id||payload.pais!=='GT')fail('AUDIT_NOT_DECLARED');
  const before=copy(payload);map[payload.id]=ids.advisorAudit.id;payload.id=ids.advisorAudit.id;payload.__syntheticQa=true;counts.advisorAudit=1;
  records.push({kind:'insertDurable',phase,before:[{action:'insert',collection,id:before.id,payload:before}],after:[{action:'insert',collection,id:payload.id,payload:copy(payload)}],mapping:copy(map)});
  return originals.insertDurable.call(S,collection,payload);
 };
 S.update=function(collection,id,patch){
  if(phase!=='policy-create'||collection!=='clientes'||id!==ids.client.id||counts.clientState||Object.keys(patch).some(k=>!['estado','estadoOperativo','estadoActualizado'].includes(k)))fail('DERIVED_UPDATE_NOT_DECLARED');
  const before=copy(patch);patch.__syntheticQa=true;counts.clientState=1;
  records.push({kind:'derivedClientState',phase,before:[{action:'update',collection,id,payload:before}],after:[{action:'update',collection,id,payload:copy(patch)}],mapping:copy(map)});
  return originals.update.call(S,collection,id,patch);
 };
 // Legacy supplementary A.audit already fails in the canonical facade. Observe
 // that result without repairing its missing country or inventing audit success.
 S.insert=function(collection,payload){
  if(!['auditLog','actividades'].includes(collection)||!['client-create','policy-create','receipt-edit'].includes(phase))fail('INSERT_NOT_DECLARED');
  try{const out=originals.insert.call(S,collection,payload);auxiliary.push({collection,status:'RETURNED_UNEXPECTEDLY'});return out;}
  catch(e){auxiliary.push({collection,status:'CANONICAL_DENIAL',code:String(e.message||e)});throw e;}
 };
 for(const k of ['updateDurable','remove','removeDurable'])if(typeof originals[k]==='function')S[k]=function(){fail('METHOD_NOT_DECLARED:'+k);};
 globalThis.__giCaptureQa={setPhase:p=>{if(!slots[p]&&p!=='idle')fail('UNKNOWN_PHASE');phase=p;},snapshot:()=>copy({records,counts,auxiliary,phase}),restore:()=>{for(const k of Object.keys(originals))if(originals[k])S[k]=originals[k];delete globalThis.__giCaptureQa;}};
 return{installed:true,productSourceChanged:false};
}

export async function runPolicyCaptureLiveQa({db,auth,tenant,ref,chromium,actorForRole,applyLegal,bootProduct,target,projectId,tenantId,outPath}){
 const run=String(process.env.GITHUB_RUN_ID||'')+'_'+String(process.env.GITHUB_RUN_ATTEMPT||'1'),plan=fixturePlan(run);
 const p={schema:'GRAVICENTRA_B4_004_POLICY_CAPTURE_FOCAL_LIVE_QA_V1',status:'INIT',runId:run,target,fixtures:plan,businessWrites:0,seedWrites:0,syntheticMutations:0,cleanupWrites:0,authAccountsCreated:0,membershipWrites:0,productSourceChanged:false,backendChanged:false,assertions:{},limitations:['Synthetic identity/marker adapter is outside the product entrypoint; all economic/date/country/role fields are preserved.','Advisor commission/audit is tested on a synthetic profile. New advisor creation is not certified here.','Legacy supplementary A.audit is observed separately; scoped atomic activities are the acceptance subject.','This focal proof is not integral module acceptance or PRODUCTION_ACCEPTED.'],errors:[],pageErrorCount:0,consoleErrorCount:0,httpErrorCount:0,syntheticFinalAbsent:false};
 let browser,page,who,adapterSnapshot,seeds,seedAttempted=false,originalAbsenceRecorded=false,seedConfirmed=false;const calls=[],inflight=[],failures=[];
 const privateDirectory=String(process.env.RUNNER_TEMP||'')+'/gi-private-policy-capture/'+run;
 const persistPrivateLedger=extra=>{need(process.env.RUNNER_TEMP,'RUNNER_TEMP_REQUIRED');fs.mkdirSync(privateDirectory,{recursive:true,mode:0o700});fs.writeFileSync(privateDirectory+'/ledger.json',JSON.stringify({tenantId,actorUid:who?.uid,plan,seeds,seedAttempted,originalAbsenceRecorded,seedConfirmed,calls,...extra}),{mode:0o600});};
 const publicError=e=>({messageSha256:digest(String(e?.message||e)),code:/CAPTURE_QA_[A-Z_]+/.exec(String(e?.message||e))?.[0]||'FOCAL_EXECUTION_ERROR'});
 const read=async key=>{const s=await ref(plan[key].collection,plan[key].id).get();return s.exists?s.data():null;};
 const waitRead=async(key,test,diagnostic)=>{for(let i=0;i<45;i++){if(diagnostic)await diagnostic();const row=await read(key);if(row&&test(row))return row;await new Promise(r=>setTimeout(r,400));}throw Error('CAPTURE_QA_SERVER_READBACK_'+key);};
 const phase=async name=>page.evaluate(name=>__giCaptureQa.setPhase(name),name);
 const checkPolicyFormError=async()=>{const text=await page.evaluate(()=>{const e=document.querySelector('#policy-v1199 [data-error]');return e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'?e.textContent:'';});const diagnostic=policyFormErrorDiagnostic(text);if(diagnostic){p.policyFormDiagnostic=diagnostic;throw Error('CAPTURE_QA_POLICY_FORM_VALIDATION_FAILED');}};
 try{
  need(projectId==='ays-orbit-360-lab'&&tenantId==='alianzas-soluciones','PROJECT_TENANT');
  need(target==='https://ays-orbit-360-lab.web.app','EXACT_LIVE_ORIGIN_ONLY');
  const transport=JSON.parse(fs.readFileSync(process.env.B4_004_LIVE_PROMOTION_PROOF,'utf8'));
  need(transport.status==='EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING'&&transport.sourceSha===process.env.SOURCE_SHA&&/^[a-f0-9]{40}$/.test(transport.sourceSha)&&transport.productionUrl===target&&transport.liveVersionName==='sites/ays-orbit-360-lab/versions/33af816375dd5cb5'&&transport.productFiles===218&&transport.artifactId>0&&/^[a-f0-9]{64}$/.test(transport.archiveSha256)&&/^[a-f0-9]{64}$/.test(transport.hostedPayloadDigest),'EXACT_LIVE_PROMOTION_REQUIRED');
  const contract=JSON.parse(fs.readFileSync(process.env.FRONTEND_CONTRACT,'utf8'));
  const buildResponse=await fetch(target+'/__recovery__/build.json',{redirect:'error',cache:'no-store'});need(buildResponse.ok,'BUILD_HTTP');
  const build=await buildResponse.json();need(build.sourceSha===transport.sourceSha&&build.buildId===transport.buildId,'BUILD_MISMATCH');
  p.artifact={sourceSha:transport.sourceSha,buildId:transport.buildId,artifactId:transport.artifactId,artifactZipSha256:transport.artifactZipSha256,archiveSha256:transport.archiveSha256,hostedPayloadDigest:transport.hostedPayloadDigest,liveVersionName:transport.liveVersionName};
  p.sourceOwners=[];
  for(const owner of contract.productChanges){const r=await fetch(target+'/'+owner.path.replace(/^orbit360-platform\//,''),{redirect:'error',cache:'no-store'});need(r.ok,'OWNER_HTTP');const bytes=Buffer.from(await r.arrayBuffer());const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');need(blob===owner.afterBlobSha,'SERVED_OWNER_MISMATCH');p.sourceOwners.push({path:owner.path,blobSha:blob,sha256:digest(bytes.toString('utf8'))});}
  need(p.sourceOwners.length===5,'EXACT_FIVE_OWNERS');p.assertions.exactArtifactBeforeWrites=true;
  who=await actorForRole('direccion');p.actor={activeRole:who.activeRole,uidSha256:digest(who.uid),existingPrincipal:true};
  const common={tenantId,__syntheticQa:true,ownerUid:who.uid,ownerEmail:who.email,pais:'GT',createdAt:new Date().toISOString()};
  seeds={advisor:{...common,id:plan.advisor.id,nombre:'B4 captura asesor QA '+run,rol:'Asesor',roles:['asesor'],activo:true,estado:'Activo',paisDefault:'GT',paises:['GT'],comModo:'comision',shareCom:50,tipoVinculacion:'sin_clasificar',participaMetas:false},insurer:{...common,id:plan.insurer.id,nombre:'B4 captura aseguradora QA '+run,canonicalName:'B4 captura aseguradora QA '+run,activo:true,estado:'Activa',moneda:'GTQ',vinculada:true,comisionDefault:10,ramos:['Automóviles'],ramosDetalle:{'Automóviles':{productos:['Vehículo Liviano'],planes:[],segmento:'Estándar'}},docs:[],cotizadorHabilitado:false,comparativoHabilitado:false,iaHabilitada:false}};
  seedAttempted=true;persistPrivateLedger({phase:'PRE_SEED'});
  await db.runTransaction(async tx=>{for(const f of Object.values(plan)){const s=await tx.get(ref(f.collection,f.id));need(!s.exists,'FIXTURE_ALREADY_EXISTS');}originalAbsenceRecorded=true;persistPrivateLedger({phase:'ABSENCE_VERIFIED_BEFORE_CREATE',seedFingerprints:Object.fromEntries(Object.entries(seeds).map(([k,v])=>[k,digest(v)]))});for(const key of ['advisor','insurer'])tx.create(ref(plan[key].collection,plan[key].id),seeds[key]);});
  seedConfirmed=true;persistPrivateLedger({phase:'SEED_ACKNOWLEDGED'});p.seedWrites=2;p.assertions.originalAbsenceVerified=true;
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:false,serviceWorkers:'block'});page=await context.newPage();
  page.on('pageerror',e=>{p.pageErrorCount++;failures.push(publicError(e));});
  page.on('console',m=>{if(m.type()==='error'){p.consoleErrorCount++;failures.push({code:'BROWSER_CONSOLE_ERROR',messageSha256:digest(m.text())});}});
  // Additional test fence, never a response mock: all admitted commands go to
  // the existing production callable unchanged. Other callable reads are untouched.
  await context.route(/orbit360(?:ProductOperationalCommand|ProductWorkflowCommand|ProductTeamClassification)/,async route=>{
   const req=route.request();if(req.method()==='OPTIONS'){await route.continue();return;}
   try{need(new URL(req.url()).pathname.endsWith('/'+command)&&new URL(req.url()).hostname==='us-central1-ays-orbit-360-lab.cloudfunctions.net','WRONG_WRITE_ENDPOINT');const input=req.postDataJSON()?.data;assertCaptureInput(input,plan,tenantId);need(calls.length<8,'CALL_LIMIT');const exact=receiptIdentity(input,tenantId,who.uid),[er,rr]=await Promise.all([tenant.collection('operationalEvents').doc(exact.eventId).get(),tenant.collection('operationalRequests').doc(exact.requestId).get()]);need(!er.exists&&!rr.exists,'RECEIPT_ALREADY_EXISTS');calls.push({input,response:null,originalReceiptAbsence:true});persistPrivateLedger({phase:'EXACT_OUTBOUND_BEFORE_NETWORK'});await route.continue();}
   catch(e){failures.push(publicError(e));await route.abort('blockedbyclient');}
  });
  page.on('response',response=>{const url=response.url();if(response.status()>=400){p.httpErrorCount++;failures.push({code:'HTTP_ERROR',status:response.status(),urlSha256:digest(url)});}if(new URL(url).pathname.endsWith('/'+command)&&response.request().method()==='POST')inflight.push((async()=>{try{const input=response.request().postDataJSON().data,body=await response.json(),result=body.result||body.data;assertCaptureInput(input,plan,tenantId);const call=calls.find(c=>!c.response&&digest(c.input)===digest(input));need(call,'OUTBOUND_LEDGER_MISSING');need(result?.ok===true&&result.serverOwned===true&&result.canonicalReadback===true,'SERVER_ACK');call.response=result;}catch(e){failures.push(publicError(e));}})());});
  await applyLegal(page,who);const token=await auth.createCustomToken(who.uid);
  await page.goto(target+'/#/equipo',{waitUntil:'domcontentloaded',timeout:60000});await bootProduct(page,token);
  need(await page.evaluate(()=>Orbit.session.set('direccion')===true),'ASSIGNED_ROLE_SELECTION');
  await page.locator('#pais-sel').selectOption('GT');await page.waitForFunction(()=>Orbit.pais==='GT');
  await page.evaluate(()=>Orbit.store._ensureCollections(['asesores','aseguradoras','clientes','polizas','recibosEsperados','carteraPrimas','actividades','auditoria']));
  await page.waitForFunction(ids=>!!Orbit.store.get('asesores',ids.advisor.id)&&!!Orbit.store.get('aseguradoras',ids.insurer.id),plan,{timeout:30000});
  const session=await page.evaluate(()=>({uid:Orbit.auth?.productUser?.uid,role:Orbit.session?.rol?.(),tenantId:Orbit.auth?.productUser?.tenantId,countries:Orbit.auth?.productUser?.countries,pais:Orbit.pais}));need(session.uid===who.uid&&session.tenantId===tenantId&&session.countries?.includes('GT')&&session.pais==='GT'&&String(session.role).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='direccion','SIGNED_SESSION');p.sessionContext={activeRole:'direccion',country:'GT',assignedRoleAndCountryVerified:true};
  need(new URL(page.url()).origin===target,'BROWSER_LIVE_ORIGIN');await page.evaluate(installCaptureIdentityAdapter,{plan});await phase('advisor-commission');
  await page.evaluate(()=>{location.hash='#/equipo';});await page.locator('[data-t="comisiones"]').click();
  const share=page.locator('[data-vend="'+plan.advisor.id+'"]');await share.waitFor({state:'visible'});need(await share.inputValue()==='50','ADVISOR_INITIAL_SHARE');
  await share.click();await share.press('ControlOrMeta+A');await share.pressSequentially('60');await share.press('Tab');
  const advisor=await waitRead('advisor',x=>x.shareCom===60);const audit=await waitRead('advisorAudit',x=>x.accion==='editar_comision'&&x.after?.shareCom===60);
  need(audit.pais==='GT'&&audit.actorUid===who.uid&&audit.asesorId===plan.advisor.id&&advisor.comModo==='comision','ADVISOR_AUDIT');p.assertions.advisorCommissionAndScopedAudit=true;
  await phase('client-create');await page.evaluate(()=>Orbit.modules.cliente360.nuevoCliente());
  await page.locator('#v1198-nombre').fill('B4 captura cliente QA '+run);await page.locator('#v1198-pais').selectOption('GT');await page.locator('#v1198-ase').selectOption(plan.advisor.id);await page.locator('#v1198-email').fill('capture-'+run+'@example.invalid');await page.locator('#v1198-save').click();
  const client=await waitRead('client',x=>x.asesorId===plan.advisor.id&&x.estado==='pendiente_polizas');const ca=await waitRead('clientActivity',x=>x.clienteId===plan.client.id&&x.pais==='GT');need(client.pais==='GT'&&ca.asesorId===plan.advisor.id,'CLIENT_RELATIONS');
  await page.locator('#crm-new-client-v1198').waitFor({state:'detached',timeout:20000});p.assertions.clientFormAndAtomicActivity=true;
  await phase('policy-create');await page.evaluate(id=>Orbit.modules.cliente360.nuevaPoliza(id),plan.client.id);
  const form=page.locator('#policy-v1199');await form.waitFor();await form.locator('[data-insurer]').selectOption(plan.insurer.id);await form.locator('[data-advisor]').selectOption(plan.advisor.id);await form.locator('[data-currency]').selectOption('USD');
  const autoBranch=await form.locator('[data-ramo] option').evaluateAll(rows=>rows.map(x=>({value:x.value,label:x.textContent})).find(x=>/auto|veh/i.test(x.label))?.value);need(autoBranch,'EXISTING_AUTO_CATALOG');await form.locator('[data-ramo]').selectOption(autoBranch);
  const expectedProduct=seeds.insurer.ramosDetalle[autoBranch]?.productos[0];need(expectedProduct,'DECLARED_AUTO_PRODUCT');await form.locator('[data-product]').selectOption({label:expectedProduct});need(await form.locator('[data-product]').inputValue()===expectedProduct,'POLICY_PRODUCT_SELECTED');
  await form.locator('[data-number]').fill('QA-CAPTURE-'+run);await form.locator('[data-renewable]').selectOption('no');await form.locator('[data-frequency]').selectOption({label:'Contado'});
  const start=new Date().toISOString().slice(0,10),end=new Date(Date.now()+30*86400000).toISOString().slice(0,10),due=new Date(Date.now()+12*86400000).toISOString().slice(0,10);
  await form.locator('[data-start]').fill(start);await form.locator('[data-end]').fill(end);await form.locator('[data-net]').fill('1000');await form.locator('[data-issue]').fill('0');await form.locator('[data-commission-insurer]').fill('10');await form.locator('[data-commission-seller]').fill('60');
  p.policyFormPreflight=await page.evaluate(capturePolicyFormValidation,{clientId:plan.client.id,advisorId:plan.advisor.id,insurerId:plan.insurer.id,product:expectedProduct});need(p.policyFormPreflight.ok,'POLICY_REQUIRED_FIELDS_OR_VALIDATION');await form.locator('[data-save]').click();await checkPolicyFormError();
  const policy=await waitRead('policy',x=>x.moneda==='USD'&&x.clienteId===plan.client.id,checkPolicyFormError);const receipt=await waitRead('receipt',x=>x.polizaId===plan.policy.id);const portfolio=await waitRead('portfolio',x=>x.reciboId===plan.receipt.id);await waitRead('policyActivity',x=>policyActivityMatches(x,policy,plan));await waitRead('client',x=>x.estado==='activo'&&x.estadoOperativo==='activo');
  need(policy.primaNeta===1000&&policy.comAseguradoraPct===10&&policy.comVendedorPct===60&&receipt.comAseguradora===100&&receipt.comVendedor===60,'POLICY_ECONOMICS');
  need(receipt.moneda==='USD'&&portfolio.moneda==='USD'&&receipt.clienteId===plan.client.id&&portfolio.clienteId===plan.client.id&&!receipt.fechaPago&&!receipt.conciliado,'RECEIPT_PORTFOLIO');
  await form.waitFor({state:'detached',timeout:20000});p.assertions.policyFormAtomicBatchAndDerivedClientState=true;
  p.economics={currency:policy.moneda,netPremium:policy.primaNeta,insurerRate:policy.comAseguradoraPct,sellerRate:policy.comVendedorPct,insurerAmount:receipt.comAseguradora,sellerAmount:receipt.comVendedor,expectedReceipts:1,paymentCreated:false};
  await phase('receipt-edit');await page.evaluate(ids=>Orbit.receiptsPortfolioProjection.openReceiptDetail(ids.receipt.id,ids.client.id),plan);await page.locator('[data-rp-edit-receipt]').click();
  await page.locator('#rp-edit-receipt [data-rp-due]').fill(due);await page.locator('#rp-edit-receipt [data-rp-reason]').fill('Prueba QA de fecha documentada; no existe pago');await page.locator('#rp-edit-receipt [data-rp-save]').click();
  const edited=await waitRead('receipt',x=>x.fechaLimite===due),editedPortfolio=await waitRead('portfolio',x=>x.fechaLimite===due);await waitRead('receiptActivity',x=>x.polizaId===plan.policy.id&&x.pais==='GT');
  const monetaryKeys=['neta','primaNeta','gastosEmision','gastosExpedicion','gastosFinan','gastosFinanciamiento','otros','descuento','iva','impuestosIVA','monto','montoTotal','primaTotal','comAseguradora','comVendedor'];
  need(monetaryKeys.every(k=>edited[k]===receipt[k])&&['monto','montoTotal','primaTotal'].every(k=>editedPortfolio[k]===portfolio[k])&&!edited.fechaPago,'DATE_ONLY_NO_PAYMENT');
  await page.locator('#rp-edit-receipt').waitFor({state:'detached',timeout:20000});p.assertions.receiptEditFormAndAtomicPortfolioActivity=true;
  adapterSnapshot=await page.evaluate(()=>__giCaptureQa.snapshot());await page.evaluate(()=>__giCaptureQa.restore());
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await bootProduct(page,token);
  await page.evaluate(()=>Orbit.store._ensureCollections(['asesores','clientes','polizas','recibosEsperados','carteraPrimas','actividades','auditoria']));
  await page.waitForFunction(ids=>{const s=Orbit.store;return s.get('clientes',ids.client.id)?.estado==='activo'&&s.get('polizas',ids.policy.id)?.moneda==='USD'&&s.get('recibosEsperados',ids.receipt.id)?.polizaId===ids.policy.id;},plan,{timeout:30000});
  await page.evaluate(ids=>Orbit.receiptsPortfolioProjection.openReceiptDetail(ids.receipt.id,ids.client.id),plan);await page.locator('[data-rp-receipt-detail-id="'+plan.receipt.id+'"]').waitFor();
  need(await page.evaluate(({plan,due})=>!globalThis.__giCaptureQa&&Orbit.store.get('recibosEsperados',plan.receipt.id).fechaLimite===due&&Orbit.store.get('asesores',plan.advisor.id).shareCom===60,{plan,due}),'FRESH_RELOAD_READBACK');p.assertions.freshProductReloadWithoutAdapter=true;
  p.status='FOCAL_AUTHENTICATED_UI_PASS_CLEANUP_PENDING';
 }catch(e){p.status='FAIL';p.errors.push(publicError(e));}
 finally{
  await Promise.allSettled(inflight);
  try{if(page&&!page.isClosed()){if(!adapterSnapshot)adapterSnapshot=await page.evaluate(()=>globalThis.__giCaptureQa?.snapshot()||null);await page.close();}if(browser)await browser.close();}catch(e){p.errors.push(publicError(e));}
  await Promise.allSettled(inflight);
  if(adapterSnapshot){
   p.identityTransformations=[];
   for(const record of adapterSnapshot.records){try{need(record.before.length===record.after.length,'TRANSFORMATION_COUNT');for(let i=0;i<record.before.length;i++){const a=record.before[i],b=record.after[i];need(a.action===b.action&&a.collection===b.collection&&(a.id===b.id||record.mapping[a.id]===b.id),'TRANSFORMATION_TARGET');verifyIdentityOnly(a.payload,b.payload,record.mapping);}p.identityTransformations.push({phase:record.phase,method:record.kind,mutations:record.after.length,beforeSha256:digest(record.before),afterSha256:digest(record.after),businessFieldsUnchanged:true});}catch(e){p.errors.push(publicError(e));}}
   p.auxiliaryAudit={attempts:adapterSnapshot.auxiliary.length,canonicalDenials:adapterSnapshot.auxiliary.filter(x=>x.status==='CANONICAL_DENIAL').length,codes:[...new Set(adapterSnapshot.auxiliary.map(x=>x.code).filter(x=>/^[A-Z0-9_]+$/.test(x||'')))],integralAuditPass:false};
  }
  p.attemptedSyntheticMutations=calls.reduce((n,c)=>n+c.input.mutations.length,0);p.syntheticMutations=calls.filter(c=>c.response?.canonicalReadback).reduce((n,c)=>n+c.input.mutations.length,0);
  p.errors.push(...failures);
  try{
   if(seedAttempted&&originalAbsenceRecorded){
    const expected=[];
    for(const [key,fixture] of Object.entries(plan)){const s=await ref(fixture.collection,fixture.id).get();if(s.exists){const row=s.data();assertCleanupFixture(row,fixture,tenantId,who.uid);if(!seedConfirmed)need(seeds[key]&&digest(row)===digest(seeds[key]),'UNCERTAIN_SEED_FINGERPRINT');expected.push({ref:s.ref,dataDigest:digest(row),kind:'fixture',fixture});}}
    // An admitted request may still be executing after the browser is closed.
    // Missing receipts are an uncertain outcome, never permission to delete its
    // parents and race a late commit. Retain the exact ledger/fixtures on doubt.
    for(const call of calls){const exact=receiptIdentity(call.input,tenantId,who.uid),er=tenant.collection('operationalEvents').doc(exact.eventId),rr=tenant.collection('operationalRequests').doc(exact.requestId),[es,rs]=await Promise.all([er.get(),rr.get()]);need(es.exists&&rs.exists,'CLEANUP_COMMAND_OUTCOME_UNCERTAIN');if(!call.response){call.response=rs.data().result;call.recoveredForCleanupOnly=true;p.errors.push({code:'COMMITTED_WITHOUT_CANONICAL_RESPONSE'});}assertCleanupReceipt(es.data(),rs.data(),call,tenantId,who.uid);expected.push({ref:er,dataDigest:digest(es.data()),kind:'event'},{ref:rr,dataDigest:digest(rs.data()),kind:'request'});}
    const unique=new Map(expected.map(e=>[e.ref.path,e]));
    await db.runTransaction(async tx=>{const all=[];for(const row of unique.values()){const snap=await tx.get(row.ref);need(snap.exists&&digest(snap.data())===row.dataDigest,'CLEANUP_CONCURRENT_CHANGE');all.push(row.ref);}for(const r of all)tx.delete(r);});p.cleanupWrites=unique.size;
    for(const row of unique.values())need(!(await row.ref.get()).exists,'CLEANUP_READBACK');
    for(const fixture of Object.values(plan))need(!(await ref(fixture.collection,fixture.id).get()).exists,'FIXTURE_RESIDUE');p.syntheticFinalAbsent=true;
    p.cleanup={method:'EXACT_PREDECLARED_IDS_AND_CAPTURED_SERVER_RECEIPTS',actorTimeWindowQuery:false,prefixDelete:false,compareAndDeleteTransaction:true,verifiedAbsent:true};
    fs.rmSync(privateDirectory,{recursive:true,force:true});
   }
  }catch(e){p.errors.push(publicError(e));p.cleanup={status:'FAIL_CLOSED_NO_BROAD_DELETE',requiresExactLedgerReview:true};}
  p.commandReceipts=calls.map(c=>{const exact=receiptIdentity(c.input,tenantId,who?.uid||'');return{requestId:exact.requestId,eventId:exact.eventId,payloadDigest:exact.payloadDigest,mutations:c.input.mutations.length,canonicalReadback:c.response?.canonicalReadback===true,recoveredForCleanupOnly:c.recoveredForCleanupOnly===true};});
  if(p.errors.length||!p.syntheticFinalAbsent||!Object.values(p.assertions).every(Boolean)||Object.keys(p.assertions).length!==7)p.status='FAIL';
  else if(p.status==='FOCAL_AUTHENTICATED_UI_PASS_CLEANUP_PENDING')p.status='FOCAL_AUTHENTICATED_UI_PASS';
  fs.writeFileSync(outPath,JSON.stringify(p,null,2)+'\n');
 }
 need(p.status==='FOCAL_AUTHENTICATED_UI_PASS','FOCAL_PROOF_FAILED');return p;
}
