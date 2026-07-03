/* ============================================================
   Orbit 360 · Seed — DATOS FICTICIOS (demo)
   Toda la información es de demostración. Genera un universo
   relacional coherente: asesores · aseguradoras · clientes ·
   pólizas · cobros · comisiones · actividades · cancelaciones.
   Cambia __v para forzar re-siembra.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.SEED = (function () {
  const NOW = new Date(); // fecha REAL del sistema — el demo sigue el calendario actual
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
  // helpers de ficha de aseguradora (datos ficticios genéricos)
  function asgExtra(nombre, pais, nit) {
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
    return {
      vinculada: true,
      nit: nit || (pais === 'GT' ? (between(1000000, 9999999) + '-' + between(0, 9)) : (between(800, 901) + '.' + between(100, 999) + '.' + between(100, 999) + '-' + between(0, 9))),
      facturacion: { razonSocial: nombre + (pais === 'GT' ? ', S.A.' : ' S.A.S.'), patronConcepto: 'Comisiones de intermediación — póliza {NUMERO} — {RAMO}', dirFiscal: (pais === 'GT' ? 'Ciudad de Guatemala' : 'Bogotá D.C.') },
      portal: 'https://portal.' + slug + '.com',
      drive: 'https://drive.google.com/' + slug,
      cuentas: [
        { banco: pais === 'GT' ? 'Banco Industrial' : 'Bancolombia', tipo: 'Monetaria', numero: '****' + between(1000, 9999), moneda: pais === 'GT' ? 'GTQ' : 'COP' }
      ],
      contactos: [
        { nombre: 'Ejecutivo Comercial', tipo: 'Comercial / Técnico', email: 'comercial@' + slug + '.com', tel: (pais === 'GT' ? '+502 ' : '+57 ') + between(3000, 3999) + between(1000, 9999) },
        { nombre: 'Mesa Administrativa', tipo: 'Administrativo', email: 'admin@' + slug + '.com', tel: (pais === 'GT' ? '+502 ' : '+57 ') + between(2000, 2999) + between(1000, 9999) },
        { nombre: 'Atención de Siniestros', tipo: 'Siniestros', email: 'siniestros@' + slug + '.com', tel: (pais === 'GT' ? '+502 ' : '+57 ') + between(1500, 1999) + between(1000, 9999) }
      ],
      docs: [
        { nombre: 'Tarifario vigente.pdf', cat: 'Tarifas' },
        { nombre: 'Formulario de emisión Auto.pdf', cat: 'Formularios' },
        { nombre: 'Brochure comercial.pdf', cat: 'Comercial' }
      ],
      docsRequeridos: [
        { producto: 'Auto', items: 'DPI/cédula, tarjeta de circulación, fotos del vehículo, formulario firmado' },
        { producto: 'Vida', items: 'DPI/cédula, declaración de salud, beneficiarios' }
      ]
    };
  }
  const aseguradoras = [
    Object.assign({ id: 'asg01', nombre: 'Seguros Atlas', color: '#C5162E', pais: 'GT', ramos: ['Auto', 'Vida', 'Gastos Médicos', 'Hogar'], comisionDefault: 12, comisiones: { 'Auto': 12, 'Vida': 22, 'Gastos Médicos': 15, 'Hogar': 18 }, comisionesProd: {} }, asgExtra('Seguros Atlas', 'GT')),
    Object.assign({ id: 'asg02', nombre: 'Aseguradora Cumbre', color: '#1f3a5f', pais: 'GT', ramos: ['Auto', 'Daños', 'Fianzas', 'Transporte'], comisionDefault: 12, comisiones: { 'Auto': 11, 'Daños': 16, 'Fianzas': 20, 'Transporte': 14 }, comisionesProd: {} }, asgExtra('Aseguradora Cumbre', 'GT')),
    Object.assign({ id: 'asg03', nombre: 'MundoSeguro', color: '#1f8a4c', pais: 'CO', ramos: ['Vida', 'Gastos Médicos', 'Accidentes'], comisionDefault: 14, comisiones: { 'Vida': 25, 'Gastos Médicos': 16, 'Accidentes': 20 }, comisionesProd: {} }, asgExtra('MundoSeguro', 'CO')),
    Object.assign({ id: 'asg04', nombre: 'Pacífico Seguros', color: '#c9821b', pais: 'CO', ramos: ['Auto', 'Hogar', 'RC', 'Transporte'], comisionDefault: 13, comisiones: { 'Auto': 13, 'Hogar': 18, 'RC': 17, 'Transporte': 15 }, comisionesProd: {} }, asgExtra('Pacífico Seguros', 'CO')),
    Object.assign({ id: 'asg05', nombre: 'Andes Seguros', color: '#6b4ea0', pais: 'CO', ramos: ['Vida', 'Daños', 'Fianzas'], comisionDefault: 15, comisiones: { 'Vida': 24, 'Daños': 17, 'Fianzas': 21 }, comisionesProd: {} }, asgExtra('Andes Seguros', 'CO')),
    Object.assign({ id: 'asg06', nombre: 'Vértice Seguros', color: '#0f766e', pais: 'GT', ramos: ['Auto', 'Gastos Médicos', 'Hogar', 'RC'], comisionDefault: 12, comisiones: { 'Auto': 12, 'Gastos Médicos': 15, 'Hogar': 17, 'RC': 16 }, comisionesProd: {} }, asgExtra('Vértice Seguros', 'GT')),
    // directorio adicional autorizado (deshabilitadas por defecto — sin vinculación aún)
    Object.assign({ id: 'asg07', nombre: 'El Roble', color: '#15803d', pais: 'GT', ramos: ['Auto', 'Vida', 'Daños'], comisionDefault: 12, comisiones: {}, comisionesProd: {} }, asgExtra('El Roble', 'GT'), { vinculada: false }),
    Object.assign({ id: 'asg08', nombre: 'G&T Seguros', color: '#1d4ed8', pais: 'GT', ramos: ['Auto', 'Gastos Médicos', 'Fianzas'], comisionDefault: 12, comisiones: {}, comisionesProd: {} }, asgExtra('G&T Seguros', 'GT'), { vinculada: false }),
    Object.assign({ id: 'asg09', nombre: 'Mapfre', color: '#b91c1c', pais: 'GT', ramos: ['Auto', 'Hogar', 'Transporte'], comisionDefault: 12, comisiones: {}, comisionesProd: {} }, asgExtra('Mapfre', 'GT'), { vinculada: false }),
    Object.assign({ id: 'asg10', nombre: 'Sura', color: '#0369a1', pais: 'CO', ramos: ['Auto', 'Vida', 'Salud', 'Daños'], comisionDefault: 14, comisiones: {}, comisionesProd: {} }, asgExtra('Sura', 'CO'), { vinculada: false }),
    Object.assign({ id: 'asg11', nombre: 'Bolívar', color: '#15803d', pais: 'CO', ramos: ['Vida', 'Hogar', 'Cumplimiento'], comisionDefault: 14, comisiones: {}, comisionesProd: {} }, asgExtra('Bolívar', 'CO'), { vinculada: false }),
    Object.assign({ id: 'asg12', nombre: 'Allianz', color: '#1e3a8a', pais: 'CO', ramos: ['Auto', 'RC', 'Transporte'], comisionDefault: 13, comisiones: {}, comisionesProd: {} }, asgExtra('Allianz', 'CO'), { vinculada: false })
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
        else if (estado === 'Cancelada' && qi === 0 && rnd() < 0.7) { cEstado = 'Pagado'; fechaPago = iso(addDays(new Date(rec.vence), between(-3, 6))); conciliado = true; }
        else if (estado === 'Cancelada') { cEstado = 'Anulado'; }
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

  // ====================================================================
  //  FINANZAS — movimientos por mes y país (genérico, comercializable)
  // ====================================================================
  const finmovs = [], acreedores = [], presupuesto = [];
  const ACREEDORES = [{ id: 'acr1', nombre: 'Banco (línea de crédito)', pais: 'GT' }, { id: 'acr2', nombre: 'Socio capital', pais: 'CO' }];
  ACREEDORES.forEach(a => acreedores.push(Object.assign({ saldo: 0 }, a)));
  const PPTO = {
    GT: [['Contabilidad', 250], ['Cuota CRM', 200], ['Internet', 200], ['Office 365', 67], ['Publicidad redes', 600], ['Salarios', 4200], ['Operación', 900]],
    CO: [['Contabilidad', 900000], ['Cuota CRM', 750000], ['Internet', 700000], ['Office 365', 250000], ['Publicidad redes', 2200000], ['Salarios', 15500000], ['Operación', 3200000]]
  };
  let fmn = 0;
  const fmId = () => 'fmv' + (++fmn);
  for (let back = 15; back >= 0; back--) {
    const base = addMonths(NOW, -back);
    const ym = iso(base).slice(0, 7);
    ['GT', 'CO'].forEach(pais => {
      const cur = pais === 'GT' ? 'GTQ' : 'COP';
      const k = pais === 'GT' ? 1 : 200;
      const seasonal = 1 + Math.sin((base.getMonth() / 12) * Math.PI * 2) * 0.12 + (15 - back) * 0.012;
      const recaudadoMes = back > 0;
      aseguradoras.filter(a => a.pais === pais).forEach(asg => {
        const val = Math.round(between(900, 4200) * k * seasonal);
        finmovs.push({ id: fmId(), tipo: 'ingreso', clase: 'Comisiones aseguradora', pais, moneda: cur, periodo: ym, dia: between(3, 18), pagador: asg.nombre, aseguradoraId: asg.id, concepto: 'Comisiones ' + asg.nombre, valor: val, iva: Math.round(val * 0.12), estado: recaudadoMes ? 'recaudado' : (rnd() > .4 ? 'facturado' : 'esperado'), obs: '' });
      });
      if (rnd() > .55) finmovs.push({ id: fmId(), tipo: 'ingreso', clase: 'Incentivos', pais, moneda: cur, periodo: ym, dia: between(5, 25), pagador: pick(aseguradoras.filter(a => a.pais === pais)).nombre, concepto: 'Incentivo por producción', valor: Math.round(between(400, 1800) * k * seasonal), iva: 0, estado: recaudadoMes ? 'recaudado' : 'esperado', obs: 'Bono comercial' });
      if (rnd() > .7) finmovs.push({ id: fmId(), tipo: 'ingreso', clase: 'Otros', pais, moneda: cur, periodo: ym, dia: between(5, 25), pagador: 'Varios', concepto: 'Otros ingresos', valor: Math.round(between(150, 700) * k), iva: 0, estado: 'recaudado', obs: '' });
      const acr = acreedores.find(a => a.pais === pais);
      if (acr && (back === 12 || back === 6)) {
        const monto = Math.round(between(8000, 16000) * k);
        finmovs.push({ id: fmId(), tipo: 'financiacion', clase: 'Financiamiento', pais, moneda: cur, periodo: ym, dia: between(2, 8), pagador: acr.nombre, acreedorId: acr.id, concepto: 'Ingreso por financiación', valor: monto, iva: 0, estado: 'recaudado', obs: 'Capital de trabajo' });
        acr.saldo += monto;
      }
      const comAsesor = Math.round(between(2200, 5200) * k * seasonal);
      finmovs.push({ id: fmId(), tipo: 'egreso', clase: 'Comisiones asesores', pais, moneda: cur, periodo: ym, dia: between(8, 20), beneficiario: pick(asesores).nombre, concepto: 'Liquidación comisiones asesores', valor: comAsesor, pendiente: recaudadoMes ? 0 : Math.round(comAsesor * 0.4), estado: recaudadoMes ? 'pagado' : 'pendiente', obs: '' });
      PPTO[pais].forEach(([cat, ppto]) => {
        const real = Math.round(ppto * (0.9 + rnd() * 0.25));
        finmovs.push({ id: fmId(), tipo: 'egreso', clase: cat === 'Publicidad redes' ? 'Marketing' : (cat === 'Operación' ? 'Operación' : 'Gastos fijos'), categoria: cat, pais, moneda: cur, periodo: ym, dia: between(1, 28), beneficiario: cat, concepto: cat, valor: real, pendiente: 0, estado: recaudadoMes ? 'pagado' : (rnd() > .6 ? 'pendiente' : 'pagado'), obs: '' });
      });
      if (acr && acr.saldo > 0 && back < 11 && rnd() > .4) {
        const cuota = Math.round(Math.min(acr.saldo, between(800, 2200) * k));
        finmovs.push({ id: fmId(), tipo: 'egreso', clase: 'Devolución de préstamo', pais, moneda: cur, periodo: ym, dia: between(20, 28), beneficiario: acr.nombre, acreedorId: acr.id, concepto: 'Abono a financiación', valor: cuota, pendiente: 0, estado: 'pagado', obs: 'Amortización' });
        acr.saldo = Math.max(0, acr.saldo - cuota);
      }
    });
  }
  const ymNow = iso(NOW).slice(0, 7);
  ['GT', 'CO'].forEach(pais => { PPTO[pais].forEach(([cat, val]) => presupuesto.push({ id: 'ppt' + (presupuesto.length + 1), pais, periodo: ymNow, categoria: cat, clase: cat === 'Publicidad redes' ? 'Marketing' : (cat === 'Operación' ? 'Operación' : 'Gastos fijos'), monto: val })); });

  // ====================================================================
  //  CORREO — bandeja demo (Outlook/Gmail) con vínculos a entidades
  // ====================================================================
  const correos = [];
  const asuntos = [
    ['Cotización Auto — pendiente de su confirmación', 'cliente', 'cotiza'],
    ['Aviso de vencimiento de prima', 'cobro', 'cobro'],
    ['Documentos para emisión de póliza', 'poliza', 'doc'],
    ['Respuesta de la aseguradora · reclamo', 'aseguradora', 'reclamo'],
    ['Renovación próxima — propuesta adjunta', 'poliza', 'renov'],
    ['Solicitud de actualización de datos', 'cliente', 'gestion'],
    ['Confirmación de pago recibido', 'cobro', 'pago'],
    ['Planilla de comisiones del mes', 'aseguradora', 'comision']
  ];
  let coN = 0;
  for (let i = 0; i < 14; i++) {
    coN++;
    const cli = pick(clientes);
    const a = pick(asuntos);
    const entrante = rnd() > .4;
    const asg = pick(aseguradoras.filter(x => x.pais === cli.pais).length ? aseguradoras.filter(x => x.pais === cli.pais) : aseguradoras);
    const pol = polizas.filter(p => p.clienteId === cli.id)[0];
    const vinc = a[1] === 'aseguradora'
      ? { tipo: 'aseguradora', id: asg.id, label: asg.nombre }
      : a[1] === 'poliza' && pol ? { tipo: 'poliza', id: pol.id, label: pol.numero }
      : a[1] === 'cobro' && pol ? { tipo: 'cobro', id: '', label: 'Recibo de ' + cli.nombre, clienteId: cli.id }
      : { tipo: 'cliente', id: cli.id, label: cli.nombre };
    correos.push({
      id: 'eml' + coN,
      asunto: a[0],
      de: entrante ? (cli.email || (cli.nombre.toLowerCase().replace(/[^a-z]/g, '.') + '@correo.com')) : 'equipo@democorredores.com',
      para: entrante ? 'equipo@democorredores.com' : (cli.email || 'cliente@correo.com'),
      remitenteNombre: entrante ? cli.nombre : 'Equipo Orbit',
      direccion: entrante ? 'entrante' : 'saliente',
      fecha: iso(addDays(NOW, -between(0, 20))),
      hora: String(between(8, 18)).padStart(2, '0') + ':' + String(between(0, 59)).padStart(2, '0'),
      leido: entrante ? rnd() > .4 : true,
      destacado: rnd() > .8,
      cuerpo: cuerpoCorreo(a[2], cli),
      clienteId: cli.id,
      adjuntos: rnd() > .5 ? [pick(['cotizacion.pdf', 'poliza.pdf', 'recibo.pdf', 'planilla.xlsx', 'cedula.jpg'])] : [],
      vinculo: vinc,
      carpeta: entrante ? 'recibidos' : 'enviados'
    });
  }
  function cuerpoCorreo(t, cli) {
    const m = {
      cotiza: 'Estimado/a ' + cli.nombre + ', adjunto la cotización solicitada. Quedo atento/a a sus comentarios para avanzar con la emisión.',
      cobro: 'Le recordamos que su prima vence próximamente. Puede realizar el pago por los canales habituales o responder este correo para coordinar.',
      doc: 'Para completar la emisión necesitamos los siguientes documentos. Por favor responda adjuntándolos.',
      reclamo: 'En atención a su reclamo, la aseguradora informa que el caso fue recibido y está en análisis. Le mantendremos informado.',
      renov: 'Su póliza está próxima a renovar. Adjuntamos la propuesta de renovación con las mejoras de cobertura disponibles.',
      gestion: 'Solicitamos amablemente actualizar sus datos de contacto para mantener su expediente al día.',
      pago: 'Confirmamos la recepción de su pago. Gracias por su preferencia.',
      comision: 'Adjuntamos la planilla de comisiones correspondiente al periodo para su conciliación.'
    };
    return m[t] || 'Mensaje de seguimiento.';
  }

  // novedades / incentivos
  const novedades = [
    { id: 'nov1', tipo: 'incentivo', titulo: '🏆 Incentivo de junio: bono por 10 pólizas Auto', detalle: 'Cierra 10 pólizas de Auto este mes y gana un bono del 5% adicional sobre comisión.', autor: 'Paula Osorio', fecha: iso(addDays(NOW, -2)), prioridad: true },
    { id: 'nov2', tipo: 'producto', titulo: '🆕 Nuevo producto: Salud Premium de MundoSeguro', detalle: 'Cobertura internacional y sin deducible en red preferente. Material comercial en Academia.', autor: 'Dirección', fecha: iso(addDays(NOW, -5)), prioridad: false },
    { id: 'nov3', tipo: 'aviso', titulo: '📢 Cierre de mes: subir gestiones antes del 30', detalle: 'Recuerden dejar todas las gestiones y recaudos cargados antes del cierre.', autor: 'Finanzas', fecha: iso(addDays(NOW, -1)), prioridad: false }
  ];

  // ====================================================================
  //  MARKETING — calendario de contenidos (redes) por día
  // ====================================================================
  const contenidos = [];
  const MK_CANALES = ['LinkedIn', 'Facebook', 'Instagram', 'WhatsApp', 'TikTok'];
  const MK_TIPOS = ['Texto', 'Carrusel', 'Reel', 'Historia', 'Video'];
  const MK_ENFOQUES = ['Seguros / Riesgos', 'Servicio al cliente', 'Logística', 'Educativo', 'Tendencias', 'Normativa', 'Prospecting'];
  const MK_ESTADOS = ['Idea', 'Programado', 'Publicado'];
  const mkTitulos = [
    ['🚢 Más control en puerto: ¿y eso qué tiene que ver contigo?', 'Logística'],
    ['📈 Tendencias 2026 en seguros (LatAm): 3 decisiones', 'Tendencias'],
    ['🤝 Servicio al cliente que fideliza: 3 claves', 'Servicio al cliente'],
    ['🚚 Seguro de transporte: 5 preguntas que evitan sorpresas', 'Seguros / Riesgos'],
    ['⚖️ Por qué trabajar con un intermediario registrado', 'Normativa'],
    ['📜 Derecho + CX: una promesa clara evita conflictos', 'Educativo'],
    ['🔐 Riesgos 2026: ciber y AI ya están en el top', 'Prospecting'],
    ['🌧️ El clima ya es riesgo financiero', 'Seguros / Riesgos'],
    ['📡 Seguro paramétrico: pago rápido por evento', 'Tendencias'],
    ['📦 E-commerce 2026: crece pero la lealtad se pierde', 'Servicio al cliente']
  ];
  let mkn = 0;
  const NOWmk = NOW;
  for (let i = 0; i < 18; i++) {
    mkn++;
    const dia = addDays(new Date(NOWmk.getFullYear(), NOWmk.getMonth(), 1), between(0, 27));
    const t = pick(mkTitulos);
    const pub = dia < NOWmk;
    contenidos.push({
      id: 'mk' + mkn, fecha: iso(dia), canal: pick(MK_CANALES), tipo: pick(MK_TIPOS),
      enfoque: t[1], titulo: t[0],
      copy: 'Te comparto algo en palabras simples sobre ' + t[1].toLowerCase() + '. La idea es aportar valor real y claridad, sin tecnicismos.',
      cta: pick(['Escríbeme CHECKLIST por WhatsApp', 'Agenda una revisión express', 'Comenta SEGUROS y te envío la guía', 'Solicita tu cotización sin enredos']),
      hashtags: pick(['#Seguros #GestiónDeRiesgos #Guatemala', '#CX #CustomerExperience #LatAm', '#Logística #TransporteDeCarga #Empresas']),
      estado: pub ? 'Publicado' : (rnd() > .4 ? 'Programado' : 'Idea'),
      hora: String(between(8, 18)).padStart(2, '0') + ':' + pick(['00', '10', '30', '45']),
      stats: pub ? { alcance: between(300, 4200), interac: between(12, 280), leads: between(0, 9) } : null
    });
  }

  // ====================================================================
  //  SINIESTROS / RECLAMOS — por póliza, con bitácora y correos
  // ====================================================================
  const reclamos = [];
  const RC_ESTADOS = ['Reportado', 'En análisis', 'Documentación', 'Aprobado', 'Pagado', 'Rechazado'];
  const RC_TIPOS = { Auto: ['Colisión', 'Robo total', 'Daños a terceros', 'Cristales'], Hogar: ['Incendio', 'Robo', 'Daño por agua'], 'Gastos Médicos': ['Hospitalización', 'Consulta', 'Cirugía'], Vida: ['Indemnización'], Daños: ['Daño material', 'Rotura de maquinaria'], RC: ['Reclamo de tercero'] };
  let rcn = 0;
  polizas.filter(p => p.estado !== 'Cancelada').forEach(p => {
    if (rnd() > 0.22) return; // ~22% de pólizas con reclamo
    rcn++;
    const tipos = RC_TIPOS[p.ramo] || ['Reclamo general'];
    const est = pick(RC_ESTADOS);
    const cli = clientes.find(c => c.id === p.clienteId);
    const fecha = iso(addDays(NOW, -between(2, 90)));
    const monto = Math.round((p.sumaAsegurada || p.primaNeta * 20) * (0.05 + rnd() * 0.4));
    const bit = [{ ts: fecha + ' 09:30', user: cli ? cli.nombre : 'Cliente', t: 'Reclamo reportado', d: 'El cliente notifica el siniestro.' }];
    if (['En análisis', 'Documentación', 'Aprobado', 'Pagado', 'Rechazado'].includes(est)) bit.push({ ts: iso(addDays(new Date(fecha), 2)) + ' 11:00', user: 'Equipo', t: 'Enviado a aseguradora', d: 'Expediente remitido para análisis.' });
    if (['Aprobado', 'Pagado'].includes(est)) bit.push({ ts: iso(addDays(new Date(fecha), 12)) + ' 15:20', user: 'Aseguradora', t: 'Reclamo aprobado', d: 'Procede indemnización por ' + monto + '.' });
    if (est === 'Pagado') bit.push({ ts: iso(addDays(new Date(fecha), 20)) + ' 10:00', user: 'Aseguradora', t: 'Indemnización pagada', d: 'Pago realizado al asegurado.' });
    if (est === 'Rechazado') bit.push({ ts: iso(addDays(new Date(fecha), 10)) + ' 16:40', user: 'Aseguradora', t: 'Reclamo rechazado', d: 'Causa fuera de cobertura.' });
    reclamos.push({
      id: 'rec' + rcn, polizaId: p.id, clienteId: p.clienteId, aseguradoraId: p.aseguradoraId, asesorId: p.asesorId,
      ramo: p.ramo, tipo: pick(tipos), estado: est, numero: 'SIN-' + between(10000, 99999),
      fecha, montoReclamado: monto, montoAprobado: ['Aprobado', 'Pagado'].includes(est) ? monto : 0,
      descripcion: 'Siniestro de ' + p.ramo.toLowerCase() + ' reportado por el cliente.',
      bitacora: bit, correos: [], docs: rnd() > .5 ? ['denuncia.pdf', 'fotos_daños.jpg'] : [], actualizado: iso(NOW)
    });
  });

  // ====================================================================
  //  ACADEMIA — cursos / bloques de capacitación con progreso
  // ====================================================================
  const cursos = [
    { id: 'cur1', titulo: 'Inducción Orbit 360', cat: 'Inducción', emoji: '🚀', color: '#C5162E', desc: 'Conoce la plataforma, el ciclo comercial y tu día a día.', lecciones: [{ t: 'Bienvenida y visión 360', min: 8, tipo: 'lectura', texto: '🌅 BIENVENIDA A ORBIT 360\n\nOrbit 360 es el sistema 360 inteligente e integral para intermediarios de seguros. Una sola plataforma que centraliza TODA la operación comercial, administrativa y financiera.\n\n💡 LA VISIÓN\nDeja de buscar información en Excel, WhatsApp, correos y PDFs separados. Orbit 360 conecta todo: desde el primer contacto con un prospecto hasta el pago de la última cuota y la renovación de la póliza.\n\n🎯 QUÉ RESUELVE ORBIT 360\n• 🔍 Búsqueda instantánea: encuentra cualquier cliente, póliza o recibo en segundos\n• 🔄 Sincronización en vivo: el equipo y los asesores ven la misma información actualizada\n• 🤖 Automatización: cadencias de cobro y renovación sin intervención manual\n• 📊 Analítica real: decisiones basadas en datos, no en suposiciones\n• 🌍 Multi-país: GT y CO con monedas, tasas e IVA configurados\n• 🏢 Multi-aseguradora: todas tus vinculaciones en un directorio unificado\n\n👥 DISEÑADO PARA CADA ROL\n• Dirección: visión total de la empresa con analítica profunda\n• Asesores: su pipeline y cartera sin entrar al sistema operativo\n• Administrativo: cobros, liquidaciones y finanzas\n• Marketing: calendario de contenidos y automatización\n• Clientes: portal self-service con sus pólizas y pagos\n\n🚀 PRÓXIMOS PASOS\nContinúa con las siguientes lecciones para dominar cada módulo. Al completar el curso obtendrás tu certificado de Orbit 360.' }, { t: 'Navegación y módulos', min: 12, tipo: 'lectura', texto: '🗺️ NAVEGACIÓN DE ORBIT 360\n\nEl menú lateral organiza la plataforma en grupos:\n\n⚙️ OPERACIÓN\n• 📅 Cronograma: tu agenda diaria con vencimientos de cobros, renovaciones y tareas\n• 🗂 Orbit Ops: tablero interno del equipo (gestiones, cotizaciones, emisiones)\n• 🎯 Orbit Leads: pipeline comercial del asesor\n• 🧮 Cotizador y Comparativo: cotiza con tus aseguradoras y compara propuestas\n• 🏢 Orbit Aseguradoras: directorio con fichas completas, tarifas, contactos y documentos\n\n🧑‍💼 CRM\n• Clientes 360, Pólizas, Cobros y cartera, Renovaciones, Cancelaciones, Siniestros, Comisiones, Historial\n\n📊 ANALÍTICA\n• Orbit Insights: 9 vistas con comparativos interanuales, KPIs clicables, producción nueva vs renovada\n\n💰 FINANZAS\n• Movimientos, Dashboard, CxC/CxP, Financiación, Presupuesto, Liquidaciones, Conciliación, Análisis IA\n\n✉️ COMUNICACIÓN\n• Correo integrado (Outlook/Gmail), Notificaciones WA\n\n📚 ACADEMIA Y RECURSOS\n• 🎓 Orbit Academia: cursos, certificaciones y recursos por rol\n• 📣 Orbit Marketing: calendario de contenidos con IA y automatización\n• 📊 Reportes exportables\n• 🤖 Orbit IA (Gemini): asistente en todos los módulos\n\n⚙️ ADMINISTRACIÓN\n• 👥 Equipo y permisos, Configuración, 🚪 Portal del Cliente\n\n🔧 TOPBAR\n• 👁 Ver como: cambia de rol para ver la plataforma como cada usuario\n• ✉ Correo: badge de no leídos\n• 🔔 Novedades\n• Selector de país: filtra toda la operación por GT o CO' }, { t: 'Ciclo Ops ↔ Leads', min: 15, tipo: 'lectura', texto: '🔄 CICLO COMERCIAL OPS ↔ LEADS\n\nUn mismo negocio se proyecta EN VIVO en dos tableros. Cambiar la etapa en uno se refleja inmediatamente en el otro.\n\n🗂 ORBIT OPS (equipo interno)\nSolo lo ve el equipo. Aquí viven:\n• Gestiones Admin (actualizaciones, endosos, cartas)\n• Cotizaciones (cuando el cliente pide precio)\n• Inspecciones (verificación del riesgo)\n• Emisiones (preparar la póliza)\n• Renovaciones/Modificaciones\n\n🎯 ORBIT LEADS (asesor)\nPipeline comercial con etapas: Nuevo → Contactado → Cotizando → Propuesta → Negociación → Inspección → Emisión → Cierre.\n\n⚡ AUTOMATIZACIONES DEL CICLO\n• Al pasar a Propuesta: se activa automáticamente la cadencia de seguimiento (WhatsApp → correo).\n• Al cotizar: se genera el N.º de cotización.\n• Al llegar a Negociación: elige si va a Inspección (requiere visita) o Emisión directa.\n• Al Emitir: se CREA el cliente automáticamente, hereda todos los datos del negocio y se activa la cadencia de encuestas de satisfacción.\n\n💡 CÓMO CREAR UN NUEVO NEGOCIO\n1. Orbit Ops → + Nuevo ingreso (si el cliente pide cotización directamente)\n2. Orbit Leads → + Nuevo lead (si es un interés comercial a desarrollar)\nAmbos fluyen al mismo pipeline.' }, { t: 'Módulo CRM completo (interactivo)', min: 20, tipo: 'lectura', iframeSrc: 'docs/capacitacion-crm.html', texto: '' }, { t: 'Evaluación de inducción', min: 10, tipo: 'quiz', preguntas: [
        { p: '¿Cuál es la diferencia entre Orbit Ops y Orbit Leads?', ops: ['Son el mismo módulo con diferente nombre', 'Ops es el tablero interno del equipo; Leads es el pipeline del asesor. Comparten el mismo negocio sincronizado en vivo', 'Ops es para clientes nuevos y Leads para renovaciones'], ok: 1 },
        { p: '¿Qué ocurre al marcar un negocio como "Emitido"?', ops: ['Se archiva el negocio y se borra del pipeline', 'Se crea automáticamente el cliente y se activa la cadencia de encuestas de satisfacción', 'Pasa a una lista de pendientes sin más acción'], ok: 1 },
        { p: 'En Guatemala, ¿sobre qué se calcula el IVA de una póliza?', ops: ['Sobre la prima neta únicamente', 'Sobre la base gravable (prima neta + gastos de emisión + gastos financieros + otros)', 'Sobre el total ya con todos los gastos incluidos'], ok: 1 },
        { p: '¿Cómo se deben ver los recibos de un cliente con 3 pólizas?', ops: ['Todos mezclados en una sola lista por fecha', 'Usando el filtro por póliza para ver los recibos de cada contrato por separado', 'Buscando manualmente en el módulo global de Cobros'], ok: 1 },
        { p: '¿Qué hace el importador inteligente al cargar documentos del cliente?', ops: ['Solo guarda el PDF sin extraer datos', 'Extrae datos (póliza, vehículo, DPI) y complementa la ficha sin duplicar registros existentes', 'Envía el documento al correo del asesor'], ok: 1 },
        { p: '¿Qué canal usan las cadencias automáticas de seguimiento por defecto?', ops: ['Siempre llamada telefónica', 'WhatsApp primero; correo en ausencia de número de WA', 'Correo siempre, independiente del canal del cliente'], ok: 1 }
      ] }], progreso: 100, certificado: true, recursos: [{ nombre: 'Manual de inducción.pdf', tipo: 'pdf' }, { nombre: 'Mapa de módulos.png', tipo: 'img' }], destinatarios: 'equipo' },
    { id: 'cur2', titulo: 'Fundamentos de Seguros', cat: 'Técnico', emoji: '🛡️', color: '#1f3a5f', desc: 'Ramos, coberturas, prima, deducible y siniestros.', destinatarios: 'equipo', lecciones: [
      { t: 'Qué es un seguro', min: 10, tipo: 'lectura', secciones: [
        { icon: '🛡️', t: '¿Qué es un seguro?', color: '#1f3a5f', d: 'Un seguro es un contrato (póliza) por el cual una aseguradora se compromete a indemnizar al asegurado ante un riesgo cubierto, a cambio de una prima. Convierte una pérdida grande e incierta en un costo pequeño y predecible.' },
        { icon: '⚖️', t: 'El principio de mutualidad', color: '#2563a8', d: 'Muchos asegurados aportan primas a un fondo común. Con ese fondo se pagan los siniestros de los pocos que sufren una pérdida. Así se reparte el riesgo entre todos: nadie enfrenta solo una catástrofe financiera.' },
        { icon: '🤝', t: 'El rol del intermediario', color: '#1f8a4c', d: 'El corredor/agente asesora al cliente, identifica sus riesgos, cotiza con varias aseguradoras, gestiona la emisión, los cobros, las renovaciones y acompaña en el siniestro. Es el puente de confianza entre cliente y aseguradora.' },
        { icon: '💡', t: 'Conceptos clave', color: '#c9821b', d: '• Asegurado: quien recibe la protección.\n• Tomador: quien contrata y paga.\n• Beneficiario: quien recibe la indemnización.\n• Riesgo: el evento incierto que se cubre.\n• Prima: el precio del seguro.\n• Suma asegurada: el monto máximo a indemnizar.' }
      ] },
      { t: 'Ramos y subramos', min: 14, tipo: 'lectura', secciones: [
        { icon: '🚗', t: 'Ramo Autos / Vehículos', color: '#C5162E', d: 'Cubre el vehículo y la responsabilidad civil frente a terceros. Subramos: liviano, pesado, motos, RC, pérdidas totales/parciales, por kilómetros. En Colombia el SOAT es obligatorio y se complementa con todo riesgo.' },
        { icon: '❤️', t: 'Ramo Vida y Personas', color: '#1f8a4c', d: 'Protege a la familia ante fallecimiento o incapacidad del asegurado. Subramos: vida individual, vida grupo, accidentes personales. Suele tener componente de ahorro en modalidades dotales.' },
        { icon: '🏥', t: 'Ramo Gastos Médicos / Salud', color: '#2563a8', d: 'Cubre gastos hospitalarios y médicos. Subramos: individual, familiar, colectivo (empresas). Variables clave: suma asegurada, deducible, coaseguro y red de hospitales.' },
        { icon: '🏠', t: 'Ramo Daños / Patrimoniales', color: '#c9821b', d: 'Hogar, multirriesgo empresarial, incendio, robo, equipo electrónico, transporte. Protege bienes e inventarios. Suelen requerir inspección previa para sumas altas.' },
        { icon: '📋', t: 'Ramo Fianzas / Cumplimiento', color: '#6b4ea0', d: 'Garantiza el cumplimiento de obligaciones contractuales (cumplimiento, anticipo, calidad, seriedad de oferta). Muy usado en licitaciones y contratos con el Estado.' }
      ] },
      { t: 'Prima, deducible y coberturas', min: 16, tipo: 'lectura', secciones: [
        { icon: '💰', t: 'Composición de la prima', color: '#1f3a5f', d: 'Prima total = Prima neta + Gastos de emisión + Recargo por fraccionamiento + Asistencias + IVA. La PRIMA NETA es la base sobre la que se calculan comisiones, metas y producción.' },
        { icon: '🧾', t: 'Impuestos por país', color: '#2563a8', d: 'Guatemala: IVA 12% + gastos de emisión típicos del 5% de la prima neta. Colombia: IVA 19%. Estos valores son configurables por país en Orbit, y al importar una póliza se desglosan automáticamente.' },
        { icon: '🛡️', t: 'Deducible', color: '#c9821b', d: 'Es la parte del siniestro que asume el asegurado antes de que la aseguradora pague. A mayor deducible, menor prima (y viceversa). Ej: deducible del 1% sobre el valor asegurado en autos.' },
        { icon: '📑', t: 'Coberturas y exclusiones', color: '#C5162E', d: 'La cobertura define QUÉ se paga; las exclusiones, qué NO. Leer siempre las condiciones particulares: límites, sublímites, periodos de carencia y coaseguro. El asesor debe explicarlas en lenguaje simple.' }
      ] },
      { t: 'Proceso de siniestro', min: 12, tipo: 'lectura', secciones: [
        { icon: '📞', t: '1 · Aviso del siniestro', color: '#C5162E', d: 'El cliente reporta el evento. El asesor abre el reclamo en Orbit (módulo Siniestros / ficha del cliente), registra fecha, tipo y descripción, y orienta sobre la documentación requerida.' },
        { icon: '📂', t: '2 · Documentación y ajuste', color: '#c9821b', d: 'Se reúnen documentos (denuncia, facturas, fotos). La aseguradora asigna un ajustador que evalúa el daño y determina la procedencia y el monto indemnizable.' },
        { icon: '💵', t: '3 · Resolución e indemnización', color: '#1f8a4c', d: 'La aseguradora aprueba, objeta o rechaza. Si aprueba, paga la indemnización menos el deducible. Todo el avance queda en la bitácora del reclamo, visible para el cliente en su portal.' },
        { icon: '🔁', t: '4 · Seguimiento y cierre', color: '#2563a8', d: 'El asesor da seguimiento hasta el pago y cierra el reclamo. Un buen manejo del siniestro es el momento de mayor fidelización: el cliente comprueba el valor real del seguro.' }
      ] },
      { t: 'Evaluación técnica', min: 15, tipo: 'quiz', preguntas: [
        { p: '¿Sobre qué base se calculan comisiones, metas y producción en Orbit?', ops: ['Prima total con impuestos', 'Prima NETA recaudada', 'Suma asegurada'], ok: 1 },
        { p: '¿Qué es el deducible?', ops: ['Un impuesto sobre la prima', 'La parte del siniestro que asume el asegurado antes de que pague la aseguradora', 'La comisión del asesor'], ok: 1 },
        { p: '¿Cuál es el IVA de seguros en Colombia?', ops: ['12%', '19%', '0%'], ok: 1 },
        { p: '¿Cuál es el primer paso del proceso de siniestro?', ops: ['El pago de la indemnización', 'El aviso/reporte del siniestro', 'La renovación de la póliza'], ok: 1 }
      ] }
    ], progreso: 60, certificado: false, recursos: [{ nombre: 'Glosario de seguros.pdf', tipo: 'pdf' }, { nombre: 'Tabla de ramos por país.pdf', tipo: 'pdf' }] },
    { id: 'cur3', titulo: 'Ventas Consultivas', cat: 'Comercial', emoji: '🎯', color: '#1f8a4c', desc: 'Prospección, descubrimiento de necesidades y cierre.', destinatarios: 'equipo', lecciones: [
      { t: 'Prospección efectiva', min: 12, tipo: 'lectura', secciones: [
        { icon: '🎯', t: 'Define tu cliente ideal', color: '#1f8a4c', d: 'No todos los prospectos valen lo mismo. Define perfiles: por ramo, por capacidad de pago, por potencial de multiventa. En Orbit, el canal de ingreso (referido, redes, cliente actual) te dice de dónde viene tu mejor negocio.' },
        { icon: '🔗', t: 'Fuentes de prospección', color: '#2563a8', d: 'Referidos (la mejor fuente), base de clientes actuales (multiventa y cross-sell), redes sociales, alianzas. Registra TODO prospecto como negocio en Orbit Leads para no perder seguimiento.' },
        { icon: '📊', t: 'El embudo en Orbit Leads', color: '#c9821b', d: 'Nuevo → Contactado → Cotizado → Propuesta → Negociación → Cierre. Mide tu tasa de conversión entre etapas para saber dónde se te caen los negocios y enfocar esfuerzo.' }
      ] },
      { t: 'Preguntas de descubrimiento', min: 10, tipo: 'lectura', secciones: [
        { icon: '❓', t: 'Vender es preguntar, no hablar', color: '#1f8a4c', d: 'El asesor consultivo dedica el 70% del tiempo a entender al cliente. Las mejores ventas nacen de buenas preguntas, no de buenos discursos.' },
        { icon: '🔍', t: 'Preguntas que descubren necesidad', color: '#2563a8', d: '• ¿Qué pasaría con tu familia/negocio si...?\n• ¿Tienes hoy alguna protección? ¿Sabes qué cubre?\n• ¿Cuál es tu mayor preocupación financiera?\n• ¿Has tenido algún siniestro antes?' },
        { icon: '💡', t: 'De la necesidad a la solución', color: '#c9821b', d: 'Conecta cada cobertura con un dolor real del cliente. No vendas "todo riesgo": vende "tranquilidad si chocas y no tienes para reparar". Habla de beneficios, no de características.' }
      ] },
      { t: 'Manejo de objeciones', min: 14, tipo: 'lectura', secciones: [
        { icon: '🛑', t: '"Está muy caro"', color: '#C5162E', d: 'No bajes el precio: sube el valor. Reencuadra el costo diario ("son Q5 al día por proteger tu auto") y compáralo con el costo de NO tener seguro. Ofrece fraccionamiento.' },
        { icon: '⏳', t: '"Déjame pensarlo"', color: '#c9821b', d: 'Casi siempre esconde una duda no resuelta. Pregunta: "¿Qué te genera duda para decidir hoy?". Resuelve la objeción real en lugar de presionar.' },
        { icon: '🤷', t: '"Ya tengo seguro"', color: '#2563a8', d: 'Perfecto: ofrécele una revisión gratuita de su póliza actual. Casi siempre encontrarás coberturas faltantes o mejor precio. Es la puerta de entrada al cliente.' }
      ] },
      { t: 'Técnicas de cierre', min: 12, tipo: 'lectura', secciones: [
        { icon: '✅', t: 'Cierre por resumen', color: '#1f8a4c', d: 'Recapitula los beneficios acordados y asume el siguiente paso: "Entonces te emito la cobertura X con pago mensual, ¿te parece bien que iniciemos hoy?".' },
        { icon: '⚡', t: 'Cierre por urgencia real', color: '#c9821b', d: 'Usa hechos reales, no presión falsa: vigencia de la cotización, cambio de tarifa, exposición sin cobertura mientras no firme. La urgencia honesta acelera la decisión.' },
        { icon: '🔁', t: 'Después del cierre: la cadencia', color: '#2563a8', d: 'Al emitir, Orbit crea el cliente y activa la cadencia de satisfacción. El cierre no es el final: es el inicio de la renovación del próximo año y de la multiventa.' }
      ] }
    ], progreso: 25, certificado: false, recursos: [{ nombre: 'Guion de descubrimiento.pdf', tipo: 'pdf' }, { nombre: 'Manejo de objeciones.pdf', tipo: 'pdf' }] },
    { id: 'cur4', titulo: 'Producto: Auto', cat: 'Producto', emoji: '🚗', color: '#c9821b', desc: 'Cobertura, tarifas y argumentos de venta de Auto.', destinatarios: 'equipo', lecciones: [
      { t: 'Coberturas de Auto', min: 10, tipo: 'lectura', secciones: [
        { icon: '🚗', t: 'Cobertura amplia (todo riesgo)', color: '#C5162E', d: 'Cubre daños al propio vehículo (colisión, vuelco, incendio, robo) + responsabilidad civil + asistencias. Es la cobertura más completa y la de mayor prima.' },
        { icon: '🛡️', t: 'Responsabilidad Civil', color: '#2563a8', d: 'Cubre daños que tu vehículo causa a terceros (personas y bienes). En Colombia el SOAT es obligatorio para lesiones; la RC voluntaria amplía límites y daños materiales.' },
        { icon: '🔧', t: 'Coberturas adicionales', color: '#1f8a4c', d: 'Asistencia vial, vehículo sustituto, gastos legales, accidentes a ocupantes, pérdida parcial vs total. Cada aseguradora arma su paquete: conoce las de tus aliadas.' },
        { icon: '⚙️', t: 'Variables que mueven la prima', color: '#c9821b', d: 'Valor y año del vehículo, uso (particular/comercial), zona de circulación, edad del conductor, historial de siniestros y deducible elegido.' }
      ] },
      { t: 'Cómo cotizar en Orbit', min: 12, tipo: 'lectura', secciones: [
        { icon: '🧮', t: 'Usa el Cotizador', color: '#c9821b', d: 'En Orbit Cotizador eliges país, ramo Auto, valor asegurado, año y datos del vehículo. El motor calcula con las tarifas de TUS aseguradoras (configurables) o ingresas la prima manual.' },
        { icon: '📊', t: 'Compara y elige', color: '#2563a8', d: 'Genera cotizaciones con varias aseguradoras, marca las que quieras imprimir (en el formato de cada aseguradora) y deriva las elegidas al Comparativo para presentar al cliente.' },
        { icon: '📄', t: 'Propuestas sin tarifa', color: '#1f8a4c', d: 'Si una aseguradora no tiene tarifa cargada, sube su PDF de propuesta directamente al Comparativo. Así comparas todas las opciones aunque no todas estén tarifadas.' }
      ] },
      { t: 'Argumentario de venta', min: 8, tipo: 'lectura', secciones: [
        { icon: '💬', t: 'El argumento del valor', color: '#1f8a4c', d: '"Tu auto vale Q120,000. Por menos de lo que gastas en combustible en un mes, proteges esa inversión y a tu familia. Si chocas, no pones tu ahorro en riesgo."' },
        { icon: '🎯', t: 'Diferénciate por servicio', color: '#2563a8', d: 'El precio lo iguala cualquiera. Tú ofreces acompañamiento en el siniestro, gestión de cobros, recordatorios de renovación y un portal donde el cliente ve todo. Vende la relación, no la póliza.' }
      ] }
    ], progreso: 0, certificado: false, recursos: [{ nombre: 'Coberturas Auto por aseguradora.pdf', tipo: 'pdf' }] },
    
    { id: 'cur6', titulo: 'Orbit Leads para Asesores', cat: 'Comercial', emoji: '🎯', color: '#2563a8', desc: 'Domina el pipeline comercial: prospectar, cotizar, negociar y cerrar.', destinatarios: 'Asesor', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Guion de descubrimiento.pdf', tipo: 'pdf' }, { nombre: 'Manejo de objeciones.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'El ciclo del prospecto', min: 10, tipo: 'lectura', secciones: [
          { icon: '🎯', t: 'Las 8 etapas', color: '#2563a8', d: 'Cada prospecto recorre: Nuevo → Contactado → Cotizando → Propuesta enviada → Negociación → Inspección → Emisión → Emitido. El pipeline en Orbit Leads muestra en qué etapa está cada negocio y qué falta para avanzar.' },
          { icon: '🚪', t: '¿Cómo entra un prospecto?', color: '#1f8a4c', d: 'Lead directo: el cliente pide precio sin datos completos → entra en "Nuevo". Desde Ops (cotización técnica): el equipo ya tiene los datos y cotiza → entra en "Cotizando". En ambos casos el asesor lo trabaja desde Leads.' },
          { icon: '🏁', t: 'Qué hacer en cada etapa', color: '#C5162E', d: 'Nuevo: agenda el primer contacto. Contactado: registra resultado y compromisos. Cotizando: pide cotización a Ops o usa el Cotizador. Propuesta: envía la propuesta personalizada. Negociación: resuelve objeciones. Inspección/Emisión: coordina con la aseguradora. Emitido: ¡ganado! El cliente se crea automáticamente.' }
        ]},
        { t: 'Cadencias de seguimiento automático', min: 8, tipo: 'lectura', secciones: [
          { icon: '🔁', t: 'Qué dispara la cadencia', color: '#2563a8', d: 'Al pasar a "Propuesta", Orbit activa la cadencia: Día 1 WhatsApp de bienvenida, Día 3 seguimiento, Día 7 correo con propuesta, Día 14 mensaje de cierre. Todo queda registrado en el negocio.' },
          { icon: '📲', t: 'Canal inteligente', color: '#1f8a4c', d: 'Si el cliente tiene WhatsApp, se usa WA primero; si no, correo. No se generan llamadas automáticas: tú decides cuándo llamar. Puedes añadir tareas manuales al cronograma para un seguimiento más personal.' },
          { icon: '📉', t: 'Aprende de lo perdido', color: '#C5162E', d: 'Marca un negocio como "Perdido" con su motivo. La analítica de motivos de pérdida te dice dónde mejorar (precio, tiempo de respuesta, cobertura).' }
        ]},
        { t: 'Manejo de objeciones y cierre', min: 9, tipo: 'lectura', secciones: [
          { icon: '💬', t: 'La objeción es información', color: '#2563a8', d: 'No es un "no", es pedir más datos. "Está caro" → reencuadra a valor. "Lo voy a pensar" → ¿qué falta para decidir hoy? "Ya tengo seguro" → ofrece revisión gratuita. "No me alcanza" → fracciona o escalona la cobertura.' },
          { icon: '🎯', t: 'Técnicas de cierre', color: '#1f8a4c', d: 'Cierre por alternativa (¿amplia o RC ampliada?), por urgencia real (la condición vence el {fecha}), por resumen (recapitula beneficios y pide la decisión).' },
          { icon: '📝', t: 'Registra todo', color: '#C5162E', d: 'Cada objeción y compromiso va en la nota del negocio. Esa trazabilidad alimenta la analítica y te hace mejor vendedor con el tiempo.' }
        ]},
        { t: 'Gestionar mi pipeline', min: 8, tipo: 'quiz', preguntas: [
          { p: '¿Dónde ve el asesor su pipeline comercial?', ops: ['En Orbit Ops', 'En Orbit Leads', 'En Clientes 360'], ok: 1 },
          { p: '¿Qué activa pasar a la etapa "Propuesta"?', ops: ['Una llamada telefónica', 'La cadencia automática de seguimiento (WA/correo)', 'Un email manual'], ok: 1 },
          { p: '¿Qué pasa cuando el negocio llega a "Emitido"?', ops: ['Se archiva y no pasa nada', 'Hay que crear el cliente a mano', 'Se crea el cliente automáticamente y arranca la cadencia de encuestas'], ok: 2 }
        ]}
      ] },
    { id: 'cur7', titulo: 'Finanzas para Directores', cat: 'Finanzas', emoji: '💰', color: '#c9821b', desc: 'Control financiero completo: movimientos, liquidaciones, presupuesto e IA.', destinatarios: 'Dirección', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Plantilla de presupuesto.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'Módulo Finanzas — visión general', min: 12, tipo: 'lectura', secciones: [
          { icon: '🧾', t: 'Movimientos', color: '#c9821b', d: 'Registra ingresos (comisiones de aseguradoras, incentivos) y egresos (comisiones a asesores, gastos fijos, marketing) por mes y país. Crea meses manualmente o importa el histórico con el importador inteligente.' },
          { icon: '💳', t: 'CxC / CxP y financiación', color: '#1f8a4c', d: 'Cuentas por Cobrar: comisiones facturadas sin recaudar. Cuentas por Pagar: liquidaciones de asesores pendientes (pasan al mes siguiente si no se pagan). La financiación se controla aparte para no inflar la utilidad operativa.' },
          { icon: '👥', t: 'Liquidaciones y presupuesto', color: '#C5162E', d: 'Liquidación empresa y por asesor, con botón "Preparar Lote" para revisar, ajustar y aprobar. Presupuesto mensual con semáforos verde/ámbar/rojo que alertan desviaciones.' }
        ]},
        { t: 'Leer el dashboard financiero', min: 10, tipo: 'lectura', secciones: [
          { icon: '📈', t: 'Margen operativo', color: '#c9821b', d: 'Ingresos por comisión menos egresos operativos. Si baja mes a mes, revisa gastos fijos y comisiones a asesores.' },
          { icon: '💧', t: 'Caja vs utilidad', color: '#1f8a4c', d: 'Una comisión facturada (CxC) aún no es dinero en banco. Vigila el desfase entre facturar y recaudar para no quedarte sin caja.' },
          { icon: '🔁', t: 'Comparativos', color: '#2563a8', d: 'Intermensual detecta estacionalidad (meses fuertes de renovación). Interanual mide crecimiento real vs el mismo mes del año pasado. El análisis crítico con IA sugiere metas y estrategias por área.' }
        ]},
        { t: 'Evaluación del módulo', min: 10, tipo: 'quiz', preguntas: [
          { p: '¿Dónde se registran los ingresos por financiación para que NO inflen la utilidad operativa?', ops: ['En Movimientos → Ingresos', 'En Financiación (separado de operativo)', 'En CxC como ingreso esperado'], ok: 1 },
          { p: '¿Qué son las CxP en Orbit Finanzas?', ops: ['Cobros que los clientes deben', 'Liquidaciones de asesores y egresos pendientes de pago', 'Facturas de aseguradoras no cobradas'], ok: 1 }
        ]}
      ] },
    { id: 'cur8', titulo: 'Marketing Digital para Seguros', cat: 'Marketing', emoji: '📣', color: '#6b4ea0', desc: 'Estrategia de contenidos, automatización y medición para intermediarios.', destinatarios: 'Marketing', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Parrilla de contenidos.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'El calendario de contenidos', min: 10, tipo: 'lectura', secciones: [
          { icon: '📅', t: 'Cómo funciona', color: '#6b4ea0', d: 'Abre Orbit Marketing, navega el calendario mensual y haz clic en un día para agregar contenido. Cada publicación tiene canal, tipo, enfoque, título, copy, CTA y hashtags.' },
          { icon: '🎨', t: 'Tipos de contenido', color: '#2563a8', d: 'Texto (educativo, tips, normativa), carrusel (comparativos, listas), reel (30-60s), historia (24h) y video largo (HeyGen o pantalla). Mezcla formatos para no aburrir.' },
          { icon: '🤖', t: 'Generar y automatizar', color: '#1f8a4c', d: '"Generar mes con IA" crea un mes de ideas con criterios estratégicos (segmentación, objetivos por semana, fechas clave, CTA). Metricool programa y publica; Make conecta Orbit→Canva→Metricool; las campañas de renovación se disparan solas a 30 días del vencimiento.' }
        ]},
        { t: 'Estrategia por embudo y segmento', min: 10, tipo: 'lectura', secciones: [
          { icon: '🎯', t: 'Contenido por etapa del embudo', color: '#6b4ea0', d: 'TOFU (descubrimiento): educa sobre riesgos y por qué asegurarse — reels y tips. MOFU (consideración): comparativos, casos y testimonios que generan confianza. BOFU (decisión): oferta concreta, urgencia real (vigencia), CTA de cotización. Balancea el mes: ~50% TOFU, 30% MOFU, 20% BOFU.' },
          { icon: '👥', t: 'Segmenta por perfil', color: '#2563a8', d: 'No hables igual a un dueño de auto que a una empresa. Define segmentos (auto particular, pyme, familia con GM, flotas) y adapta el mensaje, el canal y la oferta. Orbit deja etiquetar cada pieza por segmento para medir qué funciona con quién.' },
          { icon: '📆', t: 'Fechas clave y estacionalidad', color: '#1f8a4c', d: 'Anticipa: temporada de lluvias (auto/hogar), inicio de año escolar (vida/GM), cierre fiscal (empresas), fechas de renovación masiva. El calendario deja marcar campañas recurrentes que se repiten cada año.' }
        ]},
        { t: 'Medición: qué mirar y cómo mejorar', min: 9, tipo: 'lectura', secciones: [
          { icon: '📊', t: 'Métricas que importan', color: '#6b4ea0', d: 'Alcance e impresiones (visibilidad), engagement (interacción real), clics y CTR (interés), y sobre todo leads generados y costo por lead. La vanidad (likes) no paga pólizas; el pipeline sí.' },
          { icon: '🔁', t: 'Del contenido al pipeline', color: '#2563a8', d: 'Cada pieza BOFU debe llevar a una acción medible: cotizar, agendar, escribir por WhatsApp. Esos leads entran a Orbit Leads y puedes atribuir qué campaña los originó (canal de ingreso), cerrando el círculo marketing→ventas.' },
          { icon: '📈', t: 'Iterar con datos', color: '#1f8a4c', d: 'Revisa mensualmente qué formato, enfoque y segmento rindieron. Duplica lo que funciona, ajusta lo que no. El estado de cada pieza (idea→publicado→medido) te da el histórico para decidir con evidencia, no con corazonadas.' }
        ]},
        { t: 'Emojis, hashtags y copywriting', min: 8, tipo: 'quiz', preguntas: [
          { p: '¿Qué herramienta programa y publica en todas las redes desde un solo lugar?', ops: ['HeyGen', 'Metricool', 'Canva'], ok: 1 },
          { p: '¿Qué herramienta conecta Orbit → Canva → Metricool para automatizar?', ops: ['Make', 'Google Sheets', 'WhatsApp API'], ok: 0 },
          { p: '¿Qué mezcla de embudo es más sana para el mes?', ops: ['100% oferta y descuento', '~50% descubrimiento, 30% consideración, 20% decisión', 'Solo memes para viralizar'], ok: 1 },
          { p: '¿Cuál es la métrica que de verdad importa para el negocio?', ops: ['Cantidad de likes', 'Leads generados y costo por lead', 'Número de hashtags usados'], ok: 1 }
        ]}
      ] },
    { id: 'cur9', titulo: 'Portal del Cliente', cat: 'Inducción', emoji: '🚪', color: '#0f766e', desc: 'Guía para clientes: cómo usar su portal, ver pólizas, pagar y solicitar gestiones.', destinatarios: 'clientes', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Guía rápida del portal.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'Bienvenida a tu portal', min: 6, tipo: 'lectura', secciones: [
          { icon: '📑', t: 'Tus pólizas y pagos', color: '#0f766e', d: 'Consulta estado, coberturas, prima y vigencia de todos tus seguros. Revisa tu historial de pagos y los recibos pendientes; reporta un pago cuando lo hagas y tu asesor lo confirma.' },
          { icon: '🚨', t: 'Siniestros y documentos', color: '#C5162E', d: 'Sigue el estado de cualquier reclamo que reportaste. Accede a las carátulas y documentos de tu expediente, y sube documentos nuevos cuando te los pidan.' },
          { icon: '🗂', t: 'Solicitar gestiones y aprender', color: '#1f8a4c', d: '¿Necesitas un cambio o tienes una duda? Envía una solicitud directa a tu asesor desde el portal. En "Aprende" tienes recursos sobre tus seguros y un glosario de términos.' }
        ]},
        { t: 'Reportar pagos y reclamos paso a paso', min: 7, tipo: 'lectura', secciones: [
          { icon: '📤', t: 'Reportar un pago', color: '#0f766e', d: 'Entra a "Mis pagos", elige el recibo que pagaste y toca "Reportar pago". Adjunta el comprobante (foto o PDF) y confirma. Tu asesor recibe la notificación al instante, valida contra el estado de cuenta de la aseguradora y marca el recibo como pagado. Tú ves el cambio de estado en tiempo real.' },
          { icon: '🚨', t: 'Abrir un reclamo', color: '#C5162E', d: 'En "Siniestros" toca "Reportar siniestro", describe qué pasó, la fecha y adjunta fotos o documentos. Se crea el caso, tu asesor y el equipo lo reciben, y a partir de ahí sigues cada avance (reportado → en análisis → aprobado → pagado) sin llamar a nadie.' },
          { icon: '🔔', t: 'Notificaciones', color: '#1f8a4c', d: 'Cada avance importante —pago confirmado, respuesta a una gestión, recordatorio de renovación o vencimiento— te llega como notificación en el portal y por WhatsApp/correo. Toca la campana para ver el detalle de cada una.' }
        ]},
        { t: 'Tu expediente y tu asesor', min: 6, tipo: 'lectura', secciones: [
          { icon: '📁', t: 'Completa tu expediente', color: '#0f766e', d: 'Mientras más completo esté tu expediente (documento de identidad, datos de contacto, documentos del bien asegurado), más rápido se gestionan tus trámites. El portal te invita a subir lo que falte y todo queda seguro y disponible.' },
          { icon: '💬', t: 'Habla con tu asesor', color: '#2563a8', d: 'Tienes un botón directo para escribir a tu asesor, y un asistente que responde tus dudas frecuentes al instante (horarios, coberturas, cómo pagar). Si necesitas a una persona, el asistente te conecta con tu asesor.' },
          { icon: '🔒', t: 'Tu información está protegida', color: '#C5162E', d: 'Al ingresar por primera vez aceptas el aviso de tratamiento de datos. Tu información se usa solo para gestionar tus seguros; nunca se comparte sin tu consentimiento. Puedes consultar la política cuando quieras.' }
        ]},
        { t: '¿Cómo reportar un pago?', min: 5, tipo: 'quiz', preguntas: [
          { p: '¿Cómo reporta un cliente un pago en el portal?', ops: ['Llamando a la aseguradora', 'En "Mis pagos" → seleccionar recibo → "📤 Reportar pago"', 'Enviando un correo a la compañía'], ok: 1 },
          { p: '¿Qué puedes hacer al abrir un reclamo desde el portal?', ops: ['Solo ver un teléfono de contacto', 'Describir el caso, adjuntar fotos y seguir cada avance', 'Nada, hay que ir presencialmente'], ok: 1 },
          { p: '¿Para qué sirve completar tu expediente?', ops: ['Para nada, es opcional y sin efecto', 'Para que tus trámites se gestionen más rápido', 'Para pagar más caro'], ok: 1 }
        ]}
      ] },
    { id: 'cur5', titulo: 'Cumplimiento y Confidencialidad', cat: 'Normativa', emoji: '⚖️', color: '#6b4ea0', desc: 'Protección de datos, Habeas Data, secreto profesional y conducta.', destinatarios: 'equipo', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Política de tratamiento de datos.pdf', tipo: 'pdf' }, { nombre: 'Acuerdo de confidencialidad.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'Protección de datos personales', min: 12, tipo: 'lectura', secciones: [
          { icon: '🛡️', t: '¿Qué protege la ley?', color: '#6b4ea0', d: 'Los datos personales de clientes (identidad, contacto, datos de pólizas, salud en GM, financieros) están protegidos por la normativa del país. En Colombia, la Ley 1581 de 2012 (Habeas Data); en Guatemala, las normas de protección de datos y confidencialidad de seguros. Tratar mal estos datos expone a la empresa a sanciones y a la pérdida de confianza.' },
          { icon: '✅', t: 'Principios que debes cumplir', color: '#1f8a4c', d: 'Finalidad: usa los datos solo para gestionar los seguros del cliente. Necesidad: pide solo lo que necesitas. Seguridad: protege tus credenciales y no compartas información por canales inseguros. Circulación restringida: no envíes bases de datos por WhatsApp o correo personal.' },
          { icon: '⚖️', t: 'Derechos del titular', color: '#C5162E', d: 'El cliente puede en cualquier momento conocer, actualizar, rectificar y solicitar la supresión de sus datos, y revocar la autorización. En el Portal del Cliente acepta la cláusula de tratamiento al primer ingreso; esa aceptación queda registrada con fecha.' }
        ]},
        { t: 'Confidencialidad y conducta profesional', min: 10, tipo: 'lectura', secciones: [
          { icon: '🔒', t: 'Información Confidencial', color: '#1E2227', d: 'Es confidencial todo dato de clientes, cartera, tarifas, comisiones, y la propia plataforma (arquitectura, lógicas, know-how). No la copies, fotografíes ni extraigas fuera de Orbit 360. La obligación se mantiene incluso después de terminar tu relación con la empresa.' },
          { icon: '🤝', t: 'Conducta esperada', color: '#2563a8', d: 'Actúa con honestidad con clientes y aseguradoras. No prometas coberturas que no existen. Registra todo en la plataforma (trazabilidad). Ante un conflicto de interés, decláralo. La cartera es de la empresa, no se traslada al salir.' },
          { icon: '🤖', t: 'Uso responsable de la IA', color: '#c9821b', d: 'La IA de Orbit (extracción, redacción, análisis) es un apoyo. Verifica siempre antes de enviar a un cliente o tomar decisiones. Tú eres responsable del resultado final.' }
        ]},
        { t: 'Evaluación de cumplimiento', min: 8, tipo: 'quiz', preguntas: [
          { p: '¿Hasta cuándo dura tu obligación de confidencialidad sobre los datos de clientes?', ops: ['Solo mientras trabajo en la empresa', 'Indefinidamente, incluso tras terminar la relación', 'Un año después de salir'], ok: 1 },
          { p: '¿Cuál de estas prácticas SÍ es correcta?', ops: ['Enviar la base de clientes a mi correo personal para trabajar en casa', 'Usar los datos solo dentro de la plataforma y para gestionar sus seguros', 'Compartir tarifas con un conocido de otra correduría'], ok: 1 },
          { p: '¿Qué debo hacer con un texto que generó la IA antes de enviarlo al cliente?', ops: ['Enviarlo tal cual, la IA no se equivoca', 'Verificarlo y ajustarlo con criterio profesional', 'Reenviarlo a la aseguradora sin leer'], ok: 1 }
        ]}
      ] },
    { id: 'cur_master', titulo: 'Curso Maestro Orbit 360 — visión integral', cat: 'Inducción', emoji: '🌐', color: '#C5162E', desc: 'Recorrido completo por toda la plataforma: el ciclo 360, cada módulo, la sincronía en vivo y el valor para el negocio.', destinatarios: 'equipo', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Mapa integral Orbit 360.png', tipo: 'img' }, { nombre: 'Manual maestro.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'Qué es Orbit 360 y el ciclo integral', min: 12, tipo: 'lectura', secciones: [
          { icon: '🌐', t: 'Un sistema 360 para el intermediario', color: '#C5162E', d: 'Orbit 360 integra en un solo lugar todo el ciclo del intermediario de seguros: captar (Leads/Ops), vender (Cotizador/Comparativo), administrar (Pólizas/Cobros/Renovaciones/Cancelaciones), cobrar y liquidar (Finanzas/Comisiones), atender (Siniestros/Portal/Correo) y crecer (Marketing/Insights/Academia). Todo conectado, sin islas de información.' },
          { icon: '🔗', t: 'Sincronía en vivo', color: '#1f8a4c', d: 'Cada acción se refleja al instante en todo el sistema: aplicar un pago baja la cartera y suma a Finanzas; cerrar un Lead crea el cliente y activa encuestas; cancelar una póliza crea una gestión de recuperación y queda en la ficha. No se duplica el trabajo: se registra una vez y vive en todos los módulos.' },
          { icon: '🏢', t: 'Multi-tenant y white-label', color: '#1E2227', d: 'La plataforma es configurable por cliente (cada correduría): su logo, su paleta, sus países y monedas, sus aseguradoras, sus catálogos y los módulos que ve cada rol. Una sola base, muchas marcas.' }
        ]},
        { t: 'Los módulos comerciales', min: 12, tipo: 'lectura', secciones: [
          { icon: '🎯', t: 'Leads y Ops', color: '#2563a8', d: 'Ops es el tablero interno del equipo (gestiones administrativas y de renovación); Leads es el pipeline del asesor. Comparten datos en vivo: lo que avanza en uno se ve en el otro. El asesor no ve Ops; ve sus gestiones por Leads.' },
          { icon: '🧮', t: 'Cotizador y Comparativo', color: '#c9821b', d: 'El Cotizador arma cotizaciones con campos por ramo (auto con marca→línea→versión, GM por integrantes, etc.) y deriva al Comparativo. El Comparativo carga propuestas de varias aseguradoras (incluida extracción real de PDF) y las pone lado a lado con recomendación.' },
          { icon: '👤', t: 'Cliente 360', color: '#1f8a4c', d: 'La ficha del cliente reúne pólizas, vehículos, recibos, siniestros, documentos, correos y actividad. Todo clicable, con detalle. Desde aquí se solicita una gestión, se envía WhatsApp/correo y se ve el historial completo.' }
        ]},
        { t: 'Administración, finanzas y atención', min: 12, tipo: 'lectura', secciones: [
          { icon: '📋', t: 'Pólizas, Cobros, Renovaciones, Cancelaciones', color: '#C5162E', d: 'La póliza tiene desglose de prima (neta, gastos, recargo, IVA) y genera recibos automáticos según la forma de pago. Cobros gestiona la cartera y aplica pagos. Renovaciones propone y compara; Cancelaciones registra el motivo y dispara recuperación.' },
          { icon: '💰', t: 'Finanzas y Comisiones', color: '#c9821b', d: 'Finanzas centraliza movimientos, CxC/CxP autoadministrables, liquidaciones por lote, presupuesto con semáforos y dashboard con comparativos. Comisiones calcula por aseguradora y reparte al vendedor, todo sobre prima neta recaudada.' },
          { icon: '🚨', t: 'Siniestros, Portal y Correo', color: '#0f766e', d: 'Siniestros lleva la bitácora del reclamo con la aseguradora. El Portal da al cliente autoservicio (pólizas, pagos, gestiones, aprende). El Correo asocia hilos a cliente/póliza/gestión/reclamo, con trazabilidad.' }
        ]},
        { t: 'Crecimiento y configuración', min: 10, tipo: 'lectura', secciones: [
          { icon: '📈', t: 'Insights, Marketing y Academia', color: '#2563a8', d: 'Insights mide producción nueva vs renovada contra metas, con comparativos y análisis crítico por IA. Marketing planifica contenidos (manual o con IA) e integra redes. Academia capacita al equipo y a los clientes con cursos, manuales y recursos.' },
          { icon: '🤖', t: 'Orbit IA transversal', color: '#6b4ea0', d: 'Una capa de IA (proveedor configurable, sin sesgo) asiste en extracción de documentos, redacción de mensajes, análisis de datos y generación de contenido y cursos. Siempre con verificación humana.' },
          { icon: '⚙️', t: 'Configuración y automatizaciones', color: '#1E2227', d: 'Todo es autoadministrable: marca, paleta, países, monedas, catálogos, aseguradoras, roles y módulos por usuario, integraciones (con API key/webhook) y automatizaciones (evento→canal→plantilla). Sin tocar código.' }
        ]},
        { t: 'Evaluación integral', min: 10, tipo: 'quiz', preguntas: [
          { p: '¿Qué significa "sincronía en vivo" en Orbit 360?', ops: ['Que hay que actualizar manualmente cada módulo', 'Que una acción se refleja al instante en todos los módulos relacionados', 'Que solo se sincroniza al cerrar sesión'], ok: 1 },
          { p: '¿Quién NO ve el tablero Ops?', ops: ['La dirección', 'El asesor (ve sus gestiones por Leads)', 'El área administrativa'], ok: 1 },
          { p: '¿Sobre qué base se calculan producción, metas y comisiones?', ops: ['Prima total facturada', 'Prima neta recaudada', 'Número de pólizas'], ok: 1 },
          { p: '¿Qué se puede configurar sin tocar código?', ops: ['Solo el logo', 'Marca, países, catálogos, aseguradoras, roles, integraciones y automatizaciones', 'Nada, todo requiere programador'], ok: 1 }
        ]}
      ] }
  ];

  // ====================================================================
  //  NOTIFICACIONES DEL PORTAL (cliente) — admin envía a todos/uno
  // ====================================================================
  const notifs = [];
  let ntn = 0;
  clientes.slice(0, 8).forEach(cli => {
    if (rnd() > .5) { ntn++; notifs.push({ id: 'ntf' + ntn, clienteId: cli.id, titulo: 'Tu póliza está próxima a renovar', cuerpo: 'Te preparamos una propuesta de renovación. Escríbenos para revisarla.', tipo: 'renovacion', fecha: iso(addDays(NOW, -between(1, 10))), leida: rnd() > .5 }); }
    if (rnd() > .6) { ntn++; notifs.push({ id: 'ntf' + ntn, clienteId: cli.id, titulo: 'Recordatorio de pago', cuerpo: 'Tienes un recibo próximo a vencer. Puedes reportar tu pago desde el portal.', tipo: 'cobro', fecha: iso(addDays(NOW, -between(1, 6))), leida: false }); }
  });

  // orden de actividades por fecha desc se hace en el módulo
  return {
    __v: 35,
    meta: { now: iso(NOW), empresa: 'Demo Corredores', moneda_base: 'GTQ' },
    asesores, aseguradoras, clientes, polizas, cobros, comisiones, actividades, cancelaciones, vehiculos, negocios, gestiones, novedades, finmovs, acreedores, presupuesto, correos, contenidos, reclamos, cursos, notifs
  };
})();
