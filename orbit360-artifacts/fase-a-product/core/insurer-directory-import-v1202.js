/* ============================================================
   Orbit 360 · Importador especializado Directorio Aseguradoras v1.202
   -----------------------------------------------------------------
   Lee un libro multihoja, separa identidad/contactos/plataformas/
   cuentas, genera dry-run sanitizado y solo aplica datos no secretos
   tras confirmacion reforzada. Contraseñas/usuarios/cuentas completas
   nunca se guardan en Orbit.store: quedan como referencias backend.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.insurerDirectoryImport = (function () {
  const SOURCE_TYPE = 'directorio_aseguradoras';
  const CONFIRM_PHRASE = 'CONFIRMO DIRECTORIO';
  const SUPPORT_RE = /^(indice|index|diagnostico|diagnóstico|dashboard|resumen|tech|t\s*&\s*a|t\s*y\s*a|t\s+a)$/i;
  const MANAGE_ROLES = new Set(['Dirección','SuperAdmin','AdminTenant','Admin']);
  const SENSITIVE_PARAM_RE = /token|secret|password|pass|state|code|session|magic|auth|credential|key/i;
  const PARTNER_RE = /broker|agencia|agente|intermediario|canal|red|network|synerg/i;
  let uiState = null;
  const secureSession = new Map();

  function S() { return Orbit.store; }
  function U() { return Orbit.ui || {}; }
  function A() { return Orbit.access || {}; }
  function clean(v) { return String(v == null ? '' : v).replace(/\u00a0/g, ' ').trim(); }
  function fold(v) {
    return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function compact(v) { return fold(v).replace(/\s+/g, ''); }
  function now() { return new Date().toISOString(); }
  function today() { return U().today ? U().today() : now().slice(0, 10); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return Object.assign({}, v || {}); } }
  function role() { return A().activeRole ? A().activeRole() : (Orbit.session && Orbit.session.rol ? Orbit.session.rol() : 'Sin rol'); }
  function tenantId() { return A().tenantId ? A().tenantId() : ((window.OrbitBackend && OrbitBackend.status && OrbitBackend.status().tenantId) || ''); }
  function actor() { return A().actorUser ? A().actorUser() : { nombre: 'Usuario', rolActivo: role() }; }
  function canManage() {
    const advisor = A().actorAdvisor ? A().actorAdvisor() : {};
    const restrictions = [].concat(advisor.restricciones || []);
    const extras = [].concat(advisor.permisosExtra || advisor.extras || []);
    if (restrictions.includes('aseguradoras_editar') || restrictions.includes('importar_aseguradoras')) return false;
    return MANAGE_ROLES.has(role()) || extras.includes('aseguradoras_editar') || extras.includes('importar_aseguradoras');
  }
  function currencyFor(country) { return country === 'CO' ? 'COP' : country === 'GT' ? 'GTQ' : ''; }
  function maskRight(value, visible) {
    const s = clean(value).replace(/\s+/g, '');
    if (!s) return '';
    const n = Math.max(2, visible || 4);
    return s.length <= n ? '*'.repeat(Math.max(3, s.length)) : '*'.repeat(Math.min(8, s.length - n)) + s.slice(-n);
  }
  function maskUser(value) {
    const s = clean(value);
    if (!s) return '';
    if (s.includes('@')) {
      const parts = s.split('@');
      const left = parts[0] || '', domain = parts[1] || '';
      return (left.slice(0, 2) || '**') + '***@' + domain.replace(/^(.{2}).*(\.[^.]+)$/,'$1***$2');
    }
    return maskRight(s, 3);
  }
  function cell(row, index) { return row && index >= 0 && index < row.length ? clean(row[index]) : ''; }
  function rowText(row) { return (row || []).map(clean).filter(Boolean).join(' | '); }
  function rowFold(row) { return fold(rowText(row)); }
  function nonBlank(row) { return (row || []).filter(v => clean(v) !== ''); }
  function findRow(rows, predicate, start) {
    for (let i = start || 0; i < rows.length; i++) if (predicate(rows[i], i)) return i;
    return -1;
  }
  function findHeaderIndex(row, aliases) {
    const n = (row || []).map(fold);
    for (let i = 0; i < n.length; i++) if (aliases.some(a => n[i] === a || n[i].includes(a))) return i;
    return -1;
  }
  function normalizeName(value) {
    return fold(value)
      .replace(/\b(aseguradora|seguros|seguro|compania|compañia|company|cooperativa|sociedad|s a s|s a|sa|de colombia|de guatemala)\b/g, ' ')
      .replace(/\b\d+(?:\s+\d+)*\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function acronym(value) { return fold(value).split(/\s+/).filter(Boolean).map(x => x[0]).join(''); }
  function namesCompatible(sheetName, identity) {
    const a = normalizeName(sheetName), b = normalizeName(identity);
    if (!a || !b) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    if (acronym(a) === acronym(b) && acronym(a).length >= 2) return true;
    const sheetCompact = compact(sheetName), identityAcronym = acronym(identity);
    return sheetCompact === identityAcronym && identityAcronym.length >= 2;
  }
  function safeUrl(value) {
    const raw = clean(value);
    if (!raw) return { url: '', urlHint: '', urlRef: '' };
    const candidate = /^https?:\/\//i.test(raw) ? raw : (/^www\./i.test(raw) ? 'https://' + raw : '');
    if (!candidate) return { url: '', urlHint: raw.slice(0, 60), urlRef: 'backend_required' };
    try {
      const u = new URL(candidate);
      const sensitive = Array.from(u.searchParams.keys()).some(k => SENSITIVE_PARAM_RE.test(k)) ||
        SENSITIVE_PARAM_RE.test(u.hash || '') || /[A-Fa-f0-9]{24,}|[A-Za-z0-9_-]{40,}/.test(u.pathname) || /magic|auth0|oauth/i.test(u.pathname + u.hostname);
      if (sensitive) return { url: '', urlHint: u.hostname, urlRef: 'backend_required' };
      u.search = ''; u.hash = '';
      return { url: u.toString(), urlHint: u.hostname, urlRef: '' };
    } catch (e) { return { url: '', urlHint: raw.slice(0, 60), urlRef: 'backend_required' }; }
  }
  function areaFrom(cargo, area, note) {
    const txt = fold([cargo, area, note].join(' '));
    if (/cobro|cartera|recaudo|pago/.test(txt)) return 'Cobros';
    if (/comision|factur/.test(txt)) return 'Financiera';
    if (/siniestro|reclamo|indemn/.test(txt)) return 'Siniestros';
    if (/emision|suscrip|operacion|tecnic|inspeccion|endoso|modificacion/.test(txt)) return 'Operaciones';
    if (/renov/.test(txt)) return 'Renovaciones';
    if (/comercial|cotiza|negocio|venta/.test(txt)) return 'Comercial';
    if (/mercadeo|marketing/.test(txt)) return 'Marketing';
    return clean(area) || 'General';
  }
  function parseCodeNit(text) {
    const s = clean(text);
    const code = (s.match(/c[oó]digo\s*:\s*([^|]+)/i) || [])[1];
    const nit = (s.match(/nit\s*:\s*([^|]+)/i) || [])[1];
    return { codigoIntermediario: clean(code).replace(/\(completar\)/i,''), nit: clean(nit).replace(/\(completar\)/i,'') };
  }
  function afterLabel(text, label) {
    const re = new RegExp(label + '\\s*:\\s*(.+)', 'i');
    const m = clean(text).match(re); return clean(m && m[1]).replace(/\(completar\)/ig, '');
  }
  function inferIdentity(rows, sheetName, country) {
    if (country === 'GT') {
      for (let i = 0; i < Math.min(rows.length, 9); i++) {
        for (const v of rows[i] || []) {
          const s = clean(v), n = fold(s);
          if (!s || /alianzas|broker|codigo|direcci|oficina|emergencia|whatsapp|app|web/.test(n)) continue;
          if (/seguro|aseguradora|mapfre|general|columna|rural|bam|bantrab|ficohsa|privanza|ole|roble|ceiba|universales/.test(n)) return s;
        }
      }
    } else if (rows[0]) {
      const first = clean(rows[0][0]); if (first) return first;
    }
    return clean(sheetName);
  }
  function inferGeneral(rows, country) {
    const out = { codigoIntermediario: '', nit: '', telGeneral: '', emergencia: '', whatsapp: '', app: '', web: '', direccion: '', oficina: '' };
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const r = rows[i] || [], text = rowText(r), n = fold(text);
      if (country === 'GT') {
        if (/codigo/.test(n) && /nit/.test(n)) Object.assign(out, parseCodeNit(text));
        r.forEach(v => {
          const s = clean(v), f = fold(s);
          if (/oficina/.test(f) && !out.telGeneral) out.telGeneral = afterLabel(s, '.*oficina');
          if (/emergencia/.test(f) && !out.emergencia) out.emergencia = afterLabel(s, '.*emergencias?');
          if (/whatsapp/.test(f) && !out.whatsapp) out.whatsapp = afterLabel(s, 'whatsapp');
          if (/^direccion/.test(f) && !out.direccion) out.direccion = afterLabel(s, 'direcci[oó]n');
          if (/^app/.test(f) && !out.app) out.app = afterLabel(s, 'app');
          if (/^web/.test(f) && !out.web) out.web = afterLabel(s, 'web');
        });
      } else if (r.length >= 2) {
        const label = fold(r[0]), value = clean(r[1]);
        if (label === 'nit') out.nit = value;
        else if (label.includes('direccion')) out.direccion = value;
        else if (label === 'oficina') out.oficina = value;
        else if (label.includes('telefono oficina')) out.telGeneral = value;
        else if (label.includes('telefono emergencias')) out.emergencia = value;
        else if (label === 'app') out.app = value;
        else if (label === 'whatsapp') out.whatsapp = value;
      }
    }
    return out;
  }
  function sectionIndexes(rows) {
    const contacts = findRow(rows, r => {
      const n = (r || []).map(fold);
      return n.includes('nombre') && n.some(x => x.includes('cargo')) && n.some(x => x.includes('email') || x.includes('correo'));
    });
    const accesses = [];
    rows.forEach((r, i) => { if (/accesos? al sistema en linea/.test(rowFold(r))) accesses.push(i); });
    const bank = findRow(rows, r => /datos para transferencias/.test(rowFold(r)));
    return { contacts, accesses, bank };
  }
  function parseContacts(rows, sections, source) {
    if (sections.contacts < 0) return [];
    const header = rows[sections.contacts] || [];
    const idx = {
      name: findHeaderIndex(header, ['nombre']), cargo: findHeaderIndex(header, ['cargo']), area: findHeaderIndex(header, ['area']),
      ext: findHeaderIndex(header, ['ext']), email: findHeaderIndex(header, ['email','correo electronico','correo']),
      phone: findHeaderIndex(header, ['celular','telefono','movil']), note: findHeaderIndex(header, ['observaciones','nota'])
    };
    const endCandidates = sections.accesses.filter(x => x > sections.contacts);
    if (sections.bank > sections.contacts) endCandidates.push(sections.bank);
    const end = endCandidates.length ? Math.min(...endCandidates) : rows.length;
    const out = [];
    for (let i = sections.contacts + 1; i < end; i++) {
      const r = rows[i] || [];
      if (!nonBlank(r).length) continue;
      const name = cell(r, idx.name), cargo = cell(r, idx.cargo), area = cell(r, idx.area), ext = cell(r, idx.ext), email = cell(r, idx.email), phone = cell(r, idx.phone), note = cell(r, idx.note);
      if (![name,cargo,email,phone,note].some(Boolean)) continue;
      if (/accesos? al sistema|datos para transferencias/.test(rowFold(r))) break;
      out.push({
        id: 'contact_' + source.sheetKey + '_' + String(i + 1).padStart(3, '0'),
        nombre: name || cargo || 'Contacto institucional', cargo, area: areaFrom(cargo, area, note), ext,
        email, tel: phone, observaciones: note, principal: out.length === 0,
        fuenteTraza: { archivo: source.fileName, hoja: source.sheetName, fila: i + 1, bloque: 'contactos', pais: source.country }
      });
    }
    return out;
  }
  function parsePlatformsGT(rows, sections, source, secure) {
    const out = [];
    const start = sections.accesses[0]; if (start == null) return out;
    let header = -1;
    for (let i = start; i < Math.min(rows.length, start + 5); i++) {
      const n = (rows[i] || []).map(fold);
      if (n.some(x => x.includes('producto')) && n.some(x => x.includes('link')) && n.some(x => x.includes('usuario'))) { header = i; break; }
    }
    if (header < 0) return out;
    const h = rows[header] || [];
    const ip = findHeaderIndex(h, ['producto','sistema']), il = findHeaderIndex(h, ['link','url']), iu = findHeaderIndex(h, ['usuario']), ik = findHeaderIndex(h, ['contrasena','password']);
    const end = sections.bank > header ? sections.bank : rows.length;
    for (let i = header + 1; i < end; i++) {
      const r = rows[i] || [], product = cell(r, ip), link = cell(r, il), user = cell(r, iu), password = cell(r, ik);
      if (![product,link,user,password].some(Boolean)) continue;
      const url = safeUrl(link);
      const ref = (user || password) ? 'backend_required' : '';
      out.push({
        id: 'platform_' + source.sheetKey + '_' + String(out.length + 1).padStart(2, '0'), nombre: product || 'Plataforma',
        url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,
        estadoAcceso: ref ? 'Pendiente conexión segura' : (url.url || url.urlHint ? 'Sin verificar' : 'Sin acceso registrado'),
        tipo: /cotiza/.test(fold(product)) ? 'Cotizador' : /pago|cobro|factur/.test(fold(product)) ? 'Pagos' : 'Plataforma',
        ultimaVerificacion: '', fuenteTraza: { archivo: source.fileName, hoja: source.sheetName, fila: i + 1, bloque: 'plataformas', pais: source.country }
      });
      if ((user || password) && secure) secure.push({ type: 'credential', insurerSheet: source.sheetName, platformIndex: out.length - 1, username: user, password, url: link });
    }
    return out;
  }
  function parsePlatformsCO(rows, sections, source, secure) {
    const out = [];
    const start = sections.accesses[0]; if (start == null) return out;
    const end = sections.bank > start ? sections.bank : rows.length;
    for (let i = start; i < end; i++) {
      const r = rows[i] || [];
      if (fold(r[0]) !== 'producto') continue;
      [1,4].forEach(col => {
        const product = cell(r, col); if (!product) return;
        const link = cell(rows[i + 1], col), user = cell(rows[i + 2], col), password = cell(rows[i + 3], col);
        const url = safeUrl(link); const ref = (user || password) ? 'backend_required' : '';
        out.push({
          id: 'platform_' + source.sheetKey + '_' + String(out.length + 1).padStart(2, '0'), nombre: product,
          url: url.url, urlHint: url.urlHint, urlRef: url.urlRef, usuarioHint: maskUser(user), credentialRef: ref,
          estadoAcceso: ref ? 'Pendiente conexión segura' : (url.url || url.urlHint ? 'Sin verificar' : 'Sin acceso registrado'),
          tipo: /cotiza/.test(fold(product)) ? 'Cotizador' : /pago|cobro|factur/.test(fold(product)) ? 'Pagos' : 'Plataforma',
          ultimaVerificacion: '', fuenteTraza: { archivo: source.fileName, hoja: source.sheetName, fila: i + 1, bloque: 'plataformas', pais: source.country }
        });
        if ((user || password) && secure) secure.push({ type: 'credential', insurerSheet: source.sheetName, platformIndex: out.length - 1, username: user, password, url: link });
      });
    }
    return out;
  }
  function parseBanks(rows, sections, source, secure) {
    const out = [];
    if (sections.bank < 0) return out;
    let header = -1;
    for (let i = sections.bank; i < Math.min(rows.length, sections.bank + 6); i++) {
      const n = (rows[i] || []).map(fold);
      if (n.some(x => x === 'banco') && n.some(x => x.includes('cuenta'))) { header = i; break; }
    }
    if (header < 0) return out;
    const h = rows[header] || [];
    let ib = findHeaderIndex(h, ['banco']), ia = findHeaderIndex(h, ['no de cuenta','cuenta']), it = findHeaderIndex(h, ['tipo de cuenta','tipo cuenta']), ino = findHeaderIndex(h, ['notas','link pago']);
    if (source.country === 'CO') { ib = 0; ia = 1; it = 2; ino = 3; }
    for (let i = header + 1; i < rows.length; i++) {
      const r = rows[i] || [], text = rowFold(r);
      if (/documento interno|escuela|accesos? al sistema/.test(text)) break;
      if (!nonBlank(r).length || /soportes de pago|pendiente critico/.test(text)) continue;
      const bank = cell(r, ib), account = cell(r, ia), type = cell(r, it), note = cell(r, ino);
      if (![bank,account,type,note].some(Boolean)) continue;
      if (/^producto$|forma de pago/.test(text)) break;
      if (/^banco$|cuenta/.test(fold(bank)) && !account) continue;
      const looksUrl = v => /^https?:|^www\./i.test(clean(v));
      const accountDigits = clean(account).replace(/[^0-9]/g, '');
      const accountLike = accountDigits.length >= 5 || /cuenta|ahorro|monetaria|corriente/.test(fold(type));
      const isPaymentLink = looksUrl(bank) || looksUrl(note) || looksUrl(account);
      if (!isPaymentLink && !accountLike) continue;
      const linkRaw = [bank, note, account].find(looksUrl) || '';
      const link = safeUrl(linkRaw);
      const currency = /usd|dolar/.test(fold(type + ' ' + bank)) ? 'USD' : currencyFor(source.country);
      const accountValue = looksUrl(account) ? '' : account;
      out.push({
        id: 'account_' + source.sheetKey + '_' + String(out.length + 1).padStart(2, '0'),
        banco: isPaymentLink ? 'Pago en línea' : bank, tipo: type || (isPaymentLink ? 'Enlace de pago' : ''), moneda: currency,
        numero: '', numeroHint: maskRight(accountValue, 4), accountRef: accountValue ? 'backend_required' : '',
        url: link.url, urlHint: link.urlHint, urlRef: link.urlRef, uso: note, estado: accountValue ? 'Pendiente conexión segura' : 'Sin verificar',
        fuenteTraza: { archivo: source.fileName, hoja: source.sheetName, fila: i + 1, bloque: 'bancos', pais: source.country }
      });
      if (accountValue && secure) secure.push({ type: 'bank_account', insurerSheet: source.sheetName, accountIndex: out.length - 1, accountNumber: accountValue, bank, accountType: type, currency });
    }
    return out;
  }
  function sourceNote(rows) {
    const notes = [];
    rows.forEach(r => {
      const text = rowText(r);
      if (/pendiente critico|requiere gestion|confirmar|antiguedad|soportes de pago/i.test(text)) notes.push(text);
    });
    return notes.slice(0, 5);
  }
  function detectEntityType(identity, rows) {
    const top = rows.slice(0, 4).map(rowText).join(' | ');
    if (PARTNER_RE.test(fold(identity)) || (top.match(/\b(axa|hdi|sbs|chubb|equidad|mapfre|zurich)\b/gi) || []).length >= 3) return 'partner_network';
    return 'insurer';
  }
  function parseSheet(sheetName, rows, options, secure) {
    const country = options.country, fileName = options.fileName || '';
    const sheetKey = compact(sheetName).slice(0, 24) || 'sheet';
    const source = { country, fileName, sheetName, sheetKey };
    const identity = inferIdentity(rows, sheetName, country);
    const general = inferGeneral(rows, country);
    const sections = sectionIndexes(rows);
    const contacts = parseContacts(rows, sections, source);
    const platforms = country === 'GT' ? parsePlatformsGT(rows, sections, source, secure) : parsePlatformsCO(rows, sections, source, secure);
    const accounts = parseBanks(rows, sections, source, secure);
    const entityType = detectEntityType(identity, rows);
    const alerts = [];
    if (!identity) alerts.push('nombre_requiere_validacion');
    if (!namesCompatible(sheetName, identity)) alerts.push('nombre_hoja_no_coincide_identidad');
    if (entityType !== 'insurer') alerts.push('entidad_no_es_aseguradora_directa');
    if (!contacts.length) alerts.push('sin_contactos');
    if (!platforms.length) alerts.push('sin_plataformas');
    if (!accounts.length) alerts.push('sin_bancos_o_pagos');
    if (platforms.some(p => p.credentialRef)) alerts.push('credenciales_detectadas_requieren_backend');
    if (accounts.some(a => a.accountRef)) alerts.push('cuentas_detectadas_requieren_backend');
    const observations = sourceNote(rows);
    return {
      sourceSheet: sheetName, identityName: identity, canonicalName: normalizeName(identity), entityType, country,
      record: {
        nombre: identity, pais: country, monedaBase: currencyFor(country), nit: general.nit,
        codigoIntermediario: general.codigoIntermediario, telGeneral: general.telGeneral,
        emergencia: general.emergencia, whatsapp: general.whatsapp, app: general.app, web: general.web,
        facturacion: { dirFiscal: general.direccion, oficina: general.oficina },
        contactos: contacts, portales: platforms, cuentas: accounts, ramos: [], docs: [], actividad: [],
        observaciones: observations.join(' | '), vinculada: false,
        fuenteDirectorio: { archivo: fileName, hoja: sheetName, pais: country, importadoAt: now(), tipo: SOURCE_TYPE },
        ultimaRevision: '', requiereValidacion: alerts.some(a => /nombre_hoja|entidad_no/.test(a)),
        validacionAlertas: alerts, sensitiveImportStatus: {
          credentialsDetected: platforms.filter(p => p.credentialRef).length,
          accountsDetected: accounts.filter(a => a.accountRef).length,
          status: (platforms.some(p => p.credentialRef) || accounts.some(a => a.accountRef)) ? 'backend_required' : 'sin_sensibles'
        }
      }, alerts
    };
  }
  function findExisting(candidate) {
    const country = candidate.country, key = candidate.canonicalName;
    return (S().all('aseguradoras') || []).find(a => {
      if (!a || (a.pais && country && a.pais !== country)) return false;
      const ak = normalizeName(a.nombre || '');
      return ak && key && (ak === key || ak.includes(key) || key.includes(ak));
    }) || null;
  }
  function mergeUnique(existing, incoming, keyFn) {
    const out = (existing || []).map(clone), map = new Map();
    out.forEach((x, i) => map.set(keyFn(x), i));
    (incoming || []).forEach(x => {
      const key = keyFn(x);
      if (!key) return;
      if (map.has(key)) out[map.get(key)] = Object.assign({}, out[map.get(key)], clone(x));
      else { map.set(key, out.length); out.push(clone(x)); }
    });
    return out;
  }
  function buildOperations(candidates) {
    const duplicateMap = {};
    candidates.forEach(c => { const key = c.country + '|' + c.canonicalName; (duplicateMap[key] = duplicateMap[key] || []).push(c); });
    return candidates.map(c => {
      const duplicate = (duplicateMap[c.country + '|' + c.canonicalName] || []).length > 1;
      const existing = findExisting(c);
      const data = clone(c.record);
      if (duplicate) { data.requiereValidacion = true; data.validacionAlertas.push('duplicado_dentro_del_archivo'); }
      if (existing) {
        data.id = existing.id;
        data.vinculada = existing.vinculada !== false;
        data.color = existing.color || data.color || '#1f3a5f';
        data.ramos = existing.ramos || [];
        data.docs = existing.docs || [];
        data.actividad = [].concat(existing.actividad || [], [{ fecha: today(), cambio: 'Directorio importado/propuesto', responsable: actor().nombre || role() }]);
        data.contactos = mergeUnique(existing.contactos, data.contactos, x => fold([x.email,x.tel,x.nombre,x.cargo].join('|')));
        data.portales = mergeUnique(existing.portales, data.portales, x => fold([x.nombre,x.urlHint,x.tipo].join('|')));
        data.cuentas = mergeUnique(existing.cuentas, data.cuentas, x => fold([x.banco,x.tipo,x.moneda,x.numeroHint].join('|')));
        data.facturacion = Object.assign({}, existing.facturacion || {}, data.facturacion || {});
      }
      const blocked = data.requiereValidacion || c.entityType !== 'insurer' || duplicate;
      data.validationStatus = blocked ? 'requiere_validacion' : 'validado';
      return { action: existing ? 'update' : 'insert', collection: 'aseguradoras', id: existing && existing.id || '', data, sourceSheet: c.sourceSheet };
    });
  }
  function buildDryRun(candidates, options) {
    const operations = buildOperations(candidates, options);
    const validationOperations = operations.map(op => {
      const copy = clone(op);
      (copy.data && copy.data.portales || []).forEach(p => { if (p.credentialRef === 'backend_required') { p.secureAccessRef = p.credentialRef; delete p.credentialRef; } });
      (copy.data && copy.data.cuentas || []).forEach(c => { if (c.accountRef === 'backend_required') { c.secureAccountRef = c.accountRef; delete c.accountRef; } });
      if (copy.data) delete copy.data.sensitiveImportStatus;
      return copy;
    });
    const input = { sourceType: SOURCE_TYPE, tenantId: tenantId(), sourceFileName: options.fileName || '', sourceHash: options.sourceHash || '', operations: validationOperations };
    const report = Orbit.importaDryRunP0 && Orbit.importaDryRunP0.buildDryRun ? Orbit.importaDryRunP0.buildDryRun(input) : {
      reportId: 'dry_' + Date.now().toString(36), sourceType: SOURCE_TYPE, tenantId: input.tenantId,
      sourceFileName: input.sourceFileName, sourceHash: input.sourceHash, status: 'dry_run_pendiente_revision',
      hasBlockingErrors: operations.some(o => o.data.requiereValidacion),
      totals: { operations: operations.length, insert: operations.filter(o => o.action === 'insert').length, update: operations.filter(o => o.action === 'update').length, blocked: operations.filter(o => o.data.requiereValidacion).length, warnings: 0 },
      operations: operations.map((o, index) => ({ index, action: o.action, collection: o.collection, id: o.id, blocked: !!o.data.requiereValidacion, errors: o.data.validacionAlertas || [], warnings: [], data: { nombre: maskRight(o.data.nombre, 3), pais: o.data.pais } })), blockers: [], warnings: []
    };
    report._operations = operations;
    report.sheetSummary = candidates.map(c => {
      const op = operations.find(x => x.sourceSheet === c.sourceSheet);
      return { sheet: c.sourceSheet, country: c.country, entityType: c.entityType, contacts: c.record.contactos.length, platforms: c.record.portales.length, accounts: c.record.cuentas.length, alerts: [].concat(op && op.data && op.data.validacionAlertas || c.record.validacionAlertas || []) };
    });
    report.sensitiveSummary = {
      credentials: candidates.reduce((s,c) => s + c.record.sensitiveImportStatus.credentialsDetected, 0),
      accounts: candidates.reduce((s,c) => s + c.record.sensitiveImportStatus.accountsDetected, 0),
      persistedInStore: false
    };
    return report;
  }
  function parseMatrices(matrices, options) {
    options = options || {};
    const country = clean(options.country).toUpperCase();
    if (!['GT','CO'].includes(country)) throw new Error('pais_directorio_requerido');
    const secure = options.captureSecure ? [] : null;
    const excluded = [], candidates = [];
    Object.keys(matrices || {}).forEach(sheetName => {
      if (SUPPORT_RE.test(fold(sheetName).replace(/\s+/g,' '))) { excluded.push({ sheet: sheetName, reason: 'hoja_soporte' }); return; }
      const rows = (matrices[sheetName] || []).map(r => Array.isArray(r) ? r : []);
      if (!rows.some(r => nonBlank(r).length)) { excluded.push({ sheet: sheetName, reason: 'sin_datos' }); return; }
      candidates.push(parseSheet(sheetName, rows, { country, fileName: options.fileName || '' }, secure));
    });
    const report = buildDryRun(candidates, Object.assign({}, options, { country }));
    if (secure && secure.length) secureSession.set(report.reportId, secure);
    return { country, candidates, excluded, report, securePayloadCount: secure ? secure.length : 0 };
  }
  function workbookToMatrices(workbook) {
    const out = {};
    (workbook.SheetNames || []).forEach(name => { out[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false, defval: '' }); });
    return out;
  }
  function loadSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const current = document.querySelector('script[data-orbit-sheetjs-v1202]');
      if (current) { current.addEventListener('load', () => resolve(window.XLSX), { once: true }); current.addEventListener('error', reject, { once: true }); return; }
      const script = document.createElement('script'); script.dataset.orbitSheetjsV1202 = '1';
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
  async function parseFile(file, options) {
    await loadSheetJs();
    const buffer = await file.arrayBuffer();
    const sourceHash = await sha256(buffer);
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    return parseMatrices(workbookToMatrices(workbook), Object.assign({}, options || {}, { fileName: file.name, sourceHash, captureSecure: true }));
  }
  function safeOperationData(data) {
    const out = clone(data);
    (out.portales || []).forEach(p => { delete p.usuario; delete p.user; delete p.password; delete p.contrasena; });
    (out.cuentas || []).forEach(c => { delete c.numero; delete c.accountNumber; });
    return out;
  }
  async function applyApproved(result, confirmation) {
    if (!canManage()) return { ok: false, errors: ['permiso_importacion_denegado'] };
    if (!result || !result.report) return { ok: false, errors: ['dry_run_requerido'] };
    if (!confirmation || confirmation.approved !== true || confirmation.phrase !== CONFIRM_PHRASE || !clean(confirmation.reason)) return { ok: false, errors: ['confirmacion_reforzada_requerida'] };
    const operations = result.report._operations || [];
    const valid = operations.filter(op => !(op.data && (op.data.requiereValidacion || op.data.validationStatus !== 'validado')));
    const blocked = operations.filter(op => !valid.includes(op));
    if (blocked.length && confirmation.applyValidOnly !== true) return { ok: false, errors: ['dry_run_con_bloqueos_aplicar_solo_validos'] };
    if (!valid.length) return { ok: false, errors: ['sin_operaciones_validadas'] };
    let inserted = 0, updated = 0;
    const appliedSheets = new Set();
    valid.forEach(op => {
      const data = safeOperationData(op.data);
      delete data.validationStatus;
      appliedSheets.add(op.sourceSheet);
      if (op.action === 'update' && op.id) { S().update('aseguradoras', op.id, data); updated++; }
      else {
        data.id = data.id || ('asg_' + Date.now().toString(36) + '_' + String(inserted + 1).padStart(2,'0'));
        data.importado = true; S().insert('aseguradoras', data); inserted++;
      }
    });
    blocked.forEach(op => {
      try {
        const alerts = [].concat(op.data && op.data.validacionAlertas || []);
        S().insert('gestiones', {
          id: 'ges_dir_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,5),
          tenantId: tenantId(), lista: 'Gestiones Admin', tipo: 'Validación directorio aseguradoras',
          titulo: 'Validar directorio · ' + clean(op.data && op.data.nombre || op.sourceSheet),
          estado: 'Pendiente', prioridad: alerts.some(a => /nombre_hoja|duplicado|entidad_no/.test(a)) ? 'Alta' : 'Media',
          nota: 'Fuente: ' + clean(result.report.sourceFileName) + ' · hoja ' + clean(op.sourceSheet) + ' · ' + alerts.join(', '),
          origen: SOURCE_TYPE, creado: today(), proximaAccion: 'Corregir identidad/mapeo y repetir dry-run', archivado: false
        });
      } catch (e) {}
    });
    const secureProvider = Orbit.secureImport && Orbit.secureImport.importInsurerDirectory;
    const secureItems = (secureSession.get(result.report.reportId) || []).filter(x => appliedSheets.has(x.insurerSheet));
    let secureStatus = 'backend_required';
    if (typeof secureProvider === 'function' && secureItems.length) {
      try {
        const remote = await secureProvider({ tenantId: tenantId(), sourceFileName: result.report.sourceFileName, sourceHash: result.report.sourceHash, items: secureItems });
        if (!remote || remote.ok !== true) throw new Error('confirmacion_remota_incompleta');
        secureStatus = 'confirmado_backend_seguro';
      } catch (e) { secureStatus = 'backend_error'; }
    } else if (!secureItems.length) secureStatus = 'sin_sensibles';
    try {
      S().insert('actividades', { id: 'act_' + Date.now().toString(36), tenantId: tenantId(), tipo: 'importacion', icon: '🏢', fecha: today(), titulo: 'Directorio de aseguradoras importado', detalle: inserted + ' creadas · ' + updated + ' actualizadas · ' + blocked.length + ' pendientes · sensibles: ' + secureStatus, fuente: SOURCE_TYPE });
    } catch (e) {}
    secureSession.delete(result.report.reportId);
    if (A().audit) A().audit('aplicar_directorio_aseguradoras', 'aseguradoras', result.report.reportId, null, { inserted, updated, blocked: blocked.length, secureStatus }, confirmation.reason, { sourceHash: result.report.sourceHash, sourceFileName: result.report.sourceFileName, confirmationPhrase: CONFIRM_PHRASE });
    return { ok: true, inserted, updated, blocked: blocked.length, secureStatus };
  }
  function secureOnlyEligibleItems(sourceItems, operations) {
  const blockedSheets = new Set([].concat(operations || []).filter(op => {
    const alerts = [].concat(op && op.data && op.data.validacionAlertas || []);
    return alerts.some(alert => /entidad_no_es_aseguradora_directa|duplicado_dentro_del_archivo/.test(clean(alert)));
  }).map(op => op && op.sourceSheet).filter(Boolean));
  return [].concat(sourceItems || []).filter(item => item && ['credential','bank_account'].includes(item.type) && !blockedSheets.has(item.insurerSheet));
}
function secureProviderReady() {
  return !!(Orbit.secureImport && typeof Orbit.secureImport.importInsurerDirectory === 'function');
}
async function waitForSecureProvider(timeoutMs) {
  if (secureProviderReady()) return Orbit.secureImport.importInsurerDirectory;
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { window.removeEventListener('orbit:insurer-credential-provider-ready', onReady); } catch (e) {}
      resolve(secureProviderReady() ? Orbit.secureImport.importInsurerDirectory : null);
    };
    const onReady = () => finish();
    try { window.addEventListener('orbit:insurer-credential-provider-ready', onReady, { once: true }); } catch (e) {}
    setTimeout(finish, Math.max(1000, Number(timeoutMs) || 8000));
  });
}
async function applySecureOnly(result, confirmation) {
  if (!canManage()) return { ok: false, errors: ['permiso_importacion_denegado'] };
  if (!result || !result.report) return { ok: false, errors: ['dry_run_requerido'] };
  if (!confirmation || confirmation.approved !== true || confirmation.phrase !== CONFIRM_PHRASE || !clean(confirmation.reason)) return { ok: false, errors: ['confirmacion_reforzada_requerida'] };
  const operations = result.report._operations || [];
  const sourceItems = secureSession.get(result.report.reportId) || [];
  const secureItems = secureOnlyEligibleItems(sourceItems, operations);
  if (!secureItems.length) return { ok: false, errors: ['sin_accesos_elegibles_para_guardar'] };
  const secureProvider = await waitForSecureProvider(8000);
  if (typeof secureProvider !== 'function') return { ok: false, errors: ['proveedor_seguro_no_disponible'] };
  try {
    const remote = await secureProvider({ tenantId: tenantId(), sourceFileName: result.report.sourceFileName, sourceHash: result.report.sourceHash, items: secureItems });
    const imported = Number(remote && remote.imported || 0);
    const mappings = [].concat(remote && remote.mappings || []);
    if (!remote || remote.ok !== true || imported <= 0 || !mappings.length) throw new Error('confirmacion_remota_sin_accesos');
    secureSession.delete(result.report.reportId);
    if (A().audit) A().audit('aplicar_accesos_aseguradoras_secure_only', 'aseguradoras', result.report.reportId, null, { imported, requested: secureItems.length, skipped: Math.max(0, secureItems.length - imported), containsSecrets: false }, confirmation.reason, { sourceHash: result.report.sourceHash, sourceFileName: result.report.sourceFileName, confirmationPhrase: CONFIRM_PHRASE });
    return { ok: true, imported, requested: secureItems.length, skipped: Math.max(0, secureItems.length - imported), mappings, secureStatus: 'confirmado_backend_seguro', containsSecrets: false };
  } catch (error) {
    return { ok: false, errors: ['confirmacion_remota_incompleta'], errorCode: clean(error && (error.code || error.message), 120) };
  }
}
applySecureOnly.__secureOnlyV20260720 = true;
applySecureOnly.__secureOnlyProviderGateV20260720 = true;
  function esc(v) { return U().esc ? U().esc(String(v == null ? '' : v)) : clean(v); }
  function toast(v) { try { U().toast(v); } catch (e) {} }
  function close() { const b = document.getElementById('ins-dir-import-v1202'); if (b) b.remove(); if (uiState && uiState.result && uiState.result.report) secureSession.delete(uiState.result.report.reportId); uiState = null; }
  function reportHtml(result) {
    const r = result.report, t = r.totals || {};
    const rows = (r.sheetSummary || []).map(s => `<tr><td>${esc(s.sheet)}</td><td>${esc(s.country)}</td><td>${s.entityType === 'insurer' ? 'Aseguradora' : '<span class="badge warn">Validar entidad</span>'}</td><td class="num">${s.contacts}</td><td class="num">${s.platforms}</td><td class="num">${s.accounts}</td><td>${s.alerts.length ? `<span class="badge ${s.alerts.some(a => /nombre_hoja|entidad_no|duplicado/.test(a)) ? 'danger' : 'warn'}">${s.alerts.length} aviso(s)</span>` : '<span class="badge ok">Lista</span>'}</td></tr>`).join('');
    return `<div class="cfg-note" style="margin-bottom:12px"><b>Fuente separada:</b> Directorio de aseguradoras. Puede crear/actualizar únicamente Aseguradoras y sus recursos operativos. No crea clientes, pólizas, cobros, cartera, finanzas, usuarios ni permisos.</div>
      <div class="asg197-info-grid"><div><small>Operaciones</small><b>${t.operations || 0}</b></div><div><small>Crear</small><b>${t.insert || 0}</b></div><div><small>Actualizar</small><b>${t.update || 0}</b></div><div><small>Bloqueadas</small><b style="color:${t.blocked ? 'var(--danger)' : 'var(--ok)'}">${t.blocked || 0}</b></div><div><small>Credenciales detectadas</small><b>${r.sensitiveSummary.credentials}</b></div><div><small>Cuentas detectadas</small><b>${r.sensitiveSummary.accounts}</b></div></div>
      <div class="cfg-note" style="margin:12px 0">Usuarios, contraseñas y números completos <b>no se muestran ni se escriben en Orbit.store</b>. Se envían al proveedor protegido al confirmar; la ficha conserva únicamente referencias opacas y datos enmascarados.</div>
      <div style="overflow:auto"><table class="tbl"><thead><tr><th>Hoja</th><th>País</th><th>Entidad</th><th class="num">Contactos</th><th class="num">Plataformas</th><th class="num">Bancos/pagos</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${(result.excluded || []).length ? `<div class="muted" style="font-size:12px;margin-top:10px">Hojas excluidas: ${result.excluded.map(x => esc(x.sheet)).join(' · ')}</div>` : ''}`;
  }
  function paint() {
    const back = document.getElementById('ins-dir-import-v1202'); if (!back || !uiState) return;
    const result = uiState.result;
    back.innerHTML = `<div class="card" style="width:min(980px,97vw);max-height:94vh;display:flex;flex-direction:column;padding:0"><div style="padding:17px 20px;background:linear-gradient(120deg,var(--graph),#10141a);display:flex;justify-content:space-between;gap:12px"><div><small style="color:rgba(255,255,255,.65)">Importación inteligente · fuente separada</small><b style="display:block;color:#fff;font-family:var(--f-display);font-size:18px">Directorio de aseguradoras</b></div><button class="imp-x" data-close style="color:#fff">✕</button></div><div style="padding:18px 20px;overflow:auto;flex:1">
      ${!result ? `<div class="cfg-note" style="margin-bottom:13px">Selecciona el país que corresponde al archivo. No se infiere silenciosamente porque GT y CO tienen monedas, catálogos y estructuras distintas.</div><div class="cgrid"><label class="ce-l">País del directorio *<select id="idir-country" class="o-sel"><option value="">— Seleccionar —</option><option value="GT">Guatemala · GTQ</option><option value="CO">Colombia · COP</option></select></label><label class="ce-l">Archivo Excel *<input id="idir-file" type="file" accept=".xlsx,.xls" class="o-sel"></label></div><div id="idir-status" class="muted" style="margin-top:13px">El archivo se procesa en el navegador. No se sube al repositorio.</div>` : reportHtml(result)}
      </div><div style="padding:13px 20px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${result ? '<button class="btn ghost" data-reset>Elegir otro archivo</button>' : ''}${result && (result.report.totals.operations - result.report.totals.blocked) > 0 ? `<button class="btn primary" data-approve>Importar ${result.report.totals.operations - result.report.totals.blocked} registro(s) validados</button>` : ''}${result && result.securePayloadCount > 0 ? '<button class="btn primary" data-secure-only>Guardar únicamente recursos protegidos</button>' : ''}<button class="btn ghost" data-close>Cerrar</button></div></div>`;
    back.querySelectorAll('[data-close]').forEach(x => x.onclick = close);
    const reset = back.querySelector('[data-reset]'); if (reset) reset.onclick = () => { if (uiState.result && uiState.result.report) secureSession.delete(uiState.result.report.reportId); uiState.result = null; paint(); };
    const file = back.querySelector('#idir-file');
    if (file) file.onchange = async () => {
      const country = back.querySelector('#idir-country').value;
      const status = back.querySelector('#idir-status');
      if (!country) { file.value = ''; return toast('Selecciona el país del directorio.'); }
      if (!file.files || !file.files[0]) return;
      status.textContent = 'Leyendo y clasificando hojas…';
      try { uiState.result = await parseFile(file.files[0], { country }); paint(); }
      catch (e) { status.textContent = 'No se pudo procesar el Excel: ' + clean(e && e.message || e); }
    };
    const secureOnly = back.querySelector('[data-secure-only]');
    if (secureOnly) secureOnly.onclick = async () => {
      const reason = clean(await U().prompt('Motivo de la carga segura de recursos:', { title: 'Confirmar accesos seguros' }));
      if (!reason) return;
      const phrase = clean(await U().prompt('Escribe exactamente: ' + CONFIRM_PHRASE, { title: 'Confirmación reforzada' }));
      secureOnly.disabled = true;
      secureOnly.textContent = 'Guardando recursos de forma segura…';
      const applied = await applySecureOnly(result, { approved: true, phrase, reason });
      if (!applied.ok) {
        secureOnly.disabled = false;
        secureOnly.textContent = 'Guardar únicamente recursos protegidos';
        return toast('No se aplicó: ' + (applied.errors || []).join(', '));
      }
      const done = uiState && uiState.options && uiState.options.onDone;
      close();
      toast(applied.imported + ' recurso(s) guardados de forma segura' + (applied.skipped ? ' · ' + applied.skipped + ' pendiente(s) de validación' : '') + '. No se modificó el directorio.');
      if (done) done(applied);
      else if (Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.render) Orbit.modules.aseguradoras.render(document.getElementById('host'));
    };
    const approve = back.querySelector('[data-approve]');
    if (approve) approve.onclick = async () => {
      const reason = clean(await U().prompt('Motivo de la importación:', { title: 'Confirmar directorio' }));
      if (!reason) return;
      const phrase = clean(await U().prompt('Escribe exactamente: ' + CONFIRM_PHRASE, { title: 'Confirmación reforzada' }));
      const applied = await applyApproved(result, { approved: true, phrase, reason, applyValidOnly: true });
      if (!applied.ok) return toast('No se aplicó: ' + (applied.errors || []).join(', '));
      const done = uiState && uiState.options && uiState.options.onDone;
      close(); toast(applied.inserted + ' aseguradora(s) creada(s) · ' + applied.updated + ' actualizada(s) · ' + applied.blocked + ' pendiente(s). Recursos sensibles: ' + applied.secureStatus);
      if (done) done(applied);
      else if (Orbit.modules && Orbit.modules.aseguradoras && Orbit.modules.aseguradoras.render) Orbit.modules.aseguradoras.render(document.getElementById('host'));
    };
  }
  function open(options) {
    options = options || {};
    if (!canManage()) return toast('Tu rol activo no puede importar directorios de aseguradoras.');
    close();
    const back = document.createElement('div'); back.id = 'ins-dir-import-v1202'; back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:250'; document.body.appendChild(back);
    uiState = { options, result: null }; paint();
  }

  return {
    SOURCE_TYPE, CONFIRM_PHRASE, canManage, normalizeName, namesCompatible, safeUrl,
    parseMatrices, parseFile, buildOperations, buildDryRun, applyApproved, secureOnlyEligibleItems, secureProviderReady, applySecureOnly, open, close
  };
})();
