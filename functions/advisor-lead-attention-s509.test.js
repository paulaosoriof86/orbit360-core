'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./advisor-lead-attention-s509');
const fs=require('node:fs');
const path=require('node:path');

test('attention helpers recognize active targeted lead-create notices',()=>{
  assert.equal(s.__advisorLeadAttentionS509.activeMember({active:true,status:'active'}),true);
  assert.equal(s.__advisorLeadAttentionS509.activeMember({active:false,status:'active'}),false);
  assert.equal(s.__advisorLeadAttentionS509.advisorIdOf({advisorId:'adv-1'}),'adv-1');
  assert.equal(s.__advisorLeadAttentionS509.targetsAdvisor({targets:[{type:'advisor',id:'adv-1'}]},'adv-1'),true);
  assert.equal(s.__advisorLeadAttentionS509.isLeadCreate({operation:'create_business',entityType:'negocios'}),true);
  assert.equal(s.__advisorLeadAttentionS509.isLeadCreate({operation:'create_management',entityType:'gestiones'}),false);
});

test('attention receipt id is deterministic and scoped by uid + event',()=>{
  const a=s.__advisorLeadAttentionS509.receiptId('uid-1','evt-1');
  const b=s.__advisorLeadAttentionS509.receiptId('uid-1','evt-1');
  const c=s.__advisorLeadAttentionS509.receiptId('uid-2','evt-1');
  assert.equal(a,b);
  assert.notEqual(a,c);
  assert.match(a,/^att_[a-f0-9]{40}$/);
});

test('LAB client auto-opens unseen leads on authenticated entry, clears on Leads and polls every 30s',()=>{
  const p=path.join(__dirname,'..','orbit360-platform','core','advisor-lead-attention-s509.js');
  const src=fs.readFileSync(p,'utf8');
  assert.match(src,/if\(initial\)\{\s*await openLeads\(ids,true\)/);
  assert.match(src,/poll\(true\)/);
  assert.doesNotMatch(src,/sessionStorage/);
  assert.match(src,/location\.hash='#\/leads'/);
  assert.match(src,/hashchange/);
  assert.match(src,/acknowledgeVisibleLeadAttention/);
  assert.match(src,/lead-attention-s509-close/);
  assert.match(src,/setInterval\(\(\)=>poll\(false\),30000\)/);
  assert.match(src,/Tienes un nuevo lead asignado/);
  assert.doesNotMatch(src,/wa\.me|mailto:|sendgrid|twilio/i);
});
