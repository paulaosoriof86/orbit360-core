'use strict';

const storagePolicy = require('./cotcomp-lab-storage-adapter-candidate');

const VERSION = 'ays-cotcomp-staging-read-deps-s436-v0.1';
const READY = false;
const PERSISTENCE_ENABLED = false;
const WRITES_ENABLED = false;
const DRIVER_READS_ALLOWED = false;
const SERVER_SIDE_ONLY = true;

function validateDriver(driver = {}){
  const required=['getCaseAccess','listProposalsForCase'];
  const missing=required.filter(name=>typeof driver[name]!=='function');
  return {ok:missing.length===0,missing};
}

function caseAccessPath({tenantId,caseId} = {}){
  return 'tenants/'+String(tenantId||'')+'/cotcomp/caseAccess/items/'+String(caseId||'');
}

function proposalPath({tenantId,proposalId} = {}){
  return 'tenants/'+String(tenantId||'')+'/cotcomp/proposals/items/'+String(proposalId||'');
}

function previewCaseAccessRead({tenantId,caseId} = {}){
  const path=caseAccessPath({tenantId,caseId});
  const state=storagePolicy.classifyPath(path);
  return {
    ok:state.ok && state.kind==='COTCOMP_ENTITY' && state.entity==='caseAccess',
    path,
    pathState:state,
    executable:false
  };
}

function previewProposalRead({tenantId,proposalId} = {}){
  const path=proposalPath({tenantId,proposalId});
  const state=storagePolicy.classifyPath(path);
  return {
    ok:state.ok && state.kind==='COTCOMP_ENTITY' && state.entity==='proposals',
    path,
    pathState:state,
    executable:false
  };
}

function assertClosed(){
  const error=new Error('COTCOMP_STAGING_READ_DEPS_NOT_READY');
  error.code='COTCOMP_STAGING_READ_DEPS_NOT_READY';
  throw error;
}

function createReadOnlyDeps({driver} = {}){
  const driverState=validateDriver(driver);

  async function verifyCaseAccess(){
    assertClosed();
  }

  async function loadProposals(){
    assertClosed();
  }

  return Object.freeze({
    VERSION,
    READY,
    PERSISTENCE_ENABLED,
    WRITES_ENABLED,
    DRIVER_READS_ALLOWED,
    SERVER_SIDE_ONLY,
    driverState,
    previewCaseAccessRead,
    previewProposalRead,
    verifyCaseAccess,
    loadProposals
  });
}

module.exports=Object.freeze({
  VERSION,
  READY,
  PERSISTENCE_ENABLED,
  WRITES_ENABLED,
  DRIVER_READS_ALLOWED,
  SERVER_SIDE_ONLY,
  validateDriver,
  caseAccessPath,
  proposalPath,
  previewCaseAccessRead,
  previewProposalRead,
  assertClosed,
  createReadOnlyDeps
});
