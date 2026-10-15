'use strict';
const {Denied}=require('./b4-003-scoped-access-boundary');
const txt=x=>String(x==null?'':x).trim();
const list=x=>[...new Set((Array.isArray(x)?x:[]).map(txt).filter(Boolean))];
function canonicalScope(value){
 const key=txt(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(['propios','propio','own','mios'].includes(key))return 'own';
 if(['equipo','team'].includes(key))return 'team';
 if(['todos','all','global'].includes(key))return 'all';
 if(['ninguno','none','sin_acceso','sinacceso'].includes(key))return 'none';
 throw new Denied('SCOPE_INVALID');
}
function safeScopes(input,legacyDefault){
 const d=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const rawDefault=d.default??d['*']??legacyDefault;
 if(!txt(rawDefault))throw new Denied('SCOPE_DEFAULT_MISSING');
 const candidates=d.modules&&typeof d.modules==='object'&&!Array.isArray(d.modules)
  ?d.modules:Object.fromEntries(Object.entries(d).filter(([key])=>!['default','*','modules'].includes(key)));
 const modules={};
 for(const [key,value] of Object.entries(candidates)){
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(key)||['__proto__','prototype','constructor'].includes(key))
    throw new Denied('SCOPE_MODULE_INVALID');
  modules[key]=canonicalScope(value);
 }
 return {default:canonicalScope(rawDefault),modules};
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
 const declaredStates=[m.status,m.estado].filter(v=>txt(v)!=='').map(v=>txt(v).toLowerCase());
 if(m.uid!==auth.uid||m.tenantId!==tenantId||m.active===false||m.activo===false||m.inactivo===true||
    !declaredStates.length||declaredStates.some(v=>!['active','activo'].includes(v)))
   throw new Denied('MEMBERSHIP_DENIED');
 if(!roles.includes(role))throw new Denied('ROLE_DENIED');
 // Match the signed active-role claim when present, as the scoped reader does.
 // Empty/absent claims do not grant privilege; server membership still governs.
 const key=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
 const signedRole=key(auth.token?.giActiveRole);
 if(signedRole&&signedRole!==key(role))throw new Denied('SIGNED_ACTIVE_ROLE_MISMATCH');
 const memberEmail=txt(m.email).toLowerCase(),tokenEmail=txt(auth.token?.email).toLowerCase();
 if(memberEmail&&tokenEmail&&memberEmail!==tokenEmail)throw new Denied('EMAIL_DENIED');
 if(mode==='bootstrap-membership'){
  const countries=list(m.countries).map(x=>x.toUpperCase());
  if(!countries.length||countries.some(x=>!['GT','CO'].includes(x)))throw new Denied('COUNTRY_DENIED');
  const out={uid:auth.uid,tenantId,email:memberEmail||tokenEmail,status:'active',roles,activeRole:role,countries,
   dataScopes:safeScopes(m.dataScopes,m.scopeDatos||m.dataScope),modulesExtra:list(m.modulesExtra),
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


// Canonical B4-003 staged, server-only directory reader (not exported to Firebase).
// Passwords and secure-vault records are outside this response contract.
const {resolve:dirScope,allowRow:dirAllow}=require('./b4-003-scoped-access-boundary');
const pick=(row,keys)=>{
 const out={};for(const k of keys)if(row&&Object.prototype.hasOwnProperty.call(row,k)&&row[k]!=null)
   out[k]=JSON.parse(JSON.stringify(row[k]));
 return out;
};
const sanitize=(v,depth=0)=>{
 if(depth>6)throw new Denied('DIRECTORY_NESTING_EXCEEDED');
 if(Array.isArray(v)){
  if(v.length>300)throw new Denied('DIRECTORY_ARRAY_EXCEEDED');
  return v.map(x=>sanitize(x,depth+1));
 }
 if(v&&typeof v==='object'){
  const out={};
  for(const [key,value] of Object.entries(v)){
   if(/^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accesstoken|refreshtoken|privatekey|clientsecret|credentialvalue|credential_value|apikey|passwordhash|jwt|authorization|credentials|secretkey)$/i.test(key))continue;
   if(['__proto__','prototype','constructor'].includes(key))throw new Denied('DIRECTORY_UNSAFE_FIELD');
   out[key]=sanitize(value,depth+1);
  }return out;
 }
 return v;
};
const viewDirectory=(coll,row,id,country,tenantId)=>{
 const base={id,canonicalDocumentId:id,tenantId,pais:country};
 if(coll==='asesores')return Object.assign(sanitize(pick(row,['nombre','displayName','name','activo','active','inactivo','estado','status','paises','countries','paisDefault','countryDefault','teamId','equipoId','roles','rol','rolDefault','tipo','metaPrima','metaRecaudo','email','telefono','tel','cargo','color','foto','avatar','scopeDatos','dataScopes','modulosExtra','modulosRestringidos','modulesExtra','modulesRestricted','comModo','shareCom','comValor','accessProvisioned','invitacionEstado','authUid','uid','userId','equipoAsesorIds'])),base);
 const a=pick(row,['nombre','canonicalName','displayName','nit','codigoIntermediario','web','portal','logo','logoAssetRef','logoContentHash','color','responsable','telGeneral','emergencia','observaciones','ultimaRevision','vinculada','ramos','ramosHabilitados','ramosDetalle','cotTasas','cotTasasValidadas','comisionDefault','comisiones','drive','docs','docsRequeridos','estado','activo','actualizado']);
 const schema={
  facturacion:['razonSocial','dirFiscal','regimen','correo','nit','documento'],
  contactos:['nombre','area','email','tel','ext','cargo','pais','canal','vigencia','gestionPreferida','principal'],
  portales:['id','nombre','tipo','url','usuario','user','login','pais','estadoAcceso','responsable','ultimaVerificacion','credentialRef'],
  cuentas:['id','banco','tipo','numero','moneda','titular','linkPago','ultimaVerificacion','pais']
 };
 for(const [key,keys] of Object.entries(schema)){
  if(Array.isArray(row[key]))a[key]=row[key].map(x=>pick(x,keys));
  else if(key==='facturacion'&&row[key]&&typeof row[key]==='object')a[key]=pick(row[key],keys);
 }
 return Object.assign(sanitize(a),base);
};
async function readProtectedDirectory({db,auth,request}){
 const q=request||{},tenantId=txt(q.tenantId),collection=txt(q.collection),
  country=txt(q.country).toUpperCase(),activeRole=txt(q.activeRole),cursor=txt(q.cursor);
 const size=Number(q.pageSize==null?50:q.pageSize);
 if(!db||!auth?.uid)throw new Denied('AUTH_REQUIRED');
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(tenantId))throw new Denied('TENANT_INVALID');
 if(!['asesores','aseguradoras'].includes(collection)||q.mode!=='list'||
   q.policyIds!==undefined||q.policyId)throw new Denied('DIRECTORY_REQUEST_DENIED');
 if(!['GT','CO'].includes(country)||!Number.isInteger(size)||size<1||size>50||
   (cursor&&!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/.test(cursor)))
   throw new Denied('DIRECTORY_PAGINATION_DENIED');
 const tenant=db.collection('tenants').doc(tenantId);
 const [m,c]=await Promise.all([tenant.collection('members').doc(auth.uid).get(),
   tenant.collection('config').doc('access').get()]);
 if(!m.exists)throw new Denied('MEMBERSHIP_DENIED');
 const ctx=dirScope({auth,member:m.data()||{},config:c.exists?c.data()||{}:{},
   tenantId,activeRole,country,collection});
 const target=tenant.collection('data').doc(collection).collection('items');
 const snap=await target.orderBy('__name__').limit(301).get();
 if(!Array.isArray(snap.docs)||snap.docs.length>300)throw new Denied('DIRECTORY_SCAN_BOUND_EXCEEDED');
 const allowed=[];
 for(const doc of snap.docs){
  const row=doc.data()||{},id=txt(doc.id);
  if(!id||row.tenantId&&row.tenantId!==tenantId)throw new Denied('DIRECTORY_IDENTITY_DENIED');
  if(row.id&&txt(row.id)!==id)throw new Denied('DIRECTORY_DOCUMENT_ID_MISMATCH');
  // Insurer directory has one canonical country; do not expand it through aliases.
  // Advisor multi-country rosters use their explicit array over a default country.
  const isAdvisor=collection==='asesores';
  const roster=Array.isArray(row.paises)&&row.paises.length?row.paises:
    Array.isArray(row.countries)&&row.countries.length?row.countries:null;
  const basis=isAdvisor?(roster||[row.pais,row.country,row.paisDefault,row.countryDefault]):
    [row.pais||row.country];
  const countries=[...new Set(basis.map(x=>txt(x).toUpperCase()).filter(Boolean))];
  if(!countries.includes(country))continue;
  if(collection==='aseguradoras')dirAllow(ctx,{tenantId,pais:country});
  else if(ctx.scope==='own'?id!==ctx.advisorId:
          ctx.scope==='team'?!ctx.team.includes(id):ctx.scope!=='all')continue;
  allowed.push(viewDirectory(collection,row,id,country,tenantId));
 }
 const at=cursor?allowed.findIndex(x=>x.canonicalDocumentId===cursor)+1:0;
 if(cursor&&!at)throw new Denied('DIRECTORY_CURSOR_DENIED');
 const rows=allowed.slice(at,at+size);
 return {ok:true,serverScoped:true,collection,country,scope:ctx.scope,rows,
   nextCursor:allowed.length>at+rows.length&&rows.length?rows[rows.length-1].canonicalDocumentId:null,
   vaultCredentialTransport:'separate_authorized_provider',boundedScan:true};
}

module.exports={readBootstrap,readProtectedDirectory};