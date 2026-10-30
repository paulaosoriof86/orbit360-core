#!/usr/bin/env python3
import json, pathlib, subprocess

ROOT=pathlib.Path.cwd()
REPO='paulaosoriof86/orbit360-core'
BRANCH='recovery/fase-a-clean-20260831'
EQUIPO=ROOT/'orbit360-platform/modules/equipo.js'
PREP_TEST=ROOT/'artifacts/orbit360-recovery/release-control/b4003-institutional-goals-prepared-20261029/institutional-goals.test.cjs'
TEST=ROOT/'tools/gravicentra-b4-003-institutional-goals-owner.test.cjs'
CONTROL=ROOT/'artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json'
GUARD=ROOT/'tools/gravicentra-i6-control-plane-guard-v1.mjs'
RECEIPT=ROOT/'artifacts/orbit360-recovery/release-control/I6_5_B4_003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR_20261029.json'
EXPECTED_BEFORE='9e76fbcb70d5a19b8b58aeb72b9fad7acd0bbecf'
EXPECTED_AFTER='5ce317a0641709e1a405e61435578de934fa194d'
ATOMIC=sorted([str(CONTROL.relative_to(ROOT)),str(RECEIPT.relative_to(ROOT)),str(EQUIPO.relative_to(ROOT)),str(TEST.relative_to(ROOT)),str(GUARD.relative_to(ROOT))])

def run(*args,capture=True):
    p=subprocess.run(args,cwd=ROOT,check=True,text=True,capture_output=capture)
    return p.stdout.strip() if capture else ''

def blob(path): return run('git','hash-object',str(path))
def replace_once(text,old,new,label):
    n=text.count(old)
    if n!=1: raise RuntimeError(f'{label}_MATCH_COUNT_{n}')
    return text.replace(old,new)

parent=run('git','rev-parse','HEAD')
if run('git','rev-parse','--abbrev-ref','HEAD')!=BRANCH: raise RuntimeError('BRANCH_MISMATCH')
if blob(EQUIPO)!=EXPECTED_BEFORE: raise RuntimeError('EQUIPO_BASE_BLOB_MISMATCH:'+blob(EQUIPO))
if not PREP_TEST.exists(): raise RuntimeError('PREPARED_TEST_MISSING')

