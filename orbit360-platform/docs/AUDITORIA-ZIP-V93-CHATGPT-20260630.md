# AUDITORIA FORENSE ZIP v93 - Orbit 360

Fecha: 2026-06-30 21:43:35
Rama local: feat/ays-auth-lab-correction-20260630
Base revisada: Prototype Development Request (93) integrado sobre Backend LAB.

## 1. Alcance real de esta auditoria

Esta auditoria corrige el criterio anterior: no se debe aceptar como hecho todo lo que el changelog declare si no se valida en codigo y render real.

Criterios usados:
- comparacion v89 -> v93;
- revision de archivos modificados;
- validacion visual reportada por Paula en Chrome;
- separacion entre pendiente previo, avance parcial, hallazgo nuevo y solicitud nueva.

## 2. Archivos realmente modificados por el ZIP v93 frente a v89

Archivos modificados:
- CHANGELOG.md
- core/auth.js
- core/importa.js
- core/novedades.js
- core/ui.js
- docs/AUDITORIA-FORENSE.md
- docs/PLAN-INFRAESTRUCTURA.md
- docs/handoff-migracion-as.html
- index.html
- modules/calidad.js
- modules/cobros.js
- modules/configuracion.js
- modules/cotizador.js
- modules/finanzas.js
- modules/inicio.js
- modules/insights.js
- modules/notificaciones.js
- modules/siniestros.js
- styles/base.css
- styles/infra.css

Archivo agregado:
- docs/PENDIENTES-Y-MEJORAS.md

Dato importante:
- modules/aseguradoras.js NO cambio en v93.
- modules/comparativo.js NO cambio en v93.
- modules/academia.js NO cambio en v93.
- data/store.js del ZIP sigue siendo local/demo; no es el Store Firestore LAB.

## 3. Lectura real por modulo / area

### 3.1 Login, fecha e inicio

Real del ZIP:
- core/auth.js agrega aplicacion de marca en login.
- core/ui.js agrega fecha dinamica.
- modules/inicio.js lee metas del mes con fecha dinamica.

Validacion:
- Avance real incorporado.
- No se detecta como problema actual principal.

Estado: AVANCE REAL.

### 3.2 Novedades

Real del ZIP:
- core/novedades.js tuvo cambios de fecha/modal.
- No se observa implementacion completa de acciones por novedad.

Validacion visual Paula:
- El tablon abre, pero las opciones no son clickeables para ir al modulo relacionado ni abrir detalle util.

Clasificacion:
- Pendiente previo: novedades clicables/detalle ya estaba pedido como ajuste funcional.
- Avance v93: parcial.
- Estado: ABIERTO.

Esperado para Claude:
- Cada novedad debe abrir detalle real.
- Cada novedad debe tener CTA configurable.
- Debe poder navegar al modulo relacionado.
- Debe registrar leido/atendido por usuario.

### 3.3 Aseguradoras

Real del ZIP:
- modules/aseguradoras.js NO cambio frente a v89.
- Por tanto, v93 NO trae rediseño visual premium de Aseguradoras.

Correccion metodologica:
- El rediseño visual premium de la ficha de Aseguradoras NO debe registrarse como pendiente previo de Paula.
- Es una solicitud nueva surgida en validacion visual actual.
- Lo que si venia de arquitectura previa era la necesidad de sincronia/configuracion con Cotizador, Comparativo, IA, Polizas, Comisiones, Configuracion e Importador.

Clasificacion:
- Solicitud nueva actual: mejorar visualmente la ficha de Aseguradoras.
- Pendiente previo arquitectonico: sincronizar datos de aseguradora con Cotizador, Comparativo, IA y demas modulos relacionados.
- Estado: ABIERTO.

Esperado para Claude:
- Redisenar visualmente la ficha manteniendo funcionalidad.
- No perder accesos, Drive, contactos, facturacion, cuentas, documentos, tarifas/comisiones.
- Confirmar fuentes compartidas con Cotizador/Comparativo/IA.
- Todo configurable por tenant, sin hardcodear A&S.

### 3.4 Insights

Real del ZIP:
- modules/insights.js cambio.
- El changelog declara metas inteligentes, comparativo general a particular y drills.

Validacion visual Paula:
- No cumple la profundidad solicitada.
- Falta flujo claro de general a particular.
- Algunos datos no abren detalle.
- Faltan tablas y comparativos intermensuales/interanuales por asesor, aseguradora y produccion total.
- No se ve una seccion de establecimiento de metas con la profundidad pedida.

Clasificacion:
- Pendiente previo: SI, Insights profundo ya estaba pedido.
- Avance v93: parcial en codigo.
- Estado: ABIERTO.

Esperado para Claude:
- Resumen ejecutivo -> pais -> asesor -> aseguradora -> ramo -> cliente -> poliza/recibo.
- KPI clicable con detalle real.
- Tablas filtrables/exportables.
- Comparativos mes anterior, interanual, trimestre, asesor/meta, aseguradora/meta, ramo/meta.
- Seccion real de metas: crear, editar, sugerir, simular y medir cumplimiento.

### 3.5 Finanzas

Real del ZIP:
- modules/finanzas.js cambio.
- El changelog declara KPIs clicables, CxC/CxP con detalle y presupuesto editable.

Validacion visual Paula:
- No se percibe avance suficiente en dashboard financiero.
- No cumple aun el dashboard profundo requerido.

Clasificacion:
- Pendiente previo: SI, dashboard financiero profundo ya estaba pedido.
- Avance v93: parcial en codigo.
- Estado: ABIERTO.

Esperado para Claude:
- Dashboard financiero con tablas, filtros, drill y trazabilidad hasta movimiento/poliza/recibo/cliente.
- Ingresos, egresos, utilidad, CxC, CxP, presupuesto, flujo, conciliacion, estados de cuenta, comisiones por cobrar/pagar, financiamientos y saldos.
- Comparativos intermensual, interanual, presupuesto vs ejecutado, recaudo vs produccion.
- Separar pais y moneda sin mezclar GTQ/COP.

### 3.6 Cotizador

Real del ZIP:
- modules/cotizador.js cambio.
- Trae tercer nivel marca -> linea -> modelo/version.

Clasificacion:
- Avance real.
- Quedan pendientes del cotizador/comparativo no cerrados por v93:
  - tarifas reales/configurables por tenant;
  - impresion por aseguradora;
  - historial robusto;
  - PDF de propuestas;
  - sincronia completa con Aseguradoras/Comparativo/IA.

Estado: PARCIAL.

### 3.7 Cobros

Real del ZIP:
- modules/cobros.js cambio.
- Trae boton Pagar y navegacion cruzada cliente/poliza.
- Corrige refresco de tabla tras pago.

Clasificacion:
- Avance real.
- Pendiente: validar visualmente flujo completo con Store LAB y detalle de recibo/poliza/cliente.

Estado: AVANCE REAL, VALIDACION FUNCIONAL PENDIENTE.

## 4. Correccion sobre el documento de pendientes

Se corrige el punto de Aseguradoras:
- No fue pendiente visual previo.
- Es solicitud nueva actual.
- La sincronia con Cotizador/Comparativo/IA si pertenece a la arquitectura previa del producto.

## 5. Regla de cierre desde ahora

Una mejora no queda cerrada por aparecer en changelog o por existir codigo.
Solo se cierra si:
- se ve en UI;
- es usable para usuario no tecnico;
- mantiene lo anterior;
- abre detalles reales;
- lee/escribe por Orbit.store;
- no hardcodea A&S;
- no muestra notas tecnicas;
- fue validada en render real.
