'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s=require('./cotcomp-first-release-vehicle-scope-s478');

const catalog={
  entries:[
    {type:'AUTOMOVIL',brand:'TOYOTA'},
    {type:'CAMIONETA',brand:'MAZDA'},
    {type:'CAMIONETA',brand:'HONDA'},
    {type:'PICK UP',brand:'TOYOTA'},
    {type:'MOTO',brand:'BAJAJ'},
    {type:'CUATRIMOTO',brand:'HONDA'}
  ]
};

test('S4.78 first-release scope is explicit and minimal',()=>{
  assert.deepEqual(s.allAllowedTypes(),['AUTOMOVIL','CAMIONETA','PICK UP','MOTO']);
  assert.equal(s.FIRST_RELEASE_SCOPE.AUTO_LIGHT.publicLabel,'Automóvil / SUV / Pickup');
  assert.equal(s.FIRST_RELEASE_SCOPE.MOTO.publicLabel,'Motocicleta');
});

test('S4.78 routes only approved SAT types and fails other types to review',()=>{
  assert.equal(s.routePublicVehicleClass('AUTOMOVIL').vehicleClass,'AUTO_LIGHT');
  assert.equal(s.routePublicVehicleClass('CAMIONETA').vehicleClass,'AUTO_LIGHT');
  assert.equal(s.routePublicVehicleClass('PICK UP').vehicleClass,'AUTO_LIGHT');
  assert.equal(s.routePublicVehicleClass('MOTO').vehicleClass,'MOTO');
  const other=s.routePublicVehicleClass('CUATRIMOTO');
  assert.equal(other.ok,false);
  assert.equal(other.code,'OTHER_REQUIRES_REVIEW');
});

test('S4.78 alias decisions are non-blocking because safe fallback exists',()=>{
  const b=s.releaseBlockers();
  assert.deepEqual(b.hard,['CATALOG_DELIVERY_SURFACE_REQUIRED']);
  assert.deepEqual(b.nonBlockingEnhancements,['REVIEWED_ALIAS_DECISIONS_PENDING']);
  assert.deepEqual(b.localIndependent,['MATCHING_REAL_PROPOSAL_EVIDENCE_REQUIRED_FOR_W5_COROLLA_2006']);
});

test('S4.78 catalog validation requires evidence for each allowed SAT type and known brands',()=>{
  const v=s.validateAgainstCatalog(catalog);
  assert.equal(v.ok,true);
  assert.equal(v.counts.AUTOMOVIL,1);
  assert.equal(v.counts.CAMIONETA,2);
  assert.equal(v.counts['PICK UP'],1);
  assert.equal(v.counts.MOTO,1);
  assert.equal(v.scopedIdentityCount,5);
  assert.equal(v.scopedBrandCount,4);
});

test('S4.78 readiness does not claim delivery/deployment',()=>{
  const r=s.readiness(catalog);
  assert.equal(r.firstReleaseScopeReady,true);
  assert.equal(r.aliasDecisionsAreHardBlocker,false);
  assert.equal(r.catalogDeliverySurfaceReady,false);
  assert.equal(r.publicDropdownReleaseReady,false);
  assert.deepEqual(r.hardBlockers,['CATALOG_DELIVERY_SURFACE_REQUIRED']);
  assert.equal(r.appDataReads,0);
  assert.equal(r.appDataWrites,0);
  assert.equal(r.deployment,false);
  assert.equal(r.providerOrRaterCalls,0);
  assert.equal(r.productionTouched,false);
});
