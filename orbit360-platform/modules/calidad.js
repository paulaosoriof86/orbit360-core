/* ============================================================
   Orbit 360 · Calidad de datos v1.218 — país, moneda, alcance e integridad financiera indexada
   - país/moneda pendientes son prioridad de calidad;
   - edición rápida trazable sin asumir Guatemala;
   - evidencia posterior de pólizas/cobros solo propone;
   - asesores completan faltantes, no alteran relaciones críticas.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.calidad = (function () {
  'use strict';
  const U = Orbit.ui, q = Orbit.q, K = Orbit.kit, S = () => Orbit.store, A = Orbit.access || {};
  let st = { q: '', pais: '', ffalta: '', soloVig: false, asesor: '', page: 1, pageSize: 50 };
  let searchTimer = null;

  function clean(v) { return String(v == null ? '' : v).trim(); }
  function fold(v){return clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function countryCode(v) { return clean(v).toUpperCase(); }
  function activeCountry() { const p=countryCode(Orbit.pais); return p && p!=='TODOS' ? p : ''; }
  function validCountry(v) { return ['GT', 'CO'].includes(clean(v).toUpperCase()); }
  function inActiveCountry(c) { const wanted=activeCountry(); return !wanted || countryCode(c&&c.pais)===wanted; }
  function expectedCurrency(country) { return country === 'GT' ? 'GTQ' : country === 'CO' ? 'COP' : ''; }
  function countryLabel(value) { return value === 'GT' ? 'Guatemala' : value === 'CO' ? 'Colombia' : 'País por validar'; }
  function evidenceFor(c) {
    try {
      return Orbit.clientCountryEvidence && Orbit.clientCountryEvidence.evaluate
        ? Orbit.clientCountryEvidence.evaluate(c.id)
        : { suggestedCountry: '', conflict: false, sources: [] };
    } catch (e) { return { suggestedCountry: '', conflict: false, sources: [] }; }
  }

  function faltantes(c) {
    const f = [];
    const country = clean(c.pais).toUpperCase();
    const currency = clean(c.moneda).toUpperCase();
    if (!validCountry(country)) f.push({ k: 'pais', label: 'País por validar', pri: 1 });
    if (!currency || (validCountry(country) && currency !== expectedCurrency(country))) f.push({ k: 'moneda', label: 'Moneda por validar', pri: 2 });
    const phone = clean(c.telefono || c.whatsapp);
    if (!phone) f.push({ k: 'telefono', label: 'Teléfono / WhatsApp', pri: 3 });
    if (!clean(c.email)) f.push({ k: 'email', label: 'Correo', pri: 4 });
    if (!clean(c.identificacion || c.documento || c.nit || c.dpi)) f.push({ k: 'identificacion', label: 'Documento', pri: 5 });
    if (!clean(c.departamento || c.provincia)) f.push({ k: 'departamento', label: 'Departamento / provincia', pri: 6 });
    if (!clean(c.ciudad || c.municipio)) f.push({ k: 'ciudad', label: 'Ciudad / municipio', pri: 7 });
    if (!clean(c.direccion)) f.push({ k: 'direccion', label: 'Dirección', pri: 8 });
    if (c.tipo === 'Empresa' && !clean(c.contactoPrincipal || c.contacto)) f.push({ k: 'contactoPrincipal', label: 'Contacto principal', pri: 9 });
    if (c.tipo === 'Persona' && !clean(c.fechaNac)) f.push({ k: 'fechaNac', label: 'Fecha nac.', pri: 10 });
    if (c.tipo === 'Persona' && !clean(c.sexo)) f.push({ k: 'sexo', label: 'Sexo', pri: 11 });
    return f;
  }

  function tieneVigente(cid) {
    try { return q.polizasDe(cid).some(p => p.estado === 'Vigente' || p.estado === 'Por renovar' || ['vigente','porrenovar'].includes(String(p.estado || '').toLowerCase().replace(/\s+/g,''))); }
    catch (e) { return false; }
  }
  function scopeLabel() {
    const scope = A.dataScope ? A.dataScope('calidad') : '';
    return ({ own: 'Mis clientes', team: 'Clientes de mi equipo', all: 'Todos los clientes', none: 'Sin acceso' })[scope] || 'Clientes en alcance';
  }
  function advisorOptions(clients) {
    const ids = Array.from(new Set(clients.map(c => c.asesorId).filter(Boolean)));
    return ids.map(id => { const a = S().get('asesores', id) || {}; return { id, nombre: a.nombre || id }; }).sort((a,b) => a.nombre.localeCompare(b.nombre));
  }
  function financialIntegrityIssues() {
    const rm=Orbit.policyVehicleReadModelV1199c;
    if(!rm||typeof rm.financialIntegrityBatch!=='function') return [];
    const policies=(S().all('polizas')||[]).filter(p=>p&&inActiveCountry(p));
    return rm.financialIntegrityBatch(policies);
  }
  function sourceLabel(value){const raw=clean(value);if(!raw)return 'Fuente contractual no identificada';if(/^I\d+[_-]|PRIMARY_POLICY_UNIVERSE|SOURCE[_-]UNIVERSE|LINEAGE/i.test(raw))return 'Fuente contractual importada de la póliza';return raw.replace(/_/g,' ');}
  function financialClientCell(c, fallbackId) {
    c = c || {};
    const id = clean(c.id || fallbackId), nombre = clean(c.nombre) || 'Cliente', tipo = clean(c.tipo) || 'Pendiente de completar', pais = clean(c.pais);
    const paisVisible = validCountry(pais) ? countryLabel(countryCode(pais)) : 'País pendiente de validar';
    const meta = `${U.esc(tipo)} · ${U.esc(paisVisible)}`;
    return `<a style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="event.stopPropagation();location.hash='#/cliente360?c=${encodeURIComponent(id)}'">
      ${U.avatar(nombre, tipo === 'Empresa' ? '#1E2227' : '#C5162E', 'sm')}
      <span style="min-width:0"><span style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${U.esc(nombre)}</span>
      <span class="muted" style="font-size:11px">${meta}</span></span></a>`;
  }
  function moneyValue(n,cur){const v=Math.abs(Number(n)||0)<0.005?0:Number(n||0);return U.money?U.money(v,cur):U.esc((cur?cur+' ':'')+v.toFixed(2));}
  function calendarAuthorityLabel(value){
    const key=clean(value).toUpperCase();
    return ({POLICY_CUOTAS:'Calendario según cuotas de la póliza',SINGLE_PHYSICAL_CALENDAR:'Calendario físico único',NO_DENOMINATOR:'Calendario sin numeración confirmada',AMBIGUOUS_FAIL_CLOSED:'Calendario requiere revisión',POLICY_INACTIVE:'Póliza sin calendario activo'})[key]||'Calendario pendiente de validar';
  }
  function healthActions(x){
    const pid=U.esc(x.p.id),cid=U.esc(x.p.clienteId||'');
    return `<button class="btn primary sm" data-health-open-review="${pid}" onclick="event.stopPropagation();Orbit.modules.calidad.revisarDescuadre('${pid}')">Revisar diferencia</button><button class="btn ghost sm" data-health-open-receipts="${pid}" onclick="event.stopPropagation();location.hash='#/cliente360?c=${encodeURIComponent(cid)}&p=${encodeURIComponent(pid)}&t=recibos'">Ver recibos</button>`;
  }
  function revisarDescuadre(policyId){
    const x=financialIntegrityIssues().find(row=>String(row&&row.p&&row.p.id)===String(policyId));if(!x)return U.toast('El descuadre ya no está activo o no está disponible en este alcance.');
    let old=document.getElementById('quality-fin-review');if(old)old.remove();
    const cur=x.p.moneda||'',cid=x.p.clienteId||'',back=document.createElement('div');back.id='quality-fin-review';back.className='drawer-back open';back.style.cssText='display:grid;place-items:center;z-index:260';
    back.innerHTML=`<div class="card quality-fin-review-card" style="width:min(760px,96vw);max-height:90vh;overflow:auto;padding:0"><div style="padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px"><div><small class="muted">Comparación financiera</small><b style="display:block;font-family:var(--f-display);font-size:18px">Póliza ${U.esc(x.p.numero||x.p.id)}</b></div><button class="imp-x" data-close>✕</button></div><div style="padding:18px 20px;display:grid;gap:12px"><div class="cfg-note"><b>Qué estamos comparando:</b> la prima registrada en la póliza contra la suma de los recibos que forman el calendario activo.</div><div class="cgrid"><div><small class="muted">La póliza indica</small><b style="display:block">${moneyValue(x.total,cur)}</b></div><div><small class="muted">Los recibos suman</small><b style="display:block">${moneyValue(x.schedule,cur)}</b></div><div><small class="muted">Diferencia</small><b style="display:block">${moneyValue(x.delta,cur)}</b></div><div><small class="muted">Margen permitido</small><b style="display:block">${moneyValue(x.tolerance||0,cur)}</b></div></div><div class="cfg-note"><b>Por qué requiere revisión:</b> ${U.esc(x.reason||'Los valores no coinciden y debe confirmarse la fuente correcta.')}</div><div><small class="muted">Origen del valor de la póliza</small><div>${U.esc(sourceLabel(x.contractualSource))}</div></div><div><small class="muted">Origen del calendario</small><div>${U.esc(calendarAuthorityLabel(x.calendarAuthority))}${x.shadowRows?' · '+x.shadowRows+' registro(s) histórico(s) excluido(s)':''}${x.reviewRows?' · '+x.reviewRows+' fila(s) pendientes de validar':''}</div></div><div class="cfg-note">Gravicentra no cambiará importes por inferencia. Abre el dueño exacto del dato que vas a corregir y guarda únicamente lo respaldado por la fuente correspondiente.</div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost" data-close>Cerrar</button><button class="btn ghost" data-receipts>Revisar recibos</button><button class="btn primary" data-policy>Corregir en póliza</button></div></div>`;
    document.body.appendChild(back);back.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>back.remove()));back.addEventListener('click',e=>{if(e.target===back)back.remove();});
    back.querySelector('[data-receipts]').addEventListener('click',()=>{back.remove();location.hash='#/cliente360?c='+encodeURIComponent(cid)+'&p='+encodeURIComponent(x.p.id)+'&t=recibos';});
    back.querySelector('[data-policy]').addEventListener('click',()=>{back.remove();Orbit.modules.cliente360.editarPoliza(x.p.id);});
  }
  function financialHealthHtml(issues, clientsById) {
    if(!issues.length)return '<div class="cfg-note" style="margin:14px 0"><b>Integridad financiera:</b> no se detectaron diferencias materiales entre prima contractual y calendario vigente dentro del alcance seleccionado.</div>';
    const views=issues.map(x=>{const c=(clientsById&&clientsById.get(x.p.clienteId))||S().get('clientes',x.p.clienteId)||{id:x.p.clienteId},cur=x.p.moneda||c.moneda||'',delta=Math.abs(Number(x.delta)||0)<0.005?0:Number(x.delta||0);return{x,c,cur,delta};});
    const desktop=`<div class="quality-fin-desktop" style="overflow-x:auto"><table class="tbl"><thead><tr><th>Póliza</th><th>Cliente</th><th>Prima / fuente</th><th>Calendario activo</th><th class="num">Suma</th><th class="num">Diferencia</th><th>Tolerancia / causa</th><th>Resolver</th></tr></thead><tbody>${views.map(v=>{const x=v.x;return `<tr data-information-health-policy="${U.esc(x.p.id)}"><td><b>${U.esc(x.p.numero||x.p.id)}</b><div class="muted" style="font-size:11px">${x.receipts} recibo(s) vigente(s)${x.shadowRows?' · '+x.shadowRows+' legado(s) excluido(s)':''}</div></td><td>${financialClientCell(v.c,x.p.clienteId)}</td><td><b>${moneyValue(x.total,v.cur)}</b><div class="muted" style="font-size:11px">${U.esc(sourceLabel(x.contractualSource))}</div></td><td><b>${U.esc(calendarAuthorityLabel(x.calendarAuthority))}</b><div class="muted" style="font-size:11px">${x.reviewRows||0} fila(s) requieren revisión</div></td><td class="num">${moneyValue(x.schedule,v.cur)}</td><td class="num"><b>${moneyValue(v.delta,v.cur)}</b></td><td><b>${moneyValue(x.tolerance||0,v.cur)}</b><div class="muted" style="font-size:11px">${U.esc(x.reason||'Requiere validación de fuente.')}</div></td><td style="white-space:nowrap">${healthActions(x)}</td></tr>`;}).join('')}</tbody></table></div>`;
    const mobile=`<div class="quality-fin-mobile" data-information-health-mobile="1">${views.map(v=>{const x=v.x;return `<article class="card pad" data-information-health-card-policy="${U.esc(x.p.id)}"><div style="display:flex;justify-content:space-between;gap:10px"><div><small class="muted">Póliza</small><b style="display:block">${U.esc(x.p.numero||x.p.id)}</b></div><span class="badge warn">Diferencia ${moneyValue(v.delta,v.cur)}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><div><small class="muted">Prima contractual</small><b style="display:block">${moneyValue(x.total,v.cur)}</b></div><div><small class="muted">Calendario activo</small><b style="display:block">${moneyValue(x.schedule,v.cur)}</b></div><div><small class="muted">Fuente</small><span style="display:block">${U.esc(sourceLabel(x.contractualSource))}</span></div><div><small class="muted">Calendario</small><span style="display:block">${U.esc(calendarAuthorityLabel(x.calendarAuthority))}</span></div></div><div class="cfg-note" style="margin-top:10px">${U.esc(x.reason||'Requiere validación de fuente.')}${x.shadowRows?' · '+x.shadowRows+' registro(s) legado(s) duplicado(s) fueron excluidos del calendario activo.':''}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${healthActions(x)}</div></article>`;}).join('')}</div>`;
    return `<style>.quality-fin-mobile{display:none}@media(max-width:1700px){.quality-fin-desktop{display:none}.quality-fin-mobile{display:grid;gap:10px;padding:12px}}@media(max-width:760px){.quality-fin-mobile .card{padding:12px!important}.quality-fin-mobile [style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr!important}}</style><div class="card" data-information-health-financial="1" data-quality-table-grammar="canonical" style="overflow:hidden;margin-bottom:14px"><div style="padding:13px 14px;border-bottom:1px solid var(--line)"><b>Revisión de primas y calendario de cobro</b><div class="muted" style="font-size:12px;margin-top:3px">Compara la prima registrada en la póliza con el calendario activo de cobros. Si existe una diferencia, muestra su causa y el lugar exacto donde revisarla. Gravicentra no modifica importes sin respaldo.</div></div>${desktop}${mobile}</div>`;
  }

  function render(host) {
    const clients = (S().all('clientes') || []).filter(inActiveCountry);
    const clientsById = new Map(clients.map(c => [c.id, c]));
    const clientIds = new Set(clients.map(c => c.id).filter(Boolean));
    const vigenteClientIds = new Set();
    (S().all('polizas') || []).forEach(p => {
      if (!p || !clientIds.has(p.clienteId)) return;
      const state=clean(p.estado).toLowerCase().replace(/\s+/g,'');
      if (state==='vigente' || state==='porrenovar') vigenteClientIds.add(p.clienteId);
    });
    const all = clients.map(c => {
      const f=faltantes(c), needsCountry=f.some(x=>x.k==='pais');
      return { c, f, vig: vigenteClientIds.has(c.id), evidence: needsCountry ? evidenceFor(c) : { suggestedCountry:'', conflict:false, sources:[] } };
    }).filter(x => x.f.length > 0);
    const conVig = all.filter(x => x.vig);
    const advisors = advisorOptions(clients);
    if (st.asesor && !advisors.some(a => a.id === st.asesor)) st.asesor = '';
    const query=fold(st.q);
    const rows = all.filter(x => {
      if(st.soloVig&&!x.vig)return false;
      if(st.ffalta&&!x.f.some(f=>f.k===st.ffalta))return false;
      if(st.asesor&&x.c.asesorId!==st.asesor)return false;
      if(st.pais&&countryCode(x.c.pais)!==st.pais)return false;
      if(query){const hay=fold([x.c.nombre,x.c.identificacion,x.c.documento,x.c.nit,x.c.dpi,x.c.email,x.c.telefono,x.c.whatsapp,x.c.ciudad,x.c.departamento,x.f.map(f=>f.label).join(' ')].join(' '));if(!hay.includes(query))return false;}
      return true;
    }).sort((a,b) => (b.vig - a.vig) || (Math.min(...a.f.map(f => f.pri)) - Math.min(...b.f.map(f => f.pri))));
    const pendingCountry = all.filter(x => x.f.some(f => f.k === 'pais')).length;
    const suggestedCountry = all.filter(x => x.f.some(f => f.k === 'pais') && x.evidence && x.evidence.suggestedCountry && !x.evidence.conflict).length;
    const sinContacto = all.filter(x => x.f.some(f => f.k === 'telefono')).length;
    const completeCount = Math.max(0, clients.length - all.length);
    const completePct = clients.length ? (completeCount / clients.length) * 100 : 100;
    const ownScope = A.dataScope && A.dataScope('calidad') === 'own';
    const financialIssues = financialIntegrityIssues();
    const pageSize = st.pageSize || 50, pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    st.page = Math.max(1, Math.min(st.page || 1, pageCount));
    const pageStart = (st.page - 1) * pageSize, visibleRows = rows.slice(pageStart, pageStart + pageSize), pageEnd = Math.min(rows.length, pageStart + visibleRows.length);

    host.innerHTML = `<div class="page">
      ${K.bannerFor('calidad', `<button class="btn primary" onclick="Orbit.modules.calidad.campana()">📣 Preparar actualización</button>`)}
      <div class="cfg-note" style="margin-bottom:14px"><b>${U.esc(scopeLabel())}:</b> País y moneda se corrigen aquí con fuente y auditoría. Las pólizas o cobros vinculados pueden aportar una sugerencia, pero nunca cambian el país silenciosamente.</div>
      ${K.kpis([
        { label: ownScope ? 'Mis expedientes incompletos' : 'Expedientes incompletos', val: all.length, color: 'var(--warn)', foot: 'de ' + clients.length + ' en alcance' },
        { label: 'País por validar', val: pendingCountry, color: 'var(--danger)', foot: suggestedCountry + ' con evidencia sugerida', footTone: pendingCountry ? 'down' : 'up' },
        { label: 'Con póliza vigente', val: conVig.length, color: 'var(--info)', foot: 'prioridad operativa' },
        { label: 'Sin teléfono / WhatsApp', val: sinContacto, color: 'var(--red)', foot: 'prioridad de contacto' },
        { label: 'Expedientes completos', val: completeCount + ' / ' + clients.length, color: 'var(--ok)', foot: completePct.toFixed(1) + '% de completitud', footTone: 'up' },
        { label: 'Descuadres póliza/calendario', val: financialIssues.length, color: 'var(--danger)', foot: 'requieren fuente / conciliación', footTone: financialIssues.length ? 'down' : 'up' }
      ])}
      ${financialHealthHtml(financialIssues, clientsById)}
      <div class="card quality-workbench" data-quality-table-grammar="canonical" style="overflow:hidden">
        <div class="quality-section-head"><div><span class="quality-eyebrow">Calidad operativa</span><h3>Expedientes que requieren atención</h3><p>Corrige únicamente datos faltantes o inconsistentes con evidencia. Los casos determinísticos se agrupan para evitar trabajo manual repetitivo.</p></div></div><div class="quality-toolbar" style="display:flex;gap:10px;flex-wrap:wrap;padding:13px 14px;border-bottom:1px solid var(--line);align-items:center">
          <div class="tb-search quality-search" data-quality-search="1"><span>⌕</span><input id="q-search" value="${U.esc(st.q)}" placeholder="Buscar cliente, documento, correo o teléfono" autocomplete="off"></div>
          <select id="q-pais" class="o-sel"><option value="">Todos los países</option><option value="GT" ${st.pais==='GT'?'selected':''}>Guatemala</option><option value="CO" ${st.pais==='CO'?'selected':''}>Colombia</option></select>
          <label style="display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;cursor:pointer"><input type="checkbox" id="q-vig" ${st.soloVig ? 'checked' : ''} style="accent-color:var(--red)"> Solo con póliza vigente</label>
          <select id="q-falta" class="o-sel"><option value="">Falta cualquier dato</option>${[
            ['pais','País por validar'],['moneda','Moneda por validar'],['telefono','Sin teléfono / WhatsApp'],['email','Sin correo'],['identificacion','Sin documento'],
            ['departamento','Sin departamento'],['ciudad','Sin ciudad'],['direccion','Sin dirección'],['contactoPrincipal','Sin contacto principal'],['fechaNac','Sin fecha nac.']
          ].map(o => `<option value="${o[0]}" ${st.ffalta === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
          ${advisors.length > 1 && !ownScope ? `<select id="q-asesor" class="o-sel"><option value="">Todos los asesores</option>${advisors.map(a => `<option value="${U.esc(a.id)}" ${st.asesor === a.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>` : ''}
          <span class="muted" style="margin-left:auto;font-size:12.5px">${rows.length} clientes${rows.length ? ' · mostrando ' + (pageStart + 1) + '–' + pageEnd : ''}</span>
        </div>
        <div class="quality-main-scroll" data-quality-scroll="1" data-quality-paged="true"><table class="tbl quality-main-table"><thead><tr><th>Cliente</th><th>Asesor</th><th>Faltan</th><th>País actual</th><th>Origen / evidencia</th><th>Vigente</th><th>Medio de contacto</th><th>Acciones</th></tr></thead>
          <tbody>${visibleRows.map(({ c, f, vig, evidence }) => {
            const phone = clean(c.whatsapp || c.telefono), wa = phone.replace(/[^0-9]/g, '');
            const contacto = phone ? '<span class="badge ok">💬 WhatsApp disponible</span>' : c.email ? '<span class="badge info">✉ Correo disponible</span>' : '<span class="badge danger">Sin medio de contacto</span>';
            const faltaTxt = f.sort((a,b) => a.pri - b.pri).map(x => `<span class="badge ${x.pri <= 2 ? 'danger' : x.pri <= 6 ? 'warn' : 'neutral'}">${x.label}</span>`).join(' ');
            const countryTxt=validCountry(c.pais)?'<span class="badge ok">'+U.esc(countryLabel(countryCode(c.pais)))+'</span>':'<span class="badge danger">Por validar</span>'; const provenance=c.calidad&&c.calidad.paisProvenance; const evidenceTxt=provenance&&provenance.mode?'<span class="badge ok">'+U.esc(provenance.mode==='USER_CONFIRMED'?'Confirmado por usuario':provenance.mode)+'</span>':evidence&&evidence.conflict?'<span class="badge danger">Conflicto · revisar</span>':evidence&&evidence.suggestedCountry?`<span class="badge info">Evidencia sugiere ${countryLabel(evidence.suggestedCountry)} · ${evidence.sources.length} fuente(s)</span>`:'<span class="muted">Sin origen/evidencia registrada</span>'; const provenanceAction=!provenance?.mode&&validCountry(c.pais)?`<button class="btn ghost sm" style="margin-top:5px" onclick="event.stopPropagation();Orbit.modules.calidad.editarInline('${c.id}',{focus:'pais',forceProvenance:true})">Registrar evidencia del origen</button>`:'';
            const accion = phone ? `<a class="btn ghost sm" style="color:#1f8a4c" href="https://wa.me/${wa}?text=${encodeURIComponent('Hola ' + clean(c.nombre).split(' ')[0] + ', para mantener tu información al día necesitamos actualizar algunos datos. ¿Nos ayudás?')}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬 Preparar WA</a>`
              : c.email ? `<button class="btn ghost sm" onclick="event.stopPropagation();window.__orbitCompose={para:'${U.esc(c.email)}',asunto:'Actualización de datos · ${U.esc(c.nombre)}',cuerpo:'',clienteId:'${c.id}',vinculo:{tipo:'cliente',id:'${c.id}',label:'${U.esc(c.nombre)}'}};location.hash='#/correo'">✉ Preparar correo</button>`
              : `<button class="btn ghost sm" onclick="event.stopPropagation();Orbit.modules.calidad.editarInline('${c.id}',{focus:'telefono'})">Agregar teléfono / WhatsApp</button>`;
            return `<tr class="clickable" data-quality-country="${U.esc(countryCode(c.pais))}" onclick="location.hash='#/cliente360?c=${c.id}&t=resumen'"><td data-label="Cliente">${financialClientCell(c,c.id)}</td><td data-label="Asesor">${K.asesorCell(c.asesorId)}</td><td data-label="Faltan">${faltaTxt}</td><td data-label="País">${countryTxt}</td><td data-label="Origen / evidencia">${evidenceTxt}${provenanceAction}</td><td data-label="Vigente">${vig ? '<span class="badge ok">Sí</span>' : '<span class="muted">Pendiente de pólizas / sin vigente</span>'}</td><td data-label="Medio de contacto">${contacto}</td><td data-label="Acciones" class="quality-actions"><button class="btn primary sm" onclick="event.stopPropagation();Orbit.modules.calidad.editarInline('${c.id}',{focus:'${f[0] && f[0].k || ''}'})">✏ Corregir datos</button> ${accion}</td></tr>`;
          }).join('') || `<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">No hay expedientes incompletos con los filtros actuales.</td></tr>`}</tbody></table></div>
        ${rows.length > pageSize ? `<div data-quality-pagination="true" style="display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 14px;border-top:1px solid var(--line)"><button class="btn ghost sm" id="q-page-prev" ${st.page<=1?'disabled':''}>← Anterior</button><span class="muted" style="font-size:12px">Página ${st.page} de ${pageCount}</span><button class="btn ghost sm" id="q-page-next" ${st.page>=pageCount?'disabled':''}>Siguiente →</button></div>` : ''}
      </div>
      <div class="cfg-note" style="margin-top:14px">Prioridad: país/moneda › contacto › correo/documento › ubicación › datos complementarios. Completar vacíos no permite reasignar, fusionar, borrar ni modificar pólizas o cobros.</div>
    </div>`;

    const search=document.getElementById('q-search'); if(search)search.addEventListener('input',e=>{st.q=e.target.value;st.page=1;clearTimeout(searchTimer);searchTimer=setTimeout(()=>render(host),160);});
    const pais=document.getElementById('q-pais'); if(pais)pais.addEventListener('change',e=>{st.pais=e.target.value;st.page=1;render(host);});
    const vig = document.getElementById('q-vig'); if (vig) vig.addEventListener('change', e => { st.soloVig = e.target.checked; st.page=1; render(host); });
    const falta = document.getElementById('q-falta'); if (falta) falta.addEventListener('change', e => { st.ffalta = e.target.value; st.page=1; render(host); });
    const advisor = document.getElementById('q-asesor'); if (advisor) advisor.addEventListener('change', e => { st.asesor = e.target.value; st.page=1; render(host); });
    const prev = document.getElementById('q-page-prev'); if(prev) prev.addEventListener('click',()=>{if(st.page>1){st.page--;render(host);}});
    const next = document.getElementById('q-page-next'); if(next) next.addEventListener('click',()=>{if(st.page<pageCount){st.page++;render(host);}});
  }

  function geoOptions(country, department) {
    const geo = (Orbit.GEO || {})[country] || {};
    return { departments: Object.keys(geo), cities: geo[department] || [] };
  }

  function editarInline(cid, options) {
    options = options || {};
    const c = S().get('clientes', cid); if (!c) return;
    const f = faltantes(c);
    if (!f.length && !options.forceProvenance) { const h = document.getElementById('host'); if (h) render(h); return; }
    const currentCountry = validCountry(c.pais) ? clean(c.pais).toUpperCase() : '';
    const evidence = evidenceFor(c);
    const ordered = f.slice();if(options.forceProvenance&&validCountry(c.pais)&&!ordered.some(x=>x.k==='pais'))ordered.unshift({k:'pais',label:'País / origen',pri:0});ordered.sort((a,b) => (a.k === options.focus ? -1 : b.k === options.focus ? 1 : a.pri - b.pri));
    const countryForGeo = currentCountry;
    const geo = geoOptions(countryForGeo, c.departamento || '');
    const field = x => {
      if (x.k === 'pais') return `<label class="ce-l">País *<select id="qi-pais" class="o-sel"><option value="">— Seleccionar —</option><option value="GT" ${currentCountry==='GT'?'selected':''} ${evidence.suggestedCountry === 'GT' ? 'data-suggested="1"' : ''}>Guatemala${evidence.suggestedCountry === 'GT' ? ' · sugerido por evidencia' : ''}</option><option value="CO" ${currentCountry==='CO'?'selected':''} ${evidence.suggestedCountry === 'CO' ? 'data-suggested="1"' : ''}>Colombia${evidence.suggestedCountry === 'CO' ? ' · sugerido por evidencia' : ''}</option></select></label>`;
      if (x.k === 'moneda') return `<label class="ce-l">Moneda<input id="qi-moneda" class="o-sel" value="${U.esc(currentCountry ? expectedCurrency(currentCountry) : '')}" readonly placeholder="Se define con el país"></label>`;
      if (x.k === 'sexo') return `<label class="ce-l">${x.label}<select id="qi-${x.k}" class="o-sel"><option value="">—</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>`;
      if (x.k === 'fechaNac') return `<label class="ce-l">${x.label}<input id="qi-${x.k}" class="o-sel" type="date"></label>`;
      if (x.k === 'departamento') return `<label class="ce-l">${x.label}<select id="qi-departamento" class="o-sel"><option value="">— Seleccionar —</option>${geo.departments.map(v => `<option>${U.esc(v)}</option>`).join('')}<option value="REQUIERE_VALIDACION">Otro / requiere validación</option></select></label>`;
      if (x.k === 'ciudad') return `<label class="ce-l">${x.label}<select id="qi-ciudad" class="o-sel"><option value="">— Selecciona departamento —</option><option value="REQUIERE_VALIDACION">Otro / requiere validación</option></select></label>`;
      return `<label class="ce-l">${x.label}<input id="qi-${x.k}" class="o-sel" ${x.k === 'email' ? 'type="email"' : x.k === 'telefono' ? 'inputmode="tel" placeholder="+502 5555 5555"' : ''}></label>`;
    };
    let back = document.getElementById('q-inline'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'q-inline'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:215';
    const evidenceNote='<div class="cfg-note"><b>País actual:</b> '+U.esc(currentCountry?countryLabel(currentCountry):'Por validar')+'.</div>'+(evidence.conflict?'<div class="cfg-note" style="border-left-color:var(--danger)"><b>Origen de datos:</b> las fuentes vinculadas apuntan a más de un país. Debe revisarse manualmente.</div>':evidence.suggestedCountry?`<div class="cfg-note"><b>Evidencia vinculada:</b> sugiere ${countryLabel(evidence.suggestedCountry)} por ${evidence.sources.length} fuente(s). La decisión sigue requiriendo confirmación.</div>`:'<div class="cfg-note"><b>Origen de datos:</b> no existe evidencia vinculada suficiente; el país actual no se borra ni se infiere por esta ausencia.</div>');
    back.innerHTML = `<div class="card" style="width:min(600px,94vw);max-height:92vh;overflow:auto;padding:0"><div style="padding:16px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center"><div><div class="crumb" style="margin-bottom:2px">Completar expediente · ${U.esc(countryLabel(c.pais))}</div><b style="font-family:var(--f-display);font-size:16px">${U.esc(c.nombre)}</b></div><button class="imp-x" id="qi-x">✕</button></div><div style="padding:18px 20px;display:grid;gap:12px">${evidenceNote}${ordered.map(field).join('')}<label class="ce-l">Motivo / fuente de actualización *<textarea id="qi-motivo" class="o-sel" style="min-height:62px"></textarea></label><div class="cfg-note">Solo se completan datos pendientes. País y moneda quedan con trazabilidad y revisión de calidad.</div></div><div style="padding:14px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" id="qi-cancel">Cancelar</button><button class="btn primary" id="qi-ok">Guardar datos</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.addEventListener('click', e => { if (e.target === back) close(); });
    back.querySelector('#qi-x').addEventListener('click', close); back.querySelector('#qi-cancel').addEventListener('click', close);
    const pais = back.querySelector('#qi-pais'), moneda = back.querySelector('#qi-moneda');
    if (pais) {
      if (!currentCountry && evidence.suggestedCountry && !evidence.conflict) pais.value = evidence.suggestedCountry;
      pais.addEventListener('change', () => { if (moneda) moneda.value = expectedCurrency(pais.value); });
      if (moneda && pais.value) moneda.value = expectedCurrency(pais.value);
    }
    const dep = back.querySelector('#qi-departamento'), city = back.querySelector('#qi-ciudad');
    const fillCities = () => { if (!city) return; const selectedCountry = (pais && pais.value) || currentCountry; const rows = dep && dep.value && dep.value !== 'REQUIERE_VALIDACION' ? geoOptions(selectedCountry, dep.value).cities : []; city.innerHTML = '<option value="">— Seleccionar —</option>' + rows.map(v => `<option>${U.esc(v)}</option>`).join('') + '<option value="REQUIERE_VALIDACION">Otro / requiere validación</option>'; };
    if (dep) dep.addEventListener('change', fillCities);
    back.querySelector('#qi-ok').addEventListener('click', async () => {
      const save=back.querySelector('#qi-ok'),motivo=clean(back.querySelector('#qi-motivo').value);if(!motivo)return U.toast('Indica el motivo o fuente de la actualización.');
      const before=JSON.parse(JSON.stringify(c)),patch={};
      ordered.forEach(x=>{const el=back.querySelector('#qi-'+x.k),value=el&&clean(el.value),current=clean(c[x.k]),pending=!current||current==='REQUIERE_VALIDACION'||(x.k==='moneda'&&current!==expectedCurrency(currentCountry));if(value&&pending)patch[x.k]=value;});
      if(patch.pais&&validCountry(patch.pais))patch.moneda=expectedCurrency(patch.pais);
      const confirmedCountry=clean((back.querySelector('#qi-pais')||{}).value||patch.pais||currentCountry);
      const projected=Object.assign({},c,patch),projectedRemaining=faltantes(projected),now=new Date().toISOString();patch.requiereValidacion=projectedRemaining.length>0;
      patch.calidad=Object.assign({},c.calidad||{},{estado:projectedRemaining.length?'REQUIERE_VALIDACION':'COMPLETO_PENDIENTE_REVISION',alertas:projectedRemaining.map(x=>'falta_'+x.k),actualizado:now,fuenteActualizacion:motivo,paisEvidence:evidence.suggestedCountry||'',paisEvidenceConflict:!!evidence.conflict});
      if((patch.pais||options.forceProvenance)&&validCountry(confirmedCountry))patch.calidad.paisProvenance={mode:'USER_CONFIRMED',reason:motivo,confirmedAt:now,evidenceSuggestedCountry:evidence.suggestedCountry||'',evidenceConflict:!!evidence.conflict};
      if(!Object.keys(patch).some(k=>k!=='requiereValidacion'&&k!=='calidad')&&!options.forceProvenance)return U.toast('No hay datos nuevos para guardar.');
      if(!S().updateDurable)return U.toast('Persistencia canónica no disponible.');save.disabled=true;save.textContent='Guardando…';
      try{await S().updateDurable('clientes',cid,patch);const after=S().get('clientes',cid);if(!after)throw Error('QUALITY_CLIENT_READBACK_MISSING');for(const [k,v] of Object.entries(patch)){if(k==='calidad'||k==='requiereValidacion')continue;if(clean(after[k])!==clean(v))throw Error('QUALITY_CLIENT_READBACK_MISMATCH_'+k);}const remaining=faltantes(after);if(A.audit)A.audit('completar_faltantes','clientes',cid,before,JSON.parse(JSON.stringify(after)),motivo,{modulo:'calidad',soloCamposPendientes:true,countryEvidence:evidence,remainingAfterReadback:remaining.map(x=>x.k)});close();U.toast(remaining.length?'Datos confirmados · faltan '+remaining.length:'Expediente confirmado, pendiente de revisión');const h=document.getElementById('host');if(h&&location.hash.indexOf('#/calidad')===0)render(h);if(location.hash.indexOf('#/cliente360')===0)window.dispatchEvent(new HashChangeEvent('hashchange'));}
      catch(error){save.disabled=false;save.textContent='Guardar datos';U.toast('No fue posible confirmar el guardado. No se registró un falso éxito.');}

    });
  }

  function campana() {
    const rows = (S().all('clientes') || []).map(c => ({ c, f: faltantes(c) })).filter(x => x.f.length);
    const wa = rows.filter(x => clean(x.c.whatsapp || x.c.telefono)).length;
    const mail = rows.filter(x => !clean(x.c.whatsapp || x.c.telefono) && clean(x.c.email)).length;
    U.toast('Actualización preparada:\n\n• ' + wa + ' por WhatsApp Web/canal pendiente de confirmación\n• ' + mail + ' por correo preparado\n• ' + (rows.length - wa - mail) + ' sin canal — requieren gestión.\n\nNo se ha confirmado ningún envío.');
  }
  return { render, campana, editarInline, faltantes, financialIntegrityIssues, revisarDescuadre, version: '1.223-r18-actionable-provenance' };
})();
