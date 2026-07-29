#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

export const CONTRACT_SHAPE_READER_VERSION='20260729.1';
export const RESPONSIVE_TITLE_CONTRACT_PATH='tools/orbit360-responsive-title-resolver-contract-v20260729.json';

const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const fail=(code,detail='')=>{throw new Error(`${code}${detail?':'+detail:''}`)};
const requireObject=(value,name)=>{if(!isObject(value))fail('CONTRACT_PATH_INVALID_OBJECT',name);return value;};
const requireString=(value,name)=>{if(typeof value!=='string'||!value.trim())fail('CONTRACT_PATH_INVALID_STRING',name);return value.trim();};
const requireBoolean=(value,name)=>{if(typeof value!=='boolean')fail('CONTRACT_PATH_INVALID_BOOLEAN',name);return value;};
const requireNumber=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value))fail('CONTRACT_PATH_INVALID_NUMBER',name);return value;};
const requireStringArray=(value,name)=>{if(!Array.isArray(value)||value.length===0||value.some(x=>typeof x!=='string'||!x.trim()))fail('CONTRACT_PATH_INVALID_STRING_ARRAY',name);return value.map(x=>x.trim());};
const requireOwn=(obj,key,pathName)=>{if(!Object.prototype.hasOwnProperty.call(obj,key))fail('CONTRACT_PATH_MISSING',pathName);return obj[key];};

export function normalizeResponsiveTitleResolverContract(raw){
  const root=requireObject(raw,'root');
  const schemaVersion=requireString(requireOwn(root,'schemaVersion','schemaVersion'),'schemaVersion');
  if(schemaVersion!=='orbit360-responsive-title-resolver-contract-v1')fail('CONTRACT_SCHEMA_VERSION_UNSUPPORTED',schemaVersion);
  const version=requireString(requireOwn(root,'version','version'),'version');
  const standardSelectors=requireStringArray(requireOwn(root,'standardSelectors','standardSelectors'),'standardSelectors');
  const scopedRaw=requireObject(requireOwn(root,'scopedExactTextFallback','scopedExactTextFallback'),'scopedExactTextFallback');
  const insurerRaw=requireObject(requireOwn(root,'insurerFicha','insurerFicha'),'insurerFicha');
  const normalized={
    schemaVersion,
    version,
    standardSelectors,
    scopedExactTextFallback:{
      allowed:requireBoolean(requireOwn(scopedRaw,'allowed','scopedExactTextFallback.allowed'),'scopedExactTextFallback.allowed'),
      requiredScope:requireBoolean(requireOwn(scopedRaw,'requiredScope','scopedExactTextFallback.requiredScope'),'scopedExactTextFallback.requiredScope'),
      exactText:requireBoolean(requireOwn(scopedRaw,'exactText','scopedExactTextFallback.exactText'),'scopedExactTextFallback.exactText'),
      candidateTags:requireStringArray(requireOwn(scopedRaw,'candidateTags','scopedExactTextFallback.candidateTags'),'scopedExactTextFallback.candidateTags'),
      minimumFontPx:requireNumber(requireOwn(scopedRaw,'minimumFontPx','scopedExactTextFallback.minimumFontPx'),'scopedExactTextFallback.minimumFontPx'),
      minimumFontWeight:requireNumber(requireOwn(scopedRaw,'minimumFontWeight','scopedExactTextFallback.minimumFontWeight'),'scopedExactTextFallback.minimumFontWeight')
    },
    insurerFicha:{
      scopeSelector:requireString(requireOwn(insurerRaw,'scopeSelector','insurerFicha.scopeSelector'),'insurerFicha.scopeSelector'),
      expectedTextSource:requireString(requireOwn(insurerRaw,'expectedTextSource','insurerFicha.expectedTextSource'),'insurerFicha.expectedTextSource')
    }
  };
  if(!normalized.scopedExactTextFallback.allowed||!normalized.scopedExactTextFallback.requiredScope||!normalized.scopedExactTextFallback.exactText)fail('CONTRACT_SEMANTIC_REQUIREMENT_INVALID','scopedExactTextFallback');
  return Object.freeze(normalized);
}

export function loadResponsiveTitleResolverContract(root=process.cwd(),rel=RESPONSIVE_TITLE_CONTRACT_PATH){
  const abs=path.join(root,rel);
  let raw;
  try{raw=JSON.parse(fs.readFileSync(abs,'utf8'));}catch(error){fail('CONTRACT_READ_OR_PARSE_FAILED',String(error&&error.message||error).slice(0,180));}
  return normalizeResponsiveTitleResolverContract(raw);
}
