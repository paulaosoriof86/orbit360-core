import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { waitForRealTenantData, validateClient360 } from './orbit360-runtime-check-client360-v20260716.mjs';
import { waitForProductBootstrap, authenticateWithOwner, acceptLegalOnce } from './orbit360-gate-bootstrap-auth-legal-v20260717.mjs';
import { readGateEnvironment } from './orbit360-gate-environment-v20260717.mjs';

const { baseUrl, email, accessValue:key, runtime }=readGateEnvironment();
const dirs=['orbit360-platform/runtime-gate-crm-v20260716','orbit360-platform/runtime-gate-aseguradoras-v20260716'];
const mapped=/Aseguradora Guatemalteca|AseGuate|Seguros BAM|Aseguradora Rural|Banrural|Bantrab|Seguros Columna|Seguros Universales/i;
const report={schemaVersion:'orbit360-runtime-gate-joint-v19-preauth-fail-closed',gateId:'block1-client360-insurers-lab-v20260717',contractVersion:'1.0.11',runtimeVersion:runtime,generatedAt:new Date().toISOString(),containsPII:false,containsSecrets:false,stage:'bootstrap',checks:{}};
if(!/^https:\/\//.test(baseUrl))throw new Error('BLOQUEO_PREVIEW_URL');
if(key.length<12)throw new Error('BLOQUEO_ACCESO_LAB');
if(!/^\d{8}-\d+$/.test(runtime))throw new Error('BLOQUEO_RUNTIME_VERSION');
dirs.forEach(d=>mkdirSync(d,{recursive:true}));
const save=()=>{const p=JSON.stringify(report,null,2)+'\n';dirs.forEach(d=>writeFileSync(`${d}/resultado-sanitizado.json`,p));};
const stage=s=>{report.stage=s;console.log(`ORBIT360_GATE_STAGE:${s}`);};
const requireState=(v,c,d='')=>{if(!v)throw new Error(c+(d?`:${d}`:''));};
async function bounded(name,fn,ms=15000){stage(name);let t;try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,r)=>{t=setTimeout(()=>r(new Error(`PIPELINE_STEP_TIMEOUT:${name}`)),ms);})]);}finally{clearTimeout(t);}}
let browser;
const watchdog=setTimeout(()=>{report.ok=false;report.error=`GATE_TIMEOUT:${report.stage}`;save();process.exit(124);},300000);

