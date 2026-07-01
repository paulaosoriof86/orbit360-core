/* CXOrbia · Hojas de Ruta — módulo Admin (HR inteligente + importador) */
CX.module('rutas', ({data,ui})=>{
  const p=data.project(), host=ui.el('div');
  const draw=()=>{
    const fuente=CX.hr.fuente(p);
    const rows=CX.hr.external(p).slice(0,20);
    const esOnline=CX.hr.esOnline(p);
    host.innerHTML=`
      ${ui.ph('Hojas de Ruta', p.name+' · planificación colaborativa por proyecto')}
      <div class="flex wrap" style="gap:8px;margin-bottom:14px">
        <button class="btn btn-pr btn-sm" id="hrIA">🤖 HR Inteligente (IA extrae desde instructivo)</button>
        <button class="btn btn-soft btn-sm" id="hrImp">📥 Importar HR (CSV/Excel/PDF)</button>
        <button class="btn btn-soft btn-sm" id="hrOnline">🔗 Conectar Google Sheets (HR viva)</button>
        <button class="btn btn-ghost btn-sm" id="hrCrea">＋ Crear HR en plataforma</button>
      </div>
      <div class="card card-p" style="margin-bottom:14px">
        <div class="card-h"><div class="card-t">Fuente activa</div>${ui.bdg(esOnline?'En línea':'Interna',esOnline?'g':'b')}</div>
        <div style="font-size:13px;font-weight:600;color:var(--t1)">${fuente}</div>
        <div style="font-size:11.5px;color:var(--t3);margin-top:4px">La HR alimenta Visitas Disponibles, Reservas y el Dashboard. Cambios se sincronizan (doble vía sin duplicar).</div>
        ${esOnline?`<div style="margin-top:10px;font-size:12px;color:var(--brand)">🔄 Lectura en vivo activa</div>`:''}
      </div>
      ${rows.length?`<div class="card card-p">
        <div class="card-h"><div class="card-t">Filas de la HR (vista previa)</div><span class="muted">${rows.length} fila(s)</span></div>
        <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Sucursal</th><th>Ciudad</th><th>Shopper</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
          ${rows.map(r=>`<tr><td><b>${r.sucursal||'—'}</b></td><td style="font-size:12px">${r.ciudad||'—'}</td><td style="font-size:12px">${r.shopper||'—'}</td><td style="font-size:11.5px">${r.fecha||'—'}</td><td>${ui.bdg(r.estado||'—','b')}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`:''}
      <div class="card card-p" style="margin-top:14px">${ui.aiBox('HR Inteligente: lee el instructivo del cliente y extrae sucursales, escenarios, franjas, honorarios y periodicidad para armar el programa en minutos.','Planificación inteligente')}</div>`;

    host.querySelector('#hrIA').addEventListener('click',()=>{
      ui.modal('🤖 HR Inteligente',`
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Carga el instructivo del cliente y la IA extrae la HR completa.</p>
        <input type="file" class="inp" accept=".pdf,.doc,.docx,.txt,image/*" style="padding:7px;margin-bottom:8px" id="hrFile">
        <textarea class="inp" id="hrTxt" rows="3" placeholder="o pega el texto del instructivo…"></textarea>
        <div style="text-align:right;margin-top:10px"><button class="btn btn-green btn-sm" id="hrIAGo">Extraer con IA</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('#hrIAGo').addEventListener('click',()=>{
          close();
          ui.toast((CX.ai&&CX.ai.ready()?'IA extrayendo HR':'HR base generada')+' · revisa en el Importador','ok',4000);
          CX.router.nav('importador');
        });
      }});
    });

    host.querySelector('#hrImp').addEventListener('click',()=>CX.router.nav('importador'));
    host.querySelector('#hrCrea').addEventListener('click',()=>CX.router.nav('importador'));

    host.querySelector('#hrOnline').addEventListener('click',()=>{
      ui.modal('🔗 Conectar Google Sheets',`
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Pega la URL de la hoja de Google Sheets. La plataforma la leerá en vivo.</p>
        <input class="inp" id="gsUrl" placeholder="https://docs.google.com/spreadsheets/d/…" style="margin-bottom:12px">
        <div style="text-align:right"><button class="btn btn-pr btn-sm" id="gsSave">Conectar</button></div>
      `,{onMount:(ov,close)=>{
        ov.querySelector('#gsSave').addEventListener('click',()=>{
          const url=ov.querySelector('#gsUrl').value.trim();
          if(url) CX.hr.setFuente(p,'Google Sheets (online): '+url.slice(-30));
          close();
          draw();
          ui.toast('HR conectada en línea · doble vía bidireccional','ok',3600);
        });
      }});
    });
  };

  draw();
  CX.bus.on('visit-flow',()=>draw());
  return host;
});
