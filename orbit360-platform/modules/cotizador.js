/* ============================================================
   Orbit 360 · 🧮 Cotizador  (versión comercializable)
   Flujo: 1) cotizar con tus aseguradoras (motor por tasas con
   rangos por valor, prima mínima, recargo por fraccionamiento,
   gastos de emisión e IVA por país) o ingreso MANUAL · 2) cada
   cotización se imprime en su formato · 3) las elegidas pasan al
   Comparativo. Tarifas configurables por aseguradora (las tuyas).
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.cotizador = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store, q = Orbit.q;
  let host;
  /* P0-RATE: sin reglas comerciales globales. Recargo por fraccionamiento, recargo por
     antigüedad y gastos de emisión SOLO se aplican si la aseguradora los tiene
     configurados explícitamente en a.cotTasas (recargoFraccPct{fracc:pct}, recargoAntiguedadPct{anioLimite,pct}, gastosEmisionPct).
     Si faltan, el componente correspondiente es 0 — nunca un porcentaje genérico para todos los tenants/aseguradoras. */
  function recargoFraccDe(cfg, fracc) { const t = cfg && cfg.recargoFraccPct; return (t && t[fracc] != null) ? +t[fracc] : 0; }
  function recargoAntiguedadDe(cfg, anio) { const r = cfg && cfg.recargoAntiguedad; return (r && r.anioLimite && anio < r.anioLimite) ? (+r.pct || 0) / 100 : 0; }
  function gastosEmisionDe(cfg, pais) { const g = cfg && cfg.gastosEmisionPct; return (g && g[pais] != null) ? +g[pais] : 0; }
  let st = { pais: 'GT', ramo: 'Auto', valor: 120000, anio: 2022, fracc: 12, cliente: '', clienteId: '', asesorId: '', marca: '', linea: '', modelo: '', filas: [] };
  let wizStep = 1; // 1=datos del riesgo · 2=aseguradoras · 3=resultados
  // Catálogo marca → líneas, DIFERENCIADO POR PAÍS (el parque vehicular difiere entre GT/CA y CO)
  const VEH_GT = {
    'Toyota': ['Corolla', 'Hilux', 'RAV4', 'Yaris', 'Land Cruiser', 'Prado', 'Fortuner'],
    'Hyundai': ['Tucson', 'Accent', 'Elantra', 'Santa Fe', 'Creta', 'i10'],
    'Kia': ['Sportage', 'Rio', 'Picanto', 'Sorento', 'Seltos'],
    'Nissan': ['Sentra', 'Frontier', 'Versa', 'Kicks', 'X-Trail'],
    'Mazda': ['Mazda 3', 'CX-5', 'CX-30', 'Mazda 2', 'BT-50'],
    'Chevrolet': ['Spark', 'Onix', 'Tracker', 'Captiva', 'D-Max', 'Colorado'],
    'Mitsubishi': ['L200', 'Montero', 'Outlander', 'ASX', 'Mirage'],
    'Honda': ['Civic', 'CR-V', 'HR-V', 'Fit'],
    'Volkswagen': ['Jetta', 'Tiguan', 'Gol', 'Amarok', 'T-Cross'],
    'Ford': ['Ranger', 'Escape', 'Explorer', 'F-150'],
    'Suzuki': ['Swift', 'Vitara', 'Jimny', 'Baleno'],
    'Otra': ['—']
  };
  const VEH_CO = {
    'Renault': ['Sandero', 'Duster', 'Logan', 'Stepway', 'Kwid', 'Koleos'],
    'Chevrolet': ['Spark GT', 'Onix', 'Tracker', 'Captiva', 'Sail', 'Groove'],
    'Mazda': ['Mazda 2', 'Mazda 3', 'CX-30', 'CX-5', 'BT-50'],
    'Kia': ['Picanto', 'Rio', 'Sportage', 'Soluto', 'Seltos'],
    'Nissan': ['Versa', 'March', 'Kicks', 'Frontier', 'X-Trail'],
    'Toyota': ['Corolla', 'Hilux', 'Fortuner', 'RAV4', 'Yaris', 'Prado'],
    'Volkswagen': ['Gol', 'Polo', 'T-Cross', 'Virtus', 'Amarok'],
    'Hyundai': ['Grand i10', 'Accent', 'Tucson', 'Creta', 'Santa Fe'],
    'Ford': ['Fiesta', 'EcoSport', 'Ranger', 'Explorer'],
    'Suzuki': ['Swift', 'Vitara', 'S-Presso', 'Ertiga'],
    'Otra': ['—']
  };
  function vehDe(pais) { return pais === 'CO' ? VEH_CO : VEH_GT; }
  // Catálogo línea → modelos/versiones (3er nivel). Específico por línea + fallback genérico.
  const TRIMS_DEF = ['Estándar', 'Full Extra', 'Sport', 'Limited', 'XL / XLS', '4x4', 'Híbrido'];
  const VEH_MODELOS = {
    'Toyota|Corolla': ['XLI', 'GLI', 'SE-G', 'Cross', 'Hybrid'],
    'Toyota|Hilux': ['SR', 'SRV', 'SRX 4x4', 'GR-Sport'],
    'Toyota|RAV4': ['LE', 'XLE', 'Limited', 'Adventure', 'Hybrid'],
    'Toyota|Yaris': ['Core', 'Sport', 'XLS'],
    'Hyundai|Tucson': ['GL', 'Limited', 'N-Line'],
    'Hyundai|Accent': ['GL', 'GLS', 'Limited'],
    'Kia|Sportage': ['LX', 'EX', 'SX'],
    'Kia|Picanto': ['LX', 'EX', 'GT-Line'],
    'Nissan|Frontier': ['S', 'SE', 'LE 4x4', 'Pro-4X'],
    'Nissan|Sentra': ['Sense', 'Advance', 'Exclusive'],
    'Mazda|CX-5': ['i Sport', 'i Grand Touring', 'Signature'],
    'Mitsubishi|L200': ['GLX', 'GLS', 'Sportero 4x4'],
    'Chevrolet|D-Max': ['LS', 'LT', 'High Country 4x4'],
    'Honda|CR-V': ['LX', 'EX', 'Touring'],
    'Volkswagen|Amarok': ['Trendline', 'Comfortline', 'Highline 4x4'],
    'Ford|Ranger': ['XL', 'XLS', 'XLT', 'Limited 4x4'],
    // Colombia
    'Renault|Sandero': ['Life', 'Zen', 'Intens'],
    'Renault|Duster': ['Zen', 'Intens', 'Iconic 4x4'],
    'Renault|Logan': ['Life', 'Zen', 'Intens'],
    'Chevrolet|Spark GT': ['LS', 'LT', 'Activ'],
    'Chevrolet|Tracker': ['LS', 'LT', 'Premier'],
    'Mazda|Mazda 3': ['Touring', 'Grand Touring', 'Signature'],
    'Kia|Soluto': ['LX', 'EX'],
    'Nissan|Versa': ['Sense', 'Advance', 'Exclusive'],
    'Volkswagen|Virtus': ['Trendline', 'Comfortline', 'Highline'],
    'Hyundai|Grand i10': ['Sedán', 'Hatchback'],
    'Ford|EcoSport': ['S', 'SE', 'Titanium'],
    'Suzuki|Ertiga': ['GL', 'GLX']
  };
  const modelosDe = (marca, linea) => VEH_MODELOS[marca + '|' + linea] || (linea && linea !== '—' ? TRIMS_DEF : []);
  let tabCot = 'cotizar';
  function getCotLog(){ return Orbit.store.pref('cot_hist', []) || []; }
  function saveCotLog(l){ Orbit.store.setPref('cot_hist', l); }


  function camposPorRamo(ramo) {
    if (ramo === 'Auto') {
      const marcas = Object.keys(vehDe(st.pais));
      const lineas = vehDe(st.pais)[st.marca] || [];
      const modelos = modelosDe(st.marca, st.linea);
      const subramo = st.pais === 'CO'
        ? ['Todo riesgo', 'RC / SOAT+', 'Pérdidas totales', 'Pérdidas parciales', 'Por kilómetros', 'Pesado']
        : ['Liviano', 'Responsabilidad Civil', 'Pesado', 'Pick-up / Comercial', 'Motocicleta', 'Grúa'];
      return `<label class="ce-l">📅 Año<input id="cz-anio" class="o-sel" type="number" value="${st.anio}" min="1990" max="2026"></label>`
        + `<label class="ce-l">🚙 Tipo / Subramo<select id="cz-sub" class="o-sel">${subramo.map(x => `<option ${x === st.sub ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`
        + (st.marcaCustom
          ? `<label class="ce-l">🚗 Marca<input id="cz-marca-t" class="o-sel" value="${U.esc(st.marca || '')}" placeholder="Escribe la marca" autofocus></label>`
          : `<label class="ce-l">🚗 Marca<select id="cz-marca" class="o-sel"><option value="">— Marca —</option>${marcas.map(m => `<option ${m === st.marca ? 'selected' : ''}>${m}</option>`).join('')}<option value="__otro">➕ Otro…</option></select></label>`)
        + (st.lineaCustom
          ? `<label class="ce-l">🔻 Línea<input id="cz-linea-t" class="o-sel" value="${U.esc(st.linea || '')}" placeholder="Escribe la línea"></label>`
          : `<label class="ce-l">🔻 Línea<select id="cz-linea" class="o-sel" ${(lineas.length || st.marca) ? '' : 'disabled'}><option value="">${st.marca ? '— Línea —' : 'Elige marca primero'}</option>${lineas.map(l => `<option ${l === st.linea ? 'selected' : ''}>${l}</option>`).join('')}${st.marca ? '<option value="__otro">➕ Otro…</option>' : ''}</select></label>`)
        + (st.modeloCustom
          ? `<label class="ce-l">🏷️ Modelo / Versión<input id="cz-modelo-t" class="o-sel" value="${U.esc(st.modelo || '')}" placeholder="Escribe el modelo"></label>`
          : `<label class="ce-l">🏷️ Modelo / Versión<select id="cz-modelo" class="o-sel" ${(modelos.length || st.linea) ? '' : 'disabled'}><option value="">${st.linea ? '— Modelo —' : 'Elige línea primero'}</option>${modelos.map(m => `<option ${m === st.modelo ? 'selected' : ''}>${m}</option>`).join('')}${st.linea ? '<option value="__otro">➕ Otro…</option>' : ''}</select></label>`)
        + `<label class="ce-l">🔢 Placa<input id="cz-placa" class="o-sel" value="${U.esc(st.placa || '')}" placeholder="P-123ABC"></label>`;
    }
    if (ramo === 'Vida') return `<label class="ce-l">🎂 Edad del asegurado<input id="cz-edad" class="o-sel" type="number" value="${st.edad||35}" min="18" max="80"></label>`
      + `<label class="ce-l">💰 Suma asegurada<input id="cz-suma" class="o-sel" type="number" value="${st.suma||100000}"></label>`
      + `<label class="ce-l">🚭 ¿Fumador?<select id="cz-fuma" class="o-sel"><option ${st.fuma==='No'?'selected':''}>No</option><option ${st.fuma==='Sí'?'selected':''}>Sí</option></select></label>`
      + `<label class="ce-l">👨‍👩‍👧 Beneficiarios<input id="cz-benef" class="o-sel" type="number" value="${st.benef||1}" min="1"></label>`
      + `<label class="ce-l">🏥 Cobertura<select id="cz-vcob" class="o-sel"><option ${st.vcob==='Vida'?'selected':''}>Vida</option><option ${st.vcob==='Vida + invalidez'?'selected':''}>Vida + invalidez</option><option ${st.vcob==='Vida + ahorro'?'selected':''}>Vida + ahorro</option></select></label>`;
    if (ramo === 'Gastos Médicos') {
      const tipo = st.gmTipo || 'Individual';
      let extra = '';
      if (tipo === 'Familiar') {
        const n = st.gmIntegrantes || 2;
        extra = `<label class="ce-l">👥 N.º de integrantes<input id="cz-gm-n" class="o-sel" type="number" min="2" max="12" value="${n}"></label>`
          + `<div style="grid-column:1/-1" id="cz-gm-edades"><div class="ce-l" style="margin-bottom:6px">🎂 Edades de los integrantes</div><div style="display:flex;flex-wrap:wrap;gap:6px">${Array.from({length:n}).map((_,k)=>`<input class="o-sel cz-gm-edad" data-k="${k}" type="number" placeholder="${k===0?'Titular':'Int. '+(k+1)}" value="${(st.gmEdades&&st.gmEdades[k])||''}" style="width:88px">`).join('')}</div></div>`;
      } else if (tipo === 'Colectivo') {
        extra = `<label class="ce-l">🏢 N.º de empleados<input id="cz-gm-emp" class="o-sel" type="number" value="${st.gmEmpleados||10}"></label><label class="ce-l">📊 Edad promedio<input id="cz-edad" class="o-sel" type="number" value="${st.edad||38}"></label>`;
      } else {
        extra = `<label class="ce-l">🎂 Edad<input id="cz-edad" class="o-sel" type="number" value="${st.edad||35}"></label>`;
      }
      return `<label class="ce-l">👨‍👩‍👧 Tipo de plan<select id="cz-gm-tipo" class="o-sel"><option ${tipo==='Individual'?'selected':''}>Individual</option><option ${tipo==='Familiar'?'selected':''}>Familiar</option><option ${tipo==='Colectivo'?'selected':''}>Colectivo</option></select></label>`
        + extra
        + `<label class="ce-l">🏥 Suma máxima<input id="cz-suma" class="o-sel" type="number" value="${st.suma||500000}"></label>`
        + `<label class="ce-l">🛏️ Habitación<select id="cz-gm-hab" class="o-sel"><option ${st.gmHab==='Estándar'?'selected':''}>Estándar</option><option ${st.gmHab==='Privada'?'selected':''}>Privada</option><option ${st.gmHab==='Suite'?'selected':''}>Suite</option></select></label>`
        + `<label class="ce-l">💵 Deducible<input id="cz-gm-ded" class="o-sel" value="${U.esc(st.gmDed||'')}" placeholder="Ej. Q3,000"></label>`;
    }
    if (ramo === 'Hogar') return `<label class="ce-l">🏠 Tipo de inmueble<select id="cz-h-tipo" class="o-sel"><option ${st.hTipo==='Residencia'?'selected':''}>Residencia</option><option ${st.hTipo==='Apartamento'?'selected':''}>Apartamento</option><option ${st.hTipo==='Local comercial'?'selected':''}>Local comercial</option></select></label>`
      + `<label class="ce-l">📐 M² construidos<input id="cz-m2" class="o-sel" type="number" value="${st.m2||120}"></label>`
      + `<label class="ce-l">🏗️ Valor del inmueble<input id="cz-hval" class="o-sel" type="number" value="${st.hval||0}"></label>`
      + `<label class="ce-l">📦 Valor del contenido<input id="cz-hcont" class="o-sel" type="number" value="${st.hcont||0}"></label>`
      + `<label class="ce-l">🌎 Zona / riesgo<select id="cz-hzona" class="o-sel"><option>Urbana</option><option>Costa / sísmica</option><option>Rural</option></select></label>`;
    if (ramo === 'Daños') return `<label class="ce-l">🏭 Giro / Actividad<input id="cz-giro" class="o-sel" value="${U.esc(st.giro||'')}" placeholder="Comercio, industria..."></label>`
      + `<label class="ce-l">📦 Bienes a asegurar<input id="cz-bienes" class="o-sel" value="${U.esc(st.bienes||'')}" placeholder="Inventario, maquinaria..."></label>`
      + `<label class="ce-l">💰 Suma asegurada<input id="cz-dsuma" class="o-sel" type="number" value="${st.dsuma||0}"></label>`
      + `<label class="ce-l">🛡️ Coberturas<select id="cz-dcob" class="o-sel" multiple style="height:auto"><option>Incendio</option><option>Robo</option><option>Equipo electrónico</option><option>RC</option><option>Transporte</option></select></label>`;
    return '';
  }
  function vCotHistorial() {
    const log = getCotLog();
    if (!log.length) return '<div class="card pad" style="text-align:center;color:var(--ink-3);margin-bottom:16px">Sin cotizaciones guardadas aún.</div>';
    return '<div class="card" style="overflow:hidden;margin-bottom:16px"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente</th><th>Ramo</th><th>País</th><th>Aseg.</th><th>Estado</th><th></th></tr></thead><tbody>'
      + log.map(l => '<tr><td class="mono" style="font-size:11.5px">' + (l.fecha||'—') + '</td><td>' + U.esc(l.cliente||'—') + '</td><td><span class="badge info" style="font-size:10px">' + U.esc(l.ramo||'—') + '</span></td><td>' + U.esc(l.pais||'—') + '</td><td>' + (l.aseg||0) + '</td><td><span class="badge ' + (l.estado==='Emitida'?'ok':'warn') + '" style="font-size:10px">' + U.esc(l.estado||'Guardada') + '</span></td><td><button class="btn ghost sm" data-chl="' + U.esc(l.id) + '">Cargar →</button></td></tr>'
      ).join('') + '</tbody></table></div>';
  }
  function cargarHistorial(id) { const log = getCotLog(); const e = log.find(x => x.id === id); if (e && e.state) { Object.assign(st, e.state); tabCot = 'cotizar'; wizStep = 1; render(host); } }
  function wizNav(labelsDone) {
    const steps = [{ n: 1, t: '📋 Datos del riesgo' }, { n: 2, t: '🏢 Aseguradoras' }, { n: 3, t: '🧾 Resultados' }];
    return '<div class="cz-wiz-nav" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">' + steps.map(s => {
      const active = s.n === wizStep, done = s.n < wizStep || (s.n === 3 && labelsDone);
      const clickable = s.n <= wizStep || done;
      return `<div class="cz-wiz-pill${active ? ' active' : ''}${done && !active ? ' done' : ''}" style="flex:1;min-width:120px;text-align:center;padding:9px 10px;border-radius:10px;font-size:12.5px;font-weight:700;border:1.5px solid ${active ? 'var(--red)' : done ? 'var(--ok)' : 'var(--line)'};background:${active ? 'var(--red)' : 'transparent'};color:${active ? '#fff' : done ? 'var(--ok)' : 'var(--ink-3)'};${clickable ? 'cursor:pointer' : 'cursor:default;opacity:.6'}" ${clickable ? `data-wgo="${s.n}"` : ''}>${done && !active ? '✓ ' : s.n + '. '}${s.t}</div>`;
    }).join('') + '</div>';
  }

  function asegElegibles() {
    const ramo = st.ramo;
    return S().all('aseguradoras').filter(a => {
      if (a.vinculada === false) return false;
      if (st.pais && a.pais !== st.pais) return false;
      if (ramo && (a.ramos || []).indexOf(ramo) < 0) return false;
      // gate real DEFAULT-DENY: el ramo debe estar HABILITADO EXPLÍCITAMENTE (=== true) para Cotizador; ausencia de configuración = no disponible
      if (!ramo) return true;
      return !!(a.ramosHabilitados && a.ramosHabilitados[ramo] && a.ramosHabilitados[ramo].cotizador === true);
    });
  }
  function ivaPais(p) { return (Orbit.primas && Orbit.primas.cfgPais) ? Orbit.primas.cfgPais(p).iva : (p === 'CO' ? 19 : 12); }
  /* ---- DTO canónico CotizacionNormalizada: usado por Cotizador (origen=cotizador) y Comparativo (origen=pdf/manual) ---- */
  Orbit.dto = Orbit.dto || {};
  Orbit.dto.cotizacionNormalizada = function (f) {
    return {
      _dto: 'CotizacionNormalizada', origen: f.origen || 'cotizador', // 'cotizador' | 'pdf' | 'manual'
      nombre: f.nombre || '', color: f.color || '#6b7280',
      pais: f.pais || 'GT', cur: f.cur || (f.pais === 'CO' ? 'COP' : 'GTQ'),
      ramo: f.ramo || '', neta: f.neta || 0, iva: f.iva || 0, total: f.total || (f.neta || 0) + (f.iva || 0),
      fracc: f.fracc || 1, sumaAsegurada: f.sumaAsegurada || 0, deducible: f.deducible || '', exclusiones: f.exclusiones || '',
      aseguradoraId: f.aseguradoraId || '', clienteId: f.clienteId || '', cliente: f.cliente || '', asesorId: f.asesorId || '',
      /* P0-DTO: fuente/versionado + trazabilidad + estado comercial, mínimos exigidos por el contrato canónico */
      fuenteDocumentoId: f.fuenteDocumentoId || '', versionFuente: f.versionFuente || '', vigenciaFuente: f.vigenciaFuente || '',
      confirmacionHumana: !!f.confirmacionHumana, estadoComercial: f.estadoComercial || 'borrador',
      trazabilidad: f.trazabilidad || { actor: (Orbit.auth && Orbit.auth.user && Orbit.auth.user().nombre) || '', fecha: (Orbit.ui.today ? Orbit.ui.today() : ''), origen: f.origen || 'cotizador' },
      estadoValidacion: f.estadoValidacion || 'requiere_revision'
    };
  };

  function render(h) {
    host = h;
    const asg = asegElegibles();
    st.filas = st.filas.filter(f => asg.some(a => a.id === f.id));
    if (!st.filas.length) st.filas = asg.slice(0, 3).map(a => ({ id: a.id, modo: 'tasas', prima: 0, sel: true, res: null }));
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🧮', title: 'Cotizador', sub: 'Cotiza con tus aseguradoras y arma el comparativo', features: [] })}
      <div class="cfg-note" style="margin-bottom:14px">🔗 Consume solo aseguradoras cuyo ramo está <b>habilitado para Cotizador</b> en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/aseguradoras'">Aseguradoras</a> (pestaña Productos/Tarifas). Si desactivás un ramo ahí, deja de aparecer aquí. Envía la cotización al <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/comparativo'">Comparativo</a> para cerrar con el cliente.</div>
      <div class="tabs" style="max-width:380px;margin-bottom:16px"><div class="tab ${tabCot==='cotizar'?'active ':''}tab" data-czt="cotizar">🧮 Cotizador</div><div class="tab ${tabCot==='historial'?'active ':''}tab" data-czt="historial">📋 Historial</div></div>${tabCot === 'historial' ? vCotHistorial() : ''}
      <div style="${tabCot==='historial'?'display:none':''}">
      ${wizNav()}
      <div class="card pad" style="${wizStep===1?'':'display:none'}">
          <div class="asg-sec-t">📋 1 · Datos del riesgo</div>
          <div class="cgrid">
            <label class="ce-l">🌎 País<select id="cz-pais" class="o-sel"><option ${st.pais === 'GT' ? 'selected' : ''}>GT</option><option ${st.pais === 'CO' ? 'selected' : ''}>CO</option></select></label>
            <label class="ce-l">🛡️ Ramo<select id="cz-ramo" class="o-sel">${['Auto', 'Vida', 'Gastos Médicos', 'Hogar', 'Daños'].map(r => `<option ${r === st.ramo ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
            <label class="ce-l">💰 Valor asegurado<input id="cz-valor" class="o-sel" type="number" value="${st.valor}"></label>
            ${camposPorRamo(st.ramo)}
            <label class="ce-l">💳 Pagos<select id="cz-fracc" class="o-sel">${[1, 2, 4, 6, 12].map(f => `<option value="${f}" ${f === st.fracc ? 'selected' : ''}>${f === 1 ? 'Contado' : f + ' pagos'}</option>`).join('')}</select></label>
            ${st.ramo !== 'Gastos Médicos' ? `<label class="ce-l">📉 Deducible (opcional)<input id="cz-ded-gen" class="o-sel" value="${U.esc(st.deducible || '')}" placeholder="Ej. 1% · Q1,000"></label>` : ''}
            <label class="ce-l">🧑 Cliente<select id="cz-cliid" class="o-sel"><option value="">— Prospecto nuevo —</option>${S().all('clientes').map(c => `<option value="${c.id}" ${c.id === st.clienteId ? 'selected' : ''}>${U.esc(c.nombre)}</option>`).join('')}</select></label>
            <label class="ce-l" id="cz-clinom-wrap" style="${st.clienteId ? 'display:none' : ''}">✍️ Nombre del prospecto<input id="cz-cliente" class="o-sel" value="${U.esc(st.cliente)}" placeholder="Nombre del prospecto"></label>
            <label class="ce-l">🧑‍💼 Asesor<select id="cz-ase" class="o-sel"><option value="">— Asignar —</option>${S().all('asesores').filter(a => !a.inactivo).map(a => `<option value="${a.id}" ${a.id === st.asesorId ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select></label>
          </div>
          <button class="btn primary" id="cz-next1" style="margin-top:16px;width:100%">Siguiente: elegir aseguradoras →</button>
      </div>
      <div class="card pad" style="${wizStep===2?'':'display:none'}">
          <div class="asg-sec-t">🏢 2 · Aseguradoras</div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Modo <b>📊 tasas</b> calcula con tu tabla; <b>✍️ manual</b> ingresas la prima recibida. Marca ✅ las que quieras llevar al comparativo.</div>
          ${asg.length ? '' : `<div class="cfg-note" style="margin-bottom:9px">⚠ Cotización automática pendiente de configuración: ninguna aseguradora de <b>${st.pais}</b> tiene el ramo <b>${st.ramo}</b> habilitado para Cotizador. Habilitálo en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/aseguradoras'">Aseguradoras</a> → pestaña Productos/Tarifas, o cargá una cotización recibida desde el Comparativo.</div>`}
          <div id="cz-asgs"></div>
          <button class="btn ghost sm" id="cz-add" style="margin-top:9px" ${asg.length ? '' : 'disabled'}>➕ Aseguradora</button>
          <div style="display:flex;gap:10px;margin-top:14px">
            <button class="btn ghost" id="cz-back2" style="flex:1">← Atrás</button>
            <button class="btn primary" id="cz-gen" style="flex:2" ${st.filas.length && asg.length ? '' : 'disabled'}>⚡ Cotizar</button>
          </div>
      </div>
      <div style="${wizStep===3?'':'display:none'}">
        <button class="btn ghost sm" id="cz-back3" style="margin-bottom:12px">← Editar datos / aseguradoras</button>
        <div class="card pad" id="cz-out"><div class="muted" style="text-align:center;padding:40px 0">🧮 Las cotizaciones aparecerán aquí.</div></div>
      </div>
      </div>
    </div>`;
    bind(); paintAsgs();
    if (wizStep === 3 && st.filas.some(f => f.res)) pintarResultados();
  }
  function bind() {
    const set = (id, k, num) => { const el = host.querySelector(id); if (el) el.addEventListener('change', () => { st[k] = num ? +el.value : el.value; if (k === 'pais' || k === 'ramo') { st.filas = []; if (k === 'pais') { st.marca = ''; st.linea = ''; st.modelo = ''; st.marcaCustom = false; } render(host); } }); };
    set('#cz-pais', 'pais'); set('#cz-ramo', 'ramo'); set('#cz-valor', 'valor', true); set('#cz-anio', 'anio', true); set('#cz-fracc', 'fracc', true); set('#cz-cliente', 'cliente');
    set('#cz-sub', 'sub'); set('#cz-ase', 'asesorId'); set('#cz-ded-gen', 'deducible');
    // Gastos Médicos: cambiar tipo re-renderiza (familiar→integrantes, colectivo→empleados)
    const gmt = host.querySelector('#cz-gm-tipo'); if (gmt) gmt.addEventListener('change', () => { st.gmTipo = gmt.value; render(host); });
    const gmn = host.querySelector('#cz-gm-n'); if (gmn) gmn.addEventListener('change', () => { st.gmIntegrantes = Math.max(2, +gmn.value || 2); render(host); });
    host.querySelectorAll('.cz-gm-edad').forEach(el => el.addEventListener('change', () => { st.gmEdades = st.gmEdades || []; st.gmEdades[+el.dataset.k] = +el.value || ''; }));
    ['#cz-suma','#cz-edad','#cz-m2','#cz-hval','#cz-hcont','#cz-dsuma','#cz-benef','#cz-gm-emp','#cz-gm-ded','#cz-gm-hab','#cz-fuma','#cz-vcob','#cz-h-tipo','#cz-hzona','#cz-giro','#cz-bienes','#cz-placa'].forEach(s => { const el = host.querySelector(s); if (el) el.addEventListener('change', () => { st[s.replace('#cz-','').replace(/-/g,'')] = el.value; }); });
    // marca → recarga líneas · línea → recarga modelos · "Otro" → entrada libre inline
    const mk = host.querySelector('#cz-marca'); if (mk) mk.addEventListener('change', () => { if (mk.value === '__otro') { st.marcaCustom = true; st.marca = ''; st.linea = ''; st.modelo = ''; } else { st.marca = mk.value; st.linea = ''; st.modelo = ''; } render(host); });
    const mkt = host.querySelector('#cz-marca-t'); if (mkt) mkt.addEventListener('input', () => { st.marca = mkt.value; });
    const ln = host.querySelector('#cz-linea'); if (ln) ln.addEventListener('change', () => { if (ln.value === '__otro') { st.lineaCustom = true; st.linea = ''; st.modelo = ''; } else { st.linea = ln.value; st.modelo = ''; } render(host); });
    const lnt = host.querySelector('#cz-linea-t'); if (lnt) lnt.addEventListener('input', () => { st.linea = lnt.value; });
    const md = host.querySelector('#cz-modelo'); if (md) md.addEventListener('change', () => { if (md.value === '__otro') { st.modeloCustom = true; st.modelo = ''; render(host); } else { st.modelo = md.value; } });
    const mdt = host.querySelector('#cz-modelo-t'); if (mdt) mdt.addEventListener('input', () => { st.modelo = mdt.value; });
    // cliente existente → oculta nombre manual y precarga
    const cli = host.querySelector('#cz-cliid'); if (cli) cli.addEventListener('change', () => { st.clienteId = cli.value; const c = cli.value ? S().get('clientes', cli.value) : null; if (c) { st.cliente = c.nombre; if (c.asesorId) st.asesorId = c.asesorId; if (c.pais) st.pais = c.pais; } render(host); });
    host.querySelectorAll('[data-czt]').forEach(b => b.addEventListener('click', () => { tabCot = b.dataset.czt; wizStep = 1; render(host); }));
    host.querySelectorAll('[data-chl]').forEach(b => b.addEventListener('click', () => cargarHistorial(b.dataset.chl)));
    host.querySelectorAll('[data-wgo]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.wgo; if (n <= wizStep) { wizStep = n; render(host); } }));
    const next1 = host.querySelector('#cz-next1'); if (next1) next1.addEventListener('click', () => { wizStep = 2; render(host); });
    const back2 = host.querySelector('#cz-back2'); if (back2) back2.addEventListener('click', () => { wizStep = 1; render(host); });
    const back3 = host.querySelector('#cz-back3'); if (back3) back3.addEventListener('click', () => { wizStep = 2; render(host); });
    host.querySelector('#cz-add').addEventListener('click', () => { const a = asegElegibles().find(x => !st.filas.some(f => f.id === x.id)); if (a) { st.filas.push({ id: a.id, modo: 'tasas', prima: 0, sel: true }); paintAsgs(); } else { const t = document.createElement('div'); t.className = 'ciclo-toast'; t.textContent = 'Ya agregaste todas las aseguradoras de ' + st.pais; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); } });
    host.querySelector('#cz-gen').addEventListener('click', () => { wizStep = 3; render(host); cotizar(); });
  }
  function paintAsgs() {
    const asg = asegElegibles();
    host.querySelector('#cz-asgs').innerHTML = st.filas.map((row, i) => `<div class="asg-row" data-r="${i}">
      <input type="checkbox" data-asel ${row.sel ? 'checked' : ''} title="Incluir en comparativo">
      <select class="o-sel" data-aid style="flex:1.3">${asg.map(a => `<option value="${a.id}" ${a.id === row.id ? 'selected' : ''}>${U.esc(a.nombre)}</option>`).join('')}</select>
      <select class="o-sel" data-amodo style="flex:.9">${[['tasas', '📊 Tasas'], ['manual', '✍️ Manual']].map(m => `<option value="${m[0]}" ${m[0] === row.modo ? 'selected' : ''}>${m[1]}</option>`).join('')}</select>
      <input class="o-sel" data-aprima type="number" placeholder="Prima" value="${row.prima || ''}" style="width:96px;display:${row.modo === 'manual' ? '' : 'none'}">
      <button class="asg-del" data-adel="${i}">✕</button></div>`).join('');
    host.querySelectorAll('[data-r]').forEach((r, i) => {
      r.querySelector('[data-asel]').addEventListener('change', e => st.filas[i].sel = e.target.checked);
      r.querySelector('[data-aid]').addEventListener('change', e => st.filas[i].id = e.target.value);
      r.querySelector('[data-amodo]').addEventListener('change', e => { st.filas[i].modo = e.target.value; paintAsgs(); });
      const pr = r.querySelector('[data-aprima]'); if (pr) pr.addEventListener('change', e => st.filas[i].prima = +e.target.value);
    });
    host.querySelectorAll('[data-adel]').forEach(b => b.addEventListener('click', () => { st.filas.splice(+b.dataset.adel, 1); paintAsgs(); }));
  }
  /* Sin tasa configurada y validada para la aseguradora, el cálculo automático queda bloqueado — nunca se usa una tarifa genérica. */
  function tieneTasaValidada(asgId) {
    const a = S().get('aseguradoras', asgId);
    const cfg = tarifaDe(a, st.ramo);
    /* P0-AUTO-GATE: exige tramos + metadata completa (fuenteDocumentoId, version, vigencia) + validaci\u00f3n humana */
    return !!(a && cfg && cfg.auto && cfg.auto.length && cfg.fuenteDocumentoId && cfg.version && cfg.vigencia && a.cotTasasValidadas && a.cotTasasValidadas[st.ramo]);
  }
  /* Tarifas ahora son POR RAMO: a.cotTasas[ramo] = { auto, recargoFraccPct, recargoAntiguedad, gastosEmisionPct, fuenteDocumentoId, version, vigencia }; a.cotTasasValidadas[ramo] = bool. Se editan en Aseguradoras › pestaña Tarifas y conocimiento. */
  function tarifaDe(a, ramo) { return (a && a.cotTasas && a.cotTasas[ramo]) || null; }
  function calcTasas(asgId) {
    const a = S().get('aseguradoras', asgId);
    const cfg = tarifaDe(a, st.ramo);
    if (!a || !cfg || !cfg.auto || !cfg.auto.length || !(a.cotTasasValidadas && a.cotTasasValidadas[st.ramo])) return null;
    const tabla = cfg.auto;
    const rango = tabla.find(r => st.valor <= r.hasta) || tabla[tabla.length - 1];
    let neta = Math.max(rango.min, st.valor * rango.tasa / 100);
    if (st.ramo === 'Auto') neta *= (1 + recargoAntiguedadDe(cfg, st.anio));
    const recargo = recargoFraccDe(cfg, st.fracc) / 100 * neta;
    const gastosEm = neta * (gastosEmisionDe(cfg, st.pais) / 100);
    const base = neta + recargo + gastosEm, iva = base * ivaPais(st.pais) / 100;
    return { neta, recargo, gastosEm, iva, total: base + iva, tasaPct: rango.tasa, fuenteDocumentoId: (cfg.fuenteDocumentoId || ''), versionFuente: (cfg.version || ''), vigenciaFuente: (cfg.vigencia || '') };
  }
  function cotizar() {
    st.filas.forEach(row => {
      const a = S().get('aseguradoras', row.id);
      if (row.modo === 'manual') {
        const neta = +row.prima || 0, iva = neta * ivaPais(st.pais) / 100;
        row.res = { neta, recargo: 0, gastosEm: 0, iva, total: neta + iva, tasaPct: null };
      } else {
        row.res = calcTasas(row.id);
        if (!row.res) row.bloqueada = true;
      }
      row.nombre = a ? a.nombre : ''; row.color = a ? a.color : '#999';
    });
    pintarResultados();
  }
  function pintarResultados() {
    const cur = st.pais === 'CO' ? 'COP' : 'GTQ';
    const con = st.filas.filter(f => f.res);
    const bloqueadas = st.filas.filter(f => f.bloqueada);
    const outEl = host.querySelector('#cz-out'); if (!outEl) return;
    outEl.innerHTML = `
      ${bloqueadas.length ? `<div class="cfg-note" style="margin-bottom:12px">⚠ Tarifa pendiente de validación: ${bloqueadas.map(f => U.esc((S().get('aseguradoras', f.id) || {}).nombre || '')).join(', ')} no tiene tabla de tasas validada para Cotizador — configúrala en <a style="color:var(--red);cursor:pointer" onclick="location.hash='#/aseguradoras'">Aseguradoras</a> o usa modo ✍️ Manual con la prima que te den.</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <b style="font-family:var(--f-display);font-size:16px">🧾 Cotizaciones · ${st.ramo}</b>
        ${con.length ? '<button class="btn primary sm" id="cz-comp">📋 Generar comparativo →</button>' : ''}
      </div>
      <div class="cz-cards">${con.map((f, i) => `
        <div class="cz-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span class="dot-s" style="background:${f.color};width:11px;height:11px"></span><b style="font-family:var(--f-display);flex:1">${U.esc(f.nombre)}</b><label style="font-size:11px;display:flex;gap:4px;align-items:center"><input type="checkbox" data-csel="${i}" ${f.sel ? 'checked' : ''}>✅</label></div>
          <div class="cz-total">${U.money(f.res.total, cur)}</div>
          <div class="muted" style="font-size:11.5px">💵 prima total${st.fracc > 1 ? ' · ' + U.money(f.res.total / st.fracc, cur) + '/pago' : ''}</div>
          <table class="vp-dtbl" style="margin-top:10px">
            <tr><td>Prima neta</td><td class="num">${U.money(f.res.neta, cur)}</td></tr>
            ${f.res.recargo ? `<tr><td>Recargo fracc.</td><td class="num">${U.money(f.res.recargo, cur)}</td></tr>` : ''}
            ${f.res.gastosEm ? `<tr><td>Gastos emisión</td><td class="num">${U.money(f.res.gastosEm, cur)}</td></tr>` : ''}
            <tr><td>IVA (${ivaPais(st.pais)}%)</td><td class="num">${U.money(f.res.iva, cur)}</td></tr>
          </table>
          <button class="btn ghost sm" style="margin-top:9px;width:100%" data-cprint="${i}">🖨 Imprimir cotización</button>
          <button class="btn ghost sm" style="margin-top:6px;width:100%" data-csend="${i}">📲 Preparar comunicación al cliente (WhatsApp/Correo)</button>
        </div>`).join('')}</div>
      <div class="cfg-note" style="margin-top:13px">📊 Cálculo con rangos por valor, prima mínima, recargo por fraccionamiento, gastos e IVA por país. Las <b>tasas son configurables por aseguradora</b> — ajusta a las tuyas.</div>`;
    host.querySelectorAll('[data-csel]').forEach(c => c.addEventListener('change', e => con[+c.dataset.csel].sel = e.target.checked));
    host.querySelectorAll('[data-cprint]').forEach(b => b.addEventListener('click', () => imprimirCot(con[+b.dataset.cprint], cur)));
    host.querySelectorAll('[data-csend]').forEach(b => b.addEventListener('click', () => enviarCot(con[+b.dataset.csend], cur)));
    const compBtn = host.querySelector('#cz-comp'); if (compBtn) compBtn.addEventListener('click', () => {
      const dtos = con.filter(f => f.sel).map(f => Orbit.dto.cotizacionNormalizada({ origen: 'cotizador', nombre: f.nombre, color: f.color, total: f.res.total, neta: f.res.neta, iva: f.res.iva, cur, pais: st.pais, ramo: st.ramo, aseguradoraId: f.id, clienteId: st.clienteId, cliente: st.cliente, fracc: st.fracc, sumaAsegurada: st.suma || st.valor || st.dsuma || st.hval || 0, deducible: st.gmDed || st.deducible || '', asesorId: st.asesorId,
        fuenteDocumentoId: f.res.fuenteDocumentoId || '', versionFuente: f.res.versionFuente || '', vigenciaFuente: f.res.vigenciaFuente || '',
        confirmacionHumana: f.modo === 'manual', estadoComercial: 'preparada' }));
      /* P0-FORCED-VALID: automático solo válida si superó el gate de tasas (tieneTasaValidada); manual nace requiere_revision */
      dtos.forEach(d => { d.estadoValidacion = (d.origen === 'cotizador' && tieneTasaValidada(d.aseguradoraId)) ? 'validada' : 'requiere_revision'; d.id = 'cot' + Date.now() + Math.floor(Math.random() * 999); S().insert('cotizaciones', d); });
      /* P0-HANDOFF: transferencia persistida por IDs vía Orbit.store, nunca sessionStorage/localStorage */
      S().insert('quoteTransfers', { id: 'qt' + Date.now(), cotizacionIds: dtos.map(d => d.id), clienteId: st.clienteId, cliente: st.cliente, pais: st.pais, cur, ramo: st.ramo, fecha: (Orbit.ui.today ? Orbit.ui.today() : ''), estado: 'pendiente' });
      location.hash = '#/comparativo';
    });
  }
  function imprimirCot(f, cur) {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Cotización ${f.nombre}</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:system-ui,sans-serif;color:#1E2227}h1{color:#C5162E;font-size:20px}.r{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}.tot{font-size:24px;font-weight:800;margin-top:10px;color:#C5162E}</style></head><body>
      <h1>🧾 Cotización · ${f.nombre}</h1><p>${st.ramo} · ${st.cliente || 'Prospecto'} · valor ${U.money(st.valor, cur)} · ${st.fracc === 1 ? 'contado' : st.fracc + ' pagos'}</p><hr>
      <div class="r"><span>Prima neta</span><b>${U.money(f.res.neta, cur)}</b></div>
      ${f.res.recargo ? `<div class="r"><span>Recargo fraccionamiento</span><b>${U.money(f.res.recargo, cur)}</b></div>` : ''}
      ${f.res.gastosEm ? `<div class="r"><span>Gastos de emisión</span><b>${U.money(f.res.gastosEm, cur)}</b></div>` : ''}
      <div class="r"><span>IVA</span><b>${U.money(f.res.iva, cur)}</b></div>
      <div class="tot">Prima total: ${U.money(f.res.total, cur)}</div>
      <p style="margin-top:24px;color:#888;font-size:12px">Documento informativo. Coberturas sujetas a condiciones de la póliza vigente.</p></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 350);
  }
  function enviarCot(f, cur) {
    const cid = st.clienteId || (Orbit.store.all('clientes')[0] || {}).id;
    if (!cid) { Orbit.ui.toast('Selecciona un cliente para enviar la cotización.'); return; }
    const msg = 'Hola, te comparto la cotización de ' + st.ramo + ' con ' + f.nombre + ':\n\n' +
      '• Prima total: ' + U.money(f.res.total, cur) + '\n• Prima neta: ' + U.money(f.res.neta, cur) + '\n\nQuedo atento para avanzar con la emisión cuando gustes.';
    Orbit.notify.pedir(cid, { tipo: 'Cotización preparada', icon: '🧮', asunto: 'Cotización de ' + st.ramo + ' · ' + f.nombre, mensaje: msg, adjunto: 'Cotizacion-' + f.nombre + '.pdf' });
  }
  return { render };
})();
