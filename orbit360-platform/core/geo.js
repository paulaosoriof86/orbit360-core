/* ============================================================
   CXOrbia · Catálogo geográfico LatAm (país → departamento → ciudad)
   GENÉRICO: dropdowns dependientes para registro y perfil de shoppers.
   Cobertura de los mercados principales; países sin dataset caen a
   texto libre, sin romper el flujo. Editable/ampliable sin tocar módulos.
   ============================================================ */
window.CX = window.CX || {};

/* Etiqueta de la división administrativa por país (Departamento/Estado/Provincia/Región) */
CX.GEO_DEPT_LABEL = {
  GT:'Departamento', HN:'Departamento', SV:'Departamento', NI:'Departamento',
  CR:'Provincia', PA:'Provincia', DO:'Provincia', AR:'Provincia',
  MX:'Estado', CO:'Departamento', PE:'Departamento', EC:'Provincia',
  CL:'Región', ES:'Provincia', US:'Estado',
};

/* país → { departamento/estado → [ciudades] } */
CX.GEO = {
  GT:{
    'Guatemala':['Guatemala','Villa Nueva','Mixco','Petapa','Amatitlán'],
    'Quetzaltenango':['Quetzaltenango','Coatepeque','Salcajá'],
    'Sacatepéquez':['Antigua Guatemala','Jocotenango','Ciudad Vieja'],
    'Escuintla':['Escuintla','Santa Lucía Cotzumalguapa','Puerto San José'],
    'Suchitepéquez':['Mazatenango','Cuyotenango'],
    'Alta Verapaz':['Cobán','San Pedro Carchá'],
    'Jutiapa':['Jutiapa','Asunción Mita'],
    'Petén':['Flores','San Benito'],
  },
  HN:{
    'Francisco Morazán':['Tegucigalpa','Comayagüela','Valle de Ángeles'],
    'Cortés':['San Pedro Sula','Choloma','Puerto Cortés','La Lima'],
    'Atlántida':['La Ceiba','Tela'],
    'Comayagua':['Comayagua','Siguatepeque'],
    'Yoro':['El Progreso','Yoro'],
    'Choluteca':['Choluteca'],
  },
  SV:{
    'San Salvador':['San Salvador','Soyapango','Mejicanos','Santa Tecla'],
    'La Libertad':['Santa Tecla','Antiguo Cuscatlán','La Libertad'],
    'Santa Ana':['Santa Ana','Chalchuapa'],
    'San Miguel':['San Miguel'],
    'Sonsonate':['Sonsonate','Acajutla'],
  },
  NI:{
    'Managua':['Managua','Ciudad Sandino','Tipitapa'],
    'León':['León'],
    'Granada':['Granada'],
    'Masaya':['Masaya'],
    'Chinandega':['Chinandega'],
  },
  CR:{
    'San José':['San José','Escazú','Desamparados','Curridabat'],
    'Alajuela':['Alajuela','San Carlos'],
    'Cartago':['Cartago','Turrialba'],
    'Heredia':['Heredia','Belén'],
    'Guanacaste':['Liberia','Santa Cruz'],
    'Puntarenas':['Puntarenas'],
  },
  PA:{
    'Panamá':['Ciudad de Panamá','San Miguelito','Tocumen'],
    'Panamá Oeste':['Arraiján','La Chorrera'],
    'Colón':['Colón'],
    'Chiriquí':['David'],
    'Coclé':['Penonomé','Aguadulce'],
  },
  DO:{
    'Distrito Nacional':['Santo Domingo'],
    'Santo Domingo':['Santo Domingo Este','Los Alcarrizos'],
    'Santiago':['Santiago de los Caballeros'],
    'La Altagracia':['Punta Cana','Higüey'],
    'La Vega':['La Vega'],
  },
  MX:{
    'Ciudad de México':['Cuauhtémoc','Iztapalapa','Coyoacán','Benito Juárez'],
    'Estado de México':['Toluca','Ecatepec','Naucalpan','Tlalnepantla'],
    'Jalisco':['Guadalajara','Zapopan','Tlaquepaque'],
    'Nuevo León':['Monterrey','San Pedro Garza García','Guadalupe'],
    'Puebla':['Puebla','Cholula'],
    'Querétaro':['Santiago de Querétaro'],
    'Yucatán':['Mérida'],
  },
  CO:{
    'Bogotá D.C.':['Bogotá'],
    'Antioquia':['Medellín','Envigado','Bello','Itagüí'],
    'Valle del Cauca':['Cali','Palmira','Buenaventura'],
    'Atlántico':['Barranquilla','Soledad'],
    'Cundinamarca':['Soacha','Chía','Zipaquirá'],
    'Bolívar':['Cartagena'],
    'Santander':['Bucaramanga'],
  },
  PE:{
    'Lima':['Lima','Miraflores','San Isidro','Surco'],
    'Arequipa':['Arequipa'],
    'La Libertad':['Trujillo'],
    'Cusco':['Cusco'],
    'Piura':['Piura'],
    'Lambayeque':['Chiclayo'],
  },
  EC:{
    'Pichincha':['Quito','Sangolquí'],
    'Guayas':['Guayaquil','Durán'],
    'Azuay':['Cuenca'],
    'Manabí':['Manta','Portoviejo'],
    'Tungurahua':['Ambato'],
  },
  CL:{
    'Metropolitana':['Santiago','Providencia','Las Condes','Maipú'],
    'Valparaíso':['Valparaíso','Viña del Mar'],
    'Biobío':['Concepción','Talcahuano'],
    'Maule':['Talca','Curicó'],
    'Antofagasta':['Antofagasta'],
  },
  AR:{
    'Buenos Aires':['La Plata','Mar del Plata','Bahía Blanca'],
    'CABA':['Buenos Aires'],
    'Córdoba':['Córdoba','Villa Carlos Paz'],
    'Santa Fe':['Rosario','Santa Fe'],
    'Mendoza':['Mendoza'],
  },
  ES:{
    'Madrid':['Madrid','Alcalá de Henares','Móstoles'],
    'Barcelona':['Barcelona','Badalona','Hospitalet'],
    'Valencia':['Valencia'],
    'Sevilla':['Sevilla'],
  },
  US:{
    'Florida':['Miami','Orlando','Tampa'],
    'Texas':['Houston','Dallas','Austin'],
    'California':['Los Ángeles','San Francisco'],
    'New York':['New York'],
  },
};

