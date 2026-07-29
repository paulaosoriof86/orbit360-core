#!/usr/bin/env node
'use strict';

export const SOURCE_PREDICATE_HELPER_VERSION='20260729.1';

function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}

export function hasParserBlockingFirebaseLoader(source){
  const text=String(source||'');
  const wrapper=/function\s+write\s*\(\s*src\s*\)\s*\{([^}]*)\}/s.exec(text);
  if(!wrapper||!documentWriteInBody(wrapper[1]))return false;
  const sdkTokens=['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'];
  return sdkTokens.every(token=>{
    const q="['\"`]";
    const pattern=new RegExp('\\bwrite\\s*\\(\\s*('+q+')[^\\n\\r]*'+escapeRegExp(token)+'[^\\n\\r]*\\1\\s*\\)');
    return pattern.test(text);
  });
}

function documentWriteInBody(body){return /\bdocument\s*\.\s*write\s*\(/.test(String(body||''));}

export function manualPolicyMutationDetails(source){
  const text=String(source||'');
  const directInstall=/\bacademiaStaticContentWritePolicy\s*\.\s*install\s*\(/.test(text);
  const directAssignment=/(?:\bOrbit\s*\.\s*store|\bstore)\s*(?:\.\s*_writePolicy|\[\s*['\"]_writePolicy['\"]\s*\])\s*=(?!=)/.test(text);
  return {directInstall,directAssignment,manualMutation:directInstall||directAssignment};
}

export function hasManualPolicyMutation(source){return manualPolicyMutationDetails(source).manualMutation;}
