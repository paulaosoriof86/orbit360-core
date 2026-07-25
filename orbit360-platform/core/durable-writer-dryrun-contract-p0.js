/* ============================================================
   Orbit 360 · Contrato P0 dry-run externo escritor durable M4
   Fecha: 2026-07-24

   Valida evidencia agregada. No contiene datos A&S, no lee backend,
   no escribe y separa ejecución técnica de aprobación del diff.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='4.1.0-readonly-20260724';
  var STATUS='M4_DURABLE_WRITER_DRYRUN_COMPLETED';
  var ACTIONS=Object.freeze(['create','update','omit','requires_validation']);
  var SOURCES=Object.freeze(['configuration_catalog','memberships','clientes','aseguradoras','quality_audit']);
  var EXPECTED=Object.freeze({clientes:414,aseguradoras:26});
  function n(v){return Number(v||0);}
  function text(v){return String(v==null?'':v).trim();}
  function sourceDiff(input,key){
    var value=input&&input[key]||{},out={};
    ACTIONS.forEach(function(action){out[action]=n(value[action]);});
    out.targetOnly=n(value.targetOnly);
    return out;
  }
  function validate(input){
    input=input||{};var errors=[],warnings=[];
    if(input.m4StaticStatus!=='M4_DURABLE_WRITER_STATIC_READY')errors.push('m4_static_no_cerrado');
    if(input.readOnly!==true||input.writeAuthorized===true||input.writeExecuted===true)errors.push('dryrun_no_readonly');
    if(input.remoteReadConfirmed!==true)errors.push('lectura_remota_no_confirmada');
    if(n(input.sourceCounts&&input.sourceCounts.clientes)!==EXPECTED.clientes)errors.push('clientes_fuente_no_414');
    if(n(input.sourceCounts&&input.sourceCounts.aseguradoras)!==EXPECTED.aseguradoras)errors.push('aseguradoras_fuente_no_26');
    if(n(input.sourceCounts&&input.sourceCounts.memberships)<1)errors.push('memberships_fuente_vacias');
    SOURCES.forEach(function(source){
      var diff=sourceDiff(input.diff,source);
      var total=diff.create+diff.update+diff.omit+diff.requires_validation;
      var expected=n(input.sourceCounts&&input.sourceCounts[source]);
      if(total!==expected)errors.push('diff_no_cuadra:'+source);
      if(diff.targetOnly>0)warnings.push('destino_solo:'+source);
    });
    if(text(input.batchId).indexOf('m4-')!==0)errors.push('batch_id_invalido');
    if(!/^[a-f0-9]{64}$/.test(text(input.idempotencyKey)))errors.push('idempotency_key_invalida');
    if(input.sameInputSameIdempotencyKey!==true)errors.push('idempotencia_no_probada');
    if(input.auditPlan!=='append_only'||input.rollbackPlan!=='durable')errors.push('auditoria_rollback_invalidos');
    if(n(input.secretValueCount)!==0)errors.push('secretos_detectados');
    if(input.rulesChanged===true||input.hostingDeploy===true||input.functionsDeploy===true||input.imports===true||input.policies===true)errors.push('alcance_prohibido');
    return {ok:errors.length===0,errors:errors,warnings:warnings};
  }
  function build(input){
    var check=validate(input);
    return {ok:check.ok,status:check.ok?STATUS:'M4_DURABLE_WRITER_DRYRUN_BLOCKED',contractVersion:VERSION,
      approvalReady:check.ok&&input.approvalReady===true,errors:check.errors,warnings:check.warnings,
      writeAuthorized:false,writeExecuted:false,containsPII:false,containsSecrets:false};
  }
  window.Orbit.durableWriterDryRunP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,ACTIONS:ACTIONS,SOURCES:SOURCES,EXPECTED:EXPECTED,validate:validate,build:build});
})();
