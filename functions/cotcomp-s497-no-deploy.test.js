'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('S4.97 clean parent is not exported by bootstrap',()=>{
  const bootstrap=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');
  assert.equal(bootstrap.includes("require('./cotcomp-clean-parent-s497')"),false);
  assert.equal(bootstrap.includes('cotcompCleanParentS497'),false);
});

test('S4.97 source has no firebase onRequest deployment surface',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-clean-parent-s497.js'),'utf8');
  assert.equal(src.includes("require('firebase-functions"),false);
  assert.equal(src.includes('onRequest('),false);
  assert.equal(src.includes('module.exports.cotcomp'),false);
});
