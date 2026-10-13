'use strict';
const {Denied}=require('./b4-003-scoped-access-boundary');
const txt=x=>String(x==null?'':x).trim();
const list=x=>[...new Set((Array.isArray(x)?x:[]).map(txt).filter(Boolean))];
function safeScopes(d){
 const v=d&&typeof d==='object'?d:{},ok=new Set(['none','own','team','all']),o={};
 if(ok.has(v.default))o.default=v.default;
 if(v.modules&&typeof v.modules==='object'){o.modules={};for(const [k,s] of Object.entries(v.modules))
  if(/^[a-zA-Z0-9_-]{1,80}$/.test(k)&&ok.has(s))o.modules[k]=s;}
 return o;
}
async function readBootstrap({db,auth,request}){
 const q=request||{},mode=txt(q.mode),tenantId=txt(q.tenantId);
 if(!db||!auth?.uid)throw new Denied('AUTH_REQUIRED');
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(tenantId))throw new Denied('TENANT_INVALID');
 if(!['bootstrap-membership','bootstrap-tenant-config'].includes(mode))throw new Denied('MODE_DENIED');
 if(q.uid&&q.uid!==auth.uid)throw new Denied('IDENTITY_DENIED');
 const tenant=db.collection('tenants').doc(tenantId),s=await tenant.collection('members').doc(auth.uid).get();
 if(!s.exists)throw new Denied('MEMBERSHIP_DENIED');
 const m=s.data()||{},roles=list(m.roles),role=txt(m.activeRole||m.rolActivo);
 if(m.uid!==auth.uid||m.tenantId!==tenantId||m.active===false||
    !['active','activo'].includes(txt(m.status||m.estado).toLowerCase()))
   throw new Denied('MEMBERSHIP_DENIED');
 if(!roles.includes(role))throw new Denied('ROLE_DENIED');
 if(auth.token?.email&&txt(m.email).toLowerCase()!==txt(auth.token.email).toLowerCase())
   throw new Denied('EMAIL_DENIED');
 if(mode==='bootstrap-membership'){
  const countries=list(m.countries).map(x=>x.toUpperCase());
  if(!countries.length||countries.some(x=>!['GT','CO'].includes(x)))throw new Denied('COUNTRY_DENIED');
  const out={uid:auth.uid,tenantId,email:txt(m.email),status:'active',roles,activeRole:role,countries,
   dataScopes:safeScopes(m.dataScopes),modulesExtra:list(m.modulesExtra),
   modulesRestricted:list(m.modulesRestricted),modulesVisible:list(m.modulesVisible),
   teamAdvisorIds:list(m.teamAdvisorIds)};
  for(const key of ['nombre','displayName','advisorId','teamId','defaultRole'])
   if(typeof m[key]==='string')out[key]=m[key].slice(0,500);
  if(m.roleVisibleAdvisorIds&&typeof m.roleVisibleAdvisorIds==='object'){
   out.roleVisibleAdvisorIds={};for(const [k,v] of Object.entries(m.roleVisibleAdvisorIds)){
    if(!Array.isArray(v)||!/^[a-zA-Z0-9_-]{1,80}$/.test(k))throw new Denied('ROLE_TEAM_DENIED');
    out.roleVisibleAdvisorIds[k]=list(v);
   }
  }
  return {ok:true,serverScoped:true,mode,tenantId,uid:auth.uid,membership:out};
 }
 const snap=await tenant.collection('system').doc('config').get(),config={};
 if(snap.exists)for(const k of ['nombre','displayName','legalName','logoUrl','timezone','country']){
  const v=(snap.data()||{})[k];if(typeof v==='string')config[k]=v.slice(0,500);
 }
 return {ok:true,serverScoped:true,mode,tenantId,uid:auth.uid,config};
}
module.exports={readBootstrap};