import fs from 'node:fs';
import cp from 'node:child_process';

const P={
  control:'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json',
  lock:'artifacts/orbit360-recovery/release-control/I6_5_FORENSIC_B3_EXECUTION_LOCK_20260929.json',
  findings:'artifacts/orbit360-recovery/release-control/I6_FINDINGS_LEDGER_20260924.json',
  composition:'artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  receipt:'artifacts/orbit360-recovery/release-control/I6_5_B3_003_COUNTRY_TRANSITION_DIAGNOSTIC_20260929.json',
  queries:'orbit360-platform/core/queries.js',
  cobros:'orbit360-platform/modules/cobros.js',
  index:'orbit360-platform/index.html',
  diagnostic:'tools/gravicentra-i6-5-b3-003-country-transition-diagnostic.mjs'
};
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const write=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const need=(v,c)=>{if(!v)throw new Error(c);};
const replace=(s,a,b,c)=>{need(s.includes(a),c);return s.replace(a,b);};
const blob=p=>cp.execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim();

const c=json(P.control),b=json(P.lock),f=json(P.findings),m=json(P.composition),r=json(P.receipt);
need(c.nextAction==='I6_5_FORENSIC_REMEDIATION_B3_003_FIX','B3_003_FIX_CONTROL_STATE');
need(c.i65ForensicRemediationPlan?.b3?.status==='B3_003_ROOT_CAUSE_CONFIRMED_FIX_AUTHORIZED','B3_003_FIX_CP_STATUS');
need(b.status==='B3_003_ROOT_CAUSE_CONFIRMED_FIX_AUTHORIZED'&&b.activeFinding?.id==='B3-003','B3_003_FIX_LOCK_STATUS');
need(b.boundaries?.productMutationAuthorized===true,'B3_003_FIX_PRODUCT_NOT_AUTHORIZED');
need(b.boundaries?.dataMutationAuthorized===false&&b.boundaries?.reimportAuthorized===false&&b.boundaries?.liveHostingPromotionAuthorized===false,'B3_003_FIX_BOUNDARY');
need(Number(b.activeFinding?.precedenceDefectCount||0)>=1,'B3_003_FIX_CAUSE_NOT_PROVEN');

let q=read(P.queries);
q=replace(q,
`  function rowPais(row, clients) { const cli = clients instanceof Map ? clients.get(row.clienteId) : S().get('clientes', row.clienteId); const p = paisActivo(); return !p || (cli && cli.pais === p) || row.pais === p; }
  function policyLinkedRowPais(row, clients, policies) {
    if (!row || row.polizaId == null) return false;
    const policy = policies instanceof Map ? policies.get(row.polizaId) : S().get('polizas', row.polizaId);
    if (!policy || policy.clienteId == null) return false;
    const cli = clients instanceof Map ? clients.get(policy.clienteId) : S().get('clientes', policy.clienteId);
    const p = paisActivo();
    return !p || !!(cli && cli.pais === p);
  }
  function polPais(p2, clients) { const cli = clients instanceof Map ? clients.get(p2.clienteId) : S().get('clientes', p2.clienteId); const p = paisActivo(); return !p || (cli && cli.pais === p); }`,
`  function countryCode(v) { return String(v || '').trim().toUpperCase(); }
  function policyLinkedCountry(row, clients, policies) {
    row = row || {};
    const policy = row.polizaId != null ? (policies instanceof Map ? policies.get(row.polizaId) : S().get('polizas', row.polizaId)) : null;
    const clientId = row.clienteId != null ? row.clienteId : (policy && policy.clienteId);
    const cli = clientId != null ? (clients instanceof Map ? clients.get(clientId) : S().get('clientes', clientId)) : null;
    const policyCountry = countryCode(policy && policy.pais);
    const rowCountry = countryCode(row.pais);
    const clientCountry = countryCode(cli && cli.pais);
    if (policyCountry && rowCountry && policyCountry !== rowCountry) return 'REQUIERE_VALIDACION';
    return policyCountry || rowCountry || clientCountry || '';
  }
  function rowPais(row, clients, policies) {
    const p = paisActivo();
    if (!p) return true;
    if (row && row.polizaId != null) return policyLinkedCountry(row, clients, policies) === p;
    const cli = row && row.clienteId != null ? (clients instanceof Map ? clients.get(row.clienteId) : S().get('clientes', row.clienteId)) : null;
    return (countryCode(row && row.pais) || countryCode(cli && cli.pais)) === p;
  }
  function policyLinkedRowPais(row, clients, policies) {
    if (!row || row.polizaId == null) return false;
    const policy = policies instanceof Map ? policies.get(row.polizaId) : S().get('polizas', row.polizaId);
    if (!policy) return false;
    const p = paisActivo();
    return !p || policyLinkedCountry(row, clients, policies) === p;
  }
  function polPais(p2, clients) {
    const cli = p2 && p2.clienteId != null ? (clients instanceof Map ? clients.get(p2.clienteId) : S().get('clientes', p2.clienteId)) : null;
    const p = paisActivo();
    return !p || (countryCode(p2 && p2.pais) || countryCode(cli && cli.pais)) === p;
  }`,
'B3_003_FIX_QUERIES_COUNTRY_BLOCK_DRIFT');
q=q.replaceAll(".filter(c => rowPais(c, clients));",".filter(c => rowPais(c, clients, policies));");
q=replace(q,
"agingVencido, agingVencidoPorMoneda, comisionesPor, clienteNombre, norm, monedaPais, vehiculosDe, vehiculoDePoliza, postRecaudo",
"agingVencido, agingVencidoPorMoneda, comisionesPor, clienteNombre, norm, monedaPais, policyLinkedCountry, vehiculosDe, vehiculoDePoliza, postRecaudo",
'B3_003_FIX_QUERY_EXPORT_DRIFT');
write(P.queries,q);

