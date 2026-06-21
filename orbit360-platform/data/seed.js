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
  const asesores = [
    { id: 'ase001', nombre: 'Paula Osorio', rol: 'Dirección', iniciales: 'PO', color: '#C5162E', metaPrima: 220000, metaRecaudo: 180000, comTipo: 'variable', comPct: 18 },
    { id: 'ase002', nombre: 'Diego Marroquín', rol: 'Asesor Sr.', iniciales: 'DM', color: '#1f3a5f', metaPrima: 160000, metaRecaudo: 140000, comTipo: 'variable', comPct: 15 },
    { id: 'ase003', nombre: 'Lucía Herrera', rol: 'Asesora', iniciales: 'LH', color: '#1f8a4c', metaPrima: 140000, metaRecaudo: 120000, comTipo: 'variable', comPct: 12 },
    { id: 'ase004', nombre: 'Marco Villatoro', rol: 'Asesor', iniciales: 'MV', color: '#c9821b', metaPrima: 120000, metaRecaudo: 100000, comTipo: 'fija', comPct: 10 },
    { id: 'ase005', nombre: 'Ana Lemus', rol: 'Asesora Jr.', iniciales: 'AL', color: '#6b4ea0', metaPrima: 90000, metaRecaudo: 78000, comTipo: 'fija', comPct: 8 }
  ];

  // ---- Aseguradoras (directorio) ----
  const aseguradoras = [
    { id: 'asg01', nombre: 'Seguros Atlas', color: '#C5162E', pais: 'GT', ramos: ['Auto', 'Vida', 'Gastos Médicos', 'Hogar'] },
    { id: 'asg02', nombre: 'Aseguradora Cumbre', color: '#1f3a5f', pais: 'GT', ramos: ['Auto', 'Daños', 'Fianzas', 'Transporte'] },
    { id: 'asg03', nombre: 'MundoSeguro', color: '#1f8a4c', pais: 'CO', ramos: ['Vida', 'Gastos Médicos', 'Accidentes'] },
    { id: 'asg04', nombre: 'Pacífico Seguros', color: '#c9821b', pais: 'CO', ramos: ['Auto', 'Hogar', 'RC', 'Transporte'] },
    { id: 'asg05', nombre: 'Andes Seguros', color: '#6b4ea0', pais: 'CO', ramos: ['Vida', 'Daños', 'Fianzas'] },
    { id: 'asg06', nombre: 'Vértice Seguros', color: '#0f766e', pais: 'GT', ramos: ['Auto', 'Gastos Médicos', 'Hogar', 'RC'] }
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
      const formas = ['Mensual', 'Trimestral', 'Anual'];
      const forma = pick(formas);
      const cuotasN = forma === 'Mensual' ? 12 : forma === 'Trimestral' ? 4 : 1;
      const base = cli.tipo === 'Empresa' ? between(8000, 60000) : between(1200, 14000);
      const primaAnual = cli.pais === 'CO' ? base * 1000 : base; // COP en miles
      const inicioMonths = between(1, 13);
      const vigInicio = addMonths(NOW, -inicioMonths);
      const vigFin = addMonths(vigInicio, 12);
      const comPct = between(8, 22);
      // estado de la póliza
      const diasParaVencer = Math.round((vigFin - NOW) / 86400000);
      let estado = 'Vigente';
      if (diasParaVencer < 0) estado = 'Vencida';
      else if (diasParaVencer <= 45) estado = 'Por renovar';
      // ~12% canceladas
      const cancelada = rnd() < 0.12;
      if (cancelada) estado = 'Cancelada';

      const pol = {
        id: id('pol', pn),
        numero: (cli.pais === 'GT' ? 'GT-' : 'CO-') + asg.id.slice(-2).toUpperCase() + '-' + String(between(10000, 99999)),
        clienteId: cli.id, asesorId: cli.asesorId, aseguradoraId: asg.id,
        ramo, producto, forma, moneda: cli.moneda,
        prima: primaAnual,
        sumaAsegurada: primaAnual * between(20, 120),
        comisionPct: comPct,
        vigenciaInicio: iso(vigInicio),
        vigenciaFin: iso(vigFin),
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

      // cobros (cuotas)
      const cuotaMonto = Math.round(pol.prima / cuotasN);
      for (let q = 0; q < cuotasN; q++) {
        cbn++;
        const venc = addMonths(vigInicio, Math.round(q * (12 / cuotasN)));
        const venceTs = venc.getTime();
        let cEstado = 'Pendiente', fechaPago = null, conciliado = false;
        if (estado === 'Cancelada' && q > 0) { cEstado = 'Anulado'; }
        else if (venceTs < NOW.getTime() - 8 * 86400000) {
          // vencida en el pasado → mayoría pagada, algunas vencidas
          if (rnd() < 0.85) { cEstado = 'Pagado'; fechaPago = iso(addDays(venc, between(-3, 6))); conciliado = rnd() < 0.9; }
          else { cEstado = 'Vencido'; }
        } else if (venceTs < NOW.getTime()) {
          cEstado = rnd() < 0.7 ? 'Pagado' : 'Vencido';
          if (cEstado === 'Pagado') { fechaPago = iso(venc); conciliado = rnd() < 0.8; }
        }
        cobros.push({
          id: id('cob', cbn), polizaId: pol.id, clienteId: cli.id, asesorId: cli.asesorId,
          cuota: (q + 1) + '/' + cuotasN, monto: cuotaMonto, moneda: cli.moneda,
          vence: iso(venc), fechaPago, estado: cEstado,
          metodo: cEstado === 'Pagado' ? pick(['Transferencia', 'Tarjeta', 'Efectivo', 'Domiciliado']) : null,
          conciliado
        });

        // comisión por cuota pagada
        if (cEstado === 'Pagado') {
          cmn++;
          const monto = Math.round(cuotaMonto * comPct / 100);
          comisiones.push({
            id: id('com', cmn), polizaId: pol.id, cobroId: id('cob', cbn), clienteId: cli.id,
            asesorId: cli.asesorId, aseguradoraId: asg.id,
            base: cuotaMonto, pct: comPct, monto, moneda: cli.moneda,
            periodo: fechaPago ? fechaPago.slice(0, 7) : iso(venc).slice(0, 7),
            estado: rnd() < 0.7 ? 'Liquidada' : 'Devengada'
          });
        }
      }
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

  // orden de actividades por fecha desc se hace en el módulo
  return {
    __v: 7,
    meta: { now: iso(NOW), empresa: 'Demo Corredores', moneda_base: 'GTQ' },
    asesores, aseguradoras, clientes, polizas, cobros, comisiones, actividades, cancelaciones, vehiculos
  };
})();
