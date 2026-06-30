/* ============================================================
   Orbit 360 · Cláusulas legales (blindantes, por país, persistentes)
   ------------------------------------------------------------
   Tipos de cláusula:
     - confidencialidad   (todos los usuarios internos)
     - tratamiento_datos  (Habeas Data CO / protección de datos GT)
     - socios             (confidencialidad + no copia/reproducción de software)
     - cliente_portal     (mutua: empresa↔cliente, al primer ingreso)
     - descargo_ia        (resultados de IA usados con criterio)
   Cada aceptación se guarda en localStorage con fecha, usuario, país y versión.
   Genérico multipaís: el texto se adapta al país configurado del tenant.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.legal = (function () {
  const AKEY = 'orbit360_legal_aceptaciones';
  const VERSION = '1.0';

  function pais() { try { return (Orbit.tenant && Orbit.tenant.get && Orbit.tenant.get().paisDefault) || Orbit.pais || 'GT'; } catch (e) { return 'GT'; } }
  function normaDatos(p) {
    return p === 'CO'
      ? 'Ley 1581 de 2012 (Habeas Data) y el régimen de protección de datos personales de Colombia'
      : (p === 'GT' ? 'la normativa de protección de datos personales vigente en Guatemala' : 'la normativa de protección de datos personales aplicable en el país de operación');
  }

  // catálogo de cláusulas — texto parametrizado por país
  function catalogo() {
    const p = pais(), norma = normaDatos(p);
    return {
      confidencialidad: {
        ic: '🔒', titulo: 'Acuerdo de confidencialidad',
        parrafo: 'El acceso a la plataforma implica el manejo de información confidencial de clientes, pólizas, finanzas y operación del intermediario.',
        puntos: [
          'Usaré la información únicamente para las funciones que me han sido asignadas.',
          'No divulgaré, copiaré ni extraeré datos de clientes o de la cartera fuera de la plataforma sin autorización.',
          'Protegeré mis credenciales y mantendré la confidencialidad incluso después de terminar mi relación con la empresa.',
          'Cumpliré ' + norma + '.'
        ]
      },
      tratamiento_datos: {
        ic: '🛡️', titulo: 'Autorización de tratamiento de datos',
        parrafo: 'Conforme a ' + norma + ', autorizo el tratamiento de los datos personales gestionados en la plataforma para fines de la operación aseguradora.',
        puntos: [
          'Los datos se tratan con finalidad legítima: cotización, emisión, cobro, renovación y atención de siniestros.',
          'El titular puede ejercer sus derechos de acceso, rectificación, actualización y supresión.',
          'No se compartirán datos con terceros salvo aseguradoras y proveedores necesarios para el servicio.'
        ]
      },
      socios: {
        ic: '🤝', titulo: 'Confidencialidad y no reproducción (socios / aliados)',
        parrafo: 'Como socio o aliado con acceso a la plataforma Orbit 360, acepto obligaciones reforzadas de confidencialidad y no competencia tecnológica.',
        puntos: [
          'No copiaré, reproduciré, ni desarrollaré software similar basado en Orbit 360, durante la alianza y por un periodo posterior a su finalización.',
          'No divulgaré la arquitectura, lógicas, flujos ni el know-how de la plataforma.',
          'La propiedad intelectual de Orbit 360 permanece con su titular; el acceso no transfiere derechos.',
          'Mantendré la confidencialidad de la información comercial y de clientes de forma indefinida.'
        ]
      },
      cliente_portal: {
        ic: '🔐', titulo: 'Confidencialidad mutua y tratamiento de datos (Portal del Cliente)',
        parrafo: 'Acuerdo recíproco entre el intermediario y el cliente para el resguardo de la información en el portal, conforme a ' + norma + '.',
        puntos: [
          'El intermediario protege la información del cliente y la usa solo para gestionar sus seguros.',
          'El cliente mantiene la confidencialidad de sus credenciales de acceso al portal.',
          'Autorizo el tratamiento de mis datos para la gestión de pólizas, cobros, renovaciones y siniestros.',
          'Puedo ejercer mis derechos sobre mis datos en cualquier momento.'
        ]
      },
      descargo_ia: {
        ic: '🤖', titulo: 'Descargo sobre resultados de inteligencia artificial',
        parrafo: 'La plataforma incluye funciones asistidas por IA (extracción, análisis, recomendaciones, generación de contenido).',
        puntos: [
          'Los resultados de la IA son apoyos y deben usarse con criterio profesional.',
          'No se garantiza exactitud absoluta; el usuario valida antes de tomar decisiones.',
          'El titular de la plataforma no se responsabiliza por decisiones tomadas con base exclusiva en resultados de IA.'
        ]
      }
    };
  }

  // qué cláusulas aplican a cada tipo de usuario
  function clausulasPara(tipo) {
    if (tipo === 'cliente') return ['cliente_portal', 'descargo_ia'];
    if (tipo === 'socio') return ['socios', 'confidencialidad', 'tratamiento_datos', 'descargo_ia'];
    return ['confidencialidad', 'tratamiento_datos', 'descargo_ia']; // usuario interno
  }

  function aceptaciones() { try { return JSON.parse(localStorage.getItem(AKEY) || '{}'); } catch (e) { return {}; } }
  function yaAcepto(scopeId) { const a = aceptaciones(); return !!(a[scopeId] && a[scopeId].version === VERSION); }
  function registrar(scopeId, meta) {
    const a = aceptaciones();
    a[scopeId] = Object.assign({ aceptado: true, version: VERSION, fecha: new Date().toISOString(), pais: pais() }, meta || {});
    try { localStorage.setItem(AKEY, JSON.stringify(a)); } catch (e) {}
  }

  function clausulaHTML(c) {
    return '<div class="lg-clausula"><div class="lg-cl-t">' + c.ic + ' ' + c.titulo + '</div>'
      + '<p>' + c.parrafo + '</p><ul>' + c.puntos.map(p => '<li>' + p + '</li>').join('') + '</ul></div>';
  }

  /* Muestra el gate de cláusulas para un tipo de usuario; persiste; permite imprimir.
     scopeId identifica a quién (ej. 'user:admin@demo.com' o 'cliente:cli001'). */
  function gate(tipo, scopeId, opts) {
    opts = opts || {};
    if (yaAcepto(scopeId)) { if (opts.onDone) opts.onDone(); return; }
    const cat = catalogo(); const claves = clausulasPara(tipo);
    const cuerpo = claves.map(k => clausulaHTML(cat[k])).join('');
    const titulo = tipo === 'cliente' ? 'Bienvenido/a — antes de continuar' : (tipo === 'socio' ? 'Acuerdo de socio/aliado' : 'Antes de continuar');
    const back = document.createElement('div');
    back.className = 'drawer-back open'; back.style.cssText = 'display:grid;place-items:center;z-index:262';
    back.innerHTML = '<div class="conf-modal" style="max-width:600px">'
      + '<div class="conf-h"><span class="conf-ic">📜</span><div><div class="nov-eyebrow">' + titulo + '</div><h2>Acuerdos legales</h2></div></div>'
      + '<div class="conf-body" style="max-height:50vh;overflow:auto">' + cuerpo + '</div>'
      + '<label class="conf-chk"><input type="checkbox" id="lg-chk"> He leído y <b>acepto</b> los acuerdos anteriores.</label>'
      + '<div class="conf-f" style="display:flex;gap:8px;justify-content:space-between"><button class="btn ghost" id="lg-print">🖨️ Imprimir</button><button class="btn primary" id="lg-ok" disabled>Aceptar y continuar</button></div>'
      + '</div>';
    document.body.appendChild(back);
    const chk = back.querySelector('#lg-chk'), ok = back.querySelector('#lg-ok');
    chk.addEventListener('change', () => { ok.disabled = !chk.checked; });
    back.querySelector('#lg-print').addEventListener('click', () => imprimir(tipo));
    ok.addEventListener('click', () => { registrar(scopeId, { tipo: tipo, clausulas: claves }); back.remove(); if (opts.onDone) opts.onDone(); });
  }

  // versión imprimible (ventana nueva)
  function imprimir(tipo) {
    const cat = catalogo(); const claves = clausulasPara(tipo);
    const w = window.open('', '_blank'); if (!w) return;
    const body = claves.map(k => { const c = cat[k]; return '<h3>' + c.ic + ' ' + c.titulo + '</h3><p>' + c.parrafo + '</p><ul>' + c.puntos.map(p => '<li>' + p + '</li>').join('') + '</ul>'; }).join('');
    w.document.write('<html><head><title>Acuerdos legales · Orbit 360</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1E2227}h1{font-family:sans-serif}h3{margin-top:22px}ul{margin:6px 0}.fz{margin-top:40px;border-top:1px solid #ccc;padding-top:16px;font-size:13px}</style></head><body><h1>Acuerdos legales · Orbit 360</h1><p><b>País:</b> ' + pais() + ' · <b>Versión:</b> ' + VERSION + ' · <b>Fecha:</b> ' + new Date().toLocaleDateString() + '</p>' + body + '<div class="fz">Nombre: _______________________________  Firma: _______________________________  Fecha: ____________</div></body></html>');
    w.document.close(); setTimeout(() => w.print(), 300);
  }

  return { gate, yaAcepto, registrar, aceptaciones, clausulasPara, catalogo, imprimir, pais };
})();
