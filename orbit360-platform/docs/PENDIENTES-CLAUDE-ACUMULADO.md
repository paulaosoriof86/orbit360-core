# PENDIENTES CLAUDE ACUMULADO - Orbit 360

Fecha de actualizacion: 2026-06-30 21:23:05
Base integrada local: Prototype Development Request (93) / Orbit 360 v1.47
Rama local: feat/ays-auth-lab-correction-20260630

## 1. Estado integrado

Se integro el prototipo v93 sobre la rama Backend LAB sin perder:
- Auth LAB.
- Firestore rules LAB.
- data/store.js con modo firestore-lab.
- index-dev-firestore.html generado desde index.html limpio.
- firebase.json y firestore.rules LAB.
- Bitacoras locales.

No se reemplazo data/store.js porque el ZIP nuevo trae store local/demo.
No se uso index-dev-auth.html.
No se hizo push.
No se hizo deploy.
No se tocaron datos reales ni produccion.

## 2. Mejoras del prototipo v93 ya incorporadas

- Login white-label: logo del cliente aplicado tambien en pantalla de login.
- Fecha dinamica: core/ui.js ya expone now, monthLabel, monthKey y monthProgressPct.
- Novedades: fecha del modal ya no queda hardcodeada.
- Finanzas profundo: KPIs clicables, drill de movimientos, CxC/CxP y presupuesto.
- Presupuesto editable: crear, editar, eliminar y replicar mes anterior.
- Cobros: boton Pagar desde tabla, navegacion a cliente/poliza y refresco correcto tras pago.
- Insights: metas desde coleccion metas y sugerencia de metas del proximo mes por tendencia.
- Cotizador: tercer nivel marca -> linea -> modelo/version.
- Calidad: completar datos faltantes inline.
- Siniestros: fix de colision de id en drawer nuevo.
- Notificaciones: guard para evitar error si formulario no esta montado.
- Importador: drawer mas robusto si queda estado parcial.
- Docs actualizados: CHANGELOG, PLAN-INFRAESTRUCTURA, AUDITORIA-FORENSE, handoff y PENDIENTES-Y-MEJORAS.

## 3. Pendientes para Claude / prototipo base

Estos pendientes deben acumularse para pedirselos a Claude por lotes:

### Cotizador y Comparativo
- Guardar cotizacion en historial al cotizar, no solo como vista temporal.
- Carga de PDF de propuestas dentro del flujo del cotizador/comparativo.
- Plantillas de impresion por aseguradora, con logo/color/formato configurable.
- Convertir VEH_MODELOS en catalogo configurable por tenant, no tabla fija del modulo.
- Preparar tarifas por aseguradora como configuracion editable, no hardcodeada.

### Finanzas
- Conciliacion bancaria real: estado de cuenta banco vs recibos/depositos.
- Widget de cruce recibo pagado -> deposito -> estado de cuenta aseguradora.
- Profundizar dashboard con comparativos intermensuales e interanuales tabulares.
- Separar ingresos operativos, ingresos por financiamiento y control de deuda.
- Liquidacion asesor imprimible con detalle y trazabilidad.

### Academia
- Completar 14 cursos profundos por rol.
- Recursos embebidos en grande: video, PDF, imagen, Drive/YouTube/HeyGen.
- Manuales por rol dentro de Academia y exportables.
- Crear curso con IA desde varios adjuntos.

### Demo y handoff
- Regenerar demo interactivo y handoff HTML con version v1.47.
- Mantener documentacion sin notas tecnicas visibles para cliente.
- Revisar que el ZIP comercializable no muestre mensajes de laboratorio, Firebase o demo en UI.

### Metas
- Unificar modelo de metas: asesor.metaPrima, coleccion metas y cat.metas.
- Definir un solo esquema para metas de empresa, asesor, ramo, aseguradora, recaudo y produccion.
- Mantener produccion/metas/comisiones sobre prima neta recaudada.

### Portal cliente
- Profundizar detalle de polizas, pagos, documentos y solicitudes.
- Carga de soporte de pago desde portal que cree gestion en Ops.
- Notificaciones del portal clicables.
- Glosario del cliente separado de Academia interna.

### Configuracion
- Hacer totalmente autoadministrables: aseguradoras, tarifas, plantillas, roles, modulos, integraciones, glosario por pais y branding.
- Verificar que no existan datos de A&S hardcodeados en core/modulos.
- Mantener Orbit 360 en chrome y A&S solo en slot white-label.

## 4. Pendientes para ChatGPT / backend LAB

No trasladar a Claude como rediseño visual; corresponde a backend/infraestructura:

- Mantener data/store.js con API exacta: all, get, where, insert, update, remove, _emit.
- Firestore multi-tenant bajo tenant alianzas-soluciones en LAB.
- Auth real conectado a Firebase Auth.
- Importadores server-side con OCR/PDF/Excel/Word/imagen.
- Storage/Drive para documentos reales.
- Make webhooks para eventos.
- IA real por proveedor configurable: Claude, OpenAI, Gemini o endpoint propio.
- Correo real Outlook/Gmail/IMAP por usuario.
- No tocar produccion ni datos reales hasta autorizacion expresa.

## 5. Regla de trabajo para proximos ZIP de Claude

Antes de integrar un nuevo ZIP:
1. Backup local completo.
2. Comparar contra version actual.
3. No sobrescribir data/store.js backend.
4. No perder core/auth.js LAB sin merge manual.
5. Regenerar index-dev-firestore.html desde index.html limpio.
6. Validar que no aparezca proyecto viejo ays-dashboard-4a575.
7. Registrar cambios y riesgos en bitacoras.
8. Abrir preview LAB solo con index-dev-firestore.html.
---

## 6. Validacion visual Paula - hallazgos post integracion v93 / v1.47

Fecha de validacion: 2026-06-30 21:38:43
Preview usado: index-dev-firestore.html en Chrome, modo firestore-lab, tenant alianzas-soluciones.

### 6.1 Estado general observado

La plataforma carga en Chrome, sin mojibake visible, con sidebar, login/sesion y modulos funcionales en general. La integracion v93 no rompio Auth LAB ni Store Firestore LAB.

Sin embargo, varias mejoras que el prototipo documenta como hechas no deben aceptarse como cerradas porque visualmente o funcionalmente no cumplen el nivel solicitado por Paula. Se deben tratar como pendientes de Claude para prototipo base.

### 6.2 Tablon de novedades

Hallazgo:
- El tablon de novedades abre y muestra tarjetas.
- Las novedades aun no tienen acciones clickeables utiles para:
  - abrir detalle ampliado;
  - ir al modulo relacionado;
  - filtrar por tipo, prioridad, area o rol;
  - convertir una novedad en tarea/gestion/recordatorio;
  - diferenciar lectura simple vs accion requerida.

Esperado:
- Cada novedad debe ser accionable.
- Debe poder abrir detalle completo.
- Debe poder llevar al modulo correspondiente: Cobros, Renovaciones, Academia, Marketing, Finanzas, Ops, Cliente 360, etc.
- Debe permitir CTA configurable por novedad: "Ver cartera", "Abrir cliente", "Ir a Academia", "Ver meta", "Abrir reporte", "Crear gestion".
- Debe guardar trazabilidad de leido/atendido por usuario.

Estado: ABIERTO.
Aplicar a prototipo base: SI.

### 6.3 Aseguradoras

Hallazgo:
- El modulo esta funcional y la ficha abre.
- La ficha conserva datos importantes: accesos, Drive, contactos, facturacion, cuentas, comisiones, documentos.
- Visualmente aun se percibe basica; no tiene el diseno premium esperado.
- En v93 no se observa una mejora profunda del modulo Aseguradoras.

Esperado:
- Redisenar ficha de aseguradora con layout premium, limpio y ejecutivo.
- Separar visualmente:
  - resumen ejecutivo;
  - vinculacion por pais;
  - ramos activos;
  - tarifas/comisiones;
  - accesos y portales;
  - contactos por area;
  - cuentas bancarias/facturacion;
  - documentos;
  - requisitos de emision;
  - actividad y uso en polizas/cotizaciones.
- Mantener funcionalidad actual.
- Confirmar sincronia real con:
  - Cotizador;
  - Comparativo;
  - Orbit IA / Asistencia IA;
  - Polizas;
  - Comisiones;
  - Configuracion;
  - Importador de directorio de aseguradoras;
  - Documentos/Drive.
- Los documentos y tarifas de aseguradora deben alimentar IA, cotizador y comparativo.
- No hardcodear A&S; todo configurable por tenant.

Estado: ABIERTO.
Aplicar a prototipo base: SI.

### 6.4 Insights

Hallazgo:
- El modulo declara mejoras de metas, comparativos y drills, pero visualmente aun no cumple el nivel solicitado.
- No se percibe un flujo claro de lo general a lo particular.
- Algunos datos no abren detalle.
- Faltan tablas de datos visibles y analitica profunda.
- Faltan comparativos intermensuales e interanuales robustos por categoria.
- No se ve una seccion de establecimiento de metas con la profundidad requerida.

