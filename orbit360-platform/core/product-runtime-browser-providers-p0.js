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
  // I6.6 Preview exposes read-only business data and permits only bounded,
  // namespaced synthetic UAT writes through existing Preview callables.
  // Real customer/policy/collection writes from this channel remain denied.
  function isI66PreviewHost(){
    var host=String(window.location&&window.location.hostname||'').toLowerCase();
    return /^ays-orbit-360-lab--gi-i66-rc-[a-z0-9-]+\.web\.app$/.test(host);
  }
  var I66_READ_ONLY_CALLABLES=Object.freeze({
    orbit360ScopedPolicyReadPreview:true,
    orbit360AssignableAdvisorRosterPreview:true,
    orbit360TenantDomainConfigPreview:true,
    orbit360ProductAssetReadPreview:true
  });
  function i66ReadOnlyCallableError(name,data,region){
    if(!isI66PreviewHost())return '';
    // The payment contract was already deployed in us-central1. Its Preview
    // endpoint may act on *synthetic* fixtures only; LIVE payments remain
    // unreachable from this origin, including via a forged region argument.
    if(name==='orbit360CobrosReconciliationCommandPreview'){
      if(region!=='us-central1')return 'I66_PREVIEW_REGION_DENIED';
      var paymentOp=String(data&&data.operation||'');
      var paymentPayload=data&&data.payload;
      if(String(data&&data.tenantId||'')!=='alianzas-soluciones'||!paymentPayload||typeof paymentPayload!=='object')
        return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
      var proposalId=String(paymentPayload.proposalId||''),proposalRun=String(paymentPayload.sourceRunId||'');
      if(paymentOp==='preview_proposal_application'){
        return /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(proposalId)&&
          /^(?:cobledger_[a-f0-9]{28}|cobledgerqa_[a-z0-9_]{12,80})$/.test(proposalRun)?'':'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
      }
      if(['resolve_proposal_application','apply_proposal_application'].includes(paymentOp)){
        return /^b3005qa_i66_proposal_[a-z0-9_]{12,100}$/.test(proposalId)&&
          /^cobledgerqa_[a-z0-9_]{12,80}$/.test(proposalRun)?'':'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
      }
      var paymentId=String(paymentPayload&&(paymentPayload.receiptId||paymentPayload.reciboId||paymentPayload.polizaId||paymentPayload.policyId)||'');
      if(String(data&&data.tenantId||'')!=='alianzas-soluciones'||
         !['preview_policy','apply_payment','reconcile_payment'].includes(paymentOp)||
         !/^(?:b3004qa|b3005qa|b3004human|b3005human)_[a-z0-9._:-]+$/i.test(paymentId)||
         !paymentPayload||typeof paymentPayload!=='object')return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
      return '';
    }
    if(region!=='us-east1')return 'I66_PREVIEW_REGION_DENIED';
    if(name==='orbit360OpsLeadsCommandPreview'){
      var action=String(data&&data.operation||'');
      var entityId=String(data&&(data.entityId||data.payload&&data.payload.id)||'');
      if(!/^(create_management|update_management|assign_management|resolve_management|reopen_management|archive_management|create_business|update_business|transition_business|archive_business)$/.test(action)||
         !/^b4003qa_[a-z0-9._:-]+$/i.test(entityId)||
         String(data&&data.tenantId||'')!=='alianzas-soluciones'||
         !data||!data.payload||typeof data.payload!=='object')return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
      return '';
    }
    if(name==='orbit360ProductOperationalCommandPreview'){
      if(data&&data.advisorAssignmentCorrection){
        var correction=data.advisorAssignmentCorrection;
        var correctionQaId=function(value){return typeof value==='string'&&/^b4003qa_[A-Za-z0-9._:-]+$/.test(value);};
        if(String(data.tenantId||'')!=='alianzas-soluciones'||typeof correction!=='object'||Array.isArray(correction)||
           data.advisorPayable!==undefined||data.mutations!==undefined||correction.version!==1||
           !['preview','commit'].includes(correction.operation)||typeof correction.updateClient!=='boolean'||
           !correctionQaId(correction.clientId)||!correctionQaId(correction.targetAdvisorId)||
           !Array.isArray(correction.policyIds)||!correction.policyIds.length||
           correction.policyIds.length+(correction.updateClient?1:0)>20||
           new Set(correction.policyIds).size!==correction.policyIds.length||correction.policyIds.some(function(id){return!correctionQaId(id);}))
          return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
        return '';
      }
      // CxP is a distinct server-owned command, not a generic mutation batch.
      // Only the already authorized disposable QA envelope may cross Preview;
      // the server still enforces signed roles, ownership, scope and restoration.
      if(data&&data.advisorPayable){
        var payable=data.advisorPayable;
        var qaId=function(value){return typeof value==='string'&&/^(?:b3004qa|b4003qa)_[A-Za-z0-9._:-]+$/.test(value);};
        if(String(data.tenantId||'')!=='alianzas-soluciones'||typeof payable!=='object'||Array.isArray(payable)||
           payable.version!==1||payable.syntheticQa!==true||
           (data.mutations!==undefined&&(!Array.isArray(data.mutations)||data.mutations.length!==0)))
          return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
        if(payable.operation==='restoreSynthetic'){
          return /^advisorpay_[a-f0-9]{32}$/.test(String(payable.preparedRequestId||''))&&
            payable.advisorId===undefined&&payable.lines===undefined&&payable.commissionIds===undefined
            ?'':'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
        }
        var refs=payable.commissionIds===undefined?[]:payable.commissionIds;
        var lines=payable.lines===undefined?[]:payable.lines;
        if(!['preview','prepare'].includes(payable.operation)||!qaId(payable.advisorId)||
           !/^\d{4}-\d{2}-\d{2}$/.test(String(payable.cutoff||''))||
           !Array.isArray(refs)||!Array.isArray(lines)||refs.length+lines.length<1||refs.length+lines.length>40||
           (refs.length&&lines.length)||refs.some(function(id){return !qaId(id);})||
           lines.some(function(row){return !row||typeof row!=='object'||Array.isArray(row)||!qaId(row.polizaId)||
             Object.prototype.hasOwnProperty.call(row,'commissionId');}))return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
        return '';
      }
      var mutations=data&&data.mutations;
      if(String(data&&data.tenantId||'')!=='alianzas-soluciones'||!Array.isArray(mutations)||mutations.length<1||mutations.length>8||
         mutations.some(function(m){return !m||!['insert','update','remove'].includes(String(m.action||''))||
           !/(?:^|_)(?:b3004qa|b4003qa)_[a-z0-9._:-]+$/i.test(String(m.id||''))||
           (m.action!=='remove'&&(!m.payload||m.payload.__syntheticQa!==true));}))return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
      return '';
    }
    if(I66_READ_ONLY_CALLABLES[name]!==true)return 'I66_PREVIEW_MUTATION_CALLABLE_DENIED';
    if(name==='orbit360TenantDomainConfigPreview'&&(!data||data.action!=='get'))
      return 'I66_PREVIEW_DOMAIN_CONFIG_WRITE_DENIED';
    if(name==='orbit360ScopedPolicyReadPreview'&&(!data||!['list','bootstrap-membership','bootstrap-tenant-config'].includes(String(data.mode||''))))
      return 'I66_PREVIEW_SCOPED_READ_MODE_DENIED';
    return '';
  }
  // One immutable candidate must use the protected transport in Preview AND
  // after promotion of those same bytes to the certified Hosting site. The
  // hostname selects a separately deployed callable; it never grants access.
  function protectedHostMode(){
    var host=String(window.location&&window.location.hostname||'').toLowerCase();
    if(/^ays-orbit-360-lab--gi-i65-b4-[a-z0-9-]+\.web\.app$/.test(host))return 'preview';
    if(/^ays-orbit-360-lab--gi-i66-rc-[a-z0-9-]+\.web\.app$/.test(host))return 'preview';
    // The customer-facing HostDime origin uses the same protected LIVE
    // callable; the domain is an exact match, never a wildcard or suffix.
    if(host==='ays-orbit-360-lab.web.app'||host==='ays-orbit-360-lab.firebaseapp.com'||host==='app.aysseguros.com')return 'live';
    return '';
  }
  function protectedTransportError(){
    var requested=config().scopedReadPreviewCandidate===true,mode=protectedHostMode();
    if(mode&&!requested)return 'PROTECTED_READ_CANDIDATE_DISABLED';
    if(requested&&!mode)return 'PROTECTED_READ_HOST_DENIED';
    return '';
  }
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
    var scopeError=protectedTransportError();
    if(scopeError)return Promise.reject(new Error(scopeError));
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
  function protectedMode(){
    return config().scopedReadPreviewCandidate===true?protectedHostMode():'';
  }
  function protectedReaderName(){
    var mode=protectedMode();
    if(mode==='preview')return 'orbit360ScopedPolicyReadPreview';
    if(mode==='live')return 'orbit360ScopedPolicyRead';
    throw new Error('PROTECTED_READ_HOST_DENIED');
  }
  function protectedBootstrap(mode,uid){
    var tenant=String(config().tenantHint||'').trim();
    if(!protectedMode()||!tenant)return Promise.reject(new Error('PROTECTED_BOOTSTRAP_UNAVAILABLE'));
    return callFunction(protectedReaderName(),{tenantId:tenant,mode:mode,uid:uid||undefined},'us-east1')
      .then(function(r){
        if(!r||r.ok!==true||r.serverScoped!==true||r.mode!==mode||
           r.tenantId!==tenant||!r.uid||(uid&&r.uid!==uid))
          throw new Error('PROTECTED_BOOTSTRAP_RESPONSE_INVALID');
        return r;
      });
  }
  function membershipByUid(uid){
    if(protectedMode())return protectedBootstrap('bootstrap-membership',uid).then(function(r){
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
    if(protectedMode())return protectedBootstrap('bootstrap-tenant-config','').then(function(r){
      if(!r.config||typeof r.config!=='object'||Array.isArray(r.config))
        throw new Error('PROTECTED_BOOTSTRAP_CONFIG_INVALID');
      return r.config;
    });
    return initialize().then(function(ctx){var ref=ctx.modules.store.doc(ctx.db,'tenants/'+tenantId+'/system/config');return ctx.modules.store.getDoc(ref).then(function(snap){return snap.exists()?(snap.data()||{}):{};});});
  }
  function callFunction(name,data,region){
    name=String(name||'').trim();region=String(region||'us-central1').trim();
    if(!/^[A-Za-z][A-Za-z0-9_]{2,120}$/.test(name))return Promise.reject(new Error('PRODUCT_FUNCTION_NAME_INVALID'));
    var previewSafety=i66ReadOnlyCallableError(name,data,region);
    if(previewSafety)return Promise.reject(new Error(previewSafety));
    return initialize().then(function(ctx){
      var fx=ctx.functionsByRegion[region];
      if(!fx){fx=ctx.modules.functions.getFunctions(ctx.app,region);ctx.functionsByRegion[region]=fx;}
      var callable=name==='orbit360ScopedPolicyReadPreview'||name==='orbit360ScopedPolicyRead'
        ?ctx.modules.functions.httpsCallable(fx,name,{timeout:16000}):ctx.modules.functions.httpsCallable(fx,name);
      return callable(data||{});
    }).then(function(result){return result&&Object.prototype.hasOwnProperty.call(result,'data')?result.data:result;});
  }

  function protectedReadPage(data){
    var v=data||{},cfg=config(),mode=protectedMode();
    var coll=String(v.collection||'').trim(),tenant=String(v.tenantId||'').trim();
    if(!mode)return Promise.reject(new Error('PROTECTED_READ_CANDIDATE_DISABLED'));
    if(!tenant||tenant!==String(cfg.tenantHint||''))return Promise.reject(new Error('PROTECTED_READ_TENANT_DENIED'));
    if(!['clientes','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros','conciliaciones','conciliacionesPrimas','aseguradoras','asesores','negocios','gestiones','actividades','metas','cancelaciones','reclamos','comisiones','finmovs','tareas','auditoria'].includes(coll)||
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
    return callFunction(protectedReaderName(),outbound,'us-east1')
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
  function signIn(email,password){return initialize().then(function(ctx){
    // Firebase's default LOCAL session is shared across every tab of this
    // origin. Switching between Dirección and Operativo in another tab used
    // to leave the first tab's productUser pointing at a different signed UID.
    // New interactive logins get tab-scoped SESSION before credentials are
    // accepted; existing restored sessions are not forcibly migrated/logged out.
    return ctx.modules.auth.setPersistence(ctx.auth,ctx.modules.auth.browserSessionPersistence)
      .then(function(){return ctx.modules.auth.signInWithEmailAndPassword(ctx.auth,String(email||'').trim(),String(password||''));});
  });}
  function signOut(){return initialize().then(function(ctx){return ctx.modules.auth.signOut(ctx.auth);});}
  function sendVerificationEmail(user){
    return initialize().then(function(ctx){var target=user||ctx.auth.currentUser;if(!target)throw new Error('AUTH_USER_NOT_AVAILABLE');return ctx.modules.auth.sendEmailVerification(target);});
  }
  function updateCurrentUserPassword(password){
    return initialize().then(function(ctx){var target=ctx.auth.currentUser;if(!target)throw new Error('AUTH_USER_NOT_AVAILABLE');return ctx.modules.auth.updatePassword(target,String(password||''));});
  }
  window.Orbit.productRuntimeBrowserProvidersP0=Object.freeze({VERSION:'p0-b1-20261111.2-session-isolated',enabled:enabled,initialize:initialize,dependencies:dependencies,signIn:signIn,signOut:signOut,sendVerificationEmail:sendVerificationEmail,updateCurrentUserPassword:updateCurrentUserPassword,initialUser:initialUser,waitForUser:waitUser,readTenantConfig:readTenantConfig,callFunction:callFunction,protectedReadPage:protectedReadPage,configDescriptor:publicDescriptor,protectedHostMode:protectedHostMode,isI66PreviewHost:isI66PreviewHost,containsSecrets:false,tenantSource:'membership_only',browserFirestoreWriteAuthorized:false,serverWriteTransport:'firebase-functions',authoritativeFirstRead:true,authPersistence:'firebase-browser-session-on-new-login',noFallback:true});
})();
