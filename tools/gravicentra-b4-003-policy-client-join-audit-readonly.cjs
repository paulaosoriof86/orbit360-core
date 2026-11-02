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
const roleList=member=>[...new Set([...(member.roles||[]),...(member.rolesAsignados||[]),
 member.rol,member.role,member.defaultRole].map(clean).filter(Boolean))];
function auditDataset({clients=[],policies=[],insurers=[],members=[],config={},tenantId=TENANT}){
 const byClient=new Map(clients.map(c=>[clean(c.id),c]));
 const byInsurer=new Map(insurers.map(a=>[clean(a.id),a]));
 const linked=new Map();
 for(const p of policies){const id=clean(p.clienteId||p.clientId);if(!linked.has(id))linked.set(id,[]);linked.get(id).push(p);}
 const authority=new Map(),clientCountries={explicit:{},inferred:{},unresolved:{}};
 for(const client of clients){
   const result=resolveClientCountry({client,clientId:clean(client.id),tenantId,
     policies:linked.get(clean(client.id))||[],insurers:byInsurer,completePolicySet:true});
   authority.set(clean(client.id),result);
   const type=result.status==='unresolved'?'unresolved':result.source==='insurer'?'inferred':'explicit';
   increment(clientCountries[type],type==='unresolved'?result.reason:result.country);
 }
 const join={policies:policies.length,clientIdMissing:0,physicalClientMissing:0,
   linkedClientExplicitSameCountry:0,linkedClientExplicitOtherCountry:0,
   linkedClientInsurerFallbackEligible:0,linkedClientCountryUnresolved:0};
 for(const p of policies){
   const id=clean(p.clienteId||p.clientId);
   if(!id){join.clientIdMissing++;continue;}
   const client=byClient.get(id);
   if(!client){join.physicalClientMissing++;continue;}
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
       if(clientCountryNeedsInsurer(client)){
         const resolved={...client,pais:actual.country,country:actual.country};
         if(permitted(cc,resolved))m.policyLinks.clientRequiresCountryIndex++;
         else m.policyLinks.clientWrongAdvisorOrModule++;
       }else if(permitted(cc,client))m.policyLinks.clientReadable++;
       else m.policyLinks.clientWrongAdvisorOrModule++;
     }
   }
 }
 return {schema:'GRAVICENTRA_B4_003_PHYSICAL_POLICY_CLIENT_JOIN_READONLY_V1',
   project:PROJECT,tenant:tenantId,mode:'PHYSICAL_READ_AGGREGATES_AND_SYNTHETIC_SCOPE_EVALUATION',
   counts:{clients:clients.length,policies:policies.length,insurers:insurers.length,
     memberships:members.length,roleCountryContexts:verifiedRoleCountryContexts},
   clientCountryAuthority:clientCountries,physicalJoin:join,
   effectiveScopeMatrix:[...matrices.values()].sort((a,b)=>
     [a.role,a.country,a.policyScope,a.clientScope].join('|').localeCompare(
       [b.role,b.country,b.policyScope,b.clientScope].join('|'))),
   caveats:['Admin SDK does not prove signed token authorization',
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
   return ss.docs.map(d=>({...(d.data()||{}),id:d.id}));
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
 console.log('B4_003_PRODUCTION=NO_GO writes=0 signed_uid_uat=NOT_EXECUTED');
}
if(require.main===module){
 if(process.argv.includes('--real-readonly'))runReadOnly().catch(e=>{
   console.error('B4_003_JOIN_AUDIT_BLOCKED '+clean(e.code||e.message).slice(0,140));process.exitCode=1;
 });
 else{console.error('B4_003_JOIN_AUDIT_REQUIRES_EXPLICIT_REAL_READONLY_FLAG');process.exitCode=2;}
}
module.exports=Object.freeze({auditDataset});
