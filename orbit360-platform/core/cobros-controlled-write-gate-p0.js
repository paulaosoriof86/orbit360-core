/* ============================================================
   Orbit 360 · Cobros · gate único de escritura controlada P0
   Fecha: 2026-08-01

   Owner puro para preparar un único gate de escritura por fases.
   No ejecuta Orbit.store, Firebase, navegador, deploy ni producción.

   Fases:
   PREPARED_STATIC -> ARMED_BY_EXPLICIT_LAB_AUTHORIZATION
   -> EXECUTED_LAB -> VERIFIED_OR_ROLLED_BACK
   ============================================================ */
(function(){
  'use strict';
  const root=typeof window!=='undefined'?window:globalThis;
  root.Orbit=root.Orbit||{};
  if(root.Orbit.cobrosControlledWriteGateP0)return;

  const VERSION='20260801.1-single-write-gate-preflight';
  const GATE_ID='block10.9-cobros-controlled-write-lab-v20260801';
  const DIRECT='EXISTING_CANONICAL_RECEIPT';
  const HISTORICAL='HISTORICAL_RECEIPT_REINFORCED';
  const APPROVED_DIRECT='APPROVED_DIRECT';
  const APPROVED_HISTORICAL='APPROVED_HISTORICAL_REINFORCED';

  function text(value){return String(value==null?'':value).trim();}
  function hash(value){
    const input=text(value);let h=2166136261;
    for(let i=0;i<input.length;i+=1){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
    return Math.abs(h>>>0).toString(36);
  }
  function unique(values){return new Set(values).size===values.length;}
  function keyFor(ref){return 'cobros:'+hash(GATE_ID+'|'+text(ref));}

  function validateAuthorization(authorization={}){
    const cases=Array.isArray(authorization.cases)?authorization.cases:[];
    const refs=cases.map(item=>text(item.authorizationRef));
    const direct=cases.filter(item=>item.category===DIRECT&&item.decision===APPROVED_DIRECT);
    const historical=cases.filter(item=>item.category===HISTORICAL&&item.decision===APPROVED_HISTORICAL&&item.reinforced===true);
    const errors=[];
    if(authorization.schemaVersion!=='orbit360-cobros-direction-authorization-v1')errors.push('authorization_schema_invalid');
    if(text(authorization.tenantId)!=='alianzas-soluciones')errors.push('tenant_invalid');
    if(cases.length!==5)errors.push('case_count_not_five');
    if(direct.length!==4)errors.push('direct_count_not_four');
    if(historical.length!==1)errors.push('historical_count_not_one');
    if(refs.some(ref=>!/^cob-auth-[a-f0-9]{24}$/.test(ref)))errors.push('authorization_ref_invalid');
    if(!unique(refs))errors.push('authorization_ref_duplicate');
    if(authorization.decision?.directCasesApproved!==true)errors.push('direct_decision_missing');
    if(authorization.decision?.historicalCaseApprovedSeparately!==true)errors.push('historical_decision_missing');
    if(authorization.decision?.approvedCount!==5)errors.push('approved_count_invalid');
    if(authorization.decision?.executionAuthorized!==false)errors.push('execution_must_remain_locked');
    if(authorization.decision?.labWriteAuthorized!==false)errors.push('lab_write_must_remain_locked');
    if(authorization.decision?.productionAuthorized!==false)errors.push('production_must_remain_locked');
    if(authorization.decision?.deployAuthorized!==false)errors.push('deploy_must_remain_locked');
    if(historical[0]&&historical[0].reactivatePolicy!==false)errors.push('historical_reactivate_policy_forbidden');
    if(historical[0]&&historical[0].createFinmov!==false)errors.push('historical_finmov_forbidden');
    return {ok:errors.length===0,errors,cases,direct,historical,refs};
  }

  function directGroup(item,index){
    const ref=text(item.authorizationRef);const idempotencyKey=keyFor(ref);
    return {
      groupId:'cobros-direct-'+(index+1)+'-'+hash(ref),
      category:DIRECT,
      authorizationRef:ref,
      idempotencyKey,
      atomic:true,
      snapshot:[
        {collection:'recibosEsperados',targetRef:ref,mode:'FULL_BEFORE_IMAGE',required:true},
        {collection:'cobros',targetRef:idempotencyKey,mode:'ASSERT_ABSENT',required:true}
      ],
      operations:[
        {sequence:1,type:'INSERT_COBRO',collection:'cobros',authorizationRef:ref,idempotencyKey,writeEligible:false},
        {sequence:2,type:'UPDATE_EXISTING_RECEIPT_APPLY_PAYMENT',collection:'recibosEsperados',authorizationRef:ref,idempotencyKey,writeEligible:false}
      ],
      rollback:[
        {sequence:1,type:'RESTORE_EXISTING_RECEIPT_FROM_SNAPSHOT',collection:'recibosEsperados',authorizationRef:ref},
        {sequence:2,type:'REMOVE_INSERTED_COBRO_BY_IDEMPOTENCY',collection:'cobros',idempotencyKey}
      ],
      reactivatePolicy:false,
      createFinmov:false
    };
  }

  function historicalGroup(item){
    const ref=text(item.authorizationRef);const idempotencyKey=keyFor(ref);
    return {
      groupId:'cobros-historical-'+hash(ref),
      category:HISTORICAL,
      authorizationRef:ref,
      idempotencyKey,
      atomic:true,
      reinforcedAuthorizationRequired:true,
      snapshot:[
        {collection:'polizas',targetRef:ref+':policy',mode:'FULL_BEFORE_IMAGE_ASSERT_NON_RENEWED',required:true},
        {collection:'recibosEsperados',targetRef:ref+':historical-receipt',mode:'ASSERT_ABSENT',required:true},
        {collection:'cobros',targetRef:idempotencyKey,mode:'ASSERT_ABSENT',required:true}
      ],
      operations:[
        {sequence:1,type:'INSERT_HISTORICAL_ELIGIBLE_RECEIPT',collection:'recibosEsperados',authorizationRef:ref,idempotencyKey,writeEligible:false},
        {sequence:2,type:'INSERT_COBRO_AND_APPLY_TO_HISTORICAL_RECEIPT',collection:'cobros',authorizationRef:ref,idempotencyKey,writeEligible:false}
      ],
      rollback:[
        {sequence:1,type:'REMOVE_INSERTED_COBRO_BY_IDEMPOTENCY',collection:'cobros',idempotencyKey},
        {sequence:2,type:'REMOVE_INSERTED_HISTORICAL_RECEIPT',collection:'recibosEsperados',authorizationRef:ref},
        {sequence:3,type:'ASSERT_POLICY_UNCHANGED_FROM_SNAPSHOT',collection:'polizas',authorizationRef:ref}
      ],
      reactivatePolicy:false,
      createFinmov:false
    };
  }

  function prepare(input={}){
    const validation=validateAuthorization(input.authorization||{});
    const groups=[];
    if(validation.ok){
      validation.direct.forEach((item,index)=>groups.push(directGroup(item,index)));
      groups.push(historicalGroup(validation.historical[0]));
    }
    const keys=groups.map(group=>group.idempotencyKey);
    const snapshotCount=groups.reduce((sum,group)=>sum+group.snapshot.length,0);
    const operationCount=groups.reduce((sum,group)=>sum+group.operations.length,0);
    const rollbackCount=groups.reduce((sum,group)=>sum+group.rollback.length,0);
    const prepared=validation.ok&&groups.length===5&&unique(keys)&&groups.every(group=>group.atomic===true&&group.snapshot.every(item=>item.required===true)&&group.operations.every(item=>item.writeEligible===false)&&group.rollback.length>=2&&group.reactivatePolicy===false&&group.createFinmov===false);
    return {
      schemaVersion:'orbit360-cobros-controlled-write-gate-plan-v1',
      version:VERSION,
      gateId:GATE_ID,
      status:prepared?'COBROS_CONTROLLED_WRITE_GATE_PREPARED':'COBROS_CONTROLLED_WRITE_GATE_BLOCKED',
      phase:prepared?'PREPARED_STATIC':'BLOCKED',
      tenantId:'alianzas-soluciones',
      planId:prepared?'cobros-write-plan-'+hash(keys.join('|')):'',
      sourceGateId:'block10.8-cobros-private-real-materialization-static-v20260801',
      humanAuthorizationRecorded:validation.ok,
      directApproved:validation.direct.length,
      historicalApproved:validation.historical.length,
      groups,
      totals:{groups:groups.length,snapshots:snapshotCount,operations:operationCount,rollbacks:rollbackCount},
      duplicateIdempotencyKeys:keys.length-new Set(keys).size,
      snapshotBeforeWriteRequired:true,
      atomicPerCaseRequired:true,
      rollbackPerCaseRequired:true,
      historicalAtomicRequired:true,
      genericWriterRemainsBlockedForCobros:true,
      executionAuthorized:false,
      labWriteAuthorized:false,
      writeEligible:0,
      cobrosWrites:0,
      receiptWrites:0,
      policyWrites:0,
      finmovsWrites:0,
      firestoreWrites:0,
      operationalWrites:0,
      browserExecuted:false,
      deployExecuted:false,
      productionTouched:false,
      containsPII:false,
      containsPolicyNumbers:false,
      containsAmounts:false,
      containsSecrets:false,
      validationErrors:validation.errors
    };
  }

  root.Orbit.cobrosControlledWriteGateP0=Object.freeze({
    VERSION,GATE_ID,DIRECT,HISTORICAL,validateAuthorization,prepare
  });
})();
