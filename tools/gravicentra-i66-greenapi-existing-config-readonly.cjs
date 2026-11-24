'use strict';

// Server-side readiness validation of the one already observed secret version.
// Its payload stays in memory. Output is a fixed boolean/routing-path report.
// Optional Firestore access is one existing advisor read; never a write/query.
const path = require('node:path');
const {createRequire} = require('node:module');
const functionsRequire = createRequire(path.resolve(__dirname,'../functions/package.json'));
const SECRET_REFERENCE = 'projects/ays-orbit-360-lab/secrets/orbit360-greenapi-gt-alianzas-soluciones/versions/1';
const RUNTIME_PRINCIPAL = 'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const TENANT = 'alianzas-soluciones', COUNTRY = 'GT', INSTANCE = '710522720868';
const text = v => typeof v === 'string' ? v.trim() : '';
const norm = v => text(v).toLowerCase();
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const validId = v => /^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/.test(text(v));
const list = v => Array.isArray(v) ? v : [];
function providerOrigin(secret){
  try{
    const u=new URL(secret?.apiUrl);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&
      (u.pathname==='/'||u.pathname==='')&&(u.hostname==='green-api.com'||u.hostname==='greenapi.com'||
      u.hostname.endsWith('.green-api.com')||u.hostname.endsWith('.greenapi.com'))?u.origin:'';
  }catch{return '';}
}

