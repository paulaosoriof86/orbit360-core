'use strict';
// QA-only observation. No Firebase import, writes, role grants or acceptance.
// Every exported string is drawn from a fixed enum; raw messages/IDs never pass.
const proposalAccess=require('../functions/b4-003-scoped-access-boundary');
const {resolveProductActiveRole}=require('../functions/product-active-role-contract');
const {LEGAL_FAILURE_CHECKS,safeLegalFailureSubstage}=require('./gravicentra-i6-6-direction-preview-legal-acceptance.cjs');
const DRIVER='gravicentra-i6-6-proposal-application-signed-uat.cjs';
const STAGES=Object.freeze(`BOOT BUILD_IDENTITY CANONICAL_CONTROL_READ FIXTURE_ABSENCE SIGNED_SESSION DIRECTION_LEGAL_ACCEPTANCE SYNTHETIC_STAGE_SETUP FIRST_PROPOSAL_PREREQUISITES FIRST_PROPOSAL_PREVIEW OPERATIVE_ACCESS OPERATIVE_PROPOSAL_PREVIEW ADVISOR_ROLE_DENIAL CALLER_MONEY_DENIAL FOREIGN_COUNTRY_DENIAL UI_RESOLUTION_OPEN UI_RESOLUTION_CONFIRM RESOLUTION_READBACK READY_PREVIEW SOURCE_CHANGE_GUARD UI_APPLICATION_CONFIRM APPLICATION_RELOAD APPLICATION_READBACK IDEMPOTENT_REPLAY SOURCE_IMMUTABILITY SYNTHETIC_RESTORE`.split(' '));
const OPERATIONS=Object.freeze(['preview_proposal_application','resolve_proposal_application','apply_proposal_application']);
const SCOPES=Object.freeze(['none','own','team','all']);
const SCOPE_OUTCOMES=Object.freeze(`ALLOWED MEMBERSHIP_DENIED ROLE_NOT_PROVIDED SIGNED_ACTIVE_ROLE_MISMATCH ROLE_DENIED COLLECTION_DENIED DIRECTORY_DENIED TEAM_DIRECTORY_DENIED MODULE_DENIED COUNTRY_DENIED SCOPE_NONE ROLE_TEAM_CONFIG_INVALID ADVISOR_MAPPING_REQUIRED RECORD_REQUIRED TENANT_DENIED ADVISOR_AMBIGUOUS FOREIGN_RECORD_DENIED PRODUCT_ASSIGNED_ROLES_MISSING PRODUCT_ACTIVE_ROLE_NOT_ASSIGNED FIXTURE_COUNTRY_NOT_EXPECTED UNKNOWN_SCOPE_FAILURE`.split(' '));
const REASONS=Object.freeze(`ADVISOR_AMBIGUOUS ADVISOR_MAPPING_REQUIRED AMBIGUOUS_ANCHOR_RECEIPT ANCHOR_RECEIPT_NOT_FOUND ANCHOR_INSTALLMENT_INVALID BANK_AMOUNT_PRECISION_INVALID BANK_AMOUNT_RECEIPT_MISMATCH BANK_AMOUNT_REQUIRED BANK_CURRENCY_REQUIRED BANK_RECEIPT_AMOUNT_REQUIRED BANK_RECEIPT_CURRENCY_MISMATCH COBROS_LEDGER_ACTIVE_POINTER_MISSING COBROS_LEDGER_ACTIVE_RUN_MISSING COBROS_LEDGER_ACTIVE_RUN_NOT_FOUND COLLECTION_DENIED CONTRADICTORY_PAYMENT_STATE COUNTRY_DENIED CURRENCY_MISMATCH DIRECTORY_DENIED DUPLICATE_INSTALLMENT_SEQUENCE EVIDENCE_CONTRADICTION EVIDENCE_REFERENCE_REQUIRED EVIDENCE_TYPE_UNSUPPORTED EXPECTED_RECEIPT_COUNT_MISMATCH FOREIGN_RECORD_DENIED INFERRED_INSTALLMENT_DUE_DATE_REQUIRED INSTALLMENT_TOTAL_EXCEEDS_TENANT_CONFIG INSTALLMENT_TOTAL_REQUIRES_EXPLICIT_EXCEPTION MATCH_NOT_UNIQUE MEMBERSHIP_DENIED MODULE_DENIED NON_CONTIGUOUS_RECEIPT_SEQUENCE NO_ACTIVE_NUMBERED_RECEIPTS PAYMENT_COUNTRY_OUTSIDE_MEMBERSHIP PAYMENT_COUNTRY_UNRESOLVED PAYMENT_POLICY_RECEIPT_COUNTRY_MISMATCH PROPOSAL_ACTIVE_PORTFOLIO_REQUIRED PROPOSAL_APPLICATION_FINANCIAL_TARGET_READBACK_MISMATCH PROPOSAL_APPLICATION_POLICY_READBACK_MISSING PROPOSAL_APPLICATION_PORTFOLIO_READBACK_MISMATCH PROPOSAL_APPLICATION_PORTFOLIO_TARGET_READBACK_MISMATCH PROPOSAL_APPLICATION_READBACK_MISMATCH PROPOSAL_APPLICATION_RECORD_NOT_CONFIRMED PROPOSAL_CALLER_FINANCIAL_PAYLOAD_DENIED PROPOSAL_FINANCIAL_TARGET_MISMATCH PROPOSAL_FINANCIAL_TARGET_NOT_UNIQUE PROPOSAL_MANAGEMENT_ROLE_REQUIRED PROPOSAL_MANUAL_APPLICATION_DISABLED PROPOSAL_MODULE_WRITE_DENIED PROPOSAL_PLAN_CHANGED PROPOSAL_PREVIEW_MUTATION_NOT_AUTHORIZED PROPOSAL_QA_APPLICATION_NOT_SYNTHETIC PROPOSAL_QA_FINANCIAL_TARGET_NOT_SYNTHETIC PROPOSAL_QA_SOURCE_NOT_SYNTHETIC PROPOSAL_REQUEST_ID_RESERVED PROPOSAL_RESOLUTION_READBACK_MISMATCH PROPOSAL_RESOLUTION_STALE PROPOSAL_TARGET_BOUND_EXCEEDED RECORD_REQUIRED ROLE_DENIED ROLE_NOT_PROVIDED ROLE_TEAM_CONFIG_INVALID SCOPE_NONE SIGNED_ACTIVE_ROLE_MISMATCH SOURCE_ACTIVE_RUN_CHANGED SOURCE_ATTESTATION_REQUIRED SOURCE_BANK_PAID_DATE_REQUIRED SOURCE_BANK_PAYMENT_NOT_PROVEN SOURCE_CURRENCY_REQUIRED SOURCE_DATE_INVALID SOURCE_EVIDENCE_NOT_UNIQUE SOURCE_EVIDENCE_TYPE_CONFLICT SOURCE_EVIDENCE_TYPE_MISSING SOURCE_LEDGER_INTEGRITY_MISMATCH SOURCE_PARTIAL_PAYMENT_REQUIRES_ALLOCATION SOURCE_PAYMENT_AFTER_EVIDENCE_DATE SOURCE_PENDING_STATEMENT_IS_NOT_PAYMENT SOURCE_POLICY_EDITION_AMBIGUOUS SOURCE_POLICY_EDITION_NOT_FOUND SOURCE_RECEIPT_AMOUNT_MISMATCH SOURCE_RECEIPT_CURRENCY_MISMATCH SOURCE_RECEIPT_IDENTITY_MISSING SOURCE_RECEIPT_NOT_UNIQUE TARGET_ALREADY_PAID TARGET_SCOPE_OR_RELATION_MISMATCH TEAM_DIRECTORY_DENIED TENANT_CONFIG_REQUIRES_HUMAN_CONFIRMATION TENANT_DENIED TENANT_HIGH_CONFIDENCE_AUTO_COMMIT_NOT_ENABLED TENANT_RECONCILIATION_CONFIG_REQUIRED I66_PREVIEW_MUTATION_CALLABLE_DENIED I66_PREVIEW_REGION_DENIED I66_PREVIEW_PAYLOAD_DENIED`.split(' '));
const CALLABLE_CODES=Object.freeze(`cancelled unknown invalid-argument deadline-exceeded not-found already-exists permission-denied resource-exhausted failed-precondition aborted out-of-range unimplemented internal unavailable data-loss unauthenticated`.split(' '));
const FAILURE_CHECKS=Object.freeze([...LEGAL_FAILURE_CHECKS,...`I66_PROPOSAL_AUTHORIZED_ORIGIN_REQUIRED I66_PROPOSAL_SOURCE_SHA_REQUIRED I66_PROPOSAL_PACKAGE_ROOT_REQUIRED I66_PROPOSAL_CONFIGURED_CREDENTIAL_REQUIRED I66_PROPOSAL_FIXTURE_COLLISION I66_PROPOSAL_FIXTURE_OWNERSHIP_LOST I66_PROPOSAL_ACTOR_BOUNDED_SCAN I66_PROPOSAL_REAL_ACTOR_NOT_UNIQUE_direccion I66_PROPOSAL_REAL_ACTOR_NOT_UNIQUE_operativo I66_PROPOSAL_ACTOR_AUTH_NOT_READY I66_PROPOSAL_SIGNED_ACTIVATION_MISMATCH I66_PROPOSAL_BUILD_UNAVAILABLE I66_PROPOSAL_UI_ARTIFACT_DRIFT I66_PROPOSAL_REAL_CONTROL_MISSING I66_PROPOSAL_TARGET_PREEXISTED I66_PROPOSAL_AUDIT_NAMESPACE_PREEXISTED I66_PROPOSAL_FIRST_PREVIEW_REASON I66_PROPOSAL_FIRST_PREVIEW_CANDIDATE I66_PROPOSAL_OPERATIVO_UI_SERVER_VISIBILITY_DRIFT I66_PROPOSAL_UNASSIGNED_MODULE_EXPOSED I66_PROPOSAL_OPERATIVO_GRANTED_MODULE_DENIED I66_PROPOSAL_OPERATIVO_FULL_PORTFOLIO_CANDIDATE_MISSING I66_PROPOSAL_OPERATIVO_OUTSIDE_OWN_TEAM_SCOPE_EXPOSED I66_PROPOSAL_AUDIT_CLEANUP_BOUND I66_PROPOSAL_CLEANUP_READBACK I66_PROPOSAL_SIGNED_UAT_HOLD`.split(' ')]);
const RESULT_STATUSES=Object.freeze(['REVIEW_REQUIRED','ALREADY_APPLIED','RESOLUTION_DRAFT','RESOLUTION_READY','RESOLVED','READY_TO_APPLY','NOOP_ALREADY_SATISFIED','APPLIED']);
const FAILURE_CLASSES=Object.freeze(['ASSERTION','TIMEOUT','CALLABLE','TYPE_ERROR','REFERENCE_ERROR','ERROR']);
const EXTRA_CODES=Object.freeze(['ERR_ASSERTION','ENOENT','EACCES','ETIMEDOUT','ECONNRESET','ECONNREFUSED','UNKNOWN_CODE','NO_CODE']);
const FALLBACK_CHECKS=Object.freeze(['UNNAMED_ASSERTION','UNNAMED_FAILURE']);
const GRPC_CODES=Object.freeze(['GRPC_OK','GRPC_CANCELLED','GRPC_UNKNOWN','GRPC_INVALID_ARGUMENT','GRPC_DEADLINE_EXCEEDED','GRPC_NOT_FOUND','GRPC_ALREADY_EXISTS','GRPC_PERMISSION_DENIED','GRPC_RESOURCE_EXHAUSTED','GRPC_FAILED_PRECONDITION','GRPC_ABORTED','GRPC_OUT_OF_RANGE','GRPC_UNIMPLEMENTED','GRPC_INTERNAL','GRPC_UNAVAILABLE','GRPC_DATA_LOSS','GRPC_UNAUTHENTICATED']);
const pick=(value,allowed,fallback=null)=>allowed.includes(value)?value:fallback;
const bool=value=>typeof value==='boolean'?value:null;
const count=(value,max=2000)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
function safeCode(value){
 if(value==null||value==='')return 'NO_CODE';
 if(Number.isInteger(value)&&value>=0&&value<GRPC_CODES.length)return GRPC_CODES[value];
 const code=typeof value==='string'&&value.startsWith('functions/')?value.slice(10):value;
 return pick(code,[...CALLABLE_CODES,...EXTRA_CODES,...GRPC_CODES],'UNKNOWN_CODE');
}
function safeReason(value){return value==null||value===''?'NO_REASON':pick(value,REASONS,'UNKNOWN_REASON');}
function safeStage(value){return pick(value,STAGES,'UNKNOWN_STAGE');}
function safeCallableDiagnostic(value={}){
 return {stage:safeStage(value.stage),channel:pick(value.channel,['DRIVER','UI'],'DRIVER'),operation:pick(value.operation,OPERATIONS,'UNKNOWN_OPERATION'),
  resultPresent:bool(value.resultPresent),denied:bool(value.denied),driverFailed:bool(value.driverFailed),code:safeCode(value.code),
  reason:pick(value.reason,[...REASONS,'NO_REASON','UNKNOWN_REASON'],'UNKNOWN_REASON'),status:pick(value.status,RESULT_STATUSES),
  eligible:bool(value.eligible),resolutionOptionsPresent:bool(value.resolutionOptionsPresent),candidateCount:count(value.candidateCount),
  expectedReceiptPresent:bool(value.expectedReceiptPresent),targetCount:count(value.targetCount),reused:bool(value.reused),readbackConfirmed:bool(value.readbackConfirmed)};
}
function projectCallableResult(response,operation,stage,expectedReceiptId,channel='DRIVER'){
 const result=response?.result,options=result?.resolutionOptions,hasResult=!!result&&typeof result==='object'&&!Array.isArray(result);
 return safeCallableDiagnostic({stage,channel,operation,resultPresent:hasResult,denied:response?.denied===true,driverFailed:response?.driverFailed===true,
  code:safeCode(response?.code),reason:safeReason(hasResult?result.reason:response?.reason),status:result?.status,eligible:result?.eligible,
  resolutionOptionsPresent:Array.isArray(options),candidateCount:Array.isArray(options)?options.length:null,
  expectedReceiptPresent:Array.isArray(options)&&typeof expectedReceiptId==='string'&&expectedReceiptId?options.some(row=>row?.receiptId===expectedReceiptId):null,
  targetCount:Array.isArray(result?.targets)?result.targets.length:null,reused:result?.reused,readbackConfirmed:result?.readbackConfirmed});
}
function ownedUiRequest(url,body,phase,proposalId,sourceRunId){
 let parsed;try{parsed=new URL(url);}catch(_){return false;}
 const name=phase==='PREVIEW'?'orbit360CobrosReconciliationCommandPreview':phase==='LIVE'?'orbit360CobrosReconciliationCommand':null;
 return !!name&&parsed.origin==='https://us-central1-ays-orbit-360-lab.cloudfunctions.net'&&parsed.pathname==='/'+name&&
  body?.data?.tenantId==='alianzas-soluciones'&&OPERATIONS.includes(body?.data?.operation)&&
  typeof proposalId==='string'&&!!proposalId&&typeof sourceRunId==='string'&&!!sourceRunId&&
  body?.data?.payload?.proposalId===proposalId&&body?.data?.payload?.sourceRunId===sourceRunId;
}
function projectUiResponse(body,operation,stage,expectedReceiptId){
 const response=body?.error?{denied:true,code:safeCode(typeof body.error.status==='string'?body.error.status.toLowerCase().replace(/_/g,'-'):null),reason:safeReason(body.error.message)}:{result:body?.result??body?.data};
 return projectCallableResult(response,operation,stage,expectedReceiptId,'UI');
}
function safeFailureLocation(value){
 if(value?.file!==DRIVER||count(value.line,20000)==null||value.line===0||count(value.column,20000)==null||value.column===0)return null;
 return {file:DRIVER,line:value.line,column:value.column};
}
function failureDetails(error,stage){
 const message=typeof error?.message==='string'?error.message.split('\n',1)[0]:'';
 const assertion=error?.code==='ERR_ASSERTION'||error?.name==='AssertionError';
 const failureClass=assertion?'ASSERTION':error?.name==='TimeoutError'?'TIMEOUT':error?.name==='TypeError'?'TYPE_ERROR':error?.name==='ReferenceError'?'REFERENCE_ERROR':CALLABLE_CODES.includes(safeCode(error?.code))?'CALLABLE':'ERROR';
 const match=typeof error?.stack==='string'?error.stack.match(/(?:^|[\/\\\s(])gravicentra-i6-6-proposal-application-signed-uat\.cjs:(\d+):(\d+)(?:\)|\s|$)/m):null;
 const location=match?safeFailureLocation({file:DRIVER,line:Number(match[1]),column:Number(match[2])}):null;
 const result={failureStage:safeStage(stage),failureClass,failureCheck:pick(message,FAILURE_CHECKS,assertion?'UNNAMED_ASSERTION':'UNNAMED_FAILURE'),failureCode:safeCode(error?.code)};
 if(location){result.failureLocation=location;result.failureLine=location.line;}
 const substage=safeLegalFailureSubstage(error?.directionLegalSubstage);
 if(stage==='DIRECTION_LEGAL_ACCEPTANCE'&&substage)result.failureLegalSubstage=substage;
 return result;
}
const CONFIG_FLAGS=Object.freeze(['autoCommitHighConfidence','manualApplicationEnabled','humanConfirmationRequiredForHighConfidence','humanConfirmationRequired','requireSameCurrency']);
function safePrerequisites(value={}){
 const out={status:pick(value.status,['COMPLETE','READ_FAILED'],'READ_FAILED'),code:safeCode(value.code),configExists:bool(value.configExists),accessConfigExists:bool(value.accessConfigExists),
  authUidMatchesSelected:bool(value.authUidMatchesSelected),memberUidMatchesAuth:bool(value.memberUidMatchesAuth),memberTenantMatches:bool(value.memberTenantMatches),assignedRoleValid:bool(value.assignedRoleValid),
  signedRolePresent:bool(value.signedRolePresent),effectiveScope:pick(value.effectiveScope,SCOPES),policyAllowed:bool(value.policyAllowed),receiptAllowed:bool(value.receiptAllowed),
  policyScopeOutcome:pick(value.policyScopeOutcome,SCOPE_OUTCOMES),receiptScopeOutcome:pick(value.receiptScopeOutcome,SCOPE_OUTCOMES),configFlags:{}};
 for(const flag of CONFIG_FLAGS)out.configFlags[flag]=bool(value.configFlags?.[flag]);
 return out;
}
function diagnoseProposalPrerequisites({member,accessConfig,reconciliationConfig,configExists,accessConfigExists,tenantId,auth,activeRole,selectedUid,policy,receipt}){
 const out={status:'COMPLETE',configExists,accessConfigExists,authUidMatchesSelected:!!auth?.uid&&auth.uid===selectedUid,
  memberUidMatchesAuth:!!auth?.uid&&member?.uid===auth.uid,memberTenantMatches:member?.tenantId===tenantId,
  signedRolePresent:typeof auth?.token?.giActiveRole==='string'&&!!auth.token.giActiveRole.trim(),assignedRoleValid:false,effectiveScope:null,
  policyAllowed:false,receiptAllowed:false,policyScopeOutcome:null,receiptScopeOutcome:null,configFlags:reconciliationConfig};
 let actualRole;
 try{actualRole=resolveProductActiveRole(member,activeRole).activeRole;out.assignedRoleValid=true;}
 catch(error){out.policyScopeOutcome=out.receiptScopeOutcome=pick(error?.code,SCOPE_OUTCOMES,'UNKNOWN_SCOPE_FAILURE');return safePrerequisites(out);}
 // This diagnostic is deliberately restricted to the existing GT synthetic fixture.
 if(policy?.pais!=='GT'||receipt?.pais!=='GT'){out.policyScopeOutcome=out.receiptScopeOutcome='FIXTURE_COUNTRY_NOT_EXPECTED';return safePrerequisites(out);}
 for(const [key,parents] of [['policy',[]],['receipt',[receipt]]]){
  try{
   const ctx=proposalAccess.resolve({auth,member,config:accessConfig,tenantId,activeRole:actualRole,collection:'conciliaciones',country:'GT'});
   out.effectiveScope=ctx.scope;proposalAccess.allowRow(ctx,policy,parents);out[key+'Allowed']=true;out[key+'ScopeOutcome']='ALLOWED';
  }catch(error){out[key+'ScopeOutcome']=pick(error?.code,SCOPE_OUTCOMES,'UNKNOWN_SCOPE_FAILURE');}
 }
 return safePrerequisites(out);
}
function safeProposalDiagnosticReport(report={}){
 const out={owner:'PROPOSAL',status:pick(report.status,['PASS','HOLD','FAIL'],'HOLD'),phase:pick(report.phase,['PREVIEW','LIVE']),checks:count(Array.isArray(report.checks)?report.checks.length:report.checks,100),realControlUnchanged:bool(report.realControlUnchanged)};
 if(report.failureStage!==undefined){
  out.failureStage=safeStage(report.failureStage);out.failureClass=pick(report.failureClass,FAILURE_CLASSES,'ERROR');
  out.failureCheck=pick(report.failureCheck,[...FAILURE_CHECKS,...FALLBACK_CHECKS],'UNNAMED_FAILURE');out.failureCode=safeCode(report.failureCode);
  const location=safeFailureLocation(report.failureLocation);if(location){out.failureLocation=location;out.failureLine=location.line;}
  const substage=safeLegalFailureSubstage(report.failureLegalSubstage);if(out.failureStage==='DIRECTION_LEGAL_ACCEPTANCE'&&substage)out.failureLegalSubstage=substage;
 }
 const diagnostics=report.proposalDiagnostics||{};
 out.proposalDiagnostics={prerequisites:safePrerequisites(diagnostics.prerequisites),calls:Array.isArray(diagnostics.calls)?diagnostics.calls.slice(-32).map(safeCallableDiagnostic):[]};
 if(report.cleanup){out.cleanupStatus=pick(report.cleanup.status,['PASS','HOLD'],'HOLD');out.remaining=count(report.cleanup.remaining,100);out.removedOwnedTargets=count(report.cleanup.removedOwnedTargets,100);out.cleanupErrorCode=safeCode(report.cleanup.errorCode);out.cleanupNonOwnedTarget=Array.isArray(report.cleanup.errors)&&report.cleanup.errors.includes('NON_OWNED_TARGET');}
 return out;
}
module.exports=Object.freeze({DRIVER,STAGES,OPERATIONS,REASONS,CALLABLE_CODES,FAILURE_CHECKS,safeCode,safeReason,safeStage,projectCallableResult,safeCallableDiagnostic,ownedUiRequest,projectUiResponse,failureDetails,safePrerequisites,diagnoseProposalPrerequisites,safeProposalDiagnosticReport});
