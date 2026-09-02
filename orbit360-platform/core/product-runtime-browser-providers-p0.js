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
      return{modules:m,app:app,auth:m.auth.getAuth(app),db:m.store.getFirestore(app),functionsByRegion:{}};
    });
    return contextPromise;
  }
  function publicDescriptor(){
    var c=config();
    return Promise.resolve({projectId:'configured',authDomain:'configured',appId:'configured',hasApiKey:true,storageBucket:c.storageBucket?'configured':'',environmentRef:c.environmentRef||'product-runtime',controlledExistingIdentity:true,existingProjectReconciled:true,identitySource:'membership_only',readOnly:true,writeAuthorized:false,serverWriteTransport:'firebase-functions'});
  }
  function waitUser(){return initialize().then(function(ctx){if(ctx.auth.currentUser)return ctx.auth.currentUser;return new Promise(function(resolve,reject){var off=ctx.modules.auth.onAuthStateChanged(ctx.auth,function(user){if(user){off();resolve(user);}},reject);});});}
  function membershipByUid(uid){
    return initialize().then(function(ctx){var c=config();var ref=ctx.modules.store.doc(ctx.db,'tenants/'+c.tenantHint+'/members/'+uid);return ctx.modules.store.getDoc(ref).then(function(snap){if(!snap.exists())throw new Error('MEMBERSHIP_NOT_AVAILABLE');var row=snap.data()||{};if(String(row.uid||'')!==String(uid||'')||String(row.tenantId||'')!==String(c.tenantHint||''))throw new Error('MEMBERSHIP_IDENTITY_MISMATCH');return row;});});
  }
  function readTenantConfig(tenantId){
    return initialize().then(function(ctx){var c=config();if(String(tenantId||'')!==String(c.tenantHint||''))throw new Error('TENANT_CONFIG_SCOPE_MISMATCH');var ref=ctx.modules.store.doc(ctx.db,'tenants/'+tenantId+'/system/config');return ctx.modules.store.getDoc(ref).then(function(snap){return snap.exists()?(snap.data()||{}):{};});});
  }
  function callFunction(name,data,region){
    name=String(name||'').trim();region=String(region||'us-central1').trim();
    if(!/^[A-Za-z][A-Za-z0-9_]{2,120}$/.test(name))return Promise.reject(new Error('PRODUCT_FUNCTION_NAME_INVALID'));
    return initialize().then(function(ctx){
      var fx=ctx.functionsByRegion[region];
      if(!fx){fx=ctx.modules.functions.getFunctions(ctx.app,region);ctx.functionsByRegion[region]=fx;}
      return ctx.modules.functions.httpsCallable(fx,name)(data||{});
    }).then(function(result){return result&&Object.prototype.hasOwnProperty.call(result,'data')?result.data:result;});
  }
  function dependencies(){
    return{
      environmentProvider:{describePublicConfig:publicDescriptor},
      firebaseAdapter:{initializeFromEnvironment:function(){return initialize();},storeDependencies:function(ctx){var m=ctx.modules.store;return{db:ctx.db,collection:m.collection,query:m.query,where:m.where,onSnapshot:m.onSnapshot,getDocsFromServer:m.getDocsFromServer};}},
      authProvider:{waitForAuthenticatedUser:function(){return waitUser().then(function(u){return{uid:u.uid,email:u.email||'',emailVerified:u.emailVerified===true,disabled:false};});}},
      membershipProvider:{getByUid:membershipByUid}
    };
  }
  function signIn(email,password){return initialize().then(function(ctx){return ctx.modules.auth.signInWithEmailAndPassword(ctx.auth,String(email||'').trim(),String(password||''));});}
  function signOut(){return initialize().then(function(ctx){return ctx.modules.auth.signOut(ctx.auth);});}
  window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze({VERSION:'p0-i4a-authoritative-first-read-20260902.2',enabled:enabled,initialize:initialize,dependencies:dependencies,signIn:signIn,signOut:signOut,waitForUser:waitUser,readTenantConfig:readTenantConfig,callFunction:callFunction,configDescriptor:publicDescriptor,containsSecrets:false,tenantSource:'membership_only',browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',authoritativeFirstRead:true,noFallback:true});
})();
