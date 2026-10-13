'use strict';
// B4-003: staged server-side policy. Not wired or deployed. Active role is verified against server-owned assigned roles; signed claim, if present, further restricts it.
const clean=x=>String(x??'').trim();
const norm=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const uniq=a=>[...new Set((Array.isArray(a)?a:a==null?[]:[a]).map(clean).filter(Boolean))];
const order={none:0,own:1,team:2,all:3};
const full=new Set(['operativo','admin','admintenant','admin_tenant','superadmin','super_admin','direccion']);
const self=new Set(['asesor','comercial']);
const modules={clientes:'clientes',polizas:'polizas',vehiculos:'vehiculos',recibosEsperados:'recibos',carteraPrimas:'cobros',cobros:'cobros',negocios:'leads',gestiones:'ops',metas:'inicio',aseguradoras:'aseguradoras'};
class Denied extends Error{constructor(code){super(code);this.code=code;}}
const deny=code=>{throw new Denied(code);};
const get=(o,k)=>{const key=Object.keys(o||{}).find(v=>norm(v)===norm(k));return key===undefined?undefined:o[key];};
const scope=v=>({none:'none',ninguno:'none',sin_acceso:'none',own:'own',propio:'own',team:'team',equipo:'team',all:'all',todos:'all',global:'all'})[norm(v)]||'';
function resolve({auth,member,config,tenantId,activeRole,collection,country}){
 const m=member||{},role=norm(activeRole),signed=norm(auth?.token?.giActiveRole);
 if(!auth?.uid||!m.uid||m.uid!==auth.uid||m.tenantId!==tenantId||m.active===false||m.activo===false||m.inactivo===true||['inactive','inactivo','blocked','bloqueado','pending','pendiente','invited','invitado','deleted','eliminado'].includes(norm(m.status||m.estado)))deny('MEMBERSHIP_DENIED');
 if(!role)deny('ROLE_NOT_PROVIDED');
 if(signed&&role!==signed)deny('SIGNED_ACTIVE_ROLE_MISMATCH');
 const assigned=uniq([...(m.roles||[]),...(m.rolesAsignados||[]),m.rol,m.role,m.defaultRole,m.rolDefault].filter(Boolean)).map(norm);
 if(!assigned.includes(role)||(!self.has(role)&&!full.has(role)))deny('ROLE_DENIED');
 const moduleKey=modules[collection];
 if(!moduleKey)deny('COLLECTION_DENIED');
 if(uniq(m.modulesRestricted||m.modulosRestringidos).map(norm).includes(norm(moduleKey)))deny('MODULE_DENIED');
 if(get(get(get(config,'rolePermissions'),role),moduleKey)?.ver===false)deny('MODULE_DENIED');
 const countries=uniq([...(m.countries||[]),...(m.paises||[]),...(m.paisesAutorizados||[])].filter(Boolean)).map(v=>v.toUpperCase());
 if(!['GT','CO'].includes(country)||!countries.includes(country))deny('COUNTRY_DENIED');
 let effective='none';
 if(collection==='aseguradoras'){
  if(!full.has(role))deny('DIRECTORY_DENIED');
  effective='all';
 }else{
  const ds=m.dataScopes||{},requested=scope(get(ds.modules,moduleKey)||ds.default||m.scopeDatos||m.dataScope);
  const configured=scope(get(config?.roleScopes,role));
  const ceiling=self.has(role)?(configured&&order[configured]<order.own?configured:'own'):(configured||'none');
  effective=requested?(order[requested]<=order[ceiling]?requested:ceiling):(configured?ceiling:'none');
 }
 if(effective==='none')deny('SCOPE_NONE');
 const advisor=clean(m.advisorId||m.asesorId);
 const roleTeam=get(m.roleVisibleAdvisorIds,role);
 const team=uniq([...(Array.isArray(roleTeam)?roleTeam:[]),...(m.teamAdvisorIds||[]),...(m.equipoAsesorIds||[]),advisor]);
 if(effective==='own'&&!advisor||effective==='team'&&!team.length)deny('ADVISOR_MAPPING_REQUIRED');
 return Object.freeze({tenantId,role,country,collection,scope:effective,advisorId:advisor,team});
}
function allowRow(ctx,row,parents=[]){
 if(!row||!ctx)deny('RECORD_REQUIRED');
 const refs=[row,...parents.filter(Boolean)];
 if(refs.some(r=>r.tenantId&&r.tenantId!==ctx.tenantId))deny('TENANT_DENIED');
 const countries=uniq(refs.flatMap(r=>[r.pais,r.country].filter(Boolean))).map(v=>v.toUpperCase());
 if(!countries.length||countries.some(v=>v!==ctx.country))deny('COUNTRY_DENIED');
 if(ctx.collection==='aseguradoras'||ctx.scope==='all')return true;
 const advisors=uniq(refs.flatMap(r=>[r.asesorId,r.advisorId,r.ownerAdvisorId].filter(Boolean)));
 if(advisors.length!==1)deny('ADVISOR_AMBIGUOUS');
 if(ctx.scope==='own'&&advisors[0]===ctx.advisorId)return true;
 if(ctx.scope==='team'&&ctx.team.includes(advisors[0]))return true;
 deny('FOREIGN_RECORD_DENIED');
}
module.exports={version:'b4-003-server-assigned-role-v2',resolve,allowRow,Denied};