let cb=read(P.cobros);
cb=replace(cb,
`  function rowCountry(c, idx) {
    const p = indexPolicy(idx, c && c.polizaId);
    const cli = indexClient(idx, c && c.clienteId) || (p ? indexClient(idx, p.clienteId) : null);
    return String((cli && cli.pais) || (c && c.pais) || (p && p.pais) || '').trim().toUpperCase();
  }`,
`  function rowCountry(c, idx) {
    if (q && typeof q.policyLinkedCountry === 'function') {
      const canonical = q.policyLinkedCountry(c, idx && idx.clients, idx && idx.policies);
      if (canonical) return canonical;
    }
    const p = indexPolicy(idx, c && c.polizaId);
    const cli = indexClient(idx, c && c.clienteId) || (p ? indexClient(idx, p.clienteId) : null);
    return String((p && p.pais) || (c && c.pais) || (cli && cli.pais) || '').trim().toUpperCase();
  }`,
'B3_003_FIX_COBROS_ROWCOUNTRY_DRIFT');
cb=replace(cb,
`<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-reported-payment-evidence="${U.esc(c.receiptId)}"`,
`<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" data-reported-payment-evidence="${U.esc(c.receiptId)}"`,
'B3_003_FIX_REPORTED_ROW_IDENTITY_DRIFT');
cb=replace(cb,
`<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" onclick="Orbit.modules.cobros.detalle('${c.id}')">`,
`<tr class="clickable" data-row-country="${U.esc(rowCountry(c, idx))}" data-row-client-id="${U.esc(c.clienteId)}" data-row-policy-id="${U.esc(c.polizaId)}" onclick="Orbit.modules.cobros.detalle('${c.id}')">`,
'B3_003_FIX_COBRO_ROW_IDENTITY_DRIFT');
cb=replace(cb,
`    const arr = S().all('cobros').filter(c => { if (c.estado !== 'Pendiente' && c.estado !== 'Vencido') return false; const cli = S().get('clientes', c.clienteId); return !Orbit.pais || Orbit.pais === 'TODOS' || (cli && cli.pais === Orbit.pais); }).sort((a, b) => (a.vence || '').localeCompare(b.vence || ''));`,
`    const idx = buildIndex();
    const arr = S().all('cobros').filter(c => (c.estado === 'Pendiente' || c.estado === 'Vencido') && countryMatches(c, idx)).sort((a, b) => (a.vence || '').localeCompare(b.vence || ''));`,
'B3_003_FIX_LIQUIDATE_COUNTRY_DRIFT');
write(P.cobros,cb);

