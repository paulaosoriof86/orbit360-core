'use strict';
// B4-003: staged server-side policy. Not wired or deployed. Active role is verified against server-owned assigned roles; signed claim, if present, further restricts it.
const clean=x=>String(x??'').trim();
const norm=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const uniq=a=>[...new Set((Array.isArray(a)?a:a==null?[]:[a]).map(clean).filter(Boolean))];
const order={none:0,own:1,team:2,all:3};
const full=new Set(['operativo','admin','admintenant','admin_tenant','superadmin','super_admin','direccion','finanzas']);
const insurerDirectoryRoles=new Set(['operativo','admin','admintenant','admin_tenant','superadmin','super_admin','direccion']);
const teamScopedRoles=new Set(['marketing']);
const self=new Set(['asesor','asesora','asesor_sr','asesora_sr','asesor_jr','asesora_jr','comercial','asistente']);
// Aligned with tenant-access-policy-effective-p0 TEAM_DIRECTORY_ROLES.
const teamDirectoryRoles=new Set(['direccion','superadmin','admintenant','admin']);

const UNIVERSAL_MODULE_ROLES=new Set(['direccion','superadmin','super_admin','admintenant','admin_tenant','admin']);
const ROLE_MODULES=Object.freeze({
 operativo:['inicio','cliente360','polizas','cobros','renovaciones','cancelaciones','ops','leads','aseguradoras','calidad','importar','historial'],
 finanzas:['inicio','finanzas','cobros','conciliaciones','comisiones','reportes','calidad'],
 marketing:['inicio','marketing','leads','plantillas','automatizaciones','reportes'],
 asesor:['inicio','cliente360','polizas','cobros','renovaciones','cancelaciones','ops','leads','aseguradoras','calidad','portal','historial'],
 comercial:['inicio','cliente360','polizas','cotizador','comparativo','leads','calidad'],
 asistente:['inicio','cliente360','ops','calidad']
});
const ADVISOR_TIER_ROLES=new Set(['asesor','asesora','asesor_sr','asesora_sr','asesor_jr','asesora_jr']);

const modules={clientes:'cliente360',polizas:'polizas',vehiculos:'polizas',recibosEsperados:'cobros',carteraPrimas:'cobros',cobros:'cobros',negocios:'leads',gestiones:'ops',metas:'inicio',actividades:'historial',cancelaciones:'cancelaciones',auditoria:'equipo',asesores:'equipo',aseguradoras:'aseguradoras'};
class Denied extends Error{constructor(code){super(code);this.code=code;}}
const deny=code=>{throw new Denied(code);};
const get=(o,k)=>{const key=Object.keys(o||{}).find(v=>norm(v)===norm(k));return key===undefined?undefined:o[key];};
const scope=v=>({none:'none',ninguno:'none',sin_acceso:'none',own:'own',propio:'own',team:'team',equipo:'team',all:'all',todos:'all',global:'all'})[norm(v)]||'';

function canReadAssignedModule(member,role,moduleKey,permission){
 // Enforce affirmative server-owned module entitlement; no absent-matrix grant.
 // An explicit role permission or per-user extra may add an approved module.
 // modulesVisible is deliberately ignored: it can reflect a different role on
 // multi-role memberships. Client-only UI hiding is not authorization.
 if(UNIVERSAL_MODULE_ROLES.has(role))return true;
 if(permission?.ver===true)return true;
 const extras=uniq(member.modulesExtra||member.modulosExtra).map(norm);
 if(extras.includes(norm(moduleKey)))return true;
 const roleDef=ADVISOR_TIER_ROLES.has(role)?'asesor':role;
 return (ROLE_MODULES[roleDef]||[]).includes(moduleKey);
}

