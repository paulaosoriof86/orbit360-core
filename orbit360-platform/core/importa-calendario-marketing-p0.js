/* ============================================================
   Orbit 360 · P0 calendario marketing → operaciones propuestas
   Fecha: 2026-07-09

   Normaliza el calendario maestro de contenidos y construye
   operaciones para dry-run sanitizado. No escribe datos. No crea
   clientes, pólizas, cobros ni finmovs.
   ============================================================ */
(function () {
  window.Orbit = window.Orbit || {};

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function pick(row, names) {
    const keys = Object.keys(row || {});
    for (const name of names) {
      const n = norm(name);
      const k = keys.find(function (x) { const nx = norm(x); return nx === n || nx.indexOf(n) >= 0 || n.indexOf(nx) >= 0; });
      if (k && row[k] != null && clean(row[k]) !== '') return row[k];
    }
    return '';
  }

  function splitList(v) {
    return String(v == null ? '' : v)
      .split(/[,;\n]+/)
      .map(clean)
      .filter(Boolean)
      .filter(function (x, i, a) { return a.findIndex(function (y) { return norm(y) === norm(x); }) === i; });
  }

  function stableId(prefix, parts) {
    let h = 0;
    const s = parts.map(function (x) { return norm(x); }).join('|');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return prefix + '_' + Math.abs(h).toString(36);
  }

  function dateYMD(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    if (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v))) {
      const n = Number(v);
      if (n > 25000 && n < 90000) {
        const d = new Date(Math.round((n - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
    }
    const s = clean(v);
    const iso = s.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return iso[1] + '-' + String(iso[2]).padStart(2, '0') + '-' + String(iso[3]).padStart(2, '0');
    return s;
  }

  function yes(v) {
    const n = norm(v);
    return n === 'si' || n === 'sí' || n === 'yes' || n === 'true' || n === 'x' || n === 'pautar';
  }

  function numberVal(v) {
    if (v == null || v === '') return 0;
    let s = String(v).replace(/[^0-9,.\-]/g, '');
    s = s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function normalizeRow(row, opts) {
    opts = opts || {};
    const codigo = clean(pick(row, ['Código contenido', 'Codigo contenido', 'ID', 'codigo', 'código']));
    const estado = clean(pick(row, ['Estado general', 'Estado']));
    const fechaProgramada = dateYMD(pick(row, ['Fecha programada', 'Fecha']));
    const fechaReal = dateYMD(pick(row, ['Fecha real / reprogramada', 'Fecha real', 'Reprogramada']));
    const hora = clean(pick(row, ['Hora sugerida', 'Hora']));
    const tema = clean(pick(row, ['Tema / gancho', 'Tema', 'Gancho', 'Contenido', 'Titulo', 'Título']));
    const desarrollo = clean(pick(row, ['Desarrollo central', 'Desarrollo', 'Detalle']));
    const formato = clean(pick(row, ['Formato del recurso', 'Formato', 'Tipo']));
    const herramienta = clean(pick(row, ['Herramienta sugerida', 'Herramienta']));
    const prompt = clean(pick(row, ['Prompt para generar el recurso', 'Prompt']));
    const recursoFinal = clean(pick(row, ['Enlace / ubicación del recurso final', 'Enlace recurso', 'URL recurso', 'Recurso final']));
    const plataformas = splitList(pick(row, ['Plataformas previstas', 'Plataformas', 'Canales']));
    const responsable = clean(pick(row, ['Responsable', 'Owner']));
    const funnel = clean(pick(row, ['Funnel']));
    const campana = clean(pick(row, ['Campaña', 'Campana']));
    const pilar = clean(pick(row, ['Pilar de contenido', 'Pilar']));
    const segmento = clean(pick(row, ['Segmento']));
    const kpi = clean(pick(row, ['KPI principal', 'KPI']));
    const difusion = clean(pick(row, ['Difusión recomendada', 'Difusion recomendada']));
    const pautar = yes(pick(row, ['¿Pautar?', 'Pautar', 'Pauta']));
    const paisPauta = clean(pick(row, ['País pauta', 'Pais pauta', 'País', 'Pais']));
    const campanaMeta = clean(pick(row, ['Campaña Meta sugerida', 'Campana Meta sugerida', 'Campaña Meta']));
    const objetivoPauta = clean(pick(row, ['Objetivo de pauta', 'Objetivo']));
    const audiencia = clean(pick(row, ['Audiencia sugerida', 'Audiencia']));
    const cobertura = clean(pick(row, ['Cobertura geográfica', 'Cobertura geografica', 'Cobertura']));
    const inicioPauta = dateYMD(pick(row, ['Inicio pauta']));
    const finPauta = dateYMD(pick(row, ['Fin pauta']));
    const diasPauta = numberVal(pick(row, ['Días pauta', 'Dias pauta']));
    const presupuesto = numberVal(pick(row, ['Presupuesto sugerido (Q)', 'Presupuesto sugerido', 'Presupuesto']));
    const utmCampaign = clean(pick(row, ['UTM campaign', 'utm_campaign']));
    const utmContent = clean(pick(row, ['UTM content', 'utm_content']));
    const estadoProduccion = clean(pick(row, ['Estado de producción', 'Estado produccion']));
    const aprobacion = clean(pick(row, ['Aprobación humana', 'Aprobacion humana']));
    const estadoProgramacion = clean(pick(row, ['Estado de programación', 'Estado programacion']));
    const estadoPauta = clean(pick(row, ['Estado pauta']));
    const motorCreativo = clean(pick(row, ['Motor creativo base preferido', 'Motor creativo']));
    const requiereBranding = clean(pick(row, ['¿Requiere branding final en Canva?', 'Requiere branding final en Canva']));
    const logoObligatorio = clean(pick(row, ['¿Logo obligatorio?', 'Logo obligatorio']));
    return {
      codigo, estado, fechaProgramada, fechaReal, hora, tema, desarrollo, formato, herramienta, prompt,
      recursoFinal, plataformas, responsable, funnel, campana, pilar, segmento, kpi, difusion,
      pautar, paisPauta, campanaMeta, objetivoPauta, audiencia, cobertura, inicioPauta, finPauta,
      diasPauta, presupuesto, utmCampaign, utmContent, estadoProduccion, aprobacion, estadoProgramacion,
      estadoPauta, motorCreativo, requiereBranding, logoObligatorio,
      copyFacebookGT: clean(pick(row, ['Copy Facebook Guatemala'])),
      copyFacebookCO: clean(pick(row, ['Copy Facebook Colombia'])),
      copyInstagramGT: clean(pick(row, ['Copy Instagram Guatemala'])),
      copyLinkedIn: clean(pick(row, ['Copy LinkedIn binacional'])),
      copyWAGT: clean(pick(row, ['Copy Estado WhatsApp Guatemala'])),
      copyWACO: clean(pick(row, ['Copy Estado WhatsApp Colombia'])),
      ctaGT: clean(pick(row, ['CTA Guatemala'])),
      ctaCO: clean(pick(row, ['CTA Colombia'])),
      hashtagsFacebook: clean(pick(row, ['Hashtags Facebook'])),
      hashtagsInstagram: clean(pick(row, ['Hashtags Instagram'])),
      hashtagsLinkedIn: clean(pick(row, ['Hashtags LinkedIn'])),
      whatsappGT: clean(pick(row, ['WhatsApp Guatemala'])),
      whatsappCO: clean(pick(row, ['WhatsApp Colombia']))
    };
  }

  function buildOperations(input) {
    input = input || {};
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const sourceFileName = input.sourceFileName || '';
    const operations = [];
    const warnings = [];
    const seen = {};

    rows.forEach(function (row, i) {
      const n = normalizeRow(row, input);
      if (!n.codigo && !n.tema && !n.fechaProgramada) {
        warnings.push({ row: i + 1, code: 'fila_calendario_sin_campos_clave' });
        return;
      }
      const contentId = stableId('cont', [n.codigo || i + 1, n.fechaProgramada, n.tema]);
      if (seen[contentId]) {
        warnings.push({ row: i + 1, code: 'duplicado_probable_contenido', contentId });
        return;
      }
      seen[contentId] = true;

      operations.push({
        action: 'insert',
        collection: 'contenidos',
        data: {
          id: contentId,
          codigoContenido: n.codigo,
          fechaProgramada: n.fechaProgramada,
          fechaReal: n.fechaReal,
          horaSugerida: n.hora,
          estadoGeneral: n.estado || 'Pendiente',
          funnel: n.funnel,
          campana: n.campana,
          pilarContenido: n.pilar,
          segmento: n.segmento,
          tema: n.tema,
          desarrolloCentral: n.desarrollo,
          formatoRecurso: n.formato,
          herramientaSugerida: n.herramienta,
          promptRecurso: n.prompt,
          recursoFinal: n.recursoFinal,
          plataformasPrevistas: n.plataformas,
          responsable: n.responsable,
          kpiPrincipal: n.kpi,
          difusionRecomendada: n.difusion,
          copies: {
            facebookGT: n.copyFacebookGT,
            facebookCO: n.copyFacebookCO,
            instagramGT: n.copyInstagramGT,
            linkedinBinacional: n.copyLinkedIn,
            whatsappGT: n.copyWAGT,
            whatsappCO: n.copyWACO
          },
          ctas: { gt: n.ctaGT, co: n.ctaCO },
          hashtags: { facebook: n.hashtagsFacebook, instagram: n.hashtagsInstagram, linkedin: n.hashtagsLinkedIn },
          whatsapp: { gt: n.whatsappGT, co: n.whatsappCO },
          produccion: {
            estadoProduccion: n.estadoProduccion,
            aprobacionHumana: n.aprobacion,
            estadoProgramacion: n.estadoProgramacion,
            motorCreativo: n.motorCreativo,
            requiereBrandingFinalCanva: n.requiereBranding,
            logoObligatorio: n.logoObligatorio
          },
          origen: 'calendario_marketing',
          archivoFuente: sourceFileName,
          validationStatus: 'pendiente_revision',
          requiereValidacion: !n.fechaProgramada || !n.tema
        }
      });

      if (n.pautar) {
        operations.push({
          action: 'insert',
          collection: 'campanasMarketing',
          data: {
            id: stableId('mkt_cmp', [contentId, n.campanaMeta, n.inicioPauta, n.finPauta]),
            contenidoId: contentId,
            codigoContenido: n.codigo,
            paisPauta: n.paisPauta,
            campanaMetaSugerida: n.campanaMeta,
            objetivoPauta: n.objetivoPauta,
            audienciaSugerida: n.audiencia,
            coberturaGeografica: n.cobertura,
            inicioPauta: n.inicioPauta,
            finPauta: n.finPauta,
            diasPauta: n.diasPauta,
            presupuestoSugeridoQ: n.presupuesto,
            monedaPresupuesto: 'GTQ',
            utmCampaign: n.utmCampaign,
            utmContent: n.utmContent,
            estadoPauta: n.estadoPauta || 'Pendiente',
            origen: 'calendario_marketing',
            archivoFuente: sourceFileName,
            validationStatus: 'pendiente_revision',
            requiereValidacion: !n.paisPauta || !n.inicioPauta || !n.finPauta
          }
        });
      }

      if (!n.recursoFinal || norm(n.estadoProduccion).indexOf('pendiente') >= 0 || norm(n.aprobacion).indexOf('pendiente') >= 0) {
        operations.push({
          action: 'insert',
          collection: 'gestiones',
          data: {
            id: stableId('ges_mkt', [contentId, 'produccion']),
            tipo: 'produccion_contenido_pendiente',
            entidad: 'contenido',
            entidadId: contentId,
            detalle: 'Contenido requiere revisión de producción, recurso final o aprobación humana antes de programar/publicar.',
            origen: 'calendario_marketing',
            archivoFuente: sourceFileName,
            validationStatus: 'pendiente_revision',
            requiereValidacion: true
          }
        });
      }
    });

    return {
      sourceType: 'calendario_marketing',
      sourceFileName,
      totalRows: rows.length,
      operations,
      warnings
    };
  }

  function buildSanitizedDryRun(input) {
    const op = buildOperations(input);
    if (!window.Orbit.importaDryRunP0 || !window.Orbit.importaDryRunP0.buildDryRun) {
      return Object.assign({}, op, { status: 'dry_run_builder_no_disponible' });
    }
    const report = window.Orbit.importaDryRunP0.buildDryRun({
      sourceType: 'calendario_marketing',
      sourceFileName: op.sourceFileName,
      sourceHash: input && input.sourceHash || '',
      tenantId: input && input.tenantId || '',
      operations: op.operations
    });
    report.sourceWarnings = op.warnings;
    report.totalSourceRows = op.totalRows;
    return report;
  }

  window.Orbit.importaCalendarioMarketingP0 = {
    normalizeRow,
    buildOperations,
    buildSanitizedDryRun
  };
})();
