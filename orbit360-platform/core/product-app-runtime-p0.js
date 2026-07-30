/* ============================================================
   Orbit 360 · Product application runtime P0
   Auth -> membership -> product read-only store -> tenant config -> UI.
   No fallback, no writes, no tenant from URL.
   ============================================================ */
(function(){
  'use strict';
  // M6 6.1.9 static owner: query alias + all-active-collections barrier.
  window.Orbit=window.Orbit||{};
  var activating=null,started=false;
  function cfg(){return window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};}
  function staticCourses(){try{return Orbit.store&&Orbit.store._exportStaticCourses?Orbit.store._exportStaticCourses():[];}catch(e){return[];}}
  function overlayStaticCourses(base,courses){
    courses=Array.isArray(courses)?courses.slice():[];
    if(!courses.length)return base;
    var facade=Object.assign({},base);
    function merged(){var live=base.all('cursos')||[],seen={};return courses.concat(live).filter(function(row){var id=String(row&&row.id||'');if(!id||seen[id])return false;seen[id]=true;return true;});}
    facade.all=function(c){return c==='cursos'?merged():base.all(c);};
    facade.get=function(c,id){return c==='cursos'?(merged().find(function(r){return r&&r.id===id;})||null):base.get(c,id);};
    facade.where=function(c,a,b,d){if(c!=='cursos')return base.where(c,a,b,d);var rows=merged(),argc=arguments.length;if(typeof a==='function')return rows.filter(a);if(a&&typeof a==='object')return rows.filter(function(r){return Object.keys(a).every(function(k){return r[k]===a[k];});});var value=argc>=4?d:b;return rows.filter(function(r){return r&&r[a]===value;});};
    facade.find=function(c,fn){return c==='cursos'&&typeof fn==='function'?(merged().find(fn)||null):(base.find?base.find(c,fn):null);};
    facade.__productStaticOverlayP0=true;
    return facade;
  }
  function collections(){var list=cfg().collections;return Array.isArray(list)&&list.length?list.slice():['clientes','aseguradoras'];}
  function failClient(){try{Orbit.auth.showLogin();}catch(e){}var node=document.getElementById('login-error');if(node)node.textContent='No fue posible abrir la plataforma. Intenta nuevamente.';}
  function waitActiveCollections(store,list,timeoutMs){
    var expected=Array.isArray(list)?list.slice():[],startedAt=Date.now(),timeout=Number(timeoutMs)>0?Number(timeoutMs):20000;
    return new Promise(function(resolve,reject){
      function inspect(){
        var status=store&&typeof store._productStatus==='function'?store._productStatus():{},errors=Object.keys(status.snapshotErrors||{}),done=(status.attachedCollections||[]).concat(status.deniedCollections||[]);
        if(errors.length)return reject(new Error('PRODUCT_COLLECTION_SNAPSHOT_ERROR:'+errors.join(',')));
        if(expected.every(function(name){return done.indexOf(name)>=0;}))return resolve(status);
        if(Date.now()-startedAt>=timeout)return reject(new Error('PRODUCT_COLLECTION_SNAPSHOT_TIMEOUT'));
        setTimeout(inspect,100);
      }
      inspect();
    });
  }
  function hydrateRuntime(providers,result){
    var overlay=Orbit.productConfigSessionOverlayP0,member=Orbit.auth&&Orbit.auth.productUser||{},tenantId=String(member.tenantId||result&&result.status&&result.status.tenantId||'');
    if(!overlay||!tenantId)return Promise.reject(new Error('PRODUCT_RUNTIME_OVERLAY_MISSING'));
    overlay.applyMembership(member);
    return providers.readTenantConfig(tenantId).then(function(config){overlay.applyTenantConfig(config||{});return config||{};});
  }
  function activate(){
    if(activating)return activating;
    var providers=Orbit.productRuntimeBrowserProvidersP0,bootstrap=Orbit.backendProductReadOnlyBootstrapP0;
    if(!providers||!providers.enabled||!providers.enabled()||!bootstrap){failClient();return Promise.resolve({ok:false});}
    var courses=staticCourses(),activeCollections=collections();
    activating=providers.initialize()
      .then(function(){return bootstrap.start(providers.dependencies(),{authorizedProductReadOnly:true,runtimeAuthorized:true,mode:'product',collections:activeCollections,snapshotTimeoutMs:20000});})
      .then(function(result){
        if(!result||result.ok!==true||result.ready!==true||result.writeAuthorized!==false||!Orbit.store||typeof Orbit.store._productStatus!=='function')throw new Error('PRODUCT_BOOTSTRAP_NOT_READY');
        return waitActiveCollections(Orbit.store,activeCollections,20000).then(function(){
          Orbit.store=overlayStaticCourses(Orbit.store,courses);
          return hydrateRuntime(providers,result).then(function(){return result;});
        });
      })
      .then(function(result){
        if(Orbit.router&&typeof Orbit.router.init==='function')Orbit.router.init();
        if(Orbit.novedades&&typeof Orbit.novedades.init==='function')Orbit.novedades.init();
        try{Orbit.store._emit('*');}catch(e){}
        Orbit.auth.showApp();started=true;
        try{window.dispatchEvent(new CustomEvent('orbit:product-ready',{detail:{ready:true,readOnly:true,noFallback:true}}));}catch(e){}
        return result;
      })
      .catch(function(error){activating=null;failClient();throw error;});
    return activating;
  }
  function init(){
    var providers=Orbit.productRuntimeBrowserProvidersP0;
    if(!providers||!providers.enabled||!providers.enabled()){failClient();return;}
    if(Orbit.auth&&typeof Orbit.auth.init==='function')Orbit.auth.init();
  }
  window.Orbit.productAppP0=Object.freeze({VERSION:'p0-m6-20260730.4',init:init,activate:activate,isStarted:function(){return started;},writeAuthorized:false,noFallback:true,tenantSource:'membership_only'});
})();