let ih=read(P.index);
ih=replace(ih,
`      sel.addEventListener('change', function(){
        Orbit.pais = sel.value;
        document.dispatchEvent(new CustomEvent('orbit:pais'));
        if (Orbit.productAppP0 && Orbit.productAppP0.isStarted && Orbit.productAppP0.isStarted()) {
          if (!location.hash) location.hash = '#/inicio';
          try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch(e) { window.dispatchEvent(new Event('hashchange')); }
        }
      });`,
`      var countryRenderSeq = 0;
      sel.addEventListener('change', function(){
        var next = sel.value || 'TODOS';
        if ((Orbit.pais || 'TODOS') === next) return;
        Orbit.pais = next;
        var host = document.getElementById('host');
        var seq = ++countryRenderSeq;
        if (host) {
          host.setAttribute('aria-busy','true');
          host.innerHTML = '<div class="page"><div class="modstate"><div class="ms-ico">🌎</div><h2>Actualizando país…</h2><p>Preparando la vista seleccionada.</p></div></div>';
        }
        window.requestAnimationFrame(function(){
          if (seq !== countryRenderSeq) return;
          document.dispatchEvent(new CustomEvent('orbit:pais'));
          if (Orbit.productAppP0 && Orbit.productAppP0.isStarted && Orbit.productAppP0.isStarted()) {
            if (!location.hash) location.hash = '#/inicio';
            else {
              try { window.dispatchEvent(new HashChangeEvent('hashchange')); } catch(e) { window.dispatchEvent(new Event('hashchange')); }
            }
          }
          if (host) host.removeAttribute('aria-busy');
        });
      });`,
'B3_003_FIX_INDEX_COUNTRY_HANDLER_DRIFT');
write(P.index,ih);