function resolve({auth,member,config,tenantId,activeRole,collection,country}){
 const m=member||{},role=norm(activeRole),signed=norm(auth?.token?.giActiveRole);
 // Membership must be affirmatively active; absent, suspended or conflicting
 // status aliases cannot silently confer server-side read authorization.
 const declaredStates=[m.status,m.estado].filter(value=>clean(value)!=='').map(norm);
 if(!declaredStates.length||declaredStates.some(value=>!['active','activo'].includes(value)))deny('MEMBERSHIP_DENIED');
 if(!auth?.uid||!m.uid||m.uid!==auth.uid||m.tenantId!==tenantId||m.active===false||m.activo===false||m.inactivo===true||['inactive','inactivo','blocked','bloqueado','pending','pendiente','invited','invitado','deleted','eliminado'].includes(norm(m.status||m.estado)))deny('MEMBERSHIP_DENIED');
 if(!role)deny('ROLE_NOT_PROVIDED');
 if(signed&&role!==signed)deny('SIGNED_ACTIVE_ROLE_MISMATCH');
 const assigned=uniq([...(m.roles||[]),...(m.rolesAsignados||[]),m.rol,m.role,m.defaultRole,m.rolDefault].filter(Boolean)).map(norm);
 if(!assigned.includes(role)||(!self.has(role)&&!full.has(role)&&!teamScopedRoles.has(role)))deny('ROLE_DENIED');
 const moduleKey=modules[collection];
 if(!moduleKey)deny('COLLECTION_DENIED');
 if(uniq(m.modulesRestricted||m.modulosRestringidos).map(norm).includes(norm(moduleKey)))deny('MODULE_DENIED');

 const explicitModulePermission=get(get(get(config,'rolePermissions'),role),moduleKey);
 if(explicitModulePermission?.ver===false)deny('MODULE_DENIED');
 if(!canReadAssignedModule(m,role,moduleKey,explicitModulePermission))deny('MODULE_DENIED');
 const countries=uniq([...(m.countries||[]),...(m.paises||[]),...(m.paisesAutorizados||[])].filter(Boolean)).map(v=>v.toUpperCase());
 if(!['GT','CO'].includes(country)||!countries.includes(country))deny('COUNTRY_DENIED');
 let effective='none';
 if(collection==='aseguradoras'){
  if(!insurerDirectoryRoles.has(role))deny('DIRECTORY_DENIED');
  effective='all';
 }else if(collection==='asesores'||collection==='auditoria'){
  // The complete Equipo directory is not a personal/operational roster.
  // Operativo uses the separately authorized assignable-advisor service.
  if(!teamDirectoryRoles.has(role))deny('TEAM_DIRECTORY_DENIED');
  if(role==='admin'&&!uniq([...(m.modulesVisible||[]),...(m.modulesExtra||[])]).map(norm).some(k=>k==='equipo'||k==='*'))
    deny('MODULE_DENIED');
  effective='all';
 }else{
  // Asesor's cancellation permission is read-own only. Explicit role matrix
  // denial or user restriction still prevails. No tenant-wide advisor grants.
  if(collection==='cancelaciones'&&!full.has(role)&&!self.has(role))deny('MODULE_DENIED');
  const ds=m.dataScopes||{},requested=scope(get(ds.modules,moduleKey)||ds.default||m.scopeDatos||m.dataScope);
  const configured=scope(get(config?.roleScopes,role));
  const maxScope=self.has(role)?'own':teamScopedRoles.has(role)?'team':(configured||'none');
  const ceiling=configured&&order[configured]<order[maxScope]?configured:maxScope;
  effective=requested?(order[requested]<=order[ceiling]?requested:ceiling):
    (configured?ceiling:(collection==='cancelaciones'&&self.has(role)?'own':'none'));
 }
 if(effective==='none')deny('SCOPE_NONE');
 const advisor=clean(m.advisorId||m.asesorId);
 // An explicit per-role team list replaces—not expands—the global team list.
 const roleTeams=m.roleVisibleAdvisorIds&&typeof m.roleVisibleAdvisorIds==='object'&&!Array.isArray(m.roleVisibleAdvisorIds)?m.roleVisibleAdvisorIds:{};
 const roleKey=Object.keys(roleTeams).find(k=>norm(k)===role);
 const explicitRoleTeam=roleKey===undefined?null:roleTeams[roleKey];
 if(roleKey!==undefined&&!Array.isArray(explicitRoleTeam))deny('ROLE_TEAM_CONFIG_INVALID');
 const visible=roleKey===undefined?uniq([...(m.teamAdvisorIds||[]),...(m.equipoAsesorIds||[])]):uniq(explicitRoleTeam);
 const team=uniq([...visible,advisor]);
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
