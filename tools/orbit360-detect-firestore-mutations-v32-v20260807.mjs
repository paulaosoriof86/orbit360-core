#!/usr/bin/env node
'use strict';

function stripStringsAndComments(src){
  let out='', i=0, state='code', quote='';
  while(i<src.length){
    const c=src[i], n=src[i+1];
    if(state==='code'){
      if(c==='/'&&n==='/'){state='line'; out+='  '; i+=2; continue;}
      if(c==='/'&&n==='*'){state='block'; out+='  '; i+=2; continue;}
      if(c==='"'||c==="'"||c==='`'){state='string'; quote=c; out+=' '; i++; continue;}
      out+=c; i++; continue;
    }
    if(state==='line'){
      if(c==='\n'){state='code'; out+='\n';} else out+=' ';
      i++; continue;
    }
    if(state==='block'){
      if(c==='*'&&n==='/'){out+='  '; i+=2; state='code';} else {out+=(c==='\n'?'\n':' '); i++;}
      continue;
    }
    if(state==='string'){
      if(c==='\\'){out+='  '; i+=2; continue;}
      if(c===quote){out+=' '; i++; state='code'; continue;}
      out+=(c==='\n'?'\n':' '); i++;
    }
  }
  return out;
}

export function analyzeFirestoreMutations(source){
  const src=stripStringsAndComments(source);
  const findings=[];
  const refs=new Set(['db']);
  const batches=new Set();
  const writers=new Set();
  const txs=new Set();
  const addFinding=(kind,expr)=>findings.push({kind,expr:expr.trim().replace(/\s+/g,' ').slice(0,220)});

  const directPatterns=[
    [/\b(?:db|firestore)\s*\.\s*recursiveDelete\s*\(/g,'FIRESTORE_RECURSIVE_DELETE']
  ];
  for(const [re,kind] of directPatterns){let m;while((m=re.exec(src)))addFinding(kind,m[0]);}

  const assignRe=/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;
  let m;
  const assignments=[];
  while((m=assignRe.exec(src)))assignments.push({name:m[1],expr:m[2]});
  let changed=true, guard=0;
  while(changed&&guard++<8){
    changed=false;
    for(const a of assignments){
      const e=a.expr;
      if(!batches.has(a.name) && /\b(?:db|firestore)\s*\.\s*batch\s*\(/.test(e)){batches.add(a.name); changed=true;}
      if(!writers.has(a.name) && /\b(?:db|firestore)\s*\.\s*bulkWriter\s*\(/.test(e)){writers.add(a.name); changed=true;}
      const refExpr=/\b(?:db|firestore)\s*\.\s*collection\s*\(|\bcanonicalRef\s*\(|\blegacyRef\s*\(/.test(e) || [...refs].some(v=>new RegExp(`\\b${v}\\s*\\.\\s*(?:collection|doc)\\s*\\(`).test(e));
      if(!refs.has(a.name)&&refExpr){refs.add(a.name); changed=true;}
    }
  }

  const txRe=/\b(?:db|firestore)\s*\.\s*runTransaction\s*\(\s*(?:async\s*)?(?:\(\s*)?([A-Za-z_$][\w$]*)/g;
  while((m=txRe.exec(src)))txs.add(m[1]);

  const mutators='set|update|delete|create|add';
  for(const v of refs){
    if(v==='db') continue;
    const re=new RegExp(`\\b${v}\\s*\\.\\s*(${mutators})\\s*\\(`,'g');
    while((m=re.exec(src))) addFinding('FIRESTORE_REFERENCE_MUTATION', `${v}.${m[1]}(`);
  }
  for(const v of batches){
    const re=new RegExp(`\\b${v}\\s*\\.\\s*(set|update|delete|create)\\s*\\(`,'g');
    while((m=re.exec(src))) addFinding('FIRESTORE_BATCH_MUTATION', `${v}.${m[1]}(`);
  }
  for(const v of writers){
    const re=new RegExp(`\\b${v}\\s*\\.\\s*(set|update|delete|create)\\s*\\(`,'g');
    while((m=re.exec(src))) addFinding('FIRESTORE_BULKWRITER_MUTATION', `${v}.${m[1]}(`);
  }
  for(const v of txs){
    const re=new RegExp(`\\b${v}\\s*\\.\\s*(set|update|delete|create)\\s*\\(`,'g');
    while((m=re.exec(src))) addFinding('FIRESTORE_TRANSACTION_MUTATION', `${v}.${m[1]}(`);
  }

  const chainPatterns=[
    [/\b(?:db|firestore)\s*\.\s*collection\s*\([^;\n]*?\)\s*\.\s*doc\s*\([^;\n]*?\)\s*\.\s*(set|update|delete|create)\s*\(/g,'FIRESTORE_DIRECT_DOC_MUTATION'],
    [/\b(?:db|firestore)\s*\.\s*collection\s*\([^;\n]*?\)\s*\.\s*add\s*\(/g,'FIRESTORE_DIRECT_COLLECTION_ADD']
  ];
  for(const [re,kind] of chainPatterns){while((m=re.exec(src)))addFinding(kind,m[0]);}

  return {ok:findings.length===0,findings,provenance:{refs:[...refs].sort(),batches:[...batches].sort(),writers:[...writers].sort(),transactions:[...txs].sort()}};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const fs=await import('node:fs');
  const p=process.argv[2];
  if(!p) throw new Error('PATH_REQUIRED');
  const out=analyzeFirestoreMutations(fs.readFileSync(p,'utf8'));
  console.log(JSON.stringify(out,null,2));
  process.exit(out.ok?0:41);
}
