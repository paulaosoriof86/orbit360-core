#!/usr/bin/env node
'use strict';
import assert from 'node:assert/strict';
import {analyzeFirestoreMutations} from './orbit360-detect-firestore-mutations-v32-v20260807.mjs';

const negatives=[
  `const c=crypto.createCipheriv('aes-256-gcm',k,iv); const x=c.update(plain);`,
  `const m=new Map(); m.set('a',1); m.delete('a');`,
  `const arr=[]; arr.push(1); const obj={update(){}}; obj.update();`,
  `const refs=await canonicalRef(db,'clientes').listDocuments(); const snaps=await db.getAll(...refs);`
];
for(const source of negatives)assert.equal(analyzeFirestoreMutations(source).ok,true,source);

const positives=[
  `const ref=db.collection('x').doc('y'); await ref.update({a:1});`,
  `const col=db.collection('x'); await col.add({a:1});`,
  `const batch=db.batch(); batch.set(db.collection('x').doc('y'),{a:1});`,
  `const writer=db.bulkWriter(); writer.create(db.collection('x').doc('y'),{a:1});`,
  `await db.runTransaction(async tx=>{tx.update(db.collection('x').doc('y'),{a:1});});`,
  `await db.collection('x').doc('y').delete();`,
  `await db.collection('x').add({a:1});`
];
for(const source of positives)assert.equal(analyzeFirestoreMutations(source).ok,false,source);

console.log(JSON.stringify({schemaVersion:'orbit360-v32-semantic-mutation-fixtures-v1',status:'PASS_V32_SEMANTIC_MUTATION_FIXTURES',negativeAllowed:negatives.length,positiveBlocked:positives.length,containsPII:false,firebaseAccess:false,writes:0,ok:true}));