s=EQUIPO.read_text(encoding='utf8')
s=replace_once(s,"""  function metaKey(aseId, periodo, pais, campo) { return `meta-equipo-${slug(aseId)}-${String(periodo || '').replace(/[^0-9-]/g, '')}-${slug(pais)}-${slug(campo)}`; }
  function metaRow(aseId, periodo, pais, campo) {
    return metasStore().find(m => String(m.asesorId || '') === String(aseId || '') && String(m.mes || m.periodo || '') === String(periodo || '') && String(m.pais || '') === String(pais || '') && String(m.tipo || '') === String(campo || ''));
  }
""","""  function metaKey(aseId, periodo, pais, campo) {
    const owner=String(aseId||'').trim()?slug(aseId):'institucional';
    return `meta-equipo-${owner}-${String(periodo || '').replace(/[^0-9-]/g, '')}-${slug(pais)}-${slug(campo)}`;
  }
  function metaRow(aseId, periodo, pais, campo) {
    return metasStore().find(m => String(m.asesorId || m.advisorId || '') === String(aseId || '') && String(m.mes || m.periodo || '') === String(periodo || '') && String(m.pais || '') === String(pais || '') && String(m.tipo || '') === String(campo || ''));
  }
  function metaInstitucionalDe(periodo,pais){
    const p=pais||metaPais||'GT',per=normalizePeriodo(periodo);
    const prima=metaRow('',per,p,'prima'),recaudo=metaRow('',per,p,'recaudo');
    return {
      prima:prima&&Number.isFinite(Number(prima.valor))?Number(prima.valor):0,
      recaudo:recaudo&&Number.isFinite(Number(recaudo.valor))?Number(recaudo.valor):0,
      explicitPrima:!!prima,explicitRecaudo:!!recaudo,pais:p,moneda:currencyForCountry(p),periodo:per
    };
  }
  function puedeEditarMetaInstitucional(){
    const role=String(Orbit.session&&typeof Orbit.session.rol==='function'?Orbit.session.rol():(Orbit.auth&&Orbit.auth.productUser&&Orbit.auth.productUser.activeRole)||'');
    if(!['Dirección','SuperAdmin','AdminTenant','Admin'].includes(role))return false;
    return !!(Orbit.access&&typeof Orbit.access.can==='function'&&Orbit.access.can('equipo','edit')===true);
  }
""",'META_HELPERS')
s=replace_once(s,"    const patch={mes:periodo,periodo,pais,moneda:currencyForCountry(pais),tipo:campo,asesorId:aseId,valor:+val||0};\n","    const patch={mes:periodo,periodo,pais,moneda:currencyForCountry(pais),tipo:campo,valor:+val||0};\n    if(String(aseId||'').trim())patch.asesorId=aseId;\n",'META_PAYLOAD')
s=replace_once(s,"    const cur = currencyForCountry(metaPais);\n    const totN = team.reduce((s, a) => s + metaDe(a.id, metaPeriodo, metaPais).nueva, 0);\n","    const cur = currencyForCountry(metaPais);\n    const institucional=metaInstitucionalDe(metaPeriodo,metaPais);\n    const canInstitutional=puedeEditarMetaInstitucional();\n    const totN = team.reduce((s, a) => s + metaDe(a.id, metaPeriodo, metaPais).nueva, 0);\n",'META_RENDER_CONST')
s=replace_once(s,"""      <span class="muted" style="font-size:12.5px"><b>${cur} ${U.moneyShort(totN, cur)}</b> nuevas · <b>${cur} ${U.moneyShort(totR, cur)}</b> renovaciones · <b>${cur} ${U.moneyShort(totC, cur)}</b> recaudo</span>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
""","""      <span class="muted" style="font-size:12.5px"><b>${cur} ${U.moneyShort(totN, cur)}</b> nuevas · <b>${cur} ${U.moneyShort(totR, cur)}</b> renovaciones · <b>${cur} ${U.moneyShort(totC, cur)}</b> recaudo</span>
    </div>
    <div class="card pad" data-meta-institucional-card="1" style="margin-bottom:14px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div><b>Meta institucional · ${metaPais}</b><div class="muted" style="font-size:12px;margin-top:3px">Objetivo global del tenant; no sustituye ni oculta las metas individuales.</div></div>
        <span class="badge ${canInstitutional?'ok':'neutral'}">${canInstitutional?'Editable por administración':'Solo lectura'}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px">
        <label class="ce-l">Producción institucional
          <div class="ct-inp"><span>${cur}</span><input type="number" min="0" value="${institucional.prima}" data-meta-institucional="prima" ${canInstitutional?'':'disabled'}></div>
          <small class="muted">${institucional.explicitPrima?'Configurada en servidor':'Sin meta institucional configurada'}</small>
        </label>
        <label class="ce-l">Recaudo institucional
          <div class="ct-inp"><span>${cur}</span><input type="number" min="0" value="${institucional.recaudo}" data-meta-institucional="recaudo" ${canInstitutional?'':'disabled'}></div>
          <small class="muted">${institucional.explicitRecaudo?'Configurada en servidor':'Sin meta institucional configurada'}</small>
        </label>
      </div>
    </div>
    <div class="card" style="overflow:hidden"><div style="overflow-x:auto"><table class="tbl">
""",'META_UI')
s=replace_once(s,"    host.querySelectorAll('[data-meta]').forEach(inp => inp.addEventListener('change', async () => {\n","""    host.querySelectorAll('[data-meta-institucional]').forEach(inp => inp.addEventListener('change', async () => {
      if(!puedeEditarMetaInstitucional())return inform('Tu rol no puede editar metas institucionales.','Solo lectura');
      const campo=inp.dataset.metaInstitucional;
      try{
        const before=metaInstitucionalDe(metaPeriodo,metaPais);
        await setMeta('',metaPeriodo,metaPais,campo,inp.value);
        const after=metaInstitucionalDe(metaPeriodo,metaPais);
        await audit('editar_meta_institucional','Meta institucional actualizada desde Equipo',before,after);
        toast('✓ Meta institucional guardada y confirmada');render(host);
      }catch(error){inform('No fue posible confirmar la meta institucional en el servidor.','No guardado');}
    }));
    host.querySelectorAll('[data-meta]').forEach(inp => inp.addEventListener('change', async () => {
""",'META_WIRE')
s=replace_once(s,"  return { render, editar: editarUsuario, metaDe, filtrar };\n","  return { render, editar: editarUsuario, metaDe, metaInstitucionalDe, puedeEditarMetaInstitucional, filtrar };\n",'META_EXPORT')
EQUIPO.write_text(s,encoding='utf8')
if blob(EQUIPO)!=EXPECTED_AFTER: raise RuntimeError('EQUIPO_AFTER_BLOB_MISMATCH:'+blob(EQUIPO))
TEST.write_text(PREP_TEST.read_text(encoding='utf8'),encoding='utf8')
test_blob=blob(TEST)

