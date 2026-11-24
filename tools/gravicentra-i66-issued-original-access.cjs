'use strict';
const crypto = require('node:crypto');
const terms=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json').issuedExamples;
const witnesses=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_ISSUED_TERM_WITNESSES_20261122.json');
const medicalOriginals=[
  {caseId:'UNIVERSALES_12289_4',fileId:'1vCSFXQD5NDGYHOrT-kxPoFbiciqnLIRI',sha256:'6c360b74ef73c971f856a66eb4f4aa906ea8c303faafcfe972e027b16620fc7e'},
  {caseId:'UNIVERSALES_15590_0',fileId:'1nHigtnI2GJlKePaeyVyXlB_giCyIH2ss',sha256:'78d78df726fa54c8ef2af5d728a50265db6956208b4a593eab433457f24b4e62'}
];
function safePrincipal(credentials){
  const email=credentials&&credentials.client_email;
  return typeof email==='string'&&/^[a-z0-9-]+@ays-orbit-360-lab\.iam\.gserviceaccount\.com$/.test(email)?email:'CONFIGURED_IDENTITY_NOT_DISCLOSED';
}
async function inspectMedicalOriginal(ref,headers,fetcher=fetch){
  const base='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(ref.fileId);
  const metadata=await fetcher(base+'?fields=id,mimeType,size,capabilities(canDownload)&supportsAllDrives=true',
    {headers,signal:AbortSignal.timeout(25000)});
  const result={caseId:ref.caseId,fileId:ref.fileId,metadataHttp:metadata.status,expectedSha256:ref.sha256};
  // The response body may contain private metadata or error text. Never emit it.
  if(metadata.ok){const m=await metadata.json();result.canDownload=m.capabilities?.canDownload===true;
    result.metadataIdentityMatches=m.id===ref.fileId;result.metadataIsPdf=m.mimeType==='application/pdf';}
  const media=await fetcher(base+'?alt=media&supportsAllDrives=true',{headers,signal:AbortSignal.timeout(25000)});
  result.mediaHttp=media.status;
  if(!media.ok)return {...result,status:'ISSUER_DOCUMENT_HTTP_'+media.status};
  const data=Buffer.from(await media.arrayBuffer());result.bytes=data.length;
  if(data.length>4e6||data.subarray(0,5).toString()!=='%PDF-')return {...result,status:'ISSUER_DOCUMENT_NOT_PINNED_PDF'};
  result.observedSha256=crypto.createHash('sha256').update(data).digest('hex');
  return {...result,status:result.observedSha256===ref.sha256?'ISSUER_ORIGINAL_BYTES_VERIFIED':'ISSUER_DIGEST_DRIFT'};
}
async function readOriginal(term,index,headers){
  const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(term.issuerDocumentId)+'?alt=media&supportsAllDrives=true';
  const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});
  if(!res.ok)return {status:'ISSUER_DOCUMENT_HTTP_'+res.status};
  const data=Buffer.from(await res.arrayBuffer());
  if(data.length>4e6||data.subarray(0,5).toString()!=='%PDF-'||crypto.createHash('sha256').update(data).digest('hex')!==witnesses[index].pdfSha256)return {status:'ISSUER_DIGEST_DRIFT'};
  return {status:'ISSUER_ORIGINAL_BYTES_VERIFIED',data};
}
async function inspect(){
  const {GoogleAuth}=require('google-auth-library');
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']});
  const headers=await (await auth.getClient()).getRequestHeaders();
  const result=await Promise.all(terms.map((t,i)=>readOriginal(t,i,headers)));
  console.log('I66_DOCUMENTARY_PROTECTED_ORIGINAL_ACCESS='+JSON.stringify(result.map((x,i)=>({decision:witnesses[i].decision,status:x.status}))));
  console.log('I66_MEDICAL_ORIGINAL_ACCESS_IDENTITY='+JSON.stringify({principal:safePrincipal(await auth.getCredentials()),scope:'drive.readonly',writes:0}));
  const medical=await Promise.all(medicalOriginals.map(ref=>inspectMedicalOriginal(ref,headers)));
  console.log('I66_MEDICAL_PINNED_ORIGINAL_ACCESS='+JSON.stringify({documents:medical,writes:0}));
}
if(require.main===module)inspect().catch(()=>{console.error('I66_DOCUMENTARY_ORIGINAL_PROVIDER_UNAVAILABLE');process.exitCode=1;});
module.exports={readOriginal,inspectMedicalOriginal,safePrincipal,medicalOriginals};
