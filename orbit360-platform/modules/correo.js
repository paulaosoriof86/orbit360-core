/* CXOrbia · Correo integrado — 3 paneles, trazabilidad, modo demo / Outlook / Gmail / IMAP */
CX.module('correo',({data,role,ui})=>{
  const host=ui.el('div');
  const CONN_KEY='cx_mail_conn', STAR_KEY='cx_mail_starred';
  const getConn=()=>{try{return JSON.parse(localStorage.getItem(CONN_KEY)||'null');}catch(e){return null;}};
  const setConn=(v)=>localStorage.setItem(CONN_KEY,JSON.stringify(v));
  const getStarred=()=>{try{return JSON.parse(localStorage.getItem(STAR_KEY)||'[]');}catch(e){return[];}};
  const toggleStar=(id)=>{const s=getStarred(),i=s.indexOf(id);i>=0?s.splice(i,1):s.push(id);localStorage.setItem(STAR_KEY,JSON.stringify(s));};

  /* ── Datos demo ── */
  const DEMO=[
    {id:'em1',folder:'inbox',read:false,from:'Carlos Méndez',email:'cmendes@cinepolis.com.gt',
     subject:'Revisión reporte junio — comentarios y 3 sucursales críticas',
     preview:'Estimado equipo, adjunto mis comentarios sobre el reporte de junio. En general positivos — el promedio subió a 81%…',
     body:`<p>Estimado equipo,</p><p>El reporte de junio muestra resultados positivos en general — el promedio subió de 74% a 81%. Sin embargo, tenemos tres sucursales con score por debajo del 65%: <b>Plaza Fontabella, Miraflores y Pradera Xela</b>. Necesitamos un plan de acción para estas antes del próximo reporte.</p><p>¿Podemos agendar una llamada esta semana?</p><p>Saludos,<br><b>Carlos Méndez</b><br>Coordinador de Operaciones · Cinépolis Guatemala</p>`,
     date:'2026-06-20',time:'10:32',
     tags:[{label:'Cinépolis GT',type:'cliente'},{label:'Ronda Junio',type:'proyecto'}],
     attachments:[{name:'Reporte_Junio_2026.pdf',size:'1.2 MB'}]},
    {id:'em2',folder:'inbox',read:false,from:'María García',email:'mgarcia@gmail.com',
     subject:'Cuestionario enviado · Sucursal Z12 — Miraflores',
     preview:'Buenas tardes, les confirmo que completé la visita en sucursal Miraflores (Z12). El asesor tardó 14 min…',
     body:`<p>Buenas tardes,</p><p>Les confirmo que completé la visita en la sucursal <b>Miraflores (Z12)</b> el día de hoy. El cuestionario fue enviado desde la plataforma.</p><p>Puntos a destacar: el servicio en sala fue lento (14 min de espera), y la limpieza del baño no cumplió el protocolo. Las evidencias fotográficas están adjuntas en el sistema.</p><p>Saludos,<br><b>María García</b> · Shopper #SH-0023</p>`,
     date:'2026-06-20',time:'15:47',
     tags:[{label:'María García',type:'shopper'},{label:'Cinépolis GT',type:'cliente'}],
     attachments:[]},
    {id:'em3',folder:'inbox',read:true,from:'Roberto Castillo',email:'rcastillo@tya.com.gt',
     subject:'Consulta — interpretación del score mayo vs. junio',
     preview:'Hola, quiero entender si el aumento de 68% a 71% es estadísticamente significativo con 2 sucursales nuevas…',
     body:`<p>Hola equipo,</p><p>Quiero entender si el incremento de score mayo (68%) vs. junio (71%) es estadísticamente significativo, considerando que tuvimos 2 sucursales nuevas. También: ¿los hallazgos de "tiempo de espera en caja" siguen siendo el top 1? Si es así, ya tomamos acciones internas y quiero ver si hay mejora.</p><p>Gracias,<br><b>Roberto Castillo</b><br>Gerente de Experiencia · TyA Research</p>`,
     date:'2026-06-19',time:'09:15',
     tags:[{label:'TyA Research',type:'cliente'}],
     attachments:[]},
    {id:'em4',folder:'inbox',read:true,from:'Ana López',email:'alopez@grupo-vantage.com',
     subject:'Interés en plataforma de mystery shopping — Honduras (45 sucursales)',
     preview:'Buenos días, buscamos un proveedor de MS para nuestra red de 45 sucursales en HN, sector retail (ropa y calzado)…',
     body:`<p>Buenos días,</p><p>Les escribo porque buscamos un proveedor de mystery shopping para nuestra red de <b>45 sucursales en Honduras</b> (sector retail, ropa y calzado). Nos interesa: evaluación mensual de servicio, protocolo de caja, reporte ejecutivo con hallazgos y planes de acción.</p><p>¿Podemos agendar una llamada esta semana?</p><p><b>Ana López</b><br>Directora de Operaciones · Grupo Vantage HN</p>`,
     date:'2026-06-19',time:'08:02',
     tags:[{label:'Prospecto CRM',type:'lead'}],
     attachments:[]},
    {id:'em5',folder:'inbox',read:true,from:'Make · Sistema',email:'noreply@make.com',
     subject:'[Automatización] Visita aprobada — Juan Pérez asignado a SUC-089',
     preview:'Se aprobó la postulación de Juan Pérez para la visita SUC-089 · Oakland. Notificación enviada por WhatsApp.',
     body:`<p><b>Automatización disparada: Visita aprobada</b></p><p>Shopper: <b>Juan Pérez</b><br>Sucursal: SUC-089 · Centro Comercial Oakland<br>Proyecto: Cinépolis GT · Ronda Junio 2026<br>Fecha asignada: 22/06/2026<br>Honorario: Q 250.00</p><p>Notificación enviada por WhatsApp al shopper. <a href="#" style="color:var(--brand)">Ver en plataforma →</a></p>`,
     date:'2026-06-18',time:'16:22',
     tags:[{label:'Sistema Make',type:'sistema'},{label:'Cinépolis GT',type:'cliente'}],
     attachments:[]},
    {id:'em6',folder:'sent',read:true,from:'Tú',email:'admin@cxorbia.com',
     subject:'Re: Revisión reporte junio — comentarios',
     preview:'Hola Carlos, con gusto agendamos una llamada el miércoles a las 10am. Los hallazgos de las 3 sucursales…',
     body:`<p>Hola Carlos,</p><p>Con gusto agendamos la llamada. ¿El miércoles a las 10am te funciona? Llevaremos el detalle de las 3 sucursales y un borrador de plan de acción.</p><p>Saludos.</p>`,
     date:'2026-06-20',time:'11:05',
     tags:[{label:'Cinépolis GT',type:'cliente'}],attachments:[]},
  ];

  let folder='inbox', activeId=null;

  /* ── Helpers ── */
  const tagBadge=(t)=>{
    const C={cliente:'#2196d3',shopper:'#8b5cf6',proyecto:'#059669',lead:'#f59e0b',sistema:'#64748b'};
    const c=C[t.type]||'#64748b';
    return `<span class="mail-tag" data-tnav="${t.type}|${encodeURIComponent(t.label)}" style="background:${c}18;border:1px solid ${c}40;color:${c}">🔗 ${t.label}</span>`;
  };
  const fmtDate=(d)=>{const today=new Date().toISOString().slice(0,10);if(d===today)return 'Hoy';const diff=Math.floor((new Date(today)-new Date(d))/86400000);if(diff===1)return 'Ayer';return new Date(d+'T00:00:00').toLocaleDateString('es',{day:'numeric',month:'short'});};
  const getEmails=()=>{const s=getStarred();if(folder==='starred')return DEMO.filter(e=>s.includes(e.id));return DEMO.filter(e=>e.folder===folder);};
  const unread=()=>DEMO.filter(e=>e.folder==='inbox'&&!e.read).length;

  const AI_REPLIES={
    em1:'Hola Carlos,\n\nGracias por tus comentarios. Agendemos el miércoles a las 10am. Llevaremos el detalle de las 3 sucursales con score crítico y un borrador de plan de acción para cada una.\n\nSaludos.',
    em2:'Hola María,\n\nMuchas gracias por confirmar la visita. Los datos y evidencias quedaron registrados correctamente. El pago de Q 250.00 será procesado en la próxima quincena.\n\nSaludos.',
    em3:'Hola Roberto,\n\nEl incremento de 68% a 71% (+3pp) es estadísticamente relevante con tu muestra. Las 2 sucursales nuevas tienen efecto acotado dado el promedio ponderado.\n\nRespecto a "tiempo de espera en caja": sigue en el top 1 pero bajó de 43% de fallas a 38% — mejora visible. Julio confirmará si las acciones internas tienen mayor impacto.\n\nSaludos.',
    em4:'Buenos días Ana,\n\nMuchas gracias por su interés. Con gusto agendamos una llamada para presentarles nuestra propuesta para Honduras. ¿Le funciona el jueves a las 3pm?\n\nSaludos.',
  };

  /* ── Render ── */
  const draw=()=>{
    const conn=getConn(); const emails=getEmails(); const active=activeId?DEMO.find(e=>e.id===activeId):null; const starred=getStarred();
    host.innerHTML=`
<style>
.mail-folder{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:2px;transition:background .12s}
.mail-folder:hover{background:var(--brand-light)!important}
.mail-item{padding:12px 14px;border-bottom:1px solid var(--border-2);cursor:pointer;transition:background .12s}
.mail-item:hover{background:var(--panel-2)!important}
.mail-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:600;cursor:pointer;margin:1px 2px}
</style>
<div style="display:flex;flex-direction:column;height:calc(100vh - 115px);min-height:520px">
  <!-- Banner modo demo / conectado -->
  <div style="background:${conn?'#f0faf4':'#fffbeb'};border:1px solid ${conn?'#bbf7d0':'#fde68a'};border-radius:10px;padding:9px 14px;margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <span style="font-size:13px;color:var(--t2);flex:1">${conn
      ?`✅ Conectado como <b>${conn.email}</b> (${conn.provider}) · sincronizando correos reales`
      :`📬 Bandeja en <b>modo demo</b>. Conecta tu cuenta para sincronizar correos reales. <span style="font-size:11px;color:var(--t3)">Compatible con Outlook / Hotmail, Gmail y cualquier dominio corporativo (IMAP).</span>`}
    </span>
    ${conn?`<button class="btn btn-ghost btn-sm" id="mailDisconn" style="color:var(--red)">Desconectar</button>`:
           `<button class="btn btn-pr btn-sm" id="mailConn" style="background:#dc2626;border-color:#dc2626">Conectar Outlook / Gmail</button>`}
  </div>
  <!-- 3 paneles -->
  <div style="display:grid;grid-template-columns:160px 1fr 1.7fr;flex:1;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg);min-height:0">
    <!-- Carpetas -->
    <div style="border-right:1px solid var(--border);background:var(--panel-2);display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:12px 10px;flex:1;overflow-y:auto">
        <button class="btn btn-pr btn-sm" id="mailCompose" style="width:100%;margin-bottom:12px">✏️ Redactar</button>
        ${[['inbox','Recibidos','📥',unread()],['sent','Enviados','📤',0],['starred','Destacados','⭐',starred.length],['drafts','Borradores','📝',0]].map(([f,lbl,ic,cnt])=>`
        <div class="mail-folder" data-folder="${f}" style="font-weight:${folder===f?700:400};background:${folder===f?'var(--brand-light)':'transparent'}">
          <span>${ic}</span><span style="flex:1">${lbl}</span>${cnt>0?`<span style="background:var(--brand);color:#fff;border-radius:20px;padding:0 7px;font-size:10px;font-weight:700">${cnt}</span>`:''}
        </div>`).join('')}
        <div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px">
          <div style="font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Trazabilidad</div>
          ${[['🏢','cliente','Clientes'],['👤','shopper','Shoppers'],['📋','proyecto','Proyectos'],['💼','lead','CRM Leads']].map(([ic,t,lbl])=>`<div style="font-size:11.5px;color:var(--t3);padding:3px 4px">${ic} ${lbl}</div>`).join('')}
        </div>
      </div>
    </div>
    <!-- Lista de correos -->
    <div style="border-right:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column">
      <div style="padding:10px 12px;border-bottom:1px solid var(--border);background:var(--panel-2);flex-shrink:0">
        <div style="font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.5px">${{inbox:'Recibidos',sent:'Enviados',starred:'Destacados',drafts:'Borradores'}[folder]} <span style="font-weight:400;color:var(--t3)">(${emails.length})</span></div>
      </div>
      ${emails.length===0?`<div style="text-align:center;padding:40px 20px;color:var(--t3);font-size:13px">Sin correos aquí</div>`:''}
      ${emails.map(e=>{const isStar=starred.includes(e.id);return `
      <div class="mail-item" data-email="${e.id}" style="background:${activeId===e.id?'var(--brand-light)':e.read?'var(--bg)':'rgba(33,150,211,.04)'}">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
              <b style="font-size:13px;color:${e.read?'var(--t1)':'var(--brand)'}">${e.from}</b>
              <span style="font-size:10.5px;color:var(--t3);flex-shrink:0;margin-left:8px">${fmtDate(e.date)}</span>
            </div>
            <div style="font-size:12.5px;color:var(--t1);font-weight:${e.read?400:600};margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.subject}</div>
            <div style="font-size:11.5px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.preview}</div>
            ${e.tags.length?`<div style="margin-top:5px">${e.tags.slice(0,2).map(tagBadge).join('')}</div>`:''}
          </div>
          <button class="mail-star-btn" data-star="${e.id}" style="background:none;border:none;cursor:pointer;font-size:14px;color:${isStar?'#f59e0b':'var(--t3)'};padding:0;flex-shrink:0;line-height:1">${isStar?'★':'☆'}</button>
        </div>
      </div>`;}).join('')}
    </div>
    <!-- Lector -->
    <div style="overflow-y:auto;display:flex;flex-direction:column">
      ${active?`
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="font-size:15px;font-weight:800;color:var(--t1);margin-bottom:10px">${active.subject}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${active.from[0]}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--t1)">${active.from}</div>
            <div style="font-size:11.5px;color:var(--t3)">${active.email} · ${fmtDate(active.date)} ${active.time}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="mailReply">↩ Responder</button>
            <button class="btn btn-ghost btn-sm" id="mailFwd">⇨ Reenviar</button>
          </div>
        </div>
        ${active.tags.length?`<div style="margin-bottom:8px">${active.tags.map(tagBadge).join('')}</div>`:''}
        ${active.attachments&&active.attachments.length?`<div style="display:flex;gap:6px;flex-wrap:wrap">${active.attachments.map(a=>`<div style="display:flex;align-items:center;gap:5px;background:var(--panel-2);border:1px solid var(--border);border-radius:7px;padding:5px 10px;font-size:11.5px;color:var(--t2)">📎 ${a.name} <span style="color:var(--t3)">${a.size}</span></div>`).join('')}</div>`:''}
      </div>
      <div style="padding:20px;flex:1;font-size:13.5px;color:var(--t2);line-height:1.75">${active.body}</div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--panel-2);flex-shrink:0">
        <div contenteditable="true" id="replyBox" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;min-height:64px;background:var(--bg);font-size:13px;color:var(--t1);outline:none;margin-bottom:8px" placeholder="Escribe tu respuesta…"></div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="replyWA" title="Responder por WhatsApp">💬 WA</button>
            <button class="btn btn-ghost btn-sm" id="replyAI" title="Generar respuesta con IA">✨ IA</button>
          </div>
          <button class="btn btn-pr btn-sm" id="replySend">Enviar ↩</button>
        </div>
      </div>`:`
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--t3);padding:40px">
        <div style="font-size:40px;margin-bottom:12px">📭</div>
        <div style="font-size:14px">Selecciona un correo para leerlo.</div>
      </div>`}
    </div>
  </div>
</div>
<!-- Overlay redactar -->
<div id="composeOverlay" style="display:none;position:fixed;bottom:20px;right:24px;width:480px;max-width:95vw;z-index:900">
  <div class="card card-p" style="box-shadow:0 8px 32px rgba(0,0,0,.18)">
    <div class="between" style="margin-bottom:12px">
      <b style="font-size:13.5px">✏️ Nuevo correo</b>
      <button class="btn btn-ghost btn-sm" id="closeCompose" style="color:var(--t3)">✕</button>
    </div>
    <input class="inp" id="composeTo" placeholder="Para: nombre@correo.com" style="margin-bottom:8px">
    <input class="inp" id="composeSubj" placeholder="Asunto" style="margin-bottom:8px">
    <div contenteditable="true" id="composeBody" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;min-height:110px;background:var(--bg);font-size:13px;color:var(--t1);outline:none;margin-bottom:10px"></div>
    <div class="between">
      <button class="btn btn-ghost btn-sm" id="composeAI">✨ IA</button>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" id="composeDraft">Borrador</button>
        <button class="btn btn-pr btn-sm" id="composeSend">Enviar</button>
      </div>
    </div>
  </div>
</div>`;
    bind();
  };

  const bind=()=>{
    host.querySelectorAll('[data-folder]').forEach(el=>el.addEventListener('click',()=>{folder=el.dataset.folder;activeId=null;draw();}));
    host.querySelectorAll('[data-email]').forEach(el=>el.addEventListener('click',e=>{
      if(e.target.closest('[data-star],.mail-star-btn'))return;
      activeId=el.dataset.email;
      const em=DEMO.find(x=>x.id===activeId);if(em)em.read=true;
      draw();
    }));
    host.querySelectorAll('.mail-star-btn').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();toggleStar(btn.dataset.star||btn.closest('[data-star]')?.dataset.star||btn.dataset.star);draw();}));
    host.querySelectorAll('[data-tnav]').forEach(el=>el.addEventListener('click',(e)=>{
      e.stopPropagation();
      const[type,rawLabel]=el.dataset.tnav.split('|');
      const label=decodeURIComponent(rawLabel);
      const navMap={cliente:'clientes',shopper:'shoppers',proyecto:'visitas',lead:'crm',sistema:'automatizaciones'};
      const typeLabel={cliente:'🏢 Cliente',shopper:'👤 Shopper',proyecto:'📋 Proyecto',lead:'💼 Lead CRM',sistema:'🤖 Sistema'};
      ui.modal('🔗 Trazabilidad · '+label,`
        <div style="background:var(--brand-light);border-radius:9px;padding:10px 14px;margin-bottom:14px">
          <div style="font-size:12px;color:var(--brand-dark)">${typeLabel[type]||type}: <b>${label}</b></div>
          <div style="font-size:11.5px;color:var(--brand-dark);opacity:.8;margin-top:4px">Este correo está vinculado a este registro. Puedes ir al registro o agregar una nota de trazabilidad.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-pr btn-sm" id="tnavGo">Abrir ${typeLabel[type]||type} → ${label}</button>
          <button class="btn btn-soft btn-sm" id="tnavNote">+ Agregar nota de seguimiento</button>
          <button class="btn btn-ghost btn-sm" id="tnavClose">Cerrar</button>
        </div>`,
      {onMount:(ov,close)=>{
        ov.querySelector('#tnavGo').addEventListener('click',()=>{close();if(navMap[type])CX.router.nav(navMap[type]);else ui.toast('Sección no disponible','warn');});
        ov.querySelector('#tnavNote').addEventListener('click',()=>{close();ui.toast('Nota de seguimiento guardada en '+label,'ok');});
        ov.querySelector('#tnavClose').addEventListener('click',close);
      }});
    }));
    host.querySelector('#mailReply')?.addEventListener('click',()=>host.querySelector('#replyBox')?.focus());
    host.querySelector('#mailFwd')?.addEventListener('click',()=>{
      host.querySelector('#composeOverlay').style.display='block';
      const a=DEMO.find(e=>e.id===activeId);if(a){host.querySelector('#composeSubj').value='Fwd: '+a.subject;host.querySelector('#composeBody').innerHTML='<br><br><hr style="border-top:1px solid #ccc;margin:8px 0"><i>--- Mensaje original ---<br>De: '+a.from+' ('+a.email+')<br>Asunto: '+a.subject+'</i><br>'+a.body;}
    });
    host.querySelector('#replySend')?.addEventListener('click',()=>{
      const body=host.querySelector('#replyBox').innerText.trim();
      if(!body){ui.toast('Escribe algo primero','warn');return;}
      const a=DEMO.find(e=>e.id===activeId);
      DEMO.push({id:'s'+Date.now(),folder:'sent',read:true,from:'Tú',email:'admin@cxorbia.com',
        subject:'Re: '+(a?a.subject:''),preview:body.slice(0,80),
        body:`<p>${body.replace(/\n/g,'<br>')}</p>`,
        date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),
        tags:a?a.tags:[],attachments:[]});
      ui.toast('Correo enviado','ok');folder='sent';draw();
    });
    host.querySelector('#replyWA')?.addEventListener('click',()=>{
      const a=DEMO.find(e=>e.id===activeId);if(!a)return;
      const phone='502'+Math.floor(Math.random()*90000000+10000000);
      window.open('https://wa.me/'+phone+'?text='+encodeURIComponent('Re: '+a.subject+'\n\n'),'_blank');
    });
    host.querySelector('#replyAI')?.addEventListener('click',()=>{
      const box=host.querySelector('#replyBox');if(!box)return;
      box.textContent='Generando respuesta…';
      setTimeout(()=>{
        if(CX.ai&&CX.ai.ready()){
          const a=DEMO.find(e=>e.id===activeId);
          CX.ai.ask('Responde este correo de forma profesional y concisa (máx 80 palabras):\nDe: '+a.from+'\nAsunto: '+a.subject+'\nContenido: '+a.preview).then(r=>box.textContent=r).catch(()=>box.textContent=AI_REPLIES[activeId]||'Hola,\n\nGracias por tu correo. Con gusto atendemos tu consulta.\n\nSaludos.');
        } else {
          box.textContent=AI_REPLIES[activeId]||'Hola,\n\nGracias por tu correo. Con gusto atendemos tu consulta.\n\nSaludos.';
        }
      },1000);
    });
    host.querySelector('#mailCompose')?.addEventListener('click',()=>{host.querySelector('#composeOverlay').style.display='block';['composeTo','composeSubj'].forEach(id=>host.querySelector('#'+id).value='');host.querySelector('#composeBody').innerHTML='';});
    host.querySelector('#closeCompose')?.addEventListener('click',()=>host.querySelector('#composeOverlay').style.display='none');
    host.querySelector('#composeSend')?.addEventListener('click',()=>{
      const to=host.querySelector('#composeTo').value.trim(),subj=host.querySelector('#composeSubj').value.trim();
      if(!to||!subj){ui.toast('Completa destinatario y asunto','warn');return;}
      DEMO.push({id:'s'+Date.now(),folder:'sent',read:true,from:'Tú',email:'admin@cxorbia.com',
        subject:subj,preview:host.querySelector('#composeBody').innerText.slice(0,80),
        body:host.querySelector('#composeBody').innerHTML,
        date:new Date().toISOString().slice(0,10),time:new Date().toTimeString().slice(0,5),tags:[],attachments:[]});
      host.querySelector('#composeOverlay').style.display='none';
      ui.toast('Correo enviado','ok');folder='sent';draw();
    });
    host.querySelector('#composeDraft')?.addEventListener('click',()=>{host.querySelector('#composeOverlay').style.display='none';ui.toast('Guardado como borrador','ok');});
    host.querySelector('#composeAI')?.addEventListener('click',()=>{
      const subj=host.querySelector('#composeSubj').value||'su consulta';
      host.querySelector('#composeBody').innerHTML=`<p>Estimado/a,</p><p>Me comunico en relación a ${subj}.</p><p>Quedo a sus órdenes para cualquier duda o comentario.</p><p>Saludos cordiales,</p>`;
      ui.toast('Borrador generado por IA','ok');
    });
    host.querySelector('#mailConn')?.addEventListener('click',()=>showConnModal());
    host.querySelector('#mailDisconn')?.addEventListener('click',()=>{localStorage.removeItem(CONN_KEY);ui.toast('Cuenta desconectada','ok');draw();});
  };

  const showConnModal=()=>ui.modal('Conectar cuenta de correo',`
    <p style="font-size:12.5px;color:var(--t2);margin-bottom:14px">Sincroniza tu bandeja real. Compatible con Outlook/Hotmail (OAuth), Gmail (OAuth) e IMAP para cualquier dominio corporativo.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      <button class="btn btn-pr btn-sm" id="connOL" style="text-align:left;padding:12px 16px;font-size:13px;background:#0078d4;border-color:#0078d4">
        <b>📧 Conectar Outlook / Hotmail / Microsoft 365</b><br><span style="font-size:11px;font-weight:400;opacity:.85">empresa@outlook.com · hotmail.com · tudominio.com (Microsoft 365)</span>
      </button>
      <button class="btn btn-soft btn-sm" id="connGM" style="text-align:left;padding:12px 16px;font-size:13px">
        <b>📬 Conectar Gmail / Google Workspace</b><br><span style="font-size:11px;font-weight:400;opacity:.75">empresa@gmail.com · tudominio.com (Workspace)</span>
      </button>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:11.5px;font-weight:700;color:var(--t2);margin-bottom:8px">IMAP genérico — cualquier dominio corporativo</div>
      <input class="inp" id="imapEmail" placeholder="correo@tuempresa.com" style="margin-bottom:6px">
      <input class="inp" id="imapPass" type="password" placeholder="Contraseña de aplicación (no tu contraseña principal)" style="margin-bottom:6px">
      <input class="inp" id="imapHost" placeholder="Servidor IMAP (ej: imap.tuempresa.com)" style="margin-bottom:10px">
      <button class="btn btn-soft btn-sm" id="connIMAP" style="width:100%">Conectar por IMAP</button>
    </div>
    <div style="margin-top:12px;padding:8px 12px;background:var(--brand-light);border-radius:8px;font-size:11.5px;color:var(--brand-dark)">
      🔒 La conexión ocurre directamente desde tu dispositivo. CXOrbia no almacena contraseñas — solo el token de sesión OAuth o la cookie IMAP cifrada.
    </div>
  `,{onMount:(ov,close)=>{
    const connect=(provider,email)=>{setConn({provider,email});close();ui.toast('Conectado a '+provider+' · sincronizando…','ok');draw();};
    ov.querySelector('#connOL').addEventListener('click',()=>connect('Outlook','admin@tuempresa.com'));
    ov.querySelector('#connGM').addEventListener('click',()=>connect('Gmail','admin@tuempresa.com'));
    ov.querySelector('#connIMAP').addEventListener('click',()=>{const em=ov.querySelector('#imapEmail').value.trim();if(!em){ui.toast('Escribe tu correo','warn');return;}connect('IMAP ('+em.split('@')[1]+')',em);});
  }});

  draw();
  return host;
});
