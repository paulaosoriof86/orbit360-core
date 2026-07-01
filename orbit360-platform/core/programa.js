/* ============================================================
   CXOrbia · Programa de evaluación (FUENTE ÚNICA DE VERDAD)
   El cuestionario ponderado vive aquí y lo consumen las 3 caras:
   - Operación (editor admin) lo edita y persiste.
   - Shopper lo llena y se calcula el SCORE real ponderado.
   - Portal del Cliente lee la misma estructura (sincronizado).
   Soporta VERSIONES por criterio (sucursal / marca / cadena / tipo).
   Genérico y white-label; persistente por proyecto en localStorage.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  let _seq = Date.now();
  const uid = (pfx)=> (pfx||'id')+'-'+(++_seq).toString(36);

  /* secciones canónicas por defecto (pesos suman 100; preguntas suman 100 por sección) */
  function defaultSections(){
    return [
      {id:'recib', name:'Recibimiento', weight:15, questions:[
        {id:'q1',name:'Saludo y bienvenida',tipo:'Escala 1–5',weight:50,req:true,critico:false},
        {id:'q2',name:'Tiempo de espera inicial',tipo:'Escala 1–5',weight:50,req:true,critico:false}]},
      {id:'aten', name:'Asesoría y atención', weight:30, questions:[
        {id:'q3',name:'Conocimiento del asesor',tipo:'Escala 1–5',weight:40,req:true,critico:false},
        {id:'q4',name:'Amabilidad y actitud',tipo:'Escala 1–5',weight:35,req:true,critico:false},
        {id:'q5',name:'Detección de necesidad',tipo:'Sí / No',weight:25,req:false,critico:false}]},
      {id:'tiemp', name:'Tiempos de servicio', weight:15, questions:[
        {id:'q6',name:'Agilidad del proceso',tipo:'Escala 1–5',weight:60,req:true,critico:false},
        {id:'q7',name:'Manejo de filas',tipo:'Escala 1–5',weight:40,req:false,critico:false}]},
      {id:'inst', name:'Instalaciones y limpieza', weight:15, questions:[
        {id:'q8',name:'Limpieza y orden',tipo:'Sí / No',weight:50,req:true,critico:false,evidencia:'foto',evidNota:'Foto del área de atención y piso de venta.'},
        {id:'q9',name:'Imagen y señalización',tipo:'Escala 1–5',weight:50,req:false,critico:false,evidencia:'foto'}]},
      {id:'proc', name:'Proceso / Producto', weight:15, questions:[
        {id:'q10',name:'Cumplimiento del protocolo',tipo:'Sí / No',weight:55,req:true,critico:true},
        {id:'q11',name:'Calidad del producto/servicio',tipo:'Escala 1–5',weight:45,req:true,critico:false,evidencia:'foto_geo',evidNota:'Foto del producto con ubicación de la sucursal.'}]},
      {id:'cierre', name:'Cierre y despedida', weight:10, questions:[
        {id:'q12',name:'Despedida e invitación a volver',tipo:'Escala 1–5',weight:60,req:false,critico:false},
        {id:'q13',name:'Venta cruzada / adicional',tipo:'Sí / No',weight:40,req:false,critico:false}]},
    ];
  }

  function defaultProgram(){
    return { activeId:'def', versions:[ {id:'def', name:'General', criterio:'General', aplica:'Todas las sucursales', sections:defaultSections()} ] };
  }

  const TIPOS = ['Escala 1–5','Sí / No','Opción múltiple','Texto','Texto + foto','Numérico'];
  const TIPOS_SCORE = ['Escala 1–5','Sí / No','Numérico']; // tipos que aportan al score
  const CRITERIOS = ['General','Por sucursal','Por marca','Por cadena','Por tipo de establecimiento'];
  /* tipos de evidencia que el shopper debe aportar por pregunta/visita */
  const EVID = [
    {id:'none',  label:'Sin evidencia',        icon:'—'},
    {id:'foto',  label:'Foto',                 icon:'📷'},
    {id:'foto_geo',label:'Foto geolocalizada', icon:'📍'},
    {id:'video', label:'Video',                icon:'🎥'},
    {id:'audio', label:'Audio',                icon:'🎙️'},
    {id:'varios',label:'Varios (foto+video)',  icon:'🗂️'},
  ];

  CX.programa = {
    TIPOS, TIPOS_SCORE, CRITERIOS, EVID, uid,
    evidLabel(id){ const e=EVID.find(x=>x.id===id); return e?e.label:'Sin evidencia'; },
    evidIcon(id){ const e=EVID.find(x=>x.id===id); return e?e.icon:'—'; },

    _ls(pid){ return 'cx_programa_'+pid; },
    _migrate(prog){
      // garantiza ids y estructura
      if(!prog.versions) prog=defaultProgram();
      prog.versions.forEach(v=>{ if(!v.id)v.id=uid('ver'); v.sections=(v.sections||[]).map(s=>{
        if(!s.id)s.id=uid('sec'); s.questions=(s.questions||[]).map(q=>({id:q.id||uid('q'),name:q.name||q.t||'Pregunta',tipo:q.tipo||'Escala 1–5',weight:+q.weight||+q.peso||0,req:!!q.req,critico:!!q.critico,evidencia:q.evidencia||'none',evidNota:q.evidNota||''}));
        return s; }); });
      if(!prog.activeId||!prog.versions.some(v=>v.id===prog.activeId)) prog.activeId=prog.versions[0].id;
      return prog;
    },

    get(pid){
      pid = pid || CX.data.currentProjectId;
      try{ const s=JSON.parse(localStorage.getItem(this._ls(pid))||'null'); if(s) return this._migrate(s); }catch(e){}
      return defaultProgram();
    },
    save(pid, prog){ pid=pid||CX.data.currentProjectId; try{ localStorage.setItem(this._ls(pid), JSON.stringify(prog)); }catch(e){} CX.bus&&CX.bus.emit('programa'); },
    reset(pid){ try{ localStorage.removeItem(this._ls(pid)); }catch(e){} CX.bus&&CX.bus.emit('programa'); },

    /* versión activa y sus secciones (lo que consumen shopper y portal cliente) */
    activeVersion(pid){ const p=this.get(pid); return p.versions.find(v=>v.id===p.activeId)||p.versions[0]; },
    sections(pid){ return this.activeVersion(pid).sections; },
    versions(pid){ return this.get(pid).versions; },

    addVersion(pid, name, criterio){ const p=this.get(pid); const v={id:uid('ver'), name:name||'Nueva versión', criterio:criterio||'General', aplica:'', sections:defaultSections()}; p.versions.push(v); p.activeId=v.id; this.save(pid,p); return v; },
    duplicateVersion(pid, vid){ const p=this.get(pid); const src=p.versions.find(v=>v.id===vid); if(!src)return; const c=JSON.parse(JSON.stringify(src)); c.id=uid('ver'); c.name=src.name+' (copia)'; c.sections.forEach(s=>{s.id=uid('sec');s.questions.forEach(q=>q.id=uid('q'));}); p.versions.push(c); p.activeId=c.id; this.save(pid,p); return c; },
    removeVersion(pid, vid){ const p=this.get(pid); if(p.versions.length<=1)return false; p.versions=p.versions.filter(v=>v.id!==vid); if(p.activeId===vid)p.activeId=p.versions[0].id; this.save(pid,p); return true; },
    setActive(pid, vid){ const p=this.get(pid); p.activeId=vid; this.save(pid,p); },

    /* validación de pesos */
    validate(sections){
      const sSum=sections.reduce((a,s)=>a+(+s.weight||0),0);
      const qSums={}; sections.forEach(s=>qSums[s.id]=s.questions.reduce((a,q)=>a+(+q.weight||0),0));
      return { sectionsSum:sSum, sectionsOk:sSum===100, qSums, allQOk:sections.every(s=>qSums[s.id]===100) };
    },

    /* convierte un valor de respuesta crudo a 0–100 según el tipo */
    answerTo100(tipo, val){
      if(val==null||val==='') return null;
      if(tipo==='Escala 1–5'){ const n=+val; return isNaN(n)?null:Math.max(0,Math.min(100,(n-1)/4*100)); }
      if(tipo==='Sí / No'){ return (''+val).toLowerCase()==='sí'||val===true||val==='si'?100:0; }
      if(tipo==='Numérico'){ const n=+val; return isNaN(n)?null:Math.max(0,Math.min(100,n)); }
      return null; // texto/foto/opción múltiple no aportan score
    },

    /* score ponderado a partir de respuestas {questionId: valorCrudo}.
       Normaliza por los pesos de las preguntas/ secciones efectivamente puntuadas. */
    score(sections, answers){
      const bySection={}; let totW=0, totS=0; let koFail=false;
      sections.forEach(sec=>{
        let w=0, acc=0;
        sec.questions.forEach(q=>{
          const v=this.answerTo100(q.tipo, answers[q.id]);
          if(v==null) return;
          if(q.critico && v<=0) koFail=true; // pregunta crítica fallida
          acc += v*(+q.weight||0); w += (+q.weight||0);
        });
        const sScore = w>0 ? acc/w : null;
        bySection[sec.id]=sScore==null?null:Math.round(sScore);
        if(sScore!=null){ totS += sScore*(+sec.weight||0); totW += (+sec.weight||0); }
      });
      let total = totW>0 ? Math.round(totS/totW) : 0;
      if(koFail) total = Math.min(total, 49); // crítica fallida limita el score
      return { total, bySection, koFail };
    },
  };

  /* invalidar caché del portal cuando cambia el programa */
  CX.bus && CX.bus.on('programa', ()=>{ CX.clienteData && CX.clienteData.invalidate && CX.clienteData.invalidate(); });
})();
