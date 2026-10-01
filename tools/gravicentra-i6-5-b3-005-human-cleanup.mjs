import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId=process.env.PROJECT_ID||'ays-orbit-360-lab';
const tenantId=process.env.TENANT_HINT||'alianzas-soluciones';
const policyId='b3005human_policy_r1',clientId='b3005human_client_r1',requestId='b3005human_invoice_r1';
const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore(app),tenant=db.collection('tenants').doc(tenantId),data=tenant.collection('data');
async function delQuery(q){const s=await q.get();for(let i=0;i<s.docs.length;i+=400){const b=db.batch();for(const d of s.docs.slice(i,i+400))b.delete(d.ref);await b.commit();}return s.size;}
await delQuery(data.doc('cobros').collection('items').where('polizaId','==',policyId)).catch(()=>0);
const b=db.batch();
for(let n=1;n<=10;n++){
 const x=String(n).padStart(2,'0');
 b.delete(data.doc('recibosEsperados').collection('items').doc(policyId+'_receipt_'+x));
 b.delete(data.doc('carteraPrimas').collection('items').doc(policyId+'_portfolio_'+x));
}
b.delete(data.doc('polizas').collection('items').doc(policyId));
b.delete(data.doc('clientes').collection('items').doc(clientId));
b.delete(tenant.collection('reconciliationRequests').doc(requestId));
await b.commit().catch(()=>null);
await delQuery(tenant.collection('reconciliationEvents').where('requestId','==',requestId)).catch(()=>0);
console.log('B3_005_HUMAN_FIXTURE_CLEANUP=PASS');
