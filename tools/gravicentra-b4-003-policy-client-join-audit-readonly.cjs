'use strict';
// P0 physical join audit. Admin SDK is used ONLY for bounded aggregate reads;
// this cannot establish a real signed-user UAT or authorize a data migration.
const fs=require('node:fs');
const {resolve,allowRow,Denied}=require('../functions/b4-003-scoped-access-boundary');
const {resolveClientCountry,clientCountryNeedsInsurer}=require('../functions/b4-003-client-country-authority');
const PROJECT='ays-orbit-360-lab',TENANT='alianzas-soluciones';
const clean=v=>String(v==null?'':v).trim();
const country=v=>String(v==null?'':v).trim().toUpperCase();
const increment=(obj,key)=>{obj[key]=(obj[key]||0)+1;};
const permitted=(ctx,row)=>{try{return !!allowRow(ctx,row);}catch(e){if(e instanceof Denied)return false;throw e;}};
const asArray=value=>Array.isArray(value)?value:value==null?[]:[value];
const roleList=member=>[...new Set([...asArray(member.roles),...asArray(member.rolesAsignados),
 member.rol,member.role,member.defaultRole,member.rolDefault].map(clean).filter(Boolean))];
// C gate: compare the *exact document-ID sets* inside the privileged bounded
// reader. Export only aggregate counts and deterministic digests, never IDs.
function auditCountryClientParity({clients=[],policies=[]}){
 const crypto=require('node:crypto');
 const id=v=>clean(v&&v.id);
 const isMerged=c=>!!c&&(c.fusionado===true||!!clean(c.mergedIntoClientId));
 const isQa=x=>!!x&&(x.__syntheticQa===true||x.syntheticQa===true||
   /^B2 QA firme(?:\s|$)/i.test(clean(x.sourceRef)));
 const physicalClientById=new Map(clients.map(c=>[id(c),c]));
 const commercialClients=clients.filter(c=>!isMerged(c));
 const coClientIds=new Set(commercialClients.filter(c=>country(c.pais)==='CO').map(id));
 const byCountry={GT:0,CO:0,OTHER:0};
 for(const c of commercialClients){const k=country(c.pais);byCountry[k==='GT'||k==='CO'?k:'OTHER']++;}
 const pc=p=>country(p.pais||p.country||
   physicalClientById.get(clean(p.clienteId||p.clientId))?.pais);
 const policyId=p=>id(p);
 const policyQa=p=>isQa(p)||isQa(physicalClientById.get(clean(p.clienteId||p.clientId)));
 const coCountryPolicies=policies.filter(p=>pc(p)==='CO');
 const coCountryCommercial=coCountryPolicies.filter(p=>!policyQa(p));
 const coClientLinkedAll=policies.filter(p=>coClientIds.has(clean(p.clienteId||p.clientId)));
 const coClientLinkedCommercial=coClientLinkedAll.filter(p=>!policyQa(p));
 const coAllCountrySet=new Set(coCountryPolicies.map(policyId));
 const coAllClientSet=new Set(coClientLinkedAll.map(policyId));
 const coCountrySet=new Set(coCountryCommercial.map(policyId));
 const coClientSet=new Set(coClientLinkedCommercial.map(policyId));
 const onlyClient=[...coClientSet].filter(x=>!coCountrySet.has(x));
 const onlyPolicy=[...coCountrySet].filter(x=>!coClientSet.has(x));
 const same=[...coCountrySet].filter(x=>coClientSet.has(x));
 const digest=rows=>crypto.createHash('sha256').update([...rows].sort().join('\n')).digest('hex');
 const qaExplicit=policies.filter(p=>p.__syntheticQa===true||p.syntheticQa===true);
 const qaB2=policies.filter(p=>/^B2 QA firme(?:\s|$)/i.test(clean(p.sourceRef)));
 const qaUnion=new Set([...qaExplicit,...qaB2].map(policyId));
 const qaOverlap=qaExplicit.filter(p=>qaB2.some(q=>id(q)===id(p))).length;
 return {
  schema:'GRAVICENTRA_B4003_COUNTRY_CLIENT_POLICY_ID_SET_PARITY_V1',
  mode:'EXACT_ID_COMPARISON_AGGREGATE_ONLY_NO_IDENTIFIERS',
  clientUniverse:{physical:clients.length,merged:clients.length-commercialClients.length,
    commercial:commercialClients.length,commercialByCountry:byCountry},
  policyUniverse:{physical:policies.length,countryCOAll:coCountryPolicies.length,
    countryCOCommercial:coCountryCommercial.length,coClientLinkedAll:coClientLinkedAll.length,
    coClientLinkedCommercial:coClientLinkedCommercial.length},
  setParityCOAll:{intersection:[...coAllCountrySet].filter(x=>coAllClientSet.has(x)).length,
    onlyInClientCentric:[...coAllClientSet].filter(x=>!coAllCountrySet.has(x)).length,
    onlyInPolicyCountry:[...coAllCountrySet].filter(x=>!coAllClientSet.has(x)).length,
    policyCountryDigest:digest(coAllCountrySet),clientCentricDigest:digest(coAllClientSet)},
  setParityCO:{intersection:same.length,onlyInClientCentric:onlyClient.length,
    onlyInPolicyCountry:onlyPolicy.length,symmetricDifference:onlyClient.length+onlyPolicy.length,
    policyCountryDigest:digest(coCountrySet),clientCentricDigest:digest(coClientSet)},
  qaProvenance:{explicit:qaExplicit.length,b2Source:qaB2.length,
    overlap:qaOverlap,union:qaUnion.size},
  roleSignedUat:false,recordIdentifiersExported:false,writes:0,authWrites:0,securityChanges:0
 };
}

