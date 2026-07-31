/* ============================================================
   Orbit 360 · Wire identidad -> dry-run P0
   Fecha: 2026-07-31

   El dry-run usa la misma decision crear/actualizar/HOLD que la
   escritura real. Un probable duplicado es bloqueante, nunca inserta.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.__identityDryRunWireV20260731)return;
  Orbit.__identityDryRunWireV20260731=true;

  function ready(){
    return Orbit.importaDryRunP0 && Orbit.importaIdentityUpsertV20260731 &&
      typeof Orbit.importaDryRunP0.buildDryRun==='function';
  }
  function planOperation(op){
    op=op||{};
    const R=Orbit.importaIdentityUpsertV20260731;
    const data=op.data||op.record||{};
    const decision=R.resolveOperation(op.collection||'',data,{
      requestedAction:op.action||'insert',id:op.id||''
    });
    return Object.assign({},op,{
      action:decision.action,
      id:decision.id||op.id||'',
      data:decision.data||data,
      identityStatus:decision.identityStatus||'',
      identityCandidateId:decision.candidateId||'',
      identityReason:decision.reason||''
    });
  }
  function install(){
    if(!ready())return false;
    if(Orbit.importaDryRunP0.__identityPlanned)return true;
    const original=Orbit.importaDryRunP0.buildDryRun;
    Orbit.importaDryRunP0.buildDryRun=function(input){
      input=input||{};
      const planned=(Array.isArray(input.operations)?input.operations:[]).map(planOperation);
      const report=original(Object.assign({},input,{operations:planned}));
      const summary={create:0,update:0,hold:0,notGuarded:0};
      planned.forEach(function(op){
        if(op.action==='insert')summary.create++;
        else if(op.action==='update')summary.update++;
        else if(op.action==='hold')summary.hold++;
        if(op.identityStatus==='not_guarded')summary.notGuarded++;
      });
      report.identityPlan=summary;
      report.totals=Object.assign({},report.totals||{}, {
        insert:summary.create,update:summary.update,hold:summary.hold
      });
      report.operations=(report.operations||[]).map(function(out,index){
        const p=planned[index]||{};
        return Object.assign({},out,{
          identityStatus:p.identityStatus||'',
          identityCandidateId:p.identityCandidateId||'',
          identityReason:p.identityReason||''
        });
      });
      if(summary.hold>0){
        report.hasBlockingErrors=true;
        report.status='dry_run_identidad_requiere_validacion';
      }
      return report;
    };
    Orbit.importaDryRunP0.planIdentityOperation=planOperation;
    Orbit.importaDryRunP0.__identityPlanned=true;
    Orbit.importaDryRunP0.identityContractVersion=Orbit.importaIdentityUpsertV20260731.VERSION;
    return true;
  }
  if(!install())setTimeout(install,0);
})();
