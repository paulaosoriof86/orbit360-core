/* ============================================================
   CXOrbia · Boot + login / role selection
   ============================================================ */
window.CX = window.CX || {};

/* ---------- Favicon dinámico = logo de la consultora ---------- */
CX.setFavicon = function(){
  try{
    const b=CX.BRAND||{}; const logo=b.logo||b.logoUrl;
    let href=logo;
    if(!href){
      /* genera un favicon SVG con el color de marca si no hay logo */
      const c=(b.colors&&b.colors.brand)||'#2196d3';
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${c}"/><circle cx="32" cy="32" r="15" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="60 24"/><circle cx="44" cy="22" r="4" fill="#fff"/></svg>`;
      href='data:image/svg+xml,'+encodeURIComponent(svg);
    }
    let link=document.querySelector('link[rel="icon"]');
    if(!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
    link.href=href;
    /* apple-touch-icon para instalación en iOS */
    let at=document.querySelector('link[rel="apple-touch-icon"]');
    if(!at){ at=document.createElement('link'); at.rel='apple-touch-icon'; document.head.appendChild(at); }
    at.href=href;
  }catch(e){}
};

/* ---------- PWA: instalación automática según dispositivo + navegador ---------- */
CX._deferredPrompt=null;
CX.setupPWA = function(){
  /* registra el service worker para que sea instalable */
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  const ua=navigator.userAgent||'';
  const isIOS=/iPad|iPhone|iPod/.test(ua)&&!window.MSStream;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(isStandalone) return; /* ya está instalada */

  /* Chrome/Edge/Android: capturar el evento y disparar el prompt automáticamente */
  window.addEventListener('beforeinstallprompt',(e)=>{
    e.preventDefault(); CX._deferredPrompt=e;
    /* lanza el prompt apenas el usuario interactúe (requisito de los navegadores) */
    const fire=()=>{ if(CX._deferredPrompt){ CX._deferredPrompt.prompt(); CX._deferredPrompt=null; }
      document.removeEventListener('click',fire); document.removeEventListener('keydown',fire); };
    if(!sessionStorage.getItem('cx_pwa_shown')){ sessionStorage.setItem('cx_pwa_shown','1');
      document.addEventListener('click',fire,{once:false}); document.addEventListener('keydown',fire,{once:false}); }
  });
  /* iOS Safari no soporta prompt programático: mostrar una sola guía discreta */
  if(isIOS && !sessionStorage.getItem('cx_pwa_ios')){
    sessionStorage.setItem('cx_pwa_ios','1');
    setTimeout(()=>{ if(CX.ui&&CX.ui.toast) CX.ui.toast('📲 Para instalar la app: Compartir → “Agregar a inicio”','',6000); },2500);
  }
};

CX.app = {
  init(){
    CX.applyBrand();
    CX.setFavicon();
    CX.setupPWA();
    CX.session.load();
    if(CX.session.role){ this.enter(); }
    else { this.showLogin(); }
  },

  showLogin(){
    document.getElementById('app').classList.remove('on');
    const lg=document.getElementById('login');
    lg.classList.remove('hidden');
    const b=CX.BRAND;
    const hasClientLogo = !!(b.logoUrl||b.logo);
    const brandBlock = hasClientLogo
      ? `<img class="client-logo" src="${b.logoUrl||b.logo}" alt="logo" style="max-height:64px;max-width:200px;object-fit:contain">`
      : `<div class="logo-mark"><span class="dot"></span></div>
         <div><div class="brand-name">${b.clientName||b.name}</div><div class="brand-sub">${b.tagline}</div></div>`;
    /* banderitas SOLO de los países configurados para el tenant/franquicia.
       Si no hay países elegidos, no se muestran (no listar todos). */
    let paises = (b.countries && b.countries.length) ? b.countries : [];
    if(!paises.length){ /* derivar de los proyectos reales del tenant, si existen */
      try{ const prj=(CX.data&&CX.data.projects)||[]; const set=new Set(); prj.forEach(p=>(p.countries||[]).forEach(c=>set.add(c))); paises=[...set]; }catch(e){}
    }
    const flagsRow = paises.length
      ? `<div class="login-flags">${paises.slice(0,8).map(c=>`<span class="cflag" title="${CX.paisName?CX.paisName(c):c}"><img src="https://flagcdn.com/24x18/${c.toLowerCase()}.png" alt="${c}" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'${c}',className:'cflag-txt'}))"><span>${c}</span></span>`).join('')}${paises.length>8?`<span style="font-size:11px;color:var(--t3);align-self:center">+${paises.length-8}</span>`:''}</div>`
      : '';
    /* logo pequeño de CXOrbia como "desarrollado por" (siempre visible en el pie del login) */
    const cxLogo = `<svg width="16" height="16" viewBox="0 0 64 64" style="vertical-align:middle"><rect width="64" height="64" rx="14" fill="#0d2740"/><circle cx="32" cy="32" r="15" fill="none" stroke="#4ab4e6" stroke-width="6" stroke-dasharray="58 26"/><circle cx="44" cy="22" r="4.5" fill="#fff"/></svg>`;
    const devForFooter = `<div class="login-poweredby">${cxLogo} <span>Desarrollado por <b>CXOrbia</b></span></div>`;
    lg.innerHTML=`
      <div class="login-card">
        <div class="login-brand">
          ${brandBlock}
        </div>
        <div class="login-divider"></div>
        <div class="login-title">${b.clientName?b.clientName:'Plataforma operativa de campo'}</div>
        <div class="login-sub">Selecciona un perfil para entrar al ${b.demoMode?'demo':'sistema'}</div>
        ${flagsRow}
        <button class="role-btn role-admin" data-role="admin">
          <div class="r-ic">🖥️</div>
          <div><div class="r-t">Administración / Coordinación</div>
          <div class="r-d">Operación, proyectos, finanzas y configuración</div></div>
        </button>
        <button class="role-btn role-cliente" data-role="cliente">
          <div class="r-ic">📈</div>
          <div><div class="r-t">Portal del Cliente (marca evaluada)</div>
          <div class="r-d">Resultados, score por sucursal, acciones y reportes</div></div>
        </button>
        <button class="role-btn role-shopper" data-role="shopper">
          <div class="r-ic">📱</div>
          <div><div class="r-t">Shopper / Evaluador</div>
          <div class="r-d">Portal móvil: visitas, certificación y pagos</div></div>
        </button>
        <div style="text-align:center;margin-top:6px"><a id="goReg" style="font-size:12.5px;color:var(--brand);font-weight:600;cursor:pointer">¿Eres evaluador nuevo? Regístrate aquí →</a></div>
        ${b.clientName?`<div class="login-devfor">Plataforma operativa para <b>${b.clientName}</b></div>`:''}
        ${devForFooter}
        <div style="text-align:center;margin-top:14px"><button class="btn btn-ghost btn-sm" id="pwaBtn">📲 Instalar como app</button></div>
        ${b.demoMode?`<div style="text-align:center;margin-top:10px;font-size:11px;color:var(--t3)">
          <span class="bdg bdg-a">● Demo comercial · datos ficticios</span></div>`:''}
      </div>`;
    lg.querySelectorAll('.role-btn').forEach(b=>b.addEventListener('click',()=>this.selectRole(b.dataset.role)));
    const gr=lg.querySelector('#goReg'); if(gr)gr.addEventListener('click',()=>this.showRegister());
    const pw=lg.querySelector('#pwaBtn'); if(pw)pw.addEventListener('click',()=>CX.pwa.openInstall(CX.ui));
  },

  showRegister(){
    const ids={pais:'rgPais',depto:'rgDepto',ciudad:'rgCiudad'};
    CX.ui.modal('Registro de evaluador', `
      <p style="font-size:13px;color:var(--t2);margin-bottom:14px">Crea tu cuenta. El equipo revisará tu perfil y te habilitará las visitas de tu país. Los campos marcados con <b style="color:var(--accent)">*</b> son obligatorios.</p>
      <div class="grid g2" style="gap:12px 14px">
        <div><label class="lbl">Primer nombre <b style="color:var(--accent)">*</b></label><input class="inp" id="rgFirst" placeholder="Ej. María"></div>
        <div><label class="lbl">Primer apellido <b style="color:var(--accent)">*</b></label><input class="inp" id="rgLast" placeholder="Ej. López"></div>
        ${CX.geo.fieldsHTML(ids)}
        <div><label class="lbl">WhatsApp <b style="color:var(--accent)">*</b></label><input class="inp" id="rgWa" placeholder="+502 5555 5555"></div>
        <div><label class="lbl">Correo</label><input class="inp" id="rgMail" placeholder="correo@ejemplo.com"></div>
        <div><label class="lbl">Edad</label><input class="inp" id="rgEdad" type="number" min="16" max="99" placeholder="Ej. 28"></div>
        <div><label class="lbl">Sexo</label><select class="sel" id="rgSexo"><option value="">Selecciona…</option><option>Femenino</option><option>Masculino</option><option>Otro</option><option>Prefiero no decir</option></select></div>
      </div>
      <div id="rgCreds" style="background:var(--brand-light);border-radius:10px;padding:10px 13px;font-size:12px;color:var(--brand-dark);margin:14px 0">
        Tu usuario y contraseña se generan automáticamente según el patrón del cliente
        (<b>${CX.CREDS.userExample()}</b> · <b>${CX.CREDS.passExample()}</b>). Edad y sexo se usan para automatizar la asignación de visitas.</div>
      <div style="text-align:right"><button class="btn btn-green" id="rgSave">Crear mi cuenta</button></div>
    `, {onMount:(ov,close)=>{
      CX.geo.wire(ov, ids);
      // previsualizar credenciales al escribir nombre/apellido
      const upd=()=>{
        const f=ov.querySelector('#rgFirst').value, l=ov.querySelector('#rgLast').value;
        if(f&&l) ov.querySelector('#rgCreds').innerHTML=`Tu cuenta será — usuario: <b>${CX.CREDS.user(f,l)}</b> · contraseña: <b>${CX.CREDS.pass(f,l)}</b>. Edad y sexo se usan para automatizar la asignación de visitas.`;
      };
      ov.querySelector('#rgFirst').addEventListener('input',upd);
      ov.querySelector('#rgLast').addEventListener('input',upd);
      ov.querySelector('#rgSave').addEventListener('click',()=>{
        const first=(ov.querySelector('#rgFirst').value||'').trim();
        const last =(ov.querySelector('#rgLast').value||'').trim();
        const wa   =(ov.querySelector('#rgWa').value||'').trim();
        if(!first||!last||!wa){ CX.ui.toast('Completa nombre, apellido y WhatsApp','err'); return; }
        const geo=CX.geo.read(ov, ids);
        const s=CX.data.addShopper({
          via:'registro', estado:'Pendiente',
          firstName:first, lastName:last, whatsapp:wa,
          pais:geo.pais, depto:geo.depto, ciudad:geo.ciudad,
          email:(ov.querySelector('#rgMail').value||'').trim(),
          edad:(ov.querySelector('#rgEdad').value||'').trim(),
          sexo:ov.querySelector('#rgSexo').value||'',
        });
        close();
        this.afterRegister(s);
      });
    }});
  },

  /* confirmación de registro + acceso directo al portal del nuevo shopper */
  afterRegister(s){
    CX.ui.modal('¡Cuenta creada!', `
      <div style="text-align:center;padding:6px 0 4px">
        <div style="font-size:40px;line-height:1">✅</div>
        <div class="card-t" style="font-size:17px;margin-top:8px">Bienvenido, ${s.firstName}</div>
        <div style="font-size:12.5px;color:var(--t3);margin-top:2px">Tu perfil queda en revisión del equipo.</div>
      </div>
      <div style="background:var(--brand-light);border-radius:12px;padding:14px 16px;margin:14px 0">
        <div class="between" style="margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">Usuario</span><b style="font-family:var(--disp)">${s.user}</b></div>
        <div class="between"><span style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">Contraseña</span><b style="font-family:var(--disp)">${s.pass}</b></div>
      </div>
      <p style="font-size:12.5px;color:var(--t2);line-height:1.6">Al ingresar podrás <b>completar tu perfil</b> (documento, ciudad, cuenta de pago) y empezar a postularte a visitas de tu país.</p>
      <div class="flex" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost btn-sm" data-x2>Cerrar</button><button class="btn btn-pr" id="rgEnter">Entrar a mi portal →</button></div>
    `, {onMount:(ov,close)=>{
      ov.querySelector('[data-x2]').addEventListener('click',close);
      ov.querySelector('#rgEnter').addEventListener('click',()=>{ close(); this.selectRole('shopper', s.id); });
    }});
  },

  selectRole(role, shopperId){
    CX.session.role=role;
    if(role==='admin'){
      CX.session.user={name:'Admin Demo', role:'super', org:'Tu Consultora'};
    } else if(role==='cliente'){
      CX.session.user={name:'Cliente Demo', role:'cliente', clienteRole:'director', org:'Marca Cliente'};
    } else {
      const sid=shopperId||'sh1';
      const s=CX.data.getShopper ? CX.data.getShopper(sid) : null;
      CX.session.user={name:(s&&s.nombre)||'Evaluador 01', role:'shopper', shopperId:sid, code:(s&&s.code)||'EVL-01'};
    }
    CX.session.view=null;
    CX.session.save();
    this.enter();
  },

  enter(){
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.add('on');
    const go=()=>CX.router.mount();
    if(CX.confidencialidad && CX.confidencialidad.pending(CX.session.role)){
      CX.confidencialidad.show(CX.session.role, go);
    } else { go(); }
  },

  logout(){
    CX.session.clear();
    this.showLogin();
    CX.ui.toast('Sesión cerrada','');
  },
};
function __cxBoot(){ CX.pwa && CX.pwa.init(); CX.app.init(); }

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',__cxBoot);
else __cxBoot();
    /* colapsar sidebar */
    function __cxCollapse(){
      const btn=document.getElementById('railCollapse'); if(!btn)return;
      const rail=document.querySelector('.rail');
      if(!btn._wired){btn._wired=true;
        btn.addEventListener('click',()=>{ rail.classList.toggle('collapsed'); try{localStorage.setItem('cx_rail_collapsed',rail.classList.contains('collapsed')?'1':'0');}catch(e){} });
        if(localStorage.getItem('cx_rail_collapsed')==='1')rail.classList.add('collapsed');
      }
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',__cxCollapse);
    else __cxCollapse();
    setTimeout(__cxCollapse,200);