let d=read(P.diagnostic);
d=replace(d,
`      const rows=[...host?.querySelectorAll?.('table.tbl tbody tr')||[]].slice(0,15).map(n=>(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,350));
      return {at:performance.now(),country:window.Orbit?.pais||'',selected:document.getElementById('pais-sel')?.value||'',kpis:k,aging,rowCount:host?.querySelectorAll?.('table.tbl tbody tr')?.length||0,rows};`,
`      const rowNodes=[...host?.querySelectorAll?.('table.tbl tbody tr')||[]];
      const rows=rowNodes.slice(0,15).map(n=>(n.textContent||'').replace(/\\s+/g,' ').trim().slice(0,350));
      const rowIdentities=rowNodes.map(n=>({clienteId:String(n.getAttribute('data-row-client-id')||''),polizaId:String(n.getAttribute('data-row-policy-id')||''),rowCountry:String(n.getAttribute('data-row-country')||'').trim().toUpperCase()}));
      const loading=host?.getAttribute?.('aria-busy')==='true'||/Actualizando pa[ií]s/i.test(host?.textContent||'');
      return {at:performance.now(),country:window.Orbit?.pais||'',selected:document.getElementById('pais-sel')?.value||'',kpis:k,aging,rowCount:rowNodes.length,rows,rowIdentities,loading};`,
'B3_003_FIX_DIAG_SIG_DRIFT');
d=replace(d,
`    const tableRows=[...host.querySelectorAll('table.tbl tbody tr')].map(n=>(n.textContent||'').replace(/\\s+/g,' ').trim());
    const countryTokens={GT:tableRows.filter(x=>/·\\s*GT\\b/.test(x)).length,CO:tableRows.filter(x=>/·\\s*CO\\b/.test(x)).length};`,
`    const tableNodes=[...host.querySelectorAll('table.tbl tbody tr')];
    const tableRows=tableNodes.map(n=>(n.textContent||'').replace(/\\s+/g,' ').trim());
    const rowIdentities=tableNodes.map(n=>({clienteId:String(n.getAttribute('data-row-client-id')||''),polizaId:String(n.getAttribute('data-row-policy-id')||''),rowCountry:String(n.getAttribute('data-row-country')||'').trim().toUpperCase()}));
    const countryTokens={GT:tableRows.filter(x=>/·\\s*GT\\b/.test(x)).length,CO:tableRows.filter(x=>/·\\s*CO\\b/.test(x)).length};`,
'B3_003_FIX_DIAG_TABLE_DRIFT');
d=replace(d,
`      renderedTable:{rows:tableRows.length,countryTokens,firstRows:tableRows.slice(0,20)},`,
`      renderedTable:{rows:tableRows.length,countryTokens,firstRows:tableRows.slice(0,20),rowIdentities},`,
'B3_003_FIX_DIAG_RENDERED_DRIFT');
d=replace(d,
`   const co=evidence.transitions.CO,gt=evidence.transitions.GT;
   evidence.demonstrated={`,
`   const co=evidence.transitions.CO,gt=evidence.transitions.GT,all=evidence.transitions.TODOS;
   const indexes={clientes:indexRows(independentData.clientes),polizas:indexRows(independentData.polizas)};
   const canonicalByPolicy=Object.fromEntries((independentData.polizas||[]).map(p=>[entityId(p),summarizeLineage(p,independentData,indexes).canonicalCountryCandidate]));
   const foreignLeaks=(tr,country)=>(tr?.renderedTable?.rowIdentities||[]).filter(x=>x.polizaId&&canonicalByPolicy[x.polizaId]&&canonicalByPolicy[x.polizaId]!==country).length;
   const mutationLeaks=(tr,country)=>Math.max(0,...(tr?.mutations||[]).map(x=>(x?.snapshot?.rowIdentities||[]).filter(y=>y.polizaId&&canonicalByPolicy[y.polizaId]&&canonicalByPolicy[y.polizaId]!==country).length));
   evidence.independentUiAdjudication={
     GT:{foreignCountryLeakCount:foreignLeaks(gt,'GT'),transitionLeakCount:mutationLeaks(gt,'GT')},
     CO:{foreignCountryLeakCount:foreignLeaks(co,'CO'),transitionLeakCount:mutationLeaks(co,'CO')},
     loadingSeen:{GT:(gt.mutations||[]).some(x=>x?.snapshot?.loading),CO:(co.mutations||[]).some(x=>x?.snapshot?.loading),TODOS:(all.mutations||[]).some(x=>x?.snapshot?.loading)},
     focal9758:{polizaId:evidence.independentTruth.focal9758?.polizaId||'',canonicalCountry:evidence.independentTruth.focal9758?.canonicalCountryCandidate||''}
   };
   need(evidence.independentTruth.policyLineageCountryConflicts===0,'B3_003_INDEPENDENT_COUNTRY_CONFLICT');
   need(evidence.independentUiAdjudication.GT.foreignCountryLeakCount===0,'B3_003_GT_INDEPENDENT_FIRESTORE_LEAK');
   need(evidence.independentUiAdjudication.CO.foreignCountryLeakCount===0,'B3_003_CO_INDEPENDENT_FIRESTORE_LEAK');
   need(evidence.independentUiAdjudication.GT.transitionLeakCount===0&&evidence.independentUiAdjudication.CO.transitionLeakCount===0,'B3_003_PRIOR_COUNTRY_PAINT_DURING_TRANSITION');
   need(evidence.independentUiAdjudication.loadingSeen.GT&&evidence.independentUiAdjudication.loadingSeen.CO&&evidence.independentUiAdjudication.loadingSeen.TODOS,'B3_003_LOADING_FRAME_NOT_OBSERVED');
   need(evidence.independentUiAdjudication.focal9758.canonicalCountry==='CO','B3_003_9758_CANONICAL_NOT_CO');
   need((co.renderedTable.rowIdentities||[]).some(x=>x.polizaId===evidence.independentUiAdjudication.focal9758.polizaId),'B3_003_9758_MISSING_FROM_CO');
   need(!(gt.renderedTable.rowIdentities||[]).some(x=>x.polizaId===evidence.independentUiAdjudication.focal9758.polizaId),'B3_003_9758_LEAKS_INTO_GT');
   evidence.demonstrated={`,
'B3_003_FIX_DIAG_ADJUDICATION_INSERT_DRIFT');
d=replace(d,
`   evidence.status='DIAGNOSTIC_COMPLETE';`,
`   evidence.status='PASS';
   evidence.assertions={independentFirestoreTruth:true,foreignCountryLeakCountGt:0,foreignCountryLeakCountCo:0,focal9758Explicit:true,countryLoadingFrameObserved:true,noPriorCountryPaintDuringTransition:true,noBrowserErrors:evidence.errors.length===0};
   need(evidence.errors.length===0,'B3_003_BROWSER_ERRORS:'+JSON.stringify(evidence.errors));`,
'B3_003_FIX_DIAG_STATUS_DRIFT');
write(P.diagnostic,d);

