'use strict';

const storagePolicy=require('./cotcomp-lab-storage-adapter-candidate');

const VERSION='ays-cotcomp-lab-firestore-driver-s444-v1.0';
const EXECUTION_ENABLED=false;
const WRITE_CALLS_ALLOWED=false;
const DELETE_CALLS_ALLOWED=false;
const SERVER_SIDE_ONLY=true;

const EXPECTED=Object.freeze({
  projectId:'ays-orbit-360-lab',
  environment:'LAB',
  tenantId:'alianzas-soluciones'
});

const METHOD_MAP=Object.freeze({
  CREATE_IF_ABSENT:'transaction.create',
  UPSERT_DETERMINISTIC:'transaction.set.merge',
  UPSERT_VERSIONED_PROPOSAL:'transaction.create',
  CREATE_IDEMPOTENT_SELECTION:'transaction.create',
  PATCH:'transaction.update'
});

function validateContext(context={}){
  const reasons=[];
  if(context.projectId!==EXPECTED.projectId) reasons.push('PROJECT_NOT_LAB');
  if(context.environment!==EXPECTED.environment) reasons.push('ENVIRONMENT_NOT_LAB');
  if(context.tenantId!==EXPECTED.tenantId) reasons.push('TENANT_NOT_ALLOWED');
  if(context.actorType!=='SERVER_COTCOMP_WRITER') reasons.push('SERVER_WRITER_CONTEXT_REQUIRED');
  if(context.publicBrowser===true) reasons.push('PUBLIC_BROWSER_FORBIDDEN');
  return {ok:reasons.length===0,reasons};
}

function compileCommand(command={}){
  const validation=storagePolicy.validateCommand(command);
  if(!validation.ok) return {ok:false,code:validation.code||'COMMAND_INVALID',validation};
  const method=METHOD_MAP[command.type];
  if(!method) return {ok:false,code:'FIRESTORE_METHOD_UNMAPPED'};
  return {
    ok:true,
    path:command.path,
    type:command.type,
    firestoreMethod:method,
    precondition:command.type==='CREATE_IF_ABSENT' || command.type==='CREATE_IDEMPOTENT_SELECTION'
      ? 'MUST_NOT_EXIST'
      : 'PATH_AND_CONTEXT_VALIDATED',
    payloadDigest:command.payloadDigest||null,
    serverProjection:command.serverProjection===true,
    executable:false
  };
}

function compileAtomicGroup({group,commands,context}={}){
  const ctx=validateContext(context);
  const list=Array.isArray(commands)?commands:[];
  const compiled=list.map(compileCommand);
  const invalid=compiled.filter(x=>!x.ok);
  return {
    version:VERSION,
    ok:ctx.ok && list.length>0 && invalid.length===0,
    group:String(group||''),
    context:ctx,
    commands:compiled,
    commandCount:list.length,
    atomicity:'FIRESTORE_TRANSACTION_REQUIRED',
    executionEnabled:EXECUTION_ENABLED,
    writeCallsAllowed:WRITE_CALLS_ALLOWED,
    executable:false
  };
}

function compileRead({path,context}={}){
  const ctx=validateContext(context);
  const p=storagePolicy.classifyPath(path);
  return {
    version:VERSION,
    ok:ctx.ok && p.ok,
    context:ctx,
    path:p,
    firestoreMethod:'document.get',
    readOnly:true,
    executable:false
  };
}

function compileSyntheticCleanup({paths,context,proofRunId}={}){
  const ctx=validateContext(context);
  const list=Array.isArray(paths)?paths:[];
  const validated=list.map(path=>storagePolicy.classifyPath(path));
  const invalid=validated.filter(x=>!x.ok);
  return {
    version:VERSION,
    ok:ctx.ok && !!String(proofRunId||'').trim() && list.length>0 && invalid.length===0,
    proofRunId:String(proofRunId||'').trim(),
    exactPaths:list.slice().reverse(),
    deleteSemantics:'DELETE_ONLY_EXACT_PATHS_CREATED_BY_THIS_SYNTHETIC_PROOF_AFTER_DIGEST_READBACK',
    productionAllowed:false,
    realDataAllowed:false,
    executionEnabled:EXECUTION_ENABLED,
    deleteCallsAllowed:DELETE_CALLS_ALLOWED,
    executable:false
  };
}

function assertExecutionClosed(){
  const error=new Error('COTCOMP_S444_FIRESTORE_DRIVER_EXECUTION_DISABLED');
  error.code='COTCOMP_S444_FIRESTORE_DRIVER_EXECUTION_DISABLED';
  throw error;
}

function createCandidate(){
  return Object.freeze({
    VERSION,
    EXECUTION_ENABLED,
    WRITE_CALLS_ALLOWED,
    DELETE_CALLS_ALLOWED,
    SERVER_SIDE_ONLY,
    EXPECTED,
    compileRead,
    compileAtomicGroup,
    compileSyntheticCleanup,
    async get(){assertExecutionClosed();},
    async runAtomicGroup(){assertExecutionClosed();},
    async patch(){assertExecutionClosed();},
    async cleanupSynthetic(){assertExecutionClosed();}
  });
}

module.exports=Object.freeze({
  VERSION,
  EXECUTION_ENABLED,
  WRITE_CALLS_ALLOWED,
  DELETE_CALLS_ALLOWED,
  SERVER_SIDE_ONLY,
  EXPECTED,
  METHOD_MAP,
  validateContext,
  compileCommand,
  compileAtomicGroup,
  compileRead,
  compileSyntheticCleanup,
  assertExecutionClosed,
  createCandidate
});
