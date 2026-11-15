'use strict';
// I6.6: bounded, indexed, server-scoped read projection of the ACTIVE Cobros ledger.
// Never materialize proposals, infer payments, or authorize writes from staging.
const {validateActiveLedgerContract}=require('./cobros-ledger-contract');
const {allowRow,Denied}=require('./b4-003-scoped-access-boundary');
const {applicationIdFor}=require('./proposal-application-boundary');

const clean=value=>String(value??'').trim();
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/;
const SHA=/^[0-9a-f]{64}$/;
const STAGE_MAX=250;
const QUERY_BATCH=25;
const POLICY_MATCH_MAX=1000;

function requireId(value,code){
 const id=clean(value);
 if(!SAFE_ID.test(id))throw new Denied(code);
 return id;
}
function projectionRow({proposal,stageId,policy,policyId,client,tenantId,runId,ctx}){
 if(!proposal||proposal.tenantId!==tenantId||proposal.runId!==runId||
    !SHA.test(clean(proposal.sourceRowIdSha256))||!SHA.test(clean(proposal.payloadDigest))||
    !clean(proposal.sourceRowId)||!clean(proposal.policyNumber)||
    !clean(proposal.currency)||!Number.isFinite(Number(proposal.amount))||Number(proposal.amount)<0)
   throw new Denied('STAGE_PROPOSAL_INVALID');
 if(policy.tenantId&&policy.tenantId!==tenantId||client.tenantId&&client.tenantId!==tenantId)
   throw new Denied('STAGE_PARENT_TENANT_DENIED');
 const clientId=clean(policy.clienteId||policy.clientId);
 if(!clientId)throw new Denied('STAGE_PARENT_CLIENT_MISSING');
 allowRow(ctx,policy);
 const country=clean(policy.pais||policy.country).toUpperCase();
 if(!['GT','CO'].includes(country)||country!==ctx.country)
   throw new Denied('STAGE_PARENT_COUNTRY_DENIED');
 const advisor=clean(policy.asesorId||policy.advisorId||policy.ownerAdvisorId);
 const clientName=clean(client.nombre||client.razonSocial||client.nombreCompleto||client.name||
   [client.nombres,client.apellidos].filter(Boolean).join(' '));
 const amount=Math.round((Number(proposal.amount)+Number.EPSILON)*100)/100;
 return {
   id:stageId,canonicalDocumentId:stageId,tenantId,pais:country,asesorId:advisor,
   polizaId:policyId,clienteId:clientId,clienteNombre:clientName,polizaNumero:clean(policy.numero),
   monto:amount,moneda:clean(proposal.currency),
   estado:'PROPUESTA',status:'PROPUESTA',fuente:'Libro activo de cobros',
   motivo:'Verifica la fuente y el recibo exactos antes de aprobar y aplicar',
   proposalIdentity:clean(proposal.sourceRowIdSha256),
   source_ref:{file:'Libro activo',sheet:'Propuestas',
     row:clean(proposal.sourceRowIdSha256).slice(0,12),
     row_hash:clean(proposal.sourceRowIdSha256)},
   origenLibroActivo:true,readOnly:true,applicationPermitted:false,
   sourceRunId:runId
 };
}

