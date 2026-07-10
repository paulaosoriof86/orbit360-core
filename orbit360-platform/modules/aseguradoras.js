/* ============================================================
   Orbit 360 · Orbit Aseguradoras (directorio operativo) — editable
   Directorio GT/CO habilitable; ficha editable: logo, accesos,
   contactos, cuentas, facturación, Drive, fuentes documentales,
   comisiones y requisitos de emisión.

   P0.1 / P0.1b 2026-07-10:
   - inventario multifuentе para Cotizador/Comparativo;
   - país/moneda/ramo/producto/segmento/tipo de riesgo/vehículo/plan;
   - agrupación y suficiencia por combinación, no por aseguradora completa;
   - disponibilidad de tarifas, reglas, presentación y casos de prueba;
   - compatibilidad con docs legacy nombre/categoría;
   - cero almacenamiento directo fuera de Orbit.store.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.modules = Orbit.modules || {};
Orbit.modules.aseguradoras = (function () {
  const U = Orbit.ui, K = Orbit.kit, S = () => Orbit.store;
  let host;

  const SOURCE_TYPES = [
    ['cotizador_excel_salida', 'Cotizador Excel con salida'],
    ['cotizacion_pdf_oficial', 'Cotización PDF oficial'],
    ['tarifario_excel', 'Tarifario Excel'],
    ['tarifario_pdf', 'Tarifario PDF'],
    ['poliza_ejemplo', 'Póliza ejemplo'],
    ['condiciones', 'Condiciones / beneficios'],
    ['circular', 'Circular / actualización'],
    ['ajuste_validado', 'Ajuste validado'],
    ['cotizador_linea_asistido', 'Cotizador en línea asistido'],
    ['formulario', 'Formulario'],
    ['documento_comercial', 'Documento comercial'],
    ['otro', 'Otro documento']
  ];
  const SOURCE_STATES = [
    'inventario_fuentes',
    'fuentes_incompletas',
    'lectura_pendiente',
    'extraccion_en_prueba',
    'requiere_validacion',
    'calibrado',
    'validado_habilitado',
    'reemplazado_por_version',
    'bloqueado'
  ];
  const DIMENSION_KEYS = [
    'pais', 'moneda', 'ramo', 'producto', 'familiaProducto',
    'subtipoProducto', 'segmento', 'tipoRiesgo', 'tipoVehiculo',
    'usoVehiculo', 'plan'
  ];

  function paisOK(p) { return !Orbit.pais || Orbit.pais === 'TODOS' || p === Orbit.pais; }
  function up(id, patch) { S().update('aseguradoras', id, patch); }
  function reload() { if (host) render(host); }
  function safeAll(col) { try { return S().all(col) || []; } catch (e) { return []; } }
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function slug(v) { return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function unique(values) { return Array.from(new Set((values || []).map(clean).filter(Boolean))); }
  function extension(name) {
    const parts = clean(name).toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  }
  function legacyType(d) {
    if (d && d.tipoFuente) return d.tipoFuente;
    const cat = clean(d && (d.cat || d.categoria)).toLowerCase();
    const ext = extension(d && d.nombre);
    if (cat.includes('cotizador') && ['xls', 'xlsx', 'csv'].includes(ext)) return 'cotizador_excel_salida';
    if (cat.includes('cotizador')) return 'cotizador_linea_asistido';
    if (cat.includes('cotiz')) return 'cotizacion_pdf_oficial';
    if (cat.includes('póliza') || cat.includes('poliza')) return 'poliza_ejemplo';
    if (cat.includes('condicion') || cat.includes('beneficio')) return 'condiciones';
    if (cat.includes('circular')) return 'circular';
    if (cat.includes('ajuste')) return 'ajuste_validado';
    if (cat.includes('formulario')) return 'formulario';
    if (cat.includes('comercial')) return 'documento_comercial';
    if (cat.includes('tarifa')) return ['xls', 'xlsx', 'csv'].includes(ext) ? 'tarifario_excel' : 'tarifario_pdf';
    return 'otro';
  }
  function typeLabel(type) {
    const found = SOURCE_TYPES.find(x => x[0] === type);
    return found ? found[1] : type || 'Fuente';
  }
  function legacyCat(type) {
    if (type === 'cotizador_excel_salida') return 'Cotizador Excel';
    if (type === 'cotizacion_pdf_oficial') return 'Cotización ejemplo';
    if (type === 'poliza_ejemplo') return 'Póliza ejemplo';
    if (type === 'condiciones') return 'Condiciones';
    if (type === 'circular') return 'Circular';
    if (type === 'ajuste_validado') return 'Ajuste validado';
    if (type === 'cotizador_linea_asistido') return 'Cotizador en línea';
    if (type === 'formulario') return 'Formularios';
    if (type === 'documento_comercial') return 'Comercial';
    if (type === 'otro') return 'Otro';
    return 'Tarifas';
  }
  function defaultCurrency(country) {
    if (clean(country).toUpperCase() === 'GT') return 'GTQ';
    if (clean(country).toUpperCase() === 'CO') return 'COP';
    return '';
  }
  function sourceDimensions(d, aseguradora) {
    d = d || {};
    const pais = clean(d.pais || (aseguradora && aseguradora.pais)).toUpperCase();
    return {
      pais,
      moneda: clean(d.moneda || defaultCurrency(pais)).toUpperCase(),
      ramo: clean(d.ramo),
      producto: clean(d.producto),
      familiaProducto: clean(d.familiaProducto || d.familia),
      subtipoProducto: clean(d.subtipoProducto || d.subtipo),
      segmento: clean(d.segmento),
      tipoRiesgo: clean(d.tipoRiesgo),
      tipoVehiculo: clean(d.tipoVehiculo),
      usoVehiculo: clean(d.usoVehiculo),
      plan: clean(d.plan)
    };
  }
  function sourceCombinationKey(input, aseguradora) {
    const d = sourceDimensions(input, aseguradora);
    return DIMENSION_KEYS.map(k => slug(d[k]) || '*').join('|');
  }
  function normalizarFuente(d, aseguradora) {
    d = d || {};
    const tipoFuente = legacyType(d);
    const nombre = clean(d.nombre || d.archivo || 'Documento');
    const dims = sourceDimensions(d, aseguradora);
    const outputDefault = tipoFuente === 'cotizador_excel_salida';
    const rateDefault = tipoFuente === 'cotizador_excel_salida' || tipoFuente === 'tarifario_excel' || tipoFuente === 'tarifario_pdf' || tipoFuente === 'ajuste_validado';
    return {
      id: clean(d.id) || 'src_' + (slug(nombre + '_' + tipoFuente + '_' + clean(d.version || 'v1')) || Date.now().toString(36)),
      nombre,
      cat: clean(d.cat || d.categoria) || legacyCat(tipoFuente),
      tipoFuente,
      pais: dims.pais,
      moneda: dims.moneda,
      ramo: dims.ramo,
      producto: dims.producto,
      familiaProducto: dims.familiaProducto,
      subtipoProducto: dims.subtipoProducto,
      segmento: dims.segmento,
      tipoRiesgo: dims.tipoRiesgo,
      tipoVehiculo: dims.tipoVehiculo,
      usoVehiculo: dims.usoVehiculo,
      plan: dims.plan,
      claveCobertura: sourceCombinationKey(d, aseguradora),
      version: clean(d.version || 'v1'),
      archivoRef: clean(d.archivoRef || d.documentRef || d.driveUrl || d.url),
      contieneTarifas: d.contieneTarifas != null ? d.contieneTarifas === true : rateDefault,
      contieneReglasCalculo: d.contieneReglasCalculo != null ? d.contieneReglasCalculo === true : tipoFuente === 'cotizador_excel_salida',
      contieneHojaSalida: d.contieneHojaSalida != null ? d.contieneHojaSalida === true : outputDefault,
      contieneFormatoCotizacion: d.contieneFormatoCotizacion != null ? d.contieneFormatoCotizacion === true : tipoFuente === 'cotizacion_pdf_oficial',
      contieneAreaImpresion: d.contieneAreaImpresion != null ? d.contieneAreaImpresion === true : outputDefault,
      usos: Array.isArray(d.usos) ? d.usos.slice() : [],
      estado: clean(d.estado || 'inventario_fuentes'),
      vigenciaDesde: clean(d.vigenciaDesde),
      vigenciaHasta: clean(d.vigenciaHasta),
      notas: clean(d.notas),
      trazabilidad: Object.assign({}, d.trazabilidad || {})
    };
  }
  function evaluarFuente(input) {
    const d = normalizarFuente(input);
    const api = Orbit.cotizacionEsquemaAseguradoraP0;
    if (api && typeof api.inspectTrainingSource === 'function') {
      return api.inspectTrainingSource(d);
    }
    const hasOutput = d.contieneHojaSalida || d.contieneFormatoCotizacion || d.contieneAreaImpresion;
    const hasRates = d.contieneTarifas;
    const hasRules = d.contieneReglasCalculo;
    const officialQuote = d.tipoFuente === 'cotizacion_pdf_oficial';
    const excelCalculator = d.tipoFuente === 'cotizador_excel_salida';
    const policyExample = d.tipoFuente === 'poliza_ejemplo';
    const conditionSource = d.tipoFuente === 'condiciones' || d.tipoFuente === 'circular';
    const tariffSource = d.tipoFuente === 'tarifario_excel' || d.tipoFuente === 'tarifario_pdf';
    const sirveParaTarifas = hasRates || tariffSource || excelCalculator || d.tipoFuente === 'ajuste_validado';
    const sirveParaReglas = hasRules || excelCalculator || d.tipoFuente === 'ajuste_validado';
    const sirveParaPresentacion = officialQuote || ((excelCalculator || d.tipoFuente === 'cotizador_linea_asistido') && hasOutput);
    const sirveParaComparativo = officialQuote || policyExample || conditionSource || sirveParaPresentacion;
    const sirveParaCondiciones = policyExample || conditionSource || officialQuote;
    const sirveParaCasosPrueba = officialQuote || policyExample || (excelCalculator && hasOutput);
    const usos = unique([].concat(
      d.usos || [],
      sirveParaTarifas ? ['tarifas'] : [],
      sirveParaReglas ? ['reglas_calculo'] : [],
      sirveParaPresentacion ? ['presentacion_cotizacion'] : [],
      sirveParaComparativo ? ['extraccion_comparativo'] : [],
      sirveParaCondiciones ? ['condiciones_beneficios'] : [],
      sirveParaCasosPrueba ? ['casos_prueba'] : []
    ));
    return {
      tipoFuente: d.tipoFuente,
      usos,
      sirveParaTarifas,
      sirveParaReglas,
      sirveParaPresentacion,
      sirveParaComparativo,
      sirveParaCondiciones,
      sirveParaCasosPrueba,
      sirveParaExtraccion: true,
      requiereEjemploCotizacion: (sirveParaTarifas || sirveParaReglas) && !sirveParaPresentacion
    };
  }
  function resumenFuentes(docs, aseguradora) {
    const fuentes = (docs || []).map(d => normalizarFuente(d, aseguradora));
    const evaluaciones = fuentes.map(evaluarFuente);
    const tieneTarifa = evaluaciones.some(e => e.sirveParaTarifas);
    const tieneReglas = evaluaciones.some(e => e.sirveParaReglas);
    const tienePresentacion = evaluaciones.some(e => e.sirveParaPresentacion);
    const requiereEjemplo = (tieneTarifa || tieneReglas) && !tienePresentacion;
    let estado = 'inventario_fuentes';
    if (fuentes.length && requiereEjemplo) estado = 'fuentes_incompletas';
    if (fuentes.length && tienePresentacion && (tieneTarifa || tieneReglas)) estado = 'requiere_validacion';
    if (fuentes.some(f => f.estado === 'validado_habilitado')) estado = 'validado_habilitado';
    return { total: fuentes.length, fuentes, evaluaciones, tieneTarifa, tieneReglas, tienePresentacion, requiereEjemplo, estado };
  }
  function resumenGrupos(docs, aseguradora) {
    const fuentes = (docs || []).map(d => normalizarFuente(d, aseguradora));
    const grouped = {};
    fuentes.forEach(f => {
      grouped[f.claveCobertura] = grouped[f.claveCobertura] || [];
      grouped[f.claveCobertura].push(f);
    });
    const grupos = Object.keys(grouped).map(clave => {
      const list = grouped[clave];
      const evals = list.map(evaluarFuente);
      const counts = {};
      list.forEach(f => { counts[f.tipoFuente] = (counts[f.tipoFuente] || 0) + 1; });
      const tieneTarifa = evals.some(e => e.sirveParaTarifas);
      const tieneReglas = evals.some(e => e.sirveParaReglas);
      const tienePresentacion = evals.some(e => e.sirveParaPresentacion);
      const tieneCasosPrueba = evals.some(e => e.sirveParaCasosPrueba);
      const tieneCondiciones = evals.some(e => e.sirveParaCondiciones);
      let estado = 'conocimiento_parcial';
      if ((tieneTarifa || tieneReglas) && !tienePresentacion) estado = 'requiere_cotizacion_ejemplo';
      if (!(tieneTarifa || tieneReglas) && tienePresentacion) estado = 'presentacion_sin_tarifa';
      if ((tieneTarifa || tieneReglas) && tienePresentacion) estado = 'fuentes_completas_requiere_validacion';
      if (list.some(f => f.estado === 'validado_habilitado')) estado = 'validado_habilitado';
      return {
        clave,
        dimensiones: sourceDimensions(list[0], aseguradora),
        fuentes: list,
        total: list.length,
        cantidadesPorTipo: counts,
        cotizacionesEjemplo: counts.cotizacion_pdf_oficial || 0,
        polizasEjemplo: counts.poliza_ejemplo || 0,
        cotizadoresExcel: counts.cotizador_excel_salida || 0,
        tieneTarifa,
        tieneReglas,
        tienePresentacion,
        tieneCasosPrueba,
        tieneCondiciones,
        requiereEjemplo: (tieneTarifa || tieneReglas) && !tienePresentacion,
        estado
      };
    }).sort((a, b) => groupLabel(a).localeCompare(groupLabel(b)));
    return {
      grupos,
      total: grupos.length,
      completos: grupos.filter(g => g.estado === 'fuentes_completas_requiere_validacion' || g.estado === 'validado_habilitado').length,
      incompletos: grupos.filter(g => g.estado !== 'fuentes_completas_requiere_validacion' && g.estado !== 'validado_habilitado').length,
      requierenEjemplo: grupos.filter(g => g.requiereEjemplo).length
    };
  }
  function groupLabel(group) {
    const d = group && group.dimensiones ? group.dimensiones : sourceDimensions(group || {});
    return [d.pais, d.ramo, d.producto, d.familiaProducto, d.subtipoProducto, d.segmento, d.tipoRiesgo, d.tipoVehiculo, d.usoVehiculo, d.plan].filter(Boolean).join(' · ') || 'Combinación sin clasificar';
  }
  function sourceBadges(summary) {
    const out = [];
    out.push(`<span class="badge ${summary.tieneTarifa ? 'ok' : 'neutral'}">${summary.tieneTarifa ? '✓' : '—'} Tarifas</span>`);
    out.push(`<span class="badge ${summary.tienePresentacion ? 'ok' : 'neutral'}">${summary.tienePresentacion ? '✓' : '—'} Presentación</span>`);
    if (summary.requiereEjemplo) out.push('<span class="badge warn">⚠ Requiere cotización ejemplo</span>');
    return out.join('');
  }
  function groupBadges(group) {
    return [
      `<span class="badge ${group.tieneTarifa ? 'ok' : 'neutral'}">${group.tieneTarifa ? '✓' : '—'} tarifa</span>`,
      `<span class="badge ${group.tieneReglas ? 'ok' : 'neutral'}">${group.tieneReglas ? '✓' : '—'} reglas</span>`,
      `<span class="badge ${group.tienePresentacion ? 'ok' : 'neutral'}">${group.tienePresentacion ? '✓' : '—'} presentación</span>`,
      `<span class="badge ${group.tieneCasosPrueba ? 'ok' : 'neutral'}">${group.tieneCasosPrueba ? '✓' : '—'} casos</span>`,
      group.requiereEjemplo ? '<span class="badge warn">⚠ ejemplo requerido</span>' : ''
    ].join('');
  }
  function groupsHtml(groupsSummary) {
    if (!groupsSummary.grupos.length) return '<div class="muted" style="font-size:12px">Aún no hay combinaciones clasificadas.</div>';
    return `<div style="display:grid;gap:7px">${groupsSummary.grupos.map(g => `<details style="border:1px solid var(--line);border-radius:9px;padding:8px 10px;background:var(--surface)">
      <summary style="cursor:pointer;font-size:12px;font-weight:700">${U.esc(groupLabel(g))} · ${g.total} fuente(s)</summary>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0">${groupBadges(g)}<span class="badge neutral">${U.esc(g.estado)}</span></div>
      <div class="muted" style="font-size:11px">${Object.keys(g.cantidadesPorTipo).map(k => `${U.esc(typeLabel(k))}: ${g.cantidadesPorTipo[k]}`).join(' · ')}</div>
    </details>`).join('')}</div>`;
  }
  function datalistHtml(id, values) {
    return `<datalist id="${id}">${unique(values).map(v => `<option value="${U.esc(v)}"></option>`).join('')}</datalist>`;
  }
  function catalogosFuentes(docs, aseguradora) {
    const fuentes = (docs || []).map(d => normalizarFuente(d, aseguradora));
    const pick = key => unique(fuentes.map(f => f[key]));
    return {
      ramos: unique([].concat((aseguradora && aseguradora.ramos) || [], pick('ramo'))),
      productos: pick('producto'), familias: pick('familiaProducto'), subtipos: pick('subtipoProducto'),
      segmentos: pick('segmento'), riesgos: pick('tipoRiesgo'), vehiculos: pick('tipoVehiculo'),
      usosVehiculo: pick('usoVehiculo'), planes: pick('plan')
    };
  }

  function vinculos(id) {
    const polizas = safeAll('polizas').filter(p => p.aseguradoraId === id);
    const polIds = new Set(polizas.map(p => p.id));
    const cobros = safeAll('cobros').filter(c => c.aseguradoraId === id || polIds.has(c.polizaId));
    const siniestros = safeAll('siniestros').filter(s => s.aseguradoraId === id || polIds.has(s.polizaId));
    const reclamos = safeAll('reclamos').filter(r => r.aseguradoraId === id || polIds.has(r.polizaId));
    const documentos = safeAll('documentos').filter(d => d.aseguradoraId === id || polIds.has(d.polizaId));
    const comisiones = safeAll('comisiones').filter(c => c.aseguradoraId === id || polIds.has(c.polizaId));
    const total = polizas.length + cobros.length + siniestros.length + reclamos.length + documentos.length + comisiones.length;
    return { polizas, cobros, siniestros, reclamos, documentos, comisiones, total };
  }
  function vinculosTxt(v) {
    const parts = [];
    if (v.polizas.length) parts.push(v.polizas.length + ' pólizas');
    if (v.cobros.length) parts.push(v.cobros.length + ' cobros');
    if (v.siniestros.length) parts.push(v.siniestros.length + ' siniestros');
    if (v.reclamos.length) parts.push(v.reclamos.length + ' reclamos');
    if (v.documentos.length) parts.push(v.documentos.length + ' documentos');
    if (v.comisiones.length) parts.push(v.comisiones.length + ' comisiones');
    return parts.join(', ') || 'sin vínculos operativos';
  }
  function adminAct(titulo, detalle, asg) {
    try {
      S().insert('actividades', {
        id: 'act' + Date.now() + Math.floor(Math.random() * 999),
        tipo: 'admin', icon: '🔐', fecha: Orbit.ui.today(), titulo,
        detalle: (asg ? asg.nombre + ' · ' : '') + detalle
      });
    } catch (e) {}
  }
  function portalSnapshot(row) {
    const passInput = row.querySelector('[data-pp]');
    const credentialRef = passInput && passInput.value ? 'backend_required' : (row.dataset.cred || '');
    return {
      nombre: row.querySelector('[data-pn]').value,
      url: row.querySelector('[data-pu]').value,
      usuario: row.querySelector('[data-pus]').value,
      credentialRef
    };
  }

  function render(h) {
    host = h;
    const all = S().all('aseguradoras').filter(a => paisOK(a.pais));
    const conTarifa = all.filter(a => resumenFuentes(a.docs, a).tieneTarifa).length;
    const conPresentacion = all.filter(a => resumenFuentes(a.docs, a).tienePresentacion).length;
    host.innerHTML = `<div class="page">
      ${K.banner({ icon: '🏢', title: 'Orbit Aseguradoras', sub: 'Directorio operativo y base de conocimiento para Cotizador/Comparativo', features: [], actions: `<button class="btn ghost" id="asg-imp" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)">✨ Importar</button><button class="btn primary" id="asg-new" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.28)">+ Aseguradora</button>` })}
      ${K.kpis([
        { label: 'En directorio', val: all.length, color: 'var(--red)', foot: 'GT + CO', onclick: "location.hash='#/aseguradoras'" },
        { label: 'Con tarifas', val: conTarifa, color: 'var(--ok)', foot: 'fuente identificada', footTone: 'up', onclick: "location.hash='#/aseguradoras'" },
        { label: 'Con presentación', val: conPresentacion, color: 'var(--info)', foot: 'cotización o salida', onclick: "location.hash='#/aseguradoras'" }
      ])}
      <div class="cfg-note" style="margin-bottom:14px">Aseguradoras es la fuente maestra para directorio, accesos, cuentas, documentos, tarifas y formatos de cotización. La cobertura se evalúa por <b>país, producto, segmento, tipo de riesgo/vehículo y plan</b>; una combinación completa no completa las demás.</div>
      <div class="asg-grid">${all.map(a => card(a)).join('')}</div>
    </div>`;
    host.querySelector('#asg-new').addEventListener('click', nueva);
    host.querySelector('#asg-imp').addEventListener('click', () => Orbit.importa.open('directorio-aseguradoras', { onDone: reload }));
    host.querySelectorAll('[data-asg]').forEach(el => el.addEventListener('click', e => { if (e.target.closest('.asg-switch')) return; ficha(el.dataset.asg); }));
    host.querySelectorAll('[data-toggle]').forEach(t => t.addEventListener('change', async e => {
      e.stopPropagation();
      const id = t.dataset.toggle;
      const a = S().get('aseguradoras', id);
      const deseado = t.checked;
      if (!a) return;
      if (!deseado) {
        const v = vinculos(id);
        const ok = await U.confirm('Desactivar la vinculación conserva el histórico y evita que aparezca al cotizar/emitir. Vínculos actuales: ' + vinculosTxt(v) + '. ¿Continuar?', { title: 'Desactivar vinculación', ok: 'Desactivar' });
        if (!ok) { t.checked = true; return; }
      }
      up(id, { vinculada: deseado });
      adminAct('Vinculación de aseguradora actualizada', deseado ? 'Vinculación activada' : 'Vinculación desactivada', a);
      render(host);
    }));
  }

  function card(a) {
    const on = a.vinculada !== false;
    const nPol = S().where('polizas', p => p.aseguradoraId === a.id).length;
    const summary = resumenFuentes(a.docs, a);
    const groups = resumenGrupos(a.docs, a);
    const logo = a.logo ? `<span class="asg-dot" style="padding:0;overflow:hidden"><img src="${a.logo}" style="width:100%;height:100%;object-fit:contain"></span>` : `<span class="asg-dot" style="background:${a.color}">${U.esc((a.nombre || '?')[0])}</span>`;
    return `<div class="asg-card ${on ? '' : 'off'}" data-asg="${a.id}">
      <div class="asg-card-h">
        ${logo}
        <div style="flex:1;min-width:0"><b>${U.esc(a.nombre)}</b><div class="muted" style="font-size:11.5px">${a.pais} · ${(a.ramos || []).length} ramos · ${nPol} pólizas · ${summary.total} fuentes · ${groups.total} combinaciones</div></div>
        <label class="asg-switch" title="Vinculación" onclick="event.stopPropagation()"><input type="checkbox" data-toggle="${a.id}" ${on ? 'checked' : ''}><span></span></label>
      </div>
      <div class="asg-card-tags">${sourceBadges(summary)}${groups.requierenEjemplo ? `<span class="badge warn">${groups.requierenEjemplo} grupo(s) incompletos</span>` : ''}${(a.ramos || []).slice(0, 2).map(r => `<span class="badge neutral">${U.esc(r)}</span>`).join('')}</div>
    </div>`;
  }

  function nueva() {
    const pais = (Orbit.pais && Orbit.pais !== 'TODOS') ? Orbit.pais : 'GT';
    const id = 'asg' + Date.now().toString().slice(-6);
    S().insert('aseguradoras', { id, nombre: 'Nueva aseguradora', color: '#1f3a5f', pais, ramos: [], comisionDefault: 12, comisiones: {}, comisionesProd: {}, vinculada: false, contactos: [], cuentas: [], portales: [], docs: [], docsRequeridos: [], facturacion: {} });
    adminAct('Aseguradora creada', 'Nueva aseguradora creada sin vincular', { nombre: 'Nueva aseguradora' });
    ficha(id);
  }

  function ficha(id, startEdit) {
    const a = S().get('aseguradoras', id); if (!a) return;
    const f = a.facturacion || {};
    const cont = a.contactos || [], cuentas = a.cuentas || [];
    const portales = a.portales && a.portales.length ? a.portales : (a.portal ? [{ nombre: 'Portal principal', url: a.portal, usuario: '', credentialRef: '' }] : []);
    const docs = (a.docs || []).map(d => normalizarFuente(d, a));
    const summary = resumenFuentes(docs, a);
    const groups = resumenGrupos(docs, a);
    const catalogs = catalogosFuentes(docs, a);
    const reqs = a.docsRequeridos || [];
    const ramos = a.ramos || [];
    const toneTipo = { 'Comercial / Técnico': 'info', 'Comercial': 'info', 'Técnico': 'info', 'Administrativo': 'neutral', 'Siniestros': 'danger' };
    let back = document.getElementById('asg-ficha'); if (back) back.remove();
    back = document.createElement('div'); back.id = 'asg-ficha'; back.className = 'drawer-back open';
    back.style.display = 'grid'; back.style.placeItems = 'center';
    back.innerHTML = `<div class="card" style="width:min(1060px,97vw);max-height:92vh;overflow:auto;padding:0">
      ${datalistHtml('af-ramos-list', catalogs.ramos)}${datalistHtml('af-productos-list', catalogs.productos)}${datalistHtml('af-familias-list', catalogs.familias)}${datalistHtml('af-subtipos-list', catalogs.subtipos)}${datalistHtml('af-segmentos-list', catalogs.segmentos)}${datalistHtml('af-riesgos-list', catalogs.riesgos)}${datalistHtml('af-vehiculos-list', catalogs.vehiculos)}${datalistHtml('af-usos-list', catalogs.usosVehiculo)}${datalistHtml('af-planes-list', catalogs.planes)}
      <div style="padding:20px 24px;background:linear-gradient(120deg,${a.color},#10141a);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div style="display:flex;gap:13px;align-items:center">
          <label class="asg-logo" title="Cargar logo">${a.logo ? `<img src="${a.logo}">` : '<span>🏢<br><small>logo</small></span>'}<input type="file" id="af-logo" accept="image/*" style="display:none"></label>
          <div><div class="crumb" style="margin-bottom:4px;color:rgba(255,255,255,.8)">Aseguradora · ${a.pais}</div>
            <input id="af-nombre" value="${U.esc(a.nombre)}" style="font-family:var(--f-display);font-weight:800;font-size:20px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:8px;color:#fff;padding:4px 10px">
            <div style="font-size:12px;margin-top:5px;color:rgba(255,255,255,.85)">${a.vinculada !== false ? '✓ Vinculada' : 'Sin vincular'} · ${summary.total} fuentes · ${groups.total} combinaciones</div></div>
        </div>
        <button class="imp-x" id="af-x" style="background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff">✕</button>
      </div>
      <div style="padding:18px 22px;display:grid;gap:16px">
        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">🔗 Accesos / portales <button class="btn ghost sm" id="af-add-portal">+ Portal</button></div>
          <div id="af-portales">${portales.map((p, i) => portalRow(p, i)).join('') || '<div class="muted" style="font-size:12px">Sin portales. Algunas aseguradoras tienen varios — agrégalos arriba.</div>'}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;align-items:flex-end"><label class="ce-l" style="flex:1">📁 Drive / repositorio<input id="af-drive" class="o-sel" value="${U.esc(a.drive || '')}"></label>${a.drive ? `<a class="asg-link" href="${a.drive.match(/^https?:/) ? a.drive : 'https://' + a.drive}" target="_blank" rel="noopener" title="Abrir Drive">↗ Abrir</a>` : ''}</div>
        </div>
        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">👤 Contactos <button class="btn ghost sm" id="af-add-cont">+ Contacto</button></div>
          <div id="af-contactos">${cont.map((c, i) => contRow(c, i, toneTipo)).join('') || '<div class="muted" style="font-size:12px">Sin contactos.</div>'}</div>
        </div>
        <div class="asg-grid2">
          <div class="asg-sec">
            <div class="asg-sec-t">🧾 Datos de facturación</div>
            <label class="ce-l">NIT<input id="af-nit" class="o-sel" value="${U.esc(a.nit || '')}"></label>
            <label class="ce-l" style="margin-top:8px">Razón social<input id="af-rs" class="o-sel" value="${U.esc(f.razonSocial || '')}"></label>
            <label class="ce-l" style="margin-top:8px">Patrón de concepto<input id="af-patron" class="o-sel" value="${U.esc(f.patronConcepto || '')}"></label>
            <label class="ce-l" style="margin-top:8px">Dirección fiscal<input id="af-dir" class="o-sel" value="${U.esc(f.dirFiscal || '')}"></label>
          </div>
          <div class="asg-sec">
            <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">🏦 Cuentas <button class="btn ghost sm" id="af-add-cta">+ Cuenta</button></div>
            <div id="af-cuentas">${cuentas.map((c, i) => ctaRow(c, i)).join('') || '<div class="muted" style="font-size:12px">Sin cuentas.</div>'}</div>
          </div>
        </div>
        <div class="asg-sec">
          <div class="asg-sec-t">🧩 Cobertura de conocimiento por combinación</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:7px 0 10px"><span class="badge neutral">${groups.total} combinaciones</span><span class="badge ok">${groups.completos} completas</span><span class="badge ${groups.incompletos ? 'warn' : 'neutral'}">${groups.incompletos} incompletas</span>${groups.requierenEjemplo ? `<span class="badge warn">${groups.requierenEjemplo} requieren cotización ejemplo</span>` : ''}</div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Cada grupo se evalúa por país, ramo, producto, familia, segmento, tipo de riesgo/vehículo, uso y plan. Autos no completa Motos; Individual no completa Familiar.</div>
          ${groupsHtml(groups)}
        </div>
        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">🧠 Fuentes para Cotizador / Comparativo <button class="btn ghost sm" id="af-add-doc">+ Fuente</button></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:7px 0 10px">${sourceBadges(summary)}<span class="badge neutral">${summary.total} fuente(s)</span><span class="badge neutral">Estado: ${U.esc(summary.estado)}</span></div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Puede haber muchas pólizas, cotizaciones, cotizadores, tarifarios y condiciones por combinación. Un cotizador Excel puede aportar simultáneamente tarifas, reglas, presentación y casos de prueba.</div>
          <div id="af-docs">${docs.map((d, i) => docRow(d, i, a)).join('') || '<div class="muted" style="font-size:12px">Sin fuentes registradas.</div>'}</div>
          <button class="btn ghost sm" style="margin-top:9px" id="af-imp-doc">✨ Importar fuentes (PDF / Excel / imagen)</button>
        </div>
        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">💵 Comisiones por ramo <button class="btn ghost sm" id="af-add-ramo">+ Ramo</button></div>
          <div class="muted" style="font-size:11.5px;margin-bottom:9px">Editable a mano o por <b>importación de la planilla de comisiones</b>.</div>
          <div id="af-ramos" class="ct-grid">${ramos.map((r, i) => ramoRow(a, r, i)).join('') || '<div class="muted" style="font-size:12px">Sin ramos.</div>'}</div>
          <button class="btn ghost sm" style="margin-top:9px" id="af-imp-com">⬇ Importar planilla de comisiones</button>
        </div>
        <div class="asg-sec">
          <div class="asg-sec-t" style="display:flex;justify-content:space-between;align-items:center">📋 Documentos requeridos para emisión (por producto) <button class="btn ghost sm" id="af-add-req">+ Requisito</button></div>
          <div id="af-reqs">${reqs.map((r, i) => reqRow(r, i)).join('') || '<div class="muted" style="font-size:12px">Sin requisitos.</div>'}</div>
        </div>
      </div>
      <div style="padding:14px 22px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;position:sticky;bottom:0;background:var(--card)">
        <button class="btn ghost" id="af-del" style="color:var(--danger)">🗑 Borrar aseguradora</button>
        <div style="display:flex;gap:8px"><button class="btn ghost" data-close>Cerrar</button><button class="btn ghost" id="af-editar">✏ Editar</button><button class="btn primary" id="af-save" style="display:none">Guardar cambios</button></div>
      </div>
    </div>`;
    document.body.appendChild(back);
    const $ = s => back.querySelector(s);
    const close = () => back.remove();
    const cardNode = back.querySelector('.card');
    function setEdit(on) {
      back.querySelectorAll('input, select, textarea').forEach(el => { if (el.type !== 'file') el.disabled = !on; });
      back.querySelectorAll('.btn.sm, .asg-del, #af-add-portal, #af-add-cont, #af-add-cta, #af-add-doc, #af-add-req, #af-add-ramo').forEach(b => b.style.display = on ? '' : 'none');
      $('#af-save').style.display = on ? '' : 'none';
      $('#af-editar').style.display = on ? 'none' : '';
      $('#af-del').style.visibility = on ? '' : 'hidden';
      cardNode.classList.toggle('asg-view', !on);
    }
    $('#af-editar').addEventListener('click', () => setEdit(true));
    setEdit(!!startEdit);
    back.addEventListener('click', e => { if (e.target === back) close(); });
    $('#af-x').addEventListener('click', close); back.querySelector('[data-close]').addEventListener('click', close);
    $('#af-logo').addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { up(id, { logo: rd.result }); adminAct('Logo de aseguradora actualizado', 'Logo actualizado', a); ficha(id); reload(); }; rd.readAsDataURL(file); });

    function sourceFromRow(row) {
      const get = key => { const el = row.querySelector(key); return el ? el.value : ''; };
      const check = key => { const el = row.querySelector(key); return !!(el && el.checked); };
      const type = get('[data-dt]');
      return normalizarFuente({
        id: row.dataset.sourceId,
        nombre: get('[data-dn]'),
        cat: legacyCat(type),
        tipoFuente: type,
        pais: get('[data-dpais]'),
        moneda: get('[data-dmon]'),
        ramo: get('[data-dramo]'),
        producto: get('[data-dprod]'),
        familiaProducto: get('[data-dfam]'),
        subtipoProducto: get('[data-dsub]'),
        segmento: get('[data-dseg]'),
        tipoRiesgo: get('[data-drisk]'),
        tipoVehiculo: get('[data-dveh]'),
        usoVehiculo: get('[data-duse]'),
        plan: get('[data-dplan]'),
        version: get('[data-dver]'),
        archivoRef: get('[data-dref]'),
        contieneTarifas: check('[data-dtar]'),
        contieneReglasCalculo: check('[data-dreg]'),
        contieneHojaSalida: check('[data-dsal]'),
        contieneFormatoCotizacion: check('[data-dfmt]'),
        contieneAreaImpresion: check('[data-dimp]'),
        estado: get('[data-destado]'),
        vigenciaDesde: get('[data-dvd]'),
        vigenciaHasta: get('[data-dvh]'),
        notas: get('[data-dnotas]')
      }, a);
    }
    function snapshot() {
      const g = s => (back.querySelector(s) || {}).value || '';
      const portalesNew = [...back.querySelectorAll('[data-portal]')].map(portalSnapshot);
      const contNew = [...back.querySelectorAll('[data-cont]')].map(row => ({ tipo: row.querySelector('[data-ct]').value, nombre: row.querySelector('[data-cn]').value, email: row.querySelector('[data-ce]').value, tel: row.querySelector('[data-cl]').value }));
      const ctaNew = [...back.querySelectorAll('[data-cta]')].map(row => ({ banco: row.querySelector('[data-cb]').value, tipo: row.querySelector('[data-ctt]').value, numero: row.querySelector('[data-ccn]').value, moneda: row.querySelector('[data-cm]').value }));
      const docNew = [...back.querySelectorAll('[data-doc]')].map(sourceFromRow);
      const reqNew = [...back.querySelectorAll('[data-req]')].map(row => ({ producto: row.querySelector('[data-rp]').value, items: row.querySelector('[data-ri]').value }));
      const comNew = Object.assign({}, S().get('aseguradoras', id).comisiones);
      back.querySelectorAll('[data-ramopct]').forEach(inp => { comNew[inp.dataset.ramopct] = +inp.value || 0; });
      up(id, { nombre: g('#af-nombre') || a.nombre, drive: g('#af-drive'), nit: g('#af-nit'), facturacion: { razonSocial: g('#af-rs'), patronConcepto: g('#af-patron'), dirFiscal: g('#af-dir') }, portales: portalesNew, contactos: contNew, cuentas: ctaNew, docs: docNew, docsRequeridos: reqNew, comisiones: comNew });
    }
    const push = (key, obj) => { snapshot(); const arr = (S().get('aseguradoras', id)[key] || []).slice(); arr.push(obj); up(id, { [key]: arr }); ficha(id, true); };
    $('#af-add-portal').addEventListener('click', () => push('portales', { nombre: 'Portal', url: '', usuario: '', credentialRef: '' }));
    $('#af-add-cont').addEventListener('click', () => push('contactos', { tipo: 'Comercial / Técnico', nombre: '', email: '', tel: '' }));
    $('#af-add-cta').addEventListener('click', () => push('cuentas', { banco: '', tipo: 'Monetaria', numero: '', moneda: a.pais === 'GT' ? 'GTQ' : 'COP' }));
    $('#af-add-doc').addEventListener('click', () => push('docs', normalizarFuente({ nombre: 'Nueva fuente.xlsx', tipoFuente: 'cotizador_excel_salida', pais: a.pais, moneda: defaultCurrency(a.pais), version: 'v1', estado: 'inventario_fuentes' }, a)));
    $('#af-add-req').addEventListener('click', () => push('docsRequeridos', { producto: '', items: '' }));
    $('#af-add-ramo').addEventListener('click', async () => { const r = await Orbit.ui.prompt('Nombre del ramo:', { title: 'Agregar ramo' }); if (!r) return; const rr = (S().get('aseguradoras', id).ramos || []).slice(); if (rr.indexOf(r) < 0) rr.push(r); const com = Object.assign({}, S().get('aseguradoras', id).comisiones); com[r] = a.comisionDefault || 12; up(id, { ramos: rr, comisiones: com }); adminAct('Ramo/comisión de aseguradora actualizado', 'Ramo agregado: ' + r, a); ficha(id, true); });
    back.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const [key, idx] = b.dataset.del.split(':');
      const ok = await U.confirm('Quitar esta fila de ' + key + '. Se conservará la aseguradora y su histórico. ¿Continuar?', { title: 'Quitar fila', ok: 'Quitar' });
      if (!ok) return;
      const arr = (S().get('aseguradoras', id)[key] || []).slice(); arr.splice(+idx, 1); up(id, { [key]: arr }); adminAct('Dato de aseguradora eliminado', 'Fila removida de ' + key, a); ficha(id, true);
    }));
    $('#af-imp-doc').addEventListener('click', () => { close(); Orbit.importa.open('docs-aseguradora', { onDone: reload }); });
    $('#af-imp-com').addEventListener('click', () => { close(); Orbit.importa.open('planillas-comision', { onDone: reload }); });
    $('#af-del').addEventListener('click', async () => borrarAseguradora(id, close));
    $('#af-save').addEventListener('click', async () => {
      const motivo = await Orbit.ui.prompt('Motivo del cambio en esta aseguradora:', { title: 'Guardar cambios administrativos' });
      if (!motivo) return;
      if (!(await U.confirm('Guardar cambios administrativos, inventario multifuentе y cobertura por combinación. ¿Continuar?', { title: 'Guardar aseguradora', ok: 'Guardar' }))) return;
      snapshot();
      adminAct('Ficha aseguradora actualizada', 'Motivo: ' + motivo + ' · fuentes: ' + back.querySelectorAll('[data-doc]').length + ' · combinaciones: ' + resumenGrupos([...back.querySelectorAll('[data-doc]')].map(sourceFromRow), a).total, a);
      close(); reload();
    });
  }

  async function borrarAseguradora(id, close) {
    const a = S().get('aseguradoras', id); if (!a) return;
    const v = vinculos(id);
    if (v.total > 0) {
      const ok = await U.confirm('No se puede borrar esta aseguradora porque tiene vínculos operativos: ' + vinculosTxt(v) + '. La acción segura es desactivar la vinculación y conservar el histórico. ¿Desactivar vinculación?', { title: 'Borrado bloqueado', ok: 'Desactivar vinculación' });
      if (ok) { up(id, { vinculada: false }); adminAct('Borrado de aseguradora bloqueado', 'Se desactivó vinculación por vínculos: ' + vinculosTxt(v), a); close(); reload(); }
      return;
    }
    const motivo = await Orbit.ui.prompt('Motivo para borrar esta aseguradora sin vínculos operativos:', { title: 'Motivo obligatorio' });
    if (!motivo) return;
    const ok = await U.confirm('Esta aseguradora no tiene vínculos operativos detectados. ¿Borrar del directorio?', { title: 'Eliminar aseguradora', ok: 'Eliminar' });
    if (!ok) return;
    adminAct('Aseguradora borrada', 'Motivo: ' + motivo, a);
    S().remove('aseguradoras', id);
    close(); reload();
  }

  function portalRow(p, i) {
    const credentialRef = p.credentialRef || (p.pass ? 'backend_required' : '');
    return `<div class="asg-row" data-portal="${i}" data-cred="${U.esc(credentialRef)}">
      <input class="o-sel" data-pn placeholder="Nombre del portal" value="${U.esc(p.nombre || '')}" style="flex:1.2">
      <input class="o-sel" data-pu placeholder="https://…" value="${U.esc(p.url || '')}" style="flex:1.5">
      <input class="o-sel" data-pus placeholder="Usuario" value="${U.esc(p.usuario || '')}" style="flex:1">
      <input class="o-sel" data-pp type="password" placeholder="Credencial segura" value="" style="flex:1">
      <span class="muted" style="font-size:11px;flex:.9">${credentialRef ? 'Credencial registrada' : 'Sin credencial guardada'}</span>
      ${p.url ? `<a class="asg-link" href="${p.url.match(/^https?:/) ? p.url : 'https://' + p.url}" target="_blank" rel="noopener" title="Abrir portal">↗</a>` : ''}
      <button class="asg-del" data-del="portales:${i}" title="Quitar">✕</button></div>`;
  }
  function contRow(c, i) {
    const tipos = ['Comercial / Técnico', 'Administrativo', 'Siniestros', 'Cobranzas', 'Dirección'];
    return `<div class="asg-row" data-cont="${i}">
      <select class="o-sel" data-ct style="flex:1">${tipos.map(t => `<option ${t === c.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input class="o-sel" data-cn placeholder="Nombre" value="${U.esc(c.nombre || '')}" style="flex:1">
      <input class="o-sel" data-ce placeholder="Correo" value="${U.esc(c.email || '')}" style="flex:1.3">
      <input class="o-sel" data-cl placeholder="Teléfono" value="${U.esc(c.tel || '')}" style="flex:1">
      <button class="asg-del" data-del="contactos:${i}">✕</button></div>`;
  }
  function ctaRow(c, i) {
    return `<div class="asg-row" data-cta="${i}">
      <input class="o-sel" data-cb placeholder="Banco" value="${U.esc(c.banco || '')}" style="flex:1.3">
      <input class="o-sel" data-ctt placeholder="Tipo" value="${U.esc(c.tipo || '')}" style="flex:1">
      <input class="o-sel" data-ccn placeholder="N.º cuenta" value="${U.esc(c.numero || '')}" style="flex:1">
      <input class="o-sel" data-cm placeholder="Moneda" value="${U.esc(c.moneda || '')}" style="width:72px">
      <button class="asg-del" data-del="cuentas:${i}">✕</button></div>`;
  }
  function currencyOptions(value) {
    const vals = unique([value, 'GTQ', 'COP', 'USD']);
    return vals.map(v => `<option value="${U.esc(v)}" ${v === value ? 'selected' : ''}>${U.esc(v)}</option>`).join('') + `<option value="" ${!value ? 'selected' : ''}>Moneda</option>`;
  }
  function docRow(raw, i, aseguradora) {
    const d = normalizarFuente(raw, aseguradora);
    const ev = evaluarFuente(d);
    const stateOptions = SOURCE_STATES.map(s => `<option value="${s}" ${s === d.estado ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('');
    const typeOptions = SOURCE_TYPES.map(t => `<option value="${t[0]}" ${t[0] === d.tipoFuente ? 'selected' : ''}>${t[1]}</option>`).join('');
    const useBadges = (ev.usos || []).slice(0, 6).map(use => `<span class="badge neutral">${U.esc(use.replace(/_/g, ' '))}</span>`).join('');
    return `<div data-doc="${i}" data-source-id="${U.esc(d.id)}" style="border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:9px;background:var(--surface)">
      <div class="asg-row" style="margin:0 0 7px">
        <span style="font-size:15px">📎</span>
        <input class="o-sel" data-dn value="${U.esc(d.nombre)}" placeholder="Nombre del archivo" style="flex:1.5">
        <select class="o-sel" data-dt style="flex:1.25">${typeOptions}</select>
        <input class="o-sel" data-dver value="${U.esc(d.version)}" placeholder="v1" style="width:68px">
        <select class="o-sel" data-destado style="flex:1.1">${stateOptions}</select>
        <button class="asg-del" data-del="docs:${i}">✕</button>
      </div>
      <div class="asg-row" style="margin:0 0 7px">
        <select class="o-sel" data-dpais style="width:76px"><option value="GT" ${d.pais === 'GT' ? 'selected' : ''}>GT</option><option value="CO" ${d.pais === 'CO' ? 'selected' : ''}>CO</option><option value="" ${!d.pais ? 'selected' : ''}>País</option></select>
        <select class="o-sel" data-dmon style="width:84px">${currencyOptions(d.moneda)}</select>
        <input class="o-sel" list="af-ramos-list" data-dramo value="${U.esc(d.ramo)}" placeholder="Ramo" style="flex:1">
        <input class="o-sel" list="af-productos-list" data-dprod value="${U.esc(d.producto)}" placeholder="Producto" style="flex:1">
        <input class="o-sel" list="af-familias-list" data-dfam value="${U.esc(d.familiaProducto)}" placeholder="Familia" style="flex:1">
        <input class="o-sel" list="af-subtipos-list" data-dsub value="${U.esc(d.subtipoProducto)}" placeholder="Subtipo" style="flex:1">
      </div>
      <div class="asg-row" style="margin:0 0 7px">
        <input class="o-sel" list="af-segmentos-list" data-dseg value="${U.esc(d.segmento)}" placeholder="Segmento" style="flex:1">
        <input class="o-sel" list="af-riesgos-list" data-drisk value="${U.esc(d.tipoRiesgo)}" placeholder="Tipo de riesgo" style="flex:1">
        <input class="o-sel" list="af-vehiculos-list" data-dveh value="${U.esc(d.tipoVehiculo)}" placeholder="Tipo vehículo" style="flex:1">
        <input class="o-sel" list="af-usos-list" data-duse value="${U.esc(d.usoVehiculo)}" placeholder="Uso vehículo" style="flex:1">
        <input class="o-sel" list="af-planes-list" data-dplan value="${U.esc(d.plan)}" placeholder="Plan" style="flex:1">
        <input class="o-sel" data-dref value="${U.esc(d.archivoRef)}" placeholder="Drive / documento / referencia" style="flex:1.5">
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:11.5px">
        <label><input type="checkbox" data-dtar ${d.contieneTarifas ? 'checked' : ''}> tarifas</label>
        <label><input type="checkbox" data-dreg ${d.contieneReglasCalculo ? 'checked' : ''}> reglas</label>
        <label><input type="checkbox" data-dsal ${d.contieneHojaSalida ? 'checked' : ''}> hoja salida</label>
        <label><input type="checkbox" data-dfmt ${d.contieneFormatoCotizacion ? 'checked' : ''}> formato cotización</label>
        <label><input type="checkbox" data-dimp ${d.contieneAreaImpresion ? 'checked' : ''}> área impresión</label>
        <span class="badge ${ev.sirveParaTarifas ? 'ok' : 'neutral'}">${ev.sirveParaTarifas ? '✓' : '—'} tarifa</span>
        <span class="badge ${ev.sirveParaPresentacion ? 'ok' : 'neutral'}">${ev.sirveParaPresentacion ? '✓' : '—'} presentación</span>
        ${ev.requiereEjemploCotizacion ? '<span class="badge warn">⚠ ejemplo requerido</span>' : ''}
      </div>
      ${useBadges ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:7px">${useBadges}</div>` : ''}
      <div class="asg-row" style="margin:7px 0 0">
        <input class="o-sel" type="date" data-dvd value="${U.esc(d.vigenciaDesde)}" title="Vigencia desde" style="width:145px">
        <input class="o-sel" type="date" data-dvh value="${U.esc(d.vigenciaHasta)}" title="Vigencia hasta" style="width:145px">
        <input class="o-sel" data-dnotas value="${U.esc(d.notas)}" placeholder="Notas de lectura, formato o calibración" style="flex:1">
      </div>
    </div>`;
  }
  function reqRow(r, i) {
    return `<div class="asg-row" data-req="${i}">
      <input class="o-sel" data-rp placeholder="Producto" value="${U.esc(r.producto || '')}" style="flex:1">
      <input class="o-sel" data-ri placeholder="Requisitos" value="${U.esc(r.items || '')}" style="flex:2.2">
      <button class="asg-del" data-del="docsRequeridos:${i}">✕</button></div>`;
  }
  function ramoRow(a, r) {
    const pct = (a.comisiones && a.comisiones[r] != null) ? a.comisiones[r] : (a.comisionDefault || 12);
    return `<div class="ct-cell"><span>${U.esc(r)}</span><div class="ct-inp"><input type="number" min="0" max="100" step="0.5" data-ramopct="${U.esc(r)}" value="${pct}"><span>%</span></div></div>`;
  }

  return {
    render,
    ficha,
    _fuentes: {
      normalizarFuente,
      evaluarFuente,
      resumenFuentes,
      resumenGrupos,
      sourceDimensions,
      sourceCombinationKey,
      groupLabel,
      legacyType,
      SOURCE_TYPES,
      SOURCE_STATES,
      DIMENSION_KEYS
    }
  };
})();
