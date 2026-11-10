'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const {getApps,initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const need=(c,m)=>{if(!c)throw Error(m);};
const txt=x=>String(x===null||x===undefined?'':x).trim();
const norm=x=>txt(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const nameNorm=x=>txt(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const unique=a=>[...new Set(a.filter(Boolean))];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const ledger=JSON.parse(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json','utf8'));
const audit=ledger.driveClientPoliciesJulyNovAudit20261110;
need(audit?.recentDocumentCounts?.modifiedFiles===332&&audit.recentDocumentCounts.potentialPolicyPdfTextFetched===78&&audit.recentDocumentCounts.docsWithoutHistoricalPolicyNumberMatch===15,'DRIVE_AUDIT_CENSUS_NOT_EXACT');
const exceptions=audit.reviewedPolicyPdfRecords.filter(x=>!x.historicalSeptemberExcelMatch);
need(exceptions.length===15&&new Set(exceptions.map(x=>x.driveFileId)).size===15,'FIFTEEN_DRIVE_FILES_NOT_UNIQUE');
need(process.env.PROJECT_ID==='ays-orbit-360-lab'&&process.env.GCLOUD_PROJECT==='ays-orbit-360-lab'&&!process.env.FIRESTORE_EMULATOR_HOST,'FIREBASE_READONLY_PROJECT_INVALID');
function rowNumberVariants(r){
  return unique(['numero','numeroPoliza','numero_poliza','numPoliza','numeroDePoliza','noPoliza','polizaNumero','policyNumber','policyNo','polizaNo','numeroContrato'].map(k=>r[k]).filter(v=>typeof v==='string'||typeof v==='number').map(norm));
}
function sourceNumbers(d){
  const candidates=(d.policyCandidates||[]).map(x=>txt(x).replace(/^p[oó]liza\s*(?:n[oú]mero|no\.?)\s*/i,'')).filter(x=>x.length>=4);
  const f=txt(d.documentName);
  for(const pattern of [/\bAUTO-\d{8,}\b/gi,/\bTLG[$S]-\d+\b/gi,/\bVA\d{2,4}-\d{5,}\b/gi,/\bVA-\d{4,}\b/gi,/\b\d{10}\b/g,/\bP[oó]liza\s+(\d{4,})\b/gi]){
    for(const m of f.matchAll(pattern))candidates.push(m[1]||m[0]);
  }
  return unique(candidates.map(norm).filter(x=>x.length>=4));
}
function clientNames(r){
  const a=[r.nombreCompleto,r.nombreCliente,r.clienteNombre,r.contratanteNombre,r.aseguradoNombre,r.fullName,r.name,r.nombre,r.razonSocial,r.razon_social];
  if(r.nombres||r.apellidos)a.push([r.nombres,r.apellidos].map(txt).join(' '));
  return unique(a.map(nameNorm).filter(x=>x.length>=5));
}
function dateISO(v){
  if(!v)return '';
  if(typeof v.toDate==='function')return v.toDate().toISOString().slice(0,10);
  const s=txt(v);
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  return '';
}
function effectiveDates(r){
  const first=['vigenciaInicio','fechaInicio','inicioVigencia','desde','vigenciaDesde','fechaDesde','vigencia_inicial','inicio','fechaInicioVigencia','startDate'].map(k=>dateISO(r[k])).find(Boolean)||'';
  const last=['vigenciaFin','fechaFin','finVigencia','hasta','vigenciaHasta','fechaHasta','vencimiento','fechaVencimiento','fin','fechaFinVigencia','endDate'].map(k=>dateISO(r[k])).find(Boolean)||'';
  return{start:first,end:last};
}
function documentDates(d){
  const out=(d.sourceDates||[]).map(dateISO).filter(Boolean);
  return{start:out[0]||'',end:out.find(x=>x>(out[0]||''))||out[1]||''};
}
function insurerFromFilename(f){
  const n=nameNorm(f);
  for(const [hint,p] of [['LA CEIBA','LA CEIBA'],['FICOHSA','FICOHSA'],['UNIVERSALES','UNIVERSALES'],['ASEGURADORA GENERAL','GENERAL'],['SEGUROS G T','G T'],['SEGUROS G&T','G T'],['COLUMNA','COLUMNA'],['MAPFRE','MAPFRE'],['TRABAJADORES','TRABAJADORES']])if(n.includes(nameNorm(hint)))return p;
  return '';
}
function insurerFields(r){
 return unique([r.aseguradoraNombre,r.nombreAseguradora,r.nombreAsegurador,r.companiaNombre,r.compania,r.aseguradora,r.nombre,r.razonSocial,r.razon_social].filter(v=>typeof v==='string').map(nameNorm));
}
function pickPolicyMeta(p){
  const r=p.data;
  const country=norm(r.pais||r.country||r.paisCodigo||r.countryCode||p.tenantCountry);
  const c=txt(r.clienteId||r.clientId||r.contratanteId||r.aseguradoId);
  const insurerId=txt(r.aseguradoraId||r.insurerId);
  const insurer=unique([...insurerFields(r),...(p.insurerLookup.get(insurerId)||[])]);
  const client=unique([...clientNames(r),...(p.clientLookup.get(c)||[])]);
  return {policyId:p.id,tenantId:p.tenantId,country,numberVariants:rowNumberVariants(r),clientId:c,client,insurerId,insurer,dates:effectiveDates(r),product:unique([r.ramo,r.tipoSeguro,r.ramoNombre,r.producto,r.tipoPoliza].map(nameNorm))};
}
const isCountryGT=x=>x==='GT'||x==='GUATEMALA';
const containsName=(a,b)=>Boolean(a&&b&&(a===b||a.includes(b)||b.includes(a)));
(async()=>{
  const app=getApps()[0]||initializeApp({projectId:'ays-orbit-360-lab'});
  const db=getFirestore(app),tenants=await db.collection('tenants').listDocuments();
  need(tenants.length>=1&&tenants.length<=300,'TENANT_SCOPE_UNEXPECTED');
  const all=[];let clientsRead=0,insurersRead=0,policyRead=0;
  for(const t of tenants){
    const [tc,pol,cus,ins]=await Promise.all([
      t.get(),
      t.collection('data').doc('polizas').collection('items').get(),
      t.collection('data').doc('clientes').collection('items').get(),
      t.collection('data').doc('aseguradoras').collection('items').get()
    ]);
    need(pol.size<=5000&&cus.size<=5000&&ins.size<=1000,'TENANT_COLLECTION_TOO_LARGE');
    policyRead+=pol.size;clientsRead+=cus.size;insurersRead+=ins.size;
    const tenantCountry=norm((tc.data()||{}).pais||(tc.data()||{}).country);
    const clients=new Map(cus.docs.map(d=>[d.id,clientNames(d.data()||{})]));
    const insurers=new Map(ins.docs.map(d=>[d.id,insurerFields(d.data()||{})]));
    for(const d of pol.docs)all.push(pickPolicyMeta({id:d.id,tenantId:t.id,tenantCountry,data:d.data()||{},clientLookup:clients,insurerLookup:insurers}));
  }
  need(policyRead>=100&&policyRead<=6000,'LIVE_POLICY_INVENTORY_OUTSIDE_EXPECTED_BOUNDS');
  const results=[];
  for(const d of exceptions){
    const ids=sourceNumbers(d),dn=nameNorm(d.clientFolder),hint=insurerFromFilename(d.documentName),term=documentDates(d);
    const exactNum=all.filter(p=>ids.some(id=>p.numberVariants.includes(id)));
    const gtExact=exactNum.filter(p=>isCountryGT(p.country));
    const gtClient=all.filter(p=>isCountryGT(p.country)&&p.client.some(c=>containsName(c,dn)));
    const candidate=unique([...gtExact,...gtClient.filter(p=>hint&&p.insurer.some(v=>containsName(v,nameNorm(hint))))]);
    const brief=p=>({
      policyId:p.policyId,tenantId:p.tenantId,country:p.country,
      number:p.numberVariants.slice(0,3),client:p.client.slice(0,3),insurer:p.insurer.slice(0,3),
      dates:p.dates,product:p.product.slice(0,3),
      evidence:{
        exactNumber:ids.some(id=>p.numberVariants.includes(id)),
        client:!!p.client.find(c=>containsName(c,dn)),
        insurer:hint?!!p.insurer.find(i=>containsName(i,nameNorm(hint))):null,
        term:term.start&&term.end&&p.dates.start&&p.dates.end?(term.start===p.dates.start&&term.end===p.dates.end):null
      }
    });
    const selected=unique([...gtExact.map(p=>p.tenantId+'/'+p.policyId),...candidate.map(p=>p.tenantId+'/'+p.policyId)])
      .map(id=>all.find(p=>p.tenantId+'/'+p.policyId===id)).slice(0,10).map(brief);
    const strict=selected.filter(p=>p.evidence.exactNumber&&p.evidence.client&&p.evidence.insurer===true&&p.evidence.term===true);
    const endorsed=/ENDOSO|ANEXO|RENOVACI[OÓ]N|CAR[AÁ]TULA\s+DE\s+RENOVACI/i.test(d.documentName);
    const exactSourceNumber=ids.length>0;
    let status='HOLD_UNRESOLVED_LIVE_JOIN';
    if(strict.length===1&&gtExact.length===1)status='ALREADY_LIVE_EXACT';
    else if(endorsed&&gtExact.length===0)status='DOCUMENTARY_OR_RENEWAL_ONLY_POSSIBLE';
    else if(exactSourceNumber&&gtExact.length===0&&d.documentClass!=='RENEWAL_OR_ENDORSEMENT_UNDATED_NAME')status='MISSING_NEW_POLICY_CANDIDATE_REQUIRES_DOSSIER_QA';
    if(gtExact.length>1)status='HOLD_DUPLICATE_POLICY_NUMBER_GT';
    if(exactNum.some(p=>p.country==='CO'||p.country==='COLOMBIA'))status='HOLD_CROSS_COUNTRY_NUMBER_COLLISION';
    if(exactNum.some(p=>!p.country))status='HOLD_COUNTRY_UNDECLARED_IN_LIVE_POLICY';
    results.push({driveFileId:d.driveFileId,clientFolder:d.clientFolder,documentName:d.documentName,
      sourceNumberCandidates:ids,sourceInsurer:hint||null,sourceDates:term,sourceClass:d.documentClass,
      gtPolicyNumberMatches:gtExact.length,allCountryNumberMatches:exactNum.length,
      gtClientPolicyCount:gtClient.length,status,liveCandidates:selected});
  }
  const byStatus=Object.fromEntries([...new Set(results.map(x=>x.status))].sort().map(k=>[k,results.filter(x=>x.status===k).length]));
  const output={schema:'I66_DRIVE_15_LIVE_POLICY_READONLY_QA_V1',sourceAuditId:audit.id,
    sourceLedgerSha256:sha(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json')),
    projectId:'ays-orbit-360-lab',tenantCount:tenants.length,livePolicyCount:policyRead,liveClientsRead:clientsRead,liveInsurersRead:insurersRead,
    driveFiles:15,summary:byStatus,results,writeOperations:0,status:'READ_ONLY_CLASSIFICATION_FOR_REVIEW'};
  fs.writeFileSync(process.env.GI_I66_REPORT_PATH,JSON.stringify(output,null,2)+'\n',{mode:0o600});
  console.log('I66_DRIVE_15_LIVE_POLICY_READONLY_PASS '+JSON.stringify({tenants:tenants.length,policies:policyRead,clients:clientsRead,insurers:insurersRead,status:byStatus,writeOperations:0}));
  for(const d of results)console.log('I66_DRIVE_15_CASE '+JSON.stringify({client:d.clientFolder,number:d.sourceNumberCandidates,insurer:d.sourceInsurer,status:d.status,livePolicyNumberMatches:d.gtPolicyNumberMatches,topMatched:d.liveCandidates.filter(p=>p.evidence.exactNumber).map(p=>({policyId:p.policyId,tenantId:p.tenantId,country:p.country,evidence:p.evidence}))}));
})().catch(e=>{console.error('I66_DRIVE_15_READONLY_HOLD:'+String(e.message||e));process.exitCode=1;});