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
  // Read-only discriminant: which legacy Ops/Leads records could be recovered
  // from canonical parents without altering Firestore or assuming a user's scope?
  // Counts are source-classification evidence, never proof of authorization.
  result.legacyWorkflowCountryResolution={};
  for(const collection of ['negocios','gestiones']){
    const tally={missingCountry:0,verifiedParentCountry:0,missingParentOrCountry:0,
      tenantConflict:0,clientPolicyConflict:0,countryConflict:0,
      consistentUniqueAdvisor:0,advisorConflictOrMissing:0,
      GT:0,CO:0,sourceOnlyNotAuthenticated:true};
    for(const row of sets[collection].filter(x=>!safe(x.pais||x.country))){
      tally.missingCountry++;
      const policy=policies.get(safe(row.polizaId||row.policyId))||
        policyByDocumentId.get(safe(row.polizaId||row.policyId));
      const linkedClient=clients.get(safe(row.clienteId||row.clientId))||
        clientByDocumentId.get(safe(row.clienteId||row.clientId));
      const parent=policy||linkedClient;
      if(!parent){tally.missingParentOrCountry++;continue;}
      if(parent.tenantId&&safe(parent.tenantId)!==tenantId||
        row.tenantId&&safe(row.tenantId)!==tenantId){
        tally.tenantConflict++;continue;
      }
      if(policy&&linkedClient&&safe(policy.clienteId)&&
        safe(policy.clienteId)!==safe(linkedClient.id)){
        tally.clientPolicyConflict++;continue;
      }
      const country=safe(parent.pais||parent.country).toUpperCase();
      if(!['GT','CO'].includes(country)){tally.missingParentOrCountry++;continue;}
      if(linkedClient&&policy&&safe(linkedClient.pais||linkedClient.country)&&
        safe(linkedClient.pais||linkedClient.country).toUpperCase()!==country){
        tally.countryConflict++;continue;
      }
      tally.verifiedParentCountry++;tally[country]++;
      const advisors=[...new Set([row.asesorId,row.advisorId,row.ownerAdvisorId,
        parent.asesorId,parent.advisorId,parent.ownerAdvisorId].map(safe).filter(Boolean))];
      if(advisors.length===1)tally.consistentUniqueAdvisor++;
      else tally.advisorConflictOrMissing++;
    }
    result.legacyWorkflowCountryResolution[collection]=tally;
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
  // B4-003 UAT2 precise canonical configuration/roster readback.
  // All output is aggregate/role-level only. Never expose UID, names, email,
  // policy numbers, raw IDs, documents, credentials or individual records.
  const tenant=db.collection('tenants').doc(tenantId);
  const [accessSnap,previewAccessSnap,memberSnap]=await Promise.all([
    tenant.collection('config').doc('access').get(),
    tenant.collection('previewUatConfig').doc('access').get(),
    tenant.collection('members').limit(251).get()
  ]);
  if(memberSnap.size>250)throw Error('B4_003_MEMBERSHIP_READ_BOUND_EXCEEDED');
  const access=accessSnap.exists?accessSnap.data()||{}:{};
  const rolePermissions=access.rolePermissions&&typeof access.rolePermissions==='object'?access.rolePermissions:{};
  const roleScopes=access.roleScopes&&typeof access.roleScopes==='object'?access.roleScopes:{};
  const moduleNames=['cancelaciones','cliente360','polizas','cobros','ops','leads','equipo','aseguradoras'];
  const roles=['Dirección','SuperAdmin','AdminTenant','Admin','Operativo','Asesor','Comercial','Finanzas'];
  const grant=(role,moduleKey,action)=>{
    const roleKey=Object.keys(rolePermissions).find(key=>norm(key)===norm(role));
    const entry=roleKey&&rolePermissions[roleKey]&&typeof rolePermissions[roleKey]==='object'?rolePermissions[roleKey]:{};
    const moduleName=Object.keys(entry).find(key=>norm(key)===norm(moduleKey));
    const flags=moduleName&&entry[moduleName]&&typeof entry[moduleName]==='object'?entry[moduleName]:null;
    return flags&&typeof flags[action]==='boolean'?flags[action]:null;
  };
  result.canonicalAccessConfigReadback={
    canonicalDocumentExists:accessSnap.exists,
    previewIsolatedDocumentExists:previewAccessSnap.exists,
    storedRolesWithPermissions:Object.keys(rolePermissions).length,
    scopesDefined:Object.keys(roleScopes).length,
    securitySemantics:'null means no explicit server override; a UI checkbox alone is not an authorization',
    modules:Object.fromEntries(roles.map(role=>[role,Object.fromEntries(moduleNames.map(moduleKey=>[
      moduleKey,{ver:grant(role,moduleKey,'ver'),editar:grant(role,moduleKey,'editar')}
    ]))])),
    roleScopes:Object.fromEntries(roles.map(role=>{
      const key=Object.keys(roleScopes).find(x=>norm(x)===norm(role));
      const v=key?safe(roleScopes[key]).toLowerCase():'';
      return[role,['all','todos','team','equipo','own','propios','none','ninguno'].includes(v)?v:null];
    })),
    noFullConfigOrPersonalIdentityExported:true,fromServerAdminReadOnly:true
  };
  const membershipRows=memberSnap.docs.map(doc=>doc.data()||{});
  const membershipRoles={};
  const stateBuckets={active:0,inactive:0,pending:0,other:0};
  const administrativeRoles=new Set(['direccion','superadmin','admintenant','admin','finanzas']);
  let adminMemberships=0,multiRoleMemberships=0;
  for(const m of membershipRows){
    const roleSet=[...new Set([...(Array.isArray(m.roles)?m.roles:[]),m.rol,m.role].map(norm).filter(Boolean))];
    const state=norm(m.status||m.estado);
    if(['active','activo'].includes(state)&&m.inactivo!==true&&m.active!==false&&m.activo!==false)stateBuckets.active++;
    else if(['invited','invitado','pending','pendiente'].includes(state))stateBuckets.pending++;
    else if(['disabled','inactive','inactivo','blocked','bloqueado','suspended'].includes(state)||m.inactivo===true||m.active===false)stateBuckets.inactive++;
    else stateBuckets.other++;
    for(const role of roleSet)membershipRoles[role]=(membershipRoles[role]||0)+1;
    if(roleSet.some(x=>administrativeRoles.has(x)))adminMemberships++;
    if(roleSet.length>1)multiRoleMemberships++;
  }
  result.canonicalTeamMembershipReadback={
    memberDocuments:membershipRows.length,status:stateBuckets,
    roleCounts:membershipRoles,administrativeMemberships:adminMemberships,
    multiRoleMemberships,source:'tenants/'+tenantId+'/members',
    notes:'membership counts are not proof of user directory projection or exact UID authorization',
    noNamesEmailsUidsOrMemberDocs:true
  };
  const activePolicy=p=>p&&['Vigente','Por renovar'].includes(safe(p.estado));
  const policyRows=sets.polizas,clientRows=sets.clientes;
  const canonicalClientIds=new Set(clientRows.map(c=>safe(c.id||c.canonicalDocumentId)).filter(Boolean));
  const nonDeletedClientIds=new Set(clientRows.filter(c=>
    !(c.deleted===true||c.eliminado===true||c.estado==='eliminado'||c.inactivo===true||c.activo===false)
  ).map(c=>safe(c.id||c.canonicalDocumentId)).filter(Boolean));
  const policyNoClientLink=policyRows.filter(p=>!safe(p.clienteId)).length;
  const policyClientMissing=policyRows.filter(p=>safe(p.clienteId)&&!canonicalClientIds.has(safe(p.clienteId)));
  const policyClientNonDeleted=policyRows.filter(p=>nonDeletedClientIds.has(safe(p.clienteId)));
  const byCountry={};
  for(const country of ['GT','CO']){
    const ps=policyRows.filter(p=>safe(p.pais||p.country).toUpperCase()===country);
    const linked=ps.filter(p=>nonDeletedClientIds.has(safe(p.clienteId)));
    byCountry[country]={
      policiesAll:ps.length,policiesActiveAll:ps.filter(activePolicy).length,
      linkedNonDeletedClients:linked.length,linkedActive:linked.filter(activePolicy).length,
      notLinkedToVisibleNonDeletedClient:ps.length-linked.length
    };
  }
  const typeCounts={};
  for(const c of clientRows){
    const key=safe(c.tipo||'(sin tipo)').slice(0,70);
    typeCounts[key]=(typeCounts[key]||0)+1;
  }
  result.client360PolicyUniverseCausalReadback={
    fullPolicies:policyRows.length,fullActive:policyRows.filter(activePolicy).length,
    fullClients:clientRows.length,nonDeletedClients:nonDeletedClientIds.size,
    linkedToNonDeletedClients:policyClientNonDeleted.length,
    linkedActive:policyClientNonDeleted.filter(activePolicy).length,
    policyMissingClientId:policyNoClientLink,
    policyClientIdNotInCanonicalClients:policyClientMissing.length,
    countryBreakdown:byCountry,clientTypeVocabularyCounts:typeCounts,
    exactIdJoinUsed:true,uiScopedUniverseNotAttested:true,
    noPolicyNumbersOrRawRecordIdsExported:true
  };

  // B4-003 UAT2: deterministic, field-exact CANCELACIONES configuration
  // dry-run. This NEVER calls set/update/transaction or a write-capable API.
  // Future writes MUST independently verify the same document updateTime and
  // active owner UID/role against the server before touching even these fields.
  function explicitCanonicalFlag(role,action){
    const keys=Object.keys(rolePermissions).filter(key=>norm(key)===norm(role));
    if(keys.length!==1)throw Error('CANCEL_ACCESS_ROLE_MISSING_OR_ALIAS_COLLISION_'+role);
    const perm=rolePermissions[keys[0]];
    const modules=Object.keys(perm||{}).filter(key=>norm(key)==='cancelaciones');
    if(modules.length!==1)throw Error('CANCEL_ACCESS_MODULE_MISSING_OR_ALIAS_COLLISION_'+role);
    if(typeof perm[modules[0]][action]!=='boolean')throw Error('CANCEL_ACCESS_ACTION_NOT_BOOLEAN_'+role+'_'+action);
    return{roleKey:keys[0],moduleKey:modules[0],value:perm[modules[0]][action]};
  }
  if(!accessSnap.exists)throw Error('CANCEL_ACCESS_CANONICAL_DOCUMENT_MISSING');
  const affectedRoles=['Operativo','Asesor'];
  const sourceFlags=affectedRoles.map(role=>({
    role,view:explicitCanonicalFlag(role,'ver'),edit:explicitCanonicalFlag(role,'editar')
  }));
  if(sourceFlags.some(x=>x.view.value!==false||x.edit.value!==false))
    throw Error('CANCEL_ACCESS_BEFORE_IMAGE_NO_LONGER_MATCHES_UAT2');
  const scopeKeys=Object.keys(roleScopes),roleScopeValue=role=>{
    const keys=scopeKeys.filter(key=>norm(key)===norm(role));
    if(keys.length!==1)throw Error('CANCEL_ACCESS_SCOPE_MISSING_OR_ALIAS_COLLISION_'+role);
    return safe(roleScopes[keys[0]]).toLowerCase();
  };
  const operativeScope=roleScopeValue('Operativo'),advisorScope=roleScopeValue('Asesor');
  if(operativeScope!=='all'||advisorScope!=='own')
    throw Error('CANCEL_ACCESS_ROLE_SCOPE_CHANGED_SAFE_STOP');
  const permissionBefore=JSON.stringify(rolePermissions),scopesBefore=JSON.stringify(roleScopes);
  const proposed=JSON.parse(permissionBefore);
  const fieldDiff=sourceFlags.map(({role,view})=>{
    proposed[view.roleKey][view.moduleKey].ver=true;
    return{path:'rolePermissions.'+view.roleKey+'.'+view.moduleKey+'.ver',before:false,after:true,
      forbiddenEditMutation:true};
  });
  // Independently assert only the two intended flags differ.
  const changes=[];
  for(const [roleKey,modules] of Object.entries(rolePermissions)){
    for(const [moduleKey,actions] of Object.entries(modules||{})){
      for(const [action,value] of Object.entries(actions||{})){
        if(proposed[roleKey]?.[moduleKey]?.[action]!==value)
          changes.push('rolePermissions.'+roleKey+'.'+moduleKey+'.'+action);
      }
    }
  }
  if(changes.length!==2||changes.slice().sort().join('|')!==fieldDiff.map(x=>x.path).sort().join('|')
    ||JSON.stringify(roleScopes)!==scopesBefore)
    throw Error('CANCEL_ACCESS_DELTA_WIDENED_OR_SCOPE_CHANGED');
  result.cancelacionesExactAccessDryRun={
    status:'PASS_FIELD_EXACT_DRY_RUN_NO_WRITE',baselineFrom:'tenants/'+tenantId+'/config/access',
    realConfigExists:true,isolatedPreviewConfigExists:previewAccessSnap.exists,
    expectedOwnerRoles:affectedRoles,patch:fieldDiff,
    roleScopesUnchanged:{Operativo:operativeScope,Asesor:advisorScope},
    editRightsPreserved:{Operativo:false,Asesor:false},
    unchangedOtherPermissionsVerified:true,
    storedOtherRolePermissionEntries:Object.keys(rolePermissions).length,
    permissionDigestBefore:crypto.createHash('sha256').update(permissionBefore).digest('hex'),
    permissionDigestAfter:crypto.createHash('sha256').update(JSON.stringify(proposed)).digest('hex'),
    canonicalConfigUpdateTime:accessSnap.updateTime&&typeof accessSnap.updateTime.toMillis==='function'?accessSnap.updateTime.toMillis():null,
    futureMutationRequiresNewReadback:true,configWritesAuthorized:false,
    businessWrites:0,productionMutation:false,sharedRulesDeploy:false,
    serverScopedPositiveNegativeRoleQA:'PENDING',realSignedGTCO:'HOLD',
    result:'DRY_RUN_ONLY_NOT_APPLIED_NOT_AUTHORIZATION_ACCEPTED',
    noNamesUserIdsCredentialsOrRawConfig:true
  };

  result.status='READONLY_CARDINALITY_AND_RELATION_AUDIT_COMPLETE_NOT_AUTHENTICATED_SCOPE_PASS';
}
main().catch(e=>{result.status='FAIL';result.errorCode=safe(e.message).slice(0,120);process.exitCode=1;}).finally(async()=>{
 const file=process.env.B4_003_ONEPASS_OUT||'/tmp/b4-003-onepass-readonly.json';
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 await deleteApp(app);
 console.log('B4_003_ONEPASS_READONLY='+result.status);
});