CX.geo = {
  deptLabel(c){ return CX.GEO_DEPT_LABEL[c] || 'Departamento'; },
  hasData(c){ return !!CX.GEO[c]; },
  departments(c){ return CX.GEO[c] ? Object.keys(CX.GEO[c]) : []; },
  cities(c, dep){ return (CX.GEO[c] && CX.GEO[c][dep]) ? CX.GEO[c][dep] : []; },

  /* opciones <option> de países (catálogo CX.COUNTRIES) */
  _countryOptions(sel){
    return CX.COUNTRIES.map(p=>`<option value="${p.c}" ${p.c===sel?'selected':''}>${CX.paisFlag(p.c)} ${p.n}</option>`).join('');
  },

  /* Bloque de 3 campos dependientes. ids = {pais, depto, ciudad}; val = valores actuales */
  fieldsHTML(ids, val={}){
    return `
      <div><label class="lbl">País</label>
        <select class="sel" id="${ids.pais}"><option value="">Selecciona…</option>${this._countryOptions(val.pais)}</select></div>
      <div data-geo-dep="${ids.depto}"><label class="lbl" id="${ids.depto}-lbl">Departamento</label>
        <div id="${ids.depto}-host"></div></div>
      <div data-geo-city="${ids.ciudad}"><label class="lbl">Ciudad</label>
        <div id="${ids.ciudad}-host"></div></div>`;
  },

  /* control dependiente: <select> si hay dataset, <input> libre si no */
  _ctrl(id, opts, val, ph){
    if(opts && opts.length){
      return `<select class="sel" id="${id}"><option value="">Selecciona…</option>${
        opts.map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join('')}${
        val && !opts.includes(val)?`<option selected>${val}</option>`:''}</select>`;
    }
    return `<input class="inp" id="${id}" placeholder="${ph||''}" value="${val||''}">`;
  },

  /* Conecta dependencias. Llamar tras insertar fieldsHTML en el DOM. */
  wire(root, ids, val={}){
    const $=(s)=>root.querySelector(s);
    const paisSel=$('#'+ids.pais);
    const depLbl=$('#'+ids.depto+'-lbl');
    const depHost=$('#'+ids.depto+'-host');
    const cityHost=$('#'+ids.ciudad+'-host');

    const renderCity=(c, dep, cityVal)=>{
      cityHost.innerHTML=this._ctrl(ids.ciudad, this.cities(c, dep), cityVal, 'Ciudad');
    };
    const renderDept=(c, depVal, cityVal)=>{
      depLbl.textContent=this.deptLabel(c);
      depHost.innerHTML=this._ctrl(ids.depto, this.departments(c), depVal, this.deptLabel(c));
      const depCtrl=$('#'+ids.depto);
      renderCity(c, depVal, cityVal);
      if(depCtrl && depCtrl.tagName==='SELECT'){
        depCtrl.addEventListener('change',()=>renderCity(c, depCtrl.value, ''));
      }
    };

    renderDept(val.pais||'', val.depto||'', val.ciudad||'');
    paisSel.addEventListener('change',()=>renderDept(paisSel.value, '', ''));
  },

  /* Lee {pais, depto, ciudad} desde los controles (select o input) */
  read(root, ids){
    const v=(id)=>{ const el=root.querySelector('#'+id); return el? (el.value||'').trim() : ''; };
    return { pais:v(ids.pais), depto:v(ids.depto), ciudad:v(ids.ciudad) };
  },
};
