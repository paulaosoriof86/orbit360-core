#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createSameOriginHostP09l } from './orbit360-aseguradoras-same-origin-host-p09l.mjs';

const VERSION='p09m-v1';
const EXPECTED_BRANCH='ays/backend-tenant-lab-v99-20260703';
const DEFAULT_DOCUMENT='ays_aseguate_tarifario_2026_v1';
const DEFAULT_INSURER='ins_gt_aseguradora_guatemalteca';

function clean(value){ return String(value == null ? '' : value).trim(); }
function unique(values){ return Array.from(new Set((values || []).filter(Boolean))); }
function stamp(){ return new Date().toISOString().replace(/[-:]/g,'').replace(/\..+$/,'').replace('T','_'); }
function sanitize(value,depth=0){
  if(depth>16) return '[depth_limited]';
  if(value==null || ['string','number','boolean'].includes(typeof value)) return value;
  if(Array.isArray(value)) return value.slice(0,5000).map(item=>sanitize(item,depth+1));
  if(typeof value!=='object') return String(value);
  const out={};
  for(const [key,item] of Object.entries(value)){
    if(/^(?:localPath|path|mountedPath|resolvedPath|root|roots|allowedRoots|fileRef|sourceRef|archivoRef|url|signedUrl|bootstrapUrl|cookie|setCookie|raw|rawBytes|bytes|binary|base64|fullText|apiKey|token|secret|password|credential|authorization)$/i.test(key)) continue;
    out[key]=sanitize(item,depth+1);
  }
  return out;
}
function parseArgs(argv){
  const out={roots:[]};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i], next=argv[i+1];
    if(key==='--app'&&next){ out.appRoot=next; i+=1; }
    else if(key==='--catalog'&&next){ out.catalogPath=next; i+=1; }
    else if(key==='--root'&&next){ out.roots.push(next); i+=1; }
    else if(key==='--private-records'&&next){ out.privateRecordsPath=next; i+=1; }
    else if(key==='--report-dir'&&next){ out.reportDir=next; i+=1; }
    else if(key==='--document-id'&&next){ out.documentId=next; i+=1; }
    else if(key==='--insurer-id'&&next){ out.insurerId=next; i+=1; }
    else if(key==='--python'&&next){ out.pythonExecutable=next; i+=1; }
    else if(key==='--port'&&next){ out.port=Number(next); i+=1; }
    else if(key==='--allow-dirty'){ out.allowDirty=true; }
  }
  return out;
}
function gitValue(args){
  try { return clean(execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']})); }
  catch { return ''; }
}
function hashText(value){ return crypto.createHash('sha256').update(String(value||'')).digest('hex'); }
function countArray(value){ return Array.isArray(value) ? value.length : 0; }
function manifestSummary(payload){
  const result=payload?.result || payload || {};
  const manifest=result.manifest || result;
  const workbook=manifest.workbook || {};
  return {
    ready:payload?.ok===true,
    code:clean(payload?.code || result.code || 'MANIFEST_RESULT_UNKNOWN'),
    documentId:clean(manifest.documentId || result.documentId),
    parser:clean(manifest.parser || manifest.metadata?.parser),
    sheetCount:countArray(workbook.sheets || manifest.sheets),
    pageCount:countArray(manifest.pages),
    factCount:countArray(manifest.facts),
    candidateGroupCount:countArray(manifest.candidateGroups),
    outputRouteCount:countArray(manifest.outputRoutes),
    warningCount:countArray(manifest.warnings || manifest.issues),
    containsCustomerPayload:manifest.flags?.containsCustomerPayload===true,
    containsSecrets:manifest.flags?.containsSecrets===true,
    containsRawPayload:manifest.flags?.containsRawPayload===true,
    requiresHumanValidation:manifest.requiresHumanValidation!==false,
    writeAllowed:false,
    enablesCotizador:false,
    enablesComparativo:false
  };
}
function gate(id,label,state,evidence){ return {id,label,state,evidence:sanitize(evidence||{})}; }
function buildClaudeDecision(gates){
  const required=['same_origin_host','secure_session','index_in_memory','source_reference','training_read','no_writes','no_enablement','browser_preview','runtime_auth_role','history_reload','read_model','visual_smoke','module_boundary'];
  const byId=Object.fromEntries(gates.map(item=>[item.id,item]));
  const pending=required.filter(id=>!byId[id] || byId[id].state!=='approved');
  return {
    ready:pending.length===0,
    status:pending.length===0?'ready_for_super_accumulated_claude_package':'not_ready',
    pending,
    nextReview:'after_browser_preview_training_history_reload_and_visual_smoke',
    packageMode:'super_accumulated_from_candidate_20260708'
  };
}
function markdown(report){
  const lines=[];
  lines.push('# ORBIT 360 — P0.9M PRIMER FLUJO DOCUMENTAL');
  lines.push('');
  lines.push(`Fecha: ${report.generatedAt}`);
  lines.push(`Rama: ${report.repository.branch}`);
  lines.push(`HEAD: ${report.repository.head}`);
  lines.push(`Documento: ${report.source.documentId}`);
  lines.push('');
  lines.push('## Resultado técnico');
  lines.push('');
  lines.push(`- Host same-origin: ${report.technical.hostConnected?'APROBADO':'BLOQUEADO'}`);
  lines.push(`- Sesión segura: ${report.technical.sessionReady?'APROBADO':'BLOQUEADO'}`);
  lines.push(`- Fuente localizada: ${report.source.referenceAvailable?'APROBADO':'PENDIENTE'}`);
  lines.push(`- Lectura training: ${report.manifest.ready?'APROBADO':'PENDIENTE'}`);
  lines.push(`- Escritura de conocimiento: NO`);
  lines.push(`- Cotizador habilitado: NO`);
  lines.push(`- Comparativo habilitado: NO`);
  lines.push('');
  lines.push('## Resumen sanitizado');
  lines.push('');
  lines.push(`- Hojas: ${report.manifest.sheetCount}`);
  lines.push(`- Hechos detectados: ${report.manifest.factCount}`);
  lines.push(`- Grupos candidatos: ${report.manifest.candidateGroupCount}`);
  lines.push(`- Advertencias: ${report.manifest.warningCount}`);
  lines.push(`- PII/payload cliente en salida: ${report.manifest.containsCustomerPayload?'BLOQUEADO':'NO'}`);
  lines.push('');
  lines.push('## Gate Claude');
  lines.push('');
  lines.push(`Estado: ${report.claudeGate.ready?'LISTO':'TODAVÍA NO'}`);
  report.gates.forEach(item=>lines.push(`- ${item.label}: ${item.state.toUpperCase()}`));
  lines.push('');
  lines.push('Este reporte no contiene rutas, referencias, tasas, PII, credenciales ni contenido del archivo.');
  return lines.join('\n')+'\n';
}

export async function runFirstFlowP09m(options={}){
  const cwd=process.cwd();
  const appRoot=path.resolve(options.appRoot || 'orbit360-platform');
  const catalogPath=path.resolve(options.catalogPath || path.join(appRoot,'data/tenant-alianzas-soluciones-source-catalog-p09k.json'));
  const reportDir=path.resolve(options.reportDir || '_orbit360_private_reports');
  const documentId=clean(options.documentId || DEFAULT_DOCUMENT);
  const insurerId=clean(options.insurerId || DEFAULT_INSURER);
  const roots=unique([].concat(options.roots||[]).map(value=>path.resolve(value)));
  const branch=gitValue(['rev-parse','--abbrev-ref','HEAD']);
  const head=gitValue(['rev-parse','HEAD']);
  const dirty=gitValue(['status','--porcelain']);
  const gates=[];
  const report={
    version:VERSION,generatedAt:new Date().toISOString(),
    repository:{branch,head,dirty:!!dirty,expectedBranch:EXPECTED_BRANCH},
    source:{tenantId:'alianzas-soluciones',insurerId,documentId,referenceAvailable:false,referenceOpaque:true,referenceExposed:false},
    technical:{hostConnected:false,sessionReady:false,indexInjected:false,indexDiskUnchanged:true,originProtected:false},
    manifest:{ready:false,code:'NOT_EXECUTED',sheetCount:0,pageCount:0,factCount:0,candidateGroupCount:0,outputRouteCount:0,warningCount:0,containsCustomerPayload:false,containsSecrets:false,containsRawPayload:false,writeAllowed:false,enablesCotizador:false,enablesComparativo:false},
    gates:[],claudeGate:null,containsLocalPaths:false,containsReferences:false,containsSecrets:false,containsCustomerPayload:false,writeAllowed:false,enablesCotizador:false,enablesComparativo:false
  };
  if(branch!==EXPECTED_BRANCH) throw Object.assign(new Error('BRANCH_NOT_ALLOWED'),{code:'BRANCH_NOT_ALLOWED'});
  if(dirty && options.allowDirty!==true) throw Object.assign(new Error('WORKTREE_NOT_CLEAN'),{code:'WORKTREE_NOT_CLEAN'});
  if(!fs.existsSync(appRoot) || !fs.existsSync(path.join(appRoot,'index.html'))) throw Object.assign(new Error('APP_INDEX_REQUIRED'),{code:'APP_INDEX_REQUIRED'});
  if(!fs.existsSync(catalogPath)) throw Object.assign(new Error('SOURCE_CATALOG_REQUIRED'),{code:'SOURCE_CATALOG_REQUIRED'});
  if(!roots.length || roots.some(root=>!fs.existsSync(root))) throw Object.assign(new Error('AUTHORIZED_SOURCE_ROOT_REQUIRED'),{code:'AUTHORIZED_SOURCE_ROOT_REQUIRED'});
  fs.mkdirSync(reportDir,{recursive:true});
  const indexPath=path.join(appRoot,'index.html');
  const indexHashBefore=hashText(fs.readFileSync(indexPath,'utf8'));
  const host=createSameOriginHostP09l({
    appRoot,catalogPath,allowedRoots:roots,privateRecordsPath:options.privateRecordsPath,
    toolsRoot:path.resolve(cwd,'tools'),pythonExecutable:options.pythonExecutable,port:options.port||0
  });
  let ready=null;
  try{
    ready=await host.start();
    report.technical.hostConnected=ready?.host==='127.0.0.1' && ready?.sameOrigin===true;
    let response=await fetch(ready.bootstrapUrl,{redirect:'manual'});
    const setCookie=response.headers.get('set-cookie')||'';
    const cookie=setCookie.split(';')[0];
    const location=response.headers.get('location')||'';
    report.technical.sessionReady=response.status===302 && /^orbit360_p09l_session=/.test(cookie) && /HttpOnly/i.test(setCookie) && /SameSite=Strict/i.test(setCookie);
    response=await fetch(`${ready.origin}${location}`,{headers:{Cookie:cookie}});
    const html=await response.text();
    report.technical.indexInjected=response.status===200 && html.includes('aseguradoras-same-origin-document-bridge-p09l.js') && html.includes('aseguradoras-runtime-bootstrap-p09f.js');
    report.technical.indexDiskUnchanged=hashText(fs.readFileSync(indexPath,'utf8'))===indexHashBefore;
    response=await fetch(`${ready.origin}/__orbit360/status`,{headers:{Cookie:cookie}});
    const status=await response.json();
    report.technical.hostConnected=report.technical.hostConnected && response.status===200 && status.connected===true;
    response=await fetch(`${ready.origin}/__orbit360/references`,{
      method:'POST',headers:{Cookie:cookie,Origin:ready.origin,'Content-Type':'application/json'},
      body:JSON.stringify({tenantId:'alianzas-soluciones',batchId:'ays_aseguradoras_knowledge_batch_2026_v1',documentIds:[documentId],purpose:'training',actor:{id:'orbit-p09m-preflight',tenantId:'alianzas-soluciones',activeRole:'Dirección',roles:['Dirección']}})
    });
    const refs=await response.json();
    report.technical.originProtected=response.status!==403;
    report.source.referenceAvailable=response.status===200 && refs.provided===1 && refs.items?.some(item=>item.documentId===documentId && item.provided===true);
    const opaqueRef=refs.sourceRefs?.[documentId];
    if(report.source.referenceAvailable && opaqueRef){
      response=await fetch(`${ready.origin}/__orbit360/run`,{
        method:'POST',headers:{Cookie:cookie,Origin:ready.origin,'Content-Type':'application/json'},
        body:JSON.stringify({task:'excel_manifest',request:{tenantId:'alianzas-soluciones',aseguradoraId:insurerId,documentId,fileRef:opaqueRef,purpose:'training',includeSensitiveValues:false,actor:{id:'orbit-p09m-preflight',tenantId:'alianzas-soluciones',activeRole:'Dirección',roles:['Dirección']}}})
      });
      const result=await response.json();
      report.manifest=manifestSummary(result);
      report.manifest.ready=response.status===200 && result.ok===true;
    }
    report.technical.indexDiskUnchanged=report.technical.indexDiskUnchanged && hashText(fs.readFileSync(indexPath,'utf8'))===indexHashBefore;
  } finally {
    await host.stop();
  }
  gates.push(gate('same_origin_host','Host local same-origin',report.technical.hostConnected?'approved':'blocked'));
  gates.push(gate('secure_session','Sesión HttpOnly y origen protegido',report.technical.sessionReady?'approved':'blocked'));
  gates.push(gate('index_in_memory','Empalme temporal sin modificar index',report.technical.indexInjected&&report.technical.indexDiskUnchanged?'approved':'blocked'));
  gates.push(gate('source_reference','Fuente AseGuate localizada',report.source.referenceAvailable?'approved':'pending'));
  gates.push(gate('training_read','Lectura training sanitizada',report.manifest.ready&&!report.manifest.containsCustomerPayload&&!report.manifest.containsSecrets?'approved':'pending'));
  gates.push(gate('no_writes','Cero escritura de conocimiento','approved'));
  gates.push(gate('no_enablement','Cotizador y Comparativo deshabilitados','approved'));
  gates.push(gate('browser_preview','Vista previa generada desde formulario real','pending'));
  gates.push(gate('runtime_auth_role','Auth y rol activo confirmados en navegador','pending'));
  gates.push(gate('history_reload','Historial visible después de recarga','pending'));
  gates.push(gate('read_model','Read model real estable','pending'));
  gates.push(gate('visual_smoke','Smoke visual y responsive','pending'));
  gates.push(gate('module_boundary','Frontera visual Aseguradoras/Cotizador/Comparativo','pending'));
  report.gates=gates;
  report.claudeGate=buildClaudeDecision(gates);
  const safeReport=sanitize(report);
  const id=`P09M-FIRST-FLOW-${stamp()}`;
  const jsonPath=path.join(reportDir,id+'.json');
  const mdPath=path.join(reportDir,id+'.md');
  fs.writeFileSync(jsonPath,JSON.stringify(safeReport,null,2)+'\n','utf8');
  fs.writeFileSync(mdPath,markdown(safeReport),'utf8');
  return {report:safeReport,jsonPath,mdPath};
}

if(import.meta.url===new URL(`file://${process.argv[1]}`).href){
  const options=parseArgs(process.argv.slice(2));
  try{
    const result=await runFirstFlowP09m(options);
    console.log(JSON.stringify({ok:true,code:'P09M_FIRST_FLOW_REPORT_READY',reportFile:path.basename(result.mdPath),claudeGate:result.report.claudeGate.status,technicalApproved:result.report.gates.filter(item=>item.state==='approved').length,pending:result.report.claudeGate.pending.length,writeAllowed:false,enablesCotizador:false,enablesComparativo:false},null,2));
  }catch(error){
    console.error(JSON.stringify({ok:false,code:clean(error?.code||error?.message||'P09M_FAILED'),message:clean(error?.message||error),writeAllowed:false,enablesCotizador:false,enablesComparativo:false},null,2));
    process.exitCode=2;
  }
}
