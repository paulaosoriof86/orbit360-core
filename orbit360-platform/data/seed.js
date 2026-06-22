/* ============================================================
   Orbit 360 · Seed — DATOS FICTICIOS (demo)
   Toda la información es de demostración. Genera un universo
   relacional coherente: asesores · aseguradoras · clientes ·
   pólizas · cobros · comisiones · actividades · cancelaciones.
   Cambia __v para forzar re-siembra.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.SEED = (function () {
  const NOW = new Date('2026-06-20');
  // PRNG determinista (mulberry32) → datos estables entre recargas
  let _s = 20260620;
  const rnd = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const id = (p, n) => p + String(n).padStart(3, '0');
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

  // ---- Asesores (equipo) ----
  // shareCom = participación del vendedor sobre la comisión de la aseguradora (%)
  const asesores = [
    { id: 'ase001', nombre: 'Paula Osorio', rol: 'Dirección', iniciales: 'PO', color: '#C5162E', metaPrima: 220000, metaRecaudo: 180000, comTipo: 'variable', comPct: 18, shareCom: 60, comModo: 'comision' },
    { id: 'ase002', nombre: 'Diego Marroquín', rol: 'Asesor Sr.', iniciales: 'DM', color: '#1f3a5f', metaPrima: 160000, metaRecaudo: 140000, comTipo: 'variable', comPct: 15, shareCom: 55, comModo: 'comision' },
    { id: 'ase003', nombre: 'Lucía Herrera', rol: 'Asesora', iniciales: 'LH', color: '#1f8a4c', metaPrima: 140000, metaRecaudo: 120000, comTipo: 'variable', comPct: 12, shareCom: 10, comModo: 'neta' },
    { id: 'ase004', nombre: 'Marco Villatoro', rol: 'Asesor', iniciales: 'MV', color: '#c9821b', metaPrima: 120000, metaRecaudo: 100000, comTipo: 'fija', comPct: 10, shareCom: 45, comModo: 'comision' },
    { id: 'ase005', nombre: 'Ana Lemus', rol: 'Asesora Jr.', iniciales: 'AL', color: '#6b4ea0', metaPrima: 90000, metaRecaudo: 78000, comTipo: 'fija', comPct: 8, shareCom: 40, comModo: 'fijo', comValor: 500 }
  ];

  // ---- Aseguradoras (directorio) ----
  // comisiones = % que la aseguradora paga al intermediario, por RAMO.
  // comisionesProd = override por PRODUCTO (lo llena la planilla importada).
  function tarifaRamos(ramos, lo, hi) { const o = {}; ramos.forEach(r => { o[r] = lo + Math.floor(rnd() * (hi - lo + 1)); }); return o; }
  const aseguradoras = [
    { id: 'asg01', nombre: 'Seguros Atlas', color: '#C5162E', pais: 'GT', ramos: ['Auto', 'Vida', 'Gastos Médicos', 'Hogar'], comisionDefault: 12, comisiones: { 'Auto': 12, 'Vida': 22, 'Gastos Médicos': 15, 'Hogar': 18 }, comisionesProd: {} },
    { id: 'asg02', nombre: 'Aseguradora Cumbre', color: '#1f3a5f', pais: 'GT', ramos: ['Auto', 'Daños', 'Fianzas', 'Transporte'], comisionDefault: 12, comisiones: { 'Auto': 11, 'Daños': 16, 'Fianzas': 20, 'Transporte': 14 }, comisionesProd: {} },
    { id: 'asg03', nombre: 'MundoSeguro', color: '#1f8a4c', pais: 'CO', ramos: ['Vida', 'Gastos Médicos', 'Accidentes'], comisionDefault: 14, comisiones: { 'Vida': 25, 'Gastos Médicos': 16, 'Accidentes': 20 }, comisionesProd: {} },
    { id: 'asg04', nombre: 'Pacífico Seguros', color: '#c9821b', pais: 'CO', ramos: ['Auto', 'Hogar', 'RC', 'Transporte'], comisionDefault: 13, comisiones: { 'Auto': 13, 'Hogar': 18, 'RC': 17, 'Transporte': 15 }, comisionesProd: {} },
    { id: 'asg05', nombre: 'Andes Seguros', color: '#6b4ea0', pais: 'CO', ramos: ['Vida', 'Daños', 'Fianzas'], comisionDefault: 15, comisiones: { 'Vida': 24, 'Daños': 17, 'Fianzas': 21 }, comisionesProd: {} },
    { id: 'asg06', nombre: 'Vértice Seguros', color: '#0f766e', pais: 'GT', ramos: ['Auto', 'Gastos Médicos', 'Hogar', 'RC'], comisionDefault: 12, comisiones: { 'Auto': 12, 'Gastos Médicos': 15, 'Hogar': 17, 'RC': 16 }, comisionesProd: {} }
  ];

  // ---- Catálogos ----
  const productos = {
    'Auto': ['Auto Total', 'Auto Plus', 'Auto Básico'],
    'Vida': ['Vida Entera', 'Vida Temporal', 'Vida Inversión'],
    'Gastos Médicos': ['Salud Integral', 'Salud Familiar', 'Salud Premium'],
    'Hogar': ['Hogar Protegido', 'Hogar Plus'],
    'Daños': ['Multirriesgo PYME', 'Patrimonial Empresa'],
    'Fianzas': ['Fianza Cumplimiento', 'Fianza Anticipo'],
    'Transporte': ['Transporte de Carga', 'Mercancía Asegurada'],
    'RC': ['Responsabilidad Civil', 'RC Profesional'],
    'Accidentes': ['Accidentes Personales']
  };
  const canales = ['Referido', 'Web', 'WhatsApp', 'Campaña', 'Telemarketing', 'Renovación'];
  const segmentos = ['Premium', 'Recurrente', 'Estándar', 'Nuevo'];

  const personas = [
    ['Sofía Castellanos', 'GT'], ['Roberto Quezada', 'GT'], ['María Fernanda Gil', 'CO'],
    ['Andrés Beltrán', 'CO'], ['Camila Rojas', 'CO'], ['Jorge Pineda', 'GT'],
    ['Valentina Ospina', 'CO'], ['Luis Carlos Mejía', 'CO'], ['Gabriela Santos', 'GT'],
    ['Diego Naranjo', 'CO'], ['Paola Arévalo', 'GT'], ['Esteban Cardona', 'CO']
  ];
  const empresas = [
    ['Distribuidora Andina S.A.', 'CO'], ['Constructora Vértiz', 'GT'],
    ['Café del Valle Ltda.', 'CO'], ['Logística Pacífico', 'CO'],
    ['Clínica San Marcos', 'GT'], ['Inversiones Maya', 'GT'],
    ['Textiles Cumbre', 'CO'], ['Transportes Río', 'GT']
  ];

  // ---- Build clientes ----
  const clientes = [];
  let cn = 0;
  function makeCliente(nombre, pais, tipo) {
    cn++;
    const asesor = pick(asesores);
    const altaMonths = between(2, 46);
    const moneda = pais === 'GT' ? 'GTQ' : 'COP';
    const GEO = {
      GT: { Guatemala: ['Guatemala', 'Mixco', 'Villa Nueva'], Quetzaltenango: ['Quetzaltenango', 'Coatepeque'], Escuintla: ['Escuintla', 'Santa Lucía'], Sacatepéquez: ['Antigua Guatemala'] },
      CO: { 'Cundinamarca': ['Bogotá', 'Soacha', 'Chía'], 'Antioquia': ['Medellín', 'Envigado', 'Itagüí'], 'Valle del Cauca': ['Cali', 'Palmira'], 'Atlántico': ['Barranquilla', 'Soledad'] }
    };
    const deptos = Object.keys(GEO[pais] || { '—': ['—'] });
    const departamento = pick(deptos);
    const ciudad = pick((GEO[pais] || {})[departamento] || ['—']);
    const calle = pais === 'GT' ? between(1, 30) + ' Calle ' + between(1, 40) + '-' + between(10, 99) + ' Zona ' + between(1, 18) : 'Cra ' + between(1, 120) + ' # ' + between(1, 90) + '-' + between(10, 99);
    return {
      id: id('cli', cn), tipo, nombre, pais, moneda, ciudad, departamento, direccion: calle,
      identificacion: tipo === 'Empresa'
        ? (pais === 'GT' ? between(1000000, 9999999) + '-' + between(0, 9) : '9' + between(10000000, 99999999))
        : (pais === 'GT' ? between(1000, 9999) + ' ' + between(10000, 99999) + ' ' + between(1000, 9999) : between(10000000, 99999999) + ''),
      email: nombre.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' ').slice(0, 2).join('.') + (tipo === 'Empresa' ? '@empresa.com' : '@correo.com'),
      telefono: (pais === 'GT' ? '+502 ' : '+57 ') + between(3000, 3999) + ' ' + between(1000, 9999),
      asesorId: asesor.id,
      segmento: pick(segmentos),
      canal: pick(canales),
      sexo: tipo === 'Empresa' ? '' : pick(['F', 'M']),
      fechaNac: tipo === 'Empresa' ? '' : iso(new Date(between(1965, 2002), between(0, 11), between(1, 28))),
      contactoAlt: '',
      fechaAlta: iso(addMonths(NOW, -altaMonths)),
      cumple: iso(new Date(2026, between(0, 11), between(1, 28))),
      etiquetas: tipo === 'Empresa' ? ['Corporativo'] : (rnd() > .6 ? ['VIP'] : []),
      driveLink: rnd() > .5 ? 'https://drive.google.com/drive/folders/' + id('exp', cn) : '',
      notas: ''
    };
  }
  personas.forEach(([n, p]) => clientes.push(makeCliente(n, p, 'Persona')));
  empresas.forEach(([n, p]) => clientes.push(makeCliente(n, p, 'Empresa')));
  // Simular clientes históricos con datos INCOMPLETOS (calidad de datos)
  clientes.forEach((c, i) => {
    if (i % 10 === 3) { c.telefono = ''; }                 // sin teléfono (prioridad 1)
    if (i % 10 === 6) { c.telefono = ''; c.direccion = ''; }
    if (i % 7 === 2) { c.direccion = ''; }                 // sin dirección (prioridad 2)
    if (i % 9 === 4) { c.email = ''; }                     // sin correo
    if (i % 8 === 5) { c.fechaNac = ''; c.sexo = ''; }     // sin demográficos
  });

  // ---- Build pólizas + cobros + comisiones + actividades ----
  const polizas = [], cobros = [], comisiones = [], actividades = [], cancelaciones = [], vehiculos = [];
  let pn = 0, cbn = 0, cmn = 0, acn = 0, cxn = 0, vhn = 0;

  clientes.forEach(cli => {
    const asg0 = aseguradoras.filter(a => a.pais === cli.pais);
    const nPol = cli.tipo === 'Empresa' ? between(2, 4) : between(1, 3);
    for (let i = 0; i < nPol; i++) {
      pn++;
      const asg = pick(asg0.length ? asg0 : aseguradoras);
      const ramo = pick(asg.ramos);
      const producto = pick(productos[ramo] || ['Plan estándar']);
      // frecuencia / forma de pago / conducto
      const frecuencias = ['Contado', 'Mensual', 'Trimestral', 'Semestral', 'Anual'];
      const frecuencia = pick(frecuencias);
      const fraccionado = Orbit.primas.cuotasDe(frecuencia) > 1;
      const formaPago = fraccionado ? pick(['Tarjeta de crédito', 'Visa Cuotas', 'Transferencia', 'Domiciliado'])
                                    : pick(['Tarjeta de crédito', 'Transferencia', 'Efectivo']);
      const conducto = pick(Orbit.primas.CONDUCTOS);
      const base = cli.tipo === 'Empresa' ? between(8000, 60000) : between(1200, 14000);
      const primaNeta = cli.pais === 'CO' ? base * 1000 : base; // COP en miles
      const inicioMonths = between(1, 13);
      const vigInicio = addMonths(NOW, -inicioMonths);
      const vigFin = addMonths(vigInicio, 12);
      // comisión aseguradora = tarifa por ramo de ESA aseguradora; vendedor = participación del asesor
      const _ase = asesores.find(a => a.id === cli.asesorId) || {};
      const comPct = (asg.comisiones && asg.comisiones[ramo] != null) ? asg.comisiones[ramo] : (asg.comisionDefault || 12);
      const comVendPct = _ase.shareCom != null ? _ase.shareCom : 50;  // % sobre la comisión de la aseguradora
      // estado de la póliza
      const diasParaVencer = Math.round((vigFin - NOW) / 86400000);
      let estado = 'Vigente';
      if (diasParaVencer < 0) estado = 'Vencida';
      else if (diasParaVencer <= 45) estado = 'Por renovar';
      const cancelada = rnd() < 0.12;
      if (cancelada) estado = 'Cancelada';

      // desglose de prima con tasas del país
      const d = Orbit.primas.desglose(primaNeta, cli.pais, { fraccionado: fraccionado, otros: ramo === 'Auto' ? Math.round(primaNeta * 0.02) : 0 });

      const renovable = rnd() > 0.15; // ~15% no renovables (multianual o de un solo período)
      const tiposPol = { Auto: 'Individual', Vida: 'Individual', 'Gastos Médicos': rnd() > .5 ? 'Colectiva' : 'Individual', Hogar: 'Individual', Daños: 'Empresarial', RC: 'Empresarial', Fianzas: 'Empresarial' };

      const pol = {
        id: id('pol', pn),
        numero: (cli.pais === 'GT' ? 'GT-' : 'CO-') + asg.id.slice(-2).toUpperCase() + '-' + String(between(10000, 99999)),
        clienteId: cli.id, asesorId: cli.asesorId, aseguradoraId: asg.id,
        ramo, subramo: producto, producto, tipoPoliza: tiposPol[ramo] || 'Individual',
        moneda: cli.moneda, divisa: cli.moneda,
        // pago
        frecuencia, forma: frecuencia, formaPago, conducto,
        tarjeta: (formaPago === 'Tarjeta de crédito' || formaPago === 'Visa Cuotas') ? '**** ' + between(1000, 9999) : '',
        // desglose de prima
        primaNeta: d.neta, gastosEmision: d.gastosEmision, gastosFinan: d.gastosFinan,
        otros: d.otros, ivaPct: d.ivaPct, ivaMonto: d.iva, recargoFinPct: d.recargoPct,
        prima: d.total, primaTotal: d.total, baseGravable: d.baseGravable,
        sumaAsegurada: primaNeta * between(20, 120),
        comisionPct: comPct, comAseguradoraPct: comPct, comVendedorPct: comVendPct,
        vendidaPor: (asesores.find(a => a.id === cli.asesorId) || {}).nombre || '',
        // vigencia / renovación
        vigenciaInicio: iso(vigInicio), vigenciaFin: iso(vigFin),
        renovable, multianual: !renovable && rnd() > .5,
        contadorRenovaciones: between(0, 4),
        concepto: producto + ' · ' + ramo,
        estado
      };
      polizas.push(pol);

      // vehículo (ramo Auto) — detalle por póliza
      if (ramo === 'Auto') {
        vhn++;
        const marca = pick(['Toyota', 'Mazda', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Mitsubishi']);
        const linea = pick(['Hilux', 'CX-5', 'Tucson', 'Sportage', 'Frontier', 'CR-V', 'Outlander', 'Corolla']);
        const placa = (cli.pais === 'GT' ? 'P-' : '') + String.fromCharCode(65 + between(0, 25)) + between(100, 999) + (cli.pais === 'CO' ? String.fromCharCode(65 + between(0, 25)) + between(10, 99) : String.fromCharCode(65 + between(0, 25)) + String.fromCharCode(65 + between(0, 25)));
        vehiculos.push({
          id: id('veh', vhn), polizaId: pol.id, clienteId: cli.id,
          placa, marca, linea, anio: between(2017, 2025),
          uso: pick(['Particular', 'Comercial']), color: pick(['Blanco', 'Gris', 'Negro', 'Rojo', 'Azul']),
          chasis: 'VIN' + between(100000, 999999), motor: 'MTR' + between(10000, 99999),
          sumaAsegurada: pol.sumaAsegurada
        });
      }

      // cancelación
      if (cancelada) {
        cxn++;
        cancelaciones.push({
          id: id('can', cxn), polizaId: pol.id, clienteId: cli.id,
          fecha: iso(addDays(NOW, -between(10, 200))),
          motivo: pick(['No pago de prima', 'Cambio de aseguradora', 'Venta del bien', 'Insatisfacción', 'Duplicidad']),
          valorPerdido: pol.prima
        });
      }

      // ---- RECIBOS generados desde el motor de primas ----
      // Contado/Anual = 1 recibo; fraccionado = N con recargo prorrateado.
      const recibos = Orbit.primas.recibos(d, {
        frecuencia, vigenciaInicio: iso(vigInicio),
        comAseguradoraPct: comPct, comVendedorPct: comVendPct
      });
      const cuotasN = recibos.length;
      recibos.forEach((rec, qi) => {
        cbn++;
        const venceTs = new Date(rec.vence).getTime();
        let cEstado = 'Pendiente', fechaPago = null, conciliado = false;
        if (estado === 'Cancelada' && qi > 0) { cEstado = 'Anulado'; }
        else if (venceTs < NOW.getTime() - 8 * 86400000) {
          if (rnd() < 0.85) { cEstado = 'Pagado'; fechaPago = iso(addDays(new Date(rec.vence), between(-3, 6))); conciliado = rnd() < 0.9; }
          else { cEstado = 'Vencido'; }
        } else if (venceTs < NOW.getTime()) {
          cEstado = rnd() < 0.7 ? 'Pagado' : 'Vencido';
          if (cEstado === 'Pagado') { fechaPago = rec.vence; conciliado = rnd() < 0.8; }
        }
        cobros.push({
          id: id('cob', cbn), polizaId: pol.id, clienteId: cli.id, asesorId: cli.asesorId,
          cuota: rec.n, monto: rec.total, moneda: cli.moneda,
          // desglose del recibo
          neta: rec.neta, gastosEmision: rec.gastosEmision, gastosFinan: rec.gastosFinan,
          otros: rec.otros, iva: rec.iva,
          comAseguradora: rec.comAseguradora, comVendedor: rec.comVendedor,
          vence: rec.vence, fechaLimite: rec.fechaLimite, fechaPago, estado: cEstado,
          metodo: cEstado === 'Pagado' ? pol.formaPago : null,
          conducto: pol.conducto, conciliado
        });

        if (cEstado === 'Pagado') {
          cmn++;
          const monto = rec.comAseguradora;
          comisiones.push({
            id: id('com', cmn), polizaId: pol.id, cobroId: id('cob', cbn), clienteId: cli.id,
            asesorId: cli.asesorId, aseguradoraId: asg.id,
            base: rec.neta, pct: comPct, monto, moneda: cli.moneda,
            periodo: fechaPago ? fechaPago.slice(0, 7) : rec.vence.slice(0, 7),
            estado: rnd() < 0.7 ? 'Liquidada' : 'Devengada'
          });
        }
      });
    }

    // actividades / historial por cliente
    const nAct = between(3, 7);
    const tipos = [
      ['llamada', '📞', 'Llamada de seguimiento'],
      ['whatsapp', '💬', 'Mensaje de WhatsApp enviado'],
      ['email', '✉', 'Correo con propuesta'],
      ['reunion', '🤝', 'Reunión de asesoría'],
      ['nota', '📝', 'Nota interna'],
      ['sistema', '⚙', 'Evento del sistema']
    ];
    for (let a = 0; a < nAct; a++) {
      acn++;
      const t = pick(tipos);
      actividades.push({
        id: id('act', acn), clienteId: cli.id, asesorId: cli.asesorId,
        tipo: t[0], icon: t[1],
        fecha: iso(addDays(NOW, -between(1, 220))),
        titulo: t[2],
        detalle: pick([
          'Cliente interesado en ampliar cobertura.',
          'Se compartió comparativo de coberturas.',
          'Recordatorio de pago próximo a vencer.',
          'Consulta sobre proceso de renovación.',
          'Actualización de datos de contacto.',
          'Se agendó cita para revisión de póliza.'
        ])
      });
    }
  });

  // ====================================================================
  //  CICLO COMERCIAL UNIFICADO — negocios (oportunidades) + gestiones Ops
  //  Un mismo "negocio" se proyecta en DOS tableros:
  //   · Orbit Ops (interno): Cotizaciones, Inspecciones, Emisiones
  //   · Orbit Leads (asesor): Nuevo → Contactado → … → Cierre
  //  La etapa canónica determina en qué lista aparece en cada tablero.
  //  Las gestiones administrativas (Gestiones Admin / Renov.-Modif.) son
  //  operativas y NO son prospectos.
  // ====================================================================
  const negocios = [], gestiones = [], leads = [];
  const etapasCanon = ['nuevo', 'contactado', 'cotizando', 'propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido', 'perdido'];
  const probDe = { nuevo: 10, contactado: 25, cotizando: 45, propuesta: 65, negociacion: 78, inspeccion: 85, emision: 92, emitido: 100, perdido: 0 };
  const leadCanales = ['Referido', 'Web', 'WhatsApp', 'Campaña', 'Facebook', 'Telemarketing'];
  const ramosLead = ['Auto', 'Vida', 'Gastos Médicos', 'Hogar', 'Daños', 'RC'];
  const prospectos = [
    ['Andrea Solís', 'Persona'], ['Bytes Solutions S.A.', 'Empresa'], ['Carlos Méndez', 'Persona'],
    ['Mariana Téllez', 'Persona'], ['Grupo Lumen', 'Empresa'], ['Pedro Ramírez', 'Persona'],
    ['Inmobiliaria Cresta', 'Empresa'], ['Verónica Aguilar', 'Persona'], ['Tech Andina Ltda.', 'Empresa'],
    ['José Morales', 'Persona'], ['Clínica Vida', 'Empresa'], ['Laura Bonilla', 'Persona'],
    ['Ricardo Salguero', 'Persona'], ['Comercial El Faro', 'Empresa']
  ];
  // distribución intencional por etapa para un pipeline realista
  const distEtapas = ['nuevo', 'nuevo', 'contactado', 'cotizando', 'cotizando', 'propuesta', 'propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido', 'emitido', 'perdido', 'contactado'];
  const cadencias = ['Día 1 · llamada de bienvenida', 'Día 3 · WhatsApp de seguimiento', 'Día 7 · correo con propuesta', 'Día 14 · llamada de cierre'];
  prospectos.forEach((pr, i) => {
    const [nombre, tipo] = pr;
    const ase = pick(asesores);
    const et = distEtapas[i] || pick(etapasCanon);
    const pais = rnd() > .4 ? 'GT' : 'CO';
    const ramo = pick(ramosLead);
    const asg = pick(aseguradoras.filter(a => a.pais === pais).length ? aseguradoras.filter(a => a.pais === pais) : aseguradoras);
    const origen = (et === 'cotizando' || rnd() > .55) ? 'Ops' : 'Leads';
    const creado = iso(addDays(NOW, -between(1, 38)));
    const avanzado = ['propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido'].includes(et);
    const bit = [{ ts: creado + ' 09:12', user: ase.nombre, campo: 'Creación', de: '', a: 'Ingreso (' + origen + ')', origen: 'manual' }];
    if (avanzado) bit.push({ ts: iso(addDays(NOW, -between(1, 8))) + ' 11:40', user: ase.nombre, campo: 'Etapa', de: 'cotizando', a: et, origen: 'manual' });
    negocios.push({
      id: id('neg', i + 1), nombre, tipo, etapa: et, prob: probDe[et],
      asesorId: ase.id, canal: pick(leadCanales),
      pais, moneda: pais === 'GT' ? 'GTQ' : 'COP',
      producto: pick(productos[ramo] || ['Plan estándar']), ramo,
      aseguradoraId: asg.id,
      telefono: (pais === 'GT' ? '+502 ' : '+57 ') + between(3000, 3999) + ' ' + between(1000, 9999),
      email: nombre.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' ').slice(0, 2).join('.') + (tipo === 'Empresa' ? '@empresa.com' : '@correo.com'),
      primaEst: (pais === 'CO' ? between(1, 14) * 1000000 : between(1200, 16000)),
      descripcion: pick(['Marca, modelo y año del vehículo; coberturas solicitadas.', 'Grupo familiar de 4; busca cobertura internacional.', 'Inmueble comercial; multirriesgo PYME.', 'Renovación con mejora de suma asegurada.', 'Flotilla de 6 vehículos de reparto.']),
      notas: '',
      cadencia: avanzado ? pick(cadencias) : '',
      cadenciaActiva: ['propuesta', 'negociacion'].includes(et),
      proximoToque: iso(addDays(NOW, between(-3, 10))),
      vence: iso(addDays(NOW, between(-2, 14))),
      prioridad: pick(['Alta', 'Media', 'Baja']),
      decision: et === 'inspeccion' ? 'inspeccion' : et === 'emision' ? 'emision' : '',
      nroCotizacion: ['cotizando', 'propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido'].includes(et) ? 'COT-' + between(1000, 9999) : '',
      nroPoliza: et === 'emitido' ? (pais === 'GT' ? 'GT-' : 'CO-') + asg.id.slice(-2).toUpperCase() + '-' + between(10000, 99999) : '',
      checklist: [
        { t: 'Datos completos para cotizar', done: et !== 'nuevo' },
        { t: 'Cotización enviada al cliente', done: ['propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido'].includes(et) },
        { t: 'Documentos del riesgo recibidos', done: ['inspeccion', 'emision', 'emitido'].includes(et) },
        { t: 'Inspección / avalúo realizado', done: ['emision', 'emitido'].includes(et) }
      ],
      clienteIdCreado: '', archivado: false,
      etiquetas: [], bitacora: bit,
      comentarios: avanzado && rnd() > .6 ? [{ ts: iso(addDays(NOW, -between(1, 5))) + ' 15:20', user: ase.nombre, texto: 'Cliente pidió comparar con otra aseguradora.' }] : [],
      creado, actualizado: iso(NOW)
    });
  });

  // Gestiones operativas (NO prospectos): admin + renovaciones/modificaciones.
  const tiposAdmin = ['Actualizar datos de cliente', 'Endoso de beneficiario', 'Carta de no adeudo', 'Emisión de certificado', 'Solicitud de cancelación'];
  const tiposRenov = ['Renovación de póliza', 'Modificar suma asegurada', 'Sustitución de vehículo', 'Solicitar condiciones de renovación', 'Cambio de propietario'];
  let gn = 0;
  function makeGestion(lista, titulo) {
    gn++;
    const cli = pick(clientes);
    const pols = polizas.filter(p => p.clienteId === cli.id);
    const pol = pols.length ? pick(pols) : null;
    const creado = iso(addDays(NOW, -between(0, 18)));
    return {
      id: id('ges', gn), lista, tipo: titulo, titulo,
      clienteId: cli.id, polizaId: pol ? pol.id : '',
      asesorId: cli.asesorId, aseguradoraId: pol ? pol.aseguradoraId : pick(aseguradoras).id,
      ramo: pol ? pol.ramo : pick(ramosLead),
      estado: pick(['Pendiente', 'En proceso', 'Pendiente']),
      prioridad: pick(['Alta', 'Media', 'Baja']),
      vence: iso(addDays(NOW, between(-2, 12))),
      proximaAccion: pick(['Llamar al ejecutivo', 'Solicitar documento', 'Confirmar con cliente', 'Cargar a plataforma aseguradora']),
      checklist: [
        { t: 'Solicitud recibida', done: true },
        { t: 'Documentación completa', done: rnd() > .5 },
        { t: 'Enviado a aseguradora', done: rnd() > .7 }
      ],
      nota: '', notas: '', origen: 'manual',
      bitacora: [{ ts: creado + ' 10:05', user: pick(asesores).nombre, campo: 'Creación', de: '', a: 'Gestión creada', origen: 'manual' }],
      comentarios: [],
      creado, actualizado: iso(NOW), archivado: false
    };
  }
  for (let i = 0; i < 5; i++) gestiones.push(makeGestion('Gestiones Admin', pick(tiposAdmin)));
  for (let i = 0; i < 4; i++) gestiones.push(makeGestion('Renovaciones / Modif.', pick(tiposRenov)));

  // novedades / incentivos
  const novedades = [
    { id: 'nov1', tipo: 'incentivo', titulo: '🏆 Incentivo de junio: bono por 10 pólizas Auto', detalle: 'Cierra 10 pólizas de Auto este mes y gana un bono del 5% adicional sobre comisión.', autor: 'Paula Osorio', fecha: iso(addDays(NOW, -2)), prioridad: true },
    { id: 'nov2', tipo: 'producto', titulo: '🆕 Nuevo producto: Salud Premium de MundoSeguro', detalle: 'Cobertura internacional y sin deducible en red preferente. Material comercial en Academia.', autor: 'Dirección', fecha: iso(addDays(NOW, -5)), prioridad: false },
    { id: 'nov3', tipo: 'aviso', titulo: '📢 Cierre de mes: subir gestiones antes del 30', detalle: 'Recuerden dejar todas las gestiones y recaudos cargados antes del cierre.', autor: 'Finanzas', fecha: iso(addDays(NOW, -1)), prioridad: false }
  ];

  // orden de actividades por fecha desc se hace en el módulo
  return {
    __v: 13,
    meta: { now: iso(NOW), empresa: 'Demo Corredores', moneda_base: 'GTQ' },
    asesores, aseguradoras, clientes, polizas, cobros, comisiones, actividades, cancelaciones, vehiculos, negocios, gestiones, novedades
  };
})();
