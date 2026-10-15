/* ============================================================
   Orbit 360 · Browser product runtime providers P0
   Configuration values come only from generated runtime config.
   Tenant selection is verified from the authenticated membership;
   tenantHint is lookup routing only and is never trusted as identity.
   Server writes use Firebase Functions; browser Firestore remains read-only.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var modulesPromise=null, contextPromise=null;
  function config(){return window.__ORBIT360_PRODUCT_PUBLIC_CONFIG__||{};}
  function enabled(){var c=config();return c.enabled===true&&!!c.projectId&&!!c.authDomain&&!!c.appId&&!!c.apiKey&&!!c.tenantHint;}
  function loadModules(){
    if(modulesPromise)return modulesPromise;
    modulesPromise=Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js')
    ]).then(function(parts){return{app:parts[0],auth:parts[1],store:parts[2],functions:parts[3]};});
    return modulesPromise;
  }
  function initialize(){
    if(!enabled())return Promise.reject(new Error('PRODUCT_RUNTIME_NOT_CONFIGURED'));
    if(contextPromise)return contextPromise;
    contextPromise=loadModules().then(function(m){
      var c=config();
      var app=m.app.getApps().length?m.app.getApps()[0]:m.app.initializeApp({apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,appId:c.appId,storageBucket:c.storageBucket||undefined});
      var auth=m.auth.getAuth(app);
      return{modules:m,app:app,auth:auth,db:m.store.getFirestore(app),functionsByRegion:{}};
    });
    return contextPromise;
  }
  function publicDescriptor(){
    var c=config();
    return Promise.resolve({projectId:'configured',authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:c.storageBucket?'configured':'',environmentRef:c.environmentRef||'product-runtime',controlledExistingIdentity:true,existingProjectReconciled:true,identitySource:'membership_only',readOnly:true,writeAuthorized:false,serverWriteTransport:'firebase-functions'});
  }
  function initialUser(){return initialize().then(function(ctx){if(ctx.auth&&typeof ctx.auth.authStateReady==='function')return ctx.auth.authStateReady().then(function(){return ctx.auth.currentUser||null;});return new Promise(function(resolve,reject){var off=function(){};off=ctx.modules.auth.onAuthStateChanged(ctx.auth,function(user){off();resolve(user||null);},function(error){off();reject(error);});});});}
  function waitUser(){return initialize().then(function(ctx){if(ctx.auth.currentUser)return ctx.auth.currentUser;return new Promise(function(resolve,reject){var off=ctx.modules.auth.onAuthStateChanged(ctx.auth,function(user){if(user){off();resolve(user);}},reject);});});}
  function protectedPreview(){
    return config().scopedReadPreviewCandidate===true &&
      String(window.location&&window.location.hostname||'').includes('--');
  }
  function protectedBootstrap(mode,uid){
    var tenant=String(config().tenantHint||'').trim();
    if(!protectedPreview()||!tenant)return Promise.reject(new Error('PROTECTED_BOOTSTRAP_UNAVAILABLE'));
    return callFunction('orbit360ScopedPolicyReadPreview',{tenantId:tenant,mode:mode,uid:uid||undefined},'us-east1')
      .then(function(r){
        if(!r||r.ok!==true||r.serverScoped!==true||r.mode!==mode||
           r.tenantId!==tenant||!r.uid||(uid&&r.uid!==uid))
          throw new Error('PROTECTED_BOOTSTRAP_RESPONSE_INVALID');
        return r;
      });
  }
  function membershipByUid(uid){
    if(protectedPreview())return protectedBootstrap('bootstrap-membership',uid).then(function(r){
      if(!r.membership||r.membership.uid!==uid||r.membership.tenantId!==r.tenantId||
         r.membership.status!=='active'||!Array.isArray(r.membership.roles)||!r.membership.roles.length)
        throw new Error('PROTECTED_BOOTSTRAP_MEMBERSHIP_INVALID');
      return r.membership;
    });
    return initialize().then(function(ctx){var c=config();var ref=ctx.modules.store.doc(ctx.db,'tenants/'+c.tenantHint+'/members/'+uid);return ctx.modules.store.getDoc(ref).then(function(snap){if(!snap.exists())throw new Error('MEMBERSHIP_NOT_AVAILABLE');var row=snap.data()||{};if(String(row.uid||'')!==String(uid||'')||String(row.tenantId||'')!==String(c.tenantHint||''))throw new Error('MEMBERSHIP_IDENTITY_MISMATCH');return row;});});
  }
  function readTenantConfig(tenantId){
    var c=config();
    if(String(tenantId||'')!==String(c.tenantHint||''))return Promise.reject(new Error('TENANT_CONFIG_SCOPE_MISMATCH'));
    if(protectedPreview())return protectedBootstrap('bootstrap-tenant-config','').then(function(r){
      if(!r.config||typeof r.config!=='object'||Array.isArray(r.config))
        throw new Error('PROTECTED_BOOTSTRAP_CONFIG_INVALID');
      return r.config;
    });
    return initialize().then(function(ctx){var ref=ctx.modules.store.doc(ctx.db,'tenants/'+tenantId+'/system/config');return ctx.modules.store.getDoc(ref).then(function(snap){return snap.exists()?(snap.data()||{}):{};});});
  }
  function callFunction(name,data,region){
    name=String(name||'').trim();region=String(region||'us-central1').trim();
    if(!/^[A-Za-z][A-Za-z0-9_]{2,120}$/.test(name))return Promise.reject(new Error('PRODUCT_FUNCTION_NAME_INVALID'));
    return initialize().then(function(ctx){
      var fx=ctx.functionsByRegion[region];
      if(!fx){fx=ctx.modules.functions.getFunctions(ctx.app,region);ctx.functionsByRegion[region]=fx;}
      var callable=name==='orbit360ScopedPolicyReadPreview'?ctx.modules.functions.httpsCallable(fx,name,{timeout:16000}):ctx.modules.functions.httpsCallable(fx,name);return callable(data||{});
    }).then(function(result){return result&&Object.prototype.hasOwnProperty.call(result,'data')?result.data:result;});
  }

  function protectedReadPage(data){
    var v=data||{},cfg=config(),host=String(window.location&&window.location.hostname||'');
    var coll=String(v.collection||'').trim(),tenant=String(v.tenantId||'').trim();
    if(!host.includes('--'))return Promise.reject(new Error('PROTECTED_READ_PREVIEW_ONLY'));
    if(!protectedPreview())return Promise.reject(new Error('PROTECTED_READ_CANDIDATE_DISABLED'));
    if(!tenant||tenant!==String(cfg.tenantHint||''))return Promise.reject(new Error('PROTECTED_READ_TENANT_DENIED'));
    if(!['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','aseguradoras','asesores','negocios','gestiones','actividades','metas'].includes(coll)||
       !['GT','CO'].includes(String(v.country||'').toUpperCase())||!String(v.activeRole||'').trim())
       return Promise.reject(new Error('PROTECTED_READ_PARAMETERS_DENIED'));
    var ids=v.policyIds,hasIds=Object.prototype.hasOwnProperty.call(v,'policyIds')&&ids!==undefined;
    var related=['vehiculos','recibosEsperados','carteraPrimas','cobros'].includes(coll);
    if(hasIds&&(!related||String(v.policyId||'').trim()||!Array.isArray(ids)||
      ids.length<1||ids.length>10||new Set(ids).size!==ids.length||
      ids.some(function(id){return !String(id||'').trim()||String(id).includes('/');})))
      return Promise.reject(new Error('PROTECTED_READ_POLICY_BATCH_INVALID'));
    if(related&&!String(v.policyId||'').trim()&&!hasIds&&!['vehiculos','recibosEsperados','carteraPrimas','cobros'].includes(coll))
      return Promise.reject(new Error('PROTECTED_READ_POLICY_ANCHOR_REQUIRED'));
    var outbound=Object.assign({},v,{collection:coll,tenantId:tenant,mode:'list'});
    if(!hasIds)delete outbound.policyIds;
    return callFunction('orbit360ScopedPolicyReadPreview',outbound,'us-east1')
      .then(function(r){
        if(!r||r.ok!==true||r.serverScoped!==true||r.collection!==coll||
           r.country!==String(v.country).toUpperCase()||!Array.isArray(r.rows))
          throw new Error('PROTECTED_READ_SERVER_RESPONSE_INVALID');
        return r;
      });
  }

  function dependencies(){
    return{
      environmentProvider:{describePublicConfig:publicDescriptor},
      firebaseAdapter:{initializeFromEnvironment:function(){return initialize();},storeDependencies:function(ctx){var m=ctx.modules.store;return{db:ctx.db,collection:m.collection,query:m.query,where:m.where,onSnapshot:m.onSnapshot,getDocsFromServer:m.getDocsFromServer};}},
      authProvider:{waitForAuthenticatedUser:function(){return waitUser().then(function(u){return{uid:u.uid,email:u.email||'',emailVerified:u.emailVerified===true,disabled:false};});}},
      membershipProvider:{getByUid:membershipByUid},protectedReadPage:protectedReadPage
    };
  }
  function signIn(email,password){return initialize().then(function(ctx){return ctx.modules.auth.signInWithEmailAndPassword(ctx.auth,String(email||'').trim(),String(password||''));});}
  function signOut(){return initialize().then(function(ctx){return ctx.modules.auth.signOut(ctx.auth);});}
  function sendVerificationEmail(user){
    return initialize().then(function(ctx){var target=user||ctx.auth.currentUser;if(!target)throw new Error('AUTH_USER_NOT_AVAILABLE');return ctx.modules.auth.sendEmailVerification(target);});
  }
  function updateCurrentUserPassword(password){
    return initialize().then(function(ctx){var target=ctx.auth.currentUser;if(!target)throw new Error('AUTH_USER_NOT_AVAILABLE');return ctx.modules.auth.updatePassword(target,String(password||''));});
  }
  window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze({VERSION:'p0-b1-20260919.1',enabled:enabled,initialize:initialize,dependencies:dependencies,signIn:signIn,signOut:signOut,sendVerificationEmail:sendVerificationEmail,updateCurrentUserPassword:updateCurrentUserPassword,initialUser:initialUser,waitForUser:waitUser,readTenantConfig:readTenantConfig,callFunction:callFunction,protectedReadPage:protectedReadPage,configDescriptor:publicDescriptor,containsSecrets:false,tenantSource:'membership_only',browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',authoritativeFirstRead:true,authPersistence:'firebase-default-local',noFallback:true});
})();
