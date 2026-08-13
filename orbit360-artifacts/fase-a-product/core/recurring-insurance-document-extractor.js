/* Orbit 360 · Extractor seguro para importaciones recurrentes
   Extrae y normaliza filas; nunca escribe Orbit.store. */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};

  const VERSION = 'orbit360-recurring-insurance-document-extractor-v1';
  const LIBS = {};
  const SCHEMAS = Object.freeze({
    receipt_schedule: ['policyNumber','receiptId','installment','dueDate','amount','country','currency','period','termStart','termEnd','insurerId','clientId'],
    reported_payments: ['policyNumber','receiptId','installment','paymentDate','amount','country','currency','period','termStart','termEnd','sourceReference'],
    insurer_payment_report: ['policyNumber','receiptId','installment','paymentDate','amount','country','currency','period','termStart','termEnd','sourceReference','insurerId'],
    portfolio_statement: ['policyNumber','receiptId','installment','dueDate','amount','status','completeness','country','currency','period','termStart','termEnd','insurerId'],
    commission_statement: ['policyNumber','receiptId','installment','paymentDate','amount','commission','status','country','currency','period','termStart','termEnd','sourceReference','insurerId'],
    bank_statement: ['paymentDate','amount','country','currency','period','sourceReference','policyNumber','receiptId'],
    supporting_document: ['policyNumber','receiptId','paymentDate','amount','country','currency','period','sourceReference']
  });
  const SYNONYMS = Object.freeze({
    policyNumber: ['poliza','póliza','numero poliza','número póliza','no poliza','nro poliza','policy'],
    receiptId: ['recibo','numero recibo','número recibo','requerimiento','factura recibo','receipt'],
    installment: ['cuota','numero cuota','número cuota','serie','installment'],
    paymentDate: ['fecha pago','fecha de pago','fecha recaudo','fecha','payment date'],
    dueDate: ['vence','vencimiento','fecha limite','fecha límite','due date'],
    amount: ['monto','valor','importe','prima total','prima neta','total','amount'],
    commission: ['comision','comisión','comision pagada','comisión pagada','commission'],
    status: ['estado','status','situacion','situación'],
    completeness: ['completitud','rol fuente','tipo reporte','balance completo','completeness'],
    country: ['pais','país','country'],
    currency: ['moneda','divisa','currency'],
    period: ['periodo','período','mes','month'],
    termStart: ['vigencia inicio','inicio vigencia','desde','term start'],
    termEnd: ['vigencia fin','fin vigencia','hasta','term end'],
    sourceReference: ['referencia','factura','requerimiento','descripcion','descripción','detalle'],
    insurerId: ['aseguradora','compania','compañía','insurer'],
    clientId: ['cliente','asegurado','contratante','client']
  });

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function norm(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function loadLib(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (LIBS[url]) return LIBS[url];
    LIBS[url] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve(window[globalName]);
      script.onerror = () => reject(new Error(`No se pudo cargar ${globalName}.`));
      document.head.appendChild(script);
    });
    return LIBS[url];
  }
  function delimiter(line) {
    const choices = [',',';','\t'];
    return choices.sort((a, b) => (line.split(b).length - line.split(a).length))[0];
  }
  function splitLine(line, sep) {
    const out = []; let current = ''; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
        else quoted = !quoted;
      } else if (char === sep && !quoted) { out.push(current.trim()); current = ''; }
      else current += char;
    }
    out.push(current.trim());
    return out;
  }
  function parseDelimited(content) {
    const lines = String(content || '').replace(/\r/g, '').split('\n').filter(line => line.trim());
    if (!lines.length) return { headers: [], rows: [] };
    const sep = delimiter(lines[0]);
    const headers = splitLine(lines[0], sep);
    return { headers, rows: lines.slice(1).map(line => splitLine(line, sep)) };
  }
  function headerMapping(headers, sourceType, manual) {
    const schema = SCHEMAS[sourceType] || [];
    const normalized = headers.map(norm);
    const mapping = {};
    schema.forEach(field => {
      const aliases = [field, ...(SYNONYMS[field] || [])].map(norm);
      let index = normalized.findIndex(header => aliases.includes(header));
      if (index < 0) index = normalized.findIndex(header => aliases.some(alias => header.includes(alias) || alias.includes(header)));
      if (index >= 0) mapping[field] = index;
    });
    Object.entries(manual || {}).forEach(([field, index]) => {
      if (Number(index) >= 0) mapping[field] = Number(index);
      else delete mapping[field];
    });
    return mapping;
  }
  function rowsFromTable(parsed, sourceType, metadata, manual) {
    const mapping = headerMapping(parsed.headers || [], sourceType, manual);
    const rows = (parsed.rows || []).map((cells, index) => {
      const row = {};
      Object.entries(mapping).forEach(([field, column]) => { row[field] = cells[column] == null ? '' : cells[column]; });
      row.sourceSheet = cells._sourceSheet || metadata.sourceSheet || '';
      row.sourceBlock = cells._sourceBlock || metadata.sourceBlock || '';
      row.sourceRow = cells._sourceRow || index + 2;
      return row;
    }).filter(row => Object.entries(row).some(([key, value]) => !key.startsWith('source') && clean(value)));
    return { headers: parsed.headers || [], mapping, rows };
  }
  async function extractWithAI(text, sourceType) {
    const fields = SCHEMAS[sourceType] || [];
    if (!fields.length || !Orbit.ia || !Orbit.ia.disponible || !Orbit.ia.disponible()) return null;
    const prompt = `Extrae todos los registros del documento de seguros. Devuelve solo JSON array. Usa exactamente estas claves: ${fields.join(', ')}. No inventes datos. Si un dato falta usa cadena vacía. Documento:\n${String(text || '').slice(0, 12000)}`;
    const response = await Orbit.ia.complete(prompt);
    const match = String(response || '').match(/\[[\s\S]*\]/);
    if (!match) return null;
    const rows = JSON.parse(match[0]);
    return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object') : null;
  }
  async function textFromPDF(file) {
    const pdfjs = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    if (text.replace(/\s/g, '').length >= 30) return text;
    const tesseract = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js', 'Tesseract');
    let ocr = '';
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 10); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const result = await tesseract.recognize(canvas, 'spa+eng');
      ocr += result.data.text + '\n';
    }
    return ocr;
  }
  async function textFromWord(file) {
    const mammoth = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value || '';
  }
  async function textFromImage(file) {
    const tesseract = await loadLib('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js', 'Tesseract');
    const result = await tesseract.recognize(file, 'spa+eng');
    return result.data.text || '';
  }
  async function parseExcel(file) {
    const XLSX = await loadLib('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const allRows = []; let headers = [];
    workbook.SheetNames.forEach(sheetName => {
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, blankrows: false, defval: '' });
      const filtered = matrix.filter(row => row && row.some(value => clean(value)));
      if (!filtered.length) return;
      if (!headers.length) headers = filtered[0].map(clean);
      filtered.slice(1).forEach((row, index) => {
        row._sourceSheet = sheetName;
        row._sourceBlock = sheetName;
        row._sourceRow = index + 2;
        allRows.push(row);
      });
    });
    return { headers, rows: allRows };
  }
  async function fileHash(file) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function extract(file, sourceType, options) {
    options = options || {};
    if (!(SCHEMAS[sourceType])) throw new Error('Tipo de fuente no soportado.');
    const extension = clean(file && file.name).split('.').pop().toLowerCase();
    const metadata = { sourceFileName: clean(file.name), sourceSheet: '', sourceBlock: '' };
    let tabular = null; let text = '';
    if (['csv','tsv','txt'].includes(extension)) tabular = parseDelimited(await file.text());
    else if (['xlsx','xls'].includes(extension)) tabular = await parseExcel(file);
    else if (extension === 'pdf') text = await textFromPDF(file);
    else if (['doc','docx'].includes(extension)) text = await textFromWord(file);
    else if (/^(png|jpe?g|webp|bmp|tiff?)$/.test(extension)) text = await textFromImage(file);
    else throw new Error('Formato no soportado por el extractor recurrente.');

    let result;
    if (tabular) result = rowsFromTable(tabular, sourceType, metadata, options.manualMapping);
    else {
      const aiRows = await extractWithAI(text, sourceType);
      if (aiRows && aiRows.length) result = { headers: SCHEMAS[sourceType], mapping: Object.fromEntries(SCHEMAS[sourceType].map((field, index) => [field, index])), rows: aiRows };
      else {
        const parsed = parseDelimited(text);
        result = rowsFromTable(parsed, sourceType, metadata, options.manualMapping);
        if (!result.rows.length) result.requiresBackendExtraction = true;
      }
    }
    return Object.assign(result, {
      version: VERSION,
      sourceType,
      sourceFileName: file.name,
      sourceFileHash: await fileHash(file),
      writesStore: false
    });
  }

  Orbit.recurringDocumentExtractor = Object.freeze({ VERSION, SCHEMAS, SYNONYMS, headerMapping, rowsFromTable, extract, fileHash, writesStore: false });
})();
