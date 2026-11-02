import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {frozenEntriesUnchanged} from './gravicentra-b4-003-real-country-index-evidence-successor.mjs';

test('a genuinely additive successor keeps the historical country evidence valid',()=>{
 const certified={a:{status:'PASS',checks:[1,2]},b:{released:false}};
 const next={...certified,newP0:{status:'PENDING'}};
 assert.equal(frozenEntriesUnchanged(certified,next),true);
});

test('a changed or removed historical entry is rejected',()=>{
 const frozen={a:{country:'GT',mode:'READONLY'},b:{allowWrites:false}};
 assert.equal(frozenEntriesUnchanged(frozen,{a:{country:'CO',mode:'READONLY'},b:{allowWrites:false}}),false);
 assert.equal(frozenEntriesUnchanged(frozen,{a:frozen.a}),false);
});

test('nested historical receipts are compared structurally, not by insertion order',()=>{
 const frozen={rec:{mode:'READONLY',result:{GT:1,CO:31}}};
 assert.equal(frozenEntriesUnchanged(frozen,{rec:{result:{CO:31,GT:1},mode:'READONLY'},next:{}}),true);
 assert.equal(frozenEntriesUnchanged(frozen,{rec:{result:{CO:30,GT:1},mode:'READONLY'}}),false);
});

test('empty/null control snapshots fail closed',()=>{
 assert.equal(frozenEntriesUnchanged(null,{}),false);
 assert.equal(frozenEntriesUnchanged({},null),false);
});

test('country-index governance guard pins the original receipt commit, not current HEAD diff',()=>{
 const code=readFileSync(new URL('./gravicentra-b4-003-real-country-index-evidence-successor.mjs',import.meta.url),'utf8');
 assert.match(code,/const CERTIFIED='9d1839da8717757baf9adbf1fdfad83cddc41791'/);
 assert.match(code,/changed\(BASE,CERTIFIED\)/);
 assert.doesNotMatch(code,/changed\(BASE,head\)/);
 assert.match(code,/blob\(head,file\)===blob\(CERTIFIED,file\)/);
 assert.match(code,/CERTIFIED_EVIDENCE_NOT_ANCESTOR/);
 assert.match(code,/PHYSICAL_INDEX_AGGREGATE_INVALID/);
 assert.match(code,/migrationApplyAuthorized:false/);
});
