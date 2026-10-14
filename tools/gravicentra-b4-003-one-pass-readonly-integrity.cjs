'use strict';
// Existing B4-003: bounded operational evidence. Uses Admin only for READS.
// No Firestore/Auth/Storage writes and no person-identifying rows in the receipt.
const fs=require('node:fs'),crypto=require('node:crypto');
const {initializeApp,applicationDefault,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const assert=require('node:assert/strict');
const projectId='ays-orbit-360-lab',tenantId='alianzas-soluciones';
const allowed=['clientes','polizas','recibosEsperados','carteraPrimas','cobros','vehiculos','negocios','gestiones','metas'];
const app=initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),safe=x=>String(x==null?'':x).trim(),norm=x=>safe(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const hash=x=>crypto.createHash('sha256').update(safe(x)).digest('hex').slice(0,12);
const result={schema:'GRAVICENTRA_B4_003_ONE_PASS_READONLY_INTEGRITY_V1',gate:'I6.5/B4-003',head:process.env.CANDIDATE_SOURCE_SHA||process.env.GITHUB_SHA||'',projectId,tenantId,status:'PENDING',collections:{},relationships:{},specificRegression:{},readOnly:true,realBusinessWrites:0,authWrites:0,hostingDeploy:false,sharedRulesDeploy:false,scopeByRoleNotVerified:true,visualPass:false,productionAccepted:false};
async function main(){
  const sets={};
  for(const name of allowed){
    const col=db.collection('tenants').doc(tenantId).collection('data').doc(name).collection('items');
    const snap=await col.limit(3001).get();
    if(snap.docs.length>3000)throw Error('READ_BOUND_EXCEEDED_'+name);
    const rows=snap.docs.map(d=>({...(d.data()||{}),id:(d.data()||{}).id||d.id,canonicalDocumentId:d.id}));
    sets[name]=rows;
    result.collections[name]={count:rows.length,country:{GT:rows.filter(x=>safe(x.pais||x.country)==='GT').length,CO:rows.filter(x=>safe(x.pais||x.country)==='CO').length},missingCountry:rows.filter(x=>!safe(x.pais||x.country)).length,missingAdvisor:rows.filter(x=>!safe(x.asesorId||x.advisorId)).length};
  }
  const clients=new Map(sets.clientes.map(r=>[r.id,r])),policies=new Map(sets.polizas.map(r=>[r.id,r]));
  const stats={};
  for(const collection of ['recibosEsperados','carteraPrimas','cobros','vehiculos']){
    const rows=sets[collection],anchored=rows.filter(r=>safe(r.polizaId||r.policyId));
    const orphans=anchored.filter(r=>!policies.has(safe(r.polizaId||r.policyId)));
    const linked=anchored.filter(r=>policies.has(safe(r.polizaId||r.policyId)));
    const mismatches=linked.filter(r=>{
      const p=policies.get(safe(r.polizaId||r.policyId));return safe(r.clienteId)&&safe(p.clienteId)&&safe(r.clienteId)!==safe(p.clienteId);
    });
    stats[collection]={total:rows.length,withPolicyAnchor:anchored.length,withoutPolicyAnchor:rows.length-anchored.length,orphanPolicyCount:orphans.length,clientRelationMismatchCount:mismatches.length,orphanWithoutPersonalIds:true};
  }
  result.relationships=stats;
  const policyByDocumentId=new Map(sets.polizas.map(x=>[x.canonicalDocumentId,x]));
  const aliasMismatches=sets.polizas.filter(x=>x.canonicalDocumentId!==x.id).length;
  const clientByDocumentId=new Map(sets.clientes.map(x=>[x.canonicalDocumentId,x]));
  const recovered={};
  for(const collection of ['recibosEsperados','carteraPrimas','cobros','vehiculos']){
    const rows=sets[collection];
    let aliasAnchor=0,clientAdvisorDisagreement=0,receiptPolicyAdvisorDisagreement=0,countryInherited=0;
    for(const row of rows){
      const id=safe(row.polizaId||row.policyId),policy=policies.get(id)||policyByDocumentId.get(id);
      if(!policy)continue;
      if(!policies.has(id)&&policyByDocumentId.has(id))aliasAnchor++;
      const cli=clients.get(safe(policy.clienteId))||clientByDocumentId.get(safe(policy.clienteId));
      if(cli&&safe(policy.asesorId)&&safe(cli.asesorId)&&safe(policy.asesorId)!==safe(cli.asesorId))clientAdvisorDisagreement++;
      if(safe(row.asesorId)&&safe(policy.asesorId)&&safe(row.asesorId)!==safe(policy.asesorId))receiptPolicyAdvisorDisagreement++;
      if(!safe(row.pais||row.country)&&safe(policy.pais||policy.country))countryInherited++;
    }
    recovered[collection]={aliasPolicyAnchorCount:aliasAnchor,linkedPolicyClientAdvisorDisagreementRows:clientAdvisorDisagreement,childPolicyAdvisorDisagreementRows:receiptPolicyAdvisorDisagreement,countryResolvableFromLinkedPolicy:countryInherited};
  }
  const workflow={};
  for(const collection of ['negocios','gestiones']){
    let missingCountry=0,relatedCountry=0,missingAdvisor=0,relatedAdvisor=0;
    for(const row of sets[collection]){
      const pol=policies.get(safe(row.polizaId))||policyByDocumentId.get(safe(row.polizaId));
      const cli=clients.get(safe(row.clienteId))||clientByDocumentId.get(safe(row.clienteId));
      const parent=pol||cli;
      if(!safe(row.pais||row.country)){missingCountry++;if(parent&&safe(parent.pais||parent.country))relatedCountry++;}
      if(!safe(row.asesorId||row.advisorId)){missingAdvisor++;if(parent&&safe(parent.asesorId||parent.advisorId))relatedAdvisor++;}
    }
    workflow[collection]={missingCountry,missingCountryRecoverableViaVerifiedParent:relatedCountry,missingAdvisor,missingAdvisorRecoverableViaVerifiedParent:relatedAdvisor};
  }
  // No raw document IDs, names, emails or monetary amounts enter this audit.
  // This distinguishes legitimate legacy missing country from empty source data.
  const classification={};
  for(const collection of ['negocios','gestiones']){
    const rows=sets[collection],notCountry=rows.filter(x=>!safe(x.pais||x.country));
    const grouped={};
    for(const row of notCountry){
      const linkedPolicy=policies.get(safe(row.polizaId))||policyByDocumentId.get(safe(row.polizaId));
      const linkedClient=clients.get(safe(row.clienteId))||clientByDocumentId.get(safe(row.clienteId));
      const viaBusiness=sets.negocios.find(x=>x.id===safe(row.negocioId)||x.canonicalDocumentId===safe(row.negocioId));
      const key=linkedPolicy?'POLICY':linkedClient?'CLIENT':viaBusiness?'BUSINESS':'NO_VERIFIED_PARENT';
      grouped[key]=(grouped[key]||0)+1;
    }
    classification[collection]={missingCountry:notCountry.length,sourceSyntheticFlags:notCountry.filter(x=>x.__syntheticQa===true||x.syntheticQa===true).length,
      qaIdPrefixes:notCountry.filter(x=>/^(b4|qa[_-]|test[_-])/i.test(safe(x.id))).length,
      withoutAdvisor:notCountry.filter(x=>!safe(x.asesorId||x.advisorId)).length,verifiedParentKinds:grouped};
  }
  const orphans={};
  for(const collection of ['recibosEsperados','carteraPrimas','vehiculos']){
    const orphanRows=sets[collection].filter(x=>!policies.has(safe(x.polizaId||x.policyId))&&!policyByDocumentId.has(safe(x.polizaId||x.policyId)));
    orphans[collection]={count:orphanRows.length,qaPrefixCount:orphanRows.filter(x=>/^(b2-|b4-|qa[_-]|test[_-])/i.test(safe(x.polizaId||x.policyId))).length,
      syntheticMarked:orphanRows.filter(x=>x.__syntheticQa===true||x.syntheticQa===true).length};
  }
  result.authorityClassification={commercialCountryGaps:classification,orphanPolicyReferences:orphans,unauthorizedParentFallback:false,noRawIdentifiers:true};
  result.authorizationInputs={physicalPolicyIdVsStoredIdCount:aliasMismatches,linkedData:recovered,commercialAndOps:workflow,noPrivilegeInferred:true};

  const matched=sets.clientes.filter(c=>norm(c.nombre).includes('oscar haroldo')&&norm(c.nombre).includes('padilla'));
  result.specificRegression={case:'OSCAR_HAROLDO_PADILLA',clientMatches:matched.length,clients:matched.map(c=>{
    const related=sets.polizas.filter(p=>safe(p.clienteId)===c.id),policyIds=new Set(related.map(p=>p.id));
    return {caseHash:hash(c.id),policies:related.length,expectedReceipts:sets.recibosEsperados.filter(r=>policyIds.has(safe(r.polizaId||r.policyId))).length,portfolioRows:sets.carteraPrimas.filter(r=>policyIds.has(safe(r.polizaId||r.policyId))).length,vehicles:sets.vehiculos.filter(r=>policyIds.has(safe(r.polizaId||r.policyId))).length};
  })};
  // No individual target values or identifying advisor IDs in this receipt.
  const goalMonths=[...new Set(sets.metas.map(x=>safe(x.mes||x.periodo).slice(0,7)).filter(x=>/^[0-9]{4}-[0-9]{2}$/.test(x)))].sort().slice(-4);
  const groupedGoals={};
  for(const month of goalMonths){
    groupedGoals[month]={};
    for(const country of ['GT','CO']){
      const source=sets.metas.filter(g=>safe(g.mes||g.periodo).slice(0,7)===month
        &&(safe(g.pais).toUpperCase()===country||safe(g.moneda).toUpperCase()===(country==='GT'?'GTQ':'COP')));
      const types={};
      for(const type of ['nueva','renovada','recaudo','prima']){
        const selected=source.filter(g=>norm(g.tipo)===type),institutional=selected.filter(g=>!safe(g.asesorId||g.advisorId));
        types[type]={records:selected.length,institutionalGoals:institutional.length,advisorGoals:selected.length-institutional.length,
          institutionalHasPositiveTarget:institutional.some(g=>Number(g.valor)>0), noValuesDisclosed:true};
      }
      groupedGoals[month][country]=types;
    }
  }
  result.institutionalGoalAuthority={status:'READONLY_CONFIGURED_TARGET_CARDINALITY_NOT_ATTESTED_UI',months:groupedGoals,
    source:'tenants/'+tenantId+'/data/metas/items',writes:0,amountsDisclosed:false};
  result.status='READONLY_CARDINALITY_AND_RELATION_AUDIT_COMPLETE_NOT_AUTHENTICATED_SCOPE_PASS';
}
main().catch(e=>{result.status='FAIL';result.errorCode=safe(e.message).slice(0,120);process.exitCode=1;}).finally(async()=>{
 const file=process.env.B4_003_ONEPASS_OUT||'/tmp/b4-003-onepass-readonly.json';
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 await deleteApp(app);
 console.log('B4_003_ONEPASS_READONLY='+result.status);
});
