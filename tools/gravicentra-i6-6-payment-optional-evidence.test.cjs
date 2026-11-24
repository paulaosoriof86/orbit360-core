'use strict';
// Existing Cobros owner exercised with a synthetic DOM/provider. No network or real writes.
// Files remain optional; a selected file must be confirmed before the payment call.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=process.env.PAYMENT_ATTACHMENT_SOURCE_ROOT||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'orbit360-platform/modules/cobros.js'),'utf8');
const extract=(begin,end)=>{
  const a=source.indexOf(begin),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Canonical source block missing: '+begin);
  return source.slice(a,b);
};
const uploadCode=extract('  async function uploadPaymentDocument(','\n  /* ---- Detalle del recibo');
const modalCode=extract('  function paymentFailureFeedback(','\n  function kpi(kind)');
const file=(name='fixture-support.pdf')=>({name,size:23,type:'application/pdf',lastModified:1});
const confirmed=ref=>({ok:true,documentRef:ref,provisional:true,canonicalReadback:true});
const failure=status=>({ok:false,status});
const error=code=>Object.assign(new Error('fixture_rejected'),{code});
function launch(options={}){
  const calls={uploads:[],payments:[],notices:[],toasts:[],logs:[]},nodes=new Map(),inputs=[];
  class Element{
    constructor(tag){this.tagName=tag;this.style={};this.attrs={};this.disabled=false;this.value='';this.textContent='';this.hidden=false;this.checked=false;this.listeners={};this.children=new Map();}
    set innerHTML(html){this.html=html;
      for(const m of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
        const n=new Element(m[1]);n.id=m[3];n.value=(m[2].match(/\bvalue="([^"]*)"/)||[])[1]||'';
        n.checked=/\bchecked\b/.test(m[2]);this.children.set('#'+n.id,n);
      }
      if(this.children.has('#pm-source'))this.children.get('#pm-source').value='manual';
    }
    get innerHTML(){return this.html||'';}
    querySelector(id){assert.ok(this.children.has(id),'Unexpected DOM selector '+id);return this.children.get(id);}
    setAttribute(k,v){this.attrs[k]=v;}
    getAttribute(k){return this.attrs[k]||null;}
    removeAttribute(k){delete this.attrs[k];}
    addEventListener(k,fn){this.listeners[k]=fn;}
    remove(){this.removed=true;nodes.delete(this.id);}
    click(){if(this.disabled)return;if(this.tagName==='input'){inputs.push(this);return;}return this.onclick&&this.onclick();}
  }
  const document={createElement:tag=>new Element(tag),getElementById:id=>nodes.get(id),body:{appendChild:n=>nodes.set(n.id,n)}};
  const receipt={id:'fixture_receipt',polizaId:'fixture_policy',primaTotal:100,monto:100,montoTotal:100,estado:'Pendiente'};
  const cobro={id:'fixture_cobro',clienteId:'fixture_client',polizaId:receipt.polizaId,monto:100,moneda:'GTQ',cuota:1};
  const Orbit={productDriveDocumentProviderP0:{async upload(f,extra){calls.uploads.push({file:f,extra});return options.upload?options.upload(f,extra,calls.uploads.length):confirmed('fixture_document_'+extra.documentType);}},
    reconciliationDomain:{async applyPayment(id,command){calls.payments.push({id,command});return options.apply?options.apply(id,command,calls.payments.length):{ok:true,serverOwned:true,portfolioUpdated:true,receiptId:id,policyId:receipt.polizaId,cobroId:cobro.id,paymentState:'PAID_DIRECT',applicationState:command.payload.sourceType==='manual'?'PENDING_APPLICATION':'APPLIED_DIRECT',paidDate:command.payload.paidDate,invoiceNumber:command.payload.invoiceNumber||'',requestId:command.requestId,documentLifecycleOk:true};}},
    notify:{pedir(...args){calls.notices.push(args);}}};
  if(options.noProvider)delete Orbit.productDriveDocumentProviderP0;
  if(options.noDomain)delete Orbit.reconciliationDomain;
  const U={money:n=>'Q'+n.toFixed(2),esc:v=>String(v==null?'':v),toast:m=>calls.toasts.push(m)};
  const sandbox={window:{crypto:webcrypto,OrbitBackend:{tenantId:'fixture_tenant'}},OrbitBackend:{tenantId:'fixture_tenant'},Orbit,U,document,TextEncoder,URL,
    console:{error(...args){calls.logs.push(args);},warn(...args){calls.logs.push(args);}},
    directPaymentRole:()=>true,paymentContext:()=>({cobro,receipt}),previewGuard:()=>true,isPreviewHost:()=>true,baseCache:{},
    S:()=>({get:collection=>collection==='polizas'?{numero:'FIXTURE-1'}:{id:'fixture_client',nombre:'Synthetic'}})};
  vm.runInNewContext(uploadCode+'\n'+modalCode,sandbox,{filename:'canonical-cobros-attachment-modal.js'});
  sandbox.aplicarPago(cobro.id);const pm=nodes.get('cob-pay'),el=id=>pm.querySelector('#pm-'+id);
  return {calls,pm,el,Orbit,receipt,cobro,
    async choose(kind,f){await el(kind+'-btn').click();const input=inputs.at(-1);assert.ok(input,'file input missing');input.files=[f];input.onchange();},
    submit:()=>el('ok').click(),reopen:()=>sandbox.aplicarPago(cobro.id),
    documentary(){el('source').value='insurer_statement';el('source').onchange();el('source-ref').value='drive:synthetic_original_123456789';el('source-asof').value='2026-07-20';el('paid').value='2026-07-18';el('source-reviewed').checked=true;}
  };
}

