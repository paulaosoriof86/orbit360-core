#!/usr/bin/env node
'use strict';
import {
  installBootstrapDiagnostics as installBaseDiagnostics,
  waitForProductBootstrap as waitForBaseProductBootstrap,
  authenticateWithOwner,
  acceptLegalOnce
} from './orbit360-gate-bootstrap-auth-legal-v20260717.mjs';

export function normalizeScriptEvidence(report){
  const diagnostic=report&&report.browserParseDiagnostics;
  if(!diagnostic)return report;
  const normalize=item=>{
    if(typeof item==='string')return {path:item};
    if(item&&typeof item==='object')return {...item,path:String(item.path||'')};
    return {path:''};
  };
  diagnostic.parsedScripts=[].concat(diagnostic.parsedScripts||[]).map(normalize);
  diagnostic.failedScripts=[].concat(diagnostic.failedScripts||[]).map(normalize);
  return report;
}

export function installBootstrapDiagnostics(page,report){
  return installBaseDiagnostics(page,report);
}

export async function waitForProductBootstrap(page,args){
  const report=args&&args.report;
  normalizeScriptEvidence(report);
  const timer=setInterval(()=>normalizeScriptEvidence(report),5);
  try{
    return await waitForBaseProductBootstrap(page,args);
  }finally{
    clearInterval(timer);
    normalizeScriptEvidence(report);
  }
}

export {authenticateWithOwner,acceptLegalOnce};
