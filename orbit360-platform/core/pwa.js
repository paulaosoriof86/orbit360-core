/* ============================================================
   CXOrbia · Instalación como app (PWA) + cláusula de confidencialidad
   - Detecta dispositivo/navegador y ofrece la descarga/instalación correcta.
   - Pide aceptar la cláusula al primer ingreso de cada usuario (por rol).
   ============================================================ */
window.CX = window.CX || {};

CX.pwa = {
  deferredPrompt:null,
  init(){
    window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); this.deferredPrompt=e; });
  },
  /* detección de plataforma */
  detect(){
    const ua=navigator.userAgent||'';
    const isIOS=/iPhone|iPad|iPod/i.test(ua);
    const isAndroid=/Android/i.test(ua);
    const isMac=/Macintosh/i.test(ua);
    const isWin=/Windows/i.test(ua);
    if(isIOS) return {os:'iOS', label:'iPhone / iPad', how:'safari'};
    if(isAndroid) return {os:'Android', label:'Android', how:'prompt'};
    if(isWin) return {os:'Windows', label:'Windows', how:'desktop'};
    if(isMac) return {os:'macOS', label:'Mac', how:'desktop'};
    return {os:'Web', label:'tu dispositivo', how:'desktop'};
  },
  installable(){ return !!this.deferredPrompt; },
  /* abre el flujo de instalación según plataforma */
  openInstall(ui){
    const d=this.detect();
    if(this.deferredPrompt && d.how==='prompt'){
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.finally(()=>{this.deferredPrompt=null;});
      return;
    }
    const steps = {
      safari: ['Toca el botón <b>Compartir</b> ⬆️ en Safari','Elige <b>“Agregar a inicio”</b>','Confirma — el ícono de CXOrbia quedará en tu pantalla'],
      prompt: ['Toca <b>Instalar</b> cuando el navegador lo ofrezca','O abre el menú ⋮ → <b>“Instalar aplicación”</b>'],
      desktop: ['En el navegador, abre el menú ⋮','Elige <b>“Instalar CXOrbia”</b> (o el ícono ⊕ en la barra de direcciones)','La app se abrirá en su propia ventana'],
    }[d.how] || ['Usa el menú del navegador → “Instalar aplicación”.'];
    ui.modal('📲 Instalar CXOrbia en '+d.label, `
      <div style="background:var(--brand-light);border-radius:10px;padding:11px 13px;font-size:12.5px;color:var(--brand-dark);margin-bottom:14px">
        Detectamos <b>${d.os}</b>. Instálala como app para acceso rápido, pantalla completa y notificaciones.</div>
      <ol style="margin:0 0 4px 18px;font-size:13px;color:var(--t2);line-height:2">${steps.map(s=>`<li>${s}</li>`).join('')}</ol>
    `);
  },
};

