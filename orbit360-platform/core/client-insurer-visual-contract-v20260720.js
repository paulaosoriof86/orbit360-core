/* ============================================================
   Orbit 360 · Contrato visual y operativo Cliente/Aseguradoras
   Versión 20260720.2
   - proyección canónica de lectura sin escritura;
   - país/segmento honestos y evidencia vinculada;
   - directorio operativo responsive;
   - accesos y cuentas mediante revelado/copia segura;
   - estados documentales verificables.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  var Orbit = window.Orbit;
  if (Orbit.clientInsurerVisualContractV20260720 && Orbit.clientInsurerVisualContractV20260720.version === '20260720.2') return;

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function normalized(value) { return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function esc(value) {
    if (Orbit.ui && Orbit.ui.esc) return Orbit.ui.esc(clean(value));
    return clean(value).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; });
  }
  function clone(row) { return row && typeof row === 'object' ? Object.assign({}, row) : row; }
  function pick(row, keys) {
    for (var i = 0; i < keys.length; i += 1) { var value = row ? row[keys[i]] : undefined; if (value !== undefined && value !== null && clean(value) !== '') return value; }
    return '';
  }
  function rawRows(collection) {
    try {
      var meta = Orbit.store && Orbit.store.__clientCanonicalReadProjectionV20260720;
      if (meta && typeof meta.nativeAll === 'function') return meta.nativeAll(collection) || [];
      return Orbit.store && Orbit.store.all ? Orbit.store.all(collection) || [] : [];
    } catch (e) { return []; }
  }
  function normalizeType(value, row) {
    var text = normalized(value);
    if (/empresa|jurid|legal|sociedad|corporacion|compania|cia|fundacion|asociacion/.test(text)) return 'Empresa';
    if (/persona|natural|fisic|individual|particular/.test(text)) return 'Persona';
    var evidence = normalized(row && [row.tipoPersona,row.razonSocial,row.nombreEmpresa].filter(Boolean).join(' '));
    return /jurid|legal|empresa|sociedad|corporacion|compania|cia|fundacion|asociacion/.test(evidence) ? 'Empresa' : 'Persona';
  }
  function normalizeCountry(value) {
    var text = normalized(value);
    if (/requiere validacion|por validar|sin dato|pendiente/.test(text)) return 'REQUIERE_VALIDACION';
    if (/^co$|^col$|colombia|colombiano|colombiana/.test(text)) return 'CO';
    if (/^gt$|^gtm$|guatemala|guatemalteco|guatemalteca/.test(text)) return 'GT';
    return 'REQUIERE_VALIDACION';
  }
  function normalizeDate(value) {
    if (value == null || value === '') return '';
    try {
      if (value && typeof value.toDate === 'function') value = value.toDate();
      if (value && typeof value === 'object' && Number.isFinite(value.seconds)) value = new Date(value.seconds * 1000);
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0,10);
      var raw = clean(value); if (!raw || /invalid|n\/a|s\/d|sin fecha/i.test(raw)) return '';
      var iso = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if (iso) { var id = new Date(Date.UTC(+iso[1],+iso[2]-1,+iso[3])); return Number.isNaN(id.getTime()) ? '' : id.toISOString().slice(0,10); }
      var latam = raw.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
      if (latam) { var ld = new Date(Date.UTC(+latam[3],+latam[2]-1,+latam[1])); return Number.isNaN(ld.getTime()) ? '' : ld.toISOString().slice(0,10); }
      var date = new Date(raw); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0,10);
    } catch (e) { return ''; }
  }
  function countryFromCurrency(value) { var v = clean(value).toUpperCase(); return v === 'GTQ' ? 'GT' : v === 'COP' ? 'CO' : ''; }

  function countryEvidence(clientId) {
    var policies = rawRows('polizas').filter(function (p) { return p && p.clienteId === clientId; });
    var policyIds = policies.map(function (p) { return p.id; });
    var collections = rawRows('cobros').filter(function (c) { return c && (c.clienteId === clientId || policyIds.indexOf(c.polizaId) >= 0); });
    var found = [], sources = [], conflicts = [];
    function add(row, sourceType) {
      var explicit = normalizeCountry(row && row.pais); if (explicit === 'REQUIERE_VALIDACION') explicit = '';
      var byCurrency = countryFromCurrency(row && row.moneda);
      if (explicit) found.push(explicit); if (byCurrency) found.push(byCurrency);
      if (explicit && byCurrency && explicit !== byCurrency) conflicts.push(sourceType + ':' + clean(row.id));
      if (explicit || byCurrency) sources.push({ type: sourceType, id: clean(row.id), country: explicit || byCurrency, explicitCountry: explicit, currencyCountry: byCurrency });
    }
    policies.forEach(function (p) { add(p, 'poliza'); }); collections.forEach(function (c) { add(c, 'cobro'); });
    var unique = Array.from(new Set(found));
    return { clientId: clientId, suggestedCountry: unique.length === 1 && !conflicts.length ? unique[0] : '', conflict: unique.length > 1 || conflicts.length > 0, countries: unique, sources: sources, rule: 'linked-policy-or-collection-proposal-only', writesStore: false };
  }

  function premiumThreshold() {
    try {
      return +(Orbit.tenant && Orbit.tenant.segmentacion && Orbit.tenant.segmentacion.premiumPrimaNetaRecaudada) || +(Orbit.config && Orbit.config.segmentacion && Orbit.config.segmentacion.premiumPrimaNetaRecaudada) || 0;
    } catch (e) { return 0; }
  }
  function segmentFor(row) {
    var policies = rawRows('polizas').filter(function (p) { return p && p.clienteId === row.id; });
    if (!policies.length) return 'Pendiente de clasificar';
    var active = policies.filter(function (p) { return p.estado === 'Vigente' || p.estado === 'Por renovar'; });
    var historical = policies.filter(function (p) { return active.indexOf(p) < 0; });
    var threshold = premiumThreshold();
    if (threshold > 0) {
      var collected = rawRows('cobros').filter(function (c) { return c && c.clienteId === row.id && c.estado === 'Pagado' && c.conciliado === true; }).reduce(function (sum,c) { return sum + (+c.neta || 0); },0);
      if (collected >= threshold) return 'Premium';
    }
    if (active.length >= 2 || historical.length > 0 || active.some(function (p) { return p.esRenovacion === true || p.renovadaDe || p.renovacionOrigenId; })) return 'Recurrente';
    if (active.length === 1) {
      var start = normalizeDate(active[0].vigenciaIni || active[0].vigenciaInicio || active[0].fechaInicio);
      if (start) { var age = Math.floor((Date.now() - new Date(start + 'T00:00:00Z').getTime()) / 86400000); if (age >= 0 && age <= 90) return 'Nuevo'; }
      return 'Estándar';
    }
    return 'Histórico';
  }
  var SEGMENTS = ['Pendiente de clasificar','Nuevo','Recurrente','Estándar','Premium','Histórico'];

  var CLIENT_ALIAS = {
    nombre:['nombre','nombreCompleto','razonSocial'], identificacion:['identificacion','numeroDocumento','documento','nit'], email:['email','correo','contactoPrincipalCorreo'],
    telefono:['telefono','whatsapp','telefonoAlterno','contactoPrincipalTelefono'], ciudad:['ciudad','ciudadMunicipio','canton'], departamento:['departamento','departamentoProvincia','provincia'],
    pais:['pais','paisCodigo','codigoPais','country','nacionalidad'], fechaAlta:['fechaAlta','fechaAltaOrigen','fechaCreacion','creadoEn','createdAt'], fechaNac:['fechaNac','fechaNacimiento'], driveLink:['driveLink','drive','expedienteUrl']
  };
  function projectClient(row) {
    if (!row || typeof row !== 'object') return row;
    var out = clone(row);
    Object.keys(CLIENT_ALIAS).forEach(function (key) { var value = pick(row,CLIENT_ALIAS[key]); if (value !== '' || out[key] === undefined) out[key] = value || out[key] || ''; });
    out.tipo = normalizeType(out.tipo || out.tipoPersona,out); out.pais = normalizeCountry(out.pais); out.fechaAlta = normalizeDate(out.fechaAlta); out.fechaNac = normalizeDate(out.fechaNac);
    out.moneda = clean(out.moneda || (out.pais === 'CO' ? 'COP' : out.pais === 'GT' ? 'GTQ' : '')); out.segmentoOrigen = clean(out.segmento || ''); out.segmento = segmentFor(out);
    out.canal = clean(out.canal || out.canalOrigen || 'Migración'); out.etiquetas = Array.isArray(out.etiquetas) ? out.etiquetas.slice() : []; out.__canonicalVisualProjection = '20260720.2'; return out;
  }

  function installClientReadProjection() {
    var store = Orbit.store; if (!store) return;
    var previous = store.__clientCanonicalReadProjectionV20260720;
    if (previous && previous.version === '20260720.2') return;
    var nativeAll = previous && previous.nativeAll || store.all.bind(store);
    var nativeWhere = previous && previous.nativeWhere || store.where && store.where.bind(store);
    var nativeFind = previous && previous.nativeFind || store.find && store.find.bind(store);
    function projectedAll(collection) { var rows = nativeAll(collection) || []; return collection === 'clientes' ? rows.map(projectClient) : rows; }
    function evaluate(rows,args) {
      var f=args[1], ov=args[2], mv=args[3];
      if (typeof f === 'function') return rows.filter(function(r){ try{return !!f(r);}catch(e){return false;} });
      if (f && typeof f === 'object') return rows.filter(function(r){return Object.keys(f).every(function(k){return r&&r[k]===f[k];});});
      var op=args.length>=4?ov:'==', value=args.length>=4?mv:ov;
      return rows.filter(function(r){if(!r)return false;if(op==='=='||op==='=')return r[f]===value;if(op==='!=')return r[f]!==value;if(op==='>')return r[f]>value;if(op==='>=')return r[f]>=value;if(op==='<')return r[f]<value;if(op==='<=')return r[f]<=value;if(op==='array-contains')return Array.isArray(r[f])&&r[f].indexOf(value)>=0;return r[f]===value;});
    }
    store.all=function(collection){return projectedAll(collection);};
    if(nativeWhere) store.where=function(){return arguments[0]==='clientes'?evaluate(projectedAll('clientes'),arguments):nativeWhere.apply(store,arguments);};
    if(nativeFind) store.find=function(collection,predicate){if(collection!=='clientes')return nativeFind.apply(store,arguments);if(typeof predicate==='function')return projectedAll('clientes').find(predicate)||null;if(predicate&&typeof predicate==='object')return evaluate(projectedAll('clientes'),[collection,predicate])[0]||null;return null;};
    store.__clientCanonicalReadProjectionV20260720={version:'20260720.2',writesStore:false,reimportsData:false,nativeAll:nativeAll,nativeWhere:nativeWhere,nativeFind:nativeFind};
  }
  installClientReadProjection();
  Orbit.clientCountryEvidence={version:'20260720.2',evaluate:countryEvidence,writesStore:false,silentAutoClassification:false};
  Orbit.clientSegmentation={version:'20260720.2',options:SEGMENTS.slice(),classify:segmentFor,criteria:{pending:'Sin pólizas validadas',nuevo:'Primera póliza activa con inicio menor o igual a 90 días',recurrente:'Dos pólizas activas, renovación o historial',estandar:'Póliza activa sin otro criterio',premium:'Solo con umbral configurado sobre prima neta recaudada',historico:'Sin pólizas activas'},writesStore:false};
  Orbit.clientProjection={version:'20260720.2',project:projectClient,get:function(id){return projectClient(Orbit.store&&Orbit.store.get?Orbit.store.get('clientes',id):null);},normalizeType:normalizeType,normalizeCountry:normalizeCountry,normalizeDate:normalizeDate,writesStore:false,reimportsData:false,createsRelations:false};
  Orbit.clientCanonicalViewProjectionV20260716={version:'20260720.2',projectCopy:projectClient,temporaryInPlaceBridge:false,writesStore:false,reimportsData:false,replacesRenderer:false};

  if (Orbit.q && typeof Orbit.q.clienteResumen === 'function' && !Orbit.q.__clientCanonicalResumenV20260720V2) {
    var nativeSummary=Orbit.q.clienteResumen.bind(Orbit.q);
    Orbit.q.clienteResumen=function(clientId){var s=nativeSummary(clientId)||{},p=projectClient(s.cli||(Orbit.store&&Orbit.store.get&&Orbit.store.get('clientes',clientId)));return Object.assign({},s,{cli:p,moneda:clean(s.moneda||(p&&p.moneda)||((p&&p.pais)==='CO'?'COP':(p&&p.pais)==='GT'?'GTQ':''))});};
    Orbit.q.__clientCanonicalResumenV20260720V2=true;
  }

  var viewState={countryFilter:''};
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='f-pais')viewState.countryFilter=e.target.value||'';},true);
  function safeHref(value,type){var raw=clean(value);if(!raw)return'';if(type==='email')return'mailto:'+raw;if(type==='phone')return'tel:'+raw.replace(/[^+0-9]/g,'');if(/^https?:\/\//i.test(raw))return raw;return'https://'+raw;}
  function copyButton(value,label){return clean(value)?'<button type="button" class="m1-copy-btn" data-m1-copy="'+esc(value)+'" aria-label="Copiar '+esc(label||'valor')+'">Copiar</button>':'';}
  function valueAction(value,kind,label){var raw=clean(value);if(!raw)return'<span class="m1-empty">Sin registrar</span>';var href=safeHref(raw,kind),text='<span class="m1-selectable">'+esc(raw)+'</span>';if(href)text='<a class="m1-action-link" href="'+esc(href)+'"'+(kind==='url'?' target="_blank" rel="noopener"':'')+'>'+esc(raw)+'</a>';return'<span class="m1-value-actions">'+text+copyButton(raw,label)+'</span>';}
  function labelText(label){var parts=[];Array.prototype.forEach.call(label.childNodes||[],function(n){if(n.nodeType===3&&clean(n.nodeValue))parts.push(clean(n.nodeValue));});return clean(parts.join(' ')).replace(/[📁📞☎🌐🔗✉📧]/g,'').trim();}
  function controlValue(control){if(!control)return'';if(control.tagName==='SELECT')return clean(control.options[control.selectedIndex]&&control.options[control.selectedIndex].text);return clean(control.value);}
  function fieldKind(label){var key=normalized(label);if(/correo|email/.test(key))return'email';if(/telefono|celular|emergencia|asistencia/.test(key))return'phone';if(/sitio web|portal|plataforma|drive|repositorio|url|link/.test(key))return'url';return'text';}
  function currentInsurer(){try{var id=Orbit.route&&Orbit.route.params&&Orbit.route.params.ficha;return id&&Orbit.store.get('aseguradoras',id);}catch(e){return null;}}
  function setHtmlIfChanged(node,html){if(!node)return false;var next=String(html==null?'':html);if(node.innerHTML===next)return false;node.innerHTML=next;return true;}
  function setTextIfChanged(node,text){if(!node)return false;var next=String(text==null?'':text);if(node.textContent===next)return false;node.textContent=next;return true;}

  function enhanceReadFields(root){if(!root||root.querySelector('#af-guardar'))return;root.querySelectorAll('.asg-sec label.ce-l').forEach(function(label){if(label.dataset.m1ReadField==='1')return;var control=label.querySelector('input,select,textarea');if(!control||!control.disabled)return;var title=labelText(label)||clean(control.placeholder)||'Dato',value=controlValue(control);if(control.type==='date'&&!value)value='';label.dataset.m1ReadField='1';label.classList.add('m1-read-field');control.classList.add('m1-source-control');var view=document.createElement('div');view.className='m1-read-field-view';view.innerHTML='<span class="m1-read-label">'+esc(title)+'</span><div class="m1-read-value">'+(fieldKind(title)==='text'?(value?'<span class="m1-selectable">'+esc(value)+'</span>':'<span class="m1-empty">Sin registrar</span>'):valueAction(value,fieldKind(title),title))+'</div>';label.appendChild(view);});}
  function enhanceContacts(root){if(!root||root.querySelector('#af-guardar'))return;root.querySelectorAll('#af-contactos .asg-row[data-cont]').forEach(function(row){if(row.dataset.m1ContactCard==='1')return;var name=controlValue(row.querySelector('[data-cn]')),area=controlValue(row.querySelector('[data-ca]')),email=controlValue(row.querySelector('[data-ce]')),phone=controlValue(row.querySelector('[data-cl]')),ext=controlValue(row.querySelector('[data-cext]')),roleName=controlValue(row.querySelector('[data-cargo]')),country=controlValue(row.querySelector('[data-cpais]')),channel=controlValue(row.querySelector('[data-cchan]')),status=controlValue(row.querySelector('[data-cvig]')),preferred=controlValue(row.querySelector('[data-cgest]')),principal=!!(row.querySelector('[data-cppal]')&&row.querySelector('[data-cppal]').checked),digits=phone.replace(/\D/g,''),wa='';if(digits.length>=8){if(digits.length<=10)digits=(country==='CO'?'57':'502')+digits;wa='https://wa.me/'+digits;}row.dataset.m1ContactCard='1';row.className='m1-contact-card';row.innerHTML='<div class="m1-contact-head"><div><strong>'+esc(name||'Contacto sin nombre')+'</strong><span>'+esc([area,roleName].filter(Boolean).join(' · ')||'Área por confirmar')+'</span></div>'+(principal?'<span class="badge ok">Principal</span>':'<span class="badge neutral">Contacto</span>')+'</div><div class="m1-contact-grid"><div><span>Correo</span>'+valueAction(email,'email','correo')+'</div><div><span>Teléfono</span>'+valueAction(phone,'phone','teléfono')+(ext?'<small>Ext. '+esc(ext)+'</small>':'')+'</div><div><span>País y canal</span><b>'+esc([country,channel].filter(Boolean).join(' · ')||'Por confirmar')+'</b></div><div><span>Estado</span><b>'+esc(status||'Por confirmar')+'</b></div><div class="m1-contact-wide"><span>Gestión preferida</span><b>'+esc(preferred||'Por confirmar')+'</b></div></div><div class="m1-contact-actions">'+(email?'<a class="btn ghost sm" href="mailto:'+esc(email)+'">Correo</a>':'')+(phone?'<a class="btn ghost sm" href="'+esc(safeHref(phone,'phone'))+'">Llamar</a>':'')+(wa?'<a class="btn ghost sm" href="'+esc(wa)+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'</div>';});}
  function credentialState(ref){try{return Orbit.secureResources&&Orbit.secureResources.credentialStatus?Orbit.secureResources.credentialStatus(ref,{module:'aseguradoras'}):{available:false,status:'pendiente_conexion'};}catch(e){return{available:false,status:'no_disponible'};}}
  function enhancePortals(root){if(!root||root.querySelector('#af-guardar'))return;var insurer=currentInsurer();root.querySelectorAll('#af-portales .asg-row[data-portal]').forEach(function(row){if(row.dataset.m1PortalCard==='1')return;var idx=+row.dataset.portal,p=insurer&&insurer.portales&&insurer.portales[idx]||{},name=controlValue(row.querySelector('[data-pn]')),type=controlValue(row.querySelector('[data-ptipo]')),url=controlValue(row.querySelector('[data-pu]')),country=controlValue(row.querySelector('[data-ppais]')),status=controlValue(row.querySelector('[data-pest]')),owner=controlValue(row.querySelector('[data-presp]')),verified=controlValue(row.querySelector('[data-pver]')),ref=clean(p.credentialRef),user=clean(p.usuario||p.user||p.usuarioHint),cs=credentialState(ref),accessControls=ref?'<div class="m1-credential-box"><span class="m1-read-label">Acceso protegido</span><div class="m1-credential-value">'+esc(user||'Usuario protegido')+'</div><div class="m1-contact-actions">'+(cs.revealAvailable||cs.available?'<button class="btn ghost sm" data-m1-credential-reveal="'+idx+'">Ver temporalmente</button>':'')+(cs.copyAvailable||cs.available?'<button class="btn ghost sm" data-m1-credential-copy="'+idx+'">Copiar acceso seguro</button>':'<button class="btn ghost sm" disabled>Vinculación segura pendiente</button>')+'</div></div>':'<div class="m1-credential-box"><span class="m1-read-label">Acceso protegido</span><span class="m1-empty">Sin referencia de acceso registrada</span></div>';row.dataset.m1PortalCard='1';row.className='m1-portal-card';row.innerHTML='<div class="m1-portal-head"><div><strong>'+esc(name||'Plataforma sin nombre')+'</strong><span>'+esc([type,country].filter(Boolean).join(' · ')||'Clasificación pendiente')+'</span></div><span class="badge '+(/disponible/i.test(status)?'ok':/actualiz/i.test(status)?'danger':'warn')+'">'+esc(status||'Sin verificar')+'</span></div><div class="m1-portal-url"><span>URL</span>'+valueAction(url,'url','URL')+'</div><div class="m1-portal-meta"><div><span>Responsable</span><b>'+esc(owner||'Por confirmar')+'</b></div><div><span>Última verificación</span><b>'+esc(verified||'Sin verificar')+'</b></div></div>'+accessControls+(url?'<div class="m1-contact-actions"><a class="btn primary sm" href="'+esc(safeHref(url,'url'))+'" target="_blank" rel="noopener">Abrir plataforma</a></div>':'');});var note=root.querySelector('#af-portales')&&root.querySelector('#af-portales').parentElement.querySelector('.cfg-note');setHtmlIfChanged(note,'<b>Directorio operativo:</b> las credenciales se recuperan temporalmente desde la conexión segura según rol y quedan auditadas; nunca se almacenan como texto visible en la ficha.');}
  function enhanceBankRows(root){if(!root||root.querySelector('#af-guardar'))return;var insurer=currentInsurer();root.querySelectorAll('#af-cuentas .asg-row[data-cta]').forEach(function(row){if(row.dataset.m1BankCard==='1')return;var idx=+row.dataset.cta,c=insurer&&insurer.cuentas&&insurer.cuentas[idx]||{},values=Array.prototype.map.call(row.children,function(child){return clean(child.textContent);}),vault=row.querySelector('.vault-field');row.dataset.m1BankCard='1';row.classList.add('m1-bank-card');var labels=document.createElement('div');labels.className='m1-bank-labels';labels.innerHTML='<span>Banco</span><b>'+esc(c.banco||values[0]||'Sin registrar')+'</b><span>Tipo</span><b>'+esc(c.tipo||values[1]||'Sin registrar')+'</b><span>Cuenta</span>'+(vault?'<div class="m1-vault-slot"></div>':'<b>'+esc(c.numero||'Sin registrar')+'</b>')+'<span>Moneda</span><b>'+esc(c.moneda||values[3]||'Sin registrar')+'</b><span>Titular</span><b>'+esc(c.titular||values[4]||'Sin registrar')+'</b><span>Uso</span><b>'+esc(c.uso||values[5]||'Sin registrar')+'</b><span>Acciones</span><div><button class="btn ghost sm" data-m1-bank-copy-all="'+idx+'">Copiar datos completos</button></div>';row.innerHTML='';row.appendChild(labels);if(vault)labels.querySelector('.m1-vault-slot').appendChild(vault);});var section=root.querySelector('#af-cuentas')&&root.querySelector('#af-cuentas').parentElement,note=section&&section.querySelector('.cfg-note');setHtmlIfChanged(note,'<b>Datos bancarios protegidos.</b> Usa Ver para una consulta temporal o Copiar datos completos según tus permisos.');}
  function inactiveReason(a){var activity=(a.actividad||[]).slice().reverse(),item=activity.find(function(x){return /desactiv|inactiv|vinculacion/i.test(clean(x.cambio));});return item&&clean(item.motivo)||clean(a.motivoInactividad)||'Motivo pendiente de documentar';}
  function enhanceDirectory(root){root.querySelectorAll('.asg-card.off[data-asg]').forEach(function(card){if(card.querySelector('.m1-inactive-reason'))return;var a=Orbit.store.get('aseguradoras',card.dataset.asg);if(!a)return;var note=document.createElement('div');note.className='m1-inactive-reason';note.innerHTML='<b>Inactiva:</b> '+esc(inactiveReason(a));card.appendChild(note);});}
  function enhanceKnowledge(root){var insurer=currentInsurer(),active=root.querySelector('.asg-tab.on[data-tab="tarifas"],.asg-tab.active[data-tab="tarifas"]');if(!active||!insurer)return;var body=root.querySelector('#af-body');if(!body)return;var title=body.querySelector('.asg-sec-t');setTextIfChanged(title,'🧠 Tarifas y conocimiento');body.querySelectorAll('.cfg-note').forEach(function(n){var t=clean(n.textContent);if(/procesar un documento|segundo gate|persistid|habilita automaticamente|seccion administrativa/i.test(normalized(t)))setHtmlIfChanged(n,'<b>Uso controlado:</b> cada fuente se revisa por país, moneda, ramo y producto. Registrar un documento no habilita automáticamente Cotizador ni Comparativo.');});body.querySelectorAll('*').forEach(function(n){if(n.children.length)return;var t=n.textContent||'',next=t.replace(/sección administrativa avanzada/gi,'').replace(/mapeadas y persistidas/gi,'relacionadas y disponibles').replace(/segundo gate/gi,'validación posterior');setTextIfChanged(n,next);});if(!body.querySelector('.m1-knowledge-summary')){var docs=(insurer.docs||[]),pending=docs.filter(function(d){return d&&(/pendiente/i.test(d.estado||d.storageEstado)||d.requiereValidacion);}).length,available=docs.filter(function(d){return d&&d.archivoDisponible===true;}).length,proposals=docs.filter(function(d){return d&&d.propuestaImportacion;}).length,box=document.createElement('div');box.className='m1-knowledge-summary';box.innerHTML='<div><span>Fuentes registradas</span><b>'+docs.length+'</b></div><div><span>Propuestas recientes</span><b>'+proposals+'</b></div><div><span>Pendientes de revisión</span><b>'+pending+'</b></div><div><span>Referencias disponibles</span><b>'+available+'</b></div>';body.prepend(box);if(proposals){var list=document.createElement('section');list.className='m1-proposal-list';list.innerHTML='<h3>Propuestas documentales</h3>'+docs.filter(function(d){return d&&d.propuestaImportacion;}).slice(0,8).map(function(d){return'<article><div><b>'+esc(d.nombre||'Documento')+'</b><small>'+esc([d.cat||d.tipo,d.pais,d.moneda,d.ramo,d.producto].filter(Boolean).join(' · '))+'</small></div><span class="badge '+(d.archivoDisponible?'ok':'warn')+'">'+esc(d.estado||'Pendiente de revisión')+'</span></article>';}).join('');body.appendChild(list);}}}

  function enhanceClient360(){var root=document.getElementById('host');if(!root||location.hash.indexOf('#/cliente360')!==0)return;var clients=Orbit.store&&Orbit.store.all?Orbit.store.all('clientes'):[],rv=clients.filter(function(r){return r.pais==='REQUIERE_VALIDACION';}).length,country=root.querySelector('#f-pais');if(country){if(!country.querySelector('option[value="REQUIERE_VALIDACION"]')){var op=document.createElement('option');op.value='REQUIERE_VALIDACION';op.textContent='País por validar ('+rv+')';country.appendChild(op);}if(viewState.countryFilter)country.value=viewState.countryFilter;var controls=country.closest('.card')&&country.closest('.card').querySelector('div');if(controls&&!controls.querySelector('[data-m1-country-quality]')){var quality=document.createElement('button');quality.type='button';quality.className='m1-quality-chip';quality.dataset.m1CountryQuality='1';quality.textContent='País por validar · '+rv;quality.onclick=function(){viewState.countryFilter='REQUIERE_VALIDACION';country.value='REQUIERE_VALIDACION';country.dispatchEvent(new Event('change',{bubbles:true}));};controls.appendChild(quality);}}
    var seg=root.querySelector('#f-seg');if(seg&&seg.dataset.m1Segments!=='1'){var selected=seg.value;seg.innerHTML='<option value="">Segmento</option>'+SEGMENTS.map(function(s){return'<option value="'+esc(s)+'">'+esc(s)+'</option>';}).join('');if(SEGMENTS.indexOf(selected)>=0)seg.value=selected;seg.dataset.m1Segments='1';var hint=document.createElement('button');hint.type='button';hint.className='m1-quality-chip';hint.dataset.m1SegmentCriteria='1';hint.textContent='Criterios de segmento';hint.onclick=function(){if(Orbit.ui&&Orbit.ui.alert)Orbit.ui.alert('Segmentación: pendiente sin pólizas validadas; Nuevo con primera póliza activa menor o igual a 90 días; Recurrente con renovación, historial o dos pólizas activas; Estándar con póliza activa; Premium solo con umbral configurado sobre prima neta recaudada; Histórico sin pólizas activas.');else alert('Segmentación basada en pólizas validadas y prima neta recaudada.');};seg.parentElement.appendChild(hint);}
    root.querySelectorAll('.fh-meta span').forEach(function(item){if(/^Desde\s/i.test(clean(item.textContent))){var b=item.querySelector('b');if(b&&(!clean(b.textContent)||/InvalidDate/i.test(b.textContent)))setTextIfChanged(b,'Sin fecha registrada');}});root.querySelectorAll('*').forEach(function(n){if(n.children.length===0&&/InvalidDate/.test(n.textContent||''))setTextIfChanged(n,(n.textContent||'').replace(/InvalidDate/g,'Sin fecha registrada'));});
    var cid=Orbit.route&&Orbit.route.params&&Orbit.route.params.c,client=cid&&Orbit.store.get('clientes',cid);if(client&&normalizeCountry(client.pais)==='REQUIERE_VALIDACION'&&!root.querySelector('[data-m1-define-country]')){var actions=root.querySelector('.fichahdr .fh-actions')||root.querySelector('.fichahdr .fh-top>div:last-child')||root.querySelector('.fichahdr .fh-top');if(actions){var btn=document.createElement('button');btn.className='btn ghost sm';btn.dataset.m1DefineCountry='1';btn.textContent='🌎 Definir país';btn.onclick=function(){if(Orbit.modules&&Orbit.modules.calidad&&Orbit.modules.calidad.editarInline)Orbit.modules.calidad.editarInline(cid,{focus:'pais'});};actions.appendChild(btn);}root.querySelectorAll('.fh-pais').forEach(function(n){setTextIfChanged(n,'🌎 País por validar');});}
    root.querySelectorAll('table.tbl tbody tr.clickable').forEach(function(row){var onclick=clean(row.getAttribute('onclick')),m=onclick.match(/c=([^'"&]+)/),id=m&&m[1];if(!id||!Orbit.store||!Orbit.store.where)return;var policies=Orbit.store.where('polizas',function(p){return p.clienteId===id;});if(policies.length)return;var cells=row.querySelectorAll('td');if(cells[4])setHtmlIfChanged(cells[4],'<span class="badge neutral">Sin cartera cargada</span>');if(cells[5])setHtmlIfChanged(cells[5],'<span class="badge warn">Pendiente de información</span>');});}

  function enhanceInsurers(){var host=document.getElementById('host');if(host&&location.hash.indexOf('#/aseguradoras')===0)enhanceDirectory(host);var root=document.getElementById('asg-ficha');if(!root)return;root.classList.add('m1-asg-ficha');var hero=root.querySelector(':scope > .card > div:first-child');if(hero)hero.classList.add('m1-asg-hero');var body=root.querySelector('#af-body');if(!body)return;enhanceReadFields(root);enhanceContacts(root);enhancePortals(root);enhanceBankRows(root);enhanceKnowledge(root);if(Orbit.vault&&Orbit.vault.wire)Orbit.vault.wire(root);}
  function enhance(){enhanceClient360();enhanceInsurers();}
  var scheduled=false,enhancing=false,canonicalObserver=null,canonicalObserverConnected=false,observerHost=null;
  function pauseCanonicalObserver(){if(!canonicalObserver||!canonicalObserverConnected)return false;canonicalObserver.disconnect();canonicalObserverConnected=false;return true;}
  function observeCanonicalOwner(){if(!canonicalObserver||canonicalObserverConnected||!observerHost)return false;canonicalObserver.observe(observerHost,{childList:true,subtree:true});canonicalObserverConnected=true;return true;}
  function runEnhance(){if(enhancing)return false;var resumeObserver=pauseCanonicalObserver();enhancing=true;try{enhance();return true;}finally{enhancing=false;if(resumeObserver)observeCanonicalOwner();}}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;runEnhance();});}
  function nodeNeedsCanonicalEnhancement(node){if(!node||node.nodeType!==1)return false;if(node.id==='asg-ficha'||node.id==='af-body'||node.id==='f-pais'||node.id==='f-seg')return true;if(node.matches&&node.matches('#f-pais,#f-seg,.asg-row[data-cont]:not([data-m1-contact-card="1"]),.asg-row[data-portal]:not([data-m1-portal-card="1"]),.asg-row[data-cta]:not([data-m1-bank-card="1"]),label.ce-l:not([data-m1-read-field="1"])'))return true;return !!(node.querySelector&&node.querySelector('#f-pais,#f-seg,#asg-ficha,#af-body,.asg-row[data-cont]:not([data-m1-contact-card="1"]),.asg-row[data-portal]:not([data-m1-portal-card="1"]),.asg-row[data-cta]:not([data-m1-bank-card="1"]),label.ce-l:not([data-m1-read-field="1"])'));}
  function mutationTouchesCanonicalView(records){return Array.prototype.some.call(records||[],function(record){if(record.target&&record.target.nodeType===1&&record.target.id==='af-body'&&record.addedNodes&&record.addedNodes.length)return true;return Array.prototype.some.call(record.addedNodes||[],nodeNeedsCanonicalEnhancement);});}
  function handleCanonicalMutations(records){if(enhancing||!mutationTouchesCanonicalView(records))return;runEnhance();}

  async function copyText(value){try{return Orbit.vault&&Orbit.vault.copyText?await Orbit.vault.copyText(value):!!(navigator.clipboard&&await navigator.clipboard.writeText(value));}catch(e){return false;}}
  document.addEventListener('click',async function(event){
    var copy=event.target.closest('[data-m1-copy]');if(copy){event.preventDefault();event.stopPropagation();var ok=await copyText(copy.dataset.m1Copy||'');if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(ok?'Copiado al portapapeles':'No se pudo copiar');return;}
    var reveal=event.target.closest('[data-m1-credential-reveal]'),credentialCopy=event.target.closest('[data-m1-credential-copy]');
    if(reveal||credentialCopy){event.preventDefault();event.stopPropagation();var insurer=currentInsurer(),idx=+(reveal||credentialCopy).dataset[reveal?'m1CredentialReveal':'m1CredentialCopy'],portal=insurer&&insurer.portales&&insurer.portales[idx],ref=portal&&portal.credentialRef;if(!ref||!Orbit.secureResources)return Orbit.ui&&Orbit.ui.toast&&Orbit.ui.toast('Acceso protegido pendiente de vinculación');var out=reveal?await Orbit.secureResources.revealCredential(ref,{module:'aseguradoras',insurerId:insurer.id,portalIndex:idx}):await Orbit.secureResources.copyCredential(ref,{module:'aseguradoras',insurerId:insurer.id,portalIndex:idx});if(!out||out.ok===false)return Orbit.ui&&Orbit.ui.toast&&Orbit.ui.toast(out&&out.message||'Acceso protegido pendiente de vinculación');if(reveal&&out.value){var box=reveal.closest('.m1-credential-box'),value=box&&box.querySelector('.m1-credential-value');if(value){var old=value.textContent;setTextIfChanged(value,out.value);setTimeout(function(){setTextIfChanged(value,old);},out.expiresInMs||6000);}}else if(credentialCopy&&out.value)await copyText(out.value);if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(reveal?'Acceso visible temporalmente':'Acceso copiado de forma segura');return;}
    var bank=event.target.closest('[data-m1-bank-copy-all]');if(bank){event.preventDefault();event.stopPropagation();var a=currentInsurer(),i=+bank.dataset.m1BankCopyAll,c=a&&a.cuentas&&a.cuentas[i];if(!c)return;var number=clean(c.numero);if(c.accountRef&&Orbit.secureResources&&Orbit.secureResources.revealField){var result=await Orbit.secureResources.revealField(c.accountRef,{fieldType:'bank_account',module:'aseguradoras',insurerId:a.id});if(!result||result.ok===false)return Orbit.ui&&Orbit.ui.toast&&Orbit.ui.toast(result&&result.message||'Cuenta protegida pendiente de conexión');number=clean(result.value||number);}var full=['Banco: '+(c.banco||'—'),'Tipo: '+(c.tipo||'—'),'Cuenta: '+(number||'—'),'Moneda: '+(c.moneda||'—'),'Titular: '+(c.titular||'—'),'Uso: '+(c.uso||'—')].join('\n'),copied=await copyText(full);if(Orbit.ui&&Orbit.ui.toast)Orbit.ui.toast(copied?'Datos bancarios completos copiados':'No se pudieron copiar los datos');return;}
  });
  observerHost=document.getElementById('host');if(observerHost&&window.MutationObserver){canonicalObserver=new MutationObserver(handleCanonicalMutations);observeCanonicalOwner();}window.addEventListener('hashchange',schedule);document.addEventListener('orbit:session',schedule);window.addEventListener('orbit:store:emit',schedule);
  document.documentElement.classList.add('orbit-m1-stable-ui');
  Orbit.clientInsurerVisualContractV20260720={version:'20260720.2',idempotenceRevision:'20260721.4',clientProjection:true,countryEvidenceProposalOnly:true,segmentationReadOnly:true,insurerSemanticView:true,secureCredentialActions:true,completeBankCopy:true,visualStability:true,synchronousMutationOwner:true,mutationMode:'same-microtask-disconnect-own-writes',observerOwnMutations:false,idempotentDomWrites:true,client360StructuralTrigger:true,writesStore:false,reimportsData:false,exposesSecrets:false,enhance:runEnhance};
  schedule();
})();
