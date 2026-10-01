import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const engine=require('../functions/payment-inference-engine.js');

const need=(value,code)=>{if(!value)throw new Error(code);};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const mkReceipts=(total)=>Array.from({length:total},(_,i)=>({
  id:'b3005qa_receipt_'+String(i+1).padStart(2,'0'),
  polizaId:'b3005qa_policy_01',
  secuencia:i+1,
  cuota:String(i+1)+'/'+String(total),
  vence:'2026-'+String((i%9)+1).padStart(2,'0')+'-15',
  fechaLimite:'2026-'+String((i%9)+1).padStart(2,'0')+'-15',
  monto:100,
  moneda:'GTQ',
  estado:'Pendiente'
}));
const plans=[
 {insurer:'ASEGURADORA LA CEIBA',aliases:['LA CEIBA'],maxInstallments:10,scope:'fraccionado'},
 {insurer:'ASEGURADORA GENERAL',aliases:['GENERAL'],maxInstallments:10,scope:'fraccionado'},
 {insurer:'G&T SEGUROS',aliases:['G&T','GT SEGUROS'],maxInstallments:10,scope:'fraccionado'},
 {insurer:'ASEGURADORA GUATEMALTECA',aliases:['ASEGUATE','ASEGURADORA GUATEMALTECA'],maxInstallments:10,scope:'fraccionado'}
];
const cfg={autoCommitHighConfidence:true,humanConfirmationRequired:false,humanConfirmationRequiredForHighConfidence:false,requireSameCurrency:true,insurerPaymentPlans:plans};
const policy={id:'b3005qa_policy_01',aseguradoraNombre:'Aseguradora Guatemalteca',moneda:'GTQ',pais:'GT'};
const rows=mkReceipts(10);

const invoice=engine.planEvidence({policy,receipts:rows,evidence:{evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'qa_invoice_5',receiptId:'b3005qa_receipt_05',totalInstallments:10,currency:'GTQ',applicationDate:'2026-05-16'},reconciliationConfig:cfg});
need(invoice.status==='AUTO_COMMIT'&&invoice.autoCommit===true,'B3_005_INVOICE_NOT_AUTO_COMMIT');
need(invoice.targets.filter(x=>x.mode==='INFERRED').length===4,'B3_005_INVOICE_PRIOR_COUNT');
need(invoice.targets.some(x=>x.mode==='DIRECT'&&x.installment===5),'B3_005_INVOICE_DIRECT_ANCHOR');
need(invoice.targets.filter(x=>x.mode==='INFERRED').every(x=>x.paidDate===''&&/^2026-/.test(x.inferredEffectiveDate)),'B3_005_INFERRED_TEMPORAL_SEMANTICS');

const statement=engine.planEvidence({policy,receipts:rows,evidence:{evidenceType:'INSURER_STATEMENT_PENDING_FROM_N',evidenceId:'qa_statement_pending_3',receiptId:'b3005qa_receipt_03',totalInstallments:10,evidenceAsOfDate:'2026-03-31'},reconciliationConfig:cfg});
need(statement.status==='AUTO_COMMIT','B3_005_STATEMENT_NOT_AUTO_COMMIT');
need(statement.targets.length===2&&statement.targets.every(x=>x.mode==='INFERRED'),'B3_005_STATEMENT_PRIOR_SEQUENCE');

const commission=engine.planEvidence({policy,receipts:rows,evidence:{evidenceType:'COMMISSION_STATEMENT_INSTALLMENT_N',evidenceId:'qa_commission_4',receiptId:'b3005qa_receipt_04',totalInstallments:10,evidenceAsOfDate:'2026-04-30'},reconciliationConfig:cfg});
need(commission.status==='AUTO_COMMIT'&&commission.targets.filter(x=>x.mode==='INFERRED').length===3&&commission.targets.some(x=>x.mode==='DIRECT'&&x.installment===4),'B3_005_COMMISSION_SEQUENCE');

