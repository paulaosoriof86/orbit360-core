/* ============================================================
   CXOrbia · Shoppers store (persistencia + alta/edición)
   Capa sobre el mock de data.js: añade shoppers reales (registro /
   alta manual / creación en asignación), edita perfiles y los
   persiste en localStorage. Genérico y white-label.
   ============================================================ */
window.CX = window.CX || {};

(function(){
  const D = CX.data;
  if(!D) return;

  const LS_ADDED = 'cx_shoppers';        // shoppers creados en la plataforma
  const LS_PATCH = 'cx_shopper_patches'; // ediciones a shoppers semilla

  /* ids semilla (mock original) — sus ediciones se guardan como patch */
  const SEED_IDS = new Set(D.shoppers.map(s=>s.id));

  function load(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
  function save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  /* normaliza un shopper: garantiza firstName/lastName/whatsapp/full */
  function norm(s){
    if(!s.firstName && !s.lastName){
      const parts=(s.nombre||'').trim().split(/\s+/);
      s.firstName=parts[0]||''; s.lastName=parts.slice(1).join(' ')||'';
    }
    const full=(s.firstName+' '+s.lastName).trim();
    if(full) s.nombre=full;
    s.whatsapp = s.whatsapp || s.phone || '';
    if(!s.phone) s.phone=s.whatsapp;
    if(s.perfilCompleto===undefined) s.perfilCompleto=true;
    if(!s.createdVia) s.createdVia='seed';
    return s;
  }

  /* ---- aplica ediciones persistidas a las semillas y carga los añadidos ---- */
  D.shoppers.forEach(norm);
  const patches = load(LS_PATCH) || {};
  D.shoppers.forEach(s=>{ if(patches[s.id]) Object.assign(s, patches[s.id]); norm(s); });
  (load(LS_ADDED) || []).forEach(s=>{ if(!D.shoppers.some(x=>x.id===s.id)) D.shoppers.push(norm(s)); });

  /* siguiente código EVL-NN disponible */
  function nextCode(){
    let max=0;
    D.shoppers.forEach(s=>{ const m=/EVL-(\d+)/.exec(s.code||''); if(m) max=Math.max(max,+m[1]); });
    return 'EVL-'+String(max+1).padStart(2,'0');
  }

  function persist(){
    const added = D.shoppers.filter(s=>!SEED_IDS.has(s.id));
    save(LS_ADDED, added);
    save(LS_PATCH, patches);
  }

  /* =================== API pública =================== */

  D.getShopper = function(id){ return this.shoppers.find(s=>s.id===id) || null; };

  /* alta de shopper. cfg admite cualquier subset; mínimos: firstName/lastName/whatsapp.
     via: 'registro' | 'manual' | 'asignacion' */
  D.addShopper = function(cfg={}){
    const id = cfg.id || ('sh-'+Date.now().toString(36)+Math.floor(Math.random()*900+100));
    const firstName=(cfg.firstName||'').trim();
    const lastName =(cfg.lastName||'').trim();
    const nombre = (firstName+' '+lastName).trim() || cfg.nombre || 'Evaluador nuevo';
    const via = cfg.via || 'manual';
    // perfil completo si trae los datos clave de automatización
    const completo = cfg.perfilCompleto!==undefined ? cfg.perfilCompleto
      : !!(firstName && lastName && (cfg.whatsapp||cfg.phone) && cfg.pais && cfg.ciudad && cfg.email && cfg.edad && cfg.sexo);
    const s = norm(Object.assign({
      id, code: cfg.code || nextCode(),
      firstName, lastName, nombre,
      pais: cfg.pais||'', depto: cfg.depto||'', ciudad: cfg.ciudad||'',
      email: cfg.email||'', whatsapp: cfg.whatsapp||cfg.phone||'',
      edad: cfg.edad||'', sexo: cfg.sexo||'', dpi: cfg.dpi||'',
      cuentaPago: cfg.cuentaPago||'',
      user: cfg.user || CX.CREDS.user(firstName, lastName),
      pass: cfg.pass || CX.CREDS.pass(firstName, lastName),
      estado: cfg.estado || 'Pendiente',
      perfilCompleto: completo,
      createdVia: via,
      rating: cfg.rating||0, visitas:0, postulaciones:0, promCuest:0, certs:0,
      honorarioPref: cfg.honorarioPref||'Estándar',
      createdAt: Date.now(),
    }, cfg, {id, firstName, lastName, nombre, createdVia:via, perfilCompleto:completo}));
    this.shoppers.push(s);
    persist();
    CX.bus && CX.bus.emit('shoppers');
    return s;
  };

  /* edición de un shopper existente (semilla → patch; añadido → directo) */
  D.updateShopper = function(id, patch={}){
    const s=this.getShopper(id); if(!s) return null;
    Object.assign(s, patch);
    // recomponer nombre + credenciales si cambian nombre/apellido
    if('firstName' in patch || 'lastName' in patch){
      s.nombre=((s.firstName||'')+' '+(s.lastName||'')).trim();
      if(patch.regenCreds){ s.user=CX.CREDS.user(s.firstName,s.lastName); s.pass=CX.CREDS.pass(s.firstName,s.lastName); }
    }
    norm(s);
    if(SEED_IDS.has(id)){ patches[id]=Object.assign(patches[id]||{}, patch, {firstName:s.firstName,lastName:s.lastName,nombre:s.nombre,perfilCompleto:s.perfilCompleto}); }
    persist();
    // notificar al equipo cualquier cambio de datos del shopper (banca/contacto/perfil)
    if(!patch._silent){
      const campos=Object.keys(patch).filter(k=>!['_silent','regenCreds','perfilCompleto'].includes(k));
      const banca=campos.some(k=>['banco','ctaTipo','ctaNum','ctaTitular','ctaMoneda','cuentaPago'].includes(k));
      if(campos.length){
        CX.notif&&CX.notif.push({to:'admin',tipo:'shopper-edit',icon:banca?'🏦':'✏️',tono:banca?'a':'b',titulo:(banca?'Datos bancarios actualizados':'Datos de shopper actualizados'),txt:s.nombre+' · '+campos.slice(0,4).join(', '),nav:'shoppers'});
        CX.automations&&CX.automations.fire('shopper_edit',{shopper:s.nombre,campos:campos.join(', ')});
      }
    }
    CX.bus && CX.bus.emit('shoppers');
    return s;
  };

  /* marca el perfil como completo cuando ya tiene los datos clave */
  D.shopperProfileComplete = function(s){
    return !!(s.firstName && s.lastName && s.whatsapp && s.pais && s.ciudad && s.email && s.edad && s.sexo);
  };

  /* histórico de visitas de un shopper (todas o del proyecto activo) */
  D.visitsForShopper = function(id, onlyCurrentProject){
    return this._visitas.filter(v=> v.shopperId===id && (!onlyCurrentProject || v.projectId===this.currentProjectId));
  };

  /* postulaciones de un shopper */
  D.postsForShopper = function(id){ return this._posts.filter(p=>p.shopperId===id); };

  /* KPIs derivados reales del histórico (para perfil) */
  D.shopperStats = function(id){
    const vs=this.visitsForShopper(id);
    const done=vs.filter(v=>['realizada','cuestionario','liquidada'].includes(v.estado));
    const liq =vs.filter(v=>v.estado==='liquidada');
    const s=this.getShopper(id)||{};
    return {
      total: vs.length,
      realizadas: done.length,
      liquidadas: liq.length,
      enCurso: vs.filter(v=>['asignada','agendada','postulada'].includes(v.estado)).length,
      postulaciones: this.postsForShopper(id).length || s.postulaciones || 0,
    };
  };
})();
