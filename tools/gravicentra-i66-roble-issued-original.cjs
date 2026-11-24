'use strict';
// Exact original-document adapter for the remaining cases in the existing
// five-policy source. It grants no writes and persists no private PDF fields.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const five=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_49_REQUIREMENTS_20261122.json');
const witnesses=require('../artifacts/orbit360-recovery/source-batches/I6_6_ROBLE_FIVE_ISSUED_IDENTITY_WITNESSES_20261122.json').witnesses;
const pins=Object.freeze({
  '91-8323091':'e75ed257defa5ee055168fc196f8ae7b92d3888c5013f3463e239253b7af6319',
  '91-8342189':'1814d67bd274ccecbb523666fc9cd52fd8928cd41b8cbec4a725804c0e41a9ad',
  '91-4140843':'a8b0b7cf358630ebcdf934a9dcfdcb5939b2192d55acf50cb8cea2f5a1c2fe44'
});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g,'');
const iso=x=>{const m=/^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(x);assert.ok(m,'ISSUER_DATE_INVALID');return [m[3],m[2],m[1]].join('-');};
const money=x=>{assert.match(x,/^(?:\d{1,3}(?:,\d{3})*|\d*)\.\d{2}$/);return Math.round(Number(x.replaceAll(',',''))*100);};
const match=(w,x,k)=>!!x&&sha(w.sourcePdfRawSha256+'|'+norm(x))===w[k];
function remainingCases(){
  const bytes=fs.readFileSync(path.join(__dirname,'../artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json'));
  assert.equal(sha(bytes),'35b548913253c836e63db6cb3cac79bda541a6ceda776494969d23393504e225','ISSUER_STATEMENT_MANIFEST_DRIFT');
  const statement=JSON.parse(bytes);
  const cases=five.cases.filter(c=>Object.hasOwn(pins,c.policy)).map(c=>({
    ...c,endorsement:c.issuerEndorsement,issuedScheduleGrossCents:c.matchedSourcePendingCents,
    coverScheduleDeltaCents:c.issuedGrossCents-c.matchedSourcePendingCents,
    riskFromIssuedOriginal:true,allowAbsentPredecessor:c.policy==='91-4140843'
  }));
  assert.equal(cases.length,3);assert.equal(cases.reduce((n,c)=>n+c.schedule.length,0),25);
  for(const c of cases){
    assert.equal(c.sourcePdfRawSha256,pins[c.policy]);
    assert.equal(c.insurer,'ROBLE');assert.equal(c.country,'GT');assert.equal(c.currency,'GTQ');
    assert.equal(c.schedule.length,c.pdfInstallments);
    assert.equal(c.schedule.reduce((n,r)=>n+r.grossCents,0),c.issuedScheduleGrossCents);
    for(const r of c.schedule){
      const rows=statement.rows.filter(x=>x.caseId===r.sourceCaseId);assert.equal(rows.length,1);
      assert.deepEqual([rows[0].policy,rows[0].requirement,rows[0].due,rows[0].grossCents,rows[0].state],
        [c.policy,r.requirement,r.due,r.grossCents,'PENDING']);
    }
  }
  return cases;
}
function parseText(c,text,identityMatch=match){
  assert.equal(c.sourcePdfRawSha256,pins[c.policy],'ISSUED_ORIGINAL_SCOPE_DRIFT');
  const w=witnesses.find(x=>x.policy===c.policy);assert.ok(w);
  const take=(re,input=text,group=1)=>{const m=input.match(re);assert.ok(m,'ISSUED_ORIGINAL_REQUIRED_FIELD');return m[group].trim();};
  const pages=text.replace(/[\u2010-\u2015]/g,'-').split('\f');
  const cover=pages.find(p=>/E\s+N\s+D\s+O\s+S\s+O\s+D\s+E\s+R\s+E\s+N\s+O\s+V\s+A\s+C\s+I\s+O\s+N/.test(p));
  assert.ok(cover,'ISSUED_RENEWAL_COVER_REQUIRED');
  const certificates=pages.filter(p=>/EMITIDA A FAVOR DE:/.test(p)&&/INCISO\s+\d+\s+ENDOSO No\./.test(p));
  assert.equal(certificates.length,1,'ISSUED_SINGLE_CERTIFICATE_REQUIRED');const certificate=certificates[0];
  assert.equal([...certificate.matchAll(/INCISO\s+(\d+)\s+ENDOSO No\./g)].length,1,'ISSUED_MULTIPLE_RISKS_HOLD');
  const contractHolder=take(/emitida a nombre de:\s*\n([^\n]+)/i,cover);
  const certificateHolder=take(/EMITIDA A FAVOR DE:\s*([^\n]+)/i,certificate);
  assert.ok(identityMatch(w,contractHolder,'holderWitness')&&identityMatch(w,certificateHolder,'holderWitness'),
    'ISSUED_CONTRACT_HOLDER_CONFLICT');
  // PROPIETARIO and the assistance card's Asegurado may name the vehicle owner.
  // The contractual named insured is verified above, independently of that role.
  assert.equal(norm(take(/p[oó]liza\s+No\.\s*([\d-]+)/i,cover)),norm(c.policy),'ISSUED_POLICY_NUMBER_CONFLICT');
  assert.equal(take(/INCISO\s+\d+\s+ENDOSO No\.\s*(\d+)/,certificate),c.endorsement);
  assert.equal(take(/POLIZA\s+([\d-]+)\s+DE SEGUROS EL ROBLE/i,certificate),c.policy);
  const plate=take(/PLACAS:\s*(\S+)/,certificate),vin=take(/CHASSIS\.+\s*(\S+)/,certificate);
  assert.ok(identityMatch(w,plate,'initialCertificatePlateWitness')&&identityMatch(w,vin,'initialCertificateVinWitness'),
    'ISSUED_RISK_FIELDS_CONFLICT');
  assert.ok(identityMatch(w,take(/Placa\s*:\s*(\S+)/i,pages[0]),'initialCertificatePlateWitness')&&
    identityMatch(w,take(/Chasis\s*:\s*(\S+)/i,pages[0]),'initialCertificateVinWitness'),'ISSUED_CARD_RISK_CONFLICT');
  const period=certificate.match(/Vigencia de este inciso:\s*del\s*(\d{2}-\d{2}-\d{4})\s*al\s*(\d{2}-\d{2}-\d{4})/i);
  assert.ok(period);assert.equal(iso(period[1]),c.termStart);assert.equal(iso(period[2]),c.termEnd);
  const label=take(/MARCA\.+\s*([^\n]+?)(?:\s{2,})/,certificate),parts=label.split(/\s+/);
  const risk={placa:plate,vin,chasis:vin,marca:parts.shift(),linea:parts.join(' '),
    tipo:take(/TIPO\.+\s*(.+?)\s+CHASSIS/,certificate),anio:Number(take(/MODELO\.+\s*(\d{4})/,certificate)),
    motor:take(/MOTOR\.+\s*(.+?)\s{2,}PRIMA PERIODO/,certificate),
    propietario:take(/PROPIETARIO:\s*([^\n]+)/,certificate),inciso:take(/INCISO\s+(\d+)\s+ENDOSO No\./,certificate),
    sumaAsegurada:money(take(/SUMA ASEGURADA\s*\n\s*:Q\.\s*([\d,.]+)/,certificate))/100};
  assert.ok(risk.sumaAsegurada>0&&/^[A-Z0-9]{17}$/.test(risk.vin),'ISSUED_VEHICLE_INVALID');
  const header={netCents:money(take(/PRIMA\s+QZ\s+([\d,.]+)/,cover)),
    expensesCents:money(take(/GTOS\. EMISION\s+QZ\s+([\d,.]+)/,cover)),
    financeCents:money(take(/RECARGO\s+QZ\s+([\d,.]+)/,cover)),
    assistCents:money(take(/ASISTO\s+QZ\s+([\d,.]+)/,cover)),
    ivaCents:money(take(/IVA\.+\s+QZ\s+([\d,.]+)/,cover)),
    grossCents:money(take(/TOTAL\s+QZ\s+([\d,.]+)/,cover))};
  assert.equal(header.grossCents,c.issuedGrossCents);
  assert.equal(header.netCents+header.expensesCents+header.financeCents+header.assistCents+header.ivaCents,header.grossCents);
  const schedules=pages.filter(p=>/ANEXO DE PAGOS FRACCIONADOS QUETZALES/.test(p));assert.equal(schedules.length,1);
  const schedulePage=schedules[0],term=schedulePage.match(/Operaci[oó]n No\.\s*(\d+)\s+Vigencia:\s*desde\s*(\d{2}\/\d{2}\/\d{4})\s*hasta\s*(\d{2}\/\d{2}\/\d{4})/i);
  assert.ok(term);assert.equal(term[1],c.endorsement);assert.equal(iso(term[2]),c.termStart);assert.equal(iso(term[3]),c.termEnd);
  const rows=[...schedulePage.matchAll(/^(\d{7})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s*$/gm)];
  assert.equal(rows.length,c.schedule.length,'ISSUER_SCHEDULE_COUNT_CONFLICT');
  const schedule=rows.map((m,i)=>({requirement:m[1],sequence:i+1,due:iso(m[2]),netCents:money(m[3]),
    expensesAndOtherCents:money(m[4]),financingCents:money(m[5]),ivaCents:money(m[6]),grossCents:money(m[7])}));
  for(let i=0;i<schedule.length;i++){
    const r=schedule[i],expected=c.schedule[i];
    assert.deepEqual([r.requirement,r.sequence,r.due,r.grossCents],[expected.requirement,expected.sequence,expected.due,expected.grossCents]);
    assert.equal(r.netCents+r.expensesAndOtherCents+r.financingCents+r.ivaCents,r.grossCents);
  }
  assert.equal(schedule.reduce((n,r)=>n+r.grossCents,0),c.issuedScheduleGrossCents);
  const issuedDay=take(/Guatemala,\s*(\d{1,2}\/\d{2}\/\d{4})/,pages[1]).padStart(10,'0');
  return {...c,schedule,issuerHeader:header,issuedInsuredValueCents:Math.round(risk.sumaAsegurada*100),
    issuedDate:iso(issuedDay),originalRisk:risk,originalVerified:true,
    originalProof:{sourcePdfSha256:c.sourcePdfRawSha256,certificateCount:1,inciso:risk.inciso,
      contractHolderVerified:true,contractOwnerDistinct:norm(contractHolder)!==norm(risk.propietario),
      originalOperation:'RENOVACION',sourceScheduleVerified:true}};
}
function parseBytes(c,bytes){
  assert.ok(bytes.length<4000000&&bytes.subarray(0,5).toString()==='%PDF-');
  assert.equal(sha(bytes),pins[c.policy],'ISSUER_ORIGINAL_BYTES_DRIFT');
  const text=execFileSync('pdftotext',['-layout','-','-'],{input:bytes,encoding:'utf8',maxBuffer:3500000});
  return parseText(c,text);
}
async function load(c,headers){
  assert.equal(c.sourcePdfRawSha256,pins[c.policy]);
  const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(c.sourcePdfId)+'?alt=media&supportsAllDrives=true',
    {headers,signal:AbortSignal.timeout(25000)});
  assert.ok(response.ok,'ISSUED_ORIGINAL_PROVIDER_HTTP_'+response.status);
  return parseBytes(c,Buffer.from(await response.arrayBuffer()));
}
module.exports={remainingCases,parseText,parseBytes,load};
