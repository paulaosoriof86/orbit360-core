/* ============================================================
   Orbit 360 Â· Seed â€” DATOS FICTICIOS (demo)
   Toda la informaciÃ³n es de demostraciÃ³n. Genera un universo
   relacional coherente: asesores Â· aseguradoras Â· clientes Â·
   pÃ³lizas Â· cobros Â· comisiones Â· actividades Â· cancelaciones.
   Cambia __v para forzar re-siembra.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.SEED = (function () {
  const NOW = new Date('2026-06-20');
  // PRNG determinista (mulberry32) â†’ datos estables entre recargas
  let _s = 20260620;
  const rnd = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const id = (p, n) => p + String(n).padStart(3, '0');
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

  // ---- Asesores (equipo) ----
  // shareCom = participaciÃ³n del vendedor sobre la comisiÃ³n de la aseguradora (%)
  const asesores = [
    { id: 'ase001', nombre: 'Paula Osorio', rol: 'DirecciÃ³n', iniciales: 'PO', color: '#C5162E', metaPrima: 220000, metaRecaudo: 180000, comTipo: 'variable', comPct: 18, shareCom: 60, comModo: 'comision' },
    { id: 'ase002', nombre: 'Diego MarroquÃ­n', rol: 'Asesor Sr.', iniciales: 'DM', color: '#1f3a5f', metaPrima: 160000, metaRecaudo: 140000, comTipo: 'variable', comPct: 15, shareCom: 55, comModo: 'comision' },
    { id: 'ase003', nombre: 'LucÃ­a Herrera', rol: 'Asesora', iniciales: 'LH', color: '#1f8a4c', metaPrima: 140000, metaRecaudo: 120000, comTipo: 'variable', comPct: 12, shareCom: 10, comModo: 'neta' },
    { id: 'ase004', nombre: 'Marco Villatoro', rol: 'Asesor', iniciales: 'MV', color: '#c9821b', metaPrima: 120000, metaRecaudo: 100000, comTipo: 'fija', comPct: 10, shareCom: 45, comModo: 'comision' },
    { id: 'ase005', nombre: 'Ana Lemus', rol: 'Asesora Jr.', iniciales: 'AL', color: '#6b4ea0', metaPrima: 90000, metaRecaudo: 78000, comTipo: 'fija', comPct: 8, shareCom: 40, comModo: 'fijo', comValor: 500 }
  ];

  // ---- Aseguradoras (directorio) ----
  // comisiones = % que la aseguradora paga al intermediario, por RAMO.
  // comisionesProd = override por PRODUCTO (lo llena la planilla importada).
  function tarifaRamos(ramos, lo, hi) { const o = {}; ramos.forEach(r => { o[r] = lo + Math.floor(rnd() * (hi - lo + 1)); }); return o; }
  // helpers de ficha de aseguradora (datos ficticios genÃ©ricos)
  function asgExtra(nombre, pais, nit) {
    const slug = nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
    return {
      vinculada: true,
      nit: nit || (pais === 'GT' ? (between(1000000, 9999999) + '-' + between(0, 9)) : (between(800, 901) + '.' + between(100, 999) + '.' + between(100, 999) + '-' + between(0, 9))),
      facturacion: { razonSocial: nombre + (pais === 'GT' ? ', S.A.' : ' S.A.S.'), patronConcepto: 'Comisiones de intermediaciÃ³n â€” pÃ³liza {NUMERO} â€” {RAMO}', dirFiscal: (pais === 'GT' ? 'Ciudad de Guatemala' : 'BogotÃ¡ D.C.') },
      portal: 'https://portal.' + slug + '.com',
      drive: 'https://drive.google.com/' + slug,
      cuentas: [
        { banco: pais === 'GT' ? 'Banco Industrial' : 'Bancolombia', tipo: 'Monetaria', numero: '****' + between(1000, 9999), moneda: pais === 'GT' ? 'GTQ' : 'COP' }
      ],
      contactos: [
        { nombre: 'Ejecutivo Comercial', tipo: 'Comercial / TÃ©cnico', email: 'comercial@' + slug + '.com', tel: (pais === 'GT' ? '+502 ' : '+57 ') + between(3000, 3999) + between(1000, 9999) },
        { nombre: 'Mesa Administrativa', tipo: 'Administrativo', email: 'admin@' + slug + '.com', tel: (pais === 'GT' ? '+502 ' : '+57 ') + between(2000, 2999) + between(1000, 9999) },
        { nombre: 'AtenciÃ³n de Siniestros', tipo: 'Siniestros', email: 'siniestros@' + slug + '.com', tel: (pais === 'GT' ? '+502 ' : '+57 ') + between(1500, 1999) + between(1000, 9999) }
      ],
      docs: [
        { nombre: 'Tarifario vigente.pdf', cat: 'Tarifas' },
        { nombre: 'Formulario de emisiÃ³n Auto.pdf', cat: 'Formularios' },
        { nombre: 'Brochure comercial.pdf', cat: 'Comercial' }
      ],
      docsRequeridos: [
        { producto: 'Auto', items: 'DPI/cÃ©dula, tarjeta de circulaciÃ³n, fotos del vehÃ­culo, formulario firmado' },
        { producto: 'Vida', items: 'DPI/cÃ©dula, declaraciÃ³n de salud, beneficiarios' }
      ]
    };
  }
  const aseguradoras = [
    Object.assign({ id: 'asg01', nombre: 'Seguros Atlas', color: '#C5162E', pais: 'GT', ramos: ['Auto', 'Vida', 'Gastos MÃ©dicos', 'Hogar'], comisionDefault: 12, comisiones: { 'Auto': 12, 'Vida': 22, 'Gastos MÃ©dicos': 15, 'Hogar': 18 }, comisionesProd: {} }, asgExtra('Seguros Atlas', 'GT')),
    Object.assign({ id: 'asg02', nombre: 'Aseguradora Cumbre', color: '#1f3a5f', pais: 'GT', ramos: ['Auto', 'DaÃ±os', 'Fianzas', 'Transporte'], comisionDefault: 12, comisiones: { 'Auto': 11, 'DaÃ±os': 16, 'Fianzas': 20, 'Transporte': 14 }, comisionesProd: {} }, asgExtra('Aseguradora Cumbre', 'GT')),
    Object.assign({ id: 'asg03', nombre: 'MundoSeguro', color: '#1f8a4c', pais: 'CO', ramos: ['Vida', 'Gastos MÃ©dicos', 'Accidentes'], comisionDefault: 14, comisiones: { 'Vida': 25, 'Gastos MÃ©dicos': 16, 'Accidentes': 20 }, comisionesProd: {} }, asgExtra('MundoSeguro', 'CO')),
    Object.assign({ id: 'asg04', nombre: 'PacÃ­fico Seguros', color: '#c9821b', pais: 'CO', ramos: ['Auto', 'Hogar', 'RC', 'Transporte'], comisionDefault: 13, comisiones: { 'Auto': 13, 'Hogar': 18, 'RC': 17, 'Transporte': 15 }, comisionesProd: {} }, asgExtra('PacÃ­fico Seguros', 'CO')),
    Object.assign({ id: 'asg05', nombre: 'Andes Seguros', color: '#6b4ea0', pais: 'CO', ramos: ['Vida', 'DaÃ±os', 'Fianzas'], comisionDefault: 15, comisiones: { 'Vida': 24, 'DaÃ±os': 17, 'Fianzas': 21 }, comisionesProd: {} }, asgExtra('Andes Seguros', 'CO')),
    Object.assign({ id: 'asg06', nombre: 'VÃ©rtice Seguros', color: '#0f766e', pais: 'GT', ramos: ['Auto', 'Gastos MÃ©dicos', 'Hogar', 'RC'], comisionDefault: 12, comisiones: { 'Auto': 12, 'Gastos MÃ©dicos': 15, 'Hogar': 17, 'RC': 16 }, comisionesProd: {} }, asgExtra('VÃ©rtice Seguros', 'GT')),
    // directorio adicional autorizado (deshabilitadas por defecto â€” sin vinculaciÃ³n aÃºn)
    Object.assign({ id: 'asg07', nombre: 'El Roble', color: '#15803d', pais: 'GT', ramos: ['Auto', 'Vida', 'DaÃ±os'], comisionDefault: 12, comisiones: {}, comisionesProd: {} }, asgExtra('El Roble', 'GT'), { vinculada: false }),
    Object.assign({ id: 'asg08', nombre: 'G&T Seguros', color: '#1d4ed8', pais: 'GT', ramos: ['Auto', 'Gastos MÃ©dicos', 'Fianzas'], comisionDefault: 12, comisiones: {}, comisionesProd: {} }, asgExtra('G&T Seguros', 'GT'), { vinculada: false }),
    Object.assign({ id: 'asg09', nombre: 'Mapfre', color: '#b91c1c', pais: 'GT', ramos: ['Auto', 'Hogar', 'Transporte'], comisionDefault: 12, comisiones: {}, comisionesProd: {} }, asgExtra('Mapfre', 'GT'), { vinculada: false }),
    Object.assign({ id: 'asg10', nombre: 'Sura', color: '#0369a1', pais: 'CO', ramos: ['Auto', 'Vida', 'Salud', 'DaÃ±os'], comisionDefault: 14, comisiones: {}, comisionesProd: {} }, asgExtra('Sura', 'CO'), { vinculada: false }),
    Object.assign({ id: 'asg11', nombre: 'BolÃ­var', color: '#15803d', pais: 'CO', ramos: ['Vida', 'Hogar', 'Cumplimiento'], comisionDefault: 14, comisiones: {}, comisionesProd: {} }, asgExtra('BolÃ­var', 'CO'), { vinculada: false }),
    Object.assign({ id: 'asg12', nombre: 'Allianz', color: '#1e3a8a', pais: 'CO', ramos: ['Auto', 'RC', 'Transporte'], comisionDefault: 13, comisiones: {}, comisionesProd: {} }, asgExtra('Allianz', 'CO'), { vinculada: false })
  ];

  // ---- CatÃ¡logos ----
  const productos = {
    'Auto': ['Auto Total', 'Auto Plus', 'Auto BÃ¡sico'],
    'Vida': ['Vida Entera', 'Vida Temporal', 'Vida InversiÃ³n'],
    'Gastos MÃ©dicos': ['Salud Integral', 'Salud Familiar', 'Salud Premium'],
    'Hogar': ['Hogar Protegido', 'Hogar Plus'],
    'DaÃ±os': ['Multirriesgo PYME', 'Patrimonial Empresa'],
    'Fianzas': ['Fianza Cumplimiento', 'Fianza Anticipo'],
    'Transporte': ['Transporte de Carga', 'MercancÃ­a Asegurada'],
    'RC': ['Responsabilidad Civil', 'RC Profesional'],
    'Accidentes': ['Accidentes Personales']
  };
  const canales = ['Referido', 'Web', 'WhatsApp', 'CampaÃ±a', 'Telemarketing', 'RenovaciÃ³n'];
  const segmentos = ['Premium', 'Recurrente', 'EstÃ¡ndar', 'Nuevo'];

  const personas = [
    ['SofÃ­a Castellanos', 'GT'], ['Roberto Quezada', 'GT'], ['MarÃ­a Fernanda Gil', 'CO'],
    ['AndrÃ©s BeltrÃ¡n', 'CO'], ['Camila Rojas', 'CO'], ['Jorge Pineda', 'GT'],
    ['Valentina Ospina', 'CO'], ['Luis Carlos MejÃ­a', 'CO'], ['Gabriela Santos', 'GT'],
    ['Diego Naranjo', 'CO'], ['Paola ArÃ©valo', 'GT'], ['Esteban Cardona', 'CO']
  ];
  const empresas = [
    ['Distribuidora Andina S.A.', 'CO'], ['Constructora VÃ©rtiz', 'GT'],
    ['CafÃ© del Valle Ltda.', 'CO'], ['LogÃ­stica PacÃ­fico', 'CO'],
    ['ClÃ­nica San Marcos', 'GT'], ['Inversiones Maya', 'GT'],
    ['Textiles Cumbre', 'CO'], ['Transportes RÃ­o', 'GT']
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
      GT: { Guatemala: ['Guatemala', 'Mixco', 'Villa Nueva'], Quetzaltenango: ['Quetzaltenango', 'Coatepeque'], Escuintla: ['Escuintla', 'Santa LucÃ­a'], SacatepÃ©quez: ['Antigua Guatemala'] },
      CO: { 'Cundinamarca': ['BogotÃ¡', 'Soacha', 'ChÃ­a'], 'Antioquia': ['MedellÃ­n', 'Envigado', 'ItagÃ¼Ã­'], 'Valle del Cauca': ['Cali', 'Palmira'], 'AtlÃ¡ntico': ['Barranquilla', 'Soledad'] }
    };
    const deptos = Object.keys(GEO[pais] || { 'â€”': ['â€”'] });
    const departamento = pick(deptos);
    const ciudad = pick((GEO[pais] || {})[departamento] || ['â€”']);
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
  // Simular clientes histÃ³ricos con datos INCOMPLETOS (calidad de datos)
  clientes.forEach((c, i) => {
    if (i % 10 === 3) { c.telefono = ''; }                 // sin telÃ©fono (prioridad 1)
    if (i % 10 === 6) { c.telefono = ''; c.direccion = ''; }
    if (i % 7 === 2) { c.direccion = ''; }                 // sin direcciÃ³n (prioridad 2)
    if (i % 9 === 4) { c.email = ''; }                     // sin correo
    if (i % 8 === 5) { c.fechaNac = ''; c.sexo = ''; }     // sin demogrÃ¡ficos
  });

  // ---- Build pÃ³lizas + cobros + comisiones + actividades ----
  const polizas = [], cobros = [], comisiones = [], actividades = [], cancelaciones = [], vehiculos = [];
  let pn = 0, cbn = 0, cmn = 0, acn = 0, cxn = 0, vhn = 0;

  clientes.forEach(cli => {
    const asg0 = aseguradoras.filter(a => a.pais === cli.pais);
    const nPol = cli.tipo === 'Empresa' ? between(2, 4) : between(1, 3);
    for (let i = 0; i < nPol; i++) {
      pn++;
      const asg = pick(asg0.length ? asg0 : aseguradoras);
      const ramo = pick(asg.ramos);
      const producto = pick(productos[ramo] || ['Plan estÃ¡ndar']);
      // frecuencia / forma de pago / conducto
      const frecuencias = ['Contado', 'Mensual', 'Trimestral', 'Semestral', 'Anual'];
      const frecuencia = pick(frecuencias);
      const fraccionado = Orbit.primas.cuotasDe(frecuencia) > 1;
      const formaPago = fraccionado ? pick(['Tarjeta de crÃ©dito', 'Visa Cuotas', 'Transferencia', 'Domiciliado'])
                                    : pick(['Tarjeta de crÃ©dito', 'Transferencia', 'Efectivo']);
      const conducto = pick(Orbit.primas.CONDUCTOS);
      const base = cli.tipo === 'Empresa' ? between(8000, 60000) : between(1200, 14000);
      const primaNeta = cli.pais === 'CO' ? base * 1000 : base; // COP en miles
      const inicioMonths = between(1, 13);
      const vigInicio = addMonths(NOW, -inicioMonths);
      const vigFin = addMonths(vigInicio, 12);
      // comisiÃ³n aseguradora = tarifa por ramo de ESA aseguradora; vendedor = participaciÃ³n del asesor
      const _ase = asesores.find(a => a.id === cli.asesorId) || {};
      const comPct = (asg.comisiones && asg.comisiones[ramo] != null) ? asg.comisiones[ramo] : (asg.comisionDefault || 12);
      const comVendPct = _ase.shareCom != null ? _ase.shareCom : 50;  // % sobre la comisiÃ³n de la aseguradora
      // estado de la pÃ³liza
      const diasParaVencer = Math.round((vigFin - NOW) / 86400000);
      let estado = 'Vigente';
      if (diasParaVencer < 0) estado = 'Vencida';
      else if (diasParaVencer <= 45) estado = 'Por renovar';
      const cancelada = rnd() < 0.12;
      if (cancelada) estado = 'Cancelada';

      // desglose de prima con tasas del paÃ­s
      const d = Orbit.primas.desglose(primaNeta, cli.pais, { fraccionado: fraccionado, otros: ramo === 'Auto' ? Math.round(primaNeta * 0.02) : 0 });

      const renovable = rnd() > 0.15; // ~15% no renovables (multianual o de un solo perÃ­odo)
      const tiposPol = { Auto: 'Individual', Vida: 'Individual', 'Gastos MÃ©dicos': rnd() > .5 ? 'Colectiva' : 'Individual', Hogar: 'Individual', DaÃ±os: 'Empresarial', RC: 'Empresarial', Fianzas: 'Empresarial' };

      const pol = {
        id: id('pol', pn),
        numero: (cli.pais === 'GT' ? 'GT-' : 'CO-') + asg.id.slice(-2).toUpperCase() + '-' + String(between(10000, 99999)),
        clienteId: cli.id, asesorId: cli.asesorId, aseguradoraId: asg.id,
        ramo, subramo: producto, producto, tipoPoliza: tiposPol[ramo] || 'Individual',
        moneda: cli.moneda, divisa: cli.moneda,
        // pago
        frecuencia, forma: frecuencia, formaPago, conducto,
        tarjeta: (formaPago === 'Tarjeta de crÃ©dito' || formaPago === 'Visa Cuotas') ? '**** ' + between(1000, 9999) : '',
        // desglose de prima
        primaNeta: d.neta, gastosEmision: d.gastosEmision, gastosFinan: d.gastosFinan,
        otros: d.otros, ivaPct: d.ivaPct, ivaMonto: d.iva, recargoFinPct: d.recargoPct,
        prima: d.total, primaTotal: d.total, baseGravable: d.baseGravable,
        sumaAsegurada: primaNeta * between(20, 120),
        comisionPct: comPct, comAseguradoraPct: comPct, comVendedorPct: comVendPct,
        vendidaPor: (asesores.find(a => a.id === cli.asesorId) || {}).nombre || '',
        // vigencia / renovaciÃ³n
        vigenciaInicio: iso(vigInicio), vigenciaFin: iso(vigFin),
        renovable, multianual: !renovable && rnd() > .5,
        contadorRenovaciones: between(0, 4),
        concepto: producto + ' Â· ' + ramo,
        estado
      };
      polizas.push(pol);

      // vehÃ­culo (ramo Auto) â€” detalle por pÃ³liza
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

      // cancelaciÃ³n
      if (cancelada) {
        cxn++;
        cancelaciones.push({
          id: id('can', cxn), polizaId: pol.id, clienteId: cli.id,
          fecha: iso(addDays(NOW, -between(10, 200))),
          motivo: pick(['No pago de prima', 'Cambio de aseguradora', 'Venta del bien', 'InsatisfacciÃ³n', 'Duplicidad']),
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
      ['llamada', 'ðŸ“ž', 'Llamada de seguimiento'],
      ['whatsapp', 'ðŸ’¬', 'Mensaje de WhatsApp enviado'],
      ['email', 'âœ‰', 'Correo con propuesta'],
      ['reunion', 'ðŸ¤', 'ReuniÃ³n de asesorÃ­a'],
      ['nota', 'ðŸ“', 'Nota interna'],
      ['sistema', 'âš™', 'Evento del sistema']
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
          'Se compartiÃ³ comparativo de coberturas.',
          'Recordatorio de pago prÃ³ximo a vencer.',
          'Consulta sobre proceso de renovaciÃ³n.',
          'ActualizaciÃ³n de datos de contacto.',
          'Se agendÃ³ cita para revisiÃ³n de pÃ³liza.'
        ])
      });
    }
  });

  // ====================================================================
  //  CICLO COMERCIAL UNIFICADO â€” negocios (oportunidades) + gestiones Ops
  //  Un mismo "negocio" se proyecta en DOS tableros:
  //   Â· Orbit Ops (interno): Cotizaciones, Inspecciones, Emisiones
  //   Â· Orbit Leads (asesor): Nuevo â†’ Contactado â†’ â€¦ â†’ Cierre
  //  La etapa canÃ³nica determina en quÃ© lista aparece en cada tablero.
  //  Las gestiones administrativas (Gestiones Admin / Renov.-Modif.) son
  //  operativas y NO son prospectos.
  // ====================================================================
  const negocios = [], gestiones = [], leads = [];
  const etapasCanon = ['nuevo', 'contactado', 'cotizando', 'propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido', 'perdido'];
  const probDe = { nuevo: 10, contactado: 25, cotizando: 45, propuesta: 65, negociacion: 78, inspeccion: 85, emision: 92, emitido: 100, perdido: 0 };
  const leadCanales = ['Referido', 'Web', 'WhatsApp', 'CampaÃ±a', 'Facebook', 'Telemarketing'];
  const ramosLead = ['Auto', 'Vida', 'Gastos MÃ©dicos', 'Hogar', 'DaÃ±os', 'RC'];
  const prospectos = [
    ['Andrea SolÃ­s', 'Persona'], ['Bytes Solutions S.A.', 'Empresa'], ['Carlos MÃ©ndez', 'Persona'],
    ['Mariana TÃ©llez', 'Persona'], ['Grupo Lumen', 'Empresa'], ['Pedro RamÃ­rez', 'Persona'],
    ['Inmobiliaria Cresta', 'Empresa'], ['VerÃ³nica Aguilar', 'Persona'], ['Tech Andina Ltda.', 'Empresa'],
    ['JosÃ© Morales', 'Persona'], ['ClÃ­nica Vida', 'Empresa'], ['Laura Bonilla', 'Persona'],
    ['Ricardo Salguero', 'Persona'], ['Comercial El Faro', 'Empresa']
  ];
  // distribuciÃ³n intencional por etapa para un pipeline realista
  const distEtapas = ['nuevo', 'nuevo', 'contactado', 'cotizando', 'cotizando', 'propuesta', 'propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido', 'emitido', 'perdido', 'contactado'];
  const cadencias = ['DÃ­a 1 Â· llamada de bienvenida', 'DÃ­a 3 Â· WhatsApp de seguimiento', 'DÃ­a 7 Â· correo con propuesta', 'DÃ­a 14 Â· llamada de cierre'];
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
    const bit = [{ ts: creado + ' 09:12', user: ase.nombre, campo: 'CreaciÃ³n', de: '', a: 'Ingreso (' + origen + ')', origen: 'manual' }];
    if (avanzado) bit.push({ ts: iso(addDays(NOW, -between(1, 8))) + ' 11:40', user: ase.nombre, campo: 'Etapa', de: 'cotizando', a: et, origen: 'manual' });
    negocios.push({
      id: id('neg', i + 1), nombre, tipo, etapa: et, prob: probDe[et],
      asesorId: ase.id, canal: pick(leadCanales),
      pais, moneda: pais === 'GT' ? 'GTQ' : 'COP',
      producto: pick(productos[ramo] || ['Plan estÃ¡ndar']), ramo,
      aseguradoraId: asg.id,
      telefono: (pais === 'GT' ? '+502 ' : '+57 ') + between(3000, 3999) + ' ' + between(1000, 9999),
      email: nombre.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim().split(' ').slice(0, 2).join('.') + (tipo === 'Empresa' ? '@empresa.com' : '@correo.com'),
      primaEst: (pais === 'CO' ? between(1, 14) * 1000000 : between(1200, 16000)),
      descripcion: pick(['Marca, modelo y aÃ±o del vehÃ­culo; coberturas solicitadas.', 'Grupo familiar de 4; busca cobertura internacional.', 'Inmueble comercial; multirriesgo PYME.', 'RenovaciÃ³n con mejora de suma asegurada.', 'Flotilla de 6 vehÃ­culos de reparto.']),
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
        { t: 'CotizaciÃ³n enviada al cliente', done: ['propuesta', 'negociacion', 'inspeccion', 'emision', 'emitido'].includes(et) },
        { t: 'Documentos del riesgo recibidos', done: ['inspeccion', 'emision', 'emitido'].includes(et) },
        { t: 'InspecciÃ³n / avalÃºo realizado', done: ['emision', 'emitido'].includes(et) }
      ],
      clienteIdCreado: '', archivado: false,
      etiquetas: [], bitacora: bit,
      comentarios: avanzado && rnd() > .6 ? [{ ts: iso(addDays(NOW, -between(1, 5))) + ' 15:20', user: ase.nombre, texto: 'Cliente pidiÃ³ comparar con otra aseguradora.' }] : [],
      creado, actualizado: iso(NOW)
    });
  });

  // Gestiones operativas (NO prospectos): admin + renovaciones/modificaciones.
  const tiposAdmin = ['Actualizar datos de cliente', 'Endoso de beneficiario', 'Carta de no adeudo', 'EmisiÃ³n de certificado', 'Solicitud de cancelaciÃ³n'];
  const tiposRenov = ['RenovaciÃ³n de pÃ³liza', 'Modificar suma asegurada', 'SustituciÃ³n de vehÃ­culo', 'Solicitar condiciones de renovaciÃ³n', 'Cambio de propietario'];
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
        { t: 'DocumentaciÃ³n completa', done: rnd() > .5 },
        { t: 'Enviado a aseguradora', done: rnd() > .7 }
      ],
      nota: '', notas: '', origen: 'manual',
      bitacora: [{ ts: creado + ' 10:05', user: pick(asesores).nombre, campo: 'CreaciÃ³n', de: '', a: 'GestiÃ³n creada', origen: 'manual' }],
      comentarios: [],
      creado, actualizado: iso(NOW), archivado: false
    };
  }
  for (let i = 0; i < 5; i++) gestiones.push(makeGestion('Gestiones Admin', pick(tiposAdmin)));
  for (let i = 0; i < 4; i++) gestiones.push(makeGestion('Renovaciones / Modif.', pick(tiposRenov)));

  // ====================================================================
  //  FINANZAS â€” movimientos por mes y paÃ­s (genÃ©rico, comercializable)
  // ====================================================================
  const finmovs = [], acreedores = [], presupuesto = [];
  const ACREEDORES = [{ id: 'acr1', nombre: 'Banco (lÃ­nea de crÃ©dito)', pais: 'GT' }, { id: 'acr2', nombre: 'Socio capital', pais: 'CO' }];
  ACREEDORES.forEach(a => acreedores.push(Object.assign({ saldo: 0 }, a)));
  const PPTO = {
    GT: [['Contabilidad', 250], ['Cuota CRM', 200], ['Internet', 200], ['Office 365', 67], ['Publicidad redes', 600], ['Salarios', 4200], ['OperaciÃ³n', 900]],
    CO: [['Contabilidad', 900000], ['Cuota CRM', 750000], ['Internet', 700000], ['Office 365', 250000], ['Publicidad redes', 2200000], ['Salarios', 15500000], ['OperaciÃ³n', 3200000]]
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
      if (rnd() > .55) finmovs.push({ id: fmId(), tipo: 'ingreso', clase: 'Incentivos', pais, moneda: cur, periodo: ym, dia: between(5, 25), pagador: pick(aseguradoras.filter(a => a.pais === pais)).nombre, concepto: 'Incentivo por producciÃ³n', valor: Math.round(between(400, 1800) * k * seasonal), iva: 0, estado: recaudadoMes ? 'recaudado' : 'esperado', obs: 'Bono comercial' });
      if (rnd() > .7) finmovs.push({ id: fmId(), tipo: 'ingreso', clase: 'Otros', pais, moneda: cur, periodo: ym, dia: between(5, 25), pagador: 'Varios', concepto: 'Otros ingresos', valor: Math.round(between(150, 700) * k), iva: 0, estado: 'recaudado', obs: '' });
      const acr = acreedores.find(a => a.pais === pais);
      if (acr && (back === 12 || back === 6)) {
        const monto = Math.round(between(8000, 16000) * k);
        finmovs.push({ id: fmId(), tipo: 'financiacion', clase: 'Financiamiento', pais, moneda: cur, periodo: ym, dia: between(2, 8), pagador: acr.nombre, acreedorId: acr.id, concepto: 'Ingreso por financiaciÃ³n', valor: monto, iva: 0, estado: 'recaudado', obs: 'Capital de trabajo' });
        acr.saldo += monto;
      }
      const comAsesor = Math.round(between(2200, 5200) * k * seasonal);
      finmovs.push({ id: fmId(), tipo: 'egreso', clase: 'Comisiones asesores', pais, moneda: cur, periodo: ym, dia: between(8, 20), beneficiario: pick(asesores).nombre, concepto: 'LiquidaciÃ³n comisiones asesores', valor: comAsesor, pendiente: recaudadoMes ? 0 : Math.round(comAsesor * 0.4), estado: recaudadoMes ? 'pagado' : 'pendiente', obs: '' });
      PPTO[pais].forEach(([cat, ppto]) => {
        const real = Math.round(ppto * (0.9 + rnd() * 0.25));
        finmovs.push({ id: fmId(), tipo: 'egreso', clase: cat === 'Publicidad redes' ? 'Marketing' : (cat === 'OperaciÃ³n' ? 'OperaciÃ³n' : 'Gastos fijos'), categoria: cat, pais, moneda: cur, periodo: ym, dia: between(1, 28), beneficiario: cat, concepto: cat, valor: real, pendiente: 0, estado: recaudadoMes ? 'pagado' : (rnd() > .6 ? 'pendiente' : 'pagado'), obs: '' });
      });
      if (acr && acr.saldo > 0 && back < 11 && rnd() > .4) {
        const cuota = Math.round(Math.min(acr.saldo, between(800, 2200) * k));
        finmovs.push({ id: fmId(), tipo: 'egreso', clase: 'DevoluciÃ³n de prÃ©stamo', pais, moneda: cur, periodo: ym, dia: between(20, 28), beneficiario: acr.nombre, acreedorId: acr.id, concepto: 'Abono a financiaciÃ³n', valor: cuota, pendiente: 0, estado: 'pagado', obs: 'AmortizaciÃ³n' });
        acr.saldo = Math.max(0, acr.saldo - cuota);
      }
    });
  }
  const ymNow = iso(NOW).slice(0, 7);
  ['GT', 'CO'].forEach(pais => { PPTO[pais].forEach(([cat, val]) => presupuesto.push({ id: 'ppt' + (presupuesto.length + 1), pais, periodo: ymNow, categoria: cat, clase: cat === 'Publicidad redes' ? 'Marketing' : (cat === 'OperaciÃ³n' ? 'OperaciÃ³n' : 'Gastos fijos'), monto: val })); });

  // ====================================================================
  //  CORREO â€” bandeja demo (Outlook/Gmail) con vÃ­nculos a entidades
  // ====================================================================
  const correos = [];
  const asuntos = [
    ['CotizaciÃ³n Auto â€” pendiente de su confirmaciÃ³n', 'cliente', 'cotiza'],
    ['Aviso de vencimiento de prima', 'cobro', 'cobro'],
    ['Documentos para emisiÃ³n de pÃ³liza', 'poliza', 'doc'],
    ['Respuesta de la aseguradora Â· reclamo', 'aseguradora', 'reclamo'],
    ['RenovaciÃ³n prÃ³xima â€” propuesta adjunta', 'poliza', 'renov'],
    ['Solicitud de actualizaciÃ³n de datos', 'cliente', 'gestion'],
    ['ConfirmaciÃ³n de pago recibido', 'cobro', 'pago'],
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
      cotiza: 'Estimado/a ' + cli.nombre + ', adjunto la cotizaciÃ³n solicitada. Quedo atento/a a sus comentarios para avanzar con la emisiÃ³n.',
      cobro: 'Le recordamos que su prima vence prÃ³ximamente. Puede realizar el pago por los canales habituales o responder este correo para coordinar.',
      doc: 'Para completar la emisiÃ³n necesitamos los siguientes documentos. Por favor responda adjuntÃ¡ndolos.',
      reclamo: 'En atenciÃ³n a su reclamo, la aseguradora informa que el caso fue recibido y estÃ¡ en anÃ¡lisis. Le mantendremos informado.',
      renov: 'Su pÃ³liza estÃ¡ prÃ³xima a renovar. Adjuntamos la propuesta de renovaciÃ³n con las mejoras de cobertura disponibles.',
      gestion: 'Solicitamos amablemente actualizar sus datos de contacto para mantener su expediente al dÃ­a.',
      pago: 'Confirmamos la recepciÃ³n de su pago. Gracias por su preferencia.',
      comision: 'Adjuntamos la planilla de comisiones correspondiente al periodo para su conciliaciÃ³n.'
    };
    return m[t] || 'Mensaje de seguimiento.';
  }

  // novedades / incentivos
  const novedades = [
    { id: 'nov1', tipo: 'incentivo', titulo: 'ðŸ† Incentivo de junio: bono por 10 pÃ³lizas Auto', detalle: 'Cierra 10 pÃ³lizas de Auto este mes y gana un bono del 5% adicional sobre comisiÃ³n.', autor: 'Paula Osorio', fecha: iso(addDays(NOW, -2)), prioridad: true },
    { id: 'nov2', tipo: 'producto', titulo: 'ðŸ†• Nuevo producto: Salud Premium de MundoSeguro', detalle: 'Cobertura internacional y sin deducible en red preferente. Material comercial en Academia.', autor: 'DirecciÃ³n', fecha: iso(addDays(NOW, -5)), prioridad: false },
    { id: 'nov3', tipo: 'aviso', titulo: 'ðŸ“¢ Cierre de mes: subir gestiones antes del 30', detalle: 'Recuerden dejar todas las gestiones y recaudos cargados antes del cierre.', autor: 'Finanzas', fecha: iso(addDays(NOW, -1)), prioridad: false }
  ];

  // ====================================================================
  //  MARKETING â€” calendario de contenidos (redes) por dÃ­a
  // ====================================================================
  const contenidos = [];
  const MK_CANALES = ['LinkedIn', 'Facebook', 'Instagram', 'WhatsApp', 'TikTok'];
  const MK_TIPOS = ['Texto', 'Carrusel', 'Reel', 'Historia', 'Video'];
  const MK_ENFOQUES = ['Seguros / Riesgos', 'Servicio / Retención', 'LogÃ­stica', 'Educativo', 'Tendencias', 'Normativa', 'Prospecting'];
  const MK_ESTADOS = ['Idea', 'Programado', 'Publicado'];
  const mkTitulos = [
    ['ðŸš¢ MÃ¡s control en puerto: Â¿y eso quÃ© tiene que ver contigo?', 'LogÃ­stica'],
    ['ðŸ“ˆ Tendencias 2026 en seguros (LatAm): 3 decisiones', 'Tendencias'],
    ['ðŸ•µï¸â€â™€ï¸ Servicio al cliente bien gestionado = retención real', 'Servicio / Retención'],
    ['ðŸšš Seguro de transporte: 5 preguntas que evitan sorpresas', 'Seguros / Riesgos'],
    ['âš–ï¸ Por quÃ© trabajar con un intermediario registrado', 'Normativa'],
    ['ðŸ“œ Derecho + CX: una promesa clara evita conflictos', 'Educativo'],
    ['ðŸ” Riesgos 2026: ciber y AI ya estÃ¡n en el top', 'Prospecting'],
    ['ðŸŒ§ï¸ El clima ya es riesgo financiero', 'Seguros / Riesgos'],
    ['ðŸ“¡ Seguro paramÃ©trico: pago rÃ¡pido por evento', 'Tendencias'],
    ['ðŸ“¦ E-commerce 2026: crece pero la lealtad se pierde', 'Servicio / Retención']
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
      cta: pick(['EscrÃ­beme CHECKLIST por WhatsApp', 'Agenda una revisiÃ³n express', 'Comenta SEGUROS y te envÃ­o la guÃ­a', 'Solicita tu cotizaciÃ³n sin enredos']),
      hashtags: pick(['#Seguros #GestiÃ³nDeRiesgos #Guatemala', '#CX #CustomerExperience #LatAm', '#LogÃ­stica #TransporteDeCarga #Empresas']),
      estado: pub ? 'Publicado' : (rnd() > .4 ? 'Programado' : 'Idea'),
      hora: String(between(8, 18)).padStart(2, '0') + ':' + pick(['00', '10', '30', '45']),
      stats: pub ? { alcance: between(300, 4200), interac: between(12, 280), leads: between(0, 9) } : null
    });
  }

  // ====================================================================
  //  SINIESTROS / RECLAMOS â€” por pÃ³liza, con bitÃ¡cora y correos
  // ====================================================================
  const reclamos = [];
  const RC_ESTADOS = ['Reportado', 'En anÃ¡lisis', 'DocumentaciÃ³n', 'Aprobado', 'Pagado', 'Rechazado'];
  const RC_TIPOS = { Auto: ['ColisiÃ³n', 'Robo total', 'DaÃ±os a terceros', 'Cristales'], Hogar: ['Incendio', 'Robo', 'DaÃ±o por agua'], 'Gastos MÃ©dicos': ['HospitalizaciÃ³n', 'Consulta', 'CirugÃ­a'], Vida: ['IndemnizaciÃ³n'], DaÃ±os: ['DaÃ±o material', 'Rotura de maquinaria'], RC: ['Reclamo de tercero'] };
  let rcn = 0;
  polizas.filter(p => p.estado !== 'Cancelada').forEach(p => {
    if (rnd() > 0.22) return; // ~22% de pÃ³lizas con reclamo
    rcn++;
    const tipos = RC_TIPOS[p.ramo] || ['Reclamo general'];
    const est = pick(RC_ESTADOS);
    const cli = clientes.find(c => c.id === p.clienteId);
    const fecha = iso(addDays(NOW, -between(2, 90)));
    const monto = Math.round((p.sumaAsegurada || p.primaNeta * 20) * (0.05 + rnd() * 0.4));
    const bit = [{ ts: fecha + ' 09:30', user: cli ? cli.nombre : 'Cliente', t: 'Reclamo reportado', d: 'El cliente notifica el siniestro.' }];
    if (['En anÃ¡lisis', 'DocumentaciÃ³n', 'Aprobado', 'Pagado', 'Rechazado'].includes(est)) bit.push({ ts: iso(addDays(new Date(fecha), 2)) + ' 11:00', user: 'Equipo', t: 'Enviado a aseguradora', d: 'Expediente remitido para anÃ¡lisis.' });
    if (['Aprobado', 'Pagado'].includes(est)) bit.push({ ts: iso(addDays(new Date(fecha), 12)) + ' 15:20', user: 'Aseguradora', t: 'Reclamo aprobado', d: 'Procede indemnizaciÃ³n por ' + monto + '.' });
    if (est === 'Pagado') bit.push({ ts: iso(addDays(new Date(fecha), 20)) + ' 10:00', user: 'Aseguradora', t: 'IndemnizaciÃ³n pagada', d: 'Pago realizado al asegurado.' });
    if (est === 'Rechazado') bit.push({ ts: iso(addDays(new Date(fecha), 10)) + ' 16:40', user: 'Aseguradora', t: 'Reclamo rechazado', d: 'Causa fuera de cobertura.' });
    reclamos.push({
      id: 'rec' + rcn, polizaId: p.id, clienteId: p.clienteId, aseguradoraId: p.aseguradoraId, asesorId: p.asesorId,
      ramo: p.ramo, tipo: pick(tipos), estado: est, numero: 'SIN-' + between(10000, 99999),
      fecha, montoReclamado: monto, montoAprobado: ['Aprobado', 'Pagado'].includes(est) ? monto : 0,
      descripcion: 'Siniestro de ' + p.ramo.toLowerCase() + ' reportado por el cliente.',
      bitacora: bit, correos: [], docs: rnd() > .5 ? ['denuncia.pdf', 'fotos_daÃ±os.jpg'] : [], actualizado: iso(NOW)
    });
  });

  // ====================================================================
  //  ACADEMIA â€” cursos / bloques de capacitaciÃ³n con progreso
  // ====================================================================
  const cursos = [
    { id: 'cur1', titulo: 'InducciÃ³n Orbit 360', cat: 'InducciÃ³n', emoji: 'ðŸš€', color: '#C5162E', desc: 'Conoce la plataforma, el ciclo comercial y tu dÃ­a a dÃ­a.', lecciones: [{ t: 'Bienvenida y visiÃ³n 360', min: 8, tipo: 'lectura', texto: 'ðŸŒ… BIENVENIDA A ORBIT 360\n\nOrbit 360 es el sistema 360 inteligente e integral para intermediarios de seguros. Una sola plataforma que centraliza TODA la operaciÃ³n comercial, administrativa y financiera.\n\nðŸ’¡ LA VISIÃ“N\nDeja de buscar informaciÃ³n en Excel, WhatsApp, correos y PDFs separados. Orbit 360 conecta todo: desde el primer contacto con un prospecto hasta el pago de la Ãºltima cuota y la renovaciÃ³n de la pÃ³liza.\n\nðŸŽ¯ QUÃ‰ RESUELVE ORBIT 360\nâ€¢ ðŸ” BÃºsqueda instantÃ¡nea: encuentra cualquier cliente, pÃ³liza o recibo en segundos\nâ€¢ ðŸ”„ SincronizaciÃ³n en vivo: el equipo y los asesores ven la misma informaciÃ³n actualizada\nâ€¢ ðŸ¤– AutomatizaciÃ³n: cadencias de cobro y renovaciÃ³n sin intervenciÃ³n manual\nâ€¢ ðŸ“Š AnalÃ­tica real: decisiones basadas en datos, no en suposiciones\nâ€¢ ðŸŒ Multi-paÃ­s: GT y CO con monedas, tasas e IVA configurados\nâ€¢ ðŸ¢ Multi-aseguradora: todas tus vinculaciones en un directorio unificado\n\nðŸ‘¥ DISEÃ‘ADO PARA CADA ROL\nâ€¢ DirecciÃ³n: visiÃ³n total de la empresa con analÃ­tica profunda\nâ€¢ Asesores: su pipeline y cartera sin entrar al sistema operativo\nâ€¢ Administrativo: cobros, liquidaciones y finanzas\nâ€¢ Marketing: calendario de contenidos y automatizaciÃ³n\nâ€¢ Clientes: portal self-service con sus pÃ³lizas y pagos\n\nðŸš€ PRÃ“XIMOS PASOS\nContinÃºa con las siguientes lecciones para dominar cada mÃ³dulo. Al completar el curso obtendrÃ¡s tu certificado de Orbit 360.' }, { t: 'NavegaciÃ³n y mÃ³dulos', min: 12, tipo: 'lectura', texto: 'ðŸ—ºï¸ NAVEGACIÃ“N DE ORBIT 360\n\nEl menÃº lateral organiza la plataforma en grupos:\n\nâš™ï¸ OPERACIÃ“N\nâ€¢ ðŸ“… Cronograma: tu agenda diaria con vencimientos de cobros, renovaciones y tareas\nâ€¢ ðŸ—‚ Orbit Ops: tablero interno del equipo (gestiones, cotizaciones, emisiones)\nâ€¢ ðŸŽ¯ Orbit Leads: pipeline comercial del asesor\nâ€¢ ðŸ§® Cotizador y Comparativo: cotiza con tus aseguradoras y compara propuestas\nâ€¢ ðŸ¢ Orbit Aseguradoras: directorio con fichas completas, tarifas, contactos y documentos\n\nðŸ§‘â€ðŸ’¼ CRM\nâ€¢ Clientes 360, PÃ³lizas, Cobros y cartera, Renovaciones, Cancelaciones, Siniestros, Comisiones, Historial\n\nðŸ“Š ANALÃTICA\nâ€¢ Orbit Insights: 9 vistas con comparativos interanuales, KPIs clicables, producciÃ³n nueva vs renovada\n\nðŸ’° FINANZAS\nâ€¢ Movimientos, Dashboard, CxC/CxP, FinanciaciÃ³n, Presupuesto, Liquidaciones, ConciliaciÃ³n, AnÃ¡lisis IA\n\nâœ‰ï¸ COMUNICACIÃ“N\nâ€¢ Correo integrado (Outlook/Gmail), Notificaciones WA\n\nðŸ“š ACADEMIA Y RECURSOS\nâ€¢ ðŸŽ“ Orbit Academia: cursos, certificaciones y recursos por rol\nâ€¢ ðŸ“£ Orbit Marketing: calendario de contenidos con IA y automatizaciÃ³n\nâ€¢ ðŸ“Š Reportes exportables\nâ€¢ ðŸ¤– Orbit IA (Gemini): asistente en todos los mÃ³dulos\n\nâš™ï¸ ADMINISTRACIÃ“N\nâ€¢ ðŸ‘¥ Equipo y permisos, ConfiguraciÃ³n, ðŸšª Portal del Cliente\n\nðŸ”§ TOPBAR\nâ€¢ ðŸ‘ Ver como: cambia de rol para ver la plataforma como cada usuario\nâ€¢ âœ‰ Correo: badge de no leÃ­dos\nâ€¢ ðŸ”” Novedades\nâ€¢ Selector de paÃ­s: filtra toda la operaciÃ³n por GT o CO' }, { t: 'Ciclo Ops â†” Leads', min: 15, tipo: 'lectura', texto: 'ðŸ”„ CICLO COMERCIAL OPS â†” LEADS\n\nUn mismo negocio se proyecta EN VIVO en dos tableros. Cambiar la etapa en uno se refleja inmediatamente en el otro.\n\nðŸ—‚ ORBIT OPS (equipo interno)\nSolo lo ve el equipo. AquÃ­ viven:\nâ€¢ Gestiones Admin (actualizaciones, endosos, cartas)\nâ€¢ Cotizaciones (cuando el cliente pide precio)\nâ€¢ Inspecciones (verificaciÃ³n del riesgo)\nâ€¢ Emisiones (preparar la pÃ³liza)\nâ€¢ Renovaciones/Modificaciones\n\nðŸŽ¯ ORBIT LEADS (asesor)\nPipeline comercial con etapas: Nuevo â†’ Contactado â†’ Cotizando â†’ Propuesta â†’ NegociaciÃ³n â†’ InspecciÃ³n â†’ EmisiÃ³n â†’ Cierre.\n\nâš¡ AUTOMATIZACIONES DEL CICLO\nâ€¢ Al pasar a Propuesta: se activa automÃ¡ticamente la cadencia de seguimiento (WhatsApp â†’ correo).\nâ€¢ Al cotizar: se genera el N.Âº de cotizaciÃ³n.\nâ€¢ Al llegar a NegociaciÃ³n: elige si va a InspecciÃ³n (requiere visita) o EmisiÃ³n directa.\nâ€¢ Al Emitir: se CREA el cliente automÃ¡ticamente, hereda todos los datos del negocio y se activa la cadencia de encuestas de satisfacciÃ³n.\n\nðŸ’¡ CÃ“MO CREAR UN NUEVO NEGOCIO\n1. Orbit Ops â†’ + Nuevo ingreso (si el cliente pide cotizaciÃ³n directamente)\n2. Orbit Leads â†’ + Nuevo lead (si es un interÃ©s comercial a desarrollar)\nAmbos fluyen al mismo pipeline.' }, { t: 'MÃ³dulo CRM completo (interactivo)', min: 20, tipo: 'lectura', iframeSrc: 'docs/capacitacion-crm.html', texto: '' }, { t: 'EvaluaciÃ³n de inducciÃ³n', min: 10, tipo: 'quiz', preguntas: [
        { p: 'Â¿CuÃ¡l es la diferencia entre Orbit Ops y Orbit Leads?', ops: ['Son el mismo mÃ³dulo con diferente nombre', 'Ops es el tablero interno del equipo; Leads es el pipeline del asesor. Comparten el mismo negocio sincronizado en vivo', 'Ops es para clientes nuevos y Leads para renovaciones'], ok: 1 },
        { p: 'Â¿QuÃ© ocurre al marcar un negocio como "Emitido"?', ops: ['Se archiva el negocio y se borra del pipeline', 'Se crea automÃ¡ticamente el cliente y se activa la cadencia de encuestas de satisfacciÃ³n', 'Pasa a una lista de pendientes sin mÃ¡s acciÃ³n'], ok: 1 },
        { p: 'En Guatemala, Â¿sobre quÃ© se calcula el IVA de una pÃ³liza?', ops: ['Sobre la prima neta Ãºnicamente', 'Sobre la base gravable (prima neta + gastos de emisiÃ³n + gastos financieros + otros)', 'Sobre el total ya con todos los gastos incluidos'], ok: 1 },
        { p: 'Â¿CÃ³mo se deben ver los recibos de un cliente con 3 pÃ³lizas?', ops: ['Todos mezclados en una sola lista por fecha', 'Usando el filtro por pÃ³liza para ver los recibos de cada contrato por separado', 'Buscando manualmente en el mÃ³dulo global de Cobros'], ok: 1 },
        { p: 'Â¿QuÃ© hace el importador inteligente al cargar documentos del cliente?', ops: ['Solo guarda el PDF sin extraer datos', 'Extrae datos (pÃ³liza, vehÃ­culo, DPI) y complementa la ficha sin duplicar registros existentes', 'EnvÃ­a el documento al correo del asesor'], ok: 1 },
        { p: 'Â¿QuÃ© canal usan las cadencias automÃ¡ticas de seguimiento por defecto?', ops: ['Siempre llamada telefÃ³nica', 'WhatsApp primero; correo en ausencia de nÃºmero de WA', 'Correo siempre, independiente del canal del cliente'], ok: 1 }
      ] }], progreso: 100, certificado: true, recursos: [{ nombre: 'Manual de inducciÃ³n.pdf', tipo: 'pdf' }, { nombre: 'Mapa de mÃ³dulos.png', tipo: 'img' }], destinatarios: 'equipo' },
    { id: 'cur2', titulo: 'Fundamentos de Seguros', cat: 'TÃ©cnico', emoji: 'ðŸ›¡ï¸', color: '#1f3a5f', desc: 'Ramos, coberturas, prima, deducible y siniestros.', destinatarios: 'equipo', lecciones: [
      { t: 'QuÃ© es un seguro', min: 10, tipo: 'lectura', secciones: [
        { icon: 'ðŸ›¡ï¸', t: 'Â¿QuÃ© es un seguro?', color: '#1f3a5f', d: 'Un seguro es un contrato (pÃ³liza) por el cual una aseguradora se compromete a indemnizar al asegurado ante un riesgo cubierto, a cambio de una prima. Convierte una pÃ©rdida grande e incierta en un costo pequeÃ±o y predecible.' },
        { icon: 'âš–ï¸', t: 'El principio de mutualidad', color: '#2563a8', d: 'Muchos asegurados aportan primas a un fondo comÃºn. Con ese fondo se pagan los siniestros de los pocos que sufren una pÃ©rdida. AsÃ­ se reparte el riesgo entre todos: nadie enfrenta solo una catÃ¡strofe financiera.' },
        { icon: 'ðŸ¤', t: 'El rol del intermediario', color: '#1f8a4c', d: 'El corredor/agente asesora al cliente, identifica sus riesgos, cotiza con varias aseguradoras, gestiona la emisiÃ³n, los cobros, las renovaciones y acompaÃ±a en el siniestro. Es el puente de confianza entre cliente y aseguradora.' },
        { icon: 'ðŸ’¡', t: 'Conceptos clave', color: '#c9821b', d: 'â€¢ Asegurado: quien recibe la protecciÃ³n.\nâ€¢ Tomador: quien contrata y paga.\nâ€¢ Beneficiario: quien recibe la indemnizaciÃ³n.\nâ€¢ Riesgo: el evento incierto que se cubre.\nâ€¢ Prima: el precio del seguro.\nâ€¢ Suma asegurada: el monto mÃ¡ximo a indemnizar.' }
      ] },
      { t: 'Ramos y subramos', min: 14, tipo: 'lectura', secciones: [
        { icon: 'ðŸš—', t: 'Ramo Autos / VehÃ­culos', color: '#C5162E', d: 'Cubre el vehÃ­culo y la responsabilidad civil frente a terceros. Subramos: liviano, pesado, motos, RC, pÃ©rdidas totales/parciales, por kilÃ³metros. En Colombia el SOAT es obligatorio y se complementa con todo riesgo.' },
        { icon: 'â¤ï¸', t: 'Ramo Vida y Personas', color: '#1f8a4c', d: 'Protege a la familia ante fallecimiento o incapacidad del asegurado. Subramos: vida individual, vida grupo, accidentes personales. Suele tener componente de ahorro en modalidades dotales.' },
        { icon: 'ðŸ¥', t: 'Ramo Gastos MÃ©dicos / Salud', color: '#2563a8', d: 'Cubre gastos hospitalarios y mÃ©dicos. Subramos: individual, familiar, colectivo (empresas). Variables clave: suma asegurada, deducible, coaseguro y red de hospitales.' },
        { icon: 'ðŸ ', t: 'Ramo DaÃ±os / Patrimoniales', color: '#c9821b', d: 'Hogar, multirriesgo empresarial, incendio, robo, equipo electrÃ³nico, transporte. Protege bienes e inventarios. Suelen requerir inspecciÃ³n previa para sumas altas.' },
        { icon: 'ðŸ“‹', t: 'Ramo Fianzas / Cumplimiento', color: '#6b4ea0', d: 'Garantiza el cumplimiento de obligaciones contractuales (cumplimiento, anticipo, calidad, seriedad de oferta). Muy usado en licitaciones y contratos con el Estado.' }
      ] },
      { t: 'Prima, deducible y coberturas', min: 16, tipo: 'lectura', secciones: [
        { icon: 'ðŸ’°', t: 'ComposiciÃ³n de la prima', color: '#1f3a5f', d: 'Prima total = Prima neta + Gastos de emisiÃ³n + Recargo por fraccionamiento + Asistencias + IVA. La PRIMA NETA es la base sobre la que se calculan comisiones, metas y producciÃ³n.' },
        { icon: 'ðŸ§¾', t: 'Impuestos por paÃ­s', color: '#2563a8', d: 'Guatemala: IVA 12% + gastos de emisiÃ³n tÃ­picos del 5% de la prima neta. Colombia: IVA 19%. Estos valores son configurables por paÃ­s en Orbit, y al importar una pÃ³liza se desglosan automÃ¡ticamente.' },
        { icon: 'ðŸ›¡ï¸', t: 'Deducible', color: '#c9821b', d: 'Es la parte del siniestro que asume el asegurado antes de que la aseguradora pague. A mayor deducible, menor prima (y viceversa). Ej: deducible del 1% sobre el valor asegurado en autos.' },
        { icon: 'ðŸ“‘', t: 'Coberturas y exclusiones', color: '#C5162E', d: 'La cobertura define QUÃ‰ se paga; las exclusiones, quÃ© NO. Leer siempre las condiciones particulares: lÃ­mites, sublÃ­mites, periodos de carencia y coaseguro. El asesor debe explicarlas en lenguaje simple.' }
      ] },
      { t: 'Proceso de siniestro', min: 12, tipo: 'lectura', secciones: [
        { icon: 'ðŸ“ž', t: '1 Â· Aviso del siniestro', color: '#C5162E', d: 'El cliente reporta el evento. El asesor abre el reclamo en Orbit (mÃ³dulo Siniestros / ficha del cliente), registra fecha, tipo y descripciÃ³n, y orienta sobre la documentaciÃ³n requerida.' },
        { icon: 'ðŸ“‚', t: '2 Â· DocumentaciÃ³n y ajuste', color: '#c9821b', d: 'Se reÃºnen documentos (denuncia, facturas, fotos). La aseguradora asigna un ajustador que evalÃºa el daÃ±o y determina la procedencia y el monto indemnizable.' },
        { icon: 'ðŸ’µ', t: '3 Â· ResoluciÃ³n e indemnizaciÃ³n', color: '#1f8a4c', d: 'La aseguradora aprueba, objeta o rechaza. Si aprueba, paga la indemnizaciÃ³n menos el deducible. Todo el avance queda en la bitÃ¡cora del reclamo, visible para el cliente en su portal.' },
        { icon: 'ðŸ”', t: '4 Â· Seguimiento y cierre', color: '#2563a8', d: 'El asesor da seguimiento hasta el pago y cierra el reclamo. Un buen manejo del siniestro es el momento de mayor fidelizaciÃ³n: el cliente comprueba el valor real del seguro.' }
      ] },
      { t: 'EvaluaciÃ³n tÃ©cnica', min: 15, tipo: 'quiz', preguntas: [
        { p: 'Â¿Sobre quÃ© base se calculan comisiones, metas y producciÃ³n en Orbit?', ops: ['Prima total con impuestos', 'Prima NETA recaudada', 'Suma asegurada'], ok: 1 },
        { p: 'Â¿QuÃ© es el deducible?', ops: ['Un impuesto sobre la prima', 'La parte del siniestro que asume el asegurado antes de que pague la aseguradora', 'La comisiÃ³n del asesor'], ok: 1 },
        { p: 'Â¿CuÃ¡l es el IVA de seguros en Colombia?', ops: ['12%', '19%', '0%'], ok: 1 },
        { p: 'Â¿CuÃ¡l es el primer paso del proceso de siniestro?', ops: ['El pago de la indemnizaciÃ³n', 'El aviso/reporte del siniestro', 'La renovaciÃ³n de la pÃ³liza'], ok: 1 }
      ] }
    ], progreso: 60, certificado: false, recursos: [{ nombre: 'Glosario de seguros.pdf', tipo: 'pdf' }, { nombre: 'Tabla de ramos por paÃ­s.pdf', tipo: 'pdf' }] },
    { id: 'cur3', titulo: 'Ventas Consultivas', cat: 'Comercial', emoji: 'ðŸŽ¯', color: '#1f8a4c', desc: 'ProspecciÃ³n, descubrimiento de necesidades y cierre.', destinatarios: 'equipo', lecciones: [
      { t: 'ProspecciÃ³n efectiva', min: 12, tipo: 'lectura', secciones: [
        { icon: 'ðŸŽ¯', t: 'Define tu cliente ideal', color: '#1f8a4c', d: 'No todos los prospectos valen lo mismo. Define perfiles: por ramo, por capacidad de pago, por potencial de multiventa. En Orbit, el canal de ingreso (referido, redes, cliente actual) te dice de dÃ³nde viene tu mejor negocio.' },
        { icon: 'ðŸ”—', t: 'Fuentes de prospecciÃ³n', color: '#2563a8', d: 'Referidos (la mejor fuente), base de clientes actuales (multiventa y cross-sell), redes sociales, alianzas. Registra TODO prospecto como negocio en Orbit Leads para no perder seguimiento.' },
        { icon: 'ðŸ“Š', t: 'El embudo en Orbit Leads', color: '#c9821b', d: 'Nuevo â†’ Contactado â†’ Cotizado â†’ Propuesta â†’ NegociaciÃ³n â†’ Cierre. Mide tu tasa de conversiÃ³n entre etapas para saber dÃ³nde se te caen los negocios y enfocar esfuerzo.' }
      ] },
      { t: 'Preguntas de descubrimiento', min: 10, tipo: 'lectura', secciones: [
        { icon: 'â“', t: 'Vender es preguntar, no hablar', color: '#1f8a4c', d: 'El asesor consultivo dedica el 70% del tiempo a entender al cliente. Las mejores ventas nacen de buenas preguntas, no de buenos discursos.' },
        { icon: 'ðŸ”', t: 'Preguntas que descubren necesidad', color: '#2563a8', d: 'â€¢ Â¿QuÃ© pasarÃ­a con tu familia/negocio si...?\nâ€¢ Â¿Tienes hoy alguna protecciÃ³n? Â¿Sabes quÃ© cubre?\nâ€¢ Â¿CuÃ¡l es tu mayor preocupaciÃ³n financiera?\nâ€¢ Â¿Has tenido algÃºn siniestro antes?' },
        { icon: 'ðŸ’¡', t: 'De la necesidad a la soluciÃ³n', color: '#c9821b', d: 'Conecta cada cobertura con un dolor real del cliente. No vendas "todo riesgo": vende "tranquilidad si chocas y no tienes para reparar". Habla de beneficios, no de caracterÃ­sticas.' }
      ] },
      { t: 'Manejo de objeciones', min: 14, tipo: 'lectura', secciones: [
        { icon: 'ðŸ›‘', t: '"EstÃ¡ muy caro"', color: '#C5162E', d: 'No bajes el precio: sube el valor. Reencuadra el costo diario ("son Q5 al dÃ­a por proteger tu auto") y compÃ¡ralo con el costo de NO tener seguro. Ofrece fraccionamiento.' },
        { icon: 'â³', t: '"DÃ©jame pensarlo"', color: '#c9821b', d: 'Casi siempre esconde una duda no resuelta. Pregunta: "Â¿QuÃ© te genera duda para decidir hoy?". Resuelve la objeciÃ³n real en lugar de presionar.' },
        { icon: 'ðŸ¤·', t: '"Ya tengo seguro"', color: '#2563a8', d: 'Perfecto: ofrÃ©cele una revisiÃ³n gratuita de su pÃ³liza actual. Casi siempre encontrarÃ¡s coberturas faltantes o mejor precio. Es la puerta de entrada al cliente.' }
      ] },
      { t: 'TÃ©cnicas de cierre', min: 12, tipo: 'lectura', secciones: [
        { icon: 'âœ…', t: 'Cierre por resumen', color: '#1f8a4c', d: 'Recapitula los beneficios acordados y asume el siguiente paso: "Entonces te emito la cobertura X con pago mensual, Â¿te parece bien que iniciemos hoy?".' },
        { icon: 'âš¡', t: 'Cierre por urgencia real', color: '#c9821b', d: 'Usa hechos reales, no presiÃ³n falsa: vigencia de la cotizaciÃ³n, cambio de tarifa, exposiciÃ³n sin cobertura mientras no firme. La urgencia honesta acelera la decisiÃ³n.' },
        { icon: 'ðŸ”', t: 'DespuÃ©s del cierre: la cadencia', color: '#2563a8', d: 'Al emitir, Orbit crea el cliente y activa la cadencia de satisfacciÃ³n. El cierre no es el final: es el inicio de la renovaciÃ³n del prÃ³ximo aÃ±o y de la multiventa.' }
      ] }
    ], progreso: 25, certificado: false, recursos: [{ nombre: 'Guion de descubrimiento.pdf', tipo: 'pdf' }, { nombre: 'Manejo de objeciones.pdf', tipo: 'pdf' }] },
    { id: 'cur4', titulo: 'Producto: Auto', cat: 'Producto', emoji: 'ðŸš—', color: '#c9821b', desc: 'Cobertura, tarifas y argumentos de venta de Auto.', destinatarios: 'equipo', lecciones: [
      { t: 'Coberturas de Auto', min: 10, tipo: 'lectura', secciones: [
        { icon: 'ðŸš—', t: 'Cobertura amplia (todo riesgo)', color: '#C5162E', d: 'Cubre daÃ±os al propio vehÃ­culo (colisiÃ³n, vuelco, incendio, robo) + responsabilidad civil + asistencias. Es la cobertura mÃ¡s completa y la de mayor prima.' },
        { icon: 'ðŸ›¡ï¸', t: 'Responsabilidad Civil', color: '#2563a8', d: 'Cubre daÃ±os que tu vehÃ­culo causa a terceros (personas y bienes). En Colombia el SOAT es obligatorio para lesiones; la RC voluntaria amplÃ­a lÃ­mites y daÃ±os materiales.' },
        { icon: 'ðŸ”§', t: 'Coberturas adicionales', color: '#1f8a4c', d: 'Asistencia vial, vehÃ­culo sustituto, gastos legales, accidentes a ocupantes, pÃ©rdida parcial vs total. Cada aseguradora arma su paquete: conoce las de tus aliadas.' },
        { icon: 'âš™ï¸', t: 'Variables que mueven la prima', color: '#c9821b', d: 'Valor y aÃ±o del vehÃ­culo, uso (particular/comercial), zona de circulaciÃ³n, edad del conductor, historial de siniestros y deducible elegido.' }
      ] },
      { t: 'CÃ³mo cotizar en Orbit', min: 12, tipo: 'lectura', secciones: [
        { icon: 'ðŸ§®', t: 'Usa el Cotizador', color: '#c9821b', d: 'En Orbit Cotizador eliges paÃ­s, ramo Auto, valor asegurado, aÃ±o y datos del vehÃ­culo. El motor calcula con las tarifas de TUS aseguradoras (configurables) o ingresas la prima manual.' },
        { icon: 'ðŸ“Š', t: 'Compara y elige', color: '#2563a8', d: 'Genera cotizaciones con varias aseguradoras, marca las que quieras imprimir (en el formato de cada aseguradora) y deriva las elegidas al Comparativo para presentar al cliente.' },
        { icon: 'ðŸ“„', t: 'Propuestas sin tarifa', color: '#1f8a4c', d: 'Si una aseguradora no tiene tarifa cargada, sube su PDF de propuesta directamente al Comparativo. AsÃ­ comparas todas las opciones aunque no todas estÃ©n tarifadas.' }
      ] },
      { t: 'Argumentario de venta', min: 8, tipo: 'lectura', secciones: [
        { icon: 'ðŸ’¬', t: 'El argumento del valor', color: '#1f8a4c', d: '"Tu auto vale Q120,000. Por menos de lo que gastas en combustible en un mes, proteges esa inversiÃ³n y a tu familia. Si chocas, no pones tu ahorro en riesgo."' },
        { icon: 'ðŸŽ¯', t: 'DiferÃ©nciate por servicio', color: '#2563a8', d: 'El precio lo iguala cualquiera. TÃº ofreces acompaÃ±amiento en el siniestro, gestiÃ³n de cobros, recordatorios de renovaciÃ³n y un portal donde el cliente ve todo. Vende la relaciÃ³n, no la pÃ³liza.' }
      ] }
    ], progreso: 0, certificado: false, recursos: [{ nombre: 'Coberturas Auto por aseguradora.pdf', tipo: 'pdf' }] },
    
    { id: 'cur6', titulo: 'Orbit Leads para Asesores', cat: 'Comercial', emoji: 'ðŸŽ¯', color: '#2563a8', desc: 'Domina el pipeline comercial: prospectar, cotizar, negociar y cerrar.', destinatarios: 'Asesor', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Guion de descubrimiento.pdf', tipo: 'pdf' }, { nombre: 'Manejo de objeciones.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'El ciclo del prospecto', min: 10, tipo: 'lectura', secciones: [
          { icon: 'ðŸŽ¯', t: 'Las 8 etapas', color: '#2563a8', d: 'Cada prospecto recorre: Nuevo â†’ Contactado â†’ Cotizando â†’ Propuesta enviada â†’ NegociaciÃ³n â†’ InspecciÃ³n â†’ EmisiÃ³n â†’ Emitido. El pipeline en Orbit Leads muestra en quÃ© etapa estÃ¡ cada negocio y quÃ© falta para avanzar.' },
          { icon: 'ðŸšª', t: 'Â¿CÃ³mo entra un prospecto?', color: '#1f8a4c', d: 'Lead directo: el cliente pide precio sin datos completos â†’ entra en "Nuevo". Desde Ops (cotizaciÃ³n tÃ©cnica): el equipo ya tiene los datos y cotiza â†’ entra en "Cotizando". En ambos casos el asesor lo trabaja desde Leads.' },
          { icon: 'ðŸ', t: 'QuÃ© hacer en cada etapa', color: '#C5162E', d: 'Nuevo: agenda el primer contacto. Contactado: registra resultado y compromisos. Cotizando: pide cotizaciÃ³n a Ops o usa el Cotizador. Propuesta: envÃ­a la propuesta personalizada. NegociaciÃ³n: resuelve objeciones. InspecciÃ³n/EmisiÃ³n: coordina con la aseguradora. Emitido: Â¡ganado! El cliente se crea automÃ¡ticamente.' }
        ]},
        { t: 'Cadencias de seguimiento automÃ¡tico', min: 8, tipo: 'lectura', secciones: [
          { icon: 'ðŸ”', t: 'QuÃ© dispara la cadencia', color: '#2563a8', d: 'Al pasar a "Propuesta", Orbit activa la cadencia: DÃ­a 1 WhatsApp de bienvenida, DÃ­a 3 seguimiento, DÃ­a 7 correo con propuesta, DÃ­a 14 mensaje de cierre. Todo queda registrado en el negocio.' },
          { icon: 'ðŸ“²', t: 'Canal inteligente', color: '#1f8a4c', d: 'Si el cliente tiene WhatsApp, se usa WA primero; si no, correo. No se generan llamadas automÃ¡ticas: tÃº decides cuÃ¡ndo llamar. Puedes aÃ±adir tareas manuales al cronograma para un seguimiento mÃ¡s personal.' },
          { icon: 'ðŸ“‰', t: 'Aprende de lo perdido', color: '#C5162E', d: 'Marca un negocio como "Perdido" con su motivo. La analÃ­tica de motivos de pÃ©rdida te dice dÃ³nde mejorar (precio, tiempo de respuesta, cobertura).' }
        ]},
        { t: 'Manejo de objeciones y cierre', min: 9, tipo: 'lectura', secciones: [
          { icon: 'ðŸ’¬', t: 'La objeciÃ³n es informaciÃ³n', color: '#2563a8', d: 'No es un "no", es pedir mÃ¡s datos. "EstÃ¡ caro" â†’ reencuadra a valor. "Lo voy a pensar" â†’ Â¿quÃ© falta para decidir hoy? "Ya tengo seguro" â†’ ofrece revisiÃ³n gratuita. "No me alcanza" â†’ fracciona o escalona la cobertura.' },
          { icon: 'ðŸŽ¯', t: 'TÃ©cnicas de cierre', color: '#1f8a4c', d: 'Cierre por alternativa (Â¿amplia o RC ampliada?), por urgencia real (la condiciÃ³n vence el {fecha}), por resumen (recapitula beneficios y pide la decisiÃ³n).' },
          { icon: 'ðŸ“', t: 'Registra todo', color: '#C5162E', d: 'Cada objeciÃ³n y compromiso va en la nota del negocio. Esa trazabilidad alimenta la analÃ­tica y te hace mejor vendedor con el tiempo.' }
        ]},
        { t: 'Gestionar mi pipeline', min: 8, tipo: 'quiz', preguntas: [
          { p: 'Â¿DÃ³nde ve el asesor su pipeline comercial?', ops: ['En Orbit Ops', 'En Orbit Leads', 'En Clientes 360'], ok: 1 },
          { p: 'Â¿QuÃ© activa pasar a la etapa "Propuesta"?', ops: ['Una llamada telefÃ³nica', 'La cadencia automÃ¡tica de seguimiento (WA/correo)', 'Un email manual'], ok: 1 },
          { p: 'Â¿QuÃ© pasa cuando el negocio llega a "Emitido"?', ops: ['Se archiva y no pasa nada', 'Hay que crear el cliente a mano', 'Se crea el cliente automÃ¡ticamente y arranca la cadencia de encuestas'], ok: 2 }
        ]}
      ] },
    { id: 'cur7', titulo: 'Finanzas para Directores', cat: 'Finanzas', emoji: 'ðŸ’°', color: '#c9821b', desc: 'Control financiero completo: movimientos, liquidaciones, presupuesto e IA.', destinatarios: 'DirecciÃ³n', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Plantilla de presupuesto.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'MÃ³dulo Finanzas â€” visiÃ³n general', min: 12, tipo: 'lectura', secciones: [
          { icon: 'ðŸ§¾', t: 'Movimientos', color: '#c9821b', d: 'Registra ingresos (comisiones de aseguradoras, incentivos) y egresos (comisiones a asesores, gastos fijos, marketing) por mes y paÃ­s. Crea meses manualmente o importa el histÃ³rico con el importador inteligente.' },
          { icon: 'ðŸ’³', t: 'CxC / CxP y financiaciÃ³n', color: '#1f8a4c', d: 'Cuentas por Cobrar: comisiones facturadas sin recaudar. Cuentas por Pagar: liquidaciones de asesores pendientes (pasan al mes siguiente si no se pagan). La financiaciÃ³n se controla aparte para no inflar la utilidad operativa.' },
          { icon: 'ðŸ‘¥', t: 'Liquidaciones y presupuesto', color: '#C5162E', d: 'LiquidaciÃ³n empresa y por asesor, con botÃ³n "Preparar Lote" para revisar, ajustar y aprobar. Presupuesto mensual con semÃ¡foros verde/Ã¡mbar/rojo que alertan desviaciones.' }
        ]},
        { t: 'Leer el dashboard financiero', min: 10, tipo: 'lectura', secciones: [
          { icon: 'ðŸ“ˆ', t: 'Margen operativo', color: '#c9821b', d: 'Ingresos por comisiÃ³n menos egresos operativos. Si baja mes a mes, revisa gastos fijos y comisiones a asesores.' },
          { icon: 'ðŸ’§', t: 'Caja vs utilidad', color: '#1f8a4c', d: 'Una comisiÃ³n facturada (CxC) aÃºn no es dinero en banco. Vigila el desfase entre facturar y recaudar para no quedarte sin caja.' },
          { icon: 'ðŸ”', t: 'Comparativos', color: '#2563a8', d: 'Intermensual detecta estacionalidad (meses fuertes de renovaciÃ³n). Interanual mide crecimiento real vs el mismo mes del aÃ±o pasado. El anÃ¡lisis crÃ­tico con IA sugiere metas y estrategias por Ã¡rea.' }
        ]},
        { t: 'EvaluaciÃ³n del mÃ³dulo', min: 10, tipo: 'quiz', preguntas: [
          { p: 'Â¿DÃ³nde se registran los ingresos por financiaciÃ³n para que NO inflen la utilidad operativa?', ops: ['En Movimientos â†’ Ingresos', 'En FinanciaciÃ³n (separado de operativo)', 'En CxC como ingreso esperado'], ok: 1 },
          { p: 'Â¿QuÃ© son las CxP en Orbit Finanzas?', ops: ['Cobros que los clientes deben', 'Liquidaciones de asesores y egresos pendientes de pago', 'Facturas de aseguradoras no cobradas'], ok: 1 }
        ]}
      ] },
    { id: 'cur8', titulo: 'Marketing Digital para Seguros', cat: 'Marketing', emoji: 'ðŸ“£', color: '#6b4ea0', desc: 'Estrategia de contenidos, automatizaciÃ³n y mediciÃ³n para intermediarios.', destinatarios: 'Marketing', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Parrilla de contenidos.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'El calendario de contenidos', min: 10, tipo: 'lectura', secciones: [
          { icon: 'ðŸ“…', t: 'CÃ³mo funciona', color: '#6b4ea0', d: 'Abre Orbit Marketing, navega el calendario mensual y haz clic en un dÃ­a para agregar contenido. Cada publicaciÃ³n tiene canal, tipo, enfoque, tÃ­tulo, copy, CTA y hashtags.' },
          { icon: 'ðŸŽ¨', t: 'Tipos de contenido', color: '#2563a8', d: 'Texto (educativo, tips, normativa), carrusel (comparativos, listas), reel (30-60s), historia (24h) y video largo (HeyGen o pantalla). Mezcla formatos para no aburrir.' },
          { icon: 'ðŸ¤–', t: 'Generar y automatizar', color: '#1f8a4c', d: '"Generar mes con IA" crea un mes de ideas con criterios estratÃ©gicos (segmentaciÃ³n, objetivos por semana, fechas clave, CTA). Metricool programa y publica; Make conecta Orbitâ†’Canvaâ†’Metricool; las campaÃ±as de renovaciÃ³n se disparan solas a 30 dÃ­as del vencimiento.' }
        ]},
        { t: 'Emojis, hashtags y copywriting', min: 8, tipo: 'quiz', preguntas: [
          { p: 'Â¿QuÃ© herramienta programa y publica en todas las redes desde un solo lugar?', ops: ['HeyGen', 'Metricool', 'Canva'], ok: 1 },
          { p: 'Â¿QuÃ© herramienta conecta Orbit â†’ Canva â†’ Metricool para automatizar?', ops: ['Make', 'Google Sheets', 'WhatsApp API'], ok: 0 }
        ]}
      ] },
    { id: 'cur9', titulo: 'Portal del Cliente', cat: 'InducciÃ³n', emoji: 'ðŸšª', color: '#0f766e', desc: 'GuÃ­a para clientes: cÃ³mo usar su portal, ver pÃ³lizas, pagar y solicitar gestiones.', destinatarios: 'clientes', progreso: 0, certificado: false,
      recursos: [{ nombre: 'GuÃ­a rÃ¡pida del portal.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'Bienvenida a tu portal', min: 6, tipo: 'lectura', secciones: [
          { icon: 'ðŸ“‘', t: 'Tus pÃ³lizas y pagos', color: '#0f766e', d: 'Consulta estado, coberturas, prima y vigencia de todos tus seguros. Revisa tu historial de pagos y los recibos pendientes; reporta un pago cuando lo hagas y tu asesor lo confirma.' },
          { icon: 'ðŸš¨', t: 'Siniestros y documentos', color: '#C5162E', d: 'Sigue el estado de cualquier reclamo que reportaste. Accede a las carÃ¡tulas y documentos de tu expediente, y sube documentos nuevos cuando te los pidan.' },
          { icon: 'ðŸ—‚', t: 'Solicitar gestiones y aprender', color: '#1f8a4c', d: 'Â¿Necesitas un cambio o tienes una duda? EnvÃ­a una solicitud directa a tu asesor desde el portal. En "Aprende" tienes recursos sobre tus seguros y un glosario de tÃ©rminos.' }
        ]},
        { t: 'Â¿CÃ³mo reportar un pago?', min: 5, tipo: 'quiz', preguntas: [
          { p: 'Â¿CÃ³mo reporta un cliente un pago en el portal?', ops: ['Llamando a la aseguradora', 'En "Mis pagos" â†’ seleccionar recibo â†’ "ðŸ“¤ Reportar pago"', 'Enviando un correo a la compaÃ±Ã­a'], ok: 1 }
        ]}
      ] },
    { id: 'cur5', titulo: 'Cumplimiento y Confidencialidad', cat: 'Normativa', emoji: 'âš–ï¸', color: '#6b4ea0', desc: 'ProtecciÃ³n de datos, Habeas Data, secreto profesional y conducta.', destinatarios: 'equipo', progreso: 0, certificado: false,
      recursos: [{ nombre: 'PolÃ­tica de tratamiento de datos.pdf', tipo: 'pdf' }, { nombre: 'Acuerdo de confidencialidad.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'ProtecciÃ³n de datos personales', min: 12, tipo: 'lectura', secciones: [
          { icon: 'ðŸ›¡ï¸', t: 'Â¿QuÃ© protege la ley?', color: '#6b4ea0', d: 'Los datos personales de clientes (identidad, contacto, datos de pÃ³lizas, salud en GM, financieros) estÃ¡n protegidos por la normativa del paÃ­s. En Colombia, la Ley 1581 de 2012 (Habeas Data); en Guatemala, las normas de protecciÃ³n de datos y confidencialidad de seguros. Tratar mal estos datos expone a la empresa a sanciones y a la pÃ©rdida de confianza.' },
          { icon: 'âœ…', t: 'Principios que debes cumplir', color: '#1f8a4c', d: 'Finalidad: usa los datos solo para gestionar los seguros del cliente. Necesidad: pide solo lo que necesitas. Seguridad: protege tus credenciales y no compartas informaciÃ³n por canales inseguros. CirculaciÃ³n restringida: no envÃ­es bases de datos por WhatsApp o correo personal.' },
          { icon: 'âš–ï¸', t: 'Derechos del titular', color: '#C5162E', d: 'El cliente puede en cualquier momento conocer, actualizar, rectificar y solicitar la supresiÃ³n de sus datos, y revocar la autorizaciÃ³n. En el Portal del Cliente acepta la clÃ¡usula de tratamiento al primer ingreso; esa aceptaciÃ³n queda registrada con fecha.' }
        ]},
        { t: 'Confidencialidad y conducta profesional', min: 10, tipo: 'lectura', secciones: [
          { icon: 'ðŸ”’', t: 'InformaciÃ³n Confidencial', color: '#1E2227', d: 'Es confidencial todo dato de clientes, cartera, tarifas, comisiones, y la propia plataforma (arquitectura, lÃ³gicas, know-how). No la copies, fotografÃ­es ni extraigas fuera de Orbit 360. La obligaciÃ³n se mantiene incluso despuÃ©s de terminar tu relaciÃ³n con la empresa.' },
          { icon: 'ðŸ¤', t: 'Conducta esperada', color: '#2563a8', d: 'ActÃºa con honestidad con clientes y aseguradoras. No prometas coberturas que no existen. Registra todo en la plataforma (trazabilidad). Ante un conflicto de interÃ©s, declÃ¡ralo. La cartera es de la empresa, no se traslada al salir.' },
          { icon: 'ðŸ¤–', t: 'Uso responsable de la IA', color: '#c9821b', d: 'La IA de Orbit (extracciÃ³n, redacciÃ³n, anÃ¡lisis) es un apoyo. Verifica siempre antes de enviar a un cliente o tomar decisiones. TÃº eres responsable del resultado final.' }
        ]},
        { t: 'EvaluaciÃ³n de cumplimiento', min: 8, tipo: 'quiz', preguntas: [
          { p: 'Â¿Hasta cuÃ¡ndo dura tu obligaciÃ³n de confidencialidad sobre los datos de clientes?', ops: ['Solo mientras trabajo en la empresa', 'Indefinidamente, incluso tras terminar la relaciÃ³n', 'Un aÃ±o despuÃ©s de salir'], ok: 1 },
          { p: 'Â¿CuÃ¡l de estas prÃ¡cticas SÃ es correcta?', ops: ['Enviar la base de clientes a mi correo personal para trabajar en casa', 'Usar los datos solo dentro de la plataforma y para gestionar sus seguros', 'Compartir tarifas con un conocido de otra corredurÃ­a'], ok: 1 },
          { p: 'Â¿QuÃ© debo hacer con un texto que generÃ³ la IA antes de enviarlo al cliente?', ops: ['Enviarlo tal cual, la IA no se equivoca', 'Verificarlo y ajustarlo con criterio profesional', 'Reenviarlo a la aseguradora sin leer'], ok: 1 }
        ]}
      ] },
    { id: 'cur_master', titulo: 'Curso Maestro Orbit 360 â€” visiÃ³n integral', cat: 'InducciÃ³n', emoji: 'ðŸŒ', color: '#C5162E', desc: 'Recorrido completo por toda la plataforma: el ciclo 360, cada mÃ³dulo, la sincronÃ­a en vivo y el valor para el negocio.', destinatarios: 'equipo', progreso: 0, certificado: false,
      recursos: [{ nombre: 'Mapa integral Orbit 360.png', tipo: 'img' }, { nombre: 'Manual maestro.pdf', tipo: 'pdf' }],
      lecciones: [
        { t: 'QuÃ© es Orbit 360 y el ciclo integral', min: 12, tipo: 'lectura', secciones: [
          { icon: 'ðŸŒ', t: 'Un sistema 360 para el intermediario', color: '#C5162E', d: 'Orbit 360 integra en un solo lugar todo el ciclo del intermediario de seguros: captar (Leads/Ops), vender (Cotizador/Comparativo), administrar (PÃ³lizas/Cobros/Renovaciones/Cancelaciones), cobrar y liquidar (Finanzas/Comisiones), atender (Siniestros/Portal/Correo) y crecer (Marketing/Insights/Academia). Todo conectado, sin islas de informaciÃ³n.' },
          { icon: 'ðŸ”—', t: 'SincronÃ­a en vivo', color: '#1f8a4c', d: 'Cada acciÃ³n se refleja al instante en todo el sistema: aplicar un pago baja la cartera y suma a Finanzas; cerrar un Lead crea el cliente y activa encuestas; cancelar una pÃ³liza crea una gestiÃ³n de recuperaciÃ³n y queda en la ficha. No se duplica el trabajo: se registra una vez y vive en todos los mÃ³dulos.' },
          { icon: 'ðŸ¢', t: 'Multi-tenant y white-label', color: '#1E2227', d: 'La plataforma es configurable por cliente (cada corredurÃ­a): su logo, su paleta, sus paÃ­ses y monedas, sus aseguradoras, sus catÃ¡logos y los mÃ³dulos que ve cada rol. Una sola base, muchas marcas.' }
        ]},
        { t: 'Los mÃ³dulos comerciales', min: 12, tipo: 'lectura', secciones: [
          { icon: 'ðŸŽ¯', t: 'Leads y Ops', color: '#2563a8', d: 'Ops es el tablero interno del equipo (gestiones administrativas y de renovaciÃ³n); Leads es el pipeline del asesor. Comparten datos en vivo: lo que avanza en uno se ve en el otro. El asesor no ve Ops; ve sus gestiones por Leads.' },
          { icon: 'ðŸ§®', t: 'Cotizador y Comparativo', color: '#c9821b', d: 'El Cotizador arma cotizaciones con campos por ramo (auto con marcaâ†’lÃ­neaâ†’versiÃ³n, GM por integrantes, etc.) y deriva al Comparativo. El Comparativo carga propuestas de varias aseguradoras (incluida extracciÃ³n real de PDF) y las pone lado a lado con recomendaciÃ³n.' },
          { icon: 'ðŸ‘¤', t: 'Cliente 360', color: '#1f8a4c', d: 'La ficha del cliente reÃºne pÃ³lizas, vehÃ­culos, recibos, siniestros, documentos, correos y actividad. Todo clicable, con detalle. Desde aquÃ­ se solicita una gestiÃ³n, se envÃ­a WhatsApp/correo y se ve el historial completo.' }
        ]},
        { t: 'AdministraciÃ³n, finanzas y atenciÃ³n', min: 12, tipo: 'lectura', secciones: [
          { icon: 'ðŸ“‹', t: 'PÃ³lizas, Cobros, Renovaciones, Cancelaciones', color: '#C5162E', d: 'La pÃ³liza tiene desglose de prima (neta, gastos, recargo, IVA) y genera recibos automÃ¡ticos segÃºn la forma de pago. Cobros gestiona la cartera y aplica pagos. Renovaciones propone y compara; Cancelaciones registra el motivo y dispara recuperaciÃ³n.' },
          { icon: 'ðŸ’°', t: 'Finanzas y Comisiones', color: '#c9821b', d: 'Finanzas centraliza movimientos, CxC/CxP autoadministrables, liquidaciones por lote, presupuesto con semÃ¡foros y dashboard con comparativos. Comisiones calcula por aseguradora y reparte al vendedor, todo sobre prima neta recaudada.' },
          { icon: 'ðŸš¨', t: 'Siniestros, Portal y Correo', color: '#0f766e', d: 'Siniestros lleva la bitÃ¡cora del reclamo con la aseguradora. El Portal da al cliente autoservicio (pÃ³lizas, pagos, gestiones, aprende). El Correo asocia hilos a cliente/pÃ³liza/gestiÃ³n/reclamo, con trazabilidad.' }
        ]},
        { t: 'Crecimiento y configuraciÃ³n', min: 10, tipo: 'lectura', secciones: [
          { icon: 'ðŸ“ˆ', t: 'Insights, Marketing y Academia', color: '#2563a8', d: 'Insights mide producciÃ³n nueva vs renovada contra metas, con comparativos y anÃ¡lisis crÃ­tico por IA. Marketing planifica contenidos (manual o con IA) e integra redes. Academia capacita al equipo y a los clientes con cursos, manuales y recursos.' },
          { icon: 'ðŸ¤–', t: 'Orbit IA transversal', color: '#6b4ea0', d: 'Una capa de IA (proveedor configurable, sin sesgo) asiste en extracciÃ³n de documentos, redacciÃ³n de mensajes, anÃ¡lisis de datos y generaciÃ³n de contenido y cursos. Siempre con verificaciÃ³n humana.' },
          { icon: 'âš™ï¸', t: 'ConfiguraciÃ³n y automatizaciones', color: '#1E2227', d: 'Todo es autoadministrable: marca, paleta, paÃ­ses, monedas, catÃ¡logos, aseguradoras, roles y mÃ³dulos por usuario, integraciones (con API key/webhook) y automatizaciones (eventoâ†’canalâ†’plantilla). Sin tocar cÃ³digo.' }
        ]},
        { t: 'EvaluaciÃ³n integral', min: 10, tipo: 'quiz', preguntas: [
          { p: 'Â¿QuÃ© significa "sincronÃ­a en vivo" en Orbit 360?', ops: ['Que hay que actualizar manualmente cada mÃ³dulo', 'Que una acciÃ³n se refleja al instante en todos los mÃ³dulos relacionados', 'Que solo se sincroniza al cerrar sesiÃ³n'], ok: 1 },
          { p: 'Â¿QuiÃ©n NO ve el tablero Ops?', ops: ['La direcciÃ³n', 'El asesor (ve sus gestiones por Leads)', 'El Ã¡rea administrativa'], ok: 1 },
          { p: 'Â¿Sobre quÃ© base se calculan producciÃ³n, metas y comisiones?', ops: ['Prima total facturada', 'Prima neta recaudada', 'NÃºmero de pÃ³lizas'], ok: 1 },
          { p: 'Â¿QuÃ© se puede configurar sin tocar cÃ³digo?', ops: ['Solo el logo', 'Marca, paÃ­ses, catÃ¡logos, aseguradoras, roles, integraciones y automatizaciones', 'Nada, todo requiere programador'], ok: 1 }
        ]}
      ] }
  ];

  // ====================================================================
  //  NOTIFICACIONES DEL PORTAL (cliente) â€” admin envÃ­a a todos/uno
  // ====================================================================
  const notifs = [];
  let ntn = 0;
  clientes.slice(0, 8).forEach(cli => {
    if (rnd() > .5) { ntn++; notifs.push({ id: 'ntf' + ntn, clienteId: cli.id, titulo: 'Tu pÃ³liza estÃ¡ prÃ³xima a renovar', cuerpo: 'Te preparamos una propuesta de renovaciÃ³n. EscrÃ­benos para revisarla.', tipo: 'renovacion', fecha: iso(addDays(NOW, -between(1, 10))), leida: rnd() > .5 }); }
    if (rnd() > .6) { ntn++; notifs.push({ id: 'ntf' + ntn, clienteId: cli.id, titulo: 'Recordatorio de pago', cuerpo: 'Tienes un recibo prÃ³ximo a vencer. Puedes reportar tu pago desde el portal.', tipo: 'cobro', fecha: iso(addDays(NOW, -between(1, 6))), leida: false }); }
  });

  // orden de actividades por fecha desc se hace en el mÃ³dulo
  return {
    __v: 32,
    meta: { now: iso(NOW), empresa: 'Demo Corredores', moneda_base: 'GTQ' },
    asesores, aseguradoras, clientes, polizas, cobros, comisiones, actividades, cancelaciones, vehiculos, negocios, gestiones, novedades, finmovs, acreedores, presupuesto, correos, contenidos, reclamos, cursos, notifs
  };
})();

