/* ============================================================
   Orbit 360 · Aseguradoras OP-2 · cuarentena de hojas v1.219
   Excluye hojas técnicas, privadas o de soporte antes de parsear,
   capturar recursos sensibles o construir operaciones del dry-run.
   Nunca registra valores detectados; solo hoja, motivo y conteos.
   ============================================================ */
window.Orbit = window.Orbit || {};
(function () {
  const D = Orbit.insurerDirectoryImport;
  if (!D || Orbit.__aseguradorasOp2SheetQuarantineV1219) return;
  Orbit.__aseguradorasOp2SheetQuarantineV1219 = true;

  const SUPPORT_NAME_RE = /^(indice|index|diagnostico|diagnóstico|dashboard|resumen|tech|tecnico|técnico|config|configuracion|configuración|t\s*&\s*a|t\s*y\s*a|t\s+a)$/i;
  const PRIVATE_DIRECTORY_RE = /directorio\s+de\s+personal|personal\s+interno|usuarios?\s+internos?|empleados?|equipo\s+interno/i;
  const INFRA_MARKERS = [
    /firebase\s*config/i,
    /database\s*url|databaseurl/i,
    /auth\s*domain|authdomain/i,
    /storage\s*bucket|storagebucket/i,
    /messaging\s*sender|messagingsender/i,
    /measurement\s*id|measurementid/i,
    /project\s*id|projectid/i,
    /service\s*account|private\s*key/i,
    /api\s*key|apikey|clave\s+api/i,
    /webhook|hook\.[a-z0-9.-]+/i,
    /firebase\s+deploy|--only\s+hosting/i,
    /node_modules|localhost|127\.0\.0\.1/i,
    /curl\s+https?:\/\/api\./i,
    /anthropic|openai|claude\s+api/i,
    /[a-z]:\\[^\s]+/i
  ];
  const TOKEN_VALUE_RE = /\b(?:AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,})\b/;

  function clean(v) { return String(v == null ? '' : v).replace(/\u00a0/g, ' ').trim(); }
  function fold(v) {
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function sheetText(rows) {
    const lines = [];
    (rows || []).slice(0, 80).forEach(row => {
      (Array.isArray(row) ? row : []).slice(0, 14).forEach(value => {
        const text = clean(value);
        if (text) lines.push(text.slice(0, 500));
      });
    });
    return lines.join('\n');
  }
  function classifySheet(sheetName, rows) {
    const name = fold(sheetName);
    if (SUPPORT_NAME_RE.test(name)) return { excluded:true, reason:'hoja_soporte_por_nombre', signalCount:0 };
    const text = sheetText(rows);
    if (!text) return { excluded:false, reason:'', signalCount:0 };
    if (PRIVATE_DIRECTORY_RE.test(text)) return { excluded:true, reason:'hoja_personal_interno', signalCount:1 };
    let signalCount = 0;
    INFRA_MARKERS.forEach(re => { if (re.test(text)) signalCount++; });
    if (TOKEN_VALUE_RE.test(text)) signalCount += 2;
    if (signalCount >= 2) return { excluded:true, reason:'hoja_tecnica_sensible', signalCount };
    return { excluded:false, reason:'', signalCount };
  }
  function quarantineMatrices(matrices) {
    const filtered = {}, excluded = [];
    Object.keys(matrices || {}).forEach(sheetName => {
      const rows = (matrices[sheetName] || []).map(row => Array.isArray(row) ? row : []);
      const classification = classifySheet(sheetName, rows);
      if (classification.excluded) {
        excluded.push({ sheet:sheetName, reason:classification.reason, signalCount:classification.signalCount });
        return;
      }
      filtered[sheetName] = rows;
    });
    return { filtered, excluded };
  }
  function augment(result, excluded) {
    if (!result) return result;
    result.excluded = [].concat(result.excluded || [], excluded || []);
    const counts = {};
    (excluded || []).forEach(item => { counts[item.reason] = (counts[item.reason] || 0) + 1; });
    if (result.report) {
      result.report.quarantineSummary = {
        excludedSheets:(excluded || []).length,
        byReason:counts,
        rawValuesExposed:false,
        secureCaptureAttempted:false
      };
      if ((excluded || []).some(item => item.reason === 'hoja_tecnica_sensible')) {
        result.report.securityWarnings = Array.from(new Set([].concat(result.report.securityWarnings || [], 'archivo_contiene_hojas_tecnicas_excluidas')));
      }
    }
    return result;
  }
  async function loadSheetJs() {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve, reject) => {
      const current = document.querySelector('script[data-orbit-sheetjs-v1202]');
      if (current) {
        current.addEventListener('load', () => resolve(window.XLSX), { once:true });
        current.addEventListener('error', reject, { once:true });
        return;
      }
      const script = document.createElement('script');
      script.dataset.orbitSheetjsV1202 = '1';
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('xlsx_no_disponible'));
      script.onerror = () => reject(new Error('xlsx_no_disponible'));
      document.head.appendChild(script);
    });
  }
  async function sha256(buffer) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const digest = await window.crypto.subtle.digest('SHA-256', buffer.slice(0));
        return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    return '';
  }

  const originalParseMatrices = D.parseMatrices.bind(D);
  function parseMatricesWithQuarantine(matrices, options) {
    const q = quarantineMatrices(matrices);
    return augment(originalParseMatrices(q.filtered, options), q.excluded);
  }
  D.parseMatrices = parseMatricesWithQuarantine;

  const originalParseFile = D.parseFile.bind(D);
  D.parseFile = async function (file, options) {
    await loadSheetJs();
    const buffer = await file.arrayBuffer();
    const sourceHash = await sha256(buffer);
    const workbook = XLSX.read(buffer, { type:'array', cellDates:false });
    const matrices = {};
    (workbook.SheetNames || []).forEach(name => {
      matrices[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header:1, blankrows:false, defval:'' });
    });
    return parseMatricesWithQuarantine(matrices, Object.assign({}, options || {}, {
      fileName:file.name,
      sourceHash,
      captureSecure:true
    }));
  };

  D.classifyDirectorySheet = classifySheet;
  D.quarantineDirectoryMatrices = quarantineMatrices;
  D.__op2SheetQuarantineV1219 = { originalParseMatrices, originalParseFile, classifySheet, quarantineMatrices };
})();
