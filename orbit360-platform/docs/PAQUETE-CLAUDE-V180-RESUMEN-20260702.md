# Paquete Claude v1.80 - resumen de implementacion

Fecha: 2026-07-02
Estado: documento vivo hasta proximo paquete Claude

## Implementar en prototipo

1. Finanzas y comisiones: separar recaudo comercial de movimientos financieros reales.
2. Importador inteligente: factura, planilla, recibos SIGA, banco y calendario marketing con preview, remapeo, aprobar fila, aprobar todo e iteracion.
3. Liquidaciones asesor: editable por fila con alcance de correccion sobre liquidacion, poliza, cliente o ambos.
4. Cliente 360: trazabilidad completa por recibo, poliza, planilla, factura, comision y actividades.
5. Marketing: modulo estrategico con objetivos, embudo, resultados, recomendaciones, piezas, copy, iteracion, redes e integraciones.
6. Academia: autocapacitacion profunda por modulo, seccion y rol; manuales y recursos embebidos dentro de Orbit 360.
7. Portal cliente: usuario cliente, instructivo de acceso, recibos, documentos, siniestros, mensajes y glosario.
8. Configuracion: autoadministracion completa de tenant, paises, impuestos, monedas, aseguradoras, usuarios, roles, modulos, plantillas, tarifas, integraciones y recordatorios.
9. Integraciones: backend-ready para Make, correo, WhatsApp, Canva, Metricool, Mailchimp, Drive, Sheets e IA.
10. Comparativo/Cotizador: auditar standalone v1.10 y modulos internos para tarifas, impuestos, moneda, historial, envio y conversion a poliza.

## No romper

- No localStorage directo en modulos.
- No fechas historicas quemadas.
- No notas tecnicas visibles.
- No referencias ajenas en UI.
- No hardcodear A&S.
- Mantener Orbit.store como capa unica.

## Backend separado

ChatGPT/Codex conserva backend, Firestore, Auth, tenant A&S, integraciones reales, migracion y validaciones. Claude solo debe entregar prototipo base comercializable.
