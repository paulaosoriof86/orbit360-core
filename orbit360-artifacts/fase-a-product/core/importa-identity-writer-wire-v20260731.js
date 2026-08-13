/* ============================================================
   Orbit 360 · Wire identidad -> writer P0
   Fecha: 2026-07-31

   La escritura revalida con el mismo resolver del dry-run para que
   el plan aprobado y la accion real no diverjan.
   ============================================================ */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  if(Orbit.__identityWriterWireV20260731)return;
  Orbit.__identityWriterWireV20260731=true;

  function ready(){
    return Orbit.importaWriteP0 && Orbit.importaIdentityUpsertV20260731 &&
      typeof Orbit.importaWriteP0.writeBatch==='function';
  }
  function planOperation(op){
    op=op||{};
    const R=Orbit.importaIdentityUpsertV20260731;
    const data=op.data||op.record||{};
    const d=R.resolveOperation(op.collection||'',data,{
      requestedAction:op.action||'insert',id:op.id||''
    });
    return Object.assign({},op,{action:d.action,id:d.id||op.id||'',data:d.data||data,
      identityStatus:d.identityStatus||'',identityCandidateId:d.candidateId||'',identityReason:d.reason||''});
  }
  function install(){
    if(!ready())return false;
    if(Orbit.importaWriteP0.__identityPlanned)return true;
    const original=Orbit.importaWriteP0.writeBatch;
    Orbit.importaWriteP0.writeBatch=function(batch,confirmation){
      batch=batch||{};
      const planned=(Array.isArray(batch.operations)?batch.operations:[]).map(planOperation);
      const hold=planned.filter(op=>op.action==='hold');
      if(hold.length){
        return{ok:false,written:0,errors:hold.map((op,i)=>'identity_hold_'+i+':'+(op.identityReason||'probable_duplicate')),rollback:[],identityHold:hold.length};
      }
      return original(Object.assign({},batch,{operations:planned}),confirmation);
    };
    Orbit.importaWriteP0.__identityPlanned=true;
    Orbit.importaWriteP0.identityContractVersion=Orbit.importaIdentityUpsertV20260731.VERSION;
    return true;
  }
  if(!install())setTimeout(install,0);
})();
