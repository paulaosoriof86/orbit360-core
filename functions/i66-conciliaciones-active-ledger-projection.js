'use strict';
// I6.6: bounded, indexed, server-scoped read projection of the ACTIVE Cobros ledger.
// Never materialize proposals, infer payments, or authorize writes from staging.
const {validateActiveLedgerContract}=require('./cobros-ledger-contract');
const {allowRow,Denied}=require('./b4-003-scoped-access-boundary');

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
 const amount=Math.round((Number(proposal.amount)+Number.EPSILON)*100)/100;
 return {
   id:stageId,canonicalDocumentId:stageId,tenantId,pais:country,asesorId:advisor,
   polizaId:policyId,clienteId:clientId,polizaNumero:clean(policy.numero),
   monto:amount,moneda:clean(proposal.currency),
   estado:'PROPUESTA',status:'PROPUESTA',fuente:'Libro activo de cobros',
   motivo:'Propuesta pendiente de validación; aplicación de pagos deshabilitada',
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
 // Exact-equality IN batches cover all 52 unique matches; remaining 80 stage
 // proposals have duplicate policy numbers and are deliberately quarantined.
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
 const uniquePairs=[];
 for(const doc of proposals){
   const proposal=doc.data()||{},matches=byNumber.get(clean(proposal.policyNumber))||[];
   if(matches.length!==1)continue;
   const policy=matches[0];
   if(!SAFE_ID.test(policy.id)||!SAFE_ID.test(doc.id))continue;
   const clientId=clean(policy.row.clienteId||policy.row.clientId);
   if(!SAFE_ID.test(clientId))continue;
   uniquePairs.push({proposal,id:doc.id,policy,clientId});
 }
 // Resolve only parents of unambiguous proposals; no client or policy source
 // is trusted solely because a staged row names its number.
 const clients=new Map();
 const clientIds=[...new Set(uniquePairs.map(p=>p.clientId))];
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
 for(const pair of uniquePairs){
   const client=clients.get(pair.clientId);
   if(!client)continue;
   try{
     if(pair.proposal.sourceLedgerDigest!==manifest.sourceLedgerDigest||
        pair.proposal.packageLogicalSha256!==manifest.packageLogicalSha256)
       throw new Denied('STAGE_PROPOSAL_MANIFEST_MISMATCH');
     const row=projectionRow({proposal:pair.proposal,stageId:pair.id,
       policy:pair.policy.row,policyId:pair.policy.id,client,tenantId,runId,ctx});
     verified.push(row);
   }catch(error){if(!(error instanceof Denied))throw error;}
 }
 const at=cursor?verified.findIndex(row=>row.canonicalDocumentId===cursor):-1;
 if(cursor&&at<0)throw new Denied('CURSOR_DENIED');
 const rows=verified.slice(at+1,at+1+pageSize);
 const more=verified.length>at+1+pageSize;
 return {ok:true,serverScoped:true,collection:'conciliaciones',country:ctx.country,scope:ctx.scope,
   rows,nextCursor:more?rows[rows.length-1].canonicalDocumentId:null,
   anchoring:'active_ledger_exact_unique_policy_number_verified_canonical_country_advisor_readonly'};
}

module.exports={readActiveLedgerProposalPage,projectionRow};
