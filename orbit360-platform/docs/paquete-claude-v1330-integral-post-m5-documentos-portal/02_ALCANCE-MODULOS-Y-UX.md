# Alcance módulos y UX — paquete Claude integral v1330

## Prioridad visual/funcional

### P0 — Portal Cliente

- Reporte de pago con soporte visible.
- Estado claro para cliente: recibido / en revisión / requiere aclaración / rechazado / validado no aplicado / aplicado.
- Historial de seguimiento del pago reportado.
- Documentos del expediente con estados honestos.
- Sin prometer Storage real.

### P0 — Cobros

- Panel de revisión de soporte.
- Motivo obligatorio para validar/rechazar/bloquear/aplicar.
- Rechazo conserva trazabilidad.
- Validar reporte no aplica pago.
- Aplicar pago exige estado válido y país/moneda.
- Soporte/factura se registra como documento/adjunto metadata-only.

### P0 — Cliente360

- Pestaña o bloque Documentos.
- Secciones: expediente aprobado, soportes en revisión, documentos en revisión, parches/diffs pendientes.
- Acciones por rol.
- No modificar datos sin diff.

### P0 — Academia

- Rutas por rol actualizadas.
- Lecciones y casos prácticos para Portal/Cobros/Cliente360/M5/Equipo/Config.
- Quizzes de decisión.
- Certificados o avance por ruta.

### P1 — M5 Conciliaciones

- Reforzar visualmente validada no aplicada.
- Motivo para acciones.
- Bloqueos país/moneda.
- Separación de conciliación y pago aplicado.

### P1 — Equipo/Config

- Modales/gates visuales consistentes.
- Bitácora visible.
- Integraciones pendientes de conexión.
- Roles/pestañas internas protegidas.

### P1 — Documentos

- Si existe módulo, mejorarlo.
- Si no existe, crear propuesta frontend segura sin tocar backend protegido ni index si no es seguro.
- Mostrar documentos metadata-only, adjuntos, relaciones y parches pendientes.

## Copy requerido

Usar:

```txt
Soporte recibido. Pendiente de validación por el equipo.
Reporte validado. Pendiente de aplicación autorizada.
Documento recibido. En revisión.
Cambio propuesto pendiente de aprobación.
Referencia preparada para canal seguro de documentos.
Integración pendiente de conexión autorizada.
```

Evitar:

```txt
Pago aplicado.
Cobro confirmado.
Documento subido a Storage real.
Cliente actualizado automáticamente.
Póliza activada automáticamente.
Conciliado automáticamente.
Backend/Firebase/Firestore/LAB/mock/demo/smoke/localStorage.
```

## Diseño

- Conservar chrome Orbit 360.
- Logo cliente solo en slot white-label.
- Paleta base rojo/grafito/gris/blanco configurable por tenant.
- Fondo oscuro con texto blanco.
- Tipografías: Manrope, Source Sans 3, JetBrains Mono.
- No mostrar notas técnicas al cliente.

## Datos

- Solo ficticios.
- No hardcode A&S real.
- No clientes/pólizas reales.
- No credenciales.
- No tarifas reales sensibles.

## Navegación

No romper rutas existentes. Si una integración de módulo nuevo requiere `index.html`, documentar la integración y no forzarla si puede afectar backend protegido.