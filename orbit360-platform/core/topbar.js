/* ============================================================
   CXOrbia · Topbar — campanita de novedades + soporte
   La campanita reemplaza al Tablón en el menú: muestra las
   novedades del rol activo en un panel desplegable, con badge
   de no leídas, marcar leído e ir a la sección.
   ============================================================ */
window.CX = window.CX || {};

CX.topbar = {
  _open:false,
  role(){ return (CX.session && CX.session.role) || 'admin'; },

  /* logo del cliente (white-label) en el topbar blanco — NO reemplaza a CXOrbia del sidebar */
  renderLogo(){
    const el=document.getElementById('tbClientLogo'); if(!el)return;
    const logo=CX.BRAND&&(CX.BRAND.logo||CX.BRAND.logoUrl);
    const nombre=CX.BRAND&&CX.BRAND.clientName;
    if(logo){
      el.innerHTML=`<img src="${logo}" alt="cliente" style="max-height:32px;max-width:120px;object-fit:contain;display:block">`;
      el.style.display='flex';
    } else if(nombre){
      el.innerHTML=`<span style="font-size:12.5px;font-weight:700;color:var(--t1)">${nombre}</span>`;
      el.style.display='flex';
    } else {
      el.innerHTML=''; el.style.display='none';
    }
  },

  badge(){
    const b=document.getElementById('tbBellBadge'); if(!b||!CX.notif)return;
    const n=CX.notif.unread(this.role());
    b.textContent=n>9?'9+':n; b.style.display=n?'flex':'none';
  },

  panel(){
    let el=document.getElementById('tbBellPanel');
    if(!el){ el=document.createElement('div'); el.id='tbBellPanel'; el.className='tb-pop'; document.body.appendChild(el); }
    const items=CX.notif?CX.notif.for(this.role()):[];
    el.innerHTML=`
      <div class="tb-pop-h">
        <b>Novedades</b>
        <button class="btn btn-ghost btn-sm" id="tbReadAll" style="padding:2px 8px">Marcar todo leído</button>
      </div>
      <div class="tb-pop-body">
        ${items.length?items.map(n=>`<div class="tb-noti ${n.leida?'':'unread'}" data-nid="${n.id}" ${n.nav?`data-nav="${n.nav}"`:''}>
          <div class="tb-noti-ic" style="background:var(--${CX.notif.toneVar(n.tono)}-bg)">${n.icon||'🔔'}</div>
          <div style="flex:1;min-width:0">
            <div class="tb-noti-t">${n.titulo}</div>
            <div class="tb-noti-x">${n.txt||''}</div>
            <div class="tb-noti-f">${n.fecha||''}</div>
          </div>
          ${n.leida?'':'<span class="tb-noti-dot"></span>'}
        </div>`).join(''):`<div style="padding:26px 16px;text-align:center;color:var(--t3);font-size:12.5px">Sin novedades por ahora.</div>`}
      </div>
      <div class="tb-pop-f"><button class="btn btn-ghost btn-sm" id="tbOpenTablon">Ver tablón completo →</button></div>`;

    el.querySelector('#tbReadAll').addEventListener('click',(e)=>{e.stopPropagation();CX.notif.markAllRead(this.role());this.render();});
    const ot=el.querySelector('#tbOpenTablon'); if(ot)ot.addEventListener('click',()=>{this.close();CX.router.nav('tablon');});
    el.querySelectorAll('[data-nid]').forEach(row=>row.addEventListener('click',()=>{
      CX.notif.markRead(row.dataset.nid);
      if(row.dataset.nav){ this.close(); CX.router.nav(row.dataset.nav); } else this.render();
    }));
    return el;
  },

  position(){
    const bell=document.getElementById('tbBell'), el=document.getElementById('tbBellPanel'); if(!bell||!el)return;
    const r=bell.getBoundingClientRect();
    el.style.top=(r.bottom+8)+'px';
    el.style.right=Math.max(12,(window.innerWidth-r.right))+'px';
  },

  /* correo (bandeja básica con trazabilidad) */
  _mails:null,
  mailStore(){ if(!this._mails)try{this._mails=JSON.parse(localStorage.getItem('cx_mails')||'null')||[{id:'m1',de:'cliente@marca.com',para:'equipo',asunto:'Consulta sobre el programa',cuerpo:'Hola, quería consultar sobre la próxima ronda de evaluaciones. ¿Cuándo empezamos?',fecha:'2026-06-23 09:12',leido:true,proyecto:'Proyecto Retail'},{id:'m2',de:'shopper@gmail.com',para:'equipo',asunto:'Duda sobre mi visita agendada',cuerpo:'Buenos días, tengo una duda: ¿puedo cambiar la franja de mi visita del viernes? Me surgió un compromiso.',fecha:'2026-06-24 14:35',leido:false,proyecto:'Proyecto Retail'},{id:'m3',de:'nuevo_cliente@empresa.com',para:'equipo',asunto:'Solicitud de información - programa de evaluaciones',cuerpo:'Hola, somos una cadena de 12 puntos de venta y nos interesa implementar mystery shopping. ¿Podría enviarnos información?',fecha:'2026-06-25 08:20',leido:false,proyecto:null}];}catch(e){this._mails=[];} return this._mails; },
  mailUnread(){ return this.mailStore().filter(m=>!m.leido).length; },
  mailBadge(){ const b=document.getElementById('tbMailBadge');if(!b)return;const n=this.mailUnread();b.textContent=n>9?'9+':n;b.style.display=n?'flex':'none'; },
  openMail(){ const mails=this.mailStore();
    CX.ui.modal('✉️ Correo',`
      <div class="between" style="margin-bottom:12px"><div class="card-t">Bandeja de entrada <span class="bdg bdg-a">${this.mailUnread()} sin leer</span></div>
        <button class="btn btn-pr btn-sm" id="mailCompose">✍ Redactar</button></div>
      <div style="max-height:50vh;overflow:auto">
        ${mails.map(m=>`<div data-mid="${m.id}" style="display:flex;gap:11px;padding:10px 12px;border-bottom:1px solid var(--border-2);cursor:pointer;background:${m.leido?'transparent':'var(--brand-light)'}">
          <div style="font-size:20px;flex-shrink:0">${m.leido?'📧':'📩'}</div>
          <div style="flex:1;min-width:0">
            <div class="between"><b style="font-size:13px">${m.asunto}</b><span style="font-size:10.5px;color:var(--t3)">${m.fecha}</span></div>
            <div style="font-size:11.5px;color:var(--t3)">${m.de}${m.proyecto?' · '+m.proyecto:''}</div>
          </div></div>`).join('')}
      </div>
    `,{onMount:(ov,close)=>{
      ov.querySelectorAll('[data-mid]').forEach(row=>row.addEventListener('click',()=>{const m=mails.find(x=>x.id===row.dataset.mid);if(!m)return;m.leido=true;try{localStorage.setItem('cx_mails',JSON.stringify(mails));}catch(e){}this.mailBadge();
        CX.ui.modal((m.leido?'📧':'📩')+' '+m.asunto,`
          <div style="font-size:12px;color:var(--t3);margin-bottom:10px">De: ${m.de} · ${m.fecha}${m.proyecto?' · '+m.proyecto:''}</div>
          <div style="font-size:13.5px;color:var(--t2);line-height:1.7;padding:14px;background:var(--panel-2,#f8f9fa);border-radius:10px;margin-bottom:12px">${m.cuerpo}</div>
          <div class="flex" style="gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost btn-sm" id="replyWa">📲 Responder WA</button>
            <button class="btn btn-pr btn-sm" id="replyMail">↩ Responder correo</button>
          </div>
        `,{onMount:(ov2,close2)=>{
          ov2.querySelector('#replyWa').addEventListener('click',()=>{const msg=encodeURIComponent('Hola, en respuesta a tu correo sobre "'+m.asunto+'":\n\n');window.open('https://wa.me/?text='+msg,'_blank');close2();});
          ov2.querySelector('#replyMail').addEventListener('click',()=>{window.open('mailto:'+m.de+'?subject=Re: '+encodeURIComponent(m.asunto),'_blank');close2();});
        }});
      }));
      ov.querySelector('#mailCompose')?.addEventListener('click',()=>{close();CX.ui.modal('✍ Redactar correo',`
        <label class="lbl">Para</label><input class="inp" id="mcTo" placeholder="correo@destinatario.com" style="margin-bottom:8px">
        <label class="lbl">Asunto</label><input class="inp" id="mcSub" style="margin-bottom:8px">
        <label class="lbl">Mensaje</label><textarea class="inp" id="mcBody" rows="5" style="margin-bottom:12px"></textarea>
        <div class="between"><button class="btn btn-soft btn-sm" id="mcWa">📲 Enviar por WA</button><button class="btn btn-pr btn-sm" id="mcSend">Enviar correo</button></div>
      `,{onMount:(ov3,close3)=>{
        ov3.querySelector('#mcWa').addEventListener('click',()=>{const msg=encodeURIComponent(ov3.querySelector('#mcBody').value||'');window.open('https://wa.me/?text='+msg,'_blank');close3();});
        ov3.querySelector('#mcSend').addEventListener('click',()=>{const to=(ov3.querySelector('#mcTo').value||'').trim();if(!to){CX.ui.toast('Ingresa el destinatario','warn');return;}const newMail={id:'ms'+Date.now().toString(36),de:'equipo@consultora.com',para:to,asunto:ov3.querySelector('#mcSub').value||'(sin asunto)',cuerpo:ov3.querySelector('#mcBody').value||'',fecha:new Date().toISOString().slice(0,16).replace('T',' '),leido:true};mails.unshift(newMail);try{localStorage.setItem('cx_mails',JSON.stringify(mails));}catch(e){}close3();CX.ui.toast('Correo enviado a '+to,'ok');});
      }});});
    }});
  },

  toggle(){ this._open=!this._open; if(this._open){this.panel();this.position();document.getElementById('tbBellPanel').classList.add('show');}else this.close(); },
  close(){ this._open=false; const el=document.getElementById('tbBellPanel'); if(el)el.classList.remove('show'); },
  render(){ this.badge(); if(this._open)this.panel(); },

  support(){
    if(!CX.ui)return;
    CX.ui.modal('🆘 Soporte CXOrbia',`
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:14px">¿Necesitas ayuda? Escríbenos por el canal que prefieras. El equipo de soporte responde en horario hábil.</p>
      <div style="display:flex;flex-direction:column;gap:9px">
        <button class="btn btn-green" id="spWa" style="justify-content:flex-start">📲 WhatsApp de soporte</button>
        <button class="btn btn-soft" id="spMail" style="justify-content:flex-start">✉️ Correo de soporte</button>
        <button class="btn btn-ghost" id="spTicket" style="justify-content:flex-start">🎫 Crear solicitud de soporte</button>
      </div>
      <div style="margin-top:14px;font-size:11px;color:var(--t3)">Tipos: plataforma · capacitación · técnica · comercial · servicio.</div>
    `,{onMount:(ov,close)=>{
      ov.querySelector('#spWa').addEventListener('click',()=>{close();CX.ui.toast('Abriendo WhatsApp de soporte…','ok');});
      ov.querySelector('#spMail').addEventListener('click',()=>{close();CX.ui.toast('Abriendo correo de soporte…','ok');});
      ov.querySelector('#spTicket').addEventListener('click',()=>{close();CX.router&&CX.router.nav('soporte');});
    }});
  },

  init(){
    const bell=document.getElementById('tbBell'), sup=document.getElementById('tbSupport');
    if(bell&&!bell._wired){ bell._wired=true; bell.addEventListener('click',(e)=>{e.stopPropagation();this.toggle();}); }
    if(sup&&!sup._wired){ sup._wired=true; sup.addEventListener('click',()=>this.support()); }
    const ml=document.getElementById('tbMail');
    if(ml&&!ml._wired){ ml._wired=true; ml.addEventListener('click',()=>{ if(CX.router&&CX.router.nav) CX.router.nav('correo'); else this.openMail(); }); }
    if(!document._tbDocWired){ document._tbDocWired=true;
      document.addEventListener('click',(e)=>{ const p=document.getElementById('tbBellPanel'); if(this._open&&p&&!p.contains(e.target)&&e.target.id!=='tbBell'&&!(e.target.closest&&e.target.closest('#tbBell')))this.close(); });
      window.addEventListener('resize',()=>{ if(this._open)this.position(); });
    }
    CX.bus&&CX.bus.on('notif',()=>this.render());
    CX.bus&&CX.bus.on('route',()=>{ this.badge(); this.mailBadge(); });
    CX.bus&&CX.bus.on('login',()=>{ this.badge(); this.mailBadge(); });
    this.badge(); this.mailBadge();
  },
};

function __cxTopbarBoot(){ setTimeout(()=>CX.topbar.init(),60); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',__cxTopbarBoot);
else __cxTopbarBoot();
