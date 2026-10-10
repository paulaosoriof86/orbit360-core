/* Gravicentra Insurance · assignable advisor roster client v1 */
(function(){'use strict';window.Orbit=window.Orbit||{};
const VERSION='gravicentra-assignable-advisor-roster-client-v1',PROD='orbit360AssignableAdvisorRoster',PREVIEW='orbit360AssignableAdvisorRosterPreview',cache=new Map(),meta=new Map(),inflight=new Map();
const text=v=>String(v==null?'':v).trim(),tenant=()=>text((window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{}).tenantHint||(window.OrbitBackend&&(OrbitBackend.tenantId||OrbitBackend.tenant))||(Orbit.tenant&&Orbit.tenant.get&&Orbit.tenant.get().id)),role=()=>text(Orbit.session&&Orbit.session.rol?Orbit.session.rol():'');
const preview=()=>/--/.test(String(location.hostname||'')),fn=()=>preview()?PREVIEW:PROD,region=()=>preview()?'us-east1':text((window.OrbitBackend||{}).functionsRegion||'us-central1');
const provider=()=>Orbit.productRuntimeBrowserProvidersP0&&typeof Orbit.productRuntimeBrowserProvidersP0.callFunction==='function'?Orbit.productRuntimeBrowserProvidersP0:null;
const compat=()=>{try{return window.firebase&&typeof firebase.functions==='function'?firebase.app().functions(region()).httpsCallable(fn()):null;}catch(e){return null;}};
async function call(payload){const p=provider();if(p)return p.callFunction(fn(),payload,region());const f=compat();if(!f)throw Error('ASSIGNABLE_ADVISOR_ROSTER_BACKEND_REQUIRED');const r=await f(payload);return r&&r.data?r.data:r;}
const key=c=>role().toLowerCase()+'|'+text(c).toUpperCase(),peek=c=>(cache.get(key(c))||[]).map(x=>Object.assign({},x,{paises:[].concat(x.paises||[])}));
async function list(country,opts){const k=key(country);if(!(opts&&opts.force)&&meta.get(k)?.confirmed)return peek(country);if(inflight.has(k))return inflight.get(k);const p=(async()=>{const data=await call({tenantId:tenant(),activeRole:role(),country:text(country).toUpperCase()});if(!data||data.ok!==true||!Array.isArray(data.rows))throw Error('ASSIGNABLE_ADVISOR_ROSTER_READBACK_REQUIRED');const seen=new Set(),rows=[];data.rows.forEach(x=>{const id=text(x?.id),nombre=text(x?.nombre);if(!id||!nombre||x.assignable!==true||seen.has(id))return;seen.add(id);rows.push({id,nombre,activo:x.activo!==false,assignable:true,roleEligible:x.roleEligible===true,paises:[...new Set([].concat(x.paises||[]).map(v=>text(v).toUpperCase()).filter(Boolean))]});});cache.set(k,rows);meta.set(k,{confirmed:true,scope:data.scope||'',country:data.country||'',at:new Date().toISOString()});return peek(country);})().finally(()=>inflight.delete(k));inflight.set(k,p);return p;}

const dashCache=new Map(),dashMeta=new Map(),dashPending=new Map();
const dashKey=(country,month)=>text(Orbit.auth?.productUser?.uid)+'|'+role().toLowerCase()+'|'+text(country).toUpperCase()+'|'+text(month);
const dashboardPeek=(country,month)=>(dashCache.get(dashKey(country,month))||[]).map(r=>({...r,paises:[...r.paises],metas:JSON.parse(JSON.stringify(r.metas))}));
async function dashboardList(country,month){
 const k=dashKey(country,month);if(dashMeta.get(k)?.confirmed)return dashboardPeek(country,month);if(dashPending.has(k))return dashPending.get(k);
 const p=(async()=>{const data=await call({tenantId:tenant(),activeRole:role(),country:text(country).toUpperCase(),month:text(month),purpose:'inicio'});
 if(!data||data.ok!==true||data.schemaVersion!=='gravicentra-inicio-r23'||!Array.isArray(data.rows)||data.month!==text(month))throw Error('INICIO_R23_READBACK_REQUIRED');
 const rows=[],seen=new Set();for(const r of data.rows){const id=text(r.id),nombre=text(r.nombre),paises=[...new Set([].concat(r.paises||[]).map(x=>text(x).toUpperCase()).filter(x=>x==='GT'||x==='CO'))];if(!id||!nombre||!paises.length||seen.has(id))throw Error('INICIO_R23_ADVISOR_INVALID');seen.add(id);const metas={};
 for(const c of paises){const source=r.metas?.[c]||{},m={};for(const f of ['nueva','renovada','recaudo','produccion']){const n=Number(source[f]);if(!Number.isFinite(n)||n<0)throw Error('INICIO_R23_META_INVALID');m[f]=n;}metas[c]={...m,explicit:source.explicit===true};}
 const legacy=Number(r.metaPrima);rows.push({id,nombre,paises,metas,activo:r.activo===true,metaPrima:Number.isFinite(legacy)&&legacy>0?legacy:null});}
 dashCache.set(k,rows);dashMeta.set(k,{confirmed:true,scope:data.scope,country:data.country,month:data.month,at:new Date().toISOString()});return dashboardPeek(country,month);})().finally(()=>dashPending.delete(k));dashPending.set(k,p);return p;
}
const dashboardStatus=()=>({entries:[...dashMeta.entries()].map(([key,value])=>({key,...value}))});
function invalidate(){cache.clear();meta.clear();inflight.clear();dashCache.clear();dashMeta.clear();dashPending.clear();}
window.addEventListener('orbit:domain-config',e=>{if(e?.detail?.domain==='access')invalidate();});
Orbit.assignableAdvisorRoster=Object.freeze({VERSION,list,peek,dashboardList,dashboardPeek,dashboardStatus,invalidate,status:()=>({version:VERSION,functionName:fn(),region:region(),tenantId:tenant(),role:role(),entries:[...meta.entries()].map(([key,value])=>({key,...value}))})});
})();