const bad12=engine.planEvidence({policy,receipts:mkReceipts(12),evidence:{evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'qa_invoice_12',receiptId:'b3005qa_receipt_12',totalInstallments:12,currency:'GTQ'},reconciliationConfig:cfg});
need(bad12.status==='REVIEW_REQUIRED'&&bad12.reason==='INSTALLMENT_TOTAL_EXCEEDS_TENANT_CONFIG'&&bad12.maxInstallments===10,'B3_005_ASEGUATE_MAX10_NOT_ENFORCED');

const mismatch=engine.planEvidence({policy,receipts:rows.slice(0,9),evidence:{evidenceType:'INVOICE_INSTALLMENT_N',evidenceId:'qa_mismatch',receiptId:'b3005qa_receipt_05',totalInstallments:10,currency:'GTQ'},reconciliationConfig:cfg});
need(mismatch.status==='REVIEW_REQUIRED'&&mismatch.reason==='EXPECTED_RECEIPT_COUNT_MISMATCH'&&mismatch.scheduleCorrectionRequired===true,'B3_005_DENOMINATOR_MISMATCH_NOT_FAIL_CLOSED');

const ambiguous=engine.planEvidence({policy,receipts:rows,evidence:{evidenceType:'BANK_STATEMENT_MATCH',evidenceId:'qa_bank',receiptId:'b3005qa_receipt_02',totalInstallments:10,currency:'GTQ',uniqueMatch:false},reconciliationConfig:cfg});
need(ambiguous.status==='REVIEW_REQUIRED'&&ambiguous.autoCommit===false,'B3_005_AMBIGUOUS_NOT_FAIL_CLOSED');

const server=read('functions/cobros-reconciliation-domain.js');
const tenant=read('functions/tenant-domain-config.js');
const client=read('orbit360-platform/core/cobros-reconciliation-domain-client.js');
const lock=JSON.parse(read('artifacts/orbit360-recovery/release-control/I6_5_I6_6_PAYMENT_INFERENCE_RECONCILIATION_LOCK_V5_20261001.json'));
need(server.includes("reconcile_evidence")&&server.includes("planEvidence")&&server.includes("AUTO_COMMITTED_HIGH_CONFIDENCE"),'B3_005_SERVER_OWNER_MISSING');
need(server.includes("inferenceProvenance")&&server.includes("APPLIED_INFERRED")&&server.includes("deterministicCobroId"),'B3_005_INFERENCE_PROVENANCE_IDEMPOTENCY_MISSING');
need(server.includes("readReconciliationConfig")&&server.includes("previewUatConfig"),'B3_005_TENANT_CONFIG_READ_MISSING');
need(tenant.includes("autoCommitHighConfidence")&&tenant.includes("humanConfirmationRequiredForHighConfidence: false")&&tenant.includes("insurerPaymentPlans"),'B3_005_CONFIG_CONTRACT_MISSING');
need(client.includes("function reconcileEvidence")&&client.includes("command('reconcile_evidence'"),'B3_005_CLIENT_COMMAND_MISSING');
const names=(lock.insurerPaymentPlanConfig.currentApprovedValidationCeilings||[]).map(x=>String(x.insurer||'').toUpperCase());
for(const name of ['ASEGURADORA LA CEIBA','ASEGURADORA GENERAL','G&T SEGUROS','ASEGURADORA GUATEMALTECA'])need(names.includes(name),'B3_005_LOCK_MAX10_MISSING_'+name);
need((lock.insurerPaymentPlanConfig.currentApprovedValidationCeilings||[]).filter(x=>names.includes(String(x.insurer||'').toUpperCase())).every(x=>Number(x.maxInstallments)===10),'B3_005_LOCK_MAX10_VALUE');
need(!/Carlos Castro|Samuel Daza|Fernando Arias|Paula Osorio/.test(server),'B3_005_HARDCODED_IDENTITY_FORBIDDEN');

console.log('B3_005_SOURCE_CONTRACT=PASS');
console.log('B3_005_INVOICE_SEQUENCE=PASS');
console.log('B3_005_INSURER_STATEMENT_SEQUENCE=PASS');
console.log('B3_005_COMMISSION_SEQUENCE=PASS');
console.log('B3_005_ASEGUATE_MAX10=PASS');
console.log('B3_005_AMBIGUOUS_FAIL_CLOSED=PASS');
