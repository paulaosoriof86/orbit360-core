'use strict';
const crypto = require('node:crypto');
const {GoogleAuth}=require('google-auth-library');
const terms=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_THREE_ISSUED_TERMS_DOCUMENTARY_CROSSCHECK_20261122.json').issuedExamples;
const witnesses=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_ISSUED_TERM_WITNESSES_20261122.json');
async function readOriginal(term,index,headers){
  const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(term.issuerDocumentId)+'?alt=media&supportsAllDrives=true';
  const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});
  if(!res.ok)return {status:'ISSUER_DOCUMENT_HTTP_'+res.status};
  const data=Buffer.from(await res.arrayBuffer());
  if(data.length>4e6||data.subarray(0,5).toString()!=='%PDF-'||crypto.createHash('sha256').update(data).digest('hex')!==witnesses[index].pdfSha256)return {status:'ISSUER_DIGEST_DRIFT'};
  return {status:'ISSUER_ORIGINAL_BYTES_VERIFIED',data};
}
async function inspect(){
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/drive.readonly']});
  const headers=await (await auth.getClient()).getRequestHeaders();
  const result=await Promise.all(terms.map((t,i)=>readOriginal(t,i,headers)));
  console.log('I66_DOCUMENTARY_PROTECTED_ORIGINAL_ACCESS='+JSON.stringify(result.map((x,i)=>({decision:witnesses[i].decision,status:x.status}))));
}
if(require.main===module)inspect().catch(()=>{console.error('I66_DOCUMENTARY_ORIGINAL_PROVIDER_UNAVAILABLE');process.exitCode=1;});
module.exports={readOriginal};