const product=[P.queries,P.cobros,P.index];
for(const p of product)need((m.productFiles||[]).includes(p),'B3_003_FIX_COMPOSITION_PATH_MISSING:'+p);
for(const p of product)m.productFileBlobs[p]=blob(p);
m.lastRemediation={id:'B3-003-COUNTRY-LINEAGE-TRANSITION-ROOTFIX-20260929',status:'SOURCE_FIXED_PENDING_EXACT_PREVIEW',receiptPath:P.receipt,changedProductFiles:product,noLive:true,noReimport:true,dataWrites:0};
m.b3003CountryLineageFix={
  status:'CAUSAL_SOURCE_FIX_BOUND_PENDING_EXACT_PREVIEW',
  findingId:'B3-003',
  rootCause:'CLIENT_COUNTRY_PRECEDENCE_OVERRIDES_EXPLICIT_POLICY_COUNTRY_PLUS_COUNTRY_SWITCH_OLD_CONTENT_PAINT_WINDOW',
  changedProductFiles:product,
  exactBlobBindings:Object.fromEntries(product.map(p=>[p,blob(p)])),
  canonicalCountryContract:'policy.pais > explicit linked financial row pais > cliente.pais fallback; conflicting explicit policy/row country => REQUIERE_VALIDACION',
  rowIdentityQaAttributes:['data-row-client-id','data-row-policy-id'],
  transitionContract:'explicit loading frame via requestAnimationFrame; no timeout; no prior-country data painted',
  independentPreviewProof:P.diagnostic,
  dataMutation:false,reimport:false,livePromotion:false,b3002MustRegress:true
};
write(P.composition,m);

b.status='B3_003_CANDIDATE_PENDING_PREVIEW';
b.activeFinding={...(b.activeFinding||{}),status:'CANDIDATE_PENDING_PREVIEW',countryLineageFix:m.b3003CountryLineageFix,currentRemediationAuthorizedProductFiles:[]};
b.boundaries={...(b.boundaries||{}),productMutationAuthorized:false,dataMutationAuthorized:false,reimportAuthorized:false,liveHostingPromotionAuthorized:false,b4AdvanceAuthorized:false};
b.nextRequiredProof=['B3_003_NEW_EXACT_PREVIEW_MACHINE_PASS','B3_003_TARGETED_VISUAL_PASS'];
write(P.lock,b);

const finding=(f.findings||[]).find(x=>x.id==='B3-003');need(finding,'B3_003_FIX_FINDING_MISSING');
Object.assign(finding,{status:'CANDIDATE_PENDING_PREVIEW',blocking:true,causalFix:m.b3003CountryLineageFix,nextAction:'B3_003_NEW_EXACT_PREVIEW_MACHINE_PASS'});
f.currentB3={...(f.currentB3||{}),status:'B3_003_CANDIDATE_PENDING_PREVIEW',activeFindingId:'B3-003'};
write(P.findings,f);

r.status='SOURCE_FIXED_PENDING_EXACT_PREVIEW';
r.latestIndependentCountryLineage={...(r.latestIndependentCountryLineage||{}),fixApplied:true,fixProductBlobBindings:m.b3003CountryLineageFix.exactBlobBindings,previewProofStrengthened:true};
r.nextAction='B3_003_NEW_EXACT_PREVIEW_MACHINE_PASS';
write(P.receipt,r);

c.i65ForensicRemediationPlan.b3={...(c.i65ForensicRemediationPlan.b3||{}),status:'B3_003_CANDIDATE_PENDING_PREVIEW',productMutationAuthorized:false,dataMutationAuthorized:false,reimportAuthorized:false,paulaVisualAccepted:false,candidateEligibleForPromotion:false,causalFix:m.b3003CountryLineageFix};
c.nextAction='I6_5_FORENSIC_REMEDIATION_B3_003_PREVIEW';
c.canonicalAccumulationControl={...(c.canonicalAccumulationControl||{}),nextAction:'B3_003_NEW_EXACT_PREVIEW_MACHINE_PASS'};
c.i65ForensicRemediationPlan.b3.executionLockBlobSha=blob(P.lock);
c.canonicalAccumulationControl.findingLedgerBlobSha=blob(P.findings);
c.canonicalAccumulationControl.compositionLockBlobSha=blob(P.composition);
c.i65ForensicRemediationPlan.b3.countryLineageDiagnosticReceiptBlobSha=blob(P.receipt);
write(P.control,c);

for(const p of [P.queries,P.cobros,P.index,P.diagnostic])cp.execFileSync('node',['--check',p],{stdio:'inherit'});
console.log('B3_003_ROOTFIX_APPLIED='+JSON.stringify({productBlobs:m.b3003CountryLineageFix.exactBlobBindings,compositionBlob:blob(P.composition),lockBlob:blob(P.lock),findingsBlob:blob(P.findings),controlBlob:blob(P.control)}));