async function selectRole(page,label){
  const select=page.locator('#rol-sel');await select.waitFor({state:'attached',timeout:15000});
  const options=await select.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,text:String(node.textContent||'').trim()})));
  const match=options.find(item=>item.text.toLowerCase().includes(label.toLowerCase()));
  requireState(match,'ROLE_OPTION_NOT_FOUND',label);await select.selectOption(match.value);await page.waitForTimeout(700);
}
async function validateInsurers(page,label,advisor=false){
  await page.evaluate(()=>{location.hash='#/aseguradoras';});
  const cards=page.locator('.asg-grid [data-asg]');await cards.first().waitFor({state:'visible',timeout:20000});
  const count=await cards.count();requireState(count===26,'INSURER_CARD_COUNT_INVALID',`${label}:${count}`);
  requireState(/\bGT\b/.test(String(await cards.first().innerText())),'GT_NOT_FIRST',label);
  requireState(await page.locator('#asg-order').count()===1,'INSURER_ORDER_CONTROL_MISSING',label);
  const card=cards.filter({hasText:mapped}).first();requireState(await card.count()>0,'MAPPED_INSURER_CARD_NOT_FOUND',label);await card.click();
  await page.locator('#asg-ficha').waitFor({state:'visible',timeout:15000});
  requireState(await page.locator('#af-guardar').count()===0,'INSURER_SAVE_VISIBLE_IN_READ_MODE',label);
  if(advisor)requireState(await page.locator('#af-editar').count()===0,'ADVISOR_INSURER_EDIT_VISIBLE');
  const owner=await page.evaluate(()=>{const m=window.Orbit&&Orbit.modules&&Orbit.modules.aseguradoras;return Boolean(m&&m.__ownerKnowledgeV20260717&&m.__tenantOrderV20260717&&m.__consumerGatesSeparatedV20260717);});
  requireState(owner,'INSURER_OWNER_CONTRACT_NOT_ACTIVE',label);
  await page.locator('[data-tab="tarifas"]').click();
  await page.waitForFunction(()=>/Mapeado|Persistido|Validado|Conocimiento/i.test(String((document.querySelector('#af-body')||{}).textContent||'')),null,{timeout:15000});
  report[`${label}InsurerCards`]=count;report[`${label}KnowledgeVisible`]=true;
}
async function validateMobileMenu(page){
  await page.locator('#burger').click();await page.waitForTimeout(350);
  const labels=await page.locator('#sidebar .nav-link:visible').evaluateAll(nodes=>nodes.map(node=>String(node.textContent||'').replace(/\s+/g,' ').trim()));
  requireState(labels.length>1,'MOBILE_MENU_ONLY_HOME',String(labels.length));
  requireState(labels.some(label=>/Cliente/i.test(label)),'MOBILE_MENU_CLIENTES_MISSING');
  requireState(labels.some(label=>/Aseguradoras/i.test(label)),'MOBILE_MENU_INSURERS_MISSING');
  report.mobileMenuVisibleModules=labels.length;report.checks.mobileMenuComplete=true;
}

browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(45000);
try{
  stage('open_lab_preview');await page.goto(`${baseUrl}/ays-lab-preview.html`,{waitUntil:'domcontentloaded',timeout:60000});
  await waitForProductBootstrap(page,{runtime,bounded,requireState,report});
  await authenticateWithOwner(page,{email,key,runtime,bounded,requireState,report});
  await acceptLegalOnce(page,{bounded,requireState,report});
  stage('real_tenant_data');report.storeCounts=await waitForRealTenantData(page,26);
  await selectRole(page,'Dirección');stage('desktop_direction_client360');await validateClient360(page,report,'desktopDirection');stage('desktop_direction_aseguradoras');await validateInsurers(page,'desktopDirection');report.checks.desktopDirection=true;
  await page.setViewportSize({width:820,height:1180});await selectRole(page,'Operativo');stage('tablet_operativo_client360');await validateClient360(page,report,'tabletOperativo');stage('tablet_operativo_aseguradoras');await validateInsurers(page,'tabletOperativo');report.checks.tabletOperativo=true;
  await page.setViewportSize({width:390,height:844});await selectRole(page,'Asesor');stage('mobile_asesor_menu');await validateMobileMenu(page);stage('mobile_asesor_client360');await validateClient360(page,report,'mobileAsesor');stage('mobile_asesor_aseguradoras');await validateInsurers(page,'mobileAsesor',true);report.checks.mobileAsesor=true;
  Object.assign(report.checks,{realClientCount:report.storeCounts.clientes===414,realInsurerCount:report.storeCounts.aseguradoras===26,realAdvisorCount:report.storeCounts.asesores===7,allTenTabs:true,gtFirst:true,insurerReadMode:true,insurerKnowledgeVisible:true});
  report.ok=Object.values(report.checks).every(Boolean);stage('completed');
}catch(error){report.ok=false;report.error=String(error&&(error.stack||error.message||error)).replace(/\s+/g,' ').trim();}
finally{save();stage('closing_browser');await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,10000))]);clearTimeout(watchdog);}
console.log(`ORBIT360_RUNTIME_GATE_JOINT:${JSON.stringify({ok:report.ok,stage:report.stage,runtimeVersion:report.runtimeVersion,counts:report.storeCounts||{},checks:report.checks,error:report.error||''})}`);
process.exit(report.ok?0:1);
