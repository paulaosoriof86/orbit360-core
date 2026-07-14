# Prompt para Claude · Orbit 360 post v1.97

Continúa Orbit 360 sobre la base v1.97. No reinicies, no reviertas y no elimines módulos. Debes mejorar el prototipo con profundidad, respetando arquitectura SaaS, white-label y multi-tenant.

A&S es el primer tenant, pero no hardcodees A&S ni datos reales. Todo debe quedar configurable por tenant.

## Conserva sí o sí

- `core/integraciones.js`
- `core/integraciones-panel.js`
- `core/integraciones-lab-mock.js`
- `modules/marketing.js`
- `tools/orbit360-validate-marketing-integraciones.mjs`

Contratos obligatorios:

- `Orbit.integraciones.emit(...)`
- `Orbit.integraciones.configurar(...)`
- `Orbit.integraciones.openPanel(...)`
- `Orbit.integraciones.labMock(...)`
- `Orbit.integraciones.mark(...)`

Marketing ya emite y no debe volver a simples toast:

- `marketing_sync_sheets`
- `marketing_generar_pieza`
- `marketing_programar_publicacion`
- `marketing_contenido_creado`

## Pendientes prioritarios

1. Configuración de Integraciones tenant-wide:
   - mejorar UI;
   - usar `Orbit.integraciones.configurar(...)`;
   - mostrar estados claros;
   - evitar configuración local por navegador;
   - dejar listo para backend tenant-wide;
   - no presentar LAB/demo como conexión real.

2. Automatizaciones / Integraciones:
   - integrar panel de eventos;
   - mostrar salud de flujos;
   - filtrar por proveedor, módulo, estado y evento;
   - corregir mojibake/textos dañados si aparecen.

3. Marketing:
   - conservar eventos trazables;
   - agregar historial de eventos por contenido;
   - mejorar ficha operativa diaria;
   - vincular campaña, pieza, canal, copy, responsable, estado, programación y métricas.

4. Renovaciones:
   - comparación multiaseguradora;
   - solicitudes de propuesta;
   - trazabilidad por cliente/póliza.

5. Academia:
   - recursos, rutas por rol, progreso, certificaciones y documentos del proyecto.

6. Reportes y Orbit IA:
   - drill por KPI;
   - explicación de KPIs;
   - sugerencias accionables;
   - mantener IA centralizada en `Orbit.ia.complete(...)`.

7. Finanzas:
   - no romper CxC/facturas de comisión;
   - no crear `finmov` al emitir factura;
   - `finmov` solo cuando hay dinero real.

## Entrega

Entrega ZIP completo de `orbit360-platform/`. Actualiza `CHANGELOG.md` y `docs/BITACORA-CAMBIOS.md`. Incluye resumen de cerrados, parciales, no tocados, archivos modificados, riesgos y validaciones pendientes.