async function readActiveLedgerProposalPage({db,tenant,tenantId,ctx,pageSize,cursor}){
 // Verify active pointer against the issuer ledger contract before returning any row.
 const data=tenant.collection('data');
 const items=name=>data.doc(name).collection('items');
 const pointerSnap=await items('cobrosLedgerControl').doc('active').get();
 if(!pointerSnap.exists)throw new Denied('STAGE_ACTIVE_POINTER_MISSING');
 const pointer=pointerSnap.data()||{},runId=requireId(pointer.activeRunId,'STAGE_RUN_ID_INVALID');
 const run=items('cobrosLedgerRuns').doc(runId),manifestSnap=await run.get();
 if(!manifestSnap.exists)throw new Denied('STAGE_ACTIVE_MANIFEST_MISSING');
 const manifest=manifestSnap.data()||{};
 try{validateActiveLedgerContract(pointer,manifest,tenantId);}
 catch(_){throw new Denied('STAGE_ACTIVE_MANIFEST_INVALID');}
 const staged=await run.collection('propuestasConciliacion')
   .orderBy('__name__').limit(STAGE_MAX+1).get();
 const proposals=Array.isArray(staged.docs)?staged.docs:[];
 if(proposals.length>STAGE_MAX||proposals.length!==manifest.expectedCounts.propuestasConciliacion)
   throw new Denied('STAGE_PROPOSAL_COUNT_MISMATCH');
 const numbers=[...new Set(proposals.map(d=>clean((d.data()||{}).policyNumber)).filter(Boolean))];
 if(!numbers.length)throw new Denied('STAGE_PROPOSAL_NUMBER_MISSING');
 // LIVE census: all 1,427 canonical policies use the indexed `numero` field.
 // Exact-equality IN batches retain unique matches AND unresolved editions.
 // Multiple editions are a selectable HOLD, not an invisible dead end. Scope
 // is checked before resolving any candidate's client or displaying a row.
 const byNumber=new Map();let matchedDocs=0;
 for(let i=0;i<numbers.length;i+=QUERY_BATCH){
   const selected=numbers.slice(i,i+QUERY_BATCH);
   const snap=await items('polizas').where('numero','in',selected).get();
   const docs=Array.isArray(snap.docs)?snap.docs:[];
   matchedDocs+=docs.length;
   if(matchedDocs>POLICY_MATCH_MAX)throw new Denied('STAGE_POLICY_JOIN_BOUND_EXCEEDED');
   for(const doc of docs){
     const p=doc.data()||{},key=clean(p.numero);
     if(!selected.includes(key))continue;
     if(!byNumber.has(key))byNumber.set(key,[]);
     byNumber.get(key).push({id:doc.id,row:p});
   }
 }
 const candidatePairs=[];
 for(const doc of proposals){
   const proposal=doc.data()||{},matches=byNumber.get(clean(proposal.policyNumber))||[];
   if(!SAFE_ID.test(doc.id))continue;
   const authorized=[];
   for(const policy of matches){
     if(!SAFE_ID.test(policy.id)||policy.row.tenantId&&policy.row.tenantId!==tenantId)continue;
     try{allowRow(ctx,policy.row);}catch(error){if(error instanceof Denied)continue;throw error;}
     if(clean(policy.row.pais||policy.row.country).toUpperCase()!==ctx.country)continue;
     const clientId=clean(policy.row.clienteId||policy.row.clientId);
     if(SAFE_ID.test(clientId))authorized.push({policy,clientId});
   }
   if(authorized.length)candidatePairs.push({proposal,id:doc.id,candidates:authorized,multipleEditions:matches.length!==1});
 }
 // A source's number alone never assigns a customer. Only authorized parents
 // are loaded; HOLD rows redact money and identities until an exact receipt is
 // linked by the separately authenticated resolution owner.
 const clients=new Map();
 const clientIds=[...new Set(candidatePairs.flatMap(p=>p.candidates.map(c=>c.clientId)))];
 for(let i=0;i<clientIds.length;i+=20){
   const batch=clientIds.slice(i,i+20);
   const refs=batch.map(id=>items('clientes').doc(id));
   const docs=typeof db?.getAll==='function'?await db.getAll(...refs):
     await Promise.all(refs.map(ref=>ref.get()));
   if(!Array.isArray(docs)||docs.length!==batch.length)
     throw new Denied('STAGE_CLIENT_BATCH_READBACK_INVALID');
   docs.forEach((d,index)=>clients.set(batch[index],d.exists?d.data()||{}:null));
 }
 const verified=[];
 for(const pair of candidatePairs){
   try{
     if(pair.proposal.sourceLedgerDigest!==manifest.sourceLedgerDigest||
        pair.proposal.packageLogicalSha256!==manifest.packageLogicalSha256)
       throw new Denied('STAGE_PROPOSAL_MANIFEST_MISMATCH');
     const available=pair.candidates.filter(candidate=>{
       const client=clients.get(candidate.clientId);return client&&(!client.tenantId||client.tenantId===tenantId);
     });
     if(!available.length)continue;
     const candidate=available[0],client=clients.get(candidate.clientId);
     const row=projectionRow({proposal:pair.proposal,stageId:pair.id,
       policy:candidate.policy.row,policyId:candidate.policy.id,client,tenantId,runId,ctx});
     if(pair.multipleEditions){
       Object.assign(row,{estado:'REQUIERE_VALIDACION',status:'REQUIERE_VALIDACION',
         motivo:'Póliza con varias ediciones: vincula el recibo exacto; no se ha seleccionado una edición ni aplicado dinero',
         requiresReceiptSelection:true,canonicalCandidateCount:available.length,
         polizaId:'',clienteId:'',clienteNombre:'Cliente por confirmar con el recibo',asesorId:'',monto:null,moneda:''});
     }
     verified.push(row);
   }catch(error){if(!(error instanceof Denied))throw error;}
 }
 const at=cursor?verified.findIndex(row=>row.canonicalDocumentId===cursor):-1;
 if(cursor&&at<0)throw new Denied('CURSOR_DENIED');
 const rows=verified.slice(at+1,at+1+pageSize);
 // Application is a separate audited record, never a mutation of staging.
 // Rehydrate its state so a successfully applied proposal does not return to
 // "pending review" after reload. Read only this authorized page's records.
 for(let i=0;i<rows.length;i+=20){
   const batch=rows.slice(i,i+20);
   const refs=batch.map(row=>items('reconciliationApplications').doc(applicationIdFor(tenantId,runId,row.canonicalDocumentId)));
   const docs=typeof db?.getAll==='function'?await db.getAll(...refs):await Promise.all(refs.map(ref=>ref.get()));
   docs.forEach((doc,index)=>{
     if(!doc.exists)return;
     const applied=doc.data()||{},row=batch[index];
     const original=candidatePairs.find(pair=>pair.id===row.canonicalDocumentId);
     try{allowRow(ctx,applied.scopeAnchor||{});}catch(error){if(error instanceof Denied)return;throw error;}
     if(applied.status==='APPLIED'&&applied.tenantId===tenantId&&applied.sourceRunId===runId&&
        applied.proposalId===row.canonicalDocumentId&&original&&applied.sourceProposalDigest===original.proposal.payloadDigest){
       row.estado='APLICADA';row.status='APLICADA';row.applicationStatus='APPLIED';
       row.applicationId=doc.id;row.motivo='Aplicada mediante evidencia y recibo verificados; registro auditado independiente del libro de origen';
     }
   });
 }
 const more=verified.length>at+1+pageSize;
 return {ok:true,serverScoped:true,collection:'conciliaciones',country:ctx.country,scope:ctx.scope,
   rows,nextCursor:more?rows[rows.length-1].canonicalDocumentId:null,
   anchoring:'active_ledger_authorized_unique_or_explicit_edition_hold_verified_canonical_scope_readonly'};
}

module.exports={readActiveLedgerProposalPage,projectionRow};
