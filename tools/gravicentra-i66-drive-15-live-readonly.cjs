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
  const authenticDrivePdf=new Map(Object.entries({
  '1cBgH387j5-zYt0TV8lL1GFOLm8ydHDnM':{insurer:'LA CEIBA',client:'DANIEL ISAAC ALEMAN YORQUI',numbers:['0226125562'],start:'2026-04-01',end:'2027-04-01'},
  '1ET-yBpte2pkld5b6Nk-FgOewG-xbF8nj':{insurer:'FICOHSA',client:'VANESA LOPEZ ALDANA',numbers:['AUTO-1000002899'],start:'2026-02-09',end:'2027-02-09',note:'PDF emission 20-Feb distinct from policy start 09-Feb'},
  '1Sojl_OoAESHhK7W0DgDqV4gXYSNL1Mry':{insurer:'COLUMNA',client:'JOSE ALEJANDRO HERRARTE GONZALEZ',numbers:['VA-57280'],start:'2026-02-20',end:'2027-02-20',note:'PDF primary policy text VA-57280'},
  '1odOfnvDlbeP_74nrf-lyed7QZZwVDk0L':{insurer:'G T',client:'JULIO SERGIO SINAY SANCHEZ',numbers:['AUBU-85183'],start:'2026-08-21',end:'2027-08-21',note:'PDF renewal AUBU-85183'},
  '19ht0t_0TTAMmBgo1rYiO5CJZdebdP-7F':{insurer:'RURAL',client:'ANGEL FERNANDO GUTIERREZ MUNOZ',numbers:['VA125-00010777'],start:'2026-09-08',end:'2027-09-07',note:'PDF insured full surname Gutierrez Munoz, insurer Rural'}
}));
const stripZero=x=>/^\d+$/.test(x)?x.replace(/^0+(?=\d)/,''):x;
const sourceCover=x=>{
  const n=nameNorm(x);
  if(n.includes('MOTOCICLETA'))return 'MOTOCICLETA';
  if(n.includes('TRANSPORTE'))return 'TRANSPORTE';
  if(n.includes('VEHICUL')||n.includes('AUTOMOVIL'))return 'VEHICULOS';
  if(n.includes('PASAJEROS'))return 'PASAJEROS';
  return '';
};
const results=[];
for(const d of exceptions){
  const auth=authenticDrivePdf.get(d.driveFileId)||{};
  const ids=unique([...sourceNumbers(d),...(auth.numbers||[]).map(norm)]);
  const dn=nameNorm(auth.client||d.clientFolder),hint=nameNorm(auth.insurer||insurerFromFilename(d.documentName));
  const term=auth.start?{start:auth.start,end:auth.end}:documentDates(d);
  const matchNumber=(p)=>ids.some(n=>p.numberVariants.some(v=>v===n||(/^\d+$/.test(n)&&/^\d+$/.test(v)&&stripZero(n)===stripZero(v))));
  const exactLiteral=(p)=>ids.some(n=>p.numberVariants.includes(n));
  const gtNumber=all.filter(p=>isCountryGT(p.country)&&matchNumber(p));
  const allCountries=all.filter(matchNumber);
  const gtClient=all.filter(p=>isCountryGT(p.country)&&p.client.some(c=>containsName(c,dn)));
  const eligible=unique([...gtNumber,...gtClient.filter(p=>hint&&p.insurer.some(v=>containsName(v,hint)))]);
  const brief=p=>{
    const ev={
      number:matchNumber(p),literalNumber:exactLiteral(p),
      normalizedLeadingZeroAlias:matchNumber(p)&&!exactLiteral(p),
      client:!!p.client.find(c=>containsName(c,dn)),
      insurer:hint?!!p.insurer.find(i=>containsName(i,hint)):null,
      term:term.start&&term.end&&p.dates.start&&p.dates.end?(term.start===p.dates.start&&term.end===p.dates.end):null
    };
    return {policyId:p.policyId,tenantId:p.tenantId,country:p.country,
      number:p.numberVariants.slice(0,3),client:p.client.slice(0,3),insurer:p.insurer.slice(0,3),
      dates:p.dates,product:p.product.slice(0,3),evidence:ev};
  };
  const selected=unique(eligible.map(p=>p.tenantId+'/'+p.policyId))
    .map(key=>all.find(p=>p.tenantId+'/'+p.policyId===key)).slice(0,10).map(brief);
  const strict=selected.filter(p=>p.evidence.number&&p.evidence.client&&p.evidence.insurer===true&&p.evidence.term===true);
  const historical=/ANEXO|ENDOSO/i.test(d.documentName)&&/2025/.test(d.documentName);
  const renewal=/RENOVACI[OÓ]N|CAR[AÁ]TULA\s+DE\s+RENOVACI/i.test(d.documentName);
  let status='HOLD_IDENTITY_OR_TERM_UNRESOLVED';
  if(strict.length===1)status=strict[0].evidence.normalizedLeadingZeroAlias?'ALREADY_LIVE_ZERO_PREFIX_DATA_QUALITY':'ALREADY_LIVE_FULL_IDENTITY';
  else if(strict.length>1)status='HOLD_MULTIPLE_LIVE_SAME_NUMBER_CLIENT_INSURER_TERM';
  else if(historical&&gtNumber.length>=1)status='DOCUMENTARY_HISTORICAL_ENDORSEMENT_LIVE';
  else if(gtNumber.length===0&&renewal)status='HOLD_RENEWAL_NOT_FOUND_NO_NEW_POLICY_AUTO_CREATE';
  else if(gtNumber.length===0&&selected.some(p=>p.evidence.client&&p.evidence.insurer===true&&p.evidence.term===true))status='HOLD_EXISTING_CLIENT_INSURER_TERM_DIFFERENT_POLICY_NUMBER';
  else if(gtNumber.length===0&&ids.length>=1)status='MISSING_NEW_POLICY_NUMBER_LIVE_CONFIRM_DOSSIER';
  if(allCountries.some(p=>p.country==='CO'||p.country==='COLOMBIA'))status='HOLD_CROSS_COUNTRY_POLICY_NUMBER_COLLISION';
  if(allCountries.some(p=>!p.country))status='HOLD_LIVE_POLICY_COUNTRY_UNDECLARED';
  results.push({driveFileId:d.driveFileId,clientFolder:d.clientFolder,sourceClientVerified:dn,
    documentName:d.documentName,sourceNumberCandidates:ids,sourceInsurer:hint||null,
    sourceDates:term,sourceCoverage:sourceCover(d.documentName),sourceClass:d.documentClass,
    documentedDriveOverride:auth.note||null,
    gtPolicyNumberMatches:gtNumber.length,gtClientPolicyCount:gtClient.length,
    liveAllCountryMatches:allCountries.length,status,liveCandidates:selected});
}
  const byStatus=Object.fromEntries([...new Set(results.map(x=>x.status))].sort().map(k=>[k,results.filter(x=>x.status===k).length]));
  const output={schema:'I66_DRIVE_15_LIVE_POLICY_READONLY_QA_V2',sourceAuditId:audit.id,
    sourceLedgerSha256:sha(fs.readFileSync('artifacts/orbit360-recovery/release-control/I6_6_COBROS_CONCILIACION_SOURCE_INTAKE_20261110.json')),
    projectId:'ays-orbit-360-lab',tenantCount:tenants.length,livePolicyCount:policyRead,liveClientsRead:clientsRead,liveInsurersRead:insurersRead,
    driveFiles:15,summary:byStatus,results,writeOperations:0,status:'READ_ONLY_CLASSIFICATION_FOR_REVIEW'};
  fs.writeFileSync(process.env.GI_I66_REPORT_PATH,JSON.stringify(output,null,2)+'\n',{mode:0o600});
  console.log('I66_DRIVE_15_LIVE_POLICY_READONLY_PASS '+JSON.stringify({tenants:tenants.length,policies:policyRead,clients:clientsRead,insurers:insurersRead,status:byStatus,writeOperations:0}));
  for(const d of results)console.log('I66_DRIVE_15_CASE '+JSON.stringify({client:d.clientFolder,number:d.sourceNumberCandidates,insurer:d.sourceInsurer,status:d.status,livePolicyNumberMatches:d.gtPolicyNumberMatches,topMatched:d.liveCandidates.filter(p=>p.evidence.number).map(p=>({policyId:p.policyId,tenantId:p.tenantId,country:p.country,evidence:p.evidence}))}));
})().catch(e=>{console.error('I66_DRIVE_15_READONLY_HOLD:'+String(e.message||e));process.exitCode=1;});