function auditDataset({clients=[],policies=[],insurers=[],members=[],config={},tenantId=TENANT}){
 const byClient=new Map(clients.map(c=>[clean(c.id),c]));
 const byInsurer=new Map(insurers.map(a=>[clean(a.id),a]));
 const linked=new Map();
 const missingPhysicalIds=new Set(),referencedClientIds=new Set();
 for(const p of policies){const id=clean(p.clienteId||p.clientId);if(!linked.has(id))linked.set(id,[]);linked.get(id).push(p);}
 const authority=new Map(),clientCountries={explicit:{},inferred:{},unresolved:{},
   readProjectionBoundExceeded:0};
 for(const client of clients){
   const clientId=clean(client.id);
   const result=resolveClientCountry({client,clientId,tenantId,
     policies:linked.get(clean(client.id))||[],insurers:byInsurer,completePolicySet:true});
   authority.set(clean(client.id),result);
   if(clientCountryNeedsInsurer(client)&&(linked.get(clientId)||[]).length>100)
    clientCountries.readProjectionBoundExceeded++;
   const type=result.status==='unresolved'?'unresolved':result.source==='insurer'?'inferred':'explicit';
   increment(clientCountries[type],type==='unresolved'?result.reason:result.country);
 }
 const join={policies:policies.length,clientIdMissing:0,physicalClientMissing:0,
   linkedClientExplicitSameCountry:0,linkedClientExplicitOtherCountry:0,
   linkedClientInsurerFallbackEligible:0,linkedClientCountryUnresolved:0};
 for(const p of policies){
   const id=clean(p.clienteId||p.clientId);
   if(!id){join.clientIdMissing++;continue;}
   referencedClientIds.add(id);
   const client=byClient.get(id);
   if(!client){join.physicalClientMissing++;missingPhysicalIds.add(id);continue;}
   const result=authority.get(id);
   if(result.status!=='resolved'){join.linkedClientCountryUnresolved++;continue;}
   if(result.source==='insurer'){join.linkedClientInsurerFallbackEligible++;continue;}
   if(result.country===country(p.pais||p.country))join.linkedClientExplicitSameCountry++;
   else join.linkedClientExplicitOtherCountry++;
 }
 const matrices=new Map();let verifiedRoleCountryContexts=0;
 for(const member of members){
   if(!member?.uid||!member.tenantId)continue;
   for(const role of roleList(member))for(const selectedCountry of ['GT','CO']){
     const args={auth:{uid:member.uid,token:{}},member,config,tenantId,
       activeRole:role,country:selectedCountry};
     let pc=null,cc=null;
     try{pc=resolve({...args,collection:'polizas'});}catch(e){if(!(e instanceof Denied))throw e;}
     try{cc=resolve({...args,collection:'clientes'});}catch(e){if(!(e instanceof Denied))throw e;}
     if(!pc&&!cc)continue;
     verifiedRoleCountryContexts++;
     // Keyed by effective scope, not member UID. Outputs contain no identities.
     const key=[role,selectedCountry,pc?.scope||'denied',cc?.scope||'denied'].join('|');
     if(!matrices.has(key))matrices.set(key,{role,country:selectedCountry,
       policyScope:pc?.scope||'denied',clientScope:cc?.scope||'denied',
       contexts:0,authorizedPolicies:0,authorizedClientRows:0,
       policyLinks:{clientReadable:0,clientOtherCountry:0,clientWrongAdvisorOrModule:0,
         clientMissingPhysical:0,clientRequiresCountryIndex:0,clientUnresolved:0}});
     const m=matrices.get(key);m.contexts++;
     if(cc)for(const client of clients){
       // Count physically indexed records as the current protected list does.
       if(country(client.pais)!==selectedCountry)continue;
       if(permitted(cc,client))m.authorizedClientRows++;
     }
     if(!pc)continue;
     for(const p of policies){
       if(!permitted(pc,p))continue;
       m.authorizedPolicies++;
       const id=clean(p.clienteId||p.clientId),client=byClient.get(id);
       if(!client){m.policyLinks.clientMissingPhysical++;continue;}
       const actual=authority.get(id);
       if(actual.status!=='resolved'){m.policyLinks.clientUnresolved++;continue;}
       if(actual.country!==selectedCountry){m.policyLinks.clientOtherCountry++;continue;}
       if(!cc){m.policyLinks.clientWrongAdvisorOrModule++;continue;}
       const resolved={...client,pais:actual.country,country:actual.country};
       if(!permitted(cc,resolved))m.policyLinks.clientWrongAdvisorOrModule++;
       else if(country(client.pais)!==selectedCountry)m.policyLinks.clientRequiresCountryIndex++;
       else m.policyLinks.clientReadable++;
     }
   }
 }
 return {schema:'GRAVICENTRA_B4_003_PHYSICAL_POLICY_CLIENT_JOIN_READONLY_V1',
   project:PROJECT,tenant:tenantId,mode:'PHYSICAL_READ_AGGREGATES_AND_SYNTHETIC_SCOPE_EVALUATION',
   counts:{clients:clients.length,policies:policies.length,insurers:insurers.length,
     memberships:members.length,roleCountryContexts:verifiedRoleCountryContexts,
     distinctPolicyClientRefs:referencedClientIds.size,
     distinctMissingPhysicalClientRefs:missingPhysicalIds.size},
   clientCountryAuthority:clientCountries,physicalJoin:join,
   countryClientIdSetParity:auditCountryClientParity({clients,policies}),
   effectiveScopeMatrix:[...matrices.values()].sort((a,b)=>
     [a.role,a.country,a.policyScope,a.clientScope].join('|').localeCompare(
       [b.role,b.country,b.policyScope,b.clientScope].join('|'))),
   caveats:['Admin SDK does not prove signed token authorization',
     'Effective-scope matrix policy/link counts are member-context evaluations, not globally distinct records',
     'Historical policy ownership may differ from current client ownership',
     'Valid client country is not overwritten by insurer country',
     'Insurer-inferred country is not yet indexed by the protected list query'],
   gate:'B4_003_HOLD',production:'NO_GO',writes:0,authWrites:0,securityChanges:0};
}
async function runReadOnly(){
 const out=process.env.B4_003_JOIN_AUDIT_OUT;
 const credentialPath=process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if(!out||!credentialPath||!fs.existsSync(credentialPath))
   throw Error('READONLY_CREDENTIAL_OR_OUTPUT_MISSING');
 const cred=JSON.parse(fs.readFileSync(credentialPath,'utf8'));
 if(cred.type!=='service_account'||cred.project_id!==PROJECT)throw Error('READONLY_PROJECT_DENIED');
 const {initializeApp,cert}=require('firebase-admin/app');
 const {getFirestore}=require('firebase-admin/firestore');
 const app=initializeApp({credential:cert(cred),projectId:PROJECT});
 const tenant=getFirestore(app).collection('tenants').doc(TENANT);
 const fetch=async collection=>{
   const ss=await tenant.collection('data').doc(collection).collection('items').limit(5001).get();
   if(ss.size>5000)throw Error('READONLY_COLLECTION_BOUND_EXCEEDED');
   return ss.docs.map(d=>{
    const row=d.data()||{};
    return {...row,id:d.id,_sourceIdMismatch:!!(row.id&&clean(row.id)!==clean(d.id))};
   });
 };
 const [clients,policies,insurers,membersSnap,accessSnap]=await Promise.all([
   fetch('clientes'),fetch('polizas'),fetch('aseguradoras'),
   tenant.collection('members').limit(101).get(),tenant.collection('config').doc('access').get()
 ]);
 if(membersSnap.size>100||!accessSnap.exists)throw Error('READONLY_MEMBERSHIP_OR_CONFIG_BOUND');
 const members=membersSnap.docs.map(d=>({...(d.data()||{}),uid:d.id}));
 const result=auditDataset({clients,policies,insurers,members,
   config:accessSnap.data()||{},tenantId:TENANT});
 // Aggregate counts only: no names, email, UID, IDs, or raw records exported.
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('B4_003_READONLY_JOIN_AUDIT='+JSON.stringify({counts:result.counts,
   join:result.physicalJoin,country:result.clientCountryAuthority}));
 console.log('B4_003_ID_SET_PARITY_READONLY='+JSON.stringify(result.countryClientIdSetParity));
 console.log('B4_003_PRODUCTION=NO_GO writes=0 signed_uid_uat=NOT_EXECUTED');
}
if(require.main===module){
 if(process.argv.includes('--real-readonly'))runReadOnly().catch(e=>{
   console.error('B4_003_JOIN_AUDIT_BLOCKED '+clean(e.code||e.message).slice(0,140));process.exitCode=1;
 });
 else{console.error('B4_003_JOIN_AUDIT_REQUIRES_EXPLICIT_REAL_READONLY_FLAG');process.exitCode=2;}
}
module.exports=Object.freeze({auditDataset,auditCountryClientParity});