test('No-file manual payment remains available without any Drive call',async()=>{
  const x=launch({noProvider:true});await x.submit();assert.equal(x.calls.uploads.length,0);assert.equal(x.calls.payments.length,1);assert.equal(x.pm.removed,true);
  const p=x.calls.payments[0].command.payload;assert.equal(p.paymentSupportDocumentRef,'');assert.equal(p.invoiceDocumentRef,'');assert.equal(p.sourceType,'manual');
});
test('Selected file setup failure blocks financial command and preserves selection',async()=>{
  const x=launch({upload:()=>failure('tenant_setup_required')}),f=file();await x.choose('support',f);await x.submit();
  assert.equal(x.calls.payments.length,0);assert.notEqual(x.pm.removed,true);assert.equal(x.el('support-name').textContent,f.name);assert.equal(x.el('ok').disabled,false);
  assert.match(x.el('save-state').textContent,/No se registró el pago.*Configurar Drive.*sigue seleccionado/);assert.equal(x.pm.getAttribute('aria-busy'),null);assert.equal(x.calls.notices.length,0);
});
test('Retry uses the same selected File and includes its confirmed reference',async()=>{
  const x=launch({upload:(_f,_e,n)=>n===1?failure('tenant_connection_invalid'):confirmed('fixture_support_confirmed')}),f=file();await x.choose('support',f);await x.submit();await x.submit();
  assert.equal(x.calls.uploads.length,2);assert.equal(x.calls.uploads[0].file,f);assert.equal(x.calls.uploads[1].file,f);assert.equal(x.calls.payments.length,1);
  assert.equal(x.calls.payments[0].command.payload.paymentSupportDocumentRef,'fixture_support_confirmed');assert.equal(x.pm.removed,true);
});
test('Partial upload retains one confirmed reference and only retries the other document',async()=>{
  let invoiceCount=0;const x=launch({upload:(_f,e)=>e.documentType==='payment_support'?confirmed('fixture_support_saved'):++invoiceCount===1?failure('sin_permiso'):confirmed('fixture_invoice_saved')});
  await x.choose('support',file());await x.choose('invoice',file('fixture-invoice.pdf'));await x.submit();
  assert.equal(x.calls.payments.length,0);assert.equal(x.el('support-btn').disabled,true);assert.equal(x.el('invoice-btn').disabled,false);assert.equal(x.el('source').disabled,true);
  assert.match(x.el('save-state').textContent,/en preparación y no se subirán otra vez/);await x.submit();
  assert.deepEqual(x.calls.uploads.map(r=>r.extra.documentType),['payment_support','insurer_invoice','insurer_invoice']);
  const p=x.calls.payments[0].command.payload;assert.equal(p.paymentSupportDocumentRef,'fixture_support_saved');assert.equal(p.invoiceDocumentRef,'fixture_invoice_saved');assert.equal(x.calls.notices.length,1);
});
test('Two rejected attachments remain visible and no payment is sent',async()=>{
  const x=launch({upload:()=>failure('sin_permiso')});await x.choose('support',file());await x.choose('invoice',file('fixture-invoice.pdf'));await x.submit();
  assert.equal(x.calls.payments.length,0);assert.match(x.el('save-state').textContent,/comprobante del cliente/);assert.match(x.el('save-state').textContent,/factura de la aseguradora/);
});
for(const [status,expected] of [['archivo_demasiado_grande',/15 MB/],['lectura_fallida',/leer el archivo/],['tenant_connection_invalid',/conexión administrativa/],['sin_referencia',/carpeta de destino/]]){
  test('Provider feedback remains actionable: '+status,async()=>{const x=launch({upload:()=>failure(status)});await x.choose('support',file());await x.submit();assert.equal(x.calls.payments.length,0);assert.match(x.el('save-state').textContent,expected);});
}
test('Provider exception is bounded without leaking its raw detail',async()=>{
  const x=launch({upload:()=>{throw Error('DO_NOT_DISPLAY_fixture_token');}});await x.choose('support',file());await x.submit();assert.equal(x.calls.payments.length,0);
  assert.match(x.el('save-state').textContent,/Drive no confirmó/);assert.doesNotMatch(x.el('save-state').textContent,/DO_NOT_DISPLAY/);
});
test('A reference on a failed response is not promoted to a saved attachment',async()=>{
  const x=launch({upload:()=>({ok:false,documentRef:'fixture_unconfirmed',status:'sin_readback'})});await x.choose('support',file());await x.submit();assert.equal(x.calls.payments.length,0);assert.match(x.el('save-state').textContent,/Verifica el expediente/);
});
test('ok without a canonical reference still blocks payment',async()=>{
  const x=launch({upload:()=>({ok:true})});await x.choose('support',file());await x.submit();assert.equal(x.calls.payments.length,0);assert.equal(x.el('ok').disabled,false);
});
test('Double click and close during upload cannot lose the in-flight file or send two payments',async()=>{
  let finish;const x=launch({upload:()=>new Promise(resolve=>{finish=resolve;})});await x.choose('support',file());const pending=x.submit();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(x.el('support-btn').disabled,true);assert.equal(x.el('invoice-btn').disabled,true);assert.equal(x.el('source').disabled,true);
  await x.el('cancel').click();assert.notEqual(x.pm.removed,true);x.reopen();assert.notEqual(x.pm.removed,true);await x.submit();assert.equal(x.calls.uploads.length,1);assert.equal(x.calls.payments.length,0);
  finish(confirmed('fixture_saved_once'));await pending;assert.equal(x.calls.payments.length,1);assert.equal(x.pm.removed,true);
});
test('Payment uses the validated field snapshot across an asynchronous upload',async()=>{
  let finish;const x=launch({upload:()=>new Promise(resolve=>{finish=resolve;})});x.el('paid').value='2026-07-18';x.el('invoice-number').value='SYNTHETIC-1';await x.choose('support',file());
  const pending=x.submit();await new Promise(resolve=>setImmediate(resolve));x.el('paid').value='2026-07-19';x.el('invoice-number').value='SYNTHETIC-2';finish(confirmed('fixture_saved'));await pending;
  assert.equal(x.calls.payments[0].command.payload.paidDate,'2026-07-18');assert.equal(x.calls.payments[0].command.payload.invoiceNumber,'SYNTHETIC-1');
});
test('Confirmed quarantine invalidates only the cached reference while preserving the original File',async()=>{
  const f=file(),x=launch({upload:(_f,_e,n)=>confirmed('fixture_stage_'+n),apply:(_id,_command,n)=>{
    if(n===1)throw Object.assign(error('failed-precondition'),{gravicentraPayment:{documentLifecycle:{action:'quarantine',ok:true,refs:['fixture_stage_1'],results:[{ok:true}]}}});
    return{ok:true,portfolioUpdated:true,applicationState:'PENDING_APPLICATION',documentLifecycleOk:true};
  }});await x.choose('support',f);await x.submit();assert.equal(x.el('ok').disabled,false);await x.submit();
  assert.equal(x.calls.uploads.length,2);assert.equal(x.calls.uploads[1].file,f);assert.equal(x.calls.payments[1].command.payload.paymentSupportDocumentRef,'fixture_stage_2');
});
test('An uncertain financial result with an attachment requires readback before another payment',async()=>{
  const x=launch({apply:()=>{throw error('unavailable');}});await x.choose('support',file());await x.submit();assert.equal(x.el('ok').disabled,true);await x.submit();assert.equal(x.calls.payments.length,1);assert.match(x.el('save-state').textContent,/Resultado no confirmado/);
});
test('Failed document quarantine cannot silently reuse that staged reference',async()=>{
  const x=launch({apply:()=>{throw Object.assign(error('failed-precondition'),{gravicentraPayment:{documentLifecycle:{action:'quarantine',ok:false,refs:['fixture_document_payment_support'],results:[{ok:false}]}}});}});
  await x.choose('support',file());await x.submit();assert.equal(x.el('ok').disabled,true);assert.equal(x.calls.payments.length,1);assert.notEqual(x.pm.removed,true);assert.match(x.el('save-state').textContent,/recuperación documental/);
});
test('Recorded payment with unconfirmed document finalization stays visible and cannot be paid twice',async()=>{
  const x=launch({apply:()=>({ok:true,portfolioUpdated:true,applicationState:'PENDING_APPLICATION',documentLifecycleOk:false})});await x.choose('support',file());await x.submit();
  assert.notEqual(x.pm.removed,true);assert.equal(x.el('ok').disabled,true);assert.equal(x.el('ok').textContent,'Pago registrado');assert.match(x.el('save-state').textContent,/pago sí quedó registrado.*No registres el pago de nuevo/);
  await x.submit();assert.equal(x.calls.payments.length,1);assert.equal(x.el('support-name').textContent,'fixture-support.pdf');
});
test('Documentary requirements still run before uploads and the financial call',async()=>{
  const x=launch();x.documentary();x.el('source-reviewed').checked=false;await x.choose('invoice',file('fixture-invoice.pdf'));await x.submit();
  assert.equal(x.calls.uploads.length,0);assert.equal(x.calls.payments.length,0);assert.equal(x.el('ok').disabled,false);assert.match(x.el('save-state').textContent,/Confirma/);
});
test('Documentary invoice failure also preserves source, date, review and selected file',async()=>{
  const x=launch({upload:()=>failure('tenant_setup_required')});x.documentary();await x.choose('invoice',file('fixture-invoice.pdf'));await x.submit();
  assert.equal(x.calls.payments.length,0);assert.equal(x.el('source').value,'insurer_statement');assert.equal(x.el('source-reviewed').checked,true);assert.equal(x.el('paid').value,'2026-07-18');assert.equal(x.el('invoice-name').textContent,'fixture-invoice.pdf');assert.equal(x.calls.notices.length,0);
});
test('Successful documentary invoice remains canonical and does not notify a real client',async()=>{
  const x=launch();x.documentary();await x.choose('invoice',file('fixture-invoice.pdf'));await x.submit();
  assert.equal(x.calls.payments.length,1);assert.equal(x.calls.payments[0].command.payload.sourceType,'insurer_statement');assert.equal(x.calls.payments[0].command.payload.invoiceDocumentRef,'fixture_document_insurer_invoice');assert.equal(x.calls.notices.length,0);assert.equal(x.pm.removed,true);
});
