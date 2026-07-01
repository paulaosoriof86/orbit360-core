/* ============================================================
   CXOrbia · Shared UI helpers (DOM builders, toast, modal)
   Keep modules terse and consistent.
   ============================================================ */
window.CX = window.CX || {};

CX.ui = {
  /* hyperscript-ish element builder */
  el(tag, attrs, children){
    const e=document.createElement(tag);
    if(attrs) for(const k in attrs){
      const v=attrs[k];
      if(k==='class') e.className=v;
      else if(k==='html') e.innerHTML=v;
      else if(k==='text') e.textContent=v;
      else if(k.startsWith('on')&&typeof v==='function') e.addEventListener(k.slice(2),v);
      else if(v!=null) e.setAttribute(k,v);
    }
    if(children!=null){
      (Array.isArray(children)?children:[children]).forEach(c=>{
        if(c==null||c===false) return;
        e.appendChild(typeof c==='string'?document.createTextNode(c):c);
      });
    }
    return e;
  },

  /* page header */
  ph(title, sub){
    return `<div class="ph"><div class="ph-acc"></div><div class="ph-t">${title}</div>${sub?`<div class="ph-s">${sub}</div>`:''}</div>`;
  },

  /* KPI tile */
  kpi(label,value,tone='b',sub=''){
    return `<div class="kpi ${tone}"><div class="k-l">${label}</div><div class="k-v">${value}</div>${sub?`<div class="k-s">${sub}</div>`:''}</div>`;
  },

  bar(pct,label,val){
    return `<div class="flex" style="margin-bottom:9px"><span style="width:96px;font-size:11px;color:var(--t2);flex-shrink:0">${label}</span>
      <div class="bar" style="flex:1"><i style="width:${pct}%"></i></div>
      <b style="width:36px;text-align:right;font-size:11px;font-family:var(--disp);color:var(--t1)">${val??pct+'%'}</b></div>`;
  },

  bdg(text,tone='n'){ return `<span class="bdg bdg-${tone}">${text}</span>`; },

  aiBox(text,label='Capa inteligente'){
    if(!CX.BRAND.showAITag) return '';
    return `<div class="ai-box"><div class="ai-l">✨ ${label}</div><p>${text}</p></div>`;
  },

  empty(icon,msg){ return `<div class="empty"><div class="e-ic">${icon}</div>${msg}</div>`; },

  money(cur,n){ return `${cur} ${Number(n).toLocaleString('es-GT')}`; },

  /* toast */
  toast(msg,type='',ms=2800){
    let host=document.getElementById('cx-toasts');
    if(!host){host=document.createElement('div');host.id='cx-toasts';document.body.appendChild(host);}
    const t=document.createElement('div');t.className='toast '+(type||'');t.textContent=msg;
    host.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transition='.3s';setTimeout(()=>t.remove(),300);},ms);
  },

  /* modal */
  modal(title, bodyHTML, opts={}){
    const ov=document.createElement('div');ov.className='cx-ov';
    const cls='cx-modal'+(opts.full?' cx-modal-full':opts.wide?' cx-modal-wide':'');
    ov.innerHTML=`<div class="${cls}"><div class="cx-modal-h"><div class="card-t" style="font-size:16px">${title}</div>
      <button class="btn btn-ghost btn-icon" data-x>✕</button></div><div class="cx-modal-b">${bodyHTML}</div></div>`;
    document.body.appendChild(ov);
    const close=()=>ov.remove();
    ov.addEventListener('click',e=>{if(e.target===ov)close();});
    ov.querySelector('[data-x]').addEventListener('click',close);
    if(opts.onMount)opts.onMount(ov,close);
    return close;
  },

  /* status → badge tone for visits */
  estadoBadge(est){
    const m={disponible:['Disponible','b'],postulada:['Postulada','a'],asignada:['Asignada','b'],
      agendada:['Agendada','t'],realizada:['Realizada','g'],cuestionario:['Pend. cuestionario','a'],
      liquidada:['Liquidada','g'],fuera_rango:['Fuera de rango','r']};
    const x=m[est]||[est,'n']; return `<span class="bdg bdg-${x[1]}">${x[0]}</span>`;
  },

  /* placeholder for not-yet-deepened modules */
  scaffold(id){
    const m=CX.MODULES[id];
    return `${CX.ui.ph(m.label, 'Módulo en construcción · arquitectura y navegación listas')}
      <div class="card card-p">
        <div class="flex wrap" style="gap:14px">
          <div style="font-size:40px">${m.icon}</div>
          <div style="flex:1;min-width:220px">
            <div class="card-t" style="font-size:16px;margin-bottom:6px">${m.label}</div>
            <p style="font-size:13.5px;color:var(--t2);line-height:1.6">Este módulo ya existe en la plataforma y forma parte del producto.
            Está agendado en la oleada de profundización; su comportamiento de referencia está documentado en
            <span class="mono" style="font-size:12px">docs/MODULES.md</span>.</p>
            <div style="margin-top:12px">${CX.ui.bdg('En desarrollo','a')} ${CX.ui.bdg(m.roles.join(' · '),'n')}</div>
          </div>
        </div>
      </div>`;
  },
};

/* module registration: CX.module('id', ctx => htmlString | (el)=>void ) */
CX.modules = {};
CX.module = function(id, fn){ CX.modules[id]=fn; };
