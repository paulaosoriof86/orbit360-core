import fs from 'node:fs';
import vm from 'node:vm';

const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>fs.readFileSync(p,'utf8');

const files={
  client:read('orbit360-platform/modules/cliente360.js'),
  insurers:read('orbit360-platform/modules/aseguradoras.js'),
  crmBridge:read('orbit360-platform/modules/crm-v1198-operational-bridge.js'),
  accessScope:read('orbit360-platform/core/access-scope.js'),
  bridge:read('orbit360-platform/modules/policy-receipts-v1199-bridge.js'),
  engine:read('orbit360-platform/core/policy-receipts-engine.js'),
  refinements:read('orbit360-platform/core/policy-receipts-v1199-refinements.js'),
  issuance:read('orbit360-platform/core/issuance-workflow-v1201.js'),
  issuanceRefinements:read('orbit360-platform/core/issuance-workflow-v1201-refinements.js'),
  issuanceBridge:read('orbit360-platform/modules/issuance-endosos-v1201-bridge.js'),
  receiptsProjection:read('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js'),
  detail:read('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'),
  academia:read('orbit360-platform/modules/academia.js'),
  academiaCatalog:read('orbit360-platform/data/academia-product-catalog-v1.js'),
  academiaOwner:read('orbit360-platform/core/academia-product-catalog-p0.js'),
  runtimeConfig:read('orbit360-platform/product-runtime-config.js'),
  accessPolicy:read('orbit360-platform/core/tenant-access-policy-contract-p0.js'),
  config:read('orbit360-platform/core/config.js'),
  router:read('orbit360-platform/core/router.js'),
  productApp:read('orbit360-platform/core/product-app-p0.js'),
  credentialProvider:read('orbit360-platform/core/product-insurer-credential-provider-p0.js'),
  domainConfig:read('orbit360-platform/core/tenant-domain-config-client.js'),
  credentialBackend:read('functions/product-insurer-credentials.js'),
  operationalBackend:read('functions/product-operational-domain.js'),
  opsBackend:read('functions/product-ops-leads-domain.js'),
  operationalStore:read('orbit360-platform/data/store-firestore-product-operational-p0.js'),
  cobros:read('orbit360-platform/modules/cobros.js'),
  cobrosClosure:read('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js'),
  inicio:read('orbit360-platform/modules/inicio.js'),
  index:read('orbit360-platform/index.html')
};

