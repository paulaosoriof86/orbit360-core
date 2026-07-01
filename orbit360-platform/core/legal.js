/* ============================================================
   Orbit 360 · Cláusulas legales BLINDANTES (por país, persistentes)
   ------------------------------------------------------------
   Tipos de cláusula (clave → a quién aplica):
     - confidencialidad   (usuarios internos / colaboradores)
     - tratamiento_datos  (Habeas Data CO Ley 1581/2012 · GT protección de datos)
     - socios             (NDA reforzado: confidencialidad + no-copia + no-ingeniería
                            inversa + no-competencia tecnológica + penalidad)
     - licencia_cliente   (contrato de licencia para el cliente que CONTRATA Orbit 360)
     - cliente_portal     (mutua empresa↔asegurado, al primer ingreso al portal)
     - descargo_ia        (resultados de IA usados con criterio profesional)

   Cada cláusula tiene texto legal estructurado en bloques + metadatos
   (vigencia, penalidad, ley aplicable, jurisdicción). Parametrizado por país.
   Cada aceptación se registra con fecha, usuario, país, IP (simulada) y versión.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.legal = (function () {
  const AKEY = 'orbit360_legal_aceptaciones';
  const VERSION = '2.0';

  function pais() { try { return (Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get().paisDefault) || Orbit.pais || 'GT'; } catch (e) { return 'GT'; } }
  function empresa() { try { return (Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get().nombre) || 'el Intermediario'; } catch (e) { return 'el Intermediario'; } }
  function titular() { return 'el titular de Orbit 360'; }

  function normaDatos(p) {
    if (p === 'CO') return 'la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Régimen General de Protección de Datos Personales — Habeas Data) de la República de Colombia';
    if (p === 'GT') return 'las normas de protección de datos personales y de confidencialidad bancaria y de seguros vigentes en la República de Guatemala';
    return 'la normativa de protección de datos personales aplicable en el país de operación';
  }
  function leyPais(p) {
    if (p === 'CO') return { ley: 'las leyes de la República de Colombia', foro: 'los jueces y tribunales de la ciudad de domicilio del Intermediario en Colombia' };
    if (p === 'GT') return { ley: 'las leyes de la República de Guatemala', foro: 'los tribunales competentes de la ciudad de Guatemala' };
    return { ley: 'las leyes del país de operación del Intermediario', foro: 'los tribunales competentes del domicilio del Intermediario' };
  }
  function autoridad(p) {
    if (p === 'CO') return 'la Superintendencia de Industria y Comercio (SIC)';
    if (p === 'GT') return 'la autoridad de protección de datos competente';
    return 'la autoridad de protección de datos competente';
  }

  /* catálogo de cláusulas — texto legal estructurado por país.
     Cada cláusula: { ic, titulo, intro, bloques:[{h, p?, items?}], meta:{...} } */
  function catalogo() {
    const p = pais(), norma = normaDatos(p), L = leyPais(p), emp = empresa();
    return {
      /* ---------------- 1. CONFIDENCIALIDAD (interno) ---------------- */
      confidencialidad: {
        ic: '🔒', titulo: 'Acuerdo de confidencialidad y manejo de información',
        intro: 'Este acuerdo regula el acceso del colaborador a la información confidencial contenida y gestionada en la plataforma Orbit 360 en el marco de su relación con ' + emp + '.',
        bloques: [
          { h: '1. Definición de Información Confidencial', p: 'Se entiende por “Información Confidencial” toda información de clientes (datos personales, pólizas, primas, siniestros), de la cartera, comercial, financiera, técnica, operativa, de aseguradoras, contraseñas, tarifas, así como la arquitectura, lógicas, flujos y know-how de la plataforma, en cualquier formato y soporte.' },
          { h: '2. Obligaciones del colaborador', items: [
            'Usar la Información Confidencial exclusivamente para las funciones asignadas, dentro de la plataforma.',
            'No divulgar, copiar, descargar, fotografiar, exportar ni extraer información de clientes o de la cartera fuera de la plataforma sin autorización escrita.',
            'No utilizar la información para beneficio propio o de terceros, ni para captar clientes de la cartera al cesar la relación.',
            'Custodiar las credenciales de acceso de forma personal e intransferible y notificar de inmediato cualquier uso indebido.'
          ]},
          { h: '3. Vigencia', p: 'La obligación de confidencialidad rige durante toda la relación con ' + emp + ' y se mantiene de forma indefinida tras su terminación respecto de los datos de clientes y de la cartera. Al cesar la relación, el colaborador devolverá o eliminará toda copia de Información Confidencial en su poder.' },
          { h: '4. Consecuencias del incumplimiento', p: 'El incumplimiento faculta a ' + emp + ' a terminar la relación con justa causa y a ejercer las acciones civiles y penales que correspondan por los daños y perjuicios ocasionados, sin perjuicio de las sanciones disciplinarias aplicables.' }
        ],
        meta: { ley: L.ley, foro: L.foro }
      },

      /* ---------------- 2. TRATAMIENTO DE DATOS ---------------- */
      tratamiento_datos: {
        ic: '🛡️', titulo: 'Autorización para el tratamiento de datos personales',
        intro: 'En cumplimiento de ' + norma + ', se informa la política de tratamiento de los datos personales gestionados en la plataforma.',
        bloques: [
          { h: '1. Responsable y finalidad', p: emp + ' es responsable del tratamiento. Los datos se tratan con finalidad legítima: cotización, emisión, cobro, renovación, atención de siniestros, gestión comercial y cumplimiento de obligaciones legales y contractuales.' },
          { h: '2. Derechos del titular', items: [
            'Conocer, actualizar y rectificar sus datos personales.',
            'Solicitar prueba de la autorización otorgada.',
            'Ser informado sobre el uso dado a sus datos.',
            'Revocar la autorización y/o solicitar la supresión cuando no exista deber legal de conservarlos.',
            'Presentar quejas ante ' + autoridad(p) + '.'
          ]},
          { h: '3. Transferencias', p: 'Los datos no se comparten con terceros salvo aseguradoras, reaseguradoras y proveedores necesarios para prestar el servicio, o cuando lo exija la ley. Todo encargado queda obligado a las mismas medidas de protección.' },
          { h: '4. Conservación y seguridad', p: 'Los datos se conservan mientras dure la relación y los plazos legales aplicables. Se aplican medidas técnicas y administrativas razonables para proteger la información contra acceso no autorizado, pérdida o alteración.' }
        ],
        meta: { norma: norma, autoridad: autoridad(p) }
      },

      /* ---------------- 3. SOCIOS / ALIADOS (NDA reforzado) ---------------- */
      socios: {
        ic: '🤝', titulo: 'Acuerdo de confidencialidad, no reproducción y no competencia (socios / aliados)',
        intro: 'Como socio, aliado, inversionista o tercero con acceso privilegiado a la plataforma Orbit 360, acepto obligaciones reforzadas de confidencialidad y de no competencia tecnológica, dado el carácter estratégico y propietario del software.',
        bloques: [
          { h: '1. Propiedad intelectual', p: 'Orbit 360 —su código, arquitectura, modelo de datos, lógicas de negocio, flujos, diseño de interfaz, documentación y know-how— es propiedad exclusiva de ' + titular() + '. El acceso otorgado NO transfiere ningún derecho de propiedad, licencia de explotación ni autorización de uso más allá del fin pactado.' },
          { h: '2. No copia y no ingeniería inversa', items: [
            'No copiaré, reproduciré, adaptaré ni traduciré total ni parcialmente la plataforma.',
            'No realizaré ingeniería inversa, descompilación ni desensamblaje del software ni de sus componentes.',
            'No desarrollaré, ni participaré en el desarrollo, de un producto igual, similar o competidor basado en el conocimiento adquirido de Orbit 360.'
          ]},
          { h: '3. No competencia tecnológica', p: 'Durante la vigencia de la alianza y por un periodo de DOS (2) AÑOS posteriores a su terminación, me abstendré de crear, financiar, asesorar o asociarme a iniciativas que repliquen el modelo tecnológico de Orbit 360 dirigido al sector de intermediación de seguros.' },
          { h: '4. Confidencialidad', p: 'Mantendré reserva absoluta e indefinida sobre la arquitectura, lógicas, flujos, know-how, información comercial, financiera y de clientes a la que tenga acceso, sin límite temporal.' },
          { h: '5. Penalidad', p: 'El incumplimiento de cualquiera de estas obligaciones causará una indemnización a favor de ' + titular() + ' por los daños y perjuicios ocasionados, incluida una cláusula penal equivalente al mayor valor entre (i) el lucro cesante demostrado y (ii) una suma pactada en el contrato marco, sin perjuicio de las acciones penales por violación de derechos de autor y secretos empresariales.' }
        ],
        meta: { vigencia: 'Indefinida (confidencialidad) · 2 años post-terminación (no competencia)', ley: L.ley, foro: L.foro }
      },

      /* ---------------- 4. LICENCIA AL CLIENTE QUE CONTRATA ---------------- */
      licencia_cliente: {
        ic: '📄', titulo: 'Contrato de licencia de uso de la plataforma',
        intro: 'Este contrato regula la licencia de uso de Orbit 360 otorgada al cliente (intermediario de seguros) que contrata la plataforma.',
        bloques: [
          { h: '1. Objeto y alcance de la licencia', p: titular() + ' otorga al cliente una licencia de uso NO exclusiva, intransferible y revocable de la plataforma Orbit 360, bajo la modalidad de servicio (SaaS), limitada al número de usuarios y módulos contratados. La licencia no constituye venta del software.' },
          { h: '2. Restricciones', items: [
            'No copiar, revender, sublicenciar, ceder ni poner la plataforma a disposición de terceros ajenos al contrato.',
            'No reproducir ni desarrollar software similar, ni realizar ingeniería inversa.',
            'No usar la plataforma para fines ilícitos ni fuera del giro de intermediación de seguros.'
          ]},
          { h: '3. Datos del cliente', p: 'Los datos cargados por el cliente (su cartera, clientes y operación) son de su propiedad. ' + titular() + ' actúa como encargado del tratamiento y los usa únicamente para prestar el servicio, conforme a ' + norma + '. A la terminación, el cliente podrá exportar sus datos.' },
          { h: '4. Confidencialidad y no reproducción', p: 'El cliente se obliga a no copiar, reproducir ni desarrollar software similar a Orbit 360, y a mantener confidencialidad sobre su arquitectura, lógicas y know-how, durante la vigencia del contrato y de forma indefinida tras su terminación.' },
          { h: '5. Vigencia, terminación y penalidad', p: 'La licencia rige por el plazo contratado. El incumplimiento de las restricciones o de la confidencialidad faculta la terminación inmediata, el bloqueo de acceso y el cobro de la cláusula penal e indemnización por daños pactadas en el contrato comercial.' }
        ],
        meta: { vigencia: 'Plazo contratado (renovable)', ley: L.ley, foro: L.foro }
      },

      /* ---------------- 5. PORTAL DEL CLIENTE (mutua) ---------------- */
      cliente_portal: {
        ic: '🔐', titulo: 'Confidencialidad mutua y autorización de datos — Portal del Cliente',
        intro: 'Acuerdo recíproco entre ' + emp + ' y el asegurado para el resguardo de la información del portal, conforme a ' + norma + '.',
        bloques: [
          { h: '1. Compromiso del intermediario', items: [
            'Proteger la información del cliente y usarla solo para gestionar sus seguros.',
            'No divulgar sus datos a terceros salvo aseguradoras y proveedores necesarios, o por mandato legal.',
            'Mantener trazabilidad y medidas de seguridad sobre la información del portal.'
          ]},
          { h: '2. Compromiso del cliente', items: [
            'Mantener la confidencialidad de sus credenciales de acceso (personales e intransferibles).',
            'Usar el portal de buena fe y para la gestión de sus propias pólizas.',
            'Mantener actualizada su información de contacto.'
          ]},
          { h: '3. Autorización de tratamiento', p: 'Autorizo el tratamiento de mis datos personales para la gestión de pólizas, cobros, renovaciones, siniestros y comunicaciones del servicio. Puedo ejercer mis derechos de acceso, rectificación, actualización, supresión y revocatoria en cualquier momento ante ' + emp + '.' }
        ],
        meta: { norma: norma }
      },

      /* ---------------- 6. DESCARGO IA ---------------- */
      descargo_ia: {
        ic: '🤖', titulo: 'Descargo sobre resultados de inteligencia artificial',
        intro: 'La plataforma incluye funciones asistidas por IA (extracción de documentos, análisis, recomendaciones, generación de contenido y mensajes).',
        bloques: [
          { h: '1. Naturaleza de apoyo', items: [
            'Los resultados de la IA son apoyos y deben usarse con criterio profesional.',
            'La IA puede contener imprecisiones; el usuario valida y verifica antes de tomar decisiones o comunicarlas a clientes/aseguradoras.',
            'Las cotizaciones, comparativos y textos generados no constituyen oferta vinculante hasta su validación humana.'
          ]},
          { h: '2. Responsabilidad', p: titular() + ' y ' + emp + ' no se responsabilizan por decisiones tomadas con base exclusiva en resultados de IA sin la debida verificación profesional.' }
        ],
        meta: {}
      }
    };
  }

  // qué cláusulas aplican a cada tipo de usuario
  function clausulasPara(tipo) {
    if (tipo === 'cliente') return ['cliente_portal', 'descargo_ia'];
    if (tipo === 'socio') return ['socios', 'confidencialidad', 'tratamiento_datos', 'descargo_ia'];
    if (tipo === 'licenciatario') return ['licencia_cliente', 'socios', 'tratamiento_datos', 'descargo_ia'];
    return ['confidencialidad', 'tratamiento_datos', 'descargo_ia']; // usuario interno
  }

  function aceptaciones() { try { return JSON.parse(localStorage.getItem(AKEY) || '{}'); } catch (e) { return {}; } }
  function yaAcepto(scopeId) { const a = aceptaciones(); return !!(a[scopeId] && a[scopeId].version === VERSION); }
  function fakeIP() { // IP simulada y estable por scope (demo — en backend se captura la real)
    return '186.' + (Math.floor(Math.random() * 255)) + '.' + (Math.floor(Math.random() * 255)) + '.' + (Math.floor(Math.random() * 255));
  }
  function registrar(scopeId, meta) {
    const a = aceptaciones();
    let usuario = '';
    try { usuario = (Orbit.auth && Orbit.auth.user && Orbit.auth.user() && (Orbit.auth.user().nombre || Orbit.auth.user().email)) || ''; } catch (e) {}
    a[scopeId] = Object.assign({
      aceptado: true, version: VERSION, fecha: new Date().toISOString(),
      pais: pais(), usuario: usuario, ip: fakeIP()
    }, meta || {});
    try { localStorage.setItem(AKEY, JSON.stringify(a)); } catch (e) {}
  }

  function bloqueHTML(b) {
    let s = '<div class="lg-bloque"><div class="lg-bl-h">' + b.h + '</div>';
    if (b.p) s += '<p>' + b.p + '</p>';
    if (b.items) s += '<ul>' + b.items.map(x => '<li>' + x + '</li>').join('') + '</ul>';
    return s + '</div>';
  }
  function metaHTML(m) {
    if (!m) return '';
    const rows = [];
    if (m.vigencia) rows.push('<b>Vigencia:</b> ' + m.vigencia);
    if (m.ley) rows.push('<b>Ley aplicable:</b> ' + m.ley);
    if (m.foro) rows.push('<b>Jurisdicción:</b> ' + m.foro);
    if (m.norma) rows.push('<b>Marco:</b> ' + m.norma);
    if (m.autoridad) rows.push('<b>Autoridad:</b> ' + m.autoridad);
    return rows.length ? '<div class="lg-meta">' + rows.join(' · ') + '</div>' : '';
  }
  function clausulaHTML(c) {
    return '<div class="lg-clausula"><div class="lg-cl-t">' + c.ic + ' ' + c.titulo + '</div>'
      + (c.intro ? '<p class="lg-intro">' + c.intro + '</p>' : '')
      + (c.bloques ? c.bloques.map(bloqueHTML).join('') : '')
      + metaHTML(c.meta) + '</div>';
  }

  /* Muestra el gate de cláusulas para un tipo de usuario; persiste; permite imprimir.
     scopeId identifica a quién (ej. 'user:admin@demo.com' o 'cliente:cli001'). */
  function gate(tipo, scopeId, opts) {
    opts = opts || {};
    if (yaAcepto(scopeId)) { if (opts.onDone) opts.onDone(); return; }
    const cat = catalogo(); const claves = clausulasPara(tipo);
    const cuerpo = claves.map(k => clausulaHTML(cat[k])).join('');
    const titulo = tipo === 'cliente' ? 'Bienvenido/a — antes de continuar'
      : (tipo === 'socio' ? 'Acuerdo de socio / aliado'
      : (tipo === 'licenciatario' ? 'Contrato de licencia — antes de comenzar' : 'Antes de continuar'));
    const back = document.createElement('div');
    back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:262';
    back.innerHTML = '<div class="conf-modal" style="max-width:660px">'
      + '<div class="conf-h"><span class="conf-ic">📜</span><div><div class="nov-eyebrow">' + titulo + '</div><h2>Acuerdos legales</h2></div></div>'
      + '<div class="conf-body" style="max-height:56vh;overflow:auto">' + cuerpo + '</div>'
      + '<label class="conf-chk"><input type="checkbox" id="lg-chk"> He leído y <b>acepto</b> íntegramente los acuerdos anteriores.</label>'
      + '<div class="conf-f" style="display:flex;gap:8px;justify-content:space-between"><button class="btn ghost" id="lg-print">🖨️ Imprimir / PDF</button><button class="btn primary" id="lg-ok" disabled>Aceptar y continuar</button></div>'
      + '</div>';
    document.body.appendChild(back);
    const chk = back.querySelector('#lg-chk'), ok = back.querySelector('#lg-ok');
    chk.addEventListener('change', () => { ok.disabled = !chk.checked; });
    back.querySelector('#lg-print').addEventListener('click', () => imprimir(tipo));
    ok.addEventListener('click', () => { registrar(scopeId, { tipo: tipo, clausulas: claves }); back.remove(); if (opts.onDone) opts.onDone(); });
  }

  // versión imprimible (ventana nueva) con bloque de firmas de ambas partes
  function imprimir(tipo) {
    const cat = catalogo(); const claves = clausulasPara(tipo); const emp = empresa();
    const w = window.open('', '_blank'); if (!w) return;
    const body = claves.map(k => {
      const c = cat[k];
      let s = '<h3>' + c.ic + ' ' + c.titulo + '</h3>';
      if (c.intro) s += '<p><i>' + c.intro + '</i></p>';
      if (c.bloques) s += c.bloques.map(b => '<h4>' + b.h + '</h4>' + (b.p ? '<p>' + b.p + '</p>' : '') + (b.items ? '<ul>' + b.items.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '')).join('');
      const m = c.meta || {}; const mm = [];
      if (m.vigencia) mm.push('Vigencia: ' + m.vigencia);
      if (m.ley) mm.push('Ley aplicable: ' + m.ley);
      if (m.foro) mm.push('Jurisdicción: ' + m.foro);
      if (mm.length) s += '<p class="mt"><small>' + mm.join(' · ') + '</small></p>';
      return s;
    }).join('<hr>');
    w.document.write('<html><head><title>Acuerdos legales · Orbit 360</title><style>body{font-family:Georgia,serif;max-width:740px;margin:40px auto;padding:0 28px;line-height:1.6;color:#1E2227}h1{font-family:sans-serif}h3{margin-top:26px;color:#C5162E}h4{margin:14px 0 4px;font-size:14px}ul{margin:6px 0}hr{border:0;border-top:1px solid #e0e0e0;margin:24px 0}.mt small{color:#666}.firmas{margin-top:48px;display:flex;gap:48px}.firma{flex:1;border-top:1px solid #333;padding-top:8px;font-size:13px}</style></head><body>'
      + '<h1>Acuerdos legales · Orbit 360</h1>'
      + '<p><b>Parte:</b> ' + emp + ' · <b>País:</b> ' + pais() + ' · <b>Versión:</b> ' + VERSION + ' · <b>Fecha:</b> ' + new Date().toLocaleDateString() + '</p>'
      + body
      + '<div class="firmas"><div class="firma">Nombre y firma · Aceptante<br><br>Documento: ____________</div><div class="firma">Por ' + emp + '<br><br>Representante legal</div></div>'
      + '<p class="mt"><small>Documento generado por Orbit 360. Debe ser revisado y adaptado por asesoría legal antes de su uso definitivo.</small></p>'
      + '</body></html>');
    w.document.close(); setTimeout(() => w.print(), 300);
  }

  return { gate, yaAcepto, registrar, aceptaciones, clausulasPara, catalogo, imprimir, pais };
})();
