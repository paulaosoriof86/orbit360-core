/* ============================================================
   Orbit 360 · CRM · Cancelaciones (vista global)  — NÚCLEO
   Pólizas dadas de baja: motivos, valor perdido, tendencia.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cancelaciones = (function () {
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store;
  let st = { fmot: '', fase: '' };
  const hoy = () => (Orbit.ui && Orbit.ui.today ? Orbit.ui.today() : new Date().toISOString().slice(0, 10));
  const ACTIVAS = ['Pendiente de contacto', 'Llamada de retención agendada', 'Oferta de mejora enviada', 'En negociación'];
  const FINALES = ['Recuperada', 'No recuperable'];
  const documentedReason=c=>{const r=String(c&&c.motivo||'').trim();return r&&!['sin motivo registrado','motivo histórico no disponible','motivo historico no disponible'].includes(r.toLowerCase())?r:'';};
  const reasonLabel=c=>documentedReason(c)||(String(c&&c.fecha||'')>='2026-10-08'?'Motivo pendiente de registrar':'Motivo histórico no disponible');

  function allSafe(col) { try { return S().all(col) || []; } catch (e) { return []; } }
  function countryCode(value) { return String(value == null ? '' : value).trim().toUpperCase(); }
  function activeCountry() { const p=countryCode(Orbit.pais); return p && p!=='TODOS' ? p : ''; }
  function relationIndex() {
    const policies = allSafe('polizas'), clients = allSafe('clientes');
    return {
      policies,
      policyById: new Map(policies.filter(p => p && p.id != null).map(p => [String(p.id), p])),
      clientById: new Map(clients.filter(c => c && c.id != null).map(c => [String(c.id), c]))
    };
  }
  function linkedPolicy(c, I) {
    const id = c && c.polizaId;
    if (!id) return null;
    return I && I.policyById ? (I.policyById.get(String(id)) || null) : S().get('polizas', id);
  }
  function linkedClient(c, p, I) {
    const id = c && c.clienteId || p && p.clienteId;
    if (!id) return null;
    return I && I.clientById ? (I.clientById.get(String(id)) || null) : S().get('clientes', id);
  }
  function recordCountry(c, I) {
    const p=linkedPolicy(c,I),cli=linkedClient(c,p,I);
    return countryCode(c&&c.pais || p&&p.pais || p&&p.country || cli&&cli.pais || cli&&cli.country);
  }
  function recordCurrency(c, I) {
    const p=linkedPolicy(c,I),cli=linkedClient(c,p,I);
    return countryCode(c&&c.moneda || p&&p.moneda || p&&p.divisa || cli&&cli.moneda) || 'GTQ';
  }
  function inActiveCountry(c, I) { const p=activeCountry(); return !p || recordCountry(c,I)===p; }
  function policyInActiveCountry(p, I) {
    const wanted=activeCountry(); if(!wanted)return true;
    const cli=p&&p.clienteId ? linkedClient(null,p,I) : null;
    return countryCode(p&&p.pais || p&&p.country || cli&&cli.pais || cli&&cli.country)===wanted;
  }
  function lostByCurrency(rows, I) {
    const out={};
    (rows||[]).forEach(c=>{const cur=recordCurrency(c,I),n=Number(c&&c.valorPerdido)||0;out[cur]=(out[cur]||0)+n;});
    return out;
  }
  function moneyMapHtml(map) { const keys=Object.keys(map||{}).filter(k=>Math.abs(Number(map[k])||0)>0); return keys.length ? keys.map(k=>'<span style="display:block;font-size:'+(keys.length>1?'13px':'21px')+'">'+U.esc(k)+' '+Number(map[k]).toLocaleString('es-GT',{maximumFractionDigits:0})+'</span>').join('') : '0'; }
  function clientPolicyCell(c, I) {
    const p=linkedPolicy(c,I),cli=linkedClient(c,p,I); if(!cli)return '—';
    const nombre=cli.nombre||'Cliente',tipo=cli.tipo||'Pendiente de completar';
    const clientCountry=countryCode(cli.pais||cli.country), operationCountry=recordCountry(c,I);
    const countryMeta=operationCountry&&clientCountry&&operationCountry!==clientCountry
      ? 'Cliente '+clientCountry+' · operación '+operationCountry
      : (operationCountry||clientCountry);
    const meta=countryMeta?U.esc(tipo)+' · '+U.esc(countryMeta):U.esc(tipo);
    return '<a data-cancel-client-link data-cancel-client-country="'+U.esc(clientCountry)+'" data-cancel-operation-country="'+U.esc(operationCountry)+'" href="#/cliente360?c='+encodeURIComponent(cli.id||c.clienteId||'')+'&t=polizas" style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="event.stopPropagation()">'+
      U.avatar(nombre,tipo==='Empresa'?'#1E2227':'#C5162E','sm')+
      '<span style="min-width:0"><span style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">'+U.esc(nombre)+'</span><span class="muted" style="font-size:11px">'+meta+'</span></span></a>';
  }
  function normState(value) {
    return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function isCancelledPolicy(p) {
    return ['cancelada', 'cancelado', 'anulada', 'anulado'].includes(normState(p && (p.estado || p.status)));
  }
  function projectionId(policyId) {
    return 'can_pol_' + String(policyId || '').replace(/[^A-Za-z0-9._:-]/g, '_');
  }
  function policyCancellation(p) {
    const premium = p && p.prima != null ? p.prima : (p && p.primaTotal != null ? p.primaTotal : (p && p.primaNeta != null ? p.primaNeta : 0));
    return {
      id: projectionId(p && p.id),
      tenantId: p && p.tenantId,
      polizaId: p && p.id,
      clienteId: p && p.clienteId,
      asesorId: p && (p.asesorId || p.advisorId || p.ownerAdvisorId),
      pais: p && (p.pais || p.country),
      moneda: p && p.moneda,
      fecha: p && (p.fechaCancelacion || p.cancellationDate || ''),
      motivo: p && (p.motivoCancelacion || p.cancellationReason || '') || 'Sin motivo registrado',
      valorPerdido: premium,
      recuperacion: 'Pendiente de contacto',
      recuperada: false,
      __policyCancellationProjection: true
    };
  }
  function effectiveCancelations(I) {
    const explicit = allSafe('cancelaciones');
    const explicitPolicies = new Set(explicit.map(c => String(c && c.polizaId || '')).filter(Boolean));
    const policyRows = I && I.policies ? I.policies : allSafe('polizas');
    const projected = policyRows.filter(isCancelledPolicy).filter(p => p && p.id && !explicitPolicies.has(String(p.id))).map(policyCancellation);
    return explicit.concat(projected).filter(c => inActiveCountry(c,I));
  }
  function cancellationById(id, policyId) {
    const I=relationIndex();
    const explicit = S().get('cancelaciones', id);
    if (explicit && inActiveCountry(explicit,I)) return explicit;
    const all=effectiveCancelations(I), direct=all.find(c => c.id === id);
    if (direct) return direct;
    const wanted=String(policyId||'');
    return wanted ? (all.find(c => String(c&&c.polizaId||'')===wanted) || null) : null;
  }


  /* WhatsApp preparation is manual and scoped. Opening a chat never means delivered. */
  const waSelected=new Set();
  let waContext='';
  const waTemplates=()=>{
    const base=[
      {id:'recuperacion',nombre:'Contacto de recuperación',texto:'Hola {nombre}, te contactamos de tu corredor de seguros para revisar alternativas relacionadas con tu póliza {poliza} de {ramo}. ¿Podemos coordinar una conversación?'},
      {id:'alternativas',nombre:'Revisión de alternativas',texto:'Hola {nombre}, queremos conocer si te interesa revisar nuevas alternativas de seguro para {ramo}. Podemos coordinar una llamada sobre tu póliza {poliza}. ¿Qué horario te conviene?'}
    ];
    const extra=allSafe('plantillas').filter(p=>p&&p.texto&&['whatsapp','ambos'].includes(String(p.canal||'').toLowerCase())).map(p=>({id:'guardada-'+p.id,nombre:String(p.nombre||'Plantilla guardada'),texto:String(p.texto)}));
    return base.concat(extra);
  };
  function canWaView(c){
    try{return !!(Orbit.access&&typeof Orbit.access.canView==='function'&&Orbit.access.canView('cancelaciones',c,'cancelaciones'));}catch(_e){return false;}
  }
  function waPhone(raw,country){
    let digits=String(raw||'').replace(/[^0-9]/g,'');
    if(digits.startsWith('00'))digits=digits.slice(2);
    if(digits.length===8&&country==='GT')digits='502'+digits;
    else if(digits.length===10&&country==='CO')digits='57'+digits;
    return digits.length>=10&&digits.length<=15&&digits[0]!=='0'?digits:'';
  }
  function waText(template,c){
    const p=linkedPolicy(c)||{},cli=linkedClient(c,p)||{},asg=p.aseguradoraId?S().get('aseguradoras',p.aseguradoraId):null,ase=p.asesorId?S().get('asesores',p.asesorId):null;
    const values={nombre:cli.nombre||'',poliza:p.numero||'',ramo:p.ramo||'',aseguradora:asg&&asg.nombre||'',asesor:ase&&ase.nombre||'',motivo:c.motivo&&c.motivo!=='Sin motivo registrado'?c.motivo:''};
    return String(template||'').replace(/\{([a-z]+)\}/gi,(token,key)=>Object.prototype.hasOwnProperty.call(values,key)?String(values[key]):token);
  }
  function prepararWhatsApp(rows){
    const candidates=(rows||[]).filter(c=>c&&c.id&&canWaView(c)&&inActiveCountry(c));
    const uniq=[],seen=new Set();
    candidates.forEach(c=>{if(!seen.has(c.id)){seen.add(c.id);uniq.push(c);}});
    if(!uniq.length)return U.toast('No hay cancelaciones autorizadas seleccionadas.');
    if(uniq.length>50)return U.toast('Selecciona como máximo 50 registros por preparación. No se envían mensajes automáticamente.');
    const tpl=waTemplates();let template=tpl[0],at=0;
    const drafts=uniq.map(c=>{
      const p=linkedPolicy(c)||{},cli=linkedClient(c,p)||{};
      return {c,cliente:cli.nombre||'Cliente sin nombre',poliza:p.numero||'—',pais:recordCountry(c),phone:waPhone(cli.whatsapp||cli.telefono,recordCountry(c)),message:waText(template.texto,c),opened:false,edited:false};
    });
    let back=document.getElementById('cancel-wa-drafts');if(back)back.remove();
    back=document.createElement('div');back.id='cancel-wa-drafts';back.className='drawer-back open';
    back.style.cssText='display:grid;place-items:center;z-index:250;padding:10px;box-sizing:border-box';
    back.innerHTML='<div class="card" style="width:min(720px,96vw);max-height:94dvh;display:flex;flex-direction:column;overflow:hidden;padding:0">'
      +'<div style="padding:15px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px"><div><small class="muted">Cancelaciones · recuperación</small><b style="display:block;font-size:18px">Preparar WhatsApp ('+drafts.length+')</b></div><button type="button" class="imp-x" data-wa-close aria-label="Cerrar">✕</button></div>'
      +'<div style="overflow:auto;flex:1;padding:16px 18px;display:grid;gap:12px">'
      +'<div class="cfg-note">Se prepara un borrador por cliente. Debes abrir y confirmar cada envío en WhatsApp. Ningún chat abierto equivale a mensaje entregado.</div>'
      +'<label class="ce-l">Plantilla<select class="o-sel" data-wa-template>'+tpl.map(t=>'<option value="'+U.esc(t.id)+'">'+U.esc(t.nombre)+'</option>').join('')+'</select></label>'
      +'<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b data-wa-recipient-name></b><span class="muted" data-wa-progress></span></div>'
      +'<div class="muted" data-wa-policy></div>'
      +'<label class="ce-l">WhatsApp del destinatario (puedes corregirlo solo para este borrador)<input class="o-sel" type="tel" data-wa-phone inputmode="tel" placeholder="Código de país y teléfono"></label>'
      +'<label class="ce-l">Texto para este destinatario<textarea class="o-sel" data-wa-message rows="5" style="width:100%;min-height:132px;resize:vertical"></textarea></label>'
      +'<span class="muted" data-wa-status></span>'
      +'</div><div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
      +'<button type="button" class="btn ghost" data-wa-prev>Anterior</button><button type="button" class="btn ghost" data-wa-next>Siguiente</button><button type="button" class="btn primary" data-wa-open>Abrir chat individual</button></div></div>';
    document.body.appendChild(back);
    const el=sel=>back.querySelector(sel),close=()=>back.remove();
    el('[data-wa-close]').addEventListener('click',close);
    back.addEventListener('click',e=>{if(e.target===back)close();});
    function storeCurrent(){
      const d=drafts[at];d.phone=el('[data-wa-phone]').value.trim();d.message=el('[data-wa-message]').value;
    }
    function paint(){
      const d=drafts[at];el('[data-wa-recipient-name]').textContent=d.cliente;
      el('[data-wa-progress]').textContent=(at+1)+' de '+drafts.length;
      el('[data-wa-policy]').textContent='Póliza '+d.poliza+' · '+d.pais;
      el('[data-wa-phone]').value=d.phone;el('[data-wa-message]').value=d.message;
      el('[data-wa-status]').textContent=d.opened?'Chat preparado anteriormente; envío no confirmado.':'Pendiente de abrir. Sin envío automático.';
      el('[data-wa-prev]').disabled=at===0;el('[data-wa-next]').disabled=at===drafts.length-1;
    }
    el('[data-wa-message]').addEventListener('input',()=>{drafts[at].edited=true;storeCurrent();});
    el('[data-wa-phone]').addEventListener('input',storeCurrent);
    el('[data-wa-prev]').addEventListener('click',()=>{storeCurrent();if(at>0)at--;paint();});
    el('[data-wa-next]').addEventListener('click',()=>{storeCurrent();if(at+1<drafts.length)at++;paint();});
    el('[data-wa-template]').addEventListener('change',()=>{
      const selected=tpl.find(t=>t.id===el('[data-wa-template]').value)||tpl[0];
      if(drafts.some(d=>d.edited)&&!window.confirm('Cambiar la plantilla reemplazará los textos editados de este lote. ¿Continuar?')){el('[data-wa-template]').value=template.id;return;}
      template=selected;drafts.forEach(d=>{d.message=waText(template.texto,d.c);d.edited=false;});paint();
    });
    el('[data-wa-open]').addEventListener('click',()=>{
      storeCurrent();
      const d=drafts[at],phone=waPhone(d.phone,d.pais),msg=String(d.message||'').trim();
      if(!phone)return U.toast('Número inválido o incompleto: revisa el código de país. No se abrió el chat.');
      if(!msg||/\{[a-z]+\}/i.test(msg))return U.toast('Completa el texto y las variables pendientes antes de abrir.');
      if(/--/.test(location.hostname))return U.toast('Preview protegida: no se abren conversaciones reales. Usa esta vista para revisar el borrador.');
      window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
      d.opened=true;paint();
      U.toast('WhatsApp preparado. Confirma el envío allí; no se registra como enviado.');
    });
    paint();
  }

  const FDEFS = rows => [
    { id: 'fmot', type: 'select', ph: 'Motivo documentado', options: [...new Set((rows||[]).map(documentedReason).filter(Boolean))].map(v => ({ v, t: v })) },
    { id: 'fase', type: 'select', ph: 'Asesor', options: K.asesorOptions() }
  ];
  function findNegocio(c) {
    return allSafe('negocios').find(n => n.cancelacionId === c.id || (n.origen === 'Recuperación' && n.clienteId === c.clienteId && n.polizaId === c.polizaId && !n.archivado));
  }
  function findGestion(c) {
    return allSafe('gestiones').find(g => g.cancelacionId === c.id || (g.origen === 'cancelaciones' && g.clienteId === c.clienteId && g.polizaId === c.polizaId && !g.archivado));
  }

  function render(host) {
    const I = relationIndex();
    const all = effectiveCancelations(I);
    const porMotivo = {};
    all.forEach(c => { const motivo=documentedReason(c);if(motivo)porMotivo[motivo]=(porMotivo[motivo]||0)+1; });
    const withoutDocumentedReason=all.filter(c=>!documentedReason(c)).length;
    const motTot = all.length || 1;
    const perdidoPorMoneda = lostByCurrency(all,I);
    const polizasBase = I.policies.filter(p => policyInActiveCountry(p,I));
    const motCols = ['#7e1220', '#b5253b', '#c9821b', '#6b4ea0', '#1f3a5f'];
    const defs = FDEFS(all);

    const rows = all.filter(c => {
      const p = linkedPolicy(c,I);
      return (!st.fmot || documentedReason(c) === st.fmot) && (!st.fase || (p && p.asesorId === st.fase));
    }).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    st.__count = rows.length + ' de ' + all.length;
    const scopeKey=activeCountry()+'|'+String(Orbit.session&&Orbit.session.rol&&Orbit.session.rol()||'');
    if(waContext!==scopeKey){waSelected.clear();waContext=scopeKey;}
    const visibleIds=new Set(rows.map(c=>String(c.id||'')));
    Array.from(waSelected).forEach(id=>{if(!visibleIds.has(id))waSelected.delete(id);});

    host.innerHTML = `<div class="page" data-cancel-indexed-relations="1">
      ${K.bannerFor('cancelaciones', '')}
      ${K.kpis([
        { label: 'Canceladas', onclick: "Orbit.modules.cancelaciones.detalleKpi('canceladas')", val: all.length, color: 'var(--danger)', foot: 'histórico' },
        { label: 'Valor perdido', onclick: "Orbit.modules.cancelaciones.detalleKpi('valor')", val: moneyMapHtml(perdidoPorMoneda), color: 'var(--danger)', foot: 'prima anual · por moneda', footTone: 'down' },
        { label: 'Motivo principal', onclick: "Orbit.modules.cancelaciones.detalleKpi('motivo')", val: '<span style="font-size:16px">' + (Object.entries(porMotivo).sort((a, b) => b[1] - a[1])[0] || ['Sin motivos documentados'])[0] + '</span>', color: 'var(--warn)', foot: 'más frecuente' },
        { label: 'Canceladas / cartera', onclick: "Orbit.modules.cancelaciones.detalleKpi('tasa')", val: Math.round(all.length / (polizasBase.length || 1) * 100) + '%', color: 'var(--info)', foot: 'histórico acumulado · no es churn temporal' }
      ])}
      <div class="card pad" style="margin-bottom:16px">
        <b style="font-family:var(--f-display);font-size:15px">Motivos documentados de cancelación</b><div class="muted" data-cancel-historical-missing-reasons="${withoutDocumentedReason}" style="font-size:12px;margin-top:6px">${withoutDocumentedReason} registros sin causa documentada; no se inventa el histórico ni se cuenta como causa.</div>
        <div style="margin-top:14px;display:grid;gap:10px">
          ${Object.entries(porMotivo).sort((a, b) => b[1] - a[1]).map(([m, n], i) => `
            <div style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="Orbit.modules.cancelaciones.filtrarMotivo('${U.esc(m).replace(/'/g, '')}')" title="Ver solo estas cancelaciones">
              <span style="width:150px;font-size:13px;font-weight:600">${m}</span>
              <div class="bar" style="flex:1"><i style="width:${n / motTot * 100}%;background:${motCols[i % motCols.length]}"></i></div>
              <span class="mono" style="font-size:12px;width:60px;text-align:right">${n} · ${Math.round(n / motTot * 100)}%</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card" style="overflow:hidden">
        ${K.filterBar(defs, st)}
        <div class="card pad" data-cancel-wa-toolbar="1" style="margin:8px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" data-cancel-select-all> Seleccionar visibles</label>
          <span class="muted" data-cancel-selection-count>${waSelected.size} seleccionadas</span>
          <button class="btn ghost sm" type="button" data-cancel-selection-clear>Limpiar</button>
          <button class="btn primary sm" type="button" data-cancel-wa-bulk ${waSelected.size?'':'disabled'}>Preparar WhatsApp (${waSelected.size})</button>
        </div>
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Sel.</th><th>Fecha</th><th>Cliente</th><th>Póliza</th><th>Ramo</th><th>Motivo</th><th class="num">Valor perdido</th><th>Acción</th></tr></thead>
          <tbody>${rows.map(c => {
            const p = linkedPolicy(c,I);
            const opCountry=recordCountry(c,I);
            return `<tr data-cancel-country="${U.esc(opCountry)}" data-cancel-policy="${U.esc(c.polizaId||'')}">
              <td><input type="checkbox" data-cancel-select="${U.esc(String(c.id||''))}" aria-label="Seleccionar cancelación" ${waSelected.has(String(c.id||''))?'checked':''}></td>
              <td style="font-size:12.5px">${U.fmtDate(c.fecha)}</td>
              <td>${clientPolicyCell(c,I)}</td>
              <td>${p ? `<button type="button" data-cancel-policy-link="${U.esc(String(p.id||''))}" class="mono" style="font-size:12px;font-weight:600;border:0;background:none;color:var(--ink);padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px">${U.esc(p.numero||'—')}</button>` : '—'}</td>
              <td>${p ? U.esc(p.ramo||'—') : '—'}</td>
              <td><span class="badge ${documentedReason(c)?'danger':'neutral'}">${U.esc(reasonLabel(c))}</span></td>
              <td class="num">${U.money(c.valorPerdido, recordCurrency(c,I))}</td>
              <td><button type="button" class="btn ghost sm" data-cancel-open="${U.esc(String(c.id||''))}" data-cancel-open-policy="${U.esc(String(c.polizaId||''))}">Ver cancelación</button></td>
            </tr>`;
          }).join('') || `<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">Sin cancelaciones.</td></tr>`}</tbody>
        </table></div>
      </div></div>`;
    K.wireFilters(defs, st, () => render(host));
    const selectionCount=host.querySelector('[data-cancel-selection-count]'),bulkBtn=host.querySelector('[data-cancel-wa-bulk]'),selectAll=host.querySelector('[data-cancel-select-all]');
    const syncSelection=()=>{
      if(selectionCount)selectionCount.textContent=waSelected.size+' seleccionadas';
      if(bulkBtn){bulkBtn.disabled=!waSelected.size;bulkBtn.textContent='Preparar WhatsApp ('+waSelected.size+')';}
      if(selectAll){selectAll.checked=rows.length>0&&rows.every(c=>waSelected.has(String(c.id)));selectAll.indeterminate=rows.some(c=>waSelected.has(String(c.id)))&&!selectAll.checked;}
    };
    host.querySelectorAll('[data-cancel-select]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)waSelected.add(input.dataset.cancelSelect);else waSelected.delete(input.dataset.cancelSelect);syncSelection();}));
    if(selectAll)selectAll.addEventListener('change',()=>{rows.forEach(c=>{if(selectAll.checked)waSelected.add(String(c.id));else waSelected.delete(String(c.id));});host.querySelectorAll('[data-cancel-select]').forEach(el=>el.checked=selectAll.checked);syncSelection();});
    const clear=host.querySelector('[data-cancel-selection-clear]');if(clear)clear.addEventListener('click',()=>{waSelected.clear();host.querySelectorAll('[data-cancel-select]').forEach(el=>el.checked=false);syncSelection();});
    if(bulkBtn)bulkBtn.addEventListener('click',()=>prepararWhatsApp(rows.filter(c=>waSelected.has(String(c.id||'')))));
    syncSelection();
    host.querySelectorAll('[data-cancel-open]').forEach(btn => btn.addEventListener('click', () => detalle(btn.dataset.cancelOpen, btn.dataset.cancelOpenPolicy)));
    host.querySelectorAll('[data-cancel-policy-link]').forEach(btn => btn.addEventListener('click', () => {
      const pid=btn.dataset.cancelPolicyLink;
      if(Orbit.modules.cliente360&&typeof Orbit.modules.cliente360.verPoliza==='function') Orbit.modules.cliente360.verPoliza(pid);
      else {
        const p=I.policyById.get(String(pid));
        if(p) location.hash='#/cliente360?c='+encodeURIComponent(p.clienteId||'')+'&p='+encodeURIComponent(pid);
      }
    }));
  }

  function detalleKpi(kind) {
    const all=effectiveCancelations(), byMotivo={}; all.forEach(c=>{const reason=documentedReason(c);if(reason)byMotivo[reason]=(byMotivo[reason]||0)+1;});
    const top=(Object.entries(byMotivo).sort((a,b)=>b[1]-a[1])[0]||['—',0]), currencies=lostByCurrency(all), pols=allSafe('polizas').filter(policyInActiveCountry);
    let body='';
    if(kind==='valor') body=Object.keys(currencies).sort().map(cur=>'<div class="asg197-detail-row"><span><b>'+U.esc(cur)+'</b><small>'+all.filter(c=>recordCurrency(c)===cur).length+' cancelación(es)</small></span><span>'+U.money(currencies[cur],cur)+'</span></div>').join('')||'<div class="empty">Sin valor perdido para este alcance.</div>';
    else if(kind==='motivo') body='<div class="asg197-detail-row"><span><b>'+U.esc(top[0])+'</b><small>Motivo más frecuente en el país seleccionado</small></span><span>'+top[1]+'</span></div>';
    else if(kind==='tasa') body='<div class="asg197-detail-row"><span><b>'+all.length+' canceladas / '+pols.length+' pólizas</b><small>Relación histórica acumulada; respeta país y alcance, pero no representa una tasa temporal de fuga.</small></span><span>'+Math.round(all.length/(pols.length||1)*100)+'%</span></div>';
    else body=all.slice(0,100).map(c=>{const p=linkedPolicy(c)||{},cli=linkedClient(c,p)||{};return '<button class="asg197-detail-row" data-cancel-open="'+U.esc(c.id)+'"><span><b>'+U.esc(cli.nombre||'Cliente')+' · '+U.esc(p.numero||'Póliza')+'</b><small>'+U.esc(recordCountry(c))+' · '+U.esc(reasonLabel(c))+'</small></span><span>'+U.money(c.valorPerdido,recordCurrency(c))+'</span></button>';}).join('')||'<div class="empty">Sin cancelaciones para este alcance.</div>';
    let back=document.getElementById('cancelation-kpi-detail'); if(back)back.remove(); back=document.createElement('div');back.id='cancelation-kpi-detail';back.className='drawer-back open';back.style.cssText='display:grid;place-items:center;z-index:230';
    const titles={canceladas:'Cancelaciones del alcance',valor:'Valor perdido por moneda',motivo:'Motivo principal',tasa:'Relación canceladas / cartera'};
    back.innerHTML='<div class="card" style="width:min(760px,96vw);max-height:90vh;display:flex;flex-direction:column;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><small class="muted">Cancelaciones</small><b style="display:block;font-family:var(--f-display);font-size:17px">'+U.esc(titles[kind]||'Detalle')+'</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:12px 18px 18px;overflow:auto;flex:1">'+body+'</div><div style="padding:12px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end"><button class="btn ghost" data-close>Cerrar</button></div></div>';
    document.body.appendChild(back); const close=()=>back.remove(); back.querySelectorAll('[data-close]').forEach(x=>x.onclick=close); back.addEventListener('click',e=>{if(e.target===back)close();}); back.querySelectorAll('[data-cancel-open]').forEach(x=>x.onclick=()=>{const id=x.dataset.cancelOpen;close();detalle(id);});
  }

  function detalle(canId, policyId) {
    const c = cancellationById(canId, policyId); if (!c) { U.toast('Registro fuera de tu alcance'); return; }
    const cli = S().get('clientes', c.clienteId), p = S().get('polizas', c.polizaId);
    const asg = p ? q.aseguradora(p.aseguradoraId) : null, ase = q.asesor((p && p.asesorId) || (cli && cli.asesorId));
    const cur = recordCurrency(c);
    const ini = c.fechaInicio || (p && p.vigenciaInicio);
    const diasActiva = c.diasActiva || (ini ? Math.max(15, Math.round((new Date(c.fecha) - new Date(ini)) / 86400000)) : null);
    const meses = diasActiva ? (diasActiva / 30).toFixed(1) : '—';
    const comGen = c.comisionGenerada != null ? c.comisionGenerada : S().where('comisiones', x => x.polizaId === c.polizaId).reduce((s, x) => s + (+x.monto || 0), 0);
    const recOpts = ['Pendiente de contacto', 'Llamada de retención agendada', 'Oferta de mejora enviada', 'En negociación', 'Recuperada', 'No recuperable'];
    let back = document.getElementById('c360-edit'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'c360-edit'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(640px,95vw);max-height:92vh;overflow:auto;padding:0">
      <div style="padding:18px 20px;background:linear-gradient(120deg,#7e1220,#b5253b);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.82)">Cancelación · ${U.fmtDate(c.fecha)}</div>
          <b style="font-family:var(--f-display);font-size:18px;color:#fff">${cli ? U.esc(cli.nombre) : '—'}</b>
          <div class="mono" style="font-size:12.5px;margin-top:3px;color:rgba(255,255,255,.85)">${p ? p.numero + ' · ' + p.ramo : '—'}</div></div>
        <button class="imp-x" id="cx-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 20px;display:grid;gap:16px">
        <div class="cx-kpis">
          <div class="cx-kpi"><span>Tiempo activa</span><b>${diasActiva || '—'} d</b><small>${meses} meses</small></div>
          <div class="cx-kpi"><span>Valor perdido</span><b style="color:var(--danger)">${U.money(c.valorPerdido, cur)}</b><small>prima anual</small></div>
          <div class="cx-kpi"><span>Comisión generada</span><b style="color:var(--info)">${U.money(comGen, cur)}</b><small>antes de baja</small></div>
        </div>
        <div class="vp-grid">
          <div class="vp-row"><span class="vp-l">Aseguradora</span><span class="vp-v">${asg ? U.esc(asg.nombre) : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Asesor</span><span class="vp-v">${ase ? U.esc(ase.nombre) : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Motivo</span><span class="vp-v"><span class="badge ${documentedReason(c)?'danger':'neutral'}">${U.esc(reasonLabel(c))}</span></span></div>
          <div class="vp-row"><span class="vp-l">Estado de póliza</span><span class="vp-v">${p ? p.estado : '—'}</span></div>
          <div class="vp-row"><span class="vp-l">Inicio de vigencia</span><span class="vp-v">${U.fmtDate(ini)}</span></div>
          <div class="vp-row"><span class="vp-l">Fecha de cancelación</span><span class="vp-v">${U.fmtDate(c.fecha)}</span></div>
        </div>
        <div class="vp-pay" data-cancel-reason-editor="1">
          <div class="vp-sec-t">Motivo de cancelación</div>
          <label class="ce-l">Registrar o editar el motivo confirmado
            <input id="cx-motivo" class="o-sel" maxlength="240" value="${U.esc(documentedReason(c) || '')}" placeholder="Motivo comunicado o respaldado por la fuente">
          </label>
          <div class="muted" style="font-size:12px;margin:7px 0">No se completa automáticamente. Guardar el motivo no cambia la acción de recuperación ni genera una gestión.</div>
          <button class="btn ghost sm" id="cx-save-motivo" type="button">Guardar motivo</button>
        </div>
        <div class="vp-pay">
          <div class="vp-sec-t">♻ Acción de recuperación</div>
          <select id="cx-rec" class="o-sel">${recOpts.map(o => `<option ${o === (c.recuperacion || 'Pendiente de contacto') ? 'selected' : ''}>${o}</option>`).join('')}</select>
          <label class="ce-l" style="margin-top:10px">Nota de retención<textarea id="cx-nota" class="o-sel" style="min-height:54px;resize:vertical;padding:9px 11px" placeholder="Gestión de recuperación, oferta, resultado…">${U.esc(c.notaRecuperacion || '')}</textarea></label>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        ${c.__policyCancellationProjection ? '' : '<button class="btn ghost" id="cx-delete" style="margin-right:auto;color:var(--danger,var(--red))">Eliminar</button>'}
        ${p ? `<button class="btn ghost" onclick="Orbit.modules.cliente360.verPoliza('${c.polizaId}')">📑 Ver póliza</button>` : ''}
        <button type="button" class="btn ghost" id="cx-wa">Preparar WhatsApp</button>
        <button class="btn primary" id="cx-save">Guardar</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#cx-x').addEventListener('click', close);
    const waSingle=back.querySelector('#cx-wa');if(waSingle)waSingle.addEventListener('click',()=>prepararWhatsApp([c]));
    const del = back.querySelector('#cx-delete');
    if (del) del.addEventListener('click', async () => {
      if (!Orbit.recordDelete) return U.toast('Eliminación canónica no disponible.');
      del.disabled = true;
      try {
        const result = await Orbit.recordDelete.remove('cancelaciones', canId, { label: (p ? p.numero : '') || (cli ? cli.nombre : '') || canId });
        if (result && result.ok) {
          close();
          const h = document.getElementById('host');
          if (h) render(h);
          return;
        }
      } catch (error) {
        U.toast('No fue posible confirmar la eliminación de la cancelación.');
      }
      del.disabled = false;
    });
    const motivoBtn=back.querySelector('#cx-save-motivo');
    if(motivoBtn)motivoBtn.addEventListener('click',async()=>{
      if(motivoBtn.disabled)return;
      if(!Orbit.access||typeof Orbit.access.can!=='function'||!Orbit.access.can('cancelaciones','edit'))return U.toast('Tu rol activo no tiene permiso para editar cancelaciones.');
      const nuevo=String(back.querySelector('#cx-motivo').value||'').trim();
      if(!nuevo||nuevo.length>240)return U.toast('Escribe un motivo confirmado (máximo 240 caracteres).');
      if(nuevo===String(c.motivo||'').trim())return U.toast('El motivo no tiene cambios.');
      if(/--/.test(location.hostname)&&!/^b4003qa_[A-Za-z0-9._:-]+$/.test(String(c.id||'')))return U.toast('Preview: cancelaciones reales protegidas. Solo se prueban registros sintéticos.');
      if(!S().updateDurable||!S().insertDurable)return U.toast('Persistencia canónica no disponible.');
      const old=motivoBtn.textContent;motivoBtn.disabled=true;motivoBtn.textContent='Confirmando…';
      try{
        if(c.__policyCancellationProjection===true){
          const explicit=Object.assign({},c,{motivo:nuevo});
          delete explicit.__policyCancellationProjection;
          await S().insertDurable('cancelaciones',explicit);
        }else await S().updateDurable('cancelaciones',c.id,{motivo:nuevo});
        const visible=document.getElementById('host');
        close();
        if(visible&&Orbit.route&&Orbit.route.key==='cancelaciones')render(visible);
        U.toast('Motivo confirmado y guardado. La recuperación no fue modificada.');
      }catch(_e){motivoBtn.disabled=false;motivoBtn.textContent=old;U.toast('No se confirmó el motivo en el servidor; no se registró éxito.');}
    });
    back.querySelector('#cx-save').addEventListener('click', async () => {
      const save = back.querySelector('#cx-save');
      if (save.disabled) return;
      const rec = back.querySelector('#cx-rec').value;
      const nota = back.querySelector('#cx-nota').value.trim();
      let motivo = nota;
      if (FINALES.includes(rec) && !motivo) {
        motivo = await Orbit.ui.prompt('Motivo obligatorio para marcar la recuperación como ' + rec + ':', { title: 'Motivo de recuperación' });
        if (!motivo) return;
      }
      if (!S().updateDurable || !S().insertDurable) return U.toast('Persistencia canónica no disponible.');
      const fecha = hoy();
      const patch = { recuperacion: rec, recuperada: rec === 'Recuperada', notaRecuperacion: nota || motivo };
      const original = save.textContent; save.disabled = true; save.textContent = 'Guardando…';
      try {
        if (c.__policyCancellationProjection === true) {
          const materialized = Object.assign({}, c, patch);
          delete materialized.__policyCancellationProjection;
          await S().insertDurable('cancelaciones', materialized);
          c.__policyCancellationProjection = false;
        } else {
          await S().updateDurable('cancelaciones', canId, patch);
        }
        if (c.clienteId) {
          const activityId = 'act_rec_' + String(canId).replace(/[^A-Za-z0-9._:-]/g, '_');
          const activity = { id: activityId, clienteId: c.clienteId, asesorId: c.asesorId, tipo: 'recuperacion', icon: rec === 'Recuperada' ? '✅' : '♻', fecha, titulo: 'Recuperación: ' + rec, detalle: (p ? p.numero + ' · ' : '') + (nota || motivo || rec), __syntheticQa: c.__syntheticQa === true };
          if (S().get('actividades', activityId)) await S().updateDurable('actividades', activityId, activity);
          else await S().insertDurable('actividades', activity);
        }
        if (c.clienteId && ACTIVAS.includes(rec)) {
          const existente = findNegocio(Object.assign({}, c, patch));
          if (existente) {
            const notas = (existente.notas ? existente.notas + '\n' : '') + '[' + fecha + '] ' + (nota || rec);
            await S().updateDurable('negocios', existente.id, { etapa: existente.etapa, nota: nota || rec, notas, actualizado: fecha, cancelacionId: canId, polizaId: c.polizaId });
            await S().updateDurable('cancelaciones', canId, { recuperacionNegocioId: existente.id });
          } else {
            const prox = new Date(); prox.setDate(prox.getDate() + 2);
            const etapaMap = { 'Pendiente de contacto': 'nuevo', 'Llamada de retención agendada': 'contactado', 'Oferta de mejora enviada': 'propuesta', 'En negociación': 'negociacion' };
            const neg = {
              id: 'neg_rec_' + String(canId).replace(/[^A-Za-z0-9._:-]/g, '_'), nombre: (cli ? cli.nombre : 'Cliente') + ' · recuperación', tipo: cli ? cli.tipo : 'Persona',
              etapa: etapaMap[rec] || 'contactado', prob: 30, asesorId: c.asesorId, canal: 'Cliente actual/antiguo',
              pais: cli ? cli.pais : 'GT', moneda: cli ? cli.moneda : 'GTQ', producto: p ? p.producto : 'Por definir', ramo: p ? p.ramo : 'Auto',
              aseguradoraId: c.aseguradoraId || (p ? p.aseguradoraId : ''), primaEst: p ? (p.prima || 0) : 0, prioridad: 'Alta',
              clienteId: c.clienteId, polizaId: c.polizaId, cancelacionId: canId, proximoToque: prox.toISOString().slice(0, 10),
              checklist: [], nota: nota || rec, notas: nota || '', descripcion: 'Recuperación de póliza cancelada ' + (p ? p.numero : ''),
              bitacora: [{ ts: fecha + ' 09:00', user: 'Equipo', campo: 'Creación', de: '', a: 'Recuperación desde cancelación', origen: 'cancelaciones' }],
              comentarios: [], origen: 'Recuperación', creado: fecha, actualizado: fecha, archivado: false
            };
            await S().insertDurable('negocios', neg);
            await S().updateDurable('cancelaciones', canId, { recuperacionNegocioId: neg.id });
          }
        } else if (c.clienteId && rec === 'Recuperada') {
          const existenteG = findGestion(Object.assign({}, c, patch));
          if (existenteG) {
            const notas = (existenteG.notas ? existenteG.notas + '\n' : '') + '[' + fecha + '] Recuperación confirmada · ' + (motivo || nota || 'Cliente recuperado');
            await S().updateDurable('gestiones', existenteG.id, { notas, estado: existenteG.estado || 'Pendiente', cancelacionId: canId });
            await S().updateDurable('cancelaciones', canId, { recuperacionGestionId: existenteG.id });
          } else if (Orbit.ciclo && Orbit.ciclo.crearGestion) {
            const res = await Orbit.ciclo.crearGestion({ tipo: 'Reemisión por recuperación', titulo: 'Reemisión: ' + (p ? p.numero : c.clienteId), clienteId: c.clienteId, polizaId: c.polizaId, asesorId: c.asesorId, nota: motivo || nota || 'Cliente recuperado', origen: 'cancelaciones', cancelacionId: canId });
            if (!res || !res.id) throw new Error('CANCELATION_RECOVERY_MANAGEMENT_READBACK_REQUIRED');
            await S().updateDurable('cancelaciones', canId, { recuperacionGestionId: res.id });
          }
        }
        const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = rec === 'Recuperada' ? '✅ Cliente recuperado · reemisión confirmada en Ops' : rec === 'No recuperable' ? '⛔ Recuperación cerrada con motivo' : '♻ Acción de recuperación confirmada sin duplicar seguimiento'; document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
        close();
      } catch (error) {
        save.disabled = false; save.textContent = original;
        U.toast('No fue posible confirmar la recuperación. No se registró un falso éxito.');
      }
    });
  }

  function filtrarMotivo(m) { st.fmot = m; const host = document.getElementById('host'); if (host) render(host); }
  return { render, detalle, detalleKpi, filtrarMotivo };
})();