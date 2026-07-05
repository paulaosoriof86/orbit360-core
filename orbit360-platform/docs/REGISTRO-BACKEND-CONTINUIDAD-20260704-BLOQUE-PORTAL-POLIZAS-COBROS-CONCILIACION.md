# Registro backend continuidad — Portal, pólizas, cobros y conciliación

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se atendieron nuevas reglas de Paula sobre conversación larga, documento maestro completo, importación documental, Portal Cliente ampliado, facturas/soportes en Cobros, Cliente360 y conciliación contra aseguradoras/planillas de comisiones.

## Aclaración importante

El archivo `COMPLEMENTO-DOCUMENTO-MAESTRO-AVANCE-BLOQUES-CORREO-USUARIOS-ORBIT360-AYS-20260704.md` era complemento, no documento maestro completo. Se creó un documento maestro consolidado descargable para reemplazar fuentes incompletas.

## Archivos creados

- `CONTRATO-PORTAL-CLIENTE-VISTA-360-POLIZAS-TRAZABILIDAD-NOTIFICACIONES-AYS-20260704.md`
- `CONTRATO-COBROS-FACTURAS-SOPORTES-CLIENTE360-PORTAL-AYS-20260704.md`
- `CONTRATO-CONCILIACION-ASEGURADORA-COMISIONES-CARTERA-RECIBOS-AYS-20260704.md`
- `CONTRATO-COLECCION-CLIENTES-ASESOR-PORTAL-CALIDAD-DATOS-AYS-20260704.md`

## Decisiones agregadas

1. La importación documental puede crear clientes/pólizas cuando la fuente sea válida, clasificada y trazable.
2. Documentos soporte genéricos no crean clientes/pólizas sin confirmación y diff.
3. Cobros debe permitir adjuntar factura/soporte y relacionarlo con cliente, póliza, recibo y conciliación.
4. Cliente360 debe mostrar factura, soporte, estado, conciliación e historial.
5. Portal Cliente debe mostrar documentos visibles, pólizas completas, recibos, renovaciones, cotizaciones, emisiones, inspecciones, gestiones y trazabilidad.
6. Si hay pendientes relevantes, el portal debe mostrar ventana grande al ingresar y notificaciones.
7. Recibos/cartera deben conciliarse con estados de cuenta de aseguradoras.
8. Planillas de comisiones pueden confirmar pagos aplicados si existe coincidencia confiable.
9. La aplicación de pago debe impactar analíticas, portal, Cliente360, novedades, proyecciones, metas, comisiones, liquidaciones y reportes.

## Próximo paso recomendado

Continuar con contrato/modelo detallado de `polizas` + `recibos` + estados + generación de cartera, integrando:

- Vigente/Por renovar generan cartera;
- Cancelada/Vencida/Anulada/Rechazada son histórico;
- prima neta/gastos/IVA/total;
- país/moneda;
- recibos/cuotas;
- fuentes de importación;
- conciliación con aseguradora/comisiones;
- impacto en portal y Cliente360.

## Estado

Documentado. No se tocó `data/store.js`, Firestore, deploy, main ni datos reales.
