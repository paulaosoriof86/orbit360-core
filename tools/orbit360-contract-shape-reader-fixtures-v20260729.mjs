#!/usr/bin/env node
'use strict';
import {loadResponsiveTitleResolverContract,normalizeResponsiveTitleResolverContract,CONTRACT_SHAPE_READER_VERSION} from './orbit360-contract-shape-reader-v20260729.mjs';

const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,200)});
const expectThrow=(id,fn,pattern)=>{try{fn();check(id,false,'did_not_throw')}catch(error){const msg=String(error&&error.message||error);check(id,pattern.test(msg),msg)}};
try{
  const canonical=loadResponsiveTitleResolverContract();
  check('READER_VERSION',CONTRACT_SHAPE_READER_VERSION==='20260729.1',CONTRACT_SHAPE_READER_VERSION);
  check('CANONICAL_VERSION',canonical.version==='20260729.1',canonical.version);
  check('CANONICAL_SCOPE',canonical.insurerFicha.scopeSelector==='#asg-ficha',canonical.insurerFicha.scopeSelector);
  check('CANONICAL_FALLBACK',canonical.scopedExactTextFallback.allowed===true&&canonical.scopedExactTextFallback.requiredScope===true&&canonical.scopedExactTextFallback.exactText===true);
  check('CANONICAL_THRESHOLDS',canonical.scopedExactTextFallback.minimumFontPx===18&&canonical.scopedExactTextFallback.minimumFontWeight===600);
  const reordered={insurerFicha:{expectedTextSource:'x',scopeSelector:'#asg-ficha'},scopedExactTextFallback:{minimumFontWeight:600,candidateTags:['h1','h2','h3','div','span'],exactText:true,allowed:true,minimumFontPx:18,requiredScope:true},standardSelectors:['h1'],version:'fixture',schemaVersion:'orbit360-responsive-title-resolver-contract-v1'};
  const normalized=normalizeResponsiveTitleResolverContract(reordered);check('ORDER_INDEPENDENT',normalized.version==='fixture'&&normalized.insurerFicha.scopeSelector==='#asg-ficha');
  expectThrow('MISSING_CANONICAL_FALLBACK_REJECTED',()=>normalizeResponsiveTitleResolverContract({schemaVersion:'orbit360-responsive-title-resolver-contract-v1',version:'x',standardSelectors:['h1'],scopeFallback:{allowed:true},insurerFicha:{scopeSelector:'#asg-ficha',expectedTextSource:'x'}}),/CONTRACT_PATH_MISSING:scopedExactTextFallback/);
  expectThrow('MISSING_INSURER_FICHA_REJECTED',()=>normalizeResponsiveTitleResolverContract({schemaVersion:'orbit360-responsive-title-resolver-contract-v1',version:'x',standardSelectors:['h1'],scopedExactTextFallback:{allowed:true,requiredScope:true,exactText:true,candidateTags:['div'],minimumFontPx:18,minimumFontWeight:600}}),/CONTRACT_PATH_MISSING:insurerFicha/);
  expectThrow('WRONG_TYPE_REJECTED',()=>normalizeResponsiveTitleResolverContract({schemaVersion:'orbit360-responsive-title-resolver-contract-v1',version:'x',standardSelectors:['h1'],scopedExactTextFallback:{allowed:true,requiredScope:true,exactText:true,candidateTags:['div'],minimumFontPx:'18',minimumFontWeight:600},insurerFicha:{scopeSelector:'#asg-ficha',expectedTextSource:'x'}}),/CONTRACT_PATH_INVALID_NUMBER:scopedExactTextFallback.minimumFontPx/);
  expectThrow('UNSUPPORTED_SCHEMA_REJECTED',()=>normalizeResponsiveTitleResolverContract({schemaVersion:'orbit360-responsive-title-resolver-contract-v2',version:'x',standardSelectors:['h1'],scopedExactTextFallback:{allowed:true,requiredScope:true,exactText:true,candidateTags:['div'],minimumFontPx:18,minimumFontWeight:600},insurerFicha:{scopeSelector:'#asg-ficha',expectedTextSource:'x'}}),/CONTRACT_SCHEMA_VERSION_UNSUPPORTED/);
}catch(error){check('FIXTURE_EXCEPTION',false,String(error&&error.message||error));}
const failed=checks.filter(x=>!x.ok);const out={schemaVersion:'orbit360-contract-shape-reader-fixtures-v1',readerVersion:CONTRACT_SHAPE_READER_VERSION,ok:failed.length===0,status:failed.length?'CONTRACT_SHAPE_READER_FIXTURES_FAIL':'CONTRACT_SHAPE_READER_FIXTURES_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,containsPII:false,containsSecrets:false};
console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
