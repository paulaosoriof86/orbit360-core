/* ============================================================
   Orbit 360 · Contrato P0 de preparación del escritor durable M4
   Fecha: 2026-07-24

   Capa pura y fail-closed. Define el plan durable y la primera
   migración limitada, pero no escribe, no lee backend, no usa
   secretos, no despliega y no autoriza una ejecución M4.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='4.0.0-static-20260724';
  var STATUS_READY='M4_DURABLE_WRITER_STATIC_READY';
  var SOURCE_ORDER=Object.freeze(['configuration_catalog','memberships','clientes','aseguradoras','quality_audit']);
  var EXPECTED_COUNTS=Object.freeze({clientes:414,aseguradoras:26});
  var SYNC_STATES=Object.freeze(['pending','synced','failed']);
  var DEFERRED_SOURCES=Object.freeze(['polizas','vehiculos','cartera','cobros','comisiones','financiero_historico','documentos_soporte']);
  var REQUIRED_CAPABILITIES=Object.freeze([
    'async_coordinator','remote_confirmation','idempotency_keys','server_side_constraints',
    'append_only_audit','durable_rollback','resume_by_batch_id','sync_state_machine',
    'per_source_allowlists','mixed_source_blocking'
  ]);
  var SENSITIVE_KEYS=Object.freeze(['password','pass','pwd','contrasena','clave','secret','token','apikey','api_key','access_token','refresh_token','private_key','client_secret','credential_value']);
  function text(v){return String(v==null?'':v).trim();}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v&&typeof v==='object'?Object.assign({},v):v;}}
  function unique(v){var out=[];(Array.isArray(v)?v:[]).forEach(function(x){x=text(x);if(x&&out.indexOf(x)<0)out.push(x);});return out;}
  function secretPaths(input){var found=[];function walk(v,p){if(!v||typeof v!=='object')return;Object.keys(v).forEach(function(k){var n=k.toLowerCase().replace(/[-_]/g,''),cur=p?p+'.'+k:k;var sensitive=SENSITIVE_KEYS.some(function(x){return x.replace(/[-_]/g,'')===n;});if(sensitive&&v[k]!==null&&v[k]!==undefined&&text(v[k])!==''&&v[k]!==false)found.push(cur);if(v[k]&&typeof v[k]==='object')walk(v[k],cur);});}walk(input,'');return found;}
  function normalize(input){input=input||{};return {
    m3Closed:input.m3Closed===true,
    m3Status:text(input.m3Status),
    dryRun:input.dryRun===true,
    writeAuthorized:input.writeAuthorized===true,
    executionAuthorized:input.executionAuthorized===true,
    sourceOrder:unique(input.sourceOrder),
    counts:{clientes:Number(input.counts&&input.counts.clientes||0),aseguradoras:Number(input.counts&&input.counts.aseguradoras||0)},
    capabilities:unique(input.capabilities),
    syncStates:unique(input.syncStates),
    batchIdRequired:input.batchIdRequired===true,
    sourceAllowlists:clone(input.sourceAllowlists||{}),
    mixedSourcesAllowed:input.mixedSourcesAllowed===true,
    remoteSuccessRequiresConfirmation:input.remoteSuccessRequiresConfirmation===true,
    auditMode:text(input.auditMode),
    rollbackMode:text(input.rollbackMode),
    rulesChangeRequested:input.rulesChangeRequested===true,
    deployRequested:input.deployRequested===true,
    policiesRequested:input.policiesRequested===true,
    raw:clone(input)
  };}
  function validate(input){var v=normalize(input),errors=[];
    if(!v.m3Closed||v.m3Status!=='M3_TENANT_ACTIVATED_READONLY')errors.push('m3_no_cerrado');
    if(!v.dryRun)errors.push('dry_run_requerido');
    if(v.writeAuthorized)errors.push('escritura_no_autorizada_en_m4_static');
    if(v.executionAuthorized)errors.push('ejecucion_m4_no_autorizada');
    if(JSON.stringify(v.sourceOrder)!==JSON.stringify(SOURCE_ORDER))errors.push('orden_fuentes_invalido');
    if(v.counts.clientes!==EXPECTED_COUNTS.clientes)errors.push('clientes_esperados_414');
    if(v.counts.aseguradoras!==EXPECTED_COUNTS.aseguradoras)errors.push('aseguradoras_esperadas_26');
    REQUIRED_CAPABILITIES.forEach(function(x){if(v.capabilities.indexOf(x)<0)errors.push('capacidad_faltante:'+x);});
    if(JSON.stringify(v.syncStates.slice().sort())!==JSON.stringify(SYNC_STATES.slice().sort()))errors.push('estados_sync_invalidos');
    if(!v.batchIdRequired)errors.push('batch_id_requerido');
    SOURCE_ORDER.forEach(function(s){if(!Array.isArray(v.sourceAllowlists[s])||!v.sourceAllowlists[s].length)errors.push('allowlist_faltante:'+s);});
    if(v.mixedSourcesAllowed)errors.push('mezcla_fuentes_no_permitida');
    if(!v.remoteSuccessRequiresConfirmation)errors.push('confirmacion_remota_requerida');
    if(v.auditMode!=='append_only')errors.push('auditoria_no_append_only');
    if(v.rollbackMode!=='durable')errors.push('rollback_no_durable');
    if(v.rulesChangeRequested)errors.push('rules_no_permitidas_en_m4_static');
    if(v.deployRequested)errors.push('deploy_no_permitido_en_m4_static');
    if(v.policiesRequested)errors.push('polizas_bloqueadas');
    var secrets=secretPaths(v.raw);if(secrets.length)errors.push('secretos_no_permitidos:'+secrets.join(','));
    return {ok:errors.length===0,value:v,errors:unique(errors)};
  }
  function buildStaticPlan(input){var check=validate(input);return {
    ok:check.ok,status:check.ok?STATUS_READY:'M4_DURABLE_WRITER_STATIC_BLOCKED',contractVersion:VERSION,
    dryRun:true,writeAuthorized:false,writeExecuted:false,executionAuthorized:false,executionExecuted:false,
    sourceOrder:SOURCE_ORDER.slice(),expectedCounts:clone(EXPECTED_COUNTS),syncStates:SYNC_STATES.slice(),
    requiredCapabilities:REQUIRED_CAPABILITIES.slice(),deferredSources:DEFERRED_SOURCES.slice(),
    successDeclaration:'remote_confirmation_required',auditMode:'append_only',rollbackMode:'durable',resumeKey:'batchId',
    errors:check.errors,containsPII:false,containsSecrets:false
  };}
  window.Orbit.durableWriterPlanP0=Object.freeze({VERSION:VERSION,STATUS_READY:STATUS_READY,SOURCE_ORDER:SOURCE_ORDER,EXPECTED_COUNTS:EXPECTED_COUNTS,SYNC_STATES:SYNC_STATES,DEFERRED_SOURCES:DEFERRED_SOURCES,REQUIRED_CAPABILITIES:REQUIRED_CAPABILITIES,secretPaths:secretPaths,normalize:normalize,validate:validate,buildStaticPlan:buildStaticPlan});
})();
