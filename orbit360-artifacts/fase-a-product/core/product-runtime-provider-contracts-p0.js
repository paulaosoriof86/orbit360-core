/* ============================================================
   Orbit 360 · Contratos runtime con identidad existente P0
   Fecha: 2026-07-24

   Contrato puro para M2 read-only sobre proyecto, Auth y membership
   existentes. No contiene valores, no consulta y no escribe.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var VERSION = 'p0-m2-existing-identity-20260724';
  var REQUIRED_PUBLIC_CONFIG_FIELDS = Object.freeze([
    'projectIdPresent','authDomainPresent','appIdPresent','apiKeyPresent','environmentRefPresent'
  ]);
  var REQUIRED_PROVIDER_METHODS = Object.freeze({
    environmentProvider:['describePublicConfig'],
    firebaseAdapter:['initializeFromEnvironment','storeDependencies'],
    authProvider:['waitForAuthenticatedUser'],
    membershipProvider:['getByUid']
  });
  function unique(values){ return Array.from(new Set([].concat(values||[]).filter(Boolean))); }
  function validatePublicConfigDescriptor(input){
    input=input||{}; var errors=[];
    REQUIRED_PUBLIC_CONFIG_FIELDS.forEach(function(field){ if(input[field]!==true) errors.push('config_descriptor_missing:'+field); });
    if(input.containsValues===true) errors.push('config_values_not_allowed_in_descriptor');
    if(input.containsSecrets===true) errors.push('secrets_not_allowed_in_descriptor');
    return {ok:errors.length===0,errors:errors,sanitized:true};
  }
  function validateProviderShape(name,provider){
    var expected=REQUIRED_PROVIDER_METHODS[name]||[];
    var missing=expected.filter(function(method){ return !provider||typeof provider[method]!=='function'; });
    return {ok:expected.length>0&&missing.length===0,provider:name,requiredMethods:expected.slice(),missingMethods:missing,runtimeExecuted:false};
  }
  function validateProviderBundle(bundle){
    bundle=bundle||{}; var results={},errors=[];
    Object.keys(REQUIRED_PROVIDER_METHODS).forEach(function(name){ results[name]=validateProviderShape(name,bundle[name]); if(!results[name].ok) errors.push(name+':'+results[name].missingMethods.join(',')); });
    return {ok:errors.length===0,version:VERSION,results:results,errors:unique(errors),secretAccess:false,firebaseAccess:false,firestoreRead:false,writes:false,runtimeExecuted:false};
  }
  function authorizationReadiness(input){
    input=input||{};
    var config=validatePublicConfigDescriptor(input.publicConfigDescriptor||{});
    var providers=validateProviderBundle(input.providers||{});
    var errors=[].concat(config.errors||[],providers.errors||[]);
    if(input.explicitAuthorization!==true) errors.push('explicit_runtime_authorization_required');
    if(input.readOnly!==true) errors.push('read_only_required');
    if(input.writeAuthorized!==false||input.operationalWrites!==false) errors.push('writes_must_remain_blocked');
    if(input.existingProjectReconciled!==true) errors.push('existing_project_reconciliation_required');
    if(input.existingAuthUserRequired!==true) errors.push('existing_auth_user_required');
    if(input.existingMembershipRequired!==true) errors.push('existing_membership_required');
    if(input.createProject!==false||input.createAuthUser!==false||input.createMembership!==false) errors.push('identity_creation_forbidden');
    if(input.rulesChangeAuthorized!==false) errors.push('rules_change_must_remain_forbidden');
    if(input.noWriteExecutionPlanApproved!==true) errors.push('no_write_execution_plan_required');
    return {ok:errors.length===0,readyForAuthorizedRuntime:errors.length===0,version:VERSION,errors:unique(errors),writeAuthorized:false,tenantSource:'membership_only',existingIdentityOnly:true,rulesChangeAuthorized:false,queryStringTenantAllowed:false,productRuntimeExecuted:false};
  }
  window.Orbit.productRuntimeProviderContractsP0=Object.freeze({
    VERSION:VERSION,REQUIRED_PUBLIC_CONFIG_FIELDS:REQUIRED_PUBLIC_CONFIG_FIELDS,REQUIRED_PROVIDER_METHODS:REQUIRED_PROVIDER_METHODS,
    validatePublicConfigDescriptor:validatePublicConfigDescriptor,validateProviderShape:validateProviderShape,
    validateProviderBundle:validateProviderBundle,authorizationReadiness:authorizationReadiness,
    containsValues:false,containsSecrets:false,autoStart:false,writeAuthorized:false,existingIdentityOnly:true,rulesChangeAuthorized:false
  });
})();
