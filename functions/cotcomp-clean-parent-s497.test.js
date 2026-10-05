'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const S=require('./cotcomp-clean-parent-s497');
const G=require('./cotcomp-s497-visual-contract-gate');

test('S4.97 clean parent has no legacy visual parent',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-clean-parent-s497.js'),'utf8');
  const v=G.validateSource(src);
  assert.equal(v.ok,true,JSON.stringify(v.failed,null,2));
  assert.equal(S.DEPLOYMENT_EXPORT,false);
});

test('S4.97 clean parent passes the frozen visual contract gate',()=>{
  const v=G.validateHtml(S.html(),S.manifest());
  assert.equal(v.ok,true,JSON.stringify(v.failed,null,2));
});

test('S4.97 remains fail-closed for deployment, real transport and Owner URL',()=>{
  const m=S.manifest();
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  assert.equal(m.production,false);
  assert.equal(m.ownerReviewUrlAuthorized,false);
});

test('S4.97 first-level family visuals are unique',()=>{
  const html=S.html();
  const keys=[...html.matchAll(/data-visual-asset="(family:[^"]+)"/g)].map(x=>x[1]);
  assert.equal(keys.length,7);
  assert.equal(new Set(keys).size,7);
});

test('S4.97 keeps four stages and current vehicle intake pattern',()=>{
  const h=S.html();
  for(const token of [...G.LOCK.requiredStages,...G.LOCK.requiredVehicleFields]) assert.ok(h.includes(token),token);
});

test('S4.97 never uses Newsreader as H1 and never uses 4:3 hero card',()=>{
  const h=S.html();
  assert.match(h,/\.cc-hero__title\{[^}]*font-family:'Archivo'[^}]*font-weight:900/);
  assert.doesNotMatch(h,/\.cc-hero__title\{[^}]*Newsreader/);
  assert.doesNotMatch(h,/\.cc-hero__media\{[^}]*aspect-ratio:4\/3/);
});

test('S4.97 generated inline JavaScript is syntactically valid',()=>{
  const h=S.html();
  const scripts=[...h.matchAll(/<script(?![^>]*type=["']application\/json["'])[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  assert.ok(scripts.length>0);
  scripts.forEach((src,i)=>{
    try{
      new vm.Script(src,{filename:'s497-inline-'+(i+1)+'.js'});
    }catch(err){
      const stack=String(err&&err.stack||err);
      const m=stack.match(/s497-inline-\d+\.js:(\d+)/);
      const line=m?Number(m[1]):null;
      const lines=src.split(/\r?\n/);
      const context=line?lines.slice(Math.max(0,line-4),Math.min(lines.length,line+3)).map((x,j)=>String(Math.max(1,line-3)+j).padStart(4,' ')+' | '+x).join('\n'):'';
      assert.fail(stack+(context?'\n'+context:''));
    }
  });
});

