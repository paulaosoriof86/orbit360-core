# Checklist de entrega candidata Claude integral v1330

Claude debe entregar evidencia de cumplimiento de este checklist.

## Seguridad y alcance

- [ ] No tocó backend protegido.
- [ ] No tocó `index.html` salvo que lo justifique y lo marque para auditoría.
- [ ] No incluyó datos reales.
- [ ] No incluyó secretos/tokens/credenciales.
- [ ] No incluyó base64/bytes de archivos.
- [ ] No simuló Storage real.
- [ ] No simuló integraciones activas.
- [ ] No usó términos técnicos visibles en UI cliente.

## Portal Cliente

- [ ] Reporte de pago muestra soporte recibido / pendiente de validación.
- [ ] Cliente puede ver estado de seguimiento.
- [ ] No aparece pago aplicado al reportar soporte.
- [ ] Documento general queda en revisión.
- [ ] Storage pendiente queda claro.

## Cobros

- [ ] Revisión de soporte visible.
- [ ] Validar reporte no aplica pago.
- [ ] Rechazar pide motivo y conserva trazabilidad.
- [ ] Bloquear/anular pide motivo.
- [ ] Aplicar pago pide motivo y valida país/moneda.
- [ ] Soporte/factura se maneja como documento/adjunto metadata-only.

## Cliente360

- [ ] Incluye pestaña/bloque Documentos.
- [ ] Muestra expediente aprobado.
- [ ] Muestra soportes de pagos en revisión.
- [ ] Muestra documentos en revisión.
- [ ] Muestra parches/diffs pendientes.
- [ ] Acciones por rol claras.

## M5 Conciliaciones

- [ ] Validada no aplicada queda visible.
- [ ] Acciones sensibles piden motivo.
- [ ] Anular pide confirmación reforzada.
- [ ] Falta país/moneda bloquea validación/aplicación.

## Equipo/Config

- [ ] Cambios sensibles piden motivo.
- [ ] Reset pide confirmación reforzada.
- [ ] No deja tenant sin administrador activo.
- [ ] Integraciones muestran pendiente de conexión.
- [ ] No muestra credenciales/tokens/API keys.

## Academia

- [ ] Rutas por rol actualizadas.
- [ ] Lecciones nuevas para Portal/Cobros/Cliente360/M5/Equipo/Config.
- [ ] Casos prácticos incluidos.
- [ ] Quizzes de decisión incluidos.
- [ ] Certificados o progreso por ruta considerados.
- [ ] Manuales impactados listados.

## Documentación de entrega

- [ ] Resumen ejecutivo.
- [ ] Lista de archivos modificados.
- [ ] Módulos impactados.
- [ ] Riesgos/pedientes.
- [ ] Smoke visual sugerido.
- [ ] Notas para ChatGPT/Codex.
- [ ] Confirmación de backend protegido intacto.

## Criterio de rechazo

La candidata se rechaza si:

- toca backend protegido;
- incluye datos reales o secretos;
- dice pago aplicado cuando solo hay soporte reportado;
- actualiza cliente/póliza desde documento sin diff;
- muestra Storage/integración como real sin conexión;
- omite Academia;
- trae lógica ajena a Orbit 360 A&S.