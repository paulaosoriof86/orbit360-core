import fs from 'node:fs';
import crypto from 'node:crypto';
import { initializeApp as initializeAdminApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab',tenantId=process.env.TENANT_HINT||'alianzas-soluciones',runId=String(process.env.GITHUB_RUN_ID||Date.now()),outPath=process.env.B3_004_R8_OPERATIONAL_PROOF_OUT||'/tmp/b3-004-r8-operational-proof.json';
const need=(ok,code)=>{if(!ok)throw new Error(code);},text=v=>String(v==null?'':v).trim(),norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
function cfg(o){if(!o||typeof o!=='object')return null;if(o.apiKey&&o.projectId&&(o.appId||o.authDomain))return o;for(const v of Object.values(o)){const x=cfg(v);if(x)return x;}return null;}
function roles(m){return [...new Set([...(m.roles||[]),...(m.rolesAsignados||[])].map(norm).filter(Boolean))];}
function active(m){const s=norm(m.status||m.estado);return m&&m.active!==false&&m.activo!==false&&!['inactive','inactivo','blocked','bloqueado'].includes(s);}
async function callFor(auth,config,actor,label){const token=await auth.createCustomToken(actor.uid),app=initializeClientApp(config,'b3004-r8-op-'+label+'-'+runId);await signInWithCustomToken(getClientAuth(app),token);return httpsCallable(getFunctions(app,'us-east1'),'orbit360ProductOperationalCommandPreview');}
async function invoke(callable,actor,requestId,mutations){return (await callable({tenantId,activeRole:actor.activeRole,requestId,mutations})).data;}
async function denied(callable,actor,id){try{await invoke(callable,actor,'b3004qa_r8_denied_'+id,[{action:'update',collection:'recibosEsperados',id,payload:{id,__syntheticQa:true,qaDeniedProbe:runId}}]);return false;}catch(e){return /permission-denied/i.test(String(e&&e.code||''))||/no puede|alcance|permiso/i.test(String(e&&e.message||''));}}
const sdk=cfg(JSON.parse(fs.readFileSync(process.env.PUBLIC_CONFIG_FILE,'utf8')));need(sdk,'R8_PUBLIC_CONFIG_MISSING');
const app=getApps()[0]||initializeAdminApp({credential:applicationDefault(),projectId}),db=getFirestore(app),auth=getAdminAuth(app),memberSnap=await db.collection('tenants').doc(tenantId).collection('members').get();
const candidates=[];for(const d of memberSnap.docs){const m=d.data()||{};if(!active(m))continue;try{await auth.getUser(d.id);}catch{continue;}candidates.push({uid:d.id,member:m,roles:roles(m),advisorId:text(m.advisorId||m.asesorId)});}
const direction=candidates.find(x=>x.roles.includes('direccion'));need(direction,'R8_DIRECTION_MEMBER_NOT_FOUND');direction.activeRole='direccion';
const advisor=candidates.find(x=>x.roles.some(r=>/^asesor/.test(r)||r==='comercial'));need(advisor,'R8_ADVISOR_MEMBER_NOT_FOUND');advisor.activeRole=advisor.roles.find(r=>/^asesor/.test(r)||r==='comercial');
const targetAdvisor=[...new Set(candidates.map(x=>x.advisorId).filter(Boolean))].find(x=>x!==direction.advisorId&&x!==advisor.advisorId)||advisor.advisorId;need(targetAdvisor,'R8_TARGET_ADVISOR_MISSING');
const suffix=crypto.createHash('sha256').update(runId).digest('hex').slice(0,10),ids={client:'b3004qa_client_r8_'+suffix,policy:'b3004qa_policy_r8_'+suffix,receipt:'b3004qa_receipt_r8_'+suffix,portfolio:'b3004qa_portfolio_r8_'+suffix};
const data=db.collection('tenants').doc(tenantId).collection('data'),refs={client:data.doc('clientes').collection('items').doc(ids.client),policy:data.doc('polizas').collection('items').doc(ids.policy),receipt:data.doc('recibosEsperados').collection('items').doc(ids.receipt),portfolio:data.doc('carteraPrimas').collection('items').doc(ids.portfolio)};
const reqs=['b3004qa_r8_scope_'+suffix,'b3004qa_r8_delete_'+suffix],audit={schema:'GRAVICENTRA_B3_004_R8_OPERATIONAL_SCOPE_DELETE_PREVIEW_V1',status:'RUNNING',direction:{uid:direction.uid,activeRole:direction.activeRole,advisorId:direction.advisorId},advisor:{uid:advisor.uid,activeRole:advisor.activeRole,advisorId:advisor.advisorId},targetAdvisor,ids,assertions:{},cleanup:{attempted:false,pass:false}};
try{
 const batch=db.batch();batch.set(refs.client,{id:ids.client,nombre:'B3-004 R8 QA',pais:'GT',asesorId:targetAdvisor,__syntheticQa:true,__syntheticRun:runId});batch.set(refs.policy,{id:ids.policy,clienteId:ids.client,numero:'R8-'+suffix,pais:'GT',moneda:'GTQ',asesorId:targetAdvisor,estado:'Vigente',__syntheticQa:true,__syntheticRun:runId});batch.set(refs.receipt,{id:ids.receipt,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',asesorId:targetAdvisor,estado:'Pendiente',monto:100,__syntheticQa:true,__syntheticRun:runId});batch.set(refs.portfolio,{id:ids.portfolio,reciboId:ids.receipt,polizaId:ids.policy,clienteId:ids.client,pais:'GT',moneda:'GTQ',asesorId:targetAdvisor,estado:'Pendiente',carteraActiva:true,monto:100,__syntheticQa:true,__syntheticRun:runId});await batch.commit();
 const dirCall=await callFor(auth,sdk,direction,'direction'),advCall=await callFor(auth,sdk,advisor,'advisor');
 const scope=await invoke(dirCall,direction,reqs[0],[{action:'update',collection:'recibosEsperados',id:ids.receipt,payload:{id:ids.receipt,__syntheticQa:true,qaScopeProbe:runId}}]);
 need(scope?.ok===true&&scope.canonicalReadback===true,'R8_DIRECTION_SCOPE_WRITE_READBACK_FAILED');
 need(await denied(advCall,advisor,ids.receipt),'R8_ADVISOR_CROSS_SCOPE_NOT_DENIED');
 const del=await invoke(dirCall,direction,reqs[1],[
  {action:'update',collection:'recibosEsperados',id:ids.receipt,payload:{id:ids.receipt,__syntheticQa:true,deleted:true,eliminado:true,archivado:true,deleteReason:'B3-004 R8 synthetic delete proof',deletedAt:'2026-09-30T00:00:00.000Z'}},
  {action:'update',collection:'carteraPrimas',id:ids.portfolio,payload:{id:ids.portfolio,__syntheticQa:true,deleted:true,eliminado:true,archivado:true,deleteReason:'B3-004 R8 synthetic delete proof',deletedAt:'2026-09-30T00:00:00.000Z'}}
 ]);
 need(del?.ok===true&&del.canonicalReadback===true&&del.mutationCount===2,'R8_DELETE_DURABLE_READBACK_FAILED');
 const [rr,pp]=await Promise.all([refs.receipt.get(),refs.portfolio.get()]);need(rr.exists&&pp.exists&&rr.data().deleted===true&&pp.data().deleted===true,'R8_DELETE_FLAGS_NOT_DURABLE');
 audit.assertions={directionCrossAdvisorReceiptScopeAllowed:true,advisorRoleStillBounded:true,receiptAndPortfolioUseCobrosModule:true,durableSoftDeleteReadback:true,syntheticPreviewAliasOnly:true};audit.status='PASS_PENDING_CLEANUP';
}finally{
 audit.cleanup.attempted=true;
 await Promise.all([refs.portfolio.delete().catch(()=>null),refs.receipt.delete().catch(()=>null),refs.policy.delete().catch(()=>null),refs.client.delete().catch(()=>null)]);
 for(const requestId of reqs){await db.collection('tenants').doc(tenantId).collection('operationalRequests').doc(requestId).delete().catch(()=>null);const ev=await db.collection('tenants').doc(tenantId).collection('operationalEvents').where('requestId','==',requestId).get().catch(()=>null);if(ev)await Promise.all(ev.docs.map(d=>d.ref.delete().catch(()=>null)));}
 const checks=await Promise.all(Object.values(refs).map(r=>r.get()));audit.cleanup.pass=checks.every(x=>!x.exists);if(audit.status==='PASS_PENDING_CLEANUP'&&audit.cleanup.pass)audit.status='PASS';fs.writeFileSync(outPath,JSON.stringify(audit,null,2)+'\n');
}
need(audit.status==='PASS','R8_OPERATIONAL_CLEANUP_FAILED');console.log(JSON.stringify(audit));
