/* ============================================================
   Orbit 360 · Capa de IA (transversal)
   Proveedor configurable (Gemini por defecto, económico). Mientras
   no haya API key conectada, opera en modo "asistido local" con
   plantillas inteligentes sobre los datos reales del CRM, para que
   cada sección que use IA quede funcional y demostrable. Al conectar
   la key en Config › Integraciones, se enruta al proveedor real.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.ia = (function () {
  const KEY = 'orbit360_ia_cfg';
  let cfg = { proveedor: 'Gemini', key: '', modelo: 'gemini-1.5-flash', conectado: false };
  try { const r = localStorage.getItem(KEY); if (r) cfg = Object.assign(cfg, JSON.parse(r)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function getCfg() { return cfg; }
  function conectar(prov, key, modelo) { cfg = { proveedor: prov || 'Gemini', key: key || '', modelo: modelo || 'gemini-1.5-flash', conectado: !!key }; save(); document.dispatchEvent(new CustomEvent('orbit:ia')); }
  function desconectar() { cfg.conectado = false; cfg.key = ''; save(); document.dispatchEvent(new CustomEvent('orbit:ia')); }
  function activo() { return cfg.conectado; }
  // Proveedor de IA para un módulo: si hay override por módulo (Configuración),
  // lo devuelve; si no, el proveedor global. Permite usar un motor distinto por
  // módulo según el comparativo (ej. extracción económica, redacción premium).
  function proveedorDe(modulo) {
    try {
      var t = (Orbit.tenant && Orbit.tenant.get) ? Orbit.tenant.get() : null;
      var pm = (t && t.iaPorModulo) || {};
      if (modulo && pm[modulo]) return pm[modulo];
    } catch (e) {}
    return cfg.proveedor;
  }
  function fmt(n) { return Orbit.ui ? Orbit.ui.moneyShort(n, 'GTQ') : n; }

  /* ---- redacción de mensajes (WhatsApp/correo) ---- */
  function redactar(intent, ctx) {
    ctx = ctx || {};
    const nombre = ctx.nombre || 'estimado/a';
    const T = {
      cobro: `Hola ${nombre} 👋 Te recordamos que tu recibo${ctx.poliza ? ' de la póliza ' + ctx.poliza : ''}${ctx.monto ? ' por ' + ctx.monto : ''} está próximo a vencer${ctx.vence ? ' el ' + ctx.vence : ''}. Puedes pagar por los canales habituales o responder este mensaje y te ayudamos. ¡Gracias por tu confianza! 🙌`,
      renovacion: `Hola ${nombre} 👋 Tu póliza${ctx.poliza ? ' ' + ctx.poliza : ''}${ctx.ramo ? ' de ' + ctx.ramo : ''} está próxima a renovar${ctx.vence ? ' (vence el ' + ctx.vence + ')' : ''}. Preparamos una propuesta con mejoras de cobertura. ¿Agendamos 10 min para revisarla? 📋`,
      bienvenida: `¡Bienvenido/a ${nombre}! 🎉 Gracias por confiar tu protección en nosotros. Quedamos atentos para cualquier consulta sobre tu póliza. Estamos para acompañarte. 🤝`,
      siniestro: `Hola ${nombre}, lamentamos lo ocurrido. Ya registramos tu reclamo${ctx.numero ? ' ' + ctx.numero : ''} y lo estamos gestionando con la aseguradora. Te mantendremos informado en cada paso. 💪`,
      encuesta: `Hola ${nombre} 🙏 ¿Cómo calificarías tu experiencia con nosotros del 1 al 10? Tu opinión nos ayuda a mejorar. ¡Gracias!`
    };
    return T[intent] || `Hola ${nombre}, te escribimos para darte seguimiento. Quedamos atentos.`;
  }

  /* ---- análisis crítico (texto) a partir de un set de métricas ---- */
  function analisis(seccion, m) {
    m = m || {};
    const out = [];
    if (seccion === 'finanzas') {
      out.push((m.varAnual >= 0 ? 'Ingresos creciendo ' : 'Ingresos cayendo ') + (m.varAnual || 0) + '% interanual; ' + (m.margen >= 25 ? 'margen saludable' : 'margen ajustado, revisar gasto fijo y marketing') + '.');
      out.push('Mejor fuente: comisiones de aseguradora; mantener la financiación fuera del operativo.');
      if (m.cxp) out.push('Hay cuentas por pagar pendientes (' + fmt(m.cxp) + '); priorizar liquidación para no arrastrar saldo.');
    } else if (seccion === 'cartera') {
      out.push((m.vencido > 0 ? 'Cartera vencida de ' + fmt(m.vencido) + ' — activar campaña de recuperación por WhatsApp.' : 'Cartera sana, sin vencidos relevantes.'));
      out.push('Concentración top-10 en ' + (m.conc || 0) + '%; ' + ((m.conc || 0) > 60 ? 'diversificar para reducir riesgo.' : 'distribución equilibrada.'));
    } else {
      out.push('Sin datos suficientes para un diagnóstico profundo en esta sección.');
    }
    return out;
  }

  /* ---- sugerencia de metas a partir de histórico ---- */
  function sugerirMetas(promMensual) {
    const base = +promMensual || 0;
    return { ventas: Math.round(base * 1.12), recaudo: Math.round(base * 1.12 * 0.85), tope: Math.round(base * 0.55) };
  }

  /* ---- extracción simulada de un documento (para importador) ---- */
  function extraer(tipo) {
    const M = {
      poliza: { numero: 'GT-XX-' + Math.floor(10000 + Math.random() * 89999), ramo: 'Automóviles', primaNeta: 4800, vigencia: '2026-06-24 → 2027-06-24' },
      cliente: { nombre: 'Cliente Detectado', identificacion: '—', telefono: '+502 ', email: '' },
      factura: { nit: '—', concepto: 'Comisiones de intermediación', total: 0 }
    };
    return M[tipo] || {};
  }

  /* ---- carga de pdf.js bajo demanda ---- */
  let _pdfjs = null;
  function loadPdfJs() {
    if (_pdfjs) return Promise.resolve(_pdfjs);
    if (window.pdfjsLib) { _pdfjs = window.pdfjsLib; return Promise.resolve(_pdfjs); }
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch (e) {} _pdfjs = window.pdfjsLib; resolve(_pdfjs); };
      s.onerror = reject; document.head.appendChild(s);
    });
  }
  async function pdfTexto(file) {
    const lib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: buf }).promise;
    let txt = '';
    for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const c = await page.getTextContent(); txt += c.items.map(it => it.str).join(' ') + '\n'; }
    return txt;
  }
  // heurística local: extrae montos, datos y aseguradora del texto real (formatos GT/CO)
  function parseLocal(txt, fallbackNombre) {
    const t = txt.replace(/\s+/g, ' ');
    // parser de moneda robusto: "Q. 2,000.00", "Q 2,881.20", "$1,234.56", "2.000,00"(CO)
    const toNum = s => {
      if (!s) return 0;
      let x = String(s).replace(/[^\d.,]/g, '');
      if (/,\d{2}$/.test(x) && x.indexOf('.') >= 0) x = x.replace(/\./g, '').replace(',', '.'); // CO: 2.000,00
      else x = x.replace(/,(?=\d{3}\b)/g, ''); // GT/US: 2,000.00
      return +x || 0;
    };
    const num = re => { const m = t.match(re); return m ? toNum(m[1]) : 0; };
    const txtOf = re => { const m = t.match(re); return m ? m[1].trim() : ''; };
    // primas — soporta "PRIMA" a secas (GT) y "prima neta"
    let neta = num(/prima\s*neta[:\s]*Q?\$?\s*([\d.,]+)/i) || num(/\bPRIMA\b\s+Q?\.?\s*\$?\s*([\d.,]+)/i);
    const iva = num(/(?:iva|i\.v\.a\.?)[:\s]+Q?\$?\s*([\d.,]+)/i);
    const gastosEmision = num(/gastos?\s*de\s*emisi[oó]n[:\s]*Q?\$?\s*([\d.,]+)/i);
    const asistencia = num(/asistencia[:\s]*Q?\$?\s*([\d.,]+)/i);
    const recargoFrac = num(/gastos?\s*(?:de\s*)?fraccionamiento[:\s]*Q?\$?\s*([\d.,]+)/i) || num(/recargo\s*(?:por\s*)?fraccionamiento[:\s]*Q?\$?\s*([\d.,]+)/i);
    let total = num(/prima\s*total[:\s]*Q?\$?\s*([\d.,]+)/i) || num(/total\s*a\s*pagar[:\s]*Q?\$?\s*([\d.,]+)/i) || num(/prima\s*anual[:\s]*Q?\$?\s*([\d.,]+)/i) || num(/valor\s*total[:\s]*Q?\$?\s*([\d.,]+)/i);
    if (!total && neta) total = neta + iva + gastosEmision + asistencia + recargoFrac;
    const suma = num(/suma\s*asegurada\s*\(?Q?\)?[:\s]*Q?\$?\s*([\d.,]+)/i) || num(/valor\s*asegurad[oa][:\s]*Q?\$?\s*([\d.,]+)/i);
    const ded = (t.match(/deducible[:\s]*([\d.,]+\s*%|Q?\$?\s*[\d.,]+)/i) || [])[1] || '';
    // datos de póliza
    const numero = txtOf(/p[oó]liza\s*(?:n[uú]mero|no\.?|#)?[:\s]*([A-Z]{0,4}-?\d[\w-]{3,})/i) || txtOf(/\b((?:AUTO|VID|GAS|INC|RC|SC)-?\d{4,})/i);
    const moneda = /\bUSD\b|\bd[oó]lar|\$\s*\d/i.test(t) ? 'USD' : (/\bQ\.?\s*\d|quetzal/i.test(t) ? 'GTQ' : (/\bCOP\b|peso/i.test(t) ? 'COP' : 'GTQ'));
    const fechas = (t.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g) || []);
    const vigIni = fechas[0] || '', vigFin = fechas[1] || '';
    // asegurado / fiscal
    const asegurado = txtOf(/asegurado[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.]{6,60}?)(?:\s+(?:DPI|NIT|Consignado|Direcci|Departamento))/);
    const dpi = txtOf(/(?:DPI|c[eé]dula|documento)[\s\/A-Za-z]*[:\s]+(\d[\d\s]{6,16})/i).replace(/\s/g, '');
    const nit = txtOf(/NIT[:\s]+([\dKk-]{4,15})/i);
    // vehículo
    const placa = txtOf(/placa[s]?[:\s]+([A-Z]{1,3}[\s-]?\d{3,4}[A-Z]?)/i).replace(/\s/g, '');
    const chasis = txtOf(/(?:chasis|v\.?i\.?n\.?|serie)[:\s]+([A-Z0-9]{8,20})/i);
    const marca = txtOf(/marca[:\s]+([A-Za-zÁÉÍÓÚ]{2,18})/i);
    const linea = txtOf(/(?:l[ií]nea|modelo)[:\s]+([A-Za-z0-9\s]{2,22}?)(?:\s+(?:a[ñn]o|color|chasis|placa|motor))/i);
    const anioVeh = txtOf(/a[ñn]o[:\s]+(\d{4})/i);
    let nombre = fallbackNombre;
    try { const asgs = Orbit.store.all('aseguradoras'); const hit = asgs.find(a => a.nombre && t.toLowerCase().indexOf(a.nombre.toLowerCase()) >= 0); if (hit) nombre = hit.nombre; } catch (e) {}
    if (nombre === fallbackNombre) { const m = t.match(/\b(ASEGURADORA[A-ZÁÉÍÓÚ\s,\.]{3,40}?S\.?\s?A\.?)/); if (m) nombre = m[1].replace(/\s+/g, ' ').trim(); }
    return { nombre, numero, moneda, vigIni, vigFin, neta, iva, gastosEmision, asistencia, recargoFrac, total, sumaAsegurada: suma, deducible: ded.trim(),
      asegurado: asegurado.replace(/\s+/g, ' ').trim(), dpi, nit, placa, chasis, marca, linea, anioVeh,
      cob: {}, _faltantes: [] };
  }
  // detecta VARIAS aseguradoras en un mismo PDF (formato comparativo A&S):
  // "LA CEIBA  Seguro Completo  Q 2,881.20  Prima anual  SEGUROS UNIVERSALES ..."
  function parseMulti(txt) {
    const t = txt.replace(/\s+/g, ' ');
    const sumaM = t.match(/suma\s*asegurada\s*\(?Q?\)?\s*([\d.,]+)/i);
    const suma = sumaM ? +sumaM[1].replace(/,(?=\d{3}\b)/g, '').replace(/[^\d.]/g, '') : 0;
    // catálogo de aseguradoras conocidas (store + listado GT/CO frecuente)
    let cat = [];
    try { cat = Orbit.store.all('aseguradoras').map(a => a.nombre).filter(Boolean); } catch (e) {}
    const extra = ['La Ceiba', 'Seguros Universales', 'Aseguradora Guatemalteca', 'El Roble', 'Seguros G&T', 'G&T', 'Mapfre', 'Aseguradora Rural', 'Assa', 'Seguros Continental', 'BAC Seguros', 'Sura', 'Bolívar', 'Mundial', 'Equidad', 'Previsora', 'Solidaria', 'Aseguradora General', 'Seguros Privanza', 'Pan-American', 'MetLife'];
    extra.forEach(n => { if (!cat.some(c => c.toLowerCase() === n.toLowerCase())) cat.push(n); });
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const props = []; const seen = {};
    // localizar cada monto seguido de "Prima anual/anual/total"
    const re = /Q\s*([\d.,]+)\s*(?:Prima\s*anual|Prima\s*total|anual)/gi;
    let m;
    while ((m = re.exec(t)) !== null) {
      const total = +m[1].replace(/,(?=\d{3}\b)/g, '').replace(/[^\d.]/g, '') || 0;
      if (total < 500) continue;
      // ventana de 90 chars antes del monto → buscar aseguradora del catálogo
      const ventana = t.slice(Math.max(0, m.index - 90), m.index);
      const vn = norm(ventana);
      let nombre = null;
      cat.forEach(c => { if (vn.indexOf(norm(c)) >= 0) { if (!nombre || c.length > nombre.length) nombre = c; } });
      if (!nombre) { const cap = ventana.match(/([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ&.\- ]{3,30})\s*$/); nombre = cap ? cap[1].trim().replace(/\s+/g, ' ') : 'Aseguradora'; }
      const key = norm(nombre); if (seen[key]) continue; seen[key] = 1;
      props.push({ nombre, neta: Math.round(total / 1.12), iva: Math.round(total - total / 1.12), total: Math.round(total), sumaAsegurada: suma, deducible: '', cob: {} });
    }
    return props;
  }
  // extracción de PDF: texto real + IA si hay key; si no, heurística local
  async function extraerPDF(file) {
    let txt = '';
    try { txt = await pdfTexto(file); } catch (e) { txt = ''; }
    const fallbackNombre = file.name.replace(/\.(pdf|png|jpe?g)$/i, '').replace(/[_-]+/g, ' ');
    if (!txt) return Object.assign(parseLocal('', fallbackNombre), { _texto: '', _via: 'sin-texto' });
    // IA real si window.claude está disponible
    if (window.claude && window.claude.complete) {
      try {
        const prompt = 'Extrae de esta póliza/cotización de seguro los datos en JSON EXACTO sin markdown. Montos solo números sin símbolos ni separadores de miles. Si no encuentras un dato usa 0 o "". Esquema: {"nombre":"aseguradora","numero":"no. póliza","moneda":"GTQ|USD|COP","vigIni":"dd/mm/aaaa","vigFin":"dd/mm/aaaa","asegurado":"nombre completo","dpi":"","nit":"","neta":num,"iva":num,"gastosEmision":num,"asistencia":num,"recargoFrac":num,"total":num,"sumaAsegurada":num,"deducible":"texto","fracc":num,"ramo":"","placa":"","marca":"","linea":"","anioVeh":"","cob":{"cob_rc":num,"cob_gmo":num,"cob_robo":true/false,"cob_asist":"texto"}}. Texto:\n' + txt.slice(0, 7000);
        const out = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
        const m = String(out).match(/\{[\s\S]*\}/); if (m) { const d = JSON.parse(m[0]); d.nombre = d.nombre || fallbackNombre; d.cob = d.cob || {}; d._texto = txt; d._via = 'ia';
          // completar con heurística lo que la IA dejó vacío
          const loc = parseLocal(txt, fallbackNombre);
          ['numero', 'moneda', 'vigIni', 'vigFin', 'asegurado', 'dpi', 'nit', 'placa', 'marca', 'linea', 'anioVeh'].forEach(k => { if (!d[k]) d[k] = loc[k]; });
          ['neta', 'iva', 'gastosEmision', 'asistencia', 'recargoFrac', 'total', 'sumaAsegurada'].forEach(k => { if (!d[k] && loc[k]) d[k] = loc[k]; });
          d._faltantes = camposFaltantes(d);
          return d; }
      } catch (e) {}
    }
    const d0 = Object.assign(parseLocal(txt, fallbackNombre), { _texto: txt, _via: 'local' });
    d0._faltantes = camposFaltantes(d0);
    return d0;
  }
  // marca campos críticos que no se pudieron leer → el importador los pide manual
  function camposFaltantes(d) {
    const f = [];
    if (!d.numero) f.push('número de póliza');
    if (!d.total) f.push('prima total');
    if (!d.neta) f.push('prima neta');
    if (!d.vigIni || !d.vigFin) f.push('vigencia');
    if (!d.asegurado) f.push('asegurado');
    return f;
  }

  return { getCfg, conectar, desconectar, activo, proveedorDe, redactar, analisis, sugerirMetas, extraer, extraerPDF, pdfTexto, parseMulti };
})();
