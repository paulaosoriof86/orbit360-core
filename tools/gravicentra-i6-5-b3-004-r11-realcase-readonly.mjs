import fs from 'node:fs';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab',tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const clientId=process.env.B3_004_REAL_CLIENT_ID||'cli_siga_62cd81d1471c2628e3',policyNumber=process.env.B3_004_REAL_POLICY_NUMBER||'A125-00003954';
const outPath=process.env.B3_004_REALCASE_OUT||'/tmp/b3-004-realcase.json';
const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const amount=row=>{for(const k of ['monto','montoTotal','primaTotal','saldo']){const n=Number(row&&row[k]);if(Number.isFinite(n))return n;}return null;};
const activePortfolio=row=>{const s=norm(row&&(row.estadoCartera||row.estado));return row&&row.carteraActiva!==false&&!['anulado','cancelado','cancelada','superseded','reemplazado'].includes(s);};
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId}),db=getFirestore(app),root=db.collection('tenants').doc(tenantId).collection('data');
const client=await root.doc('clientes').collection('items').doc(clientId).get();
const policies=await root.doc('polizas').collection('items').where('clienteId','==',clientId).get(),policyDocs=policies.docs.filter(d=>String((d.data()||{}).numero||'').trim()===policyNumber);
const rows=[];
for(const pd of policyDocs){const policy=Object.assign({id:pd.id},pd.data()||{}),receipts=await root.doc('recibosEsperados').collection('items').where('polizaId','==',pd.id).get();for(const rd of receipts.docs){const receipt=Object.assign({id:rd.id},rd.data()||{});const [portfolio,cobros]=await Promise.all([root.doc('carteraPrimas').collection('items').where('reciboId','==',rd.id).get(),root.doc('cobros').collection('items').where('reciboId','==',rd.id).get()]);const activeRows=portfolio.docs.filter(d=>activePortfolio(d.data()||{})),blockers=[];if(!receipt.polizaId)blockers.push('RECEIPT_POLICY_ID_MISSING');if(!receipt.clienteId&&!policy.clienteId)blockers.push('CLIENT_ID_MISSING');if(!(amount(receipt)>0))blockers.push('RECEIPT_AMOUNT_INVALID');if(activeRows.length>1)blockers.push('MULTIPLE_ACTIVE_PORTFOLIO_ROWS');if(cobros.size>1)blockers.push('MULTIPLE_COBROS_FOR_RECEIPT');rows.push({receiptId:rd.id,estado:receipt.estado||'',estadoOperativo:receipt.estadoOperativo||'',amount:amount(receipt),activePortfolioRows:activeRows.length,cobroRows:cobros.size,blockers});}}
const blockers=rows.flatMap(r=>r.blockers.map(code=>({receiptId:r.receiptId,code})));
const out={schema:'GRAVICENTRA_B3_004_R11_REALCASE_READONLY_V2',status:client.exists&&policyDocs.length>=1&&rows.length>0&&blockers.length===0?'PASS':'REVIEW_REQUIRED',tenantId,clientId,clientExists:client.exists,policyNumber,matchingPolicies:policyDocs.map(d=>d.id),duplicatePolicyNumberWarning:policyDocs.length>1,duplicatePolicyNumberCount:policyDocs.length,receiptCount:rows.length,rows,blockers,writes:0};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));if(out.status!=='PASS')process.exitCode=2;
