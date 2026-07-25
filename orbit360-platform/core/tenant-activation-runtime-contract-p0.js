/* ============================================================
   Orbit 360 · Contrato P0 de activación controlada read-only
   Fecha: 2026-07-24
   Ejecuta M3 únicamente sobre identidad/membership existentes.
   No persiste configuración, memberships ni datos operativos.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  var VERSION = '3.1.0-readonly-20260724';
  var STATUS = 'M3_TENANT_ACTIVATED_READONLY';
  var ALLOWED_SOURCES = Object.freeze(['activation_manifest', 'backend_tenant_config', 'membership_projection']);
  var COUNTRY_CURRENCY = Object.freeze({ GT: 'GTQ', CO: 'COP' });
  var ALLOWED_INTEGRATION_STATES = Object.freeze(['disabled', 'reference_only', 'configured_not_connected', 'backend_required', 'connected_real']);
  var SENSITIVE_KEYS = Object.freeze(['password','pass','pwd','contrasena','clave','secret','token','apikey','api_key','accesstoken','access_token','refreshtoken','refresh_token','privatekey','private_key','clientsecret','client_secret','credentialvalue','credential_value']);

  function text(value) { return String(value == null ? '' : value).trim(); }
  function lower(value) { return text(value).toLowerCase(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value && typeof value === 'object' ? Object.assign({}, value) : value; } }
  function unique(values) { var out=[]; (Array.isArray(values)?values:[]).forEach(function(value){var clean=text(value);if(clean&&out.indexOf(clean)<0)out.push(clean);}); return out; }
  function secretPaths(input) {
    var found=[];
    function walk(value,path){
      if(!value||typeof value!=='object')return;
      Object.keys(value).forEach(function(key){
        var current=path?path+'.'+key:key;
        var normalized=lower(key).replace(/[-_]/g,'');
        if(SENSITIVE_KEYS.map(function(item){return item.replace(/[-_]/g,'');}).indexOf(normalized)>=0&&value[key]!=null&&text(value[key])!=='')found.push(current);
        if(value[key]&&typeof value[key]==='object')walk(value[key],current);
      });
    }
    walk(input,'');return found;
  }
  function canonicalTenant(value) {
    var owner=window.Orbit.tenantCanonicalPathsP0;
    if(owner&&typeof owner.validateTenantId==='function')return owner.validateTenantId(value);
    var tenantId=lower(value).replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
    return {ok:!!tenantId&&tenantId===text(value),tenantId:tenantId,errors:tenantId===text(value)?[]:['tenant_no_canonico']};
  }
  function normalize(input) {
    input=input||{};
    return {
      tenantId:text(input.tenantId),
      projectId:text(input.projectId),
      m2RuntimeStatus:text(input.m2RuntimeStatus),
      m3StaticStatus:text(input.m3StaticStatus),
      identitySource:lower(input.identitySource),
      tenantResolutionSource:lower(input.tenantResolutionSource),
      sourceOfTruth:lower(input.sourceOfTruth),
      controlledExistingIdentityAccepted:input.controlledExistingIdentityAccepted===true,
      eligibleMemberships:Number(input.eligibleMemberships||0),
      readOnlyBootstrapValidated:input.readOnlyBootstrapValidated===true,
      storeNoFallback:input.storeNoFallback===true,
      storeWriteEnabled:input.storeWriteEnabled===true,
      localWriteBlocked:input.localWriteBlocked===true,
      countries:unique(input.countries).map(function(item){return item.toUpperCase();}),
      countryConfig:clone(input.countryConfig||{}),
      branding:clone(input.branding||{}),
      modules:unique(input.modules),
      integrations:Array.isArray(input.integrations)?input.integrations.map(function(item){return {key:text(item&&item.key),state:lower(item&&item.state),active:item&&item.active===true,connectionVerified:item&&item.connectionVerified===true};}):[],
      accessExpansion:input.accessExpansion===true,
      actor:clone(input.actor||{}),
      activationAuthorized:input.activationAuthorized===true,
      activationExecuted:input.activationExecuted===true,
      persistence:clone(input.persistence||{}),
      deployRequested:input.deployRequested===true,
      importsRequested:input.importsRequested===true,
      rulesChangeRequested:input.rulesChangeRequested===true,
      raw:clone(input)
    };
  }
  function validate(input) {
    var value=normalize(input),tenant=canonicalTenant(value.tenantId),errors=[];
    if(!tenant.ok)errors.push.apply(errors,tenant.errors||['tenant_invalido']);
    if(!value.projectId)errors.push('project_id_faltante');
    if(value.m2RuntimeStatus!=='M2_EXISTING_IDENTITY_RUNTIME_VALIDATED')errors.push('m2_runtime_no_cerrado');
    if(value.m3StaticStatus!=='M3_TENANT_ACTIVATION_STATIC_READY')errors.push('m3_static_no_cerrado');
    if(value.identitySource!=='membership_only')errors.push('identity_source_no_membership_only');
    if(value.tenantResolutionSource!=='membership')errors.push('tenant_no_resuelto_desde_membership');
    if(ALLOWED_SOURCES.indexOf(value.sourceOfTruth)<0)errors.push('fuente_activacion_invalida');
    if(!value.controlledExistingIdentityAccepted)errors.push('identidad_existente_no_aceptada');
    if(value.eligibleMemberships!==1)errors.push('membership_elegible_no_unica');
    if(!value.readOnlyBootstrapValidated)errors.push('bootstrap_readonly_no_validado');
    if(!value.storeNoFallback)errors.push('store_fallback_no_bloqueado');
    if(value.storeWriteEnabled)errors.push('store_escritura_habilitada');
    if(!value.localWriteBlocked)errors.push('bloqueo_escritura_local_no_probado');
    if(!value.countries.length)errors.push('paises_faltantes');
    value.countries.forEach(function(country){var cfg=value.countryConfig[country]||{},currency=text(cfg.currency||cfg.moneda).toUpperCase(),expected=COUNTRY_CURRENCY[country]||'';if(!currency)errors.push('config_pais_incompleta:'+country);if(expected&&currency!==expected)errors.push('pais_moneda_inconsistente:'+country);});
    if(!text(value.branding.name||value.branding.empresa))errors.push('branding_incompleto');
    if(!value.modules.length)errors.push('modulos_faltantes');
    value.integrations.forEach(function(item,index){if(!item.key)errors.push('integracion_'+index+':clave_faltante');if(ALLOWED_INTEGRATION_STATES.indexOf(item.state)<0)errors.push('integracion_'+index+':estado_invalido');if(item.active&&item.state!=='connected_real')errors.push('integracion_'+index+':activa_sin_conexion_real');if(item.state==='connected_real'&&!item.connectionVerified)errors.push('integracion_'+index+':conexion_no_verificada');});
    if(!text(value.actor.userId)||!text(value.actor.reason)||text(value.actor.reason).length<8)errors.push('actor_o_motivo_invalido');
    if(value.accessExpansion&&text(value.actor.confirmationPhrase)!=='CONFIRMO ACTIVAR TENANT')errors.push('confirmacion_reforzada_requerida');
    if(!value.activationAuthorized)errors.push('activacion_no_autorizada');
    if(!value.activationExecuted)errors.push('activacion_no_ejecutada');
    Object.keys(value.persistence).forEach(function(key){if(Number(value.persistence[key]||0)!==0)errors.push('m3_escritura_no_permitida:'+key);});
    if(value.deployRequested)errors.push('deploy_no_permitido');
    if(value.importsRequested)errors.push('importaciones_diferidas_a_m4');
    if(value.rulesChangeRequested)errors.push('rules_no_permitidas');
    var secrets=secretPaths(value.raw);if(secrets.length)errors.push('secretos_no_permitidos:'+secrets.join(','));
    return {ok:errors.length===0,status:errors.length?'M3_TENANT_ACTIVATION_BLOCKED':STATUS,tenantId:tenant.tenantId,errors:unique(errors),value:value};
  }

  window.Orbit.tenantActivationRuntimeP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,ALLOWED_SOURCES:ALLOWED_SOURCES,COUNTRY_CURRENCY:COUNTRY_CURRENCY,validate:validate,normalize:normalize,secretPaths:secretPaths});
})();
