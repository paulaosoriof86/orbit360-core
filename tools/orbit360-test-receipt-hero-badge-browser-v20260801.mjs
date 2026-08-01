#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {settleBlockingGates} from './orbit360-browser-blocking-gate-readiness-v20260730.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/receipt-hero-badge-browser-v20260801.json');
const url=String(process.env.ORBIT360_LAB_URL||'').trim();
const email=String(process.env.ORBIT360_LAB_LOGIN_EMAIL||'').trim();
const password=String(process.env.ORBIT360_LAB_LOGIN_PASSWORD||'');
const EXPECT={clientes:430,aseguradoras:30,asesores:7,polizas:1373,vehiculos:1032,recibosEsperados:1293,carteraPrimas:673,cobros:0,finmovs:0};
const report={schemaVersion:'orbit360-receipt-hero-badge-browser-v1',generatedAt:new Date().toISOString(),ok:false,status:'INIT',check:'RECEIPT_HERO_BADGE_COMPACT',readOnly:true,firestoreWrites:0,operationalWrites:0,hostingDeployExecutions:0,production:false,containsPII:false,containsSecrets:false};
const save=()=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');};
async function route(page,hash){const key=String(hash||'').replace(/^#\/?/,'').split('?')[0]||'inicio';await page.evaluate(h=>{if(location.hash===h)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=h;},hash);await page.waitForFunction(expected=>window.Orbit&&Orbit.route&&Orbit.route.key===expected,key,{timeout:15000,polling:50});await page.waitForTimeout(300);}
async function role(page,name){const ok=await page.evaluate(target=>{const sel=document.getElementById('rol-sel');if(sel){const o=Array.from(sel.options||[]).find(x=>String(x.value||'')===target||String(x.textContent||'').trim()===target);if(o){sel.value=o.value;sel.dispatchEvent(new Event('change',{bubbles:true}));return true;}}return !!(Orbit.session&&Orbit.session.set&&Orbit.session.set(target));},name);if(!ok)throw new Error('ROLE_SELECTION_FAILED');await page.waitForFunction(target=>Orbit.session&&Orbit.session.rol&&Orbit.session.rol()===target,name,{timeout:12000});}

let browser;
try{
  if(!/^https:\/\//.test(url)||!email.includes('@')||password.length<8)throw new Error('LAB_INPUT_REQUIRED');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e&&e.message||e).slice(0,120)));
  const entry=new URL(url);entry.searchParams.set('orbitBackend','firestore-lab');entry.searchParams.set('tenant','alianzas-soluciones');
  await page.goto(entry.toString(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#login-form').waitFor({state:'visible',timeout:20000});
  await page.fill('#lg-user',email);await page.fill('#lg-pass',password);await page.click('#login-form button[type="submit"]');
  await page.waitForFunction(()=>window.Orbit&&Orbit.store&&typeof Orbit.store.all==='function',undefined,{timeout:30000});
  const gates=await settleBlockingGates(page,{arrivalWindowMs:1500,quietWindowMs:500,pollMs:80,hardTimeoutMs:6000,detachTimeoutMs:12000});
  if(!gates||!gates.ok||gates.remaining!==0)throw new Error('BLOCKING_GATE_NOT_SETTLED');
  await page.waitForFunction(expected=>{if(!window.Orbit||!Orbit.store)return false;for(const [n,v] of Object.entries(expected))if((Orbit.store.all(n)||[]).length!==v)return false;const p=Orbit.store._receiptsPortfolioProjectionStatus&&Orbit.store._receiptsPortfolioProjectionStatus();return !!(p&&p.ready&&p.counts&&p.counts.recibosEsperados===expected.recibosEsperados&&p.counts.carteraPrimas===expected.carteraPrimas);},EXPECT,{timeout:90000,polling:250});
  await role(page,'Dirección');
  const sample=await page.evaluate(()=>{const rows=Orbit.store.all('recibosEsperados')||[];const r=rows.find(x=>x&&x.id&&x.clienteId)||null;return r?{id:r.id,clienteId:r.clienteId}:null;});
  if(!sample)throw new Error('RECEIPT_SAMPLE_UNAVAILABLE');
  await route(page,`#/cliente360?c=${sample.clienteId}&t=recibos`);
  await page.locator('#rp-v910-policy').waitFor({state:'visible',timeout:12000});
  const row=page.locator(`[data-rp-receipt-id="${sample.id}"]`);await row.waitFor({state:'visible',timeout:12000});await row.click();
  await page.locator('[data-rp-receipt-detail="1"]').waitFor({state:'visible',timeout:12000});
  await page.locator('[data-rp-hero-status="1"]').waitFor({state:'visible',timeout:12000});
  const m=await page.evaluate(()=>{const hero=document.querySelector('[data-rp-receipt-hero="1"]'),badge=document.querySelector('[data-rp-hero-status="1"]');if(!hero||!badge)return null;const hb=hero.getBoundingClientRect(),bb=badge.getBoundingClientRect(),hc=getComputedStyle(hero),bc=getComputedStyle(badge);return{heroHeight:Math.round(hb.height),badgeHeight:Math.round(bb.height),badgeWidth:Math.round(bb.width),heightRatio:Number((bb.height/Math.max(1,hb.height)).toFixed(3)),heroAlignItems:hc.alignItems,badgeAlignSelf:bc.alignSelf,badgeFlexGrow:bc.flexGrow,badgeFlexShrink:bc.flexShrink,badgeFlexBasis:bc.flexBasis,badgeDisplay:bc.display,badgeVisibility:bc.visibility,badgeOpacity:Number(bc.opacity||1)};});
  if(!m)throw new Error('RECEIPT_HERO_BADGE_MISSING');
  const compact=m.badgeHeight>0&&m.badgeHeight<=32&&m.heroHeight>m.badgeHeight&&m.heightRatio<=0.55&&m.heroAlignItems==='flex-start'&&m.badgeAlignSelf==='flex-start'&&m.badgeFlexGrow==='0'&&m.badgeFlexShrink==='0'&&m.badgeDisplay!=='none'&&m.badgeVisibility!=='hidden'&&m.badgeOpacity>0;
  report.metrics=m;report.pageErrors=pageErrors.length;report.ok=compact&&pageErrors.length===0;report.status=report.ok?'RECEIPT_HERO_BADGE_BROWSER_PASS':'RECEIPT_HERO_BADGE_BROWSER_FAIL';
  if(!report.ok)process.exitCode=41;
}catch(e){report.ok=false;report.status='RECEIPT_HERO_BADGE_BROWSER_FAIL';report.error=String(e&&e.message||e).replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').slice(0,180);process.exitCode=41;}finally{if(browser)await browser.close().catch(()=>{});save();}
