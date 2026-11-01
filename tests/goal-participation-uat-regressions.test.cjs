'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const read=name=>fs.readFileSync(path.join(__dirname,'../orbit360-platform/modules',name),'utf8');
const source=read('equipo.js');
const bridge=read('equipo-onboarding-v20260804-bridge.js');
const inicio=read('inicio.js');
const advisor={id:'ase-u1',nombre:'Asesora de prueba',email:'qa@example.test',roles:['Asesor'],rol:'Asesor',rolDefault:'Asesor',paises:['GT'],pais:'GT',paisDefault:'GT',activo:true};
const goals=[
  {asesorId:advisor.id,mes:'2026-10',pais:'GT',tipo:'nueva',valor:40000},
  {asesorId:advisor.id,mes:'2026-10',pais:'GT',tipo:'renovada',valor:40000}
];
const timers=[],tabs=new Map(),rows=[];
const document={
  addEventListener(){},
  getElementById(id){return id==='eq-body'?body:null;}
};
const body={
  html:'',
  set innerHTML(value){
    this.html=value;rows.length=0;
    for(const match of value.matchAll(/<tr[^>]*onclick="Orbit\.modules\.equipo\.editar\('([^']+)'\)"[^>]*>([\s\S]*?)<\/tr>/g)){
      const cells=[...match[2].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)]
        .map(td=>({attrs:td[1],innerHTML:td[2]}));
      rows.push({
        getAttribute(key){return key==='onclick'?`Orbit.modules.equipo.editar('${match[1]}')`:null;},
        querySelector(selector){return selector==='[data-equipo-access-cell="1"]'?cells.find(cell=>cell.attrs.includes('data-equipo-access-cell="1"'))||null:null;},
        querySelectorAll(selector){return selector==='td'?cells:[];},
        cells
      });
    }
  },
  get innerHTML(){return this.html;}
};
const add={dataset:{},addEventListener(){}};
const host={
  innerHTML:'',
  querySelector(selector){return selector==='#eq-add'?add:null;},
  querySelectorAll(selector){
    if(selector==='.tab[data-t]')return ['usuarios','metas'].map(t=>({dataset:{t},addEventListener(event,fn){tabs.set(t,fn);}}));
    if(selector==='tbody tr[onclick*="Orbit.modules.equipo.editar"]')return rows;
    return [];
  }
};
const store={
  get(collection,id){return collection==='asesores'&&id===advisor.id?advisor:null;},
  all(collection){return collection==='asesores'?[advisor]:collection==='metas'?goals:[];},
  metaPreviewEnabled(){return false;}
};
const Orbit={modules:{},store,pais:'GT',PAISES:[{id:'GT',label:'Guatemala',moneda:'GTQ'}],ROLES:{},MODULE_TITLES:{},
  ui:{NOW:'2026-11-01T00:05:00.000Z',monthKey(){return '2026-10';},esc:x=>String(x??''),avatar:()=>'<span>Avatar</span>',money:(n,c)=>`${c} ${n}`,moneyShort:(n,c)=>`${c} ${n}`},
  kit:{banner:()=>'<div>Equipo</div>',kpis:()=>'<div>KPI</div>'},
  auth:{productUser:{uid:'uid-qa',activeRole:'Dirección'}},session:{rol:()=> 'Dirección'},
  access:{can:()=>true},userOnboarding:{status:()=>({id:'active',tone:'ok',label:'Activo',detail:'Estado de acceso confirmado por bridge'}),available:()=>false}
};
const ctx={Orbit,window:{Orbit},document,OrbitBackend:{},console,setTimeout(fn){timers.push(fn);}};
vm.runInNewContext(source,ctx,{filename:'equipo.js'});
vm.runInNewContext(bridge,ctx,{filename:'equipo-onboarding-v20260804-bridge.js'});

Orbit.modules.equipo.render(host);
while(timers.length)timers.shift()();
assert.equal(rows.length,1,'Se renderizó la fila real del equipo');
const [row]=rows;
assert.equal(row.cells.length,8,'Tabla canónica con las ocho columnas actuales');
assert.match(row.cells[4].attrs,/data-equipo-participation-cell="1"/,'Columna de clasificación marcada semánticamente');
assert.match(row.cells[4].innerHTML,/Sin clasificar/,'El decorador no sobrescribe la clasificación');
assert.doesNotMatch(row.cells[4].innerHTML,/Estado de acceso confirmado por bridge/,'No hay estado Auth en clasificación');
assert.match(row.cells[5].attrs,/data-equipo-access-cell="1"/,'Columna de acceso marcada semánticamente');
assert.match(row.cells[5].innerHTML,/Estado de acceso confirmado por bridge/,'El decorador actualiza solo Acceso');

tabs.get('metas')();
assert.match(body.innerHTML,/id="meta-periodo"[^>]*value="2026-10"/,
  'Metas abre en octubre del calendario de producto aunque el ISO UTC sea noviembre');
assert.match(body.innerHTML,/value="40000"[^>]*data-meta="ase-u1\|nueva"/,
  'Metas de octubre existen y no dependen de la clasificación');

assert.match(inicio,/metaConfigurada:goal!=null/,'Inicio diferencia una meta configurada de una habilitada');
assert.match(inicio,/metaDisponible:participa&&goal!=null/,'No habilita cumplimiento sin participación explícita');
assert.match(inicio,/configuredAdvisorGoals=board\.filter\(item=>item\.metaConfigurada\)/,'El conteo de configuradas es independiente');
assert.match(inicio,/verifiedAdvisorGoals=board\.filter\(item=>item\.metaDisponible\)/,'El conteo de cumplimiento sigue separado');
assert.match(inicio,/habilitados para calcular cumplimiento según clasificación/,'Inicio expresa por qué no aparece un porcentaje');

process.stdout.write('PASS: DOM del puente de Equipo, límite de mes UTC y distinción metas configuradas/cumplimiento; sin escrituras.\n');
