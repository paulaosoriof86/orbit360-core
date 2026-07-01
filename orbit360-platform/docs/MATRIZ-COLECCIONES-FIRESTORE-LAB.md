# MATRIZ DE COLECCIONES FIRESTORE LAB - Orbit 360

Fecha: 2026-06-30 22:30:55
Firebase LAB: ays-orbit-360-lab
Tenant LAB: alianzas-soluciones

## 1. Convencion de rutas

Ruta base por tenant:

tenants/{tenantId}/data/{coleccion}/items/{id}

Membership:

tenants/{tenantId}/members/{uid}

Tenant LAB:

tenants/alianzas-soluciones/...

## 2. API que debe mantener data/store.js

La interfaz publica no cambia:

- Orbit.store.all(coleccion)
- Orbit.store.get(coleccion, id)
- Orbit.store.where(coleccion, campo, valor)
- Orbit.store.insert(coleccion, data)
- Orbit.store.update(coleccion, id, patch)
- Orbit.store.remove(coleccion, id)
- Orbit.store._emit(coleccion)

Regla:
- Los modulos no deben saber si los datos vienen de localStorage, Firestore u otro backend.
- El cambio de backend vive en data/store.js.

## 3. Colecciones base del producto

| Coleccion | Uso principal | Modulos relacionados | Estado LAB |
|---|---|---|---|
| clientes | Expediente Cliente 360, CRM, portal, cobros, polizas | cliente360, polizas, cobros, historial, portal, ops, leads | Pendiente seed ficticio Firestore |
| polizas | Polizas emitidas, vigentes e historicas | polizas, cliente360, cobros, renovaciones, cancelaciones, comisiones | Pendiente seed ficticio Firestore |
| cobros | Recibos, cartera, pagos, vencimientos | cobros, cliente360, finanzas, notificaciones | Pendiente seed ficticio Firestore |
| comisiones | Comisiones por aseguradora y asesor | comisiones, finanzas, insights | Pendiente seed ficticio Firestore |
| reclamos | Siniestros y seguimiento | siniestros, cliente360, historial | Pendiente seed ficticio Firestore |
| gestiones | Actividades operativas y CRM | ops, leads, historial, notificaciones | Pendiente seed ficticio Firestore |
| negocios | Leads, oportunidades y pipeline | leads, ops, inicio, insights | Pendiente seed ficticio Firestore |
| finmovs | Movimientos financieros | finanzas, insights | Pendiente seed ficticio Firestore |
| contenidos | Calendario marketing y contenidos | marketing, academia, automatizaciones | Pendiente seed ficticio Firestore |
| cursos | Academia y capacitacion | academia, equipo, portal | Pendiente seed ficticio Firestore |
| aseguradoras | Directorio, tarifas, accesos, cuentas, contactos | aseguradoras, cotizador, comparativo, polizas, comisiones, ia | Pendiente seed ficticio Firestore |
| asesores | Equipo, metas, permisos, asignaciones | equipo, inicio, insights, cobros, polizas | Pendiente seed ficticio Firestore |
| vehiculos | Autos, placas, cotizacion, polizas | cotizador, polizas, cliente360 | Pendiente seed ficticio Firestore |
| acreedores | Acreedores y financiamientos | finanzas, cobros, polizas | Pendiente seed ficticio Firestore |
| facturas | Facturacion y CxC/CxP | finanzas, cobros, reportes | Pendiente seed ficticio Firestore |
| documentos | URLs/documentos por cliente, poliza o aseguradora | cliente360, polizas, aseguradoras, portal | Pendiente Storage/Drive |
| actividades | Bitacora, tareas, smoke tests, eventos | historial, ops, notificaciones | Smoke CRUD validado |

## 4. Colecciones transversales recomendadas

| Coleccion | Uso | Estado |
|---|---|---|
| metas | Metas por empresa, pais, asesor, aseguradora, ramo y mes | Pendiente unificar modelo |
| automatizaciones | Reglas por evento, canal, plantilla y modulo | Pendiente backend Make |
| integraciones | Configuracion por proveedor y tenant | Pendiente secrets backend |
| plantillas | Plantillas correo, WhatsApp y documentos | Pendiente backend |
| auditoria | Auditoria tecnica y cambios de datos | Pendiente |
| notificaciones | Bandeja, leido, atendido y CTA | Pendiente |
| configuracion | Branding, paises, moneda, glosario y catalogos | Pendiente definir granularidad |

## 5. Reglas de datos de negocio

### Polizas
- Vigente y Por renovar generan recibos automaticos segun forma de pago.
- Vigente y Por renovar entran en cartera si corresponde al anio actual.
- Cancelada y Vencida son historicas: no cartera, si analitica, campanas y segmentacion.

### Cartera
- Solo cobros pendientes de polizas vigentes o por renovar del anio actual.
- Historico no debe inflar cartera operativa.

### Produccion, metas y comisiones
- Siempre sobre prima neta recaudada.
- No sumar monedas distintas en crudo.
- Separar GTQ y COP por pais.

### Multi-tenant
- Ningun modulo debe acceder a rutas fuera del tenant activo.
- Las reglas Firestore deben denegar tenants no autorizados.
- La prueba de aislamiento ya valido esta condicion en LAB.

## 6. Pendientes tecnicos antes de datos reales

1. Validar carga visual de modulos con Firestore LAB y colecciones vacias/ficticias.
2. Definir seed ficticio minimo para LAB por coleccion critica.
3. Definir migracion de seed.js demo a Firestore LAB sin hardcodear A&S.
4. Preparar importador inteligente hacia Firestore LAB.
5. Definir Storage/Drive para documentos reales.
6. Preparar secrets backend para integraciones.
7. Mantener data/store.js como unica capa de datos.
