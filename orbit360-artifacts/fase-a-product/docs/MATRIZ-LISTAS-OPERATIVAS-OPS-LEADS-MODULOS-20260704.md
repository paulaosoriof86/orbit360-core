# Matriz de listas operativas — Ops, Leads y módulos relacionados

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: criterio de producto/backend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Principio de producto

Si un flujo operativo necesita una lista, vista, filtro, estado o subbandeja adicional para ser claro y trazable, debe crearse.

No debe asumirse que las listas actuales del prototipo son una limitación. Las listas actuales son punto de partida, no techo funcional.

Regla:

```txt
Crear las listas útiles necesarias en Ops, Leads, Cobros, Cliente360, Portal, Aseguradoras, Finanzas, Marketing o cualquier módulo cuando el flujo lo requiera.
```

## 2. Diferencia entre lista y módulo

Una lista no siempre implica crear un módulo nuevo. Puede ser:

- columna de tablero;
- filtro;
- subtab;
- bandeja;
- vista guardada;
- estado agrupado;
- contador/KPI clicable;
- etiqueta de ruteo.

El criterio es que ayude a operar mejor, no saturar.

## 3. Ops — listas mínimas recomendadas

- Gestiones nuevas / sin clasificar.
- Pagos reportados / conciliación.
- Cobros y cartera.
- Documentos / soportes.
- Datos de cliente.
- Pólizas / emisión / endosos.
- Renovaciones.
- Cancelaciones / retención.
- Siniestros / reclamos.
- Soporte portal.
- Requerimientos de aseguradora.
- Gestiones administrativas generales.
- Urgentes / escaladas.
- Vencidas / fuera de SLA.

## 4. Leads — listas mínimas recomendadas

- Nuevo lead.
- Contactado.
- Diagnóstico.
- Cotizando.
- Comparativo enviado.
- Propuesta enviada.
- Seguimiento.
- Negociación.
- Inspección / requisitos.
- Emisión solicitada.
- Ganado / emitido.
- Perdido.
- Recontactar.
- Referidos / oportunidades relacionadas.

## 5. Cobros — vistas mínimas recomendadas

- Pendientes por vencer.
- Vencidos.
- Pago reportado por cliente.
- Pendiente de aprobación.
- Pendiente de conciliación.
- Soporte recibido.
- Requiere información adicional.
- Conciliado.
- Rechazado.
- Promesa de pago.
- Gestión escalada.

## 6. Cliente360 — vistas mínimas recomendadas

- Resumen.
- Datos y contactos.
- Pólizas.
- Recibos y pagos.
- Pagos reportados pendientes.
- Documentos.
- Gestiones abiertas.
- Historial completo.
- Renovaciones.
- Cancelaciones.
- Siniestros.
- Correos/notificaciones.

## 7. Portal del cliente — estados mínimos visibles

- Solicitud recibida.
- En revisión.
- Pendiente de información.
- En gestión.
- Resuelto.
- Pago reportado.
- Pago pendiente de aprobación.
- Pago aplicado.
- Pago rechazado.
- Documento recibido.

## 8. Aseguradoras — listas/vistas útiles

- Contactos.
- Accesos / portales.
- Requisitos documentales.
- Productos/tarifas.
- Clausulados.
- Solicitudes pendientes.
- Requerimientos enviados.
- Estados de cuenta / planillas.
- Contactos por ramo.

## 9. Finanzas — vistas útiles

- Financiero histórico.
- Movimientos operativos.
- Cuentas por cobrar.
- Cuentas por pagar.
- Comisiones por cobrar.
- Comisiones por pagar.
- Conciliación bancaria.
- Presupuesto.
- Reportes por país/moneda.

## 10. Criterios para crear lista nueva

Crear lista/vista adicional si:

- más de un rol necesita verla;
- tiene responsable distinto;
- tiene SLA distinto;
- requiere notificación propia;
- cambia estado del cliente;
- afecta pago, póliza, siniestro, documento o renovación;
- se pierde trazabilidad si queda en una lista genérica;
- requiere reportes o KPIs específicos;
- afecta manuales/Academia.

## 11. Criterios para NO crear lista nueva

No crear lista si:

- solo duplica otra vista;
- no cambia responsable ni SLA;
- no cambia flujo;
- no agrega trazabilidad;
- puede resolverse con filtro temporal;
- aumenta ruido sin ayudar a operar.

## 12. Instrucción para Claude

Claude no debe limitarse a las listas actuales si el flujo requiere más claridad. Puede y debe proponer/crear listas, tabs, filtros, KPIs y vistas siempre que:

- respete backend protegido;
- use datos ficticios en prototipo;
- no afirme conexiones reales inexistentes;
- documente cambios;
- actualice manuales/Academia si aplica.

## 13. Instrucción para ChatGPT/Codex

Backend debe permitir listas configurables por tenant:

- `opsListas` configurable;
- `leadEtapas` configurable;
- `cobrosVistas` derivadas por estado;
- `cliente360Tabs` visibles por rol;
- matriz tipoGestion → listaDestino → responsableRol → SLA → audiencia.

No hardcodear A&S; parametrizar por tenant.

## 14. Academia y manuales

Cada lista nueva debe quedar explicada en:

- manual del módulo;
- curso/ruta del rol que la usa;
- evaluación si afecta operación crítica;
- notificación de actualización si cambia flujo existente.

## 15. Estado

Matriz creada. Debe usarse en auditorías futuras y paquetes Claude para no tratar las listas actuales como límite del producto.
