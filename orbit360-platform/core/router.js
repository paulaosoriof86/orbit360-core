/* ============================================================
   CXOrbia · Router + shell rendering (rail, topbar, mount)
   ============================================================ */
window.CX = window.CX || {};

CX.router = {
  mount(){
    const role=CX.session.role;
    document.body.classList.toggle('role-shopper',role==='shopper');
    if(role==='shopper'){ const ok=CX.data.projectsFor(role); if(ok.length && !ok.some(p=>p.id===CX.data.currentProjectId)) CX.data.currentProjectId=ok[0].id; }
    this.buildRail(role);
    const first=CX.NAV[role].flatMap(g=>g.items).find(id=>CX.moduleEnabled(id));
    const start = (CX.session.view && CX.MODULES[CX.session.view] && CX.MODULES[CX.session.view].roles.includes(role) && CX.moduleEnabled(CX.session.view))
      ? CX.session.view : first;
    this.nav(start);
  },

  buildRail(role){
    const d=CX.data, p=d.project();
    const rail=document.getElementById('rail');
    const u=CX.session.user||{};
    const initials=(u.name||'CX').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();

    /* project switcher: admin ve todos; shopper solo los de su país */
    const visibleProjects = d.projectsFor(role);
    const projOpts=visibleProjects.map(pr=>`<option value="${pr.id}" ${pr.id===d.currentProjectId?'selected':''}>${pr.name}</option>`).join('');
    const projBlock = role==='admin'
      ? `<div class="rail-proj"><div class="rail-proj-l">Proyecto activo</div>
           <select id="projSel">${projOpts}</select></div>`
      : (visibleProjects.length>1
        ? `<div class="rail-proj"><div class="rail-proj-l">Proyecto · ${u.code||''}</div>
             <select id="projSel">${projOpts}</select></div>`
        : `<div class="rail-proj"><div class="rail-proj-l">Proyecto</div>
             <div style="font-size:13px;font-weight:700">${p.name}</div>
             <div style="font-size:10.5px;color:var(--t3)">${p.industry}</div></div>`);

    const collapsed = (()=>{try{return JSON.parse(localStorage.getItem('cx_rail_col')||'{}')}catch(e){return {};}})();
    const nav=CX.NAV[role].map(group=>{
      const items=group.items.filter(id=>CX.moduleEnabled(id)).map(id=>{
        const m=CX.MODULES[id]; if(!m)return '';
        const badge = (m.badge && role==='admin') ? `<span class="n-badge">${d.kpis().postPend||''}</span>`
          : (m.badgeNotif && CX.notif && CX.notif.unread(role)) ? `<span class="n-badge">${CX.notif.unread(role)}</span>` : '';
        const soon  = m.status==='soon' ? `<span class="n-soon">pronto</span>` : '';
        return `<div class="nav-i" id="nav-${id}" data-id="${id}">
          <span class="n-ic">${m.icon}</span><span>${m.label}</span>${badge||soon}</div>`;
      }).join('');
      if(!items) return '';
      const isc = collapsed[group.sec] || false;
      return `<div class="nav-sec-wrap${isc?' nav-sec-col':''}" data-grp="${group.sec}">
        <div class="nav-sec" data-sec="${group.sec}" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none">
          <span>${group.sec}</span><span style="font-size:9px;opacity:.6;margin-left:6px">${isc?'›':'⌄'}</span></div>
        <div class="nav-sec-items">${items}</div>
      </div>`;
    }).join('');

    /* CXOrbia SIEMPRE en el sidebar (no se reemplaza). El logo del cliente va en el topbar blanco. */
    const logoHTML = `<div class="logo-mark"><span class="dot"></span></div>
         <div><div class="brand-name">CXOrbia</div><div class="brand-sub">Field Operations Platform</div></div>`;

    rail.innerHTML=`
      <div class="rail-brand">
        ${logoHTML}
      </div>
      ${projBlock}
      <nav class="rail-nav">${nav}</nav>
      <div class="rail-foot">
        <div class="rail-user"><div class="rail-av">${initials}</div>
          <div><div style="font-size:12.5px;font-weight:700;color:#fff">${u.name||'Usuario demo'}</div>
          <div style="font-size:10.5px;color:rgba(255,255,255,.5)">${role==='admin'?'Administración':role==='cliente'?'Portal del cliente':'Shopper · '+(p.countries.join('/'))}</div></div></div>
        <button class="rail-logout" id="logoutBtn">Cerrar sesión</button>
      </div>`;

    rail.querySelectorAll('.nav-i').forEach(n=>n.addEventListener('click',()=>this.nav(n.dataset.id)));
    /* logo del cliente en topbar blanco */
    if(CX.topbar&&CX.topbar.renderLogo)CX.topbar.renderLogo();
    rail.querySelectorAll('.nav-sec').forEach(sec=>sec.addEventListener('click',e=>{
      e.stopPropagation();
      const wrap=sec.closest('.nav-sec-wrap'); if(!wrap)return;
      const items=wrap.querySelector('.nav-sec-items'); if(!items)return;
      const key=sec.dataset.sec;
      const isNowCollapsed = items.style.display!=='none';
      items.style.display = isNowCollapsed ? 'none' : '';
      sec.querySelector('span:last-child').textContent = isNowCollapsed ? '›' : '⌄';
      try{const cl=JSON.parse(localStorage.getItem('cx_rail_col')||'{}');cl[key]=isNowCollapsed;localStorage.setItem('cx_rail_col',JSON.stringify(cl));}catch(e){}
    }));
    /* restore collapsed state */
    rail.querySelectorAll('.nav-sec-wrap').forEach(wrap=>{
      const key=wrap.dataset.grp;
      if(collapsed[key]){
        const items=wrap.querySelector('.nav-sec-items');
        const arrow=wrap.querySelector('.nav-sec span:last-child');
        if(items)items.style.display='none';
        if(arrow)arrow.textContent='›';
      }
    });
    const sel=document.getElementById('projSel');
    if(sel)sel.addEventListener('change',()=>{d.setProject(sel.value);CX.ui.toast('Proyecto: '+d.project().name,'ok');});
    document.getElementById('logoutBtn').addEventListener('click',()=>CX.app.logout());
  },

  nav(id){
    const role=CX.session.role, m=CX.MODULES[id];
    if(!m||!m.roles.includes(role)||!CX.moduleEnabled(id)) return;
    CX.session.view=id; CX.session.save();
    document.querySelectorAll('.nav-i').forEach(n=>n.classList.toggle('active',n.dataset.id===id));
    document.body.classList.remove('nav-open');
    // crumb
    const group=CX.NAV[role].find(g=>g.items.includes(id));
    document.getElementById('crumb').innerHTML=`${group?group.sec:''} <span class="sep">/</span> <b>${m.label}</b>`;
    this.render(id);
    const c=document.querySelector('.content'); if(c)c.scrollTo({top:0});
  },

  render(id){
    const host=document.getElementById('view');
    const fn=CX.modules[id];
    host.classList.remove('view'); void host.offsetWidth; host.classList.add('view');
    if(typeof fn==='function'){
      const out=fn({data:CX.data, role:CX.session.role, ui:CX.ui});
      if(typeof out==='string'){host.innerHTML=out;}
      else if(out instanceof Node){host.innerHTML='';host.appendChild(out);}
      else {host.innerHTML='';}
    } else {
      host.innerHTML=CX.ui.scaffold(id);
    }
  },
};

/* re-render current view + rail badges when project changes */
CX.bus.on('project',()=>{
  if(!CX.session.role)return;
  CX.router.buildRail(CX.session.role);
  CX.router.nav(CX.session.view);
});

/* ============================================================
   SINCRONÍA CENTRAL · una sola fuente de re-render para toda la
   plataforma. Cualquier mutación de datos re-renderiza la vista
   activa + recalcula badges del rail. Registrado UNA vez aquí
   (no en los módulos) para evitar fugas de listeners.
   visit-flow → asignación, cuestionario/score, sync HR, agenda
   shoppers   → alta/edición de evaluadores
   clients    → alta/edición de clientes
   programa   → edición de cuestionario ponderado (op ↔ cliente)
   ============================================================ */
(function(){
  let _busy=false;
  function reRender(){
    if(_busy || !CX.session.role || !CX.session.view) return;
    _busy=true;
    try{ CX.router.buildRail(CX.session.role); CX.router.nav(CX.session.view); }
    finally{ _busy=false; }
  }
  ['visit-flow','shoppers','clients','programa'].forEach(ev=>CX.bus.on(ev, reRender));
  CX.router._reRender = reRender;
})();
