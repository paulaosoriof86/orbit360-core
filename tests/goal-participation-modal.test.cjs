'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../orbit360-platform/modules/equipo.js'),'utf8');
function renderModal({role='Dirección',preview=false,tipoVinculacion,participaMetas=false,name='Johanna'}={}){
  let markup=null;
  const stop=new Error('GOAL_MODAL_CAPTURED');
  const dummy={id:'',className:'',style:{},dataset:{},set innerHTML(value){markup=value;throw stop;}};
  const document={getElementById:()=>null,createElement:()=>dummy};
  const advisor={id:'ase-prueba',nombre:name,email:'prueba@example.test',roles:['Asesor'],
    rol:'Asesor',rolDefault:'Asesor',paises:['GT'],pais:'GT',paisDefault:'GT',scopeDatos:'propios',
    ...(tipoVinculacion===undefined?{}:{tipoVinculacion}),participaMetas};
  const store={get:(collection,id)=>collection==='asesores'&&id==='ase-prueba'?advisor:null,
    all:()=>[advisor],metaPreviewEnabled:()=>preview};
  const Orbit={modules:{},store,
    ui:{NOW:'2026-10-31T12:00:00Z',esc:value=>String(value??''),
      avatar:()=>'<span>Avatar</span>'},
    kit:{},auth:{productUser:{uid:'uid-demo',activeRole:role}},
    session:{rol:()=>role},access:{can:(module,action)=>module==='equipo'&&action==='edit'},
    tenant:{get:()=>({paises:['GT']})},pais:'GT',
    PAISES:[{id:'GT',label:'Guatemala',moneda:'GTQ'}],
    ROLES:{},MODULE_TITLES:{},productRoleTaxonomyP0:null};
  vm.runInNewContext(source,{Orbit,window:{Orbit},document,OrbitBackend:{},console},
    {filename:'equipo.js'});
  assert.throws(()=>Orbit.modules.equipo.editar('ase-prueba'),error=>error===stop);
  assert.ok(markup,'Se capturó el formulario sin abrirlo ni guardar');
  return markup;
}
const select=html=>(html.match(/<select id="eu-vinculacion" class="o-sel"([^>]*)>/)||[])[1];
const check=html=>(html.match(/<input type="checkbox" id="eu-participa-metas"([^>]*)>/)||[])[1];

const direccion=renderModal();
assert.ok(select(direccion),'Hay selector de vinculación');
assert.doesNotMatch(select(direccion),/disabled/,'Dirección puede seleccionar');
assert.match(direccion,/<option value="sin_clasificar" selected>/,'Nombre no genera inferencia');
assert.match(check(direccion),/disabled/,'Sin clasificar no habilita participación');
assert.doesNotMatch(check(direccion),/checked/,'Sin clasificar no participa');

const freelance=renderModal({name:'Nicole',tipoVinculacion:'freelance'});
assert.match(freelance,/<option value="freelance" selected>/,'Freelance explícito');
assert.doesNotMatch(check(freelance),/disabled/,'Dirección puede habilitar freelance');
assert.doesNotMatch(check(freelance),/checked/,'Freelance comienza deshabilitado');

const habilitado=renderModal({name:'Braulio',tipoVinculacion:'freelance',participaMetas:true});
assert.match(check(habilitado),/checked/,'Un estado explícito se refleja');

const admin=renderModal({role:'Admin',tipoVinculacion:'freelance'});
assert.match(select(admin),/disabled/,'Admin no puede clasificar');
assert.match(check(admin),/disabled/,'Admin no puede habilitar');

const preview=renderModal({role:'Dirección',preview:true,tipoVinculacion:'freelance'});
assert.match(select(preview),/disabled/,'Preview no permite mutar asesores reales');
assert.match(check(preview),/disabled/,'Preview no permite habilitar freelancers reales');

assert.match(source,/\$\$\('\.eu-pais'\)\.forEach\(/,'El formulario enlaza todos los selectores de país mediante querySelectorAll');
assert.doesNotMatch(source,/(?<!\$)\$\('\.eu-pais'\)\.forEach\(/,'No se invoca forEach sobre un único elemento');

process.stdout.write('PASS: 15 aserciones de formulario real, enlace de eventos, roles y bloqueo Preview (sin cambios de datos).\n');