/* ---------- Cláusula de confidencialidad (primer ingreso por usuario+rol) ---------- */
CX.confidencialidad = {
  key(role){ const u=(CX.session.user&&CX.session.user.name)||'demo'; return 'cx_nda_'+role+'_'+u.replace(/\s+/g,'_'); },
  pending(role){ try{ return !localStorage.getItem(this.key(role)); }catch(e){ return false; } },
  accept(role){ try{ localStorage.setItem(this.key(role), new Date().toISOString());
    /* #201 — registro de auditoría: quién, rol, versión y fecha */
    const u=(CX.session.user&&CX.session.user.name)||'demo';
    let log=[]; try{log=JSON.parse(localStorage.getItem('cx_nda_log')||'[]');}catch(e){}
    log.unshift({usuario:u,rol:role,version:this.version(role),fecha:new Date().toISOString()});
    localStorage.setItem('cx_nda_log',JSON.stringify(log.slice(0,500)));
  }catch(e){} },
  /* #201 — versionado: al editar el texto sube la versión y se re-pide aceptación */
  version(role){ try{const v=JSON.parse(localStorage.getItem('cx_nda_ver')||'{}');return v[role]||1;}catch(e){return 1;} },
  bumpVersion(role){ let v={}; try{v=JSON.parse(localStorage.getItem('cx_nda_ver')||'{}');}catch(e){} v[role]=(v[role]||1)+1; try{localStorage.setItem('cx_nda_ver',JSON.stringify(v));}catch(e){} },
  auditLog(){ try{return JSON.parse(localStorage.getItem('cx_nda_log')||'[]');}catch(e){return [];} },
  /* textos EDITABLES por la consultora (persistentes) */
  _defaults(){ return {
    shopper:'Como evaluador, me comprometo a mantener absoluta <b>confidencialidad</b> sobre los proyectos, clientes, sucursales evaluadas y resultados. No divulgaré mi condición de evaluador durante las visitas, no compartiré instructivos, escenarios ni cuestionarios con terceros, y usaré la plataforma únicamente para ejecutar las visitas asignadas.',
    admin:'Como miembro del equipo, me comprometo a tratar con <b>confidencialidad</b> los datos de clientes, evaluadores, proyectos y resultados, usándolos solo para fines operativos autorizados con la consultora. No extraeré ni compartiré bases de datos, honorarios ni información comercial fuera de la plataforma.',
    ops:'Como operativo, me comprometo a tratar con <b>confidencialidad</b> la información de visitas, shoppers y resultados que gestiono, usándola solo para la operación de los proyectos asignados.',
    coordinador:'Como <b>coordinador / representante regional</b>, me comprometo a mantener la confidencialidad de los datos de los proyectos, hojas de ruta, evaluadores y clientes de mi(s) país(es) asignado(s). Reconozco que mi acceso está limitado a mi región; no compartiré información de otros territorios ni usaré los datos para fines ajenos a la operación acordada con la consultora.',
    aliado:'Como <b>aliado / franquiciado</b>, me comprometo a operar los proyectos delegados manteniendo la confidencialidad de la metodología, instructivos, cuestionarios y resultados de la consultora. Reconozco que la propiedad intelectual (marca, procesos, plataforma) pertenece a la consultora y no la replicaré ni la usaré fuera del alcance del acuerdo de franquicia.',
    representante:'Como <b>representante comercial</b>, me comprometo a tratar con confidencialidad la información de prospectos, propuestas, precios y la metodología de la consultora. No divulgaré estrategias comerciales ni datos de clientes potenciales a competidores.',
    socio:'Como <b>socio</b>, me comprometo a mantener la confidencialidad estratégica, financiera y operativa del negocio, sus clientes y su tecnología, conforme al acuerdo societario vigente.',
    cliente:'Como usuario del portal del cliente, me comprometo a tratar con <b>confidencialidad</b> los resultados, evaluaciones y datos de mis sucursales y personal, conforme al acuerdo con la consultora. No divulgaré la identidad de los evaluadores ni usaré los resultados para represalias improcedentes contra el personal.',
    super:'Como administrador principal, soy responsable del uso confidencial y conforme a la ley de todos los datos de la plataforma: clientes, evaluadores, resultados, finanzas e integraciones. Garantizo el cumplimiento del acuerdo de tratamiento de datos con cada cliente.',
  };
  },
  text(role){ try{ const s=JSON.parse(localStorage.getItem('cx_nda_text')||'null'); if(s&&s[role])return s[role]; }catch(e){} return this._defaults()[role]||this._defaults().admin; },
  setText(role, txt){ let s={}; try{ s=JSON.parse(localStorage.getItem('cx_nda_text')||'{}'); }catch(e){} s[role]=txt; try{ localStorage.setItem('cx_nda_text',JSON.stringify(s)); }catch(e){} this.bumpVersion(role); },
  show(role, onDone){
    const texto = this.text(role);
    const ov=document.createElement('div'); ov.className='cx-ov'; ov.style.zIndex='9500';
    ov.innerHTML=`<div class="cx-modal" style="width:min(520px,96vw)">
      <div class="cx-modal-h"><div class="card-t" style="font-size:16px">🔒 Cláusula de confidencialidad</div></div>
      <div class="cx-modal-b">
        <p style="font-size:13.5px;color:var(--t2);line-height:1.7;margin-bottom:14px">${texto}</p>
        <div style="background:var(--panel-2);border:1px solid var(--border);border-radius:10px;padding:11px 13px;font-size:12px;color:var(--t3);margin-bottom:14px">Debes aceptar para continuar. Queda registrada la fecha de aceptación (este es un demo; en producción se firma y audita).</div>
        <label class="flex" style="gap:8px;font-size:13px;color:var(--t1);margin-bottom:16px"><input type="checkbox" id="ndaChk"> He leído y acepto la cláusula de confidencialidad.</label>
        <div style="text-align:right"><button class="btn btn-pr" id="ndaOk" disabled style="opacity:.5">Aceptar y continuar</button></div>
      </div></div>`;
    document.body.appendChild(ov);
    const chk=ov.querySelector('#ndaChk'), ok=ov.querySelector('#ndaOk');
    chk.addEventListener('change',()=>{ok.disabled=!chk.checked;ok.style.opacity=chk.checked?'1':'.5';});
    ok.addEventListener('click',()=>{ this.accept(role); ov.remove(); if(onDone)onDone(); });
  },
};
