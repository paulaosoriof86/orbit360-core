/* ============================================================
   CXOrbia · Hojas de Ruta (HR) — motor genérico
   Soporta HR interna / importada / ONLINE (Google Sheets / Excel).
   Cuando es online, se "lee en vivo" y el sistema se alimenta de
   ella: filas asignadas directamente en la HR se sincronizan a la
   plataforma SIN DUPLICAR (match por extId/visitId); cambios de
   fecha y reembolso también se reflejan. Las Visitas Disponibles
   se derivan de la HR activa.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  function citiesFor(pais){
    const g=CX.GEO&&CX.GEO[pais]; if(g){const o=[];Object.keys(g).forEach(d=>g[d].forEach(c=>o.push(c)));return o;}
    return ['Ciudad'];
  }

  CX.hr = {
    _ext:{},               // HR externa simulada por proyecto (fuente de verdad externa)

    fuente(p){ p=p||CX.data.project(); return (p.hrMap&&p.hrMap.fuente)||'Hoja creada en plataforma'; },
    esOnline(p){ const f=this.fuente(p); return /sheets|online|excel/i.test(f); },
    setFuente(p, f){ p=p||CX.data.project(); p.hrMap=p.hrMap||{}; p.hrMap.fuente=f; CX.bus&&CX.bus.emit('project'); },

    /* HR externa (simula la hoja online). Espeja algunas visitas + filas creadas
       DIRECTAMENTE en la HR (aún no existen como visita en la plataforma). */
    external(p){
      p=p||CX.data.project();
      if(this._ext[p.id]) return this._ext[p.id];
      const cur=p.currency||{}; const c0=(p.countries&&p.countries[0])||'GT';
      const vis=CX.data._visitas.filter(v=>v.projectId===p.id).slice(0,6);
      const rows=vis.map((v,i)=>({
        extId:'HR-'+String(i+1).padStart(2,'0'), visitId:v.id,
        sucursal:v.sucursal, ciudad:v.ciudad, pais:v.pais, quincena:v.quincena, escenario:v.escenario,
        fecha:v.agendada||v.disponibleDesde||'', honorario:v.honorario,
        reembolso:(v.boleto||0)+(v.comboAmt||0), shopper:v.shopper||'', estado:v.estado, origen:'plataforma',
      }));
      const cities=citiesFor(c0);
      // filas creadas directamente en la HR (asignadas en la hoja, no en la plataforma)
      rows.push({extId:'HR-D1', visitId:null, sucursal:'Sucursal '+cities[0]+' (alta en HR)', ciudad:cities[0], pais:c0,
        quincena:(p.quincenas&&p.quincenas[0])||'Quincena 1', escenario:(p.scenarios&&p.scenarios[0])||'General',
        fecha:'2026-06-23', honorario:(p.honorario&&p.honorario[c0])||0, reembolso:0,
        shopper:'Asignado en la hoja', estado:'asignada', origen:'hr'});
      rows.push({extId:'HR-D2', visitId:null, sucursal:'Sucursal '+(cities[1]||cities[0])+' (alta en HR)', ciudad:cities[1]||cities[0], pais:c0,
        quincena:(p.quincenas&&p.quincenas[1])||'Quincena 2', escenario:(p.scenarios&&p.scenarios[0])||'General',
        fecha:'2026-06-25', honorario:(p.honorario&&p.honorario[c0])||0, reembolso:0,
        shopper:'', estado:'disponible', origen:'hr'});
      this._ext[p.id]=rows; return rows;
    },

    /* compara HR externa contra la plataforma → clasifica filas */
    diff(p){
      p=p||CX.data.project();
      const rows=this.external(p);
      const nuevos=[], updates=[], iguales=[];
      rows.forEach(r=>{
        // resolver visitId por extId; si no, por LLAVE NATURAL estable (evita duplicar
        // filas que ya existen como visita creada en la plataforma — doble vía)
        let v = r.visitId ? CX.data._visitas.find(x=>x.id===r.visitId) : null;
        if(!v && CX.dedupe){ v = CX.dedupe.match(r, p.id); if(v) r.visitId=v.id; }
        if(!v){ nuevos.push(r); return; }
        const cambioFecha=(v.agendada||v.disponibleDesde||'')!==r.fecha;
        const cambioReemb=((v.boleto||0)+(v.comboAmt||0))!==(+r.reembolso||0);
        if(cambioFecha||cambioReemb){ updates.push({row:r, cambioFecha, cambioReemb}); } else iguales.push(r);
      });
      return {nuevos, updates, iguales, total:rows.length};
    },

    /* sincroniza HR → plataforma SIN DUPLICAR (crea nuevas, actualiza cambios) */
    sync(p){
      p=p||CX.data.project();
      const d=this.diff(p); let creadas=0, actualizadas=0;
      d.nuevos.forEach(r=>{
        const id=p.id+'-hr'+(Date.now().toString(36).slice(-4))+creadas;
        const sh=r.shopper?CX.data.shoppers.find(s=>s.nombre===r.shopper):null;
        CX.data._visitas.push({
          id, projectId:p.id, num:CX.data._visitas.filter(v=>v.projectId===p.id).length+1,
          sucursal:r.sucursal, ciudad:r.ciudad, pais:r.pais, currency:(p.currency&&p.currency[r.pais])||'$',
          quincena:r.quincena, escenario:r.escenario, franja:'Semana', franjaCode:'WK',
          canal:(p.canales&&p.canales[0])||'—', formato:p.formato,
          honorario:r.honorario, boleto:+r.reembolso||0, combo:p.combo, comboAmt:0,
          estado:r.estado||'disponible', shopperId:sh?sh.id:null, shopper:sh?sh.nombre:(r.shopper||null), shopperCode:sh?sh.code:null,
          rango:'', disponibleDesde:r.fecha, agendada:r.estado==='asignada'?r.fecha:null, realizada:null, cuestFecha:null, submit:false,
          extId:r.extId,
        });
        r.visitId=id; creadas++;
      });
      d.updates.forEach(u=>{
        const v=CX.data._visitas.find(x=>x.id===u.row.visitId); if(!v)return;
        if(u.cambioFecha){ if(v.agendada)v.agendada=u.row.fecha; else v.disponibleDesde=u.row.fecha; }
        if(u.cambioReemb){ v.boleto=+u.row.reembolso||0; v.comboAmt=0; }
        actualizadas++;
      });
      CX.bus && CX.bus.emit('visit-flow');
      return {creadas, actualizadas, iguales:d.iguales.length};
    },

    /* edición de una celda de la HR externa (fecha/reembolso/shopper) */
    editRow(p, extId, patch){ const rows=this.external(p); const r=rows.find(x=>x.extId===extId); if(r)Object.assign(r,patch); return r; },

    /* ESCRITURA DE VUELTA a la HR (cierra la doble vía sin duplicar):
       al asignar/agendar en la plataforma, actualiza la fila externa que
       corresponde (por llave natural/extId) y dispara la automatización Make. */
    writeBack(p, v){
      p=p||CX.data.project(); if(!v) return;
      const rows=this.external(p);
      let r = rows.find(x=>x.visitId===v.id) ||
              (CX.dedupe && rows.find(x=>CX.dedupe.natKey(x)===CX.dedupe.natKey(v)));
      if(r){ r.visitId=v.id; r.shopper=v.shopper||r.shopper; r.fecha=v.agendada||v.disponibleDesde||r.fecha; r.estado=v.estado; }
      else { rows.push({extId:'HR-PB'+(rows.length+1), visitId:v.id, sucursal:v.sucursal, ciudad:v.ciudad, pais:v.pais, quincena:v.quincena, escenario:v.escenario, fecha:v.agendada||v.disponibleDesde||'', honorario:v.honorario, reembolso:(v.boleto||0)+(v.comboAmt||0), shopper:v.shopper||'', estado:v.estado, origen:'plataforma'}); }
      if(this.esOnline(p) && CX.automations) CX.automations.fire('hr_writeback',{sucursal:v.sucursal, shopper:v.shopper||'', fecha:v.agendada||v.disponibleDesde||'', estado:v.estado});
    },

    invalidate(p){ if(p)delete this._ext[p.id]; else this._ext={}; },
  };

  CX.bus && CX.bus.on('project', ()=>{ /* mantener caché por proyecto */ });
})();
