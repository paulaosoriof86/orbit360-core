'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {inspectMedicalOriginal,safePrincipal,medicalOriginals}=require('./gravicentra-i66-issued-original-access.cjs');
const bytes=Buffer.from('%PDF-1.7\nsynthetic diagnostic bytes\n');
const ref={caseId:'TEST',fileId:'source_file_id',sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
const headers={Authorization:'Bearer SECRET_NEVER_PRINT'};
const mock=(status=200,data=bytes)=>{const calls=[];return {calls,fetcher:async(url,options)=>{calls.push({url,options});
 return url.includes('fields=')?{ok:status===200,status,json:async()=>({id:ref.fileId,mimeType:'application/pdf',capabilities:{canDownload:true},privateName:'PRIVATE_NEVER_PRINT'})}:
 {ok:status===200,status,arrayBuffer:async()=>data};}};};
test('two fixed medical originals retain exact IDs and SHA pins',()=>{
 assert.deepEqual(medicalOriginals.map(r=>r.fileId),['1vCSFXQD5NDGYHOrT-kxPoFbiciqnLIRI','1nHigtnI2GJlKePaeyVyXlB_giCyIH2ss']);
 assert.equal(medicalOriginals[1].sha256,'78d78df726fa54c8ef2af5d728a50265db6956208b4a593eab433457f24b4e62');
});
test('prints only project service account identifier, never a credential object',()=>{
 assert.equal(safePrincipal({client_email:'firebase-adminsdk-example@ays-orbit-360-lab.iam.gserviceaccount.com',private_key:'SECRET'}),'firebase-adminsdk-example@ays-orbit-360-lab.iam.gserviceaccount.com');
 for(const c of [{client_email:'someone@example.com'},{client_email:'agent@another-project.iam.gserviceaccount.com'},{client_email:'bad\n@ays-orbit-360-lab.iam.gserviceaccount.com'},null])assert.equal(safePrincipal(c),'CONFIGURED_IDENTITY_NOT_DISCLOSED');
});
test('exact original bytes verified with GET reads and sanitized output',async()=>{
 const m=mock(),out=await inspectMedicalOriginal(ref,headers,m.fetcher);
 assert.equal(out.status,'ISSUER_ORIGINAL_BYTES_VERIFIED');assert.equal(out.metadataHttp,200);assert.equal(out.mediaHttp,200);
 assert.equal(out.observedSha256,ref.sha256);assert.equal(out.canDownload,true);assert.equal(m.calls.length,2);
 for(const c of m.calls){assert.equal(c.options.method,undefined);assert.equal(c.options.body,undefined);assert.match(c.url,/^https:\/\/www.googleapis.com\/drive\/v3\/files\/source_file_id\?/);}
 assert.doesNotMatch(JSON.stringify(out),/SECRET|PRIVATE|Authorization|Bearer/);
});
for(const status of [401,403,404,429,500])test('reports exact HTTP '+status+' without reading private error body',async()=>{
 const m=mock(status),out=await inspectMedicalOriginal(ref,headers,m.fetcher);
 assert.equal(out.status,'ISSUER_DOCUMENT_HTTP_'+status);assert.equal(out.metadataHttp,status);assert.equal(out.mediaHttp,status);
 assert.equal(out.observedSha256,undefined);assert.doesNotMatch(JSON.stringify(out),/SECRET|PRIVATE|Bearer/);
});
test('successful HTTP cannot pass different PDF bytes or a non-PDF',async()=>{
 let m=mock(200,Buffer.from('%PDF-1.7\nchanged'));
 assert.equal((await inspectMedicalOriginal(ref,headers,m.fetcher)).status,'ISSUER_DIGEST_DRIFT');
 m=mock(200,Buffer.from('<html>not a PDF</html>'));
 assert.equal((await inspectMedicalOriginal(ref,headers,m.fetcher)).status,'ISSUER_DOCUMENT_NOT_PINNED_PDF');
});