const asesorRoleSlice=files.config.slice(files.config.indexOf("'Asesor':"),files.config.indexOf("'Asistente':"));
need(asesorRoleSlice.includes("'comparativo'"),'B2_R4_ASESOR_COMPARATIVO_BASE_MISSING');
need(files.accessScope.includes('async function correction')&&files.accessScope.includes("insertDurable('gestiones'"),'B2_R4_OPS_CORRECTION_NOT_DURABLE');
need(files.crmBridge.includes('await A.correction')&&files.crmBridge.includes('Solicitud creada y confirmada en Ops'),'B2_R4_CRM_FALSE_SUCCESS_NOT_CLOSED');
need(files.bridge.includes('await A.correction')&&files.bridge.includes('Solicitud creada y confirmada en Ops'),'B2_R4_POLICY_FALSE_SUCCESS_NOT_CLOSED');
need(files.opsBackend.includes('SELF_SERVICE_ROLES')&&files.opsBackend.includes('orbit360OpsLeadsCommandPreview')&&files.opsBackend.includes('canonicalReadback:true'),'B2_R4_OPS_SELF_SERVICE_PREVIEW_READBACK_MISSING');
need(files.operationalStore.includes('WORKFLOW_PREVIEW_COMMAND')&&files.operationalStore.includes("action==='insert')requireServerReadback"),'B2_R4_OPS_PREVIEW_ROUTING_READBACK_MISSING');
need(files.client.includes('vehicleLineageRoot')&&files.client.includes('data-vehicle-identity-incomplete')&&files.client.includes('versionOfVehicleId'),'B2_R5_VEHICLE_HISTORY_PRESENTATION_MISSING');
need(files.detail.includes('Tu rol activo es de consulta')&&files.detail.includes('data-policy-context-vehicle')&&files.detail.includes('Vigencia seleccionada:')&&files.detail.includes('Otras vigencias con el mismo número')&&!files.detail.includes('Versión física de póliza')&&!files.detail.includes('Vehículo ID'),'B2_R5_POLICY_VEHICLE_CONTEXT_MISSING');
need(files.insurers.includes('Preview protege las aseguradoras reales'),'B2_R4_INSURER_PREVIEW_TRUTH_MISSING');
need(files.engine.includes('async function updateReceipt')&&files.engine.includes('recibo_con_evidencia_pago_protegido')&&files.receiptsProjection.includes('data-rp-edit-receipt'),'B2_R5_INDIVIDUAL_RECEIPT_EDIT_MISSING');
need(files.cobros.includes('reportedPaymentEvidence')&&files.cobros.includes('data-reported-payment-evidence')&&files.cobros.includes('no se contabilizan como cobros confirmados'),'B2_R5_REPORTED_PAYMENT_PROJECTION_MISSING');
need(files.cobrosClosure.includes('reportedPaymentRows')&&files.cobrosClosure.includes('data-reported-payment-evidence')&&files.cobrosClosure.includes('No se contabilizan como cobros confirmados'),'B2_R5_EFFECTIVE_COBROS_OWNER_DROPS_REPORTED_PAYMENT');
need(files.inicio.includes('registros vencidos en cartera'),'B2_R5_INICIO_COBROS_CARTERA_LABEL_DRIFT');
need(files.client.includes("Usa Guardar cambios o Cancelar"),'B2_CLIENT_EDIT_BACKDROP_GUARD_MISSING');
need(!files.insurers.includes("title: 'Orbit Aseguradoras'")&&files.insurers.includes("title: 'Aseguradoras'"),'B2_ASEGURADORAS_VISIBLE_ORBIT_BRAND_REMAINS');
need(!files.client.includes('<b>Orbit Finanzas</b>'),'B2_CLIENT360_VISIBLE_ORBIT_FINANZAS_REMAINS');
need(files.client.includes("Usa Crear cliente o Cancelar"),'B2_CLIENT_CREATE_BACKDROP_GUARD_MISSING');
need(files.client.includes("await S().batchDurable"),'B2_CLIENT_DURABLE_SAVE_MISSING');
new Function(files.crmBridge);
need(!files.crmBridge.includes("\\`")&&!files.crmBridge.includes("\\${"),'B2_CRM_V1198_ESCAPED_TEMPLATE_LITERAL_REGRESSION');
need(files.accessScope.includes("return { exact: exact, probable: probable };"),'B2_DUPLICATE_PRODUCER_CONTRACT_MISSING');
need(!files.crmBridge.includes("dup.filter(")&&!files.crmBridge.includes("if (dup.length)"),'B2_DUPLICATE_ARRAY_CONSUMER_REGRESSION');
need(files.crmBridge.includes("Array.isArray(dup.exact)")&&files.crmBridge.includes("Array.isArray(dup.probable)")&&files.crmBridge.includes("const probable = dup.probable;"),'B2_DUPLICATE_CONSUMER_CONTRACT_MISSING');
need(files.crmBridge.includes("No fue posible validar duplicados; no se creó el cliente."),'B2_DUPLICATE_CONTRACT_FAIL_CLOSED_MISSING');
need(files.crmBridge.includes("mod.nuevoCliente = openNewClient"),'B2_ACTIVE_CLIENT_MODAL_OWNER_MISSING');
const activeClientOwner=(files.crmBridge.match(/function openNewClient\(\)\s*\{[\s\S]*?\n  function [A-Za-z0-9_]+\(/)||[])[0]||'';
need(activeClientOwner,'B2_ACTIVE_CLIENT_OWNER_SLICE_MISSING');
need(activeClientOwner.includes("await store.batchDurable"),'B2_ACTIVE_CLIENT_CREATE_DURABLE_SAVE_MISSING');
need(activeClientOwner.includes("Usa Crear cliente o Cancelar"),'B2_ACTIVE_CLIENT_CREATE_BACKDROP_GUARD_MISSING');
need(!activeClientOwner.includes("if (e.target === back) close();"),'B2_ACTIVE_CLIENT_CREATE_BACKDROP_CLOSE_STILL_PRESENT');
need(files.crmBridge.includes("Identidad y contacto")&&files.crmBridge.includes("Contexto y seguimiento"),'B2_ACTIVE_CLIENT_MODAL_VISUAL_HIERARCHY_MISSING');
need(files.bridge.includes('data-advisor'),'B2_POLICY_ADVISOR_SELECTOR_MISSING');
need(files.bridge.includes('gi-form-section-title')&&files.bridge.includes('gi-policy-preview'),'B2_POLICY_EDITOR_VISUAL_HIERARCHY_MISSING');
need(files.bridge.includes('data-client-search'),'B2_POLICY_CLIENT_SEARCH_MISSING');
need(files.bridge.includes('syncInstallments'),'B2_POLICY_FREQUENCY_UI_SYNC_MISSING');
need(files.engine.includes('function installmentsForFrequency'),'B2_POLICY_FREQUENCY_ENGINE_RULE_MISSING');
need(files.detail.includes('gi-policy-hero')&&files.detail.includes('gi-detail-kpis'),'B2_POLICY_FULLPAGE_VISUAL_HIERARCHY_MISSING');
need(files.detail.includes('gi-receipt-detail'),'B2_RECEIPT_DETAIL_VISUAL_HIERARCHY_MISSING');
need(files.detail.includes('✏️ Editar póliza'),'B2_POLICY_EDIT_ACTION_MISSING');
need(files.detail.includes('Vehículo pendiente de vincular a esta póliza')&&files.detail.includes('Vincular vehículo a esta póliza')&&files.detail.includes('vehicleCandidates')&&files.engine.includes('async function linkVehicleToPolicy'),'B2_MISSING_VEHICLE_RELATION_TRUTHFUL_ACTION_MISSING');
for(const marker of ['data-vbrand','data-vline','data-vplate','data-vyear','data-vuse','data-vcolor','data-vvin','data-vchasis','data-vmotor'])need(files.bridge.includes(marker),'B2_VEHICLE_FIELD_MISSING:'+marker);
need(files.bridge.includes("save.textContent = 'Guardando…'"),'B2_POLICY_SAVE_PENDING_STATE_MISSING');
need(!files.bridge.includes("if (e.target === b) close();"),'B2_POLICY_BACKDROP_CLOSE_STILL_PRESENT');
need(files.engine.includes("action:prior?'update':'insert',collection:'vehiculos'"),'B2_VEHICLE_UPSERT_MISSING');
need(files.issuance.includes('async function createRequest')&&files.issuance.includes("await S().insertDurable('gestiones', request)"),'B2_ISSUANCE_CREATE_NOT_DURABLE');
need(files.issuance.includes('async function advanceRequest')&&files.issuance.includes("await S().updateDurable('gestiones', id, next)"),'B2_ISSUANCE_ADVANCE_NOT_DURABLE');
need(files.issuanceRefinements.includes('I.advanceRequest = async function')&&files.issuanceRefinements.includes('return await originalAdvance')&&files.issuanceRefinements.includes('I.issueRequest = async function')&&files.issuanceRefinements.includes('return await originalIssue'),'B2_ISSUANCE_REFINEMENTS_NOT_ASYNC');
need(files.issuanceBridge.includes('await I.createRequest')&&files.issuanceBridge.includes('await I.advanceRequest'),'B2_ISSUANCE_UI_CREATE_ADVANCE_NOT_AWAITED');
need(files.issuance.includes('async function issueRequest'),'B2_ISSUANCE_NOT_ASYNC');
need(files.issuance.includes('await P().createPolicy'),'B2_ISSUANCE_CREATE_NOT_AWAITED');
need(files.issuance.includes("await S().updateDurable('polizas', source.id")&&files.issuance.includes("await S().updateDurable('gestiones', request.id")&&files.issuance.includes("renovadaPor: policy.id")&&files.issuance.includes("policyCreatedId: policy.id"),'B2_RENEWAL_DURABLE_CLOSURE_MISSING');
need(!files.issuance.includes("S().update('polizas', source.id"),'B2_RENEWAL_SOURCE_LINK_FIRE_AND_FORGET_REMAINS');
need(files.issuanceBridge.includes("onclick = async"),'B2_ISSUANCE_UI_NOT_ASYNC');
need(files.issuanceBridge.includes('await I.issueRequest'),'B2_ISSUANCE_UI_NOT_AWAITED');
need(files.receiptsProjection.includes('Orbit.receiptsPortfolioProjection=Orbit.receiptsPortfolioProjectionV920'),'B2_RECEIPTS_CANONICAL_PROJECTION_MISSING');
need(files.detail.includes('Editar vehículo'),'B2_VEHICLE_EDIT_ACTION_MISSING');
need(files.bridge.includes('function openVehicleForm(vehicleId)')&&files.bridge.includes('clientMod.editarVehiculo=function(vehicleId)'),'B2_DEDICATED_VEHICLE_EDITOR_MISSING');
need(files.bridge.includes("if (existing && !reason)")&&files.engine.includes("if(!clean(options.motivo))return{ok:false,errors:['motivo_requerido']"),'B2_POLICY_REASON_FAIL_CLOSED_MISSING');
need(files.detail.includes("out.formaPago = first(p.formaPago, p.metodoPago)")&&files.detail.includes("out.conducto = first(p.conducto, p.conductoPago)")&&!files.detail.includes("out.formaPago = first(p.formaPago, p.conductoPago"),'B2_PAYMENT_CONDUCT_CROSS_FALLBACK_REMAINS');
need(files.detail.includes('Base imponible para IVA')&&!files.detail.includes("['Base gravable', pb.taxable]"),'B2_TAXABLE_BASE_UI_SEMANTIC_NOT_FIXED');
need(files.receiptsProjection.includes("clientWrapper=function(host){var out=cr(host);patchClient(host);return out;}")&&!files.receiptsProjection.includes("setTimeout(function(){patchHeader(cid)"),'B2_RECEIPT_DOUBLE_RENDER_RACE_REMAINS');
need(files.receiptsProjection.includes('Datos actualizados al')&&files.receiptsProjection.includes('Detalles de origen y auditoría')&&files.receiptsProjection.includes('Documento de origen')&&!files.receiptsProjection.includes('<h3 style="margin-top:0;font-size:17px;font-weight:800">📎 Origen del dato'),'B2_RECEIPT_DETAIL_TECHNICAL_UI_REMAINS');
need(files.insurers.includes('id="af-logo-file"')&&files.insurers.includes('orbit360ProductAssetUploadPreview')&&files.insurers.includes("'logoAssetRef'"),'B2_INSURER_LOGO_NOT_ADMINISTRABLE');
need(files.operationalBackend.includes('exports.orbit360ProductAssetUploadPreview')&&files.operationalBackend.includes("previewOnly===true")&&files.operationalBackend.includes("getStorage"),'B2_INSURER_LOGO_SERVER_OWNER_MISSING');
need(files.credentialBackend.includes("'operativo']")&&files.credentialBackend.includes("previewSecretPattern:'orbit360-insurer-credentials-preview-{tenantId}'")&&files.credentialBackend.includes("importEnabled:true")&&!files.credentialBackend.includes("Importación deshabilitada en Preview"),'B2_INSURER_CREDENTIAL_PREVIEW_CONTRACT_INVALID');
need(files.credentialProvider.includes('importCredentials')&&files.credentialProvider.includes('previewCleanup:cleanupPreview')&&files.credentialProvider.includes("operation:'delete_preview'"),'B2_INSURER_CREDENTIAL_PRODUCT_PROVIDER_CONTRACT_MISSING');
need(files.insurers.includes('provider.importCredentials'),'B2_INSURER_DIRECT_CREDENTIAL_IMPORT_MISSING');
need(files.domainConfig.includes("tenant-domain-config-client-v3")&&files.domainConfig.includes("dispatchEvent(new CustomEvent('orbit:domain-config'")&&files.accessScope.includes("Orbit.domainConfig.peek('access')")&&files.router.includes("hydrateAccessAuthority"),'B2_ACCESS_MATRIX_PROTECTED_HYDRATION_MISSING');
need(files.academia.includes("['Dirección', 'SuperAdmin', 'AdminTenant', 'Admin'].includes(rol)"),'B2_ACADEMIA_PRIVILEGED_ROLE_ALIAS_MISSING');
need(files.runtimeConfig.includes("'cursos'")&&files.runtimeConfig.includes("'academyProgress'"),'B2_ACADEMIA_RUNTIME_HYDRATION_MISSING');
need(files.accessPolicy.includes("cursos: { module: 'academia'")&&files.accessPolicy.includes("academyProgress: { module: 'academia'")&&files.accessPolicy.includes("field: 'uid'"),'B2_ACADEMIA_READ_POLICY_MISSING');
need(files.academiaCatalog.includes("cur_p_clientes")&&files.academiaCatalog.includes("cur_p_aseg_cotiz")&&files.academiaCatalog.includes("automaticWrites:false"),'B2_ACADEMIA_APPROVED_CATALOG_MISSING');
need(files.academiaOwner.includes("catalogManagementDurable:false")&&files.academiaOwner.includes("ACADEMIA_PRODUCT_CATALOG_READ_ONLY")&&!files.academiaOwner.includes("Orbit.store.insert"),'B2_ACADEMIA_READONLY_OWNER_INVALID');
need(files.productApp.includes("academyOwner.install(Orbit.store)")&&files.productApp.includes("ACADEMIA_PRODUCT_CATALOG_NOT_READY"),'B2_ACADEMIA_OWNER_NOT_COMPOSED');
need(files.academia.includes("title: 'Academia de Gravicentra'"),'B2_ACADEMIA_VISIBLE_BRAND_MISSING');
need(!files.academia.includes("title: 'Orbit Academia'")&&!files.academia.includes("asesorId: 'ase001'")&&!files.academia.includes("Academia Orbit 360"),'B2_ACADEMIA_VISIBLE_OR_HARDCODE_REGRESSION');
const operativoRole=(files.config.match(/'Operativo':\s*\{[\s\S]*?\n\s*'Asesor':/)||[])[0]||'';
const asesorRole=(files.config.match(/'Asesor':\s*\{[\s\S]*?\n\s*'Asistente':/)||[])[0]||'';
need(operativoRole.includes("'academia'"),'B2_ACADEMIA_OPERATIVO_ROLE_DEFAULT_MISSING');
need(asesorRole.includes("'academia'"),'B2_ACADEMIA_ASESOR_ROLE_DEFAULT_MISSING');
need(files.config.includes("label: 'Academia'")&&files.config.includes("title: 'Academia de Gravicentra'")&&!files.config.includes("label: 'Orbit Academia'")&&!files.config.includes("title: 'Orbit Academia'"),'B2_ACADEMIA_CONFIG_BRAND_MISSING');
need(!/label: 'Orbit |title: 'Orbit |label: 'Orbit CRM'/.test(files.config),'B2_VISIBLE_ORBIT_CONFIG_BRANDING_REMAINS');
need(files.router.includes('Gravicentra Insurance')&&!files.router.includes('Marca de producto <b style="color:#fff">Orbit 360</b>'),'B2_VISIBLE_ORBIT_SHELL_BRANDING_REMAINS');
for(const role of ['Dirección','Admin','Comercial','Finanzas','Marketing','Operativo','Asesor','Asistente']){
  const pos=files.config.indexOf("'"+role+"':");
  const next=files.config.indexOf("\n  '",pos+3);
  const slice=files.config.slice(pos,next>pos?next:files.config.indexOf("\n};",pos));
  need(slice.includes("'academia'"),'B2_ACADEMIA_ALL_ROLE_DEFAULT_MISSING:'+role);
}
new Function(files.academiaCatalog);new Function(files.academiaOwner);new Function(files.academia);
for(const marker of ['core/config.js?v=20260925-b2r4','data/academia-product-catalog-v1.js?v=20260923-b2a1','core/academia-product-catalog-p0.js?v=20260923-b2a1','product-runtime-config.js?v=20260923-b2a1','core/tenant-access-policy-contract-p0.js?v=20260923-b2a1','modules/academia.js?v=20260924-b2r1','core/product-app-p0.js?v=20260923-b2a1','core/tenant-domain-config-client.js?v=20260924-b2r2','core/access-scope.js?v=20260925-b2r4','core/policy-receipts-engine.js?v=20260925-b2r5','core/policy-receipts-v1199-refinements.js?v=20260923-b2a3','core/issuance-workflow-v1201.js?v=20260924-b2r2','modules/inicio.js?v=20260925-b2r5c','modules/cliente360.js?v=20260926-b2r6c','modules/cobros.js?v=20260925-b2r5','modules/aseguradoras.js?v=20260925-b2r4','modules/crm-v1198-operational-bridge.js?v=20260925-b2r4','modules/policy-receipts-v1199-bridge.js?v=20260925-b2r4','modules/policy-receipts-v1199-detail-guard.js?v=20260926-b2r6c','core/product-insurer-credential-provider-p0.js?v=20260924-b2r2','core/backend-lab-receipts-portfolio-native-bridge-v20260801.js?v=20260926-b2r6','modules/cobros-cartera-i65-closure-bridge.js?v=20260925-b2r5c','modules/issuance-endosos-v1201-bridge.js?v=20260924-b2a6'])need(files.index.includes(marker),'B2_CACHE_KEY_MISSING:'+marker);

global.window=global;
const rows={
  clientes:[{id:'cli-b2',nombre:'Cliente B2',pais:'GT',moneda:'GTQ',asesorId:'ase-b2',estado:'activo',estadoOperativo:'activo'}],
  asesores:[{id:'ase-b2',nombre:'Asesor B2'}],
  aseguradoras:[{id:'asg-b2',nombre:'Aseguradora B2',pais:'GT',paises:['GT'],vinculada:true}],
  polizas:[],vehiculos:[],recibosEsperados:[],carteraPrimas:[],cobros:[],actividades:[],gestiones:[]
};
const clone=v=>JSON.parse(JSON.stringify(v));
const find=(c,id)=>rows[c]?.find(x=>x.id===id)||null;
const applyMutation=m=>{
  rows[m.collection]=rows[m.collection]||[];
  if(m.action==='insert'){
    if(find(m.collection,m.id))throw new Error('DUPLICATE_INSERT:'+m.collection+':'+m.id);
    rows[m.collection].push(clone(Object.assign({},m.payload,{id:m.id||m.payload?.id})));
  }else if(m.action==='update'){
    const x=find(m.collection,m.id); if(!x)throw new Error('UPDATE_MISSING:'+m.collection+':'+m.id);
    Object.assign(x,clone(m.payload||{}));
  }else if(m.action==='remove'){
    const i=rows[m.collection].findIndex(x=>x.id===m.id);if(i>=0)rows[m.collection].splice(i,1);
  }else throw new Error('UNKNOWN_MUTATION:'+m.action);
};
let lastBatch=[];
const store={
  all:c=>(rows[c]||[]),
  get:(c,id)=>find(c,id),
  where:(c,p)=>(rows[c]||[]).filter(p),
  find:(c,p)=>(rows[c]||[]).find(p),
  insert:(c,row)=>{rows[c]=rows[c]||[];const x=clone(row);rows[c].push(x);return x;},
  insertDurable:async(c,row)=>{rows[c]=rows[c]||[];const x=clone(row);if(!x.id)throw new Error('INSERT_DURABLE_ID_REQUIRED:'+c);if(find(c,x.id))throw new Error('INSERT_DURABLE_DUPLICATE:'+c+':'+x.id);rows[c].push(x);return clone(x);},
  update:(c,id,patch)=>{const x=find(c,id);if(!x)return false;Object.assign(x,clone(patch));return true;},
  updateDurable:async(c,id,patch)=>{const x=find(c,id);if(!x)throw new Error('UPDATE_DURABLE_MISSING:'+c+':'+id);Object.assign(x,clone(patch));return clone(x);},
  remove:(c,id)=>{const a=rows[c]||[],i=a.findIndex(x=>x.id===id);if(i<0)return false;a.splice(i,1);return true;},
  batchDurable:async mutations=>{lastBatch=clone(mutations);for(const m of mutations)applyMutation(m);return{ok:true,readback:true};}
};
global.Orbit={
  store,
  ui:{today:()=> '2026-09-20'},
  PAISES:[{id:'GT',moneda:'GTQ'},{id:'CO',moneda:'COP'}],
  access:{
    activeRole:()=> 'Operativo',
    actorAdvisor:()=> rows.asesores[0],
    actorUser:()=>({id:'u-b2',nombre:'Operador B2',asesorId:'ase-b2',rolActivo:'Operativo'}),
    tenantId:()=> 'alianzas-soluciones',
    currencyFor:p=>p==='CO'?'COP':'GTQ',
    norm:v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''),
    deriveClientState:()=> 'activo',
    audit:()=>true
  },
  primas:{
    FRECUENCIAS:{Contado:1,Semestral:2,Mensual:12},
    FORMAS_PAGO:['Transferencia'],
    CONDUCTOS:['Cobro directo del intermediario','Cobro de la aseguradora'],
    cuotasDe:f=>f==='Mensual'?12:f==='Semestral'?2:1,
    r2:n=>Math.round((+n||0)*100)/100,
    desglose:(neta,pais,opt={})=>{
      const n=+neta||0,g=+opt.gastosEmision||0,o=+opt.otros||0,gf=n*((+opt.recargoFinPct||0)/100),base=n+g+o+gf,iva=base*(pais==='GT'?0.12:0);
      return{neta:n,gastosEmision:g,otros:o,gastosFinan:gf,baseGravable:base,ivaPct:pais==='GT'?12:0,iva,total:base+iva,recargoPct:+opt.recargoFinPct||0};
    },
    recibos:(d,opt={})=>{
      const count=Math.max(1,+opt.cuotas||1),total=+d.total||0,out=[];
      for(let i=0;i<count;i++){
        const amt=i===count-1?Math.round((total-out.reduce((s,x)=>s+x.total,0))*100)/100:Math.round((total/count)*100)/100;
        const month=String(i+1).padStart(2,'0');
        out.push({n:i+1,neta:Math.round((d.neta/count)*100)/100,gastosEmision:0,gastosFinan:0,otros:0,iva:Math.round((d.iva/count)*100)/100,total:amt,comAseguradora:0,comVendedor:0,vence:'2026-'+month+'-28',fechaLimite:'2026-'+month+'-28'});
      }
      return out;
    }
  }
};
vm.runInThisContext(files.engine,{filename:'policy-receipts-engine.js'});
need(!!Orbit.policyReceipts,'B2_ENGINE_LOAD_FAILED');

const create=await Orbit.policyReceipts.createPolicy({
  id:'pol-b2-a',numero:'B2-001',clienteId:'cli-b2',asesorId:'ase-b2',aseguradoraId:'asg-b2',pais:'GT',moneda:'GTQ',
  ramo:'Autos',subramo:'Auto individual',producto:'Auto individual',estado:'Vigente',vigenciaInicio:'2026-09-20',vigenciaFin:'2027-09-20',
  frecuencia:'Semestral',formaPago:'Transferencia',conducto:'Cobro directo del intermediario',cuotas:10,primaNeta:1000,gastosEmision:50,otros:0,
  vehiculo:{marca:'Toyota',linea:'Corolla',placa:'B2TEST',anio:'2026',uso:'Particular',color:'Blanco',vin:'VIN-B2',chasis:'CH-B2',motor:'MO-B2'}
},{motivo:'B2 controlled proof',operationId:'b2-create'});
need(create.ok===true,'B2_POLICY_CREATE_FAILED:'+JSON.stringify(create.errors||[]));
need(create.policy.cuotas===2,'B2_FIXED_FREQUENCY_DID_NOT_OVERRIDE_INCONSISTENT_RECEIPT_COUNT:'+create.policy.cuotas);
const monthlyPrepared=Orbit.policyReceipts.preparePolicy({clienteId:'cli-b2',asesorId:'ase-b2',aseguradoraId:'asg-b2',pais:'GT',moneda:'GTQ',numero:'B2-MONTHLY',ramo:'Autos',producto:'Auto individual',estado:'Vigente',vigenciaInicio:'2026-09-20',vigenciaFin:'2027-09-20',frecuencia:'Mensual',cuotas:7,primaNeta:1000},null,'b2-monthly');
need(monthlyPrepared.cuotas===7,'B2_MONTHLY_CUSTOM_RECEIPT_COUNT_NOT_PRESERVED:'+monthlyPrepared.cuotas);
const createCollections=lastBatch.map(x=>x.collection);
need(createCollections.includes('polizas'),'B2_POLICY_MUTATION_MISSING');
need(createCollections.includes('vehiculos'),'B2_VEHICLE_INSERT_MISSING');
need(createCollections.filter(x=>x==='recibosEsperados').length===2,'B2_EXPECTED_RECEIPT_COUNT_INVALID');
need(createCollections.filter(x=>x==='carteraPrimas').length===2,'B2_PORTFOLIO_COUNT_INVALID');
need(!createCollections.includes('cobros')&&rows.cobros.length===0,'B2_POLICY_CREATED_CONFIRMED_COBRO');
need(rows.vehiculos[0]?.color==='Blanco'&&rows.vehiculos[0]?.chasis==='CH-B2'&&rows.vehiculos[0]?.motor==='MO-B2','B2_COMPLETE_VEHICLE_CREATE_FAILED');

const blockedNoReason=await Orbit.policyReceipts.updatePolicy('pol-b2-a',{sumaAsegurada:115000},{motivo:'',operationId:'b2-no-reason'});
need(blockedNoReason.ok===false&&blockedNoReason.errors.includes('motivo_requerido'),'B2_POLICY_EMPTY_REASON_NOT_BLOCKED');
need(Number(rows.polizas.find(x=>x.id==='pol-b2-a')?.sumaAsegurada||0)!==115000,'B2_POLICY_EMPTY_REASON_MUTATED_RECORD');
const policyEdit=await Orbit.policyReceipts.updatePolicy('pol-b2-a',{sumaAsegurada:115000},{motivo:'B2 controlled policy edit',operationId:'b2-policy-edit'});
need(policyEdit.ok===true&&Number(rows.polizas.find(x=>x.id==='pol-b2-a')?.sumaAsegurada)===115000,'B2_POLICY_EXISTING_FIELD_UPDATE_FAILED');

const update=await Orbit.policyReceipts.updatePolicy('pol-b2-a',{
  vehiculo:{id:rows.vehiculos[0].id,marca:'Toyota',linea:'Corolla',placa:'B2TEST',anio:'2026',uso:'Particular',color:'Azul',vin:'VIN-B2',chasis:'CH-B2',motor:'MO-B2'}
},{motivo:'B2 controlled vehicle edit',operationId:'b2-update'});
need(update.ok===true,'B2_POLICY_UPDATE_FAILED:'+JSON.stringify(update.errors||[]));
need(lastBatch.some(x=>x.collection==='vehiculos'&&x.action==='update'),'B2_VEHICLE_WAS_NOT_UPDATED');
need(rows.vehiculos.length===1&&rows.vehiculos[0].color==='Azul','B2_VEHICLE_UPDATE_DUPLICATED_OR_FAILED');
need(!lastBatch.some(x=>x.collection==='cobros'),'B2_POLICY_EDIT_CREATED_CONFIRMED_COBRO');

rows.gestiones.push({
 id:'ges-b2-ren',tenantId:'alianzas-soluciones',workflowType:'issuance_request',emissionStage:'PENDIENTE_EMISION',estado:'Pendiente',
 clienteId:'cli-b2',asesorId:'ase-b2',aseguradoraId:'asg-b2',pais:'GT',moneda:'GTQ',ramo:'Autos',producto:'Auto individual',
 sourcePolicyId:'pol-b2-a',renewalManagementId:'ren-b2',acceptedOffer:{frecuencia:'Semestral',formaPago:'Transferencia',conducto:'Cobro directo del intermediario',primaNeta:1100,gastosEmision:55,cuotas:2},
 checklist:[{t:'Número real y póliza emitida',done:false}]
});
rows.gestiones.push({id:'ren-b2',tipo:'Renovación',estado:'Pendiente',polizaId:'pol-b2-a'});
vm.runInThisContext(files.issuance,{filename:'issuance-workflow-v1201.js'});
need(!!Orbit.issuance,'B2_ISSUANCE_LOAD_FAILED');
const issued=await Orbit.issuance.issueRequest('ges-b2-ren',{
 numero:'B2-002',documentRef:'doc-b2',vigenciaInicio:'2027-09-20',vigenciaFin:'2028-09-20',
 frecuencia:'Semestral',cuotas:2,formaPago:'Transferencia',conducto:'Cobro directo del intermediario',primaNeta:1100,gastosEmision:55
},{motivo:'B2 controlled renewal issuance',operationId:'b2-renew'});
need(issued.ok===true,'B2_RENEWAL_ISSUANCE_FAILED:'+JSON.stringify(issued.errors||[]));
need(issued.policy&&issued.policy.renuevaDe==='pol-b2-a','B2_RENEWAL_LINK_MISSING');
need(rows.polizas.find(x=>x.id==='pol-b2-a')?.renovadaPor===issued.policy.id,'B2_SOURCE_POLICY_RENEWAL_LINK_MISSING');
need(rows.recibosEsperados.filter(x=>x.polizaId===issued.policy.id&&String(x.estado).toLowerCase()!=='anulado').length===2,'B2_RENEWAL_RECEIPTS_MISSING');
need(rows.carteraPrimas.filter(x=>x.polizaId===issued.policy.id&&x.carteraActiva!==false).length===2,'B2_RENEWAL_PORTFOLIO_MISSING');
need(rows.cobros.length===0,'B2_RENEWAL_CREATED_CONFIRMED_COBRO');
const issuedVehicles=rows.vehiculos.filter(x=>x.polizaId===issued.policy.id);
need(issuedVehicles.length===1&&issuedVehicles[0].id!==rows.vehiculos.find(x=>x.polizaId==='pol-b2-a')?.id,'B2_RENEWAL_VEHICLE_SNAPSHOT_MISSING_OR_REUSED');
need(issuedVehicles[0].marca==='Toyota'&&issuedVehicles[0].linea==='Corolla'&&issuedVehicles[0].placa==='B2TEST','B2_RENEWAL_VEHICLE_SNAPSHOT_FIELDS_INVALID');


const r6Cliente=fs.readFileSync('orbit360-platform/modules/cliente360.js','utf8');
const r6Detail=fs.readFileSync('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js','utf8');
const r6Receipts=fs.readFileSync('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js','utf8');
const r6Css=fs.readFileSync('orbit360-platform/styles/base.css','utf8');
need(r6Cliente.includes('orderedClientPolicies')&&r6Cliente.includes('canonicalVehicle')&&r6Cliente.includes('data-client-policy-row="1"')&&r6Cliente.includes('data-vehicle-current-card="1"')&&!r6Cliente.includes('vehiclePolicySort('),'B2_R6_CLIENT_CANONICAL_PROJECTION_MISSING');
need(!r6Cliente.includes('ID físico')&&!r6Cliente.includes('Registros históricos con identidad incompleta'),'B2_R6_CLIENT_TECHNICAL_LANGUAGE_LEAK');
need(r6Detail.includes('receiptCalendarProjection')&&!r6Detail.includes('por ID físico')&&!r6Detail.includes('Policy ID')&&!r6Detail.includes('registro(s) físico(s)')&&!r6Detail.includes('Vehículo ID')&&!r6Detail.includes('Versión física de póliza')&&r6Detail.includes('no se vincularán automáticamente'),'B2_R6_DETAIL_CALENDAR_OR_LANGUAGE_CONTRACT_MISSING');
need(r6Receipts.includes('calendarClassReceipt')&&r6Receipts.includes('data-rp-calendar-review'),'B2_R6_SINGLE_CALENDAR_PROJECTION_MISSING');
need(r6Css.includes('scrollbar-width:auto')&&r6Css.includes('#sidebar::-webkit-scrollbar{width:8px}')&&r6Css.includes('.vp-sec-t{'),'B2_R6_UI_HIERARCHY_SCROLLBAR_CONTRACT_MISSING');
console.log('I65_B2_R6_SOURCE_DISCRIMINANTS=PASS');
console.log('I65_B2_FUNCTIONAL=PASS');
console.log('I65_B2_CLIENT_DURABLE=true');
console.log('I65_B2_ACTIVE_CLIENT_MODAL_OWNER=CRM_V1198_DURABLE_PROTECTED');
console.log('I65_B2_POLICY_ADVISOR=true');
console.log('I65_B2_POLICY_VISUAL_HIERARCHY_SOURCE=true');
console.log('I65_B2_ACADEMIA_SOURCE=true');
console.log('I65_B2_ACADEMIA_REQUIRED_COURSES=true');
console.log('I65_B2_ACADEMIA_AUTOMATIC_WRITES=0');
console.log('I65_B2_FIXED_FREQUENCY_RECEIPTS=true');
console.log('I65_B2_MONTHLY_CUSTOM_RECEIPTS=true');
console.log('I65_B2_VEHICLE_CREATE_EDIT=true');
console.log('I65_B2_RECEIPTS_PROJECTION=V920');
console.log('I65_B2_RENEWAL_ASYNC_AWAIT=true');
console.log('I65_B2_RENEWAL_RECEIPTS='+rows.recibosEsperados.filter(x=>x.polizaId===issued.policy.id&&String(x.estado).toLowerCase()!=='anulado').length);
console.log('I65_B2_RENEWAL_PORTFOLIO='+rows.carteraPrimas.filter(x=>x.polizaId===issued.policy.id&&x.carteraActiva!==false).length);
console.log('I65_B2_CONFIRMED_COBROS='+rows.cobros.length);
console.log('I65_B2_DATA_WRITES=0');
