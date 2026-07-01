/* CXOrbia · Tablón / Novedades — centro de notificaciones real + crear notif admin */
CX.module('tablon', ({role,ui})=>{
  const host=ui.el('div');
  const EMOJIS=['✅','📢','⚠️','📅','🔔','💡','🎉','📝','🚨','ℹ️','🏆','🤝'];
  const draw=()=>{
    const feed=CX.notif.for(role);
    const unread=CX.notif.unread(role);
    host.innerHTML=`
      ${ui.ph(role==='admin'?'Tablón de Noticias':'Novedades', role==='admin'?'Centro de comunicación trazable con el equipo y evaluadores':'Lo último de tus visitas, en un solo lugar')}
      ${role==='admin'?`<div class="flex" style="gap:8px;margin-bottom:14px"><button class="btn btn-pr btn-sm" id="crearNotif">✍️ Crear notificación</button><button class="btn btn-ghost btn-sm" id="readAll">Marcar todo leído</button></div>`:
      `<div style="text-align:right;margin-bottom:8px"><button class="btn btn-ghost btn-sm" id="readAll">Marcar todo leído</button></div>`}
      <div class="card card-p">
        <div class="card-h"><div class="card-t">${feed.length} novedades · ${unread} sin leer</div></div>
        ${feed.length?feed.map(n=>`<div data-n="${n.id}" style="display:flex;align-items:flex-start;gap:11px;padding:11px 13px;border:1px solid var(--border);border-left:3px solid var(--${CX.notif.toneVar(n.tono)});border-radius:10px;margin-bottom:9px;cursor:pointer;${n.leida?'opacity:.6':''}">
          <div style="font-size:18px">${n.icon}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--t1)">${n.titulo} ${n.leida?'':'<span class="bdg bdg-r" style="font-size:9px;padding:1px 6px">nuevo</span>'}</div>
            <div style="font-size:12px;color:var(--t2)">${n.txt}</div><div style="font-size:10.5px;color:var(--t3);margin-top:2px">${n.fecha}${n.nav?' · '+n.nav:''}</div></div>
          <div class="flex" style="gap:6px">
            ${n.accion==='confirmar_fecha'?`<button class="btn btn-green btn-sm" data-conf="${n.id}">Confirmar</button><button class="btn btn-ghost btn-sm" data-prop="${n.id}">Proponer otra</button>`
              :`<button class="btn btn-soft btn-sm" data-go="${n.id}">Ver →</button>`}
          </div></div>`).join(''):ui.empty('🔔','Sin novedades')}
        <div style="margin-top:8px">${ui.aiBox('Centraliza lo que pasa. Desde admin puedes crear notificaciones para el equipo y shoppers con formato, emojis y video.','Un solo canal, trazable')}</div>
      </div>`;

    host.querySelector('#readAll').addEventListener('click',()=>{CX.notif.markAllRead(role);draw();});
    // items clickeables → detalle
    host.querySelectorAll('[data-n]').forEach(el=>el.addEventListener('click',(e)=>{
      if(e.target.closest('button'))return;
      const n=feed.find(x=>x.id===el.dataset.n);if(!n)return;
      CX.notif.markRead(n.id);
      ui.modal((n.icon||'🔔')+' '+n.titulo,`
        <div style="font-size:12.5px;color:var(--t2);line-height:1.6;margin-bottom:10px">${n.txt}</div>
        <div style="font-size:11px;color:var(--t3)">${n.fecha}${n.para?' · Para: '+n.para:''}</div>
        ${n.video?`<div style="margin-top:10px"><iframe src="${n.video}" style="width:100%;aspect-ratio:16/9;border:0;border-radius:10px" allowfullscreen></iframe></div>`:''}
        ${n.nav?`<div style="text-align:right;margin-top:12px"><button class="btn btn-soft btn-sm" id="nGoBtn">Ir a ${n.nav} →</button></div>`:''}
      `,{onMount:(ov,close)=>{const g=ov.querySelector('#nGoBtn');if(g)g.addEventListener('click',()=>{close();CX.router.nav(n.nav);});}});
    }));
    host.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();const n=feed.find(x=>x.id===b.dataset.go);CX.notif.markRead(n.id);if(n.nav)CX.router.nav(n.nav);draw();}));
    host.querySelectorAll('[data-conf]').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();CX.notif.markRead(b.dataset.conf);CX.notif.push({to:'admin',tipo:'confirmada',icon:'✅',tono:'g',titulo:'Fecha confirmada',txt:'El shopper confirmó la fecha propuesta',nav:'postulaciones'});ui.toast('Fecha confirmada · equipo notificado','ok');draw();}));
    host.querySelectorAll('[data-prop]').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();ui.modal('Proponer otra fecha',`<label class="lbl">Nueva fecha</label><input class="inp" type="date" style="margin-bottom:14px"><div style="text-align:right"><button class="btn btn-pr btn-sm" id="propOk">Enviar propuesta</button></div>`,{onMount:(ov,close)=>{ov.querySelector('#propOk').addEventListener('click',()=>{CX.notif.markRead(b.dataset.prop);CX.notif.push({to:'admin',tipo:'reprog',icon:'🔄',tono:'a',titulo:'Nueva fecha propuesta por shopper',txt:'Requiere autorización del equipo',nav:'postulaciones'});close();ui.toast('Propuesta enviada · pendiente de autorización','ok');draw();});}});}));

    // Crear notificación (admin)
    const crearBtn=host.querySelector('#crearNotif');
    if(crearBtn)crearBtn.addEventListener('click',()=>{
      const ROLES=[{v:'all',l:'👥 Todos (equipo + shoppers)'},{v:'admin',l:'👔 Solo equipo admin'},{v:'shopper',l:'🕵️ Solo shoppers'},{v:'cliente',l:'🏢 Solo clientes'}];
      let emojiSel='📢';
      ui.modal('✍️ Crear notificación',`
        <div style="margin-bottom:10px"><label class="lbl">Icono / emoji</label>
          <div class="flex wrap" style="gap:4px" id="notifEmojiPick">${EMOJIS.map(e=>`<button type="button" class="ntEmo btn btn-ghost btn-sm" data-e="${e}" style="font-size:16px;padding:3px 8px${e===emojiSel?';background:var(--brand-light);border-color:var(--brand)':''}">${e}</button>`).join('')}</div></div>
        <div style="margin-bottom:10px"><label class="lbl">Título</label><input class="inp" id="ntTit" placeholder="Ej. Recordatorio importante"></div>
        <div style="margin-bottom:10px"><label class="lbl">Mensaje (admite emojis, saltos de línea)</label><textarea class="inp" id="ntTxt" rows="3" placeholder="Escribe el mensaje…"></textarea></div>
        <div style="margin-bottom:10px"><label class="lbl">URL de video (YouTube/Vimeo, opcional)</label><input class="inp" id="ntVideo" placeholder="https://…"></div>
        <div style="margin-bottom:10px"><label class="lbl">Ir a sección (opcional)</label><select class="sel" id="ntNav"><option value="">— ninguna —</option>${['dashboard','visitas','postulaciones','shoppers','misvisitas','liquidaciones','financiero'].map(s=>`<option>${s}</option>`).join('')}</select></div>
        <div style="margin-bottom:14px"><label class="lbl">Destinatarios</label><select class="sel" id="ntPara">${ROLES.map(r=>`<option value="${r.v}">${r.l}</option>`).join('')}</select></div>
        <div style="text-align:right"><button class="btn btn-pr btn-sm" id="ntSend">Publicar notificación</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelectorAll('.ntEmo').forEach(b=>b.addEventListener('click',()=>{ov.querySelectorAll('.ntEmo').forEach(x=>{x.style.background='';x.style.borderColor='';});b.style.background='var(--brand-light)';b.style.borderColor='var(--brand)';emojiSel=b.dataset.e;}));
        ov.querySelector('#ntSend').addEventListener('click',()=>{
          const tit=(ov.querySelector('#ntTit').value||'').trim();if(!tit){ui.toast('Pon un título','warn');return;}
          const para=ov.querySelector('#ntPara').value;
          const targets=para==='all'?['admin','shopper','cliente']:para==='all'?['admin','shopper']:[para];
          const nav=ov.querySelector('#ntNav').value||undefined;
          const video=ov.querySelector('#ntVideo').value.trim()||undefined;
          targets.forEach(to=>CX.notif.push({to,tipo:'anuncio',icon:emojiSel,tono:'b',titulo:tit,txt:ov.querySelector('#ntTxt').value.trim(),nav,video,para:ROLES.find(r=>r.v===para)?.l}));
          close();draw();ui.toast('Notificación publicada para: '+para,'ok',3200);
        });
      }});
    });
  };
  draw();
  CX.bus.on('notif',()=>{ if(CX.session.view==='tablon') draw(); });
  return host;
});