function inspectSecret(secret) {
  const inbound = object(secret) && object(secret.inboundLeads) ? secret.inboundLeads : {};
  const fixedCandidates = [
    ['inboundLeads.advisorId', inbound.advisorId],
    ['inboundLeads.asesorId', inbound.asesorId],
    ['leadRouting.advisorId', secret?.leadRouting?.advisorId],
    ['leadRouting.asesorId', secret?.leadRouting?.asesorId],
    ['routing.leads.advisorId', secret?.routing?.leads?.advisorId],
    ['routing.leads.asesorId', secret?.routing?.leads?.asesorId]
  ].filter(([,value])=>validId(value));
  const advisorIds = [...new Set(fixedCandidates.map(([,value])=>text(value)))];
  const exactCandidate = advisorIds.length === 1 ? fixedCandidates[0] : null;
  const activation = text(inbound.activationNotBefore);
  const report = {
    secretJsonObject: object(secret),
    rootTenantCountryInstanceMatch: object(secret) && secret.tenantId === TENANT &&
      secret.pais === COUNTRY && secret.idInstance === INSTANCE,
    senderWidFormatValid: /^[1-9][0-9]{7,14}@c\.us$/.test(text(secret?.senderWid)),
    apiTokenFormatUsable: typeof secret?.apiTokenInstance==='string'&&/^[A-Za-z0-9_-]{16,256}$/.test(secret.apiTokenInstance),
    apiOriginAllowed: !!providerOrigin(secret),
    webhookBearerUsable: typeof secret?.webhookBearerToken === 'string' &&
      secret.webhookBearerToken.length >= 24 && secret.webhookBearerToken.length <= 256,
    inboundBlockPresent: object(secret?.inboundLeads),
    inboundEnabled: inbound.enabled === true,
    exactInboundAdvisorConfigured: validId(inbound.advisorId),
    existingRoutingCandidatePresent: fixedCandidates.length > 0,
    existingRoutingUnambiguous: advisorIds.length === 1,
    authorizationReceiptPresent: validId(inbound.authorizationReceipt),
    activationDatePresent: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(activation) && Number.isFinite(Date.parse(activation)),
    transportEnabledInExistingSecret: secret?.transportEnabled === true,
    payloadOrCredentialPrinted: false,
    providerRequestMade: false,
    firestoreWritten: false,
    cloudResourcesMutated: false
  };
  return {report, advisorId: exactCandidate ? text(exactCandidate[1]) : '',
    routingPath: exactCandidate ? exactCandidate[0] : ''};
}
async function readRuntimeSecret(progress){
  const {GoogleAuth,Impersonated}=functionsRequire('google-auth-library');
  const {SecretManagerServiceClient}=functionsRequire('@google-cloud/secret-manager');
  const auth=new GoogleAuth({projectId:'ays-orbit-360-lab',scopes:['https://www.googleapis.com/auth/cloud-platform']});
  const sourceClient=await auth.getClient();
  progress.runtimeSourceCredentialReady=true;
  const runtime=new Impersonated({sourceClient,targetPrincipal:RUNTIME_PRINCIPAL,lifetime:600,
    delegates:[],targetScopes:['https://www.googleapis.com/auth/cloud-platform']});
  // google-gax also calls getUniverseDomain/getProjectId. The complete
  // GoogleAuth wrapper is required by the pinned 6.2.0 / 10.9.1 SDK pair.
  const runtimeAuth=new GoogleAuth({authClient:runtime,projectId:'ays-orbit-360-lab'});
  const client=new SecretManagerServiceClient({projectId:'ays-orbit-360-lab',auth:runtimeAuth});
  try{
    await client.initialize();progress.runtimeSdkReady=true;
    await runtime.getAccessToken();progress.runtimeIdentityTokenReady=true;
    progress.runtimeSecretReadAttempted=true;
    const [version]=await client.accessSecretVersion({name:SECRET_REFERENCE});
    progress.runtimeSecretReadReturned=true;
    const bytes=version?.payload?.data;
    if(!bytes||bytes.length>8000)throw Error('RUNTIME_SECRET_FORMAT');
    progress.runtimeSecretResponseBounded=true;
    const value=JSON.parse(Buffer.from(bytes).toString('utf8'));progress.runtimeSecretJsonParsed=true;return value;
  }finally{try{await client.close();}catch{/* Fixed stage booleans remain the only output. */}}
}
async function boundedJson(response){
  if(!response?.ok)throw Error('METADATA_READ_REJECTED');
  const length=Number(response.headers?.get('content-length')||0);
  if(length>65536)throw Error('METADATA_SIZE');
  const chunks=[];let size=0;
  if(response.body?.getReader){
    const reader=response.body.getReader();
    while(true){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;
      if(size>65536){await reader.cancel();throw Error('METADATA_SIZE');}chunks.push(Buffer.from(x.value));}
  }else{const b=Buffer.from(await response.arrayBuffer());if(b.length>65536)throw Error('METADATA_SIZE');size=b.length;chunks.push(b);}
  return JSON.parse(Buffer.concat(chunks,size).toString('utf8'));
}
async function probeProviderReadiness(secret,{runtimeReader=readRuntimeSecret,fetchImpl=fetch}={}){
  const result={runtimeImpersonationAttempted:false,runtimeSourceCredentialReady:false,runtimeSdkReady:false,
    runtimeIdentityTokenReady:false,runtimeSecretReadAttempted:false,runtimeSecretReadReturned:false,
    runtimeSecretResponseBounded:false,runtimeSecretJsonParsed:false,runtimeSecretAccessVerified:false,runtimeSecretScopeMismatch:false,
    runtimeSecretPermissionDenied:false,runtimeSecretUnauthenticated:false,runtimeSecretNotFound:false,
    runtimeSecretTransientFailure:false,runtimeSecretClientTypeError:false,runtimeSecretUnknownFailure:false,
    providerRequestMade:false,providerAuthorized:false,settingsIdentityMatches:false,readOnlyMetadataRequestsOnly:true};
  const check=inspectSecret(secret).report;
  if(!check.rootTenantCountryInstanceMatch)return result;
  result.runtimeImpersonationAttempted=true;
  try{const runtimeSecret=await runtimeReader(result);result.runtimeSecretAccessVerified=inspectSecret(runtimeSecret).report.rootTenantCountryInstanceMatch===true;
    result.runtimeSecretScopeMismatch=!result.runtimeSecretAccessVerified;}
  catch(error){
    // Allowlisted status categories only. No message, stack, details, request,
    // payload or arbitrary status string may enter the public diagnostic.
    const code=Number(error?.code);
    result.runtimeSecretPermissionDenied=code===7||code===403;
    result.runtimeSecretUnauthenticated=code===16||code===401;
    result.runtimeSecretNotFound=code===5||code===404;
    result.runtimeSecretTransientFailure=[4,13,14,429,500,502,503,504].includes(code);
    result.runtimeSecretClientTypeError=error instanceof TypeError;
    result.runtimeSecretUnknownFailure=![result.runtimeSecretPermissionDenied,result.runtimeSecretUnauthenticated,
      result.runtimeSecretNotFound,result.runtimeSecretTransientFailure,result.runtimeSecretClientTypeError].some(Boolean);
  }
  if(!check.apiTokenFormatUsable||!check.apiOriginAllowed)return result;
  const origin=providerOrigin(secret);
  const metadata=async name=>{
    result.providerRequestMade=true;
    const response=await fetchImpl(`${origin}/waInstance${INSTANCE}/${name}/${secret.apiTokenInstance}`,
      {method:'GET',redirect:'error',signal:AbortSignal.timeout(10000)});
    return boundedJson(response);
  };
  try{
    const state=await metadata('getStateInstance');result.providerAuthorized=state?.stateInstance==='authorized';
    if(result.providerAuthorized){const settings=await metadata('getSettings');
      result.settingsIdentityMatches=check.senderWidFormatValid&&settings?.wid===secret.senderWid;}
  }catch{/* No token-bearing URL, provider body or exception is returned. */}
  return result;
}
function inspectAdvisor(advisor, advisorId) {
  const roles = [...list(advisor?.roles), ...list(advisor?.rolesAsignados),
    advisor?.rol, advisor?.role, advisor?.rolDefault, advisor?.defaultRole].map(norm);
  const countries = [...list(advisor?.paises), ...list(advisor?.countries),
    advisor?.pais, advisor?.country, advisor?.paisDefault, advisor?.countryDefault].map(v=>text(v).toUpperCase());
  const bad = ['inactivo','inactive','blocked','bloqueado','eliminado','deleted',
    'pending','pendiente','invited','invitado','suspended','suspendido'];
  return {
    canonicalAdvisorExists: object(advisor),
    canonicalAdvisorIdentityMatches: object(advisor) && (!advisor.tenantId || advisor.tenantId === TENANT) && (!advisor.id || advisor.id === advisorId),
    canonicalAdvisorActive: object(advisor) && advisor.activo !== false && advisor.active !== false &&
      advisor.inactivo !== true && advisor.archivado !== true && advisor.eliminado !== true &&
      ![advisor.estado,advisor.status].map(norm).some(s=>bad.includes(s)),
    canonicalAdvisorRoleEligible: roles.some(r=>['asesor','comercial'].includes(r)),
    canonicalAdvisorCountryMatches: countries.includes(COUNTRY)
  };
}
async function main() {
  const {SecretManagerServiceClient} = functionsRequire('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  let secret = null, accessed = false;
  try {
    const [version] = await client.accessSecretVersion({name: SECRET_REFERENCE});
    accessed = true;
    const bytes = version?.payload?.data;
    if(bytes && bytes.length <= 8000)secret=JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch { /* Only fixed booleans below; no provider or exception text. */ }
  const inspection=inspectSecret(secret), report={secretVersionAccessible:accessed,...inspection.report};
  let advisor = null, read = false;
  if(inspection.advisorId && report.rootTenantCountryInstanceMatch){
    try {
      const {initializeApp,getApps,applicationDefault}=functionsRequire('firebase-admin/app');
      const {getFirestore}=functionsRequire('firebase-admin/firestore');
      const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:'ays-orbit-360-lab'});
      const snapshot=await getFirestore(app).collection('tenants').doc(TENANT)
        .collection('data').doc('asesores').collection('items').doc(inspection.advisorId).get();
      read=true;advisor=snapshot.exists?snapshot.data():null;
    } catch { /* No arbitrary reads or error payloads. */ }
  }
  Object.assign(report,{canonicalAdvisorReadPerformed:read},inspectAdvisor(advisor,inspection.advisorId));
  Object.assign(report,await probeProviderReadiness(secret));
  if(!Object.values(report).every(v=>typeof v==='boolean'))throw Error('NON_BOOLEAN_REPORT_BLOCKED');
  console.log('I66_GREENAPI_EXISTING_CONFIG_READONLY='+JSON.stringify(report));
  console.log('I66_GREENAPI_EXISTING_ROUTING_PATH='+inspection.routingPath);
}

if(require.main===module)main().catch(()=>{console.error('I66_GREENAPI_EXISTING_CONFIG_PROBE_FAILED');process.exitCode=1;});
module.exports={SECRET_REFERENCE,RUNTIME_PRINCIPAL,inspectSecret,inspectAdvisor,providerOrigin,probeProviderReadiness};

