/* ============================================================
   Orbit 360 · Product config/session overlay P0
   Replaces prototype local persistence with volatile runtime state.
   Tenant config is later hydrated from authenticated backend config.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function blocked(){var e=new Error('PRODUCT_CONFIGURATION_WRITE_REQUIRES_GATE');e.code='PRODUCT_CONFIGURATION_WRITE_REQUIRES_GATE';throw e;}
  var tenantDefault=clone(Orbit.tenant&&Orbit.tenant.DEFAULT||{empresa:'Tu marca',plan:'personalizado',paises:[],branding:{},modulosActivos:[]});
  var tenantData=clone(tenantDefault);
  var catDefault=clone(Orbit.cat&&Orbit.cat.DEF||{}),catData=clone(catDefault);
  var sessionData={rol:'',asesorId:'',roles:[]};
  function emit(name){try{document.dispatchEvent(new CustomEvent(name));}catch(e){}}
  var tenant={
    DEFAULT:tenantDefault,
    get:function(){return clone(tenantData);},
    set:blocked,setDeep:blocked,reset:blocked,
    isActive:function(route){var active=Array.isArray(tenantData.modulosActivos)?tenantData.modulosActivos:[];var disabled=Array.isArray(tenantData.modulosDesactivados)?tenantData.modulosDesactivados:[];return active.indexOf(route)>=0&&disabled.indexOf(route)<0;},
    _applyRuntime:function(patch){tenantData=Object.assign({},tenantDefault,clone(patch||{}));emit('orbit:tenant');return clone(tenantData);},
    __productVolatileP0:true
  };
  var session={
    rol:function(){return sessionData.rol;},asesorId:function(){return sessionData.asesorId;},esAsesor:function(){return sessionData.rol==='Asesor';},
    verEmpresa:function(){return ['Dirección','SuperAdmin','AdminTenant','Finanzas'].indexOf(sessionData.rol)>=0;},
    canSee:function(route){var r=Orbit.ROLES&&Orbit.ROLES[sessionData.rol];return !r||!Array.isArray(r.modulos)||r.modulos.indexOf(route)>=0;},
    set:function(rol,asesorId){if(sessionData.roles.indexOf(rol)<0)return false;sessionData.rol=rol;if(asesorId!==undefined)sessionData.asesorId=asesorId||'';emit('orbit:session');return true;},
    _applyMembership:function(m){m=m||{};sessionData.roles=Array.isArray(m.roles)?m.roles.slice():[];sessionData.rol=m.activeRole||m.defaultRole||sessionData.roles[0]||'';sessionData.asesorId=m.advisorId||'';emit('orbit:session');return clone(sessionData);},
    __productVolatileP0:true
  };
  var cat={
    DEF:catDefault,get:function(k){return clone(catData[k]||[]);},all:function(){return clone(catData);},
    ramosDe:function(p){var m=(catData.ramosPais||{})[p];return m?Object.keys(m):clone(catData.ramos||[]);},
    subramosDe:function(p,r){var m=(catData.ramosPais||{})[p];return m&&m[r]?clone(m[r]):[];},
    addRamo:blocked,addSubramo:blocked,add:blocked,setList:blocked,save:blocked,reset:blocked,
    _applyRuntime:function(patch){catData=Object.assign({},catDefault,clone(patch||{}));emit('orbit:cat');return clone(catData);},
    __productVolatileP0:true
  };
  Orbit.tenant=tenant;Orbit.session=session;Orbit.cat=cat;
  Orbit.productConfigSessionOverlayP0=Object.freeze({VERSION:'p0-m6-20260730',applyMembership:session._applyMembership,applyTenantConfig:function(c){var applied=tenant._applyRuntime(c||{});if(c&&c.catalogos)cat._applyRuntime(c.catalogos);return applied;},writeAuthorized:false,noLocalStorageFallback:true});
})();
