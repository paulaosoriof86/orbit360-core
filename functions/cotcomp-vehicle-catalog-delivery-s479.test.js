'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-vehicle-catalog-delivery-s479');

function fixture(){
  const entries=[
    {typeId:'t1',type:'AUTOMOVIL',brandId:'b1',brand:'TOYOTA',modelId:'m1',line:'COROLLA'},
    {typeId:'t2',type:'CAMIONETA',brandId:'b2',brand:'MAZDA',modelId:'m2',line:'CX-5 SPORT'},
    {typeId:'t3',type:'PICK UP',brandId:'b1',brand:'TOYOTA',modelId:'m3',line:'HILUX'},
    {typeId:'t4',type:'MOTO',brandId:'b3',brand:'BAJAJ',modelId:'m4',line:'CHETAK'}
  ];
  const expanded=[];
  for(let i=0;i<s.EXPECTED_ENTRY_COUNT;i++){
    const base=entries[i%entries.length];
    expanded.push({...base,modelId:base.modelId+'_'+i,line:base.line+' '+String(i)});
  }
  const brands=[];
  for(let i=0;i<s.EXPECTED_BRAND_COUNT;i++)brands.push({brandId:'bx'+i,brand:'BRAND '+i});
  for(let i=0;i<brands.length;i++){
    expanded[i]={typeId:'tx'+i,type:s.ALLOWED_TYPES[i%s.ALLOWED_TYPES.length],brandId:brands[i].brandId,brand:brands[i].brand,modelId:'mx'+i,line:'MODEL '+i};
  }
  expanded[0]={typeId:'t1',type:'AUTOMOVIL',brandId:'b1',brand:'TOYOTA',modelId:'m1',line:'COROLLA'};
  expanded[1]={typeId:'t2',type:'CAMIONETA',brandId:'b2',brand:'MAZDA',modelId:'m2',line:'CX-5 SPORT'};
  expanded[2]={typeId:'t4',type:'MOTO',brandId:'b3',brand:'BAJAJ',modelId:'m4',line:'CHETAK'};
  const unique=new Map();
  for(const e of expanded)unique.set(e.brandId,e.brand);
  let n=0;
  while(unique.size<s.EXPECTED_BRAND_COUNT){
    const i=expanded.length-1-n;
    const id='fill'+n;
    expanded[i]={typeId:'tf'+n,type:'AUTOMOVIL',brandId:id,brand:'FILL '+n,modelId:'mf'+n,line:'MODEL FILL '+n};
    unique.set(id,'FILL '+n);n++;
  }
  const catalog={
    schemaVersion:'ays-cotcomp-vehicle-public-catalog-v1.0',
    catalogVersion:s.EXPECTED_CATALOG_VERSION,
    catalogDigestSha256:s.EXPECTED_CATALOG_DIGEST,
    allowedSatTypes:[...s.ALLOWED_TYPES],
    entries:expanded,
    publicSubsetDigestSha256:'a'.repeat(64)
  };
  return catalog;
}
function mockReq(method='GET',query={},headers={}){
  return {method,query,get:(k)=>headers[String(k).toLowerCase()]||''};
}
function mockRes(){
  return {
    statusCode:200,headers:{},body:null,
    set(k,v){this.headers[k]=v;return this;},
    status(n){this.statusCode=n;return this;},
    json(v){this.body=v;return this;},
    send(v){this.body=v;return this;}
  };
}

test('S4.79 catalog validator enforces pinned scope and counts',()=>{
  const c=fixture();
  const v=s.validateCatalog(c);
  assert.equal(v.ok,true);
  c.allowedSatTypes=['AUTOMOVIL'];
  assert.equal(s.validateCatalog(c).ok,false);
});

test('S4.79 exposes separate year list including Corolla 2006',()=>{
  const ys=s.years();
  assert.equal(ys[0],2026);
  assert.equal(ys.at(-1),1900);
  assert.ok(ys.includes(2006));
});

test('S4.79 meta is LAB-only and never embeds provider eligibility',()=>{
  const h=s.createHandler(fixture()),req=mockReq('GET',{op:'meta'}),res=mockRes();
  h(req,res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.labOnly,true);
  assert.equal(res.body.providerEligibilityEmbedded,false);
  assert.equal(res.body.appDataSource,false);
});

test('S4.79 brands and models are searchable and dependent',()=>{
  const h=s.createHandler(fixture());
  let res=mockRes();
  h(mockReq('GET',{op:'brands',vehicleClass:'AUTO_LIGHT',q:'TOY'}),res);
  assert.equal(res.statusCode,200);
  assert.ok(res.body.items.some(x=>x.label==='TOYOTA'));
  res=mockRes();
  h(mockReq('GET',{op:'models',vehicleClass:'AUTO_LIGHT',brandId:'b1',q:'COROLLA'}),res);
  assert.equal(res.statusCode,200);
  assert.ok(res.body.items.some(x=>x.label.startsWith('COROLLA')));
});

test('S4.79 resolve requires year and exact catalog selection',()=>{
  const h=s.createHandler(fixture());
  let res=mockRes();
  h(mockReq('GET',{op:'resolve',vehicleClass:'AUTO_LIGHT',brandId:'b1',modelId:'m1'}),res);
  assert.equal(res.statusCode,400);
  assert.equal(res.body.code,'YEAR_SELECTION_REQUIRED');
  res=mockRes();
  h(mockReq('GET',{op:'resolve',vehicleClass:'AUTO_LIGHT',brandId:'b1',modelId:'m1',vehicleYear:'2006'}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.vehicleIdentity.year,2006);
  assert.equal(res.body.providerEligibilityEmbedded,false);
});

test('S4.79 rejects writes and unknown browser origins',()=>{
  const h=s.createHandler(fixture());
  let res=mockRes();
  h(mockReq('POST',{}),res);
  assert.equal(res.statusCode,405);
  res=mockRes();
  h(mockReq('GET',{op:'meta'},{origin:'https://example.com'}),res);
  assert.equal(res.statusCode,403);
});

test('S4.79 accepts only LAB/localhost browser origins without changing global App Check',()=>{
  const h=s.createHandler(fixture()),res=mockRes();
  h(mockReq('GET',{op:'meta'},{origin:'https://ays-orbit-360-lab.web.app'}),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers['Access-Control-Allow-Origin'],'https://ays-orbit-360-lab.web.app');
});
