# Plan backend — Portal, pagos reportados, adjuntos y Cobros

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
Estado: plan de bloque backend. Sin Firestore. Sin deploy. Sin merge. Sin datos reales.

## 1. Motivo

Paula reportó un hallazgo funcional: cuando el cliente reporta un pago desde Portal y adjunta soporte, la gestión/log aparece, pero el adjunto no queda visible.

Este flujo es crítico porque conecta:

- Portal del Cliente;
- Documentos;
- Gestiones;
- Cobros;
- Conciliación bancaria;
- Notificaciones;
- Academia/manuales.

## 2. Objetivo del bloque

Auditar y preparar backend para que todo pago reportado con soporte conserve trazabilidad completa y no aplique cobros sin validación.

## 3. Contratos creados para este bloque

- `CONTRATO-COLECCION-CONCILIACIONBANCO-LAB-AYS-20260704.md`
- `CONTRATO-DOCUMENTOS-ADJUNTOS-GESTIONES-LAB-AYS-20260704.md`

## 4. Criterio funcional esperado

Flujo correcto:

1. Cliente reporta pago en Portal.
2. Cliente adjunta soporte.
3. Se registra documento persistente.
4. Se crea gestión con referencia al documento.
5. Se crea registro `conciliacionBanco` en `pendiente_conciliacion`.
6. Cobros/Operativo ve la solicitud y el adjunto.
7. Cliente ve estado de recepción/revisión.
8. El cobro/recibo no cambia a pagado hasta validación autorizada.
9. Si se valida, se aplica pago por flujo explícito.
10. Se notifican los interesados.

## 5. Auditoría técnica pendiente

Revisar en la base frontend activa `Prototype Development Request - 2026-07-04T152321.882.zip`:

- `modules/portal.js`
- `modules/cobros.js`
- `modules/cliente360.js`
- `modules/notificaciones.js`
- `core/ciclo.js`
- `core/importa.js`
- `data/seed.js`

Preguntas de auditoría:

- ¿Dónde se crea la gestión del pago reportado?
- ¿Se guarda archivo o solo nombre/texto?
- ¿Existe `documentoId` o `documentoIds[]`?
- ¿Cobros lee soportes desde `documentos` o desde el log?
- ¿Portal muestra estado del reporte al cliente?
- ¿Notificaciones recibe enlace al soporte?
- ¿La acción aplica pago automáticamente o queda pendiente?
- ¿La fuente se clasifica como `conciliacionBanco` y no como `finmovs`?

## 6. Pendientes backend después de auditoría

Según hallazgo real, preparar una de estas rutas:

### Ruta A — Solo falta referencia visual

Si el documento ya existe pero no se muestra:

- ajustar contrato de lectura del módulo;
- documentar pendiente para Claude si es UI;
- no tocar backend real.

### Ruta B — Falta persistir documento

Si la gestión solo guarda texto:

- definir `documentos` como entidad persistente;
- agregar relación `gestion.documentoIds[]`;
- agregar relación `conciliacionBanco.documentoId/adjuntos[]`;
- dejar listo para Storage LAB cuando se autorice.

### Ruta C — Se aplica pago indebidamente

Si el flujo aplica pago sin validación:

- bloquear aplicación automática;
- forzar estado `pendiente_conciliacion`;
- registrar acción posterior como validación explícita.

## 7. Impacto en Academia y manuales

Cuando se corrija el flujo, actualizar:

- manual Portal Cliente;
- manual Cobros;
- manual Administrativo/Operativo;
- ruta Cliente nuevo;
- ruta Administrativo/Operativo;
- evaluación sobre reporte de pago y soporte;
- notificación de actualización de Academia.

## 8. Restricciones

- No Firestore.
- No Storage real todavía.
- No datos reales.
- No deploy.
- No merge.
- No modificar `data/store.js` sin fase aprobada.
- No pisar candidato frontend activo.

## 9. Siguiente paso recomendado

Ejecutar auditoría de código del flujo Portal/Cobros/Documentos sobre la candidata activa v1.123 y producir diagnóstico:

```txt
PORTAL-PAGOS-ADJUNTOS-DIAGNOSTICO
- Estado actual:
- Archivo/función origen:
- Dónde se pierde el adjunto:
- Fix frontend para Claude:
- Fix backend para ChatGPT/Codex:
- Manuales/Academia afectados:
```

## 10. Estado

Plan documentado. Este bloque queda como siguiente frente backend crítico antes de implementar cargas reales o Storage.