Esperado:
- Insights debe funcionar como centro de analitica ejecutiva y operativa.
- Debe ir de:
  1. resumen general;
  2. pais;
  3. asesor;
  4. aseguradora;
  5. ramo/producto;
  6. cliente;
  7. poliza/recibo;
  8. detalle transaccional.
- Todo KPI debe abrir detalle.
- Debe incluir tablas filtrables/exportables para:
  - produccion total;
  - produccion por asesor;
  - produccion por aseguradora;
  - produccion por ramo;
  - cartera/cobros;
  - renovaciones;
  - cancelaciones;
  - siniestros;
  - comisiones;
  - comparativo mensual;
  - comparativo anual.
- Comparativos obligatorios:
  - mes actual vs mes anterior;
  - acumulado anual vs anio anterior;
  - trimestre vs trimestre;
  - asesor vs meta;
  - aseguradora vs meta;
  - ramo vs meta;
  - nueva vs renovada;
  - emitido vs recaudado;
  - cartera vigente vs vencida.
- Metas:
  - crear/editar metas por mes;
  - metas por empresa, pais, asesor, aseguradora, ramo y tipo de negocio;
  - meta de produccion neta recaudada;
  - meta de recaudo;
  - meta de renovaciones;
  - meta de nuevos negocios;
  - simulador/sugeridor IA;
  - seguimiento visual y tabla de cumplimiento.
- Las visuales deben incluir graficas, tablas y drill-down real, no solo tarjetas generales.

Estado: ABIERTO.
Aplicar a prototipo base: SI.

### 6.5 Finanzas

Hallazgo:
- El codigo v93 contiene cambios, pero en la validacion visual no se percibe un avance suficiente en dashboard financiero.
- No debe considerarse cerrado el "Finanzas profundo" hasta que visualmente y funcionalmente cumpla lo solicitado.

Esperado:
- Dashboard financiero realmente profundo, no superficial.
- Debe incluir:
  - ingresos;
  - egresos;
  - utilidad;
  - CxC;
  - CxP;
  - presupuesto;
  - flujo de caja;
  - conciliacion bancaria;
  - estados de cuenta de aseguradoras;
  - comisiones por cobrar;
  - comisiones por pagar a asesores;
  - financiamientos;
  - saldos por cuenta;
  - movimientos historicos.
- Comparativos:
  - intermensual;
  - interanual;
  - presupuesto vs ejecutado;
  - recaudo vs produccion;
  - comision esperada vs comision pagada;
  - cartera vencida por rango;
  - deuda/financiamiento por cliente.
- Debe tener tablas detalladas, filtros, drill por KPI y trazabilidad hasta movimiento/poliza/recibo/cliente.
- Debe separar por pais y moneda sin mezclar GTQ/COP.
- Debe mantener produccion, metas y comisiones sobre prima neta recaudada.
- Debe permitir importacion de movimientos historicos, banco, estados de cuenta y planillas de comisiones.
- Debe quedar claramente util para gestion real de A&S, no solo demo visual.

Estado: ABIERTO.
Aplicar a prototipo base: SI.

### 6.6 Criterio de validacion hacia adelante

No aceptar como "hecho" lo que solo aparezca en CHANGELOG o comentarios de codigo. Para cerrar una mejora debe cumplir:
- se ve en UI;
- es entendible para usuario no tecnico;
- mantiene funcionalidad previa;
- tiene botones accionables;
- abre detalle cuando corresponde;
- lee/escribe en Orbit.store;
- no hardcodea A&S;
- no muestra notas tecnicas al cliente;
- se verifica en render real.

Estado: REGLA ACTIVA.
Aplicar a prototipo base: SI.

---

## 7. Correccion metodologica - Aseguradoras y auditoria real v93

Fecha: 2026-06-30 21:43:35

Correccion:
- La mejora visual premium de Aseguradoras NO era un pendiente previo solicitado por Paula.
- Fue una solicitud nueva surgida en la validacion visual actual.
- Lo que si existia previamente era la necesidad arquitectonica de que Aseguradoras sincronice con Cotizador, Comparativo, Orbit IA, Polizas, Comisiones, Configuracion e Importador.

Auditoria real v93:
- modules/aseguradoras.js no cambio en el ZIP v93.
- Por tanto, cualquier mejora visual de Aseguradoras debe tratarse como pendiente nuevo para Claude, no como avance integrado ni como incumplimiento de un pedido anterior.
- Insights y Finanzas si cambiaron en codigo, pero siguen abiertos porque la validacion visual muestra que no cumplen la profundidad requerida.
- Novedades cambio parcialmente, pero sigue abierto porque no tiene acciones clickeables completas.

Documento soporte:
- Ver docs/AUDITORIA-ZIP-V93-CHATGPT-20260630.md

Estado: CORREGIDO.
