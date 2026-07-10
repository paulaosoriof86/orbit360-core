#!/usr/bin/env node
import path from 'node:path';
import { runFirstFlowP09m } from './orbit360-run-aseguradoras-first-flow-p09m.mjs';

function clean(value){ return String(value == null ? '' : value).trim(); }
function parse(argv){
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

try{
  const result=await runFirstFlowP09m(parse(process.argv.slice(2)));
  console.log(JSON.stringify({
    ok:true,
    code:'P09M_FIRST_FLOW_REPORT_READY',
    reportFile:path.basename(result.mdPath),
    reportJson:path.basename(result.jsonPath),
    claudeGate:result.report.claudeGate.status,
    approved:result.report.gates.filter(item=>item.state==='approved').length,
    pending:result.report.claudeGate.pending.length,
    writeAllowed:false,
    enablesCotizador:false,
    enablesComparativo:false
  },null,2));
}catch(error){
  console.error(JSON.stringify({
    ok:false,
    code:clean(error?.code||error?.message||'P09M_FAILED'),
    message:clean(error?.message||error),
    writeAllowed:false,
    enablesCotizador:false,
    enablesComparativo:false
  },null,2));
  process.exitCode=2;
}
