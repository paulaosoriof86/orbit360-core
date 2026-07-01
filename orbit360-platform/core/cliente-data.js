/* ============================================================
   CXOrbia · Motor del Portal Estratégico del Cliente
   Genérico/white-label. Deriva del proyecto activo:
   - Programa de evaluación con SECCIONES y PREGUNTAS ponderadas (pesos %)
   - Scorecard por sucursal (score ponderado 0–100 + desglose por sección)
   - Agregados ejecutivos, scope por rol del cliente, planes de acción.
   Sin datos reales: todo se genera determinísticamente por proyecto.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  function rng(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=s*16807%2147483647)/2147483647;}
  function hash(str){let h=0;for(let i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))|0;}return Math.abs(h)+7;}
  function pick(r,a){return a[Math.floor(r()*a.length)];}
  const NAMES=['A. Gómez','C. Ramírez','M. Díaz','J. Herrera','L. Castro','P. Morales','R. Flores','S. Mejía','D. Navarro','V. Rosales','F. Aguilar','N. Cabrera'];

  /* programa por defecto (genérico de experiencia/auditoría) — pesos suman 100 */
  const PROGRAMA_BASE = [
    {id:'recib', name:'Recibimiento', weight:15, questions:[
      {id:'saludo',name:'Saludo y bienvenida',weight:50},{id:'espera',name:'Tiempo de espera inicial',weight:50}]},
    {id:'aten', name:'Asesoría y atención', weight:30, questions:[
      {id:'conoc',name:'Conocimiento del asesor',weight:40},{id:'amab',name:'Amabilidad y actitud',weight:35},{id:'neces',name:'Detección de necesidad',weight:25}]},
    {id:'tiemp', name:'Tiempos de servicio', weight:15, questions:[
      {id:'agil',name:'Agilidad del proceso',weight:60},{id:'fila',name:'Manejo de filas',weight:40}]},
    {id:'inst', name:'Instalaciones y limpieza', weight:15, questions:[
      {id:'limp',name:'Limpieza y orden',weight:50},{id:'imag',name:'Imagen y señalización',weight:50}]},
    {id:'proc', name:'Proceso / Producto', weight:15, questions:[
      {id:'cumpl',name:'Cumplimiento del protocolo',weight:55},{id:'calid',name:'Calidad del producto/servicio',weight:45}]},
    {id:'cierre', name:'Cierre y despedida', weight:10, questions:[
      {id:'desp',name:'Despedida e invitación a volver',weight:60},{id:'cross',name:'Venta cruzada / adicional',weight:40}]},
  ];

  const LS_ACC = 'cx_cli_acciones';

  CX.clienteData = {
    NAMES,

    /* ---- programa del proyecto (FUENTE ÚNICA: core/programa.js) ---- */
    programa(p){
      p = p || CX.data.project();
      if(CX.programa) return CX.programa.sections(p.id).map(s=>({...s, questions:s.questions.map(q=>({...q}))}));
      return (p.programa || PROGRAMA_BASE).map(s=>({...s, questions:s.questions.map(q=>({...q}))}));
    },

    /* ---- ciudades del país desde el catálogo geo (fallback simple) ---- */
    _cities(pais){
      const g=CX.GEO&&CX.GEO[pais];
      if(g){ const out=[]; Object.keys(g).forEach(dep=>g[dep].forEach(c=>out.push({dep,city:c}))); return out; }
      return [{dep:'Región Central',city:'Ciudad'}];
    },

    /* ---- scorecards por sucursal ----
       Se derivan de las VISITAS REALES del proyecto (sincronía operación→cliente).
       El score usa cuestionarios efectivamente enviados (evaluada); si una sucursal
       aún no tiene score real, cae a un valor determinístico estable. */
    sucursales(p){
      p = p || CX.data.project();
      if(this._cache && this._cache.id===p.id) return this._cache.list;
      const prog=this.programa(p);
      const vis=(CX.data._visitas||[]).filter(v=>v.projectId===p.id);
      const list = vis.length ? this._fromVisitas(p, prog, vis) : this._synthetic(p, prog);
      list.sort((a,b)=>b.score-a.score);
      this._cache={id:p.id, list};
      return list;
    },

    /* agrupa visitas por sucursal y arma el scorecard con datos reales */
    _fromVisitas(p, prog, vis){
      const groups={};
      vis.forEach(v=>{ (groups[v.sucursal]=groups[v.sucursal]||[]).push(v); });
      return Object.keys(groups).map((name,i)=>{
        const vs=groups[name];
        const r=rng(hash(p.id+name));
        const evals=vs.filter(v=>typeof v.score==='number' && v.evaluada);
        // score: real si hay cuestionarios enviados; si no, determinístico estable
        let score, sectionScores={};
        if(evals.length){
          score=Math.round(evals.reduce((a,v)=>a+v.score,0)/evals.length);
          prog.forEach(sec=>{ const vals=evals.map(v=>v.scoreBySection&&v.scoreBySection[sec.id]).filter(x=>typeof x==='number');
            sectionScores[sec.id]= vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : Math.max(35,Math.min(100,score+Math.round((r()-0.5)*20))); });
        } else {
          const base=58+Math.floor(r()*38); score=0;
          prog.forEach(sec=>{ const sv=Math.max(35,Math.min(100,base+Math.round((r()-0.5)*26))); sectionScores[sec.id]=sv; score+=sv*(sec.weight/100); });
          score=Math.round(score);
        }
        const prev=Math.max(35,Math.min(100,score+Math.round((r()-0.5)*16)));
        const v0=vs[0];
        return {
          id:p.id+'-su'+(i+1), code:'SUC-'+String(i+1).padStart(2,'0'), name,
          ciudad:v0.ciudad||'—', region:(CX.geo&&CX.geo.deptLabel?'':'')||v0.region||v0.ciudad||'Región', pais:v0.pais||(p.countries&&p.countries[0]),
          responsable:pick(r,NAMES), visitas:vs.length, evaluadas:evals.length,
          score, prev, delta:score-prev,
          nps:Math.max(-100,Math.min(100,Math.round((score-55)*1.6))),
          sectionScores, real:evals.length>0,
          lastVisit:(vs.map(v=>v.realizada||v.agendada||v.disponibleDesde||'').filter(Boolean).sort().slice(-1)[0])||'2026-06-15',
        };
      });
    },

    /* fallback puramente determinístico (proyectos sin visitas cargadas) */
    _synthetic(p, prog){
      const r=rng(hash(p.id)); const n=Math.min(p.sucursales||12,14); const list=[];
      for(let i=0;i<n;i++){
        const pais=pick(r,p.countries||['GT']); const loc=pick(r,this._cities(pais));
        const base=58+Math.floor(r()*38); const sectionScores={}; let score=0;
        prog.forEach(sec=>{ const v=Math.max(35,Math.min(100,base+Math.round((r()-0.5)*26))); sectionScores[sec.id]=v; score+=v*(sec.weight/100); });
        score=Math.round(score); const prev=Math.max(35,Math.min(100,score+Math.round((r()-0.5)*16)));
        list.push({ id:p.id+'-su'+(i+1), code:'SUC-'+String(i+1).padStart(2,'0'),
          name:'Sucursal '+loc.city+' '+(String.fromCharCode(65+(i%6))), ciudad:loc.city, region:loc.dep, pais,
          responsable:pick(r,NAMES), visitas:2+Math.floor(r()*8), evaluadas:0,
          score, prev, delta:score-prev, nps:Math.max(-100,Math.min(100,Math.round((score-55)*1.6))),
          sectionScores, real:false, lastVisit:'2026-06-'+String(8+Math.floor(r()*18)).padStart(2,'0') });
      }
      return list;
    },

    /* ---- scope por rol del cliente (director/regional/sucursal) ---- */
    scoped(p){
      const all=this.sucursales(p), u=CX.session.user||{};
      if(u.clienteRole==='regional'){ const reg=u.scopeRegion||this.topRegion(p); return all.filter(s=>s.region===reg); }
      if(u.clienteRole==='sucursal'){ const id=u.scopeSucursal||all[0].id; return all.filter(s=>s.id===id); }
      return all;
    },
    topRegion(p){ const c={}; this.sucursales(p).forEach(s=>c[s.region]=(c[s.region]||0)+1); return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]; },
    regions(p){ return [...new Set(this.sucursales(p).map(s=>s.region))]; },

    /* ---- agregados ejecutivos sobre un conjunto de sucursales ---- */
    resumen(list){
      const n=list.length||1;
      const totVis=list.reduce((a,s)=>a+s.visitas,0);
      const wScore=Math.round(list.reduce((a,s)=>a+s.score*s.visitas,0)/(totVis||1));
      const prog=this.programa();
      const secAvg=prog.map(sec=>({sec, val:Math.round(list.reduce((a,s)=>a+(s.sectionScores[sec.id]||0),0)/n)}));
      secAvg.sort((a,b)=>a.val-b.val);
      return {
        n:list.length, visitas:totVis,
        score:wScore,
        nps:Math.round(list.reduce((a,s)=>a+s.nps,0)/n),
        excelentes:list.filter(s=>s.score>=85).length,
        criticas:list.filter(s=>s.score<70).length,
        mejora:list.filter(s=>s.delta>0).length,
        top:[...list].sort((a,b)=>b.score-a.score).slice(0,5),
        bottom:[...list].sort((a,b)=>a.score-b.score).slice(0,5),
        peorSeccion:secAvg[0], mejorSeccion:secAvg[secAvg.length-1],
        secAvg,
      };
    },

    /* ---- tono/etiqueta de score ---- */
    tone(v){ return v>=85?'g':v>=75?'b':v>=65?'a':'r'; },
    label(v){ return v>=85?'Excelente':v>=75?'Bueno':v>=65?'En atención':'Crítico'; },

    /* ---- planes de acción (seed + persistentes) ---- */
    _seedAcciones(p){
      const list=this.sucursales(p); const out=[];
      const top=list[0], bottom=list[list.length-1];
      if(top) out.push({id:'seed-rec', tipo:'reconocimiento', sucursal:top.name, sucId:top.id, titulo:'Reconocimiento por desempeño', detalle:'Score '+top.score+'. Comunicar al equipo y replicar buenas prácticas.', responsable:top.responsable, estado:'Abierto', fecha:'2026-06-19'});
      if(bottom) out.push({id:'seed-mej', tipo:'mejora', sucursal:bottom.name, sucId:bottom.id, titulo:'Plan de mejora — '+this.resumen([bottom]).peorSeccion.sec.name, detalle:'Score '+bottom.score+'. Capacitación y reevaluación en 30 días.', responsable:bottom.responsable, estado:'En curso', fecha:'2026-06-17'});
      out.push({id:'seed-inc', tipo:'incentivo', sucursal:top?top.name:'—', sucId:top?top.id:'', titulo:'Incentivo trimestral al mejor score', detalle:'Bono al equipo de la sucursal líder del trimestre.', responsable:'RRHH', estado:'Abierto', fecha:'2026-06-20'});
      return out;
    },
    acciones(p){
      p=p||CX.data.project();
      let extra=[]; try{ extra=JSON.parse(localStorage.getItem(LS_ACC)||'[]').filter(a=>a.projectId===p.id); }catch(e){}
      return [...extra, ...this._seedAcciones(p)];
    },
    addAccion(p, a){
      p=p||CX.data.project();
      let all=[]; try{ all=JSON.parse(localStorage.getItem(LS_ACC)||'[]'); }catch(e){}
      const rec=Object.assign({id:'acc-'+Date.now().toString(36), projectId:p.id, estado:'Abierto', fecha:new Date().toISOString().slice(0,10)}, a);
      all.unshift(rec); try{ localStorage.setItem(LS_ACC, JSON.stringify(all)); }catch(e){}
      return rec;
    },

    /* ---- marketplace de servicios / add-ons (upsell) ---- */
    marketplace:[
      {cat:'Investigación', icon:'🔬', name:'Investigación de mercados', desc:'Estudios ad-hoc, paneles y encuestas cuantitativas/cualitativas.', tag:'Add-on'},
      {cat:'Voz del Cliente', icon:'💬', name:'Voz del Cliente (VoC)', desc:'Encuestas post-transacción, QR en sucursal y NPS del cliente real.', tag:'Add-on'},
      {cat:'Benchmark', icon:'📊', name:'Mystery shopping competitivo', desc:'Mide a tu competencia con la misma vara y compara por sector.', tag:'Pro'},
      {cat:'Capacitación', icon:'🎓', name:'Academia para tu personal', desc:'Cursos y certificación del personal según brechas detectadas.', tag:'Add-on'},
      {cat:'Evidencia', icon:'📍', name:'Evidencia foto/GPS/video', desc:'Validación de ubicación y evidencia multimedia con timestamp.', tag:'Pro'},
      {cat:'Analítica', icon:'📈', name:'BI & tableros avanzados', desc:'Conecta Power BI / Looker y explota tus datos a profundidad.', tag:'Enterprise'},
      {cat:'Marketing', icon:'📣', name:'Contenidos & campañas', desc:'Generación de piezas, publicaciones y medición de campañas.', tag:'Add-on'},
      {cat:'Integración', icon:'🔗', name:'Integraciones a la medida', desc:'WhatsApp, Notion, Zoom/Meet, Mailchimp, M365, SSO y más.', tag:'Pro'},
    ],

    invalidate(){ this._cache=null; },

    /* RESULTADOS REALES de operación: scores de cuestionarios efectivamente
       enviados por shoppers en este proyecto (sincronía operación → cliente). */
    realResults(p){
      p=p||CX.data.project();
      const vis=CX.data._visitas.filter(v=>v.projectId===p.id && typeof v.score==='number' && v.evaluada);
      if(!vis.length) return {count:0};
      const avg=Math.round(vis.reduce((a,v)=>a+v.score,0)/vis.length);
      const prog=this.programa(p); const bySection={};
      prog.forEach(sec=>{ const vals=vis.map(v=>v.scoreBySection&&v.scoreBySection[sec.id]).filter(x=>typeof x==='number');
        if(vals.length) bySection[sec.id]=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length); });
      const ko=vis.filter(v=>v.koFail).length;
      return {count:vis.length, avg, bySection, ko, visitas:vis};
    },
  };

  CX.bus && CX.bus.on('project', ()=>CX.clienteData.invalidate());
  CX.bus && CX.bus.on('visit-flow', ()=>CX.clienteData.invalidate());
})();
