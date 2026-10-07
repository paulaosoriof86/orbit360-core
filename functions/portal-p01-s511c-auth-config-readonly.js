'use strict';

const {GoogleAuth}=require('google-auth-library');

const PROJECT_ID='ays-orbit-360-lab';
const URL='https://identitytoolkit.googleapis.com/admin/v2/projects/'+PROJECT_ID+'/config';

async function main(){
  const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
  const client=await auth.getClient();
  const headers=await client.getRequestHeaders(URL);
  const res=await fetch(URL,{headers});
  const body=await res.text();
  if(!res.ok){
    console.log(JSON.stringify({
      schemaVersion:'ays-portal-p01-s511c-auth-config-readback-v1',
      projectId:PROJECT_ID,
      readOnly:true,
      configReadable:false,
      httpStatus:res.status,
      emailProviderVerified:false,
      passwordRequired:null,
      anonymousEnabled:null,
      phoneEnabled:null,
      productionTouched:false
    },null,2));
    return;
  }
  const json=JSON.parse(body||'{}');
  const signIn=json.signIn||{};
  const email=signIn.email||{};
  const phone=signIn.phoneNumber||{};
  const anon=signIn.anonymous||{};
  const result={
    schemaVersion:'ays-portal-p01-s511c-auth-config-readback-v1',
    projectId:PROJECT_ID,
    readOnly:true,
    configReadable:true,
    emailProviderVerified:email.enabled===true,
    passwordRequired:typeof email.passwordRequired==='boolean'?email.passwordRequired:null,
    anonymousEnabled:anon.enabled===true,
    phoneEnabled:phone.enabled===true,
    mfaState:String((json.mfa&&json.mfa.state)||'').slice(0,40),
    authorizedDomainCount:Array.isArray(json.authorizedDomains)?json.authorizedDomains.length:0,
    hasBlockingFunctions:!!(json.blockingFunctions&&Object.keys(json.blockingFunctions).length),
    productionTouched:false
  };
  console.log(JSON.stringify(result,null,2));
}

main().catch(e=>{
  console.error(JSON.stringify({
    schemaVersion:'ays-portal-p01-s511c-auth-config-readback-v1',
    projectId:PROJECT_ID,
    readOnly:true,
    configReadable:false,
    error:String(e&&e.message||e).slice(0,160),
    productionTouched:false
  }));
  process.exit(1);
});