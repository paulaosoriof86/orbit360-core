/* ============================================================
   Orbit 360 · Empalme seguro candidata v1.251
   Fecha: 2026-07-14

   Puente aditivo sobre la rama viva. Preserva Orbit.access,
   Orbit.store, Auth, backend LAB y bridges existentes.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var VERSION = 'v1.251-empalme-20260714';
  var installed = false;

  function text(v) { return String(v == null ? '' : v).trim(); }
  function unique(arr) { var out=[]; (Array.isArray(arr)?arr:[]).forEach(function(v){v=text(v);if(v&&out.indexOf(v)<0)out.push(v);}); return out; }
  function normScope(v) {
    v=text(v).toLowerCase();
    if (['own','propia','propio','propios','mios'].indexOf(v)>=0) return 'own';
    if (['team','equipo'].indexOf(v)>=0) return 'team';
    if (['all','todo','todos','global'].indexOf(v)>=0) return 'all';
    return 'none';
  }
  function storeReady() {
    try { return !!(Orbit.store && typeof Orbit.store.all === 'function' && Array.isArray(Orbit.store.all('asesores')) && Orbit.store.all('asesores').length); }
    catch (e) { return false; }
  }
  function currentAdvisorId() { try { return text(Orbit.session && Orbit.session.asesorId && Orbit.session.asesorId()); } catch(e){ return ''; } }
  function advisorById(id) { try { return id && Orbit.store && Orbit.store.get ? Orbit.store.get('asesores', id) : null; } catch(e){ return null; } }
  function activeAdvisor() { return advisorById(currentAdvisorId()); }
  function activeRole() { try { return text(Orbit.session && Orbit.session.rol && Orbit.session.rol()); } catch(e){ return ''; } }
  function tenantId() {
    try { var t=Orbit.tenant&&Orbit.tenant.get?Orbit.tenant.get():{}; return text(t.tenantId||t.id||Orbit.tenant.tenantId||Orbit.tenant.id); } catch(e){ return ''; }
  }
  function assignedRoles(a) { return unique((a && (a.roles || a.rolesAsignados)) || (a && a.rol ? [a.rol] : [])); }
  function advisorActive(a) { return !!(a && !a.inactivo && ['blocked','suspended','inactive'].indexOf(text(a.status||a.estado).toLowerCase())<0); }
  function membershipValid() {
    if (!storeReady()) return false;
    var a=activeAdvisor(), role=activeRole();
    return advisorActive(a) && !!role && assignedRoles(a).indexOf(role)>=0;
  }
  function moduleScope(a, moduleKey) {
    if (!a) return 'none';
    var ds=a.dataScopes||a.scopes||{};
    var modules=ds.modules&&typeof ds.modules==='object'?ds.modules:{};
    if (modules[moduleKey]!=null) return normScope(modules[moduleKey]);
    if (ds.default!=null) return normScope(ds.default);
    if (a.dataScope!=null) return normScope(a.dataScope);
    try {
      if (Orbit.access && Orbit.access.dataScope) return normScope(Orbit.access.dataScope(moduleKey));
    } catch(e){}
    var role=activeRole();
    if (['Dirección','SuperAdmin','AdminTenant','Admin'].indexOf(role)>=0) return 'all';
    if (role==='Operativo') return 'team';
    if (/Asesor/i.test(role)) return 'own';
    return 'none';
  }
  function moduleVisible(moduleKey) {
    try {
      if (!membershipValid()) return false;
      if (Orbit.tenant && Orbit.tenant.isActive && !Orbit.tenant.isActive(moduleKey)) return false;
      var a=activeAdvisor();
      var restricted=unique(a.modulesRestricted||a.modulosRestringidos);
      if (restricted.indexOf(moduleKey)>=0) return false;
      var extra=unique(a.modulesExtra||a.modulosExtraPermitidos);
      if (extra.indexOf(moduleKey)>=0) return true;
      if (a.modulosOverride && a.modulosOverride.length) return a.modulosOverride.indexOf(moduleKey)>=0;
      if (Orbit.session && Orbit.session.canSee) return Orbit.session.canSee(moduleKey)===true;
      return false;
    } catch(e){ return false; }
  }
  function recordAdvisor(record) {
    record=record||{};
    if (record.asesorId) return text(record.asesorId);
    try {
      if (record.clienteId) { var c=Orbit.store.get('clientes',record.clienteId); if(c) return text(c.asesorId); }
      if (record.polizaId) { var p=Orbit.store.get('polizas',record.polizaId); if(p){ if(p.asesorId)return text(p.asesorId); if(p.clienteId){var c2=Orbit.store.get('clientes',p.clienteId);if(c2)return text(c2.asesorId);}} }
    } catch(e){}
    return '';
  }
  function canAccessRecord(collection, record, action, moduleKey) {
    try {
      record=record||{}; moduleKey=moduleKey||collection;
      if (!membershipValid() || !moduleVisible(moduleKey)) return false;
      var a=activeAdvisor();
      var rt=text(record.tenantId||record.tenant), tt=tenantId();
      if (rt && tt && rt!==tt) return false;
      var country=text(record.country||record.pais).toUpperCase();
      var countries=unique(a.countries||a.paises).map(function(x){return x.toUpperCase();});
      if (country && countries.length && countries.indexOf(country)<0) return false;
      var scope=moduleScope(a,moduleKey);
      if (scope==='none') return false;
      if (scope==='all') return true;
      var owner=recordAdvisor(record), me=currentAdvisorId();
      if (scope==='own') return !!owner && owner===me;
      if (scope==='team') {
        if (!owner || !me) return false;
        if (owner===me) return true;
        var mine=advisorById(me), theirs=advisorById(owner);
        return !!(mine && theirs && text(mine.teamId||mine.equipoId) && text(mine.teamId||mine.equipoId)===text(theirs.teamId||theirs.equipoId));
      }
      return false;
    } catch(e){ return false; }
  }

  function installSessionHardening() {
    if (!Orbit.session || Orbit.session.__v1251Hardened) return;
    var base=Orbit.session;
    var original={rol:base.rol, asesorId:base.asesorId, canSee:base.canSee, set:base.set};
    var wrapper=Object.create(base);
    wrapper.rol=function(){
      var r=''; try{r=text(original.rol&&original.rol());}catch(e){return '';}
      if (!storeReady()) return r;
      var a=activeAdvisor();
      return advisorActive(a)&&assignedRoles(a).indexOf(r)>=0?r:'';
    };
    wrapper.canSee=function(route){
      try{
        if (!membershipValid()) return false;
        var a=activeAdvisor();
        if (unique(a.modulesRestricted||a.modulosRestringidos).indexOf(route)>=0) return false;
        if (unique(a.modulesExtra||a.modulosExtraPermitidos).indexOf(route)>=0) return true;
        return original.canSee ? original.canSee(route)===true : false;
      }catch(e){return false;}
    };
    wrapper.set=function(role,advisorId){
      try{
        var target=advisorById(advisorId||currentAdvisorId());
        if (!advisorActive(target) || assignedRoles(target).indexOf(text(role))<0) return false;
        original.set(role,advisorId); return true;
      }catch(e){return false;}
    };
    wrapper.esAsesor=function(){return wrapper.rol()==='Asesor';};
    wrapper.verEmpresa=function(){return ['Dirección','SuperAdmin','AdminTenant','Admin','Operativo','Finanzas'].indexOf(wrapper.rol())>=0;};
    wrapper.__v1251Hardened=true;
    Orbit.session=wrapper;
  }

  function installAccessScope() {
    Orbit.accessScope={
      VERSION:VERSION,
      rolActivo:activeRole,
      esAsesor:function(){return activeRole()==='Asesor';},
      dataScope:function(moduleKey){var s=moduleScope(activeAdvisor(),moduleKey);return s==='own'?'propia':s==='team'?'equipo':s==='all'?'todo':'ninguno';},
      puedeVerModulo:moduleVisible,
      filtrarPorAsesor:function(items,getAdvisor,moduleKey){return (items||[]).filter(function(row){var clone=Object.assign({},row,{asesorId:getAdvisor?getAdvisor(row):recordAdvisor(row)});return canAccessRecord(moduleKey,clone,'read',moduleKey);});},
      canAccessRecord:canAccessRecord,
      puedeAccederRegistro:function(advisorId,moduleKey,opts){return canAccessRecord(moduleKey,{asesorId:advisorId,pais:opts&&opts.pais,tenantId:opts&&opts.tenantId},(opts&&opts.action)||'read',moduleKey);},
      puedeGestionar:function(){return ['Dirección','SuperAdmin','AdminTenant','Admin','Operativo'].indexOf(activeRole())>=0;},
      esRestringidoCredenciales:function(){return activeRole()==='Asesor';}
    };
  }

  function guardRecord(collection,moduleKey,target,name,resolver) {
    if (!target || typeof target[name]!=='function' || target[name].__v1251Guarded) return;
    var original=target[name];
    target[name]=function(){
      var rec=null; try{rec=resolver.apply(this,arguments);}catch(e){}
      if (rec && !canAccessRecord(collection,rec,'action',moduleKey)) { try{Orbit.ui.toast('Este registro está fuera de tu alcance.');}catch(e){} return null; }
      return original.apply(this,arguments);
    };
    target[name].__v1251Guarded=true;
  }
  function installActionGuards() {
    var ciclo=Orbit.ciclo;
    if (ciclo) {
      ['openNegocio','setEtapa','decidirCierre','perder','archivar','emitir'].forEach(function(name){guardRecord('negocios','leads',ciclo,name,function(id){return Orbit.store.get('negocios',id);});});
      guardRecord('gestiones','ops',ciclo,'openGestion',function(id){return Orbit.store.get('gestiones',id);});
      guardRecord('clientes','ops',ciclo,'solicitarGestion',function(id){return Orbit.store.get('clientes',id);});
      if (typeof ciclo.crearGestion==='function'&&!ciclo.crearGestion.__v1251Guarded) {
        var cg=ciclo.crearGestion; ciclo.crearGestion=function(g){g=g||{};var rec={asesorId:g.asesorId||currentAdvisorId(),pais:g.pais};if(!canAccessRecord('gestiones',rec,'create','ops')){try{Orbit.ui.toast('No puedes asignar esta gestión fuera de tu alcance.');}catch(e){}return null;}g.asesorId=rec.asesorId;return cg.call(this,g);};ciclo.crearGestion.__v1251Guarded=true;
      }
    }
    var cob=Orbit.modules&&Orbit.modules.cobros;
    if (cob) ['detalle','validarReporte','aplicarPago','conciliarFactura'].forEach(function(name){guardRecord('cobros','cobros',cob,name,function(id){return Orbit.store.get('cobros',id)||Orbit.store.get('facturas',id);});});
    var sin=Orbit.modules&&Orbit.modules.siniestros;
    if (sin) guardRecord('siniestros','siniestros',sin,'detalle',function(id){return Orbit.store.get('siniestros',id)||Orbit.store.get('reclamos',id);});
  }

  function fictitiousBankNumber(country,seed) {
    var s=text(seed).replace(/\D/g,''); var tail=(s||String(Date.now())).slice(-7).padStart(7,'0');
    return (country==='CO'?'5123':'3014')+tail;
  }
  function normalizeFictitiousBanks() {
    try {
      if (!Orbit.store || !Orbit.store.all || !Orbit.store.update) return;
      (Orbit.store.all('aseguradoras')||[]).forEach(function(a){
        var accounts=(a.cuentas||a.cuentasBancarias||[]).map(function(c,ci){
          var n=text(c.numero||c.numeroCuenta);
          if (!n || /[*•]/.test(n) || n.replace(/\D/g,'').length<8) n=fictitiousBankNumber(text(a.pais||c.pais).toUpperCase(),a.id+'-'+ci+'-'+n);
          return Object.assign({},c,{numero:n,numeroCuenta:n});
        });
        if (accounts.length) Orbit.store.update('aseguradoras',a.id,{cuentas:accounts,cuentasBancarias:accounts});
      });
    } catch(e){}
  }

  function install() {
    if (installed) return; installed=true;
    installSessionHardening(); installAccessScope(); installActionGuards(); normalizeFictitiousBanks();
    Orbit.empalmeV1251=Object.freeze({version:VERSION,candidateSha256:'23f2252e1304708b383b91c3d809e9224c733f2f854267b76bd2fca10239ac6c',installedAt:new Date().toISOString(),protectedFilesPreserved:true,realDataWritten:false});
    document.addEventListener('orbit:session',function(){installSessionHardening();installAccessScope();});
    document.addEventListener('orbit:store',function(){installActionGuards();});
  }
  function boot(){
    if (window.Orbit&&Orbit.store&&Orbit.session&&Orbit.modules) { install(); return; }
    setTimeout(boot,30);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0);}); else setTimeout(boot,0);
})();