receipt={'schema':'GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR_V1','gate':'I6.5/B4-003','status':'SOURCE_SUCCESSOR_ATOMIC_PREVIEW_PENDING_AUTHENTICATED_UAT','repository':REPO,'branch':BRANCH,'parentHead':parent,'findingId':'B4-003-P0-20261012-INSTITUTIONAL-GOALS','source':{'path':str(EQUIPO.relative_to(ROOT)),'beforeBlob':EXPECTED_BEFORE,'afterBlob':EXPECTED_AFTER},'regression':{'path':str(TEST.relative_to(ROOT)),'blob':test_blob,'checks':15,'syntheticOnly':True,'firestoreAccess':0,'realBusinessWrites':0},'semantics':{'sameMetasCollection':True,'sameBatchDurableWriter':True,'globalGoalHasNoAdvisorId':True,'institutionalTypes':['prima','recaudo'],'individualGoalsPreserved':True,'administrativeUiRoles':['Dirección','SuperAdmin','AdminTenant','Admin'],'serverScopeStillAuthoritative':True},'compositionBinding':{'path':'artifacts/orbit360-recovery/release-control/I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json','frozenProductFileCount':114,'lockRewritten':False,'productPathAlreadyDeclared':True},'boundaries':{'previewOnly':True,'livePromotion':False,'dataImport':False,'operationalWrites':False,'authIamRulesChange':False,'freelancerContractInvented':False,'freelancerFindingClosed':False,'securityB4003StillHold':True,'acceptanceGranted':False},'atomicCommitPaths':ATOMIC,'preserved':{'findings':295,'tasks':86,'historicalApprovals':15}}
RECEIPT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
receipt_blob=blob(RECEIPT)
C=json.loads(CONTROL.read_text(encoding='utf8'))
C['nextAction']='I6_5_B4_003_INSTITUTIONAL_GOALS_SUCCESSOR_EXACT_PREVIEW'
C['b4003InstitutionalGoalsSourceSuccessor20261029']={'status':receipt['status'],'gate':receipt['gate'],'parentHead':parent,'findingId':receipt['findingId'],'receiptPath':str(RECEIPT.relative_to(ROOT)),'receiptBlobSha':receipt_blob,'productPath':str(EQUIPO.relative_to(ROOT)),'beforeBlob':EXPECTED_BEFORE,'afterBlob':EXPECTED_AFTER,'regressionPath':str(TEST.relative_to(ROOT)),'regressionBlob':test_blob,'regressionChecks':15,'atomicCommitPaths':ATOMIC,'preservedFindings':295,'preservedTasks':86,'currentCapabilityAcceptances':0,'institutionalGoalOwner':'Equipo → Metas / metas collection / product operational writer','freelancerContractInvented':False,'freelancerFindingStatus':'OPEN_DEPENDENCY_CANONICAL_CONTRACT_FIELD_REQUIRED','previewAuthorizedAfterGuardAndRegressionPass':True,'productionPromotionAuthorized':False,'rulesAuthIamDataChangesAuthorized':False,'securityB4003StillHold':True}
CONTROL.write_text(json.dumps(C,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

g=GUARD.read_text(encoding='utf8')
g=replace_once(g,""" const CLOSEOUT_CURRENT=C.b4003CloseoutSourceSuccessor20261029||{};
 const CLOSEOUT_AFTER=new Map(Object.entries(CLOSEOUT_CURRENT.sourceFiles||{}).map(([p,v])=>[p,String(v&&v.afterBlob||'')]));
""",""" const CLOSEOUT_CURRENT=C.b4003CloseoutSourceSuccessor20261029||{};
 const CLOSEOUT_AFTER=new Map(Object.entries(CLOSEOUT_CURRENT.sourceFiles||{}).map(([p,v])=>[p,String(v&&v.afterBlob||'')]));
 const INSTITUTIONAL_GOALS_CURRENT=C.b4003InstitutionalGoalsSourceSuccessor20261029||{};
 const INSTITUTIONAL_GOALS_AFTER=new Map([[String(INSTITUTIONAL_GOALS_CURRENT.productPath||''),String(INSTITUTIONAL_GOALS_CURRENT.afterBlob||'')]]);
""",'GUARD_MAP')
g=replace_once(g,"need(declared.every(p=>physicalGit('hash-object',p)===(CLOSEOUT_AFTER.get(p)||CUMULATIVE_AFTER.get(p)||","need(declared.every(p=>physicalGit('hash-object',p)===(INSTITUTIONAL_GOALS_AFTER.get(p)||CLOSEOUT_AFTER.get(p)||CUMULATIVE_AFTER.get(p)||",'GUARD_BLOB_OVERRIDE')
marker=""" console.log('B4_003_CLOSEOUT_EXACT_PREVIEW=BUILD_BYTE_READBACK_PASS_AUTH_UAT_PENDING');
 need(COMP.productFileCount===COMP.productFiles.length,'I6_CANONICAL_COMPOSITION_COUNT_DRIFT');
"""
block=f""" console.log('B4_003_CLOSEOUT_EXACT_PREVIEW=BUILD_BYTE_READBACK_PASS_AUTH_UAT_PENDING');
 const institutionalGoals=C.b4003InstitutionalGoalsSourceSuccessor20261029;
 const institutionalReceiptPath='{RECEIPT.relative_to(ROOT)}';
 const institutionalTestPath='{TEST.relative_to(ROOT)}';
 const institutionalReceipt=readJson(institutionalReceiptPath);
 const institutionalCommit=physicalGit('log','-n','1','--format=%H','--','orbit360-platform/modules/equipo.js');
 const institutionalExpected=(institutionalGoals.atomicCommitPaths||[]).slice().sort();
 const institutionalActual=physicalGit('diff','--name-only',institutionalGoals.parentHead+'..'+institutionalCommit).split(/\\r?\\n/).filter(Boolean).sort();
 const institutionalTestOutput=execFileSync(process.execPath,[institutionalTestPath],{{encoding:'utf8',stdio:'pipe'}});
 need(institutionalGoals?.status==='SOURCE_SUCCESSOR_ATOMIC_PREVIEW_PENDING_AUTHENTICATED_UAT'&&institutionalGoals.gate==='I6.5/B4-003'&&institutionalGoals.findingId==='B4-003-P0-20261012-INSTITUTIONAL-GOALS'&&/^[0-9a-f]{{40}}$/.test(String(institutionalGoals.parentHead||''))&&institutionalGoals.receiptPath===institutionalReceiptPath&&institutionalGoals.receiptBlobSha===physicalGit('hash-object',institutionalReceiptPath)&&institutionalReceipt.schema==='GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR_V1'&&institutionalReceipt.status===institutionalGoals.status&&institutionalReceipt.parentHead===institutionalGoals.parentHead&&physicalGit('rev-parse',institutionalCommit+'^')===institutionalGoals.parentHead&&physicalGit('merge-base',institutionalCommit,current)===institutionalCommit&&institutionalExpected.length===5&&institutionalActual.join('|')===institutionalExpected.join('|')&&institutionalReceipt.atomicCommitPaths.slice().sort().join('|')===institutionalExpected.join('|')&&institutionalReceipt.source.path==='orbit360-platform/modules/equipo.js'&&institutionalReceipt.source.beforeBlob==='{EXPECTED_BEFORE}'&&institutionalReceipt.source.afterBlob==='{EXPECTED_AFTER}'&&institutionalGoals.beforeBlob===institutionalReceipt.source.beforeBlob&&institutionalGoals.afterBlob===institutionalReceipt.source.afterBlob&&physicalGit('rev-parse',institutionalGoals.parentHead+':orbit360-platform/modules/equipo.js')===institutionalReceipt.source.beforeBlob&&physicalGit('rev-parse',institutionalCommit+':orbit360-platform/modules/equipo.js')===institutionalReceipt.source.afterBlob&&institutionalReceipt.regression.path===institutionalTestPath&&institutionalReceipt.regression.blob===institutionalGoals.regressionBlob&&physicalGit('rev-parse',institutionalCommit+':'+institutionalTestPath)===institutionalReceipt.regression.blob&&institutionalReceipt.regression.checks===15&&institutionalReceipt.regression.syntheticOnly===true&&institutionalReceipt.regression.realBusinessWrites===0&&institutionalReceipt.semantics.sameMetasCollection===true&&institutionalReceipt.semantics.sameBatchDurableWriter===true&&institutionalReceipt.semantics.globalGoalHasNoAdvisorId===true&&institutionalReceipt.semantics.individualGoalsPreserved===true&&institutionalReceipt.compositionBinding?.frozenProductFileCount===114&&institutionalReceipt.compositionBinding?.lockRewritten===false&&institutionalReceipt.boundaries.freelancerContractInvented===false&&institutionalReceipt.boundaries.freelancerFindingClosed===false&&institutionalReceipt.boundaries.livePromotion===false&&institutionalReceipt.boundaries.operationalWrites===false&&institutionalReceipt.boundaries.securityB4003StillHold===true&&institutionalGoals.currentCapabilityAcceptances===0&&institutionalGoals.productionPromotionAuthorized===false&&institutionalTestOutput.includes('B4_003_INSTITUTIONAL_GOALS_LOCAL_QA_PASS checks=15'),'B4_003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR_INVALID');
 console.log('B4_003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR=EQUIPO_METAS_DURABLE_OWNER_SOURCE_QA_PASS_PREVIEW_UAT_PENDING');
 need(COMP.productFileCount===COMP.productFiles.length,'I6_CANONICAL_COMPOSITION_COUNT_DRIFT');
"""
g=replace_once(g,marker,block,'GUARD_VALIDATION_BLOCK')
GUARD.write_text(g,encoding='utf8')

run('node','--check',str(EQUIPO),capture=False)
run('node','--check',str(TEST),capture=False)
out=run('node',str(TEST))
if 'checks=15' not in out: raise RuntimeError('INSTITUTIONAL_TEST_DID_NOT_PASS')
run('node','--check',str(GUARD),capture=False)
run('git','add',*ATOMIC,capture=False)
changed=sorted(run('git','diff','--cached','--name-only').splitlines())
if changed!=ATOMIC: raise RuntimeError('ATOMIC_PATHS_MISMATCH:'+json.dumps(changed))
run('git','config','user.name','gravicentra-release-bot',capture=False)
run('git','config','user.email','gravicentra-release-bot@users.noreply.github.com',capture=False)
run('git','commit','-m','fix(i6.5 B4-003): integrate durable institutional goals owner',capture=False)
source_commit=run('git','rev-parse','HEAD')
run('node','tools/gravicentra-governance-preflight-v1.mjs','--mode=i6',capture=False)
run('node','tools/gravicentra-i6-control-plane-guard-v1.mjs',capture=False)
run('node',str(TEST),capture=False)
print(json.dumps({'status':'PASS_READY_TO_PUSH','sourceCommit':source_commit,'parentHead':parent,'sourceBlob':blob(EQUIPO),'testBlob':blob(TEST),'receiptBlob':blob(RECEIPT)}))
